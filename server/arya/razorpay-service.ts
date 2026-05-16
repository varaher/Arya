import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "../db";
import { aryaSubscriptions, aryaUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

let _razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID) throw new Error("RAZORPAY_KEY_ID not set");
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });
  }
  return _razorpay;
}

export type SubscriptionPlan = "core" | "pro" | "elite";

export const PLAN_CONFIG = {
  core: {
    name: "ARYA Core",
    amountInr: 249,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_CORE || "",
    chatsPerDay: 9999,          // unlimited
    voiceMinutesPerMonth: 150,
    maxGoals: 10,
    memoryRetentionDays: 30,
    features: [
      "Unlimited conversations",
      "150 min voice per month",
      "Up to 10 goals",
      "30-day memory",
      "Weekly Review + Morning Briefing",
      "KAAL Basic + Health tracking",
      "All 11 Indian languages",
      "Document & image scan",
    ],
  },
  pro: {
    name: "ARYA Pro",
    amountInr: 499,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_PRO || "",
    chatsPerDay: 9999,          // unlimited
    voiceMinutesPerMonth: 50,   // overages at ₹2/min, capped ₹200/month
    voiceOveragePerMinuteInr: 2,
    voiceOverageCapInr: 200,
    maxGoals: 9999,             // unlimited
    memoryRetentionDays: 365,
    features: [
      "Everything in Core",
      "50 voice min/month (₹2/min above, capped ₹200)",
      "Unlimited goals",
      "1-year memory",
      "KAAL Full + Business Mind",
      "Market Lens",
      "Early access to new features",
    ],
  },
  elite: {
    name: "ARYA Elite",
    amountInr: 999,
    razorpayPlanId: process.env.RAZORPAY_PLAN_ID_ELITE || "",
    chatsPerDay: 9999,          // unlimited
    voiceMinutesPerMonth: 9999, // unlimited
    maxGoals: 9999,             // unlimited
    memoryRetentionDays: 36500, // lifetime (~100 years)
    features: [
      "Everything in Pro",
      "Unlimited voice — no metering",
      "Lifetime memory",
      "Priority response speed",
      "KAAL Full Vedic experience",
      "Monthly Life Review",
    ],
  },
};

export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || "";
}

export async function createSubscription(
  plan: SubscriptionPlan,
  userId: string,
  userName?: string,
  userEmail?: string,
): Promise<any> {
  const config = PLAN_CONFIG[plan];
  if (!config.razorpayPlanId) {
    throw new Error(`Razorpay plan ID for "${plan}" not configured. Set RAZORPAY_PLAN_ID_${plan.toUpperCase()} env var.`);
  }

  const subscription = await (getRazorpay().subscriptions as any).create({
    plan_id: config.razorpayPlanId,
    total_count: 12,
    quantity: 1,
    customer_notify: 1,
    notes: { userId, plan, userName: userName || "", userEmail: userEmail || "" },
  });

  await db.insert(aryaSubscriptions).values({
    userId,
    plan,
    status: "created",
    razorpaySubscriptionId: subscription.id,
    amountInr: config.amountInr,
  } as any);

  return subscription;
}

export async function cancelUserSubscription(userId: string): Promise<void> {
  const [user] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
  const subId = (user as any)?.razorpaySubscriptionId;
  if (subId) {
    try {
      await (getRazorpay().subscriptions as any).cancel(subId, false);
    } catch (e: any) {
      console.error("[RAZORPAY] Cancel failed:", e.message);
    }
    await db.update(aryaSubscriptions)
      .set({ status: "cancelled", updatedAt: new Date() } as any)
      .where(eq(aryaSubscriptions.razorpaySubscriptionId, subId));
  }
  await db.update(aryaUsers)
    .set({ plan: "free", planExpiresAt: null, razorpaySubscriptionId: null } as any)
    .where(eq(aryaUsers.id, userId));
}

export function verifyPaymentSignature(
  razorpayPaymentId: string,
  razorpaySubscriptionId: string,
  razorpaySignature: string,
): boolean {
  const payload = `${razorpayPaymentId}|${razorpaySubscriptionId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(payload)
    .digest("hex");
  return expected === razorpaySignature;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export async function activateUserPlan(userId: string, plan: SubscriptionPlan, razorpaySubscriptionId: string): Promise<void> {
  const planExpiresAt = new Date();
  planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
  await db.update(aryaUsers)
    .set({ plan, planExpiresAt, razorpaySubscriptionId } as any)
    .where(eq(aryaUsers.id, userId));
  await db.update(aryaSubscriptions)
    .set({ status: "active", updatedAt: new Date() } as any)
    .where(eq(aryaSubscriptions.razorpaySubscriptionId, razorpaySubscriptionId));
}

export async function handleWebhookEvent(event: string, payload: any): Promise<void> {
  const subEntity = payload?.subscription?.entity || payload?.payload?.subscription?.entity;
  const paymentEntity = payload?.payload?.payment?.entity;
  const subscriptionId = subEntity?.id;
  const paymentId = paymentEntity?.id;
  const notes = subEntity?.notes || {};
  const userId = notes?.userId;
  const plan = notes?.plan as SubscriptionPlan;

  if (!subscriptionId) return;
  console.log(`[RAZORPAY WEBHOOK] ${event} | sub=${subscriptionId} | user=${userId}`);

  if ((event === "subscription.charged" || event === "subscription.activated") && userId && plan) {
    await activateUserPlan(userId, plan, subscriptionId);
    await db.update(aryaSubscriptions)
      .set({ razorpayPaymentId: paymentId, status: "active", updatedAt: new Date() } as any)
      .where(eq(aryaSubscriptions.razorpaySubscriptionId, subscriptionId));
  } else if (event === "subscription.halted" || event === "subscription.cancelled") {
    await db.update(aryaSubscriptions)
      .set({ status: event === "subscription.halted" ? "halted" : "cancelled", updatedAt: new Date() } as any)
      .where(eq(aryaSubscriptions.razorpaySubscriptionId, subscriptionId));
    if (userId) {
      await db.update(aryaUsers)
        .set({ plan: "free", planExpiresAt: null } as any)
        .where(eq(aryaUsers.id, userId));
    }
  }
}

export async function getSubscriptionStatus(userId: string) {
  const [user] = await db.select().from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
  if (!user) return null;

  const plan = (user as any).plan || "free";
  const planExpiresAt: Date | null = (user as any).planExpiresAt || null;

  if (plan !== "free" && planExpiresAt && new Date(planExpiresAt) < new Date()) {
    await db.update(aryaUsers)
      .set({ plan: "free", planExpiresAt: null, razorpaySubscriptionId: null } as any)
      .where(eq(aryaUsers.id, userId));
    return { plan: "free", planExpiresAt: null, isActive: false };
  }

  return {
    plan,
    planExpiresAt,
    isActive: plan !== "free",
    razorpaySubscriptionId: (user as any).razorpaySubscriptionId || null,
  };
}
