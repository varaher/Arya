// ─────────────────────────────────────────────────────────────────────────────
//  buildTimeContext — pure clock, zero API calls
//
//  Injected into ARYA's system prompt so GPT-4o knows the exact moment in
//  IST. No latency cost. Called once per request at context-assembly time.
//
//  Covers:
//  - Current IST date + time (12h)
//  - Day of week
//  - Time-of-day label (morning / afternoon / evening / night)
//  - Week number + quarter (useful for goal / business context)
//  - Upcoming weekend flag (Friday / Saturday / Sunday)
//  - Indian calendar season (ritu) — rough mapping, not panchanga
// ─────────────────────────────────────────────────────────────────────────────

const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function istNow(): Date {
  // IST = UTC + 5:30
  const utcMs = Date.now();
  return new Date(utcMs + 5.5 * 60 * 60 * 1000);
}

function timeOfDay(hour: number): string {
  if (hour < 6)  return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function quarter(month: number): number {
  return Math.floor(month / 3) + 1;
}

// Rough Indian ritu (season) mapping by Gregorian month
function ritu(month: number): string {
  const seasons: Record<number, string> = {
    0: "Shishir (winter)",  1: "Shishir (winter)",
    2: "Vasant (spring)",   3: "Vasant (spring)",
    4: "Grishma (summer)",  5: "Grishma (summer)",
    6: "Varsha (monsoon)",  7: "Varsha (monsoon)",
    8: "Sharad (autumn)",   9: "Sharad (autumn)",
    10: "Hemant (pre-winter)", 11: "Hemant (pre-winter)",
  };
  return seasons[month] ?? "unknown";
}

export function buildTimeContext(): string {
  const ist  = istNow();
  const day  = DAYS[ist.getUTCDay()];
  const date = ist.getUTCDate();
  const mon  = MONTHS[ist.getUTCMonth()];
  const year = ist.getUTCFullYear();
  const h24  = ist.getUTCHours();
  const mins = String(ist.getUTCMinutes()).padStart(2, "0");
  const h12  = h24 % 12 || 12;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const tod  = timeOfDay(h24);
  const week = isoWeek(ist);
  const q    = quarter(ist.getUTCMonth());
  const dayOfWeek = ist.getUTCDay(); // 0=Sun
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday  = dayOfWeek === 5;
  const season    = ritu(ist.getUTCMonth());

  const weekendNote = isWeekend
    ? " (weekend)"
    : isFriday
    ? " (Friday — weekend approaching)"
    : "";

  return `[TIME CONTEXT — use when the user asks the time, date, day, or needs scheduling help.
Current: ${day}, ${date} ${mon} ${year} — ${h12}:${mins} ${ampm} IST (${tod})${weekendNote}
Week ${week} of ${year} | Q${q} | Season: ${season}
Rules: Never say "I don't know the date." Never say "as of my knowledge cutoff." Use this as the live time.]`;
}
