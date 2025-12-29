import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  getDocs,
  collection,
  
} from "firebase/firestore";

import {
  Box,
  Grid,
  Alert,
  Paper,
  Table,
  Button,
  Dialog,
  Snackbar,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
  TableContainer,
  TablePagination,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// Firebase Firestore removed - migrating to Prisma API

// ----------------------------------------------------------------------

interface Users {
  id: string; // Document ID (matches Firebase Auth UID if linked)
  email?: string | null;
  phoneNumber?: string | null; // Alternative to mobile
  isActive?: boolean;
  firstname?: string | null;
  lastname?: string | null;
  fullName?: string | null; // Alternative to firstname/lastname
  displayName?: string | null;
  location?: string | null;
  mobile?: string | null; // Phone number
  profileImage?: string | null;
  hasCompletedProfile?: boolean;
  createdAt?: any;
  updatedAt?: any;
  // Analytics fields (if present)
  analytics?: {
    totalReviews?: number;
    totalComments?: number;
  };
}

export function UserView() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [userData, setUserData] = useState<Partial<Users>>({
    email: '',
    isActive: true,
    location: '',
    firstname: '',
    lastname: '',
    mobile: '',
  });

  const usersCollection = collection(firebaseDB, "users");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setUserData({ ...userData, [name]: value });
  };

  const handleAddUser = async () => {
    try {
      console.log("STAte", userData);
      await addDoc(usersCollection, userData);
      setSnackbarMessage('User added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpen(false);
      setUserData({
        email: '',
        isActive: true,
        location: '',
        firstname: '',
        lastname: '',
        mobile: '',
      });
      getUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      setSnackbarMessage('Failed to add user. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const table = useTable();
  const [userList, setUserList] = useState<Users[]>([]);

  const getUsers = useCallback(async () => {
    try {
      // Fetch users from Firestore 'users' collection (NOT Firebase Auth)
      const data = await getDocs(usersCollection);
      const filteredData: Users[] = data.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id, // Document ID
          email: docData.email || docData.emailAddress || null,
          phoneNumber: docData.phoneNumber || docData.phone || null,
          mobile: docData.mobile || docData.phoneNumber || docData.phone || null,
          firstname: docData.firstname || docData.firstName || null,
          lastname: docData.lastname || docData.lastName || null,
          fullName: docData.fullName || docData.full_name || null,
          displayName: docData.displayName || docData.display_name || null,
          location: docData.location || docData.address || null,
          isActive: docData.isActive !== undefined ? docData.isActive : true,
          profileImage: docData.profileImage || docData.profile_image || docData.photoURL || null,
          hasCompletedProfile: docData.hasCompletedProfile || docData.has_completed_profile || false,
          createdAt: docData.createdAt || null,
          updatedAt: docData.updatedAt || null,
          analytics: docData.analytics || null,
        } as Users;
      });

      setUserList(filteredData);
    } catch (err) {
      console.error("Error fetching users from Firestore:", err);
      setSnackbarMessage('Failed to fetch users from Firestore. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [usersCollection]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Derived data with search filtering
  const filteredUsers = useMemo(() => userList.filter((user: Users) => {
    const matchesSearch = (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.firstname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.lastname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.location?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  }), [userList, searchTerm]);

  // Pagination: Calculate paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = table.page * table.rowsPerPage;
    const endIndex = startIndex + table.rowsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, table.page, table.rowsPerPage]);

  // Reset page when search term changes
  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <DashboardContent>
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <Grid container spacing={2}>
          {/* Left Section (Users Table) */}
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
                    Users
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
                        {userList.length}
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
                    Manage and organize user accounts
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
                      getUsers();
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
                    Add User
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
                  placeholder="Search users..."
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

            {/* Display Table of Users */}
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
                    <TableCell sx={{ minWidth: 150 }}>Name</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Phone</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Location</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Profile</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    // Get display name - prefer fullName, then firstname+lastname, then displayName
                    const displayName = user.fullName || 
                      (user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : null) ||
                      (user.firstname || user.lastname ? `${user.firstname || ''} ${user.lastname || ''}`.trim() : null) ||
                      user.displayName ||
                      'N/A';
                    
                    // Get phone - prefer mobile, then phoneNumber
                    const phone = user.mobile || user.phoneNumber || 'N/A';
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.email || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {user.profileImage && (
                              <Box
                                component="img"
                                src={user.profileImage}
                                alt={displayName}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <Typography variant="body2">{displayName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{phone}</TableCell>
                        <TableCell>{user.location || 'N/A'}</TableCell>
                        <TableCell>
                          {user.isActive !== false ? (
                            <Typography variant="body2" sx={{ color: 'success.main' }}>
                              Active
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: 'error.main' }}>
                              Inactive
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.hasCompletedProfile ? (
                            <Typography variant="body2" sx={{ color: 'success.main' }}>
                              Complete
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: 'warning.main' }}>
                              Incomplete
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2">
                          {filteredUsers.length === 0 ? 'No users found' : 'No users on this page'}
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
              count={filteredUsers.length}
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

      {/* Add User Dialog */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          <TextField 
            margin="dense" 
            label="Email" 
            name="email" 
            fullWidth 
            value={userData.email || ''} 
            onChange={handleChange} 
          />
          <TextField 
            margin="dense" 
            label="First Name" 
            name="firstname" 
            fullWidth 
            value={userData.firstname || ''} 
            onChange={handleChange} 
          />
          <TextField 
            margin="dense" 
            label="Last Name" 
            name="lastname" 
            fullWidth 
            value={userData.lastname || ''} 
            onChange={handleChange} 
          />
          <TextField 
            margin="dense" 
            label="Location" 
            name="location" 
            fullWidth 
            value={userData.location || ''} 
            onChange={handleChange} 
          />
          <TextField 
            margin="dense" 
            label="Phone" 
            name="mobile" 
            fullWidth 
            value={userData.mobile || ''} 
            onChange={handleChange} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
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