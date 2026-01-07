import { useLocation, useNavigate } from 'react-router-dom';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { apiGet, apiPost, apiPut, apiDelete, getAuthToken } from 'src/utils/api';

import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import CheckIcon from '@mui/icons-material/Check';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import {
  Box,
  Tab,
  Card,
  Tabs,
  List,
  Chip,
  Alert,
  Avatar,
  Button,
  Switch,
  Dialog,
  Divider,
  MenuItem,
  ListItem,
  Collapse,
  Snackbar,
  TextField,
  CardMedia,
  Typography,
  CardContent,
    DialogTitle,
  ListItemText,
  DialogContent,
  DialogActions,
  LinearProgress,
  ListItemAvatar,
  CircularProgress,
  FormControlLabel,
  DialogContentText,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { storage } from '../../../firebaseConfig';

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
  id: string; // Review ID
  product_id?: string; // ID of the product being reviewed
  service_id?: string; // ID of the service being reviewed
  userId: string; // ID of the user who wrote the review
  sentiment: Sentiment; // e.g., "Its Good", "Would recommend", etc.
  text?: string; // Optional short comment
  reviewText?: string; // Optional longer review text
  timestamp: any; // Date or timestamp
  sentimentHistory?: ReviewSentimentHistoryEntry[];
  user?: { // User info from API
    id: string;
    fullName?: string;
    displayName?: string;
    profileImage?: string;
  };
  // Add any other fields present in your 'reviews' documents
}

