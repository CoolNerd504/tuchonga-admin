import React, { useMemo, useState, useEffect, useCallback } from 'react';

import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import {
  Box,
  Tab,
  Grid,
  Chip,
  Card,
  Tabs,
  Paper,
  Alert,
  Table, Avatar,
  Dialog,
  Button,
  Select,
  Switch,
  Snackbar,
  TableRow,
  MenuItem,
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
  LinearProgress,
  TableContainer,
  TablePagination,
  FormControlLabel,
} from '@mui/material';
// import Iconify from 'src/components/iconify';
// import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import { useLocation, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, getAuthToken } from 'src/utils/api';

import CheckIcon from '@mui/icons-material/Check';

import { Iconify } from 'src/components/iconify';

// Firebase Firestore removed - migrating to Prisma API

// ----------------------------------------------------------------------
// Mock data types
// ----------------------------------------------------------------------


// Need to get Products by id from the backend

interface Product {
  id: string;
  product_name: string;
  category: string[];
  description: string;
  reviews: number;
  positive_reviews: number;
  total_reviews: number;
  total_views: number;
  comments: any[];
  isActive: boolean;
  productOwner: string;
  coverUrl?: string;
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
  service_owner: string

}
// ----------------------------------------------------------------------
// Styled Components
// ----------------------------------------------------------------------
const HeaderContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#FFE9D8', // Light peach background
  marginBottom: theme.spacing(2),
}));

// Removed unused styled components: CompanyStatsContainer, RatingLine
const StatItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));



  // ----------------------------------------------------------------------
  // TABLE Funcionality Component
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


}


/**
 * BusinessDetail displays and manages the details and editing of a business, including products and services.
 * Handles Firestore integration, dialogs, and UI for business management.
 */
