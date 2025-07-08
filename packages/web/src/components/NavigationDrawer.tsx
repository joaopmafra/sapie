import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useState } from 'react';

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
      <Box sx={{ pt: 3, pb: 2, pl: 1 }}>
        <Button
          variant='contained'
          onClick={handleMenuClick}
          aria-controls={menuOpen ? 'new-content-menu' : undefined}
          aria-haspopup='true'
          aria-expanded={menuOpen ? 'true' : undefined}
        >
          New Content
        </Button>
        <Menu
          id='new-content-menu'
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          MenuListProps={{
            'aria-labelledby': 'new-content-button',
          }}
        >
          <MenuItem onClick={handleMenuClose}>Create Note</MenuItem>
          <MenuItem onClick={handleMenuClose} disabled>
            Create Folder
          </MenuItem>
        </Menu>
      </Box>
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
