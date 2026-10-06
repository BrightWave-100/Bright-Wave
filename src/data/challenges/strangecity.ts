import { ChallengeDefinitionServer } from '../../engine/types.js';

export const strangecityChallenge: ChallengeDefinitionServer = {
  id: 'strangecity',
  slug: 'stranded-in-a-strange-city',
  title: 'STRANDED IN A STRANGE CITY',
  subtitle: 'Limited cash, dead phone battery, no contacts, and an 18-hour deadline.',
  description:
    'You arrive in an unfamiliar city with limited money, no contacts and one important deadline.',
  category: 'Survival / Strategy',
  primaryCategory: 'Survival',
  difficulty: 'Medium',
  estimatedMinutes: '5–7 min',
  tags: [
    'Survival',
    'Time Pressure',
    'Resourcefulness',
    'Adaptability',
    'Risk Management',
  ],
  disclaimer:
    'Fictional scenario simulation for entertainment only. Do not use as real-world travel or emergency guidance.',
  scenarioIntro:
    'It is 8:00 PM in a bustling port metropolis you have never visited. Your transit bag was misrouted, your phone is at 6% battery, you have $140 in local cash, and you must present your sealed fellowship dossier across the bay by 2:00 PM tomorrow.',
  stateMetrics: [
    { key: 'money', label: 'CASH', unit: 'currency', min: 0, max: 500 },
    { key: 'hoursLeft', label: 'HOURS LEFT', unit: 'hours', min: 0, max: 24 },
    { key: 'energy', label: 'ENERGY', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'RISK', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    money: 140,
    hoursLeft: 18,
    energy: 75,
    risk: 35,
  },
  scoringRules: [
    { key: 'resourcefulness', label: 'Resourcefulness', weight: 30, baseline: 50 },
    { key: 'planning', label: 'Planning', weight: 25, baseline: 50 },
    { key: 'risk', label: 'Risk', weight: 25, baseline: 50 },
    { key: 'adaptability', label: 'Adaptability', weight: 20, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'scity_d1',
      roundLabel: '8:00 PM · First 30 Minutes at the Terminal',
      context:
        'Your phone has 6% battery left. The central terminal closes its main concourse in 45 minutes.',
      prompt: 'What is your immediate priority before the phone dies?',
      options: [
        {
          id: 'scity_d1_o1',
          title: 'Write down the destination address, ferry timetable, and backup numbers on paper, then buy a $12 charging cable at the kiosk',
          description:
            'Capture mission-critical data offline first so you are never single-point dependent on the screen.',
          stateChanges: { money: -12, hoursLeft: -1, energy: 4, risk: -15 },
          hiddenConsequences: {
            eventTitle: 'Offline backup and full battery secured at the terminal',
            deterministicNarrative:
              'With key addresses written in your pocket notebook and your phone charging at a wall outlet, you eliminate the risk of digital blackout.',
            feedback: 'Redundant offline information plus cheap power restoration neutralized your biggest early vulnerability.',
            tone: 'strategic',
          },
          scoringEffects: { resourcefulness: 14, planning: 16, risk: 14, adaptability: 10 },
        },
        {
          id: 'scity_d1_o2',
          title: 'Use the last 6% battery to hail an expensive cross-city taxi immediately ($85)',
          description:
            'Rush toward the bay district tonight even without a hotel booked.',
          stateChanges: { money: -85, hoursLeft: -2, energy: -6, risk: 12 },
          hiddenConsequences: {
            eventTitle: 'Phone dies mid-ride and taxi drops you in a pricey commercial zone',
            deterministicNarrative:
              'You cross the bridge, but with $55 left and a dead phone at 10:00 PM, finding affordable lodging becomes much harder.',
            feedback: 'Spending 60% of your cash before securing power or lodging created downstream vulnerability.',
            tone: 'tense',
          },
          scoringEffects: { resourcefulness: -6, planning: -10, risk: -8, adaptability: 0 },
        },
        {
          id: 'scity_d1_o3',
          title: 'Switch phone to ultra-low-power mode and walk out into the old quarter looking for an internet cafe',
          description:
            'Save the $12 cable cost and search on foot.',
          stateChanges: { money: -5, hoursLeft: -2, energy: -14, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Long walk in unfamiliar alleys drains time and stamina',
            deterministicNarrative:
              'After 90 minutes of walking you find a late-night cafe to charge for $5, though your feet are sore and it is past 10:00 PM.',
            feedback: 'Saving $7 at the cost of two hours and physical fatigue in an unfamiliar district was a suboptimal trade.',
            tone: 'cautious',
          },
          scoringEffects: { resourcefulness: 4, planning: -2, risk: -4, adaptability: 6 },
        },
      ],
    },
    {
      id: 'scity_d2',
      roundLabel: '10:00 PM · Overnight Shelter & Dossier Security',
      context:
        'You are carrying the sealed fellowship portfolio that must be delivered intact tomorrow. You need rest before morning.',
      prompt: 'Where do you stay overnight?',
      options: [
        {
          id: 'scity_d2_o1',
          title: 'Book a verified $42 transit capsule pod inside the supervised rail hub with a private locker',
          description:
            'Stay steps from the morning commuter ferry line with 24-hour security and a hot shower.',
          stateChanges: { money: -42, hoursLeft: -8, energy: 20, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Seven hours of secure sleep right beside the morning transit hub',
            deterministicNarrative:
              'Your dossier stays locked in a steel cabinet while you get uninterrupted sleep and wake up fresh at 6:00 AM.',
            feedback: 'Balancing affordability, proximity, and physical security set up an ideal morning launch.',
            tone: 'strategic',
          },
          scoringEffects: { resourcefulness: 12, planning: 14, risk: 14, adaptability: 8 },
        },
        {
          id: 'scity_d2_o2',
          title: 'Stay awake all night in a 24-hour diner for $8 of coffee',
          description:
            'Preserve almost all your cash and guard the bag on your lap until dawn.',
          stateChanges: { money: -8, hoursLeft: -8, energy: -28, risk: 14 },
          hiddenConsequences: {
            eventTitle: 'Cash preserved, but sleep deprivation clouds your focus',
            deterministicNarrative:
              'You save $34, but by 6:00 AM your eyes burn and you still have a high-stakes presentation ahead at 2:00 PM.',
            feedback: 'Sacrificing all sleep before an evaluation deadline degraded your cognitive sharpness.',
            tone: 'tense',
          },
          scoringEffects: { resourcefulness: 2, planning: -8, risk: -6, adaptability: 0 },
        },
        {
          id: 'scity_d2_o3',
          title: 'Take an unverified $20 cash room offered by a tout outside the station',
          description:
            'Follow a stranger three blocks off the main avenue for a cheap room.',
          stateChanges: { money: -35, hoursLeft: -8, energy: -10, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Hidden key deposit dispute costs extra money and sleep',
            deterministicNarrative:
              'The room is noisy and the clerk demands an extra $15 "checkout fee" at dawn before unlocking the courtyard gate.',
            feedback: 'Unvetted street offers exposed you and your mission materials to avoidable security risk.',
            tone: 'tense',
          },
          scoringEffects: { resourcefulness: -8, planning: -10, risk: -16, adaptability: -4 },
        },
      ],
    },
    {
      id: 'scity_d3',
      roundLabel: '7:00 AM · The Bay Crossing Disruption',
      context:
        'Dense harbor fog has suspended the main municipal ferry until noon. The fellowship hall is across the bay.',
      prompt: 'How do you adapt to the harbor fog suspension?',
      options: [
        {
          id: 'scity_d3_o1',
          title: 'Take the $9 commuter rail loop around the northern estuary now (90 minutes)',
          description:
            'Skip the harbor wait entirely and take the longer but guaranteed rail route while you have 7 hours to spare.',
          stateChanges: { money: -9, hoursLeft: -2, energy: -4, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Northern rail loop delivers you to the bay district by 9:00 AM',
            deterministicNarrative:
              'While hundreds of commuters wait at the fogged-in pier, your train rolls smoothly into the bay station five hours ahead of your deadline.',
            feedback: 'Pivoting immediately to a deterministic overland route eliminated weather uncertainty.',
            tone: 'exciting',
          },
          scoringEffects: { resourcefulness: 12, planning: 14, risk: 12, adaptability: 16 },
        },
        {
          id: 'scity_d3_o2',
          title: 'Wait at the pier until noon hoping the ferry clears on schedule',
          description:
            'Save the train detour and trust the harbor forecast.',
          stateChanges: { money: -6, hoursLeft: -5, energy: -8, risk: 18 },
          hiddenConsequences: {
            eventTitle: 'Fog lingers past noon, leaving you only 2 hours to cross',
            deterministicNarrative:
              'The first ferry does not board until 12:20 PM, compressing your margin for error to almost zero.',
            feedback: 'Waiting passively on uncontrollable weather consumed your entire time buffer.',
            tone: 'tense',
          },
          scoringEffects: { resourcefulness: -6, planning: -10, risk: -12, adaptability: -10 },
        },
        {
          id: 'scity_d3_o3',
          title: 'Split a $60 private water taxi with three stranded business commuters',
          description:
            'Organize three other passengers at the dock so each pays $15 for a licensed harbor launch.',
          stateChanges: { money: -15, hoursLeft: -1, energy: 2, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Coordinated water share crosses the bay in 35 minutes',
            deterministicNarrative:
              'Your fellow passengers appreciate your initiative; one even works in the same building as your fellowship committee and shares campus tips.',
            feedback: 'Pooling resources with aligned travelers turned a bottleneck into a fast, low-cost crossing.',
            tone: 'exciting',
          },
          scoringEffects: { resourcefulness: 16, planning: 10, risk: 8, adaptability: 14 },
        },
      ],
    },
    {
      id: 'scity_d4',
      roundLabel: '10:30 AM · Missing Presentation Apparel & Printout',
      context:
        'Your transit bag is still at the airport, so you are in wrinkled travel clothes and need a printed backup of your 8-page executive summary.',
      prompt: 'How do you prepare for the panel with 3.5 hours left?',
      options: [
        {
          id: 'scity_d4_o1',
          title: 'Use a business center near the venue ($18) to print bound copies and steam your jacket at a dry cleaner ($12)',
          description:
            'Invest $30 right beside the destination so you are already on-site and polished.',
          stateChanges: { money: -30, hoursLeft: -2, energy: 6, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Crisp briefing packets and pressed attire ready 90 minutes early',
            deterministicNarrative:
              'Handling preparation two blocks from the venue means zero transit risk remaining and a sharp professional impression.',
            feedback: 'Staging final preparations adjacent to the target location locked in certainty.',
            tone: 'strategic',
          },
          scoringEffects: { resourcefulness: 12, planning: 14, risk: 12, adaptability: 10 },
        },
        {
          id: 'scity_d4_o2',
          title: 'Take a train to the airport baggage desk hoping to recover your lost bag before 2:00 PM',
          description:
            'Try to retrieve your original suit and printed copies from the terminal.',
          stateChanges: { money: -24, hoursLeft: -3, energy: -18, risk: 22 },
          hiddenConsequences: {
            eventTitle: 'Airport queue eats 2.5 hours and pushes you to a frantic sprint',
            deterministicNarrative:
              'You recover the bag at 12:40 PM and barely make it back across town, arriving breathless with 4 minutes to spare.',
            feedback: 'Backtracking away from the goal for non-essential items nearly cost you the deadline.',
            tone: 'tense',
          },
          scoringEffects: { resourcefulness: -4, planning: -12, risk: -14, adaptability: -6 },
        },
        {
          id: 'scity_d4_o3',
          title: 'Print the summary for $6 at a library and walk in wearing your travel clothes',
          description:
            'Focus strictly on the document substance and save cash.',
          stateChanges: { money: -6, hoursLeft: -1, energy: 4, risk: -4 },
          hiddenConsequences: {
            eventTitle: 'Documents ready early and cash reserve untouched',
            deterministicNarrative:
              'Your printed packets are spotless, and briefly explaining the misrouted luggage at the start wins an empathetic nod from the panel.',
            feedback: 'Prioritizing mission substance and early arrival over vanity kept risk low.',
            tone: 'analytical',
          },
          scoringEffects: { resourcefulness: 10, planning: 10, risk: 10, adaptability: 10 },
        },
      ],
    },
    {
      id: 'scity_d5',
      roundLabel: '1:15 PM · Final Security Check & Panel Entry',
      context:
        'You arrive at the fellowship tower 45 minutes early. The building receptionist informs you that the panel room moved to the East Annex and asks if you are ready to go in 20 minutes early.',
      prompt: 'How do you handle the early slot offer?',
      options: [
        {
          id: 'scity_d5_o1',
          title: 'Take 10 minutes to review the East Annex room setup, hydrate, and accept the early start',
          description:
            'Use your early arrival buffer to settle your composure and delight the committee schedule.',
          stateChanges: { money: 0, hoursLeft: -1, energy: 8, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Composed early presentation impresses the fellowship board',
            deterministicNarrative:
              'Because you arrived early with printed backups and calm focus, the committee spends extra time discussing your proposal and confirms your award.',
            feedback: 'Early positioning turned an unexpected room and schedule shift into a decisive advantage.',
            tone: 'exciting',
          },
          scoringEffects: { resourcefulness: 12, planning: 12, risk: 10, adaptability: 12 },
        },
        {
          id: 'scity_d5_o2',
          title: 'Rush into the room immediately without checking your notes or catching your breath',
          description:
            'Jump straight in the second the receptionist asks.',
          stateChanges: { money: 0, hoursLeft: -1, energy: -6, risk: 4 },
          hiddenConsequences: {
            eventTitle: 'Dossier delivered on time, though the opening minutes feel rushed',
            deterministicNarrative:
              'You meet the deadline and hand over the sealed portfolio, recovering your rhythm halfway through the Q&A.',
            feedback: 'Taking five minutes to organize your materials would have made a strong finish even sharper.',
            tone: 'cautious',
          },
          scoringEffects: { resourcefulness: 6, planning: 4, risk: 4, adaptability: 6 },
        },
        {
          id: 'scity_d5_o3',
          title: 'Leave the building to grab lunch across the street and return at 1:58 PM',
          description:
            'Insist on your exact 2:00 PM slot and step back outside.',
          stateChanges: { money: -18, hoursLeft: -1, energy: 2, risk: 16 },
          hiddenConsequences: {
            eventTitle: 'Slow elevator badge check makes you walk in at 2:02 PM',
            deterministicNarrative:
              'Giving up your inside-the-building buffer for a sandwich results in an awkward late entrance after security re-screening.',
            feedback: 'Leaving the secure perimeter once you had already arrived squandered your hard-won time margin.',
            tone: 'tense',
          },
          scoringEffects: { resourcefulness: -6, planning: -10, risk: -12, adaptability: -6 },
        },
      ],
    },
  ],
};
