import { Menu as MenuIcon, AccountCircle, Logout } from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { signOut } from 'firebase/auth';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase/config';

const drawerWidth = 260;

interface AppBarProps {
  open?: boolean;
}

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: prop => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  drawerOpen?: boolean;
  isMobile?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  showMenuButton = false,
  drawerOpen = false,
  isMobile = false,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleClose();
      // Navigate to login page after logout since home is now protected
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const shouldShowMenuIcon = showMenuButton && (isMobile || !drawerOpen);

  return (
    <StyledAppBar position='fixed' open={!isMobile && drawerOpen}>
      <Toolbar>
        {shouldShowMenuIcon && (
          <IconButton
            color='inherit'
            aria-label='open drawer'
            onClick={onMenuClick}
            edge='start'
            sx={{ mr: 2 }}
            data-testid='menu-button'
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
          {shouldShowMenuIcon ? 'Sapie' : ''}
        </Typography>
        {currentUser ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2' sx={{ mr: 1 }}>
              {currentUser.displayName || currentUser.email}
            </Typography>

            <IconButton
              size='large'
              aria-label='account of current user'
              aria-controls='menu-appbar'
              aria-haspopup='true'
              onClick={handleMenu}
              color='inherit'
            >
              {currentUser.photoURL ? (
                <Avatar
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>

            <Menu
              id='menu-appbar'
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            color='inherit'
            onClick={() => navigate('/login')}
            data-testid='login-button'
          >
            Login
          </Button>
        )}
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header;
