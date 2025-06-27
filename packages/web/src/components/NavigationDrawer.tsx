import {
  ChevronLeft,
  ChevronRight,
  Home as HomeIcon,
  Assessment as StatusIcon,
} from '@mui/icons-material';
import {
  Drawer,
  List,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  path: string;
  icon: React.ReactElement;
}

const menuItems: MenuItem[] = [
  {
    text: 'Home',
    path: '/',
    icon: <HomeIcon />,
  },
  {
    text: 'Status',
    path: '/status',
    icon: <StatusIcon />,
  },
];

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  // Mobile-first approach: anything smaller than 900px is mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    // Always close drawer after navigation on mobile, and also on desktop for better UX
    onClose();
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor='left'
      open={open}
      onClose={onClose}
      data-testid='navigation-drawer'
    >
      <DrawerHeader>
        <IconButton onClick={onClose} data-testid='close-drawer-button'>
          {theme.direction === 'ltr' ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {menuItems.map(item => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleMenuItemClick(item.path)}
              selected={location.pathname === item.path}
              data-testid={`menu-item-${item.text.toLowerCase()}`}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default NavigationDrawer;
