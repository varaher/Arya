import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Target, CalendarDays, MessageSquare, Sun, Mic, Paperclip, Send, Plus, Check, Bell } from "lucide-react";

type LangCode =
  | "en" | "hi" | "sa" | "ta" | "bn" | "te" | "mr" | "kn" | "ml" | "gu" | "pa"
  | "ar" | "he" | "fr" | "es" | "de" | "ja" | "zh" | "ko" | "pt" | "ru" | "tr" | "id";

type Tab = "today" | "chat" | "goals" | "kaal";

interface LangMeta {
  code: LangCode;
  name: string;
  native: string;
  rtl?: boolean;
  flag: string;
}

interface Translations {
  nav_today: string;
  nav_chat: string;
  nav_goals: string;
  nav_kaal: string;
  greeting: string;
  greeting_sub: string;
  today_insight: string;
  today_mood_q: string;
  chat_placeholder: string;
  chat_user_msg: string;
  chat_arya_reply: string;
  goals_heading: string;
  goals_add: string;
  goal_1: string;
  goal_2: string;
  goal_3: string;
  goal_active: string;
  kaal_heading: string;
  kaal_item_1: string;
  kaal_item_2: string;
  kaal_item_3: string;
  kaal_reminder: string;
  arya_tagline: string;
}

