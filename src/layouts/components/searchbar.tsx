import type { BoxProps } from '@mui/material/Box';

import { useCallback } from 'react';

import ClickAwayListener from '@mui/material/ClickAwayListener';


// ----------------------------------------------------------------------

export function Searchbar({ sx, ...other }: BoxProps) {
  // Component is currently not fully implemented - keeping structure for future use
  const handleClose = useCallback(() => {
    // Placeholder for future implementation
  }, []);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        {/* {!open && (
          <IconButton onClick={handleOpen}>
            <Iconify icon="eva:search-fill" />
          </IconButton>
        )} */}

           {/* <Slide direction="down" in={open} mountOnEnter unmountOnExit>
       <Box
            sx={{
              ...bgBlur({
                color: theme.vars.palette.background.default,
              }),
              top: 0,
              left: 0,
              zIndex: 99,
              width: '100%',
              display: 'flex',
              position: 'absolute',
              alignItems: 'center',
              px: { xs: 3, md: 5 },
              boxShadow: theme.customShadows.z8,
              height: {
                xs: 'var(--layout-header-mobile-height)',
                md: 'var(--layout-header-desktop-height)',
              },
              ...sx,
            }}
            {...other}
          >
            <Input
              autoFocus
              fullWidth
              disableUnderline
              placeholder="Search…"
              startAdornment={
                <InputAdornment position="start">
                  <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              }
              sx={{ fontWeight: 'fontWeightBold' }}
            />
            <Button variant="contained" onClick={handleClose}>
              Search
            </Button>
          </Box> 
        </Slide> */}
      </div>
    </ClickAwayListener>
  );
}
