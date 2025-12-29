import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { Iconify } from 'src/components/iconify';
import { Logo } from 'src/components/logo';

// In production, use relative URLs (same origin). In development, use localhost:3001
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

export function SuperAdminSetupView() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstname: '',
    lastname: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [superAdminExists, setSuperAdminExists] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_URL}/api/admin/setup/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSuperAdminExists(data.superAdminExists);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('Error checking super admin:', err);
      
      let errorMessage = 'Network error. Please ensure the API server is running.';
      
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        errorMessage = `Request timed out. The API server at ${API_URL} is not responding.`;
      } else if (err.message === 'Load failed' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = `Cannot connect to API server at ${API_URL}. Please ensure the API server is running:\n\nRun: npm run dev:api\n\nOr: npm run dev:all`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      // Assume no super admin if API is unreachable, so user can still try to create one
      setSuperAdminExists(false);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.email || !formData.password || !formData.firstname || !formData.lastname) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

           try {
             const response = await fetch(`${API_URL}/api/admin/setup/super-admin`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                 email: formData.email,
                 password: formData.password,
                 firstname: formData.firstname,
                 lastname: formData.lastname,
                 phoneNumber: formData.phoneNumber || undefined,
               }),
             });

             if (!response.ok) {
               // Try to parse error message
               let errorMessage = `HTTP ${response.status}: Failed to create super admin`;
               try {
                 const errorData = await response.json();
                 errorMessage = errorData.error || errorMessage;
                 // Include details if available
                 if (errorData.details) {
                   errorMessage += ` - ${errorData.details}`;
                 }
               } catch {
                 // If response is not JSON, use status text
                 errorMessage = response.statusText || errorMessage;
               }
               throw new Error(errorMessage);
             }

             const data = await response.json();

      setSuccess(true);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstname: '',
        lastname: '',
        phoneNumber: '',
      });

      // Refresh check
      setTimeout(() => {
        checkSuperAdmin();
      }, 1000);
    } catch (err: any) {
      console.error('Super admin creation error:', err);
      let errorMessage = 'An error occurred while creating super admin';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = `Cannot connect to API server at ${API_URL}. Please ensure the API server is running on port 3001.`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Checking setup status...</Typography>
      </Box>
    );
  }

  if (superAdminExists) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Card sx={{ p: 4, maxWidth: 500, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Logo width={200} disableLink />
          </Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Super admin has already been set up. Please sign in to continue.
          </Alert>
          <LoadingButton
            fullWidth
            size="large"
            variant="contained"
            href="/sign-in"
          >
            Go to Sign In
          </LoadingButton>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
      <Card sx={{ p: 4, maxWidth: 500, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Logo width={200} disableLink />
          <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
            Super Admin Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create the first administrator account
          </Typography>
        </Box>

               {error && (
                 <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                   <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                     {error.includes('API server') || error.includes('Cannot connect') ? 'API Server Not Running' : 'Setup Failed'}
                   </Typography>
                   <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                     {error}
                   </Typography>
                   {(error.includes('API server') || error.includes('Cannot connect')) && (
                     <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                       <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                         Quick Fix:
                       </Typography>
                       <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                         1. Open a terminal<br />
                         2. Run: <strong>npm run dev:api</strong><br />
                         3. Wait for: &quot;🚀 API Server running on http://localhost:3001&quot;<br />
                         4. Refresh this page
                       </Typography>
                       <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                         API URL: {API_URL}
                       </Typography>
                     </Box>
                   )}
                 </Alert>
               )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Super admin created successfully! You can now sign in.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="First Name"
            value={formData.firstname}
            onChange={handleChange('firstname')}
            required
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Last Name"
            value={formData.lastname}
            onChange={handleChange('lastname')}
            required
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            required
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Phone Number (Optional)"
            value={formData.phoneNumber}
            onChange={handleChange('phoneNumber')}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange('password')}
            required
            autoComplete="new-password"
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
            helperText="Must be at least 8 characters"
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            required
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                    <Iconify icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={loading}
          >
            Create Super Admin
          </LoadingButton>
        </Box>
      </Card>
    </Box>
  );
}

export default SuperAdminSetupView;

