import { db } from "./db";
import { aryaKnowledge } from "@shared/schema";

const musicKnowledgeUnits = [
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Natyashastra - The Foundational Treatise on Performing Arts',
    content: 'The Natyashastra, attributed to sage Bharata Muni (composed roughly between 200 BCE and 200 CE), is the oldest and most comprehensive surviving treatise on the performing arts in the world — covering drama, dance, music, poetics, and stagecraft as one integrated art form (Natya). Its origin myth: Brahma created the fifth Veda, "Natyaveda," by drawing recitation (Patya) from the Rigveda, song (Geeta) from the Samaveda, gesture and mimicry (Abhinaya) from the Yajurveda, and aesthetic emotion (Rasa) from the Atharvaveda. Its most influential contribution is the Rasa theory (Natyashastra, Chapter 6): nine Rasas (Navarasa) — Shringara (love/eros), Hasya (mirth), Karuna (compassion), Raudra (fury), Veera (heroism), Bhayanaka (fear), Bibhatsa (disgust), Adbhuta (wonder), and Shanta (peace, added later as the ninth) — each rasa is evoked through specific Bhavas (emotional states), Vibhavas (causes), and Anubhavas (effects) blended together. Chapters 28–34 form its treatment of music (Gandharva): the Sapta Swara (seven notes: Shadja, Rishabha, Gandhara, Madhyama, Panchama, Dhaivata, Nishada), the Grama system (Shadja-grama and Madhyama-grama, precursors to modern scales), Murchana (ordered note-sequences, ancestor of the modern raga concept), and an elaborate Tala (rhythm) system with named time-units (Kala, Matra) used to synchronize dance, drama, and music. It also details musical instruments across four categories — Tata (stringed, e.g. Veena), Avanaddha (percussion), Sushira (wind), and Ghana (solid/idiophones) — a classification still used in Indian organology today. Because Natyashastra treats dance, drama, poetry, and music as inseparable, it is the root text from which classical Indian music, dance (Bharatanatyam, Kathak, etc.), and dramaturgy all trace their shared lineage.',
    tags: ['natyashastra', 'bharata-muni', 'music', 'dance', 'drama', 'rasa', 'navarasa', 'tala', 'swara', 'nritya', 'performing-arts', 'gandharva'],
    sourceType: 'performing-arts-treatise',
    sourceTitle: 'Natyashastra (Bharata Muni)'
  },
  {
    tenantId: 'varah',
    domain: 'sanskrit' as const,
    topic: 'Sangita Ratnakara - The Ocean of Music and Dance',
    content: 'The Sangita Ratnakara ("Ocean of Music and Dance"), composed by Sharngadeva in the 13th century CE at the Yadava court of Devagiri, is the single most important and purely music-focused treatise in the Indian classical tradition. It was written at a pivotal historical moment — just before Hindustani (North Indian) and Carnatic (South Indian) classical music diverged into two distinct systems — which is why both traditions equally revere it as their shared common ancestor and still cite its terminology today. It is organized into seven chapters (Saptadhyayi): (1) Svaragatadhyaya — swaras (musical notes), the 22 Shrutis (microtonal intervals) that divide the octave, and the Grama-Murchana scale system inherited from the Natyashastra; (2) Ragavivekadhyaya — a landmark classification of ragas, describing 264 ragas and formally systematizing how melodic frameworks (raga) are distinct from mere scales; (3) Prakirnakadhyaya — miscellaneous performance practices and voice culture; (4) Prabandhadhyaya — detailed rules for Prabandha, structured song-compositions considered the forerunner of the modern Khayal and Kriti forms; (5) Taladhyaya — an exhaustive treatment of tala (rhythmic cycles), naming 120 talas and their subdivisions; (6) Vadyadhyaya — musical instruments, expanding on the Natyashastra\'s four-fold classification with detailed construction and playing techniques, especially of the Mridangam and Veena; (7) Nartanadhyaya — dance technique, postures (karanas), and movement. Where the Natyashastra treats music as one strand within the larger art of drama, the Sangita Ratnakara isolates and deep-dives into music itself — swara, raga, tala, and structure — making it the direct scriptural bridge between ancient Vedic/Natyashastra-era music theory and today\'s living Hindustani and Carnatic systems.',
    tags: ['sangitaratnakara', 'sharngadeva', 'music', 'raga', 'swara', 'tala', 'shruti', 'classical-music', 'hindustani', 'carnatic', 'prabandha'],
    sourceType: 'performing-arts-treatise',
    sourceTitle: 'Sangita Ratnakara (Sharngadeva)'
  },
];

async function seedMusicShastras() {
  try {
    console.log('🎵 Seeding Indian classical music knowledge (Natyashastra & Sangita Ratnakara)...');

    const results = await db.insert(aryaKnowledge).values(musicKnowledgeUnits).returning();

    console.log(`✅ Successfully inserted ${results.length} music/performing-arts knowledge units`);
    console.log('   📜 Natyashastra (Bharata Muni) - full performing arts treatise');
    console.log('   🎶 Sangita Ratnakara (Sharngadeva) - dedicated music treatise (swara, raga, tala)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedMusicShastras();
