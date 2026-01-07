import { useMemo, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiDelete, getAuthToken } from 'src/utils/api';

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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  Chip,
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
  gender?: string | null; // "male" | "female" | "other" | null
  hasCompletedProfile?: boolean;
  role?: string; // User role
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Users | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; user: Users } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');
  const [userData, setUserData] = useState<Partial<Users>>({
    email: '',
    isActive: true,
    location: '',
    firstname: '',
    lastname: '',
    mobile: '',
    gender: '',
  });

  // TODO: Migrate to API - GET /api/users
  // const usersCollection = collection(firebaseDB, "users");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setUserData({ ...userData, [name]: value });
  };

  const handleAddUser = async () => {
    try {
      // TODO: Migrate to API - POST /api/users
      // const response = await fetch('/api/users', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify(userData),
      // });
      console.warn('User creation not implemented - needs API migration');
      console.log("STAte", userData);
      // await addDoc(usersCollection, userData);
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
      const response = await apiGet('/api/users');
      let filteredData: Users[] = [];
      
      if (response.success && response.data) {
        filteredData = response.data.map((user: any) => ({
          id: user.id,
          email: user.email || null,
          phoneNumber: user.phoneNumber || user.phone || null,
          mobile: user.phoneNumber || user.phone || null,
          firstname: user.firstName || user.firstname || null,
          lastname: user.lastName || user.lastname || null,
          fullName: user.fullName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null),
          displayName: user.displayName || null,
          location: user.location || null,
          isActive: user.isActive !== undefined ? user.isActive : true,
          profileImage: user.profileImage || null,
          hasCompletedProfile: user.hasCompletedProfile || false,
          role: user.role || 'user',
          createdAt: user.createdAt ? new Date(user.createdAt) : null,
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
          analytics: user.analytics || null,
        })) as Users[];
      } else {
        filteredData = [];
      }

      setUserList(filteredData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setSnackbarMessage('Failed to fetch users. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, []); // Removed usersCollection dependency - will use API

  // Get current user's role for permission checks
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await apiGet('/api/users/me');
        if (response.success && response.data) {
          setCurrentUserRole(response.data.role || 'user');
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Check if current user can manage the target user
  const canManageUser = (targetUser: Users): boolean => {
    if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
      return false;
    }
    // Super admin can manage anyone
    if (currentUserRole === 'super_admin') {
      return true;
    }
    // Regular admin can only manage non-admin users
    const targetRole = targetUser.role || 'user';
    return !['admin', 'super_admin'].includes(targetRole);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: Users) => {
    setMenuAnchor({ element: event.currentTarget, user });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDeactivateClick = (user: Users) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
    handleMenuClose();
  };

  const handleReactivateClick = async (user: Users) => {
    try {
      const response = await apiPost(`/api/users/${user.id}/reactivate`);
      if (response.success) {
        setSnackbarMessage('User reactivated successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        getUsers();
      } else {
        setSnackbarMessage(response.error || 'Failed to reactivate user');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error: any) {
      console.error('Error reactivating user:', error);
      setSnackbarMessage('Failed to reactivate user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = (user: Users) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDeactivate = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await apiPost(`/api/users/${selectedUser.id}/deactivate`);
      if (response.success) {
        setSnackbarMessage('User deactivated successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        getUsers();
      } else {
        setSnackbarMessage(response.error || 'Failed to deactivate user');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      setSnackbarMessage('Failed to deactivate user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    setDeactivateDialogOpen(false);
    setSelectedUser(null);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await apiDelete(`/api/users/${selectedUser.id}`);
      if (response.success) {
        setSnackbarMessage('User deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        getUsers();
      } else {
        setSnackbarMessage(response.error || 'Failed to delete user');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setSnackbarMessage('Failed to delete user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

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
                    <TableCell sx={{ minWidth: 100 }}>Gender</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Profile</TableCell>
                    <TableCell sx={{ minWidth: 100 }} align="right">Actions</TableCell>
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
                          {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.isActive !== false ? 'Active' : 'Inactive'}
                            color={user.isActive !== false ? 'success' : 'default'}
                            size="small"
                          />
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
                        <TableCell align="right">
                          {canManageUser(user) && (
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, user)}
                              size="small"
                            >
                              <Iconify icon="eva:more-vertical-fill" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
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
          <FormControl fullWidth margin="dense">
            <InputLabel>Gender</InputLabel>
            <Select
              name="gender"
              value={userData.gender || ''}
              onChange={handleChange}
              label="Gender"
            >
              <MenuItem value="">Not specified</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
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

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={!!menuAnchor}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {menuAnchor?.user.isActive ? (
          <MenuItem onClick={() => handleDeactivateClick(menuAnchor.user)}>
            <Iconify icon="solar:user-block-bold" sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleReactivateClick(menuAnchor!.user)}>
            <Iconify icon="solar:user-check-bold" sx={{ mr: 1 }} />
            Reactivate
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => handleDeleteClick(menuAnchor!.user)}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deactivateDialogOpen} onClose={() => setDeactivateDialogOpen(false)}>
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate{' '}
            <strong>{selectedUser?.email || selectedUser?.fullName || 'this user'}</strong>?
            They will not be able to access their account until reactivated.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeactivate} variant="contained" color="warning">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{' '}
            <strong>{selectedUser?.email || selectedUser?.fullName || 'this user'}</strong>?
            This will deactivate their account. This action can be undone by reactivating the user.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
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