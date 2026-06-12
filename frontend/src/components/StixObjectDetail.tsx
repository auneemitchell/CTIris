import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { api, BASE } from '../api/client';
import type { StixObject, StixRelationships, StixRelationshipRef, StixRelationshipBackRef, StixPropertyRef } from '../api/client';
import { COLORS } from '../constants/themeColors';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import StixDescription from './StixDescription';
import HelpBadge from './HelpBadge';
import { getPropertyDescription, getObjectDescription, getRelationshipDescription, getKillChainPhaseDescription, getKillChainNameDescription } from '../constants/stixPropertyDescriptions';

interface Props {
  stixId: string;
  onDisplayNameChange?: (displayName: string) => void;
}

interface RequestData<T> {
  requestId: string;
  data: T;
}

interface RequestError {
  requestId: string;
  message: string;
}

// Properties rendered explicitly above the additional-properties table.
// Everything else in `properties` falls into "Additional Properties".
const KNOWN_KEYS = new Set([
  'name', 'description', 'aliases', 'labels',
  'first_seen', 'last_seen', 'valid_from', 'valid_until',
  'created', 'modified',
  'kill_chain_phases', 'external_references',
  'pattern', 'pattern_type',
  'relationship_type', 'source_ref', 'target_ref',
  'type', 'id', 'spec_version',
  'object_marking_refs', 'granular_markings', 'extensions',
]);

const STIX_ID_PATTERN = /^[a-z][a-z0-9-]*--[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleString();
}

function formatDateShort(d: string | null | undefined): string {
  if (!d) return '—';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
}

function getDisplayName(stix: StixObject, fallback: string): string {
  const props = (stix.properties ?? {}) as Record<string, unknown>;
  return (props.name as string | undefined) ?? fallback;
}

function isStixId(value: string): boolean {
  return STIX_ID_PATTERN.test(value);
}

function formatPropertyName(value: string): string {
  return value.replace(/_/g, ' ');
}

