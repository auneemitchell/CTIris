/**
 * STIX 2.1 Property and Object Definitions
 *
 * Auto-generated from the STIX 2.1 specification.
 * Source: https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html
 */

// ── Common Property Descriptions ────────────────────────────────────────

/**
 * Descriptions for common STIX properties that appear across all object types.
 */
export const STIX_COMMON_PROPERTY_DESCRIPTIONS: Record<string, string> = {
  "confidence": "How much the creator trusts that this object's information is accurate, scored 0–100. It's the source's own judgment, not a guarantee.",
  "created": "When the object was first created. This stays fixed even if the object is updated later.",
  "created_by_ref": "Points to the identity of whoever produced this object. Useful for deciding how much to trust it.",
  "defanged": "Marks whether dangerous data (like a live malware URL) has been made safe to view — e.g. 'hxxp://' instead of 'http://'. Defaults to false.",
  "extensions": "Extra, non-standard fields added on top of the base STIX spec.",
  "external_references": "Links out to related non-STIX info, like a CVE ID, an ATT&CK technique, or a report URL.",
  "granular_markings": "Applies handling/sharing rules (like TLP) to specific fields rather than the whole object.",
  "id": "This object's unique identifier, formatted as type--UUID. Other objects use it to reference this one.",
  "labels": "Free-form tags describing the object. Their meaning is defined by whoever uses them, not by the spec.",
  "lang": "The language of the object's text content, as a standard code like 'en' or 'fr'.",
  "modified": "When this version of the object was last changed. Pairs with 'created' to track updates over time.",
  "object_marking_refs": "Applies handling/sharing rules (like TLP:RED) to the whole object by pointing to marking-definition objects.",
  "revoked": "Flags that the object has been withdrawn and should no longer be trusted.",
  "spec_version": "Which version of the STIX standard this object follows (2.1 here).",
  "type": "What kind of STIX object this is (e.g. 'indicator', 'malware'). It's also the prefix of the id."
};
// ── STIX Object Type Descriptions ───────────────────────────────────────

/**
 * High-level descriptions for each STIX object type.
 */
export const STIX_OBJECT_DESCRIPTIONS: Record<string, string> = {
  "attack-pattern": "A type of TTP describing how adversaries try to compromise targets. It helps categorize attacks and generalize specific incidents into the patterns they follow.",
  "campaign": "A set of malicious activities or attacks carried out over a period of time against specific targets. Campaigns have defined objectives and may be part of a larger Intrusion Set.",
  "course-of-action": "A recommended action or response to a threat, such as remediation or mitigation steps. In STIX 2.1 this is a stub, so it mainly holds prose rather than automated actions.",
  "grouping": "Asserts that a set of STIX Objects share some context, like an ongoing investigation. Unlike a Bundle, which conveys no context, a Grouping says these objects belong together.",
  "identity": "Represents an individual, organization, group, or class of them (e.g. the finance sector). It can hold names, contact info, and the sectors the entity belongs to.",
  "indicator": "Contains a pattern used to detect suspicious or malicious activity, such as a set of malicious domains. The pattern is written in the STIX Patterning Language or a tool format like SNORT or YARA.",
  "infrastructure": "Systems, services, or resources that support an activity, like C2 servers, defensive tools, or targeted databases. A type of TTP.",
  "intrusion-set": "A set of adversarial behaviors and resources believed to be run by a single organization. It can tie together multiple Campaigns linked to a common, known or unknown, Threat Actor.",
  "location": "A geographic place, described by region, country, address, or coordinates. Other objects can reference it to show where activity happened.",
  "malware": "Malicious code inserted into a system, usually covertly. A type of TTP that can represent a single instance or a whole malware family.",
  "malware-analysis": "Captures the metadata and results of a static or dynamic analysis run against a malware sample or family.",
  "note": "Adds informative text or extra analysis to other STIX Objects. Anyone can create a Note, not just the original object's creator.",
  "observed-data": "Raw facts about cyber entities like files, systems, or network connections, expressed using Cyber-observable Objects (SCOs). For example, an observed IP address or registry key.",
  "opinion": "One entity's assessment of whether another object's information is correct, on a fixed agree/disagree scale. Used to capture second opinions on shared intelligence.",
  "relationship": "Links two objects to describe how they relate, acting as the edges between nodes in the STIX graph. For example, malware that 'targets' an identity.",
  "report": "A collection of threat intelligence about one or more topics, like a threat actor or attack technique. Groups related objects so they can be published as one coherent story.",
  "sighting": "Records the belief that something (an indicator, malware, threat actor, etc.) was actually seen. Used to track what is being targeted and to spot trends.",
  "threat-actor": "An individual, group, or organization believed to act with malicious intent. Distinct from an Intrusion Set, though an actor may support or run one.",
  "tool": "Legitimate software that threat actors can use to carry out attacks, like a remote access or scanning utility. Knowing how and when these are used aids defense.",
  "vulnerability": "A weakness or defect in software or hardware that can be exploited to harm a system's confidentiality, integrity, or availability. Often identified by a CVE number."
};

