import { Box, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

import { useLocalStorage } from '../hooks/useLocalStorage';

import Header from './Header';
import NavigationDrawer, { drawerWidth } from './NavigationDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, showNavigation }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // For desktop: persistent drawer state (default open), for mobile: temporary state (default closed)
  const [drawerOpen, setDrawerOpen] = useLocalStorage<boolean>(
    'persistentDrawerOpen',
    !isMobile // Default open on desktop, closed on mobile
  );

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Simple layout for pages without navigation (e.g., login)
  if (!showNavigation) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        {children}
      </Box>
    );
  }

  // Main layout with navigation
  return (
    <Box sx={{ display: 'flex' }}>
      <Header
        onMenuClick={handleDrawerToggle}
        showMenuButton={true}
        drawerOpen={drawerOpen}
        isMobile={isMobile}
      />
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isMobile={isMobile}
      />
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          p: 3,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: drawerOpen && !isMobile ? `${drawerWidth}px` : 0,
          minHeight: '100vh',
          // Add top padding to account for AppBar
          paddingTop: `calc(${theme.spacing(3)} + 64px)`, // 64px is typical AppBar height
          width: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
