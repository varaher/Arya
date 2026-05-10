import { google } from "googleapis";
import { db } from "../db";
import { aryaUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  link?: string;
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.APP_URL || "https://aryaai.in"}/api/calendar/callback`
  );
}

export function getCalendarAuthUrl(userId: string): string {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
  });
}

export async function handleCalendarCallback(code: string, userId: string): Promise<boolean> {
  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await db.update(aryaUsers).set({
      google_calendar_access_token: tokens.access_token,
      google_calendar_refresh_token: tokens.refresh_token || undefined,
      google_calendar_connected_at: new Date(),
    } as any).where(eq(aryaUsers.id, userId));
    return true;
  } catch (err: any) {
    console.error("[CALENDAR] OAuth callback error:", err.message);
    return false;
  }
}

async function getAuthenticatedCalendar(userId: string) {
  const [user] = await db.select({
    accessToken: (aryaUsers as any).google_calendar_access_token,
    refreshToken: (aryaUsers as any).google_calendar_refresh_token,
  }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

  if (!user?.refreshToken && !user?.accessToken) return null;

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.update(aryaUsers).set({
        google_calendar_access_token: tokens.access_token,
      } as any).where(eq(aryaUsers.id, userId)).catch(() => {});
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const calendar = await getAuthenticatedCalendar(userId);
    if (!calendar) return [];

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    return (response.data.items || []).map(evt => ({
      id: evt.id || "",
      title: evt.summary || "Untitled Event",
      start: evt.start?.dateTime || evt.start?.date || "",
      end: evt.end?.dateTime || evt.end?.date || "",
      location: evt.location || undefined,
      description: evt.description || undefined,
      isAllDay: !evt.start?.dateTime,
      link: evt.htmlLink || undefined,
    }));
  } catch (err: any) {
    console.error("[CALENDAR] getTodayEvents error:", err.message);
    return [];
  }
}

export async function getUpcomingEvents(userId: string, days = 7): Promise<CalendarEvent[]> {
  try {
    const calendar = await getAuthenticatedCalendar(userId);
    if (!calendar) return [];

    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 30,
    });

    return (response.data.items || []).map(evt => ({
      id: evt.id || "",
      title: evt.summary || "Untitled Event",
      start: evt.start?.dateTime || evt.start?.date || "",
      end: evt.end?.dateTime || evt.end?.date || "",
      location: evt.location || undefined,
      description: evt.description || undefined,
      isAllDay: !evt.start?.dateTime,
      link: evt.htmlLink || undefined,
    }));
  } catch (err: any) {
    console.error("[CALENDAR] getUpcomingEvents error:", err.message);
    return [];
  }
}

export async function createCalendarEvent(
  userId: string,
  title: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string
): Promise<CalendarEvent | null> {
  try {
    const calendar = await getAuthenticatedCalendar(userId);
    if (!calendar) return null;

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        description,
        location,
        start: { dateTime: startTime, timeZone: "Asia/Kolkata" },
        end: { dateTime: endTime, timeZone: "Asia/Kolkata" },
      },
    });

    const evt = response.data;
    return {
      id: evt.id || "",
      title: evt.summary || title,
      start: evt.start?.dateTime || "",
      end: evt.end?.dateTime || "",
      location: evt.location,
      description: evt.description,
      isAllDay: false,
      link: evt.htmlLink || undefined,
    };
  } catch (err: any) {
    console.error("[CALENDAR] createEvent error:", err.message);
    return null;
  }
}

export async function formatEventsForBriefing(events: CalendarEvent[]): Promise<string> {
  if (events.length === 0) return "No meetings or events scheduled today.";
  const formatTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  };
  return events.map(e =>
    e.isAllDay
      ? `• ${e.title} (all day)`
      : `• ${e.title} at ${formatTime(e.start)}${e.location ? ` — ${e.location}` : ""}`
  ).join("\n");
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  try {
    const [user] = await db.select({
      token: (aryaUsers as any).google_calendar_refresh_token,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);
    return !!user?.token;
  } catch { return false; }
}

export async function disconnectCalendar(userId: string): Promise<void> {
  await db.update(aryaUsers).set({
    google_calendar_access_token: null,
    google_calendar_refresh_token: null,
    google_calendar_connected_at: null,
  } as any).where(eq(aryaUsers.id, userId));
}
