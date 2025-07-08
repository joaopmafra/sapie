import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  Drawer,
  Divider,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

import ContentExplorer from './ContentExplorer';

export const mobileDrawerWidth = 260;
export const desktopDrawerWidth = 300;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  isMobile,
}) => {
  const theme = useTheme();

  const drawerContent = (
    <>
      <DrawerHeader>
        <Typography variant='h6' noWrap sx={{ flexGrow: 1, pl: 1 }}>
          Sapie
        </Typography>
        <IconButton onClick={onClose} data-testid='drawer-close-button'>
          {theme.direction === 'ltr' ? (
            <ChevronLeftIcon />
          ) : (
            <ChevronRightIcon />
          )}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <ContentExplorer />
    </>
  );

  if (isMobile) {
    // Mobile: temporary drawer (overlay)
    return (
      <Drawer
        variant='temporary'
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: mobileDrawerWidth,
          },
        }}
        data-testid='navigation-drawer-mobile'
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop: persistent drawer
  return (
    <Drawer
      variant='persistent'
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // better performance
      }}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: desktopDrawerWidth,
        },
      }}
      data-testid='navigation-drawer-desktop'
    >
      {drawerContent}
    </Drawer>
  );
};

export default NavigationDrawer;
