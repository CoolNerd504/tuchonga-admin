import 'src/global.css';

import type { User} from 'firebase/auth';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';

import { app } from 'src/firebaseConfig';
import { ThemeProvider } from 'src/theme/theme-provider';

import { AuthRouter } from './routes/authRoutes';

// ----------------------------------------------------------------------

export default function App() {
  useScrollToTop();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false); // Auth state has been determined
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  // Show loading screen while authentication state is being determined
  if (loading) {
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
