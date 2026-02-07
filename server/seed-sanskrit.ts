import { db } from "./db";
import { aryaKnowledge } from "@shared/schema";

const sanskritKnowledgeUnits = [
  // ============ RIGVEDA ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Rigveda - Nasadiya Sukta (Creation Hymn)',
    content: 'नासदासीन्नो सदासीत्तदानीं नासीद्रजो नो व्योमा परो यत् | The Nasadiya Sukta (RV 10.129) is the Hymn of Creation. It explores the origin of the universe: "There was neither non-existence nor existence then; there was neither the realm of space nor the sky beyond." It concludes with profound philosophical uncertainty: "Who really knows? Who will here proclaim it? Whence was it produced? Whence is this creation?" This hymn represents the earliest philosophical inquiry into cosmology.',
    tags: ['rigveda', 'creation', 'cosmology', 'philosophy', 'nasadiya'],
    sourceType: 'vedic-hymn',
    sourceTitle: 'Rigveda 10.129 - Nasadiya Sukta'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Rigveda - Gayatri Mantra',
    content: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात् | Om Bhur Bhuvah Svah, Tat Savitur Varenyam, Bhargo Devasya Dhimahi, Dhiyo Yo Nah Prachodayat. Translation: "We meditate on the glory of that Being who has produced this universe; may He enlighten our minds." The Gayatri Mantra (RV 3.62.10) is considered the most sacred mantra in Hinduism, addressed to Savitri (the Sun deity as the source of illumination). It is traditionally chanted during Sandhyavandana (twilight prayers).',
    tags: ['rigveda', 'gayatri', 'mantra', 'prayer', 'savitri', 'sandhyavandana'],
    sourceType: 'vedic-mantra',
    sourceTitle: 'Rigveda 3.62.10'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Rigveda - Purusha Sukta (Cosmic Person)',
    content: 'सहस्रशीर्षा पुरुषः सहस्राक्षः सहस्रपात् | The Purusha Sukta (RV 10.90) describes the cosmic sacrifice of Purusha (the Cosmic Person): "Thousand-headed is Purusha, thousand-eyed, thousand-footed." From this primordial sacrifice, all of creation emerged: the moon from the mind, the sun from the eyes, Indra and Agni from the mouth, wind from the breath. The Vedas themselves emerged from this cosmic act. This hymn establishes the interconnection between the macrocosm and microcosm.',
    tags: ['rigveda', 'purusha', 'creation', 'sacrifice', 'cosmology'],
    sourceType: 'vedic-hymn',
    sourceTitle: 'Rigveda 10.90 - Purusha Sukta'
  },

  // ============ UPANISHADS ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Isha Upanishad - The Lord Pervades All',
    content: 'ईशावास्यमिदं सर्वं यत्किञ्च जगत्यां जगत् | तेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम् | "All this — whatever exists in this changing universe — should be covered by the Lord. Protect the Self by renunciation. Do not covet anybody\'s wealth." The Isha Upanishad opens with this foundational teaching: all of reality is pervaded by Ishvara (the Supreme). True enjoyment comes through detachment (tyaga), not through grasping. This verse reconciles spiritual life with worldly engagement.',
    tags: ['upanishad', 'isha', 'ishvara', 'detachment', 'philosophy', 'renunciation'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Isha Upanishad - Verse 1'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Kena Upanishad - The Unknown Knower',
    content: 'केनेषितं पतति प्रेषितं मनः | "By whom directed does the mind go towards its object?" The Kena Upanishad investigates the ultimate source of consciousness. Its key teaching: Brahman is that which makes the mind think but cannot itself be thought; which makes the eye see but cannot be seen. "If you think you know It well, you know It but little." True knowledge of Brahman is knowing that It transcends all knowing. This is the doctrine of neti neti (not this, not this).',
    tags: ['upanishad', 'kena', 'brahman', 'consciousness', 'neti-neti', 'epistemology'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Kena Upanishad'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Katha Upanishad - Nachiketa and Yama',
    content: 'The Katha Upanishad narrates the dialogue between young Nachiketa and Yama (Death). Key teachings: (1) The Self (Atman) is beyond birth and death — "न जायते म्रियते वा विपश्चित्" (The knowing Self is not born, nor does it die), (2) The body is the chariot, intellect (buddhi) is the charioteer, mind (manas) is the reins, senses are the horses, (3) The choice between Shreya (the good/spiritual) and Preya (the pleasant/material) — the wise choose Shreya, (4) The Self is subtler than the subtlest, greater than the greatest.',
    tags: ['upanishad', 'katha', 'nachiketa', 'yama', 'atman', 'death', 'self'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Katha Upanishad'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Mundaka Upanishad - Two Types of Knowledge',
    content: 'द्वे विद्ये वेदितव्ये इति — परा चैवापरा च | The Mundaka Upanishad distinguishes two types of knowledge: (1) Apara Vidya (lower knowledge) — the four Vedas, phonetics, ritual, grammar, etymology, meter, astronomy — worldly and scriptural learning, (2) Para Vidya (higher knowledge) — direct knowledge of the imperishable Brahman. "सत्यमेव जयते" (Truth alone triumphs) — this famous phrase, now India\'s national motto, comes from Mundaka 3.1.6. The Upanishad also teaches the metaphor of two birds on a tree — one eats the fruit (jiva), the other watches (Atman).',
    tags: ['upanishad', 'mundaka', 'para-vidya', 'apara-vidya', 'satyameva-jayate', 'knowledge'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Mundaka Upanishad'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Chandogya Upanishad - Tat Tvam Asi (That Thou Art)',
    content: 'तत् त्वम् असि — "Tat Tvam Asi" (That Thou Art) is the Mahavakya (great saying) from Chandogya Upanishad 6.8.7. Sage Uddalaka teaches his son Shvetaketu: just as salt dissolved in water is invisible yet pervades every drop, so the subtle essence (Brahman) pervades all existence and is your true Self. This is one of the four Mahavakyas: (1) Tat Tvam Asi - Chandogya, (2) Aham Brahmasmi (I am Brahman) - Brihadaranyaka, (3) Prajnanam Brahma (Consciousness is Brahman) - Aitareya, (4) Ayam Atma Brahma (This Self is Brahman) - Mandukya.',
    tags: ['upanishad', 'chandogya', 'tat-tvam-asi', 'mahavakya', 'brahman', 'atman', 'identity'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Chandogya Upanishad 6.8.7'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Brihadaranyaka Upanishad - Aham Brahmasmi',
    content: 'अहं ब्रह्मास्मि — "Aham Brahmasmi" (I am Brahman) from Brihadaranyaka Upanishad 1.4.10. This is the second Mahavakya. Key teachings: (1) The dialogue of Yajnavalkya and Maitreyi on the nature of the Self — "It is not for the sake of the husband that the husband is loved, but for the sake of the Self," (2) The doctrine of "neti neti" — Brahman is described by negation: "not this, not this," (3) The Self is the inner controller (Antaryami) of all beings, (4) "असतो मा सद्गमय, तमसो मा ज्योतिर्गमय, मृत्योर्मा अमृतं गमय" — Lead me from untruth to truth, from darkness to light, from death to immortality.',
    tags: ['upanishad', 'brihadaranyaka', 'aham-brahmasmi', 'mahavakya', 'yajnavalkya', 'neti-neti', 'self'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Brihadaranyaka Upanishad'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Taittiriya Upanishad - Pancha Kosha (Five Sheaths)',
    content: 'The Taittiriya Upanishad teaches the Pancha Kosha (Five Sheaths) model of the human being: (1) Annamaya Kosha — physical body (food sheath), (2) Pranamaya Kosha — vital breath/energy body, (3) Manomaya Kosha — mental body (mind sheath), (4) Vijnanamaya Kosha — intellectual/wisdom body, (5) Anandamaya Kosha — bliss body (innermost sheath). Beyond all five sheaths is the Atman. This model is foundational for Vedantic psychology and Yoga therapy. Also contains the famous convocation address: "सत्यं वद। धर्मं चर।" — Speak the truth. Practice righteousness.',
    tags: ['upanishad', 'taittiriya', 'pancha-kosha', 'sheaths', 'atman', 'psychology'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Taittiriya Upanishad'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Mandukya Upanishad - Four States of Consciousness',
    content: 'The Mandukya Upanishad analyzes OM (AUM) and four states of consciousness: (1) Vaishvanara (Waking - A) — awareness of external world through senses, (2) Taijasa (Dreaming - U) — awareness of internal world, subtle impressions, (3) Prajna (Deep Sleep - M) — undifferentiated consciousness, bliss, no desires, (4) Turiya (The Fourth - Silence) — pure consciousness beyond all states, the true Self. Gaudapada\'s Karika on this Upanishad established Ajativada (non-origination doctrine): nothing is ever born, all is Brahman. This is the shortest Upanishad with just 12 verses but considered the essence of all Upanishads.',
    tags: ['upanishad', 'mandukya', 'aum', 'consciousness', 'turiya', 'gaudapada', 'states'],
    sourceType: 'upanishadic-text',
    sourceTitle: 'Mandukya Upanishad'
  },

  // ============ BHAGAVAD GITA ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Bhagavad Gita - Chapter 2: Sankhya Yoga (The Eternal Self)',
    content: 'वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि | तथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही || (BG 2.22) "As a person puts on new garments, giving up old ones, the soul similarly accepts new material bodies, giving up the old and useless ones." Key teachings of Chapter 2: (1) The soul is eternal, indestructible — neither born nor dies, (2) Perform duty without attachment to results (Nishkama Karma), (3) The Sthitaprajna (person of steady wisdom) is not shaken by joy or sorrow, (4) "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन" — You have a right to perform your duties, but you are not entitled to the fruits of your actions.',
    tags: ['gita', 'bhagavad-gita', 'sankhya', 'atman', 'soul', 'karma', 'nishkama', 'sthitaprajna'],
    sourceType: 'scripture',
    sourceTitle: 'Bhagavad Gita Chapter 2'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Bhagavad Gita - Chapter 3: Karma Yoga (Path of Action)',
    content: 'कर्मणैव हि संसिद्धिमास्थिता जनकादयः | (BG 3.20) "By action alone, great kings like Janaka attained perfection." Karma Yoga teaches: (1) No one can remain without action even for a moment — all are driven by the gunas of Prakriti, (2) Selfless action purifies the mind, (3) The wise should act without attachment to set an example (lokasamgraha), (4) Action performed as yajna (sacrifice) liberates, while selfish action binds, (5) Arjuna must fight as his Svadharma (personal duty as a Kshatriya), (6) Desire and anger born of Rajoguna are the enemies of knowledge.',
    tags: ['gita', 'bhagavad-gita', 'karma-yoga', 'action', 'svadharma', 'gunas', 'yajna'],
    sourceType: 'scripture',
    sourceTitle: 'Bhagavad Gita Chapter 3'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Bhagavad Gita - Chapter 4: Jnana Yoga (Path of Knowledge)',
    content: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत | अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् || (BG 4.7) "Whenever there is a decline of Dharma and rise of Adharma, I manifest Myself." Chapter 4 teaches: (1) The divine descent (Avatara doctrine) — God incarnates age after age, (2) Four types of devotees approach God, (3) The fire of knowledge burns all karmic bonds, (4) "श्रद्धावान् लभते ज्ञानम्" — The faithful attain knowledge, (5) The sword of knowledge cuts the knot of doubt.',
    tags: ['gita', 'bhagavad-gita', 'jnana-yoga', 'avatara', 'knowledge', 'dharma', 'incarnation'],
    sourceType: 'scripture',
    sourceTitle: 'Bhagavad Gita Chapter 4'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Bhagavad Gita - Chapter 6: Dhyana Yoga (Meditation)',
    content: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय | (BG 2.48) Chapter 6 teaches meditation practice: (1) The yogi should sit in a clean place on kusha grass, deerskin, and cloth, (2) Hold body, head and neck erect, gaze fixed on the tip of the nose, (3) The mind must be restrained like a lamp in a windless place, (4) "आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः" — The self is the friend of the self, and the self is the enemy of the self (BG 6.5), (5) Moderation in eating, sleeping, recreation and work is prescribed. Even if one falls from yoga, no good effort is ever lost.',
    tags: ['gita', 'bhagavad-gita', 'dhyana-yoga', 'meditation', 'yoga', 'mind-control'],
    sourceType: 'scripture',
    sourceTitle: 'Bhagavad Gita Chapter 6'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Bhagavad Gita - Chapter 11: Vishvarupa (Universal Form)',
    content: 'Chapter 11 reveals Krishna\'s Vishvarupa (Universal Form) to Arjuna. Arjuna sees: all gods, sages, celestial serpents, infinite mouths and eyes, the entire universe in one place within the body of the God of gods. He sees Time (Kala) as the destroyer: "कालोऽस्मि लोकक्षयकृत्प्रवृद्धो" — "I am Time, the great destroyer of the world." Arjuna trembles and declares: "You are the primal God, the ancient Purusha, the supreme refuge of this universe." Only through exclusive devotion (bhakti) can this form be truly known.',
    tags: ['gita', 'bhagavad-gita', 'vishvarupa', 'universal-form', 'kala', 'time', 'bhakti'],
    sourceType: 'scripture',
    sourceTitle: 'Bhagavad Gita Chapter 11'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Bhagavad Gita - Chapter 18: Moksha Sanyasa Yoga (Liberation)',
    content: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज | अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः || (BG 18.66) "Abandon all varieties of dharma and just surrender unto Me. I shall deliver you from all sinful reactions. Do not fear." Chapter 18 summarizes all paths: (1) Three types of knowledge, action, doer, intellect, and happiness (sattvic, rajasic, tamasic), (2) Svadharma — better to perform one\'s own duty imperfectly than another\'s perfectly, (3) Ultimate teaching: combine Jnana, Karma, and Bhakti yoga, (4) "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः" — Where there is Krishna and Arjuna, there is victory.',
    tags: ['gita', 'bhagavad-gita', 'moksha', 'surrender', 'liberation', 'svadharma', 'gunas'],
    sourceType: 'scripture',
    sourceTitle: 'Bhagavad Gita Chapter 18'
  },

  // ============ VEDANTA & PHILOSOPHY ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Brahma Sutras - Systematic Vedanta',
    content: 'अथातो ब्रह्मजिज्ञासा | "Now, therefore, the inquiry into Brahman." The Brahma Sutras (Vedanta Sutras) by Badarayana systematize Upanishadic teachings in 555 sutras across 4 chapters: (1) Samanvaya — all Upanishadic texts point to Brahman as the ultimate reality, (2) Avirodha — Brahman doctrine is free from contradictions, (3) Sadhana — means of realization (meditation, knowledge), (4) Phala — the fruit is liberation (moksha). Three major commentaries: Shankara (Advaita - non-dualism), Ramanuja (Vishishtadvaita - qualified non-dualism), Madhva (Dvaita - dualism).',
    tags: ['vedanta', 'brahma-sutras', 'philosophy', 'brahman', 'shankara', 'ramanuja', 'madhva'],
    sourceType: 'philosophical-text',
    sourceTitle: 'Brahma Sutras of Badarayana'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Advaita Vedanta - Shankaracharya\'s Non-Dualism',
    content: 'ब्रह्म सत्यं जगन्मिथ्या जीवो ब्रह्मैव नापरः | Shankaracharya\'s Advaita Vedanta teaches: (1) Brahman alone is real (Sat), (2) The world is appearance/superimposition (Mithya/Adhyasa), (3) The individual self (Jiva) is identical with Brahman, (4) Ignorance (Avidya/Maya) causes the perception of duality, (5) Liberation (Moksha) is the removal of ignorance through Jnana (knowledge). Key concepts: Vivartavada (apparent transformation), three levels of reality — Paramarthika (absolute), Vyavaharika (empirical), Pratibhasika (illusory). Famous works: Vivekachudamani, Atma Bodha, Upadesa Sahasri.',
    tags: ['vedanta', 'advaita', 'shankara', 'non-dualism', 'brahman', 'maya', 'liberation'],
    sourceType: 'philosophical-text',
    sourceTitle: 'Adi Shankaracharya - Advaita Vedanta'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Samkhya Philosophy - Purusha and Prakriti',
    content: 'Samkhya (founded by Kapila Muni) is one of the six Darshanas (orthodox philosophical systems). Core principles: (1) Reality consists of two eternal principles — Purusha (pure consciousness, inactive) and Prakriti (material nature, active), (2) Prakriti has three Gunas: Sattva (purity/goodness), Rajas (passion/activity), Tamas (darkness/inertia), (3) Evolution: from Prakriti emerges Mahat (cosmic intelligence), then Ahamkara (ego), then Manas (mind), 5 Jnanendriyas (sense organs), 5 Karmendriyas (action organs), 5 Tanmatras (subtle elements), 5 Mahabhutas (gross elements) — 25 tattvas total, (4) Liberation comes when Purusha discriminates itself from Prakriti.',
    tags: ['samkhya', 'darshana', 'philosophy', 'purusha', 'prakriti', 'gunas', 'tattvas', 'kapila'],
    sourceType: 'philosophical-system',
    sourceTitle: 'Samkhya Karika of Ishvarakrishna'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Nyaya Philosophy - Logic and Epistemology',
    content: 'Nyaya (founded by Gautama/Aksapada) is the Indian system of logic and epistemology. Four Pramanas (valid means of knowledge): (1) Pratyaksha (perception) — direct sensory knowledge, (2) Anumana (inference) — logical reasoning (e.g., smoke implies fire), (3) Upamana (comparison) — knowledge by analogy, (4) Shabda (testimony) — reliable verbal testimony. The Nyaya Syllogism has 5 members: Pratijna (thesis), Hetu (reason), Udaharana (example), Upanaya (application), Nigamana (conclusion). Nyaya established the framework for debate (Vada, Jalpa, Vitanda) and logical fallacies (Hetvabhasa).',
    tags: ['nyaya', 'darshana', 'logic', 'epistemology', 'pramana', 'syllogism', 'gautama'],
    sourceType: 'philosophical-system',
    sourceTitle: 'Nyaya Sutras of Gautama'
  },

  // ============ AYURVEDA (DETAILED) ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Charaka Samhita - Principles of Ayurvedic Medicine',
    content: 'The Charaka Samhita is the foundational text of Ayurveda (internal medicine). Key principles: (1) Ayu (life) = union of Sharira (body), Indriya (senses), Sattva (mind), Atma (soul), (2) Health (Swasthya) = balanced doshas, proper digestion (Agni), healthy tissues (Dhatus), proper waste elimination (Malas), happy mind and soul, (3) Eight branches (Ashtanga): Kayachikitsa (internal medicine), Shalya (surgery), Shalakya (ENT/ophthalmology), Kaumarabhritya (pediatrics), Agada (toxicology), Rasayana (rejuvenation), Vajikarana (aphrodisiacs), Bhuta Vidya (psychiatry), (4) "शरीरमाद्यं खलु धर्मसाधनम्" — The body is the primary instrument for practicing Dharma.',
    tags: ['ayurveda', 'charaka', 'medicine', 'health', 'doshas', 'ashtanga'],
    sourceType: 'ayurvedic-text',
    sourceTitle: 'Charaka Samhita - Sutrasthana'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Sushruta Samhita - Father of Surgery',
    content: 'The Sushruta Samhita is the world\'s oldest surgical text. Sushruta is called the "Father of Surgery" and "Father of Plastic Surgery." Key contributions: (1) Rhinoplasty (nose reconstruction) — described 2600+ years ago, (2) Over 120 surgical instruments described, (3) Classification of 1120 diseases, (4) Surgical procedures: cataract surgery (couching), cesarean section, fracture management, (5) Anatomy studied through dissection of cadavers, (6) Six seasons of wound healing, (7) Concept of Marma (vital points) — 107 points where injury can be fatal/disabling. Practice on vegetables and animal tissues before operating on humans was prescribed.',
    tags: ['ayurveda', 'sushruta', 'surgery', 'medicine', 'rhinoplasty', 'marma', 'anatomy'],
    sourceType: 'ayurvedic-text',
    sourceTitle: 'Sushruta Samhita'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Ritucharya - Seasonal Regimen in Ayurveda',
    content: 'Ritucharya (seasonal routine) from Charaka Samhita prescribes diet and lifestyle for six seasons: (1) Shishira (Late Winter, Jan-Feb) — sweet, sour, salty foods; sesame oil massage, (2) Vasanta (Spring, Mar-Apr) — light foods, barley, honey; exercise to counter Kapha accumulation, (3) Grishma (Summer, May-Jun) — sweet, cold, liquid foods; avoid salty/spicy; moonlight walks, (4) Varsha (Monsoon, Jul-Aug) — sour, salty foods; avoid raw food; Panchakarma recommended, (5) Sharad (Autumn, Sep-Oct) — sweet, bitter foods; Pitta pacification; Virechana therapy, (6) Hemanta (Early Winter, Nov-Dec) — nourishing, warm foods; oil massage; strength builds. The concept of Sadvritta (ethical conduct) and Dinacharya (daily routine) complements Ritucharya.',
    tags: ['ayurveda', 'ritucharya', 'seasonal', 'diet', 'lifestyle', 'dinacharya', 'wellness'],
    sourceType: 'ayurvedic-practice',
    sourceTitle: 'Charaka Samhita - Sutrasthana Chapter 6'
  },

  // ============ YOGA TEXTS ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Hatha Yoga Pradipika - Science of Physical Yoga',
    content: 'The Hatha Yoga Pradipika (15th century, Swami Swatmarama) is the primary text on Hatha Yoga. Four chapters: (1) Asana — 15 asanas described including Padmasana, Siddhasana, Bhadrasana; dietary guidelines for yogis (Mitahara), (2) Pranayama — 8 Kumbhakas (breath retentions): Surya Bhedana, Ujjayi, Sitkari, Shitali, Bhastrika, Bhramari, Murcha, Plavini; Shatkarma (6 purifications): Dhauti, Basti, Neti, Trataka, Nauli, Kapalbhati, (3) Mudra — 10 mudras including Maha Mudra, Khechari, Viparita Karani; awakening of Kundalini, (4) Samadhi — Nada Anusandhana (meditation on inner sound), union of Prana and Apana, achievement of Raja Yoga.',
    tags: ['yoga', 'hatha', 'asana', 'pranayama', 'kundalini', 'mudra', 'shatkarma'],
    sourceType: 'yogic-text',
    sourceTitle: 'Hatha Yoga Pradipika by Swatmarama'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Patanjali Yoga Sutras - Chitta Vritti Nirodha',
    content: 'योगश्चित्तवृत्तिनिरोधः | (YS 1.2) "Yoga is the cessation of the modifications of the mind." Patanjali\'s Yoga Sutras (196 sutras in 4 chapters): (1) Samadhi Pada — definition of yoga, five vrittis (right knowledge, wrong knowledge, imagination, sleep, memory), practice (abhyasa) and detachment (vairagya), Ishvara Pranidhana, (2) Sadhana Pada — Kriya Yoga (tapas, svadhyaya, ishvara pranidhana), five Kleshas (avidya, asmita, raga, dvesha, abhinivesha), Ashtanga Yoga, (3) Vibhuti Pada — Dharana, Dhyana, Samadhi, Samyama, siddhis (supernatural powers), (4) Kaivalya Pada — liberation, nature of consciousness, gunas cease their effect.',
    tags: ['yoga', 'patanjali', 'sutras', 'chitta', 'vritti', 'samadhi', 'ashtanga', 'kaivalya'],
    sourceType: 'yogic-text',
    sourceTitle: 'Yoga Sutras of Patanjali'
  },

  // ============ DHARMASHASTRA ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Dharmashastra - Sources and Principles of Dharma',
    content: 'Dharmashastra codifies Hindu law and social ethics. Four sources of Dharma: (1) Shruti (Vedas — highest authority), (2) Smriti (remembered tradition — Manusmriti, Yajnavalkya Smriti), (3) Sadachara (conduct of the virtuous), (4) Atmatushti (self-satisfaction/conscience). Four Purusharthas (goals of human life): (1) Dharma (righteousness/duty), (2) Artha (wealth/prosperity), (3) Kama (desire/pleasure), (4) Moksha (liberation — ultimate goal). Four Ashramas (stages of life): Brahmacharya (student), Grihastha (householder — the pillar supporting all others), Vanaprastha (retirement), Sannyasa (renunciation).',
    tags: ['dharma', 'dharmashastra', 'purushartha', 'ashrama', 'ethics', 'law', 'smriti'],
    sourceType: 'legal-text',
    sourceTitle: 'Dharmashastra Tradition'
  },

  // ============ SANSKRIT GRAMMAR & LANGUAGE ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Panini\'s Ashtadhyayi - The World\'s First Formal Grammar',
    content: 'Panini\'s Ashtadhyayi (c. 4th century BCE) contains 3,959 sutras organizing Sanskrit grammar. Considered the first formal grammar in any language and a precursor to modern computational linguistics. Key concepts: (1) Pratyahara — notation system using abbreviated codes (like Shiva Sutras), (2) Sandhi — rules for sound combination at word junctures, (3) Samasa — compound word formation (Tatpurusha, Dvandva, Bahuvrihi, Avyayibhava), (4) Dhatu — verb roots (~2,000 roots), (5) Vibhakti — 8 cases (nominative through vocative), (6) Meta-rules like "purvaparanityantarangatopavidhyanam uttarottaram baliyah." Panini\'s work influenced modern linguistics, especially Chomsky\'s generative grammar.',
    tags: ['sanskrit', 'grammar', 'panini', 'ashtadhyayi', 'linguistics', 'language'],
    sourceType: 'grammatical-text',
    sourceTitle: 'Ashtadhyayi of Panini'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Sanskrit Shlokas - Essential Subhashitas (Wise Sayings)',
    content: 'Famous Sanskrit Subhashitas (wise sayings): (1) "विद्या ददाति विनयं" — Knowledge gives humility, humility gives character, character gives wealth, wealth gives dharma, dharma gives happiness, (2) "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः" — Tasks are accomplished through effort, not merely by wishing, (3) "परोपकाराय सतां विभूतयः" — The wealth of the good is for the benefit of others, (4) "अहिंसा परमो धर्मः" — Non-violence is the highest dharma, (5) "वसुधैव कुटुम्बकम्" — The world is one family (Maha Upanishad 6.71), (6) "सर्वे भवन्तु सुखिनः" — May all beings be happy.',
    tags: ['sanskrit', 'subhashita', 'wisdom', 'proverbs', 'ethics', 'values', 'ahimsa'],
    sourceType: 'literary-collection',
    sourceTitle: 'Sanskrit Subhashita Compilation'
  },

  // ============ ADDITIONAL VEDIC CONCEPTS ============
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Yajurveda - Rituals and Mantras',
    content: 'The Yajurveda is the Veda of sacrificial formulas and rituals. Two recensions: (1) Shukla (White) Yajurveda — mantras arranged for ritual use, includes Vajasaneyi Samhita with famous Isha Upanishad, (2) Krishna (Black) Yajurveda — mantras interspersed with prose explanations, includes Taittiriya Samhita. Key mantras: "ॐ सह नाववतु, सह नौ भुनक्तु" — May He protect us both, may He nourish us both. The Shatarudriya hymn glorifying Rudra/Shiva is from Yajurveda. Contains instructions for Agnihotra (fire sacrifice), Darsha-Purnamasa (new/full moon sacrifices), and Ashvamedha (horse sacrifice).',
    tags: ['yajurveda', 'veda', 'ritual', 'sacrifice', 'mantra', 'agnihotra'],
    sourceType: 'vedic-text',
    sourceTitle: 'Yajurveda'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Samaveda - The Veda of Music and Chant',
    content: 'The Samaveda is the Veda of melodies and chants. Krishna says in the Gita: "वेदानां सामवेदोऽस्मि" — Among the Vedas, I am the Samaveda (BG 10.22). Key features: (1) Most verses borrowed from Rigveda but set to musical notation (Svara), (2) Seven notes (Saptasvara): Sa, Ri, Ga, Ma, Pa, Dha, Ni — origin of Indian classical music (Raga system), (3) Sung by the Udgata priest during Soma sacrifice, (4) Two main parts: Purvarchika (hymns) and Uttararchika (chants), (5) Gandharva Veda (musicology) is its Upaveda. The Samaveda establishes that sacred sound and music are paths to the Divine.',
    tags: ['samaveda', 'veda', 'music', 'chant', 'saptasvara', 'gandharva'],
    sourceType: 'vedic-text',
    sourceTitle: 'Samaveda'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Atharvaveda - Healing, Protection, and Daily Life',
    content: 'The Atharvaveda deals with daily life, healing, and protection. Unlike the other three Vedas focused on ritual, it addresses practical concerns: (1) Healing hymns (Bheshaja Suktas) — herbal medicine, fever treatment, wound healing, (2) Protection mantras against disease, enemies, evil spirits, (3) Marriage and love hymns (including the famous Surya\'s wedding hymn), (4) Royal consecration and governance, (5) Philosophical hymns (Prithvi Sukta — Earth hymn, "माता भूमिः पुत्रोऽहं पृथिव्याः" — Earth is my mother, I am her son), (6) Ayurveda is considered the Upaveda of Atharvaveda. Contains 731 hymns in 20 books.',
    tags: ['atharvaveda', 'veda', 'healing', 'medicine', 'protection', 'herbs', 'prithvi'],
    sourceType: 'vedic-text',
    sourceTitle: 'Atharvaveda'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Karma and Samsara - The Cycle of Action and Rebirth',
    content: 'The doctrine of Karma (action) and Samsara (cycle of rebirth) is central to Indian philosophy. Three types of Karma: (1) Sanchita Karma — accumulated karma from all past lives (vast storehouse), (2) Prarabdha Karma — portion of Sanchita that has begun to bear fruit in this life (cannot be avoided), (3) Kriyamana/Agami Karma — karma being created now through current actions. Karma operates through Adrishta (unseen force). Liberation (Moksha) is freedom from the cycle of Samsara. Different paths: Jnana (knowledge), Bhakti (devotion), Karma Yoga (selfless action), Dhyana (meditation). "कर्म प्रधानं विश्वमिदम्" — This universe is governed by Karma.',
    tags: ['karma', 'samsara', 'rebirth', 'moksha', 'liberation', 'philosophy', 'ethics'],
    sourceType: 'philosophical-concept',
    sourceTitle: 'Vedantic & Buddhist Philosophy'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Nadi Shastra and Chakra System',
    content: 'The subtle body (Sukshma Sharira) contains 72,000 Nadis (energy channels) and 7 major Chakras: (1) Muladhara (Root, base of spine) — Earth element, survival, Kundalini resides here, (2) Svadhisthana (Sacral) — Water element, creativity, emotions, (3) Manipura (Solar Plexus) — Fire element, willpower, digestion, (4) Anahata (Heart) — Air element, love, compassion, seat of Jivatma, (5) Vishuddha (Throat) — Ether element, expression, purification, (6) Ajna (Third Eye) — command center, intuition, Guru chakra, (7) Sahasrara (Crown) — thousand-petaled lotus, union with Brahman. Three main Nadis: Ida (left, lunar, cooling), Pingala (right, solar, heating), Sushumna (central, liberation). Kundalini awakening rises through Sushumna to Sahasrara.',
    tags: ['chakra', 'nadi', 'kundalini', 'subtle-body', 'energy', 'yoga', 'tantra'],
    sourceType: 'tantric-text',
    sourceTitle: 'Shat Chakra Nirupana & Yoga Texts'
  },
];

