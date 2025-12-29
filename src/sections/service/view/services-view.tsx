// Recharts imports


import { useNavigate } from 'react-router-dom';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, getAuthToken } from 'src/utils/api';

import CheckIcon from '@mui/icons-material/Check';
import {
  Box,
  Grid,
  Chip,
  Paper,
  Table,
  Alert,
  Dialog,
  Button,
  Select,
  MenuItem, Snackbar,
  TableRow,
  TextField,
  TableHead,
  TableCell,
  TableBody,
  Typography,
  IconButton,
  InputLabel,
  DialogTitle,
  FormControl,
  DialogActions,
  DialogContent,
  TableContainer,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import ServiceStats from '../stats/service-stats';
// Firebase Firestore removed - migrating to Prisma API
// import { MenuItem } from '@mui/material';




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
  createdAt?: any; // Firestore Timestamp or Date
  updatedAt?: any; // Firestore Timestamp or Date
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


// Removed unused STATS constant



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
  const [serviceThumbnailFile, setServiceThumbnailFile] = useState<File | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
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
    // Defensive: Prevent submission if required fields are missing
    if (!serviceData.service_name || !serviceData.category.length) {
      setSnackbarMessage('Please fill all required fields.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsAddingService(true);
    try {
      // Check for duplicate service name (case-insensitive)
      const serviceNameLower = serviceData.service_name.trim().toLowerCase();
      
      // First check against current serviceList
      let hasDuplicate = serviceList.some((service) => {
        const existingName = service.service_name?.toLowerCase().trim();
        return existingName === serviceNameLower;
      });

      // If not found in list, double-check against API to be sure
      if (!hasDuplicate) {
        const searchResponse = await apiGet('/api/services', { search: serviceData.service_name });
        if (searchResponse.success && searchResponse.data) {
          hasDuplicate = searchResponse.data.some((s: any) => 
            (s.serviceName || s.name || '').toLowerCase().trim() === serviceNameLower
          );
        }
      }

      if (hasDuplicate) {
        const errorMsg = `Service name "${serviceData.service_name}" already exists! Please choose a different name.`;
        setDuplicateError(errorMsg);
        setSnackbarMessage(`❌ ${errorMsg}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsAddingService(false);
        return;
      }

      // Clear any previous duplicate errors
      setDuplicateError(null);

      // Upload thumbnail if provided
      let mainImageUrl = '';
      if (serviceThumbnailFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../../../firebaseConfig');
        const storageRef = ref(storage, `service_thumbnails/${Date.now()}_${serviceThumbnailFile.name}`);
        const snapshot = await uploadBytes(storageRef, serviceThumbnailFile);
        mainImageUrl = await getDownloadURL(snapshot.ref);
      }
      
      // Create a service data object to submit
      const serviceDataToSubmit: any = {
        serviceName: serviceData.service_name,
        categoryIds: serviceData.category,
        description: serviceData.description,
        isActive: true,
        mainImage: mainImageUrl,
        businessId: serviceData.service_owner === 'SetLater' ? undefined : serviceData.service_owner,
        serviceOwner: serviceData.service_owner === 'SetLater' ? undefined : serviceData.service_owner,
      };
      
      // Log the data being sent
      console.log('Adding service:', serviceDataToSubmit);
      
      const token = getAuthToken();
      const response = await apiPost('/api/services', serviceDataToSubmit, token);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create service');
      }
      
      console.log('Service added with ID:', response.data?.id);
      
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
      setServiceThumbnailFile(null);
      setDuplicateError(null); // Clear any duplicate errors
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
    } finally {
      setIsAddingService(false);
    }
  };


  // console.log('Selected List:', serviceList);
  
  // Helper function to get the most recent timestamp for a service
  const getMostRecentTimestamp = (service: Service): { timestamp: any; type: 'updated' | 'created' } => {
    if (service.updatedAt) {
      return { timestamp: service.updatedAt, type: 'updated' };
    }
    if (service.createdAt) {
      return { timestamp: service.createdAt, type: 'created' };
    }
    return { timestamp: null, type: 'created' };
  };

  // Helper function to convert Firestore timestamp to Date
  const convertToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    try {
      // Handle Firestore Timestamp objects
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        return timestamp.toDate();
      }
      // Handle JavaScript Date objects
      if (timestamp instanceof Date) {
        return timestamp;
      }
      // Handle string or number timestamps
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error('Error converting timestamp:', error, 'Value:', timestamp);
      return null;
    }
  };

  // Utility function to format dates in a readable way
  const formatReadableDate = (date: Date | string | any) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = convertToDate(date);
      if (!dateObj) {
        return 'N/A';
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - dateObj.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      }
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      }
      if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      }
      if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      }
      // For older dates, show the actual date
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'N/A';
    }
  };

  // Utility function to update service's updatedAt field
  // Note: Currently unused but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateServiceTimestamp = async (serviceId: string) => {
    try {
      // TODO: Migrate to API - PUT /api/services/:id
      // const response = await fetch(`/api/services/${serviceId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({ updatedAt: new Date().toISOString() }),
      // });
      console.warn('Service timestamp update not implemented - needs API migration');
      console.log(`Updated timestamp for service: ${serviceId}`);
    } catch (error) {
      console.error('Error updating service timestamp:', error);
    }
  };

  // TODO: Migrate to API - GET /api/services
  // const servicesCollection = useMemo(() => collection(firebaseDB, 'services'), []);

  // Update getServices with stable dependency
  const getServices = useCallback(async () => {
    try {
      const response = await apiGet('/api/services');
      let fetchedData: Service[] = [];
      
      if (response.success && response.data) {
        fetchedData = response.data.map((service: any) => ({
          id: service.id,
          service_name: service.serviceName || service.name || '',
          description: service.description || '',
          category: service.categoryIds || service.categories?.map((c: any) => c.id || c.name) || [],
          mainImage: service.mainImage || '',
          additionalImages: service.additionalImages || [],
          serviceOwner: service.businessId || service.serviceOwner || '',
          isActive: service.isActive !== false,
          createdAt: service.createdAt ? new Date(service.createdAt) : new Date(),
          updatedAt: service.updatedAt ? new Date(service.updatedAt) : undefined,
          views: service.views || 0,
          positive_reviews: service.positiveReviews || 0,
          neutral_reviews: service.neutralReviews || 0,
          total_reviews: service.totalReviews || 0,
        }));
      }
      
      // Sort by updatedAt descending (latest updated first) with fallback to createdAt
      fetchedData.sort((a, b) => {
        const dateA = convertToDate(a.updatedAt || a.createdAt);
        const dateB = convertToDate(b.updatedAt || b.createdAt);
        
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        
        return timeB - timeA;
      });
      
      console.log(`Fetched ${fetchedData.length} services`);
      setServiceList(fetchedData);
    } catch (err) {
      console.error('Error fetching services:', err);
      setServiceList([]);
    }
  }, []);

  // Update useEffect to run only once
  useEffect(() => {
    getServices();
    const fetchAllServiceComments = async () => {
      try {
        // Fetch comments for all services - we'll need to get service IDs first
        // For now, we'll fetch comments individually per service as needed
        // This is a placeholder - in production, you might want a bulk endpoint
        setServiceComments([]);
        return [];
      } catch (error) {
        console.error("Error fetching service comments:", error);
        return [];
      }
    };
    fetchAllServiceComments();
  }, [getServices]);

  // Fetch categories from API and filter by type 'service'
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiGet('/api/categories', { type: 'SERVICE' });
        if (response.success && response.data) {
          setAvailableCategories(response.data.map((cat: any) => cat.name));
        } else {
          setAvailableCategories([]);
        }
      } catch (err) {
        console.error('Error fetching service categories:', err);
        setAvailableCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch service owners from API
  useEffect(() => {
    const fetchServiceOwners = async () => {
      try {
        const response = await apiGet('/api/businesses');
        if (response.success && response.data) {
          const serviceOwners = response.data.map((biz: any) => ({
            id: biz.id,
            name: biz.name || biz.businessName || biz.id,
          }));
          
          // Remove duplicates by name, keeping the first occurrence
          const uniqueOwners = Array.from(
            new Map(serviceOwners.map((owner: any) => [owner.name, owner])).values()
          );
          setAvailableServiceOwners(['SetLater', ...uniqueOwners.map((owner: any) => owner.name)]);
        } else {
          setAvailableServiceOwners(['SetLater']);
        }
      } catch (error) {
        console.error('Error fetching service owners:', error);
        setAvailableServiceOwners(['SetLater']);
      }
    };
    fetchServiceOwners();
  }, []);

  // Derived data with search and category filtering
  const filteredServices = useMemo(() => serviceList.filter((service: Service) => {
    const matchesSearch = service.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || 
      (service.category && service.category.includes(selectedCategoryFilter));
    return matchesSearch && matchesCategory;
  }), [serviceList, searchTerm, selectedCategoryFilter]);

  // Pagination: Calculate paginated services
  const paginatedServices = useMemo(() => {
    const startIndex = table.page * table.rowsPerPage;
    const endIndex = startIndex + table.rowsPerPage;
    return filteredServices.slice(startIndex, endIndex);
  }, [filteredServices, table.page, table.rowsPerPage]);

  // Reset page when search term or category filter changes
  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategoryFilter]);

  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={3}>
        {/* Left Section (Services Table) */}
        <Grid item xs={12} md={9}>
          {/* Modern Top Section */}
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #FFD700 0%, #FF7E00 100%)',
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
                  Services
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
                      {serviceList.length}
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
                  Manage and organize your service offerings
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
                    getServices();
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
                  Add Service
                </Button>
              </Box>
            </Box>

            {/* Search and Filter Section */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5,
              width: '100%',
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <TextField
                variant="outlined"
                placeholder="Search services..."
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
              <FormControl 
                size="small"
                sx={{ 
                  minWidth: { xs: '100%', sm: 180 },
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
                <InputLabel 
                  id="service-category-filter-label"
                  sx={{ 
                    color: 'text.primary',
                    '&.Mui-focused': {
                      color: 'text.primary',
                    }
                  }}
                 />
                <Select
                  labelId="service-category-filter-label"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  label="Category"
                  sx={{
                    borderRadius: 2,
                    '& .MuiSelect-select': {
                      py: 1.25,
                    }
                  }}
                >
                  <MenuItem value="all">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Iconify icon="eva:grid-fill" width={18} />
                      All Categories
                    </Box>
                  </MenuItem>
                  {availableCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {/* Dialog Start */}
          <Dialog 
            open={open} 
            onClose={() => {
              setOpen(false);
              setDuplicateError(null); // Clear error when dialog closes
            }}
            fullWidth
            maxWidth="sm"
            PaperProps={{
              sx: {
                m: { xs: 1, sm: 2 },
                maxHeight: { xs: '95vh', sm: '90vh' },
                width: { xs: '100%', sm: 'auto' }
              }
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>Add Service</DialogTitle>
            <DialogContent sx={{ 
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              },
            }}>
              {duplicateError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDuplicateError(null)}>
                  {duplicateError}
                </Alert>
              )}
              <TextField
                margin="dense"
                label="Service Name"
                name="service_name"
                fullWidth
                required
                value={serviceData.service_name}
                onChange={(e) => {
                  handleChange(e as React.ChangeEvent<HTMLInputElement>);
                  setDuplicateError(null); // Clear error when user types
                }}
                error={!!duplicateError}
                helperText={duplicateError || 'Enter a unique service name'}
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
                  {availableServiceOwners.map((owner, index) => (
                    <MenuItem key={`${owner}-${index}`} value={owner}>
                      {owner}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Service Thumbnail</Typography>
                <Box sx={{ border: '1px dashed grey', p: { xs: 1, sm: 2 }, borderRadius: 1, textAlign: 'center' }}>
                  {serviceThumbnailFile || serviceData.mainImage ? (
                    <Box sx={{ position: 'relative', width: '100%', height: { xs: 200, sm: 300 }, mb: 1, overflow: 'hidden' }}>
                      <Box
                        component="img"
                        src={serviceThumbnailFile ? URL.createObjectURL(serviceThumbnailFile) : serviceData.mainImage}
                        alt="Service thumbnail"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 1,
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      />
                    </Box>
                  ) : (
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: { xs: 120, sm: 150 }, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: 'background.neutral',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        No image selected
                      </Typography>
                    </Box>
                  )}
                  
                  <input
                    accept="image/*"
                    type="file"
                    style={{ display: 'none' }}
                    id="service-thumbnail-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setServiceThumbnailFile(file);
                      }
                    }}
                  />
                  <label htmlFor="service-thumbnail-upload" style={{ width: '100%', display: 'block' }}>
                    <Button
                      variant="outlined"
                      component="span"
                      size="small"
                      fullWidth
                      startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                      sx={{ mt: 1 }}
                    >
                      {serviceThumbnailFile || serviceData.mainImage ? 'Change Image' : 'Upload Image'}
                    </Button>
                  </label>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 },
              px: { xs: 2, sm: 3 },
              pb: { xs: 2, sm: 2 }
            }}>
              <Button 
                onClick={() => setOpen(false)} 
                disabled={isAddingService}
                sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 2, sm: 1 } }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddService}
                variant="contained"
                color="primary"
                disabled={isAddingService}
                startIcon={isAddingService ? <CircularProgress color="inherit" size={20} /> : null}
                sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 1, sm: 2 } }}
              >
                {isAddingService ? 'Adding...' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>
          {/* Dialog End */}

          {/* Service Table Start */}
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 2, 
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              },
            }}
          >
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 100 }}>THUMBNAIL</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>NAME</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>CATEGORIES</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>TOTAL COMMENTS</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>POSITIVE REVIEWS</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>LAST MODIFIED</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>STATUS</TableCell>
                  <TableCell align="right" sx={{ minWidth: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedServices.map((service) => (
                  <TableRow
                    hover
                    key={service.id}
                    onClick={() => handleSelectRow(service)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box
                        sx={{
                          width: '100%',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.100',
                          position: 'relative'
                        }}
                      >
                        {service?.mainImage ? (
                          <img 
                            src={service.mainImage}
                            alt={service.service_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.setAttribute('style', 'display: flex');
                            }}
                          />
                        ) : null}
                        <Box
                          sx={{
                            display: service?.mainImage ? 'none' : 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            bgcolor: 'grey.200'
                          }}
                        >
                          <Iconify 
                            icon="eva:briefcase-fill" 
                            width={24} 
                            height={24} 
                            sx={{ color: 'grey.500', mb: 0.5 }}
                          />
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '0.7rem', textAlign: 'center' }}
                          >
                            No Image
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
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
                    <TableCell>
                      {serviceComments
                        .filter(comment => comment.parentId === service.id)
                        .length}
                    </TableCell>
                    <TableCell>
                      {serviceComments
                        .filter(comment => comment.parentId === service.id)
                        .filter(comment => comment.userSentiment === "Agree").length}
                    </TableCell>
                    <TableCell>
                      <Box>
                        {(() => {
                          const { timestamp, type } = getMostRecentTimestamp(service);
                          if (!timestamp) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                N/A
                              </Typography>
                            );
                          }
                          return (
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatReadableDate(timestamp)}
                              </Typography>
                              {type === 'created' && (
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                  (created)
                                </Typography>
                              )}
                            </Box>
                          );
                        })()}
                      </Box>
                    </TableCell>
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
                {paginatedServices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2">
                        {filteredServices.length === 0 ? 'No services found' : 'No services on this page'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredServices.length}
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
          </TableContainer>
          {/* Service Table  End */}

        </Grid>

        {/* Right Section (Donut Chart & Stats) */}
        <Grid item xs={12} md={3} sx={{ order: { xs: -1, md: 0 } }}>
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
}