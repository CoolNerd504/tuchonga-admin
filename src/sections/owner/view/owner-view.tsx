import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  Box,
  Card,
  Table,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  TableBody,
  Typography,
  TableContainer,
  TablePagination,
} from '@mui/material';
import { _users } from 'src/_mock';
import {
  getDocs,
  collection,
  addDoc,
  // deleteDoc,
  // updateDoc,
} from 'firebase/firestore';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { UserTableRow } from '../owner-table-row';
import { UserTableHead } from '../owner-table-head';
import { TableEmptyRows } from '../table-empty-rows';
import { UserTableToolbar } from '../owner-table-toolbar';
import { emptyRows, applyFilter, getComparator } from '../utils';
import { firebaseDB } from '../../../firebaseConfig';


// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
interface Business {
  id: string;
  business_email: string;
  business_phone: string;
  isVerified: boolean;
  products: string[];
  services: string[];
  location: string;
  logo: string;
  name: string;
  poc_firstname: string;
  poc_lastname: string;
  poc_phone: string;
  status: boolean;
}
type TableNoDataProps = {
  // If the prop is required, remove the '?'
  isNotFound?: boolean;
};

export function TableNoData({ isNotFound }: TableNoDataProps) {
  if (isNotFound) {
    return <div>No data found.</div>;
  }
  return <div>Loading or has data...</div>;
}
// ----------------------------------------------------------------------
// Hook: useTable
//   - Manages pagination, sorting, and row selection.
// ----------------------------------------------------------------------
function useTable() {
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
    } else {
      setSelected([]);
    }
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

