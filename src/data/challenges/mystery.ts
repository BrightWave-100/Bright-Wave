import { ChallengeDefinitionServer } from '../../engine/types.js';

export const mysteryChallenge: ChallengeDefinitionServer = {
  id: 'mystery',
  slug: 'the-mystery-decision',
  title: 'THE MYSTERY DECISION',
  subtitle: 'Incomplete clues, three conflicting hypotheses, and a ticking clock.',
  description:
    'You have incomplete information, several possible explanations and limited time. Decide what to investigate.',
  category: 'Logic / Mystery',
  primaryCategory: 'Mystery',
  difficulty: 'Hard',
  estimatedMinutes: '6–8 min',
  tags: [
    'Investigative Logic',
    'Time Pressure',
    'Information Management',
    'Risk Management',
    'Reasoning',
  ],
  scenarioIntro:
    'At 11:00 PM inside the Meridian Observatory, the primary prototype lens telemetry goes offline and a sealed calibration vault shows an anomalous access pulse. The mountain road re-opens at 6:00 AM. You have 7 hours to determine what happened before the board arrives.',
  stateMetrics: [
    { key: 'clues', label: 'VERIFIED CLUES', unit: 'number', min: 0, max: 20 },
    { key: 'confidence', label: 'CERTAINTY (%)', unit: 'percent', min: 0, max: 100 },
    { key: 'hoursLeft', label: 'HOURS LEFT', unit: 'hours', min: 0, max: 7 },
    { key: 'risk', label: 'CONTAMINATION', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    clues: 2,
    confidence: 25,
    hoursLeft: 7,
    risk: 20,
  },
  scoringRules: [
    { key: 'logic', label: 'Logic', weight: 30, baseline: 50 },
    { key: 'informationManagement', label: 'Information Management', weight: 25, baseline: 50 },
    { key: 'risk', label: 'Risk', weight: 20, baseline: 50 },
    { key: 'reasoning', label: 'Reasoning', weight: 25, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'mys_d1',
      roundLabel: '11:00 PM · Preserving the Volatile Evidence',
      context:
        'Three possibilities exist: (A) an external network intrusion, (B) an internal badge-cloning theft, or (C) an automated thermal failsafe triggered by a power surge. The server RAM logs overwrite every 90 minutes.',
      prompt: 'What do you inspect first at 11:00 PM?',
      options: [
        {
          id: 'mys_d1_o1',
          title: 'Snapshot the volatile server RAM and badge-reader cryptographic hashes before touching the physical vault',
          description:
            'Capture ephemeral digital evidence first while keeping the vault door untouched.',
          stateChanges: { clues: 4, confidence: 18, hoursLeft: -1, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'RAM snapshot proves zero external network packets entered the subnet',
            deterministicNarrative:
              'You eliminate Hypothesis A (external intrusion) immediately and discover the vault pulse came from an internal RS-485 maintenance bus.',
            feedback: 'Securing volatile evidence first prevented log rotation and cleanly falsified one of three hypotheses.',
            tone: 'analytical',
          },
          scoringEffects: { logic: 16, informationManagement: 18, risk: 14, reasoning: 15 },
        },
        {
          id: 'mys_d1_o2',
          title: 'Force open the physical calibration vault immediately to see if the lens is inside',
          description:
            'Rush straight into the cleanroom vault.',
          stateChanges: { clues: 1, confidence: 5, hoursLeft: -1, risk: 22 },
          hiddenConsequences: {
            eventTitle: 'Opening the door resets the pressure sensor state and overwrites RAM logs',
            deterministicNarrative:
              'The lens is still on its mount, but triggering the manual door release overwrote the last 90 minutes of controller buffer.',
            feedback: 'Altering physical state before capturing volatile telemetry destroyed key diagnostic data.',
            tone: 'tense',
          },
          scoringEffects: { logic: -10, informationManagement: -14, risk: -14, reasoning: -8 },
        },
        {
          id: 'mys_d1_o3',
          title: 'Wake up all 6 resident scientists for individual 30-minute interviews first',
          description:
            'Start with human questioning while the servers keep running.',
          stateChanges: { clues: 2, confidence: 6, hoursLeft: -3, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'Three hours spent on conflicting recollections while RAM buffer rotates out',
            deterministicNarrative:
              'Everyone claims they were asleep, and by 2:00 AM the volatile server memory from 11:00 PM has been overwritten.',
            feedback: 'Questioning witnesses before establishing objective timeline anchors wasted time and lost volatile data.',
            tone: 'cautious',
          },
          scoringEffects: { logic: -6, informationManagement: -10, risk: -6, reasoning: -4 },
        },
      ],
    },
    {
      id: 'mys_d2',
      roundLabel: '12:15 AM · Testing the Remaining Two Hypotheses',
      context:
        'You know the signal came from the internal RS-485 bus inside Sub-Level B. That bus connects both the security badge terminal AND the liquid-nitrogen cooling controller.',
      prompt: 'How do you distinguish between human badge spoofing and a cooling controller fault?',
      options: [
        {
          id: 'mys_d2_o1',
          title: 'Cross-reference corridor motion-sensor timestamps with the substation amperage draw graph',
          description:
            'Look for physical human movement vs. electrical compressor spikes at 10:58 PM.',
          stateChanges: { clues: 4, confidence: 22, hoursLeft: -1, risk: -6 },
          hiddenConsequences: {
            eventTitle: 'Zero corridor motion, but a 40-amp compressor spike occurred at 10:57:54 PM',
            deterministicNarrative:
              'Corridor infrared sensors were completely still, yet a coolant valve relay spiked—AND somebody manually cleared the coolant alarm from Terminal 3 two minutes later.',
            feedback: 'Triangulating independent physical and electrical sensors revealed a compound event: a hardware fault followed by a human cover-up.',
            tone: 'exciting',
          },
          scoringEffects: { logic: 16, informationManagement: 15, risk: 12, reasoning: 16 },
        },
        {
          id: 'mys_d2_o2',
          title: 'Assume it was a simple power surge and close the investigation early',
          description:
            'Conclude Hypothesis C without checking the secondary logs.',
          stateChanges: { clues: 0, confidence: -10, hoursLeft: -1, risk: 18 },
          hiddenConsequences: {
            eventTitle: 'Unexplained manual alarm clearance at 11:00 PM goes unnoticed',
            deterministicNarrative:
              'You miss the critical anomaly showing a local workstation acknowledged and suppressed the coolant warning.',
            feedback: 'Premature closure bias stopped you from noticing the human intervention after the surge.',
            tone: 'cautious',
          },
          scoringEffects: { logic: -12, informationManagement: -10, risk: -8, reasoning: -12 },
        },
        {
          id: 'mys_d2_o3',
          title: 'Disassemble the badge reader hardware in the hallway to inspect its wiring',
          description:
            'Spend two hours taking apart the wall reader.',
          stateChanges: { clues: 1, confidence: 4, hoursLeft: -2, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Wall reader is factory-intact, costing two hours of dismantling',
            deterministicNarrative:
              'The physical badge reader shows zero tampering, leaving you with less time to inspect the terminal logs.',
            feedback: 'Testing a high-effort physical hypothesis before a 5-minute log correlation was inefficient.',
            tone: 'analytical',
          },
          scoringEffects: { logic: 0, informationManagement: -4, risk: -2, reasoning: 0 },
        },
      ],
    },
    {
      id: 'mys_d3',
      roundLabel: '1:30 AM · Isolating Terminal 3',
      context:
        'Someone at Terminal 3 (the optics lab bench) suppressed the coolant surge alarm at 11:00 PM using a shared lab login. Two staff members were on evening shift: Dr. Vance (Optics Lead) and Jonas (Calibration Tech).',
      prompt: 'How do you identify who used Terminal 3 without tipping them off?',
      options: [
        {
          id: 'mys_d3_o1',
          title: 'Check the SSH key fingerprint and personal Wi-Fi device handoff logs in the optics wing at 11:00 PM',
          description:
            'Use passive network metadata before confronting either suspect.',
          stateChanges: { clues: 4, confidence: 20, hoursLeft: -1, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Device logs place Dr. Vance’s encrypted tablet at Terminal 3 at 10:59 PM',
            deterministicNarrative:
              'Jonas was in the cafeteria wing two floors up, while Dr. Vance’s personal tablet roamed onto the Optics Lab access point 90 seconds before the alarm was silenced.',
            feedback: 'Non-invasive metadata correlation narrowed the actor to one person with high certainty.',
            tone: 'strategic',
          },
          scoringEffects: { logic: 14, informationManagement: 16, risk: 14, reasoning: 16 },
        },
        {
          id: 'mys_d3_o2',
          title: 'Accuse both Dr. Vance and Jonas together in the breakroom and see who looks nervous',
          description:
            'Rely on gut intuition and body language.',
          stateChanges: { clues: 0, confidence: -6, hoursLeft: -2, risk: 20 },
          hiddenConsequences: {
            eventTitle: 'Both become defensive and refuse to cooperate without union/board counsel',
            deterministicNarrative:
              'With no hard evidence presented, the confrontation turns heated and shuts down voluntary cooperation.',
            feedback: 'Confronting suspects on speculation instead of verified telemetry created unnecessary resistance.',
            tone: 'tense',
          },
          scoringEffects: { logic: -10, informationManagement: -8, risk: -12, reasoning: -10 },
        },
        {
          id: 'mys_d3_o3',
          title: 'Search both staff lockers without authorization',
          description:
            'Break into personal lockers looking for clues.',
          stateChanges: { clues: 0, confidence: 0, hoursLeft: -1, risk: 25 },
          hiddenConsequences: {
            eventTitle: 'Nothing found in lockers, and unauthorized search violates facility policy',
            deterministicNarrative:
              'The incident was digital and thermal—not a physical theft—so the locker search yields nothing while creating procedural liability.',
            feedback: 'Searching for physical contraband after ruling out theft violated logic and facility protocol.',
            tone: 'tense',
          },
          scoringEffects: { logic: -12, informationManagement: -10, risk: -18, reasoning: -12 },
        },
      ],
    },
    {
      id: 'mys_d4',
      roundLabel: '3:00 AM · Uncovering the Motive & Technical State',
      context:
        'Why would Dr. Vance silence a coolant spike on her own prototype lens? You check the lab notebook and see she ran an unscheduled high-power laser stress test at 10:50 PM.',
      prompt: 'How do you approach Dr. Vance at 3:00 AM?',
      options: [
        {
          id: 'mys_d4_o1',
          title: 'Present the exact timeline privately and ask for the stress-test parameters so you can safely stabilize the lens thermal gradient together',
          description:
            'Focus on saving the $12M mirror from thermal micro-fractures by securing her full technical cooperation.',
          stateChanges: { clues: 4, confidence: 18, hoursLeft: -2, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Dr. Vance admits the unauthorized test and helps run a controlled cooldown',
            deterministicNarrative:
              'Relieved that you prioritized the optics over theatrical blame, she hands over the exact laser calibration curve—allowing you to bring the mirror back online undamaged.',
            feedback: 'Using indisputable evidence to secure technical cooperation saved the prototype and confirmed every fact.',
            tone: 'exciting',
          },
          scoringEffects: { logic: 14, informationManagement: 14, risk: 14, reasoning: 15 },
        },
        {
          id: 'mys_d4_o2',
          title: 'Lock Dr. Vance out of the building and reboot the cooling array to default settings yourself',
          description:
            'Restart the cryo-loop immediately without asking what temperature the mirror is at.',
          stateChanges: { clues: 1, confidence: 6, hoursLeft: -2, risk: 22 },
          hiddenConsequences: {
            eventTitle: 'Rapid default cooling causes thermal shock warnings on the warm mirror',
            deterministicNarrative:
              'Because the mirror was still elevated from her secret test, blasting default cryo-flow triggers a thermal gradient warning you have to scramble to halt.',
            feedback: 'Acting without the operator’s state parameters risked physical damage to the instrument.',
            tone: 'tense',
          },
          scoringEffects: { logic: -8, informationManagement: -8, risk: -14, reasoning: -6 },
        },
        {
          id: 'mys_d4_o3',
          title: 'Offer to delete the logs if Dr. Vance promises never to do it again',
          description:
            'Help cover up the unauthorized stress test.',
          stateChanges: { clues: 2, confidence: 10, hoursLeft: -2, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Lens stabilized, but you are now complicit in falsifying board safety logs',
            deterministicNarrative:
              'The mirror cools safely, but tampering with audit logs compromises your own integrity before the 6:00 AM board review.',
            feedback: 'Solving the technical problem by corrupting the evidentiary record created severe governance exposure.',
            tone: 'cautious',
          },
          scoringEffects: { logic: 2, informationManagement: -12, risk: -16, reasoning: -6 },
        },
      ],
    },
    {
      id: 'mys_d5',
      roundLabel: '5:15 AM · The 6:00 AM Board Briefing',
      context:
        'The board arrives in 45 minutes. You have the complete chain of evidence: an unauthorized 10:50 PM stress test triggered a 10:58 PM coolant relay spike, which switched the vault to local bus lock and was manually muted at 11:00 PM.',
      prompt: 'How do you structure your final investigation report?',
      options: [
        {
          id: 'mys_d5_o1',
          title: 'Deliver a timestamped, cryptographic chain-of-events brief separating verified facts, falsified hypotheses, and hardware interlock upgrades',
          description:
            'Present an airtight, reproducible timeline showing zero external breach, intact optics, and concrete protocol fixes.',
          stateChanges: { clues: 2, confidence: 12, hoursLeft: -1, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Board commends the forensic clarity and approves automated laser-coolant interlocks',
            deterministicNarrative:
              'By distinguishing clearly between what was feared (theft/breach) and what was proven (unscheduled test + alarm mute), the board resolves the incident cleanly without panic.',
            feedback: 'Structured evidentiary synthesis turned a midnight mystery into an airtight forensic resolution.',
            tone: 'exciting',
          },
          scoringEffects: { logic: 14, informationManagement: 14, risk: 12, reasoning: 14 },
        },
        {
          id: 'mys_d5_o2',
          title: 'Dump 400 pages of raw server logs onto the board table and let them draw their own conclusions',
          description:
            'Provide raw data without synthesis.',
          stateChanges: { clues: 0, confidence: -8, hoursLeft: -1, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Board members misread raw network logs and spend hours debating a non-existent hacker',
            deterministicNarrative:
              'Without a structured synthesis, non-technical board members fixate on routine background pings and delay the morning launch.',
            feedback: 'Information management requires translating raw telemetry into clear, decision-ready conclusions.',
            tone: 'cautious',
          },
          scoringEffects: { logic: 2, informationManagement: -10, risk: -4, reasoning: -4 },
        },
        {
          id: 'mys_d5_o3',
          title: 'Exaggerate the danger of the incident to request a 3x security budget increase',
          description:
            'Spin the internal test as a near-catastrophic external threat.',
          stateChanges: { clues: 0, confidence: -12, hoursLeft: -1, risk: 16 },
          hiddenConsequences: {
            eventTitle: 'Technical audit contradicts your exaggerated framing',
            deterministicNarrative:
              'When the chief engineer reviews your RAM snapshot showing zero external packets, your credibility takes a hit.',
            feedback: 'Distorting conclusions after collecting clean evidence undermined your entire investigation.',
            tone: 'tense',
          },
          scoringEffects: { logic: -8, informationManagement: -10, risk: -10, reasoning: -10 },
        },
      ],
    },
  ],
};
