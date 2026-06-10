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
  "confidence": "The confidence property identifies the confidence that the creator has in the correctness of their data. The confidence value MUST be a number in the range of 0-100.",
  "created": "The created property represents the time at which the object was originally created. The object creator can use the time it deems most appropriate as the time the object was created.",
  "created_by_ref": "The created_by_ref property specifies the id property of the identity object that describes the entity that created this object. If this attribute is omitted, the source of this information is undefined.",
  "defanged": "This property defines whether or not the data contained within the object has been defanged. The default value for this property is false.",
  "extensions": "Specifies any extensions of the object, as a dictionary. Dictionary keys SHOULD be the id of a STIX Extension object or the name of a predefined object extension found in this specification, depending on the type of extension being used.",
  "external_references": "The external_references property specifies a list of external references which refers to non-STIX information.",
  "granular_markings": "The granular_markings property specifies a list of granular markings applied to this object. In some cases, though uncommon, marking definitions themselves may be marked with sharing or handling guidance.",
  "id": "The id property uniquely identifies this object.",
  "labels": "The labels property specifies a set of terms used to describe this object. The terms are user-defined or trust-group defined and their meaning is outside the scope of this specification and MAY be ignored.",
  "lang": "The lang property identifies the language of the text content in this object. When present, it MUST be a language code conformant to [RFC5646].",
  "modified": "The modified property is only used by STIX Objects that support versioning and represents the time that this particular version of the object was last modified. The object creator can use the time it deems most appropriate as the time this version of the object was modified.",
  "object_marking_refs": "The object_marking_refs property specifies a list of id properties of marking-definition objects that apply to this object. In some cases, though uncommon, marking definitions themselves may be marked with sharing or handling guidance.",
  "revoked": "The revoked property is only used by STIX Objects that support versioning and indicates whether the object has been revoked. Revoked objects are no longer considered valid by the object creator.",
  "spec_version": "The version of the STIX specification used to represent this object. The value of this property MUST be 2.1 for STIX Objects defined according to this specification.",
  "type": "The type property identifies the type of STIX Object." // Remove trailing comma from last item
};

// ── STIX Object Type Descriptions ───────────────────────────────────────

/**
 * High-level descriptions for each STIX object type.
 */
