import { ChallengeDefinitionServer } from '../../engine/types.js';

export const ethicaldilemmaChallenge: ChallengeDefinitionServer = {
  id: 'ethicaldilemma',
  slug: 'the-ethical-dilemma',
  title: 'THE ETHICAL DILEMMA',
  subtitle: 'High-value information lands on your desk. Every choice carries real trade-offs.',
  description:
    'You discover information that could help you—but using it could hurt someone else. There is no perfect option.',
  category: 'Ethics / Social',
  primaryCategory: 'Ethics',
  difficulty: 'Hard',
  estimatedMinutes: '5–8 min',
  tags: [
    'Ethical Dilemma',
    'Crisis Leadership',
    'Consistency',
    'Consequence Awareness',
    'Integrity',
  ],
  disclaimer:
    'Fictional scenario exploring decision trade-offs under competing obligations. Results describe simulation trade-offs, not personal moral worth.',
  scenarioIntro:
    'You lead product safety for a civic water-sensor network. Days before a municipal contract renewal, you discover an uncalibrated sensor batch in District 4—and realize a misdirected internal memo also contains a colleague’s confidential whistleblower draft.',
  stateMetrics: [
    { key: 'publicTrust', label: 'PUBLIC TRUST', unit: 'number', min: 0, max: 100 },
    { key: 'teamSafety', label: 'TEAM TRUST', unit: 'number', min: 0, max: 100 },
    { key: 'standing', label: 'STANDING', unit: 'number', min: 0, max: 100 },
    { key: 'risk', label: 'EXPOSURE', unit: 'number', min: 0, max: 100 },
  ],
  startingState: {
    publicTrust: 60,
    teamSafety: 60,
    standing: 60,
    risk: 35,
  },
  scoringRules: [
    { key: 'consistency', label: 'Consistency', weight: 25, baseline: 50 },
    { key: 'consequenceAwareness', label: 'Consequence Awareness', weight: 25, baseline: 50 },
    { key: 'integrity', label: 'Integrity', weight: 25, baseline: 50 },
    { key: 'reasoning', label: 'Reasoning', weight: 25, baseline: 50 },
  ],
  version: 1,
  published: true,
  decisions: [
    {
      id: 'eth_d1',
      roundLabel: 'Step 1 · The Misdirected File',
      context:
        'A junior analyst accidentally attaches their private notes to a shared spreadsheet. The notes show District 4 sensors drift by 18% during heavy rain—and reveal the analyst is preparing an external complaint because their manager ignored it.',
      prompt: 'How do you handle the discovery of the analyst’s file?',
      options: [
        {
          id: 'eth_d1_o1',
          title: 'Meet privately with the analyst to protect their confidentiality and independently verify the District 4 telemetry logs',
          description:
            'Separate the human vulnerability from the technical verification so neither the analyst nor the data is compromised.',
          stateChanges: { publicTrust: 10, teamSafety: 16, standing: 6, risk: -8 },
          hiddenConsequences: {
            eventTitle: 'Independent verification confirms the 18% rain drift while protecting the analyst',
            deterministicNarrative:
              'The trade-off: you take personal ownership of a politically inconvenient truth before renewal week, but you gain primary technical evidence and preserve team psychological safety.',
            feedback: 'You prioritized empirical verification and whistleblower protection over short-term political convenience.',
            tone: 'analytical',
          },
          scoringEffects: { consistency: 14, consequenceAwareness: 14, integrity: 16, reasoning: 14 },
        },
        {
          id: 'eth_d1_o2',
          title: 'Forward the analyst’s private draft directly to the VP of Sales to show loyalty',
          description:
            'Alert executives immediately about the potential whistleblower.',
          stateChanges: { publicTrust: -12, teamSafety: -24, standing: 8, risk: 18 },
          hiddenConsequences: {
            eventTitle: 'Executive praise gained at the cost of team trust and unresolved sensor drift',
            deterministicNarrative:
              'The trade-off: Sales appreciates the heads-up, but the analyst is sidelined and the underlying District 4 sensor drift remains unaddressed.',
            feedback: 'Optimizing for immediate executive favor sidelined the safety signal and chilled internal reporting.',
            tone: 'tense',
          },
          scoringEffects: { consistency: -8, consequenceAwareness: -10, integrity: -14, reasoning: -6 },
        },
        {
          id: 'eth_d1_o3',
          title: 'Delete the file and pretend you never saw it until after the contract renewal',
          description:
            'Avoid getting involved in another department’s dispute.',
          stateChanges: { publicTrust: -10, teamSafety: -6, standing: 0, risk: 16 },
          hiddenConsequences: {
            eventTitle: 'Short-term calm preserved while latent operational risk compounds',
            deterministicNarrative:
              'The trade-off: your week stays quiet, but an uncalibrated sensor network remains live heading into the rainy season.',
            feedback: 'Choosing non-involvement avoided immediate conflict but left downstream stakeholders exposed.',
            tone: 'cautious',
          },
          scoringEffects: { consistency: -6, consequenceAwareness: -8, integrity: -10, reasoning: -4 },
        },
      ],
    },
    {
      id: 'eth_d2',
      roundLabel: 'Step 2 · The Contract Renewal Briefing',
      context:
        'The city procurement panel meets in 48 hours to sign a $4M renewal. Disclosing the calibration drift now could delay signature by 30 days; waiting until after signature locks in revenue first.',
      prompt: 'What position do you take before the city briefing?',
      options: [
        {
          id: 'eth_d2_o1',
          title: 'Present a proactive remediation patch + field recalibration schedule to the city panel alongside the renewal',
          description:
            'Disclose the rain-drift finding paired with a ready engineering fix at your company’s expense.',
          stateChanges: { publicTrust: 18, teamSafety: 10, standing: 4, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'City engineers respect the proactive disclosure and approve a conditional renewal',
            deterministicNarrative:
              'The trade-off: Sales has to accept a 14-day escrow hold on the first payment until recalibration completes, but long-term municipal trust deepens.',
            feedback: 'Pairing candid disclosure with an actionable engineering remedy balanced accountability and commercial continuity.',
            tone: 'strategic',
          },
          scoringEffects: { consistency: 15, consequenceAwareness: 14, integrity: 16, reasoning: 14 },
        },
        {
          id: 'eth_d2_o2',
          title: 'Sign the renewal silently now and schedule a quiet software patch next month',
          description:
            'Secure the $4M contract first and fix the sensors later without telling the city.',
          stateChanges: { publicTrust: -14, teamSafety: -8, standing: 10, risk: 20 },
          hiddenConsequences: {
            eventTitle: 'Revenue lands on time, but undisclosed historical logs create audit vulnerability',
            deterministicNarrative:
              'The trade-off: the company hits its quarterly booking target smoothly, but any future public records audit will show known drift prior to signing.',
            feedback: 'Prioritizing commercial timing over disclosure protected quarterly bookings while creating latent regulatory exposure.',
            tone: 'cautious',
          },
          scoringEffects: { consistency: -6, consequenceAwareness: -4, integrity: -12, reasoning: 2 },
        },
        {
          id: 'eth_d2_o3',
          title: 'Leak the raw unverified spreadsheet to a local reporter anonymously',
          description:
            'Force a public halt to the contract from outside.',
          stateChanges: { publicTrust: 4, teamSafety: -16, standing: -20, risk: 24 },
          hiddenConsequences: {
            eventTitle: 'Headline stops the contract, but triggers chaotic layoffs and finger-pointing',
            deterministicNarrative:
              'The trade-off: the sensor issue gets immediate publicity, but without a structured remediation plan the city freezes the entire program and innocent field techs lose shifts.',
            feedback: 'Escalating externally before exhausting internal remediation channels maximized disruption alongside awareness.',
            tone: 'tense',
          },
          scoringEffects: { consistency: 0, consequenceAwareness: -10, integrity: 2, reasoning: -8 },
        },
      ],
    },
    {
      id: 'eth_d3',
      roundLabel: 'Step 3 · Allocating Responsibility',
      context:
        'The CEO asks who allowed the uncalibrated batch into District 4. The operations manager cut testing corners under heavy deadline pressure originally set by the executive team.',
      prompt: 'How do you frame the root-cause report to the CEO?',
      options: [
        {
          id: 'eth_d3_o1',
          title: 'Frame it as a systemic process gap—recommend automated release gates rather than scapegoating a single manager',
          description:
            'Account accurately for both the skipped check and the unrealistic deployment schedule that incentivized it.',
          stateChanges: { publicTrust: 8, teamSafety: 16, standing: 10, risk: -10 },
          hiddenConsequences: {
            eventTitle: 'Blameless post-mortem upgrades release gates across all districts',
            deterministicNarrative:
              'The trade-off: executives have to confront their own scheduling pressure rather than firing one scapegoat, leading to durable QA reforms.',
            feedback: 'Systemic root-cause analysis addressed the structural incentives behind the failure.',
            tone: 'analytical',
          },
          scoringEffects: { consistency: 14, consequenceAwareness: 15, integrity: 14, reasoning: 16 },
        },
        {
          id: 'eth_d3_o2',
          title: 'Place 100% of the blame on the operations manager to shield executive timelines',
          description:
            'Give leadership a single person to terminate so the issue feels closed.',
          stateChanges: { publicTrust: -4, teamSafety: -20, standing: 6, risk: 10 },
          hiddenConsequences: {
            eventTitle: 'Manager fired, but Remaining engineers become afraid to report anomalies',
            deterministicNarrative:
              'The trade-off: executives get a clean narrative, but field engineers learn that surfacing defects is dangerous when deadlines are tight.',
            feedback: 'Individual scapegoating resolved the political moment while leaving the underlying pressure cooker intact.',
            tone: 'tense',
          },
          scoringEffects: { consistency: -10, consequenceAwareness: -12, integrity: -12, reasoning: -6 },
        },
        {
          id: 'eth_d3_o3',
          title: 'Absorb all blame yourself even though your team did not deploy the hardware',
          description:
            'Fall on your sword to protect everyone else.',
          stateChanges: { publicTrust: 4, teamSafety: 8, standing: -16, risk: 4 },
          hiddenConsequences: {
            eventTitle: 'Noble gesture protects peers, but weakens your authority to enforce new safety standards',
            deterministicNarrative:
              'The trade-off: your team admires your selflessness, but losing your seat on the governance committee limits your ability to prevent repeat errors.',
            feedback: 'Inaccurate self-blame sacrificed your institutional leverage to drive structural reform.',
            tone: 'cautious',
          },
          scoringEffects: { consistency: 4, consequenceAwareness: -2, integrity: 8, reasoning: -4 },
        },
      ],
    },
    {
      id: 'eth_d4',
      roundLabel: 'Step 4 · The Historical Data Dilemma',
      context:
        'During recalibration, you find that two weeks of past District 4 storm readings were published in an open civic dataset used by university researchers.',
      prompt: 'How do you handle the published historical dataset?',
      options: [
        {
          id: 'eth_d4_o1',
          title: 'Publish a versioned errata note with confidence intervals and notify the university research leads directly',
          description:
            'Correct the scientific record transparently with calibrated correction factors.',
          stateChanges: { publicTrust: 14, teamSafety: 8, standing: 8, risk: -12 },
          hiddenConsequences: {
            eventTitle: 'Researchers praise the rigor of the versioned correction dataset',
            deterministicNarrative:
              'The trade-off: issuing an official errata requires public humility, but the university department cites your transparency as a benchmark for civic tech vendors.',
            feedback: 'Transparent data versioning preserved downstream scientific integrity and institutional credibility.',
            tone: 'strategic',
          },
          scoringEffects: { consistency: 16, consequenceAwareness: 14, integrity: 15, reasoning: 14 },
        },
        {
          id: 'eth_d4_o2',
          title: 'Silently overwrite the CSV files on the server without a changelog',
          description:
            'Fix the numbers quietly so nobody notices they changed.',
          stateChanges: { publicTrust: -16, teamSafety: -6, standing: -8, risk: 20 },
          hiddenConsequences: {
            eventTitle: 'Grad students notice checksum mismatches and question data integrity',
            deterministicNarrative:
              'The trade-off: you avoided an errata announcement, but researchers with cached copies spot the silent edits and raise public questions.',
            feedback: 'Unannounced mutation of public records created more suspicion than the original calibration drift.',
            tone: 'tense',
          },
          scoringEffects: { consistency: -12, consequenceAwareness: -12, integrity: -14, reasoning: -8 },
        },
        {
          id: 'eth_d4_o3',
          title: 'Leave the old numbers as-is since future readings are now fixed',
          description:
            'Focus only on forward-looking accuracy.',
          stateChanges: { publicTrust: -6, teamSafety: 0, standing: 2, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Current operations run smoothly, though historical studies retain skewed storm peaks',
            deterministicNarrative:
              'The trade-off: zero immediate friction, though urban drainage models built on those two weeks carry a 18% bias.',
            feedback: 'Forward-only remediation solved current operations while leaving known historical distortion in place.',
            tone: 'cautious',
          },
          scoringEffects: { consistency: -4, consequenceAwareness: -6, integrity: -4, reasoning: 0 },
        },
      ],
    },
    {
      id: 'eth_d5',
      roundLabel: 'Step 5 · Designing the Long-Term Charter',
      context:
        'With the District 4 sensors recalibrated, the board asks you to propose a permanent governance rule for future safety vs. deadline conflicts.',
      prompt: 'Which governance mechanism do you institutionalize?',
      options: [
        {
          id: 'eth_d5_o1',
          title: 'Establish an independent two-key safety sign-off and protected anonymous reporting channel with a 72-hour SLA',
          description:
            'Build structural checks so future engineers never have to choose between career safety and technical accuracy.',
          stateChanges: { publicTrust: 14, teamSafety: 14, standing: 12, risk: -14 },
          hiddenConsequences: {
            eventTitle: 'Structural governance charter adopted as company standard',
            deterministicNarrative:
              'The trade-off: product launches now require an explicit calibration gate that adds 48 hours to release cycles, in exchange for high reliability and zero suppressed warnings.',
            feedback: 'Codifying independent verification converted an individual ethical test into resilient institutional design.',
            tone: 'exciting',
          },
          scoringEffects: { consistency: 14, consequenceAwareness: 14, integrity: 14, reasoning: 14 },
        },
        {
          id: 'eth_d5_o2',
          title: 'Rely on an annual ethics training slideshow without changing deployment authority',
          description:
            'Keep all launch power with Sales while reminding employees to speak up.',
          stateChanges: { publicTrust: -2, teamSafety: -4, standing: 4, risk: 8 },
          hiddenConsequences: {
            eventTitle: 'Minimal friction today, but incentive structures remain unchanged',
            deterministicNarrative:
              'The trade-off: release speed remains untouched, though employees know the underlying power dynamics have not shifted.',
            feedback: 'Symbolic training without structural authority changes left the original incentive conflict intact.',
            tone: 'cautious',
          },
          scoringEffects: { consistency: -4, consequenceAwareness: -4, integrity: -2, reasoning: -4 },
        },
        {
          id: 'eth_d5_o3',
          title: 'Require full board approval for every minor sensor firmware update',
          description:
            'Escalate every technical change to the highest level.',
          stateChanges: { publicTrust: 4, teamSafety: -2, standing: -4, risk: 2 },
          hiddenConsequences: {
            eventTitle: 'High oversight, but routine maintenance slows to a crawl',
            deterministicNarrative:
              'The trade-off: nothing slips through unnoticed, but routine bug patches wait weeks for monthly board meetings.',
            feedback: 'Over-centralizing routine technical approvals traded operational agility for heavy bureaucracy.',
            tone: 'analytical',
          },
          scoringEffects: { consistency: 6, consequenceAwareness: 2, integrity: 6, reasoning: 2 },
        },
      ],
    },
  ],
};
