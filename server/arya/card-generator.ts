// ═══════════════════════════════════════════════════════════════════════
// ARYA Rich Notification Card Generator
// server/arya/card-generator.ts
//
// Pure SVG — no canvas, no sharp, no ImageMagick.
// Generates beautiful dark cards for push notifications.
//
// Cards:
//   morning      — KAAL briefing + top goal
//   goal_checkin — Evening goal check-in
//   story        — Drishya story offer
//   reminder     — Reminder / Alarm
//   sunday_review — Weekly letter
// ═══════════════════════════════════════════════════════════════════════

interface MorningCardData {
  firstName: string;
  greeting: string;
  kaalWindow: string;
  kaalEnergy: number;
  kaalTheme: string;
  topGoal: string;
  dayName: string;
  date: string;
  moonSign?: string;
}

interface GoalCheckInCardData {
  firstName: string;
  goalTitle: string;
  daysAgo: number;
  checkInType: string;
}

interface StoryCardData {
  firstName: string;
  rasa: string;
  rasaEmoji: string;
  storyHint: string;
  language: string;
}

interface ReminderCardData {
  title: string;
  time: string;
  isAlarm: boolean;
  message?: string;
}

interface SundayCardData {
  firstName: string;
  weekSummary: string;
  goalsActive: number;
  goalsMoved: number;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// ── 1. Morning KAAL Briefing ──────────────────────────────────────────

export function generateMorningCard(data: MorningCardData): string {
  const energyPct   = Math.min(100, (data.kaalEnergy / 10) * 100);
  const energyWidth = Math.round(energyPct * 4.2);

  const energyColor =
    data.kaalEnergy >= 8 ? '#f59e0b' :
    data.kaalEnergy >= 6 ? '#4ade80' :
    data.kaalEnergy >= 4 ? '#60a5fa' : '#6b7280';

  const energyLabel =
    data.kaalEnergy >= 8 ? 'Peak clarity' :
    data.kaalEnergy >= 6 ? 'High energy' :
    data.kaalEnergy >= 4 ? 'Moderate' : 'Rest day';

  const goalText  = truncate(escapeXml(data.topGoal), 42);
  const themeText = truncate(escapeXml(data.kaalTheme), 36);
  const firstName = escapeXml(data.firstName);
  const greeting  = escapeXml(data.greeting);
  const dayName   = escapeXml(data.dayName).toUpperCase();
  const dateStr   = escapeXml(data.date);
  const window_   = escapeXml(data.kaalWindow);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1a10;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#0f2318;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="eb" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${energyColor};stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:${energyColor};stop-opacity:0.5"/>
    </linearGradient>
    <linearGradient id="gb" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#22c55e;stop-opacity:0.12"/>
      <stop offset="100%" style="stop-color:#22c55e;stop-opacity:0.04"/>
    </linearGradient>
  </defs>
  <rect width="600" height="300" fill="url(#bg)" rx="16"/>
  <rect width="600" height="300" fill="none" stroke="#22c55e" stroke-opacity="0.06" stroke-width="1" rx="16"/>
  <rect x="0" y="0" width="4" height="300" fill="${energyColor}" opacity="0.8" rx="2"/>
  <rect x="490" y="18" width="92" height="24" fill="#22c55e" fill-opacity="0.12" rx="12" stroke="#22c55e" stroke-opacity="0.2" stroke-width="1"/>
  <text x="536" y="34" font-family="sans-serif" font-size="11" fill="#4ade80" text-anchor="middle" font-weight="600" letter-spacing="1">&#x1FA54; KAAL</text>
  <text x="32" y="42" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.35)" letter-spacing="1">${dayName} &middot; ${dateStr}</text>
  <text x="32" y="78" font-family="Georgia,serif" font-size="26" fill="#f0fdf4">${greeting},</text>
  <text x="32" y="112" font-family="Georgia,serif" font-size="32" fill="#4ade80" font-style="italic">${firstName}.</text>
  <line x1="32" y1="128" x2="568" y2="128" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="32" y="152" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.3)" letter-spacing="1.5">BEST WINDOW TODAY</text>
  <text x="32" y="175" font-family="sans-serif" font-size="20" fill="#f0fdf4" font-weight="600">${window_}</text>
  <text x="340" y="175" font-family="sans-serif" font-size="13" fill="${energyColor}">${energyLabel}</text>
  <rect x="32" y="184" width="420" height="7" fill="rgba(255,255,255,0.08)" rx="3"/>
  <rect x="32" y="184" width="${energyWidth}" height="7" fill="url(#eb)" rx="3"/>
  <text x="32" y="210" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.35)" font-style="italic">${themeText}</text>
  <line x1="32" y1="224" x2="568" y2="224" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="32" y="246" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.3)" letter-spacing="1.5">TOP GOAL TODAY</text>
  <rect x="32" y="254" width="536" height="32" fill="url(#gb)" rx="6"/>
  <text x="44" y="274" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.85)">&#127919; ${goalText}</text>
