/**
 * Shared STIX type definitions used across the frontend.
 *
 * Having one list here means DashboardTab (stat cards) and StixBrowser
 * (type filter dropdown) always show the same types with the same labels
 * and definitions — previously they had separate hand-maintained lists
 * that had already drifted apart.
 *
 * ⚠️ DashboardTab fires one API count request per entry in STIX_TYPES on
 * page load. The nginx gateway has a burst limit — if you add many types
 * here, check gateway/nginx.conf and raise the burst value if needed.
 */

export interface StixTypeInfo {
  key: string;
  label: string;
  def: string;
}

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
  { key: 'relationship',     label: 'Relationship',      def: 'A link between two STIX objects — for example, "Lazarus Group uses Cobalt Strike". Relationships are how the intelligence graph is built.' },
  { key: 'sighting',         label: 'Sighting',          def: 'A record that a STIX object was observed in the real world, such as an indicator being seen in a network log.' },
];

/** Flat list of type key strings — use this when you only need the key, not the label or definition. */
export const STIX_TYPE_KEYS = STIX_TYPES.map(t => t.key);
