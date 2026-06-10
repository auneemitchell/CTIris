import { Box } from '@mui/material';
import { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import DashboardBody from './components/DashboardBody';
import DashboardFooter from './components/DashboardFooter';

function App() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      {/* HEADER */}
      <DashboardHeader />

      {/* BODY */}
      <DashboardBody tab={tab} setTab={setTab} />

      {/* FOOTER */}
      <DashboardFooter setTab={setTab}/>
    </Box>
  )
}

export default App;