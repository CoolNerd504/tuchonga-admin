import { useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { Logo } from 'src/components/logo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ----------------------------------------------------------------------

export function SignInView() {
  
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
  
    // const signIn = async () => {
    //   try {
    //     await createUserWithEmailAndPassword(auth, email, password);
    //   } catch (err) {
    //     console.error(err);
    //   }
    // };
  
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage(""); // Reset previous errors
    setSuccessMessage(""); // Reset previous success messages

    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in. Please check your credentials.");
      }

      // Store token and admin data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('admin', JSON.stringify(data.admin));

      setSuccessMessage("Sign-in successful! Redirecting...");
      setTimeout(() => {
        // Reload to update auth state
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sign in. Please check your credentials.");
    }
  };

  // const handleSignIn = useCallback(() => {
  //   router.push('/');
  // }, [router]);

  const renderForm = (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <TextField
        fullWidth
        name="email"
        label="Email address"
        onChange={(e) => setEmail(e.target.value)} 
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <Link variant="body2" color="inherit" sx={{ mb: 1.5 }}>
        Forgot password?
      </Link>

      <TextField
        fullWidth
        name="password"
        label="Password"
        onChange={(e) => setPassword(e.target.value)}
        InputLabelProps={{ shrink: true }}
        type={showPassword ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />
  {/* Display error message if sign-in fails */}
  {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {errorMessage}
          </Alert>
        )}

        {/* Display success message if sign-in succeeds */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
            {successMessage}
          </Alert>
        )}

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        color="inherit"
        variant="contained"
        onClick={handleSignIn}
      >
        Sign in
      </LoadingButton>
    </Box>
  );

  return (
    <>
      <Box display="flex" flexDirection="column" alignItems="center" >
        <Logo width={300} disableLink />
        <Typography variant="h5">Sign in</Typography>
      </Box>

      {renderForm}
      <Box  display="flex" flexDirection="column" alignItems="center">
        <Divider sx={{ width: '100%' }} />
        <Typography variant="body2" color="text.secondary">
          Don’t have an account?
          <Link variant="subtitle2" sx={{ ml: 0.5 }}>
            Get started
          </Link>
        </Typography>
      </Box>

     
    </>
  );
}
