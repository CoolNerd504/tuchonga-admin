import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Chip,
  Checkbox,
  TableContainer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableHead,
  CircularProgress,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  TablePagination,
  Avatar,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';
import {
  getDocs,
  collection,
  addDoc,
  doc, getDoc, query, where
  // deleteDoc,
  // updateDoc,
} from 'firebase/firestore';
import CheckIcon from '@mui/icons-material/Check';
import { UserTableToolbar } from '../product-table-toolbar';
import { firebaseDB } from '../../../firebaseConfig';
import ProductStats from '../stats/product-stats';
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
  userSentiment: "Disagree" | "neutral" | "Agree"; // The user's sentiment/agreement level
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
 * ProductsView displays and manages the list of products, including add, edit, and category selection.
 * Handles Firestore integration, product comments, and UI for product management.
 */
export function ProductsView() {
  // Add this near the other state declarations
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [productComments, setProductComments] = useState<ProductOrServiceComment[]>([]);
  const [availableProductOwners, setAvailableProductOwners] = useState<string[]>([]);
  
  // Move productsCollection to the top - before handleAddProduct
  const productsCollection = useMemo(() => collection(firebaseDB, 'products'), []);
  
  // Add this after other useEffects
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesCollection = collection(firebaseDB, 'categories');
        const querySnapshot = await getDocs(categoriesCollection);
        const categories = querySnapshot.docs
          .map(docCategories => docCategories.data())
          .filter(cat => cat.type === 'product')
          .map(cat => cat.name);
        setAvailableCategories(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    const fetchProductOwners = async () => {
      try {
        const productOwnersCollection = collection(firebaseDB, 'businesses');
        const querySnapshot = await getDocs(productOwnersCollection);
        const productOwners = querySnapshot.docs
          .map(docPO => docPO.data())
          .map(owner => owner.name || owner.owner_name || owner.id); // Handle different field names
        setAvailableProductOwners(['SetLater', ...productOwners]);
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterName, setFilterName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const table = useTable();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // State to control dialog visibility
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Firestore collection reference
  // const productsCollection = collection(firebaseDB, 'products');
  const handleSelectRow = (product: Product) => {
    navigate(`/products/${product?.id}`, { state: { product } });
    console.log('Selected row:', selectedProduct);
    // if (selectedBusiness === null) {
    //   console.log('First CLick :', selectedBusiness);
    // } else 
    // {};
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
      // Log the data being sent
      console.log('Adding product:', {
        product_name: productData.product_name,
        category: productData.category,
        description: productData.description,
        reviews: 0,
        positive_reviews: 0,
        total_reviews: 0,
        total_views: 0,
        comments: [],
        isActive: true,
        productOwner: productData.productOwner,
        createdAt: new Date(),
      });
      const docRef = await addDoc(productsCollection, {
        product_name: productData.product_name,
        category: productData.category,
        description: productData.description,
        reviews: 0,
        positive_reviews: 0,
        total_reviews: 0,
        total_views: 0,
        comments: [],
        isActive: true,
        productOwner: productData.productOwner,
      });
      console.log('Product added with ID:', docRef);
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


  console.log('Selected List:', productList);

  // Fetch products from Firestore
  // Move productsCollection to useMemo
  // const productsCollection = useMemo(() => collection(firebaseDB, 'products'), []);

  // Update getProducts with productsCollection dependency
  const getProducts = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(productsCollection);
      const fetchedData: Product[] = querySnapshot.docs.map((docProducts) => {
        const docData = docProducts.data() as Omit<Product, 'id'>;
        return {
          ...docData,
          id: docProducts.id,
        };
      });
      // Sort by createdAt descending
      fetchedData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setProductList(fetchedData);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, [productsCollection]);

  // Update useEffect
  useEffect(() => {
    getProducts();
    const fetchAllProductComments = async () => {
      try {
        const commentsRef = collection(firebaseDB, "comments");
        const q = query(commentsRef, where("parentType", "==", "Product"));
        const querySnapshot = await getDocs(q);
        const comments = querySnapshot.docs.map(docProductComments => ({
          id: docProductComments.id,
          ...docProductComments.data()
        })) as ProductOrServiceComment[];
        setProductComments(comments);
        return comments;
      } catch (error) {
        console.error("Error fetching product comments:", error);
        return [];
      }
    };
    fetchAllProductComments();
  }, [getProducts]);
  
  
  
  // Derived data
  const filteredProducts = productList.filter((prod: Product) =>
    prod.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Left Section (Products Table) */}
        <Grid item xs={12} md={9}>

          {/* Add product button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Products
            </Typography>
            <Button
              variant="contained"
              color="warning"
              sx={{ textTransform: 'none' }}
              onClick={() => setOpen(true)}
            >
              Add Product
            </Button>
          </Box>



          {/* Dialog Start */}

          <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>Add Product</DialogTitle>
            <DialogContent>
              <TextField
                margin="dense"
                label="Product Name"
                name="product_name"
                fullWidth
                value={productData.product_name}
                onChange={handleChange}
                required
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
                  {availableCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {productData.category.includes(category) && (
                        <CheckIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                      )}
                      {category}
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
                  value={productData.productOwner}
                  onChange={(e) => {
                    setProductData({ ...productData, productOwner: e.target.value });
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
                  {availableProductOwners.map((owner) => (
                    <MenuItem key={owner} value={owner}>
                      {owner}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)} disabled={isAddingProduct}>Cancel</Button>
              <Button
                onClick={handleAddProduct}
                variant="contained"
                color="primary"
                disabled={isAddingProduct}
                startIcon={isAddingProduct ? <CircularProgress color="inherit" size={20} /> : null}
              >
                {isAddingProduct ? 'Adding...' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog End  */}

          {/* Search bar */}
          <Paper sx={{ p: 1, mb: 2 }}>
            <TextField
              variant="outlined"
              fullWidth
              placeholder="Search"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                sx: { borderRadius: 2 },
              }}
            />
          </Paper>

          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>THUMBNAIL</TableCell>
                  <TableCell>NAME</TableCell>
                  <TableCell>CATEGORY</TableCell>
                  <TableCell>TOTAL COMMENTS</TableCell>
                  <TableCell>POSITIVE REVIEWS</TableCell>
                  {/* <TableCell>TOTAL VIEWS</TableCell> */}
                  <TableCell>STATUS</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    hover
                    key={product.id}
                    onClick={() => handleSelectRow(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                    <img 
          src={product?.mainImage || '/placeholder.svg?height=300&width=600&text='}
          alt={product?.product_name}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '80%',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        />
                    </TableCell>
                    <TableCell>
                        {product.product_name}
                    </TableCell>
                 
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {product.category?.map((cat, index) => (
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
                      {productComments
                        .filter(comment => comment.parentId === product.id)
                        .length}
                    </TableCell>
                    {/* <TableCell>{product.total_reviews}</TableCell>
                    <TableCell>{product.total_reviews}</TableCell> */}
                    <TableCell>
                      {productComments
                        .filter(comment => comment.parentId === product.id)
                        .filter(comment => comment.userSentiment === "Agree").length}
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
        </Grid>

        {/* Right Section (Donut Chart & Stats) */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }} elevation={1}>
            <ProductStats products={productList} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}   // End of ProductsView