// ── Object-Specific Property Descriptions ───────────────────────────────

/**
 * Property descriptions specific to each STIX object type.
 * Format: { objectType: { propertyName: description } }
 */
export const STIX_OBJECT_PROPERTIES: Record<string, Record<string, string>> = {
  "attack-pattern": {
    "aliases": "Other names this Attack Pattern is known by.",
    "description": "A free-text explanation of the Attack Pattern, including its purpose and key characteristics.",
    "kill_chain_phases": "The kill chain phase(s) where this Attack Pattern is used, showing where in an attack it fits.",
    "name": "A short name identifying the Attack Pattern.",
    "type": "Identifies the object as an Attack Pattern. Always set to 'attack-pattern'."
  },
  "campaign": {
    "aliases": "Other names this Campaign is known by.",
    "description": "A free-text explanation of the Campaign, including its purpose and key characteristics.",
    "first_seen": "When this Campaign was first seen. Summarized from sightings and other data.",
    "last_seen": "When this Campaign was last seen. Summarized from sightings and other data.",
    "name": "A short name identifying the Campaign.",
    "objective": "The Campaign's main goal or intended outcome, what the attacker hopes to achieve.",
    "type": "Identifies the object as a Campaign. Always set to 'campaign'."
  },
  "course-of-action": {
    "action (reserved)": "Reserved for future use to capture structured or automated actions. Not usable in STIX 2.1.",
    "description": "A free-text explanation of the Course of Action, including its purpose and key characteristics.",
    "name": "A short name identifying the Course of Action.",
    "type": "Identifies the object as a Course of Action. Always set to 'course-of-action'."
  },
  "grouping": {
    "context": "A short label for the shared context that ties the grouped objects together.",
    "description": "A free-text explanation of the Grouping, including its purpose and key characteristics.",
    "name": "A short name identifying the Grouping.",
    "object_refs": "The list of STIX Objects that belong to this Grouping.",
    "type": "Identifies the object as a Grouping. Always set to 'grouping'."
  },
  "identity": {
    "contact_information": "Contact details for this Identity, such as an email address or phone number.",
    "description": "A free-text explanation of the Identity, including its purpose and key characteristics.",
    "identity_class": "The kind of entity described, such as an individual, group, or organization.",
    "name": "The name of this Identity.",
    "roles": "The roles this Identity performs, such as CEO, domain admin, or retailer.",
    "sectors": "The industry sectors this Identity belongs to, such as finance or healthcare.",
    "type": "Identifies the object as an Identity. Always set to 'identity'."
  },
  "indicator": {
    "description": "A free-text explanation of the Indicator, including its purpose and key characteristics.",
    "indicator_types": "Categories that describe what kind of indicator this is, such as 'malicious-activity'.",
    "kill_chain_phases": "The kill chain phase(s) this Indicator relates to, showing where in an attack it applies.",
    "name": "A short name identifying the Indicator.",
    "pattern": "The detection logic itself, written in the STIX Patterning Language or a tool format like SNORT or YARA.",
    "pattern_type": "The pattern language used, such as 'stix', 'snort', or 'yara'.",
    "pattern_version": "The version of the pattern language used, matching the data in the pattern property.",
    "type": "Identifies the object as an Indicator. Always set to 'indicator'.",
    "valid_from": "The time from which this Indicator should be considered valid.",
    "valid_until": "The time after which this Indicator is no longer valid. If omitted, there is no end limit."
  },
  "infrastructure": {
    "aliases": "Other names this Infrastructure is known by.",
    "description": "A free-text explanation of the Infrastructure, including its purpose and how it is used.",
    "first_seen": "When this Infrastructure was first seen being used.",
    "infrastructure_types": "The kind of infrastructure described, such as 'command-and-control' or 'hosting'.",
    "kill_chain_phases": "The kill chain phase(s) where this Infrastructure is used.",
    "last_seen": "When this Infrastructure was last seen being used.",
    "name": "A short name or label identifying the Infrastructure.",
    "type": "Identifies the object as Infrastructure. Always set to 'infrastructure'."
  },
  "intrusion-set": {
    "aliases": "Other names this Intrusion Set is known by.",
    "description": "A free-text explanation of the Intrusion Set, including its purpose and key characteristics.",
    "first_seen": "When this Intrusion Set was first seen. Summarized from sightings and other data.",
    "goals": "What this Intrusion Set is trying to achieve, such as stealing credit card numbers.",
    "last_seen": "When this Intrusion Set was last seen. Summarized from sightings and other data.",
    "name": "A short name identifying this Intrusion Set.",
    "primary_motivation": "The main reason behind this Intrusion Set's activity, such as financial gain or espionage.",
    "resource_level": "The organizational level the group works at, which reflects the resources available to it.",
    "secondary_motivations": "Other reasons driving this Intrusion Set, roughly as important as the primary one.",
    "type": "Identifies the object as an Intrusion Set. Always set to 'intrusion-set'."
  },
  "location": {
    "administrative_area": "The state, province, or similar sub-national area this Location describes.",
    "city": "The city this Location describes.",
    "country": "The country this Location describes, ideally as a two-letter code.",
    "description": "A free-text explanation of the Location.",
    "latitude": "The north-south coordinate in decimal degrees. Positive is north of the equator, negative is south.",
    "longitude": "The east-west coordinate in decimal degrees. Positive is east of the prime meridian, negative is west.",
    "name": "A short name identifying the Location.",
    "postal_code": "The postal or ZIP code for this Location.",
    "precision": "How precise the latitude and longitude are, measured in meters.",
    "region": "The broad world region this Location describes, such as 'northern-america'.",
    "street_address": "The full street address for this Location.",
    "type": "Identifies the object as a Location. Always set to 'location'."
  },
  "malware": {
    "aliases": "Other names this malware or malware family is known by.",
    "architecture_execution_envs": "The processor architectures the malware runs on, such as x86 or ARM.",
    "capabilities": "The things this malware is able to do, such as stealing credentials or spreading itself.",
    "description": "A free-text explanation of the malware, including its purpose and key characteristics.",
    "first_seen": "When this malware was first seen. Summarized from sightings and other data.",
    "implementation_languages": "The programming languages used to build the malware, such as C or Python.",
    "is_family": "True if this object describes a malware family, false if it describes a single instance.",
    "kill_chain_phases": "The kill chain phase(s) where this malware can be used.",
    "last_seen": "When this malware was last seen. Summarized from sightings and other data.",
    "malware_types": "Categories that describe the kind of malware, such as 'ransomware' or 'trojan'.",
    "name": "A name identifying the malware or family. Required for a malware family.",
    "operating_system_refs": "References to the operating systems the malware can run on.",
    "sample_refs": "References to the actual file or artifact objects that are samples of this malware.",
    "type": "Identifies the object as Malware. Always set to 'malware'."
  },
  "malware-analysis": {
    "analysis_definition_version": "The version of the analysis definitions used, such as an AV signature set.",
    "analysis_ended": "When the analysis finished.",
    "analysis_engine_version": "The version of the analysis engine or product used.",
    "analysis_sco_refs": "References to the observable objects captured during the analysis.",
    "analysis_started": "When the analysis began.",
    "configuration_version": "The named configuration of extra settings used for this analysis run.",
    "host_vm_ref": "The virtual machine environment used to host the OS for dynamic analysis, if any.",
    "installed_software_refs": "Any non-standard software installed in the analysis environment.",
    "operating_system_ref": "The operating system used for the dynamic analysis.",
    "product": "The name of the analysis engine or product used, in lowercase with dashes.",
    "result": "The overall classification reached by the analysis, such as 'malicious' or 'benign'.",
    "result_name": "The specific name or label the tool assigned to the malware.",
    "sample_ref": "A reference to the file, network traffic, or artifact the analysis was run against.",
    "submitted": "When the malware was first submitted for analysis. Stays fixed even if it is rescanned later.",
    "type": "Identifies the object as a Malware Analysis. Always set to 'malware-analysis'.",
    "version": "The version of the analysis product used."
  },
  "note": {
    "abstract": "A brief summary of the note's content.",
    "authors": "The name(s) of whoever wrote the note, such as the analyst who created it.",
    "content": "The main text of the note.",
    "object_refs": "The STIX Objects this note is attached to.",
    "type": "Identifies the object as a Note. Always set to 'note'."
  },
  "observed-data": {
    "first_observed": "The start of the time window during which the data was seen.",
    "last_observed": "The end of the time window during which the data was seen.",
    "number_observed": "How many times the observed data was seen, between 1 and 999,999,999.",
    "object_refs": "References to the observable objects (SCOs) that make up this observation.",
    "objects (optional - deprecated)": "A dictionary of the observed objects. Deprecated, use object_refs instead.",
    "type": "Identifies the object as Observed Data. Always set to 'observed-data'."
  },
  "opinion": {
    "authors": "The name(s) of whoever produced this Opinion, such as the analyst who created it.",
    "explanation": "Why the producer holds this Opinion.",
    "object_refs": "The STIX Objects this Opinion is about.",
    "opinion": "The level of agreement or disagreement, on a fixed scale from 'strongly-disagree' to 'strongly-agree'.",
    "type": "Identifies the object as an Opinion. Always set to 'opinion'."
  },
  "relationship": {
    "description": "A free-text explanation of the Relationship, including its purpose and key characteristics.",
    "relationship_type": "The kind of link between the two objects, such as 'uses', 'targets', or 'indicates'.",
    "source_ref": "The id of the object the relationship points from.",
    "start_time": "The earliest time the relationship is considered true. A future time is the producer's estimate.",
    "stop_time": "The latest time the relationship is considered true. A future time is the producer's estimate.",
    "target_ref": "The id of the object the relationship points to.",
    "type": "Identifies the object as a Relationship. Always set to 'relationship'."
  },
  "report": {
    "description": "A free-text explanation of the Report, including its purpose and key characteristics.",
    "name": "A short name identifying the Report.",
    "object_refs": "The STIX Objects included in this Report.",
    "published": "The date this Report was officially published.",
    "report_types": "The main kind(s) of content in the report, such as 'threat-actor' or 'campaign'.",
    "type": "Identifies the object as a Report. Always set to 'report'."
  },
  "sighting": {
    "count": "How many times the referenced object was sighted, between 0 and 999,999,999.",
    "description": "A free-text explanation of the Sighting.",
    "first_seen": "The start of the time window during which the object was sighted.",
    "last_seen": "The end of the time window during which the object was sighted.",
    "observed_data_refs": "References to the Observed Data objects holding the raw evidence for this Sighting.",
    "sighting_of_ref": "A reference to the object that was sighted, such as an Indicator or Malware.",
    "summary": "True if this Sighting is aggregated from other reports rather than primary source data.",
    "type": "Identifies the object as a Sighting. Always set to 'sighting'.",
    "where_sighted_refs": "References to the Identity or Location objects that saw the sighting."
  },
  "threat-actor": {
    "aliases": "Other names this Threat Actor is believed to use.",
    "description": "A free-text explanation of the Threat Actor, including its purpose and key characteristics.",
    "first_seen": "When this Threat Actor was first seen. Summarized from sightings and other data.",
    "goals": "What this Threat Actor is trying to achieve, such as stealing credit card numbers.",
    "last_seen": "When this Threat Actor was last seen. Summarized from sightings and other data.",
    "name": "A name identifying this Threat Actor or group.",
    "personal_motivations": "The individual's own reasons for attacking, separate from any organizational goals.",
    "primary_motivation": "The main reason behind this Threat Actor's activity, such as financial gain or ideology.",
    "resource_level": "The organizational level the actor works at, which reflects the resources available to them.",
    "roles": "The roles this Threat Actor plays, such as 'malware-author' or 'director'.",
    "secondary_motivations": "Other reasons driving this Threat Actor, roughly as important as the primary one.",
    "sophistication": "The skill or expertise the Threat Actor needs to carry out their attacks.",
    "threat_actor_types": "Categories describing the kind of threat actor, such as 'nation-state' or 'hacktivist'.",
    "type": "Identifies the object as a Threat Actor. Always set to 'threat-actor'."
  },
  "tool": {
    "aliases": "Other names this Tool is known by.",
    "description": "A free-text explanation of the Tool, including its purpose and key characteristics.",
    "kill_chain_phases": "The kill chain phase(s) where this Tool can be used.",
    "name": "A short name identifying the Tool.",
    "tool_types": "Categories describing the kind of tool, such as 'remote-access' or 'vulnerability-scanning'.",
    "tool_version": "The version identifier of the Tool.",
    "type": "Identifies the object as a Tool. Always set to 'tool'."
  },
  "vulnerability": {
    "description": "A free-text explanation of the Vulnerability, including its key characteristics.",
    "name": "A name identifying the Vulnerability, often a CVE ID.",
    "type": "Identifies the object as a Vulnerability. Always set to 'vulnerability'."
  }
};