function AdditionalPropertyValue({
  value,
  navigate,
  propertyRefLookup,
}: {
  value: unknown;
  navigate: (path: string) => void;
  propertyRefLookup: Record<string, StixPropertyRef>;
}) {
  if (value === null || value === undefined) {
    return <Typography component="span" sx={{ color: COLORS.textMuted }}>—</Typography>;
  }

  if (typeof value === 'string') {
    if (isStixId(value)) {
      const propertyRef = propertyRefLookup[value];
      const displayValue = propertyRef?.name ?? value;
      const isNavigable = propertyRef ? (propertyRef.present ?? true) : false;

      if (!isNavigable) {
        return (
          <>
            <Typography component="span" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-word' }}>
              {displayValue}
            </Typography>
            <Typography component="span" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.68rem', ml: 0.75 }}>
              (not in db)
            </Typography>
          </>
        );
      }

      return (
        <Link
          component="button"
          type="button"
          title={propertyRef ? value : undefined}
          onClick={() => navigate('/stix/' + encodeURIComponent(value))}
          sx={{ color: COLORS.textTertiary, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-word', textAlign: 'left' }}
        >
          {displayValue}
        </Link>
      );
    }

    return <Typography component="span" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{value}</Typography>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <Typography component="span" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.78rem' }}>{String(value)}</Typography>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography component="span" sx={{ color: COLORS.textMuted }}>None</Typography>;
    }

    return (
      <Typography component="span" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-word' }}>
        {value.map((item, itemIndex) => (
          <Box component="span" key={itemIndex}>
            {itemIndex > 0 && ', '}
            <AdditionalPropertyValue value={item} navigate={navigate} propertyRefLookup={propertyRefLookup} />
          </Box>
        ))}
      </Typography>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <Typography component="span" sx={{ color: COLORS.textMuted }}>None</Typography>;
    }

    return (
      <Typography component="span" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-word' }}>
        {entries.map(([keyName, entryValue]) => (
          <Box component="span" key={keyName}>
            {keyName !== entries[0][0] && '; '}
            <Typography component="span" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-word' }}>
              {formatPropertyName(keyName)}:{' '}
            </Typography>
            <AdditionalPropertyValue value={entryValue} navigate={navigate} propertyRefLookup={propertyRefLookup} />
          </Box>
        ))}
      </Typography>
    );
  }

  return <Typography component="span" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.78rem' }}>{String(value)}</Typography>;
}

// ── Shared style helpers ──────────────────────────────────────────────────────

const sectionLabel = {
  color: COLORS.textMuted,
  fontFamily: 'monospace',
  fontSize: '0.7rem',
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  mb: 0.75,
};

const tableHeadCell = {
  color: COLORS.textQuaternary,
  fontFamily: 'monospace',
  fontSize: '0.7rem',
  fontWeight: 'bold',
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${COLORS.dataContainerBorder}`,
};

const tableBodyCell = {
  borderBottom: `1px solid ${COLORS.dataContainerBorder}`,
  fontSize: '0.8rem',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={sectionLabel}>{label}</Typography>
        {tooltip && <HelpBadge tooltip={tooltip} size="sm" placement="right" />}
      </Box>
      <Typography sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  );
}

interface KillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

interface ExternalReference {
  source_name?: string;
  external_id?: string;
  url?: string;
  description?: string;
}

function KillChainTable({ phases, objectType }: { phases: KillChainPhase[]; objectType?: string }) {
  const tooltip = getPropertyDescription('kill_chain_phases', objectType);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
        <Typography sx={sectionLabel}>Kill Chain Phases</Typography>
        {tooltip && <HelpBadge tooltip={tooltip} size="sm" placement="right" />}
      </Box>
      <TableContainer component={Paper} sx={{ bgcolor: COLORS.headerBackground, border: `1px solid ${COLORS.dataContainerBorder}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...tableHeadCell, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>Kill Chain</span>
                <HelpBadge tooltip="A model breaking an attack into sequential phases (e.g., delivery → exploitation → C2). Each STIX object can be tagged to a phase, showing where in the attack lifecycle it applies." size="sm" placement="top" />
              </TableCell>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>Phase</span>
                  <HelpBadge tooltip="Where this object fits in the attack lifecycle." size="sm" placement="top" />
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {phases.map((p, i) => {
              const killChainTooltip = getKillChainNameDescription(p.kill_chain_name);
              const phaseTooltip = getKillChainPhaseDescription(p.kill_chain_name, p.phase_name);
              return (
                <TableRow key={i}>
                  <TableCell sx={{ ...tableBodyCell, color: COLORS.textMuted, fontFamily: 'monospace' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {p.kill_chain_name}
                      {killChainTooltip && <HelpBadge tooltip={killChainTooltip} size="sm" placement="right" />}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCell, color: COLORS.textPrimary }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {p.phase_name}
                      {phaseTooltip && <HelpBadge tooltip={phaseTooltip} size="sm" placement="right" />}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function ExternalRefsTable({ refs }: { refs: ExternalReference[] }) {
  return (
    <Box>
      <Typography sx={sectionLabel}>External References</Typography>
      <TableContainer component={Paper} sx={{ bgcolor: COLORS.headerBackground, border: `1px solid ${COLORS.dataContainerBorder}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>Source</span>
                  <HelpBadge tooltip="The name of the external source providing this reference" size="sm" placement="top" />
                </Box>
              </TableCell>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>ID</span>
                  <HelpBadge tooltip="The identifier used by the external source" size="sm" placement="top" />
                </Box>
              </TableCell>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>URL</span>
                  <HelpBadge tooltip="A link to the external reference documentation or resource" size="sm" placement="top" />
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {refs.map((r, i) => (
              <TableRow key={i}>
                <TableCell sx={{ ...tableBodyCell, color: COLORS.textPrimary }}>{r.source_name ?? '—'}</TableCell>
                <TableCell sx={{ ...tableBodyCell, color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.external_id ?? '—'}</TableCell>
                <TableCell sx={tableBodyCell}>
                  {r.url
                    ? <Link href={r.url} target="_blank" rel="noopener noreferrer" sx={{ color: COLORS.textTertiary, fontSize: '0.75rem', wordBreak: 'break-all' }}>{r.url}</Link>
                    : <Typography component="span" sx={{ color: COLORS.textMuted, fontSize: '0.75rem' }}>—</Typography>
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function AdditionalPropertiesTable({
  entries,
  navigate,
  propertyRefLookup,
  objectType,
}: {
  entries: [string, unknown][];
  navigate: (path: string) => void;
  propertyRefLookup: Record<string, StixPropertyRef>;
  objectType?: string;
}) {
  return (
    <TableContainer component={Paper} sx={{ bgcolor: COLORS.headerBackground, border: `1px solid ${COLORS.dataContainerBorder}`, borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={tableHeadCell}>Property</TableCell>
            <TableCell sx={tableHeadCell}>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(([key, val]) => {
            const propTooltip = getPropertyDescription(key, objectType);
            return (
              <TableRow key={key}>
                <TableCell sx={{ ...tableBodyCell, color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.75rem', width: { xs: '38%', sm: '28%' }, verticalAlign: 'top', textTransform: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span>{formatPropertyName(key)}</span>
                    {propTooltip && <HelpBadge tooltip={propTooltip} size="sm" placement="right" />}
                  </Box>
                </TableCell>
                <TableCell sx={{ ...tableBodyCell, color: COLORS.textPrimary, verticalAlign: 'top' }}>
                  <AdditionalPropertyValue value={val} navigate={navigate} propertyRefLookup={propertyRefLookup} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function RelationshipTable({
  title,
  rows,
  navigate,
}: {
  title: string;
  rows: (StixRelationshipRef | StixRelationshipBackRef)[];
  navigate: (path: string) => void;
}) {
  const isRef = (r: StixRelationshipRef | StixRelationshipBackRef): r is StixRelationshipRef =>
    'target_ref' in r;

  return (
    <Box>
      <Typography sx={sectionLabel}>{title}</Typography>
      <TableContainer component={Paper} sx={{ bgcolor: COLORS.headerBackground, border: `1px solid ${COLORS.dataContainerBorder}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>Relationship</span>
                  <HelpBadge tooltip="The type of relationship connecting these STIX objects" size="sm" placement="top" />
                </Box>
              </TableCell>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>Type</span>
                  <HelpBadge tooltip="The STIX object type of the related object" size="sm" placement="top" />
                </Box>
              </TableCell>
              <TableCell sx={tableHeadCell}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>Name / ID</span>
                  <HelpBadge tooltip="The name or identifier of the related STIX object" size="sm" placement="top" />
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} sx={{ ...tableBodyCell, color: COLORS.textMuted, fontFamily: 'monospace', textAlign: 'center', py: 2 }}>
                  No relationships
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => {
                const ref = isRef(r) ? r.target_ref : r.source_ref;
                const name = isRef(r) ? r.target_name : r.source_name;
                const type = isRef(r) ? r.target_type : r.source_type;
                const isNavigable = isRef(r)
                  ? (r.target_present ?? true)
                  : (r.source_present ?? true);
                const relTooltip = getRelationshipDescription(r.relationship_type);
                return (
                  <TableRow
                    key={i}
                    onClick={isNavigable ? () => navigate('/stix/' + encodeURIComponent(ref)) : undefined}
                    sx={{
                      cursor: isNavigable ? 'pointer' : 'default',
                      '&:hover': isNavigable ? { bgcolor: COLORS.cardBackground } : undefined,
                    }}
                  >
                    <TableCell sx={{ ...tableBodyCell, color: COLORS.textQuaternary, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{r.relationship_type}</span>
                        {relTooltip && <HelpBadge tooltip={relTooltip} size="sm" placement="right" />}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCell, color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      {type ?? '—'}
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCell, color: COLORS.textPrimary }}>
                      {name ?? <Typography component="span" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.75rem' }}>{ref}</Typography>}
                      {!isNavigable && (
                        <Typography component="span" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.68rem', ml: 0.75 }}>
                          (not in db)
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StixObjectDetail({ stixId, onDisplayNameChange }: Props) {
  const navigate = useNavigate();

  const [stixData, setStixData] = useState<RequestData<StixObject> | null>(null);
  const [relsData, setRelsData] = useState<RequestData<StixRelationships> | null>(null);
  const [objectError, setObjectError] = useState<RequestError | null>(null);
  const [relsError, setRelsError] = useState<RequestError | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    api.stixById(stixId, controller.signal)
      .then((nextStix) => {
        setStixData({ requestId: stixId, data: nextStix });
        setObjectError(null);
        onDisplayNameChange?.(getDisplayName(nextStix, stixId));
      })
      .catch(e => { if (e.name !== 'AbortError') setObjectError({ requestId: stixId, message: String(e) }); });

    api.stixRelationships(stixId, controller.signal)
      .then((nextRels) => {
        setRelsData({ requestId: stixId, data: nextRels });
        setRelsError(null);
      })
      .catch(e => { if (e.name !== 'AbortError') setRelsError({ requestId: stixId, message: String(e) }); });

    return () => controller.abort();
  }, [onDisplayNameChange, stixId]);

  // ── Derive display values ─────────────────────────────────────────────────

  const stix = stixData?.requestId === stixId ? stixData.data : null;
  const rels = relsData?.requestId === stixId ? relsData.data : null;
  const objectErrorMessage = objectError?.requestId === stixId ? objectError.message : null;
  const relsErrorMessage = relsError?.requestId === stixId ? relsError.message : null;
  const objectLoading = !stix && !objectErrorMessage;
  const relsLoading = !rels && !relsErrorMessage;

  const props = (stix?.properties ?? {}) as Record<string, unknown>;
  const description = props.description as string | undefined;
  const aliases = Array.isArray(props.aliases) ? (props.aliases as string[]) : [];
  const labels = Array.isArray(props.labels) ? (props.labels as string[]) : [];
  const firstSeen = props.first_seen as string | undefined;
  const lastSeen = props.last_seen as string | undefined;
  const validFrom = props.valid_from as string | undefined;
  const validUntil = props.valid_until as string | undefined;
  const killChainPhases = Array.isArray(props.kill_chain_phases)
    ? (props.kill_chain_phases as KillChainPhase[])
    : [];
  const externalRefs = Array.isArray(props.external_references)
    ? (props.external_references as ExternalReference[])
    : [];
  const pattern = props.pattern as string | undefined;
  const patternType = props.pattern_type as string | undefined;
  const propertyRefLookup = useMemo(
    () => (rels?.property_refs ?? []).reduce<Record<string, StixPropertyRef>>((lookup, propertyRef) => {
      lookup[propertyRef.ref] = propertyRef;
      return lookup;
    }, {}),
    [rels?.property_refs]
  );

  // Collect unknown extra keys for the additional-properties table
  const extraEntries = Object.entries(props).filter(([k]) => !KNOWN_KEYS.has(k));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {objectLoading && <LoadingSpinner />}
      {objectErrorMessage && <ErrorDisplay message={objectErrorMessage} />}

      {!objectLoading && !objectErrorMessage && stix && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              component="a"
              href={`${BASE}/stix/${encodeURIComponent(stixId)}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: COLORS.textPrimary, borderColor: COLORS.dataContainerBorderHover, textTransform: 'none', fontSize: '0.7rem' }}
            >
              View Raw JSON
            </Button>
          </Box>

          <Divider sx={{ borderColor: COLORS.dataContainerBorder }} />

          {/* Meta grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {/* Object Name */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Typography sx={sectionLabel}>Object Name</Typography>
              <Typography sx={{ color: props.name ? COLORS.textPrimary : COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {props.name as string || stix.stix_id}
              </Typography>
            </Box>

            {/* Object Type */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Typography sx={sectionLabel}>Object Type</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {stix.type}
                </Typography>
                {getObjectDescription(stix.type) && (
                  <HelpBadge tooltip={getObjectDescription(stix.type)!} size="sm" placement="right" />
                )}
              </Box>
            </Box>

            <MetaRow
              label="STIX ID"
              value={stix.stix_id}
              tooltip={getPropertyDescription('id')}
            />
            <MetaRow
              label="Feed ID"
              value={stix.feed_id ?? '—'}
              tooltip="The CTIris feed identifier indicating which TAXII feed this object was ingested from"
            />
            <MetaRow
              label="Ingested At"
              value={formatDate(stix.ingested_at)}
              tooltip="The timestamp when CTIris first ingested this object from its source feed"
            />
            <MetaRow
              label="STIX Created"
              value={formatDate(stix.stix_created)}
              tooltip={getPropertyDescription('created', stix.type)}
            />
            <MetaRow
              label="STIX Modified"
              value={formatDate(stix.stix_modified)}
              tooltip={getPropertyDescription('modified', stix.type)}
            />
          </Box>

          {/* Description */}
          {description && (
            <Box>
              <Typography sx={sectionLabel}>Description</Typography>
              <Typography component="div" sx={{ color: COLORS.textPrimary, fontSize: '0.875rem', lineHeight: 1.6 }}>
                <StixDescription text={description} />
              </Typography>
            </Box>
          )}

          {/* Aliases */}
          {aliases.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <Typography sx={sectionLabel}>Tracked Aliases</Typography>
                {getPropertyDescription('aliases', stix.type) && (
                  <HelpBadge tooltip={getPropertyDescription('aliases', stix.type)!} size="sm" placement="right" />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {aliases.map(a => (
                  <Chip key={a} label={a} size="small" variant="outlined"
                    sx={{ color: COLORS.textPrimary, borderColor: COLORS.dataContainerBorderHover }} />
                ))}
              </Box>
            </Box>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <Typography sx={sectionLabel}>Labels</Typography>
                {getPropertyDescription('labels') && (
                  <HelpBadge tooltip={getPropertyDescription('labels')!} size="sm" placement="right" />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {labels.map(l => (
                  <Chip key={l} label={l} size="small"
                    sx={{ bgcolor: COLORS.cardBackground, color: COLORS.textQuaternary, border: `1px solid ${COLORS.cardBorder}`, fontSize: '0.72rem' }} />
                ))}
              </Box>
            </Box>
          )}

          {/* Date range (campaign / indicator) */}
          {(firstSeen || lastSeen || validFrom || validUntil) && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <Typography sx={sectionLabel}>{firstSeen || lastSeen ? 'Activity Window' : 'Valid Window'}</Typography>
                {(firstSeen || lastSeen) && getPropertyDescription('first_seen', stix.type) && (
                  <HelpBadge tooltip={getPropertyDescription('first_seen', stix.type)!} size="sm" placement="right" />
                )}
                {(validFrom || validUntil) && !firstSeen && !lastSeen && getPropertyDescription('valid_from', stix.type) && (
                  <HelpBadge tooltip={getPropertyDescription('valid_from', stix.type)!} size="sm" placement="right" />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {(firstSeen || validFrom) && (
                  <Box>
                    <Typography sx={{ color: COLORS.textMuted, fontSize: '0.7rem', fontFamily: 'monospace' }}>
                      {firstSeen ? 'First Seen' : 'Valid From'}
                    </Typography>
                    <Typography sx={{ color: COLORS.textPrimary, fontSize: '0.85rem' }}>
                      {formatDateShort(firstSeen ?? validFrom)}
                    </Typography>
                  </Box>
                )}
                {(lastSeen || validUntil) && (
                  <Box>
                    <Typography sx={{ color: COLORS.textMuted, fontSize: '0.7rem', fontFamily: 'monospace' }}>
                      {lastSeen ? 'Last Seen' : 'Valid Until'}
                    </Typography>
                    <Typography sx={{ color: COLORS.textPrimary, fontSize: '0.85rem' }}>
                      {formatDateShort(lastSeen ?? validUntil)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Kill Chain Phases */}
          {killChainPhases.length > 0 && <KillChainTable phases={killChainPhases} objectType={stix.type} />}

          {/* External References */}
          {externalRefs.length > 0 && <ExternalRefsTable refs={externalRefs} />}

          {/* Pattern (indicator) */}
          {pattern && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={sectionLabel}>Pattern</Typography>
                  {getPropertyDescription('pattern', stix.type) && (
                    <HelpBadge tooltip={getPropertyDescription('pattern', stix.type)!} size="sm" placement="right" />
                  )}
                </Box>
                {patternType && (
                  <Chip label={patternType} size="small"
                    sx={{ bgcolor: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.dataContainerBorder}`, fontSize: '0.65rem', fontFamily: 'monospace', height: 18 }} />
                )}
              </Box>
              <Box sx={{
                bgcolor: COLORS.backgroundDefault,
                border: `1px solid ${COLORS.dataContainerBorder}`,
                borderRadius: 1,
                p: 1.5,
                overflowX: 'auto',
              }}>
                <Typography component="pre" sx={{ color: COLORS.textTertiary, fontFamily: 'monospace', fontSize: '0.78rem', m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {pattern}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Additional Properties */}
          {extraEntries.length > 0 && (
            <Box>
              <Typography sx={sectionLabel}>Additional Properties</Typography>
              <Box sx={{ mt: 0.25 }}>
                <AdditionalPropertiesTable entries={extraEntries} navigate={navigate} propertyRefLookup={propertyRefLookup} objectType={stix.type} />
              </Box>
            </Box>
          )}

          <Divider sx={{ borderColor: COLORS.dataContainerBorder }} />
        </>
      )}

      {/* Relationship tables — render independently of object load state */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Relationships
          </Typography>
          <HelpBadge
            tooltip="STIX relationships connect objects together to form a graph. Each relationship has a type (like 'uses' or 'indicates') that describes how the objects are related."
            size="sm"
            placement="right"
          />
        </Box>

        {relsLoading && <LoadingSpinner />}
        {relsErrorMessage && <ErrorDisplay message={relsErrorMessage} />}

        {!relsLoading && !relsErrorMessage && rels && (
          <>
            <RelationshipTable title="References (This → Other)" rows={rels.references} navigate={navigate} />
            <RelationshipTable title="Referenced By (Other → This)" rows={rels.referenced_by} navigate={navigate} />
          </>
        )}
      </Box>
    </Box>
  );
}
