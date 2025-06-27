import { Box, CssBaseline, useMediaQuery } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

import Header from './Header';
import NavigationDrawer from './NavigationDrawer';

const drawerWidth = 240;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showNavigation = false,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  // Mobile-first approach: anything smaller than 900px is mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  // For pages without navigation (like login), use simple layout
  if (!showNavigation) {
    return (
      <>
        <CssBaseline />
        <Header showMenuButton={false} />
        {children}
      </>
    );
  }

  // For pages with navigation, use the drawer layout
  return (
    <>
      <CssBaseline />
      <Header onMenuClick={handleDrawerOpen} showMenuButton={showNavigation} />
      <NavigationDrawer open={drawerOpen} onClose={handleDrawerClose} />
      <Box
        component='main'
        sx={{
          // Mobile: overlay (no margin), Desktop: persistent (margin when open)
          marginLeft: isMobile ? 0 : drawerOpen ? `${drawerWidth}px` : 0,
          transition: 'margin 0.3s ease',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <DrawerHeader />
        {children}
      </Box>
    </>
  );
};

export default AppLayout;
