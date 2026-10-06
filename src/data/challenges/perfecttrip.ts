import { ChallengeDefinitionServer } from '../../engine/types.js';

export const perfecttripChallenge: ChallengeDefinitionServer = {
  id: 'perfecttrip',
  slug: 'plan-the-perfect-trip',
  title: 'PLAN THE PERFECT TRIP',
  subtitle: 'Fixed $2,400 budget, 7 days, high expectations, and real-world travel curveballs.',
  description:
    'You have a fixed budget and a list of things you want to experience. Build the best possible trip.',
  category: 'Planning / Money',
  primaryCategory: 'Planning',
  difficulty: 'Easy',
  estimatedMinutes: '4–6 min',
  tags: [
    'Budget & Planning',
    'Resource Management',
    'Prioritization',
    'Flexibility',
    'Adaptability',
  ],
  disclaimer:
    'Fictional travel simulation for entertainment only. Not real-world travel or financial advice.',
  scenarioIntro:
    'You have $2,400 and 7 days to orchestrate a once-in-a-decade coastal and mountain expedition. You want unforgettable experiences without running out of funds or burning out halfway through.',
  stateMetrics: [
    { key: 'budget', label: 'BUDGET', unit: 'currency', min: 0, max: 3000 },
    { key: 'experience', label: 'EXPERIENCE', unit: 'number', min: 0, max: 100 },
    { key: 'energy', label: 'ENERGY', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'STRESS', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    budget: 2400,
    experience: 30,
    energy: 90,
    risk: 20,
  },
  scoringRules: [
    { key: 'planning', label: 'Planning', weight: 25, baseline: 50 },
    { key: 'budgetManagement', label: 'Budget Management', weight: 25, baseline: 50 },
    { key: 'prioritization', label: 'Prioritization', weight: 25, baseline: 50 },
    { key: 'flexibility', label: 'Flexibility', weight: 25, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'trip_d1',
      roundLabel: 'Phase 1 · Flights & Lodging Allocation',
      context:
        'You can spend $1,650 on a luxury beachfront resort and peak flight, $1,050 on a shoulder-hour flight plus centrally located boutique guesthouses, or $600 on 3-connection overnight budget flights and remote hostels.',
      prompt: 'How do you lock in your core transit and lodging?',
      options: [
        {
          id: 'trip_d1_o1',
          title: 'Book the $1,050 direct shoulder flight and walkable central guesthouses',
          description:
            'Keep $1,350 (56% of budget) free for activities, dining, and contingency while staying steps from transit.',
          stateChanges: { budget: -1050, experience: 16, energy: 4, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Walkable central base preserves both budget and stamina',
            deterministicNarrative:
              'You land rested, check into a charming central guesthouse, and still have $1,350 ready for signature experiences.',
            feedback: 'Optimizing location and flight convenience while keeping fixed costs under 45% of budget set up the whole week.',
            tone: 'strategic',
          },
          scoringEffects: { planning: 16, budgetManagement: 15, prioritization: 14, flexibility: 10 },
        },
        {
          id: 'trip_d1_o2',
          title: 'Splurge $1,650 on the 5-star resort and peak flight',
          description:
            'Travel in maximum comfort and figure out the daily budget later.',
          stateChanges: { budget: -1650, experience: 14, energy: 8, risk: 12 },
          hiddenConsequences: {
            eventTitle: 'Luxurious room, but only $750 left for 7 full days of food and excursions',
            deterministicNarrative:
              'The hotel lobby is stunning, but realizing you have barely $100/day left for meals, transit, and tickets tightens every decision ahead.',
            feedback: 'Over-allocating 69% of total budget to fixed lodging crowded out experiential flexibility.',
            tone: 'cautious',
          },
          scoringEffects: { planning: -4, budgetManagement: -12, prioritization: -6, flexibility: -8 },
        },
        {
          id: 'trip_d1_o3',
          title: 'Take the $600 3-layover red-eye and outskirts hostel 90 minutes from town',
          description:
            'Save maximum cash regardless of transit hours.',
          stateChanges: { budget: -600, experience: 4, energy: -26, risk: 14 },
          hiddenConsequences: {
            eventTitle: '22 hours of layovers and long bus commutes drain your first two days',
            deterministicNarrative:
              'You still have $1,800 in the bank, but you lose Day 1 and Day 2 to jetlag and 3-hour round-trip suburban bus rides.',
            feedback: 'In a 7-day trip, time and energy are scarcer currencies than the last $400 of airfare savings.',
            tone: 'tense',
          },
          scoringEffects: { planning: -6, budgetManagement: 8, prioritization: -10, flexibility: -2 },
        },
      ],
    },
    {
      id: 'trip_d2',
      roundLabel: 'Phase 2 · Pacing the Itinerary',
      context:
        'You have a wishlist of 14 landmarks across 5 days. Trying to hit all 14 means 4 stops per day; picking 1 anchor experience per day leaves room for local discovery.',
      prompt: 'How do you structure your daily itinerary?',
      options: [
        {
          id: 'trip_d2_o1',
          title: 'Anchor each day around 1 pre-booked signature highlight ($280 total) with open afternoons for neighborhood exploration',
          description:
            'Guarantee entry to your top 5 must-sees while preserving breathing room.',
          stateChanges: { budget: -280, experience: 22, energy: 6, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Timed morning entries and unhurried afternoons create unforgettable moments',
            deterministicNarrative:
              'You breeze past ticket lines each morning and stumble upon a lively local harbor market during an open afternoon.',
            feedback: 'The 1-Anchor-Per-Day rule maximized memorable depth while preventing itinerary fatigue.',
            tone: 'exciting',
          },
          scoringEffects: { planning: 15, budgetManagement: 12, prioritization: 16, flexibility: 14 },
        },
        {
          id: 'trip_d2_o2',
          title: 'Book non-refundable timed tickets for all 14 attractions ($560) packed hour-by-hour',
          description:
            'Schedule every 45 minutes from 7:00 AM to 10:00 PM.',
          stateChanges: { budget: -560, experience: 8, energy: -28, risk: 20 },
          hiddenConsequences: {
            eventTitle: 'One delayed train domino-crashes three non-refundable tickets',
            deterministicNarrative:
              'By Day 3 you are sprinting between museums checking your watch, and a 30-minute transit delay forfeits two afternoon passes.',
            feedback: 'Zero-buffer scheduling turned a vacation into a fragile logistics marathon.',
            tone: 'tense',
          },
          scoringEffects: { planning: -8, budgetManagement: -10, prioritization: -12, flexibility: -14 },
        },
        {
          id: 'trip_d2_o3',
          title: 'Pre-book nothing ($0) and decide everything at 10:00 AM each morning',
          description:
            'Keep 100% spontaneity.',
          stateChanges: { budget: -220, experience: 8, energy: -8, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Top coastal boat tour is sold out for the week, forcing backup choices',
            deterministicNarrative:
              'You enjoy a relaxed pace, but your #1 bucket-list sanctuary is fully booked until next month.',
            feedback: 'Pure spontaneity works for cafés, but high-demand signature experiences require advance reservations.',
            tone: 'cautious',
          },
          scoringEffects: { planning: -10, budgetManagement: 4, prioritization: -6, flexibility: 10 },
        },
      ],
    },
    {
      id: 'trip_d3',
      roundLabel: 'Phase 3 · The Day 4 Coastal Storm',
      context:
        'A sudden rainstorm washes out the mountain ridge hike planned for Day 4. You had set aside $180 for the guided ridge trek.',
      prompt: 'How do you pivot when weather cancels Day 4?',
      options: [
        {
          id: 'trip_d3_o1',
          title: 'Claim the weather credit and pivot to your indoor backup: a historic thermal bathhouse and chef’s culinary workshop ($160)',
          description:
            'Turn a rainy day into a restorative cultural highlight.',
          stateChanges: { budget: -160, experience: 18, energy: 14, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Rainy-day culinary class becomes a favorite memory of the week',
            deterministicNarrative:
              'Listening to the rain from the thermal mineral pools and learning regional recipes with local chefs leaves you recharged for Day 5.',
            feedback: 'Having a pre-vetted indoor pivot turned weather disruption into a peak experience.',
            tone: 'exciting',
          },
          scoringEffects: { planning: 12, budgetManagement: 12, prioritization: 12, flexibility: 18 },
        },
        {
          id: 'trip_d3_o2',
          title: 'Attempt the mountain trail anyway in heavy rain without a guide ($90 gear rental)',
          description:
            'Refuse to let weather alter your original plan.',
          stateChanges: { budget: -90, experience: -10, energy: -24, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Zero visibility and soaked boots force a turnaround after two miserable hours',
            deterministicNarrative:
              'Fog blocks the summit view completely and you spend the evening drying soaked clothes with a hairdryer.',
            feedback: 'Sunk-cost stubbornness against mountain weather wasted energy and increased safety risk.',
            tone: 'tense',
          },
          scoringEffects: { planning: -8, budgetManagement: -4, prioritization: -8, flexibility: -16 },
        },
        {
          id: 'trip_d3_o3',
          title: 'Stay in bed scrolling your phone all day and order room service ($110)',
          description:
            'Write off Day 4 completely.',
          stateChanges: { budget: -110, experience: -2, energy: 10, risk: 0 },
          hiddenConsequences: {
            eventTitle: 'Restful day, though one of your seven days passes with nothing memorable',
            deterministicNarrative:
              'You catch up on sleep, though looking out the window at dusk makes you wish you had explored the covered market.',
            feedback: 'Rest is valuable, but a light indoor backup plan would have captured the day.',
            tone: 'cautious',
          },
          scoringEffects: { planning: -4, budgetManagement: 0, prioritization: -4, flexibility: 0 },
        },
      ],
    },
    {
      id: 'trip_d4',
      roundLabel: 'Phase 4 · Dining & Local Immersion Strategy',
      context:
        'Over the remaining days, you can dine at tourist-strip restaurants near major monuments ($520), or mix street-market lunches and neighborhood bistros with one unforgettable tasting dinner ($340).',
      prompt: 'How do you allocate your food and dining budget?',
      options: [
        {
          id: 'trip_d4_o1',
          title: 'Mix authentic morning bakery/market stops with one celebratory cliffside tasting dinner ($340 total)',
          description:
            'Use barbell allocation: frugal, high-character daytime eats paired with one extraordinary culinary splurge.',
          stateChanges: { budget: -340, experience: 18, energy: 8, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Barbell dining delivers both local flavor and a showstopping sunset meal',
            deterministicNarrative:
              'Your market lunches cost $9 and taste fresher than tourist traps, making the cliffside tasting dinner feel truly special without breaking budget.',
            feedback: 'Barbell spending (cutting mediocre middle costs to fund a true peak) maximized value per dollar.',
            tone: 'strategic',
          },
          scoringEffects: { planning: 12, budgetManagement: 16, prioritization: 16, flexibility: 10 },
        },
        {
          id: 'trip_d4_o2',
          title: 'Eat every meal at sit-down restaurants right on the main tourist plazas ($520)',
          description:
            'Never walk more than 50 meters from a monument to eat.',
          stateChanges: { budget: -520, experience: 4, energy: 0, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'High bills for mediocre laminated-menu tourist meals',
            deterministicNarrative:
              'You spend $520 on overpriced plaza cafés with slow service and generic food.',
            feedback: 'Convenience dining right beside landmarks carried a steep tourist markup for lower quality.',
            tone: 'cautious',
          },
          scoringEffects: { planning: -6, budgetManagement: -12, prioritization: -8, flexibility: -4 },
        },
        {
          id: 'trip_d4_o3',
          title: 'Skip all local restaurants and eat only protein bars from your suitcase ($60)',
          description:
            'Treat food strictly as fuel to hoard budget.',
          stateChanges: { budget: -60, experience: -8, energy: -10, risk: 4 },
          hiddenConsequences: {
            eventTitle: 'You save $280, but miss out on the region’s famous culinary culture',
            deterministicNarrative:
              'You finish with extra cash in your bank account, but never tasted the coastal cuisine the region is famous for.',
            feedback: 'Under-spending on core trip goals left unused budget on the table at the expense of experience.',
            tone: 'analytical',
          },
          scoringEffects: { planning: 0, budgetManagement: 4, prioritization: -10, flexibility: -4 },
        },
      ],
    },
    {
      id: 'trip_d5',
      roundLabel: 'Phase 5 · The Final Day & Departure Buffer',
      context:
        'Day 7. Your flight leaves at 6:00 PM. You have a healthy cash buffer left. A private sunrise kayak cove tour costs $140 and returns at 1:00 PM, or a distant island ferry costs $190 and returns at 4:45 PM.',
      prompt: 'How do you design your final day before the 6:00 PM flight?',
      options: [
        {
          id: 'trip_d5_o1',
          title: 'Book the $140 sunrise kayak tour returning at 1:00 PM, enjoy a relaxed farewell lunch, and head to the airport at 3:00 PM',
          description:
            'End on a peak morning memory while protecting a 3-hour airport transit buffer.',
          stateChanges: { budget: -190, experience: 16, energy: 4, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Magical final morning followed by a stress-free departure',
            deterministicNarrative:
              'You paddle through sunlit sea caves in the morning, pick up artisan gifts with your remaining budget buffer, and board your flight relaxed and within budget.',
            feedback: 'Protecting departure margin on the final day sealed a peak-end memory with zero travel stress.',
            tone: 'exciting',
          },
          scoringEffects: { planning: 14, budgetManagement: 14, prioritization: 14, flexibility: 12 },
        },
        {
          id: 'trip_d5_o2',
          title: 'Take the distant island ferry returning at 4:45 PM for a 6:00 PM international flight',
          description:
            'Squeeze in one last far-away excursion with 75 minutes to make the airport.',
          stateChanges: { budget: -420, experience: -6, energy: -22, risk: 28 },
          hiddenConsequences: {
            eventTitle: '15-minute ferry docking delay triggers a $230 emergency taxi sprint to the gate',
            deterministicNarrative:
              'You spend the entire ferry ride staring at your watch in panic and pay $230 for a highway taxi to barely make boarding.',
            feedback: 'Violating final-day transit buffers turned the end of the trip into an expensive panic.',
            tone: 'tense',
          },
          scoringEffects: { planning: -14, budgetManagement: -12, prioritization: -10, flexibility: -8 },
        },
        {
          id: 'trip_d5_o3',
          title: 'Go to the airport at 9:00 AM and sit at the gate for 9 hours ($45)',
          description:
            'Eliminate all final-day risk by spending the whole day in the terminal.',
          stateChanges: { budget: -45, experience: 0, energy: -4, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Zero stress, though your final vacation day is spent under fluorescent terminal lights',
            deterministicNarrative:
              'You make your flight easily with $400+ unspent, wishing you had used the morning by the coast.',
            feedback: 'Extreme buffer conservatism left a full morning of experiences unused.',
            tone: 'cautious',
          },
          scoringEffects: { planning: 4, budgetManagement: 6, prioritization: -4, flexibility: 2 },
        },
      ],
    },
  ],
};
