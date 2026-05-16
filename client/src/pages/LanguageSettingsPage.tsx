import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Check, Globe, Zap, ChevronDown } from "lucide-react";

type Region = "india" | "middle-east" | "europe" | "asia-pacific" | "africa";

interface Dialect {
  code: string;
  name: string;
  region: string;
  sample: string;
}

interface LanguageEntry {
  code: string;
  name: string;
  native: string;
  speakers: string;
  region: Region;
  rtl?: boolean;
  dialects?: Dialect[];
}

interface TonePreview {
  userMessage: string;
  aryaResponse: string;
  tags: string[];
}

const ARABIC_DIALECTS: Dialect[] = [
  {
    code: "ar-AE",
    name: "Gulf",
    region: "UAE · Saudi Arabia · Kuwait",
    sample: "خذ نفس أول. هذا شي طبيعي — الشغل يتثقل أحياناً. إيش اللي يضايقك أكثر هالوقت؟ قولي ونشوف مع بعض.",
  },
  {
    code: "ar-LB",
    name: "Levantine",
    region: "Lebanon · Syria · Jordan",
    sample: "خود نفس أول. هاد شي طبيعي — الشغل بيتقل كتير أحياناً. شو اللي عم يضايقك أكتر هلق؟ حكيلي ونشوف.",
  },
  {
    code: "ar-EG",
    name: "Egyptian",
    region: "Egypt",
    sample: "خد نفس الأول. ده طبيعي جداً — الشغل بيتقل أوي أحياناً. إيه اللي بيأكلك أكتر دلوقتي؟ قولي ونشوف مع بعض.",
  },
  {
    code: "ar-MA",
    name: "Moroccan (Darija)",
    region: "Morocco · Algeria · Tunisia",
    sample: "خذ نفس أولاً. هادشي عادي — الخدمة كتشقق أحياناً. شنو اللي كيضايقك أكثر دابا؟ قولي ونشوفو مع بعضياتنا.",
  },
  {
    code: "ar-SA",
    name: "Modern Standard",
    region: "Formal writing & broadcasts",
    sample: "خذ نفساً عميقاً أولاً. ضغط العمل يتراكم أحياناً — وهذا أمر طبيعي. ما الذي يثقل عليك أكثر في الوقت الراهن؟",
  },
];

