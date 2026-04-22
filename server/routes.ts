import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { KnowledgeRetriever } from "./arya/knowledge-retriever";
import { Orchestrator } from "./arya/orchestrator";
import { MedicalEngine } from "./arya/medical-engine";
import { LearningEngine } from "./arya/learning-engine";
import { NeuralLinkEngine } from "./arya/neural-link-engine";
import { generateAryaResponse, memoryEngine, type ChatMessage } from "./arya/chat-engine";
import { GoalsEngine } from "./arya/goals-engine";
import { FeedbackEngine } from "./arya/feedback-engine";
import { InsightsEngine } from "./arya/insights-engine";
import { ResponseCacheEngine } from "./arya/response-cache-engine";
import { chatStorage } from "./replit_integrations/chat/storage";
import { ensureCompatibleFormat, speechToText, textToSpeech as openaiTextToSpeech } from "./replit_integrations/audio/client";
import {
  sarvamSpeechToText,
  sarvamTranslate,
  sarvamTextToSpeech,
  sarvamSpeechToTextTranslate,
  isIndianLanguage,
  getSpeakerForLanguage,
  SUPPORTED_LANGUAGES,
  type SarvamLanguageCode,
} from "./arya/sarvam-service";
import { QueryRequestSchema, DomainSchema, aryaKnowledge, aryaClinicalRecords } from "@shared/schema";
import { eq, and, desc, sql, or, isNull, lte } from "drizzle-orm";
import { db } from "./db";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  getApiKeyUsage,
  getUsageStats,
  apiKeyAuth,
} from "./arya/api-key-service";
import {
  signupUser,
  loginUser,
  verifySession,
  logoutUser,
  getUserById,
  googleOAuthLogin,
} from "./arya/user-auth-service";
import {
  isBetaMode,
  isUserAllowed,
  redeemInviteCode,
  addToAllowList,
  createInviteCode,
  createSystemInviteCodes,
  createUserInviteCode,
  listInviteCodes,
  listAllowList,
  getBetaUserCount,
  canAcceptMoreUsers,
  getBetaConfig,
} from "./arya/beta-guard";
import { checkBudget, checkAndRecordBudget, recordLLMCall, getBudgetStats, getCostDashboard, updateCostCap, getLimits, type CallType } from "./arya/usage-budget";
import {
  aryaGoals,
  aryaGoalSteps,
  aryaVoiceSessions,
  aryaNotifications,
  aryaUsers,
  aryaUsageBudget,
  aryaUserFeedback,
  aryaReminders,
  aryaPushSubscriptions,
} from "@shared/schema";
import { getVapidPublicKey } from "./arya/reminder-scheduler";

const retriever = new KnowledgeRetriever();
const medicalEngine = new MedicalEngine();
const learningEngine = new LearningEngine();
const neuralLinkEngine = new NeuralLinkEngine();
const goalsEngine = new GoalsEngine();
const feedbackEngine = new FeedbackEngine();
const insightsEngine = new InsightsEngine();
const responseCacheEngine = new ResponseCacheEngine();

const adminSessions = new Map<string, { createdAt: number }>();
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000;

