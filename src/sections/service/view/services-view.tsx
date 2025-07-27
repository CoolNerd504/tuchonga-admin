import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Checkbox,
  Chip,
  TableContainer,
  Table,
  Dialog,
  MenuItem,
  Snackbar, Alert,
  DialogActions,
  DialogContent,
  DialogTitle,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  TablePagination,
  Avatar,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';
import CheckIcon from '@mui/icons-material/Check';

// Recharts imports
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  getDocs,
  collection,
  addDoc,
  doc, getDoc, query, where
} from 'firebase/firestore';
// import { MenuItem } from '@mui/material';
import { UserTableToolbar } from '../service-table-toolbar';
import { firebaseDB } from '../../../firebaseConfig';
import ServiceStats from '../stats/service-stats';




// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
interface Service {
  id: string;
  service_name: string;
  category: string[];
  description: string;
  reviews: number;
  positive_reviews: number;
  total_reviews: number;
  total_views: number;
  mainImage: string;
  additionalImages: string[];
  comments: string[];
  isActive: boolean;
  service_owner: string;
  createdAt?: Date;
}
// Interface for a Comment that can belong to a Product or a Service
interface ProductOrServiceComment {
  id: string; // Unique identifier for the comment
  parentId: string; // The ID of the parent entity (Product or Service)
  parentType: "Product" | "Service"; // Indicates whether parentId refers to a Product or a Service
  userId: string; // The ID of the user who posted the comment
  userName: string; // The ID of the user who posted the comment
  text: string; // The content of the comment
  timestamp: Date; // When the comment was posted
  // Field for user-expressed sentiment
  userSentiment: "Disagree" | "FiftyFifty" | "Agree"; // The user's sentiment/agreement level
  // Fields for sentiment history
  sentimentHistory?: UserAgreementLevelHistoryEntry[]; // Updated: Array to store previous user sentiment/agreement values and timestamps
}