const LANGUAGES: LanguageEntry[] = [
  // India
  { code: "en-IN", name: "English", native: "English", speakers: "125M in India", region: "india" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी", speakers: "600M", region: "india" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা", speakers: "230M", region: "india" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు", speakers: "83M", region: "india" },
  { code: "mr-IN", name: "Marathi", native: "मराठी", speakers: "83M", region: "india" },
  { code: "ta-IN", name: "Tamil", native: "தமிழ்", speakers: "77M", region: "india" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી", speakers: "57M", region: "india" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ", speakers: "44M", region: "india" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം", speakers: "38M", region: "india" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ", speakers: "38M", region: "india" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ", speakers: "33M", region: "india" },

  { code: "sa-IN", name: "Sanskrit", native: "संस्कृतम्", speakers: "25K scholars · cultural", region: "india" },

  // Middle East
  {
    code: "ar-SA",
    name: "Arabic",
    native: "العربية",
    speakers: "310M",
    region: "middle-east",
    rtl: true,
    dialects: ARABIC_DIALECTS,
  },
  { code: "he-IL", name: "Hebrew", native: "עברית", speakers: "9M", region: "middle-east", rtl: true },
  { code: "tr-TR", name: "Turkish", native: "Türkçe", speakers: "80M", region: "middle-east" },
  { code: "fa-IR", name: "Farsi", native: "فارسی", speakers: "110M", region: "middle-east", rtl: true },

  // Europe
  { code: "fr-FR", name: "French", native: "Français", speakers: "280M", region: "europe" },
  { code: "es-ES", name: "Spanish", native: "Español", speakers: "500M", region: "europe" },
  { code: "de-DE", name: "German", native: "Deutsch", speakers: "100M", region: "europe" },
  { code: "it-IT", name: "Italian", native: "Italiano", speakers: "65M", region: "europe" },
  { code: "pt-BR", name: "Portuguese", native: "Português", speakers: "250M", region: "europe" },
  { code: "ru-RU", name: "Russian", native: "Русский", speakers: "150M", region: "europe" },
  { code: "nl-NL", name: "Dutch", native: "Nederlands", speakers: "25M", region: "europe" },
  { code: "sv-SE", name: "Swedish", native: "Svenska", speakers: "10M", region: "europe" },

  // Asia Pacific
  { code: "zh-CN", name: "Chinese", native: "中文", speakers: "1.1B", region: "asia-pacific" },
  { code: "ja-JP", name: "Japanese", native: "日本語", speakers: "125M", region: "asia-pacific" },
  { code: "ko-KR", name: "Korean", native: "한국어", speakers: "80M", region: "asia-pacific" },
  { code: "id-ID", name: "Indonesian", native: "Bahasa Indonesia", speakers: "270M", region: "asia-pacific" },

  // Africa
  { code: "sw-KE", name: "Swahili", native: "Kiswahili", speakers: "200M", region: "africa" },
  { code: "am-ET", name: "Amharic", native: "አማርኛ", speakers: "60M", region: "africa" },
];

const TONE_PREVIEWS: Record<string, TonePreview> = {
  "en-IN": {
    userMessage: "I'm really stressed about work and I don't know what to do.",
    aryaResponse: "Hey, first — take a breath. Work stress piles up fast, and it's okay to feel overwhelmed. What's the biggest thing weighing on you right now? Let's start there.",
    tags: ["Warm", "Direct", "Friend-like"],
  },
  "hi-IN": {
    userMessage: "मैं काम से बहुत परेशान हूं और समझ नहीं आ रहा क्या करूं।",
    aryaResponse: "यार, पहले एक गहरी सांस लो। काम का प्रेशर कभी-कभी बहुत भारी हो जाता है — ये बिल्कुल नॉर्मल है। बताओ, सबसे ज़्यादा क्या चुभ रहा है अभी?",
    tags: ["Casual", "Warm", "Yaar-energy"],
  },
  "bn-IN": {
    userMessage: "আমি কাজ নিয়ে খুব চাপে আছি, কী করব বুঝতে পারছি না।",
    aryaResponse: "আরে, আগে একটু শ্বাস নাও। কাজের চাপ অনেক সময় অনেক ভারী হয়ে যায় — এটা খুব স্বাভাবিক। এখন সবচেয়ে বেশি কোন জিনিসটা কষ্ট দিচ্ছে? সেখান থেকে শুরু করি।",
    tags: ["Warm", "Natural", "Friend-like"],
  },
  "ta-IN": {
    userMessage: "வேலையில் மிகவும் மன அழுத்தத்தில் இருக்கிறேன், என்ன செய்வதென்று தெரியவில்லை.",
    aryaResponse: "முதல்ல ஒரு நிமிஷம் மூச்சு எடு. வேலை பிரஷர் சில நேரம் ரொம்ப கஷ்டமா இருக்கும் — இது நார்மல். இப்போ என்னது ஒரு விஷயம் அதிகமா கஷ்டமா இருக்கு? அதுல இருந்து ஆரம்பிக்கலாம்.",
    tags: ["Warm", "Casual", "Natural"],
  },
  "te-IN": {
    userMessage: "పని విషయంలో చాలా ఒత్తిడిగా ఉంది, ఏం చేయాలో తెలీడం లేదు.",
    aryaResponse: "ముందు ఒక్క నిమిషం ఊపిరి తీసుకో. పని ఒత్తిడి అప్పుడప్పుడు చాలా భారంగా అనిపిస్తుంది — ఇది నార్మలే. ఇప్పుడు అన్నిటికంటే ఎక్కువ ఏది ఇబ్బంది పెడుతోంది? అక్కడ నుండి మొదలుపెడదాం.",
    tags: ["Warm", "Natural", "Friend-like"],
  },
  "mr-IN": {
    userMessage: "मला कामाचा खूप ताण आहे आणि काय करावं ते समजत नाहीये.",
    aryaResponse: "अरे, आधी एक दीर्घ श्वास घे. कामाचा ताण कधीकधी खूपच जड होतो — हे अगदी स्वाभाविक आहे. आत्ता सगळ्यात जास्त कशाचं दडपण येतंय? तिथून सुरुवात करूया.",
    tags: ["Warm", "Casual", "Friend-like"],
  },
  "kn-IN": {
    userMessage: "ಕೆಲಸದ ವಿಷಯದಲ್ಲಿ ತುಂಬಾ ಒತ್ತಡ ಇದೆ, ಏನು ಮಾಡಬೇಕೆಂದು ಗೊತ್ತಾಗ್ತಿಲ್ಲ.",
    aryaResponse: "ಮೊದಲು ಒಂದು ನಿಮಿಷ ಉಸಿರು ತೆಗೆದುಕೋ. ಕೆಲಸದ ಒತ್ತಡ ಕೆಲವೊಮ್ಮೆ ತುಂಬಾ ಭಾರವಾಗಿ ಅನ್ನಿಸುತ್ತೆ — ಇದು ಸಾಮಾನ್ಯ. ಈಗ ಏನು ಹೆಚ್ಚು ತೊಂದರೆ ಕೊಡ್ತಿದೆ? ಅಲ್ಲಿಂದ ಶುರು ಮಾಡೋಣ.",
    tags: ["Warm", "Natural", "Friend-like"],
  },
  "ml-IN": {
    userMessage: "ജോലിയുടെ കാര്യത്തിൽ വളരെ സ്ട്രസ്സ് ഉണ്ട്, എന്ത് ചെയ്യണമെന്ന് അറിയില്ല.",
    aryaResponse: "ആദ്യം ഒന്ന് ശ്വാസമെടുക്കൂ. ജോലിയുടെ സമ്മർദ്ദം ചിലപ്പോൾ വളരെ ഭാരമാകും — ഇത് സ്വാഭാവികം. ഇപ്പോൾ ഏറ്റവും കൂടുതൽ ബുദ്ധിമുട്ടുന്നത് ഏതൊന്ന്? അവിടെ നിന്ന് തുടങ്ങാം.",
    tags: ["Warm", "Natural", "Friend-like"],
  },
  "gu-IN": {
    userMessage: "મને કામ વિશે ઘણો તણાવ છે અને શું કરવું તે સમજાતું નથી.",
    aryaResponse: "યાર, પહેલા એક ઊંડો શ્વાસ લો. કામનો ભાર ક્યારેક ઘણો ભારે થઈ જાય છે — આ બિલ્કુલ સ્વાભાવિક છે. અત્યારે સૌથી વધુ શું ભારે લાગે છે? ત્યાંથી શરૂ કરીએ.",
    tags: ["Casual", "Warm", "Friend-like"],
  },
  "pa-IN": {
    userMessage: "ਮੈਂ ਕੰਮ ਤੋਂ ਬਹੁਤ ਪਰੇਸ਼ਾਨ ਹਾਂ ਅਤੇ ਸਮਝ ਨਹੀਂ ਆ ਰਿਹਾ ਕੀ ਕਰਾਂ।",
    aryaResponse: "ਯਾਰ, ਪਹਿਲਾਂ ਇੱਕ ਡੂੰਘਾ ਸਾਹ ਲਓ। ਕੰਮ ਦਾ ਬੋਝ ਕਦੇ-ਕਦੇ ਬਹੁਤ ਭਾਰਾ ਹੋ ਜਾਂਦਾ ਹੈ — ਇਹ ਬਿਲਕੁਲ ਨਾਰਮਲ ਹੈ। ਦੱਸੋ, ਹੁਣ ਸਭ ਤੋਂ ਵੱਧ ਕੀ ਖਲਦਾ ਹੈ?",
    tags: ["Casual", "Warm", "Yaar-energy"],
  },
  "od-IN": {
    userMessage: "ମୁଁ କାମ ନେଇ ବହୁତ ଚিntit ଅଛି, କଣ କରିବି ବୁଝୁ ନାହିଁ।",
    aryaResponse: "ଆଗ ଗୋଟେ ଗଭୀର ନିଃଶ୍ୱାସ ନିଅ। କାମର ଚାପ ବେଳେ ବେଳେ ବହୁତ ଭାରି ହୋଇ ଯାଏ — ଏଇଟା ସ୍ୱାଭାବିକ। ଏବେ ସବୁଠୁ ଅଧିକ ଯାହା ଚିntit ଦୁଚ୍ଚିতা ଦେଉଛ? ସେଠୁ ଆରମ୍ଭ କରିବା।",
    tags: ["Warm", "Natural", "Friend-like"],
  },
  "sa-IN": {
    userMessage: "कार्येण अतीव खिन्नोऽस्मि, किं करणीयम् इति न जानामि।",
    aryaResponse: "मित्र, प्रथमं गभीरं श्वासं गृहाण। कार्यभारः कदाचित् अतीव गुरुः भवति — एतत् स्वाभाविकम्। अधुना किं तव मनः पीडयति? तत्र एव आरभामहे।",
    tags: ["Classical warmth", "Devanagari", "Scholar-friend"],
  },
  "ar-SA": {
    userMessage: "أنا تعبان جداً من الشغل ومش عارف أعمل إيه.",
    aryaResponse: "خد نفس الأول. ده طبيعي جداً — الشغل بيتقل أوي أحياناً. إيه اللي بيأكلك أكتر دلوقتي؟ قولي ونشوف مع بعض.",
    tags: ["Warm", "Dialect-aware", "Friend-like"],
  },
  "he-IL": {
    userMessage: "אני ממש בלחץ מהעבודה ולא יודע מה לעשות.",
    aryaResponse: "היי, קודם כל — תנשום. לחץ בעבודה מצטבר מהר, וזה בסדר גמור להרגיש מוצף. מה הכי כובד עליך עכשיו? נתחיל משם.",
    tags: ["Warm", "Direct", "Friend-like"],
  },
  "tr-TR": {
    userMessage: "İşten çok bunaldım, ne yapacağımı bilmiyorum.",
    aryaResponse: "Önce derin bir nefes al. İş stresi hızla birikirken bunalmak çok normal. Şu an seni en çok ne zorlıyor? Oradan başlayalım.",
    tags: ["Casual (sen)", "Warm", "Direct"],
  },
  "fa-IR": {
    userMessage: "خیلی از کار استرس دارم و نمی‌دونم چیکار کنم.",
    aryaResponse: "اول یه نفس عمیق بکش. استرس کار گاهی خیلی سنگین میشه — این کاملاً طبیعیه. الان چی بیشتر اذیتت می‌کنه؟ از اونجا شروع کنیم.",
    tags: ["Warm", "Casual", "Friend-like"],
  },
  "fr-FR": {
    userMessage: "Je suis vraiment stressé par le travail, je sais plus quoi faire.",
    aryaResponse: "Hey, respire un coup d'abord. Le stress au boulot ça s'accumule vite — c'est normal de se sentir dépassé. C'est quoi la chose qui te pèse le plus là ? On commence par là.",
    tags: ["Tu (not vous)", "Direct", "Natural"],
  },
  "es-ES": {
    userMessage: "Estoy muy estresado con el trabajo y no sé qué hacer.",
    aryaResponse: "Hey, respira primero. El estrés del trabajo se amontona rápido — y está bien sentirse así. ¿Qué es lo que más te está pesando ahora mismo? Empecemos por ahí.",
    tags: ["Tú register", "Casual", "Natural"],
  },
  "de-DE": {
    userMessage: "Ich bin wirklich gestresst mit der Arbeit und weiß nicht mehr weiter.",
    aryaResponse: "Hey, erstmal tief durchatmen. Arbeitsstress baut sich schnell auf — das kennst du sicher. Was drückt dich gerade am meisten? Fangen wir da an.",
    tags: ["Du (not Sie)", "Direct", "Natural"],
  },
  "it-IT": {
    userMessage: "Sono davvero stressato dal lavoro e non so cosa fare.",
    aryaResponse: "Ehi, prima respira. Lo stress da lavoro si accumula in fretta — è normale sentirsi sopraffatti. Cosa ti pesa di più in questo momento? Cominciamo da lì.",
    tags: ["Tu register", "Warm", "Natural"],
  },
  "pt-BR": {
    userMessage: "Estou muito estressado com o trabalho e não sei o que fazer.",
    aryaResponse: "Ei, primeiro respira. O estresse do trabalho acumula rápido — é normal se sentir sobrecarregado. O que está pesando mais pra você agora? A gente começa por aí.",
    tags: ["A gente · Casual", "Warm", "Direct"],
  },
  "ru-RU": {
    userMessage: "У меня огромный стресс из-за работы, не знаю что делать.",
    aryaResponse: "Эй, сначала просто глубоко вдохни. Рабочий стресс накапливается быстро — это нормально. Что сейчас давит сильнее всего? Начнём с этого.",
    tags: ["Ты (not Вы)", "Direct", "Warm"],
  },
  "nl-NL": {
    userMessage: "Ik ben echt gestrest van het werk en weet niet meer wat ik moet doen.",
    aryaResponse: "Hey, adem eerst even diep in. Werkstress stapelt zich snel op — het is oké om je overweldigd te voelen. Wat weegt het zwaarst op dit moment? Laten we daar beginnen.",
    tags: ["Jij register", "Warm", "Direct"],
  },
  "sv-SE": {
    userMessage: "Jag är verkligen stressad av jobbet och vet inte vad jag ska göra.",
    aryaResponse: "Hej, andas först. Jobbstress samlas snabbt — det är okej att känna sig överväldigad. Vad tynger dig mest just nu? Vi börjar där.",
    tags: ["Du register", "Direct", "Natural"],
  },
  "zh-CN": {
    userMessage: "我真的很有工作压力，不知道怎么办。",
    aryaResponse: "先深呼吸一下。工作压力积累起来确实很重，这很正常。现在最让你烦恼的是什么？我们从那里开始聊。",
    tags: ["Natural", "Warm", "Direct"],
  },
  "ja-JP": {
    userMessage: "仕事のことで本当にストレスがたまっていて、どうしたらいいかわかりません。",
    aryaResponse: "まず深呼吸してみてください。仕事のプレッシャーって、積み重なると本当につらいですよね。今一番気になってることは何ですか？そこから一緒に考えましょう。",
    tags: ["です/ます", "No keigo", "Warm"],
  },
  "ko-KR": {
    userMessage: "일 때문에 정말 스트레스를 많이 받고 있는데 어떻게 해야 할지 모르겠어요.",
    aryaResponse: "일단 숨 한번 크게 쉬어요. 일 스트레스는 빠르게 쌓이거든요 — 힘든 게 당연해요. 지금 제일 무겁게 느껴지는 게 뭐예요? 거기서부터 같이 생각해봐요.",
    tags: ["Informal polite", "Warm", "Natural"],
  },
  "id-ID": {
    userMessage: "Aku benar-benar stres soal kerjaan dan nggak tahu harus ngapain.",
    aryaResponse: "Hey, tarik napas dulu. Stres kerjaan bisa numpuk cepet — wajar banget kalau kamu ngerasa overwhelmed. Sekarang hal apa yang paling berat? Kita mulai dari sana.",
    tags: ["Aku/kamu", "Casual", "Natural"],
  },
  "sw-KE": {
    userMessage: "Ninahisi msongo wa mawazo sana kutokana na kazi, sijui nifanye nini.",
    aryaResponse: "Hey, pumzika kidogo kwanza. Msongo wa kazi unaweza kukusanyika haraka — ni kawaida kuhisi hivyo. Nini kinakusumbua zaidi sasa hivi? Tuanze hapo.",
    tags: ["Warm", "Direct", "Natural"],
  },
  "am-ET": {
    userMessage: "ከስራ ጋር በተያያዘ በጣም ተጨናንቄያለሁ፣ ምን ማድረግ እንዳለብኝ አላውቅም።",
    aryaResponse: "ቀድሞ ጥልቅ ትንፋሽ ውሰድ። የስራ ጫና አንዳንዴ በጣም ከባድ ይሆናል — ይህ ተፈጥሯዊ ነው። አሁን ምን ነገር ያስጨንቅዎታል? ከዚያ እንጀምር።",
    tags: ["Warm", "Natural", "Direct"],
  },
};

const REGIONS = [
  { id: "india" as Region, label: "India", flag: "🇮🇳" },
  { id: "middle-east" as Region, label: "Middle East", flag: "🌙" },
  { id: "europe" as Region, label: "Europe", flag: "🌍" },
  { id: "asia-pacific" as Region, label: "Asia Pacific", flag: "🌏" },
  { id: "africa" as Region, label: "Africa", flag: "🌍" },
];

export default function LanguageSettingsPage() {
  const [activeRegion, setActiveRegion] = useState<Region>("india");
  const [selectedLang, setSelectedLang] = useState("hi-IN");
  const [selectedDialect, setSelectedDialect] = useState(ARABIC_DIALECTS[2]); // Egyptian default
  const [autoDetect, setAutoDetect] = useState(true);
  const [dialectOpen, setDialectOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === selectedLang)!;
  const isRTL = currentLang?.rtl ?? false;
  const isArabic = selectedLang === "ar-SA";

  const previewKey = isArabic ? selectedDialect.code : selectedLang;
  const preview = TONE_PREVIEWS[previewKey] || TONE_PREVIEWS[selectedLang] || TONE_PREVIEWS["en-IN"];

  const regionLangs = LANGUAGES.filter((l) => l.region === activeRegion);

  const handleLangSelect = (code: string) => {
    setSelectedLang(code);
    const lang = LANGUAGES.find((l) => l.code === code);
    if (lang) setActiveRegion(lang.region);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <button className="text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Language Settings</h1>
            <p className="text-xs text-muted-foreground">26 languages · ARYA adapts tone and dialect for each</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/language-roadmap">
              <button className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1.5">
                <span>Roadmap →</span>
              </button>
            </Link>
            <Link href="/language-demo">
              <button className="flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors border border-cyan-200 dark:border-cyan-800 rounded-full px-3 py-1.5">
                <span>Live demo →</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left — Picker */}
          <div className="lg:col-span-3 space-y-4">

            {/* Auto-detect card */}
            <div className={`rounded-2xl border p-4 transition-all ${autoDetect ? "border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-950/20" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${autoDetect ? "bg-cyan-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Auto-detect language</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {autoDetect
                        ? "ARYA detects and mirrors whatever language you write in — no setup needed."
                        : "Choose your preferred language manually below."}
                    </p>
                    {autoDetect && (
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1.5">
                        Currently detecting: <strong>{currentLang?.name}</strong> ·{" "}
                        <button onClick={() => setAutoDetect(false)} className="underline underline-offset-2">
                          Override
                        </button>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setAutoDetect(!autoDetect)}
                  className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${autoDetect ? "bg-cyan-500" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoDetect ? "translate-x-[22px]" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>

            {/* Region tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRegion(r.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeRegion === r.id
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "text-muted-foreground hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>{r.flag}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Language grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRegion}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {regionLangs.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleLangSelect(lang.code)}
                      className={`relative text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white"
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-gray-900 dark:text-white" />
                        </span>
                      )}
                      <p className={`font-semibold text-sm ${isSelected ? "text-white dark:text-gray-900" : "text-gray-900 dark:text-white"}`}>
                        {lang.name}
                      </p>
                      <p className={`text-base mt-0.5 ${isSelected ? "text-white/80 dark:text-gray-900/70" : "text-muted-foreground"}`}>
                        {lang.native}
                      </p>
                      <p className={`text-[10px] mt-1 ${isSelected ? "text-white/60 dark:text-gray-900/50" : "text-gray-400 dark:text-gray-600"}`}>
                        {lang.speakers}
                      </p>
                      {lang.rtl && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${isSelected ? "bg-white/20 dark:bg-gray-900/20 text-white dark:text-gray-900" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                          RTL
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Arabic dialect picker */}
            <AnimatePresence>
              {isArabic && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border border-amber-200 dark:border-amber-800 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Arabic Dialect</p>
                      <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        ARYA adapts register per dialect
                      </span>
                    </div>

                    {/* Dialect selector button */}
                    <button
                      onClick={() => setDialectOpen(!dialectOpen)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-700 text-sm"
                    >
                      <div className="text-left">
                        <span className="font-medium text-gray-900 dark:text-white">{selectedDialect.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{selectedDialect.region}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dialectOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {dialectOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="mt-1 border border-amber-200 dark:border-amber-700 rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-lg"
                        >
                          {ARABIC_DIALECTS.map((d) => (
                            <button
                              key={d.code}
                              onClick={() => { setSelectedDialect(d); setDialectOpen(false); }}
                              className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedDialect.code === d.code ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                            >
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">{d.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">{d.region}</span>
                              </div>
                              {selectedDialect.code === d.code && <Check className="w-3.5 h-3.5 text-amber-600" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RTL preview */}
            <AnimatePresence>
              {isRTL && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border border-purple-200 dark:border-purple-800 rounded-2xl bg-purple-50/50 dark:bg-purple-950/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm">↔️</span>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">RTL Interface</p>
                      <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                        Right-to-left layout
                      </span>
                    </div>
                    {/* Mini RTL chat mock */}
                    <div dir="rtl" className="space-y-2 bg-white dark:bg-gray-900 rounded-xl p-3 border border-purple-100 dark:border-purple-900">
                      <div className="flex justify-end">
                        <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 rounded-2xl rounded-bl-none max-w-[80%]" style={{ direction: "rtl", textAlign: "right" }}>
                          {selectedLang === "he-IL" ? "שלום, איך אתה?" : "مرحبا، كيف حالك؟"}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-3 py-2 rounded-2xl rounded-br-none max-w-[80%]" style={{ direction: "rtl", textAlign: "right" }}>
                          {selectedLang === "he-IL" ? "היי! שמח לראות אותך. מה עובר עליך היום?" : "أهلاً! سعيد بوجودك. كيف يمضي يومك؟"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                        <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-full flex-shrink-0" />
                      </div>
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      Chat bubbles, input, and layout all mirror for {currentLang.name} speakers.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right — Live tone preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedLang}-${isArabic ? selectedDialect.code : ""}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden"
                >
                  {/* Preview header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Live Tone Preview</p>
                      <p className="text-[10px] text-muted-foreground">
                        {currentLang?.name}{isArabic ? ` · ${selectedDialect.name}` : ""}
                        {isRTL && " · RTL"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {preview.tags.map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-muted-foreground rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chat preview */}
                  <div
                    className="p-4 space-y-3"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {/* User message */}
                    <div className={`flex ${isRTL ? "justify-start" : "justify-end"}`}>
                      <div
                        className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2.5 rounded-2xl max-w-[85%] leading-relaxed"
                        style={{ textAlign: isRTL ? "right" : "left" }}
                      >
                        {preview.userMessage}
                      </div>
                    </div>

                    {/* ARYA response */}
                    <div className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        A
                      </div>
                      <div
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-3 py-2.5 rounded-2xl max-w-[85%] leading-relaxed"
                        style={{ textAlign: isRTL ? "right" : "left" }}
                      >
                        {isArabic ? selectedDialect.sample : preview.aryaResponse}
                      </div>
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="px-4 pb-4">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {isArabic
                        ? `Using ${selectedDialect.name} dialect — ${selectedDialect.region}. ARYA avoids formal fusha in casual conversation.`
                        : isRTL
                        ? `${currentLang.name} is a right-to-left language. ARYA mirrors layout and phrasing accordingly.`
                        : "Same warm, friend-like tone — adapted naturally to this language and its everyday register."}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Why it matters */}
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Why register matters</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Most AI defaults to formal, literary language — users feel lectured, not understood. ARYA matches the
                  register of a friend speaking over tea in every language.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
