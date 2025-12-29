import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  getDocs,
  collection,
  // deleteDoc,
  // updateDoc,
} from 'firebase/firestore';

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
  IconButton,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
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
  const [selectedBusiness] = useState<Business | null>(null);

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

      // Provide user feedback
      setSnackbarMessage('Business added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

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
      setSnackbarMessage('Error adding business. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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

  // Derived data with search filtering
  const filteredBusinesses = useMemo(() => businessList.filter((business: Business) => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.business_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (business.location && business.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  }), [businessList, searchTerm]);

  // Pagination: Calculate paginated businesses
  const paginatedBusinesses = useMemo(() => {
    const startIndex = table.page * table.rowsPerPage;
    const endIndex = startIndex + table.rowsPerPage;
    return filteredBusinesses.slice(startIndex, endIndex);
  }, [filteredBusinesses, table.page, table.rowsPerPage]);

  // Reset page when search term changes
  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <DashboardContent>
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        <Grid container spacing={2}>
          {/* Left Section (Business Owners Table) */}
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
                    Business Owners
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
                        {businessList.length}
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
                    Manage and organize business owner accounts
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
                      console.log('Manual refresh triggered');
                      getBusinesses();
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
                    onClick={() => setDialogOpen(true)}
                  >
                    Add Business
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
                  placeholder="Search business owners..."
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
                    <TableCell sx={{ minWidth: 150 }}>Name</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>Email</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Verified</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Location</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 80 }} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedBusinesses.map((business) => (
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSelectRow(business)}
                      key={business.id}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {business.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{business.business_email}</TableCell>
                      <TableCell>
                        {business.isVerified ? (
                          <Iconify icon="eva:checkmark-circle-2-fill" sx={{ color: 'success.main' }} />
                        ) : (
                          <Iconify icon="eva:close-circle-fill" sx={{ color: 'error.main' }} />
                        )}
                      </TableCell>
                      <TableCell>{business.location || 'N/A'}</TableCell>
                      <TableCell>
                        {business.status ? (
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
                        <IconButton 
                          color="primary" 
                          aria-label="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(business);
                          }}
                        >
                          <Iconify width={22} icon="eva:arrow-forward-fill" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedBusinesses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2">
                          {filteredBusinesses.length === 0 ? 'No business owners found' : 'No business owners on this page'}
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
              count={filteredBusinesses.length}
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