// ── Relationship Type Descriptions ──────────────────────────────────────

/**
 * Descriptions for STIX relationship types.
 * Format: { relationshipType: description }
 */
export const STIX_RELATIONSHIP_DESCRIPTIONS: Record<string, string> = {
  "attributed-to": "Links a Campaign to the Intrusion Set or Threat Actor carrying it out.",
  "authored-by": "Says the malware was written by the related Threat Actor or Intrusion Set.",
  "based-on": "Says the Indicator was created from information in an Observed Data object.",
  "beacons-to, exfiltrates-to": "Says the malware beacons to or sends stolen data to the related Infrastructure.",
  "communicates-with": "Says this infrastructure talks to the given network resource, such as an IP or domain.",
  "compromises": "Says the Campaign has compromised the related Infrastructure.",
  "consists-of": "Lists the objects that make up an infrastructure, such as IPs, domains, or URLs.",
  "controls": "Says this infrastructure controls other infrastructure or a piece of malware.",
  "delivers": "Says this Attack Pattern is used to deliver the malware.",
  "downloads, drops": "Says this malware downloads or drops another piece of malware, a tool, or a file.",
  "drops": "Says this Tool drops a piece of malware.",
  "exploits": "Says this malware exploits, or tries to exploit, a particular Vulnerability.",
  "has": "Says this Infrastructure has the related Vulnerability.",
  "hosts": "Says this infrastructure runs or passively hosts the related tool or malware.",
  "hosts, owns": "Says the Intrusion Set hosts or owns the related Infrastructure.",
  "impersonates": "Says the Threat Actor pretends to be the related Identity.",
  "investigates": "Says the Course of Action can be used to investigate the Indicator.",
  "located-at": "Says the Identity is located at the related Location.",
  "originates-from": "Says the Campaign originates from the related Location.",
  "remediates": "Says the Course of Action can be used to fix or mitigate the threat.",
  "targets": "Says this Attack Pattern targets the related Identity, Location, or Vulnerability.",
  "uses": "Says the related Malware or Tool is used to carry out the Attack Pattern's behavior.",
  "variant-of": "Says one piece of malware is a variant of another."
};

