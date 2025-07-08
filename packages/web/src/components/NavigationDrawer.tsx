import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
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
import { useNavigate } from 'react-router-dom';

import { useContent } from '../contexts/ContentContext';
import type { Content } from '../lib/content';

import ContentExplorer from './ContentExplorer';
import CreateNoteModal from './CreateNoteModal';

export const mobileDrawerWidth = 260;
export const desktopDrawerWidth = 320;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
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
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [modalOpen, setModalOpen] = useState(false);
  const { selectedNodeId, triggerRefresh } = useContent();

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCreateNoteClick = () => {
    handleMenuClose();
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleCreateSuccess = (newNote: Content) => {
    handleModalClose();
    triggerRefresh();
    navigate(`/notes/${newNote.id}`);
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
      <Box sx={{ pt: 3, pr: 1, pb: 2, pl: 1 }}>
        <Button
          variant='contained'
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleMenuClick}
          aria-controls={menuOpen ? 'new-content-menu' : undefined}
          aria-haspopup='true'
          aria-expanded={menuOpen ? 'true' : undefined}
        >
          New
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
          <MenuItem onClick={handleCreateNoteClick}>Create Note</MenuItem>
          <MenuItem onClick={handleMenuClose} disabled>
            Create Folder
          </MenuItem>
        </Menu>
      </Box>
      <ContentExplorer />
      <CreateNoteModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleCreateSuccess}
        parentId={selectedNodeId}
      />
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
