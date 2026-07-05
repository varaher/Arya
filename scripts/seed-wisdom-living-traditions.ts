// ══════════════════════════════════════════════════════════════════════════════
//  ARYA WISDOM — Living Traditions Seed Script
//
//  Covers: Sangam Literature, Siddhar Tradition, Nath Tradition,
//          Baul Tradition, Lalleshwari (Kashmir), Akka Mahadevi (Karnataka),
//          Alvar Tradition, Nayanar Tradition, Embodied Knowledge traditions
//
//  Usage:
//    npx tsx scripts/seed-wisdom-living-traditions.ts            — seed entries
//    npx tsx scripts/seed-wisdom-living-traditions.ts translate  — fill variants
//    npx tsx scripts/seed-wisdom-living-traditions.ts unreviewed — show pending
//
//  NOTE: These entries are seeded with reviewed=false.
//  They require verification by tradition-native scholars before
//  being served by the wisdom retriever (which only pulls reviewed=true).
//  Run the 'unreviewed' command to see what needs review.
// ══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";
import { Pool } from "pg";
import { batchTranslateWisdomEntry } from "../server/arya/wisdom-translator";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function mapDomain(d: string) {
  if (d === "philosophy" || d === "devotional") return "sanskrit";
  if (d === "healing") return "medical";
  if (d === "storytelling") return "stories";
  return "sanskrit";
}

