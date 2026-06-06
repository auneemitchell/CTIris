import { Box } from '@mui/material';
import DashboardHeader from './components/DashboardHeader';
import DashboardBody from './components/DashboardBody';
import DashboardFooter from './components/DashboardFooter';

function App() {
  return (
    <Box>
      {/* HEADER */}
      <DashboardHeader />

      {/* BODY */}
      <DashboardBody />

      {/* FOOTER */}
      <DashboardFooter />
    </Box>
  )
}

export default App