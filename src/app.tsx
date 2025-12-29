import 'src/global.css';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { useSuperAdminCheck } from 'src/hooks/use-super-admin-check';
import { useAuth } from 'src/hooks/use-auth';

import { ThemeProvider } from 'src/theme/theme-provider';

import { AuthRouter } from './routes/authRoutes';

// ----------------------------------------------------------------------

export default function App() {
  useScrollToTop();
  const { user, loading: authLoading } = useAuth();
  const { checking, superAdminExists } = useSuperAdminCheck();
  const location = useLocation();

  // Redirect to setup if super admin doesn't exist and not already on setup page
  useEffect(() => {
    if (!checking && !superAdminExists && location.pathname !== '/setup') {
      window.location.href = '/setup';
    }
  }, [checking, superAdminExists, location.pathname]);

  // Show loading screen while authentication state is being determined
  if (authLoading || checking) {
    return (
      <ThemeProvider>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400, px: 3 }}>
            <LinearProgress />
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {user ? <Router /> : <AuthRouter />}
    </ThemeProvider>
  );
}