async function seedSanskrit() {
  try {
    console.log('🕉️  Seeding expanded Sanskrit knowledge base...');
    
    const results = await db.insert(aryaKnowledge).values(sanskritKnowledgeUnits).returning();
    
    console.log(`✅ Successfully inserted ${results.length} Sanskrit/Vedic knowledge units`);
    console.log('');
    console.log('   📜 Rigveda hymns: 3');
    console.log('   📖 Upanishads: 8 (Isha, Kena, Katha, Mundaka, Chandogya, Brihadaranyaka, Taittiriya, Mandukya)');
    console.log('   🙏 Bhagavad Gita chapters: 5 (Ch 2, 3, 4, 6, 11, 18)');
    console.log('   🧠 Vedanta & Philosophy: 4 (Brahma Sutras, Advaita, Samkhya, Nyaya)');
    console.log('   🌿 Ayurveda texts: 3 (Charaka, Sushruta, Ritucharya)');
    console.log('   🧘 Yoga texts: 2 (Hatha Yoga Pradipika, Patanjali Sutras)');
    console.log('   📋 Dharmashastra: 1');
    console.log('   📝 Grammar & Language: 2 (Panini, Subhashitas)');
    console.log('   📚 Additional Vedic: 4 (Yajurveda, Samaveda, Atharvaveda, Karma)');
    console.log('   ⚡ Chakra & Nadi: 1');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedSanskrit();
