import React, { useState, useEffect ,useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  CardContent,
  Card,
  Tab,
  TextField,
  MenuItem,
  Tabs,
  CircularProgress,
  LinearProgress,
  CardMedia,
  Avatar,
  Button,
  Divider,
  List,
  Chip,
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
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import Grid from '@mui/material/Grid';
import { useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Iconify } from 'src/components/iconify';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import Autocomplete from '@mui/material/Autocomplete';
import CheckIcon from '@mui/icons-material/Check';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { storage, firebaseDB } from '../../../firebaseConfig';

// import Iconify from 'src/components/iconify';
// import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


import { AnalyticsCurrentVisits } from './analytics-current-visits';
import { AnalyticsWebsiteVisits } from './analytics-website-visits';
import { AnalyticsWidgetSummary } from './analytics-widget-summary';



const uploadImage = async (file: File | string) => {
  if (typeof file === 'string') return file; // If it's already a URL, return it
  const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

type Sentiment = "It's bad" | "Dont mind it" | "Its Good" | "Would recommend";
interface Review {
  id: string; // Firestore document ID
  product_id?: string; // ID of the product being reviewed
  service_id?: string; // ID of the service being reviewed
  userId: string; // ID of the user who wrote the review
  sentiment: Sentiment; // e.g., "Its Good", etc.
  text?: string; // Optional short comment
  reviewText?: string; // Optional longer review text
  timestamp: any; // Firestore Timestamp or ServerTimestampFieldValue
  sentimentHistory?: ReviewSentimentHistoryEntry[];
  // Add any other fields present in your 'reviews' documents
}

interface ReviewSentimentHistoryEntry {
  sentiment: "It's bad" | "Dont mind it" | "Its Good" | "Would recommend" | string; // The previous sentiment value
  timestamp: Date; // The timestamp when this sentiment was recorded (i.e., when it was the current sentiment)
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
const ratingWeights: Record<string, number> = {
  "It's bad": 1,
  "Dont mind it": 2,
  "Its Good": 4,
  "Would recommend": 5,
};

interface BusinessOwner {
  id: string;
  name?: string;
  email?: string;
}

// Define Product type for type safety
interface Product {
  id: string;
  product_name: string;
  category: string[];
  description: string;
  isActive: boolean;
  mainImage: string | File;
  additionalImages: (string | File)[];
  productOwner: string;
  comments?: string[];
  [key: string]: any; // for any additional dynamic fields
}

// Default product object for initialization
const defaultProduct: Product = {
  id: '',
  product_name: '',
  category: [],
  description: '',
  isActive: true,
  mainImage: '',
  additionalImages: [],
  productOwner: '',
  comments: [],
};

// --- Helper Components ---

function ImageUpload({
  label,
  image,
  onChange,
  required = false,
}: {
  label: string;
  image: string | File | undefined;
  onChange: (file: File) => void;
  required?: boolean;
}) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>{label}{required && ' (Required)'}</Typography>
      <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1, mb: 2 }}>
        <input
          accept="image/*"
          type="file"
          required={required}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file);
          }}
        />
        {image && (
          <Box sx={{ mt: 2 }}>
            <img
              src={typeof image === 'string' ? image : URL.createObjectURL(image)}
              alt={label}
              style={{ maxWidth: '200px', height: 'auto' }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

function AdditionalImagesUpload({
  images,
  onChange,
}: {
  images: (string | File)[];
  onChange: (index: number, file: File) => void;
}) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Additional Images (Optional)</Typography>
      <Grid container spacing={2}>
        {[0, 1, 2].map((index) => (
          <Grid item xs={12} md={4} key={index}>
            <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Optional Image {index + 1}</Typography>
              <input
                accept="image/*"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onChange(index, file);
                }}
                style={{ display: 'none' }}
                id={`additional-image-${index}`}
              />
              <Box
                sx={{ mt: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1, minHeight: 200, cursor: 'pointer' }}
                component="label"
                htmlFor={`additional-image-${index}`}
              >
                {images[index] ? (
                  <>
                    <img
                      src={typeof images[index] === 'string' ? images[index] as string : URL.createObjectURL(images[index] as File)}
                      alt={`Additional ${index + 1}`}
                      style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      {(images[index] as File)?.name || 'Click to change'}
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                    <Iconify icon="solar:gallery-add-bold" width={40} height={40} sx={{ mb: 1 }} />
                    <Typography variant="body2">Click to add image</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function CommentsList({ comments }: { comments: ProductOrServiceComment[] }) {
  return (
    <List sx={{ mt: 2 }}>
      {comments.length > 0 ? (
        comments.map((comment) => (
          <React.Fragment key={comment.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar>{comment.userName.charAt(0).toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{comment.userName}</Typography>
                    <Chip size="small" label={comment.userSentiment} color={comment.userSentiment === 'Agree' ? 'success' : comment.userSentiment === 'Disagree' ? 'error' : 'default'} />
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="caption" display="block" gutterBottom>
                      {comment.timestamp instanceof Date ? comment.timestamp.toLocaleDateString() : new Date().toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2">{comment.text}</Typography>
                  </>
                }
              />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))
      ) : (
        <ListItem>
          <ListItemText primary={<Typography variant="body1" color="text.secondary" align="center">No comments yet</Typography>} />
        </ListItem>
      )}
    </List>
  );
}

// --- Main Component ---

/**
 * ProductDetail displays and manages the details and editing of a single product.
 * Handles Firestore integration, image uploads, and review calculations.
 */
export function ProductDetail() {
  const location = useLocation();
  const initialProduct = React.useMemo<Product>(() => ({
    ...defaultProduct,
    ...(location.state?.product || {}),
    id: location.state?.product?.id ?? '',
    product_name: location.state?.product?.product_name ?? '',
    category: location.state?.product?.category ?? [],
    description: location.state?.product?.description ?? '',
    isActive: location.state?.product?.isActive ?? true,
    mainImage: location.state?.product?.mainImage ?? '',
    additionalImages: location.state?.product?.additionalImages ?? [],
    productOwner: location.state?.product?.productOwner ?? '',
    comments: location.state?.product?.comments ?? [],
  }), [location.state?.product]);

  const [editedProduct, setEditedProduct] = useState<Product>(initialProduct);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);
  const [productComments, setProductComments] = useState<ProductOrServiceComment[]>([]);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [showAdditionalImages, setShowAdditionalImages] = useState(false);
  const currentBusiness: BusinessOwner | undefined = location.state?.business;
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all Firestore data in parallel
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      (async () => {
        const categoriesCollection = collection(firebaseDB, 'categories');
        const querySnapshot = await getDocs(categoriesCollection);
        return querySnapshot.docs
          .map(document => document.data())
          .filter(cat => cat.type === 'product')
          .map(cat => cat.name);
      })(),
      (async () => {
        const businessesCollection = collection(firebaseDB, 'businesses');
        const querySnapshot = await getDocs(businessesCollection);
        return querySnapshot.docs.map(docBC => ({ id: docBC.id, ...(docBC.data() as Omit<BusinessOwner, 'id'>) }));
      })(),
      (async () => {
        const commentsRef = collection(firebaseDB, 'comments');
        const q = query(commentsRef, where('parentId', '==', initialProduct.id), where('parentType', '==', 'Product'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docPC => ({
          id: docPC.id,
          ...docPC.data(),
          timestamp: docPC.data().timestamp?.toDate()
        })) as ProductOrServiceComment[];
      })(),
    ])
      .then(([categories, owners, comments]) => {
        setAvailableCategories(categories as string[]);
        setBusinessOwners(owners as BusinessOwner[]);
        setProductComments(comments as ProductOrServiceComment[]);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, [initialProduct.id]);

  // Set default business owner if not already set
  useEffect(() => {
    if (
      currentBusiness &&
      (!editedProduct.productOwner || editedProduct.productOwner === '')
    ) {
      setEditedProduct((prev) => ({ ...prev, productOwner: currentBusiness.id }));
    }
  }, [currentBusiness, editedProduct]);

  // Memoized rating calculation
  const getWeightedRating = useCallback((reviews: Review[]) => {
    const total = reviews.reduce((sum, r) => sum + (ratingWeights[r.sentiment] ?? 0), 0);
    return Math.round(total / (reviews.length || 1));
  }, []);
  const weightedRating = useMemo(() => getWeightedRating(allReviews), [allReviews, getWeightedRating]);

  // Handlers
  const handleEditChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    if (name === 'category') {
      const categoryArray = value.split(',').map(item => item.trim());
      setEditedProduct((prev) => ({ ...prev, [name]: categoryArray }));
    } else {
      setEditedProduct((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleImageChange = useCallback((file: File) => {
    setEditedProduct((prev) => ({ ...prev, mainImage: file }));
  }, []);

  const handleAdditionalImageChange = useCallback((index: number, file: File) => {
    setEditedProduct((prev) => {
      const newImages = [...prev.additionalImages];
      newImages[index] = file;
      return { ...prev, additionalImages: newImages };
    });
  }, []);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleUpdateProduct = useCallback(async () => {
    setIsUpdating(true);
    try {
      if (!editedProduct.mainImage) {
        setSnackbar({ open: true, message: 'Main cover image is required', severity: 'error' });
        setIsUpdating(false);
        return;
      }
      const productRef = doc(firebaseDB, 'products', editedProduct.id);
      // Upload images and get their URLs
      const mainImageUrl = await uploadImage(editedProduct.mainImage);
      const additionalImageUrls = await Promise.all(
        editedProduct.additionalImages.map(img => typeof img === 'string' ? img : uploadImage(img))
      );
      await updateDoc(productRef, {
        product_name: editedProduct.product_name,
        category: editedProduct.category,
        description: editedProduct.description,
        isActive: editedProduct.isActive,
        mainImage: mainImageUrl,
        additionalImages: additionalImageUrls.filter(url => url !== null),
        productOwner: editedProduct.productOwner,
      });
      setSnackbar({ open: true, message: 'Product updated successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update product.', severity: 'error' });
    } finally {
      setIsUpdating(false);
    }
  }, [editedProduct]);

  // Early returns for loading/error
  if (loading) return <Box p={3}><LinearProgress /><Typography>Loading...</Typography></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

  // --- UI ---
  if (!editedProduct) {
    return <div>No Products data found.</div>;
  }
  const ratings = [
    { label: "Would recommend", value: weightedRating >= 5 ? 100 : Math.round((weightedRating/5) * 100) },
    { label: "Its Good", value: weightedRating >= 4 ? 80 : Math.round((weightedRating/4) * 100) },
    { label: "Dont mind it", value: weightedRating >= 2 ? 40 : Math.round((weightedRating/2) * 100) },
    { label: "It's bad", value: weightedRating >= 1 ? 20 : Math.round(weightedRating * 100) },
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
            image={typeof editedProduct.mainImage === 'string' ? editedProduct.mainImage : '/assets/placeholder-image.jpg'}
            alt="Product"
          />
        </Box>
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {editedProduct.product_name} 
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
          <strong>Description:</strong> {editedProduct.description} </Typography>
          </Box>
        </CardContent>
      </Card>



      {/* Additional Images Preview */}
      {editedProduct.additionalImages && editedProduct.additionalImages.length > 0 && (
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
              <Typography variant="subtitle1">View additional product images ({editedProduct.additionalImages.length})</Typography>
              <Iconify
                icon={showAdditionalImages ? "eva:arrow-ios-upward-fill" : "eva:arrow-ios-downward-fill"}
                width={20}
                height={20}
              />
            </Box>
            <Collapse in={showAdditionalImages}>
              <Box sx={{ p: 2, pt: 0 }}>
                <Grid container spacing={2}>
                  {editedProduct.additionalImages.map((img, index: number) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card elevation={0} sx={{ bgcolor: '#f5f5f5' }}>
                        <CardMedia
                          component="img"
                          sx={{
                            height: 200,
                            objectFit: "contain"
                          }}
                          image={typeof img === 'string' ? img : ''}
                          alt={`Product view ${index + 1}`}
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
            label={`Comments${editedProduct.comments?.length ? ` (${editedProduct.comments.length})` : ''}`}
            icon={<Iconify width={22} icon="solar:chat-round-dots-bold" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label="Edit Product"
            icon={<Iconify width={22} icon="eva:edit-fill" height={22} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>
      {/** Tab Panels */}
      {activeTab === 0 && (
        <Box sx={{ pt: 3 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={4} sx={{ mb: 3, mt: 3, pr: 4 }}>
              <AnalyticsWidgetSummary
                title="Total views"
                percent={-0.1}
                total={editedProduct.total_views}
                color="secondary"
                icon={<Iconify width={50} icon="icon-park-solid:click" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: [56, 47, 40, 62, 73, 30, 23, 54],
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ mb: 3 , mt: 3,pr: 4}}>
              <AnalyticsWidgetSummary
                title="Positive Reviews"
                percent={2.6}
                total={editedProduct.positive_reviews}
                icon={<Iconify width={50} icon="vaadin:thumbs-up" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: [22, 8, 35, 50, 82, 84, 77, 12],
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ mb: 3,mt: 3, pr: 4 }}>
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
            <Grid  item xs={12} md={6} lg={4} sx={{ mb: 3, pr: 4 }}>
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
            <Grid item xs={12} md={6} lg={8} sx={{ mb: 3,pr: 4 }}>
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

      {/* // Add this state for comments */}
      
    
      {/* // Replace the existing comments section in Tab Panel 1 with: */}
      {activeTab === 1 && (
        <Box sx={{ pt: 3 }}>
          <CommentsList comments={productComments} />
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ pt: 3 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Edit Product</Typography>
            {isUpdating && <LinearProgress sx={{ mb: 2 }} />}
            <Grid container spacing={3}>
            
              {/* Product Name */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="product_name"
                  value={editedProduct.product_name}
                  onChange={handleEditChange}
                />
              </Grid>
              {/* Category */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="dense" >
                  <InputLabel id="category-multiselect-label">Category</InputLabel>
                  <Select
                    labelId="category-multiselect-label"
                    multiple
                    value={editedProduct.category}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      setEditedProduct((prev) => ({ ...prev, category: value.filter((v: string) => v) }));
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
                    <MenuItem onClick={() => setCategoryMenuOpen(false)} sx={{ justifyContent: 'center', fontWeight: 600, color: 'primary.main' }}>
                      Done
                    </MenuItem>
                            <MenuItem disabled divider />
                    {availableCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {editedProduct.category.includes(category) && (
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
              </Grid>
                {/* Business Owner Dropdown */}
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Product Owner"
                  name="productOwner"
                  value={editedProduct.productOwner || ''}
                  onChange={(e) => setEditedProduct({ ...editedProduct, productOwner: e.target.value })}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="" disabled>
                    Select Owner
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
                <ImageUpload
                  label="Main Cover Image"
                  image={editedProduct.mainImage}
                  onChange={handleImageChange}
                  required
                />
              </Grid>
              
              {/* Additional Images - Optional */}
              <Grid item xs={12}>
                <AdditionalImagesUpload
                  images={editedProduct.additionalImages}
                  onChange={handleAdditionalImageChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  name="description"
                  value={editedProduct.description}
                  onChange={handleEditChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editedProduct.isActive}
                      onChange={(e) => setEditedProduct({ ...editedProduct, isActive: e.target.checked })}
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
                  onClick={handleUpdateProduct}
                  disabled={isUpdating}
                  startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {isUpdating ? 'Updating...' : 'Update Product'}
                </Button>
              </Grid>
            </Grid>
          </Card>
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      )}

    </Box>
  )
};
// ----------------------------------------------------------------------;
