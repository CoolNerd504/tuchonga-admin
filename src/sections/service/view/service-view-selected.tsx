import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CardContent,
  Card,
  Tab,
  TextField,
  MenuItem,
  Tabs,
  CardMedia,
  Avatar,
  CircularProgress, // Import CircularProgress
  LinearProgress,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Icon,
  Switch,
  Collapse,
  FormControlLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import Grid from '@mui/material/Grid';
import { Iconify } from 'src/components/iconify';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import CheckIcon from '@mui/icons-material/Check';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { storage,firebaseDB } from '../../../firebaseConfig';

import { AnalyticsCurrentVisits } from './analytics-current-visits';
import { AnalyticsWebsiteVisits } from './analytics-website-visits';
import { AnalyticsWidgetSummary } from './analytics-widget-summary';


const uploadImage = async (file: File | string) => {
  if (typeof file === 'string') return file;
  const storageRef = ref(storage, `services/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

interface BusinessOwner {
  id: string;
  name?: string;
  email?: string;
}

/**
 * ServiceDetail displays and manages the details and editing of a single service.
 * Handles Firestore integration, image uploads, and review calculations.
 */
export function ServiceDetail() {
  const location = useLocation();
  const service = location.state?.service;
  const currentBusiness: BusinessOwner | undefined = location.state?.business;
  const [activeTab, setActiveTab] = useState(0);
  const [editedService, setEditedService] = useState(service);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showAdditionalImages, setShowAdditionalImages] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Add this state
  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesCollection = collection(firebaseDB, 'categories');
        const querySnapshot = await getDocs(categoriesCollection);
        const categories = querySnapshot.docs
          .map(document => document.data());
        console.log('All categories:', categories);
        const serviceCategories = categories.filter(cat => cat.type === 'service');
        console.log('Filtered service categories:', serviceCategories);
        setAvailableCategories(serviceCategories.map(cat => cat.name));
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchBusinessOwners = async () => {
      try {
        const businessesCollection = collection(firebaseDB, 'businesses');
        const querySnapshot = await getDocs(businessesCollection);
        const owners = querySnapshot.docs.map(docBC => ({ id: docBC.id, ...(docBC.data() as Omit<BusinessOwner, 'id'>) }));
        setBusinessOwners(owners);
      } catch (err) {
        console.error('Error fetching business owners:', err);
      }
    };
    fetchBusinessOwners();
  }, []);

  useEffect(() => {
    if (
      currentBusiness &&
      (!editedService?.serviceOwner || editedService?.serviceOwner === '')
    ) {
      setEditedService((prev: any) => ({ ...prev, serviceOwner: currentBusiness.id }));
    }
  }, [currentBusiness, editedService]);

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (name === 'category') {
      const categoryArray = value.split(',').map(item => item.trim()).filter(Boolean);
      setEditedService({ ...editedService, [name]: categoryArray });
    } else {
      setEditedService({ ...editedService, [name]: value });
    }
  };

  const handleUpdateService = async () => {
    setIsUpdating(true); // Set loading state to true
    try {
      if (!editedService.mainImage) {
        setSnackbarMessage('Main cover image is required');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsUpdating(false); // Reset loading state on validation error
        return;
      }

      const serviceRef = doc(firebaseDB, 'services', service.id);

      // Upload main image (always required)
      const mainImageUrl = await uploadImage(editedService.mainImage);

      // Handle additional images: upload new ones or keep existing ones
      const additionalImagePromises = [1, 2, 3].map(async (index) => {
        const newImageFile = editedService[`additionalImage${index}`];
        const existingImageUrl = service.additionalImages?.[index - 1];

        if (newImageFile) {
          // If a new file was selected for this slot, upload it
          return uploadImage(newImageFile);
        }
        // Otherwise, keep the existing image URL (if it exists)
        return existingImageUrl || null;
      });

      const additionalImageUrls = await Promise.all(additionalImagePromises);

      await updateDoc(serviceRef, {
        service_name: editedService.service_name,
        category: editedService.category,
        description: editedService.description,
        isActive: editedService.isActive,
        mainImage: mainImageUrl,
        // Filter out any nulls (slots where there was neither a new nor existing image)
        additionalImages: additionalImageUrls.filter(url => url !== null),
        serviceOwner: editedService.serviceOwner || '',
      });

      setSnackbarMessage('Service updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error updating service:", error);
      setSnackbarMessage('Failed to update service.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsUpdating(false); // Reset loading state regardless of success or error
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!service) {
    return <div>No Service data found.</div>;
  }
  const ratings = [
    { label: "Great", value: 40 },
    { label: "Good", value: 40 },
    { label: "Satisfactory", value: 40 },
    { label: "Not Pleased", value: 40 },
  ];

  const comments = [
    {
      name: "John Doe",
      date: "23/02/23",
      text: "Pringles are known for their unique shape and delicious flavors.",
    },
    {
      name: "Emma Smith",
      date: "20/01/25",
      text: "Chips can be a great snack for any occasion.",
    },
    {
      name: "Michael Johnson",
      date: "21/01/25",
      text: "Dipping sauces can enhance the taste of chips.",
    },
    {
      name: "Sophia Brown",
      date: "20/01/25",
      text: "Exploring new chip flavors can be a fun experience.",
    },
  ];

  return (
    <Box sx={{ p: 3, width: "90%", mx: "auto" }}>
      <Card sx={{ display: "flex", p: 2, alignItems: "stretch", bgcolor: "#fff3e0", minHeight: 280 }}>
        <Box sx={{ 
          width: 180,
          position: 'relative',
          mr: 2,
          flex: '0 0 auto'
        }}>
          <CardMedia
            component="img"
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: "contain"
            }}
            image={service.mainImage || '/assets/placeholder-image.jpg'}
            alt="Service"
          />
        </Box>
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {service.service_name}
          </Typography>
          {ratings.map((rating, index) => (
            <Box key={index} display="flex" alignItems="center" mb={1}>
              <Typography sx={{ width: 120 }}>{rating.label}</Typography>
              <LinearProgress variant="determinate" value={rating.value} sx={{ flex: 1, mx: 2 }} />
              <Typography>{rating.value}%</Typography>
            </Box>
          ))}
          <Box display="flex" alignItems="center" mt={2} justifyContent="space-between">
            <Typography variant="body1" sx={{ mt: 2, color: "black" }}>
              <strong>Description:</strong> {service.description}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {service.additionalImages && service.additionalImages.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Card>
            <Box
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onClick={() => setShowAdditionalImages(!showAdditionalImages)}
            >
              <Typography variant="subtitle1">View additional service images ({service.additionalImages.length})</Typography>
              <Iconify
                icon={showAdditionalImages ? "eva:arrow-ios-upward-fill" : "eva:arrow-ios-downward-fill"}
                width={20}
                height={20}
              />
            </Box>
            <Collapse in={showAdditionalImages}>
              <Box sx={{ p: 2, pt: 0 }}>
                <Grid container spacing={2}>
                  {service.additionalImages.map((imageUrl: string, index: number) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card elevation={0} sx={{ bgcolor: '#f5f5f5' }}>
                        <CardMedia
                          component="img"
                          sx={{
                            height: 200,
                            objectFit: "contain"
                          }}
                          image={imageUrl}
                          alt={`Service view ${index + 1}`}
                        />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </Card>
        </Box>
      )}

     

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
            label="Analytics"
            icon={<Iconify width={22} icon="solar:chart-2-bold" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label={`Comments${service.comments?.length ? ` (${service.comments.length})` : ''}`}
            icon={<Iconify width={22} icon="solar:chat-round-dots-bold" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label="Edit Service"
            icon={<Iconify width={22} icon="eva:edit-fill" height={22} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>
      {/** Tab Panels */}
      {activeTab === 0 && (
        <Box sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <AnalyticsWidgetSummary
                title="Total views"
                percent={-0.1}
                total={service.total_views}
                color="secondary"
                icon={<Iconify width={50} icon="icon-park-solid:click" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: [56, 47, 40, 62, 73, 30, 23, 54],
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <AnalyticsWidgetSummary
                title="Positive Reviews"
                percent={2.6}
                total={service.positive_reviews}
                icon={<Iconify width={50} icon="vaadin:thumbs-up" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: [22, 8, 35, 50, 82, 84, 77, 12],
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <AnalyticsWidgetSummary
                title="Negative Reviews"
                percent={2.8}
                total={0}
                color="warning"
                icon={<Iconify width={50} icon="vaadin:thumbs-down" height="50" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: [40, 70, 50, 28, 70, 75, 7, 64],
                }}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <AnalyticsCurrentVisits
                title="Users by gender"
                chart={{
                  series: [
                    { label: 'Male', value: 3500 },
                    { label: 'female', value: 2500 },
                  ],
                }}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={8}>
              <AnalyticsWebsiteVisits
                title="Website visits"
                subheader="(+43%) than last year"
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                  series: [
                    { name: 'Team A', data: [43, 33, 22, 37, 67, 68, 37, 24, 55] },
                    { name: 'Team B', data: [51, 70, 47, 67, 40, 37, 24, 70, 24] },
                  ],
                }}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (


        <Box sx={{ pt: 3 }}>
       
          <List sx={{ mt: 2 }}>
            {service.comments && service.comments.length > 0 ? (
              service.comments.map((comment: string, index: number) => (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>{comment.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          {comment}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" display="block" gutterBottom>
                            {new Date().toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2">{comment}</Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < service.comments.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No comments yet" />
              </ListItem>
            )}
          </List>
        </Box>

      )}

      {activeTab === 2 && (
        <Box sx={{ pt: 3 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Edit Service</Typography>
            {isUpdating && <LinearProgress sx={{ mb: 2 }} />} {/* Optional Progress Bar */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Service Name"
                  name="service_name"
                  value={editedService.service_name}
                  onChange={handleEditChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="dense" sx={{ mt: 1 }}>
                  <InputLabel id="category-multiselect-label">Category</InputLabel>
                  <Select
                    labelId="category-multiselect-label"
                    multiple
                    value={editedService.category}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      setEditedService({ ...editedService, category: value.filter((v: string) => v) });
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
                  >
                             <MenuItem disabled divider />
                    <MenuItem onClick={() => setCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                      Done
                    </MenuItem>
                    {availableCategories.length === 0 ? (
                      <MenuItem disabled>No service categories found</MenuItem>
                    ) : (
                      availableCategories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {editedService.category.includes(category) && (
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
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Service Owner"
                  name="serviceOwner"
                  value={editedService.serviceOwner || ''}
                  onChange={(e) => setEditedService({ ...editedService, serviceOwner: e.target.value })}
                >
                  <MenuItem value="">
                    <em>Select Owner</em>
                  </MenuItem>
                  {businessOwners.map((owner) => (
                    <MenuItem key={owner.id} value={owner.id}>
                      {owner.name || owner.email || owner.id}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              {/* Main Cover Image - Mandatory */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Main Cover Image (Required)</Typography>
                <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1, mb: 2 }}>
                  <input
                    accept="image/*"
                    type="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditedService({ ...editedService, mainImage: file });
                      }
                    }}
                    style={{ display: 'none' }}
                    id="main-image-upload"
                  />
                  <Box
                    component="label"
                    htmlFor="main-image-upload"
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    {editedService?.mainImage ? (
                      <>
                        <img 
                          src={typeof editedService.mainImage === 'string' ? editedService.mainImage : URL.createObjectURL(editedService.mainImage)} 
                          alt="Service cover" 
                          style={{ maxWidth: '200px', height: 'auto' }} 
                        />
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          click to change
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Iconify icon="solar:gallery-add-bold" width={40} height={40} sx={{ mb: 1 }} />
                        <Typography>Click to upload main image</Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Grid>
              
              {/* Additional Images - Optional */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Additional Images (Optional)</Typography>
                <Grid container spacing={2}>
                  {[1, 2, 3].map((index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Box sx={{ 
                        border: '1px dashed grey', 
                        p: 2, 
                        borderRadius: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>Optional Image {index}</Typography>
                        <input
                          accept="image/*"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditedService({ 
                                ...editedService, 
                                [`additionalImage${index}`]: file 
                              });
                            }
                          }}
                          style={{ display: 'none' }}
                          id={`additional-image-${index}`}
                        />
                        <Box
                          component="label"
                          htmlFor={`additional-image-${index}`}
                          sx={{ 
                            cursor: 'pointer',
                            mt: 2,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#f5f5f5',
                            borderRadius: 1,
                            minHeight: 200
                          }}
                        >
                          {editedService?.[`additionalImage${index}`] || (service.additionalImages && service.additionalImages[index - 1]) ? (
                            <>
                              <img 
                                src={editedService?.[`additionalImage${index}`] 
                                  ? (typeof editedService[`additionalImage${index}`] === 'string' 
                                    ? editedService[`additionalImage${index}`] 
                                    : URL.createObjectURL(editedService[`additionalImage${index}`]))
                                  : service.additionalImages[index - 1]
                                } 
                                alt={`Additional ${index}`}
                                style={{ 
                                  maxWidth: '100%', 
                                  height: 'auto',
                                  maxHeight: '200px',
                                  objectFit: 'contain'
                                }} 
                              />
                              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                              click to change
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Iconify icon="solar:gallery-add-bold" width={40} height={40} sx={{ mb: 1 }} />
                              <Typography variant="body2">Click to add image</Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  name="description"
                  value={editedService.description}
                  onChange={handleEditChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editedService.isActive}
                      onChange={(e) => setEditedService({ ...editedService, isActive: e.target.checked })}
                      name="isActive"
                    />
                  }
                  label="Active Status"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdateService}
                  disabled={isUpdating} // Disable button when updating
                  startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : null} // Show spinner when updating
                >
                  {isUpdating ? 'Updating...' : 'Update Service'}
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Box>
      )}

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