// Firebase Auth and Firestore removed - migrating to Prisma API
import { useMemo, useState, useEffect, useCallback } from 'react';
// TODO: Replace Firestore calls with API calls:
// - GET /api/staff
// - POST /api/staff
// - PUT /api/staff/:id
// - DELETE /api/staff/:id

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { Paper, TableRow, MenuItem, TableCell, TableHead, CircularProgress, FormControl, InputLabel, Select } from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// Firebase Firestore removed - migrating to Prisma API


// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
interface Staff {
  id: string;
  email: string;
  password?: string; // Optional, only needed when creating
  isActive: boolean;
  firstname: string;
  lastname: string;
  role: string;
  mobile: string;

  // Add other properties here as per your data structure
}

// ----------------------------------------------------------------------

// --- Helper Components ---

function StaffForm({
  staffData,
  onChange,
  onSubmit,
  open,
  onClose,
  loading,
}: {
  staffData: Staff;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  open: boolean;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>Add Staff Member</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
              Creating Firebase Auth account...
            </Typography>
          </Box>
        )}
        <TextField
          margin="dense"
          label="First Name"
          name="firstname"
          fullWidth
          disabled={loading}
          value={staffData.firstname}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Last Name"
          name="lastname"
          fullWidth
          disabled={loading}
          value={staffData.lastname}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Email"
          name="email"
          type="email"
          fullWidth
          required
          disabled={loading}
          value={staffData.email}
          onChange={onChange}
          helperText="This will be used for Firebase Auth login"
        />
        <TextField
          margin="dense"
          label="Password"
          name="password"
          type="password"
          fullWidth
          required
          disabled={loading}
          value={staffData.password || ''}
          onChange={onChange}
          helperText="Password for Firebase Auth account (minimum 6 characters)"
        />
        <FormControl fullWidth margin="dense" disabled={loading}>
          <InputLabel id="role-select-label">Role</InputLabel>
          <Select
            labelId="role-select-label"
            name="role"
            value={staffData.role || ''}
            label="Role"
            onChange={(e) => {
              onChange({
                target: { name: 'role', value: e.target.value }
              } as React.ChangeEvent<HTMLInputElement>);
            }}
          >
            <MenuItem value="Manager">Manager</MenuItem>
            <MenuItem value="Records">Records</MenuItem>
            <MenuItem value="Customer Service">Customer Service</MenuItem>
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Mobile"
          name="mobile"
          fullWidth
          disabled={loading}
          value={staffData.mobile}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Active Status"
          name="isActive"
          fullWidth
          disabled={loading}
          value={staffData.isActive ? 'true' : 'false'}
          onChange={(e) => {
            onChange({
              target: { name: 'isActive', value: e.target.value }
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          select
        >
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={onSubmit} 
          variant="contained" 
          color="primary" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Creating Account...' : 'Create Staff Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Main Component ---

export function StaffView() {
  const initialStaff = useMemo<Staff>(() => ({
    id: '',
    email: '',
    password: '',
    isActive: true,
    firstname: '',
    lastname: '',
    role: '',
    mobile: '',
  }), []);

  const [open, setOpen] = useState(false);
  const [staffData, setStaffData] = useState<Staff>(initialStaff);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [, setLoadingList] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');

  const staffCollection = collection(firebaseDB, 'staff');
  const usersCollection = collection(firebaseDB, 'users');
  const table = useTable();

  // Fetch staff list
  useEffect(() => {
    setLoadingList(true);
    setError(null);
    getDocs(staffCollection)
      .then((data) => {
        const filteredData: Staff[] = data.docs.map((docSnapshot) => {
          const docData = docSnapshot.data() as Staff;
          return {
            ...docData,
            id: docSnapshot.id,
          };
        });
        setStaffList(filteredData);
        setLoadingList(false);
      })
      .catch((err) => {
        setError('Error fetching staff');
        setLoadingList(false);
      });
  }, [staffCollection]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setStaffData((prev) => ({ ...prev, [name]: name === 'isActive' ? value === 'true' : value }));
  }, []);

  const handleAddStaff = useCallback(async () => {
    // Validate required fields
    if (!staffData.email || !staffData.password) {
      setSnackbar({ 
        open: true, 
        message: 'Email and password are required.', 
        severity: 'error' 
      });
      return;
    }

    if (staffData.password.length < 6) {
      setSnackbar({ 
        open: true, 
        message: 'Password must be at least 6 characters long.', 
        severity: 'error' 
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(staffData.email)) {
      setSnackbar({ 
        open: true, 
        message: 'Please enter a valid email address.', 
        severity: 'error' 
      });
      return;
    }

    setLoadingSubmit(true);
    let authUserId: string | null = null;

    try {
      // Step 1: Create the Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        staffData.email.trim(),
        staffData.password
      );
      
      authUserId = userCredential.user.uid;
      console.log('Firebase Auth user created:', authUserId);

      // Step 2: Create user document in Firestore 'users' collection with Admin role
      const userDocRef = doc(usersCollection, authUserId);
      const userDataToSave = {
        id: authUserId,
        email: staffData.email.trim(),
        firstname: staffData.firstname || '',
        lastname: staffData.lastname || '',
        mobile: staffData.mobile || '',
        location: '', // Can be added later if needed
        isActive: staffData.isActive !== undefined ? staffData.isActive : true,
        role: 'Admin', // Set role as Admin for staff members
        hasCompletedProfile: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, userDataToSave);
      console.log('User document created in users collection with Admin role');

      // Step 3: Create the staff document in Firestore 'staff' collection (without password)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...staffDataWithoutPassword } = staffData;
      const staffDataToSave = {
        ...staffDataWithoutPassword,
        email: staffData.email.trim(),
        authUserId, // Store the Firebase Auth UID for reference
        createdAt: new Date().toISOString(),
      };

      await addDoc(staffCollection, staffDataToSave);
      console.log('Staff document created in staff collection');
      
      setSnackbar({ 
        open: true, 
        message: `Staff account created successfully! ${staffData.email} has been added to users table with Admin role and can now sign in.`, 
        severity: 'success' 
      });
      setOpen(false);
      setStaffData(initialStaff);
      
      // Refresh staff list
      const data = await getDocs(staffCollection);
      const filteredData: Staff[] = data.docs.map((docSnapshot) => {
        const docData = docSnapshot.data() as Staff;
        return {
          ...docData,
          id: docSnapshot.id,
        };
      });
      setStaffList(filteredData);
    } catch (err: any) {
      console.error('Error creating staff:', err);
      
      // If Firebase Auth user was created but Firestore failed, try to clean up
      if (authUserId) {
        console.warn('Firebase Auth user created but Firestore operations failed. Auth user ID:', authUserId);
        // Note: We can't delete the auth user from client side, but we log it
        // Check which operation failed
        let errorDetails = 'Firebase Auth account created but failed to save records.';
        if (err.message?.includes('users')) {
          errorDetails = 'Firebase Auth account created but failed to add user to users table.';
        } else if (err.message?.includes('staff')) {
          errorDetails = 'Firebase Auth account and users table updated, but failed to save staff record.';
        }
        setSnackbar({ 
          open: true, 
          message: `${errorDetails} Please contact administrator.`, 
          severity: 'error' 
        });
        return;
      }

      let errorMessage = 'Failed to create staff account.';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = `The email "${staffData.email}" is already registered. Please use a different email address.`;
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format. Please check and try again.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password (minimum 6 characters).';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Please contact administrator.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoadingSubmit(false);
    }
  }, [staffCollection, staffData, initialStaff, usersCollection]);

  // Derived data with search filtering
  const filteredStaff = useMemo(() => staffList.filter((staff: Staff) => {
    const matchesSearch = staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.role && staff.role.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  }), [staffList, searchTerm]);

  // Pagination: Calculate paginated staff
  const paginatedStaff = useMemo(() => {
    const startIndex = table.page * table.rowsPerPage;
    const endIndex = startIndex + table.rowsPerPage;
    return filteredStaff.slice(startIndex, endIndex);
  }, [filteredStaff, table.page, table.rowsPerPage]);

  // Reset page when search term changes
  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Removed unused notFound variable

  // Early returns for loading/error
  // if (loadingList) return <Box p={3}><Typography>Loading...</Typography></Box>;
  if (error) return <Box p={3}><Typography color="error">{error}</Typography></Box>;

  return (
    <DashboardContent>
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <Grid container spacing={2}>
          {/* Left Section (Staff Table) */}
          <Grid item xs={12} md={9}>
            {/* Modern Top Section */}
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 2, sm: 3 },
                mb: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #FF7E00 0%, #FFD700 100%)',
                color: 'white',
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                mb: 3
              }}>
                <Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      mb: 0.5, 
                      fontWeight: 700,
                      fontSize: { xs: '1.5rem', sm: '2rem' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      flexWrap: 'wrap'
                    }}
                  >
                    Staff Members
                    <Box
                      component="span"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 32,
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          color: 'white',
                        }}
                      >
                        {staffList.length}
                      </Typography>
                    </Box>
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      opacity: 0.9,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  >
                    Manage and organize staff member accounts
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1.5, 
                  width: { xs: '100%', sm: 'auto' }, 
                  flexDirection: { xs: 'column', sm: 'row' } 
                }}>
                  <Button
                    variant="contained"
                    color="inherit"
                    sx={{ 
                      textTransform: 'none',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                      },
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: 120 }
                    }}
                    startIcon={<Iconify icon="eva:refresh-fill" />}
                    onClick={() => {
                      const data = getDocs(staffCollection);
                      data.then((result) => {
                        const filteredData: Staff[] = result.docs.map((docSnapshot) => {
                          const docData = docSnapshot.data() as Staff;
                          return {
                            ...docData,
                            id: docSnapshot.id,
                          };
                        });
                        setStaffList(filteredData);
                      });
                    }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ 
                      textTransform: 'none',
                      bgcolor: 'white',
                      color: '#FF7E00',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                      },
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: 140 }
                    }}
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => setOpen(true)}
                  >
                    Add Staff
                  </Button>
                </Box>
              </Box>

              {/* Search Section */}
              <Box sx={{ 
                display: 'flex', 
                gap: 1.5,
                width: '100%',
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                <TextField
                  variant="outlined"
                  placeholder="Search staff members..."
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Iconify 
                        icon="eva:search-fill" 
                        sx={{ mr: 1, color: 'text.secondary' }} 
                      />
                    ),
                    sx: { 
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.95)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        border: '2px solid rgba(255, 255, 255, 0.5)',
                      },
                    },
                  }}
                  sx={{ 
                    flex: { xs: '1 1 100%', sm: '1 1 auto' },
                    minWidth: { xs: '100%', sm: 250 }
                  }}
                />
              </Box>
            </Paper>

      <StaffForm
        staffData={staffData}
        onChange={handleChange}
        onSubmit={handleAddStaff}
        open={open}
        onClose={() => setOpen(false)}
        loading={loadingSubmit}
      />

            {/* Display Table of Staff */}
            <TableContainer 
              component={Paper} 
              sx={{ 
                overflowX: 'auto',
                borderRadius: 2,
              }}
            >
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 200 }}>Email</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>First Name</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Last Name</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Role</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Mobile</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {staff.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{staff.firstname}</TableCell>
                      <TableCell>{staff.lastname}</TableCell>
                      <TableCell>{staff.role || 'N/A'}</TableCell>
                      <TableCell>{staff.mobile || 'N/A'}</TableCell>
                      <TableCell>
                        {staff.isActive ? (
                          <Typography variant="body2" sx={{ color: 'success.main' }}>
                            Active
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'error.main' }}>
                            Inactive
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedStaff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2">
                          {filteredStaff.length === 0 ? 'No staff members found' : 'No staff members on this page'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredStaff.length}
              rowsPerPage={table.rowsPerPage}
              page={table.page}
              onPageChange={table.onChangePage}
              onRowsPerPageChange={table.onChangeRowsPerPage}
              labelRowsPerPage="Rows per page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  gap: 1,
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          </Grid>
        </Grid>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}

export function useTable() {
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('name');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (id: string) => {
      const isAsc = orderBy === id && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    },
    [order, orderBy]
  );

  const onSelectAllRows = useCallback((checked: boolean, newSelecteds: string[]) => {
    if (checked) {
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  }, []);

  const onSelectRow = useCallback(
    (inputValue: string) => {
      const newSelected = selected.includes(inputValue)
        ? selected.filter((value) => value !== inputValue)
        : [...selected, inputValue];

      setSelected(newSelected);
    },
    [selected]
  );

  const onResetPage = useCallback(() => {
    setPage(0);
  }, []);

  const onChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const onChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      onResetPage();
    },
    [onResetPage]
  );

  return {
    page,
    order,
    onSort,
    orderBy,
    selected,
    rowsPerPage,
    onSelectRow,
    onResetPage,
    onChangePage,
    onSelectAllRows,
    onChangeRowsPerPage,
  };
}