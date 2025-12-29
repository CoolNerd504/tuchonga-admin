import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Alert,
  Card,
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
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';

// In production, use relative URLs (same origin). In development, use localhost:3001
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

// ----------------------------------------------------------------------

interface Admin {
  id: string;
  email: string;
  fullName: string;
  displayName?: string;
  phoneNumber?: string;
  profileImage?: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'staff';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'staff';

export function AdminView() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'admin' as AdminRole,
  });

  const [editData, setEditData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    role: 'admin' as AdminRole,
    password: '',
  });

  // Get auth token from localStorage
  const getAuthToken = () => localStorage.getItem('authToken') || '';

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again.');
        }
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      setSnackbarMessage(error.message || 'Failed to fetch admins');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const value = e.target.value;
    setAdminData({ ...adminData, [field]: value });
  };

  const handleEditChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const value = e.target.value;
    setEditData({ ...editData, [field]: value });
  };

  const handleAddAdmin = async () => {
    try {
      if (!adminData.email || !adminData.password || !adminData.fullName) {
        setSnackbarMessage('Please fill in all required fields');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      if (adminData.password.length < 8) {
        setSnackbarMessage('Password must be at least 8 characters');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      setSubmitting(true);
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adminData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      setSnackbarMessage('Admin created successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpen(false);
      setAdminData({
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        role: 'admin',
      });
      fetchAdmins();
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to create admin');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setSubmitting(true);
      const token = getAuthToken();
      const updateData: any = {
        email: editData.email,
        fullName: editData.fullName,
        phoneNumber: editData.phoneNumber,
        role: editData.role,
      };

      if (editData.password) {
        updateData.password = editData.password;
      }

      const response = await fetch(`${API_URL}/api/admin/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin');
      }

      setSnackbarMessage('Admin updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setEditOpen(false);
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to update admin');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setSubmitting(true);
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/admin/${selectedAdmin.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete admin');
      }

      setSnackbarMessage('Admin deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setDeleteOpen(false);
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to delete admin');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditData({
      email: admin.email,
      fullName: admin.fullName,
      phoneNumber: admin.phoneNumber || '',
      role: admin.role,
      password: '',
    });
    setEditOpen(true);
  };

  const handleDeleteClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setDeleteOpen(true);
  };

  const filteredAdmins = useMemo(
    () =>
      admins.filter((admin) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          admin.email.toLowerCase().includes(searchLower) ||
          admin.fullName.toLowerCase().includes(searchLower) ||
          admin.role.toLowerCase().includes(searchLower)
        );
      }),
    [admins, searchTerm]
  );

  const paginatedAdmins = useMemo(
    () => filteredAdmins.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredAdmins, page, rowsPerPage]
  );

  const getRoleColor = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'primary';
      case 'moderator':
        return 'warning';
      case 'staff':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Admin Management</Typography>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setOpen(true)}
          >
            Add Admin
          </Button>
        </Box>

        <Card>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />,
              }}
              sx={{ mb: 2 }}
            />

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : paginatedAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No admins found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar src={admin.profileImage} alt={admin.fullName} sx={{ width: 32, height: 32 }}>
                              {admin.fullName.charAt(0)}
                            </Avatar>
                            {admin.fullName}
                          </Box>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.phoneNumber || '-'}</TableCell>
                        <TableCell>
                          <Chip label={admin.role} color={getRoleColor(admin.role)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={admin.isActive ? 'Active' : 'Inactive'}
                            color={admin.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => handleEditClick(admin)} color="primary">
                            <Iconify icon="solar:pen-bold" />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteClick(admin)} color="error">
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredAdmins.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        </Card>

        {/* Add Admin Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Full Name"
              value={adminData.fullName}
              onChange={handleChange('fullName')}
              required
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={adminData.email}
              onChange={handleChange('email')}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={adminData.phoneNumber}
              onChange={handleChange('phoneNumber')}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={adminData.role}
                label="Role"
                onChange={(e) => setAdminData({ ...adminData, role: e.target.value as AdminRole })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={adminData.password}
              onChange={handleChange('password')}
              required
              helperText="Must be at least 8 characters"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} variant="contained" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Admin</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Full Name"
              value={editData.fullName}
              onChange={handleEditChange('fullName')}
              required
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={editData.email}
              onChange={handleEditChange('email')}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={editData.phoneNumber}
              onChange={handleEditChange('phoneNumber')}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={editData.role}
                label="Role"
                onChange={(e) => setEditData({ ...editData, role: e.target.value as AdminRole })}
              >
                <MenuItem value="super_admin">Super Admin</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="New Password (leave blank to keep current)"
              type="password"
              value={editData.password}
              onChange={handleEditChange('password')}
              helperText="Leave blank to keep current password"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditAdmin} variant="contained" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Delete Admin</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{selectedAdmin?.fullName}</strong>? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteAdmin} variant="contained" color="error" disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardContent>
  );
}

