import {
  Home as HomeIcon,
  Assessment as StatusIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const drawerWidth = 260;

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
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Status', icon: <StatusIcon />, path: '/status' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    // Close drawer on mobile after navigation
    if (isMobile) {
      onClose();
    }
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
      <List>
        {menuItems.map(item => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              data-testid={`nav-${item.text.toLowerCase()}`}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
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
            width: drawerWidth,
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
          width: drawerWidth,
        },
      }}
      data-testid='navigation-drawer-desktop'
    >
      {drawerContent}
    </Drawer>
  );
};

export default NavigationDrawer;
