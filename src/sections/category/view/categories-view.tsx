import { useMemo, useState, useEffect ,useCallback} from 'react';
import { doc, addDoc, getDocs, updateDoc, collection } from 'firebase/firestore';

import {
  Box,
  Grid,
  Paper,
  Table,
  Alert,
  Dialog,
  Button,
  Select,
  Snackbar,
  TableRow,
  MenuItem,
  TextField,
  TableHead,
  TableCell,
  TableBody,
  Typography,
  InputLabel,
  DialogTitle,
  FormControl,
  DialogActions,
  DialogContent,
  TableContainer,
  TablePagination
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// Firebase Firestore removed - migrating to Prisma API



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
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter categories based on type filter and search
  const filteredCategories = useMemo(() => {
    let filtered = categories;
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(category => category.type === typeFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [categories, typeFilter, searchTerm]);


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
 const [, setCategoryAssignments] = useState<Record<string, number>>({});
            
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
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2}>
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
                  Categories
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
                      {categories.length}
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
                  Manage and organize product and service categories
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
                    fetchCategories();
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
                  Add Category
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
                placeholder="Search categories..."
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
                  id="type-filter-label"
                  sx={{ 
                    color: 'text.primary',
                    '&.Mui-focused': {
                      color: 'text.primary',
                    }
                  }}
                 />
                <Select
                  labelId="type-filter-label"
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'product' | 'service')}
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
                      All Types
                    </Box>
                  </MenuItem>
                  <MenuItem value="product">Product Categories</MenuItem>
                  <MenuItem value="service">Service Categories</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {/* Display Table of Categories */}
          <TableContainer 
            component={Paper} 
            sx={{ 
              overflowX: 'auto',
              borderRadius: 2,
            }}
          >
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>Name</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Type</TableCell>
                  <TableCell sx={{ minWidth: 250 }}>Description</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCategories
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {category.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: category.type === 'product' ? 'primary.lighter' : 'secondary.lighter',
                            color: category.type === 'product' ? 'primary.darker' : 'secondary.darker',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {category.type}
                        </Box>
                      </TableCell>
                      <TableCell>{category.description || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="primary"
                          variant="outlined"
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
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2">
                        No categories found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredCategories.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
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