const SEEDS = [

  // ════════════════════════════════════════════════════════════
  // SANGAM LITERATURE (300 BCE – 300 CE)
  // ════════════════════════════════════════════════════════════

  {
    domain: "storytelling", tradition: "sangam",
    source_name: "Sangam — Akananuru — Kurinci Tinai",
    situation_tags: ["romantic_struggle","longing","relationship_decision","separation","love"],
    emotional_tags: ["longing","love","hope","seeking"],
    arya_principle: "The feeling of wanting to be close to someone — genuinely close, not just near them — is one of the most clarifying emotions there is. It cuts through most of the noise about what actually matters. The mountain in bloom is not backdrop. It is the feeling itself made visible.",
    arya_story_seed: "A doctor who worked beside the same colleague for three years before understanding that what he had been calling professional admiration was something else entirely, and that this understanding changed everything.",
    rasa: "shringara", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "storytelling", tradition: "sangam",
    source_name: "Sangam — Purananuru 192",
    situation_tags: ["meaning_and_purpose","legacy","mortality_awareness","ambition_and_purpose"],
    emotional_tags: ["seeking","wonder","grief","longing"],
    arya_principle: "What makes a life worth remembering is rarely what the person thought was their main achievement. It is usually something smaller — how they treated people when nothing was at stake, what they gave when they did not have to, who they were on an ordinary Tuesday.",
    arya_story_seed: "A prominent surgeon whose obituary mentioned his awards in the third paragraph. The first two were about the habit he had of staying an extra ten minutes with every patient who seemed frightened.",
    rasa: "shanta", guna_relevance: ["rajas","sattva"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "storytelling", tradition: "sangam",
    source_name: "Sangam — Neydal Tinai — coastal emotional register",
    situation_tags: ["grief_and_loss","loneliness","longing","patience","waiting"],
    emotional_tags: ["longing","grief","patience","sadness"],
    arya_principle: "There is a particular quality of waiting that is not passive — it is active endurance. The coast that does not fight the tide but receives it completely, again and again, without breaking. Some things can only be survived by learning to receive them rather than resist them.",
    arya_story_seed: "A woman whose husband was stationed far away for two years who said afterward: I did not wait. I lived completely, but with him always somewhere in the living.",
    rasa: "karuna", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "storytelling", tradition: "sangam",
    source_name: "Sangam — Marutam Tinai — estrangement register",
    situation_tags: ["betrayal","relationship_decision","anger_and_conflict","family_conflict"],
    emotional_tags: ["anger","hurt","grief","confusion"],
    arya_principle: "When trust is broken between people who genuinely loved each other, the anger is real and it is right. What matters after that is whether the anger becomes the whole story or just the beginning of a harder, more honest conversation about what actually happened and whether it can hold any future.",
    arya_story_seed: "Two business partners of fifteen years who had a serious breach of trust. One walked away immediately. The other asked one question before leaving: do you want to understand what happened, or do you just want it to be over? The answer changed what came next.",
    rasa: "raudra", guna_relevance: ["rajas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "storytelling", tradition: "sangam",
    source_name: "Sangam — Palai Tinai — separation and hardship register",
    situation_tags: ["grief_and_loss","family_decision","sacrifice","loneliness","resilience"],
    emotional_tags: ["grief","courage","loneliness","determination"],
    arya_principle: "The hardest journeys are the ones where you have to leave something genuinely good in order to do something genuinely necessary. The wasteland between the two is real. It is not a mistake to feel it fully. The mistake is to pretend it is not there.",
    arya_story_seed: "A young doctor who left Kerala for a residency in a distant city, knowing it was the right decision and feeling the wrongness of it every day for eight months, and understanding eventually that both things were true at once.",
    rasa: "karuna", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "storytelling", tradition: "sangam",
    source_name: "Sangam — Purananuru — on death and clarity",
    situation_tags: ["mortality_awareness","meaning_and_purpose","grief_and_loss","what_matters"],
    emotional_tags: ["grief","wonder","acceptance","courage"],
    arya_principle: "Death was not hidden from the Sangam poets. They looked at it directly and wrote about what it clarified. What it clarified, every time, was this: the time here is short, the connections real, and most of the things that take up attention are not the things that will matter at the end.",
    arya_story_seed: "A cardiologist who said that what twenty years in the cardiac ICU had taught her was not about medicine. It was about what people talk about in the last twenty minutes before surgery when they do not know what the outcome will be. Nobody talked about work.",
    rasa: "shanta", guna_relevance: ["tamas","sattva"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // SIDDHAR TRADITION — TAMIL
  // ════════════════════════════════════════════════════════════

  {
    domain: "healing", tradition: "siddhar",
    source_name: "Thirumantiram — Thirumoolar (7th century CE)",
    situation_tags: ["identity_confusion","spiritual_questioning","meaning_and_purpose","healing"],
    emotional_tags: ["seeking","wonder","confusion","longing"],
    arya_principle: "The body is not an obstacle to clarity. It is where clarity lives or does not live. What happens in the breath, the posture, the quality of sleep — these are not separate from the inner life. They are the inner life made physical. Paying attention to the body is paying attention to the most immediate form of the self.",
    arya_story_seed: "A researcher who spent years studying consciousness through philosophy and one afternoon noticed that every insight he had ever had came through the body first — a shift in breathing, a relaxing of the shoulders — before the thought appeared. He changed what he was studying.",
    rasa: "adbhuta", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "healing", tradition: "siddhar",
    source_name: "Thirumantiram — on Vasi yoga",
    situation_tags: ["anxiety_and_fear","feeling_overwhelmed","burnout","wanting_to_change"],
    emotional_tags: ["anxiety","fear","overwhelmed","confusion"],
    arya_principle: "The breath is the one thing always present and always responsive. Not as a spiritual practice — as a fact of physiology. The state of the breath reflects the state of the nervous system, and the state of the nervous system can be changed through the breath. This is not ancient mysticism. It is the most practical tool available, always, without equipment.",
    arya_story_seed: "A surgeon who developed a technique he shared with all his residents: two minutes of deliberate breathing before every procedure. He said it was the single most effective intervention he had ever introduced, and the most consistently ignored.",
    rasa: "shanta", guna_relevance: ["rajas","tamas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "philosophy", tradition: "siddhar",
    source_name: "Pambatti Siddhar — Tamil Siddhar tradition",
    situation_tags: ["identity_confusion","anxiety_and_fear","self_doubt","seeking_clarity"],
    emotional_tags: ["confusion","seeking","anxiety","wonder"],
    arya_principle: "There is something in you that is watching what you are going through right now — the part that notices the confusion, feels the anxiety, registers the grief — without being entirely consumed by it. That observer is not separate from you. But recognizing its presence, even briefly, changes the relationship with what is being observed.",
    arya_story_seed: "A man in the middle of the worst week of his life who noticed, briefly, that somewhere in him something was watching the worst week of his life without being broken by it. He said that noticing it was the first thing that had helped.",
    rasa: "shanta", guna_relevance: ["tamas","rajas"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // NATH TRADITION
  // ════════════════════════════════════════════════════════════

  {
    domain: "philosophy", tradition: "nath",
    source_name: "Gorakh Bani — Gorakhnath (10th-11th century CE)",
    situation_tags: ["spiritual_questioning","seeking_clarity","meaning_and_purpose","identity_confusion"],
    emotional_tags: ["seeking","wonder","confusion","longing"],
    arya_principle: "Everything being searched for outside is already inside. Not as a metaphor. As something that can actually be found. The difficulty is that outside searching is louder and more immediately rewarding, so people do it for decades before they understand why it keeps not working.",
    arya_story_seed: "A man who travelled to four countries looking for the teacher who would give him what he needed and found it in a conversation with his own father on a Tuesday afternoon in his hometown that he had been in a hurry to leave for twenty years.",
    rasa: "adbhuta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "philosophy", tradition: "nath",
    source_name: "Gorakh Bani — on sahaja (the natural state)",
    situation_tags: ["wanting_to_change","spiritual_questioning","burnout","meaning_and_purpose"],
    emotional_tags: ["seeking","confusion","emptiness","wonder"],
    arya_principle: "The natural state is not something to achieve. It is something to stop preventing. What blocks it is mostly the accumulated effort of trying to be something other than what one already is — performing, managing, presenting. When that effort stops, even briefly, something simpler and steadier appears. It was always there.",
    arya_story_seed: "A therapist who said the most consistent thing she noticed in people who made real progress was not the addition of new practices. It was the removal of something — a particular kind of effort they had been making for years that turned out to be working against them.",
    rasa: "shanta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "philosophy", tradition: "nath",
    source_name: "Nath Tradition — democratic transformation",
    situation_tags: ["self_doubt","identity_confusion","wanting_to_change","comparison_trap"],
    emotional_tags: ["self_doubt","confusion","seeking","hope"],
    arya_principle: "Transformation does not require the right background, the right education, the right social position, or the right teachers. It requires sincerity and sustained attention. The only real qualification is genuine intention.",
    arya_story_seed: "A woman who came to a learning program with the least formal education in the room and finished with the clearest understanding of the material. The facilitator said afterward: she listened in a way the others had forgotten how to.",
    rasa: "vira", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // BAUL TRADITION — BENGAL
  // ════════════════════════════════════════════════════════════

  {
    domain: "devotional", tradition: "baul",
    source_name: "Lalon Shah — Moner Manush (19th century CE)",
    situation_tags: ["spiritual_questioning","identity_confusion","meaning_and_purpose","seeking_clarity"],
    emotional_tags: ["longing","seeking","wonder","confusion"],
    arya_principle: "There is something inside that cannot be found by looking outside. Not because it is hidden. Because the searching is happening in the wrong direction. The moment the direction reverses — the moment attention turns inward with the same energy usually pointed outward — what was being searched for becomes obvious.",
    arya_story_seed: "A philosopher who spent fifteen years writing about the self and who said in a late interview: all the answers I was looking for were things I was experiencing the whole time. I just was not paying attention to the experience. I was too busy analyzing it.",
    rasa: "adbhuta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "baul",
    source_name: "Lalon Shah — on religion and direct experience",
    situation_tags: ["spiritual_questioning","moral_confusion","identity_confusion","religious_doubt"],
    emotional_tags: ["doubt","confusion","seeking","anger"],
    arya_principle: "The institution is not the same as the thing the institution points toward. This is true of every institution — religious, professional, social. The map is not the territory. Someone who confuses loyalty to the institution with loyalty to what it was supposed to serve has made a mistake that is very hard to see from inside.",
    arya_story_seed: "A doctor who spent a long time being loyal to a hospital system she believed in, and a longer time understanding that the system and the values she had joined it for had quietly diverged, and the hardest moment was seeing which one she actually served.",
    rasa: "shanta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "baul",
    source_name: "Baul Tradition — deha sadhana (body practice)",
    situation_tags: ["identity_confusion","healing","burnout","meaning_and_purpose"],
    emotional_tags: ["confusion","emptiness","seeking","grief"],
    arya_principle: "The Bauls refused to look for the sacred anywhere except in the living human body — in breath, in love, in the ordinary experience of being alive. Not as theology. As immediate experience. The question they kept returning to: what is happening right now, in this body, in this breath? That question has a quality that most larger questions do not.",
    arya_story_seed: "A meditation teacher who said the most useful instruction she ever received was also the simplest: feel your feet on the floor. Not as a technique. As an invitation back into the only moment that is actually happening.",
    rasa: "shanta", guna_relevance: ["tamas","rajas"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // LALLESHWARI — KASHMIR (14th century CE)
  // ════════════════════════════════════════════════════════════

  {
    domain: "devotional", tradition: "kashmiri_shaivite",
    source_name: "Lalleshwari — Vakhs (14th century CE)",
    situation_tags: ["wanting_to_change","spiritual_questioning","meaning_and_purpose","burnout"],
    emotional_tags: ["exhaustion","seeking","confusion","hope"],
    arya_principle: "There is the effort you make — showing up, doing the work, maintaining the practice — and there is something that meets the effort when it is genuine. The meeting cannot be forced. But it does not happen without the effort either. Both are real. Neither alone is enough.",
    arya_story_seed: "A writer who worked on the same book for six years without breakthrough and then one morning wrote the entire final chapter in three hours without knowing where it came from. She said: the six years were not wasted. They were the condition for the three hours.",
    rasa: "adbhuta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "kashmiri_shaivite",
    source_name: "Lalleshwari — Vakhs — on difficulty and finding",
    situation_tags: ["grief_and_loss","resilience","meaning_and_purpose","spiritual_questioning"],
    emotional_tags: ["grief","hope","seeking","courage"],
    arya_principle: "The difficulty is real. It scratches, it costs, it leaves marks. And then you find what you were actually looking for, and you understand that the path through the thorns was not a mistake or a detour. It was the only way there was. This is only visible from the other side. During the thorns, it just hurts.",
    arya_story_seed: "A woman who lost her mother at forty-two and said three years later: I am not grateful for the loss. But I am a different person because of it, and some of what is different is genuinely better, and I could not have gotten here any other way.",
    rasa: "karuna", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "kashmiri_shaivite",
    source_name: "Lalleshwari — Vakhs — on the essential self",
    situation_tags: ["identity_confusion","grief_and_loss","failure","mortality_awareness"],
    emotional_tags: ["grief","confusion","emptiness","seeking"],
    arya_principle: "Strip away the role, the reputation, the relationship, the achievement. What remains? This is not a morbid question. It is the most practical one. Because what remains is what you actually have, what is actually stable, what no circumstance can take. Most people do not know what it is because they have never had to find out.",
    arya_story_seed: "A man who lost his job, his marriage, and his sense of direction in the same year and said eighteen months later: I know myself much more clearly now than I did before any of that happened. I am not saying I would choose it. I am saying I am not the same person, and the new person is more real.",
    rasa: "shanta", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // AKKA MAHADEVI — KARNATAKA (12th century CE)
  // ════════════════════════════════════════════════════════════

  {
    domain: "devotional", tradition: "veerashaiva",
    source_name: "Akka Mahadevi — Vachanas (12th century CE)",
    situation_tags: ["life_direction","duty_vs_desire","identity_confusion","social_pressure"],
    emotional_tags: ["confusion","courage","longing","grief"],
    arya_principle: "There is a moment when you understand that staying is not loyalty — it is simply not being able to leave. And that leaving is not abandonment — it is finally being honest. Telling the difference between these two is one of the hardest things. But the body usually knows before the mind does.",
    arya_story_seed: "A woman who stayed in a role at a company for four years past the moment she knew it was over, because leaving felt disloyal. When she finally left, three people told her they had been waiting for her to go so they could follow.",
    rasa: "vira", guna_relevance: ["tamas","rajas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "veerashaiva",
    source_name: "Akka Mahadevi — Vachanas — on honest living",
    situation_tags: ["meaning_and_purpose","comparison_trap","identity_confusion","social_pressure"],
    emotional_tags: ["emptiness","confusion","seeking","courage"],
    arya_principle: "The life that looks right from outside and feels wrong from inside is not a small problem. It is the central problem. And the people who solve it are not the ones who redecorate the outside. They are the ones who get quiet enough to hear what the inside has been trying to say.",
    arya_story_seed: "A successful professional who had everything the list said to want and who said one evening: I do not know why I feel this way. Nothing is wrong. And then spent three months discovering that the absence of visible problems is not the same as the presence of a life.",
    rasa: "shanta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "veerashaiva",
    source_name: "Akka Mahadevi — Vachanas — on unconditional love",
    situation_tags: ["relationship_decision","romantic_struggle","loneliness","meaning_and_purpose"],
    emotional_tags: ["longing","love","grief","courage"],
    arya_principle: "Love that calculates — that keeps score, that monitors fairness, that asks what it is getting — is not the most alive version of itself. It is love in management mode. The most alive version asks nothing. It is not naive. It is simply complete in itself, not dependent on response to justify its existence.",
    arya_story_seed: "A nurse who cared for a patient for three months who never thanked her, never acknowledged her, and left without a word. She said afterward: I gave what I gave. Whether he received it was his part. My part was mine.",
    rasa: "shringara", guna_relevance: ["sattva","mixed"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // ALVAR TRADITION — TAMIL VAISHNAVA
  // ════════════════════════════════════════════════════════════

  {
    domain: "devotional", tradition: "alvar",
    source_name: "Andal — Tiruppavai (8th century CE)",
    situation_tags: ["spiritual_questioning","longing","meaning_and_purpose","seeking_clarity"],
    emotional_tags: ["longing","love","seeking","devotion"],
    arya_principle: "Concentrated longing — wanting something with full attention, without dividing the wanting between many objects — has a quality that diffuse wanting does not. The person who wants many things slightly will get some of them. The person who wants one thing completely changes because of the wanting itself, regardless of the outcome.",
    arya_story_seed: "A musician who spent fifteen years wanting to be successful and three years wanting only to play well — and found that the second three years were the first time she had genuinely improved.",
    rasa: "shringara", guna_relevance: ["rajas","sattva"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "alvar",
    source_name: "Nammalvar — Thiruvaimozhi (9th century CE)",
    situation_tags: ["meaning_and_purpose","burnout","grief_and_loss","spiritual_questioning"],
    emotional_tags: ["emptiness","seeking","wonder","grief"],
    arya_principle: "The sacred does not live in special places visited on special occasions. It lives in the quality of attention brought to whatever is in front of you. This is both a comfort and a challenge — a comfort because it is always available, a challenge because it requires the most ordinary and difficult thing: full presence to what is actually here.",
    arya_story_seed: "A pediatrician who said the most sacred moments of her career were not the dramatic rescues but the ordinary check-ups where a child looked at her with complete trust, and she was completely there.",
    rasa: "shanta", guna_relevance: ["tamas","rajas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "alvar",
    source_name: "Thirumangai Alvar — Mangalasasanam",
    situation_tags: ["wanting_to_change","spiritual_questioning","burnout","procrastination"],
    emotional_tags: ["emptiness","confusion","grief","seeking"],
    arya_principle: "The practice during the dry periods — when nothing seems to be working, when there is no feeling of progress, when showing up feels mechanical — is not less valuable than the practice during the alive periods. It is often more so. The muscle being built in the dry periods is the one that matters most.",
    arya_story_seed: "A doctor who meditated every morning for three years, feeling nothing for most of it, and who said: I kept going not because it was working but because stopping felt like a betrayal of something I had decided. And then one morning it was different, and I understood what the three years had been for.",
    rasa: "vira", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // NAYANAR TRADITION — TAMIL SHAIVA
  // ════════════════════════════════════════════════════════════

  {
    domain: "devotional", tradition: "nayanar",
    source_name: "Manikkavacagar — Tiruvachakam (9th century CE)",
    situation_tags: ["ego","identity_confusion","spiritual_questioning","wanting_to_change"],
    emotional_tags: ["wonder","awe","seeking","grief"],
    arya_principle: "The moment when the self that was being carefully maintained — the image, the reputation, the story — is cracked open by something larger is terrifying and liberating in equal measure. The terror is real. So is what comes after it. It looks like loss from inside. From outside, much later, it looks like the beginning of something.",
    arya_story_seed: "A senior administrator who had a public failure that destroyed the reputation he had spent twenty years building, and who said five years later: I am more useful now, and more honest, and I could not have gotten here without going through that.",
    rasa: "adbhuta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "nayanar",
    source_name: "Appar (Tirunavukkarasar) — Thevaram (7th century CE)",
    situation_tags: ["resilience","failure","wanting_to_change","grief_and_loss","spiritual_questioning"],
    emotional_tags: ["grief","courage","determination","seeking"],
    arya_principle: "The continuity of effort in the face of repeated difficulty is not stubbornness — it is the clearest sign that the thing being pursued is genuinely valued. Continuing even when it costs everything. Not because the cost is not felt. Because stopping is not an option that can be taken seriously.",
    arya_story_seed: "A scientist who had her major paper rejected four times and who, on the fifth submission, had refined it to something she privately believed was the best work of her life. The rejections had not stopped her. They had improved the work.",
    rasa: "vira", guna_relevance: ["tamas","rajas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "devotional", tradition: "nayanar",
    source_name: "Karaikkal Ammaiyar — earliest Tamil woman poet (6th century CE)",
    situation_tags: ["grief_and_loss","identity_confusion","spiritual_questioning","mortality_awareness"],
    emotional_tags: ["grief","wonder","awe","courage"],
    arya_principle: "There is a form of surrender that is not defeat — it is the complete releasing of the grip on how things should be, and the full receiving of how they are. This is not passive. It requires more presence than resistance does. And from it sometimes comes a kind of freedom that resistance never produces.",
    arya_story_seed: "A palliative care patient who stopped fighting her diagnosis on a Thursday afternoon and said to the nurse: I do not know why, but I feel more myself right now than I have in months. The nurse said it was the most peaceful room she had sat in that year.",
    rasa: "shanta", guna_relevance: ["tamas","mixed"], confidence_level: "high", reviewed: false,
  },

  // ════════════════════════════════════════════════════════════
  // EMBODIED KNOWLEDGE TRADITIONS
  // ════════════════════════════════════════════════════════════

  {
    domain: "healing", tradition: "kalarippayattu",
    source_name: "Kalarippayattu — Kerala embodied tradition",
    situation_tags: ["burnout","anxiety_and_fear","wanting_to_change","feeling_overwhelmed","identity_confusion"],
    emotional_tags: ["anxiety","confusion","scattered","seeking"],
    arya_principle: "Everything begins with knowing where your own body is in space — the weight distribution, the breath, the points of tension held without awareness. Most people move through life with very little of this information available. When it becomes available, decision-making, communication, and performance all change. The body is not just the vehicle. It is the instrument.",
    arya_story_seed: "A hospital administrator who took up a physical practice at forty-five not for fitness but because a colleague suggested it. He said six months later: I make better decisions now. Not because I exercised. Because I started paying attention to a part of my experience I had been ignoring for twenty years.",
    rasa: "vira", guna_relevance: ["tamas","rajas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "philosophy", tradition: "craft",
    source_name: "Indian craft tradition — embodied knowledge transmission",
    situation_tags: ["learning_struggle","wanting_to_change","ambition_and_purpose","patience"],
    emotional_tags: ["frustration","confusion","seeking","anxiety"],
    arya_principle: "Some things cannot be learned by reading about them. They can only be learned by doing them, slowly, with full attention, under the guidance of someone who has already done them for a long time. The frustration of being a beginner is not a problem to be solved. It is the substance of the learning itself.",
    arya_story_seed: "A young surgeon in her first year who complained to her senior about how long it was taking to develop feel in her hands. He said: that is not taking long. That is exactly how long it takes. Come back in five years and we will discuss it again.",
    rasa: "shanta", guna_relevance: ["rajas","tamas"], confidence_level: "high", reviewed: false,
  },

  {
    domain: "philosophy", tradition: "folk",
    source_name: "Indian agricultural folk wisdom — timing and patience",
    situation_tags: ["ambition_and_purpose","procrastination","anxiety_and_fear","business_decision"],
    emotional_tags: ["anxiety","impatience","confusion","fear"],
    arya_principle: "Every action has a season when it is right and a season when it is not. The person who plants in drought wastes the seed. The person who waits for the perfect season wastes the year. Reading conditions — what is actually happening now, not what should be happening — is the most practical skill in any domain.",
    arya_story_seed: "An entrepreneur who had the right product but launched it twice at the wrong time and once at the right time. She said the third launch was not better. She was simply paying attention to something she had ignored before: whether the ground was ready, not just whether she was.",
    rasa: "shanta", guna_relevance: ["rajas","mixed"], confidence_level: "high", reviewed: false,
  },

];

// ── SEED ─────────────────────────────────────────────────────

async function seed() {
  console.log(`\n📚 Seeding ${SEEDS.length} Living Traditions wisdom entries...`);
  console.log("   NOTE: All seeded with reviewed=false — need expert review before going live.\n");
  let inserted = 0, skipped = 0;

  for (const s of SEEDS) {
    const exists = await pool.query(
      "SELECT id FROM arya_knowledge WHERE source_name = $1 LIMIT 1",
      [s.source_name],
    );
    if (exists.rows.length > 0) {
      console.log(`  SKIP: ${s.source_name}`);
      skipped++;
      continue;
    }

    await pool.query(`
      INSERT INTO arya_knowledge (
        tenant_id, domain, topic, content, tags, source_type, source_title, status,
        situation_tags, emotional_tags, arya_principle, arya_story_seed,
        rasa, guna_relevance, confidence_level, reviewed, tradition, source_name
      ) VALUES (
        'varah', $1, $2, $3, $4, 'text', $5, 'published',
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )`,
      [
        mapDomain(s.domain),
        s.source_name,
        s.arya_principle,
        s.situation_tags,
        s.source_name,
        s.situation_tags,
        s.emotional_tags,
        s.arya_principle,
        s.arya_story_seed || null,
        s.rasa,
        s.guna_relevance,
        s.confidence_level,
        s.reviewed,
        s.tradition,
        s.source_name,
      ],
    );
    console.log(`  ✓ ${s.source_name}`);
    inserted++;
  }

  console.log(`\n✅ Done. Inserted: ${inserted}  Skipped: ${skipped}\n`);
  await showUnreviewed();
}

// ── TRANSLATE ────────────────────────────────────────────────

async function translate() {
  const traditions = ["sangam","siddhar","nath","baul","kashmiri_shaivite","veerashaiva","alvar","nayanar","kalarippayattu","craft","folk"];
  const ph = traditions.map((_, i) => `$${i + 1}`).join(",");
  const res = await pool.query(
    `SELECT id, arya_principle, language_variants, source_name
     FROM arya_knowledge
     WHERE tradition IN (${ph})
       AND (language_variants IS NULL OR language_variants::text = '{}')
     ORDER BY source_name`,
    traditions,
  );

  if (!res.rows.length) { console.log("✅ All entries already have language_variants."); return; }
  console.log(`\n🌐 Translating ${res.rows.length} living traditions entries...\n`);

  const langs = ["hi","ta","te","ml","kn","bn","mr","gu","pa","or"];
  let done = 0, failed = 0;

  for (const row of res.rows) {
    process.stdout.write(`  ${String(row.source_name).slice(0,55).padEnd(57)}`);
    const variants = await batchTranslateWisdomEntry(row.arya_principle, langs);
    if (variants && Object.keys(variants).length >= 4) {
      await pool.query(
        "UPDATE arya_knowledge SET language_variants = $1 WHERE id = $2",
        [JSON.stringify(variants), row.id],
      );
      console.log("✓"); done++;
    } else {
      console.log("✗"); failed++;
    }
    await new Promise(r => setTimeout(r, 350));
  }
  console.log(`\n✅ Done. Translated: ${done}  Failed: ${failed}\n`);
}

// ── UNREVIEWED ───────────────────────────────────────────────

async function showUnreviewed() {
  const res = await pool.query(
    `SELECT id, tradition, source_name FROM arya_knowledge
     WHERE reviewed = false ORDER BY tradition, id`,
  );
  console.log(`\n🔍 Entries pending expert review (${res.rows.length} total):\n`);
  let prev = "";
  for (const r of res.rows) {
    if (r.tradition !== prev) { console.log(`\n  [${r.tradition}]`); prev = r.tradition; }
    console.log(`    id=${r.id}: ${r.source_name}`);
  }
  console.log(`\n  To mark reviewed after verification:`);
  console.log(`  UPDATE arya_knowledge SET reviewed = true WHERE id = <id>;\n`);
}

// ── RUN ──────────────────────────────────────────────────────

const cmd = process.argv[2];
(async () => {
  try {
    if (cmd === "translate") { await translate(); }
    else if (cmd === "unreviewed") { await showUnreviewed(); }
    else { await seed(); }
  } finally {
    await pool.end();
  }
})().catch(err => { console.error(err); process.exit(1); });