export const STIX_OBJECT_DESCRIPTIONS: Record<string, string> = {
  "attack-pattern": "Attack Patterns are a type of TTP that describe ways that adversaries attempt to compromise targets. Attack Patterns are used to help categorize attacks, generalize specific attacks to the patterns that they follow, and provide detailed information about how attacks are performed.",
  "campaign": "A Campaign is a grouping of adversarial behaviors that describes a set of malicious activities or attacks (sometimes called waves) that occur over a period of time against a specific set of targets. Campaigns usually have well defined objectives and may be part of an Intrusion Set.",
  "course-of-action": "Note: The Course of Action object in STIX 2.1 is a stub. It is included to support basic use cases (such as sharing prose courses of action) but does not support the ability to represent automated courses of action or contain properties to represent metadata about courses of action.",
  "grouping": "A Grouping object explicitly asserts that the referenced STIX Objects have a shared context, unlike a STIX Bundle (which explicitly conveys no context). A Grouping object should not be confused with an intelligence product, which should be conveyed via a STIX Report.",
  "identity": "Identities can represent actual individuals, organizations, or groups (e.g., ACME, Inc.) as well as classes of individuals, organizations, systems or groups (e.g., the finance sector). The Identity SDO can capture basic identifying information, contact information, and the sectors that the Identity belongs to.",
  "indicator": "Indicators contain a pattern that can be used to detect suspicious or malicious cyber activity. For example, an Indicator may be used to represent a set of malicious domains and use the STIX Patterning Language (see section 9) to specify these domains.",
  "infrastructure": "The Infrastructure SDO represents a type of TTP and describes any systems, software services and any associated physical or virtual resources intended to support some purpose (e.g., C2 servers used as part of an attack, device or server that are part of defense, database servers targeted by an attack, etc.).",
  "intrusion-set": "An Intrusion Set is a grouped set of adversarial behaviors and resources with common properties that is believed to be orchestrated by a single organization. An Intrusion Set may capture multiple Campaigns or other activities that are all tied together by shared attributes indicating a commonly known or unknown Threat Actor.",
  "location": "A Location represents a geographic location. The location may be described as any, some or all of the following: region (e.g., North America), civic address (e.g.",
  "malware": "Malware is a type of TTP that represents malicious code. It generally refers to a program that is inserted into a system, usually covertly.",
  "malware-analysis": "Malware Analysis captures the metadata and results of a particular static or dynamic analysis performed on a malware instance or family.",
  "note": "A Note is intended to convey informative text to provide further context and/or to provide additional analysis not contained in the STIX Objects, Marking Definition objects, or Language Content objects which the Note relates to. Notes can be created by anyone (not just the original object creator).",
  "observed-data": "Observed Data conveys information about cyber security related entities such as files, systems, and networks using the STIX Cyber-observable Objects (SCOs). For example, Observed Data can capture information about an IP address, a network connection, a file, or a registry key.",
  "opinion": "An Opinion is an assessment of the correctness of the information in a STIX Object produced by a different entity. The primary property is the opinion property, which captures the level of agreement or disagreement using a fixed scale.",
  "relationship": "The Relationship object is used to link together two SDOs or SCOs in order to describe how they are related to each other. If SDOs and SCOs are considered \"nodes\" or \"vertices\" in the graph, the Relationship Objects (SROs) represent \"edges\".",
  "report": "Reports are collections of threat intelligence focused on one or more topics, such as a description of a threat actor, malware, or attack technique, including context and related details. They are used to group related threat intelligence together so that it can be published as a comprehensive cyber threat story.",
  "sighting": "A Sighting denotes the belief that something in CTI (e.g., an indicator, malware, tool, threat actor, etc.) was seen. Sightings are used to track who and what are being targeted, how attacks are carried out, and to track trends in attack behavior.",
  "threat-actor": "Threat Actors are actual individuals, groups, or organizations believed to be operating with malicious intent. A Threat Actor is not an Intrusion Set but may support or be affiliated with various Intrusion Sets, groups, or organizations over time.",
  "tool": "Tools are legitimate software that can be used by threat actors to perform attacks. Knowing how and when threat actors use such tools can be important for understanding how campaigns are executed.",
  "vulnerability": "A Vulnerability is a weakness or defect in the requirements, designs, or implementations of the computational logic (e.g., code) found in software and some hardware components (e.g., firmware) that can be directly exploited to negatively impact the confidentiality, integrity, or availability of that system. CVE is a list of information security vulnerabilities and exposures that provides common names for publicly known problems [CVE]."
};

// ── Object-Specific Property Descriptions ───────────────────────────────

/**
 * Property descriptions specific to each STIX object type.
 * Format: { objectType: { propertyName: description } }
 */