</svg>`;
}

// ── 2. Evening Goal Check-in ──────────────────────────────────────────

export function generateGoalCheckInCard(data: GoalCheckInCardData): string {
  const goalText  = truncate(escapeXml(data.goalTitle), 40);
  const firstName = escapeXml(data.firstName);
  const daysText  = data.daysAgo === 1 ? '1 day ago' : `${data.daysAgo} days ago`;
  const message   =
    data.daysAgo >= 14 ? 'This goal has been waiting for you.' :
    data.daysAgo >= 7  ? "A week has passed. How&apos;s it going?" :
    data.daysAgo >= 3  ? 'A few days in. Did you start?' :
    'You set this recently. What&apos;s the first step?';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0f0a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#2a1505;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="260" fill="url(#bg2)" rx="16"/>
  <rect width="600" height="260" fill="none" stroke="#f59e0b" stroke-opacity="0.08" stroke-width="1" rx="16"/>
  <rect x="0" y="0" width="4" height="260" fill="#f59e0b" opacity="0.7" rx="2"/>
  <rect x="474" y="18" width="108" height="24" fill="#f59e0b" fill-opacity="0.1" rx="12" stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1"/>
  <text x="528" y="34" font-family="sans-serif" font-size="11" fill="#fbbf24" text-anchor="middle" font-weight="600" letter-spacing="1">&#127919; GOAL CHECK</text>
  <text x="32" y="62" font-family="sans-serif" font-size="36">&#127919;</text>
  <text x="80" y="50" font-family="Georgia,serif" font-size="22" fill="#f0fdf4">Evening check-in,</text>
  <text x="80" y="76" font-family="Georgia,serif" font-size="24" fill="#fbbf24" font-style="italic">${firstName}.</text>
  <line x1="32" y1="96" x2="568" y2="96" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="32" y="120" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.3)" letter-spacing="1.5">YOUR GOAL</text>
  <rect x="32" y="128" width="536" height="36" fill="rgba(251,191,36,0.06)" rx="8" stroke="rgba(251,191,36,0.1)" stroke-width="1"/>
  <text x="44" y="151" font-family="sans-serif" font-size="15" fill="rgba(255,255,255,0.9)" font-weight="500">${goalText}</text>
  <text x="32" y="188" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">Set ${daysText}</text>
  <text x="32" y="212" font-family="Georgia,serif" font-size="16" fill="rgba(255,255,255,0.65)" font-style="italic">"${message}"</text>
  <text x="32" y="244" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.25)">Tap to respond &#8594; Yes &middot; Skip &middot; Not yet</text>
</svg>`;
}

// ── 3. Drishya Story Offer ────────────────────────────────────────────

