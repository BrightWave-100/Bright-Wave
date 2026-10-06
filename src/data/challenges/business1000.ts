import { ChallengeDefinitionServer } from '../../engine/types.js';

export const business1000Challenge: ChallengeDefinitionServer = {
  id: 'business1000',
  slug: 'build-a-1000-business',
  title: 'BUILD A $1,000 BUSINESS',
  subtitle: 'Turn $1,000 of seed capital into a self-sustaining venture in 30 days.',
  description:
    'You have $1,000 and 30 days to build a profitable business. Every decision affects your money, customers, reputation and chances of success.',
  category: 'Business / Strategy',
  primaryCategory: 'Business',
  difficulty: 'Medium',
  estimatedMinutes: '5–8 min',
  tags: [
    'Corporate Strategy',
    'Resource Management',
    'Risk Management',
    'Adaptability',
    'Strategy',
  ],
  disclaimer:
    'Fictional business simulation for entertainment only. Does not constitute real-world financial or commercial advice.',
  scenarioIntro:
    'Day 1. You have $1,000 in a dedicated venture account and 30 days to prove your micro-brand can generate repeatable profit before your lease commitment resets.',
  stateMetrics: [
    { key: 'money', label: 'MONEY', unit: 'currency', min: 0, max: 20000 },
    { key: 'customers', label: 'CUSTOMERS', unit: 'number', min: 0, max: 5000 },
    { key: 'reputation', label: 'REPUTATION', unit: 'number', min: 0, max: 100 },
    { key: 'energy', label: 'ENERGY', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
    { key: 'day', label: 'DAY', unit: 'day', min: 1, max: 30 },
  ],
  startingState: {
    money: 1000,
    customers: 0,
    reputation: 50,
    energy: 100,
    risk: 20,
    day: 1,
  },
  scoringRules: [
    { key: 'strategy', label: 'Strategy', weight: 30, baseline: 50 },
    { key: 'resourceManagement', label: 'Resource Management', weight: 30, baseline: 50 },
    { key: 'riskManagement', label: 'Risk Management', weight: 20, baseline: 50 },
    { key: 'adaptability', label: 'Adaptability', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'b1_d1',
      roundLabel: 'Day 1 · Initial Model',
      context:
        'Your $1,000 is sitting untouched. You need a product or service model that can generate cash flow within the first week without locking up all your capital.',
      prompt: 'How do you deploy your initial capital on Day 1?',
      options: [
        {
          id: 'b1_d1_o1',
          title: 'Pre-sell a curated B2B service package before buying tools',
          description:
            'Spend $120 on a clean landing page and direct outreach to local businesses, collecting deposits before fulfillment.',
          stateChanges: { money: 380, customers: 8, reputation: 6, energy: -15, risk: -4, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Early client deposits validate demand',
            deterministicNarrative:
              'By securing deposits before spending heavily, you onboard 8 paying clients and add $380 in net cash flow while keeping overhead low.',
            feedback: 'Customer-funded validation protected your cash reserve and proved real market demand.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 14, resourceManagement: 12, riskManagement: 10, adaptability: 6 },
        },
        {
          id: 'b1_d1_o2',
          title: 'Import $750 of wholesale specialty goods for quick resale',
          description:
            'Lock in bulk unit margins immediately and use the remaining $250 for marketplace listings.',
          stateChanges: { money: -450, customers: 14, reputation: 2, energy: -10, risk: 18, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Inventory moves slowly after initial burst',
            deterministicNarrative:
              'You make 14 initial sales, but over half your capital is still tied up in unsold boxes stacked in your hallway.',
            feedback: 'Heavy upfront inventory created early unit sales but constrained your liquidity.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: 2, resourceManagement: -6, riskManagement: -8, adaptability: 0 },
        },
        {
          id: 'b1_d1_o3',
          title: 'Spend $600 on social ads for a digital template bundle',
          description:
            'Build a low-cost digital kit over the weekend and buy aggressive paid traffic immediately.',
          stateChanges: { money: -220, customers: 19, reputation: 0, energy: -12, risk: 14, day: 6 },
          hiddenConsequences: {
            eventTitle: 'High click volume, thin conversion margin',
            deterministicNarrative:
              'Traffic spikes overnight and 19 buyers check out, but ad costs eat more than the revenue generated in week one.',
            feedback: 'Paid acquisition before organic conversion tuning burned cash faster than expected.',
            tone: 'tense',
          },
          scoringEffects: { strategy: 0, resourceManagement: -4, riskManagement: -5, adaptability: 4 },
        },
        {
          id: 'b1_d1_o4',
          title: 'Build a custom small-batch product by hand for $280',
          description:
            'Craft 25 high-margin units yourself and pitch them at weekend community pop-ups.',
          stateChanges: { money: 190, customers: 12, reputation: 9, energy: -22, risk: 2, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Word-of-mouth traction at the pop-up',
            deterministicNarrative:
              'Buyers love the quality and share photos online. You clear $190 net profit, though crafting each unit takes a toll on your stamina.',
            feedback: 'Strong product quality built early reputation at the cost of personal energy.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 8, resourceManagement: 8, riskManagement: 6, adaptability: 8 },
        },
      ],
    },
    {
      id: 'b1_d2',
      roundLabel: 'Day 7 · Pricing & Positioning',
      context:
        'A larger competitor notices your early traction and undercuts your entry price by 25%. Prospective buyers are asking why they should choose you.',
      prompt: 'How do you respond to the competitor price cut?',
      options: [
        {
          id: 'b1_d2_o1',
          title: 'Bundle a fast-turnaround guarantee and raise price by 15%',
          description:
            'Position your offer around speed and reliability for buyers who cannot afford delays.',
          stateChanges: { money: 520, customers: 11, reputation: 10, energy: -12, risk: 0, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Premium buyers choose reliability over discounts',
            deterministicNarrative:
              'Price-sensitive shoppers leave, but 11 high-value customers gladly pay the premium for guaranteed delivery speed.',
            feedback: 'Differentiating on value rather than racing to the bottom expanded your margins.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 14, resourceManagement: 10, riskManagement: 8, adaptability: 10 },
        },
        {
          id: 'b1_d2_o2',
          title: 'Slash your prices by 35% to win every deal on volume',
          description:
            'Refuse to lose market share even if your profit per order drops near zero.',
          stateChanges: { money: 40, customers: 28, reputation: -6, energy: -25, risk: 16, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Order flood overwhelms your capacity',
            deterministicNarrative:
              'You win 28 new orders, but fulfillment costs leave only $40 net profit and late deliveries ding your reputation.',
            feedback: 'Competing purely on price eroded your unit economics and exhausted your bandwidth.',
            tone: 'tense',
          },
          scoringEffects: { strategy: -8, resourceManagement: -6, riskManagement: -6, adaptability: -2 },
        },
        {
          id: 'b1_d2_o3',
          title: 'Introduce a stripped-down starter tier alongside a pro tier',
          description:
            'Match their low price on a basic self-serve option while upselling full service.',
          stateChanges: { money: 340, customers: 18, reputation: 5, energy: -14, risk: 4, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Tiered pricing captures both segments',
            deterministicNarrative:
              'The entry tier neutralizes the competitor ad claims, and nearly half of buyers upgrade to your middle tier.',
            feedback: 'Good-Better-Best segmentation neutralized price pressure while preserving average order value.',
            tone: 'analytical',
          },
          scoringEffects: { strategy: 10, resourceManagement: 8, riskManagement: 6, adaptability: 12 },
        },
      ],
    },
    {
      id: 'b1_d3',
      roundLabel: 'Day 13 · Supply & Fulfillment Shock',
      context:
        'Your primary vendor suddenly delays a critical component by 10 days. Seven active customer orders are due in 48 hours.',
      prompt: 'How do you handle the fulfillment bottleneck?',
      options: [
        {
          id: 'b1_d3_o1',
          title: 'Source from a local supplier at 2x cost and notify clients proactively',
          description:
            'Absorb $180 in extra cost to deliver on time and send a transparent status update.',
          stateChanges: { money: 210, customers: 9, reputation: 12, energy: -10, risk: -8, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Clients reward your reliability with referrals',
            deterministicNarrative:
              'Every order ships on schedule. Two impressed clients immediately refer colleagues, more than covering the local sourcing premium.',
            feedback: 'Protecting trust during a supply shock turned a potential crisis into referral momentum.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 10, resourceManagement: 6, riskManagement: 14, adaptability: 14 },
        },
        {
          id: 'b1_d3_o2',
          title: 'Stay silent and hope the original shipment arrives early',
          description:
            'Save the $180 surcharge and avoid alarming customers unless they ask.',
          stateChanges: { money: -160, customers: -5, reputation: -18, energy: -8, risk: 20, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Refund demands and public complaints hit at once',
            deterministicNarrative:
              'The shipment misses the deadline. Five customers cancel for full refunds and leave harsh reviews warning others.',
            feedback: 'Hiding operational delays compounded reputational damage and triggered chargebacks.',
            tone: 'tense',
          },
          scoringEffects: { strategy: -12, resourceManagement: -8, riskManagement: -14, adaptability: -10 },
        },
        {
          id: 'b1_d3_o3',
          title: 'Offer affected buyers a 20% partial credit for a 5-day extension',
          description:
            'Negotiate breathing room while switching to a secondary regional vendor.',
          stateChanges: { money: 140, customers: 6, reputation: 4, energy: -8, risk: -2, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Six of seven buyers accept the revised timeline',
            deterministicNarrative:
              'Clear communication and a fair discount keep almost every order intact while you stabilize your secondary supply line.',
            feedback: 'Proactive negotiation contained downside risk without draining cash reserves.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: 6, resourceManagement: 8, riskManagement: 8, adaptability: 10 },
        },
      ],
    },
    {
      id: 'b1_d4',
      roundLabel: 'Day 19 · Growth Inflection',
      context:
        'A regional newsletter with 45,000 subscribers offers a featured sponsor slot tomorrow for $350, or you can invest that budget in a part-time fulfillment assistant.',
      prompt: 'Where do you allocate your growth budget for Week 3?',
      options: [
        {
          id: 'b1_d4_o1',
          title: 'Hire the part-time assistant ($250) and run a customer referral bonus ($100)',
          description:
            'Free up your own hours for high-margin sales while incentivizing existing customers to bring peers.',
          stateChanges: { money: 640, customers: 22, reputation: 8, energy: 12, risk: -4, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Delegation unlocks sustainable sales velocity',
            deterministicNarrative:
              'With fulfillment off your plate, you close 22 high-intent referrals and recover your energy for the final sprint.',
            feedback: 'Removing operational bottlenecks while leveraging warm referrals delivered high-ROI growth.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 12, resourceManagement: 14, riskManagement: 10, adaptability: 8 },
        },
        {
          id: 'b1_d4_o2',
          title: 'Buy the $350 newsletter sponsorship and handle fulfillment solo',
          description:
            'Bet on a massive wave of cold traffic and work late nights to process whatever comes in.',
          stateChanges: { money: 480, customers: 30, reputation: 3, energy: -24, risk: 12, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Newsletter spike pushes you to the brink of exhaustion',
            deterministicNarrative:
              'Thirty new orders pour in within 12 hours. You net $480 after ad spend, but 4 a.m. packing sessions leave your energy critically low.',
            feedback: 'The media buy paid off financially, but scaling demand without operational support created burnout risk.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 6, resourceManagement: 4, riskManagement: -4, adaptability: 6 },
        },
        {
          id: 'b1_d4_o3',
          title: 'Hold all cash in reserve and rely purely on organic search',
          description:
            'Spend $0 on growth or help this week to maximize your cash buffer.',
          stateChanges: { money: 150, customers: 5, reputation: 1, energy: -4, risk: -6, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Steady but slow organic trickle',
            deterministicNarrative:
              'Your bank balance stays safe, but momentum cools as only 5 new customers discover you organically.',
            feedback: 'Extreme conservatism preserved capital but missed a prime expansion window.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: -2, resourceManagement: 4, riskManagement: 6, adaptability: -4 },
        },
      ],
    },
    {
      id: 'b1_d5',
      roundLabel: 'Day 25 · The Final Week Push',
      context:
        'Five days remain in the 30-day challenge. A corporate buyer offers a $1,200 bulk contract if you can customize your offering by Day 30, or you can launch a recurring subscription to your existing customer base.',
      prompt: 'What is your closing move for Day 30?',
      options: [
        {
          id: 'b1_d5_o1',
          title: 'Convert top customers to a monthly retainer/replenishment plan',
          description:
            'Offer a 10% loyalty rate for customers who lock in a 3-month recurring plan today.',
          stateChanges: { money: 890, customers: 16, reputation: 11, energy: -10, risk: -6, day: 5 },
          hiddenConsequences: {
            eventTitle: 'Predictable recurring revenue seals a durable business',
            deterministicNarrative:
              'Existing customers jump at the loyalty plan, adding $890 in immediate cash and locking in predictable revenue for months ahead.',
            feedback: 'Recurring revenue transformed a 30-day hustle into a compounding business asset.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 14, resourceManagement: 12, riskManagement: 12, adaptability: 10 },
        },
        {
          id: 'b1_d5_o2',
          title: 'Go all-in on the $1,200 corporate bulk contract',
          description:
            'Pause retail orders for 5 days to build the custom corporate spec before the deadline.',
          stateChanges: { money: 720, customers: 1, reputation: 4, energy: -20, risk: 15, day: 5 },
          hiddenConsequences: {
            eventTitle: 'Corporate deal closes after intense customization sprint',
            deterministicNarrative:
              'You deliver the custom order with hours to spare and collect $720 net after bespoke materials, though retail growth stalls.',
            feedback: 'The whale contract boosted your cash total, though concentration in a single buyer raised risk.',
            tone: 'tense',
          },
          scoringEffects: { strategy: 6, resourceManagement: 6, riskManagement: -2, adaptability: 8 },
        },
        {
          id: 'b1_d5_o3',
          title: 'Negotiate a 50% deposit on the corporate deal while launching a light subscription',
          description:
            'Scope the corporate order to standard specs so you can serve both channels simultaneously.',
          stateChanges: { money: 960, customers: 12, reputation: 9, energy: -14, risk: 2, day: 5 },
          hiddenConsequences: {
            eventTitle: 'Standardized scope unlocks both enterprise and retail wins',
            deterministicNarrative:
              'The corporate buyer accepts your standard spec with a deposit, and your retail subscribers add another wave of high-margin cash.',
            feedback: 'Refusing custom scope creep let you capture enterprise revenue without sacrificing retail momentum.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 15, resourceManagement: 14, riskManagement: 10, adaptability: 12 },
        },
      ],
    },
  ],
};