export const STIX_OBJECT_PROPERTIES: Record<string, Record<string, string>> = {
  "attack-pattern": {
    "aliases": "Alternative names used to identify this Attack Pattern.",
    "description": "A description that provides more details and context about the Attack Pattern, potentially including its purpose and its key characteristics.",
    "kill_chain_phases": "The list of Kill Chain Phases for which this Attack Pattern is used.",
    "name": "A name used to identify the Attack Pattern.",
    "type": "The value of this property MUST be attack-pattern."
  },
  "campaign": {
    "aliases": "Alternative names used to identify this Campaign",
    "description": "A description that provides more details and context about the Campaign, potentially including its purpose and its key characteristics.",
    "first_seen": "The time that this Campaign was first seen. A summary property of data from sightings and other data that may or may not be available in STIX.",
    "last_seen": "The time that this Campaign was last seen. A summary property of data from sightings and other data that may or may not be available in STIX.",
    "name": "A name used to identify the Campaign.",
    "objective": "The Campaigns primary goal, objective, desired outcome, or intended effect  what the Threat Actor or Intrusion Set hopes to accomplish with this Campaign.",
    "type": "The value of this property MUST be campaign."
  },
  "course-of-action": {
    "action (reserved)": "RESERVED  To capture structured/automated courses of action.",
    "description": "A description that provides more details and context about the Course of Action, potentially including its purpose and its key characteristics.",
    "name": "A name used to identify the Course of Action.",
    "type": "The value of this property MUST be course-of-action."
  },
  "grouping": {
    "context": "A short descriptor of the particular context shared by the content referenced by the Grouping.",
    "description": "A description that provides more details and context about the Grouping, potentially including its purpose and its key characteristics.",
    "name": "A name used to identify the Grouping.",
    "object_refs": "Specifies the STIX Objects that are referred to by this Grouping.",
    "type": "The value of this property MUST be grouping."
  },
  "identity": {
    "contact_information": "The contact information (e-mail, phone number, etc.) for this Identity.",
    "description": "A description that provides more details and context about the Identity, potentially including its purpose and its key characteristics.",
    "identity_class": "The type of entity that this Identity describes, e.g., an individual or organization.",
    "name": "The name of this Identity.",
    "roles": "The list of roles that this Identity performs (e.g., CEO, Domain Administrators, Doctors, Hospital, or Retailer).",
    "sectors": "The list of industry sectors that this Identity belongs to.",
    "type": "The value of this property MUST be identity."
  },
  "indicator": {
    "description": "A description that provides more details and context about the Indicator, potentially including its purpose and its key characteristics.",
    "indicator_types": "A set of categorizations for this indicator.",
    "kill_chain_phases": "The kill chain phase(s) to which this Indicator corresponds.",
    "name": "A name used to identify the Indicator.",
    "pattern": "The detection pattern for this Indicator MAY be expressed as a STIX Pattern as specified in section 9 or another appropriate language such as SNORT, YARA, etc.",
    "pattern_type": "The pattern language used in this indicator. The value for this property SHOULD come from the pattern-type-ov open vocabulary.",
    "pattern_version": "The version of the pattern language that is used for the data in the pattern property which MUST match the type of pattern data included in the pattern property. For patterns that do not have a formal specification, the build or code version that the pattern is known to work with SHOULD be used.",
    "type": "The value of this property MUST be indicator.",
    "valid_from": "The time from which this Indicator is considered a valid indicator of the behaviors it is related or represents.",
    "valid_until": "The time at which this Indicator should no longer be considered a valid indicator of the behaviors it is related to or represents. If the valid_until property is omitted, then there is no constraint on the latest time for which the Indicator is valid."
  },
  "infrastructure": {
    "aliases": "Alternative names used to identify this Infrastructure.",
    "description": "A description that provides more details and context about the Infrastructure, potentially including its purpose, how it is being used, how it relates to other intelligence activities captured in related objects, and its key characteristics.",
    "first_seen": "The time that this Infrastructure was first seen performing malicious activities.",
    "infrastructure_types": "The type of infrastructure being described.",
    "kill_chain_phases": "The list of Kill Chain Phases for which this Infrastructure is used.",
    "last_seen": "The time that this Infrastructure was last seen performing malicious activities.",
    "name": "A name or characterizing text used to identify the Infrastructure.",
    "type": "The value of this property MUST be infrastructure."
  },
  "intrusion-set": {
    "aliases": "Alternative names used to identify this Intrusion Set.",
    "description": "A description that provides more details and context about the Intrusion Set, potentially including its purpose and its key characteristics.",
    "first_seen": "The time that this Intrusion Set was first seen. A summary property of data from sightings and other data that may or may not be available in STIX.",
    "goals": "The high-level goals of this Intrusion Set, namely, what are they trying to do. For example, they may be motivated by personal gain, but their goal is to steal credit card numbers.",
    "last_seen": "The time that this Intrusion Set was last seen. This property is a summary property of data from sightings and other data that may or may not be available in STIX.",
    "name": "A name used to identify this Intrusion Set.",
    "primary_motivation": "The primary reason, motivation, or purpose behind this Intrusion Set. The motivation is why the Intrusion Set wishes to achieve the goal (what they are trying to achieve).",
    "resource_level": "This property specifies the organizational level at which this Intrusion Set typically works, which in turn determines the resources available to this Intrusion Set for use in an attack.",
    "secondary_motivations": "The secondary reasons, motivations, or purposes behind this Intrusion Set. These motivations can exist as an equal or near-equal cause to the primary motivation.",
    "type": "The value of this property MUST be intrusion-set."
  },
  "location": {
    "administrative_area": "The state, province, or other sub-national administrative area that this Location describes.",
    "city": "The city that this Location describes.",
    "country": "The country that this Location describes.",
    "description": "A textual description of the Location.",
    "latitude": "The latitude of the Location in decimal degrees. Positive numbers describe latitudes north of the equator, and negative numbers describe latitudes south of the equator.",
    "longitude": "The longitude of the Location in decimal degrees. Positive numbers describe longitudes east of the prime meridian and negative numbers describe longitudes west of the prime meridian.",
    "name": "A name used to identify the Location.",
    "postal_code": "The postal code for this Location.",
    "precision": "Defines the precision of the coordinates specified by the latitude and longitude properties. This is measured in meters.",
    "region": "The region that this Location describes.",
    "street_address": "The street address that this Location describes. This property includes all aspects or parts of the street address.",
    "type": "The value of this property MUST be location."
  },
  "malware": {
    "aliases": "Alternative names used to identify this malware or malware family.",
    "architecture_execution_envs": "The processor architectures (e.g., x86, ARM, etc.) that the malware instance or family is executable on.",
    "capabilities": "Any of the capabilities identified for the malware instance or family.",
    "description": "A description that provides more details and context about the malware instance or family, potentially including its purpose and its key characteristics.",
    "first_seen": "The time that the malware instance or family was first seen. This property is a summary property of data from sightings and other data that may or may not be available in STIX.",
    "implementation_languages": "The programming language(s) used to implement the malware instance or family.",
    "is_family": "Whether the object represents a malware family (if true) or a malware instance (if false).",
    "kill_chain_phases": "The list of Kill Chain Phases for which this malware can be used.",
    "last_seen": "The time that the malware family or malware instance was last seen. This property is a summary property of data from sightings and other data that may or may not be available in STIX.",
    "malware_types": "A set of categorizations for the malware being described.",
    "name": "A name used to identify the malware instance or family, as specified by the producer of the SDO. For a malware family the name MUST be defined.",
    "operating_system_refs": "The operating systems that the malware family or malware instance is executable on. This applies to virtualized operating systems as well as those running on bare metal.",
    "sample_refs": "The sample_refs property specifies a list of identifiers of the SCO file or artifact objects associated with this malware instance(s) or family.",
    "type": "The value of this property MUST be malware."
  },
  "malware-analysis": {
    "analysis_definition_version": "The version of the analysis definitions used by the analysis tool (including AV tools).",
    "analysis_ended": "The date and time that the malware analysis ended.",
    "analysis_engine_version": "The version of the analysis engine or product (including AV engines) that was used to perform the analysis.",
    "analysis_sco_refs": "This property contains the references to the STIX Cyber-observable Objects that were captured during the analysis process.",
    "analysis_started": "The date and time that the malware analysis was initiated.",
    "configuration_version": "The named configuration of additional product configuration parameters for this analysis run. For example, when a product is configured to do full depth analysis of Window PE files.",
    "host_vm_ref": "A description of the virtual machine environment used to host the guest operating system (if applicable) that was used for the dynamic analysis of the malware instance or family. If this value is not included in conjunction with the operating_system_ref property, this means that the dynamic analysis may have been performed on bare metal (i.e.",
    "installed_software_refs": "Any non-standard software installed on the operating system (specified through the operating-system value) used for the dynamic analysis of the malware instance or family.",
    "operating_system_ref": "The operating system used for the dynamic analysis of the malware instance or family. This applies to virtualized operating systems as well as those running on bare metal.",
    "product": "The name of the analysis engine or product that was used. Product names SHOULD be all lowercase with words separated by a dash \"-\".",
    "result": "The classification result as determined by the scanner or tool analysis process.",
    "result_name": "The classification result or name assigned to the malware instance by the scanner tool.",
    "sample_ref": "This property contains the reference to the SCO file, network traffic or artifact object that this malware analysis was performed against. Caution should be observed when creating an SRO between Malware and Malware Analysis objects when the Malware sample_refs property does not contain the SCO that is included in the Malware Analysis sample_ref property.",
    "submitted": "The date and time that the malware was first submitted for scanning or analysis. This value will stay constant while the scanned date can change.",
    "type": "The value of this property MUST be malware-analysis.",
    "version": "The version of the analysis product that was used to perform the analysis."
  },
  "note": {
    "abstract": "A brief summary of the note content.",
    "authors": "The name of the author(s) of this note (e.g., the analyst(s) that created it).",
    "content": "The content of the note.",
    "object_refs": "The STIX Objects that the note is being applied to.",
    "type": "The value of this property MUST be note"
  },
  "observed-data": {
    "first_observed": "The beginning of the time window during which the data was seen.",
    "last_observed": "The end of the time window during which the data was seen.",
    "number_observed": "The number of times that each Cyber-observable object represented in the objects or object_ref property was seen. If present, this MUST be an integer between 1 and 999,999,999 inclusive.",
    "object_refs": "A list of SCOs and SROs representing the observation. The object_refs MUST contain at least one SCO reference if defined.",
    "objects (optional - deprecated)": "A dictionary of SCO representing the observation. The dictionary MUST contain at least one object.",
    "type": "The value of this property MUST be observed-data."
  },
  "opinion": {
    "authors": "The name of the author(s) of this Opinion (e.g., the analyst(s) that created it).",
    "explanation": "An explanation of why the producer has this Opinion.",
    "object_refs": "The STIX Objects that the Opinion is being applied to.",
    "opinion": "The opinion that the producer has about all of the STIX Object(s) listed in the object_refs property.",
    "type": "The value of this property MUST be opinion"
  },
  "relationship": {
    "description": "A description that provides more details and context about the Relationship, potentially including its purpose and its key characteristics.",
    "relationship_type": "The name used to identify the type of Relationship. This value SHOULD be an exact value listed in the relationships for the source and target SDO, but MAY be any string.",
    "source_ref": "The id of the source (from) object.",
    "start_time": "This optional timestamp represents the earliest time at which the Relationship between the objects exists. If this property is a future timestamp, at the time the start_time property is defined, then this represents an estimate by the producer of the intelligence of the earliest time at which relationship will be asserted to be true.",
    "stop_time": "The latest time at which the Relationship between the objects exists. If this property is a future timestamp, at the time the stop_time property is defined, then this represents an estimate by the producer of the intelligence of the latest time at which relationship will be asserted to be true.",
    "target_ref": "The id of the target (to) object.",
    "type": "The value of this property MUST be relationship."
  },
  "report": {
    "description": "A description that provides more details and context about the Report, potentially including its purpose and its key characteristics.",
    "name": "A name used to identify the Report.",
    "object_refs": "Specifies the STIX Objects that are referred to by this Report.",
    "published": "The date that this Report object was officially published by the creator of this report.",
    "report_types": "The primary type(s) of content found in this report.",
    "type": "The value of this property MUST be report."
  },
  "sighting": {
    "count": "If present, this MUST be an integer between 0 and 999,999,999 inclusive and represents the number of times the SDO referenced by the sighting_of_ref property was sighted. Observed Data has a similar property called number_observed, which refers to the number of times the data was observed.",
    "description": "A description that provides more details and context about the Sighting.",
    "first_seen": "The beginning of the time window during which the SDO referenced by the sighting_of_ref property was sighted.",
    "last_seen": "The end of the time window during which the SDO referenced by the sighting_of_ref property was sighted.",
    "observed_data_refs": "A list of ID references to the Observed Data objects that contain the raw cyber data for this Sighting. For example, a Sighting of an Indicator with an IP address could include the Observed Data for the network connection that the Indicator was used to detect.",
    "sighting_of_ref": "An ID reference to the SDO that was sighted (e.g., Indicator or Malware). For example, if this is a Sighting of an Indicator, that Indicators ID would be the value of this property.",
    "summary": "The summary property indicates whether the Sighting should be considered summary data. Summary data is an aggregation of previous Sightings reports and should not be considered primary source data.",
    "type": "The value of this property MUST be sighting.",
    "where_sighted_refs": "A list of ID references to the Identity or Location objects describing the entities or types of entities that saw the sighting. Omitting the where_sighted_refs property does not imply that the sighting was seen by the object creator."
  },
  "threat-actor": {
    "aliases": "A list of other names that this Threat Actor is believed to use.",
    "description": "A description that provides more details and context about the Threat Actor, potentially including its purpose and its key characteristics.",
    "first_seen": "The time that this Threat Actor was first seen. This property is a summary property of data from sightings and other data that may or may not be available in STIX.",
    "goals": "The high-level goals of this Threat Actor, namely, what are they trying to do. For example, they may be motivated by personal gain, but their goal is to steal credit card numbers.",
    "last_seen": "The time that this Threat Actor was last seen. This property is a summary property of data from sightings and other data that may or may not be available in STIX.",
    "name": "A name used to identify this Threat Actor or Threat Actor group.",
    "personal_motivations": "The personal reasons, motivations, or purposes of the Threat Actor regardless of organizational goals. Personal motivation, which is independent of the organizations goals, describes what impels an individual to carry out an attack.",
    "primary_motivation": "The primary reason, motivation, or purpose behind this Threat Actor. The motivation is why the Threat Actor wishes to achieve the goal (what they are trying to achieve).",
    "resource_level": "The organizational level at which this Threat Actor typically works, which in turn determines the resources available to this Threat Actor for use in an attack. This attribute is linked to the sophistication property  a specific resource level implies that the Threat Actor has access to at least a specific sophistication level.",
    "roles": "A list of roles the Threat Actor plays.",
    "secondary_motivations": "This property specifies the secondary reasons, motivations, or purposes behind this Threat Actor. These motivations can exist as an equal or near-equal cause to the primary motivation.",
    "sophistication": "The skill, specific knowledge, special training, or expertise a Threat Actor must have to perform the attack.",
    "threat_actor_types": "The type(s) of this threat actor.",
    "type": "The value of this property MUST be threat-actor."
  },
  "tool": {
    "aliases": "Alternative names used to identify this Tool.",
    "description": "A description that provides more details and context about the Tool, potentially including its purpose and its key characteristics.",
    "kill_chain_phases": "The list of kill chain phases for which this Tool can be used.",
    "name": "The name used to identify the Tool.",
    "tool_types": "The kind(s) of tool(s) being described.",
    "tool_version": "The version identifier associated with the Tool.",
    "type": "The value of this property MUST be tool."
  },
  "vulnerability": {
    "description": "A description that provides more details and context about the Vulnerability, potentially including its purpose and its key characteristics.",
    "name": "A name used to identify the Vulnerability.",
    "type": "The value of this property MUST be vulnerability."
  }
};