export function generateStoryCard(data: StoryCardData): string {
  const rasa      = escapeXml(data.rasa).toUpperCase();
  const hint      = truncate(escapeXml(data.storyHint), 52);
  const lang      = escapeXml(data.language);

  const offerByLang: Record<string, string> = {
    Malayalam: '&#3384;&#3374;&#3375; &#3349;&#3364; &#3346;&#3376;&#3351;&#3378;&#3349;&#3375;?',
    Hindi:     '&#2319;&#2325; &#2325;&#2361;&#2366;&#2344;&#2368; &#2360;&#2369;&#2344;&#2366;&#2323;&#2306;?',
    Tamil:     '&#2962;&#2992;&#3009; &#2965;&#2980;&#3016; &#2970;&#3028;&#2994;&#3021;&#2994;&#2975;&#3021;&#2975;&#3009;&#2990;&#3�;?',
    Telugu:    '&#3108;&#3093; &#3093;&#3120;&#3122; &#3099;&#3143;&#3114;&#3149;&#3114;&#3149;&#3108;&#3137;?',
    Kannada:   '&#3274;&#3306;&#3257;&#3277; &#3257;&#3277;&#3246;&#3246;&#3277; &#3251;&#3263;&#3278;&#3254;&#3241;?',
    Bengali:   '&#2319;&#2325;&#2335;&#2366; &#2327;&#2354;&#2381;&#2346; &#2348;&#2354;&#2367;?',
    Marathi:   '&#2319;&#2325; &#2327;&#2379;&#2359;&#2381;&#2335; &#2360;&#2366;&#2306;&#2327;&#2370; &#2325;&#2366;?',
    English:   'Want me to tell you a story?',
  };

  const offerText = offerByLang[data.language] || offerByLang['English'];
  const emoji     = escapeXml(data.rasaEmoji || '🌙');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d0a1a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a0d2e;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="amb" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d97706;stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:#d97706;stop-opacity:0.03"/>
    </linearGradient>
  </defs>
  <rect width="600" height="260" fill="url(#bg3)" rx="16"/>
  <rect width="600" height="260" fill="none" stroke="#d97706" stroke-opacity="0.1" stroke-width="1" rx="16"/>
  <rect x="0" y="0" width="4" height="260" fill="#d97706" opacity="0.5" rx="2"/>
  <text x="520" y="50" font-family="sans-serif" font-size="28" opacity="0.25">&#10022;</text>
  <text x="555" y="85" font-family="sans-serif" font-size="18" opacity="0.15">&#10022;</text>
  <rect x="458" y="18" width="124" height="24" fill="#d97706" fill-opacity="0.1" rx="12" stroke="#d97706" stroke-opacity="0.2" stroke-width="1"/>
  <text x="520" y="34" font-family="sans-serif" font-size="11" fill="#fbbf24" text-anchor="middle" font-weight="600" letter-spacing="1">&#128214; DRISHYA</text>
  <text x="32" y="68" font-family="sans-serif" font-size="36">${emoji}</text>
  <text x="84" y="52" font-family="Georgia,serif" font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="0.5">ARYA</text>
  <text x="84" y="76" font-family="Georgia,serif" font-size="22" fill="#fbbf24" font-style="italic">${offerText}</text>
  <line x1="32" y1="96" x2="568" y2="96" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="32" y="120" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.25)" letter-spacing="2">TONIGHT&apos;S RASA &middot; ${rasa}</text>
  <rect x="32" y="130" width="536" height="48" fill="url(#amb)" rx="8"/>
  <text x="44" y="152" font-family="Georgia,serif" font-size="15" fill="rgba(255,255,255,0.7)" font-style="italic">"${hint}"</text>
  <text x="44" y="172" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">In ${lang} &middot; with ARYA&apos;s voice</text>
  <text x="32" y="216" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.5)">&#127897;&#65039; Listen</text>
  <text x="112" y="216" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.25)">&middot;</text>
  <text x="126" y="216" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.5)">&#128214; Read</text>
  <text x="196" y="216" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.25)">&middot;</text>
  <text x="210" y="216" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.35)">Maybe later</text>
  <text x="32" y="244" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.2)" font-style="italic">From India&apos;s 5,000-year story tradition</text>
</svg>`;
}

// ── 4. Reminder / Alarm Card ──────────────────────────────────────────

export function generateReminderCard(data: ReminderCardData): string {
  const title    = truncate(escapeXml(data.title), 32);
  const time     = escapeXml(data.time);
  const msg      = data.message ? truncate(escapeXml(data.message), 52) : '';
  const isAlarm  = data.isAlarm;

  const accent   = isAlarm ? '#ef4444' : '#4ade80';
  const bg1      = isAlarm ? '#1a0505' : '#051a0a';
  const bg2      = isAlarm ? '#2a0808' : '#0a2318';
  const badge    = isAlarm ? '&#9200; ALARM' : '&#128276; REMINDER';
  const badgeClr = isAlarm ? '#f87171' : '#4ade80';
  const icon     = isAlarm ? '&#9200;' : '&#128276;';
  const badgeX   = isAlarm ? 474 : 466;
  const badgeW   = isAlarm ? 108 : 116;
  const actionsY = msg ? 196 : 170;
  const actTxt   = isAlarm
    ? '&#10003; Dismiss &nbsp;&middot;&nbsp; &#9200; Snooze 5 min &nbsp;&middot;&nbsp; &#9200; Snooze 10 min'
    : '&#10003; Done &nbsp;&middot;&nbsp; &#9200; Snooze 5 min';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="220" viewBox="0 0 600 220">
  <defs>
    <linearGradient id="bgR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${bg2};stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="220" fill="url(#bgR)" rx="16"/>
  <rect width="600" height="220" fill="none" stroke="${accent}" stroke-opacity="0.1" stroke-width="1" rx="16"/>
  <rect x="0" y="0" width="4" height="220" fill="${accent}" opacity="0.7" rx="2"/>
  <rect x="${badgeX}" y="18" width="${badgeW}" height="24" fill="${accent}" fill-opacity="0.1" rx="12" stroke="${accent}" stroke-opacity="0.2" stroke-width="1"/>
  <text x="528" y="34" font-family="sans-serif" font-size="11" fill="${badgeClr}" text-anchor="middle" font-weight="600" letter-spacing="1">${badge}</text>
  <text x="32" y="72" font-family="sans-serif" font-size="40">${icon}</text>
  <text x="88" y="55" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.3)" letter-spacing="1.5">ARYA</text>
  <text x="88" y="82" font-family="sans-serif" font-size="24" fill="#f0fdf4" font-weight="600">${title}</text>
  <rect x="32" y="100" width="200" height="36" fill="${accent}" fill-opacity="0.08" rx="8" stroke="${accent}" stroke-opacity="0.12" stroke-width="1"/>
  <text x="132" y="123" font-family="sans-serif" font-size="20" fill="${accent}" text-anchor="middle" font-weight="700">${time}</text>
  ${msg ? `<text x="32" y="162" font-family="Georgia,serif" font-size="14" fill="rgba(255,255,255,0.5)" font-style="italic">"${msg}"</text>` : ''}
  <text x="32" y="${actionsY}" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.35)">${actTxt}</text>
</svg>`;
}

