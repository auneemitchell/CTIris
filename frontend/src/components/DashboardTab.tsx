import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Grid, Tooltip, Typography } from '@mui/material';
import { api } from '../api/client';
import { COLORS } from '../constants/themeColors';
import MostActiveThreats from './MostActiveThreats';
import MostActiveMalware from './MostActiveMalware';

const STIX_TYPES = [
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
];

export default function DashboardTab() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(
      STIX_TYPES.map(t =>
        api.stix(t.key, 1000).then(objs => [t.key, objs.length] as const)
      )
    )
      .then(entries => setCounts(Object.fromEntries(entries)))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: COLORS.accentSecondary }} /></Box>;
  if (error) return <Typography color="error" sx={{ fontFamily: 'monospace' }}>Failed to load: {error}</Typography>;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 3, fontFamily: 'monospace' }}>
        {total} objects across {STIX_TYPES.length} key types
      </Typography>
      <Grid container spacing={2}>
        {STIX_TYPES.map(t => (
          <Grid item xs={6} sm={4} md={3} key={t.key}>
            <Card sx={{
              bgcolor: COLORS.headerBackground,
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 2,
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: COLORS.accentSecondary },
              position: 'relative',
            }}>
              <Tooltip title={t.def} placement="top" arrow>
                <Typography sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: COLORS.textMuted,
                  fontSize: '0.6rem',
                  bgcolor: 'rgba(255,255,255,0.07)',
                  borderRadius: '50%',
                  width: 15,
                  height: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'help',
                  fontFamily: 'monospace',
                  userSelect: 'none',
                }}>?</Typography>
              </Tooltip>
              <CardContent>
                <Typography variant="h4" sx={{ color: COLORS.accentSecondary, fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {counts[t.key]}
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.textPrimary, fontFamily: 'monospace', letterSpacing: 0.5, mt: 0.5 }}>
                  {t.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ color: COLORS.textColor, fontWeight: 'bold' }}>
              MOST ACTIVE THREATS
            </Typography>
            <Tooltip
              title="Threat actors and intrusion sets ranked by how many STIX relationship objects reference them. A relationship connects two STIX objects — for example, 'Lazarus Group uses Cobalt Strike' or 'APT29 targets Finance'. The more relationships an entity appears in, the more documented activity it has."
              placement="right"
              arrow
            >
              <Typography sx={{
                color: COLORS.textMuted,
                fontSize: '0.7rem',
                bgcolor: 'rgba(255,255,255,0.07)',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
                flexShrink: 0,
                fontFamily: 'monospace',
                userSelect: 'none',
              }}>?</Typography>
            </Tooltip>
          </Box>
          <MostActiveThreats />
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ color: COLORS.textColor, fontWeight: 'bold' }}>
              MOST ACTIVE MALWARE
            </Typography>
            <Tooltip
              title="Malware families ranked by how many STIX relationships reference them. Each ring represents one malware family — the longer the arc, the more it appears across threat intelligence reports. Useful for spotting which malware is most commonly linked to attacks in your feeds."
              placement="right"
              arrow
            >
              <Typography sx={{
                color: COLORS.textMuted,
                fontSize: '0.7rem',
                bgcolor: 'rgba(255,255,255,0.07)',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
                flexShrink: 0,
                fontFamily: 'monospace',
                userSelect: 'none',
              }}>?</Typography>
            </Tooltip>
          </Box>
          <MostActiveMalware />
        </Grid>
      </Grid>
    </Box>
  );
}