export function BusinessDetail({ onUpdate }: { onUpdate?: () => void }) {
  const location = useLocation();
  const business = location.state?.business;
  const serviceList = location.state?.serviceList;
  const productList = location.state?.productList;
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [openAddProduct, setOpenAddProduct] = useState(false); // State to control dialog visibility
  const [openAddService, setOpenAddService] = useState(false); // State to control dialog visibility
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const table = useTable();
  const navigate = useNavigate();
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  // const [serviceList, setServiceList] = useState<Service[]>([]);


  // Add this near the top of the component with other state declarations
const [localProductList, setLocalProductList] = useState<Product[]>([]);
const [localServiceList, setLocalServiceList] = useState<Service[]>([]);
const [productThumbnailFile, setProductThumbnailFile] = useState<File | null>(null);
const [loadingProducts, setLoadingProducts] = useState(false);
const [loadingServices, setLoadingServices] = useState(false);

  const [productData, setProductData] = useState<Product>({
    id: '',
    product_name: '',
    category: [],
    description: '',
    reviews: 0,
    positive_reviews: 0,
    total_reviews: 0,
    total_views: 0,
    comments: [],
    isActive: true,
    productOwner: '',
    coverUrl: '',
  });

  const [serviceData, setServiceData] = useState<Service>({
    id: '',
    service_name: '',
    category: [],
    description: '',
    reviews: 0,
    positive_reviews: 0,
    total_reviews: 0,
    total_views: 0,
    comments: [],
    isActive: true,
    service_owner: business.id,
  });
   // Row selection  navigation 
  const handleSelectProductRow = (product: Product) => {
    navigate(`/products/${product?.id}`, { state: { product } });
  }


  const handleProductChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'category') {
      // Split the comma-separated values into an array
      const categoryArray = value.split(',').map(item => item.trim());
      setProductData({ ...productData, [name]: categoryArray });
    } else {
      setProductData({ ...productData, [name]: value });
    }
  };

  const handleServiceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'category') {
      // Split the comma-separated values into an array
      const categoryArray = value.split(',').map(item => item.trim());
      setServiceData({ ...serviceData, [name]: categoryArray });
    } else {
      setServiceData({ ...serviceData, [name]: value });
    }
  };

  const handleSelectServiceRow = (service: Service) => {
    navigate(`/services/${service?.id}`, { state: { service } });
  }
  // Fetch products and services for this business from API
  useEffect(() => {
    if (!business?.id) return;

    const fetchBusinessProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await apiGet(`/api/businesses/${business.id}/products`, { limit: 1000 });
        if (response.success && response.data) {
          const products = response.data.map((prod: any) => {
            // Extract category names from nested structure: categories[].category.name
            // The API returns: { categories: [{ category: { id, name } }] }
            let categoryNames: string[] = [];
            if (prod.categories && Array.isArray(prod.categories)) {
              categoryNames = prod.categories
                .map((c: any) => c.category?.name || c.category?.id || c.name || c.id)
                .filter((name: string) => name); // Remove any undefined/null values
            } else if (prod.categoryIds && Array.isArray(prod.categoryIds)) {
              // Fallback to categoryIds if categories structure not available
              categoryNames = prod.categoryIds;
            }
            
            return {
              id: prod.id,
              product_name: prod.productName || prod.name || '',
              description: prod.description || '',
              category: categoryNames,
              mainImage: prod.mainImage || '',
              additionalImages: prod.additionalImages || [],
              productOwner: prod.businessId || prod.productOwner || business.id,
              isActive: prod.isActive !== false,
              reviews: prod.totalReviews || 0,
              positive_reviews: prod.positiveReviews || 0,
              total_reviews: prod.totalReviews || 0,
              total_views: prod.totalViews || 0,
              comments: prod.comments || [],
              coverUrl: prod.mainImage || '',
            };
          });
          setLocalProductList(products);
        }
      } catch (err) {
        console.error('Error fetching business products:', err);
        setLocalProductList([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    const fetchBusinessServices = async () => {
      setLoadingServices(true);
      try {
        const response = await apiGet(`/api/businesses/${business.id}/services`, { limit: 1000 });
        if (response.success && response.data) {
          const services = response.data.map((serv: any) => {
            // Extract category names from nested structure: categories[].category.name
            // The API returns: { categories: [{ category: { id, name } }] }
            let categoryNames: string[] = [];
            if (serv.categories && Array.isArray(serv.categories)) {
              categoryNames = serv.categories
                .map((c: any) => c.category?.name || c.category?.id || c.name || c.id)
                .filter((name: string) => name); // Remove any undefined/null values
            } else if (serv.categoryIds && Array.isArray(serv.categoryIds)) {
              // Fallback to categoryIds if categories structure not available
              categoryNames = serv.categoryIds;
            }
            
            return {
              id: serv.id,
              service_name: serv.serviceName || serv.name || '',
              description: serv.description || '',
              category: categoryNames,
              mainImage: serv.mainImage || '',
              additionalImages: serv.additionalImages || [],
              service_owner: serv.businessId || serv.serviceOwner || business.id,
              isActive: serv.isActive !== false,
              reviews: serv.totalReviews || 0,
              positive_reviews: serv.positiveReviews || 0,
              total_reviews: serv.totalReviews || 0,
              total_views: serv.totalViews || 0,
              comments: serv.comments || [],
            };
          });
          setLocalServiceList(services);
        }
      } catch (err) {
        console.error('Error fetching business services:', err);
        setLocalServiceList([]);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchBusinessProducts();
    fetchBusinessServices();
  }, [business?.id]);

  
  const [productDialogLoading, setProductDialogLoading] = useState(false);
  const [serviceDialogLoading, setServiceDialogLoading] = useState(false);

  const handleOpenAddProduct = useCallback(() => {
    setProductData(prev => ({
      ...prev,
      productOwner: business.id || '',
    }));
    setOpenAddProduct(true);
  }, [business]);

  const handleAddProduct = useCallback(async () => {
    setProductDialogLoading(true);
    // Defensive: Prevent submission if required fields are missing
    if (!business?.id || !productData.product_name || productData.category.length === 0) {
      setSnackbarMessage('Please fill all required fields and ensure business is selected.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setProductDialogLoading(false);
      return;
    }
    try {
      // Log business and productData for debugging
      console.log('Adding product with business:', business);
      console.log('Product data:', productData);
      
      // Create a product data object to submit
      const productDataToSubmit: any = {
        product_name: productData.product_name,
        category: productData.category,
        description: productData.description,
        reviews: 0,
        positive_reviews: 0,
        total_reviews: 0,
        total_views: 0,
        comments: [],
        isActive: true,
        productOwner: business.id
      };
      
      // Upload thumbnail if provided
      if (productThumbnailFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../../../firebaseConfig');
        const storageRef = ref(storage, `product_thumbnails/${Date.now()}_${productThumbnailFile.name}`);
        const snapshot = await uploadBytes(storageRef, productThumbnailFile);
        const url = await getDownloadURL(snapshot.ref);
        productDataToSubmit.coverUrl = url;
      }
      
      const token = getAuthToken();
      const response = await apiPost('/api/products', {
        productName: productDataToSubmit.product_name,
        categoryIds: productDataToSubmit.category,
        description: productDataToSubmit.description,
        mainImage: productDataToSubmit.coverUrl || '',
        businessId: business.id,
        productOwner: business.id,
        isActive: true,
      }, token);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create product');
      }

      const newProduct = {
        ...productData,
        id: response.data?.id || 'temp-id',
        productOwner: business.id,
        coverUrl: productDataToSubmit.coverUrl || ''
      };
      setLocalProductList((prev: Product[]) => [...prev, newProduct]);
      
      // Reset form and close dialog
      setProductData({
        id: '',
        product_name: '',
        category: [],
        description: '',
        reviews: 0,
        positive_reviews: 0,
        total_reviews: 0,
        total_views: 0,
        comments: [],
        isActive: true,
        productOwner: business.id || '',
        coverUrl: ''
      });
      setProductThumbnailFile(null);
      setOpenAddProduct(false);
      
      // Call onUpdate if provided
      if (onUpdate) {
        await onUpdate();
      }
      
      setSnackbarMessage('Product added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error('Error adding product:', error);
      setSnackbarMessage(`Failed to add product: ${error?.message || 'Unknown error'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setProductDialogLoading(false);
    }
  }, [productData, productThumbnailFile, onUpdate, business]); // Removed productsCollection dependency
  // TODO: Migrate to API - GET /api/services?businessId=:id
  // const servicesCollection = useMemo(() => collection(firebaseDB, 'services'), []);

  // Update getServices with stable dependency
  // const getServices = useCallback(async () => {
  //   try {
  //     const querySnapshot = await getDocs(servicesCollection);
  //     const fetchedData: Service[] = querySnapshot.docs.map((doc) => {
  //       const docData = doc.data() as Omit<Service, 'id'>;
  //       return {
  //         ...docData,
  //         id: doc.id,
  //       };
  //     });
  //     setServiceList(fetchedData);
  //   } catch (err) {
  //     console.error('Error fetching services:', err);
  //   }
  // }, [servicesCollection]);

  const handleAddService = useCallback(async () => {
    setServiceDialogLoading(true);
    try {
      const token = getAuthToken();
      const response = await apiPost('/api/services', {
        serviceName: serviceData.service_name,
        categoryIds: serviceData.category,
        description: serviceData.description,
        businessId: business.id,
        serviceOwner: business.id,
        isActive: true,
      }, token);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create service');
      }

      const newService = {
        ...serviceData,
        id: response.data?.id || 'temp-id',
        service_owner: business.id
      };
    setLocalServiceList((prev: Service[]) => [...prev, newService]);
    
      setServiceData({
        id: '',
        service_name: '',
        category: [],
        description: '',
        reviews: 0,
        positive_reviews: 0,
        total_reviews: 0,
        total_views: 0,
        comments: [],
        isActive: true,
        service_owner: business.id
      });
      setOpenAddService(false);

      // Call onUpdate if provided
      if (onUpdate) {
        await onUpdate();
      }

      setSnackbarMessage('Service added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error adding service:", error);
      setSnackbarMessage('Failed to add service.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setServiceDialogLoading(false);
    }
  }, [serviceData, onUpdate, business]); // Removed servicesCollection dependency

 
  // Update the filtering logic near the top of the component

  // const filteredProducts = productList.filter((prod: Product) =>
  //   prod.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  // );


  // const filteredProducts = productList ? 
  //   productList.filter((product: Product) =>
  //     product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
  //     product.productOwner === business.id
  //   ) : [];

    const filteredProducts = localProductList ? 
  localProductList.filter((product: Product) =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredServices = localServiceList ?
  localServiceList.filter((service: Service) =>
    service.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Add calculations here, before the business check
  const totalViews = [...filteredProducts, ...filteredServices].reduce(
    (sum, item) => sum + item.total_views, 0
  );
  
  const totalReviews = [...filteredProducts, ...filteredServices].reduce(
    (sum, item) => sum + item.total_reviews, 0
  );
  
  const averageReviews = totalReviews > 0 
    ? [...filteredProducts, ...filteredServices].reduce(
        (sum, item) => sum + (item.total_reviews / item.total_reviews), 0
      ) / ([...filteredProducts, ...filteredServices].length || 1)
    : 0;

  const [availableProductCategories, setAvailableProductCategories] = useState<string[]>([]);
  const [availableServiceCategories, setAvailableServiceCategories] = useState<string[]>([]);
  const [productCategoryMenuOpen, setProductCategoryMenuOpen] = useState(false);
  const [serviceCategoryMenuOpen, setServiceCategoryMenuOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiGet('/api/categories');
        if (response.success && response.data) {
          const categories = response.data;
          setAvailableProductCategories(categories.filter((cat: any) => cat.type === 'PRODUCT' || cat.type === 'product').map((cat: any) => cat.name));
          setAvailableServiceCategories(categories.filter((cat: any) => cat.type === 'SERVICE' || cat.type === 'service').map((cat: any) => cat.name));
          console.log('Fetched service categories:', categories.filter((cat: any) => cat.type === 'SERVICE' || cat.type === 'service'));
        } else {
          setAvailableProductCategories([]);
          setAvailableServiceCategories([]);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setAvailableProductCategories([]);
        setAvailableServiceCategories([]);
      }
    };
    fetchCategories();
  }, []);

  const [editBusiness, setEditBusiness] = useState(business ? { ...business } : {});
  const [isUpdatingBusiness, setIsUpdatingBusiness] = useState(false);
  const [editSnackbar, setEditSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleEditBusinessChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditBusiness((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleUpdateBusiness = async () => {
    setIsUpdatingBusiness(true);
    try {
      const businessDataToUpdate = { ...editBusiness };

      if (logoFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../../../firebaseConfig');
        const storageRef = ref(storage, `business_logos/${Date.now()}_${logoFile.name}`);
        const snapshot = await uploadBytes(storageRef, logoFile);
        const url = await getDownloadURL(snapshot.ref);
        businessDataToUpdate.logo = url;
      }
      console.log('Updating business with payload:', businessDataToUpdate);
      
      const token = getAuthToken();
      const response = await apiPut(`/api/businesses/${business.id}`, {
        name: businessDataToUpdate.name,
        email: businessDataToUpdate.business_email,
        phone: businessDataToUpdate.business_phone,
        location: businessDataToUpdate.location,
        logo: businessDataToUpdate.logo,
        isVerified: businessDataToUpdate.isVerified,
        pocFirstName: businessDataToUpdate.poc_firstname,
        pocLastName: businessDataToUpdate.poc_lastname,
        pocPhone: businessDataToUpdate.poc_phone,
      }, token);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update business');
      }
      setEditSnackbar({ open: true, message: 'Business updated successfully!', severity: 'success' });
    } catch (err) {
      setEditSnackbar({ open: true, message: 'Failed to update business.', severity: 'error' });
    } finally {
      setIsUpdatingBusiness(false);
    }
  };

  if (!business) {
    console.log(location)
    return <div>No business data found.</div>;
  }

  return (
    <Box sx={{ p: 4 }}>
      {/** Header section */}

      {/* Product Dialog */}
      <Dialog open={openAddProduct} onClose={() => setOpenAddProduct(false)}>
        <DialogTitle>Add Product</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Product Name"
            name="product_name"
            fullWidth
            value={productData.product_name}
            onChange={handleProductChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="product-category-multiselect-label">Category</InputLabel>
            <Select
              labelId="product-category-multiselect-label"
              multiple
              value={productData.category}
              onChange={e => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                setProductData({ ...productData, category: value.filter((v: string) => v) });
              }}
              open={productCategoryMenuOpen}
              onClose={() => setProductCategoryMenuOpen(false)}
              onOpen={() => setProductCategoryMenuOpen(true)}
              renderValue={selected => (selected as string[]).join(', ')}
              MenuProps={{
                PaperProps: { style: { maxHeight: 300 } },
                MenuListProps: { sx: { p: 0 } },
              }}
              label="Category"
            >
              <MenuItem onClick={() => setProductCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                Done
              </MenuItem>
                 <MenuItem disabled divider />
              {availableProductCategories.map(category => (
                <MenuItem key={category} value={category}>
                  {productData.category.includes(category) && (
                    <CheckIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                  )}
                  {category}
                </MenuItem>
              ))}
                 <MenuItem disabled divider />
                         <MenuItem onClick={() => setProductCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                Done
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Description"
            name="description"
            fullWidth
            value={productData.description}
            onChange={handleProductChange}
          />
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Product Thumbnail</Typography>
            <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1, textAlign: 'center' }}>
              {productThumbnailFile || productData.coverUrl ? (
                <Box sx={{ position: 'relative', width: '100%', height: 150, mb: 1 }}>
                  <Box
                    component="img"
                    src={productThumbnailFile ? URL.createObjectURL(productThumbnailFile) : productData.coverUrl}
                    alt="Product thumbnail"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: 1,
                    }}
                  />
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 150, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'background.neutral',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No image selected
                  </Typography>
                </Box>
              )}
              
              <input
                accept="image/*"
                type="file"
                style={{ display: 'none' }}
                id="product-thumbnail-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setProductThumbnailFile(file);
                  }
                }}
              />
              <label htmlFor="product-thumbnail-upload">
                <Button
                  variant="outlined"
                  component="span"
                  size="small"
                  startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                >
                  {productThumbnailFile || productData.coverUrl ? 'Change Image' : 'Upload Image'}
                </Button>
              </label>
            </Box>
          </Box>
   
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddProduct(false)}>Cancel</Button>
          <Button
            onClick={handleAddProduct}
            variant="contained"
            color="primary"
            disabled={productDialogLoading || !productData.product_name || productData.category.length === 0 || !business.id}
            startIcon={productDialogLoading ? <LinearProgress color="inherit" sx={{ width: 20 }} /> : null}
          >
            {productDialogLoading ? 'Adding...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={openAddService} onClose={() => setOpenAddService(false)}>
        <DialogTitle>Add Service</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Service Name"
            name="service_name"
            fullWidth
            value={serviceData.service_name}
            onChange={handleServiceChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="service-category-multiselect-label">Category</InputLabel>
            <Select
              labelId="service-category-multiselect-label"
              multiple
              value={serviceData.category}
              onChange={e => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                setServiceData({ ...serviceData, category: value.filter((v: string) => v) });
              }}
              open={serviceCategoryMenuOpen}
              onClose={() => setServiceCategoryMenuOpen(false)}
              onOpen={() => setServiceCategoryMenuOpen(true)}
              renderValue={selected => (selected as string[]).join(', ')}
              MenuProps={{
                PaperProps: { style: { maxHeight: 300 } },
                MenuListProps: { sx: { p: 0 } },
              }}
              label="Category"
            >
              <MenuItem onClick={() => setServiceCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                Done
              </MenuItem>
                        <MenuItem disabled divider />
              {availableServiceCategories.length === 0 ? (
                <MenuItem disabled>No service categories found</MenuItem>
              ) : (
                availableServiceCategories.map(category => (
                  <MenuItem key={category} value={category}>
                    {serviceData.category.includes(category) && (
                      <CheckIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                    )}
                    {category}
                  </MenuItem>
                ))
              )}
              <MenuItem disabled divider />
              <MenuItem onClick={() => setServiceCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
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
            onChange={handleServiceChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddService(false)}>Cancel</Button>
          <Button
            onClick={handleAddService}
            variant="contained"
            color="primary"
            disabled={serviceDialogLoading || !serviceData.service_name || serviceData.category.length === 0}
            startIcon={serviceDialogLoading ? <LinearProgress color="inherit" sx={{ width: 20 }} /> : null}
          >
            {serviceDialogLoading ? 'Adding...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <HeaderContainer elevation={0} sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Logo and Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', width: '30%' }}>
          <Avatar
            variant="square"
            src={business.logo || 'https://via.placeholder.com/200x200.png?text=Logo'}
            alt={business.name}
            sx={{ width: 80, height: 80, borderRadius: 2, mr: 2 }}
          />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {business.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {business.location}
            </Typography>
          </Box>
        </Box>
        {/* Point of Contact */}
        <Box sx={{ width: '20%', px: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            Point Of Contact
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {(business.poc_firstname || business.poc_lastname) ? `${business.poc_firstname || ''} ${business.poc_lastname || ''}`.trim() : 'Not set'}
            </Typography>
            <Typography variant="body2">
              {business.poc_phone ? business.poc_phone : 'Not set'}
            </Typography>
            <Typography variant="body2">
              {business.poc_email ? business.poc_email : 'Not set'}
            </Typography>
          </Box>
        </Box>
        {/* Stats */}
        <Card sx={{ width: '30%', p: 2, bgcolor: '#FFF7ED', boxShadow: 0 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Business Stats
          </Typography>
          <StatItem>
            <Typography variant="body2" sx={{ width: 120 }}>Total Views</Typography>
            <Chip label={totalViews} color="primary" size="small" />
          </StatItem>
          <StatItem>
            <Typography variant="body2" sx={{ width: 120 }}>Total Reviews</Typography>
            <Chip label={totalReviews} color="secondary" size="small" />
          </StatItem>
          <StatItem>
            <Typography variant="body2" sx={{ width: 120 }}>Review Avg</Typography>
            <Chip label={`${(averageReviews * 100).toFixed(1)}%`} color="success" size="small" />
          </StatItem>
        </Card>
      </HeaderContainer>
      

      {/** Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .Mui-selected': {
              color: '#FF7E00 !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF7E00',
            },
          }}
        >
          <Tab 
            label="Products"
            icon={<Iconify width={22} icon="solar:box-bold" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label="Services"
            icon={<Iconify width={22} icon="ri:service-fill" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label="Edit Business Owner"
            icon={<Iconify width={22} icon="eva:edit-fill" height={22} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/** Tab Panels */}
      {activeTab === 0 && (
        <Box sx={{ pt: 3 }}>
          {loadingProducts && <LinearProgress sx={{ mb: 2 }} />}


          {/* Dialog Start */}
          <Dialog open={openAddService} onClose={() => setOpenAddService(false)}>
            <DialogTitle>Add Service</DialogTitle>
            <DialogContent>
              <TextField
                margin="dense"
                label="Service Name"
                name="service_name"
                fullWidth
                value={serviceData.service_name}
                onChange={handleServiceChange}
              />
              <TextField
                margin="dense"
                label="Category (comma-separated)"
                name="category"
                fullWidth
                value={serviceData.category.join(', ')}
                onChange={handleServiceChange}
                helperText="Enter categories separated by commas"
              />
              <TextField
                margin="dense"
                label="Description"
                name="description"
                fullWidth
                value={serviceData.description}
                onChange={handleServiceChange}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAddService(false)}>Cancel</Button>
              <Button onClick={handleAddService} variant="contained" color="primary">
                Submit
              </Button>
            </DialogActions>
          </Dialog>
          {/* Dialog End */}
          {/* Search + Add Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2  , justifyContent: 'space-between',}}>
            <TextField
              placeholder="Search"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{  flex: 1, mr: 2,}}
            />
            <Button variant="contained" color="warning" sx={{ textTransform: 'none' }} onClick={handleOpenAddProduct}>
              Add Product
            </Button>
          </Box>

          {/* Table */}
          <TableContainer component={Paper}>
            <Table>
            <TableHead>
                <TableRow>
                  <TableCell>NAME</TableCell>
                  <TableCell>CATEGORIES</TableCell>
                  <TableCell>RATING</TableCell>
                  <TableCell>TOTAL REVIEWS</TableCell>
                  <TableCell>TOTAL VIEWS</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product: Product) => (
                  <TableRow
                    hover
                    key={product.id}
                    onClick={() => handleSelectProductRow(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box>
                          <Typography variant="body1">{product.product_name}</Typography>
                   
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>       <Typography variant="caption" color="text.secondary">
                            {product.category.map((cat, idx) => (
                              <Chip key={cat + idx} label={cat} size="small" />
                            ))}
                          </Typography></TableCell>
                    <TableCell>{product.product_name}</TableCell>
                    <TableCell>{product.total_reviews}</TableCell>
                    <TableCell>{product.total_views}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton color="primary">
                          <Iconify width={22} icon="eva:arrow-forward-fill" height={24} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2">No products found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

                        {/* Pagination */}
                        <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredProducts.length}
              rowsPerPage={table.rowsPerPage}
              page={table.page}
              onPageChange={table.onChangePage}
              onRowsPerPageChange={table.onChangeRowsPerPage}
            />
          </TableContainer>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ pt: 3 }}>
          {loadingServices && <LinearProgress sx={{ mb: 2 }} />}
          {/* Services Tab */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search Services"
              variant="outlined"
              size="small"
              sx={{ mr: 2,  flex: 1 }}
            />
            <Button 
              variant="contained" 
              color="warning" 
              sx={{ textTransform: 'none' }} 
              onClick={() => setOpenAddService(true)}
            >
              Add Service
            </Button>
          </Box>

          {/* Potential services table or content */}
            {/* Service Table Start */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>NAME</TableCell>
                  <TableCell>CATEGORIES</TableCell>
                  <TableCell>RATING</TableCell>
                  <TableCell>TOTAL REVIEWS</TableCell>
                  <TableCell>TOTAL VIEWS</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service: Service) => (
                  <TableRow
                    hover
                    key={service.id}
                    onClick={() => handleSelectServiceRow(service)}
                    style={{ cursor: 'pointer' }}
                  >

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* <Avatar
                            src={service.logo}
                            alt={service.service_name}
                            sx={{ width: 40, height: 40 }}
                          /> */}
                        <Box>
                          <Typography variant="body1">{service.service_name}</Typography>
                        
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>  <Typography variant="caption" color="text.secondary">
                            {service.category.map((cat, idx) => (
                              <Chip key={cat + idx} label={cat} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </Typography></TableCell>
                          <TableCell>{service.service_name}</TableCell>
                    <TableCell>{service.total_reviews}</TableCell>
                    <TableCell>{service.total_views}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton color="primary">
                          <Iconify width={22} icon="eva:arrow-forward-fill" height={24} />
                        </IconButton>
                      </Tooltip>
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
   
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>Business Logo</Typography>
                <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1, mb: 2, textAlign: 'center' }}>
                  <input
                    accept="image/*"
                    type="file"
                    style={{ display: 'none' }}
                    id="logo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        setEditBusiness((prev: any) => ({ ...prev, logo: URL.createObjectURL(file) }));
                      }
                    }}
                  />
                  <Box
                    component="label"
                    htmlFor="logo-upload"
                    sx={{ cursor: 'pointer', display: 'inline-block' }}
                  >
                    {editBusiness.logo ? (
                      <img
                        src={editBusiness.logo}
                        alt="Business Logo"
                        style={{ maxWidth: '200px', height: 'auto', marginBottom: 8 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Click to upload logo</Typography>
                    )}
                    <Button variant="outlined" sx={{ mt: 1 }}>Upload Logo</Button>
                  </Box>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>Business Details</Typography>
                {isUpdatingBusiness && <LinearProgress sx={{ mb: 2 }} />}
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Business Name"
                      name="name"
                      value={editBusiness.name || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Business Email"
                      name="business_email"
                      value={editBusiness.business_email || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Business Phone"
                      name="business_phone"
                      value={editBusiness.business_phone || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Location"
                      name="location"
                      value={editBusiness.location || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!editBusiness.isVerified}
                          onChange={e => setEditBusiness((prev: any) => ({ ...prev, isVerified: e.target.checked }))}
                          name="isVerified"
                        />
                      }
                      label="Verified"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!editBusiness.status}
                          onChange={e => setEditBusiness((prev: any) => ({ ...prev, status: e.target.checked }))}
                          name="status"
                        />
                      }
                      label="Active Status"
                    />
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>Point of Contact (POC) Info</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="POC First Name"
                      name="poc_firstname"
                      value={editBusiness.poc_firstname || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="POC Last Name"
                      name="poc_lastname"
                      value={editBusiness.poc_lastname || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="POC Phone"
                      name="poc_phone"
                      value={editBusiness.poc_phone || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="POC Email"
                      name="poc_email"
                      value={editBusiness.poc_email || ''}
                      onChange={handleEditBusinessChange}
                    />
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpdateBusiness}
                disabled={isUpdatingBusiness}
                startIcon={isUpdatingBusiness ? <LinearProgress color="inherit" sx={{ width: 20 }} /> : null}
              >
                {isUpdatingBusiness ? 'Updating...' : 'Update Business'}
              </Button>
            </Grid>
          </Grid>
          <Snackbar
            open={editSnackbar.open}
            autoHideDuration={6000}
            onClose={() => setEditSnackbar({ ...editSnackbar, open: false })}
          >
            <Alert
              onClose={() => setEditSnackbar({ ...editSnackbar, open: false })}
              severity={editSnackbar.severity}
              sx={{ width: '100%' }}
            >
              {editSnackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      )}
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