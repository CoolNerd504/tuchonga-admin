import { useNavigate } from 'react-router-dom';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from 'src/utils/api';

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
  TableRow,
  MenuItem,
  Snackbar,
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

import ProductStats from '../stats/product-stats';
// Firebase Firestore removed - migrating to Prisma API
// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------


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
  mainImage: string;
  additionalImages: string[];
  productOwner: string
  createdAt?: any; // Firestore Timestamp or Date
  updatedAt?: any; // Firestore Timestamp or Date
}

// Interface for a Comment that can belong to a Product or a Service
// Supports both mobile app schema (itemId/itemType) and legacy schema (parentId/parentType)
interface ProductOrServiceComment {
  id: string; // Unique identifier for the comment
  itemId?: string; // Mobile app schema: The ID of the parent entity (Product or Service)
  itemType?: 'product' | 'service'; // Mobile app schema: lowercase type
  parentId?: string | null; // Legacy schema: The ID of the parent entity (Product or Service) or reply parent
  parentType?: "Product" | "Service"; // Legacy schema: Indicates whether parentId refers to a Product or a Service
  depth?: number; // Threading depth (0 = root, 1-2 = replies)
  userId: string; // The ID of the user who posted the comment
  userName: string; // The name of the user who posted the comment
  userAvatar?: string; // User avatar URL
  text: string; // The content of the comment
  timestamp?: Date; // When the comment was posted (legacy)
  createdAt?: Date; // When the comment was created (mobile app)
  updatedAt?: Date; // When the comment was last updated
  isDeleted?: boolean; // Whether the comment is deleted
  isEdited?: boolean; // Whether the comment has been edited
  isReported?: boolean; // Whether the comment has been reported
  agreeCount?: number; // Number of agree reactions
  disagreeCount?: number; // Number of disagree reactions
  replyCount?: number; // Number of replies
  // Field for user-expressed sentiment
  userSentiment?: "Disagree" | "neutral" | "Agree"; // The user's sentiment/agreement level
  // Fields for sentiment history
  sentimentHistory?: UserAgreementLevelHistoryEntry[]; // Updated: Array to store previous user sentiment/agreement values and timestamps
}

