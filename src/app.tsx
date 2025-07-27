import 'src/global.css';

import Fab from '@mui/material/Fab';

import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';

import { ThemeProvider } from 'src/theme/theme-provider';

import { Iconify } from 'src/components/iconify';
import { getAuth, User, onAuthStateChanged } from 'firebase/auth';

import { app } from 'src/firebaseConfig';
import { useEffect, useState } from 'react';
// import { User } from 'firebase/auth';
import { AuthRouter } from './routes/authRoutes';
// import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

export default function App() {
  useScrollToTop();
  const [user, setUser] = useState<User | null>(null);
  const githubButton = (
    <Fab
      size="medium"
      aria-label="Github"
      href="#"
      sx={{
        zIndex: 9,
        right: 20,
        bottom: 20,
        width: 44,
        height: 44,
        position: 'fixed',
        bgcolor: 'grey.800',
        color: 'common.white',
      }}
    >
      <Iconify width={24} icon="eva:home-outline" />
    </Fab>
  );
  const auth = getAuth(app);
  console.log(user)
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
      });
  
      // Cleanup subscription on unmount
      return () => unsubscribe();
    },[auth]); 
  
    // Show loading screen while authentication state is being determined
    // if (user === null) {
    //   return "Loading";
    // }
 

  return (
    <ThemeProvider>
     {user ? <Router /> : <AuthRouter />}
      {/* {githubButton} */}
    </ThemeProvider>
  );
}
