import { useState, useEffect, useMemo ,useCallback} from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Table,
  Dialog,
  Snackbar,
  Alert,
  DialogActions,
  DialogContent,
  DialogTitle,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TableContainer,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { collection, getDocs, addDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { firebaseDB } from '../../../firebaseConfig';
import CategoryStats from '../stats/categories-stats';



interface Category {
  id: string;
  name: string;
  description: string;
  type: 'product' | 'service';
}

export function CategoryView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [categoryData, setCategoryData] = useState<{
    name: string;
    description: string;
    type: 'product' | 'service';
  }>({
    name: '',
    description: '',
    type: 'product',
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Add filter state
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');

  const categoriesCollection = useMemo(() => collection(firebaseDB, 'categories'), []);

  const fetchCategories = useCallback(async () => {
    try {
      const snapshot = await getDocs(categoriesCollection);
      const fetchedCategories = snapshot.docs.map(document => ({ // Renamed 'doc' to 'document'
        id: document.id,
        ...document.data(),
      })) as Category[];
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [categoriesCollection]);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);


  const handleAddCategory = async () => {
    try {
      await addDoc(categoriesCollection, categoryData);
      setOpen(false);
      fetchCategories();
      setSnackbarMessage('Category added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setCategoryData({ name: '', description: '', type: 'product' });
    } catch (error) {
      setSnackbarMessage('Failed to add category');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Add these new states after other state declarations
  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Add this new handler function after other handlers
  const handleEditCategory = async () => {
    try {
      if (!selectedCategory) return;
      
      const docRef = doc(firebaseDB, 'categories', selectedCategory.id);
      await updateDoc(docRef, categoryData);
      
      setOpen(false);
      fetchCategories();
      setSnackbarMessage('Category updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setCategoryData({ name: '', description: '', type: 'product' });
      setEditMode(false);
      setSelectedCategory(null);
    } catch (error) {
      setSnackbarMessage('Failed to update category');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Changed to 10

  // Filter categories based on type filter
  const filteredCategories = useMemo(() => {
    if (typeFilter === 'all') {
      return categories;
    }
    return categories.filter(category => category.type === typeFilter);
  }, [categories, typeFilter]);

  // Get balanced categories (5 of each type if available)
  const balancedCategories = useMemo(() => {
    if (typeFilter !== 'all') {
      return filteredCategories;
    }

    const productCategories = categories.filter(cat => cat.type === 'product').slice(0, 5);
    const serviceCategories = categories.filter(cat => cat.type === 'service').slice(0, 5);
    
    return [...productCategories, ...serviceCategories];
  }, [categories, typeFilter, filteredCategories]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [typeFilter]);

 // Add state for category assignments
 const [categoryAssignments, setCategoryAssignments] = useState<Record<string, number>>({});
            
 // Add this function to fetch products and count category assignments
 const fetchCategoryAssignments = useCallback(async () => {
     try {
         const productsCollection = collection(firebaseDB, 'products');
         const productsSnapshot = await getDocs(productsCollection);
         
         const assignments: Record<string, number> = {};
         
         productsSnapshot.docs.forEach(document => {
             const product = document.data();
             if (product.categories && Array.isArray(product.categories)) {
                 product.categories.forEach((categoryId: string) => {
                     assignments[categoryId] = (assignments[categoryId] || 0) + 1;
                 });
             }
         });
         
         setCategoryAssignments(assignments);
     } catch (error) {
         console.error('Error fetching category assignments:', error);
     }
 }, []);
 
 useEffect(() => {
     fetchCategories();
     fetchCategoryAssignments();
 }, [fetchCategories, fetchCategoryAssignments]);
 
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
      <Grid item xs={12} md={9}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Categories
            </Typography>
            <Button
              variant="contained"
              color="warning"
              onClick={() => setOpen(true)}
            >
              Add Category
            </Button>
          </Box>

          {/* Add filter controls */}
          <Box sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Type</InputLabel>
              <Select
                value={typeFilter}
                label="Filter by Type"
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'product' | 'service')}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="product">Product Categories</MenuItem>
                <MenuItem value="service">Service Categories</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>NAME</TableCell>
                  <TableCell>TYPE</TableCell>
                  <TableCell>DESCRIPTION</TableCell>
                  <TableCell>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balancedCategories
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{category.type}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => {
                            setEditMode(true);
                            setSelectedCategory(category);
                            setCategoryData({
                              name: category.name,
                              description: category.description,
                              type: category.type,
                            });
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={balancedCategories.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </Grid>
    

        {/* Right Section (Donut Chart & Stats) */}
        {/* <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }} elevation={1}>
           
       
               
                <Box sx={{ p: 2 }}>
                    <CategoryStats 
                        categories={categories} 
                        categoryAssignments={categoryAssignments}/>
                        </Box>
                </Paper>
            </Grid> */}
        </Grid>
      <Dialog 
        open={open} 
        onClose={() => {
          setOpen(false);
          setEditMode(false);
          setSelectedCategory(null);
          setCategoryData({ name: '', description: '', type: 'product' });
        }}
      >
        <DialogTitle>{editMode ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Category Name"
            fullWidth
            value={categoryData.name}
            onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            value={categoryData.description}
            onChange={(e) => setCategoryData({ ...categoryData, description: e.target.value })}
          />
          <TextField
            select
            margin="dense"
            label="Type"
            fullWidth
            value={categoryData.type}
            onChange={(e) => {
              const value = e.target.value as 'product' | 'service';
              setCategoryData({
                ...categoryData,
                type: value,
              });
            }}
            SelectProps={{
              native: true,
            }}
          >
            <option value="product">Product</option>
            <option value="service">Service</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpen(false);
            setEditMode(false);
            setSelectedCategory(null);
            setCategoryData({ name: '', description: '', type: 'product' });
          }}>
            Cancel
          </Button>
          <Button 
            onClick={editMode ? handleEditCategory : handleAddCategory} 
            variant="contained" 
            color="primary"
          >
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
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