const LANGS: LangMeta[] = [
  { code: "en", name: "English",    native: "English",           flag: "🇬🇧" },
  { code: "hi", name: "Hindi",      native: "हिन्दी",              flag: "🇮🇳" },
  { code: "sa", name: "Sanskrit",   native: "संस्कृतम्",            flag: "🕉️"  },
  { code: "ta", name: "Tamil",      native: "தமிழ்",               flag: "🇮🇳" },
  { code: "bn", name: "Bengali",    native: "বাংলা",               flag: "🇮🇳" },
  { code: "te", name: "Telugu",     native: "తెలుగు",              flag: "🇮🇳" },
  { code: "mr", name: "Marathi",    native: "मराठी",               flag: "🇮🇳" },
  { code: "kn", name: "Kannada",    native: "ಕನ್ನಡ",               flag: "🇮🇳" },
  { code: "ml", name: "Malayalam",  native: "മലയാളം",              flag: "🇮🇳" },
  { code: "ar", name: "Arabic",     native: "العربية",             flag: "🌙", rtl: true },
  { code: "he", name: "Hebrew",     native: "עברית",               flag: "✡️",  rtl: true },
  { code: "fr", name: "French",     native: "Français",            flag: "🇫🇷" },
  { code: "es", name: "Spanish",    native: "Español",             flag: "🇪🇸" },
  { code: "de", name: "German",     native: "Deutsch",             flag: "🇩🇪" },
  { code: "ja", name: "Japanese",   native: "日本語",               flag: "🇯🇵" },
  { code: "zh", name: "Chinese",    native: "中文",                 flag: "🇨🇳" },
  { code: "ko", name: "Korean",     native: "한국어",               flag: "🇰🇷" },
  { code: "pt", name: "Portuguese", native: "Português",           flag: "🇧🇷" },
  { code: "ru", name: "Russian",    native: "Русский",             flag: "🇷🇺" },
  { code: "tr", name: "Turkish",    native: "Türkçe",              flag: "🇹🇷" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia",    flag: "🇮🇩" },
];

const T: Record<LangCode, Translations> = {
  en: {
    nav_today: "Today", nav_chat: "Chat", nav_goals: "Goals", nav_kaal: "KAAL",
    greeting: "Good morning, Arjun", greeting_sub: "Here's your daily insight",
    today_insight: "You've been consistent for 7 days. That's not a streak — that's a habit forming. Keep going.",
    today_mood_q: "How are you feeling today?",
    chat_placeholder: "Ask ARYA anything…",
    chat_user_msg: "I'm really stressed about work and I don't know what to do.",
    chat_arya_reply: "Hey, first — take a breath. Work stress piles up fast. What's weighing on you most right now? Let's start there.",
    goals_heading: "Your Goals", goals_add: "Add new goal",
    goal_1: "Read 10 pages every day", goal_2: "30-minute morning walk", goal_3: "Finish the proposal by Friday",
    goal_active: "Active",
    kaal_heading: "Your Day", kaal_reminder: "Set a reminder",
    kaal_item_1: "Morning walk — 6:30 AM", kaal_item_2: "Team standup — 10:00 AM", kaal_item_3: "Deep work block — 2:00 PM",
    arya_tagline: "Your Personal Thinking & Growth Assistant",
  },
  hi: {
    nav_today: "आज", nav_chat: "बातचीत", nav_goals: "लक्ष्य", nav_kaal: "काल",
    greeting: "सुप्रभात, अर्जुन", greeting_sub: "आज की अंतर्दृष्टि",
    today_insight: "तुमने ७ दिन लगातार किया है। यह सिर्फ streak नहीं — एक आदत बन रही है। जारी रखो।",
    today_mood_q: "आज तुम कैसे महसूस कर रहे हो?",
    chat_placeholder: "ARYA से कुछ भी पूछो…",
    chat_user_msg: "मैं काम से बहुत परेशान हूं और समझ नहीं आ रहा क्या करूं।",
    chat_arya_reply: "यार, पहले एक गहरी सांस लो। काम का प्रेशर कभी-कभी बहुत भारी हो जाता है। बताओ, सबसे ज़्यादा क्या चुभ रहा है अभी?",
    goals_heading: "तुम्हारे लक्ष्य", goals_add: "नया लक्ष्य जोड़ो",
    goal_1: "हर रोज़ १० पन्ने पढ़ना", goal_2: "३० मिनट की सुबह की सैर", goal_3: "शुक्रवार तक proposal तैयार करना",
    goal_active: "सक्रिय",
    kaal_heading: "तुम्हारा दिन", kaal_reminder: "याद दिलाओ",
    kaal_item_1: "सुबह की सैर — सुबह ६:३०", kaal_item_2: "Team standup — सुबह १०:००", kaal_item_3: "Deep work — दोपहर २:००",
    arya_tagline: "तुम्हारा निजी सोच और विकास सहायक",
  },
  sa: {
    nav_today: "अद्य", nav_chat: "वार्तालापः", nav_goals: "लक्ष्याणि", nav_kaal: "कालः",
    greeting: "शुभ प्रभातम्, अर्जुन", greeting_sub: "अद्यतनी अन्तर्दृष्टिः",
    today_insight: "सप्त दिनानि अनवरतं प्रयासः। एषः केवलं क्रमः नास्ति — संस्कारः निर्मीयते। अग्रे गच्छ।",
    today_mood_q: "अद्य त्वं कथम् अनुभवसि?",
    chat_placeholder: "ARYA-म् किमपि पृच्छ…",
    chat_user_msg: "कार्येण अतीव खिन्नोऽस्मि, किं करणीयम् इति न जानामि।",
    chat_arya_reply: "मित्र, प्रथमं गभीरं श्वासं गृहाण। कार्यभारः कदाचित् अतीव गुरुः भवति। अधुना किं तव मनः पीडयति? तत्र आरभामहे।",
    goals_heading: "तव लक्ष्याणि", goals_add: "नवं लक्ष्यं योज्यताम्",
    goal_1: "प्रतिदिनं दश पृष्ठानि पठनम्", goal_2: "प्रातः त्रिंशत् निमेषाणां भ्रमणम्", goal_3: "शुक्रवासरे प्रस्तावः समापनीयः",
    goal_active: "सक्रियम्",
    kaal_heading: "तव दिनम्", kaal_reminder: "स्मारणम् योजय",
    kaal_item_1: "प्रातः भ्रमणम् — प्रातः ६:३०", kaal_item_2: "दलसंगमः — प्रातः १०:००", kaal_item_3: "गभीरकार्यम् — अपराह्णे २:००",
    arya_tagline: "तव निजी चिन्तन-विकास-सहायकः",
  },
  ta: {
    nav_today: "இன்று", nav_chat: "உரையாடல்", nav_goals: "இலக்குகள்", nav_kaal: "காலம்",
    greeting: "காலை வணக்கம், அர்ஜுன்", greeting_sub: "இன்றைய நுண்ணறிவு",
    today_insight: "நீ ௭ நாள் தொடர்ச்சியாக செய்தாய். இது ஒரு தொடரல்ல — ஒரு பழக்கம் உருவாகிறது. தொடர்ந்து செல்.",
    today_mood_q: "இன்று நீ எப்படி உணர்கிறாய்?",
    chat_placeholder: "ARYA-கிட்ட எதுவும் கேளு…",
    chat_user_msg: "வேலையில் மிகவும் மன அழுத்தம், என்ன செய்வதென்று தெரியவில்லை.",
    chat_arya_reply: "முதல்ல ஒரு நிமிஷம் மூச்சு எடு. வேலை பிரஷர் ரொம்ப கஷ்டமா இருக்கும். இப்போ என்னது அதிகமா கஷ்டமா இருக்கு? அதுல இருந்து ஆரம்பிக்கலாம்.",
    goals_heading: "உனது இலக்குகள்", goals_add: "புதிய இலக்கு சேர்",
    goal_1: "தினமும் ௧௦ பக்கங்கள் படிக்கவும்", goal_2: "௩௦ நிமிட காலை நடை", goal_3: "வெள்ளிக்கிழமைக்குள் முன்மொழிவை முடிக்க",
    goal_active: "செயலில்",
    kaal_heading: "உனது நாள்", kaal_reminder: "நினைவூட்டல் அமை",
    kaal_item_1: "காலை நடை — காலை ௬:௩௦", kaal_item_2: "குழு கூட்டம் — காலை ௧௦:௦௦", kaal_item_3: "ஆழமான பணி — பிற்பகல் ௨:௦௦",
    arya_tagline: "உனது தனிப்பட்ட சிந்தனை & வளர்ச்சி உதவியாளர்",
  },
  bn: {
    nav_today: "আজ", nav_chat: "কথোপকথন", nav_goals: "লক্ষ্য", nav_kaal: "কাল",
    greeting: "শুভ সকাল, অর্জুন", greeting_sub: "আজকের অন্তর্দৃষ্টি",
    today_insight: "তুমি ৭ দিন ধারাবাহিকভাবে করেছ। এটা শুধু streak নয় — একটা অভ্যাস গড়ে উঠছে। চালিয়ে যাও।",
    today_mood_q: "আজ তুমি কেমন অনুভব করছ?",
    chat_placeholder: "ARYA-কে যেকোনো কিছু জিজ্ঞেস করো…",
    chat_user_msg: "আমি কাজ নিয়ে খুব চাপে আছি, কী করব বুঝতে পারছি না।",
    chat_arya_reply: "আরে, আগে একটু শ্বাস নাও। কাজের চাপ অনেক সময় অনেক ভারী হয়। এখন সবচেয়ে বেশি কোন জিনিসটা কষ্ট দিচ্ছে? সেখান থেকে শুরু করি।",
    goals_heading: "তোমার লক্ষ্যগুলো", goals_add: "নতুন লক্ষ্য যোগ করো",
    goal_1: "প্রতিদিন ১০ পৃষ্ঠা পড়া", goal_2: "৩০ মিনিটের সকালের হাঁটা", goal_3: "শুক্রবারের মধ্যে প্রস্তাব শেষ করা",
    goal_active: "সক্রিয়",
    kaal_heading: "তোমার দিন", kaal_reminder: "মনে করিয়ে দাও",
    kaal_item_1: "সকালের হাঁটা — সকাল ৬:৩০", kaal_item_2: "Team standup — সকাল ১০:০০", kaal_item_3: "Deep work — বিকেল ২:০০",
    arya_tagline: "তোমার ব্যক্তিগত চিন্তা ও বৃদ্ধির সহায়ক",
  },
  te: {
    nav_today: "నేడు", nav_chat: "సంభాషణ", nav_goals: "లక్ష్యాలు", nav_kaal: "కాలం",
    greeting: "శుభోదయం, అర్జున్", greeting_sub: "నేటి అంతర్దృష్టి",
    today_insight: "నువ్వు ७ రోజులు నిరంతరంగా చేశావు. ఇది కేవలం streak కాదు — అలవాటు తయారవుతోంది. కొనసాగించు.",
    today_mood_q: "నేడు నువ్వు ఎలా అనిపిస్తున్నావు?",
    chat_placeholder: "ARYA ని ఏదైనా అడుగు…",
    chat_user_msg: "పని విషయంలో చాలా ఒత్తిడిగా ఉంది, ఏం చేయాలో తెలీడం లేదు.",
    chat_arya_reply: "ముందు ఒక్క నిమిషం ఊపిరి తీసుకో. పని ఒత్తిడి చాలా భారంగా అనిపిస్తుంది. ఇప్పుడు ఏది ఎక్కువ ఇబ్బంది పెడ్తోంది? అక్కడ నుండి మొదలుపెడదాం.",
    goals_heading: "నీ లక్ష్యాలు", goals_add: "కొత్త లక్ష్యం చేర్చు",
    goal_1: "ప్రతిరోజూ 10 పేజీలు చదవడం", goal_2: "30 నిమిషాల ఉదయపు నడక", goal_3: "శుక్రవారంలోగా ప్రపోజల్ పూర్తి చేయడం",
    goal_active: "క్రియాశీలం",
    kaal_heading: "నీ రోజు", kaal_reminder: "రిమైండర్ సెట్ చేయి",
    kaal_item_1: "ఉదయపు నడక — ఉ. 6:30", kaal_item_2: "Team standup — ఉ. 10:00", kaal_item_3: "Deep work — మ. 2:00",
    arya_tagline: "నీ వ్యక్తిగత ఆలోచన & వృద్ధి సహాయకుడు",
  },
  mr: {
    nav_today: "आज", nav_chat: "संवाद", nav_goals: "ध्येय", nav_kaal: "काल",
    greeting: "शुभ सकाळ, अर्जुन", greeting_sub: "आजची अंतर्दृष्टी",
    today_insight: "तू ७ दिवस सलग केलेस. हे फक्त streak नाही — एक सवय तयार होतेय. पुढे जात राहा.",
    today_mood_q: "आज तुला कसे वाटतेय?",
    chat_placeholder: "ARYA ला काहीही विचार…",
    chat_user_msg: "मला कामाचा खूप ताण आहे आणि काय करावं ते समजत नाहीये.",
    chat_arya_reply: "अरे, आधी एक दीर्घ श्वास घे. कामाचा ताण कधीकधी खूपच जड होतो. आत्ता सगळ्यात जास्त कशाचं दडपण येतंय? तिथून सुरुवात करूया.",
    goals_heading: "तुझी ध्येय", goals_add: "नवे ध्येय जोडा",
    goal_1: "दररोज १० पाने वाचणे", goal_2: "३० मिनिटांची सकाळची चाल", goal_3: "शुक्रवारपर्यंत प्रस्ताव तयार करणे",
    goal_active: "सक्रिय",
    kaal_heading: "तुझा दिवस", kaal_reminder: "आठवण कर",
    kaal_item_1: "सकाळची चाल — सकाळी ६:३०", kaal_item_2: "Team standup — सकाळी १०:००", kaal_item_3: "Deep work — दुपारी २:००",
    arya_tagline: "तुझा वैयक्तिक विचार आणि विकास सहाय्यक",
  },
  kn: {
    nav_today: "ಇಂದು", nav_chat: "ಮಾತುಕತೆ", nav_goals: "ಗುರಿಗಳು", nav_kaal: "ಕಾಲ",
    greeting: "ಶುಭ ಮುಂಜಾನೆ, ಅರ್ಜುನ್", greeting_sub: "ಇಂದಿನ ಒಳನೋಟ",
    today_insight: "ನೀನು ೭ ದಿನ ನಿರಂತರವಾಗಿ ಮಾಡಿದ್ದೀಯ. ಇದು ಕೇವಲ streak ಅಲ್ಲ — ಅಭ್ಯಾಸ ತಯಾರಾಗ್ತಿದೆ. ಮುಂದೆ ಹೋಗು.",
    today_mood_q: "ಇಂದು ನೀನು ಹೇಗೆ ಅನಿಸ್ತಿದ್ದೀಯ?",
    chat_placeholder: "ARYA ಗೆ ಏನಾದ್ರೂ ಕೇಳು…",
    chat_user_msg: "ಕೆಲಸದ ವಿಷಯದಲ್ಲಿ ತುಂಬಾ ಒತ್ತಡ ಇದೆ, ಏನು ಮಾಡಬೇಕೆಂದು ಗೊತ್ತಾಗ್ತಿಲ್ಲ.",
    chat_arya_reply: "ಮೊದಲು ಒಂದು ನಿಮಿಷ ಉಸಿರು ತೆಗೆದುಕೋ. ಕೆಲಸದ ಒತ್ತಡ ತುಂಬಾ ಭಾರವಾಗಿ ಅನ್ನಿಸುತ್ತೆ. ಈಗ ಏನು ಹೆಚ್ಚು ತೊಂದರೆ ಕೊಡ್ತಿದೆ? ಅಲ್ಲಿಂದ ಶುರು ಮಾಡೋಣ.",
    goals_heading: "ನಿನ್ನ ಗುರಿಗಳು", goals_add: "ಹೊಸ ಗುರಿ ಸೇರಿಸು",
    goal_1: "ಪ್ರತಿದಿನ ೧೦ ಪುಟ ಓದುವುದು", goal_2: "೩೦ ನಿಮಿಷ ಬೆಳಗ್ಗಿನ ನಡಿಗೆ", goal_3: "ಶುಕ್ರವಾರದೊಳಗೆ ಪ್ರಸ್ತಾವ ಮುಗಿಸುವುದು",
    goal_active: "ಸಕ್ರಿಯ",
    kaal_heading: "ನಿನ್ನ ದಿನ", kaal_reminder: "ನೆನಪು ಮಾಡು",
    kaal_item_1: "ಬೆಳಗ್ಗಿನ ನಡಿಗೆ — ಬೆ. ೬:೩೦", kaal_item_2: "Team standup — ಬೆ. ೧೦:೦೦", kaal_item_3: "Deep work — ಮ. ೨:೦೦",
    arya_tagline: "ನಿನ್ನ ವೈಯಕ್ತಿಕ ಚಿಂತನೆ & ಬೆಳವಣಿಗೆ ಸಹಾಯಕ",
  },
  ml: {
    nav_today: "ഇന്ന്", nav_chat: "സംഭാഷണം", nav_goals: "ലക്ഷ്യങ്ങൾ", nav_kaal: "കാലം",
    greeting: "ശുഭ പ്രഭാതം, അർജുൻ", greeting_sub: "ഇന്നത്തെ ഉൾക്കാഴ്ച",
    today_insight: "നീ ൭ ദിവസം തുടർച്ചയായി ചെയ്തു. ഇത് ഒരു streak മാത്രമല്ല — ഒരു ശീലം ഉണ്ടാകുന്നു. തുടരൂ.",
    today_mood_q: "ഇന്ന് നിനക്ക് എങ്ങനെ തോന്നുന്നു?",
    chat_placeholder: "ARYA-യോട് എന്തും ചോദിക്കൂ…",
    chat_user_msg: "ജോലിയുടെ കാര്യത്തിൽ വളരെ സ്ട്രസ്സ് ഉണ്ട്, എന്ത് ചെയ്യണമെന്ന് അറിയില്ല.",
    chat_arya_reply: "ആദ്യം ഒന്ന് ശ്വാസമെടുക്കൂ. ജോലിയുടെ സമ്മർദ്ദം ചിലപ്പോൾ വളരെ ഭാരമാകും. ഇപ്പോൾ ഏറ്റവും കൂടുതൽ ബുദ്ധിമുട്ടുന്നത് ഏതൊന്ന്? അവിടെ നിന്ന് തുടങ്ങാം.",
    goals_heading: "നിന്റെ ലക്ഷ്യങ്ങൾ", goals_add: "പുതിയ ലക്ഷ്യം ചേർക്കൂ",
    goal_1: "ദിവസവും ൧൦ പേജ് വായിക്കുക", goal_2: "൩൦ മിനിറ്റ് രാവിലത്തെ നടത്തം", goal_3: "വെള്ളിയാഴ്ചക്ക് മുമ്പ് പ്രൊപ്പോസൽ തീർക്കുക",
    goal_active: "സജീവം",
    kaal_heading: "നിന്റെ ദിവസം", kaal_reminder: "ഒർമ്മിപ്പിക്കൂ",
    kaal_item_1: "രാവിലത്തെ നടത്തം — രാ. ൬:൩൦", kaal_item_2: "Team standup — രാ. ൧൦:൦൦", kaal_item_3: "Deep work — ഉ. ൨:൦൦",
    arya_tagline: "നിന്റെ സ്വകാര്യ ചിന്ത & വളർച്ചാ സഹായി",
  },
  ar: {
    nav_today: "اليوم", nav_chat: "الدردشة", nav_goals: "الأهداف", nav_kaal: "الوقت",
    greeting: "صباح الخير، أرجون", greeting_sub: "رؤيتك اليومية",
    today_insight: "أكملت ٧ أيام متتالية. هذا ليس مجرد streak — عادة تتشكّل. واصل.",
    today_mood_q: "كيف تشعر اليوم؟",
    chat_placeholder: "اسأل ARYA أي شيء…",
    chat_user_msg: "أنا تعبان جداً من الشغل ومش عارف أعمل إيه.",
    chat_arya_reply: "خد نفس الأول. ده طبيعي جداً — الشغل بيتقل أوي أحياناً. إيه اللي بيأكلك أكتر دلوقتي؟ قولي ونشوف مع بعض.",
    goals_heading: "أهدافك", goals_add: "أضف هدفاً جديداً",
    goal_1: "قراءة ١٠ صفحات يومياً", goal_2: "نزهة صباحية ٣٠ دقيقة", goal_3: "إنهاء المقترح قبل الجمعة",
    goal_active: "نشط",
    kaal_heading: "يومك", kaal_reminder: "ضع تذكيراً",
    kaal_item_1: "النزهة الصباحية — ٦:٣٠ ص", kaal_item_2: "اجتماع الفريق — ١٠:٠٠ ص", kaal_item_3: "العمل العميق — ٢:٠٠ م",
    arya_tagline: "مساعدك الشخصي للتفكير والنمو",
  },
  he: {
    nav_today: "היום", nav_chat: "צ'אט", nav_goals: "מטרות", nav_kaal: "זמן",
    greeting: "בוקר טוב, ארג'ון", greeting_sub: "תובנת היום שלך",
    today_insight: "השלמת ז' ימים ברצף. זה לא רק streak — הרגל מתגבש. המשך.",
    today_mood_q: "איך אתה מרגיש היום?",
    chat_placeholder: "שאל את ARYA כל דבר…",
    chat_user_msg: "אני ממש בלחץ מהעבודה ולא יודע מה לעשות.",
    chat_arya_reply: "היי, קודם כל — תנשום. לחץ בעבודה מצטבר מהר. מה הכי כובד עליך עכשיו? נתחיל משם.",
    goals_heading: "המטרות שלך", goals_add: "הוסף מטרה חדשה",
    goal_1: "לקרוא ١٠ עמודים ביום", goal_2: "הליכה של 30 דקות בבוקר", goal_3: "לסיים את ההצעה עד יום שישי",
    goal_active: "פעיל",
    kaal_heading: "היום שלך", kaal_reminder: "הגדר תזכורת",
    kaal_item_1: "הליכת בוקר — 6:30", kaal_item_2: "פגישת צוות — 10:00", kaal_item_3: "עבודה מעמיקה — 14:00",
    arya_tagline: "העוזר האישי שלך לחשיבה וצמיחה",
  },
  fr: {
    nav_today: "Aujourd'hui", nav_chat: "Chat", nav_goals: "Objectifs", nav_kaal: "Temps",
    greeting: "Bonjour, Arjun", greeting_sub: "Ta pensée du jour",
    today_insight: "Tu tiens le coup depuis 7 jours. C'est pas juste un streak — c'est une habitude qui se forme. Continue.",
    today_mood_q: "Comment tu te sens aujourd'hui ?",
    chat_placeholder: "Demande n'importe quoi à ARYA…",
    chat_user_msg: "Je suis vraiment stressé par le travail, je sais plus quoi faire.",
    chat_arya_reply: "Hey, respire un coup d'abord. Le stress au boulot s'accumule vite. C'est quoi la chose qui te pèse le plus là ? On commence par là.",
    goals_heading: "Tes objectifs", goals_add: "Ajouter un objectif",
    goal_1: "Lire 10 pages chaque jour", goal_2: "Marche matinale de 30 minutes", goal_3: "Finir la proposition avant vendredi",
    goal_active: "Actif",
    kaal_heading: "Ta journée", kaal_reminder: "Créer un rappel",
    kaal_item_1: "Marche matinale — 6h30", kaal_item_2: "Réunion d'équipe — 10h00", kaal_item_3: "Travail profond — 14h00",
    arya_tagline: "Ton assistant personnel de réflexion et de croissance",
  },
  es: {
    nav_today: "Hoy", nav_chat: "Chat", nav_goals: "Metas", nav_kaal: "Tiempo",
    greeting: "Buenos días, Arjun", greeting_sub: "Tu insight del día",
    today_insight: "Llevas 7 días seguidos. Esto no es solo una racha — es un hábito formándose. Sigue.",
    today_mood_q: "¿Cómo te sientes hoy?",
    chat_placeholder: "Pregúntale cualquier cosa a ARYA…",
    chat_user_msg: "Estoy muy estresado con el trabajo y no sé qué hacer.",
    chat_arya_reply: "Hey, respira primero. El estrés del trabajo se amontona rápido. ¿Qué te está pesando más ahora mismo? Empecemos por ahí.",
    goals_heading: "Tus metas", goals_add: "Agregar meta",
    goal_1: "Leer 10 páginas cada día", goal_2: "Caminata matutina de 30 minutos", goal_3: "Terminar la propuesta antes del viernes",
    goal_active: "Activa",
    kaal_heading: "Tu día", kaal_reminder: "Crear recordatorio",
    kaal_item_1: "Caminata matutina — 6:30", kaal_item_2: "Reunión de equipo — 10:00", kaal_item_3: "Trabajo profundo — 14:00",
    arya_tagline: "Tu asistente personal de pensamiento y crecimiento",
  },
  de: {
    nav_today: "Heute", nav_chat: "Chat", nav_goals: "Ziele", nav_kaal: "Zeit",
    greeting: "Guten Morgen, Arjun", greeting_sub: "Dein heutiger Gedanke",
    today_insight: "Du bist seit 7 Tagen dabei. Das ist kein Streak — das ist eine Gewohnheit, die sich bildet. Weiter so.",
    today_mood_q: "Wie fühlst du dich heute?",
    chat_placeholder: "Frag ARYA alles…",
    chat_user_msg: "Ich bin wirklich gestresst mit der Arbeit und weiß nicht mehr weiter.",
    chat_arya_reply: "Hey, erstmal tief durchatmen. Arbeitsstress baut sich schnell auf. Was drückt dich gerade am meisten? Fangen wir da an.",
    goals_heading: "Deine Ziele", goals_add: "Neues Ziel",
    goal_1: "Jeden Tag 10 Seiten lesen", goal_2: "30 Minuten Morgenlauf", goal_3: "Vorschlag bis Freitag fertigstellen",
    goal_active: "Aktiv",
    kaal_heading: "Dein Tag", kaal_reminder: "Erinnerung setzen",
    kaal_item_1: "Morgenspaziergang — 6:30", kaal_item_2: "Team-Meeting — 10:00", kaal_item_3: "Tiefe Arbeit — 14:00",
    arya_tagline: "Dein persönlicher Denk- und Wachstumsbegleiter",
  },
  ja: {
    nav_today: "今日", nav_chat: "チャット", nav_goals: "目標", nav_kaal: "時間",
    greeting: "おはようございます、アルジュン", greeting_sub: "今日のインサイト",
    today_insight: "7日間続けています。ただのstreakじゃない — 習慣が形成されています。続けましょう。",
    today_mood_q: "今日の気分はいかがですか？",
    chat_placeholder: "ARYAに何でも聞いてください…",
    chat_user_msg: "仕事のことで本当にストレスがたまっていて、どうしたらいいかわかりません。",
    chat_arya_reply: "まず深呼吸してみてください。仕事のプレッシャーって積み重なると本当につらいですよね。今一番気になってることは何ですか？そこから一緒に考えましょう。",
    goals_heading: "あなたの目標", goals_add: "新しい目標を追加",
    goal_1: "毎日10ページ読む", goal_2: "30分の朝の散歩", goal_3: "金曜日までに提案書を完成させる",
    goal_active: "進行中",
    kaal_heading: "今日の予定", kaal_reminder: "リマインダーを設定",
    kaal_item_1: "朝の散歩 — 6:30", kaal_item_2: "チームミーティング — 10:00", kaal_item_3: "集中作業 — 14:00",
    arya_tagline: "あなたの個人的な思考と成長のアシスタント",
  },
  zh: {
    nav_today: "今天", nav_chat: "聊天", nav_goals: "目标", nav_kaal: "时间",
    greeting: "早上好，阿尔琼", greeting_sub: "今日洞见",
    today_insight: "你已经坚持了7天。这不只是一个streak——习惯正在形成。继续吧。",
    today_mood_q: "今天你感觉怎么样？",
    chat_placeholder: "问ARYA任何问题…",
    chat_user_msg: "我真的很有工作压力，不知道怎么办。",
    chat_arya_reply: "先深呼吸一下。工作压力积累起来确实很重，这很正常。现在最让你烦恼的是什么？我们从那里开始聊。",
    goals_heading: "你的目标", goals_add: "添加新目标",
    goal_1: "每天读10页书", goal_2: "30分钟晨间散步", goal_3: "周五前完成提案",
    goal_active: "进行中",
    kaal_heading: "今天的日程", kaal_reminder: "设置提醒",
    kaal_item_1: "晨间散步 — 6:30", kaal_item_2: "团队会议 — 10:00", kaal_item_3: "深度工作 — 14:00",
    arya_tagline: "你的个人思考与成长助手",
  },
  ko: {
    nav_today: "오늘", nav_chat: "채팅", nav_goals: "목표", nav_kaal: "시간",
    greeting: "좋은 아침이에요, 아르준", greeting_sub: "오늘의 인사이트",
    today_insight: "7일 연속으로 해냈어요. 단순한 streak이 아니에요 — 습관이 만들어지고 있어요. 계속 해봐요.",
    today_mood_q: "오늘 어떤 기분이에요?",
    chat_placeholder: "ARYA에게 뭐든 물어보세요…",
    chat_user_msg: "일 때문에 정말 스트레스를 많이 받고 있는데 어떻게 해야 할지 모르겠어요.",
    chat_arya_reply: "일단 숨 한번 크게 쉬어요. 일 스트레스는 빠르게 쌓이거든요. 지금 제일 무겁게 느껴지는 게 뭐예요? 거기서부터 같이 생각해봐요.",
    goals_heading: "목표 목록", goals_add: "새 목표 추가",
    goal_1: "매일 10페이지 읽기", goal_2: "30분 아침 산책", goal_3: "금요일까지 제안서 완성하기",
    goal_active: "진행 중",
    kaal_heading: "오늘 일정", kaal_reminder: "알림 설정",
    kaal_item_1: "아침 산책 — 오전 6:30", kaal_item_2: "팀 미팅 — 오전 10:00", kaal_item_3: "집중 작업 — 오후 2:00",
    arya_tagline: "나만의 사고 & 성장 어시스턴트",
  },
  pt: {
    nav_today: "Hoje", nav_chat: "Chat", nav_goals: "Metas", nav_kaal: "Tempo",
    greeting: "Bom dia, Arjun", greeting_sub: "Seu insight de hoje",
    today_insight: "Você manteve consistência por 7 dias. Isso não é só uma sequência — é um hábito se formando. Continue.",
    today_mood_q: "Como você está se sentindo hoje?",
    chat_placeholder: "Pergunta qualquer coisa pra ARYA…",
    chat_user_msg: "Estou muito estressado com o trabalho e não sei o que fazer.",
    chat_arya_reply: "Ei, primeiro respira. O estresse do trabalho acumula rápido. O que está pesando mais pra você agora? A gente começa por aí.",
    goals_heading: "Suas metas", goals_add: "Adicionar meta",
    goal_1: "Ler 10 páginas por dia", goal_2: "Caminhada matinal de 30 minutos", goal_3: "Terminar a proposta até sexta",
    goal_active: "Ativa",
    kaal_heading: "Seu dia", kaal_reminder: "Criar lembrete",
    kaal_item_1: "Caminhada matinal — 6:30", kaal_item_2: "Reunião do time — 10:00", kaal_item_3: "Trabalho focado — 14:00",
    arya_tagline: "Seu assistente pessoal de pensamento e crescimento",
  },
  ru: {
    nav_today: "Сегодня", nav_chat: "Чат", nav_goals: "Цели", nav_kaal: "Время",
    greeting: "Доброе утро, Арджун", greeting_sub: "Твоя мысль дня",
    today_insight: "Ты держишься уже 7 дней. Это не просто серия — привычка формируется. Продолжай.",
    today_mood_q: "Как ты себя чувствуешь сегодня?",
    chat_placeholder: "Спроси ARYA что угодно…",
    chat_user_msg: "У меня огромный стресс из-за работы, не знаю что делать.",
    chat_arya_reply: "Эй, сначала просто глубоко вдохни. Рабочий стресс накапливается быстро. Что сейчас давит сильнее всего? Начнём с этого.",
    goals_heading: "Твои цели", goals_add: "Добавить цель",
    goal_1: "Читать 10 страниц каждый день", goal_2: "Утренняя прогулка 30 минут", goal_3: "Закончить предложение к пятнице",
    goal_active: "Активна",
    kaal_heading: "Твой день", kaal_reminder: "Поставить напоминание",
    kaal_item_1: "Утренняя прогулка — 6:30", kaal_item_2: "Встреча команды — 10:00", kaal_item_3: "Глубокая работа — 14:00",
    arya_tagline: "Твой личный помощник для мышления и роста",
  },
  tr: {
    nav_today: "Bugün", nav_chat: "Sohbet", nav_goals: "Hedefler", nav_kaal: "Zaman",
    greeting: "Günaydın, Arjun", greeting_sub: "Günün içgörüsü",
    today_insight: "7 gün boyunca tutarlı oldun. Bu sadece bir seri değil — bir alışkanlık oluşuyor. Devam et.",
    today_mood_q: "Bugün nasıl hissediyorsun?",
    chat_placeholder: "ARYA'ya her şeyi sor…",
    chat_user_msg: "İşten çok bunaldım, ne yapacağımı bilmiyorum.",
    chat_arya_reply: "Önce derin bir nefes al. İş stresi hızla birikirken bunalmak çok normal. Şu an seni en çok ne zorlıyor? Oradan başlayalım.",
    goals_heading: "Hedeflerin", goals_add: "Yeni hedef ekle",
    goal_1: "Her gün 10 sayfa oku", goal_2: "30 dakika sabah yürüyüşü", goal_3: "Öneriyi Cuma'ya kadar bitir",
    goal_active: "Aktif",
    kaal_heading: "Günün", kaal_reminder: "Hatırlatıcı ayarla",
    kaal_item_1: "Sabah yürüyüşü — 6:30", kaal_item_2: "Ekip toplantısı — 10:00", kaal_item_3: "Derin çalışma — 14:00",
    arya_tagline: "Kişisel düşünce ve büyüme asistanın",
  },
  id: {
    nav_today: "Hari ini", nav_chat: "Chat", nav_goals: "Target", nav_kaal: "Waktu",
    greeting: "Selamat pagi, Arjun", greeting_sub: "Wawasan hari ini",
    today_insight: "Kamu konsisten selama 7 hari. Ini bukan sekadar streak — kebiasaan sedang terbentuk. Teruskan.",
    today_mood_q: "Gimana perasaan kamu hari ini?",
    chat_placeholder: "Tanya ARYA apa aja…",
    chat_user_msg: "Aku benar-benar stres soal kerjaan dan nggak tahu harus ngapain.",
    chat_arya_reply: "Hey, tarik napas dulu. Stres kerjaan bisa numpuk cepet. Sekarang hal apa yang paling berat? Kita mulai dari sana.",
    goals_heading: "Target kamu", goals_add: "Tambah target baru",
    goal_1: "Baca 10 halaman setiap hari", goal_2: "Jalan pagi 30 menit", goal_3: "Selesaikan proposal sebelum Jumat",
    goal_active: "Aktif",
    kaal_heading: "Jadwal hari ini", kaal_reminder: "Set pengingat",
    kaal_item_1: "Jalan pagi — 06:30", kaal_item_2: "Meeting tim — 10:00", kaal_item_3: "Kerja fokus — 14:00",
    arya_tagline: "Asisten berpikir dan tumbuh pribadimu",
  },
};

const GOALS_DATA = [
  { done: true },
  { done: false },
  { done: false },
];

const KAAL_TIMES = ["06:30", "10:00", "14:00"];
const KAAL_DONE = [true, false, false];

export default function LocalizationDemoPage() {
  const [lang, setLang] = useState<LangCode>("hi");
  const [tab, setTab] = useState<Tab>("today");

  const t = T[lang];
  const isRTL = LANGS.find((l) => l.code === lang)?.rtl ?? false;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "today", label: t.nav_today, icon: <Sun className="w-3.5 h-3.5" /> },
    { id: "chat",  label: t.nav_chat,  icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "goals", label: t.nav_goals, icon: <Target className="w-3.5 h-3.5" /> },
    { id: "kaal",  label: t.nav_kaal,  icon: <CalendarDays className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Page header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/language">
            <button className="text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">ARYA in Every Language</h1>
            <p className="text-xs text-muted-foreground">Tap a language pill · tap a panel tab · watch everything translate</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Language pills — scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                lang === l.code
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.native}</span>
            </button>
          ))}
        </div>

        {/* RTL badge */}
        <AnimatePresence>
          {isRTL && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                <span className="text-base">↔️</span>
                <div>
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">RTL layout active</span>
                  <span className="text-xs text-purple-600 dark:text-purple-400 ml-2">
                    Sidebar · navigation · chat bubbles · all reversed for {LANGS.find(l => l.code === lang)?.name}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini ARYA mockup */}
        <AnimatePresence mode="wait">
          <motion.div
            key={lang}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            dir={isRTL ? "rtl" : "ltr"}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
            style={{ minHeight: 520 }}
          >
            <div className="flex h-full" style={{ minHeight: 520 }}>

              {/* Sidebar */}
              <div className={`w-48 flex-shrink-0 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col ${isRTL ? "border-l" : "border-r"}`}>
                {/* Logo area */}
                <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">ARYA</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight" style={{ textAlign: isRTL ? "right" : "left" }}>
                    {t.arya_tagline}
                  </p>
                </div>

                {/* Nav tabs */}
                <nav className="flex-1 p-2 space-y-0.5">
                  {tabs.map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => setTab(tb.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isRTL ? "flex-row-reverse text-right" : "text-left"
                      } ${
                        tab === tb.id
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                          : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {tb.icon}
                      <span>{tb.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Bottom hint */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0" />
                    <div>
                      <p className={`text-[10px] font-medium text-gray-900 dark:text-white ${isRTL ? "text-right" : ""}`}>
                        {lang === "ar" ? "أرجون" : lang === "he" ? "ארג'ון" : lang === "ja" ? "アルジュン" : lang === "zh" ? "阿尔琼" : lang === "ko" ? "아르준" : "Arjun"}
                      </p>
                      <p className={`text-[9px] text-muted-foreground ${isRTL ? "text-right" : ""}`}>
                        {lang === "ar" ? "نشط" : lang === "he" ? "פעיל" : lang === "fr" ? "En ligne" : lang === "de" ? "Online" : lang === "ja" ? "オンライン" : lang === "zh" ? "在线" : lang === "ko" ? "온라인" : lang === "sa" ? "ऑनलाइन" : "Online"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main panel */}
              <div className="flex-1 flex flex-col overflow-hidden">

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${lang}-${tab}`}
                    initial={{ opacity: 0, x: isRTL ? -8 : 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 8 : -8 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 overflow-auto"
                  >

                    {/* TODAY */}
                    {tab === "today" && (
                      <div className="p-5 space-y-4">
                        <div>
                          <h2 className={`text-xl font-bold text-gray-900 dark:text-white ${isRTL ? "text-right" : ""}`}>
                            {t.greeting}
                          </h2>
                          <p className={`text-xs text-muted-foreground mt-0.5 ${isRTL ? "text-right" : ""}`}>{t.greeting_sub}</p>
                        </div>

                        {/* ARYA insight card */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4">
                          <div className={`flex items-center gap-2 mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[8px] font-bold">A</span>
                            </div>
                            <span className="text-xs font-semibold text-white/80">ARYA</span>
                          </div>
                          <p className={`text-sm text-white leading-relaxed ${isRTL ? "text-right" : ""}`}>
                            {t.today_insight}
                          </p>
                        </div>

                        {/* Mood check-in */}
                        <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                          <p className={`text-sm font-semibold text-gray-900 dark:text-white mb-3 ${isRTL ? "text-right" : ""}`}>
                            {t.today_mood_q}
                          </p>
                          <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            {["😔","😕","😐","🙂","😊"].map((emoji, i) => (
                              <button key={i} className={`w-9 h-9 rounded-xl text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center ${i === 3 ? "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-300" : ""}`}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Streak */}
                        <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                          {[1,2,3,4,5,6,7].map((d) => (
                            <div key={d} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CHAT */}
                    {tab === "chat" && (
                      <div className="flex flex-col h-full" style={{ minHeight: 430 }}>
                        <div className="flex-1 p-4 space-y-3">
                          {/* User message */}
                          <div className={`flex ${isRTL ? "justify-start" : "justify-end"}`}>
                            <div
                              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2.5 rounded-2xl max-w-[80%] leading-relaxed"
                              style={{ textAlign: isRTL ? "right" : "left" }}
                            >
                              {t.chat_user_msg}
                            </div>
                          </div>

                          {/* ARYA reply */}
                          <div className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                              A
                            </div>
                            <div
                              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-3 py-2.5 rounded-2xl max-w-[80%] leading-relaxed"
                              style={{ textAlign: isRTL ? "right" : "left" }}
                            >
                              {t.chat_arya_reply}
                            </div>
                          </div>

                          {/* Typing indicator */}
                          <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                              A
                            </div>
                            <div className="flex gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                              {[0,1,2].map((i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Input bar */}
                        <div className={`border-t border-gray-100 dark:border-gray-800 p-3 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <button className="text-muted-foreground hover:text-gray-700 flex-shrink-0"><Paperclip className="w-4 h-4" /></button>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-muted-foreground truncate" style={{ textAlign: isRTL ? "right" : "left" }}>
                            {t.chat_placeholder}
                          </div>
                          <button className="text-muted-foreground hover:text-gray-700 flex-shrink-0"><Mic className="w-4 h-4" /></button>
                          <button className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                            <Send className={`w-3.5 h-3.5 text-white dark:text-gray-900 ${isRTL ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* GOALS */}
                    {tab === "goals" && (
                      <div className="p-5 space-y-4">
                        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.goals_heading}</h2>
                          <button className={`flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Plus className="w-3.5 h-3.5" />
                            {t.goals_add}
                          </button>
                        </div>

                        {[t.goal_1, t.goal_2, t.goal_3].map((goal, i) => (
                          <div key={i} className={`border border-gray-100 dark:border-gray-800 rounded-xl p-3.5 flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${GOALS_DATA[i].done ? "bg-emerald-500" : "border-2 border-gray-300 dark:border-gray-600"}`}>
                              {GOALS_DATA[i].done && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium text-gray-900 dark:text-white ${isRTL ? "text-right" : ""}`}>{goal}</p>
                              <div className={`flex items-center gap-2 mt-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: i === 0 ? "100%" : i === 1 ? "43%" : "10%" }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                  {i === 0 ? "7/7" : i === 1 ? "3/7" : "1/7"}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"}`}>
                              {t.goal_active}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* KAAL */}
                    {tab === "kaal" && (
                      <div className="p-5 space-y-4">
                        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.kaal_heading}</h2>
                          <button className={`flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Bell className="w-3.5 h-3.5" />
                            {t.kaal_reminder}
                          </button>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-2">
                          {[t.kaal_item_1, t.kaal_item_2, t.kaal_item_3].map((item, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${KAAL_DONE[i] ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10" : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"} ${isRTL ? "flex-row-reverse" : ""}`}>
                              <div className={`w-10 text-center flex-shrink-0 ${isRTL ? "text-right" : "text-left"}`}>
                                <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">{KAAL_TIMES[i]}</span>
                              </div>
                              <div className={`w-px h-8 flex-shrink-0 ${KAAL_DONE[i] ? "bg-emerald-300 dark:bg-emerald-700" : "bg-gray-200 dark:bg-gray-700"}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${isRTL ? "text-right" : ""}`}>{item}</p>
                              </div>
                              {KAAL_DONE[i] && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            </div>
                          ))}
                        </div>

                        {/* Empty slot */}
                        <button className={`w-full border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground hover:border-gray-400 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t.kaal_reminder}</span>
                        </button>
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dev key legend */}
        <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Translation key reference</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: "t.nav_today", val: t.nav_today },
              { key: "t.nav_chat", val: t.nav_chat },
              { key: "t.nav_goals", val: t.nav_goals },
              { key: "t.nav_kaal", val: t.nav_kaal },
              { key: "t.greeting", val: t.greeting.split(",")[0] },
              { key: "t.today_insight", val: "…" },
              { key: "t.goals_heading", val: t.goals_heading },
              { key: "t.kaal_heading", val: t.kaal_heading },
            ].map((item) => (
              <div key={item.key} className="bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400">{item.key}</p>
                <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-0.5 truncate">{item.val}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Replace every hardcoded string in your React components with <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[9px]">t('key')</code> calls. RTL flip is <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[9px]">dir="rtl"</code> on the root element.
          </p>
        </div>
      </div>
    </div>
  );
}
