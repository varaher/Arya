import { createHmac, timingSafeEqual } from "crypto";

type NotificationActionKind = "reminder" | "goal";
type NotificationAction = "snooze" | "dismiss" | "checkin";

interface NotificationActionPayload {
  userId: string;
  kind: NotificationActionKind;
  resourceId: string;
  actions: NotificationAction[];
  expiresAt: number;
}

function getSigningSecret(): string | null {
  return process.env.SESSION_SECRET || null;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createNotificationActionToken(
  userId: string,
  kind: NotificationActionKind,
  resourceId: string,
  actions: NotificationAction[],
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string | null {
  const secret = getSigningSecret();
  if (!secret) {
    console.warn("[PUSH] Notification actions are unavailable: SESSION_SECRET is not configured.");
    return null;
  }

  const payload: NotificationActionPayload = {
    userId,
    kind,
    resourceId,
    actions,
    expiresAt: Date.now() + ttlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyNotificationActionToken(
  token: string | undefined,
  expected: {
    kind: NotificationActionKind;
    resourceId: string;
    action: NotificationAction;
  },
): NotificationActionPayload | null {
  const secret = getSigningSecret();
  if (!secret || !token) return null;

  const [encodedPayload, receivedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !receivedSignature || rest.length > 0) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as NotificationActionPayload;
    if (
      !payload.userId ||
      payload.kind !== expected.kind ||
      payload.resourceId !== expected.resourceId ||
      !Array.isArray(payload.actions) ||
      !payload.actions.includes(expected.action) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}