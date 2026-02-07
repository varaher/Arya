import { db } from "../db";
import { aryaNeuralLinks, aryaKnowledge, AryaNeuralLink, AryaKnowledge, Domain } from "@shared/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export interface NeuralLinkResult {
  link: AryaNeuralLink;
  connectedUnit: AryaKnowledge;
}

export interface SynthesisResult {
  synthesis: string;
  domains: Domain[];
  sources: Array<{ id: string; topic: string; domain: Domain; relevance: number }>;
  neuralLinks: Array<{ from: string; to: string; type: string; score: string }>;
}

export class NeuralLinkEngine {

  async computeLinks(tenantId: string): Promise<number> {
    const allUnits = await db
      .select()
      .from(aryaKnowledge)
      .where(and(
        eq(aryaKnowledge.tenantId, tenantId),
        eq(aryaKnowledge.status, 'published')
      ));

    let linksCreated = 0;

    await db
      .delete(aryaNeuralLinks)
      .where(eq(aryaNeuralLinks.tenantId, tenantId));

    for (let i = 0; i < allUnits.length; i++) {
      for (let j = i + 1; j < allUnits.length; j++) {
        const unitA = allUnits[i];
        const unitB = allUnits[j];

        if (unitA.domain === unitB.domain) continue;

        const links = this.findConnections(unitA, unitB);

        for (const link of links) {
          if (link.score >= 0.15) {
            await db.insert(aryaNeuralLinks).values({
              tenantId,
              fromUnitId: unitA.id,
              toUnitId: unitB.id,
              fromDomain: unitA.domain,
              toDomain: unitB.domain,
              linkScore: link.score.toFixed(3),
              linkType: link.type,
              evidence: link.evidence
            });
            linksCreated++;
          }
        }
      }
    }

    return linksCreated;
  }

  async getLinksForUnit(tenantId: string, unitId: string): Promise<NeuralLinkResult[]> {
    const links = await db
      .select()
      .from(aryaNeuralLinks)
      .where(and(
        eq(aryaNeuralLinks.tenantId, tenantId),
        or(
          eq(aryaNeuralLinks.fromUnitId, unitId),
          eq(aryaNeuralLinks.toUnitId, unitId)
        )
      ))
      .orderBy(desc(aryaNeuralLinks.linkScore));

    const results: NeuralLinkResult[] = [];

    for (const link of links) {
      const connectedId = link.fromUnitId === unitId ? link.toUnitId : link.fromUnitId;
      const units = await db
        .select()
        .from(aryaKnowledge)
        .where(eq(aryaKnowledge.id, connectedId))
        .limit(1);

      if (units.length > 0) {
        results.push({ link, connectedUnit: units[0] });
      }
    }

    return results;
  }

