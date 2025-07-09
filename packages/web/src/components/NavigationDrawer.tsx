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

const paddingRL = 2;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, paddingRL),
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
  const [menuWidth, setMenuWidth] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const { selectedNodeId, nodeMap, triggerRefresh } = useContent();

  const menuOpen = Boolean(anchorEl);
  const currentNodeId = selectedNodeId || nodeMap.get('root')?.id;

  const handleNewButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setMenuWidth(event.currentTarget.offsetWidth);
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
        <Typography variant='h6' noWrap sx={{ flexGrow: 1 }}>
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
      <Box sx={{ pt: 3, pr: paddingRL, pb: 2, pl: paddingRL }}>
        <Button
          variant='contained'
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleNewButtonClick}
          aria-controls={menuOpen ? 'new-content-menu' : undefined}
          aria-haspopup='true'
          aria-expanded={menuOpen ? 'true' : undefined}
        >
          New
        </Button>
        <Menu
          id='new-content-menu'
          anchorEl={anchorEl}
          marginThreshold={0} // prevent the menu from being shifted 16px to the right
          open={menuOpen}
          onClose={handleMenuClose}
          slotProps={{
            list: {
              'aria-labelledby': 'new-content-button',
            },
            paper: {
              sx: {
                width: menuWidth,
              },
            },
          }}
        >
          <MenuItem onClick={handleCreateNoteClick}>Create Note</MenuItem>
          <MenuItem onClick={handleMenuClose} disabled>
            Create Folder
          </MenuItem>
        </Menu>
      </Box>
      <Box sx={{ p: paddingRL }}>
        <ContentExplorer />
      </Box>
      <CreateNoteModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleCreateSuccess}
        parentId={currentNodeId}
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
