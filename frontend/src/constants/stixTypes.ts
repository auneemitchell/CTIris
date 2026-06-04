/**
 * Shared STIX type definitions used across the frontend.
 *
 * Having one list here means DashboardTab (stat cards) and StixBrowser
 * (type filter dropdown) always show the same types with the same labels
 * and definitions — previously they had separate hand-maintained lists
 * that had already drifted apart.
 */

export interface StixTypeInfo {
  key: string;
  label: string;
  def: string;
}

/**
 * All 20 STIX Object types. (18 domain and 2 relationship)
 * DASHBOARD_STIX_TYPES below filters to the ones to show on dashboard
 */
export const STIX_TYPES: StixTypeInfo[] = [
  { key: 'malware',          label: 'Malware',           def: 'Malicious software designed to disrupt, damage, or gain unauthorized access to systems. Includes viruses, ransomware, trojans, and spyware.' },
  { key: 'indicator',        label: 'Indicator',         def: 'A pattern used to detect suspicious or malicious activity — such as a known bad IP address, domain name, file hash, or URL.' },
  { key: 'threat-actor',     label: 'Threat Actor',      def: 'An individual, group, or organization believed to be behind malicious cyber activity. Can range from nation-state groups to cybercriminal organizations.' },
  { key: 'attack-pattern',   label: 'Attack Pattern',    def: 'A description of how adversaries try to compromise targets. Often mapped to MITRE ATT&CK techniques, such as spear phishing or credential dumping.' },
  { key: 'campaign',         label: 'Campaign',          def: 'A set of malicious activities carried out over a period of time, typically tied to a specific objective or threat actor.' },
  { key: 'intrusion-set',    label: 'Intrusion Set',     def: "A grouped collection of behaviors and tools believed to be orchestrated by one threat actor. Think of it as an actor's long-running playbook." },
  { key: 'vulnerability',    label: 'Vulnerability',     def: 'A weakness in software, hardware, or a system that attackers can exploit. Often identified by a CVE number (e.g. CVE-2021-44228).' },
  { key: 'course-of-action', label: 'Course of Action',  def: 'A recommended defensive step — such as a patch, configuration change, or detection rule — that mitigates a threat or vulnerability.' },
  { key: 'identity',         label: 'Identity',          def: 'Represents a person, organization, or system relevant to the intelligence — such as a victim sector, a reporting source, or a threat actor group.' },
  { key: 'tool',             label: 'Tool',              def: 'Legitimate software used by attackers to carry out malicious actions. Unlike malware, tools are often publicly available (e.g. Mimikatz, Cobalt Strike).' },
  { key: 'observed-data',    label: 'Observed Data',     def: 'Raw observations of something seen on a network or system, like a file, IP address, or process. The raw evidence before it becomes a labelled indicator.' },
  { key: 'grouping',         label: 'Grouping',          def: 'A way to cluster related STIX objects together under a shared context or label — similar to a folder or tag for a set of intelligence objects.' },
  { key: 'infrastructure',   label: 'Infrastructure',    def: 'Systems, software, or services used by threat actors to conduct operations — such as C2 servers, botnets, or bulletproof hosting.' },
  { key: 'location',         label: 'Location',          def: 'A geographic region, country, or coordinates relevant to the intelligence — such as where an attack originated or a victim is located.' },
  { key: 'malware-analysis', label: 'Malware Analysis',  def: 'The result of analyzing a malware sample — including sandbox outputs, static analysis findings, or behavioral observations.' },
  { key: 'note',             label: 'Note',              def: 'A free-text annotation attached to one or more STIX objects, used to add context, commentary, or analyst observations.' },
  { key: 'opinion',          label: 'Opinion',           def: "An analyst's assessment of the accuracy or relevance of another STIX object — for example, agreeing or disagreeing with a reported indicator." },
  { key: 'report',           label: 'Report',            def: 'A collection of threat intelligence focused on a specific topic — such as an incident report, a threat actor profile, or a campaign summary.' },
  { key: 'relationship',     label: 'Relationship',      def: 'A link between two STIX objects — for example, "Lazarus Group uses Cobalt Strike". Relationships are how the intelligence graph is built.' },
  { key: 'sighting',         label: 'Sighting',          def: 'A record that a STIX object was observed in the real world, such as an indicator being seen in a network log.' },
];

/** Flat list of type key strings — use this when you only need the key, not the label or definition. */
export const STIX_TYPE_KEYS = STIX_TYPES.map(t => t.key);

/**
 * Subset of STIX_TYPES shown as stat cards on the Dashboard tab.
 * Restricted to the core actionable SDOs; meta-types like identity,
 * observed-data, relationship, and sighting are excluded from the dashboard
 * but remain available in STIX_TYPES for browser filtering.
 */
export const DASHBOARD_STIX_TYPES: StixTypeInfo[] = STIX_TYPES.filter(t =>
  ['malware', 'indicator', 'threat-actor', 'attack-pattern', 'campaign',
   'intrusion-set', 'vulnerability', 'tool', 'course-of-action'].includes(t.key)
);
