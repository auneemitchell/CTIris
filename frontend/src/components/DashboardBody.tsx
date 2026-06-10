import { useCallback, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/themeColors';
import SectionHeader from './SectionHeader';
import DashboardTab from './DashboardTab';
import FeedsTab from './FeedsTab';
import StixBrowser from './StixBrowser';
import StixObjectDetail from './StixObjectDetail';

/**
 * Main content area — three-tab layout: Dashboard, Feeds, STIX Objects.
 *
 * When the route is /stix/:id, this component switches into detail mode and
 * renders the STIX object detail page in place of the tab panels.
 */
export default function DashboardBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const stixDetailMatch = useMatch('/stix/:id');
  const stixObjectId = stixDetailMatch ? decodeURIComponent(stixDetailMatch.params.id!) : null;
  const [stixDetailTitle, setStixDetailTitle] = useState<{ stixId: string; title: string } | null>(null);
  const tab: number | false = stixObjectId ? false : location.pathname.startsWith('/feeds') ? 1 : location.pathname.startsWith('/stix') ? 2 : 0;

  const detailTitle = stixObjectId && stixDetailTitle?.stixId === stixObjectId ? stixDetailTitle.title : null;
  const handleStixDetailTitleChange = useCallback((title: string) => {
    if (stixObjectId) {
      setStixDetailTitle({ stixId: stixObjectId, title });
    }
  }, [stixObjectId]);

  return (
    <Box sx={{ bgcolor: COLORS.backgroundContainer, minHeight: '100vh', paddingX: { xs: 2, md: 8 }, paddingY: 2, pb: 10 }}>
      <Tabs
        value={tab}
        onChange={(_, v: number) => { if (v !== tab) navigate(v === 1 ? '/feeds' : v === 2 ? '/stix' : '/'); }}
        sx={{
          mb: 3,
          '& .MuiTab-root': { color: COLORS.textMuted, fontFamily: 'monospace', letterSpacing: 1.5, fontSize: '0.75rem' },
          '& .Mui-selected': { color: COLORS.textQuaternary },
          '& .MuiTabs-indicator': { backgroundColor: COLORS.textQuaternary },
        }}
      >
        <Tab label="DASHBOARD" />
        <Tab label="FEEDS" />
        <Tab label="STIX OBJECTS" />
      </Tabs>

      <Box sx={{ bgcolor: COLORS.backgroundDefault, padding: 4, borderRadius: 4, border: '2px solid rgba(255,255,255,0.05)' }}>
        {stixObjectId ? (
          <>
            <SectionHeader
              title={detailTitle ?? 'STIX OBJECT'}
              tooltip="A detailed profile for a single STIX object, including metadata, description, properties, and known relationships."
            />
            <StixObjectDetail stixId={stixObjectId} onDisplayNameChange={handleStixDetailTitleChange} />
          </>
        ) : (
          <>
            <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
              <SectionHeader
                title="THREAT INTELLIGENCE SUMMARY"
                tooltip="Counts of the core STIX Domain Object (SDO) types currently in the database. STIX (Structured Threat Information eXpression) is a standardized language for describing cyber threats — each type captures a different aspect, such as Malware for malicious software, Threat Actor for the groups behind attacks, or Vulnerability for known weaknesses."
              />
              <DashboardTab />
            </Box>
            <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
              <SectionHeader
                title="FEED STATUS"
                tooltip="TAXII (Trusted Automated eXchange of Indicator Information) feeds are servers that publish STIX threat intelligence data on a schedule. CTIris polls each enabled feed and stores new objects in the database. Status shows whether the last poll succeeded, failed, or is paused."
              />
              <FeedsTab />
            </Box>
            <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
              <SectionHeader
                title="STIX OBJECTS"
                tooltip="A full browser of all STIX objects ingested from your feeds. Filter by type to narrow the list, or search by name or ID. Click any row to view a detailed profile for that object."
              />
              <StixBrowser />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