  async getNetworkGraph(tenantId: string): Promise<{
    nodes: Array<{ id: string; topic: string; domain: Domain; linkCount: number }>;
    edges: Array<{ from: string; to: string; score: string; type: string; evidence: string }>;
    stats: { totalNodes: number; totalEdges: number; domainCoverage: Record<string, number> };
  }> {
    const links = await db
      .select()
      .from(aryaNeuralLinks)
      .where(eq(aryaNeuralLinks.tenantId, tenantId));

    const unitIds = new Set<string>();
    links.forEach(l => {
      unitIds.add(l.fromUnitId);
      unitIds.add(l.toUnitId);
    });

    const units = await db
      .select()
      .from(aryaKnowledge)
      .where(and(
        eq(aryaKnowledge.tenantId, tenantId),
        eq(aryaKnowledge.status, 'published')
      ));

    const unitMap = new Map(units.map(u => [u.id, u]));
    const linkCountMap = new Map<string, number>();
    links.forEach(l => {
      linkCountMap.set(l.fromUnitId, (linkCountMap.get(l.fromUnitId) || 0) + 1);
      linkCountMap.set(l.toUnitId, (linkCountMap.get(l.toUnitId) || 0) + 1);
    });

    const nodes = units
      .filter(u => unitIds.has(u.id))
      .map(u => ({
        id: u.id,
        topic: u.topic,
        domain: u.domain,
        linkCount: linkCountMap.get(u.id) || 0
      }));

    const edges = links.map(l => ({
      from: l.fromUnitId,
      to: l.toUnitId,
      score: l.linkScore,
      type: l.linkType,
      evidence: l.evidence
    }));

    const domainCoverage: Record<string, number> = {};
    nodes.forEach(n => {
      domainCoverage[n.domain] = (domainCoverage[n.domain] || 0) + 1;
    });

    return {
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        domainCoverage
      }
    };
  }

  async synthesize(tenantId: string, query: string, domains: Domain[]): Promise<SynthesisResult> {
    const allResults: AryaKnowledge[] = [];

    for (const domain of domains) {
      const units = await db
        .select()
        .from(aryaKnowledge)
        .where(and(
          eq(aryaKnowledge.tenantId, tenantId),
          eq(aryaKnowledge.domain, domain),
          eq(aryaKnowledge.status, 'published')
        ));

      const queryLower = query.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

      const scored = units.map(u => {
        let score = 0;
        const topicLower = u.topic.toLowerCase();
        const contentLower = u.content.toLowerCase();
        for (const kw of keywords) {
          if (topicLower.includes(kw)) score += 3;
          if (contentLower.includes(kw)) score += 1;
        }
        return { unit: u, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const topUnits = scored.filter(s => s.score > 0).slice(0, 2).map(s => s.unit);
      allResults.push(...topUnits);
    }

    if (allResults.length === 0) {
      return {
        synthesis: 'No cross-domain knowledge found for this query.',
        domains,
        sources: [],
        neuralLinks: []
      };
    }

    const relevantLinks: Array<{ from: string; to: string; type: string; score: string }> = [];
    for (let i = 0; i < allResults.length; i++) {
      for (let j = i + 1; j < allResults.length; j++) {
        if (allResults[i].domain !== allResults[j].domain) {
          const links = await db
            .select()
            .from(aryaNeuralLinks)
            .where(and(
              eq(aryaNeuralLinks.tenantId, tenantId),
              or(
                and(
                  eq(aryaNeuralLinks.fromUnitId, allResults[i].id),
                  eq(aryaNeuralLinks.toUnitId, allResults[j].id)
                ),
                and(
                  eq(aryaNeuralLinks.fromUnitId, allResults[j].id),
                  eq(aryaNeuralLinks.toUnitId, allResults[i].id)
                )
              )
            ));
          links.forEach(l => relevantLinks.push({
            from: l.fromUnitId,
            to: l.toUnitId,
            type: l.linkType,
            score: l.linkScore
          }));
        }
      }
    }

    const synthesisParts: string[] = [];
    const domainGroups = new Map<Domain, AryaKnowledge[]>();
    allResults.forEach(u => {
      if (!domainGroups.has(u.domain)) domainGroups.set(u.domain, []);
      domainGroups.get(u.domain)!.push(u);
    });

    synthesisParts.push(`Cross-domain synthesis across ${domains.join(', ')}:\n`);

    Array.from(domainGroups.entries()).forEach(([domain, units]) => {
      synthesisParts.push(`\n[${domain.toUpperCase()}]`);
      units.forEach((u: AryaKnowledge) => {
        const excerpt = u.content.length > 200 ? u.content.substring(0, 200) + '...' : u.content;
        synthesisParts.push(`${u.topic}: ${excerpt}`);
      });
    });

    if (relevantLinks.length > 0) {
      synthesisParts.push(`\n[NEURAL LINKS: ${relevantLinks.length} cross-domain connections found]`);
    }

    return {
      synthesis: synthesisParts.join('\n'),
      domains,
      sources: allResults.map(u => ({
        id: u.id,
        topic: u.topic,
        domain: u.domain,
        relevance: 0.85
      })),
      neuralLinks: relevantLinks
    };
  }

  private findConnections(unitA: AryaKnowledge, unitB: AryaKnowledge): Array<{ type: 'tag_overlap' | 'keyword_similarity' | 'conceptual' | 'complementary'; score: number; evidence: string }> {
    const connections: Array<{ type: 'tag_overlap' | 'keyword_similarity' | 'conceptual' | 'complementary'; score: number; evidence: string }> = [];

    const tagOverlap = this.computeTagOverlap(unitA.tags || [], unitB.tags || []);
    if (tagOverlap.score > 0) {
      connections.push({ type: 'tag_overlap', ...tagOverlap });
    }

    const keywordSim = this.computeKeywordSimilarity(unitA, unitB);
    if (keywordSim.score > 0) {
      connections.push({ type: 'keyword_similarity', ...keywordSim });
    }

    const conceptual = this.detectConceptualLink(unitA, unitB);
    if (conceptual.score > 0) {
      connections.push({ type: 'conceptual', ...conceptual });
    }

    const complementary = this.detectComplementaryLink(unitA, unitB);
    if (complementary.score > 0) {
      connections.push({ type: 'complementary', ...complementary });
    }

    return connections;
  }

  private computeTagOverlap(tagsA: string[], tagsB: string[]): { score: number; evidence: string } {
    const setA = new Set(tagsA.map(t => t.toLowerCase()));
    const setB = new Set(tagsB.map(t => t.toLowerCase()));
    const overlap = Array.from(setA).filter(t => setB.has(t));

    if (overlap.length === 0) return { score: 0, evidence: '' };

    const maxLen = Math.max(setA.size, setB.size);
    const score = Math.min(overlap.length / maxLen * 0.8, 0.8);
    return { score, evidence: `Shared tags: ${overlap.join(', ')}` };
  }

  private computeKeywordSimilarity(unitA: AryaKnowledge, unitB: AryaKnowledge): { score: number; evidence: string } {
    const wordsA = this.extractSignificantWords(unitA.topic + ' ' + unitA.content.substring(0, 500));
    const wordsB = this.extractSignificantWords(unitB.topic + ' ' + unitB.content.substring(0, 500));

    const overlap = Array.from(wordsA).filter(w => wordsB.has(w));
    if (overlap.length < 2) return { score: 0, evidence: '' };

    const maxLen = Math.max(wordsA.size, wordsB.size);
    const score = Math.min(overlap.length / maxLen * 0.6, 0.6);
    return { score, evidence: `Common keywords: ${overlap.slice(0, 5).join(', ')}` };
  }

  private detectConceptualLink(unitA: AryaKnowledge, unitB: AryaKnowledge): { score: number; evidence: string } {
    const conceptPairs: Array<{ concepts: string[]; bridge: string; domains: [string, string] }> = [
      { concepts: ['ayurveda', 'dosha', 'prakriti', 'vata', 'pitta', 'kapha'], bridge: 'Traditional + Modern Medicine', domains: ['sanskrit', 'medical'] },
      { concepts: ['dharma', 'ethics', 'governance', 'leadership'], bridge: 'Dharmic Governance', domains: ['sanskrit', 'chanakya'] },
      { concepts: ['strategy', 'arthashastra', 'mandala', 'statecraft'], bridge: 'Strategic Thinking', domains: ['chanakya', 'business'] },
      { concepts: ['yoga', 'meditation', 'wellness', 'health', 'stress'], bridge: 'Mind-Body Wellness', domains: ['sanskrit', 'medical'] },
      { concepts: ['karma', 'action', 'duty', 'productivity', 'work'], bridge: 'Action Philosophy', domains: ['sanskrit', 'business'] },
      { concepts: ['guru', 'mentor', 'leadership', 'teaching', 'coach'], bridge: 'Leadership & Mentorship', domains: ['sanskrit', 'business'] },
      { concepts: ['niti', 'policy', 'regulation', 'compliance'], bridge: 'Policy & Regulation', domains: ['chanakya', 'business'] },
      { concepts: ['prana', 'vitals', 'breathing', 'oxygen', 'heart'], bridge: 'Vital Energy & Vitals', domains: ['sanskrit', 'medical'] },
      { concepts: ['panchakarma', 'detox', 'cleanse', 'therapy'], bridge: 'Therapeutic Practices', domains: ['sanskrit', 'medical'] },
      { concepts: ['mantra', 'psychology', 'mental', 'cognitive'], bridge: 'Mind Science', domains: ['sanskrit', 'medical'] },
    ];

    const textA = (unitA.topic + ' ' + unitA.content).toLowerCase();
    const textB = (unitB.topic + ' ' + unitB.content).toLowerCase();
    const domainPair = [unitA.domain, unitB.domain].sort().join(',');

    for (const pair of conceptPairs) {
      const pairDomains = pair.domains.sort().join(',');
      if (domainPair !== pairDomains) continue;

      const matchesA = pair.concepts.filter(c => textA.includes(c));
      const matchesB = pair.concepts.filter(c => textB.includes(c));

      if (matchesA.length > 0 && matchesB.length > 0) {
        const score = Math.min((matchesA.length + matchesB.length) / (pair.concepts.length * 2) + 0.2, 0.7);
        const combined = Array.from(new Set(matchesA.concat(matchesB)));
        return { score, evidence: `${pair.bridge}: ${combined.join(', ')}` };
      }
    }

    return { score: 0, evidence: '' };
  }

  private detectComplementaryLink(unitA: AryaKnowledge, unitB: AryaKnowledge): { score: number; evidence: string } {
    const complementaryPatterns: Array<{ pattern: RegExp; label: string }> = [
      { pattern: /theory|philosophy|principle|concept/i, label: 'Theory ↔ Practice' },
      { pattern: /ancient|traditional|classical/i, label: 'Ancient ↔ Modern' },
      { pattern: /prevention|wellness|holistic/i, label: 'Prevention ↔ Treatment' },
    ];

    const textA = unitA.topic + ' ' + unitA.content.substring(0, 300);
    const textB = unitB.topic + ' ' + unitB.content.substring(0, 300);

    for (const pat of complementaryPatterns) {
      const inA = pat.pattern.test(textA);
      const inB = pat.pattern.test(textB);
      if (inA || inB) {
        return { score: 0.2, evidence: pat.label };
      }
    }

    return { score: 0, evidence: '' };
  }

  private extractSignificantWords(text: string): Set<string> {
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'will', 'do',
      'this', 'that', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
      'its', 'from', 'by', 'as', 'it', 'be', 'all', 'their', 'one', 'two',
      'these', 'those', 'about', 'more', 'than', 'also', 'into', 'each'
    ]);

    return new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopwords.has(w))
    );
  }
}