// ── MITRE ATT&CK Custom Properties ──────────────────────────────────────

/*
 * Descriptions for MITRE's custom x_mitre_* properties.
 * These are not part of the core STIX spec. MITRE adds them on top of
 * standard STIX objects to carry ATT&CK-specific data.
 *
 * Note: the ATT&CK ID (T1059, G0016, S0331, etc.) is NOT a property. It
 * lives in external_references where source_name is "mitre-attack".
 */
export const MITRE_ATTACK_PROPERTIES: Record<string, string> = {
  // Common across most ATT&CK objects
  "x_mitre_version": "The version of this specific ATT&CK object, bumped when its content changes, such as '1.2'.",
  "x_mitre_attack_spec_version": "The version of the ATT&CK data specification this object follows, such as '3.2.0'. Lets tools check compatibility.",
  "x_mitre_domains": "Which ATT&CK matrices this object belongs to, such as 'enterprise-attack', 'mobile-attack', or 'ics-attack'.",
  "x_mitre_modified_by_ref": "Points to the identity that last edited this object. For official data this is MITRE's own identity.",
  "x_mitre_deprecated": "True if the object should no longer be used and has no direct replacement. Differs from 'revoked', which does have a replacement.",
  "x_mitre_contributors": "The people or organizations who contributed the information in this object.",
  "x_mitre_platforms": "The platforms this object applies to, such as Windows, Linux, macOS, or a cloud service.",

  // Technique and sub-technique (attack-pattern)
  "x_mitre_detection": "Guidance on how to spot this technique, such as which logs, events, or behaviors to watch.",
  "x_mitre_is_subtechnique": "True if this is a sub-technique (a child of a broader technique), false if it is a top-level technique.",
  "x_mitre_data_sources": "Older list of data sources useful for detecting this technique. Newer data uses Data Component 'detects' relationships instead.",
  "x_mitre_defense_bypassed": "Defenses this technique can get around, such as anti-virus or host intrusion prevention.",
  "x_mitre_permissions_required": "The permission level an attacker needs to run this technique, such as User or Administrator.",
  "x_mitre_effective_permissions": "The permission level an attacker gains by successfully using this technique.",
  "x_mitre_system_requirements": "Conditions that must already be in place for the technique to work.",
  "x_mitre_remote_support": "True if the technique can be carried out remotely rather than only on the local host.",
  "x_mitre_impact_type": "Whether the technique affects data availability or integrity. Used on impact techniques.",
  "x_mitre_tactic_type": "For mobile techniques, whether it needs device access or works without it.",

  // Tactic (x-mitre-tactic)
  "x_mitre_shortname": "The tactic's short name, such as 'credential-access', used to map techniques to it through kill_chain_phases.",

  // Software (malware and tool)
  "x_mitre_aliases": "The names this software is tracked under, including its primary name and known aliases.",

  // Campaign
  "x_mitre_first_seen_citation": "The source reference backing up the campaign's first_seen date.",
  "x_mitre_last_seen_citation": "The source reference backing up the campaign's last_seen date.",

  // Data Source (x-mitre-data-source)
  "x_mitre_collection_layers": "Where this data can be collected from, such as Host, Network, or Cloud Control Plane.",

  // Data Component (x-mitre-data-component)
  "x_mitre_data_source_ref": "Points to the parent Data Source this component belongs to.",

  // Collection (x-mitre-collection)
  "x_mitre_contents": "The full list of objects included in this ATT&CK release, each with its id and last-modified time.",

  // Matrix (x-mitre-matrix)
  "tactic_refs": "An ordered list of the tactic objects in this matrix. The order sets how tactics appear from left to right.",

  // Asset (x-mitre-asset, mainly ICS)
  "x_mitre_sectors": "The industry sectors this asset is typically found in, such as electric or water utilities.",
  "x_mitre_related_assets": "Other names or equivalent assets this one is associated with."
};