// ── 5. Sunday Review Letter ───────────────────────────────────────────

export function generateSundayCard(data: SundayCardData): string {
  const firstName = escapeXml(data.firstName);
  const summary   = truncate(escapeXml(data.weekSummary), 52);
  const movedPct  = data.goalsActive > 0
    ? Math.round((data.goalsMoved / data.goalsActive) * 100) : 0;
  const barWidth  = Math.round(movedPct * 4.2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
  <defs>
    <linearGradient id="bgS" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0e05;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a1a08;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="280" fill="url(#bgS)" rx="16"/>
  <rect width="600" height="280" fill="none" stroke="#b5a06a" stroke-opacity="0.12" stroke-width="1" rx="16"/>
  <rect x="0" y="0" width="4" height="280" fill="#b5a06a" opacity="0.5" rx="2"/>
  <rect x="448" y="18" width="134" height="24" fill="#b5a06a" fill-opacity="0.1" rx="12" stroke="#b5a06a" stroke-opacity="0.2" stroke-width="1"/>
  <text x="515" y="34" font-family="sans-serif" font-size="11" fill="#d4a84b" text-anchor="middle" font-weight="600" letter-spacing="1">&#127807; SUNDAY REVIEW</text>
  <text x="32" y="68" font-family="sans-serif" font-size="36">&#127807;</text>
  <text x="84" y="50" font-family="Georgia,serif" font-size="13" fill="rgba(255,255,255,0.3)" letter-spacing="1">ARYA&apos;S SUNDAY LETTER</text>
  <text x="84" y="76" font-family="Georgia,serif" font-size="22" fill="#d4a84b" font-style="italic">to ${firstName}.</text>
  <line x1="32" y1="94" x2="568" y2="94" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="32" y="122" font-family="Georgia,serif" font-size="17" fill="rgba(255,255,255,0.75)" font-style="italic">"${summary}"</text>
  <text x="32" y="158" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.3)" letter-spacing="1.5">GOALS THIS WEEK</text>
  <text x="32" y="186" font-family="Georgia,serif" font-size="32" fill="#f0fdf4">${data.goalsActive}</text>
  <text x="60" y="186" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.3)"> active</text>
  <text x="130" y="186" font-family="Georgia,serif" font-size="32" fill="#4ade80">${data.goalsMoved}</text>
  <text x="158" y="186" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.3)"> moved</text>
  <rect x="32" y="196" width="420" height="6" fill="rgba(255,255,255,0.06)" rx="3"/>
  <rect x="32" y="196" width="${barWidth}" height="6" fill="#4ade80" fill-opacity="0.7" rx="3"/>
  <text x="460" y="204" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.4)">${movedPct}% moved</text>
  <rect x="32" y="218" width="200" height="36" fill="#b5a06a" fill-opacity="0.12" rx="10" stroke="#b5a06a" stroke-opacity="0.2" stroke-width="1"/>
  <text x="132" y="240" font-family="sans-serif" font-size="14" fill="#d4a84b" text-anchor="middle" font-weight="500">Read your letter &#8594;</text>
</svg>`;
}

// ─── Utilities ────────────────────────────────────────────────────────

export function svgToDataUrl(svg: string): string {
  const b64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

export function svgToBuffer(svg: string): Buffer {
  return Buffer.from(svg, 'utf-8');
}

// ─── Dispatcher ───────────────────────────────────────────────────────

export type CardType = 'morning' | 'goal_checkin' | 'story' | 'reminder' | 'alarm' | 'sunday_review';

export function generateCard(type: CardType, data: any): string {
  switch (type) {
    case 'morning':       return generateMorningCard(data);
    case 'goal_checkin':  return generateGoalCheckInCard(data);
    case 'story':         return generateStoryCard(data);
    case 'reminder':      return generateReminderCard({ ...data, isAlarm: false });
    case 'alarm':         return generateReminderCard({ ...data, isAlarm: true });
    case 'sunday_review': return generateSundayCard(data);
    default:              return generateMorningCard(data);
  }
}

// ─── App URL helper ───────────────────────────────────────────────────
// Returns the base URL for this deployment (used to build card image URLs
// that go into push notification `image` field).

export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  // Replit sets REPLIT_DOMAINS — use the first domain
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(',')[0].trim();
    if (first) return `https://${first}`;
  }
  return '';
}
