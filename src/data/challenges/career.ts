import { ChallengeDefinitionServer } from '../../engine/types.js';

export const careerChallenge: ChallengeDefinitionServer = {
  id: 'career',
  slug: 'the-career-crossroads',
  title: 'THE CAREER CROSSROADS',
  subtitle: 'Three competing paths appear at once. Every choice reshapes your trajectory.',
  description:
    'Three opportunities appear at the same time. Each one could completely change your future.',
  category: 'Career / Strategy',
  primaryCategory: 'Career',
  difficulty: 'Medium',
  estimatedMinutes: '5–7 min',
  tags: [
    'Career Strategy',
    'Corporate Strategy',
    'Long-Term Planning',
    'Risk Management',
    'Adaptability',
  ],
  disclaimer:
    'Fictional gameplay simulation only. Not real-world career, legal, or employment advice.',
  scenarioIntro:
    'In the same week, you receive three offers: a steady VP promotion at your current firm, a Founding Product Lead role at a seed-stage AI robotics lab, and a 6-month international fellowship with a global design institute.',
  stateMetrics: [
    { key: 'growth', label: 'GROWTH', unit: 'number', min: 0, max: 100 },
    { key: 'security', label: 'SECURITY', unit: 'number', min: 0, max: 100 },
    { key: 'network', label: 'NETWORK', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    growth: 50,
    security: 60,
    network: 50,
    risk: 30,
  },
  scoringRules: [
    { key: 'strategicThinking', label: 'Strategic Thinking', weight: 30, baseline: 50 },
    { key: 'riskManagement', label: 'Risk Management', weight: 25, baseline: 50 },
    { key: 'longTermPlanning', label: 'Long-Term Planning', weight: 25, baseline: 50 },
    { key: 'adaptability', label: 'Adaptability', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'car_d1',
      roundLabel: 'Stage 1 · Due Diligence Before Deciding',
      context:
        'All three offers ask for an answer within 7 days. Most candidates look only at the headline compensation.',
      prompt: 'How do you evaluate the three paths during your 7-day window?',
      options: [
        {
          id: 'car_d1_o1',
          title: 'Interview back-channel alumni from the startup, review your current firm’s 3-year P&L, and test fellowship deferral options',
          description:
            'Gather asymmetric information on runway, governance, and optionality before committing.',
          stateChanges: { growth: 12, security: 8, network: 12, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Back-channel diligence uncovers critical leverage',
            deterministicNarrative:
              'You learn the robotics lab just closed an unannounced $8M contract, AND the fellowship director agrees you can participate part-time as a visiting fellow!',
            feedback: 'Rigorous due diligence revealed hidden upside and allowed you to combine opportunities.',
            tone: 'strategic',
          },
          scoringEffects: { strategicThinking: 16, riskManagement: 15, longTermPlanning: 14, adaptability: 12 },
        },
        {
          id: 'car_d1_o2',
          title: 'Accept the highest immediate base salary on Day 1 without asking questions',
          description:
            'Lock in the current firm promotion immediately to avoid uncertainty.',
          stateChanges: { growth: -4, security: 10, network: -2, risk: 4 },
          hiddenConsequences: {
            eventTitle: 'Safe title secured, but hidden division restructuring looms',
            deterministicNarrative:
              'You sign immediately, only to learn two weeks later that your division’s R&D budget is being frozen for the year.',
            feedback: 'Skipping due diligence on internal company trajectory traded learning velocity for short-term comfort.',
            tone: 'cautious',
          },
          scoringEffects: { strategicThinking: -6, riskManagement: 0, longTermPlanning: -8, adaptability: -6 },
        },
        {
          id: 'car_d1_o3',
          title: 'Play all three organizations against each other with aggressive ultimatums',
          description:
            'Send competing offer letters to everyone demanding a 50% bump in 24 hours.',
          stateChanges: { growth: 2, security: -12, network: -16, risk: 20 },
          hiddenConsequences: {
            eventTitle: 'Aggressive bidding war sours relationships at two organizations',
            deterministicNarrative:
              'The fellowship withdraws its invitation and your current VP questions your long-term commitment.',
            feedback: 'Heavy-handed ultimatums damaged long-term relational capital across your industry.',
            tone: 'tense',
          },
          scoringEffects: { strategicThinking: -8, riskManagement: -12, longTermPlanning: -10, adaptability: -4 },
        },
      ],
    },
    {
      id: 'car_d2',
      roundLabel: 'Stage 2 · Structuring the Role & Downside Protection',
      context:
        'You decide to pursue the high-growth Founding Product Lead role while keeping a visiting advisory fellowship. Now you must structure the offer terms.',
      prompt: 'Which contract terms do you prioritize?',
      options: [
        {
          id: 'car_d2_o1',
          title: 'Negotiate a sustainable base floor, 6-month severance protection, and milestone-based equity acceleration',
          description:
            'Protect your downside survival while tying upside to concrete product launches.',
          stateChanges: { growth: 14, security: 14, network: 6, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Balanced package protects downside and rewards execution',
            deterministicNarrative:
              'The founders respect your structured thinking and approve both the severance floor and performance equity tranches.',
            feedback: 'Capping downside risk freed you to take bold product bets without personal financial anxiety.',
            tone: 'strategic',
          },
          scoringEffects: { strategicThinking: 14, riskManagement: 16, longTermPlanning: 14, adaptability: 8 },
        },
        {
          id: 'car_d2_o2',
          title: 'Take a 60% pay cut for maximum paper equity with a 4-year cliff and zero severance',
          description:
            'Bet everything on a quick IPO.',
          stateChanges: { growth: 10, security: -22, network: 0, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Personal cash stress creeps in by Month 4',
            deterministicNarrative:
              'You hold a big paper percentage, but the 4-year cliff and personal budget strain create constant pressure.',
            feedback: 'Unhedged concentration risk without vest protection exposed you to governance and timing shocks.',
            tone: 'tense',
          },
          scoringEffects: { strategicThinking: -4, riskManagement: -14, longTermPlanning: -6, adaptability: 0 },
        },
        {
          id: 'car_d2_o3',
          title: 'Demand top-of-market corporate cash and zero equity',
          description:
            'Treat an early-stage venture like a big bank job.',
          stateChanges: { growth: 2, security: 8, network: -4, risk: 6 },
          hiddenConsequences: {
            eventTitle: 'Cash is high, but you miss out on ownership upside when Series A triples valuation',
            deterministicNarrative:
              'You collect a steady paycheck, but have no equity stake when your product drives a breakout valuation jump.',
            feedback: 'Misaligning compensation structure with organization stage capped your asymmetric upside.',
            tone: 'cautious',
          },
          scoringEffects: { strategicThinking: 0, riskManagement: 4, longTermPlanning: -6, adaptability: 2 },
        },
      ],
    },
    {
      id: 'car_d3',
      roundLabel: 'Stage 3 · Leaving Your Former Employer',
      context:
        'You have two weeks before your transition. Your former team is in the middle of a quarterly client migration.',
      prompt: 'How do you manage your departure over the final two weeks?',
      options: [
        {
          id: 'car_d3_o1',
          title: 'Write a comprehensive transition playbook, train your deputy to lead the migration, and introduce them to key clients',
          description:
            'Leave your former organization stronger than you found it and elevate a successor.',
          stateChanges: { growth: 8, security: 6, network: 20, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Former CEO and deputy become lifelong champions of your work',
            deterministicNarrative:
              'Your deputy gets promoted seamlessly, and your former CEO offers to become an early customer of your new venture.',
            feedback: 'How you exit a role defines your decade-long reputation and network equity.',
            tone: 'exciting',
          },
          scoringEffects: { strategicThinking: 12, riskManagement: 10, longTermPlanning: 16, adaptability: 10 },
        },
        {
          id: 'car_d3_o2',
          title: 'Check out mentally and do the bare minimum for 10 days',
          description:
            'Coast through your notice period.',
          stateChanges: { growth: 0, security: 0, network: -12, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Messy handoff leaves former peers frustrated',
            deterministicNarrative:
              'You get a relaxing two weeks, but burning bridges with former colleagues closes future partnership doors.',
            feedback: 'Neglecting the final mile of a role eroded years of accumulated goodwill.',
            tone: 'cautious',
          },
          scoringEffects: { strategicThinking: -8, riskManagement: -6, longTermPlanning: -12, adaptability: -4 },
        },
        {
          id: 'car_d3_o3',
          title: 'Work 80-hour weeks trying to finish the entire quarterly migration solo before Friday',
          description:
            'Refuse to hand off anything until your last hour.',
          stateChanges: { growth: 4, security: 2, network: 4, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'You start your new role exhausted and your successor still lacks context',
            deterministicNarrative:
              'You push through the migration, but because you never trained a successor, they still call you with questions during your new job’s first week.',
            feedback: 'Doing the work yourself instead of transferring capability created lingering dependency.',
            tone: 'analytical',
          },
          scoringEffects: { strategicThinking: 2, riskManagement: 2, longTermPlanning: 0, adaptability: 4 },
        },
      ],
    },
    {
      id: 'car_d4',
      roundLabel: 'Stage 4 · First 60 Days in the New Arena',
      context:
        'Two months into your new role, the market shifts: enterprise buyers want an API platform rather than standalone hardware.',
      prompt: 'How do you lead the strategic pivot in Month 2?',
      options: [
        {
          id: 'car_d4_o1',
          title: 'Run 10 customer discovery calls in a week, build a lightweight API pilot with 2 customers, and present data to the board',
          description:
            'Lead with empirical customer evidence rather than internal opinion battles.',
          stateChanges: { growth: 18, security: 10, network: 12, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Data-backed API pilot unlocks a $1.2M enterprise pipeline',
            deterministicNarrative:
              'Armed with two signed pilot letters, the board unanimously backs your API platform strategy.',
            feedback: 'Validating strategic shifts with real customer commitments built undeniable momentum.',
            tone: 'exciting',
          },
          scoringEffects: { strategicThinking: 16, riskManagement: 12, longTermPlanning: 14, adaptability: 16 },
        },
        {
          id: 'car_d4_o2',
          title: 'Stick rigidly to the original hardware plan you were hired for',
          description:
            'Ignore changing buyer signals to avoid rocking the boat.',
          stateChanges: { growth: -10, security: -10, network: -2, risk: 18 },
          hiddenConsequences: {
            eventTitle: 'Sales cycles stall as buyers wait for software interoperability',
            deterministicNarrative:
              'Sticking to a static plan while the market moved cost the team a full quarter of traction.',
            feedback: 'Anchoring to yesterday’s mandate in a dynamic market increased strategic risk.',
            tone: 'tense',
          },
          scoringEffects: { strategicThinking: -10, riskManagement: -8, longTermPlanning: -8, adaptability: -14 },
        },
        {
          id: 'car_d4_o3',
          title: 'Demand an immediate company-wide pivot on day one without customer proof',
          description:
            'Force a sudden reorganization based on a hunch.',
          stateChanges: { growth: 4, security: -6, network: -6, risk: 14 },
          hiddenConsequences: {
            eventTitle: 'Engineering pushback slows the transition',
            deterministicNarrative:
              'Your instinct is right, but skipping collaborative proof causes friction with the hardware engineering leads.',
            feedback: 'Right direction, but skipping evidence-building created unnecessary organizational drag.',
            tone: 'cautious',
          },
          scoringEffects: { strategicThinking: 6, riskManagement: -4, longTermPlanning: 4, adaptability: 8 },
        },
      ],
    },
    {
      id: 'car_d5',
      roundLabel: 'Stage 5 · Compounding Your Career Moat',
      context:
        'Six months in, your API launch is a hit. The international design institute invites you to publish your case study and mentor their incoming cohort.',
      prompt: 'How do you invest your newfound momentum?',
      options: [
        {
          id: 'car_d5_o1',
          title: 'Publish the joint case study with your engineering leads and recruit top fellowship talent into your growing team',
          description:
            'Share credit generously while turning the fellowship into a world-class talent pipeline.',
          stateChanges: { growth: 14, security: 12, network: 18, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Shared spotlight attracts top global talent and cements your leadership',
            deterministicNarrative:
              'Elevating your teammates builds fierce loyalty inside the company while your fellowship talk brings in two stellar hires.',
            feedback: 'Turning personal visibility into team-wide leverage created a compounding career moat.',
            tone: 'exciting',
          },
          scoringEffects: { strategicThinking: 14, riskManagement: 12, longTermPlanning: 16, adaptability: 12 },
        },
        {
          id: 'car_d5_o2',
          title: 'Take solo credit for the launch and spend 20 hours a week on paid speaking tours',
          description:
            'Maximize personal fame immediately.',
          stateChanges: { growth: 4, security: -8, network: 4, risk: 14 },
          hiddenConsequences: {
            eventTitle: 'Internal resentment grows while you travel',
            deterministicNarrative:
              'Your social media following grows, but the engineers who built the platform feel sidelined.',
            feedback: 'Extracting solo credit from a team win weakened your internal foundation.',
            tone: 'cautious',
          },
          scoringEffects: { strategicThinking: -6, riskManagement: -6, longTermPlanning: -8, adaptability: 0 },
        },
        {
          id: 'car_d5_o3',
          title: 'Decline all external engagement and focus strictly on internal sprints',
          description:
            'Keep your head down 100% inside the building.',
          stateChanges: { growth: 8, security: 8, network: -4, risk: -4 },
          hiddenConsequences: {
            eventTitle: 'Strong internal execution, though external recruiting stays harder',
            deterministicNarrative:
              'Product velocity stays solid, though you miss an easy opportunity to attract inbound talent.',
            feedback: 'Solid operational focus, though selective external ecosystem building multiplies recruiting power.',
            tone: 'analytical',
          },
          scoringEffects: { strategicThinking: 6, riskManagement: 8, longTermPlanning: 6, adaptability: 4 },
        },
      ],
    },
  ],
};