interface ReviewSentimentHistoryEntry {
  sentiment: "It's bad" | "Dont mind it" | "Its Good" | "Would recommend" | string; // The previous sentiment value
  timestamp: Date; // The timestamp when this sentiment was recorded (i.e., when it was the current sentiment)
}
// Interface for a Comment that can belong to a Product or a Service
// Matches mobile app schema from API_ENDPOINTS_AND_SCHEMA.md
interface ProductOrServiceComment {
  id: string; // Unique identifier for the comment
  itemId: string; // The ID of the parent entity (Product or Service) - mobile app uses itemId
  itemType: 'product' | 'service'; // Mobile app uses lowercase 'product' | 'service'
  parentId?: string; // For replies, null for root comments
  depth: number; // 0 = root, 1-2 = replies
  userId: string; // The ID of the user who posted the comment (phone number without +)
  userName: string; // User name who posted the comment
  userAvatar?: string; // Optional user avatar URL
  text: string; // The content of the comment (max 500 characters)
  agreeCount: number; // Number of agree reactions
  disagreeCount: number; // Number of disagree reactions
  replyCount: number; // Number of replies
  isEdited: boolean; // Whether comment was edited
  isReported: boolean; // Whether comment was reported
  isDeleted: boolean; // Whether comment is deleted
  createdAt: Date | any; // When comment was created
  updatedAt?: Date | any; // When comment was last updated
  editedAt?: Date | any; // When comment was edited (if applicable)
  // Legacy fields for backward compatibility
  parentType?: "Product" | "Service"; // Legacy field
  userSentiment?: "Disagree" | "neutral" | "Agree"; // Legacy field (not used in mobile app)
  timestamp?: Date | any; // Legacy field (use createdAt instead)
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

// Define Product type for type safety - matches Firebase schema
interface Product {
  id: string;
  product_name: string;
  category: string[];
  description: string;
  isActive: boolean;
  mainImage: string | File;
  additionalImages?: (string | File)[];
  productOwner: string;
  comments?: string[];
  // Review fields from Firebase
  reviews?: number;
  positive_reviews?: number;
  neutral_reviews?: number;
  total_reviews?: number;
  total_views?: number;
  // QuickRating from Firebase
  quickRating?: {
    average?: number;
    distribution?: {
      1?: number;
      2?: number;
      3?: number;
      4?: number;
      5?: number;
    };
    lastUpdate?: any;
    total?: number;
  };
  createdAt?: any;
  updatedAt?: any;
  lastUpdate?: any;
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
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.setAttribute('style', 'display: flex');
              }}
            />
            <Box
              sx={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 150
              }}
            >
              <Iconify icon="eva:image-fill" width={40} height={40} sx={{ mb: 1, color: 'grey.500' }} />
              <Typography variant="body2" color="text.secondary">
                Image Unavailable
              </Typography>
            </Box>
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
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.setAttribute('style', 'display: flex');
                      }}
                    />
                    <Box
                      sx={{
                        display: 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: 150
                      }}
                    >
                      <Iconify icon="eva:image-fill" width={32} height={32} sx={{ mb: 1, color: 'grey.500' }} />
                      <Typography variant="caption" color="text.secondary">
                        Image Unavailable
                      </Typography>
                    </Box>
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
  // Filter out deleted comments
  const activeComments = comments.filter(comment => !comment.isDeleted);
  
  // Separate root comments and replies
  const rootComments = activeComments.filter(comment => comment.depth === 0 || !comment.parentId);
  const replies = activeComments.filter(comment => comment.depth > 0 && comment.parentId);
  
  // Group replies by parentId
  const repliesByParent = replies.reduce((acc, reply) => {
    const parentId = reply.parentId || '';
    if (!acc[parentId]) {
      acc[parentId] = [];
    }
    acc[parentId].push(reply);
    return acc;
  }, {} as Record<string, ProductOrServiceComment[]>);
  
  // Sort root comments by createdAt (newest first)
  const sortedRootComments = [...rootComments].sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                  (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                  (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return dateB - dateA; // Descending order (newest first)
  });
  
  // Sort replies by createdAt (oldest first for nested display)
  const sortReplies = (replyList: ProductOrServiceComment[]) => 
    [...replyList].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                    (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                    (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateA - dateB; // Ascending order (oldest first for replies)
    });

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>

          <Typography variant="body2" color="text.secondary">
            {sortedRootComments.length} comment{sortedRootComments.length !== 1 ? 's' : ''}
            {replies.length > 0 && ` • ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}
          </Typography>
        </Box>
      </Box>

      {/* Comments List */}
      {sortedRootComments.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedRootComments.map((comment) => {
            const commentReplies = sortReplies(repliesByParent[comment.id] || []);
            return (
              <Card
                key={comment.id}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: 2,
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box sx={{ p: 2.5 }}>
                  {/* Comment Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                    <Avatar
                      src={comment.userAvatar}
                      alt={comment.userName}
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: 'primary.main',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }}
                    >
                      {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.95rem' }}>
                          {comment.userName || 'Unknown User'}
                        </Typography>
                        {comment.isEdited && (
                          <Chip 
                            size="small" 
                            label="Edited" 
                            color="default"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {comment.isReported && (
                          <Chip 
                            size="small" 
                            label="Reported" 
                            color="error"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {comment.createdAt instanceof Date 
                          ? comment.createdAt.toLocaleString() 
                          : comment.createdAt 
                            ? new Date(comment.createdAt).toLocaleString()
                            : 'Date unknown'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Comment Text */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 1.5, 
                      color: 'text.primary',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {comment.text || 'No text provided'}
                  </Typography>

                  {/* Comment Actions/Stats */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {comment.agreeCount > 0 && (
                      <Chip 
                        size="small" 
                        icon={<Iconify icon="solar:like-bold" width={16} />}
                        label={comment.agreeCount} 
                        color="success"
                        variant="outlined"
                        sx={{ 
                          height: 24,
                          bgcolor: 'success.lighter',
                          borderColor: 'success.main',
                        }}
                      />
                    )}
                    {comment.disagreeCount > 0 && (
                      <Chip 
                        size="small" 
                        icon={<Iconify icon="solar:dislike-bold" width={16} />}
                        label={comment.disagreeCount} 
                        color="error"
                        variant="outlined"
                        sx={{ 
                          height: 24,
                          bgcolor: 'error.lighter',
                          borderColor: 'error.main',
                        }}
                      />
                    )}
                    {comment.replyCount > 0 && (
                      <Chip 
                        size="small" 
                        icon={<Iconify icon="solar:chat-round-dots-bold" width={16} />}
                        label={`${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`} 
                        color="default"
                        variant="outlined"
                        sx={{ 
                          height: 24,
                          bgcolor: 'action.hover',
                        }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Replies Section */}
                {commentReplies.length > 0 && (
                  <Box
                    sx={{
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.neutral',
                      pt: 2,
                      pb: 1,
                    }}
                  >
                    <Box sx={{ px: 2.5, mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {commentReplies.length} {commentReplies.length === 1 ? 'Reply' : 'Replies'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 2.5 }}>
                      {commentReplies.map((reply) => (
                        <Box
                          key={reply.id}
                          sx={{
                            display: 'flex',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              borderColor: 'primary.lighter',
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <Avatar
                            src={reply.userAvatar}
                            alt={reply.userName}
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: 'primary.lighter',
                              color: 'primary.main',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            {reply.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </Avatar>
                          
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                {reply.userName || 'Unknown User'}
                              </Typography>
                              {reply.isEdited && (
                                <Chip 
                                  size="small" 
                                  label="Edited" 
                                  color="default"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', ml: 'auto' }}>
                                {reply.createdAt instanceof Date 
                                  ? reply.createdAt.toLocaleString() 
                                  : reply.createdAt 
                                    ? new Date(reply.createdAt).toLocaleString()
                                    : 'Date unknown'}
                              </Typography>
                            </Box>
                            
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.875rem',
                                color: 'text.primary',
                                lineHeight: 1.5,
                                mb: 0.5,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {reply.text || 'No text provided'}
                            </Typography>
                            
                            {(reply.agreeCount > 0 || reply.disagreeCount > 0) && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                {reply.agreeCount > 0 && (
                                  <Chip 
                                    size="small" 
                                    icon={<Iconify icon="solar:like-bold" width={12} />}
                                    label={reply.agreeCount} 
                                    color="success"
                                    variant="outlined"
                                    sx={{ 
                                      height: 20, 
                                      fontSize: '0.65rem',
                                      bgcolor: 'success.lighter',
                                      borderColor: 'success.main',
                                    }}
                                  />
                                )}
                                {reply.disagreeCount > 0 && (
                                  <Chip 
                                    size="small" 
                                    icon={<Iconify icon="solar:dislike-bold" width={12} />}
                                    label={reply.disagreeCount} 
                                    color="error"
                                    variant="outlined"
                                    sx={{ 
                                      height: 20, 
                                      fontSize: '0.65rem',
                                      bgcolor: 'error.lighter',
                                      borderColor: 'error.main',
                                    }}
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>
            );
          })}
        </Box>
      ) : (
        <Card
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'background.neutral',
          }}
        >
          <Iconify icon="solar:chat-round-dots-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
            No comments yet
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Comments from the mobile app will appear here
          </Typography>
        </Card>
      )}
    </Box>
  );
}

function ReviewsList({ reviews, usersMap }: { reviews: Review[]; usersMap: Record<string, { email?: string; firstname?: string; lastname?: string }> }) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Would recommend":
      case "Its Good":
        return 'success';
      case "It's bad":
        return 'error';
      case "Dont mind it":
        return 'warning';
      default:
        return 'default';
    }
  };

  const getUserDisplayName = (userId: string) => {
    const user = usersMap[userId];
    if (user?.firstname && user?.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    if (user?.firstname) {
      return user.firstname;
    }
    if (user?.email) {
      return user.email;
    }
    return `User ${userId.slice(0, 8)}`;
  };

  const getUserInitial = (userId: string) => {
    const user = usersMap[userId];
    if (user?.firstname) {
      return user.firstname.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return userId.charAt(0).toUpperCase();
  };

  return (
    <List sx={{ mt: 2 }}>
      {reviews.length > 0 ? (
        reviews.map((review) => {
          // Get user info from review.user (from API) or fallback to usersMap
          const reviewUser = (review as any).user;
          const displayName = reviewUser?.fullName || reviewUser?.displayName || getUserDisplayName(review.userId);
          const userInitial = reviewUser?.fullName?.charAt(0) || reviewUser?.displayName?.charAt(0) || getUserInitial(review.userId);
          const userAvatar = reviewUser?.profileImage;
          
          return (
            <React.Fragment key={review.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar src={userAvatar}>{userInitial}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight={600}>{displayName}</Typography>
                      <Chip 
                        size="small" 
                        label={review.sentiment || 'Unknown'} 
                        color={getSentimentColor(review.sentiment || '') as 'success' | 'error' | 'warning' | 'default'} 
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block" gutterBottom>
                        {review.timestamp instanceof Date 
                          ? review.timestamp.toLocaleDateString() 
                          : review.timestamp?.toDate 
                            ? review.timestamp.toDate().toLocaleDateString()
                            : new Date().toLocaleDateString()}
                      </Typography>
                      {review.reviewText && (
                        <Typography variant="body2" sx={{ mb: 1 }}>{review.reviewText}</Typography>
                      )}
                      {review.text && (
                        <Typography variant="body2" color="text.secondary">{review.text}</Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          );
        })
      ) : (
        <ListItem>
          <ListItemText primary={<Typography variant="body1" color="text.secondary" align="center">No reviews yet</Typography>} />
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
  const initialProduct = React.useMemo<Product>(() => {
    const product = {
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
    };
    
    // Log product detail object
    console.log('Product Detail Object:', product);
    
    return product;
  }, [location.state?.product]);

  const [editedProduct, setEditedProduct] = useState<Product>(initialProduct);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);
  const [productComments, setProductComments] = useState<ProductOrServiceComment[]>([]);
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { email?: string; firstname?: string; lastname?: string }>>({});
  // Reviews are now fetched from Firestore and stored in productReviews
  const [showAdditionalImages, setShowAdditionalImages] = useState(false);
  const currentBusiness: BusinessOwner | undefined = location.state?.business;
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Fetch all Firestore data in parallel
  useEffect(() => {
    // TODO: Use Prisma auth hook instead of Firebase Auth
    // const { user } = useAuth();
    // console.log('Auth state check:', {
    //   currentUser: user?.email || 'Not authenticated',
    //   uid: user?.id || 'No UID'
    // });
    
    // Comments and reviews are publicly readable, so we can fetch them even without auth
    // Categories and businesses require auth, but we'll handle that gracefully
    
    setLoading(true);
    setError(null);
    Promise.all([
      (async () => {
        try {
          const response = await apiGet('/api/categories', { type: 'PRODUCT' });
          if (response.success && response.data) {
            return response.data.map((cat: any) => cat.name);
          }
          return [];
        } catch (err) {
          console.error('Error fetching categories:', err);
          return [];
        }
      })(),
      (async () => {
        try {
          const response = await apiGet('/api/businesses');
          if (response.success && response.data) {
            return response.data.map((biz: any) => ({
              id: biz.id,
              name: biz.name || biz.businessName || '',
              email: biz.email || biz.businessEmail || '',
              phone: biz.phone || biz.businessPhone || '',
              logo: biz.logo || '',
              location: biz.location || '',
            }));
          }
          return [];
        } catch (err) {
          console.error('Error fetching business owners:', err);
          return [];
        }
      })(),
      (async () => {
        try {
          console.log('=== FETCHING COMMENTS FOR PRODUCT ===');
          console.log('Product ID:', initialProduct.id);
          console.log('Product Name:', initialProduct.product_name);
          
          const response = await apiGet(`/api/comments/product/${initialProduct.id}`, { limit: 1000 });
          if (response.success && response.data) {
            // Map API response to ProductOrServiceComment format
            return response.data.map((comment: any) => ({
              id: comment.id,
              itemId: comment.productId || comment.serviceId || '',
              itemType: (comment.productId ? 'product' : 'service') as 'product' | 'service',
              parentId: comment.parentId || null,
              depth: comment.depth || 0,
              userId: comment.userId || '',
              userName: comment.userName || comment.user?.fullName || 'Unknown User',
              userAvatar: comment.userAvatar || comment.user?.profileImage || undefined,
              text: comment.text || '',
              agreeCount: comment.agreeCount || 0,
              disagreeCount: comment.disagreeCount || 0,
              replyCount: comment.replyCount || 0,
              isEdited: comment.isEdited || false,
              isReported: comment.isReported || false,
              isDeleted: comment.isDeleted || false,
              createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
              updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : undefined,
              parentType: comment.productId ? 'Product' : 'Service',
            })) as ProductOrServiceComment[];
          }
          return [];
        } catch (commentError) {
          console.error('Error fetching comments:', commentError);
          return [];
        }
      })(),
      (async () => {
        try {
          const response = await apiGet('/api/reviews', { productId: initialProduct.id, limit: 1000 });
          if (response.success && response.data) {
            // Map API sentiment enum to display format
            const sentimentMap: Record<string, string> = {
              'WOULD_RECOMMEND': 'Would recommend',
              'ITS_GOOD': 'Its Good',
              'DONT_MIND_IT': 'Dont mind it',
              'ITS_BAD': "It's bad",
            };
            
            return response.data.map((review: any) => {
              // Get user info from review.user (included by API) or fallback
              const reviewUser = review.user || {};
              
              return {
                id: review.id,
                product_id: review.productId || null,
                service_id: review.serviceId || null,
                userId: review.userId || '',
                sentiment: sentimentMap[review.sentiment] || review.sentiment || null,
                text: review.text || review.reviewText || '',
                reviewText: review.reviewText || review.text || '',
                timestamp: review.createdAt ? new Date(review.createdAt) : new Date(),
                sentimentHistory: review.sentimentHistory || [],
                // Include user info for display
                user: {
                  id: reviewUser.id || review.userId,
                  fullName: reviewUser.fullName || reviewUser.displayName,
                  displayName: reviewUser.displayName || reviewUser.fullName,
                  profileImage: reviewUser.profileImage,
                },
                ...review,
              };
            }) as Review[];
          }
          return [] as Review[];
        } catch (err) {
          console.error('Error fetching reviews:', err);
          return [] as Review[];
        }
      })(),
      (async () => {
        try {
          const response = await apiGet('/api/users', { limit: 1000 });
          if (response.success && response.data) {
            const users: Record<string, { email?: string; firstname?: string; lastname?: string }> = {};
            response.data.forEach((u: any) => {
              users[u.id] = {
                email: u.email,
                firstname: u.firstName || u.firstname,
                lastname: u.lastName || u.lastname,
              };
            });
            return users;
          }
          return {} as Record<string, { email?: string; firstname?: string; lastname?: string }>;
        } catch (err) {
          console.error('Error fetching users:', err);
          return {} as Record<string, { email?: string; firstname?: string; lastname?: string }>;
        }
      })(),
    ])
      .then(([categories, owners, comments, reviews, users]) => {
        setAvailableCategories(categories as string[]);
        setBusinessOwners(owners as BusinessOwner[]);
        setProductComments(comments as ProductOrServiceComment[]);
        setProductReviews(reviews as Review[]);
        setUsersMap(users as Record<string, { email?: string; firstname?: string; lastname?: string }>);
        console.log('Successfully loaded:', {
          categories: (categories as string[]).length,
          owners: (owners as BusinessOwner[]).length,
          comments: (comments as ProductOrServiceComment[]).length,
          reviews: (reviews as Review[]).length,
          users: Object.keys(users as Record<string, any>).length
        });
       
        setLoading(false);
      })
      .catch((loadError) => {
        console.error('Error loading product data:', loadError);
        setError('Failed to load data. Please refresh the page.');
        setLoading(false);
      });
  }, [initialProduct.id, initialProduct.product_name]);

  // Set default business owner if not already set
  useEffect(() => {
    if (
      currentBusiness &&
      (!editedProduct.productOwner || editedProduct.productOwner === '')
    ) {
      // Only set default if the product is being created new, not when editing existing
      // For existing products, let the user choose or leave as "Not Set"
    }
  }, [currentBusiness, editedProduct]);

  // Memoized rating calculation
  const getWeightedRating = useCallback((reviews: Review[]) => {
    const total = reviews.reduce((sum, r) => sum + (ratingWeights[r.sentiment] ?? 0), 0);
    return Math.round(total / (reviews.length || 1));
  }, []);
  const weightedRating = useMemo(() => getWeightedRating(productReviews), [productReviews, getWeightedRating]);

  // Calculate sentiment distribution (matching mobile app)
  const sentimentDistribution = useMemo(() => {
    const total = productReviews.length;
    if (total === 0) {
      return {
        "Would recommend": 0,
        "Its Good": 0,
        "Dont mind it": 0,
        "It's bad": 0,
      };
    }
    
    const counts = productReviews.reduce((acc, review) => {
      const sentiment = review.sentiment;
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      "Would recommend": Math.round((counts["Would recommend"] || 0) / total * 100),
      "Its Good": Math.round((counts["Its Good"] || 0) / total * 100),
      "Dont mind it": Math.round((counts["Dont mind it"] || 0) / total * 100),
      "It's bad": Math.round((counts["It's bad"] || 0) / total * 100),
    };
  }, [productReviews]);

  // Calculate review counts from Firebase product document fields
  // Use actual fields from product document (positive_reviews, neutral_reviews, total_reviews)
  // Fallback to calculating from reviews collection if product fields are not available
  const reviewCounts = useMemo(() => {
    // First, try to use the actual fields from the product document
    if (editedProduct.positive_reviews !== undefined || editedProduct.total_reviews !== undefined) {
      const positive = editedProduct.positive_reviews || 0;
      const neutral = editedProduct.neutral_reviews || 0;
      const total = editedProduct.total_reviews || 0;
      // Calculate negative as: total - positive - neutral
      const negative = total - positive - neutral;
      return { positive, negative, neutral, total };
    }
    
    // Fallback: Calculate from reviews collection if product fields are not available
    const positive = productReviews.filter(
      review => review.sentiment === "Its Good" || review.sentiment === "Would recommend"
    ).length;
    const negative = productReviews.filter(
      review => review.sentiment === "It's bad"
    ).length;
    const neutral = productReviews.filter(
      review => review.sentiment === "Dont mind it"
    ).length;
    const total = productReviews.length;
    return { positive, negative, neutral, total };
  }, [productReviews, editedProduct.positive_reviews, editedProduct.neutral_reviews, editedProduct.total_reviews]);

  // Helper function to convert Firestore timestamp to Date
  const convertToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    return null;
  };

  // Helper function to get month name from date
  const getMonthName = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()];
  };

  // Helper function to calculate monthly trends from reviews/comments
  const calculateMonthlyTrends = useCallback((items: any[], months: string[], dateField: string = 'timestamp'): number[] => {
    const monthCounts: { [key: string]: number } = {};
    months.forEach(month => { monthCounts[month] = 0; });

    items.forEach((item) => {
      const date = convertToDate(item[dateField] || item.createdAt || item.timestamp);
      if (date) {
        const monthName = getMonthName(date);
        if (monthCounts[monthName] !== undefined) {
          monthCounts[monthName] += 1;
        }
      }
    });

    // Calculate cumulative counts
    let cumulative = 0;
    return months.map(month => {
      cumulative += monthCounts[month];
      return cumulative;
    });
  }, []);

  // Helper function to calculate percentage change
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calculate analytics data from Firebase
  // Use actual product document fields (total_views, positive_reviews, etc.) from Firebase schema
  const analyticsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    
    // Use total_views from product document
    const currentViews = editedProduct.total_views || 0;
    // Calculate monthly trends for views (using comments as proxy for engagement trends)
    const viewsSeries = calculateMonthlyTrends(productComments, months, 'createdAt');
    const previousViews = viewsSeries[6] || 0; // 7th month (index 6)
    const viewsPercent = calculatePercentageChange(currentViews, previousViews);

    // Use positive_reviews from product document, calculate trends from reviews collection
    const positiveReviews = productReviews.filter(
      review => review.sentiment === "Its Good" || review.sentiment === "Would recommend"
    );
    const positiveSeries = calculateMonthlyTrends(positiveReviews, months, 'timestamp');
    const currentPositive = editedProduct.positive_reviews !== undefined 
      ? editedProduct.positive_reviews 
      : reviewCounts.positive;
    const previousPositive = positiveSeries[6] || 0;
    const positivePercent = calculatePercentageChange(currentPositive, previousPositive);

    // Calculate negative reviews: total_reviews - positive_reviews - neutral_reviews
    const currentNegative = editedProduct.total_reviews && editedProduct.positive_reviews !== undefined
      ? (editedProduct.total_reviews - editedProduct.positive_reviews - (editedProduct.neutral_reviews || 0))
      : reviewCounts.negative;
    const negativeReviews = productReviews.filter(
      review => review.sentiment === "It's bad"
    );
    const negativeSeries = calculateMonthlyTrends(negativeReviews, months, 'timestamp');
    const previousNegative = negativeSeries[6] || 0;
    const negativePercent = calculatePercentageChange(currentNegative, previousNegative);

    return {
      views: { series: viewsSeries, percent: viewsPercent },
      positive: { series: positiveSeries, percent: positivePercent },
      negative: { series: negativeSeries, percent: negativePercent },
    };
  }, [productComments, productReviews, editedProduct.total_views, editedProduct.positive_reviews, editedProduct.neutral_reviews, editedProduct.total_reviews, reviewCounts, calculateMonthlyTrends]);

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
      const newImages = [...(prev.additionalImages || [])];
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
      // Upload images and get their URLs
      const mainImageUrl = await uploadImage(editedProduct.mainImage);
      const additionalImageUrls = await Promise.all(
        (editedProduct.additionalImages || []).map(img => typeof img === 'string' ? img : uploadImage(img))
      );

      const token = getAuthToken();
      const response = await apiPut(`/api/products/${editedProduct.id}`, {
        productName: editedProduct.product_name,
        categoryIds: editedProduct.category,
        description: editedProduct.description,
        isActive: editedProduct.isActive,
        mainImage: mainImageUrl,
        additionalImages: additionalImageUrls.filter(url => url !== null),
        productOwner: editedProduct.productOwner === 'SetLater' ? undefined : editedProduct.productOwner,
        businessId: editedProduct.productOwner === 'SetLater' ? undefined : editedProduct.productOwner,
      }, token);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update product');
      }

      setSnackbar({ open: true, message: 'Product updated successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update product.', severity: 'error' });
    } finally {
      setIsUpdating(false);
    }
  }, [editedProduct]);

  // Delete product handler
  const handleDeleteProduct = useCallback(async () => {
    setIsDeleting(true);
    try {
      const token = getAuthToken();
      const response = await apiDelete(`/api/products/${editedProduct.id}`, token);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete product');
      }
      
      setSnackbar({ open: true, message: 'Product deleted successfully!', severity: 'success' });
      
      // Navigate back to products list after a short delay
      setTimeout(() => {
        navigate('/products');
      }, 1500);
    } catch (err) {
      console.error('Error deleting product:', err);
      setSnackbar({ open: true, message: 'Failed to delete product.', severity: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [editedProduct.id, navigate]);

  // Early returns for loading/error
  if (loading) return <Box p={3}><LinearProgress /><Typography>Loading...</Typography></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

  // --- UI ---
  if (!editedProduct) {
    return <div>No Products data found.</div>;
  }
  // Ratings based on actual sentiment distribution (matching mobile app)
  const ratings = [
    { label: "Would recommend", value: sentimentDistribution["Would recommend"] },
    { label: "Its Good", value: sentimentDistribution["Its Good"] },
    { label: "Dont mind it", value: sentimentDistribution["Dont mind it"] },
    { label: "It's bad", value: sentimentDistribution["It's bad"] },
  ];

  return (
    <Box sx={{ p: 3, width: "90%", mx: "auto" }}>
      <Card sx={{ display: "flex", p: 2, alignItems: "stretch", bgcolor: "#fff3e0", minHeight: 280 }}>
        <Box sx={{ 
          width: 180,
          position: 'relative',
          mr: 2,
          flex: '0 0 auto',
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          {typeof editedProduct.mainImage === 'string' && editedProduct.mainImage ? (
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
              image={editedProduct.mainImage}
              alt="Product"
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
              display: (typeof editedProduct.mainImage === 'string' && editedProduct.mainImage) ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minHeight: 280,
              bgcolor: 'grey.200'
            }}
          >
            <Iconify 
              icon="eva:shopping-bag-fill" 
              width={48} 
              height={48} 
              sx={{ color: 'grey.500', mb: 1 }}
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ textAlign: 'center' }}
            >
              No Product Image
            </Typography>
          </Box>
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
      {editedProduct.additionalImages && Array.isArray(editedProduct.additionalImages) && editedProduct.additionalImages.length > 0 && (
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
                  {(editedProduct.additionalImages || []).map((img, index: number) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card elevation={0} sx={{ bgcolor: '#f5f5f5', height: 200 }}>
                        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                          <CardMedia
                            component="img"
                            sx={{
                              height: 200,
                              objectFit: "contain"
                            }}
                            image={typeof img === 'string' ? img : ''}
                            alt={`Product view ${index + 1}`}
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.setAttribute('style', 'display: flex');
                            }}
                          />
                          <Box
                            sx={{
                              display: 'none',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              height: '100%',
                              bgcolor: 'grey.200'
                            }}
                          >
                            <Iconify 
                              icon="eva:image-fill" 
                              width={32} 
                              height={32} 
                              sx={{ color: 'grey.500', mb: 1 }}
                            />
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '0.75rem', textAlign: 'center' }}
                            >
                              Image Unavailable
                            </Typography>
                          </Box>
                        </Box>
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
            label={`Comments${productComments.length > 0 ? ` (${productComments.length})` : ''}`}
            icon={<Iconify width={22} icon="solar:chat-round-dots-bold" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label={`Reviews${productReviews.length > 0 ? ` (${productReviews.length})` : ''}`}
            icon={<Iconify width={22} icon="solar:star-bold" height={22} />}
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
                percent={analyticsData.views.percent}
                total={editedProduct.total_views || 0}
                color="secondary"
                icon={<Iconify width={50} icon="icon-park-solid:click" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: analyticsData.views.series,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ mb: 3 , mt: 3,pr: 4}}>
              <AnalyticsWidgetSummary
                title="Positive Reviews"
                percent={analyticsData.positive.percent}
                total={reviewCounts.positive}
                icon={<Iconify width={50} icon="vaadin:thumbs-up" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: analyticsData.positive.series,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{ mb: 3,mt: 3, pr: 4 }}>
              <AnalyticsWidgetSummary
                title="Negative Reviews"
                percent={analyticsData.negative.percent}
                total={reviewCounts.negative}
                color="warning"
                icon={<Iconify width={50} icon="vaadin:thumbs-down" height="50" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: analyticsData.negative.series,
                }}
              />
            </Grid>
            {/* <Grid  item xs={12} md={6} lg={4} sx={{ mb: 3, pr: 4 }}>
              <AnalyticsCurrentVisits
                title="Users by gender"
                chart={{
                  series: [
                    { label: 'Male', value: 3500 },
                    { label: 'female', value: 2500 },
                  ],
                }}
              />
            </Grid> */}
            {/* <Grid item xs={12} md={6} lg={8} sx={{ mb: 3,pr: 4 }}>
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
            </Grid> */}
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ pt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Comments</Typography>
          <CommentsList comments={productComments} />
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ pt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Reviews</Typography>
          <ReviewsList reviews={productReviews} usersMap={usersMap} />
        </Box>
      )}

      {activeTab === 3 && (
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
                  onChange={(e) => {
                    setEditedProduct({ ...editedProduct, productOwner: e.target.value });
                  }}
                  SelectProps={{ 
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value || value === '') {
                        return 'Not Set';
                      }
                      
                      // If businessOwners is not loaded yet, show the ID
                      if (businessOwners.length === 0) {
                        return `Loading... (ID: ${value})`;
                      }
                      
                      // Try to find by ID first, then by name/email as fallback
                      let owner = businessOwners.find(o => o.id === value);
                      
                      // If not found by ID, try to find by name or email
                      if (!owner) {
                        owner = businessOwners.find(o => {
                          const nameMatch = o.name === value;
                          const emailMatch = o.email === value;
                          return nameMatch || emailMatch;
                        });
                      }
                      
                      return owner ? (owner.name || owner.email || owner.id) : `Not Found (ID: ${value})`;
                    }
                  }}
                >
                  <MenuItem value="">
                    Not Set
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
                  images={editedProduct.additionalImages || []}
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
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdateProduct}
                    disabled={isUpdating}
                    startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {isUpdating ? 'Updating...' : 'Update Product'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeleting}
                    startIcon={<Iconify icon="eva:trash-2-fill" />}
                  >
                    Delete Product
                  </Button>
                </Box>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the product &quot;{editedProduct.product_name}&quot;? This action cannot be undone and will permanently remove the product from the system.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            color="primary"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProduct} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
};
// ----------------------------------------------------------------------;