// ── MITRE ATT&CK Custom Object Types ────────────────────────────────────

/**
 * High-level descriptions for ATT&CK's custom STIX object types.
 * ATT&CK also reuses standard STIX types: attack-pattern = Technique,
 * intrusion-set = Group, malware/tool = Software, course-of-action =
 * Mitigation, campaign = Campaign.
 */
export const MITRE_ATTACK_OBJECT_DESCRIPTIONS: Record<string, string> = {
  "x-mitre-matrix": "An ATT&CK matrix for one domain. Groups and orders the tactics shown across the top of the matrix.",
  "x-mitre-tactic": "An adversary's tactical goal, the 'why' behind a technique, such as Credential Access. Maps to a kill chain phase.",
  "x-mitre-data-source": "A subject of data that sensors or logs can collect, such as Network Traffic. Acts as a parent for Data Components.",
  "x-mitre-data-component": "A specific slice of a Data Source used to detect techniques, such as Network Traffic Flow.",
  "x-mitre-collection": "A container representing one ATT&CK release, listing every object that release includes.",
  "x-mitre-asset": "A device or system found in an environment, mainly ICS, such as a PLC or workstation, that techniques may target."
};




// ── Helper Function ─────────────────────────────────────────────────────

/**
 * Get a tooltip description for a STIX property.
 * Checks object-specific properties first, then MITRE custom properties, then common properties.
 *
 * @param propertyName - The STIX property name (e.g., "name", "created")
 * @param objectType - Optional STIX object type (e.g., "attack-pattern")
 * @returns The property description, or undefined if not found
 */
