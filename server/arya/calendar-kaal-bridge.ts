/**
 * calendar-kaal-bridge.ts
 * Connection 4 — Calendar → KAAL
 *
 * Checks whether important calendar events fall in a low-energy window,
 * and returns a plain-language warning to inject into the morning briefing.
 *
 * Usage:
 *   const warning = await checkCalendarKaalConflict(userId);
 *   if (warning.hasConflict) briefing.calendarWarning = warning.warningText;
 */

import { buildUserContext } from "./context-builder";

export interface CalendarKaalWarning {
  hasConflict: boolean;
  warningText: string | null;
  conflictingEvent: string | null;
  conflictTime: string | null;
  adviceText: string | null;
}

const IMPORTANT_KEYWORDS = [
  "conference", "presentation", "interview", "meeting",
  "surgery", "procedure", "seminar", "talk", "speech",
  "pitch", "demo", "review", "exam", "test", "workshop",
  "webinar", "panel", "lecture", "inauguration",
];

/** Parse "10:30 AM", "14:00", "2:15 PM" → hour (24h) */
function parseHour(timeStr: string): number {
  if (!timeStr) return 12;
  const cleaned = timeStr.trim().toUpperCase();
  const isPM = cleaned.includes("PM");
  const isAM = cleaned.includes("AM");
  const numbers = cleaned.replace(/[^0-9:]/g, "");
  const parts = numbers.split(":");
  let hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return 12;
  if (isPM && hour !== 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return hour;
}

/**
 * Each dasha lord has a natural peak window (simplified classical heuristic).
 * Returns [peakStart, peakEnd] in 24h format.
 */
function peakWindowForDasha(dashaLord: string | null): [number, number] {
  const map: Record<string, [number, number]> = {
    Sun: [7, 11],
    Moon: [6, 10],
    Mars: [5, 9],
    Mercury: [9, 13],
    Jupiter: [9, 13],
    Venus: [10, 14],
    Saturn: [8, 12],
    Rahu: [10, 14],
    Ketu: [7, 11],
  };
  return map[dashaLord ?? "Jupiter"] ?? [9, 13];
}

function isLowEnergyHour(hour: number, peakStart: number, peakEnd: number): boolean {
  return hour < peakStart - 1 || hour >= 16; // outside peak and after 4 PM
}

function buildAdvice(summary: string, time: string, peakStart: number): string {
  const lower = summary.toLowerCase();
  const peakTime = `${peakStart % 12 || 12}:00 ${peakStart < 12 ? "AM" : "PM"}`;

  if (lower.includes("speech") || lower.includes("talk") || lower.includes("presentation")) {
    return `Your words carry more weight when you're in peak clarity. Prepare and rehearse before ${peakTime} — walk in with the thinking already done.`;
  }
  if (lower.includes("interview")) {
    return `Interviews reward presence, not last-minute preparation. Settle your thoughts before ${peakTime} and enter calm.`;
  }
  if (lower.includes("surgery") || lower.includes("procedure")) {
    return `Your clearest state is before ${peakTime}. Complete all preparation and briefing by then.`;
  }
  if (lower.includes("conference") || lower.includes("seminar") || lower.includes("workshop")) {
    return `The conference demands sustained energy. Use your peak before ${peakTime} for your most important contributions.`;
  }
  return `Do your heaviest thinking before ${peakTime} — arrive prepared rather than preparing at the last moment.`;
}

export async function checkCalendarKaalConflict(
  userId: string,
): Promise<CalendarKaalWarning> {
  const empty: CalendarKaalWarning = {
    hasConflict: false,
    warningText: null,
    conflictingEvent: null,
    conflictTime: null,
    adviceText: null,
  };

  try {
    const ctx = await buildUserContext(userId);

    if (!ctx.kaal.hasProfile || ctx.calendar.todayEvents.length === 0) {
      return empty;
    }

    const [peakStart, peakEnd] = peakWindowForDasha(ctx.kaal.dashaLord);
    const peakTime = `${peakStart % 12 || 12}:00 ${peakStart < 12 ? "AM" : "PM"}`;

    const conflicting = ctx.calendar.todayEvents.find(event => {
      const hour = parseHour(event.start);
      const isImportant = IMPORTANT_KEYWORDS.some(kw =>
        (event.summary ?? "").toLowerCase().includes(kw),
      );
      return isImportant && isLowEnergyHour(hour, peakStart, peakEnd);
    });

    if (!conflicting) return empty;

    const summary = conflicting.summary ?? "Your event";
    const time = conflicting.start;

    const warningText =
      `${summary} at ${time} falls outside your clearest window today. ` +
      `Your peak clarity is before ${peakTime}. ` +
      `Prepare then — walk in with the thinking already done.`;

    const adviceText = buildAdvice(summary, time, peakStart);

    return {
      hasConflict: true,
      warningText,
      conflictingEvent: summary,
      conflictTime: time,
      adviceText,
    };
  } catch (err: any) {
    console.error("[CALENDAR-KAAL] Error:", err.message);
    return empty;
  }
}
