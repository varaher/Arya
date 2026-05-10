// ARYA UI Translation System
// Supports: English (en), Hindi (hi)
// Usage: const { t } = useTranslation();

export type UiLanguage = "en" | "hi";

const translations: Record<UiLanguage, Record<string, string>> = {
  en: {
    // Sidebar
    "chat_history": "Chat History",
    "new_chat": "New Chat",
    "memory": "Memory",
    "goals": "Goals",
    "alerts": "Alerts",
    "notes": "Notes",
    "sign_in": "Sign in / Create account",
    "no_conversations": "No conversations yet",
    "start_chatting": "Start chatting with ARYA!",
    // Chat input
    "ask_anything": "Ask ARYA anything...",
    "ask_about_image": "Ask about this image (optional)...",
    "recording": "Recording",
    "reading_image": "Reading image...",
    // Welcome
    "your_pa": "Your Personal Thinking & Growth Assistant",
    "welcome_desc": "Think clearly. Set goals. Stay disciplined. Reflect daily. Grow spiritually & professionally. I'm here to help you become your best self.",
    "sign_in_goals": "Sign in to track goals",
    "take_tour": "Take a Tour",
    // Voice bar
    "voice_label": "Voice:",
    // Mood
    "daily_checkin": "Daily Check-in",
    "how_feeling": "How are you feeling today?",
    "energy_level": "Energy level",
    "add_note": "Add a note (optional)...",
    "save_checkin": "Save Check-in",
    // Notes
    "voice_notes": "Voice Notes",
    "record_note": "Record a Note",
    "no_notes": "No notes yet",
    "start_recording": "Tap to start recording",
    "save_note": "Save Note",
    "notes_desc": "Save thoughts, ideas, or reminders as voice notes",
    // Customize
    "customize_arya": "Customize ARYA",
    "response_length": "Response Length",
    "conversation_tone": "Conversation Tone",
    "focus_areas": "Focus Areas",
    "wisdom_quotes": "Wisdom & Quotes",
    "news_updates": "News & Updates",
    "morning_briefing": "Morning Briefing",
    "weekly_review": "Weekly Review",
    "ui_language": "App Language",
    "save_preferences": "Save Preferences",
  },
  hi: {
    // Sidebar
    "chat_history": "चैट इतिहास",
    "new_chat": "नई चैट",
    "memory": "स्मृति",
    "goals": "लक्ष्य",
    "alerts": "सूचनाएं",
    "notes": "नोट्स",
    "sign_in": "साइन इन / खाता बनाएं",
    "no_conversations": "अभी तक कोई बातचीत नहीं",
    "start_chatting": "ARYA से बात शुरू करें!",
    // Chat input
    "ask_anything": "ARYA से कुछ भी पूछें...",
    "ask_about_image": "इस चित्र के बारे में पूछें (वैकल्पिक)...",
    "recording": "रिकॉर्डिंग",
    "reading_image": "चित्र पढ़ रहा है...",
    // Welcome
    "your_pa": "आपका व्यक्तिगत सोच और विकास सहायक",
    "welcome_desc": "स्पष्ट सोचें। लक्ष्य निर्धारित करें। अनुशासित रहें। प्रतिदिन चिंतन करें। आध्यात्मिक और पेशेवर रूप से बढ़ें।",
    "sign_in_goals": "लक्ष्य ट्रैक करने के लिए साइन इन करें",
    "take_tour": "परिचय लें",
    // Voice bar
    "voice_label": "आवाज़:",
    // Mood
    "daily_checkin": "दैनिक चेक-इन",
    "how_feeling": "आज आप कैसा महसूस कर रहे हैं?",
    "energy_level": "ऊर्जा स्तर",
    "add_note": "एक नोट जोड़ें (वैकल्पिक)...",
    "save_checkin": "चेक-इन सहेजें",
    // Notes
    "voice_notes": "वॉयस नोट्स",
    "record_note": "नोट रिकॉर्ड करें",
    "no_notes": "अभी तक कोई नोट नहीं",
    "start_recording": "रिकॉर्डिंग शुरू करने के लिए टैप करें",
    "save_note": "नोट सहेजें",
    "notes_desc": "विचार, आइडिया या अनुस्मारक वॉयस नोट के रूप में सहेजें",
    // Customize
    "customize_arya": "ARYA कस्टमाइज़ करें",
    "response_length": "उत्तर की लंबाई",
    "conversation_tone": "बातचीत का स्वर",
    "focus_areas": "फोकस क्षेत्र",
    "wisdom_quotes": "ज्ञान और उद्धरण",
    "news_updates": "समाचार और अपडेट",
    "morning_briefing": "सुबह की जानकारी",
    "weekly_review": "साप्ताहिक समीक्षा",
    "ui_language": "ऐप भाषा",
    "save_preferences": "प्राथमिकताएं सहेजें",
  },
};

export function getTranslation(lang: UiLanguage, key: string): string {
  return translations[lang]?.[key] ?? translations["en"][key] ?? key;
}

export function getStoredUiLanguage(): UiLanguage {
  try {
    const stored = localStorage.getItem("arya_ui_language");
    if (stored === "hi") return "hi";
  } catch {}
  return "en";
}

export function setStoredUiLanguage(lang: UiLanguage): void {
  try {
    localStorage.setItem("arya_ui_language", lang);
  } catch {}
}

// Hook-like function (used without React hooks for simplicity in non-hook contexts)
export function createTranslator(lang: UiLanguage) {
  return (key: string) => getTranslation(lang, key);
}
