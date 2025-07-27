import { useState, useCallback, useEffect } from 'react';
import {  TableCell, TableRow,TableHead,  Paper,IconButton ,Avatar } from '@mui/material';
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
import { firebaseDB } from "../../../firebaseConfig";
import { UserTableToolbar } from '../user-table-toolbar';

// ----------------------------------------------------------------------

interface Users {
  id: string;
  email: string;
  isActive: boolean;
  firstname: string;
  lastname: string;
  location: string;
  mobile: string;
}

export function UserView() {
  const [open, setOpen] = useState(false);
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
     console.log("STAte",userData )
      await addDoc(usersCollection, userData);
      alert("User added successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Failed to add user.");
    }
  };

  const table = useTable();
  const [userList, setUserList] = useState<Users[]>([]);

  const getUsers = useCallback(async () => {
    try {
      const data = await getDocs(usersCollection);
      const filteredData: Users[] = data.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }) as Users);

      setUserList(filteredData);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [usersCollection]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const [filterName, setFilterName] = useState('');

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          User Management
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setOpen(true)}
        >
          Add User
        </Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          <TextField      margin="dense" label="Email" name="email" fullWidth value={userData.email} onChange={handleChange} />
          <TextField      margin="dense" label="First Name" name="firstname" fullWidth value={userData.firstname} onChange={handleChange} />
          <TextField      margin="dense" label="Last Name" name="lastname" fullWidth value={userData.lastname} onChange={handleChange} />
          <TextField     margin="dense" label="Location" name="location" fullWidth value={userData.location} onChange={handleChange} />
          <TextField      margin="dense" label="Phone" name="mobile" fullWidth value={userData.mobile} onChange={handleChange} />
          <TextField     margin="dense" label="Status" name="isActive" fullWidth value={userData.isActive ? 'Active' : 'Inactive'} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

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
            <Table>
              <TableHead>
                <TableRow>
                  {/* <TableCell>ID</TableCell> */}
                  <TableCell>Email</TableCell>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userList.map((user) => (
                  <TableRow key={user.id}>
                    {/* <TableCell>{user.id}</TableCell> */}
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.firstname}</TableCell>
                    <TableCell>{user.lastname}</TableCell>
                    <TableCell>{user.location}</TableCell>
                    <TableCell>{user.mobile}</TableCell>
                    <TableCell>{user.isActive ? 'Active' : 'Inactive'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={table.page}
          count={userList.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
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