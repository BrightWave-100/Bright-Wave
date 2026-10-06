import { ChallengeDefinitionServer } from '../../engine/types.js';

export const negotiationChallenge: ChallengeDefinitionServer = {
  id: 'negotiation',
  slug: 'the-impossible-negotiation',
  title: 'THE IMPOSSIBLE NEGOTIATION',
  subtitle: 'You need a deal. The other side holds the leverage. Every word shifts the table.',
  description:
    'You need a deal. The other side has most of the leverage. Every response changes the negotiation.',
  category: 'Social / Strategy',
  primaryCategory: 'Social',
  difficulty: 'Hard',
  estimatedMinutes: '5–8 min',
  tags: [
    'High-Stakes Negotiation',
    'Corporate Strategy',
    'Negotiation',
    'Risk Management',
    'Strategy',
  ],
  scenarioIntro:
    'You represent an independent studio negotiating a global distribution agreement with Titan Media. Titan knows your studio needs a deal this quarter, and their VP opens with a lowball offer.',
  stateMetrics: [
    { key: 'leverage', label: 'LEVERAGE', unit: 'number', min: 0, max: 100 },
    { key: 'dealValue', label: 'DEAL VALUE ($K)', unit: 'currency', min: 0, max: 1000 },
    { key: 'trust', label: 'TRUST', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    leverage: 30,
    dealValue: 250,
    trust: 50,
    risk: 35,
  },
  scoringRules: [
    { key: 'negotiation', label: 'Negotiation', weight: 30, baseline: 50 },
    { key: 'strategy', label: 'Strategy', weight: 25, baseline: 50 },
    { key: 'patience', label: 'Patience', weight: 25, baseline: 50 },
    { key: 'risk', label: 'Risk', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'neg_d1',
      roundLabel: 'Round 1 · The Lowball Anchor',
      context:
        'Titan Media opens with a $250k flat buyout and demands 100% of your IP rights, saying: "Take it by Friday or we slot another studio."',
      prompt: 'How do you respond to their opening anchor?',
      options: [
        {
          id: 'neg_d1_o1',
          title: 'Stay calm, ignore the ultimatum, and ask diagnostic questions about their Q3 slate gap',
          description:
            'Probe why they need a ready-to-ship title this quarter before countering on price.',
          stateChanges: { leverage: 16, dealValue: 60, trust: 8, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Diagnostic questioning reveals Titan has a Q3 launch hole',
            deterministicNarrative:
              'By refusing to flinch, you uncover that Titan’s flagship release slipped to Q4—meaning they need your ready catalog almost as much as you need distribution.',
            feedback: 'Uncovering the counterparty’s hidden time pressure flipped the asymmetry of the room.',
            tone: 'strategic',
          },
          scoringEffects: { negotiation: 15, strategy: 14, patience: 16, risk: 10 },
        },
        {
          id: 'neg_d1_o2',
          title: 'Threaten to walk out immediately unless they offer $800k',
          description:
            'Match their aggression with an extreme counter-ultimatum.',
          stateChanges: { leverage: -6, dealValue: 20, trust: -16, risk: 22 },
          hiddenConsequences: {
            eventTitle: 'Standoff hardens both sides into defensive postures',
            deterministicNarrative:
              'Titan’s VP calls your bluff and cuts the meeting short, leaving talks hanging by a thread.',
            feedback: 'Bluffing without an established BATNA escalated breakdown risk without building leverage.',
            tone: 'tense',
          },
          scoringEffects: { negotiation: -8, strategy: -8, patience: -12, risk: -12 },
        },
        {
          id: 'neg_d1_o3',
          title: 'Accept the $250k framing and beg for $290k to cover your payroll',
          description:
            'Reveal your cash crunch hoping for sympathy.',
          stateChanges: { leverage: -18, dealValue: 15, trust: -4, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'Revealing desperation locks you into their lowball anchor',
            deterministicNarrative:
              'Once Titan hears you need payroll money, they offer a token $15k bump while tightening the IP transfer clauses.',
            feedback: 'Validating an extreme opening anchor and exposing financial urgency surrendered your leverage.',
            tone: 'cautious',
          },
          scoringEffects: { negotiation: -12, strategy: -10, patience: -8, risk: -4 },
        },
      ],
    },
    {
      id: 'neg_d2',
      roundLabel: 'Round 2 · Building Outside Leverage',
      context:
        'Before the second session, a mid-tier regional platform offers a non-exclusive $180k licensing deal for Europe only.',
      prompt: 'How do you use this regional offer before Session 2?',
      options: [
        {
          id: 'neg_d2_o1',
          title: 'Keep the regional term sheet active and inform Titan that non-exclusive regional rights are being carved out unless global terms improve',
          description:
            'Demonstrate a credible alternative without naming or burning either partner.',
          stateChanges: { leverage: 20, dealValue: 110, trust: 4, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Credible BATNA forces Titan to table a real licensing structure',
            deterministicNarrative:
              'Realizing they could lose European exclusivity, Titan raises the minimum guarantee to $375k and drops the full IP buyout demand.',
            feedback: 'Introducing a real, verifiable alternative changed the negotiation from a rescue to an auction.',
            tone: 'exciting',
          },
          scoringEffects: { negotiation: 16, strategy: 16, patience: 12, risk: 12 },
        },
        {
          id: 'neg_d2_o2',
          title: 'Exaggerate and claim a rival giant offered $750k global exclusive',
          description:
            'Invent a massive competing bid to scare Titan.',
          stateChanges: { leverage: -14, dealValue: -20, trust: -22, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Titan knows the rival’s slate is full and spots the fabrication',
            deterministicNarrative:
              'Industry executives talk; Titan’s VP immediately recognizes the bluff, costing you credibility and trust.',
            feedback: 'Fabricating verifiable market claims in a small industry backfired immediately.',
            tone: 'tense',
          },
          scoringEffects: { negotiation: -12, strategy: -10, patience: -8, risk: -16 },
        },
        {
          id: 'neg_d2_o3',
          title: 'Ignore the European offer so you do not complicate the Titan talks',
          description:
            'Keep all your focus on a single counterparty.',
          stateChanges: { leverage: -4, dealValue: 10, trust: 2, risk: 6 },
          hiddenConsequences: {
            eventTitle: 'Single-threaded negotiation leaves leverage unchanged',
            deterministicNarrative:
              'Talks remain polite, but without external pressure Titan moves in tiny increments.',
            feedback: 'Leaving a viable BATNA unused kept you dependent on Titan’s goodwill.',
            tone: 'cautious',
          },
          scoringEffects: { negotiation: -2, strategy: -4, patience: 4, risk: -2 },
        },
      ],
    },
    {
      id: 'neg_d3',
      roundLabel: 'Round 3 · Trading Across Multiple Variables',
      context:
        'Titan says their upfront budget cap for Q3 is strictly $420k, even though you want $550k total value and IP retention.',
      prompt: 'How do you structure the counter-proposal?',
      options: [
        {
          id: 'neg_d3_o1',
          title: 'Accept the $420k Q3 cap in exchange for a 25% revenue-share escalator and 3-year IP reversion',
          description:
            'Solve their quarterly budget constraint while capturing high backend value and keeping your IP.',
          stateChanges: { leverage: 12, dealValue: 160, trust: 14, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Creative package unlocks $580k expected value and protects IP',
            deterministicNarrative:
              'Titan’s VP gets to report a budget-compliant Q3 upfront number to their CFO, while your studio secures royalty upside and retains IP ownership.',
            feedback: 'Trading across time horizons and royalty structure expanded the pie for both sides.',
            tone: 'strategic',
          },
          scoringEffects: { negotiation: 16, strategy: 15, patience: 14, risk: 12 },
        },
        {
          id: 'neg_d3_o2',
          title: 'Deadlock on $550k upfront cash and refuse to discuss royalties',
          description:
            'Treat the negotiation as a single-number tug of war.',
          stateChanges: { leverage: -6, dealValue: 20, trust: -10, risk: 16 },
          hiddenConsequences: {
            eventTitle: 'Finance committee rejects the upfront cap override',
            deterministicNarrative:
              'Because Titan’s VP truly lacked authority above $420k upfront, the deal stalls in finance review.',
            feedback: 'Fighting over an immovable internal constraint instead of structuring around it stalled value creation.',
            tone: 'tense',
          },
          scoringEffects: { negotiation: -6, strategy: -6, patience: -4, risk: -8 },
        },
        {
          id: 'neg_d3_o3',
          title: 'Split the difference at $460k flat and surrender sequel rights',
          description:
            'Take $40k more cash today by giving up future franchise ownership.',
          stateChanges: { leverage: -8, dealValue: 50, trust: 4, risk: 4 },
          hiddenConsequences: {
            eventTitle: 'Modest cash bump traded for your studio’s crown jewel',
            deterministicNarrative:
              'You get a slightly higher wire transfer now, but Titan owns any future sequel outright.',
            feedback: 'Trading long-term franchise equity for a small upfront bump undervalued your asset.',
            tone: 'cautious',
          },
          scoringEffects: { negotiation: 0, strategy: -6, patience: -4, risk: 2 },
        },
      ],
    },
    {
      id: 'neg_d4',
      roundLabel: 'Round 4 · The Eleventh-HourNibbling Tactic',
      context:
        'Contract drafts are 95% done when Titan’s legal counsel inserts a last-minute clause requiring you to deliver two free expansion packs within 6 months.',
      prompt: 'How do you handle the eleventh-hour scope nibble?',
      options: [
        {
          id: 'neg_d4_o1',
          title: 'Pause signature calmly and price the two expansions at $90k each as an optional add-on schedule',
          description:
            'Never reward a last-minute freebie grab; convert every added obligation into a priced option.',
          stateChanges: { leverage: 10, dealValue: 90, trust: 8, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Titan agrees to fund Expansion 1 for $90k on delivery',
            deterministicNarrative:
              'Seeing that you will not give away unpriced engineering work, Titan drops the free demand and signs an $90k development milestone for the first expansion.',
            feedback: 'Pricing late-stage scope requests disciplined the counterparty and increased contract value.',
            tone: 'exciting',
          },
          scoringEffects: { negotiation: 14, strategy: 12, patience: 14, risk: 10 },
        },
        {
          id: 'neg_d4_o2',
          title: 'Sign anyway to avoid delaying the wire transfer by a few days',
          description:
            'Absorb six months of unpaid expansion work just to get the deal closed today.',
          stateChanges: { leverage: -12, dealValue: -70, trust: -4, risk: 14 },
          hiddenConsequences: {
            eventTitle: 'Unfunded expansion mandate drains your post-deal profit',
            deterministicNarrative:
              'The contract closes, but six months of mandatory unpaid DLC work eats $70k of your studio’s net margin.',
            feedback: 'Yielding to eleventh-hour nibbling surrendered hard-won economics at the finish line.',
            tone: 'tense',
          },
          scoringEffects: { negotiation: -10, strategy: -8, patience: -12, risk: -8 },
        },
        {
          id: 'neg_d4_o3',
          title: 'Send a furious email accusing their legal team of bad faith',
          description:
            'Escalate emotionally over the redline.',
          stateChanges: { leverage: -4, dealValue: 0, trust: -18, risk: 16 },
          hiddenConsequences: {
            eventTitle: 'Clause removed, but executive relationship turns frosty',
            deterministicNarrative:
              'They pull the clause, but the heated tone makes co-marketing collaboration tense.',
            feedback: 'Separating the people from the problem is essential when pushing back on late redlines.',
            tone: 'cautious',
          },
          scoringEffects: { negotiation: 0, strategy: 0, patience: -10, risk: -6 },
        },
      ],
    },
    {
      id: 'neg_d5',
      roundLabel: 'Round 5 · Closing & Implementation Safeguards',
      context:
        'Final signature day. You can close with a standard contract or add a concrete marketing spend commitment and 15-day payment SLA.',
      prompt: 'How do you finalize the agreement?',
      options: [
        {
          id: 'neg_d5_o1',
          title: 'Lock in a verified launch marketing floor, 15-day payment SLA, and joint announcement',
          description:
            'Ensure the deal performs in execution, not just on the signature page.',
          stateChanges: { leverage: 8, dealValue: 75, trust: 12, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Landmark agreement signed with strong execution guarantees',
            deterministicNarrative:
              'You walk out with a high-value distribution deal, retained IP, fast payment terms, and contractual launch support.',
            feedback: 'Securing implementation commitments ensured your royalty upside translates into real payouts.',
            tone: 'exciting',
          },
          scoringEffects: { negotiation: 12, strategy: 14, patience: 12, risk: 14 },
        },
        {
          id: 'neg_d5_o2',
          title: 'Sign the base draft immediately without launch SLA clauses',
          description:
            'Wrap up the meeting in 10 minutes and celebrate.',
          stateChanges: { leverage: 0, dealValue: 10, trust: 4, risk: 6 },
          hiddenConsequences: {
            eventTitle: 'Deal closes cleanly, though marketing priority is left to Titan’s discretion',
            deterministicNarrative:
              'The upfront wire arrives, though you will need to lobby their marketing team post-launch for homepage placement.',
            feedback: 'A solid close, though codifying marketing commitments would have de-risked backend royalties.',
            tone: 'cautious',
          },
          scoringEffects: { negotiation: 6, strategy: 4, patience: 4, risk: 2 },
        },
        {
          id: 'neg_d5_o3',
          title: 'Re-open the upfront price at the signing table to squeeze an extra $25k',
          description:
            'Try a last-second nibble of your own after terms were agreed.',
          stateChanges: { leverage: -10, dealValue: -15, trust: -20, risk: 18 },
          hiddenConsequences: {
            eventTitle: 'Last-second re-trade backfires and costs goodwill',
            deterministicNarrative:
              'Titan’s VP refuses to re-open the approved memo and removes a discretionary co-marketing bonus in frustration.',
            feedback: 'Re-trading settled headline terms at signing damaged trust for minimal potential gain.',
            tone: 'tense',
          },
          scoringEffects: { negotiation: -10, strategy: -8, patience: -8, risk: -10 },
        },
      ],
    },
  ],
};
