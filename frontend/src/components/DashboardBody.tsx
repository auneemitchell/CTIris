import { Box, Tab, Tabs } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/themeColors';
import SectionHeader from './SectionHeader';
import DashboardTab from './DashboardTab';
import FeedsTab from './FeedsTab';
import StixBrowser from './StixBrowser';
import StixObjectDetail from './StixObjectDetail';

/**
 * Main content area — three-tab layout: Dashboard, Feeds, STIX Objects.
 *
 * Tab panels are always mounted and hidden with CSS (display: none) rather
 * than conditionally rendered. This means data loaded in one tab is still
 * in memory when you switch away and back, avoiding redundant API calls.
 *
 * selectedType wires the Dashboard stat cards to the STIX browser — clicking
 * a card calls navigateToType(type), which switches to the STIX Objects tab
 * and passes the type as the initial filter.
 */
export default function DashboardBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.startsWith('/feeds') ? 1 : location.pathname.startsWith('/stix') ? 2 : 0;
  const stixDetailId = location.pathname.startsWith('/stix/')
    ? decodeURIComponent(location.pathname.slice('/stix/'.length)) || null
    : null;

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
          {stixDetailId ? (
            <>
              <SectionHeader
                title="STIX OBJECT DETAIL"
                tooltip="Detailed profile for a single STIX object, including metadata, properties, and relationship context in the intelligence graph."
              />
              <StixObjectDetail stixId={stixDetailId} />
            </>
          ) : (
            <>
              <SectionHeader
                title="STIX OBJECTS"
                tooltip="A full browser of all STIX objects ingested from your feeds. Filter by type to narrow the list, or search by name or ID. Click any row to view a detailed profile for that object."
              />
              <StixBrowser />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
