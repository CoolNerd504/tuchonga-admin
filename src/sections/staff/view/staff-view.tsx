import { useState, useCallback, useEffect, useMemo } from 'react';

import {  TableCell, TableHead, TableRow, Paper,IconButton ,Avatar, MenuItem } from '@mui/material';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import { _users } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import {
  getDocs,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  
} from "firebase/firestore";
import { firebaseDB, auth, storage } from "../../../firebaseConfig";

import { TableNoData } from '../table-no-data';
import { StaffTableRow } from '../staff-table-row';
import { UserTableHead } from '../staff-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../staff-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';

import type { StaffProps } from '../staff-table-row';

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
interface Staff {
  id: string;
  email: string;
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
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Staff</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="First Name"
          name="firstname"
          fullWidth
          value={staffData.firstname}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Last Name"
          name="lastname"
          fullWidth
          value={staffData.lastname}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Email"
          name="email"
          fullWidth
          value={staffData.email}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Role"
          name="role"
          fullWidth
          value={staffData.role}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Mobile"
          name="mobile"
          fullWidth
          value={staffData.mobile}
          onChange={onChange}
        />
        <TextField
          margin="dense"
          label="Active Status"
          name="isActive"
          fullWidth
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained" color="primary" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit'}
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
    isActive: true,
    firstname: '',
    lastname: '',
    role: '',
    mobile: '',
  }), []);

  const [open, setOpen] = useState(false);
  const [staffData, setStaffData] = useState<Staff>(initialStaff);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [filterName, setFilterName] = useState('');

  const staffCollection = collection(firebaseDB, 'staff');
  const table = useTable();

  // Fetch staff list
  useEffect(() => {
    setLoadingList(true);
    setError(null);
    getDocs(staffCollection)
      .then((data) => {
        const filteredData: Staff[] = data.docs.map((doc) => {
          const docData = doc.data() as Staff;
          return {
            ...docData,
            id: doc.id,
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
    setLoadingSubmit(true);
    try {
      await addDoc(staffCollection, staffData);
      setSnackbar({ open: true, message: 'Staff added successfully!', severity: 'success' });
      setOpen(false);
      setStaffData(initialStaff);
      // Refresh staff list
      const data = await getDocs(staffCollection);
      const filteredData: Staff[] = data.docs.map((doc) => {
        const docData = doc.data() as Staff;
        return {
          ...docData,
          id: doc.id,
        };
      });
      setStaffList(filteredData);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add staff.', severity: 'error' });
    } finally {
      setLoadingSubmit(false);
    }
  }, [staffCollection, staffData, initialStaff]);

  const dataFiltered: StaffProps[] = useMemo(() => applyFilter({
    inputData: staffList,
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  }), [staffList, table.order, table.orderBy, filterName]);

  const notFound = !dataFiltered.length && !!filterName;

  // Early returns for loading/error
  // if (loadingList) return <Box p={3}><Typography>Loading...</Typography></Box>;
  if (error) return <Box p={3}><Typography color="error">{error}</Typography></Box>;

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          Staff Management
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setOpen(true)}
        >
          Add
        </Button>
      </Box>

      <StaffForm
        staffData={staffData}
        onChange={handleChange}
        onSubmit={handleAddStaff}
        open={open}
        onClose={() => setOpen(false)}
        loading={loadingSubmit}
      />

      <Card>
        <UserTableToolbar
          numSelected={table.selected.length}
          filterName={filterName}
          onFilterName={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
            table.onResetPage();
          }}
        />

        <Scrollbar>
          <TableContainer component={Paper}>
            <Typography variant="h5" sx={{ p: 2 }}>
              Staff Members
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Active Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dataFiltered.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>{staff.firstname}</TableCell>
                    <TableCell>{staff.lastname}</TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell>{staff.mobile}</TableCell>
                    <TableCell>{staff.isActive ? 'Active' : 'Inactive'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={table.page}
          count={staffList.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
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
  const [rowsPerPage, setRowsPerPage] = useState(5);
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