interface UserAgreementLevelHistoryEntry {
  userSentiment: "Disagree" | "nuetral" | "Agree"; // The previous user sentiment/agreement value
  timestamp: Date; // The timestamp when this sentiment/agreement was recorded (i.e., when it was the current value)
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


const STATS = {
  totalViews: 102,
  totalComments: 14,
  totalReviews: 8,
  totalProducts: 30,
};



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
  const onResetPage = useCallback(() => {
    setPage(0);
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
  return { page, order, orderBy, rowsPerPage, onSelectRow, onSort, onChangePage, onResetPage, onChangeRowsPerPage, selected };



  // ----------------------------------------------------------------------
  // Main Component
  // ----------------------------------------------------------------------

}



/**
 * ServicesView displays and manages the list of services, including add, edit, and category selection.
 * Handles Firestore integration, service comments, and UI for service management.
 */
export function ServicesView() {
  // Add this state for categories
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [serviceComments, setServiceComments] = useState<ProductOrServiceComment[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [availableServiceOwners, setAvailableServiceOwners] = useState<string[]>([]);
  const [serviceData, setServiceData] = useState<Service>({
    id: '',
    service_name: '',
    category: [],
    description: '',
    reviews: 0,
    positive_reviews: 0,
    total_reviews: 0,
    total_views: 0,
    mainImage: "",
    additionalImages: [],
    comments: [],
    isActive: true,
    service_owner: 'SetLater'
  });
  const [open, setOpen] = useState(false);
  const [selectedService, setSelectedProduct] = useState<Service | null>(null);
  const [filterName, setFilterName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const table = useTable();
  const navigate = useNavigate();
  // Firestore collection reference
  // const servicesCollection = collection(firebaseDB, 'services');
  const handleSelectRow = (service: Service) => {
    navigate(`/services/${service?.id}`, { state: { service } });
  }
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'category') {
      // Split the comma-separated values into an array
      const categoryArray = value.split(',').map(item => item.trim());
      setServiceData({ ...serviceData, [name]: categoryArray });
    } else {
      setServiceData({ ...serviceData, [name]: value });
    }
  };

  const handleAddService = async () => {
    try {
      // Log the data being sent
      console.log('Adding service:', {
        ...serviceData,
        createdAt: new Date(),
      });
      await addDoc(servicesCollection, {
        ...serviceData,
        createdAt: new Date(),
      });
      // Reset form and close dialog
      setServiceData({
        id: '',
        service_name: '',
        category: [],
        description: '',
        reviews: 0,
        positive_reviews: 0,
        total_reviews: 0,
        total_views: 0,
        mainImage: "",
        additionalImages: [],
        comments: [],
        isActive: true,
        service_owner: 'SetLater'
      });
      setOpen(false);
      // Refresh the services list
      getServices();
      setSnackbarMessage('Service added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error adding service:", error);
      setSnackbarMessage('Failed to add service.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };


  // console.log('Selected List:', serviceList);
  // Move Firestore collection reference to useMemo
  const servicesCollection = useMemo(() => collection(firebaseDB, 'services'), []);

  // Update getServices with stable dependency
  const getServices = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(servicesCollection);
      const fetchedData: Service[] = querySnapshot.docs.map((docService) => {
        const docData = docService.data() as Omit<Service, 'id'>;
        return {
          ...docData,
          id: docService.id,
        };
      });
      // Sort by createdAt descending
      fetchedData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setServiceList(fetchedData);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, [servicesCollection]);

  // Update useEffect to run only once
  useEffect(() => {
    getServices();
    const fetchAllServiceComments = async () => {
      try {
        const commentsRef = collection(firebaseDB, "comments");
        const q = query(commentsRef, where("parentType", "==", "Service"));
        const querySnapshot = await getDocs(q);
        const comments = querySnapshot.docs.map(docServiceComments => ({
          id: docServiceComments.id,
          ...docServiceComments.data()
        })) as ProductOrServiceComment[];
        setServiceComments(comments);
        return comments;
      } catch (error) {
        console.error("Error fetching service comments:", error);
        return [];
      }
    };
    fetchAllServiceComments();
  }, [getServices]);

  // Fetch categories from Firestore and filter by type 'service'
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesCollection = collection(firebaseDB, 'categories');
        const querySnapshot = await getDocs(categoriesCollection);
        const categories = querySnapshot.docs.map(docCat => docCat.data());
        const serviceCategories = categories.filter(cat => cat.type === 'service');
        setAvailableCategories(serviceCategories.map(cat => cat.name));
      } catch (err) {
        console.error('Error fetching service categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch service owners from 'businesses' collection
  useEffect(() => {
    const fetchServiceOwners = async () => {
      try {
        const businessesCollection = collection(firebaseDB, 'businesses');
        const querySnapshot = await getDocs(businessesCollection);
        const owners = querySnapshot.docs
          .map(docPO => docPO.data())
          .map(owner => owner.name || owner.owner_name || owner.id);
        setAvailableServiceOwners(['SetLater', ...owners]);
      } catch (error) {
        console.error('Error fetching service owners:', error);
        setAvailableServiceOwners(['SetLater']);
      }
    };
    fetchServiceOwners();
  }, []);

  // Derived data
  const filteredServices = serviceList.filter((service: Service) =>
    service.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Left Section (Services Table) */}
        <Grid item xs={12} md={9}>
          {/* Add product button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Services
            </Typography>
            <Button
              variant="contained"
              color="warning"
              sx={{ textTransform: 'none' }}
              onClick={() => setOpen(true)}
            >
              Add Service
            </Button>
          </Box>

          {/* Dialog Start */}
          <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>Add Service</DialogTitle>
            <DialogContent>
              <TextField
                margin="dense"
                label="Service Name"
                name="service_name"
                fullWidth
                value={serviceData.service_name}
                onChange={handleChange}
              />
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="category-multiselect-label">Category</InputLabel>
                <Select
                  labelId="category-multiselect-label"
                  multiple
                  value={serviceData.category}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setServiceData({ ...serviceData, category: value.filter((v) => v) });
                  }}
                  open={categoryMenuOpen}
                  onClose={() => setCategoryMenuOpen(false)}
                  onOpen={() => setCategoryMenuOpen(true)}
                  renderValue={(selected) => (selected as string[]).join(', ')}
                  MenuProps={{
                    PaperProps: {
                      style: { maxHeight: 300 },
                    },
                    MenuListProps: {
                      sx: { p: 0 },
                    },
                  }}
                  label="Category"
                  required
                >
                             <MenuItem onClick={() => setCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                    Done
                  </MenuItem>
                  <MenuItem disabled divider />
                  {availableCategories.length === 0 ? (
                    <MenuItem disabled>No service categories found</MenuItem>
                  ) : (
                    availableCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {serviceData.category.includes(category) && (
                          <CheckIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                        )}
                        {category}
                      </MenuItem>
                    ))
                  )}
                  <MenuItem disabled divider />
                  <MenuItem onClick={() => setCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                    Done
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="Description"
                name="description"
                fullWidth
                value={serviceData.description}
                onChange={handleChange}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel id="service-owner-select-label">Service Owner</InputLabel>
                <Select
                  labelId="service-owner-select-label"
                  value={serviceData.service_owner}
                  onChange={(e) => {
                    setServiceData({ ...serviceData, service_owner: e.target.value });
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: { maxHeight: 300 },
                    },
                    MenuListProps: {
                      sx: { p: 0 },
                    },
                  }}
                  label="Service Owner"
                >
                  {availableServiceOwners.map((owner) => (
                    <MenuItem key={owner} value={owner}>
                      {owner}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAddService} variant="contained" color="primary">
                Submit
              </Button>
            </DialogActions>
          </Dialog>
          {/* Dialog End */}

          {/* Search bar */}
          <Paper sx={{ p: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                variant="outlined"
                fullWidth
                placeholder="Search services..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Search functionality is already handled by filteredServices
                  }
                }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <IconButton 
                      onClick={() => {
                        // Search functionality is already handled by filteredServices
                      }}
                      edge="end"
                    >
                      <Iconify icon="eva:search-fill" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          </Paper>

          {/* Service Table Start */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>THUMBNAIL</TableCell>
                  <TableCell>NAME</TableCell>
                  <TableCell>CATEGORIES</TableCell>
                  <TableCell>RATING</TableCell>
                  <TableCell>TOTAL REVIEWS</TableCell>
                  <TableCell>TOTAL VIEWS</TableCell>
                  <TableCell>STATUS</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow
                    hover
                    key={service.id}
                    onClick={() => handleSelectRow(service)}
                    style={{ cursor: 'pointer' }}
                  >
 <TableCell>   <img 
          src={service?.mainImage || '/placeholder.svg?height=300&width=600&text='}
          alt={service?.service_name}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '80%',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        /></TableCell>
 <TableCell>{service.service_name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {service.category?.map((cat, index) => (
                          <Chip
                            key={`${cat}-${index}`} // Add a unique key
                            label={cat}
                            size="small"
                            variant="outlined" // Optional: style the chip
                          />
                        ))}
                      </Box>
                    </TableCell>
                   
                    <TableCell>{service.total_reviews}</TableCell>
                    <TableCell>{service.total_views}</TableCell>
                    <TableCell>{service.total_views}</TableCell>
                    <TableCell>  <Chip
                        label={ service.isActive ? 'Active' : 'Inactive'}
                        color={service.isActive ? 'success' : 'error'}
                        size="small"
                      /></TableCell>
                    <TableCell align="right">
                      <IconButton color="primary">
                        <Iconify width={22} icon="eva:arrow-forward-fill" height="24" />
                      </IconButton>
                    </TableCell>
                  </TableRow>


                ))}
                {filteredServices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2">No services found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredServices.length}
              rowsPerPage={table.rowsPerPage}
              page={table.page}
              onPageChange={table.onChangePage}
              onRowsPerPageChange={table.onChangeRowsPerPage}
            />
          </TableContainer>
          {/* Service Table  End */}

        </Grid>

        {/* Right Section (Donut Chart & Stats) */}
        <Grid item xs={12} md={3} >
          <Paper sx={{ p: 2, borderRadius: 2, height: '100%' }} elevation={1}>
            <ServiceStats services={serviceList} />
          </Paper>
        </Grid>
      </Grid>
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
    </Box>
  );
}   // End of ServiceView