interface UserAgreementLevelHistoryEntry {
  userSentiment: "Disagree" | "neutral" | "Agree"; // The previous user sentiment/agreement value
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
 * ProductsView displays and manages the list of products, including add, edit, and category selection.
 * Handles Firestore integration, product comments, and UI for product management.
 */
export function ProductsView() {
  // Add this near the other state declarations
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [productComments, setProductComments] = useState<ProductOrServiceComment[]>([]);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [availableProductOwners, setAvailableProductOwners] = useState<string[]>([]);
  
  // TODO: Migrate to API - GET /api/products
  // const productsCollection = useMemo(() => collection(firebaseDB, 'products'), []);
  
  // Add this after other useEffects
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiGet('/api/categories', { type: 'PRODUCT' });
        if (response.success && response.data) {
          // Store both ID and name for categories
          const categories = response.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
          }));
          setAvailableCategories(categories);
        } else {
          setAvailableCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setAvailableCategories([]);
      }
    };

    const fetchProductOwners = async () => {
      try {
        const response = await apiGet('/api/businesses');
        if (response.success && response.data) {
          const productOwners = response.data.map((biz: any) => ({
            id: biz.id,
            name: biz.name || biz.businessName || '',
          }));
          // Remove duplicates by name, keeping the first occurrence
          const uniqueOwners = Array.from(
            new Map(productOwners.map((owner: any) => [owner.name, owner])).values()
          ) as any[];
          setAvailableProductOwners(['SetLater', ...uniqueOwners.map((owner: any) => owner.name)]);
        } else {
          setAvailableProductOwners(['SetLater']);
        }
      } catch (error) {
        console.error('Error fetching product owners:', error);
        setAvailableProductOwners(['SetLater']); // Fallback to just SetLater
      }
    };

    fetchCategories();
    fetchProductOwners();
  }, []);

  // Product list from Firestore
  const [productList, setProductList] = useState<Product[]>([]);
  const [productThumbnailFile, setProductThumbnailFile] = useState<File | null>(null);
  const [productData, setProductData] = useState<Product>({
    id: '',
    product_name: '',
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
    productOwner: 'SetLater',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const table = useTable();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // State to control dialog visibility
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Firestore collection reference
  // const productsCollection = collection(firebaseDB, 'products');
  const handleSelectRow = (product: Product) => {
    navigate(`/products/${product?.id}`, { state: { product } });
  }


  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'category') {
      // Split the comma-separated values into an array
      const categoryArray = value.split(',').map(item => item.trim());
      setProductData({ ...productData, [name]: categoryArray });
    } else {
      setProductData({ ...productData, [name]: value });
    }
  };


  // Get All Products     

  const handleAddProduct = async () => {
    // Defensive: Prevent submission if required fields are missing
    if (!productData.product_name || !productData.category.length) {
      setSnackbarMessage('Please fill all required fields.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsAddingProduct(true);
    try {
      // Check for duplicate product name (case-insensitive)
      const productNameLower = productData.product_name.trim().toLowerCase();
      
      // First check against current productList
      let hasDuplicate = productList.some((product) => {
        const existingName = product.product_name?.toLowerCase().trim();
        return existingName === productNameLower;
      });

      // If not found in list, double-check against API to be sure
      if (!hasDuplicate) {
        try {
          const response = await apiGet('/api/products', { search: productData.product_name });
          if (response.success && response.data) {
            hasDuplicate = response.data.some((p: any) => 
              (p.productName || p.name || '').toLowerCase().trim() === productNameLower
            );
          }
        } catch (error) {
          console.error('Error checking duplicate product name:', error);
        }
      }

      if (hasDuplicate) {
        const errorMsg = `Product name "${productData.product_name}" already exists! Please choose a different name.`;
        setDuplicateError(errorMsg);
        setSnackbarMessage(`❌ ${errorMsg}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsAddingProduct(false);
        return;
      }

      // Clear any previous duplicate errors
      setDuplicateError(null);

      // Upload thumbnail if provided
      let mainImageUrl = '';
      if (productThumbnailFile) {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../../../firebaseConfig');
        const storageRef = ref(storage, `product_thumbnails/${Date.now()}_${productThumbnailFile.name}`);
        const snapshot = await uploadBytes(storageRef, productThumbnailFile);
        mainImageUrl = await getDownloadURL(snapshot.ref);
      }

      // Create product via API
      const response = await apiPost('/api/products', {
        productName: productData.product_name,
        description: productData.description,
        mainImage: mainImageUrl,
        additionalImages: [],
        categoryIds: productData.category,
        productOwner: productData.productOwner === 'SetLater' ? undefined : productData.productOwner,
        businessId: productData.productOwner === 'SetLater' ? undefined : productData.productOwner,
        isActive: productData.isActive,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create product');
      }
      
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
        mainImage: "",
        additionalImages: [],
        comments: [],
        isActive: true,
        productOwner: 'SetLater'
      });
      setProductThumbnailFile(null);
      setDuplicateError(null); // Clear any duplicate errors
      setOpen(false);
      
      // Refresh the product list
      getProducts();
      setSnackbarMessage('Product added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Error adding product:", err);
      setSnackbarMessage('Failed to add product.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsAddingProduct(false);
    }
  };




  // Helper function to get the most recent timestamp for a product
  const getMostRecentTimestamp = (product: Product): { timestamp: any; type: 'updated' | 'created' } => {
    if (product.updatedAt) {
      return { timestamp: product.updatedAt, type: 'updated' };
    }
    if (product.createdAt) {
      return { timestamp: product.createdAt, type: 'created' };
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

  // Utility function to update product's updatedAt field
  // Note: Currently unused but kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateProductTimestamp = async (productId: string) => {
    try {
      // TODO: Migrate to API - PUT /api/products/:id
      // const response = await fetch(`/api/products/${productId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({ updatedAt: new Date().toISOString() }),
      // });
      console.warn('Product timestamp update not implemented - needs API migration');
      console.log(`Updated timestamp for product: ${productId}`);
    } catch (error) {
      console.error('Error updating product timestamp:', error);
    }
  };

  // Fetch products from Firestore
  // Move productsCollection to useMemo
  // const productsCollection = useMemo(() => collection(firebaseDB, 'products'), []);

  // Update getProducts with productsCollection dependency
  const getProducts = useCallback(async () => {
    try {
      const response = await apiGet('/api/products', {
        limit: 1000, // Get all products for admin view
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      if (response.success && response.data) {
        // Map API response to Product interface
        const fetchedData: Product[] = response.data.map((product: any) => ({
          id: product.id,
          product_name: product.productName || product.name || '',
          description: product.description || '',
          category: product.categoryIds || product.categories?.map((c: any) => c.id || c.name) || [],
          mainImage: product.mainImage || '',
          additionalImages: product.additionalImages || [],
          productOwner: product.businessId || product.productOwner || '',
          isActive: product.isActive !== undefined ? product.isActive : true,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          // All stats come from API - totalReviews is calculated from actual Review records in database
          total_views: product.totalViews || 0,
          positive_reviews: product.positiveReviews || 0,
          total_reviews: product.totalReviews || 0, // From API: calculated from Review table
          comments: product.comments || [],
        }));
        
        setProductList(fetchedData);
      } else {
        setProductList([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setProductList([]);
    }
  }, []);

  // Update useEffect
  useEffect(() => {
    getProducts();
    const fetchAllProductComments = async () => {
      try {
        // Fetch comments for all products - API doesn't have a bulk endpoint, so we'll fetch individually
        // For now, we'll just fetch comments when viewing a specific product
        // This function is called for the list view, so we can skip it or fetch a summary
        const comments: ProductOrServiceComment[] = [];
        setProductComments(comments);
        return comments;
      } catch (error) {
        console.error("Error fetching product comments:", error);
        return [];
      }
    };
    fetchAllProductComments();
    
    // Fetch all product reviews
    const fetchAllProductReviews = async () => {
      try {
        const response = await apiGet('/api/reviews', { itemType: 'PRODUCT' });
        if (response.success && response.data) {
          const reviews = response.data.map((review: any) => ({
            id: review.id,
            product_id: review.productId || null,
            service_id: review.serviceId || null,
            sentiment: review.sentiment || null,
            timestamp: review.createdAt ? new Date(review.createdAt) : new Date(),
            ...review,
          }));
          console.log(`Fetched ${reviews.length} reviews from API`);
          setProductReviews(reviews);
          return reviews;
        }
        setProductReviews([]);
        return [];
      } catch (error) {
        console.error("Error fetching product reviews:", error);
        setProductReviews([]);
        return [];
      }
    };
    fetchAllProductReviews();
  }, [getProducts]);

  // Debug useEffect to monitor productData changes
  useEffect(() => {
    console.log('productData changed:', productData);
    console.log('productData.productOwner:', productData.productOwner);
  }, [productData]);

  // Derived data with search and category filtering
  const filteredProducts = useMemo(() => productList.filter((prod: Product) => {
    const matchesSearch = prod.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || 
      (prod.category && Array.isArray(prod.category) && prod.category.includes(selectedCategoryFilter));
    return matchesSearch && matchesCategory;
  }), [productList, searchTerm, selectedCategoryFilter]);

  // Pagination: Calculate paginated products
  const paginatedProducts = useMemo(() => {
    const startIndex = table.page * table.rowsPerPage;
    const endIndex = startIndex + table.rowsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, table.page, table.rowsPerPage]);

  // Reset page when search term or category filter changes
  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategoryFilter]);



  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2}>
        {/* Left Section (Products Table) */}
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
                  Products
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
                      {productList.length}
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
                  Manage and organize your product catalog
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
                    getProducts();
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
                  Add Product
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
                placeholder="Search products..."
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
                  id="category-filter-label"
                  sx={{ 
                    color: 'text.primary',
                    '&.Mui-focused': {
                      color: 'text.primary',
                    }
                  }}
                 />
                <Select
                  labelId="category-filter-label"
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
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
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
            <DialogTitle sx={{ pb: 1 }}>Add Product</DialogTitle>
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
                label="Product Name"
                name="product_name"
                fullWidth
                value={productData.product_name}
                onChange={(e) => {
                  handleChange(e as React.ChangeEvent<HTMLInputElement>);
                  setDuplicateError(null); // Clear error when user types
                }}
                required
                error={!!duplicateError}
                helperText={duplicateError || 'Enter a unique product name'}
              />
              <FormControl fullWidth margin="dense" required>
                <InputLabel id="category-multiselect-label">Category</InputLabel>
                <Select
                  labelId="category-multiselect-label"
                  multiple
                  value={productData.category}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setProductData({ ...productData, category: value.filter((v) => v) });
                  }}
                  open={categoryMenuOpen}
                  onClose={() => setCategoryMenuOpen(false)}
                  onOpen={() => setCategoryMenuOpen(true)}
                  renderValue={(selected) => {
                    const selectedIds = selected as string[];
                    const selectedNames = selectedIds
                      .map((id) => availableCategories.find((cat) => cat.id === id)?.name)
                      .filter(Boolean);
                    return selectedNames.join(', ');
                  }}
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
                  {availableCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {productData.category.includes(category.id) && (
                        <CheckIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                      )}
                      {category.name}
                    </MenuItem>
                  ))}
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
                value={productData.description}
                onChange={handleChange}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel id="product-owner-select-label">Product Owner</InputLabel>
                <Select
                  labelId="product-owner-select-label"
                  value={productData.productOwner || ''}
                  onChange={(e) => {
                    const newValue = e.target.value as string;
                    console.log('Product Owner changed to:', newValue);
                    console.log('Previous productData.productOwner:', productData.productOwner);
                    setProductData({ ...productData, productOwner: newValue });
                    console.log('Updated productData.productOwner should be:', newValue);
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: { maxHeight: 300 },
                    },
                    MenuListProps: {
                      sx: { p: 0 },
                    },
                  }}
                  label="Product Owner"
                >
                  {availableProductOwners.map((owner, index) => (
                    <MenuItem key={`${owner}-${index}`} value={owner}>
                      {owner}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Product Thumbnail</Typography>
                <Box sx={{ border: '1px dashed grey', p: { xs: 1, sm: 2 }, borderRadius: 1, textAlign: 'center' }}>
                  {productThumbnailFile || productData.mainImage ? (
                    <Box sx={{ position: 'relative', width: '100%', height: { xs: 200, sm: 300 }, mb: 1, overflow: 'hidden' }}>
                      <Box
                        component="img"
                        src={productThumbnailFile ? URL.createObjectURL(productThumbnailFile) : productData.mainImage}
                        alt="Product thumbnail"
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
                    id="product-thumbnail-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProductThumbnailFile(file);
                      }
                    }}
                  />
                  <label htmlFor="product-thumbnail-upload" style={{ width: '100%', display: 'block' }}>
                    <Button
                      variant="outlined"
                      component="span"
                      size="small"
                      fullWidth
                      startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                      sx={{ mt: 1 }}
                    >
                      {productThumbnailFile || productData.mainImage ? 'Change Image' : 'Upload Image'}
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
                disabled={isAddingProduct}
                sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 2, sm: 1 } }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProduct}
                variant="contained"
                color="primary"
                disabled={isAddingProduct}
                startIcon={isAddingProduct ? <CircularProgress color="inherit" size={20} /> : null}
                sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 1, sm: 2 } }}
              >
                {isAddingProduct ? 'Adding...' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog End  */}

          {/* Table */}
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
                  <TableCell sx={{ minWidth: 150 }}>CATEGORY</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>TOTAL COMMENTS</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>POSITIVE REVIEWS</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>LAST MODIFIED</TableCell>
                  {/* <TableCell>TOTAL VIEWS</TableCell> */}
                  <TableCell sx={{ minWidth: 100 }}>STATUS</TableCell>
                  <TableCell align="right" sx={{ minWidth: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow
                    hover
                    key={product.id}
                    onClick={() => handleSelectRow(product)}
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
                        {product?.mainImage ? (
                          <img 
                            src={product.mainImage}
                            alt={product.product_name}
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
                            display: product?.mainImage ? 'none' : 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            bgcolor: 'grey.200'
                          }}
                        >
                          <Iconify 
                            icon="eva:shopping-bag-fill" 
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
                    <TableCell>
                        {product.product_name}
                    </TableCell>
                 
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {product.category?.map((catId, index) => {
                          const category = availableCategories.find((c) => c.id === catId);
                          return (
                            <Chip
                              key={`${catId}-${index}`}
                              label={category?.name || catId}
                              size="small"
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {productComments
                        .filter(comment => {
                          // Match by itemId (mobile app schema) or parentId (legacy schema)
                          const matchesProduct = comment.itemId === product.id || comment.parentId === product.id;
                          // Only count non-deleted comments
                          return matchesProduct && !comment.isDeleted;
                        })
                        .length}
                    </TableCell>
                    {/* <TableCell>{product.total_reviews}</TableCell>
                    <TableCell>{product.total_reviews}</TableCell> */}
                    <TableCell>
                      {productReviews
                        .filter((review) => review.product_id === product.id)
                        .filter(
                          (review) =>
                            review.sentiment === "Its Good" || review.sentiment === "Would recommend"
                        )
                        .length}
                    </TableCell>
                    <TableCell>
                      <Box>
                        {(() => {
                          const { timestamp, type } = getMostRecentTimestamp(product);
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
            
                    {/* <TableCell>{product.total_views}</TableCell> */}
                    <TableCell>
                      <Chip
                        label={product.isActive ? 'Active' : 'Inactive'}
                        color={product.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="primary">
                        <Iconify width={22} icon="eva:arrow-forward-fill" height="24" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2">
                        {filteredProducts.length === 0 ? 'No products found' : 'No products on this page'}
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
              count={filteredProducts.length}
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
        </Grid>

        {/* Right Section (Donut Chart & Stats) */}
        <Grid item xs={12} md={3} sx={{ order: { xs: -1, md: 0 } }}>
          <Paper sx={{ p: 2, borderRadius: 2 }} elevation={1}>
            <ProductStats products={productList} categories={availableCategories} />
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
}   // End of ProductsView