// ----------------------------------------------------------------------
// Component: OwnerView
//   - Displays and manages the business owners list
// ----------------------------------------------------------------------
export function OwnerView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const table = useTable();
  const navigate = useNavigate();

  // State for business form data
  const [businessData, setBusinessData] = useState<Partial<Business>>({
    business_email: '',
    business_phone:'',
    isVerified: false,
    location: '',
    logo: '',
    name: '',
    products: [],
    services: [],
    poc_firstname: '',
    poc_lastname: '',
    poc_phone: '',
    status: true,
  });

  interface Product {
    id: string;
    product_name: string;
    category: string[];
    description: string;
    reviews: number;
    positive_reviews: number;
    total_reviews: number;
    total_views: number;
    comments: string[];
    isActive: boolean;
    productOwner: string
  
  }

  interface Service {
    id: string;
    service_name: string;
    category: string[];
    description: string;
    reviews: number;
    positive_reviews: number;
    total_reviews: number;
    total_views: number;
    comments: string[];
    isActive: boolean;
  
  }

  // Business list from Firestore
  const [businessList, setBusinessList] = useState<Business[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Firestore collection reference
  const businessesCollection = collection(firebaseDB, 'businesses');
  const productsCollection = collection(firebaseDB, 'products');
  const servicesCollection = collection(firebaseDB, 'services');
  const handleSelectRow = (business: Business) => {
    navigate(`/business/${business?.id}`, { state: { business, productList, serviceList } });
    console.log('Selected row:', selectedBusiness);
    // if (selectedBusiness === null) {
    //   console.log('First CLick :', selectedBusiness);
    // } else 
    // {};
  }



  // Handle text field changes
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setBusinessData((prev) => ({ ...prev, [name]: value }));
  };

  // Add a new business to Firestore
  const handleAddBusiness = async () => {
    try {
      // Firestore automatically generates an ID, so we typically don't need to create one
      const newBusiness: Partial<Business> = {
        ...businessData,
        isVerified: businessData.isVerified || false,
        status: businessData.status ?? true,
      };

      const docRef = await addDoc(businessesCollection, newBusiness);
      console.log('Business added with ID:', docRef.id);

      // Optionally refetch the updated list
      await getBusinesses();

      // Provide user feedback (here using console; replace with toast or UI notification if desired)
      console.log('Business added successfully!');

      // Close dialog & reset form
      setDialogOpen(false);
      setBusinessData({
        business_email: '',
        isVerified: false,
        location: '',
        logo: '',
        name: '',
        business_phone:'',

        poc_firstname: '',
        poc_lastname: '',
        poc_phone: '',
        status: true,
      });
    } catch (error) {
      console.error('Error adding business:', error);
    }
  };

  // Fetch businesses from Firestore
  const getBusinesses = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(businessesCollection);
      const fetchedData: Business[] = querySnapshot.docs.map((doc) => {
        const docData = doc.data() as Omit<Business, 'id'>;
        return {
          ...docData,
          id: doc.id,
        };
      });
      setBusinessList(fetchedData);
    } catch (err) {
      console.error('Error fetching businesses:', err);
    }
  }, [businessesCollection]);


  // Update getProducts with productsCollection dependency
  const getProducts = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(productsCollection);
      const fetchedData: Product[] = querySnapshot.docs.map((doc) => {
        const docData = doc.data() as Omit<Product, 'id'>;
        return {
          ...docData,
          id: doc.id,
        };
      });
      setProductList(fetchedData);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, [productsCollection]);


  // Update getServices with stable dependency
  const getServices = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(servicesCollection);
      const fetchedData: Service[] = querySnapshot.docs.map((doc) => {
        const docData = doc.data() as Omit<Service, 'id'>;
        return {
          ...docData,
          id: doc.id,
        };
      });
      setServiceList(fetchedData);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, [servicesCollection]);

  // Initial load
  useEffect(() => {
    getBusinesses();
    getProducts();
    getServices();
  }, [getBusinesses,getProducts,getServices]);

  // Filter data example (currently using _users as a placeholder)
  const dataFiltered = applyFilter({
    inputData: _users, // You can replace with businessList if needed
    comparator: getComparator(table.order, table.orderBy),
    filterName,
  });

  // Check for "no results found"
  const notFound = !dataFiltered.length && !!filterName;

  return (
    <DashboardContent>
      {/* Top Bar */}
      <Box display="flex" alignItems="center" mb={5}>
        <Typography variant="h4" flexGrow={1}>
          Business 
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setDialogOpen(true)}
        >
          Add
        </Button>
      </Box>

      {/* Add Business Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Business </DialogTitle>
        <DialogContent dividers>
          <TextField
            margin="normal"
            label="Business Name"
            name="name"
            fullWidth
            value={businessData.name || ''}
            onChange={handleChange}
          />
            <TextField
            margin="normal"
            label="Location"
            name="location"
            fullWidth
            value={businessData.location || ''}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            label="Email"
            name="business_email"
            fullWidth
            value={businessData.business_email || ''}
            onChange={handleChange}
          />
        
          {/* <TextField
            margin="normal"
            label="First Name"
            name="poc_firstname"
            fullWidth
            value={businessData.poc_firstname || ''}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            label="Last Name"
            name="poc_lastname"
            fullWidth
            value={businessData.poc_lastname || ''}
            onChange={handleChange}
          />
           */}
           <TextField
            margin="normal"
            label="Phone"
            name="business_phone"
            fullWidth
            value={businessData.business_phone || ''}
            onChange={handleChange}
          /> 
     
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddBusiness} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Display Table of Businesses */}
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
              Business Owners
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  {/* <TableCell>ID</TableCell> */}
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Verified</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Logo</TableCell>
                  <TableCell>Status</TableCell>
                  {/* <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Phone</TableCell> */}
                  <TableCell />
                </TableRow>
              </TableHead>

              <TableBody>
                {businessList.map((business) => (
                  <TableRow
                    hover
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectRow(business)}
                    key={business.id}>
                    {/* <TableCell>{business.id}</TableCell> */}
                    <TableCell>
                      {business.name}
                    </TableCell>
                    <TableCell>{business.business_email}</TableCell>
                    <TableCell>{business.isVerified ? 'true' : 'false'}</TableCell>
                    <TableCell>{business.location}</TableCell>
                    <TableCell>{business.name}</TableCell>
                    {/* <TableCell>{business.poc_firstname}</TableCell>
                    <TableCell>{business.poc_lastname}</TableCell>
                    <TableCell>{business.poc_phone}</TableCell> */}
                    <TableCell>{business.status ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>
                      <IconButton color="primary" aria-label="View details">
                        <Iconify width={22} icon="eva:arrow-forward-fill" height="24" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Optionally handle no data scenario */}
                {businessList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      <TableNoData isNotFound={false} />
                      {/* Or display a custom message */}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        {/* Example pagination using _users.length — you can update to businessList.length */}
        <TablePagination
          component="div"
          page={table.page}
          count={_users.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}