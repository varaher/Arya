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
import { getCacheQualityReport } from "./arya/response-quality-scorer";
import { sarvamLangToShort, autoUpdateLanguagePreference } from "./arya/language-detector";
import { detectLanguageFromIP, LANGUAGE_DISPLAY_NAMES } from "./arya/ip-language-detector";
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
import { QueryRequestSchema, DomainSchema, aryaKnowledge, aryaClinicalRecords, aryaVoiceQualityLog, aryaMemory, aryaNitiSessions, aryaNitiMessages, aryaPortfolioHoldings, aryaHealthReadings } from "@shared/schema";
import OpenAI from "openai";
import { eq, and, desc, asc, sql, or, isNull, lte, inArray } from "drizzle-orm";
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
import { checkBudget, checkAndRecordBudget, recordLLMCall, getBudgetStats, getCostDashboard, updateCostCap, getLimits, type CallType, type UserPlan } from "./arya/usage-budget";
import {
  isRazorpayConfigured, getRazorpayKeyId, createSubscription as createRazorpaySubscription,
  cancelUserSubscription, verifyPaymentSignature, verifyWebhookSignature,
  activateUserPlan, handleWebhookEvent, getSubscriptionStatus, PLAN_CONFIG,
} from "./arya/razorpay-service";
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
  aryaMoodCheckins,
  aryaVoiceNotes,
  aryaSubscriptions,
  aryaCommunityMembers,
  aryaCommunityChallenge,
  aryaCommunityPosts,
  aryaCommunityReactions,
} from "@shared/schema";
import { getVapidPublicKey } from "./arya/reminder-scheduler";
import { conversations } from "@shared/models/chat";
import { streamRehearsalResponse, generateRehearsalFeedback } from "./arya/rehearsal";
import { getDataSummary, forgetSelective, forgetPeriod, forgetAll } from "./arya/forget-me-service";
import { computeKundliProfile, generateVedicBriefing } from "./arya/vedic-lens";
import { createNitiSession, addNitiMessage } from "./arya/niti";

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
      const {
        preferredLanguage, currentWork, wantsDailyReminder, voiceEnabled,
        name, focusAreas, futureLetter, accountName, accountPhone,
        morningBriefingEnabled, morningBriefingTime, uiLanguage, weeklyReviewEnabled,
      } = req.body;

      const updates: Record<string, any> = {
        preferredLanguage: preferredLanguage || uiLanguage || "en",
        currentWork: currentWork || null,
        wantsDailyReminder: wantsDailyReminder ?? false,
        voiceEnabled: voiceEnabled ?? true,
        onboardingComplete: true,
      };

      if (name?.trim())         updates.name = name.trim();
      if (Array.isArray(focusAreas) && focusAreas.length) updates.focusAreas = focusAreas;
      if (futureLetter?.trim()) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        updates.futureYouLetter     = futureLetter.trim();
        updates.futureYouLetterDate = futureDate;
      }
      if (accountName?.trim())  updates.reflectionShareName    = accountName.trim();
      if (accountPhone?.trim()) updates.reflectionShareContact = accountPhone.trim();
      if (morningBriefingEnabled !== undefined) updates.morningBriefingEnabled = !!morningBriefingEnabled;
      if (morningBriefingTime)  updates.morningBriefingTime = morningBriefingTime;
      if (uiLanguage)           updates.uiLanguage = uiLanguage;
      if (weeklyReviewEnabled !== undefined) updates.weeklyReviewEnabled = !!weeklyReviewEnabled;

      await db.update(aryaUsers).set(updates).where(eq(aryaUsers.id, userId));

      // Seed memory with focus areas and future letter for AI context
      if (Array.isArray(focusAreas) && focusAreas.length) {
        await db.insert(aryaMemory).values({
          tenantId: userId,
          category: "preference",
          key: "focus_areas",
          value: focusAreas.join(", "),
          source: "explicit",
          confidence: "1.00",
        }).catch(() => {});
      }
      if (futureLetter?.trim()) {
        await db.insert(aryaMemory).values({
          tenantId: userId,
          category: "context",
          key: "future_you_letter",
          value: futureLetter.trim().slice(0, 1000),
          source: "explicit",
          confidence: "1.00",
        }).catch(() => {});
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Onboarding]", error.message);
      res.status(500).json({ error: "Failed to save onboarding preferences" });
    }
  });

  // =============================================
  // USER PROFILE
  // =============================================

  app.get("/api/user/profile", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const [user] = await db.select({
        name: aryaUsers.name,
        email: aryaUsers.email,
        phone: aryaUsers.phone,
        age: (aryaUsers as any).age,
        city: (aryaUsers as any).city,
        occupation: (aryaUsers as any).occupation,
        lifeStage: (aryaUsers as any).lifeStage,
        familySituation: (aryaUsers as any).familySituation,
        interests: (aryaUsers as any).interests,
        currentChallenges: (aryaUsers as any).currentChallenges,
        workingStyle: (aryaUsers as any).workingStyle,
        currentWork: aryaUsers.currentWork,
      }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.post("/api/user/profile", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { name, phone, age, city, occupation, lifeStage, familySituation, interests, currentChallenges, workingStyle } = req.body;

      const updates: any = {};
      if (name !== undefined && typeof name === "string" && name.trim()) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
      if (age !== undefined) updates.age = age ? Number(age) : null;
      if (city !== undefined) updates.city = city || null;
      if (occupation !== undefined) updates.occupation = occupation || null;
      if (lifeStage !== undefined) updates.lifeStage = lifeStage || null;
      if (familySituation !== undefined) updates.familySituation = familySituation || null;
      if (Array.isArray(interests)) updates.interests = interests.filter(Boolean).slice(0, 10);
      if (currentChallenges !== undefined) updates.currentChallenges = currentChallenges || null;
      if (workingStyle !== undefined) updates.workingStyle = workingStyle || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields provided" });
      }

      await db.update(aryaUsers).set(updates as any).where(eq(aryaUsers.id, userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save profile" });
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
        wantsNewsDigest: aryaUsers.wantsNewsDigest,
        morningBriefingEnabled: (aryaUsers as any).morningBriefingEnabled,
        morningBriefingTime: (aryaUsers as any).morningBriefingTime,
        weeklyReviewEnabled: (aryaUsers as any).weeklyReviewEnabled,
        uiLanguage: (aryaUsers as any).uiLanguage,
        reflectionShareEnabled: (aryaUsers as any).reflectionShareEnabled,
        reflectionShareName: (aryaUsers as any).reflectionShareName,
        reflectionShareContact: (aryaUsers as any).reflectionShareContact,
        reflectionSharePaused: (aryaUsers as any).reflectionSharePaused,
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
  // FUTURE YOU LETTER
  // =============================================

  app.get("/api/user/future-letter", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const [user] = await db.select({
        futureYouLetter: (aryaUsers as any).futureYouLetter,
        futureYouLetterDate: (aryaUsers as any).futureYouLetterDate,
      }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        letter: (user as any).futureYouLetter || null,
        writtenAt: (user as any).futureYouLetterDate || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get future letter" });
    }
  });

  app.post("/api/user/future-letter", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { letter } = req.body;
      if (!letter || typeof letter !== "string" || letter.trim().length < 20) {
        return res.status(400).json({ error: "Letter must be at least 20 characters" });
      }
      await db.update(aryaUsers)
        .set({
          futureYouLetter: letter.trim().slice(0, 3000),
          futureYouLetterDate: new Date(),
        } as any)
        .where(eq(aryaUsers.id, userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save future letter" });
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
      const goalType = req.query.goalType as string | undefined;

      let conditions: any[] = [eq(aryaGoals.userId, userId)];
      if (status) conditions.push(eq(aryaGoals.status, status as any));
      if (goalType) conditions.push(eq((aryaGoals as any).goalType, goalType));

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
      const {
        title, description, steps, priority,
        dailyTargetMinutes, reminderTime,
        goalType, dueDate, reminderAt, recurrence,
        peopleInvolved, contextNote,
      } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const type = goalType || "habit";

      // Cap active habits at 5; tasks/reminders/intentions are uncapped
      if (type === "habit") {
        const activeHabits = await db.select().from(aryaGoals)
          .where(and(
            eq(aryaGoals.userId, userId),
            eq(aryaGoals.status, "active" as any),
            eq((aryaGoals as any).goalType, "habit")
          ));
        if (activeHabits.length >= 5) {
          return res.status(429).json({ error: "You can have up to 5 active habits. Complete or pause an existing one first." });
        }
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
        goalType: type as any,
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        recurrence: recurrence || null,
        peopleInvolved: peopleInvolved || null,
        contextNote: contextNote || null,
        isCompleted: false,
        reminderFired: false,
      } as any).returning();

      const createdSteps: any[] = [];
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
      const {
        status, title, description, dailyTargetMinutes, reminderTime,
        dueDate, reminderAt, recurrence, peopleInvolved, contextNote,
        isCompleted,
      } = req.body;

      const [goal] = await db.select().from(aryaGoals)
        .where(and(eq(aryaGoals.id, goalId), eq(aryaGoals.userId, userId)))
        .limit(1);
      if (!goal) return res.status(404).json({ error: "Goal not found" });

      const update: any = { updatedAt: new Date() };
      if (status !== undefined) update.status = status;
      if (title !== undefined) update.title = title;
      if (description !== undefined) update.description = description;
      if (dailyTargetMinutes !== undefined) update.dailyTargetMinutes = dailyTargetMinutes;
      if (reminderTime !== undefined) update.reminderTime = reminderTime;
      if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
      if (reminderAt !== undefined) {
        update.reminderAt = reminderAt ? new Date(reminderAt) : null;
        update.reminderFired = false; // reset so it fires at the new time
      }
      if (recurrence !== undefined) update.recurrence = recurrence;
      if (peopleInvolved !== undefined) update.peopleInvolved = peopleInvolved;
      if (contextNote !== undefined) update.contextNote = contextNote;
      if (isCompleted !== undefined) update.isCompleted = isCompleted;
      if (status === "completed" || isCompleted === true) {
        update.completedAt = new Date();
        update.isCompleted = true;
        update.status = "completed";
      }

      await db.update(aryaGoals).set(update).where(eq(aryaGoals.id, goalId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[UPDATE GOAL ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/user/goals/:goalId", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { goalId } = req.params;
      const [goal] = await db.select().from(aryaGoals)
        .where(and(eq(aryaGoals.id, goalId), eq(aryaGoals.userId, userId)))
        .limit(1);
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      await db.delete(aryaGoalSteps).where(eq(aryaGoalSteps.goalId, goalId));
      await db.delete(aryaGoals).where(eq(aryaGoals.id, goalId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[DELETE GOAL ERROR]", error.message || "Unknown error");
      res.status(500).json({ error: "Failed to delete goal" });
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

  // Seed Jyotish knowledge from Phaladeepika + Brihat Parashara
  app.post("/api/admin/knowledge/seed-jyotish", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { jyotishSeedUnits, JYOTISH_TENANT_ID } = await import("./arya/seeds/jyotish-seed");
      const tenantId = JYOTISH_TENANT_ID;
      // Check how many are already seeded
      const existing = await db.select({ id: aryaKnowledge.id })
        .from(aryaKnowledge)
        .where(and(eq(aryaKnowledge.tenantId, tenantId), eq(aryaKnowledge.domain, "jyotish" as any)));
      if (existing.length > 0) {
        return res.json({ skipped: true, message: `${existing.length} Jyotish units already exist. Delete them first to re-seed.`, existing: existing.length });
      }
      let inserted = 0;
      for (const unit of jyotishSeedUnits) {
        await db.insert(aryaKnowledge).values({
          tenantId,
          domain: "jyotish" as any,
          topic: unit.topic,
          content: unit.content,
          tags: unit.tags,
          language: "en",
          sourceType: "classical_text",
          sourceTitle: unit.source,
          status: "published",
        });
        inserted++;
      }
      console.log(`[Jyotish Seed] Inserted ${inserted} knowledge units`);
      res.json({ success: true, inserted, message: `${inserted} Jyotish knowledge units seeded from Phaladeepika & Brihat Parashara.` });
    } catch (err: any) {
      console.error("[Jyotish Seed] Error:", err);
      res.status(500).json({ error: "Failed to seed Jyotish knowledge", detail: err.message });
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

  app.get("/api/arya/conversations", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || null;
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/conversations", optionalUser, async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const userId = (req as any).userId || null;
      const conversation = await chatStorage.createConversation(title || "New Chat", userId);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/arya/conversations/:id", optionalUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).userId || null;
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      // Only allow access if conversation belongs to this user
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/arya/conversations/:id", optionalUser, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).userId || null;
      await chatStorage.deleteConversation(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // ── Right to Forget (DPDP Act 2023) ─────────────────────────────────────────

  app.get("/api/user/data-summary", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const summary = await getDataSummary(userId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch data summary" });
    }
  });

  app.delete("/api/user/forget/selective", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { categories } = req.body;
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({ error: "categories array is required" });
      }
      const recordsDeleted = await forgetSelective(userId, categories);
      res.json({ ok: true, recordsDeleted });
    } catch (error: any) {
      res.status(500).json({ error: "Deletion failed. Please try again." });
    }
  });

  app.delete("/api/user/forget/period", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const recordsDeleted = await forgetPeriod(userId, new Date(startDate), new Date(endDate));
      res.json({ ok: true, recordsDeleted });
    } catch (error: any) {
      res.status(500).json({ error: "Deletion failed. Please try again." });
    }
  });

  app.delete("/api/user/forget/all", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const recordsDeleted = await forgetAll(userId);
      res.json({ ok: true, recordsDeleted });
    } catch (error: any) {
      res.status(500).json({ error: "Deletion failed. Please try again." });
    }
  });

  // ── Vedic Lens ────────────────────────────────────────────────────────────────

  app.post("/api/user/vedic-lens", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Login required" });

      const { rashi, birthDate, birthPlace, birthTimeApprox, birthTimeExact } = req.body;

      let nakshatra: string | null = null;
      let dashaLord: string | null = null;
      let dashaYearsLeft: string | null = null;

      if (birthDate) {
        const computed = computeKundliProfile(birthDate);
        nakshatra = computed.nakshatra;
        dashaLord = computed.dashaLord;
        dashaYearsLeft = computed.dashaYearsLeft;
      }

      await db.update(aryaUsers).set({
        vedicLensEnabled: true,
        rashi: rashi || null,
        birthDate: birthDate || null,
        birthPlace: birthPlace || null,
        birthTimeApprox: birthTimeApprox || null,
        birthTimeExact: birthTimeExact || null,
        nakshatra,
        dashaLord,
        dashaYearsLeft,
      }).where(eq(aryaUsers.id, userId));

      res.json({
        ok: true,
        profile: { rashi, nakshatra, dashaLord, dashaYearsLeft },
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save Vedic Lens profile" });
    }
  });

  app.get("/api/user/vedic-lens", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Login required" });

      const [user] = await db.select({
        vedicLensEnabled: aryaUsers.vedicLensEnabled,
        rashi: aryaUsers.rashi,
        nakshatra: aryaUsers.nakshatra,
        dashaLord: aryaUsers.dashaLord,
        dashaYearsLeft: aryaUsers.dashaYearsLeft,
        birthDate: aryaUsers.birthDate,
        birthPlace: aryaUsers.birthPlace,
        birthTimeApprox: aryaUsers.birthTimeApprox,
      }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

      res.json(user || {});
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch Vedic profile" });
    }
  });

  app.get("/api/user/vedic-briefing", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Login required" });
      const briefing = await generateVedicBriefing(userId);
      res.json(briefing);
    } catch (error: any) {
      console.error("[VedicBriefing] Route error:", error?.message, error?.stack?.split("\n")[1]);
      res.status(500).json({ error: "Failed to generate Vedic briefing" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  // Start a rehearsal conversation — ARYA plays a persona so the user can practise
  app.post("/api/arya/conversations/:id/start-rehearsal", optionalUser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { persona, situation } = req.body;
      const userId = (req as any).userId || null;

      if (!persona?.trim()) {
        return res.status(400).json({ error: "persona is required" });
      }

      const conv = await chatStorage.getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.userId && conv.userId !== userId) return res.status(403).json({ error: "Access denied" });

      await db.update(conversations)
        .set({
          mode: "rehearsal",
          rehearsalPersona: `${persona.trim()}|||${(situation || "").trim()}`,
          rehearsalExchangeCount: 0,
        })
        .where(eq(conversations.id, conversationId));

      const setupMessage = `Ready. I'm stepping into the role of ${persona.trim()}. Take a breath — then say whatever you'd actually say when this conversation begins. I'll respond as them.\n\n*(Type 'feedback' at any time to step out and get coaching on how it's going.)*`;

      await chatStorage.createMessage(conversationId, "assistant", setupMessage);

      res.json({ ok: true, setupMessage });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Get coaching feedback for a rehearsal conversation + exit rehearsal mode
  app.post("/api/arya/conversations/:id/rehearsal-feedback", optionalUser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = (req as any).userId || null;

      const conv = await chatStorage.getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (conv.userId && conv.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const personaData = (((conv as any).rehearsalPersona) || "|||").split("|||");
      const persona = personaData[0] || "the other person";
      const situation = personaData[1] || "this conversation";

      const allMessages = await chatStorage.getMessagesByConversation(conversationId);
      const convoMessages = allMessages.slice(1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      if (convoMessages.length < 2) {
        return res.status(400).json({ error: "Have a few exchanges first, then get feedback." });
      }

      const feedback = await generateRehearsalFeedback(convoMessages, {
        persona,
        situation,
        exchangeCount: convoMessages.length,
      });

      const feedbackMessage = `---\n**ARYA's Coaching Feedback**\n\n${feedback}`;
      await chatStorage.createMessage(conversationId, "assistant", feedbackMessage);

      await db.update(conversations)
        .set({ mode: "reviewed" })
        .where(eq(conversations.id, conversationId));

      res.json({ ok: true, feedback });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Text chat: send message, get streaming AI response with knowledge context
  app.post("/api/arya/conversations/:id/messages", optionalUser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, tenant_id, language, section } = req.body;
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

      let userPlan: UserPlan = 'free';
      if (userId) {
        const [u] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
        userPlan = ((u as any)?.plan as UserPlan) || 'free';
      }
      const budgetCheck = await checkAndRecordBudget(userId, 'text_chat', 0, userPlan);
      if (!budgetCheck.allowed) {
        return res.status(429).json({ error: budgetCheck.reason, upgradeAvailable: budgetCheck.upgradeAvailable });
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

      // Intercept rehearsal conversations — ARYA responds as the persona
      const convMeta = await chatStorage.getConversation(conversationId);
      if (convMeta && (convMeta as any).mode === "rehearsal") {
        const personaData = (((convMeta as any).rehearsalPersona) || "|||").split("|||");
        const persona = personaData[0] || "the other person";
        const situation = personaData[1] || "";
        const exchangeCount = ((convMeta as any).rehearsalExchangeCount || 0);

        await db.update(conversations)
          .set({ rehearsalExchangeCount: exchangeCount + 1 })
          .where(eq(conversations.id, conversationId));

        res.write(`data: ${JSON.stringify({ type: "meta", mode: "rehearsal", icon: "🎭" })}\n\n`);

        let fullResponse = "";
        for await (const chunk of streamRehearsalResponse(content, history, { persona, situation, exchangeCount })) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      const { stream, meta } = await generateAryaResponse(content, history, userId || tenant_id || "varah", conversationId, userId, false, undefined, language, section || "chat");
      let fullResponse = "";

      res.write(`data: ${JSON.stringify({ type: "meta", mode: meta.mode, icon: meta.icon, confidence: meta.confidence, sourcesCount: meta.sourcesCount, memoryUsed: meta.memoryUsed })}\n\n`);

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      // Translate to selected Indian language if not English
      const isIndianNonEnglish = language && language !== "en-IN" && language.endsWith("-IN");
      if (isIndianNonEnglish && fullResponse.trim()) {
        try {
          const translation = await sarvamTranslate(fullResponse, "en-IN", language as any);
          res.write(`data: ${JSON.stringify({ type: "translated_response", content: translation.translatedText })}\n\n`);
        } catch (e: any) {
          console.error("[TRANSLATION ERROR]", e?.message);
        }
      }

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

      let voiceUserPlan: UserPlan = 'free';
      if (userId) {
        const [vu] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
        voiceUserPlan = ((vu as any)?.plan as UserPlan) || 'free';
      }
      const budgetCheck = await checkAndRecordBudget(userId, 'voice', 0, voiceUserPlan);
      if (!budgetCheck.allowed) {
        return res.status(429).json({ error: budgetCheck.reason, upgradeAvailable: budgetCheck.upgradeAvailable });
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
        // Always use the user's requested language for output — never let Sarvam override to Urdu
        // Hindi and Urdu sound identical; Sarvam sometimes detects hi-IN speech as ur-IN
        let rawDetected = sttResult.languageCode || language;
        if (rawDetected === "ur-IN" || rawDetected === "ur") rawDetected = "hi-IN";
        detectedLanguage = rawDetected;

        if (isIndianLanguage(detectedLanguage)) {
          const translation = await sarvamTranslate(userTranscript, language as SarvamLanguageCode, "en-IN");
          queryForArya = translation.translatedText;
          console.log(`[Voice] Translated "${userTranscript}" → "${queryForArya}"`);
        } else {
          queryForArya = userTranscript;
        }
      } else {
        const isoLang = (language || "en-IN").split("-")[0] || "en";
        userTranscript = await speechToText(audioBuffer, inputFormat, isoLang);
        // Safety check: if transcript contains CJK characters (Chinese/Japanese/Korean)
        // but we expected English or Hindi, the model misdetected the language — discard it
        const hasCJK = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(userTranscript);
        if (hasCJK) {
          console.warn(`[Voice] CJK characters detected in transcript for lang=${isoLang}, discarding: "${userTranscript.slice(0, 50)}"`);
          userTranscript = "";
        }
        queryForArya = userTranscript;
        detectedLanguage = "en-IN";
      }

      if (!queryForArya.trim()) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.write(`data: ${JSON.stringify({ type: "error", content: "I couldn't catch that clearly. Please speak again." })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        return res.end();
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

      // Pass Sarvam's detected language into the engine so the correct
      // language instruction is injected into the system prompt.
      // Also fire the preference-update async so the user's profile learns.
      if (voiceUserId && detectedLanguage && detectedLanguage !== "en-IN") {
        autoUpdateLanguagePreference(voiceUserId, sarvamLangToShort(detectedLanguage), history)
          .catch(() => {});
      }

      const { stream, meta } = await generateAryaResponse(
        queryForArya, history,
        voiceUserId || tenant_id || "varah",
        conversationId, voiceUserId, true,
        detectedLanguage   // Sarvam-detected — overrides script detection in chat-engine
      );
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

      let voiceLogId: string | null = null;
      try {
        const [logRow] = await db.insert(aryaVoiceQualityLog).values({
          userId: voiceUserId,
          conversationId: conversationId || null,
          language: (detectedLanguage || "en").split("-")[0],
          transcriptLength: userTranscript.length,
          wasCjkRejected: false,
          responseLength: fullResponse.length,
        }).returning({ id: aryaVoiceQualityLog.id });
        voiceLogId = logRow?.id || null;
      } catch {}

      res.write(`data: ${JSON.stringify({ type: "done", logId: voiceLogId })}\n\n`);
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

  // ── News ──────────────────────────────────────────────────────────────────
  app.get("/api/arya/news", optionalUser, async (req: Request, res: Response) => {
    try {
      const { fetchLatestNews } = await import("./arya/news-service");
      const category = (req.query.category as string) || "all";
      const force = req.query.force === "true";
      const headlines = await fetchLatestNews(force);
      const filtered = category !== "all" ? headlines.filter(h => h.category === category) : headlines;
      res.json({ headlines: filtered.slice(0, 20), total: filtered.length, cached: !force });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch news", details: err.message });
    }
  });

  app.post("/api/user/news-notifications", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { enabled } = req.body;
      await db.update(aryaUsers).set({ wantsNewsDigest: !!enabled }).where(eq(aryaUsers.id, userId));
      res.json({ ok: true, wantsNewsDigest: !!enabled });
    } catch {
      res.status(500).json({ error: "Failed to update preference" });
    }
  });

  // ── Morning Briefing ──────────────────────────────────────────────────────
  app.post("/api/user/morning-briefing", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { enabled, time } = req.body;
      await db.update(aryaUsers).set({
        morningBriefingEnabled: !!enabled,
        morningBriefingTime: time || "07:00",
      } as any).where(eq(aryaUsers.id, userId));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to update morning briefing preference" });
    }
  });

  // ── Weekly Review ──────────────────────────────────────────────────────
  app.post("/api/user/weekly-review", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { enabled } = req.body;
      await db.update(aryaUsers).set({ weeklyReviewEnabled: !!enabled } as any).where(eq(aryaUsers.id, userId));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to update weekly review preference" });
    }
  });

  // ── UI Language ──────────────────────────────────────────────────────────
  app.post("/api/user/ui-language", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { language } = req.body;
      const VALID_LANGS = ["en","hi","ta","te","kn","ml","bn","mr","gu","pa","od","sa","ur","ar","he","fr","es","de","ja","zh","ko","pt","ru","tr","id","sw"];
      if (!VALID_LANGS.includes(language)) return res.status(400).json({ error: "Unsupported language" });
      await db.update(aryaUsers).set({ uiLanguage: language } as any).where(eq(aryaUsers.id, userId));
      res.json({ ok: true, uiLanguage: language });
    } catch {
      res.status(500).json({ error: "Failed to update UI language" });
    }
  });

  // ── IP-based Language Detection (no auth required) ────────────────────────
  app.get("/api/detect-language", async (req: Request, res: Response) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (req.headers["x-real-ip"] as string) ||
        req.socket?.remoteAddress ||
        "";
      const result = await detectLanguageFromIP(ip);
      res.json(result);
    } catch {
      res.json({ language: "en", languageName: "English", country: "", region: "" });
    }
  });

  // ── Mood Check-ins ────────────────────────────────────────────────────────
  app.post("/api/user/mood", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { mood, energy, note } = req.body;
      if (!mood || !energy || mood < 1 || mood > 5 || energy < 1 || energy > 5) {
        return res.status(400).json({ error: "Mood and energy are required (1-5)" });
      }
      const [checkin] = await db.insert(aryaMoodCheckins).values({ userId, mood, energy, note: note || null }).returning();
      res.json(checkin);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save mood check-in" });
    }
  });

  app.get("/api/user/mood/today", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [checkin] = await db.select().from(aryaMoodCheckins)
        .where(and(eq(aryaMoodCheckins.userId, userId), sql`${aryaMoodCheckins.createdAt} >= ${todayStart}`))
        .orderBy(desc(aryaMoodCheckins.createdAt))
        .limit(1);
      res.json({ checkin: checkin || null, hasCheckedIn: !!checkin });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get mood check-in" });
    }
  });

  app.get("/api/user/mood/history", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const checkins = await db.select().from(aryaMoodCheckins)
        .where(eq(aryaMoodCheckins.userId, userId))
        .orderBy(desc(aryaMoodCheckins.createdAt))
        .limit(30);
      res.json({ checkins });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get mood history" });
    }
  });

  // ── Health Readings (Prana) ─────────────────────────────────────────────────
  app.post("/api/user/health/readings", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { metric, value, value2, unit, notes } = req.body;
      if (!metric || value === undefined || value === null) return res.status(400).json({ error: "metric and value are required" });
      const [reading] = await db.insert(aryaHealthReadings).values({
        userId, metric, value: String(value), value2: value2 != null ? String(value2) : null, unit: unit || null, notes: notes || null,
      }).returning();
      res.json({ reading });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save health reading" });
    }
  });

  app.get("/api/user/health/readings", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { metric, days = "14" } = req.query as Record<string, string>;
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days));
      let query = db.select().from(aryaHealthReadings)
        .where(and(eq(aryaHealthReadings.userId, userId), sql`${aryaHealthReadings.loggedAt} >= ${since}`))
        .orderBy(desc(aryaHealthReadings.loggedAt));
      if (metric) {
        const readings = await db.select().from(aryaHealthReadings)
          .where(and(eq(aryaHealthReadings.userId, userId), eq(aryaHealthReadings.metric, metric), sql`${aryaHealthReadings.loggedAt} >= ${since}`))
          .orderBy(desc(aryaHealthReadings.loggedAt)).limit(30);
        return res.json({ readings });
      }
      const readings = await query.limit(200);
      res.json({ readings });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch health readings" });
    }
  });

  app.delete("/api/user/health/readings/:id", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      await db.delete(aryaHealthReadings).where(and(eq(aryaHealthReadings.id, req.params.id), eq(aryaHealthReadings.userId, userId)));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete reading" });
    }
  });

  app.get("/api/user/health/insights", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const since = new Date(); since.setDate(since.getDate() - 14);
      const readings = await db.select().from(aryaHealthReadings)
        .where(and(eq(aryaHealthReadings.userId, userId), sql`${aryaHealthReadings.loggedAt} >= ${since}`))
        .orderBy(desc(aryaHealthReadings.loggedAt)).limit(200);
      if (readings.length < 3) return res.json({ insights: [], insufficient: true });

      const summary: Record<string, number[]> = {};
      readings.forEach(r => {
        if (!summary[r.metric]) summary[r.metric] = [];
        summary[r.metric].push(parseFloat(r.value));
      });
      const dataLines = Object.entries(summary).map(([m, vals]) => {
        const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
        return `${m}: last ${vals.length} readings, avg ${avg}, latest ${vals[0]}`;
      }).join("\n");

      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You are ARYA's health pattern observer. You notice lifestyle patterns in user health data and share warm, observational insights. CRITICAL RULES: (1) NEVER diagnose any condition. (2) NEVER prescribe medication or supplements. (3) NEVER create alarm or panic. (4) For anything medically concerning (SpO2 < 95, very elevated HR), say "worth mentioning to your doctor at your next visit" — calmly. (5) Connect health to lifestyle: sleep, stress, movement, energy. (6) Tone: warm, personal, like a caring friend — not clinical. Return ONLY a JSON array of exactly 5 insights. Each: { type: "positive"|"caution"|"flag"|"correlation"|"neutral", icon: "emoji", title: "short title", body: "2-3 sentences max. conversational.", tip: "one short actionable suggestion or null" }` },
          { role: "user", content: `Here is my health data from the last 14 days:\n${dataLines}\n\nGive me 5 personal insights based on these patterns.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 900,
      });
      const parsed = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ insights: parsed.insights || parsed || [] });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // ── Voice Notes ────────────────────────────────────────────────────────────
  app.post("/api/user/voice-notes", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { transcript, title, tags, durationSeconds, language } = req.body;
      if (!transcript?.trim()) return res.status(400).json({ error: "Transcript is required" });
      const autoTitle = title || transcript.slice(0, 60) + (transcript.length > 60 ? "…" : "");
      const [note] = await db.insert(aryaVoiceNotes).values({
        userId,
        transcript: transcript.trim(),
        title: autoTitle,
        tags: Array.isArray(tags) ? tags : [],
        durationSeconds: durationSeconds || 0,
        language: language || "en",
      }).returning();
      res.json(note);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save voice note" });
    }
  });

  app.get("/api/user/voice-notes", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const notes = await db.select().from(aryaVoiceNotes)
        .where(eq(aryaVoiceNotes.userId, userId))
        .orderBy(desc(aryaVoiceNotes.createdAt))
        .limit(50);
      res.json({ notes });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get voice notes" });
    }
  });

  app.delete("/api/user/voice-notes/:id", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      await db.delete(aryaVoiceNotes)
        .where(and(eq(aryaVoiceNotes.id, id), eq(aryaVoiceNotes.userId, userId)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete voice note" });
    }
  });

  app.post("/api/arya/voice-quality/:logId/rate", optionalUser, async (req: Request, res: Response) => {
    try {
      const { logId } = req.params;
      const { rating } = req.body;
      if (!logId || (rating !== 1 && rating !== -1)) return res.status(400).json({ error: "Invalid rating" });
      await db.update(aryaVoiceQualityLog).set({ userRating: rating }).where(eq(aryaVoiceQualityLog.id, logId));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to save rating" });
    }
  });

  app.post("/api/arya/conversations/:id/scan", optionalUser, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      const { image, mimeType = "image/jpeg", question, language } = req.body;

      if (!image) return res.status(400).json({ error: "File data required" });

      const { openai } = await import("./replit_integrations/audio/client");
      const isPdf = mimeType === "application/pdf";

      const systemPrompt = `You are ARYA (Augmented Reasoning & Yielding Awareness), a warm, wise personal thinking & growth assistant. When analyzing images and documents, be clear, practical, and compassionate. For medical reports or health documents, explain findings in simple language without causing alarm — be reassuring and suggest consulting a doctor for anything serious. For text documents, summarize key points clearly. For general images, describe and provide relevant insights. Always be encouraging and helpful like a wise friend.`;

      let aryaResponse: string;
      let userMessageForStorage: string;

      if (isPdf) {
        // Extract text from PDF using pdf-parse
        const pdfParse = (await import("pdf-parse")).default;
        const pdfBuffer = Buffer.from(image, "base64");
        let pdfText = "";
        try {
          const parsed = await pdfParse(pdfBuffer);
          pdfText = parsed.text?.slice(0, 12000) || "";
        } catch (e) {
          console.error("[Scan] PDF parse error:", e);
        }

        const userQuestion = question?.trim() || "Please summarize this document clearly and helpfully.";
        userMessageForStorage = question?.trim() ? `📄 ${question.trim()}` : "📄 Shared a PDF document";

        if (!pdfText.trim()) {
          aryaResponse = "I wasn't able to extract text from that PDF. It may be a scanned/image-only PDF. Please try with a text-based PDF or share a clear photo of the document.";
        } else {
          const pdfResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Here is the content of a PDF document:\n\n${pdfText}\n\n---\n\n${userQuestion}` },
            ],
            max_tokens: 1500,
          } as any);
          aryaResponse = (pdfResponse as any).choices?.[0]?.message?.content || "I couldn't analyze that document. Please try again.";
        }
      } else {
        // Image vision analysis
        const userQuestion = question?.trim() || "What is in this image? Please explain it clearly and helpfully.";
        userMessageForStorage = question?.trim() ? `📷 ${question.trim()}` : "📷 Shared an image";

        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}`, detail: "high" } as any },
                { type: "text", text: userQuestion },
              ],
            },
          ],
          max_tokens: 1200,
        } as any);
        aryaResponse = (visionResponse as any).choices?.[0]?.message?.content || "I couldn't read that image clearly. Please try with a clearer photo.";
      }

      await chatStorage.createMessage(conversationId, "user", userMessageForStorage);
      await chatStorage.createMessage(conversationId, "assistant", aryaResponse);

      let translatedResponse = null;
      if (isIndianLanguage(language) && process.env.SARVAM_API_KEY) {
        try {
          const translation = await sarvamTranslate(aryaResponse, "en-IN", language);
          translatedResponse = translation.translatedText;
        } catch (e) {
          console.error("[Scan] Translation error:", e);
        }
      }

      res.json({ userMessage: userMessageForStorage, aryaResponse, translatedResponse, language: language || "en-IN" });
    } catch (error: any) {
      console.error("[SCAN ERROR]", error.message);
      res.status(500).json({ error: "Failed to analyze file. Please try again." });
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
  // Daily personalized quote — cached per user per day
  const dailyQuoteCache = new Map<string, { quote: string; source: string; date: string }>();

  app.get("/api/arya/daily-quote", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const today = new Date().toDateString();
      const cacheKey = `v3_${userId}_${today}`;

      if (dailyQuoteCache.has(cacheKey)) {
        const cached = dailyQuoteCache.get(cacheKey)!;
        return res.json({ quote: cached.quote, date: cached.date });
      }

      // Fetch user's top memories for personalization
      const [userRow] = await db.select({ name: aryaUsers.name }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      const firstName = userRow?.name?.split(" ")[0] || "friend";

      const memories = await db.select({
        category: aryaMemory.category,
        key: aryaMemory.key,
        value: aryaMemory.value,
      }).from(aryaMemory)
        .where(eq(aryaMemory.tenantId, userId))
        .orderBy(desc(aryaMemory.accessCount))
        .limit(12);

      const memoryContext = memories.length > 0
        ? memories.map(m => `${m.key}: ${m.value}`).join("; ")
        : "";

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `You are ARYA — a personal thinking and growth assistant who speaks to ${firstName} like a wise, warm friend. You carry deep knowledge of India's civilizational wisdom: the Upanishads, Gita, Yoga Sutras, Chanakya, the great saints and thinkers — but you never quote or cite them directly. That wisdom simply flows through your words naturally.

Write ONE original reflection for ${firstName} to begin their day. It should feel like ARYA wrote it personally — not a quote from a book, not a proverb, just a direct, warm, powerful thought addressed to them.

${memoryContext ? `What you know about ${firstName}: ${memoryContext}` : "No specific memory yet — write something universally personal and strong."}

Rules:
- Address ${firstName} directly if you know things about them — reference their actual situation, goals, or struggles
- Sound like a trusted advisor speaking warmly, not a scripture or motivational poster
- EXACTLY 1 sentence. Maximum 20 words. Short, sharp, memorable
- NEVER mention Gita, Vedas, Chanakya, or any religious text — let the wisdom be invisible
- NEVER use clichés ("every day is a new beginning", "you've got this", etc.)
- The tone should be calm, grounding, and energising at once

Respond ONLY with valid JSON: {"quote": "..."}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 80,
        response_format: { type: "json_object" },
      });

      let result = { quote: "The clearest mind belongs to the one who acts fully, worries least, and rests in knowing they gave everything they had today." };
      try {
        const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
        if (parsed.quote) result = { quote: parsed.quote };
      } catch {}

      const entry = { quote: result.quote, date: today };
      dailyQuoteCache.set(cacheKey, entry);

      // Clear old cache entries (keep last 200)
      if (dailyQuoteCache.size > 200) {
        const firstKey = dailyQuoteCache.keys().next().value;
        if (firstKey) dailyQuoteCache.delete(firstKey);
      }

      res.json(entry);
    } catch (err: any) {
      console.error("[DAILY-QUOTE] Error:", err.message);
      res.json({
        quote: "Arise, awake and stop not till the goal is reached.",
        source: "Swami Vivekananda",
        date: new Date().toDateString(),
      });
    }
  });

  app.get("/api/arya/memory", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      const memories = await memoryEngine.getAll(userId);
      res.json({ memories, total: memories.length });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/arya/memory", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      const { db } = await import("./db");
      const { aryaMemory } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(aryaMemory).where(eq(aryaMemory.tenantId, userId));
      res.json({ success: true, message: "All memory cleared" });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/arya/memory/:id", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      await memoryEngine.deleteMemoryForUser(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/arya/memory", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      const { category, key, value } = req.body;
      await memoryEngine.addExplicitMemory(userId, category, key, value);
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

  app.get("/api/arya/cache/quality-report", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenant_id as string) || 'varah';
      const report = await getCacheQualityReport(tenantId);
      const golden  = report.filter(r => r.status === "golden").length;
      const neutral = report.filter(r => r.status === "neutral").length;
      const flagged = report.filter(r => r.status === "flagged").length;
      res.json({ total: report.length, golden, neutral, flagged, entries: report });
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
      const xToken = req.headers["x-user-token"] as string;
      const bearerToken = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null;
      const sessionToken = xToken || bearerToken;
      if (sessionToken) {
        const session = await verifySession(sessionToken);
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

  // =============================================
  // GOOGLE CALENDAR ROUTES
  // =============================================

  app.get("/api/calendar/auth-url", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { getCalendarAuthUrl } = await import("./arya/google-calendar");
      const url = getCalendarAuthUrl(userId);
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate auth URL. Ensure GOOGLE_CLIENT_SECRET is set." });
    }
  });

  app.get("/api/calendar/callback", async (req: Request, res: Response) => {
    try {
      const { code, state: userId, error } = req.query as Record<string, string>;
      if (error) return res.redirect(`/?calendar_error=${error}`);
      if (!code || !userId) return res.redirect("/?calendar_error=missing_params");
      const { handleCalendarCallback } = await import("./arya/google-calendar");
      const success = await handleCalendarCallback(code, userId);
      res.redirect(success ? "/?calendar_connected=1" : "/?calendar_error=callback_failed");
    } catch (error: any) {
      console.error("[CALENDAR] Callback error:", error.message);
      res.redirect("/?calendar_error=server_error");
    }
  });

  app.get("/api/calendar/status", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { isCalendarConnected } = await import("./arya/google-calendar");
      const connected = await isCalendarConnected(userId);
      res.json({ connected });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.get("/api/calendar/events", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const days = parseInt(req.query.days as string) || 1;
      const { getTodayEvents, getUpcomingEvents } = await import("./arya/google-calendar");
      const events = days <= 1 ? await getTodayEvents(userId) : await getUpcomingEvents(userId, days);
      res.json({ events });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/events", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { title, startTime, endTime, description, location } = req.body;
      if (!title || !startTime || !endTime) return res.status(400).json({ error: "title, startTime, endTime are required" });
      const { createCalendarEvent } = await import("./arya/google-calendar");
      const event = await createCalendarEvent(userId, title, startTime, endTime, description, location);
      if (!event) return res.status(500).json({ error: "Failed to create event" });
      res.json({ event });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  app.delete("/api/calendar/disconnect", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { disconnectCalendar } = await import("./arya/google-calendar");
      await disconnectCalendar(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect" });
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

  // =============================================
  // SUBSCRIPTION ROUTES (Razorpay)
  // =============================================

  app.get("/api/subscription/plans", (_req: Request, res: Response) => {
    res.json({
      configured: isRazorpayConfigured(),
      keyId: getRazorpayKeyId(),
      plans: {
        free:  { name: "Free",  amountInr: 0,   maxGoals: 3    },
        core:  { ...PLAN_CONFIG.core,  razorpayPlanId: undefined },
        pro:   { ...PLAN_CONFIG.pro,   razorpayPlanId: undefined },
        elite: { ...PLAN_CONFIG.elite, razorpayPlanId: undefined },
      },
    });
  });

  app.get("/api/subscription/status", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const status = await getSubscriptionStatus(userId);
      res.json(status || { plan: "free", planExpiresAt: null, isActive: false });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  app.post("/api/subscription/create", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { plan } = req.body;
      if (!plan || !["core", "pro", "elite"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan. Choose 'core', 'pro', or 'elite'." });
      }
      if (!isRazorpayConfigured()) {
        return res.status(503).json({ error: "Payment gateway not configured. Contact support." });
      }
      const [user] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      const subscription = await createRazorpaySubscription(plan, userId, user?.name, user?.email || undefined);
      res.json({
        subscriptionId: subscription.id,
        plan,
        keyId: getRazorpayKeyId(),
        status: subscription.status,
      });
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Create error:", error.message);
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  });

  app.post("/api/subscription/verify", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan } = req.body;
      if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment details" });
      }
      if (!plan || !["core", "pro", "elite"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      const valid = verifyPaymentSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature);
      if (!valid) {
        return res.status(400).json({ error: "Payment verification failed. Contact support." });
      }
      await activateUserPlan(userId, plan, razorpay_subscription_id);
      res.json({ success: true, plan, message: `ARYA ${plan.charAt(0).toUpperCase() + plan.slice(1)} activated!` });
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Verify error:", error.message);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/subscription/cancel", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      await cancelUserSubscription(userId);
      res.json({ success: true, message: "Subscription cancelled. You'll stay on your plan until the end of the billing period." });
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Cancel error:", error.message);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.post("/api/subscription/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      const rawBody = JSON.stringify(req.body);
      if (process.env.RAZORPAY_WEBHOOK_SECRET) {
        if (!signature || !verifyWebhookSignature(rawBody, signature)) {
          console.warn("[RAZORPAY WEBHOOK] Invalid signature");
          return res.status(400).json({ error: "Invalid webhook signature" });
        }
      }
      const event = req.body?.event;
      await handleWebhookEvent(event, req.body);
      res.json({ received: true });
    } catch (error: any) {
      console.error("[RAZORPAY WEBHOOK] Error:", error.message);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.get("/api/admin/subscriptions", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const subs = await db.select().from(aryaSubscriptions).orderBy(desc(aryaSubscriptions.createdAt));
      res.json({ subscriptions: subs, total: subs.length });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // ─── Admin: User Analytics ───────────────────────────────────────────────

  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const users = await db.execute(sql`
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.plan,
          u.city,
          u.occupation,
          u.life_stage,
          u.ui_language,
          u.preferred_language,
          u.is_active,
          u.onboarding_complete,
          u.created_at,
          u.last_login_at,
          COALESCE(SUM(ub.text_chat_count), 0)::int        AS total_chats,
          COALESCE(SUM(ub.voice_minutes), 0)::numeric      AS total_voice_minutes,
          COALESCE(SUM(ub.deep_reasoning_count), 0)::int   AS total_deep_reasoning,
          COALESCE(SUM(ub.llm_call_count), 0)::int         AS total_llm_calls,
          COALESCE(SUM(ub.estimated_cost_inr), 0)::numeric AS total_cost_inr,
          COUNT(DISTINCT g.id)::int                        AS total_goals,
          COUNT(DISTINCT m.id)::int                        AS total_memories
        FROM arya_users u
        LEFT JOIN arya_usage_budget ub ON ub.user_id = u.id AND ub.user_id NOT LIKE '%SYSTEM%' AND ub.user_id NOT LIKE 'anon_%'
        LEFT JOIN arya_goals g ON g.user_id = u.id
        LEFT JOIN arya_memory m ON m.tenant_id = 'varah' AND m.conversation_id IS NOT NULL
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      res.json({ users: users.rows, total: users.rows.length });
    } catch (error: any) {
      console.error("[Admin Users]", error.message);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/analytics", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [topQueries, featureUsage, cityStats, planStats, recentSignups] = await Promise.all([
        db.execute(sql`
          SELECT normalized_query AS query, domain, query_count, avg_confidence, last_seen
          FROM arya_query_patterns
          ORDER BY query_count DESC
          LIMIT 20
        `),
        db.execute(sql`
          SELECT
            COALESCE(SUM(text_chat_count), 0)::int        AS total_text_chats,
            COALESCE(SUM(voice_minutes), 0)::numeric      AS total_voice_minutes,
            COALESCE(SUM(deep_reasoning_count), 0)::int   AS total_deep_reasoning,
            COALESCE(SUM(llm_call_count), 0)::int         AS total_llm_calls,
            COALESCE(SUM(estimated_cost_inr), 0)::numeric AS total_cost_inr,
            COUNT(DISTINCT date_key)::int                 AS active_days
          FROM arya_usage_budget
          WHERE user_id NOT LIKE '%SYSTEM%' AND user_id NOT LIKE 'anon_%'
        `),
        db.execute(sql`
          SELECT city, COUNT(*)::int AS user_count
          FROM arya_users
          WHERE city IS NOT NULL AND city != ''
          GROUP BY city
          ORDER BY user_count DESC
          LIMIT 10
        `),
        db.execute(sql`
          SELECT plan, COUNT(*)::int AS count
          FROM arya_users
          GROUP BY plan
          ORDER BY count DESC
        `),
        db.execute(sql`
          SELECT DATE(created_at) AS day, COUNT(*)::int AS signups
          FROM arya_users
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY day
          ORDER BY day ASC
        `),
      ]);

      res.json({
        topQueries: topQueries.rows,
        featureUsage: featureUsage.rows[0] || {},
        cityStats: cityStats.rows,
        planStats: planStats.rows,
        recentSignups: recentSignups.rows,
      });
    } catch (error: any) {
      console.error("[Admin Analytics]", error.message);
      res.status(500).json({ error: "Failed to fetch analytics" });
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

  // ============================================================
  // COMMUNITY ROUTES
  // ============================================================

  // Public stats
  app.get("/api/community/stats", async (_req: Request, res: Response) => {
    try {
      const [{ memberCount }] = await db.select({ memberCount: sql<number>`count(*)::int` }).from(aryaCommunityMembers);
      const [{ postCount }] = await db.select({ postCount: sql<number>`count(*)::int` }).from(aryaCommunityPosts);
      res.json({ memberCount, postCount });
    } catch {
      res.json({ memberCount: 0, postCount: 0 });
    }
  });

  // Join community (founding member form) — no auth required
  app.post("/api/community/join", async (req: Request, res: Response) => {
    try {
      const {
        name, email, whatsapp, profession, countryCity,
        growthGoals, currentChallenges, expectations, growthReflection,
        communityParticipation, habitTracking, improvementIdeas, foundingReason,
        consentUpdates, consentAi,
      } = req.body;
      if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

      // Optionally link to ARYA user
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const session = await verifySession(authHeader.split(" ")[1]);
          if (session) userId = session.id;
        } catch {}
      }

      const [member] = await db.insert(aryaCommunityMembers).values({
        name, email, whatsapp, profession, countryCity,
        growthGoals: growthGoals ?? [],
        currentChallenges, expectations, growthReflection,
        communityParticipation: communityParticipation ?? [],
        habitTracking: habitTracking ?? [],
        improvementIdeas, foundingReason,
        consentUpdates: !!consentUpdates,
        consentAi: !!consentAi,
        userId,
      }).onConflictDoNothing().returning();

      res.json({ success: true, member });
    } catch (err: any) {
      if (err.message?.includes("unique")) return res.status(409).json({ error: "You're already a member!" });
      res.status(500).json({ error: "Failed to join community" });
    }
  });

  // Get current active challenge — public
  app.get("/api/community/challenge", async (_req: Request, res: Response) => {
    try {
      const { getCurrentChallenge } = await import("./arya/community-challenge");
      const challenge = await getCurrentChallenge();
      if (!challenge) return res.status(404).json({ error: "No active challenge" });
      res.json(challenge);
    } catch {
      res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  // Get community posts — public, reactions enriched if logged in
  app.get("/api/community/posts", async (req: Request, res: Response) => {
    try {
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const session = await verifySession(authHeader.split(" ")[1]);
          if (session) userId = session.id;
        } catch {}
      }

      const posts = await db
        .select()
        .from(aryaCommunityPosts)
        .orderBy(desc(aryaCommunityPosts.createdAt))
        .limit(50);

      if (!userId) return res.json(posts.map((p) => ({ ...p, userReaction: null })));

      // Enrich with user reactions
      const postIds = posts.map((p) => p.id);
      const reactions = postIds.length
        ? await db.select().from(aryaCommunityReactions).where(
            and(
              eq(aryaCommunityReactions.userId, userId),
              inArray(aryaCommunityReactions.postId, postIds)
            )
          )
        : [];

      const reactionMap = new Map(reactions.map((r) => [r.postId, r.reactionType]));
      res.json(posts.map((p) => ({ ...p, userReaction: reactionMap.get(p.id) ?? null })));
    } catch {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Create community post — requires user auth
  app.post("/api/community/posts", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      const [user] = await db.select({ name: aryaUsers.name }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      if (!user) return res.status(401).json({ error: "User not found" });

      const { content, challengeId, dayNumber, isCompleted } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: "Content required" });

      const [post] = await db.insert(aryaCommunityPosts).values({
        userId, userName: user.name,
        content: content.trim().slice(0, 2000),
        challengeId: challengeId ?? null,
        dayNumber: dayNumber ?? null,
        isCompleted: !!isCompleted,
        reactionCount: 0,
      }).returning();

      // Increment challenge participant count
      if (challengeId) {
        await db.update(aryaCommunityChallenge)
          .set({ participantCount: sql`${aryaCommunityChallenge.participantCount} + 1` })
          .where(eq(aryaCommunityChallenge.id, challengeId));
        if (isCompleted) {
          await db.update(aryaCommunityChallenge)
            .set({ completedCount: sql`${aryaCommunityChallenge.completedCount} + 1` })
            .where(eq(aryaCommunityChallenge.id, challengeId));
        }
      }

      res.json(post);
    } catch {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // React to a post — toggle reaction
  app.post("/api/community/posts/:id/react", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string;
      const postId = req.params.id;
      const reactionType = req.body.reactionType ?? "cheer";

      const [existing] = await db.select().from(aryaCommunityReactions)
        .where(and(eq(aryaCommunityReactions.postId, postId), eq(aryaCommunityReactions.userId, userId)))
        .limit(1);

      if (existing) {
        await db.delete(aryaCommunityReactions)
          .where(and(eq(aryaCommunityReactions.postId, postId), eq(aryaCommunityReactions.userId, userId)));
        await db.update(aryaCommunityPosts)
          .set({ reactionCount: sql`GREATEST(${aryaCommunityPosts.reactionCount} - 1, 0)` })
          .where(eq(aryaCommunityPosts.id, postId));
        const [updated] = await db.select({ reactionCount: aryaCommunityPosts.reactionCount }).from(aryaCommunityPosts).where(eq(aryaCommunityPosts.id, postId)).limit(1);
        return res.json({ reacted: false, reactionCount: updated.reactionCount });
      } else {
        await db.insert(aryaCommunityReactions).values({ postId, userId, reactionType });
        await db.update(aryaCommunityPosts)
          .set({ reactionCount: sql`${aryaCommunityPosts.reactionCount} + 1` })
          .where(eq(aryaCommunityPosts.id, postId));
        const [updated] = await db.select({ reactionCount: aryaCommunityPosts.reactionCount }).from(aryaCommunityPosts).where(eq(aryaCommunityPosts.id, postId)).limit(1);
        return res.json({ reacted: true, reactionCount: updated.reactionCount });
      }
    } catch {
      res.status(500).json({ error: "Failed to react" });
    }
  });

  // Admin: view community members
  app.get("/api/admin/community/members", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const members = await db.select().from(aryaCommunityMembers).orderBy(desc(aryaCommunityMembers.createdAt)).limit(500);
      res.json({ members, total: members.length });
    } catch {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // Admin: manually trigger challenge generation
  app.post("/api/admin/community/generate-challenge", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const { generateWeeklyChallenge } = await import("./arya/community-challenge");
      const generated = await generateWeeklyChallenge();
      res.json({ success: generated, message: generated ? "New challenge generated" : "Active challenge already exists — archive it first" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // =============================================
  // REFLECTION SHARE — user settings + public page
  // =============================================

  app.get("/api/user/reflection-share", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const [user] = await db.select({
        reflectionShareEnabled: (aryaUsers as any).reflectionShareEnabled,
        reflectionShareName: (aryaUsers as any).reflectionShareName,
        reflectionShareContact: (aryaUsers as any).reflectionShareContact,
        reflectionSharePaused: (aryaUsers as any).reflectionSharePaused,
      }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get reflection share settings" });
    }
  });

  app.post("/api/user/reflection-share", requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { enabled, name, contact, paused } = req.body;
      await db.update(aryaUsers).set({
        reflectionShareEnabled: !!enabled,
        reflectionShareName: typeof name === "string" ? name.trim().slice(0, 255) || null : null,
        reflectionShareContact: typeof contact === "string" ? contact.trim().slice(0, 255) || null : null,
        reflectionSharePaused: !!paused,
      } as any).where(eq(aryaUsers.id, userId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save reflection share settings" });
    }
  });

  // Also include reflection share fields in the preferences endpoint
  // (the GET /api/user/preferences already serves the panel, we patch it via the above)

  // ─────────────────────────────────────────────────────────
  // NITI — THE WISDOM COUNCIL
  // ─────────────────────────────────────────────────────────

  app.get("/api/niti/profile", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.json({ nitiEnabled: false });
      const [user] = await db.select({
        nitiEnabled: aryaUsers.nitiEnabled,
        businessType: aryaUsers.businessType,
        businessStage: aryaUsers.businessStage,
        businessRole: aryaUsers.businessRole,
        businessChallenge: aryaUsers.businessChallenge,
        businessFocusAreas: aryaUsers.businessFocusAreas,
      }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
      res.json(user || { nitiEnabled: false });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load Niti profile" });
    }
  });

  app.post("/api/niti/setup", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { businessType, businessStage, businessRole, businessChallenge, businessFocusAreas } = req.body;
      await db.update(aryaUsers).set({
        nitiEnabled: true,
        businessType: businessType || null,
        businessStage: businessStage || null,
        businessRole: businessRole || null,
        businessChallenge: businessChallenge || null,
        businessFocusAreas: Array.isArray(businessFocusAreas) ? businessFocusAreas : [],
      }).where(eq(aryaUsers.id, userId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save Niti setup" });
    }
  });

  app.post("/api/niti/sessions", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { sessionType } = req.body;
      if (!sessionType) return res.status(400).json({ error: "sessionType required" });
      const result = await createNitiSession(userId, sessionType);
      res.json(result);
    } catch (err: any) {
      console.error("[Niti] create session error:", err);
      res.status(500).json({ error: "Failed to create Niti session" });
    }
  });

  app.get("/api/niti/sessions", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.json([]);
      const sessions = await db.select().from(aryaNitiSessions)
        .where(eq(aryaNitiSessions.userId, userId))
        .orderBy(desc(aryaNitiSessions.updatedAt))
        .limit(20);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load sessions" });
    }
  });

  app.get("/api/niti/sessions/:id/messages", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });
      const [session] = await db.select().from(aryaNitiSessions)
        .where(and(eq(aryaNitiSessions.id, sessionId), eq(aryaNitiSessions.userId, userId)))
        .limit(1);
      if (!session) return res.status(404).json({ error: "Session not found" });
      const messages = await db.select().from(aryaNitiMessages)
        .where(eq(aryaNitiMessages.sessionId, sessionId))
        .orderBy(asc(aryaNitiMessages.createdAt));
      res.json({ session, messages });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load session messages" });
    }
  });

  app.post("/api/niti/sessions/:id/message", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session id" });
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: "content required" });
      const [session] = await db.select({ sessionType: aryaNitiSessions.sessionType })
        .from(aryaNitiSessions)
        .where(and(eq(aryaNitiSessions.id, sessionId), eq(aryaNitiSessions.userId, userId)))
        .limit(1);
      if (!session) return res.status(404).json({ error: "Session not found" });
      const response = await addNitiMessage(sessionId, userId, content, session.sessionType);
      res.json(response);
    } catch (err: any) {
      console.error("[Niti] message error:", err);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // ── Market Lens ────────────────────────────────────────────
  app.get("/api/niti/market/indices", async (_req: Request, res: Response) => {
    try {
      const { getMarketIndices } = await import("./arya/market-lens");
      res.json(getMarketIndices());
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load indices" });
    }
  });

  app.get("/api/niti/market/news", async (_req: Request, res: Response) => {
    try {
      const { getMarketNews } = await import("./arya/market-lens");
      res.json(getMarketNews());
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load news" });
    }
  });

  app.post("/api/niti/market/ask", optionalUser, async (req: Request, res: Response) => {
    try {
      const { topic, businessType, businessChallenge } = req.body;
      if (!topic?.trim()) return res.status(400).json({ error: "topic required" });
      const { askAryaAboutMarket } = await import("./arya/market-lens");
      const response = await askAryaAboutMarket(topic, businessType, businessChallenge);
      res.json(response);
    } catch (err: any) {
      console.error("[Market] ask error:", err);
      res.status(500).json({ error: "Failed to process question" });
    }
  });

  // ── Portfolio Holdings ─────────────────────────────────────
  app.get("/api/niti/portfolio", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.json([]);
      const holdings = await db.select().from(aryaPortfolioHoldings)
        .where(eq(aryaPortfolioHoldings.userId, userId))
        .orderBy(desc(aryaPortfolioHoldings.createdAt));
      res.json(holdings);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load portfolio" });
    }
  });

  app.post("/api/niti/portfolio", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { name, ticker, assetType, quantity, avgPrice, notes } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "name required" });
      const [holding] = await db.insert(aryaPortfolioHoldings).values({
        userId,
        name: name.trim(),
        ticker: ticker?.trim() || null,
        assetType: assetType || "Stock",
        quantity: String(parseFloat(quantity) || 0),
        avgPrice: String(parseFloat(avgPrice) || 0),
        notes: notes?.trim() || null,
      }).returning();
      res.json(holding);
    } catch (err: any) {
      console.error("[Portfolio] add error:", err);
      res.status(500).json({ error: "Failed to add holding" });
    }
  });

  app.delete("/api/niti/portfolio/:id", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const holdingId = parseInt(req.params.id);
      if (isNaN(holdingId)) return res.status(400).json({ error: "Invalid id" });
      await db.delete(aryaPortfolioHoldings)
        .where(and(eq(aryaPortfolioHoldings.id, holdingId), eq(aryaPortfolioHoldings.userId, userId)));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });

  // ── Weekly Review ────────────────────────────────────────────────
  app.get("/api/review/weekly", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { getWeeklyLetter } = await import("./arya/weekly-review-page");
      const letter = await getWeeklyLetter(userId);
      res.json(letter);
    } catch (err: any) {
      console.error("[Review] weekly error:", err.message);
      res.status(500).json({ error: "Failed to generate review" });
    }
  });

  app.post("/api/review/intention", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { intention } = req.body;
      if (!intention?.trim()) return res.status(400).json({ error: "intention required" });
      const { saveWeeklyIntention } = await import("./arya/weekly-review-page");
      await saveWeeklyIntention(userId, intention.trim());
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save intention" });
    }
  });

  app.post("/api/review/answer", optionalUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { question, answer } = req.body;
      if (!answer?.trim()) return res.status(400).json({ error: "answer required" });
      const { saveReflectionAnswer } = await import("./arya/weekly-review-page");
      await saveReflectionAnswer(userId, question || "", answer.trim());
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save answer" });
    }
  });

  // Public reflection page — no auth required
  app.get("/api/reflection/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token || token.length < 16) return res.status(400).json({ error: "Invalid token" });
      const { getReflectionByToken } = await import("./arya/reflection-share");
      const data = await getReflectionByToken(token);
      if (!data) return res.status(404).json({ error: "Reflection not found" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load reflection" });
    }
  });

  // =============================================
  // ADMIN ARYA — Founder's Personal AI
  // =============================================

  app.get("/api/admin/arya/briefing", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [userStats, costData, pendingDrafts, topGaps] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*)::int as total_users,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)::int as new_this_week,
            COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END)::int as active_this_week,
            COUNT(CASE WHEN onboarding_complete = true THEN 1 END)::int as onboarding_complete
          FROM arya_users`),
        db.execute(sql`
          SELECT COALESCE(SUM(estimated_cost_inr), 0)::numeric as cost_today,
            COALESCE(SUM(llm_call_count), 0)::int as calls_today
          FROM arya_usage_budget WHERE date_key = CURRENT_DATE AND user_id NOT LIKE '%SYSTEM%'`),
        db.execute(sql`
          SELECT COUNT(*)::int as pending FROM arya_knowledge
          WHERE status = 'draft' AND tenant_id = 'varah'`),
        db.execute(sql`
          SELECT normalized_query, domain, query_count FROM arya_query_patterns
          WHERE is_gap = true ORDER BY query_count DESC LIMIT 3`)
      ]);
      const u = userStats.rows[0] as any;
      const c = costData.rows[0] as any;
      const d = pendingDrafts.rows[0] as any;
      const gaps = topGaps.rows as any[];
      const onboardingRate = u.total_users > 0 ? Math.round(u.onboarding_complete / u.total_users * 100) : 0;
      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are ARYA — the personal AI of the founder of ARYA platform. Give a sharp, honest 2-3 sentence morning briefing about the business. Direct, opinionated, like a trusted advisor. Reference specific numbers. No bullet points. No fluff." },
          { role: "user", content: `Product state: ${u.total_users} total users, ${u.new_this_week} new this week, ${u.active_this_week} active this week, ${onboardingRate}% onboarding completion, ₹${parseFloat(c.cost_today || 0).toFixed(2)} AI cost today, ${d.pending} knowledge drafts awaiting your approval. Top gaps: ${gaps.map((g: any) => g.normalized_query).join(", ") || "none detected"}. Give me my briefing.` }
        ],
        max_tokens: 160,
      });
      res.json({
        briefing: completion.choices[0].message.content || "Good morning. The system is running.",
        metrics: { totalUsers: u.total_users, newThisWeek: u.new_this_week, activeThisWeek: u.active_this_week, onboardingRate, costToday: parseFloat(c.cost_today || 0).toFixed(2), pendingDrafts: d.pending, topGaps: gaps }
      });
    } catch (error: any) {
      console.error("[Admin ARYA Briefing]", error.message);
      res.status(500).json({ error: "Failed to generate briefing" });
    }
  });

  app.post("/api/admin/arya/chat", requireAdmin, async (req: Request, res: Response) => {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    try {
      const [userStats, costData, pendingDrafts] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int as total_users, COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END)::int as active_this_week, COUNT(CASE WHEN onboarding_complete = true THEN 1 END)::int as onboarding_complete FROM arya_users`),
        db.execute(sql`SELECT COALESCE(SUM(estimated_cost_inr), 0)::numeric as cost_today FROM arya_usage_budget WHERE date_key = CURRENT_DATE AND user_id NOT LIKE '%SYSTEM%'`),
        db.execute(sql`SELECT COUNT(*)::int as pending FROM arya_knowledge WHERE status = 'draft' AND tenant_id = 'varah'`)
      ]);
      const u = userStats.rows[0] as any;
      const c = costData.rows[0] as any;
      const d = pendingDrafts.rows[0] as any;
      const onboardingRate = u.total_users > 0 ? Math.round(u.onboarding_complete / u.total_users * 100) : 0;
      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are ARYA — the personal AI of the ARYA platform founder. You are sharp, direct, and strategic. You think like a senior product strategist and investor. Reference real data when relevant. Keep responses focused and actionable — max 3 paragraphs.\n\nCurrent product state: ${u.total_users} users (${u.active_this_week} active this week, ${onboardingRate}% onboarding completion), ₹${parseFloat(c.cost_today || 0).toFixed(2)} AI cost today, ${d.pending} knowledge drafts pending review.` },
          ...history.slice(-8).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: message }
        ],
        max_tokens: 450,
      });
      res.json({ response: completion.choices[0].message.content || "" });
    } catch (error: any) {
      console.error("[Admin ARYA Chat]", error.message);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.get("/api/admin/product-intelligence", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [userStats, featureStats, planStats, signups, topQueries] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)::int as new_week, COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END)::int as active_week, COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '1 day' THEN 1 END)::int as active_today, COUNT(CASE WHEN onboarding_complete = true THEN 1 END)::int as onboarded FROM arya_users`),
        db.execute(sql`SELECT COALESCE(SUM(text_chat_count),0)::int AS chats, COALESCE(SUM(voice_minutes),0)::numeric AS voice, COALESCE(SUM(deep_reasoning_count),0)::int AS deep, COALESCE(SUM(estimated_cost_inr),0)::numeric AS cost FROM arya_usage_budget WHERE user_id NOT LIKE '%SYSTEM%' AND user_id NOT LIKE 'anon_%'`),
        db.execute(sql`SELECT plan, COUNT(*)::int AS cnt FROM arya_users GROUP BY plan`),
        db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS signups FROM arya_users WHERE created_at > NOW() - INTERVAL '14 days' GROUP BY day ORDER BY day`),
        db.execute(sql`SELECT normalized_query AS query, domain, query_count, avg_confidence, is_gap FROM arya_query_patterns ORDER BY query_count DESC LIMIT 8`)
      ]);
      const u = userStats.rows[0] as any;
      const f = featureStats.rows[0] as any;
      const plans = (planStats.rows as any[]).reduce((a: any, p: any) => { a[p.plan] = p.cnt; return a; }, {});
      const onboardingRate = u.total > 0 ? Math.round(u.onboarded / u.total * 100) : 0;
      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are ARYA's product intelligence engine. Analyse this data and give ONE sharp opinion — the single biggest lever right now. 2-3 sentences max. Sound like a senior product strategist who has seen the data and has a strong point of view. No bullet points." },
          { role: "user", content: `Data: ${u.total} users total, ${u.active_week} active this week, ${u.new_week} new, ${onboardingRate}% onboarding completion (${u.total - u.onboarded} users incomplete). ${Math.round(f.chats)} total chats, ${Math.round(f.voice)} voice minutes, ${f.deep} deep reasoning sessions. Total AI cost: ₹${parseFloat(f.cost || 0).toFixed(2)}. Plans: ${JSON.stringify(plans)}.` }
        ],
        max_tokens: 120,
      });
      res.json({
        opinion: completion.choices[0].message.content || "",
        users: { total: u.total, newThisWeek: u.new_week, activeThisWeek: u.active_week, activeToday: u.active_today, onboardingRate, incomplete: u.total - u.onboarded },
        features: { totalChats: f.chats, voiceMinutes: Math.round(f.voice), deepReasoning: f.deep, costInr: parseFloat(f.cost || 0).toFixed(2) },
        plans,
        signups: signups.rows,
        topQueries: topQueries.rows,
      });
    } catch (error: any) {
      console.error("[Product Intelligence]", error.message);
      res.status(500).json({ error: "Failed to fetch product intelligence" });
    }
  });

  return httpServer;
}
