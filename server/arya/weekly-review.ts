import OpenAI from "openai";
import { db } from "../db";
import { aryaUsers, aryaGoals, aryaNotifications, aryaMoodCheckins, aryaVoiceNotes } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getLanguageInstruction } from "./language-instruction";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateWeeklyReview(userId: string): Promise<string> {
  try {
    const [user] = await db.select({
      name: aryaUsers.name,
      uiLanguage: aryaUsers.uiLanguage,
      futureYouLetter: (aryaUsers as any).futureYouLetter,
    }).from(aryaUsers).where(eq(aryaUsers.id, userId)).limit(1);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const goals = await db.select({
      title: aryaGoals.title,
      progress: aryaGoals.progress,
      streakCount: aryaGoals.streakCount,
      status: aryaGoals.status,
      updatedAt: aryaGoals.updatedAt,
    }).from(aryaGoals).where(eq(aryaGoals.userId, userId)).limit(10);

    const moodData = await db.select({
      mood: aryaMoodCheckins.mood,
      energy: aryaMoodCheckins.energy,
      createdAt: aryaMoodCheckins.createdAt,
    }).from(aryaMoodCheckins)
      .where(and(eq(aryaMoodCheckins.userId, userId), gte(aryaMoodCheckins.createdAt, weekAgo)));

    const activeGoals = goals.filter(g => g.status === "active");
    const completedGoals = goals.filter(g => g.status === "completed" && g.updatedAt && g.updatedAt >= weekAgo);
    const firstName = user?.name?.split(" ")[0] || "friend";
    const uiLang = (user as any)?.uiLanguage || "en";
    const langInstruction = getLanguageInstruction(uiLang, firstName);
    const fallbackReview = uiLang === "hi"
      ? `${firstName}, एक और हफ़्ता तुम्हारी कहानी में लिखा गया। तुमने इस हफ़्ते जो चुना — और जो नहीं चुना — वो सब information है। इसे use करो।`
      : uiLang === "ta"
      ? `${firstName}, இன்னொரு வாரம் உன் கதையில் எழுதப்பட்டது. இந்த வாரம் நீ என்ன தேர்ந்தெடுத்தாய் — என்ன தேர்ந்தெடுக்கவில்லை — எல்லாமே தகவல். இதை பயன்படுத்திக்கோ.`
      : uiLang === "te"
      ? `${firstName}, మరో వారం నీ కథలో రాయబడింది. ఈ వారం నువ్వు ఏం ఎంచుకున్నావో — ఏం ఎంచుకోలేదో — అన్నీ information. దీన్ని use చేయి.`
      : uiLang === "ml"
      ? `${firstName}, ഇനിയൊരാഴ്ച നിന്റെ കഥയിൽ എഴുതിച്ചേർക്കപ്പെട്ടു. ഈ ആഴ്ച നീ തിരഞ്ഞെടുത്തതും — തിരഞ്ഞെടുക്കാതിരുന്നതും — എല്ലാം information ആണ്. ഇത് ഉപയോഗിക്കൂ.`
      : uiLang === "bn"
      ? `${firstName}, আরো একটা সপ্তাহ তোমার গল্পে লেখা হলো। এই সপ্তাহ তুমি যা বেছে নিলে — আর যা নিলে না — সবটাই তথ্য। এটা কাজে লাগাও।`
      : uiLang === "mr"
      ? `${firstName}, आणखी एक आठवडा तुझ्या कहाणीत लिहिला गेला. या आठवड्यात तू जे निवडलंस — आणि जे नाही निवडलंस — ते सगळं information आहे. यातून शीक.`
      : uiLang === "gu"
      ? `${firstName}, વધુ એક અઠવાડિયું તારી કહાણીમાં લખાઈ ગયું. આ અઠવાડિયે તેં જે પસંદ કર્યું — અને જે ન કર્યું — તે બધું information છે. તેનો ઉપયોગ કર.`
      : `${firstName}, another week written into your story. What you chose — and didn't choose — this week is information. Use it.`;

    const goalsText = activeGoals.length > 0
      ? activeGoals.map(g => `"${g.title}" — ${g.progress}% progress, ${g.streakCount}-day streak`).join("\n")
      : "No active goals this week.";

    const completedText = completedGoals.length > 0
      ? completedGoals.map(g => `"${g.title}" — completed this week`).join("\n") : "";

    const avgMood = moodData.length > 0
      ? (moodData.reduce((s, m) => s + m.mood, 0) / moodData.length).toFixed(1) : null;
    const moodText = avgMood
      ? `Average mood: ${avgMood}/5 across ${moodData.length} check-ins this week`
      : "No mood check-ins this week";

    const futureLetterContext = (user as any)?.futureYouLetter
      ? `\nThe letter they once wrote about who they want to become:\n"${((user as any).futureYouLetter as string).slice(0, 350)}"`
      : "";

    // Voice flashback: pick one note from 28–62 days ago
    const daysAgo28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const daysAgo62 = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
    const flashbackNotes = await db.select({
      transcript: aryaVoiceNotes.transcript,
      title: aryaVoiceNotes.title,
      createdAt: aryaVoiceNotes.createdAt,
    }).from(aryaVoiceNotes)
      .where(and(
        eq(aryaVoiceNotes.userId, userId),
        gte(aryaVoiceNotes.createdAt, daysAgo62),
        lte(aryaVoiceNotes.createdAt, daysAgo28),
      )).limit(5);

    let flashbackContext = "";
    if (flashbackNotes.length > 0) {
      const note = flashbackNotes[Math.floor(Math.random() * flashbackNotes.length)];
      const daysAgo = Math.round((Date.now() - note.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const excerpt = note.transcript.slice(0, 200);
      flashbackContext = `\nFrom a voice note they recorded ${daysAgo} days ago:\n"${excerpt}${note.transcript.length > 200 ? "..." : ""}"`;
    }

    const prompt = `You are ARYA — ${firstName}'s personal thinking partner. Write their Sunday weekly review. Under 200 words. Write it as a STORY, not a letter or report.

${langInstruction}


NEVER say "you completed X out of Y goals." NEVER use bullet points. This is a letter.

Instead, write like this:
- "This was the week you decided to..."
- "Something shifted in how you showed up for [goal]."
- "The streak on [goal] isn't just a number — it's evidence of who you're becoming."
- If progress was low: "You pulled back this week. That's data, not failure."

Their data:
Goals: ${goalsText}
${completedText ? `Completed: ${completedText}` : ""}
Mood: ${moodText}
${futureLetterContext}
${flashbackContext}

Rules:
- Name their goals by actual title
- Reference their mood data if meaningful
- If they wrote a future letter, echo one phrase back — briefly, not loudly
- If a voice flashback is present, open with it: "About a month ago, you said: '[short quote]'. Look at where you are now." Then continue the review.
- End with exactly ONE sentence they'll carry into the week. Make it true, not motivational-poster true.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 280,
    } as any);

    return (response as any).choices?.[0]?.message?.content || fallbackReview;
  } catch {
    return "Another week complete. What you chose this week tells you something about who you're becoming. Sit with that before the next one begins.";
  }
}

export async function sendWeeklyReviews(sendPush: (userId: string, title: string, body: string, icon: string) => Promise<void>): Promise<void> {
  try {
    const users = await db.select({
      id: aryaUsers.id,
      name: aryaUsers.name,
      uiLanguage: aryaUsers.uiLanguage,
      weeklyReviewEnabled: (aryaUsers as any).weeklyReviewEnabled,
    }).from(aryaUsers).where(eq(aryaUsers.isActive, true));

    const eligible = users.filter((u: any) => u.weeklyReviewEnabled);
    console.log(`[WEEKLY REVIEW] Sending to ${eligible.length} users`);

    for (const user of eligible) {
      try {
        const review = await generateWeeklyReview(user.id);
        const firstName = user.name?.split(" ")[0] || "there";

        const lang = (user as any)?.uiLanguage || "en";
        const reviewTitle = lang === "hi" ? `📊 ${firstName}, तुम्हारी साप्ताहिक समीक्षा`
          : lang === "ta" ? `${firstName}, உன் வார மதிப்பீடு தயார் 📖`
          : lang === "te" ? `${firstName}, నీ వారాంత సమీక్ష సిద్ధం 📖`
          : lang === "ml" ? `${firstName}, നിന്റെ ആഴ്ചയിലെ അവലോകനം തയ്യാർ 📖`
          : lang === "bn" ? `${firstName}, তোমার সাপ্তাহিক পর্যালোচনা তৈরি 📖`
          : lang === "mr" ? `${firstName}, तुझा आठवड्याचा आढावा तयार 📖`
          : lang === "gu" ? `${firstName}, તારી સાપ્તાહિક સમીક્ષા તૈયાર 📖`
          : lang === "pa" ? `${firstName}, ਤੇਰੀ ਹਫ਼ਤਾਵਾਰੀ ਸਮੀਖਿਆ ਤਿਆਰ 📖`
          : lang === "od" ? `${firstName}, ତୁମ ସାପ୍ତାହିକ ସମୀକ୍ଷା ପ୍ରସ୍ତୁତ 📖`
          : `📊 Your Weekly Review`;
        await db.insert(aryaNotifications).values({
          userId: user.id,
          type: "weekly_review" as any,
          title: reviewTitle,
          message: review.slice(0, 500),
        }).catch(() => {});

        await sendPush(user.id, reviewTitle, review.slice(0, 120) + "...", "/icons/icon-192.png");
      } catch (err: any) {
        console.error(`[WEEKLY REVIEW] Failed for user ${user.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[WEEKLY REVIEW] Error:", err.message);
  }
}