// ── Relationship Type Descriptions ──────────────────────────────────────

/**
 * Descriptions for STIX relationship types.
 * Format: { relationshipType: description }
 */
export const STIX_RELATIONSHIP_DESCRIPTIONS: Record<string, string> = {
  "attributed-to": "This Relationship describes that the Intrusion Set or Threat Actor that is involved in carrying out the Campaign.",
  "authored-by": "This Relationship describes that the malware instance or family was developed by the related threat actor or intrusion set.",
  "based-on": "This relationship describes that the indicator was created based on information from an observed-data object.",
  "beacons-to, exfiltrates-to": "This Relationship describes that the malware instance or family beacons to or exfiltrates data to the related Infrastructure.",
  "communicates-with": "This Relationship documents that this infrastructure instance communicates with the defined network addressable resource.",
  "compromises": "This Relationship describes that the Campaign compromises the related Infrastructure.",
  "consists-of": "This Relationship documents the objects that are used to make up an infrastructure instance, such as ipv4-addr, ipv6-addr, domain-name, url.",
  "controls": "This Relationship describes that this infrastructure controls some other infrastructure or a malware instance (or family).",
  "delivers": "This Relationship describes that this Attack Pattern is used to deliver this malware instance (or family).",
  "downloads, drops": "These Relationships document that this malware instance (or family) downloads or drops another malware instance, tool or file.",
  "drops": "This Relationship documents that this Tool drops a malware instance (or family).",
  "exploits": "This Relationship documents that this malware instance or family exploits or attempts to exploit a particular vulnerability.",
  "has": "This Relationship describes that this specific Infrastructure has this specific Vulnerability.",
  "hosts": "This Relationship describes that this infrastructure has a tool running on it or is used to passively host the tool / malware.",
  "hosts, owns": "This Relationship describes that the Intrusion Set hosts or owns the related Infrastructure (e.g.",
  "impersonates": "This Relationship describes that the Threat Actor impersonates the related Identity.",
  "investigates": "This Relationship describes that the Course of Action can be used to investigate the Indicator.",
  "located-at": "This Relationship describes that the Identity is located at or in the related Location.",
  "originates-from": "This Relationship describes that the Campaign originates from the related Location.",
  "remediates": "This Relationship describes that the Course of Action can be used to remediate (e.g.",
  "targets": "This Relationship describes that this Attack Pattern typically targets the type of victim, location, or vulnerability represented by the related Identity, Location, or Vulnerability object.",
  "uses": "This Relationship describes that the related Malware or Tool is used to perform the behavior identified in the Attack Pattern.",
  "variant-of": "This Relationship is used to document that one malware instance or family is a variant of another malware instance or family."
};

// ── Helper Function ─────────────────────────────────────────────────────

/**
 * Get a tooltip description for a STIX property.
 * Checks object-specific properties first, then falls back to common properties.
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
  
  // Fall back to common property
  return STIX_COMMON_PROPERTY_DESCRIPTIONS[propertyName];
}

/**
 * Get a description for a STIX object type.
 * 
 * @param objectType - The STIX object type (e.g., "attack-pattern")
 * @returns The object type description, or undefined if not found
 */
export function getObjectDescription(objectType: string): string | undefined {
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
