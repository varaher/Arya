import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import crypto from "crypto";
import { initVapidKeys, startReminderScheduler } from "./arya/reminder-scheduler";
import { activateUserPlan } from "./arya/razorpay-service";
import { db } from "./db";
import { aryaSubscriptions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

// Global crash guards — log and survive instead of dying
process.on("uncaughtException", (err) => {
  console.error("[CRASH GUARD] uncaughtException:", err.message, err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRASH GUARD] unhandledRejection:", reason);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(",").map(d => `https://${d.trim()}`)
  : [];

app.use(cors({
  origin: isProduction
    ? (origin, callback) => {
        if (!origin || allowedOrigins.some(allowed => origin === allowed)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed"));
        }
      }
    : true,
  credentials: true,
}));

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userToken = req.headers["x-user-token"] as string;
    if (userToken) {
      const hash = crypto.createHash("sha256").update(userToken).digest("hex").slice(0, 16);
      return `user:${hash}`;
    }
    return ipKeyGenerator(req.ip || "unknown");
  },
  message: { error: "Too many requests. Please wait a moment and try again." },
});

app.use("/api/", apiLimiter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (!isProduction && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// One-time idempotent fix: activate plan for users whose payment succeeded
// but verify/webhook was never received (e.g. UPI AutoPay UX glitch).
async function runStartupPaymentReconciliation() {
  try {
    const pendingFixes = [
      // Neeraj Akkarachittoor — paid ₹249 Core via PhonePe UPI AutoPay on 2026-06-16
      // sub created, payment deducted, but Razorpay UI showed error → verify never called
      {
        userId: "021f2eef-574c-4d71-be82-1d23013091f4",
        plan: "core" as const,
        subscriptionId: "sub_T2JdnBsOaQJv6W",
      },
    ];

    for (const fix of pendingFixes) {
      const [row] = await db
        .select({ status: aryaSubscriptions.status })
        .from(aryaSubscriptions)
        .where(
          and(
            eq(aryaSubscriptions.razorpaySubscriptionId, fix.subscriptionId),
            eq(aryaSubscriptions.userId, fix.userId)
          )
        )
        .limit(1);

      if (!row) {
        console.log(`[STARTUP-FIX] Subscription ${fix.subscriptionId} not found — skipping`);
        continue;
      }
      if (row.status === "active") {
        console.log(`[STARTUP-FIX] ${fix.subscriptionId} already active — no action needed`);
        continue;
      }

      // Status is 'created' or similar — payment confirmed, activate now
      await activateUserPlan(fix.userId, fix.plan, fix.subscriptionId);
      await db
        .update(aryaSubscriptions)
        .set({ status: "active", updatedAt: new Date() } as any)
        .where(eq(aryaSubscriptions.razorpaySubscriptionId, fix.subscriptionId));

      console.log(`[STARTUP-FIX] ✅ Activated ${fix.plan} plan for user ${fix.userId} (sub ${fix.subscriptionId})`);
    }
  } catch (err: any) {
    console.error("[STARTUP-FIX] Reconciliation error:", err.message);
  }
}

(async () => {
  await initVapidKeys();
  startReminderScheduler();
  await runStartupPaymentReconciliation();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    console.error(`[ERROR] ${status}:`, err.message || "Unknown error");

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ error: "Something went wrong. Please try again." });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
