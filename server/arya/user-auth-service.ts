import { db } from "../db";
import { aryaUsers, aryaUserSessions, aryaNotifications } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function signupUser(
  name: string,
  phone: string,
  password: string,
  email?: string,
  preferredLanguage?: string
) {
  const existing = await db
    .select()
    .from(aryaUsers)
    .where(eq(aryaUsers.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Phone number already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(aryaUsers).values({
    name,
    phone,
    email: email || null,
    passwordHash,
    preferredLanguage: preferredLanguage || "en",
  }).returning();

  await db.insert(aryaNotifications).values({
    userId: user.id,
    type: "welcome",
    title: "Welcome to ARYA!",
    message: `Namaste ${name}! I'm ARYA, your AI companion. You can talk to me using voice in any Indian language. Set your goals and I'll help you achieve them!`,
  });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(aryaUserSessions).values({
    userId: user.id,
    token,
    expiresAt,
  });

  await db.update(aryaUsers).set({ lastLoginAt: new Date() }).where(eq(aryaUsers.id, user.id));

  return {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, preferredLanguage: user.preferredLanguage, onboardingComplete: user.onboardingComplete },
    token,
    expiresAt,
  };
}

export async function loginUser(phone: string, password: string) {
  const [user] = await db
    .select()
    .from(aryaUsers)
    .where(eq(aryaUsers.phone, phone))
    .limit(1);

  if (!user) {
    throw new Error("Invalid phone number or password");
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  if (!user.passwordHash) {
    throw new Error("This account uses Google sign-in. Please sign in with Google.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid phone number or password");
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(aryaUserSessions).values({
    userId: user.id,
    token,
    expiresAt,
  });

  await db.update(aryaUsers).set({ lastLoginAt: new Date() }).where(eq(aryaUsers.id, user.id));

  return {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, preferredLanguage: user.preferredLanguage, onboardingComplete: user.onboardingComplete },
    token,
    expiresAt,
  };
}

export async function verifySession(token: string) {
  const [session] = await db
    .select()
    .from(aryaUserSessions)
    .where(eq(aryaUserSessions.token, token))
    .limit(1);

  if (!session || new Date() > session.expiresAt) {
    if (session) {
      await db.delete(aryaUserSessions).where(eq(aryaUserSessions.id, session.id));
    }
    return null;
  }

  const [user] = await db
    .select()
    .from(aryaUsers)
    .where(eq(aryaUsers.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    onboardingComplete: user.onboardingComplete,
    invitesRemaining: user.invitesRemaining,
  };
}

export async function logoutUser(token: string) {
  await db.delete(aryaUserSessions).where(eq(aryaUserSessions.token, token));
}

export async function googleOAuthLogin(idToken: string): Promise<{
  user: { id: string; name: string; phone: string | null; email: string | null; preferredLanguage: string | null; onboardingComplete: boolean };
  token: string;
  expiresAt: Date;
  isNewUser: boolean;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google OAuth is not configured");
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Invalid Google token");
  }

  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || email.split("@")[0];

  let isNewUser = false;

  const [existingByGoogle] = await db
    .select()
    .from(aryaUsers)
    .where(eq(aryaUsers.googleId, googleId))
    .limit(1);

  let user = existingByGoogle;

  if (!user && email) {
    const [existingByEmail] = await db
      .select()
      .from(aryaUsers)
      .where(eq(aryaUsers.email, email))
      .limit(1);

    if (existingByEmail) {
      await db.update(aryaUsers).set({ googleId }).where(eq(aryaUsers.id, existingByEmail.id));
      user = { ...existingByEmail, googleId };
    }
  }

  if (!user) {
    isNewUser = true;
    const [newUser] = await db.insert(aryaUsers).values({
      name,
      email,
      googleId,
      preferredLanguage: "en",
    }).returning();

    await db.insert(aryaNotifications).values({
      userId: newUser.id,
      type: "welcome",
      title: "Welcome to ARYA!",
      message: `Welcome ${name}! I'm ARYA, your Personal Thinking & Growth Assistant. Start chatting, set your goals, or try voice in your language!`,
    });

    user = newUser;
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(aryaUserSessions).values({ userId: user.id, token, expiresAt });
  await db.update(aryaUsers).set({ lastLoginAt: new Date() }).where(eq(aryaUsers.id, user.id));

  return {
    user: { id: user.id, name: user.name, phone: user.phone ?? null, email: user.email ?? null, preferredLanguage: user.preferredLanguage ?? null, onboardingComplete: user.onboardingComplete },
    token,
    expiresAt,
    isNewUser,
  };
}

export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(aryaUsers)
    .where(eq(aryaUsers.id, userId))
    .limit(1);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    onboardingComplete: user.onboardingComplete,
    currentWork: user.currentWork,
    wantsDailyReminder: user.wantsDailyReminder,
    voiceEnabled: user.voiceEnabled,
    invitesRemaining: user.invitesRemaining,
  };
}
