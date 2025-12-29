import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { doc, query, where, getDocs, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';

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
  CircularProgress, // Import CircularProgress
  FormControlLabel,
  DialogContentText,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import { storage } from '../../../firebaseConfig';
import { AnalyticsCurrentVisits } from './analytics-current-visits';
import { AnalyticsWebsiteVisits } from './analytics-website-visits';
import { AnalyticsWidgetSummary } from './analytics-widget-summary';


const uploadImage = async (file: File | string) => {
  if (typeof file === 'string') return file;
  const storageRef = ref(storage, `services/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

const ratingWeights: Record<string, number> = {
  "It's bad": 1,
  "Dont mind it": 2,
  "Its Good": 4,
  "Would recommend": 5,
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

interface BusinessOwner {
  id: string;
  name?: string;
  email?: string;
}

// Define Service type for type safety
interface Service {
  id: string;
  service_name: string;
  category: string[];
  description: string;
  isActive: boolean;
  mainImage: string | File;
  additionalImages: (string | File)[];
  service_owner: string;
  comments?: string[];
  [key: string]: any; // for any additional dynamic fields
}

// Default service object for initialization
const defaultService: Service = {
  id: '',
  service_name: '',
  category: [],
  description: '',
  isActive: true,
  mainImage: '',
  additionalImages: [],
  service_owner: '',
  comments: [],
};

function CommentsList({ comments }: { comments: ProductOrServiceComment[] }) {
  console.log('CommentsList received comments:', comments, 'Count:', comments.length);
  // Filter out deleted comments
  const activeComments = comments.filter(comment => !comment.isDeleted);
  console.log('Active comments after filtering:', activeComments.length);
  
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
        reviews.map((review) => (
          <React.Fragment key={review.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar>{getUserInitial(review.userId)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight={600}>{getUserDisplayName(review.userId)}</Typography>
                    <Chip 
                      size="small" 
                      label={review.sentiment} 
                      color={getSentimentColor(review.sentiment) as 'success' | 'error' | 'warning' | 'default'} 
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
        ))
      ) : (
        <ListItem>
          <ListItemText primary={<Typography variant="body1" color="text.secondary" align="center">No reviews yet</Typography>} />
        </ListItem>
      )}
    </List>
  );
}

/**
 * ServiceDetail displays and manages the details and editing of a single service.
 * Handles Firestore integration, image uploads, and review calculations.
 */
export function ServiceDetail() {
  const location = useLocation();
  const initialService = React.useMemo<Service>(() => {
    const service = {
      ...defaultService,
      ...(location.state?.service || {}),
      id: location.state?.service?.id ?? '',
      service_name: location.state?.service?.service_name ?? '',
      category: location.state?.service?.category ?? [],
      description: location.state?.service?.description ?? '',
      isActive: location.state?.service?.isActive ?? true,
      mainImage: location.state?.service?.mainImage ?? '',
      additionalImages: location.state?.service?.additionalImages ?? [],
      service_owner: location.state?.service?.service_owner ?? '',
      comments: location.state?.service?.comments ?? [],
    };
    
    return service;
  }, [location.state?.service]);

  const [editedService, setEditedService] = useState<Service>(initialService);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);
  const [serviceComments, setServiceComments] = useState<ProductOrServiceComment[]>([]);
  const [serviceReviews, setServiceReviews] = useState<Review[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { email?: string; firstname?: string; lastname?: string }>>({});
  const [showAdditionalImages, setShowAdditionalImages] = useState(false);
  const currentBusiness: BusinessOwner | undefined = location.state?.business;
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Fetch all Firestore data in parallel
  useEffect(() => {
    // Verify authentication before fetching
    console.log('Auth state check:', {
      currentUser: auth.currentUser?.email || 'Not authenticated',
      uid: auth.currentUser?.uid || 'No UID'
    });
    
    if (!auth.currentUser) {
      console.error('⚠️ User not authenticated. Some queries may fail.');
      setError('Please sign in to view service details.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    Promise.all([
      (async () => {
        const categoriesCollection = collection(firebaseDB, 'categories');
        const querySnapshot = await getDocs(categoriesCollection);
        return querySnapshot.docs
          .map(document => document.data())
          .filter(cat => cat.type === 'service')
          .map(cat => cat.name);
      })(),
      (async () => {
        const businessesCollection = collection(firebaseDB, 'businesses');
        const querySnapshot = await getDocs(businessesCollection);
        return querySnapshot.docs.map(docBC => ({ id: docBC.id, ...(docBC.data() as Omit<BusinessOwner, 'id'>) }));
      })(),
      (async () => {
        try {
          console.log('=== FETCHING COMMENTS FOR SERVICE ===');
          console.log('Service ID:', initialService.id);
          console.log('Service Name:', initialService.service_name);
          
          const commentsRef = collection(firebaseDB, 'comments');
          
          // Mobile app uses itemId and itemType (lowercase 'product' | 'service')
          // Also check for legacy parentId/parentType fields for backward compatibility
          const queries = [
            // Primary: Mobile app schema (itemId + itemType)
            query(
              commentsRef, 
              where('itemId', '==', initialService.id), 
              where('itemType', '==', 'service'),
              where('isDeleted', '==', false) // Only fetch non-deleted comments
            ),
            // Legacy: parentId + parentType (capitalized)
            query(
              commentsRef, 
              where('parentId', '==', initialService.id), 
              where('parentType', '==', 'Service')
            ),
            // Legacy: parentId + parentType (lowercase)
            query(
              commentsRef, 
              where('parentId', '==', initialService.id), 
              where('parentType', '==', 'service')
            ),
          ];
          
          console.log('Executing queries:', {
            query1: `itemId == ${initialService.id} AND itemType == 'service' AND isDeleted == false`,
            query2: `parentId == ${initialService.id} AND parentType == 'Service'`,
            query3: `parentId == ${initialService.id} AND parentType == 'service'`,
          });
          
          const snapshots = await Promise.all(
            queries.map((q, index) => 
              getDocs(q)
                .then(snapshot => {
                  console.log(`Query ${index + 1} returned ${snapshot.docs.length} documents`);
                  if (snapshot.docs.length > 0) {
                    console.log(`Query ${index + 1} sample docs:`, snapshot.docs.slice(0, 2).map(commentDoc => ({
                      id: commentDoc.id,
                      data: commentDoc.data()
                    })));
                  }
                  return snapshot;
                })
                .catch((queryError) => {
                  console.error(`Query ${index + 1} error:`, queryError);
                  return { docs: [] };
                })
            )
          );
          
          // Combine results and remove duplicates
          const allDocs = snapshots.flatMap(snapshot => snapshot.docs);
          console.log(`Total documents from all queries: ${allDocs.length}`);
          
          const uniqueDocs = Array.from(
            new Map(allDocs.map(commentDoc => [commentDoc.id, commentDoc])).values()
          );
          console.log(`Unique documents after deduplication: ${uniqueDocs.length}`);
          
          const comments = uniqueDocs.map(commentDoc => {
            const data = commentDoc.data();
            
            console.log('Processing comment document:', {
              id: commentDoc.id,
              rawData: data
            });
            
            // Use mobile app schema fields (itemId/itemType) with fallback to legacy fields
            const itemId = data.itemId || data.parentId || data.parent_id || '';
            const itemType = (data.itemType || data.parentType || data.parent_type || 'service').toLowerCase() as 'product' | 'service';
            
            // Handle timestamp - prefer createdAt, fallback to timestamp
            const timestamp = data.createdAt?.toDate ? data.createdAt.toDate() : 
                             (data.createdAt instanceof Date ? data.createdAt :
                             (data.timestamp?.toDate ? data.timestamp.toDate() : 
                             (data.timestamp instanceof Date ? data.timestamp : 
                             (data.createdAt ? new Date(data.createdAt) :
                             (data.timestamp ? new Date(data.timestamp) : new Date())))));
            
            const mappedComment = {
              id: commentDoc.id,
              itemId,
              itemType,
              parentId: data.parentId || null, // For replies
              depth: data.depth ?? 0, // 0 = root comment
              userId: data.userId || data.user_id || '',
              userName: data.userName || data.user_name || data.userId || 'Unknown User',
              userAvatar: data.userAvatar || data.user_avatar || data.photoURL || undefined,
              text: data.text || data.comment || '',
              agreeCount: data.agreeCount ?? data.agree_count ?? 0,
              disagreeCount: data.disagreeCount ?? data.disagree_count ?? 0,
              replyCount: data.replyCount ?? data.reply_count ?? 0,
              isEdited: data.isEdited ?? data.is_edited ?? false,
              isReported: data.isReported ?? data.is_reported ?? false,
              isDeleted: data.isDeleted ?? data.is_deleted ?? false,
              createdAt: timestamp,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : 
                        (data.updatedAt instanceof Date ? data.updatedAt : undefined),
              editedAt: data.editedAt?.toDate ? data.editedAt.toDate() : 
                       (data.editedAt instanceof Date ? data.editedAt : undefined),
              // Legacy fields for backward compatibility
              parentType: itemType === 'product' ? 'Product' : 'Service',
              timestamp,
            };
            
            console.log('Mapped comment:', mappedComment);
            return mappedComment;
          }).filter(comment => {
            const notDeleted = !comment.isDeleted;
            if (!notDeleted) {
              console.log('Filtered out deleted comment:', comment.id);
            }
            return notDeleted;
          }) as ProductOrServiceComment[]; // Filter out deleted comments
          
          console.log(`=== FINAL RESULT: ${comments.length} comments for service ${initialService.id} ===`);
          console.log('Service Name:', initialService.service_name);
          console.log('All comments:', comments);
          console.log('Comments summary:', {
            serviceId: initialService.id,
            serviceName: initialService.service_name,
            totalComments: comments.length,
            rootComments: comments.filter(c => c.depth === 0 || !c.parentId).length,
            replies: comments.filter(c => c.depth > 0 || c.parentId).length,
            comments: comments.map(comment => ({
              id: comment.id,
              itemId: comment.itemId,
              itemType: comment.itemType,
              userId: comment.userId,
              userName: comment.userName,
              text: comment.text ? (comment.text.length > 50 ? `${comment.text.substring(0, 50)}...` : comment.text) : '',
              depth: comment.depth,
              parentId: comment.parentId || 'root',
              agreeCount: comment.agreeCount,
              disagreeCount: comment.disagreeCount,
              replyCount: comment.replyCount,
              isEdited: comment.isEdited,
              isReported: comment.isReported,
              isDeleted: comment.isDeleted,
              createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
            }))
          });
          console.log('=== END COMMENT FETCH ===');
          return comments;
        } catch (commentError) {
          console.error('Error fetching comments:', commentError);
          return [];
        }
      })(),
      (async () => {
        const reviewsRef = collection(firebaseDB, 'reviews');
        const q = query(reviewsRef, where('service_id', '==', initialService.id));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docReview => ({
          id: docReview.id,
          ...docReview.data(),
          timestamp: docReview.data().timestamp?.toDate ? docReview.data().timestamp.toDate() : new Date(docReview.data().timestamp)
        })) as Review[];
      })(),
      (async () => {
        // Fetch users to get names for reviews
        const usersRef = collection(firebaseDB, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const users: Record<string, { email?: string; firstname?: string; lastname?: string }> = {};
        usersSnapshot.docs.forEach(userDoc => {
          const userData = userDoc.data();
          users[userDoc.id] = {
            email: userData.email,
            firstname: userData.firstname,
            lastname: userData.lastname,
          };
        });
        return users;
      })(),
    ])
      .then(([categories, owners, comments, reviews, users]) => {
        setAvailableCategories(categories as string[]);
        setBusinessOwners(owners as BusinessOwner[]);
        setServiceComments(comments as ProductOrServiceComment[]);
        setServiceReviews(reviews as Review[]);
        setUsersMap(users as Record<string, { email?: string; firstname?: string; lastname?: string }>);
        console.log('Successfully loaded:', {
          categories: (categories as string[]).length,
          owners: (owners as BusinessOwner[]).length,
          comments: (comments as ProductOrServiceComment[]).length,
          reviews: (reviews as Review[]).length,
          users: Object.keys(users as Record<string, any>).length
        });
        // Log all comments for the service
        console.log('=== ALL COMMENTS FOR SERVICE ===');
        console.log('Service ID:', initialService.id);
        console.log('Service Name:', initialService.service_name);
        console.log('Total Comments:', (comments as ProductOrServiceComment[]).length);
        console.table((comments as ProductOrServiceComment[]).map(comment => ({
          id: comment.id,
          itemId: comment.itemId,
          itemType: comment.itemType,
          userId: comment.userId,
          userName: comment.userName,
          text: comment.text ? (comment.text.length > 50 ? `${comment.text.substring(0, 50)}...` : comment.text) : '',
          depth: comment.depth,
          parentId: comment.parentId || 'root',
          agreeCount: comment.agreeCount,
          disagreeCount: comment.disagreeCount,
          replyCount: comment.replyCount,
          isEdited: comment.isEdited,
          isReported: comment.isReported,
          isDeleted: comment.isDeleted,
          createdAt: comment.createdAt instanceof Date 
            ? comment.createdAt.toISOString() 
            : comment.createdAt,
        })));
        console.log('=== END COMMENTS ===');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading service data:', err);
        setError('Failed to load data. Please refresh the page.');
        setLoading(false);
      });
  }, [initialService.id, initialService.service_name]);

  // Set default business owner if not already set
  useEffect(() => {
    if (
      currentBusiness &&
      (!editedService?.serviceOwner || editedService?.serviceOwner === '')
    ) {
      // Only set default if the service is being created new, not when editing existing
      // For existing services, let the user choose or leave as "Not Set"
    }
  }, [currentBusiness, editedService]);

  // Memoized rating calculation
  const getWeightedRating = useCallback((reviews: Review[]) => {
    const total = reviews.reduce((sum, r) => sum + (ratingWeights[r.sentiment] ?? 0), 0);
    return Math.round(total / (reviews.length || 1));
  }, []);
  const weightedRating = useMemo(() => getWeightedRating(serviceReviews), [serviceReviews, getWeightedRating]);

  // Calculate sentiment distribution (matching mobile app)
  const sentimentDistribution = useMemo(() => {
    const total = serviceReviews.length;
    if (total === 0) {
      console.log('No reviews found, returning 0% for all sentiments');
      return {
        "Would recommend": 0,
        "Its Good": 0,
        "Dont mind it": 0,
        "It's bad": 0,
      };
    }
    
    const counts = serviceReviews.reduce((acc, review) => {
      const sentiment = review.sentiment;
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const distribution = {
      "Would recommend": Math.round((counts["Would recommend"] || 0) / total * 100),
      "Its Good": Math.round((counts["Its Good"] || 0) / total * 100),
      "Dont mind it": Math.round((counts["Dont mind it"] || 0) / total * 100),
      "It's bad": Math.round((counts["It's bad"] || 0) / total * 100),
    };
    
    console.log('Sentiment Distribution:', {
      totalReviews: total,
      counts,
      distribution,
      reviews: serviceReviews.map(r => ({ id: r.id, sentiment: r.sentiment }))
    });
    
    return distribution;
  }, [serviceReviews]);

  // Calculate positive and negative reviews from actual review data
  const reviewCounts = useMemo(() => {
    const positive = serviceReviews.filter(
      review => review.sentiment === "Its Good" || review.sentiment === "Would recommend"
    ).length;
    const negative = serviceReviews.filter(
      review => review.sentiment === "It's bad"
    ).length;
    return { positive, negative };
  }, [serviceReviews]);

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
  const analyticsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    
    // Calculate monthly trends for views (using comments as proxy for engagement)
    const viewsSeries = calculateMonthlyTrends(serviceComments, months, 'createdAt');
    const currentViews = editedService.total_views || 0;
    const previousViews = viewsSeries[6] || 0; // 7th month (index 6)
    const viewsPercent = calculatePercentageChange(currentViews, previousViews);

    // Calculate monthly trends for positive reviews
    const positiveReviews = serviceReviews.filter(
      review => review.sentiment === "Its Good" || review.sentiment === "Would recommend"
    );
    const positiveSeries = calculateMonthlyTrends(positiveReviews, months, 'timestamp');
    const currentPositive = reviewCounts.positive;
    const previousPositive = positiveSeries[6] || 0;
    const positivePercent = calculatePercentageChange(currentPositive, previousPositive);

    // Calculate monthly trends for negative reviews
    const negativeReviews = serviceReviews.filter(
      review => review.sentiment === "It's bad"
    );
    const negativeSeries = calculateMonthlyTrends(negativeReviews, months, 'timestamp');
    const currentNegative = reviewCounts.negative;
    const previousNegative = negativeSeries[6] || 0;
    const negativePercent = calculatePercentageChange(currentNegative, previousNegative);

    return {
      views: { series: viewsSeries, percent: viewsPercent },
      positive: { series: positiveSeries, percent: positivePercent },
      negative: { series: negativeSeries, percent: negativePercent },
    };
  }, [serviceComments, serviceReviews, editedService.total_views, reviewCounts, calculateMonthlyTrends]);

  // Early returns for loading/error
  if (loading) return <Box p={3}><LinearProgress /><Typography>Loading...</Typography></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

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
        setSnackbar({ open: true, message: 'Main cover image is required', severity: 'error' });
        setIsUpdating(false); // Reset loading state on validation error
        return;
      }

      const serviceRef = doc(firebaseDB, 'services', editedService.id);

      // Upload main image (always required)
      const mainImageUrl = await uploadImage(editedService.mainImage);

      // Handle additional images: upload new ones or keep existing ones
      const additionalImagePromises = [1, 2, 3].map(async (index) => {
        const newImageFile = editedService[`additionalImage${index}`];
        const existingImageUrl = initialService.additionalImages?.[index - 1];

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
        additionalImages: additionalImageUrls.filter((url): url is string => url !== null),
        serviceOwner: editedService.serviceOwner || '',
        updatedAt: serverTimestamp(), // Add the updatedAt timestamp using Firestore server timestamp
      });

      setSnackbar({ open: true, message: 'Service updated successfully!', severity: 'success' });
    } catch (updateError) {
      console.error("Error updating service:", updateError);
      setSnackbar({ open: true, message: 'Failed to update service.', severity: 'error' });
    } finally {
      setIsUpdating(false); // Reset loading state regardless of success or error
    }
  };

  // Delete service handler
  const handleDeleteService = async () => {
    setIsDeleting(true);
    try {
      const serviceRef = doc(firebaseDB, 'services', editedService.id);
      await deleteDoc(serviceRef);
      
      setSnackbar({ open: true, message: 'Service deleted successfully!', severity: 'success' });
      
      // Navigate back to services list after a short delay
      setTimeout(() => {
        navigate('/services');
      }, 1500);
    } catch (err) {
      console.error('Error deleting service:', err);
      setSnackbar({ open: true, message: 'Failed to delete service.', severity: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!editedService) {
    return <div>No Service data found.</div>;
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
          {editedService.mainImage ? (
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
              image={typeof editedService.mainImage === 'string' ? editedService.mainImage : ''}
              alt="Service"
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
              display: editedService.mainImage ? 'none' : 'flex',
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
              icon="eva:briefcase-fill" 
              width={48} 
              height={48} 
              sx={{ color: 'grey.500', mb: 1 }}
            />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ textAlign: 'center' }}
            >
              No Service Image
            </Typography>
          </Box>
        </Box>
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {editedService.service_name}
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
              <strong>Description:</strong> {editedService.description}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {initialService.additionalImages && initialService.additionalImages.length > 0 && (
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
              <Typography variant="subtitle1">View additional service images ({initialService.additionalImages.length})</Typography>
              <Iconify
                icon={showAdditionalImages ? "eva:arrow-ios-upward-fill" : "eva:arrow-ios-downward-fill"}
                width={20}
                height={20}
              />
            </Box>
            <Collapse in={showAdditionalImages}>
              <Box sx={{ p: 2, pt: 0 }}>
                <Grid container spacing={2}>
                  {initialService.additionalImages.map((imageUrl: string | File, index: number) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card elevation={0} sx={{ bgcolor: '#f5f5f5', height: 200 }}>
                        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                          <CardMedia
                            component="img"
                            sx={{
                              height: 200,
                              objectFit: "contain"
                            }}
                            image={typeof imageUrl === 'string' ? imageUrl : ''}
                            alt={`Service view ${index + 1}`}
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
            label={`Comments${serviceComments.length > 0 ? ` (${serviceComments.length})` : ''}`}
            icon={<Iconify width={22} icon="solar:chat-round-dots-bold" height={22} />}
            iconPosition="start"
          />
          <Tab 
            label={`Reviews${serviceReviews.length > 0 ? ` (${serviceReviews.length})` : ''}`}
            icon={<Iconify width={22} icon="solar:star-bold" height={22} />}
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
                percent={analyticsData.views.percent}
                total={editedService.total_views || 0}
                color="secondary"
                icon={<Iconify width={50} icon="icon-park-solid:click" height="24" />}
                chart={{
                  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                  series: analyticsData.views.series,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
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

            <Grid item xs={12} sm={6} md={4}>
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

            {/* <Grid item xs={12} md={6} lg={4}>
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

            {/* <Grid item xs={12} md={6} lg={8}>
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
          <CommentsList comments={serviceComments} />
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ pt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Reviews</Typography>
          <ReviewsList reviews={serviceReviews} usersMap={usersMap} />
        </Box>
      )}

      {activeTab === 3 && (
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
                          {editedService?.[`additionalImage${index}`] || (initialService.additionalImages && initialService.additionalImages[index - 1]) ? (
                            <>
                              <img 
                                src={editedService?.[`additionalImage${index}`] 
                                  ? (typeof editedService[`additionalImage${index}`] === 'string' 
                                    ? editedService[`additionalImage${index}`] 
                                    : URL.createObjectURL(editedService[`additionalImage${index}`]))
                                  : initialService.additionalImages[index - 1]
                                } 
                                alt={`Additional ${index}`}
                                style={{ 
                                  maxWidth: '100%', 
                                  height: 'auto',
                                  maxHeight: '200px',
                                  objectFit: 'contain'
                                }} 
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
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdateService}
                    disabled={isUpdating} // Disable button when updating
                    startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : null} // Show spinner when updating
                  >
                    {isUpdating ? 'Updating...' : 'Update Service'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeleting}
                    startIcon={<Iconify icon="eva:trash-2-fill" />}
                  >
                    Delete Service
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Box>
      )}

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
            Are you sure you want to delete the service &quot;{editedService.service_name}&quot;? This action cannot be undone and will permanently remove the service from the system.
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
            onClick={handleDeleteService} 
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
  );
}