import { ChallengeDefinitionServer } from '../../engine/types.js';

export const survive30daysChallenge: ChallengeDefinitionServer = {
  id: 'survive30days',
  slug: 'survive-30-days-with-1000',
  title: 'SURVIVE 30 DAYS WITH $1,000',
  subtitle: 'Navigate a 30-day cash crunch while protecting stability and wellbeing.',
  description:
    'You have $1,000, no income and 30 days to make it through. Balance food, housing, transportation, emergencies and opportunities.',
  category: 'Money / Survival',
  primaryCategory: 'Money',
  difficulty: 'Medium',
  estimatedMinutes: '5–7 min',
  tags: [
    'Survival',
    'Budget & Planning',
    'Resource Management',
    'Risk Management',
    'Adaptability',
  ],
  disclaimer:
    'Fictional gameplay simulation only. Not real-world financial, budgeting, or emergency advice.',
  scenarioIntro:
    'Your seasonal contract just ended and your next confirmed role begins in 30 days. You have exactly $1,000 in cash to cover shelter, food, transit, and unexpected shocks.',
  stateMetrics: [
    { key: 'money', label: 'CASH', unit: 'currency', min: 0, max: 5000 },
    { key: 'stability', label: 'STABILITY', unit: 'number', min: 0, max: 100 },
    { key: 'energy', label: 'ENERGY', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
    { key: 'day', label: 'DAY', unit: 'day', min: 1, max: 30 },
  ],
  startingState: {
    money: 1000,
    stability: 70,
    energy: 85,
    risk: 25,
    day: 1,
  },
  scoringRules: [
    { key: 'resourceManagement', label: 'Resource Management', weight: 30, baseline: 50 },
    { key: 'planning', label: 'Planning', weight: 25, baseline: 50 },
    { key: 'riskManagement', label: 'Risk Management', weight: 25, baseline: 50 },
    { key: 'adaptability', label: 'Adaptability', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 's30_d1',
      roundLabel: 'Day 1 · Shelter & Baseline Budget',
      context:
        'Your landlord asks for $650 for the month upfront, or offers a $400 agreement if you handle building maintenance and yard upkeep twice a week.',
      prompt: 'How do you handle your housing cost on Day 1?',
      options: [
        {
          id: 's30_d1_o1',
          title: 'Take the $400 maintenance work-exchange agreement in writing',
          description:
            'Trade 6 hours a week of physical upkeep to keep $250 extra in liquid cash.',
          stateChanges: { money: -400, stability: 10, energy: -8, risk: -8, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Written agreement locks in shelter and preserves $600 cash',
            deterministicNarrative:
              'You sign the maintenance addendum and keep $600 in your pocket, giving you a vital buffer for the remaining 3 weeks.',
            feedback: 'Trading manageable time for a 38% reduction in fixed overhead dramatically improved your runway.',
            tone: 'strategic',
          },
          scoringEffects: { resourceManagement: 14, planning: 12, riskManagement: 10, adaptability: 10 },
        },
        {
          id: 's30_d1_o2',
          title: 'Pay the full $650 immediately to keep all your time free',
          description:
            'Clear the housing bill completely so you have zero landlord obligations.',
          stateChanges: { money: -650, stability: 8, energy: 2, risk: 6, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Roof secured, but only $350 left for 24 days',
            deterministicNarrative:
              'Your housing is settled, but watching your balance drop to $350 on Day 1 leaves very little margin for surprises.',
            feedback: 'Paying full rate preserved energy but depleted 65% of your total capital on day one.',
            tone: 'cautious',
          },
          scoringEffects: { resourceManagement: 2, planning: 4, riskManagement: 0, adaptability: 0 },
        },
        {
          id: 's30_d1_o3',
          title: 'Delay paying rent and keep the $1,000 in cash for now',
          description:
            'Avoid the conversation and hope to pay at the end of the month with late fees.',
          stateChanges: { money: 0, stability: -22, energy: -10, risk: 25, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Late notice and $75 penalty added to your ledger',
            deterministicNarrative:
              'You still hold $1,000 cash, but a formal late notice on your door spikes your stress and adds a $75 penalty.',
            feedback: 'Uncommunicated payment delays created legal and financial compounding risk.',
            tone: 'tense',
          },
          scoringEffects: { resourceManagement: -10, planning: -12, riskManagement: -14, adaptability: -4 },
        },
      ],
    },
    {
      id: 's30_d2',
      roundLabel: 'Day 7 · Food & Nutrition Plan',
      context:
        'You need a grocery and meal strategy for the next two weeks. Bulk staples cost $95 upfront; daily convenience meals average $14/day.',
      prompt: 'How do you structure your food budget?',
      options: [
        {
          id: 's30_d2_o1',
          title: 'Buy $95 of bulk staples (oats, rice, beans, frozen produce, eggs) and batch-cook',
          description:
            'Invest two hours Sunday prepping nutritious meals at roughly $3.40 per day.',
          stateChanges: { money: -95, stability: 6, energy: 8, risk: -6, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Two weeks of meals locked in under $100',
            deterministicNarrative:
              'Your kitchen is stocked with 40+ balanced portions, keeping your energy high and eliminating impulse food spending.',
            feedback: 'Upfront meal planning cut daily burn rate by 75% while boosting physical energy.',
            tone: 'analytical',
          },
          scoringEffects: { resourceManagement: 12, planning: 14, riskManagement: 8, adaptability: 6 },
        },
        {
          id: 's30_d2_o2',
          title: 'Survive on $35 of instant noodles to save every dollar',
          description:
            'Cut food spending to the bone regardless of nutrition.',
          stateChanges: { money: -35, stability: -6, energy: -22, risk: 8, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Severe fatigue sets in by mid-week',
            deterministicNarrative:
              'You save $60 in cash, but the crash in nutrition drains your focus and stamina when weekend gig opportunities appear.',
            feedback: 'False economy on basic nutrition degraded your capacity to earn and adapt.',
            tone: 'tense',
          },
          scoringEffects: { resourceManagement: 0, planning: -6, riskManagement: -6, adaptability: -4 },
        },
        {
          id: 's30_d2_o3',
          title: 'Buy meals day-by-day as needed ($190 over two weeks)',
          description:
            'Keep cash flexible today and grab cheap takeout or single groceries daily.',
          stateChanges: { money: -190, stability: 0, energy: 2, risk: 10, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Small daily purchases quietly drain $190',
            deterministicNarrative:
              'Each $12–$15 stop felt harmless in the moment, but over 14 days it consumed nearly double a planned grocery run.',
            feedback: 'Unplanned daily convenience spending created a silent cash leak.',
            tone: 'cautious',
          },
          scoringEffects: { resourceManagement: -8, planning: -10, riskManagement: -4, adaptability: 0 },
        },
      ],
    },
    {
      id: 's30_d3',
      roundLabel: 'Day 13 · Transit Breakdown & Gig Offer',
      context:
        'A local event coordinator offers you $240 for a 2-day logistics shift across town, but your commuter bike tire splits on the way out.',
      prompt: 'How do you handle transit and the 2-day shift?',
      options: [
        {
          id: 's30_d3_o1',
          title: 'Spend $28 on a replacement tire tube kit, fix it yourself, and work the shift',
          description:
            'Use an hour this evening to repair the bike and lock in the $240 payout.',
          stateChanges: { money: 212, stability: 8, energy: -12, risk: -6, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Repair holds strong and you clear $212 net income',
            deterministicNarrative:
              'You patch the wheel in 40 minutes, complete both shifts on time, and restore your cash cushion.',
            feedback: 'Fixing root-cause infrastructure cheaply unlocked high-margin short-term income.',
            tone: 'exciting',
          },
          scoringEffects: { resourceManagement: 12, planning: 10, riskManagement: 10, adaptability: 14 },
        },
        {
          id: 's30_d3_o2',
          title: 'Take rideshares to both shifts ($85 total) and net $155',
          description:
            'Skip the repair hassle and use rideshares to guarantee you arrive fresh.',
          stateChanges: { money: 155, stability: 4, energy: -6, risk: 0, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Shift completed, though transit ate a third of your pay',
            deterministicNarrative:
              'You earn $155 after rideshare fares, though your bike remains broken in the hallway for future errands.',
            feedback: 'Capturing the income was smart, but leaving your primary transit unfixed increased future costs.',
            tone: 'cautious',
          },
          scoringEffects: { resourceManagement: 4, planning: 2, riskManagement: 4, adaptability: 6 },
        },
        {
          id: 's30_d3_o3',
          title: 'Decline the shift to avoid spending money on repairs or transit',
          description:
            'Stay home and preserve your current cash and energy.',
          stateChanges: { money: -40, stability: -4, energy: 6, risk: 8, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Missed income opportunity while fixed bills continue',
            deterministicNarrative:
              'You rest at home, but routine utility and phone charges still deduct $40 from your dwindling balance.',
            feedback: 'Passing on a high-certainty $240 shift over a $28 repair cost you valuable runway.',
            tone: 'tense',
          },
          scoringEffects: { resourceManagement: -8, planning: -6, riskManagement: -4, adaptability: -10 },
        },
      ],
    },
    {
      id: 's30_d4',
      roundLabel: 'Day 19 · Utility Spike & Sudden Expense',
      context:
        'A cracked filling causes sharp tooth pain, and your $75 utility bill is due the same week. A community clinic offers a $90 sliding-scale visit tomorrow morning.',
      prompt: 'How do you prioritize health and bills on Day 19?',
      options: [
        {
          id: 's30_d4_o1',
          title: 'Book the $90 sliding-scale clinic visit and set a $75 utility payment plan ($35 now, $40 Day 28)',
          description:
            'Call the utility provider before the due date to split the bill without late fees and treat the tooth immediately.',
          stateChanges: { money: -125, stability: 10, energy: 8, risk: -10, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Pain resolved early and utility account stays in good standing',
            deterministicNarrative:
              'The clinic seals the filling in 30 minutes and the utility company approves a fee-free split payment.',
            feedback: 'Early preventive care and proactive creditor communication prevented a cascading crisis.',
            tone: 'strategic',
          },
          scoringEffects: { resourceManagement: 12, planning: 12, riskManagement: 14, adaptability: 12 },
        },
        {
          id: 's30_d4_o2',
          title: 'Ignore the tooth pain, pay the $75 utility bill in full, and hope it fades',
          description:
            'Save the $90 medical cost and push through the final 11 days.',
          stateChanges: { money: -215, stability: -12, energy: -20, risk: 18, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Infection worsens into a $140 urgent visit four days later',
            deterministicNarrative:
              'By Day 23 the pain becomes unbearable, forcing an urgent walk-in visit that costs $50 more than the early clinic slot.',
            feedback: 'Delaying essential care turned a manageable $90 fix into a costly emergency.',
            tone: 'tense',
          },
          scoringEffects: { resourceManagement: -6, planning: -8, riskManagement: -12, adaptability: -6 },
        },
        {
          id: 's30_d4_o3',
          title: 'Pay both in full ($165) and sell an unused monitor for $80 to offset the hit',
          description:
            'Clear both obligations immediately and liquidate spare gear.',
          stateChanges: { money: -85, stability: 8, energy: 4, risk: -8, day: 6 },
          hiddenConsequences: {
            eventTitle: 'Clean ledger and quick local sale cushion the blow',
            deterministicNarrative:
              'Both bills are paid in full and a local buyer picks up your spare monitor for $80 cash the same afternoon.',
            feedback: 'Liquidating idle assets to cover essential expenses kept your balance sheet resilient.',
            tone: 'exciting',
          },
          scoringEffects: { resourceManagement: 14, planning: 10, riskManagement: 12, adaptability: 14 },
        },
      ],
    },
    {
      id: 's30_d5',
      roundLabel: 'Day 25 · The Final 5-Day Bridge',
      context:
        'Your new full-time role starts in 5 days, requiring clean work attire ($45) and 5 days of transit and meals ($65). A neighbor also offers $130 to help catalog their garage inventory over the weekend.',
      prompt: 'How do you close out the final 5 days?',
      options: [
        {
          id: 's30_d5_o1',
          title: 'Complete the $130 weekend cataloging gig and prep your work attire and meal pack',
          description:
            'Put in one structured weekend shift to finish the month with more cash than you had at mid-month.',
          stateChanges: { money: 20, stability: 12, energy: -6, risk: -10, day: 5 },
          hiddenConsequences: {
            eventTitle: 'Day 30 reached with positive cash flow and full readiness',
            deterministicNarrative:
              'The weekend gig covers your entire final week of transit, food, and attire with $20 to spare. You walk into Day 30 stable and prepared.',
            feedback: 'Disciplined execution through the final week turned survival into a strong launchpad.',
            tone: 'exciting',
          },
          scoringEffects: { resourceManagement: 12, planning: 12, riskManagement: 10, adaptability: 10 },
        },
        {
          id: 's30_d5_o2',
          title: 'Skip the weekend work, buy the $45 attire + $65 essentials, and rest up',
          description:
            'Prioritize 100% rest before starting your new job.',
          stateChanges: { money: -110, stability: 6, energy: 14, risk: -2, day: 5 },
          hiddenConsequences: {
            eventTitle: 'Well-rested finish with a leaner bank balance',
            deterministicNarrative:
              'You arrive at Day 30 refreshed and ready, drawing down $110 from your remaining cash buffer.',
            feedback: 'Prioritizing recovery worked because you built a sufficient cash cushion earlier.',
            tone: 'strategic',
          },
          scoringEffects: { resourceManagement: 6, planning: 8, riskManagement: 6, adaptability: 4 },
        },
        {
          id: 's30_d5_o3',
          title: 'Splurge $180 on a celebratory dinner and new wardrobe upgrade',
          description:
            'Celebrate making it to the final week before the first paycheck even lands.',
          stateChanges: { money: -245, stability: -8, energy: 4, risk: 16, day: 5 },
          hiddenConsequences: {
            eventTitle: 'Premature celebration leaves your buffer razor-thin',
            deterministicNarrative:
              'The celebration feels great Friday night, but realizing your first paycheck is still two weeks away creates unnecessary last-minute stress.',
            feedback: 'Celebrating before cash actually clears exposed you to final-mile liquidity risk.',
            tone: 'cautious',
          },
          scoringEffects: { resourceManagement: -10, planning: -8, riskManagement: -10, adaptability: -4 },
        },
      ],
    },
  ],
};
