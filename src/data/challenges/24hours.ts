import { ChallengeDefinitionServer } from '../../engine/types.js';

export const hours24Challenge: ChallengeDefinitionServer = {
  id: '24hours',
  slug: 'you-have-24-hours',
  title: 'YOU HAVE 24 HOURS',
  subtitle: 'One day, competing high-stakes priorities, and finite energy.',
  description:
    'You have one day, too many priorities and limited energy. Decide what deserves your attention.',
  category: 'Strategy / Productivity',
  primaryCategory: 'Strategy',
  difficulty: 'Easy',
  estimatedMinutes: '4–6 min',
  tags: [
    'Time Pressure',
    'Crisis Leadership',
    'Prioritization',
    'Adaptability',
    'Strategy',
  ],
  scenarioIntro:
    'It is 7:00 AM. In the next 24 hours you have a flagship client keynote deck due, a production bug escalated by support, a family birthday dinner at 7:00 PM, and 48 unread messages.',
  stateMetrics: [
    { key: 'impact', label: 'IMPACT', unit: 'number', min: 0, max: 100 },
    { key: 'energy', label: 'ENERGY', unit: 'number', min: 0, max: 100 },
    { key: 'hoursLeft', label: 'HOURS LEFT', unit: 'hours', min: 0, max: 24 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    impact: 40,
    energy: 90,
    hoursLeft: 24,
    risk: 30,
  },
  scoringRules: [
    { key: 'prioritization', label: 'Prioritization', weight: 30, baseline: 50 },
    { key: 'efficiency', label: 'Efficiency', weight: 25, baseline: 50 },
    { key: 'strategy', label: 'Strategy', weight: 25, baseline: 50 },
    { key: 'adaptability', label: 'Adaptability', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'h24_d1',
      roundLabel: '7:00 AM · Morning Deep-Work Block',
      context:
        'Your cognitive energy is at its peak, but your inbox has 48 unread threads and the keynote architecture is still a blank page.',
      prompt: 'How do you spend your first 3 hours (7:00 AM – 10:00 AM)?',
      options: [
        {
          id: 'h24_d1_o1',
          title: 'Scan 5 minutes for critical fires, silence notifications, and lock in 2.5 hours on the keynote core narrative',
          description:
            'Protect your peak mental window for the highest-leverage deliverable first.',
          stateChanges: { impact: 20, energy: -12, hoursLeft: -3, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Keynote backbone completed before 10:00 AM',
            deterministicNarrative:
              'With zero context-switching, you finish 80% of the strategic keynote deck while your mind is sharpest.',
            feedback: 'Front-loading high-cognition work before reactive inbox triage created massive leverage.',
            tone: 'strategic',
          },
          scoringEffects: { prioritization: 16, efficiency: 15, strategy: 14, adaptability: 8 },
        },
        {
          id: 'h24_d1_o2',
          title: 'Reply to all 48 emails and Slack messages in chronological order',
          description:
            'Reach inbox zero first so nobody is waiting on you.',
          stateChanges: { impact: 4, energy: -18, hoursLeft: -3, risk: 12 },
          hiddenConsequences: {
            eventTitle: 'Three hours gone on low-priority threads',
            deterministicNarrative:
              'Your inbox is clean, but new replies are already arriving and your flagship keynote is still at 0%.',
            feedback: 'Confusing reactive activity with strategic impact burned your best morning focus.',
            tone: 'cautious',
          },
          scoringEffects: { prioritization: -12, efficiency: -8, strategy: -10, adaptability: -2 },
        },
        {
          id: 'h24_d1_o3',
          title: 'Multitask between Slack, the production bug, and the deck simultaneously',
          description:
            'Keep three windows open and jump between them every 10 minutes.',
          stateChanges: { impact: 6, energy: -24, hoursLeft: -3, risk: 14 },
          hiddenConsequences: {
            eventTitle: 'Context-switching penalty leaves all three tasks half-baked',
            deterministicNarrative:
              'By 10:00 AM you feel exhausted, introduced a typo into the bug branch, and only drafted three slides.',
            feedback: 'Rapid task-switching imposed a heavy cognitive tax and increased error rates.',
            tone: 'tense',
          },
          scoringEffects: { prioritization: -10, efficiency: -14, strategy: -8, adaptability: -4 },
        },
      ],
    },
    {
      id: 'h24_d2',
      roundLabel: '10:00 AM · The Production Escalation',
      context:
        'Support flags a checkout timeout affecting 8% of mobile users. You can debug it solo for 4 hours, or pair for 45 minutes with the database lead to isolate and delegate the patch.',
      prompt: 'How do you handle the production incident?',
      options: [
        {
          id: 'h24_d2_o1',
          title: 'Run a focused 45-minute root-cause pairing session and empower the DB lead to ship the fix',
          description:
            'Bring the right domain specialist in immediately and set a 12:30 PM verification checkpoint.',
          stateChanges: { impact: 16, energy: -10, hoursLeft: -3, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Query index patch deployed by noon with zero downtime',
            deterministicNarrative:
              'Together you spot the missing index in 25 minutes. The DB lead deploys and verifies the fix while you finalize the keynote data charts.',
            feedback: 'Targeted collaboration and delegation resolved the incident in a quarter of the time.',
            tone: 'exciting',
          },
          scoringEffects: { prioritization: 14, efficiency: 16, strategy: 14, adaptability: 12 },
        },
        {
          id: 'h24_d2_o2',
          title: 'Dive into the logs alone for the next 4 hours to fix every line yourself',
          description:
            'Refuse to bother teammates and shoulder the entire debugging marathon solo.',
          stateChanges: { impact: 8, energy: -28, hoursLeft: -4, risk: 6 },
          hiddenConsequences: {
            eventTitle: 'Bug fixed at 2:00 PM, but your afternoon schedule is crushed',
            deterministicNarrative:
              'You eventually patch the timeout, but you skipped lunch and lost four hours of strategic bandwidth.',
            feedback: 'Heroic solo debugging solved the symptom at a steep opportunity cost.',
            tone: 'cautious',
          },
          scoringEffects: { prioritization: -4, efficiency: -8, strategy: -4, adaptability: 2 },
        },
        {
          id: 'h24_d2_o3',
          title: 'Ignore the bug until tomorrow so you can polish slide animations',
          description:
            'Leave 8% of mobile checkouts failing for 24 hours.',
          stateChanges: { impact: -14, energy: -6, hoursLeft: -3, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Customer complaints escalate to the CEO by mid-afternoon',
            deterministicNarrative:
              'Unaddressed checkout failures trigger an emergency executive call at 3:00 PM that derails your afternoon anyway.',
            feedback: 'Ignoring a live customer-impacting incident guaranteed a larger disruption later.',
            tone: 'tense',
          },
          scoringEffects: { prioritization: -14, efficiency: -6, strategy: -12, adaptability: -10 },
        },
      ],
    },
    {
      id: 'h24_d3',
      roundLabel: '1:30 PM · The Unscheduled Calendar Ambush',
      context:
        'A colleague drops a 90-minute "brainstorming sync" on your calendar for 2:00 PM with no agenda attached.',
      prompt: 'How do you handle the 90-minute meeting invite?',
      options: [
        {
          id: 'h24_d3_o1',
          title: 'Request a written 3-bullet prompt async or offer a crisp 15-minute standup at 4:30 PM',
          description:
            'Protect your afternoon execution block while still being helpful on specific blockers.',
          stateChanges: { impact: 12, energy: -6, hoursLeft: -3, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Async bullets resolve the question in 8 minutes flat',
            deterministicNarrative:
              'Once asked to write down the goal, your colleague realizes they only needed approval on two copy lines—saving 80 minutes for both of you.',
            feedback: 'Converting unstructured meetings into crisp async decisions preserved high-value hours.',
            tone: 'strategic',
          },
          scoringEffects: { prioritization: 15, efficiency: 16, strategy: 12, adaptability: 10 },
        },
        {
          id: 'h24_d3_o2',
          title: 'Attend the full 90-minute brainstorming session out of politeness',
          description:
            'Sit through the whole call while trying to edit slides on your second monitor.',
          stateChanges: { impact: 2, energy: -16, hoursLeft: -3, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Ninety minutes drift by without a concrete decision',
            deterministicNarrative:
              'The call meanders across five topics and drains your afternoon momentum.',
            feedback: 'Yielding your calendar to agenda-free meetings traded prime execution time for social comfort.',
            tone: 'cautious',
          },
          scoringEffects: { prioritization: -10, efficiency: -10, strategy: -6, adaptability: 0 },
        },
        {
          id: 'h24_d3_o3',
          title: 'Decline without explanation and go offline',
          description:
            'Ghost the invite completely.',
          stateChanges: { impact: 6, energy: -4, hoursLeft: -3, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'You save time, but leave a cross-team dependency blocked',
            deterministicNarrative:
              'You finish your slides, though a 5-minute check-in would have prevented a misunderstanding on shared launch dates.',
            feedback: 'Protecting time works best when paired with a fast async path for genuine blockers.',
            tone: 'analytical',
          },
          scoringEffects: { prioritization: 4, efficiency: 6, strategy: 0, adaptability: -4 },
        },
      ],
    },
    {
      id: 'h24_d4',
      roundLabel: '5:00 PM · Pre-Dinner Handoff & Family Commitment',
      context:
        'The family birthday dinner is at 7:00 PM. Your keynote deck is 95% complete, and a teammate offers to proofread the appendix charts if you send a clean handoff brief.',
      prompt: 'How do you manage the evening transition?',
      options: [
        {
          id: 'h24_d4_o1',
          title: 'Lock the core deck, send a 10-minute verification checklist to your teammate, and arrive at dinner fully present',
          description:
            'Finish the high-value 95%, delegate final QA cleanly, and honor your personal commitment.',
          stateChanges: { impact: 14, energy: 14, hoursLeft: -5, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Clean handoff and restorative evening recharge your focus',
            deterministicNarrative:
              'Your teammate catches two chart labels while you enjoy a disconnected evening with family, returning home at 10:00 PM refreshed.',
            feedback: 'Knowing when a deliverable is at diminishing returns allowed both professional polish and personal recovery.',
            tone: 'exciting',
          },
          scoringEffects: { prioritization: 14, efficiency: 14, strategy: 14, adaptability: 14 },
        },
        {
          id: 'h24_d4_o2',
          title: 'Cancel the family birthday dinner to spend 4 hours tweaking slide fonts and margins',
          description:
            'Obsess over cosmetic details alone at the office until 10:00 PM.',
          stateChanges: { impact: 4, energy: -20, hoursLeft: -5, risk: 6 },
          hiddenConsequences: {
            eventTitle: 'Marginal visual tweaks cost personal trust and stamina',
            deterministicNarrative:
              'The slides look 2% cleaner, but you miss an irreplaceable milestone and feel burned out by 10:00 PM.',
            feedback: 'Perfectionism on low-leverage details carried a high human and energy cost.',
            tone: 'tense',
          },
          scoringEffects: { prioritization: -8, efficiency: -10, strategy: -6, adaptability: -6 },
        },
        {
          id: 'h24_d4_o3',
          title: 'Go to dinner but spend the entire meal typing on your phone under the table',
          description:
            'Try to be in two places at once.',
          stateChanges: { impact: 2, energy: -14, hoursLeft: -5, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'Half-present at dinner and accidentally overwrite a slide version on mobile',
            deterministicNarrative:
              'Nobody at the table gets your real attention, and editing complex slides on a phone screen introduces formatting glitches.',
            feedback: 'Half-presence delivered the worst of both worlds: poor work quality and zero recovery.',
            tone: 'cautious',
          },
          scoringEffects: { prioritization: -10, efficiency: -12, strategy: -8, adaptability: -4 },
        },
      ],
    },
    {
      id: 'h24_d5',
      roundLabel: '10:30 PM · Night Rest vs. All-Nighter',
      context:
        'You have 8.5 hours until the 7:00 AM keynote delivery. Your deck is verified and ready.',
      prompt: 'How do you spend the final overnight hours?',
      options: [
        {
          id: 'h24_d5_o1',
          title: 'Do a 15-minute vocal run-through, lay out your morning setup, and get 7.5 hours of sleep',
          description:
            'Protect executive presence and mental sharpness for the live Q&A.',
          stateChanges: { impact: 14, energy: 22, hoursLeft: -8, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Rested, commanding keynote delivery at 7:00 AM',
            deterministicNarrative:
              'You wake up sharp, deliver the presentation with poise, and field tough client questions effortlessly.',
            feedback: 'Treating sleep as a strategic performance multiplier sealed an exceptional 24-hour run.',
            tone: 'exciting',
          },
          scoringEffects: { prioritization: 12, efficiency: 12, strategy: 14, adaptability: 12 },
        },
        {
          id: 'h24_d5_o2',
          title: 'Stay up until 3:00 AM rebuilding the deck in a brand-new template',
          description:
            'Second-guess your design at midnight and start over.',
          stateChanges: { impact: -8, energy: -35, hoursLeft: -8, risk: 20 },
          hiddenConsequences: {
            eventTitle: 'Exhausted morning delivery undermines the presentation',
            deterministicNarrative:
              'Running on 3 hours of sleep, you lose your train of thought during the client Q&A.',
            feedback: 'Late-night scope churn destroyed your readiness for the actual performance.',
            tone: 'tense',
          },
          scoringEffects: { prioritization: -12, efficiency: -14, strategy: -12, adaptability: -8 },
        },
        {
          id: 'h24_d5_o3',
          title: 'Sleep 6 hours and spend 2 hours at 5:00 AM rehearsing every transition',
          description:
            'Wake up early for a structured dress rehearsal.',
          stateChanges: { impact: 10, energy: 8, hoursLeft: -8, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Polished early rehearsal leads to a smooth morning session',
            deterministicNarrative:
              'Your transitions are tight and the client signs off on the proposal at the end of the call.',
            feedback: 'Balanced rest and structured morning rehearsal delivered a strong outcome.',
            tone: 'strategic',
          },
          scoringEffects: { prioritization: 10, efficiency: 10, strategy: 10, adaptability: 8 },
        },
      ],
    },
  ],
};