export function getPropertyDescription(
  propertyName: string,
  objectType?: string
): string | undefined {
  // Check object-specific property first
  if (objectType && STIX_OBJECT_PROPERTIES[objectType]?.[propertyName]) {
    return STIX_OBJECT_PROPERTIES[objectType][propertyName];
  }

  // Check MITRE ATT&CK custom properties
  if (propertyName.startsWith('x_mitre_') && MITRE_ATTACK_PROPERTIES[propertyName]) {
    return MITRE_ATTACK_PROPERTIES[propertyName];
  }

  // Fall back to common property
  return STIX_COMMON_PROPERTY_DESCRIPTIONS[propertyName];
}

/**
 * Get a description for a STIX object type.
 *
 * @param objectType - The STIX object type (e.g., "attack-pattern", "x-mitre-tactic")
 * @returns The object type description, or undefined if not found
 */
export function getObjectDescription(objectType: string): string | undefined {
  // Check MITRE custom object types first
  if (objectType.startsWith('x-mitre-') && MITRE_ATTACK_OBJECT_DESCRIPTIONS[objectType]) {
    return MITRE_ATTACK_OBJECT_DESCRIPTIONS[objectType];
  }

  // Fall back to standard STIX object types
  return STIX_OBJECT_DESCRIPTIONS[objectType];
}

/**
 * Get a description for a STIX relationship type.
 *
 * @param relationshipType - The relationship type (e.g., "indicates", "uses")
 * @returns The relationship description, or undefined if not found
 */
export function getRelationshipDescription(relationshipType: string): string | undefined {
  return STIX_RELATIONSHIP_DESCRIPTIONS[relationshipType];
}