function cleanExpiredSessions() {
  const now = Date.now();
  const entries = Array.from(adminSessions.entries());
  for (const [token, session] of entries) {
    if (now - session.createdAt > ADMIN_SESSION_TTL) {
      adminSessions.delete(token);
    }
  }
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  const token = authHeader.slice(7);
  cleanExpiredSessions();
  const session = adminSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired admin session" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return res.status(500).json({ error: "Admin password not configured" });
      }
      if (password !== adminPassword) {
        return res.status(401).json({ error: "Invalid password" });
      }
      cleanExpiredSessions();
      const token = uuidv4();
      adminSessions.set(token, { createdAt: Date.now() });
      res.json({ token, expiresIn: ADMIN_SESSION_TTL });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/admin/verify", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ valid: false });
    }
    const token = authHeader.slice(7);
    cleanExpiredSessions();
    const session = adminSessions.get(token);
    if (!session) {
      return res.status(401).json({ valid: false });
    }
    res.json({ valid: true });
  });

  app.post("/api/admin/logout", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      adminSessions.delete(authHeader.slice(7));
    }
    res.json({ success: true });
  });
  
  // =============================================
  // USER AUTHENTICATION ROUTES
  // =============================================

  app.get("/api/beta/status", async (_req: Request, res: Response) => {
    const betaUserCount = await getBetaUserCount();
    const accepting = await canAcceptMoreUsers();
    res.json({
      betaMode: isBetaMode(),
      betaUserCount,
      acceptingUsers: accepting,
      ...getBetaConfig(),
      limits: getLimits(),
    });
  });

  app.post("/api/beta/redeem-invite", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Invite code is required" });
      const result = await redeemInviteCode(userId, code);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to redeem invite code" });
    }
  });

  app.post("/api/user/signup", async (req: Request, res: Response) => {
    try {
      const { name, phone, password, email, preferredLanguage, inviteCode } = req.body;
      if (!name || !phone || !password) {
        return res.status(400).json({ error: "Name, phone, and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      if (isBetaMode()) {
        if (!inviteCode) {
          return res.status(403).json({ error: "An invite code is required to sign up during the beta period." });
        }
        if (!await canAcceptMoreUsers()) {
          return res.status(403).json({ error: "Beta is currently full (200 users). Please try again later." });
        }
      }

      const result = await signupUser(name, phone, password, email, preferredLanguage);

      if (isBetaMode() && inviteCode) {
        const redeemResult = await redeemInviteCode(result.user.id, inviteCode);
        if (!redeemResult.success) {
          return res.status(400).json({ error: redeemResult.error || "Invalid invite code" });
        }
      }

      res.json(result);
    } catch (error: any) {
      if (error.message === "Phone number already registered") {
        return res.status(409).json({ error: error.message });
      }
      console.error("[SIGNUP ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Signup failed" });
    }
  });

  app.post("/api/user/login", async (req: Request, res: Response) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ error: "Phone and password are required" });
      }
      const result = await loginUser(phone, password);
      res.json(result);
    } catch (error: any) {
      const knownErrors = [
        "Invalid phone number or password",
        "Account is deactivated",
        "This account uses Google sign-in. Please sign in with Google.",
      ];
      if (knownErrors.includes(error.message)) {
        return res.status(401).json({ error: error.message });
      }
      console.error("[LOGIN ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/user/verify", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ valid: false });
    }
    const token = authHeader.slice(7);
    const user = await verifySession(token);
    if (!user) {
      return res.status(401).json({ valid: false });
    }
    res.json({ valid: true, user });
  });

  app.post("/api/user/logout", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      await logoutUser(authHeader.slice(7));
    }
    res.json({ success: true });
  });

  app.get("/api/user/google-config", (_req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || null;
    res.json({ clientId });
  });

  app.post("/api/user/google-auth", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: "Google ID token is required" });
      }

      if (isBetaMode()) {
        if (!await canAcceptMoreUsers()) {
          return res.status(403).json({ error: "Beta is currently full (200 users). Please try again later." });
        }
      }

      const result = await googleOAuthLogin(idToken);
      res.json(result);
    } catch (error: any) {
      if (error.message === "Google OAuth is not configured") {
        return res.status(503).json({ error: "Google sign-in is not available" });
      }
      if (error.message === "Account is deactivated") {
        return res.status(401).json({ error: "Account is deactivated" });
      }
      console.error("[GOOGLE AUTH ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Google sign-in failed" });
    }
  });

  // =============================================
  // PUSH NOTIFICATION ROUTES
  // =============================================

  app.get("/api/push/vapid-key", (_req: Request, res: Response) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) return res.status(503).json({ error: "Push not configured" });
    res.json({ publicKey });
  });

  app.post("/api/push/subscribe", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const user = await verifySession(authHeader.slice(7));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "Missing subscription data" });

    try {
      await db.insert(aryaPushSubscriptions)
        .values({ userId: user.id, endpoint, p256dh, auth })
        .onConflictDoNothing();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.post("/api/push/unsubscribe", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const user = await verifySession(authHeader.slice(7));
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { endpoint } = req.body;
    if (endpoint) {
      await db.delete(aryaPushSubscriptions).where(eq(aryaPushSubscriptions.endpoint, endpoint));
    }
    res.json({ success: true });
  });

  // =============================================
  // REMINDERS ROUTES
  // =============================================

  async function requireUserAuth(req: Request, res: Response): Promise<{ id: string; name: string } | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return null; }
    const user = await verifySession(authHeader.slice(7));
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
    return user;
  }

  app.get("/api/reminders", async (req: Request, res: Response) => {
    const user = await requireUserAuth(req, res);
    if (!user) return;
    try {
      const reminders = await db.select().from(aryaReminders)
        .where(eq(aryaReminders.userId, user.id))
        .orderBy(desc(aryaReminders.createdAt));
      res.json(reminders);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders", async (req: Request, res: Response) => {
    const user = await requireUserAuth(req, res);
    if (!user) return;
    try {
      const { title, message, type, scheduledAt, recurrence, recurrenceMinutes, isActive, soundEnabled } = req.body;
      if (!title || !message || !scheduledAt) return res.status(400).json({ error: "title, message and scheduledAt are required" });

      const [reminder] = await db.insert(aryaReminders).values({
        userId: user.id,
        title: title.trim(),
        message: message.trim(),
        type: type || "reminder",
        scheduledAt: new Date(scheduledAt),
        recurrence: recurrence || "once",
        recurrenceMinutes: recurrenceMinutes || null,
        isActive: isActive !== false,
        soundEnabled: soundEnabled !== false,
      }).returning();

      res.json(reminder);
    } catch (err: any) {
      console.error("[REMINDER CREATE]", err.message);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.patch("/api/reminders/:id", async (req: Request, res: Response) => {
    const user = await requireUserAuth(req, res);
    if (!user) return;
    try {
      const { id } = req.params;
      const updates: Record<string, any> = {};
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.message !== undefined) updates.message = req.body.message;
      if (req.body.scheduledAt !== undefined) updates.scheduledAt = new Date(req.body.scheduledAt);

      const [updated] = await db.update(aryaReminders)
        .set(updates)
        .where(and(eq(aryaReminders.id, id), eq(aryaReminders.userId, user.id)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Reminder not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", async (req: Request, res: Response) => {
    const user = await requireUserAuth(req, res);
    if (!user) return;
    try {
      await db.delete(aryaReminders)
        .where(and(eq(aryaReminders.id, req.params.id), eq(aryaReminders.userId, user.id)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // =============================================
  // ONBOARDING ROUTES
  // =============================================

  app.get("/api/user/onboarding-status", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        onboardingComplete: user.onboardingComplete,
        preferredLanguage: user.preferredLanguage,
        currentWork: user.currentWork,
        wantsDailyReminder: user.wantsDailyReminder,
        voiceEnabled: user.voiceEnabled,
        invitesRemaining: user.invitesRemaining,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get onboarding status" });
    }
  });

  app.post("/api/user/onboarding", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { preferredLanguage, currentWork, wantsDailyReminder, voiceEnabled } = req.body;

      await db.update(aryaUsers).set({
        preferredLanguage: preferredLanguage || "en",
        currentWork: currentWork || null,
        wantsDailyReminder: wantsDailyReminder ?? false,
        voiceEnabled: voiceEnabled ?? true,
        onboardingComplete: true,
      }).where(eq(aryaUsers.id, userId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save onboarding preferences" });
    }
  });

  // =============================================
  // USER RESPONSE PREFERENCES
  // =============================================

  app.get("/api/user/preferences", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const [user] = await db.select({
        responseStyle: aryaUsers.responseStyle,
        responseTone: aryaUsers.responseTone,
        focusAreas: aryaUsers.focusAreas,
        wisdomQuotes: aryaUsers.wisdomQuotes,
        currentWork: aryaUsers.currentWork,
        preferredLanguage: aryaUsers.preferredLanguage,
      }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.post("/api/user/preferences", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { responseStyle, responseTone, focusAreas, wisdomQuotes } = req.body;

      const validStyles = ["concise", "balanced", "detailed"];
      const validTones = ["motivating", "gentle", "direct", "friendly"];
      const validWisdom = ["always", "sometimes", "never"];
      const validFocusAreas = ["career", "health", "spirituality", "finance", "relationships", "learning", "creativity", "fitness"];

      const updates: any = {};
      if (responseStyle && validStyles.includes(responseStyle)) updates.responseStyle = responseStyle;
      if (responseTone && validTones.includes(responseTone)) updates.responseTone = responseTone;
      if (wisdomQuotes && validWisdom.includes(wisdomQuotes)) updates.wisdomQuotes = wisdomQuotes;
      if (Array.isArray(focusAreas)) {
        updates.focusAreas = focusAreas.filter((a: string) => validFocusAreas.includes(a)).slice(0, 4);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid preferences provided" });
      }

      await db.update(aryaUsers).set(updates).where(eq(aryaUsers.id, userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // =============================================
  // USER INVITE CODE GENERATION
  // =============================================

  app.post("/api/user/generate-invite", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const result = await createUserInviteCode(userId);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ code: result.code });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate invite code" });
    }
  });

  app.get("/api/user/usage", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const dateKey = new Date().toISOString().slice(0, 10);
      const [budget] = await db.select().from(aryaUsageBudget)
        .where(and(eq(aryaUsageBudget.userId, userId), eq(aryaUsageBudget.dateKey, dateKey)))
        .limit(1);
      const limits = getLimits();
      res.json({
        today: budget ? {
          textChats: budget.textChatCount,
          voiceMinutes: budget.voiceMinutes,
          deepReasoning: budget.deepReasoningCount,
          totalLlmCalls: budget.llmCallCount,
        } : { textChats: 0, voiceMinutes: 0, deepReasoning: 0, totalLlmCalls: 0 },
        limits: limits.user,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  // User auth middleware - extracts user from token, attaches to req
  function optionalUser(req: Request, res: Response, next: Function) {
    const authHeader = req.headers["x-user-token"] as string;
    if (!authHeader) {
      (req as any).userId = null;
      return next();
    }
    verifySession(authHeader).then((user) => {
      (req as any).userId = user?.id || null;
      (req as any).userName = user?.name || null;
      next();
    }).catch(() => {
      (req as any).userId = null;
      next();
    });
  }

  function requireUser(req: Request, res: Response, next: Function) {
    const authHeader = req.headers["x-user-token"] as string;
    if (!authHeader) {
      return res.status(401).json({ error: "Authentication required" });
    }
    verifySession(authHeader).then((user) => {
      if (!user) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      (req as any).userId = user.id;
      (req as any).userName = user.name;
      next();
    }).catch(() => {
      res.status(401).json({ error: "Authentication failed" });
    });
  }

  // =============================================
  // USER GOALS ROUTES (for logged-in users)
  // =============================================

  app.get("/api/user/goals", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const status = req.query.status as string | undefined;
      let conditions: any[] = [eq(aryaGoals.userId, userId)];
      if (status) conditions.push(eq(aryaGoals.status, status as any));

      const goals = await db.select().from(aryaGoals)
        .where(and(...conditions))
        .orderBy(desc(aryaGoals.createdAt));

      const result = [];
      for (const goal of goals) {
        const steps = await db.select().from(aryaGoalSteps)
          .where(eq(aryaGoalSteps.goalId, goal.id))
          .orderBy(aryaGoalSteps.order);

        const voiceSessions = await db.select().from(aryaVoiceSessions)
          .where(eq(aryaVoiceSessions.goalId, goal.id))
          .orderBy(desc(aryaVoiceSessions.startedAt));

        const totalMinutes = voiceSessions.reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);
        const todaySessions = voiceSessions.filter(s => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return s.startedAt >= today;
        });
        const todayMinutes = todaySessions.reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);

        result.push({
          ...goal,
          steps,
          stats: {
            totalMinutes,
            todayMinutes,
            totalSessions: voiceSessions.length,
            todaySessions: todaySessions.length,
          },
        });
      }
      res.json(result);
    } catch (error: any) {
      console.error("[GOALS ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/user/goals", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { title, description, steps, priority, dailyTargetMinutes, reminderTime } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const existingGoals = await db.select().from(aryaGoals)
        .where(and(eq(aryaGoals.userId, userId), eq(aryaGoals.status, "active" as any)));
      if (existingGoals.length >= 3) {
        return res.status(429).json({ error: "You can have up to 3 active goals. Complete or remove an existing goal to add a new one." });
      }

      const [goal] = await db.insert(aryaGoals).values({
        tenantId: "default",
        userId,
        title,
        description: description || null,
        status: "active",
        priority: priority || "medium",
        dailyTargetMinutes: dailyTargetMinutes || null,
        reminderTime: reminderTime || null,
      }).returning();

      const createdSteps = [];
      if (steps && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const [step] = await db.insert(aryaGoalSteps).values({
            goalId: goal.id,
            description: steps[i],
            status: "pending",
            order: i + 1,
          }).returning();
          createdSteps.push(step);
        }
      }

      res.json({ ...goal, steps: createdSteps });
    } catch (error: any) {
      console.error("[CREATE GOAL ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.patch("/api/user/goals/:goalId", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { goalId } = req.params;
      const { status, title, description, dailyTargetMinutes, reminderTime } = req.body;

      const [goal] = await db.select().from(aryaGoals)
        .where(and(eq(aryaGoals.id, goalId), eq(aryaGoals.userId, userId)))
        .limit(1);
      if (!goal) return res.status(404).json({ error: "Goal not found" });

      const update: any = { updatedAt: new Date() };
      if (status) update.status = status;
      if (title) update.title = title;
      if (description !== undefined) update.description = description;
      if (dailyTargetMinutes !== undefined) update.dailyTargetMinutes = dailyTargetMinutes;
      if (reminderTime !== undefined) update.reminderTime = reminderTime;
      if (status === "completed") update.completedAt = new Date();

      await db.update(aryaGoals).set(update).where(eq(aryaGoals.id, goalId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[UPDATE GOAL ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // =============================================
  // VOICE SESSION TRACKING ROUTES
  // =============================================

  app.post("/api/user/voice-session/start", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { goalId, conversationId, language } = req.body;

      const [session] = await db.insert(aryaVoiceSessions).values({
        userId,
        goalId: goalId || null,
        conversationId: conversationId || null,
        language: language || "en",
        durationSeconds: 0,
        messageCount: 0,
      }).returning();

      res.json(session);
    } catch (error: any) {
      console.error("[START SESSION ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to start voice session" });
    }
  });

  app.post("/api/user/voice-session/:sessionId/end", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { sessionId } = req.params;
      const { durationSeconds, messageCount } = req.body;

      const [session] = await db.select().from(aryaVoiceSessions)
        .where(and(eq(aryaVoiceSessions.id, sessionId), eq(aryaVoiceSessions.userId, userId)))
        .limit(1);
      if (!session) return res.status(404).json({ error: "Session not found" });

      await db.update(aryaVoiceSessions).set({
        durationSeconds: durationSeconds || 0,
        messageCount: messageCount || 0,
        endedAt: new Date(),
      }).where(eq(aryaVoiceSessions.id, sessionId));

      if (session.goalId) {
        await db.update(aryaGoals).set({
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(aryaGoals.id, session.goalId));

        const dur = durationSeconds || 0;
        if (dur >= 60) {
          const [goal] = await db.select().from(aryaGoals)
            .where(eq(aryaGoals.id, session.goalId)).limit(1);
          if (goal && goal.dailyTargetMinutes) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaySessions = await db.select().from(aryaVoiceSessions)
              .where(and(
                eq(aryaVoiceSessions.userId, userId),
                eq(aryaVoiceSessions.goalId, session.goalId),
              ));
            const todayTotal = todaySessions
              .filter(s => s.startedAt >= today)
              .reduce((sum, s) => sum + s.durationSeconds, 0) + dur;

            if (Math.round(todayTotal / 60) >= goal.dailyTargetMinutes) {
              const newStreak = (goal.streakCount || 0) + 1;
              await db.update(aryaGoals).set({ streakCount: newStreak }).where(eq(aryaGoals.id, goal.id));

              await db.insert(aryaNotifications).values({
                userId,
                type: "streak",
                title: `${newStreak} Day Streak!`,
                message: `Amazing! You've completed your daily goal for "${goal.title}" ${newStreak} days in a row. Keep it up!`,
                goalId: goal.id,
              });
            }
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[END SESSION ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to end voice session" });
    }
  });

  // =============================================
  // NOTIFICATION ROUTES
  // =============================================

  app.get("/api/user/notifications", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const notifications = await db.select().from(aryaNotifications)
        .where(eq(aryaNotifications.userId, userId))
        .orderBy(desc(aryaNotifications.createdAt))
        .limit(50);
      const unreadCount = notifications.filter(n => !n.isRead).length;
      res.json({ notifications, unreadCount });
    } catch (error: any) {
      console.error("[NOTIFICATIONS ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/user/notifications/:id/read", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      await db.update(aryaNotifications)
        .set({ isRead: true })
        .where(and(eq(aryaNotifications.id, req.params.id), eq(aryaNotifications.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/user/notifications/read-all", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      await db.update(aryaNotifications)
        .set({ isRead: true })
        .where(and(eq(aryaNotifications.userId, userId), eq(aryaNotifications.isRead, false)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Health check
  app.get("/api/health", async (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0-alpha",
      features: ["knowledge", "ermate", "erprana", "self_learning", "neural_link"]
    });
  });

  // ARYA Knowledge Query (now with self-learning integration)
  app.post("/api/knowledge/query", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validated = QueryRequestSchema.parse(req.body);
      const traceId = uuidv4();
      
      const orchestrator = new Orchestrator({
        appId: validated.app_id,
        language: validated.language
      });
      
      const routing = orchestrator.route(validated.query, validated.language);
      
      console.log(`[${traceId}] Query routed to ${routing.primaryDomain} (mode: ${routing.mode})`);
      
      const results = await retriever.retrieve(
        validated.tenant_id,
        validated.query,
        routing.primaryDomain,
        validated.language,
        validated.top_k
      );
      
      let answer = '';
      let confidence = 0;
      if (results.units.length > 0) {
        answer = results.units[0].content;
        confidence = 0.85;
      } else {
        answer = 'No relevant knowledge found for this query. Please refine your search.';
        confidence = 0;
      }

      learningEngine.ingestQuery({
        tenantId: validated.tenant_id,
        query: validated.query,
        domain: routing.primaryDomain,
        resultCount: results.total,
        confidence,
        language: validated.language
      }).catch(err => console.error('[LEARNING INGEST ERROR]', err.message || "Unknown error"));
      
      res.json({
        answer,
        sources: results.units.map(unit => ({
          id: unit.id,
          title: unit.topic,
          relevance: 0.9
        })),
        confidence,
        domain_used: routing.primaryDomain,
        routing: {
          mode: routing.mode,
          weights: routing.weights,
          reasoning: routing.reasoning
        },
        trace_id: traceId
      });
      
    } catch (error: any) {
      console.error('[KNOWLEDGE QUERY ERROR]', error.message || "Unknown error");
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }
  });

  // ERmate Auto-fill
  const ERmateRequestSchema = z.object({
    tenant_id: z.string(),
    transcript: z.string().min(10),
    language: z.string().default('en')
  });

  app.post("/api/ermate/auto_fill", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validated = ERmateRequestSchema.parse(req.body);
      
      console.log(`[ERmate] Processing transcript for tenant: ${validated.tenant_id}`);
      
      const result = await medicalEngine.autoFill({
        transcript: validated.transcript,
        language: validated.language
      });

      const knowledgeContent = [
        `Chief Complaint: ${result.chief_complaint}`,
        `HPI: ${result.hpi}`,
        result.pmh.length > 0 ? `PMH: ${result.pmh.join(', ')}` : null,
        result.medications.length > 0 ? `Medications: ${result.medications.join(', ')}` : null,
        result.ddx.length > 0 ? `Differential Diagnoses: ${result.ddx.join(', ')}` : null,
        result.plan_investigations.length > 0 ? `Investigations: ${result.plan_investigations.join(', ')}` : null,
        result.plan_treatment.length > 0 ? `Treatment: ${result.plan_treatment.join(', ')}` : null,
        result.safety_flags.length > 0 ? `Safety Flags: ${result.safety_flags.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      const tags = [
        result.chief_complaint.toLowerCase(),
        ...result.ddx.map(d => d.toLowerCase()),
        ...result.medications.filter(m => m !== 'None reported').map(m => m.toLowerCase()),
        'clinical-record', 'ermate',
      ];

      try {
        const [knowledgeUnit] = await db.insert(aryaKnowledge).values({
          tenantId: validated.tenant_id,
          domain: 'medical' as const,
          topic: `Clinical Record: ${result.chief_complaint}`,
          content: knowledgeContent,
          tags,
          language: validated.language || 'en',
          sourceType: 'ermate_clinical',
          sourceTitle: `ERmate Auto-fill: ${result.chief_complaint}`,
          status: 'published',
          version: 1,
        }).returning();

        await db.insert(aryaClinicalRecords).values({
          tenantId: validated.tenant_id,
          sourceApp: 'ermate',
          chiefComplaint: result.chief_complaint,
          hpi: result.hpi,
          pmh: result.pmh,
          medications: result.medications,
          allergies: result.allergies,
          exam: result.exam,
          ddx: result.ddx,
          investigations: result.plan_investigations,
          treatment: result.plan_treatment,
          safetyFlags: result.safety_flags,
          originalTranscript: validated.transcript,
          language: validated.language || 'en',
          knowledgeUnitId: knowledgeUnit.id,
        });

        console.log(`[ERmate→ARYA] Saved clinical record & knowledge unit: ${knowledgeUnit.id}`);
        
        res.json({
          ...result,
          _arya: {
            knowledge_unit_id: knowledgeUnit.id,
            synced: true,
          }
        });
      } catch (dbError: any) {
        console.error('[ERmate→ARYA] Failed to sync to knowledge base:', dbError.message);
        res.json(result);
      }
      
    } catch (error: any) {
      console.error('[ERMATE ERROR]', error.message || "Unknown error");
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }
  });

  // Clinical Records API (ERmate data synced to ARYA)
  app.get("/api/clinical-records", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const limit = parseInt((req.query.limit as string) || "50");
      const records = await db
        .select()
        .from(aryaClinicalRecords)
        .where(eq(aryaClinicalRecords.tenantId, tenantId))
        .orderBy(desc(aryaClinicalRecords.createdAt))
        .limit(limit);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(aryaClinicalRecords)
        .where(eq(aryaClinicalRecords.tenantId, tenantId));

      res.json({
        records,
        total: Number(totalResult[0]?.count || 0),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/clinical-records/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(aryaClinicalRecords)
        .where(eq(aryaClinicalRecords.tenantId, tenantId));

      const ermateSynced = await db
        .select({ count: sql<number>`count(*)` })
        .from(aryaKnowledge)
        .where(and(
          eq(aryaKnowledge.tenantId, tenantId),
          eq(aryaKnowledge.sourceType, 'ermate_clinical')
        ));

      res.json({
        totalRecords: Number(totalResult[0]?.count || 0),
        knowledgeUnitsSynced: Number(ermateSynced[0]?.count || 0),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // ErPrana Risk Assessment
  const ErPranaRequestSchema = z.object({
    tenant_id: z.string(),
    symptoms_text: z.string(),
    wearable: z.object({
      hr: z.number().optional(),
      spo2: z.number().optional(),
      bp: z.string().optional(),
      temp: z.number().optional()
    }).optional()
  });

  app.post("/api/erprana/risk_assess", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validated = ErPranaRequestSchema.parse(req.body);
      
      console.log(`[ErPrana] Risk assessment for tenant: ${validated.tenant_id}`);
      
      const result = await medicalEngine.assessRisk({
        symptoms_text: validated.symptoms_text,
        wearable: validated.wearable
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error('[ERPRANA ERROR]', error.message || "Unknown error");
      res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }
  });

  // Get all knowledge by domain
  app.get("/api/knowledge/domain/:domain", requireAdmin, async (req: Request, res: Response) => {
    try {
      const domain = req.params.domain as any;
      const tenantId = req.query.tenant_id as string || 'varah';
      
      const units = await retriever.getByDomain(tenantId, domain, 50);
      
      res.json({
        domain,
        units,
        total: units.length
      });
      
    } catch (error: any) {
      console.error('[DOMAIN ERROR]', error.message || "Unknown error");
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // =============================================
  // SELF-LEARNING API ROUTES
  // =============================================

  // Get learning stats
  app.get("/api/learning/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const stats = await learningEngine.getLearningStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      console.error('[LEARNING STATS ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Get knowledge drafts
  app.get("/api/learning/drafts", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const status = req.query.status as string | undefined;
      const drafts = await learningEngine.getDrafts(tenantId, status);
      res.json({ drafts, total: drafts.length });
    } catch (error: any) {
      console.error('[DRAFTS ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Approve a draft (promote to published knowledge)
  app.post("/api/learning/drafts/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const draftId = req.params.id as string;
      const reviewedBy = (req.body.reviewed_by as string) || 'admin';
      const success = await learningEngine.approveDraft(draftId, reviewedBy);
      
      if (success) {
        res.json({ message: 'Draft approved and promoted to knowledge base', id: draftId });
      } else {
        res.status(404).json({ error: 'Draft not found' });
      }
    } catch (error: any) {
      console.error('[APPROVE DRAFT ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Reject a draft
  app.post("/api/learning/drafts/:id/reject", requireAdmin, async (req: Request, res: Response) => {
    try {
      const draftId = req.params.id as string;
      const reviewedBy = (req.body.reviewed_by as string) || 'admin';
      await learningEngine.rejectDraft(draftId, reviewedBy);
      res.json({ message: 'Draft rejected', id: draftId });
    } catch (error: any) {
      console.error('[REJECT DRAFT ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Get query patterns (what users are asking)
  app.get("/api/learning/patterns", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const gapsOnly = req.query.gaps_only === 'true';
      const patterns = await learningEngine.getQueryPatterns(tenantId, gapsOnly);
      res.json({ patterns, total: patterns.length });
    } catch (error: any) {
      console.error('[PATTERNS ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // =============================================
  // NEURAL LINK API ROUTES
  // =============================================

  // Compute neural links (admin action)
  app.post("/api/neural-link/compute", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.body.tenant_id || 'varah';
      console.log(`[NeuralLink] Computing cross-domain links for tenant: ${tenantId}`);
      const count = await neuralLinkEngine.computeLinks(tenantId);
      res.json({ message: `Neural links computed successfully`, links_created: count });
    } catch (error: any) {
      console.error('[COMPUTE LINKS ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Get network graph data
  app.get("/api/neural-link/graph", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const graph = await neuralLinkEngine.getNetworkGraph(tenantId);
      res.json(graph);
    } catch (error: any) {
      console.error('[GRAPH ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Get links for a specific knowledge unit
  app.get("/api/neural-link/unit/:unitId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenant_id as string || 'varah';
      const links = await neuralLinkEngine.getLinksForUnit(tenantId, req.params.unitId as string);
      res.json({
        unitId: req.params.unitId,
        connections: links.map(l => ({
          linkId: l.link.id,
          connectedUnit: {
            id: l.connectedUnit.id,
            topic: l.connectedUnit.topic,
            domain: l.connectedUnit.domain
          },
          score: l.link.linkScore,
          type: l.link.linkType,
          evidence: l.link.evidence
        })),
        total: links.length
      });
    } catch (error: any) {
      console.error('[UNIT LINKS ERROR]', error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Synthesize cross-domain response
  app.post("/api/neural-link/synthesize", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenant_id: z.string(),
        query: z.string().min(1),
        domains: z.array(DomainSchema).min(2)
      });
      const validated = schema.parse(req.body);
      
      const result = await neuralLinkEngine.synthesize(
        validated.tenant_id,
        validated.query,
        validated.domains
      );
      res.json(result);
    } catch (error: any) {
      console.error('[SYNTHESIZE ERROR]', error.message || "Unknown error");
      res.status(400).json({ error: error.message });
    }
  });

  // =============================================
  // ARYA CHAT API ROUTES (Conversational AI)
  // =============================================

  app.get("/api/arya/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/arya/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/arya/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Text chat: send message, get streaming AI response with knowledge context
  app.post("/api/arya/conversations/:id/messages", optionalUser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, tenant_id } = req.body;
      const userId = (req as any).userId || null;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      if (isBetaMode()) {
        if (!userId) {
          return res.status(403).json({ error: "ARYA is currently in private beta. Please sign in with an approved account or enter an invite code.", betaRestricted: true });
        }
        const allowed = await isUserAllowed(userId);
        if (!allowed) {
          return res.status(403).json({ error: "ARYA is currently in private beta. Please enter an invite code to get access.", betaRestricted: true, needsInvite: true });
        }
      }

      const budgetCheck = await checkAndRecordBudget(userId, 'text_chat');
      if (!budgetCheck.allowed) {
        return res.status(429).json({ error: budgetCheck.reason });
      }

      await chatStorage.createMessage(conversationId, "user", content);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const history: ChatMessage[] = existingMessages.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const { stream, meta } = await generateAryaResponse(content, history, tenant_id || "varah", conversationId, userId);
      let fullResponse = "";

      res.write(`data: ${JSON.stringify({ type: "meta", mode: meta.mode, icon: meta.icon, confidence: meta.confidence, sourcesCount: meta.sourcesCount, memoryUsed: meta.memoryUsed })}\n\n`);

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("[CHAT ERROR]", error.message || "Unknown error");
      const userMessage = "I'm having difficulty right now. Please try again in a moment.";
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: userMessage });
      }
    }
  });

  // Voice chat: send audio, get text response (transcribe → ARYA → stream text)
  // Supports multilingual via Sarvam AI: Indian language audio → transcribe → translate to English → ARYA → translate back → TTS
  app.post("/api/arya/conversations/:id/voice", optionalUser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { audio, tenant_id, language } = req.body;
      const userId = (req as any).userId || null;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      if (isBetaMode()) {
        if (!userId) {
          return res.status(403).json({ error: "ARYA is currently in private beta. Please sign in with an approved account or enter an invite code.", betaRestricted: true });
        }
        const allowed = await isUserAllowed(userId);
        if (!allowed) {
          return res.status(403).json({ error: "ARYA is currently in private beta. Please enter an invite code to get access.", betaRestricted: true, needsInvite: true });
        }
      }

      const budgetCheck = await checkAndRecordBudget(userId, 'voice');
      if (!budgetCheck.allowed) {
        return res.status(429).json({ error: budgetCheck.reason });
      }

      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);

      let userTranscript = "";
      let detectedLanguage = language || "en-IN";
      let queryForArya = "";

      const useSarvam = language && language !== "en-IN" && process.env.SARVAM_API_KEY;

      if (useSarvam) {
        console.log(`[Voice] Using Sarvam AI for language: ${language}`);
        const sttResult = await sarvamSpeechToText(audioBuffer, language as SarvamLanguageCode);
        userTranscript = sttResult.transcript;
        detectedLanguage = sttResult.languageCode || language;

        if (isIndianLanguage(detectedLanguage)) {
          const translation = await sarvamTranslate(userTranscript, detectedLanguage, "en-IN");
          queryForArya = translation.translatedText;
          console.log(`[Voice] Translated "${userTranscript}" → "${queryForArya}"`);
        } else {
          queryForArya = userTranscript;
        }
      } else {
        userTranscript = await speechToText(audioBuffer, inputFormat);
        queryForArya = userTranscript;
        detectedLanguage = "en-IN";
      }

      await chatStorage.createMessage(conversationId, "user", userTranscript);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const history: ChatMessage[] = existingMessages.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", content: userTranscript, language: detectedLanguage })}\n\n`);

      const voiceUserId = (req as any).userId || null;
      const { stream, meta } = await generateAryaResponse(queryForArya, history, tenant_id || "varah", conversationId, voiceUserId, true);
      let fullResponse = "";

      res.write(`data: ${JSON.stringify({ type: "meta", mode: meta.mode, icon: meta.icon })}\n\n`);

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: "assistant", content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      if (isIndianLanguage(detectedLanguage) && process.env.SARVAM_API_KEY) {
        try {
          const translatedResponse = await sarvamTranslate(fullResponse, "en-IN", detectedLanguage);
          const ttsResult = await sarvamTextToSpeech(
            translatedResponse.translatedText,
            detectedLanguage as SarvamLanguageCode,
            getSpeakerForLanguage(detectedLanguage)
          );
          res.write(`data: ${JSON.stringify({
            type: "translated_response",
            content: translatedResponse.translatedText,
            language: detectedLanguage,
          })}\n\n`);
          res.write(`data: ${JSON.stringify({
            type: "audio_response",
            audio: ttsResult.audioBase64,
            format: ttsResult.format,
            language: detectedLanguage,
          })}\n\n`);
        } catch (ttsError: any) {
          console.error("[Voice] TTS/translation error:", ttsError.message);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("[VOICE ERROR]", error.message || "Unknown error");
      const userMessage = "I'm having difficulty right now. Please try again in a moment.";
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: userMessage })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: userMessage });
      }
    }
  });

  app.get("/api/arya/languages", (_req: Request, res: Response) => {
    res.json({ languages: SUPPORTED_LANGUAGES });
  });

  app.post("/api/arya/tts", async (req: Request, res: Response) => {
    try {
      const { text, language, speaker } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const langCode = (language || "en-IN") as SarvamLanguageCode;

      if (langCode === "en-IN" || !process.env.SARVAM_API_KEY) {
        const cleanText = text.length > 500 ? text.slice(0, 500) : text;
        const audioBuffer = await openaiTextToSpeech(cleanText, "nova", "wav");
        const audioBase64 = audioBuffer.toString("base64");
        res.json({ audioBase64, format: "wav" });
      } else {
        const ttsResult = await sarvamTextToSpeech(
          text,
          langCode,
          speaker || getSpeakerForLanguage(langCode)
        );
        res.json(ttsResult);
      }
    } catch (error: any) {
      console.error("[TTS ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/translate", async (req: Request, res: Response) => {
    try {
      const { text, source_language, target_language } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const result = await sarvamTranslate(
        text,
        source_language || "en-IN",
        target_language || "hi-IN"
      );
      res.json(result);
    } catch (error: any) {
      console.error("[TRANSLATE ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // =============================================
  // API KEY MANAGEMENT ROUTES (Developer Portal)
  // =============================================

  app.post("/api/keys", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenant_id: z.string().default("varah"),
        name: z.string().min(1).max(200),
        app_id: z.string().min(1).max(50),
        permissions: z.array(z.string()).optional(),
        rate_limit: z.number().int().min(1).max(10000).optional(),
        expires_in_days: z.number().int().min(1).max(365).optional(),
      });
      const validated = schema.parse(req.body);
      const result = await createApiKey({
        tenantId: validated.tenant_id,
        name: validated.name,
        appId: validated.app_id,
        permissions: validated.permissions,
        rateLimit: validated.rate_limit,
        expiresInDays: validated.expires_in_days,
      });
      res.status(201).json(result);
    } catch (error: any) {
      console.error("[API KEY ERROR]", error.message || "Unknown error");
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/keys", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const keys = await listApiKeys(tenantId);
      res.json({ keys, total: keys.length });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/keys/:id/revoke", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.body.tenant_id as string) || "varah";
      const success = await revokeApiKey(req.params.id, tenantId);
      if (success) {
        res.json({ message: "API key revoked" });
      } else {
        res.status(404).json({ error: "Key not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/keys/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const success = await deleteApiKey(req.params.id, tenantId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Key not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/keys/:id/usage", requireAdmin, async (req: Request, res: Response) => {
    try {
      const days = parseInt((req.query.days as string) || "7");
      const usage = await getApiKeyUsage(req.params.id, days);
      res.json({ usage, total: usage.length });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/keys/stats/overview", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || "varah";
      const stats = await getUsageStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // =============================================
  // EXTERNAL API (Secured with API Key auth)
  // These are the endpoints ERmate, ErPrana, etc. use
  // =============================================

  app.post("/api/v1/knowledge/query", apiKeyAuth("knowledge:read"), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const appId = (req as any).appId;

      const validated = QueryRequestSchema.parse({
        ...req.body,
        tenant_id: tenantId,
        app_id: appId,
      });
      const traceId = uuidv4();

      const orchestrator = new Orchestrator({ appId: validated.app_id, language: validated.language });
      const routing = orchestrator.route(validated.query, validated.language);

      const results = await retriever.retrieve(tenantId, validated.query, routing.primaryDomain, validated.language, validated.top_k);

      let answer = "";
      let confidence = 0;
      if (results.units.length > 0) {
        answer = results.units[0].content;
        confidence = 0.85;
      } else {
        answer = "No relevant knowledge found for this query.";
        confidence = 0;
      }

      learningEngine.ingestQuery({
        tenantId,
        query: validated.query,
        domain: routing.primaryDomain,
        resultCount: results.total,
        confidence,
        language: validated.language,
      }).catch((err) => console.error("[LEARNING INGEST ERROR]", err.message || "Unknown error"));

      res.json({
        answer,
        sources: results.units.map((unit) => ({ id: unit.id, title: unit.topic, relevance: 0.9 })),
        confidence,
        domain_used: routing.primaryDomain,
        routing: { mode: routing.mode, weights: routing.weights },
        trace_id: traceId,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/v1/chat", apiKeyAuth("chat:write"), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { message, history } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      const budgetCheck = await checkAndRecordBudget(null, 'text_chat');
      if (!budgetCheck.allowed) {
        return res.status(429).json({ error: budgetCheck.reason });
      }

      const chatHistory: ChatMessage[] = (history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const { stream, meta } = await generateAryaResponse(message, chatHistory, tenantId);
      let fullResponse = "";

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true, full_response: fullResponse })}\n\n`);
      res.end();
    } catch (error: any) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Something went wrong. Please try again." });
      }
    }
  });

  app.post("/api/v1/ermate/auto_fill", apiKeyAuth("ermate:write"), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { transcript, language } = req.body;
      if (!transcript || transcript.length < 10) {
        return res.status(400).json({ error: "Transcript must be at least 10 characters" });
      }
      const result = await medicalEngine.autoFill({ transcript, language: language || "en" });

      const knowledgeContent = [
        `Chief Complaint: ${result.chief_complaint}`,
        `HPI: ${result.hpi}`,
        result.pmh.length > 0 ? `PMH: ${result.pmh.join(', ')}` : null,
        result.medications.length > 0 ? `Medications: ${result.medications.join(', ')}` : null,
        result.ddx.length > 0 ? `Differential Diagnoses: ${result.ddx.join(', ')}` : null,
        result.plan_treatment.length > 0 ? `Treatment: ${result.plan_treatment.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      const tags = [
        result.chief_complaint.toLowerCase(),
        ...result.ddx.map((d: string) => d.toLowerCase()),
        'clinical-record', 'ermate',
      ];

      try {
        const [knowledgeUnit] = await db.insert(aryaKnowledge).values({
          tenantId,
          domain: 'medical' as const,
          topic: `Clinical Record: ${result.chief_complaint}`,
          content: knowledgeContent,
          tags,
          language: language || 'en',
          sourceType: 'ermate_clinical',
          sourceTitle: `ERmate Auto-fill: ${result.chief_complaint}`,
          status: 'published',
          version: 1,
        }).returning();

        await db.insert(aryaClinicalRecords).values({
          tenantId,
          sourceApp: 'ermate',
          chiefComplaint: result.chief_complaint,
          hpi: result.hpi,
          pmh: result.pmh,
          medications: result.medications,
          allergies: result.allergies,
          exam: result.exam,
          ddx: result.ddx,
          investigations: result.plan_investigations,
          treatment: result.plan_treatment,
          safetyFlags: result.safety_flags,
          originalTranscript: transcript,
          language: language || 'en',
          knowledgeUnitId: knowledgeUnit.id,
        });

        console.log(`[ERmate→ARYA v1] Synced clinical record: ${knowledgeUnit.id}`);
        res.json({ ...result, _arya: { knowledge_unit_id: knowledgeUnit.id, synced: true } });
      } catch (dbError: any) {
        console.error('[ERmate→ARYA v1] Sync failed:', dbError.message);
        res.json(result);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/v1/erprana/risk_assess", apiKeyAuth("erprana:write"), async (req: Request, res: Response) => {
    try {
      const { symptoms_text, wearable } = req.body;
      if (!symptoms_text) {
        return res.status(400).json({ error: "symptoms_text is required" });
      }
      const result = await medicalEngine.assessRisk({ symptoms_text, wearable });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // =============================================
  // AGI CAPABILITY ROUTES
  // =============================================

  // Memory API
  app.get("/api/arya/memory", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const memories = await memoryEngine.getAll(tenantId);
      res.json({ memories, total: memories.length });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/arya/memory/:id", async (req: Request, res: Response) => {
    try {
      await memoryEngine.deleteMemory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/memory", async (req: Request, res: Response) => {
    try {
      const { tenant_id, category, key, value } = req.body;
      await memoryEngine.addExplicitMemory(tenant_id || 'varah', category, key, value);
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Goals API
  app.get("/api/arya/goals", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const status = req.query.status as string | undefined;
      const goals = await goalsEngine.getGoals(tenantId, status);
      res.json({ goals, total: goals.length });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/goals", async (req: Request, res: Response) => {
    try {
      const { tenant_id, title, description, steps, priority } = req.body;
      const goal = await goalsEngine.createGoal(tenant_id || 'varah', title, description, steps, priority);
      res.status(201).json(goal);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.patch("/api/arya/goals/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await goalsEngine.updateGoalStatus(req.params.id, status);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.patch("/api/arya/goals/steps/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await goalsEngine.updateStepStatus(req.params.id, status);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/arya/goals/:id", async (req: Request, res: Response) => {
    try {
      await goalsEngine.deleteGoal(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Feedback API
  app.post("/api/arya/feedback", async (req: Request, res: Response) => {
    try {
      const { message_id, conversation_id, tenant_id, rating, correction_text, category } = req.body;
      const feedback = await feedbackEngine.submitFeedback(
        message_id, conversation_id, tenant_id || 'varah', rating, correction_text, category
      );
      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/arya/feedback/stats", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const stats = await feedbackEngine.getFeedbackStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Insights API
  app.get("/api/arya/insights", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const insights = await insightsEngine.getActiveInsights(tenantId);
      res.json({ insights, total: insights.length });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/insights/generate", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.body.tenant_id as string) || 'varah';
      const insights = await insightsEngine.generateInsights(tenantId);
      res.json({ generated: insights.length, insights });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.patch("/api/arya/insights/:id/dismiss", async (req: Request, res: Response) => {
    try {
      await insightsEngine.dismissInsight(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // =============================================
  // LEARNING LOOP - RESPONSE CACHE APIS
  // =============================================

  app.get("/api/learning/cache/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const stats = await responseCacheEngine.getCacheStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // =============================================
  // BETA ACCESS MANAGEMENT (Admin)
  // =============================================

  app.get("/api/admin/beta/status", requireAdmin, async (_req: Request, res: Response) => {
    const budgetStats = await getBudgetStats();
    const betaUserCount = await getBetaUserCount();
    res.json({
      betaMode: isBetaMode(),
      betaUserCount,
      maxBetaUsers: 200,
      acceptingUsers: await canAcceptMoreUsers(),
      ...budgetStats,
    });
  });

  app.get("/api/admin/cost-dashboard", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const dashboard = await getCostDashboard();
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get cost dashboard" });
    }
  });

  app.post("/api/admin/cost-cap", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { costCapInr } = req.body;
      if (!costCapInr || costCapInr < 0) {
        return res.status(400).json({ error: "costCapInr is required and must be positive" });
      }
      await updateCostCap(costCapInr);
      res.json({ success: true, newCap: costCapInr });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update cost cap" });
    }
  });

  app.post("/api/admin/beta/generate-codes", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { count } = req.body;
      const numCodes = Math.min(count || 10, 50);
      const codes = await createSystemInviteCodes(numCodes);
      res.json({ codes, total: codes.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate invite codes" });
    }
  });

  app.get("/api/admin/beta/allow-list", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const list = await listAllowList();
      res.json({ allowList: list, total: list.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch allow list" });
    }
  });

  app.post("/api/admin/beta/allow-list", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { identifier, identifierType } = req.body;
      if (!identifier || !identifierType) {
        return res.status(400).json({ error: "identifier and identifierType (email/phone) are required" });
      }
      await addToAllowList(identifier, identifierType);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to add to allow list" });
    }
  });

  app.get("/api/admin/beta/invite-codes", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const codes = await listInviteCodes();
      res.json({ codes, total: codes.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch invite codes" });
    }
  });

  app.post("/api/admin/beta/invite-codes", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { code, maxUses, expiresAt } = req.body;
      if (!code) return res.status(400).json({ error: "code is required" });
      const invite = await createInviteCode(code, maxUses || 1, expiresAt ? new Date(expiresAt) : undefined);
      res.json(invite);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create invite code" });
    }
  });

  // =============================================
  // USER FEEDBACK / ISSUE REPORTING
  // =============================================

  app.post("/api/user/feedback", async (req: Request, res: Response) => {
    try {
      const { category, description, page } = req.body;
      if (!category || !description) {
        return res.status(400).json({ error: "Category and description are required" });
      }
      const validCategories = ['bug', 'feature', 'content', 'performance', 'other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const session = await verifySession(authHeader.split(" ")[1]);
        if (session) userId = session.id;
      }
      const [feedback] = await db.insert(aryaUserFeedback).values({
        userId,
        category,
        description: description.substring(0, 2000),
        page: page || null,
      }).returning();
      res.status(201).json({ success: true, id: feedback.id });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/admin/feedback", requireAdmin, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      let query = db.select().from(aryaUserFeedback).orderBy(desc(aryaUserFeedback.createdAt));
      const items = await query;
      const filtered = status ? items.filter(i => i.status === status) : items;
      res.json({ items: filtered, total: filtered.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/admin/feedback/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status, adminNotes } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;
      await db.update(aryaUserFeedback).set(updates).where(eq(aryaUserFeedback.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  // Tutorial completion tracking
  app.post("/api/user/tutorial-complete", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.json({ success: true });
      }
      const session = await verifySession(authHeader.split(" ")[1]);
      if (session) {
        await db.update(aryaUsers)
          .set({ onboardingComplete: true })
          .where(eq(aryaUsers.id, session.id));
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  return httpServer;
}
