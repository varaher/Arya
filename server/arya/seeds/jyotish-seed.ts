/**
 * Jyotish (Vedic Astrology) Core Knowledge Seed
 * Sources: Phaladeepika (Mantreshwara) — B.V. Raman translation
 *          Brihat Parashara Hora Shastra — B.V. Raman translation
 *
 * Run via: POST /api/admin/knowledge/seed-jyotish
 */

export interface JyotishUnit {
  topic: string;
  content: string;
  tags: string[];
  source: string;
}

export const jyotishSeedUnits: JyotishUnit[] = [

  // ── FOUNDATIONS ──────────────────────────────────────────────

  {
    topic: "The Purpose of Jyotish — Why We Study the Chart",
    content: `Jyotish — the eye of the Vedas — exists not to bind a person to fate, but to illuminate the field they are playing in. Brihat Parashara Hora Shastra opens by stating that the planets are the instruments of karma, not its masters. A chart shows the tendencies, timing, and terrain of a life. A wise person uses this light to choose correctly at each juncture — which efforts to intensify, which battles to postpone, which domains will flow easily and which demand extra patience. Phaladeepika reinforces: "The learned astrologer enables men to overcome difficult periods through appropriate action." Jyotish is therefore a tool of self-knowledge and timely action, not fatalism.`,
    tags: ["jyotish", "purpose", "introduction", "karma", "parashara", "phaladeepika", "philosophy"],
    source: "Brihat Parashara Hora Shastra Ch.1; Phaladeepika Ch.1",
  },

  {
    topic: "The Nine Planets (Navagrahas) — Their Core Nature",
    content: `Brihat Parashara describes the nine grahas as cosmic forces that mediate karma:
• Sun (Surya): Soul, authority, father, government, vitality. Sattvic. Fiery, masculine.
• Moon (Chandra): Mind, emotions, mother, public, fluids. Sattvic. Watery, feminine.
• Mars (Mangala): Energy, courage, siblings, land, surgery, conflict. Tamasic. Fiery, masculine.
• Mercury (Budha): Intellect, communication, trade, mathematics, skill. Rajasic. Earthy, neutral.
• Jupiter (Guru): Wisdom, teaching, children, wealth, dharma, expansion. Sattvic. Etheric, masculine.
• Venus (Shukra): Beauty, pleasure, marriage, creativity, luxury. Rajasic. Watery, feminine.
• Saturn (Shani): Discipline, delay, karma, servants, longevity, restriction. Tamasic. Airy, neutral.
• Rahu: Obsession, ambition, illusion, foreign, unconventional paths. Shadow planet, amplifies.
• Ketu: Liberation, detachment, past-life mastery, spirituality, sudden loss. Shadow planet, dissolves.
A planet's significations colour every house it sits in and every planet it aspects.`,
    tags: ["navagrahas", "planets", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu", "graha", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.3–4",
  },

  {
    topic: "Planetary Dignities — Exaltation, Own Sign, Debilitation",
    content: `Phaladeepika dedicates a full chapter to planetary strength from sign placement. A planet gives its best results in its exaltation sign, reliable results in its own sign, and weakened results in debilitation.
Exaltation signs: Sun — Aries (10°); Moon — Taurus (3°); Mars — Capricorn (28°); Mercury — Virgo (15°); Jupiter — Cancer (5°); Venus — Pisces (27°); Saturn — Libra (20°).
Debilitation signs are exactly opposite. Debilitated planets do not simply fail — they create themes of struggle and eventual mastery in that planet's domain. Parashara adds: a debilitated planet in kendra (angular house) with a cancellation (neechabhanga) yoga can produce exceptionally capable people, especially in the areas of that planet.`,
    tags: ["dignity", "exaltation", "debilitation", "uccha", "neecha", "planetary strength", "phaladeepika"],
    source: "Phaladeepika Ch.4; Brihat Parashara Hora Shastra Ch.26",
  },

  // ── THE 12 HOUSES ────────────────────────────────────────────

  {
    topic: "1st House (Lagna / Ascendant) — Self, Body, Personality",
    content: `Phaladeepika: The first house (Lagna) represents the self — the physical body, overall vitality, personality, and the starting conditions of the life. It is the most important house in the chart. The sign rising at birth colours the entire temperament. The lord of the Lagna and any planets placed here are primary significators of the individual's character and how they engage with life. A strong Lagna lord placed well gives resilience, clarity of purpose, and natural confidence. A weak or afflicted Lagna lord makes life themes of identity and health more challenging. The Lagna is where external circumstances meet the inner soul — it is the threshold.`,
    tags: ["1st house", "lagna", "ascendant", "self", "body", "personality", "phaladeepika"],
    source: "Phaladeepika Ch.6",
  },

  {
    topic: "2nd House (Dhana Bhava) — Wealth, Family, Speech",
    content: `Phaladeepika: The second house governs accumulated wealth, family of origin, speech, face, food, and what we value. It is the storehouse of resources — financial and familial. Benefics here (Jupiter, Venus, unafflicted Moon) generally indicate financial ease and harmonious family. Malefics like Saturn or Rahu can indicate hard-earned wealth, disrupted family dynamics, or harsh speech. The 2nd lord placed strongly in a kendra or trikona supports wealth creation. Speech ruled here — a well-placed Mercury or Jupiter in the 2nd blesses with eloquence and the ability to earn through words.`,
    tags: ["2nd house", "dhana", "wealth", "speech", "family", "phaladeepika"],
    source: "Phaladeepika Ch.7",
  },

  {
    topic: "3rd House (Sahaja Bhava) — Courage, Siblings, Communication, Skill",
    content: `Phaladeepika: The third house is the house of effort, courage, and communication. It governs siblings (especially younger), short journeys, writing, hands and arms, and the willpower to initiate action. Mars is the natural significator. A strong 3rd house gives enterprise, boldness, and manual or communicative skill. The 3rd is also the first of the upachaya (growing) houses — planets here, including malefics, tend to produce better results over time as the native applies consistent effort. Those with strong 3rd houses often succeed through persistence, crafts, or media.`,
    tags: ["3rd house", "courage", "siblings", "communication", "effort", "writing", "phaladeepika"],
    source: "Phaladeepika Ch.8",
  },

  {
    topic: "4th House (Sukha Bhava) — Home, Mother, Inner Peace, Property",
    content: `Phaladeepika: The fourth house is the seat of inner happiness (sukha), the mother, home and property, vehicles, and one's emotional foundation. Moon is the natural significator. A strong 4th indicates a stable, nurturing upbringing and a person who is inwardly settled — able to feel at home wherever they are. Malefics in the 4th (especially Saturn or Rahu) can indicate early separation from home, difficult relationship with the mother, or restlessness in domestic life. The 4th also governs the heart — both the physical organ and emotional wellbeing. Land and real estate are activated when the 4th lord and Venus interact well.`,
    tags: ["4th house", "home", "mother", "property", "inner peace", "sukha", "phaladeepika"],
    source: "Phaladeepika Ch.9",
  },

  {
    topic: "5th House (Putra Bhava) — Intellect, Children, Creativity, Past Merit",
    content: `Phaladeepika: The fifth house is among the most auspicious — a trikona (trine) of dharma. It governs children, creative intelligence, past-life merit (poorva punya), mantra and spiritual practices, speculation, romance, and the higher mind. Jupiter is the natural significator. A strong 5th lord placed in a good house from the Lagna indicates good fortune earned through past effort — things that come to the person relatively easily. It also governs the quality of one's thinking and the ability to counsel others. Leaders, advisors, teachers, and creative artists often have a prominent 5th.`,
    tags: ["5th house", "putra", "children", "creativity", "intellect", "past merit", "poorva punya", "phaladeepika"],
    source: "Phaladeepika Ch.10",
  },

  {
    topic: "6th House (Ripu/Roga Bhava) — Enemies, Health, Service, Daily Work",
    content: `Phaladeepika: The sixth house is a dusthana (difficult house) that governs enemies, debts, diseases, litigation, service, and daily routine work. Yet it is also an upachaya — planets here improve with time, and strong malefics here can actually destroy enemies and overcome obstacles effectively (the principle of malefics doing well in the 3rd, 6th, 10th, 11th). Mars and Saturn placed in the 6th can make formidable competitors who outlast opposition. A strong 6th lord away from the Lagna reduces health problems. The 6th also governs service — those with a prominent 6th are often excellent in healthcare, legal work, military service, or any field requiring problem-solving under pressure.`,
    tags: ["6th house", "enemies", "health", "service", "disease", "dusthana", "phaladeepika"],
    source: "Phaladeepika Ch.11",
  },

  {
    topic: "7th House (Kalatra Bhava) — Marriage, Partnership, Public",
    content: `Phaladeepika: The seventh house governs marriage and intimate partnership, business partnerships, legal contracts, open enemies (known opponents), and one's public persona. Venus is the natural significator. The 7th lord and Venus jointly determine the nature and timing of primary partnerships. Benefics in the 7th generally indicate harmonious, supportive partners. Malefics, while not making partnership impossible, indicate partners who are strong-willed, unconventional, or that the native needs to work harder for relational harmony. The 7th is a kendra and a maraka (death-influencing) house — its health must be examined for overall vitality as well.`,
    tags: ["7th house", "marriage", "partnership", "business partner", "public", "kalatra", "phaladeepika"],
    source: "Phaladeepika Ch.12",
  },

  {
    topic: "8th House (Ayus Bhava) — Transformation, Longevity, Hidden, Research",
    content: `Phaladeepika: The eighth house is the most complex and misunderstood in Jyotish. It governs longevity, chronic illness, sudden events, inheritance, hidden knowledge, occult sciences, transformation, and death and rebirth (literal or metaphorical). Saturn is the natural significator. An afflicted 8th can produce acute crises; a strong 8th with benefic influence often gives deep investigative ability, interest in psychology or spirituality, and the capacity to endure what would break others. Scorpio and the 8th house are often prominent in the charts of researchers, therapists, surgeons, and mystics. Parashara notes: understanding the 8th is understanding the trajectory of the soul.`,
    tags: ["8th house", "transformation", "longevity", "hidden", "research", "occult", "ayus", "phaladeepika"],
    source: "Phaladeepika Ch.13",
  },

  {
    topic: "9th House (Dharma Bhava) — Luck, Father, Teacher, Higher Wisdom",
    content: `Phaladeepika: The ninth house is the pinnacle of the dharma trines and is considered the most auspicious house in the chart — the house of fortune (bhagya), the father, teachers and gurus, higher education, philosophy, religion, long journeys, and accumulated merit. Jupiter is the natural significator. A well-placed 9th lord, especially conjunct or aspected by Jupiter, is the classical marker of a fortunate, purposeful life. People with strong 9ths are often guided by clear values, have excellent mentors, and their larger efforts tend to be supported by circumstances. It represents the blessings that flow from living in alignment with one's deepest values.`,
    tags: ["9th house", "luck", "fortune", "father", "teacher", "dharma", "philosophy", "phaladeepika"],
    source: "Phaladeepika Ch.14",
  },

  {
    topic: "10th House (Karma Bhava) — Career, Reputation, Public Achievement",
    content: `Phaladeepika: The tenth house is the primary house of career, profession, reputation, and public achievement. It is the strongest kendra. Sun is the natural significator of authority and status. The 10th lord, the planet in the 10th, and any planets aspecting it jointly shape the career path. Planets placed in the 10th are magnified in their public expression — a well-placed Jupiter here gives roles in teaching, advising, or law; Saturn gives careers built through sustained effort and responsibility; Mars gives leadership, military, or entrepreneurial paths. The 10th also governs the relationship with authority and one's own exercise of power.`,
    tags: ["10th house", "career", "profession", "reputation", "karma bhava", "achievement", "phaladeepika"],
    source: "Phaladeepika Ch.15",
  },

  {
    topic: "11th House (Labha Bhava) — Gains, Network, Elder Siblings, Aspirations",
    content: `Phaladeepika: The eleventh house governs gains, income from career, fulfillment of desires, network and friends, elder siblings, and larger aspirations. It is an upachaya house — everything here grows with time. Benefics here (especially Jupiter) indicate abundant gains and supportive networks. Even malefics tend to do well in the 11th over time. The 11th lord strongly placed in a kendra or trikona supports consistent financial growth. Rahu in the 11th, while sometimes producing unconventional networks or ambitions, frequently indicates gains from non-traditional or foreign sources. The 11th completes the earning cycle: the 2nd stores, the 10th earns, the 11th gains.`,
    tags: ["11th house", "gains", "income", "network", "desires", "labha", "phaladeepika"],
    source: "Phaladeepika Ch.16",
  },

  {
    topic: "12th House (Vyaya Bhava) — Loss, Liberation, Foreign Lands, Expenses",
    content: `Phaladeepika: The twelfth house is the house of dissolution — expenses, losses, isolation, foreign residence, and ultimately moksha (liberation). Saturn and Ketu are natural significators. A strong 12th with Jupiter or Ketu can indicate deep spiritual practice, foreign success, or work in service institutions (hospitals, ashrams, prisons). Venus in the 12th is often seen in charts with strong sensual indulgences or creative life lived away from home. The 12th house often represents where the person invests energy quietly and invisibly — whether in spiritual practice, creative solitude, or care for others. It is not to be feared but understood as the domain of transcendence.`,
    tags: ["12th house", "loss", "liberation", "foreign", "expenses", "moksha", "vyaya", "phaladeepika"],
    source: "Phaladeepika Ch.17",
  },

  // ── KEY YOGAS ────────────────────────────────────────────────

  {
    topic: "Raja Yogas — Combinations for Power and Achievement",
    content: `Phaladeepika dedicates several chapters to Raja Yogas — planetary combinations producing authority, recognition, and worldly success. The classical definition: when the lord of a kendra (1st, 4th, 7th, 10th) and the lord of a trikona (1st, 5th, 9th) are in mutual association — by conjunction, mutual aspect, or exchange of signs. The Lagna is counted as both kendra and trikona, making its lord doubly powerful. A strong Raja Yoga especially active during its dasha period can bring sudden elevation in career, public recognition, or institutional authority. Phaladeepika notes: the quality of the yoga depends on the strength, dignity, and freedom from affliction of the involved planets.`,
    tags: ["raja yoga", "kendra", "trikona", "achievement", "power", "success", "phaladeepika"],
    source: "Phaladeepika Ch.6",
  },

  {
    topic: "Dhana Yogas — Combinations for Wealth",
    content: `Brihat Parashara and Phaladeepika both list Dhana Yogas (wealth combinations). The key ones: (1) The lords of the 2nd and 11th houses associated with the Lagna lord — the wealth axis strongly connected to self. (2) Jupiter placed in the 2nd, 5th, 9th, or 11th — natural expansion of wealth houses. (3) The 5th and 9th lords in exchange or mutual aspect — the two dharma-trikona lords combining creates deep good fortune. (4) Venus and Jupiter aspecting each other without malefic interference — abundance and prosperity. Parashara notes that Dhana Yogas ripen during the dasha of the participating planets — identifying these periods is key to understanding when wealth opportunities peak.`,
    tags: ["dhana yoga", "wealth", "money", "prosperity", "2nd house", "11th house", "phaladeepika", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.35; Phaladeepika Ch.21",
  },

  {
    topic: "Pancha Mahapurusha Yogas — Five Planetary Greatness Combinations",
    content: `Phaladeepika describes five yogas formed when a non-luminous planet (Mars, Mercury, Jupiter, Venus, Saturn) is in its own or exaltation sign AND placed in a kendra (angular house):
• Ruchaka Yoga (Mars): Military prowess, leadership, physical strength, authority.
• Bhadra Yoga (Mercury): Intelligence, business skill, eloquence, analytical power.
• Hamsa Yoga (Jupiter): Wisdom, spiritual merit, teaching ability, noble character.
• Malavya Yoga (Venus): Artistic talent, luxury, refined taste, charisma.
• Shasha Yoga (Saturn): Administrative ability, discipline, mass support, endurance.
These yogas give the native exceptional capacity in the planet's domain, especially during its dasha. The yoga is most powerful when the planet is unafflicted and the kendra involved is strong.`,
    tags: ["pancha mahapurusha", "ruchaka", "bhadra", "hamsa", "malavya", "shasha", "yoga", "phaladeepika"],
    source: "Phaladeepika Ch.6",
  },

  {
    topic: "Neechabhanga Raja Yoga — Cancellation of Debilitation",
    content: `One of the most significant combinations in Jyotish: when a planet is debilitated but its debilitation is cancelled (neechabhanga), it often produces exceptional results — sometimes exceeding those of an exalted planet. Parashara lists the cancellation conditions: (1) The lord of the debilitation sign is in a kendra from the Lagna or Moon. (2) The planet that would be exalted in that sign is in a kendra. (3) The debilitated planet is in exchange with its debilitation lord. (4) The debilitated planet is aspected by its exaltation lord. People with strong Neechabhanga often rise from difficult circumstances to achieve more than those born with natural advantage. The struggle the planet represents becomes the very source of the eventual mastery.`,
    tags: ["neechabhanga", "debilitation", "cancellation", "yoga", "strength", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.26",
  },

  {
    topic: "Viparita Raja Yoga — Reversal into Fortune",
    content: `Phaladeepika describes a paradoxical and powerful yoga: when the lords of the 6th, 8th, or 12th houses (dusthanas — difficult houses) are placed in each other's houses or in other dusthanas, the difficulties they represent cancel each other, producing unexpected reversals of fortune — often rising from setbacks, benefiting from others' loss, or finding strength in adversity. This yoga is especially powerful for careers in medicine, law, research, investigation, or any field that requires working with difficulty. The native often thrives precisely when circumstances test them most severely. It is a yoga of resilience and unconventional triumph.`,
    tags: ["viparita raja yoga", "6th house", "8th house", "12th house", "reversal", "resilience", "phaladeepika"],
    source: "Phaladeepika Ch.6",
  },

  // ── DASHA SYSTEM ─────────────────────────────────────────────

  {
    topic: "Vimshottari Dasha — The 120-Year Planetary Period System",
    content: `Brihat Parashara establishes the Vimshottari dasha as the primary timing system of Jyotish. The 120-year cycle allocates major periods (mahadashas) to each of the nine grahas: Sun 6 years, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17, Ketu 7, Venus 20. The starting dasha is determined by the Moon's nakshatra (lunar mansion) at birth. Within each mahadasha are nine sub-periods (antardashas) of the same planets in the same sequence, allowing precise timing. Parashara's principle: "The dasha of a strongly placed planet that forms a Raja Yoga will bring its promises to fruition." Conversely, even a well-placed planet in a weak dasha period may not activate its yogas.`,
    tags: ["vimshottari dasha", "timing", "mahadasha", "antardasha", "planetary periods", "nakshatra", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.46",
  },

  {
    topic: "Reading Dasha Timing — When Will Things Happen?",
    content: `Phaladeepika offers a practical framework: to predict when a chart's promises activate, examine the dasha of the planets forming the relevant yoga. A wealth combination involving the 5th and 9th lords will ripen during the dasha of either planet (and especially the sub-period of the other). A marriage yoga involving the 7th lord and Venus will activate during Venus dasha or 7th lord dasha, particularly if transiting Jupiter is aspecting the 7th. The principle: a promise in the natal chart is the potential; the dasha and transit are the triggers. Difficult periods (dashas of malefics ruling dusthana houses) are times for inner consolidation rather than major external expansion — Phaladeepika says "the wise man adjusts his timing to the planetary currents."`,
    tags: ["dasha timing", "prediction", "when", "transit", "mahadasha", "activation", "phaladeepika"],
    source: "Phaladeepika Ch.22",
  },

  // ── NAKSHATRAS ───────────────────────────────────────────────

  {
    topic: "The 27 Nakshatras — Lunar Mansions and Their Qualities",
    content: `Brihat Parashara describes 27 nakshatras (lunar mansions) as the foundational layer of Jyotish, each spanning 13°20' of the zodiac. The Moon's nakshatra at birth determines the vimshottari dasha starting point and significantly colours the emotional nature. The 27 nakshatras are grouped by their motivation (dharma, artha, kama, moksha) and their quality (deva/divine, manushya/human, rakshasa/fierce). Key nakshatras for life themes: Ashwini (beginnings, healing), Rohini (growth, beauty, material life), Ardra (storm, transformation), Pushya (nourishment, teaching), Magha (ancestry, authority), Hasta (skill, craft), Jyeshtha (seniority, protection), Uttara Ashadha (victory after perseverance), Shravana (listening, learning), Uttara Bhadrapada (depth, wisdom). The nakshatra of the Lagna, Sun, and Moon together paint the full portrait of character.`,
    tags: ["nakshatra", "lunar mansion", "moon", "dasha", "character", "parashara", "27 nakshatras"],
    source: "Brihat Parashara Hora Shastra Ch.3",
  },

  // ── PRACTICAL PRINCIPLES ─────────────────────────────────────

  {
    topic: "Planets as Friends and Enemies — Natural and Temporal",
    content: `Brihat Parashara describes two types of planetary relationships — natural (naisargika) and temporal (tatkalika). Natural relationships are fixed: Sun's friends are Moon, Mars, Jupiter; enemies are Venus, Saturn. Moon's friends are Sun, Mercury. Mars: Sun, Moon, Jupiter. Mercury: Sun, Venus. Jupiter: Sun, Moon, Mars. Venus: Mercury, Saturn. Saturn: Mercury, Venus. Temporal friendship is determined by a planet's position relative to another in the natal chart — planets in the 2nd, 3rd, 4th, 10th, 11th, 12th from each other become temporary friends. The combined (panchadha) relationship determines how two planets actually interact in the chart and in life. A natural enemy that is a temporal friend is a neutral; a natural friend that is also temporal friend is the strongest ally.`,
    tags: ["planetary friendship", "natural friends", "enemies", "panchadha", "relationship", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.3",
  },

  {
    topic: "Benefics and Malefics — Who Helps and Who Tests",
    content: `Phaladeepika distinguishes natural and functional benefics/malefics. Natural benefics: Jupiter (strongest), Venus, waxing Moon, and well-associated Mercury. Natural malefics: Saturn (strongest), Mars, Sun, waning Moon, afflicted Mercury. However, functional benefic/malefic status depends entirely on the Lagna. A planet ruling a kendra (1st, 4th, 7th, 10th) loses some natural benefic quality (kendradhipati dosha). The 6th, 8th, and 12th lords become functional malefics regardless of natural nature. Conversely, the 9th and 5th lords are functionally benefic for any Lagna. Phaladeepika: "The same planet can be a benefactor for one Lagna and a source of suffering for another — hence one must always assess by Lagna, not by natural quality alone."`,
    tags: ["benefic", "malefic", "functional", "lagna", "kendradhipati", "assessment", "phaladeepika"],
    source: "Phaladeepika Ch.5",
  },

  {
    topic: "Aspects (Drishti) — How Planets Influence Houses and Each Other",
    content: `Brihat Parashara: All planets cast a full aspect to the 7th house from their position. Mars additionally aspects the 4th and 8th; Jupiter aspects the 5th and 9th; Saturn aspects the 3rd and 10th. These special aspects are full-strength. The 3rd and 10th aspects of planets are quarter-strength; 4th and 8th aspects are half-strength; 5th and 9th aspects are three-quarter-strength. Parashara emphasises that Jupiter's aspect on any house brings its dharmic, expansive influence — even a troubled house receives some protection under Jupiter's drishti. Saturn's special aspect on the 3rd and 10th demands discipline and patience in those areas. Mars aspecting the 7th (from the 1st or 4th) is the source of Kuja/Mangala dosha (Mars affliction), relevant to marriage compatibility assessment.`,
    tags: ["aspect", "drishti", "planetary aspect", "7th aspect", "jupiter aspect", "saturn aspect", "mars aspect", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.26",
  },

  {
    topic: "Using Jyotish for Decision-Making — The Parashara Approach",
    content: `Parashara's counsel is not to use Jyotish passively but actively. Before a major decision — career change, business venture, marriage, relocation — examine: (1) Is the relevant house strong in the natal chart? (2) Is the current dasha of the relevant house lord or significator active? (3) Is Jupiter or the relevant benefic transiting a supportive position? When all three align, the timing is auspicious and effort is well-supported. When the dasha is challenging (e.g., 8th lord period), consolidate rather than expand — repair, reflect, build foundations. Phaladeepika: "A wise man does not plant in winter or reap in spring — he reads the season of his life and acts accordingly." Jyotish gives the farmer his seasons.`,
    tags: ["decision making", "timing", "practical", "dasha", "transit", "action", "parashara", "phaladeepika"],
    source: "Phaladeepika Ch.1; Brihat Parashara Hora Shastra Ch.1",
  },

  {
    topic: "Lagna Lords and Their Strength — Foundation of the Life",
    content: `Phaladeepika: The single most important factor after identifying the Lagna is assessing its lord — its sign placement (is it exalted, own, or debilitated?), house placement (kendra and trikona are best), and aspects received (benefic aspects strengthen; malefic aspects test). A Lagna lord in the 1st, 4th, 5th, 7th, 9th, or 10th with good dignity gives a person resilience, health, and a sense of purpose throughout life. A Lagna lord in the 6th, 8th, or 12th demands more effort and often produces a life lived through adversity before arriving at strength. The Lagna lord's dasha period is always a defining phase — it is when the core self must assert itself and establish its direction.`,
    tags: ["lagna lord", "ascendant lord", "strength", "dignity", "life foundation", "phaladeepika"],
    source: "Phaladeepika Ch.6",
  },

  {
    topic: "Remedies in Jyotish — Strengthening the Planetary Field",
    content: `Brihat Parashara's approach to remedies is practical and layered. Planets can be strengthened through: (1) Gemstones — each planet has a primary gemstone (Ruby for Sun, Pearl for Moon, Red Coral for Mars, Emerald for Mercury, Yellow Sapphire for Jupiter, Diamond for Venus, Blue Sapphire for Saturn). Only gems for functional benefics should be worn. (2) Mantras — repetition of a planet's beeja mantra or deity mantra strengthens its quality in consciousness. (3) Charitable acts — giving items associated with a planet on its day (Saturdays for Saturn, Thursdays for Jupiter, etc.) reduces obstructive influences. (4) Right action — Parashara's deepest teaching: no remedy is more powerful than living in alignment with the dharma the chart indicates. The chart shows your strengths — deploy them fully.`,
    tags: ["remedies", "gemstone", "mantra", "charity", "planetary remedy", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.80–82",
  },

  {
    topic: "Saturn's Lessons — Shani's Role in Growth Through Discipline",
    content: `Phaladeepika gives Saturn a central role not as a malefic to be feared but as the planet of earned results. Saturn governs what takes time — discipline, endurance, the slow accumulation of skill and character. His transits (particularly the 7.5-year Sade Sati when Saturn moves through the 12th, 1st, and 2nd from the natal Moon) are periods of pressure and consolidation, not destruction. Those who use this time for inner work, simplification, and steady effort often emerge with significantly greater depth and capability. Saturn in the 10th (his special aspect position from the 1st) gives careers built through sustained personal effort. Phaladeepika: "Saturn delays, but does not deny, when a person is ready to receive what they have earned."`,
    tags: ["saturn", "shani", "sade sati", "discipline", "timing", "karma", "lesson", "phaladeepika"],
    source: "Phaladeepika Ch.26; transit analysis",
  },

  {
    topic: "Jupiter's Grace — Guru's Role as the Great Benefactor",
    content: `Brihat Parashara calls Jupiter (Brihaspati / Guru) the supreme benefic among all planets — Deva Guru, teacher of the gods, embodiment of dharmic wisdom. Jupiter's placement in the natal chart shows where natural good fortune, wisdom, and expansion flow. In the 1st: wisdom and dignity; 2nd: wealth and family harmony; 5th: creative intelligence and good children; 9th: exceptional fortune and dharmic guidance; 10th: career in teaching, law, or advisory roles. Jupiter's transit through a house (about one year per sign) activates its themes. Jupiter aspecting the 7th from any house brings its blessing. Most importantly, Parashara notes that a strong natal Jupiter acts as a protective buffer throughout the life — the grace that carries one through storms.`,
    tags: ["jupiter", "guru", "benefic", "grace", "wisdom", "fortune", "transit", "parashara"],
    source: "Brihat Parashara Hora Shastra Ch.3; transit chapters",
  },
];

export const JYOTISH_TENANT_ID = "varah";
