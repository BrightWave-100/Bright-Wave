import { ChallengeDefinitionServer } from '../../engine/types.js';

export const startupcrisisChallenge: ChallengeDefinitionServer = {
  id: 'startupcrisis',
  slug: 'the-startup-crisis',
  title: 'THE STARTUP CRISIS',
  subtitle: '30 days of runway left. Decide what to cut, protect, and bet on.',
  description:
    'Your startup has 30 days of runway left. You must decide what to cut, what to protect and where to take risks.',
  category: 'Business / Strategy',
  primaryCategory: 'Business',
  difficulty: 'Hard',
  estimatedMinutes: '6–8 min',
  tags: [
    'Corporate Strategy',
    'Crisis Leadership',
    'Resource Management',
    'Risk Management',
    'Strategy',
  ],
  scenarioIntro:
    'Your lead investor just pulled their term sheet after a macro downturn. You have 30 days of runway, an 8-person team, $42k in cash, and a half-built enterprise module.',
  stateMetrics: [
    { key: 'runwayDays', label: 'RUNWAY (DAYS)', unit: 'day', min: 0, max: 180 },
    { key: 'morale', label: 'MORALE', unit: 'number', min: 0, max: 100 },
    { key: 'revenue', label: 'MRR ($K)', unit: 'currency', min: 0, max: 200 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    runwayDays: 30,
    morale: 65,
    revenue: 18,
    risk: 45,
  },
  scoringRules: [
    { key: 'strategy', label: 'Strategy', weight: 30, baseline: 50 },
    { key: 'leadership', label: 'Leadership', weight: 25, baseline: 50 },
    { key: 'resourceManagement', label: 'Resource Management', weight: 25, baseline: 50 },
    { key: 'risk', label: 'Risk', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'sc_d1',
      roundLabel: 'Hour 1 · Addressing the Team',
      context:
        'Rumors of the pulled term sheet are already circulating in Slack. Your burn rate is $40k/month above revenue.',
      prompt: 'How do you address the team and immediate burn rate?',
      options: [
        {
          id: 'sc_d1_o1',
          title: 'Open the books transparently, freeze non-essential SaaS spend, and propose temporary founder + executive salary reductions',
          description:
            'Lead from the front by cutting founder draw to minimal survival levels and eliminating $12k/mo of cloud/tool waste.',
          stateChanges: { runwayDays: 22, morale: 8, revenue: 0, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Transparency rallies the engineering core',
            deterministicNarrative:
              'Seeing leadership take the first sacrifice builds deep trust. Engineers voluntarily audit cloud instances, adding 22 days of runway overnight.',
            feedback: 'Transparent leadership and shared sacrifice extended runway without shattering morale.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 12, leadership: 16, resourceManagement: 12, risk: 10 },
        },
        {
          id: 'sc_d1_o2',
          title: 'Immediately lay off 4 of 8 team members without warning',
          description:
            'Slash payroll by 50% today to double your runway on paper.',
          stateChanges: { runwayDays: 35, morale: -28, revenue: -2, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Runway extends, but shockwaves freeze product velocity',
            deterministicNarrative:
              'Your cash lasts longer, but the remaining 4 employees spend the week updating resumes and two customer accounts churn.',
            feedback: 'Abrupt cuts extended cash mathematically but damaged execution capacity and trust.',
            tone: 'tense',
          },
          scoringEffects: { strategy: 2, leadership: -12, resourceManagement: 8, risk: -4 },
        },
        {
          id: 'sc_d1_o3',
          title: 'Pretend the round is still closing and change nothing for two weeks',
          description:
            'Keep morale artificially high while you cold-email 50 new VCs.',
          stateChanges: { runwayDays: -14, morale: -15, revenue: 0, risk: 25 },
          hiddenConsequences: {
            eventTitle: 'Two weeks of full burn vanish with zero term sheets',
            deterministicNarrative:
              'VCs sense desperation and pass. When the team discovers the truth two weeks later, you have only 16 days of cash left.',
            feedback: 'Denial burned half your remaining runway and destroyed leadership credibility.',
            tone: 'tense',
          },
          scoringEffects: { strategy: -14, leadership: -14, resourceManagement: -14, risk: -16 },
        },
      ],
    },
    {
      id: 'sc_d2',
      roundLabel: 'Day 7 · Product Roadmap Triage',
      context:
        'Your team is split between a 6-month AI analytics vision and a compliance export tool that 12 mid-market prospects asked to buy this month.',
      prompt: 'Which product direction do you mandate?',
      options: [
        {
          id: 'sc_d2_o1',
          title: 'Pause the 6-month vision and ship the paid compliance module in 10 days',
          description:
            'Focus 100% of engineering on the feature prospects are willing to pay annual contracts for right now.',
          stateChanges: { runwayDays: 28, morale: 6, revenue: 14, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Annual upfront contracts inject immediate cash',
            deterministicNarrative:
              'Six prospects sign annual prepay agreements as soon as the compliance module ships, adding $14k MRR and nearly a month of runway.',
            feedback: 'Prioritizing immediate customer-funded revenue over speculative roadmap features saved the company.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 15, leadership: 10, resourceManagement: 14, risk: 12 },
        },
        {
          id: 'sc_d2_o2',
          title: 'Keep half the team on both projects to avoid disappointing anyone',
          description:
            'Split the remaining engineers across both codebases.',
          stateChanges: { runwayDays: -8, morale: -8, revenue: 3, risk: 12 },
          hiddenConsequences: {
            eventTitle: 'Context switching delays both releases',
            deterministicNarrative:
              'Neither feature ships cleanly on time, and engineers burn out juggling bug fixes across two unfinished branches.',
            feedback: 'Refusing to choose in a crisis starved both initiatives of critical mass.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: -8, leadership: -6, resourceManagement: -8, risk: -6 },
        },
        {
          id: 'sc_d2_o3',
          title: 'Bet everything on the 6-month moonshot demo to impress Tier-1 VCs',
          description:
            'Ignore short-term customer requests and build a flashy prototype.',
          stateChanges: { runwayDays: -10, morale: 2, revenue: -1, risk: 22 },
          hiddenConsequences: {
            eventTitle: 'Flashy demo gets compliments, not wire transfers',
            deterministicNarrative:
              'Investors call the prototype "promising for Q4," leaving you with shrinking cash and no new customer revenue.',
            feedback: 'Optimizing for VC theater over customer cash flow during a crunch increased insolvency risk.',
            tone: 'tense',
          },
          scoringEffects: { strategy: -10, leadership: -4, resourceManagement: -10, risk: -12 },
        },
      ],
    },
    {
      id: 'sc_d3',
      roundLabel: 'Day 15 · Key Engineer Retention',
      context:
        'Your lead backend architect receives a recruiter offer with a 40% cash raise from a big tech company.',
      prompt: 'How do you respond to your lead architect?',
      options: [
        {
          id: 'sc_d3_o1',
          title: 'Offer an immediate equity refresh, Co-CTO title path, and automatic salary step-up tied to cash-flow positivity',
          description:
            'Align their upside directly with the turnaround milestone you are weeks away from hitting.',
          stateChanges: { runwayDays: 6, morale: 14, revenue: 4, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Architect stays and leads the reliability push',
            deterministicNarrative:
              'Energized by real ownership and a contractual cash trigger, your architect declines the recruiter and closes a key technical sale.',
            feedback: 'Milestone-linked incentives retained critical talent without breaking current cash constraints.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 12, leadership: 15, resourceManagement: 10, risk: 10 },
        },
        {
          id: 'sc_d3_o2',
          title: 'Match the 40% cash raise immediately out of your remaining runway',
          description:
            'Pay whatever it takes in cash today so they do not leave.',
          stateChanges: { runwayDays: -14, morale: -6, revenue: 0, risk: 14 },
          hiddenConsequences: {
            eventTitle: 'Cash burn spikes and peers resent the secret deal',
            deterministicNarrative:
              'The architect stays, but word leaks about the cash raise while others took cuts, hurting team cohesion and runway.',
            feedback: 'Breaking shared compensation discipline during a cash freeze eroded trust and shortened runway.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: -6, leadership: -8, resourceManagement: -10, risk: -6 },
        },
        {
          id: 'sc_d3_o3',
          title: 'Let them leave immediately and transition their work to junior devs',
          description:
            'Save their entire salary and redistribute tasks.',
          stateChanges: { runwayDays: 12, morale: -12, revenue: -3, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'Payroll drops, but deployment outages slow sales',
            deterministicNarrative:
              'You save cash on payroll, but losing institutional knowledge causes two production hiccups during enterprise trials.',
            feedback: 'Losing your core technical pillar saved payroll at the cost of product stability.',
            tone: 'tense',
          },
          scoringEffects: { strategy: 0, leadership: -4, resourceManagement: 4, risk: -4 },
        },
      ],
    },
    {
      id: 'sc_d4',
      roundLabel: 'Day 22 · The Predatory Term Sheet',
      context:
        'A turnaround fund offers $500k immediately, but demands 45% of the company and full board control.',
      prompt: 'How do you handle the predatory financing offer?',
      options: [
        {
          id: 'sc_d4_o1',
          title: 'Decline the predatory deal and offer existing customers a 20% discount for annual upfront renewal',
          description:
            'Use customer financing to reach default-alive status while keeping control of your cap table.',
          stateChanges: { runwayDays: 45, morale: 12, revenue: 12, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Customer prepayments push you into default-alive territory',
            deterministicNarrative:
              'Nine existing customers convert to annual upfront billing, injecting $110k in non-dilutive cash and extending runway past 100 days.',
            feedback: 'Non-dilutive customer financing preserved founder control and validated real enterprise value.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 16, leadership: 12, resourceManagement: 16, risk: 12 },
        },
        {
          id: 'sc_d4_o2',
          title: 'Sign the 45% predatory term sheet to guarantee survival',
          description:
            'Give up control and nearly half the company for immediate bank safety.',
          stateChanges: { runwayDays: 60, morale: -18, revenue: 0, risk: 6 },
          hiddenConsequences: {
            eventTitle: 'Company survives, but founders and team lose governance',
            deterministicNarrative:
              'The $500k hits the account, but the new board immediately replaces your product roadmap and dilutes early employee options.',
            feedback: 'Panic dilution solved the bank balance at the expense of long-term governance and team equity.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: -6, leadership: -10, resourceManagement: 2, risk: 0 },
        },
        {
          id: 'sc_d4_o3',
          title: 'Counter-propose a $150k uncapped bridge note with existing angel investors matched by customer revenue',
          description:
            'Show angels your new MRR jump and raise a modest, clean bridge to profitability.',
          stateChanges: { runwayDays: 50, morale: 10, revenue: 8, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Existing angels back your turnaround momentum',
            deterministicNarrative:
              'Impressed by your disciplined burn reduction and new revenue, three insiders wire $150k on clean terms within 72 hours.',
            feedback: 'Combining operational proof with clean insider support secured runway without toxic terms.',
            tone: 'strategic',
          },
          scoringEffects: { strategy: 14, leadership: 12, resourceManagement: 12, risk: 14 },
        },
      ],
    },
    {
      id: 'sc_d5',
      roundLabel: 'Day 30 · Setting the New Operating Cadence',
      context:
        'You have survived the initial 30-day shock. Now you must set the company operating strategy for the next quarter.',
      prompt: 'How do you lock in the turnaround on Day 30?',
      options: [
        {
          id: 'sc_d5_o1',
          title: 'Commit to profitable unit-economics growth and hire only when MRR covers payroll 1.2x',
          description:
            'Institutionalize financial discipline while rewarding the team with a profit-sharing pool.',
          stateChanges: { runwayDays: 35, morale: 14, revenue: 15, risk: -14 },
          hiddenConsequences: {
            eventTitle: 'Default-alive startup emerges stronger than before',
            deterministicNarrative:
              'Your startup crosses cash-flow breakeven in Week 5, with a battle-tested team and zero dependency on external fundraising cycles.',
            feedback: 'Disciplined capital allocation turned a near-death crisis into durable profitability.',
            tone: 'exciting',
          },
          scoringEffects: { strategy: 14, leadership: 14, resourceManagement: 14, risk: 14 },
        },
        {
          id: 'sc_d5_o2',
          title: 'Immediately ramp burn back up to chase hyper-growth',
          description:
            'Double ad spend and hire 5 sales reps on credit.',
          stateChanges: { runwayDays: -30, morale: -4, revenue: 8, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Premature scaling re-opens the cash deficit',
            deterministicNarrative:
              'New hires take months to ramp while payroll spikes immediately, putting you right back on the fundraising treadmill.',
            feedback: 'Abandoning cost discipline the moment pressure eased recreated the original vulnerability.',
            tone: 'tense',
          },
          scoringEffects: { strategy: -8, leadership: -4, resourceManagement: -10, risk: -12 },
        },
        {
          id: 'sc_d5_o3',
          title: 'Freeze all product investment and operate purely in maintenance mode',
          description:
            'Stop shipping new features to hoard every dollar.',
          stateChanges: { runwayDays: 20, morale: -10, revenue: -4, risk: 4 },
          hiddenConsequences: {
            eventTitle: 'Cash piles up, but product stagnation slows expansion',
            deterministicNarrative:
              'Costs stay low, but ambitious engineers grow restless as competitors begin copying your compliance module.',
            feedback: 'Over-correcting into permanent stagnation protected cash but capped strategic upside.',
            tone: 'cautious',
          },
          scoringEffects: { strategy: 2, leadership: 0, resourceManagement: 6, risk: 4 },
        },
      ],
    },
  ],
};
