// Add Item Screen for TuChonga Mobile App - UPDATED TO MATCH API
// Consolidated form that works with the new backend API structure

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { Card } from '../../components/ui';
import { theme } from '../../theme';
import * as ImagePicker from 'expo-image-picker';
import { fetchCategoriesByType, Category } from '../../services/categoriesService';
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api' 
  : 'https://tuchonga-admin-production.up.railway.app/api';

// Types
type ItemType = 'product' | 'service';

interface UploadProgress {
  imageIndex: number;
  totalImages: number;
  progress: number;
}

interface CreateProductData {
  productName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  categoryIds?: string[];
  businessId?: string;
  productOwner?: string;
}

interface CreateServiceData {
  serviceName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  categoryIds?: string[];
  businessId?: string;
  serviceOwner?: string;
}

// API Service Functions
const createProduct = async (data: CreateProductData, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create product');
  }

  return result.data;
};

const createService = async (data: CreateServiceData, token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create service');
  }

  return result.data;
};

// TODO: Implement image upload to your storage service (Firebase Storage, etc.)
// This is a placeholder - replace with your actual image upload implementation
const uploadImage = async (
  imageUri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Example: Upload to Firebase Storage
  // const response = await fetch(imageUri);
  // const blob = await response.blob();
  // const storageRef = ref(storage, `items/${Date.now()}_${Math.random()}`);
  // const uploadTask = uploadBytesResumable(storageRef, blob);
  // 
  // return new Promise((resolve, reject) => {
  //   uploadTask.on('state_changed', 
  //     (snapshot) => {
  //       const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  //       onProgress?.(progress);
  //     },
  //     reject,
  //     () => {
  //       getDownloadURL(uploadTask.snapshot.ref).then(resolve);
  //     }
  //   );
  // });
  
  // For now, return the URI as-is (you'll need to implement actual upload)
  console.warn('Image upload not implemented - using local URI');
  return imageUri;
};

const AddItemScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Redux selectors
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  const [itemType, setItemType] = useState<ItemType>('product');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [] as string[], // Store category IDs, not names
    images: [] as string[],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Load categories when item type changes
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const fetchedCategories = await fetchCategoriesByType(itemType);
        setCategories(fetchedCategories);
        console.log(`📂 Loaded ${fetchedCategories.length} ${itemType} categories`);
      } catch (error) {
        console.error(`❌ Error loading ${itemType} categories:`, error);
        Toast.show({
          type: 'error',
          text1: 'Categories Loading Failed',
          text2: `Failed to load ${itemType} categories`,
          position: 'top',
          visibilityTime: 3000,
        });
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [itemType]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Category selection - store IDs, not names
  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  // Get category name by ID for display
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  // Upload all images and return URLs
  const uploadImages = async (imageUris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < imageUris.length; i++) {
      const baseProgress = (i / imageUris.length) * 100;
      setUploadProgress({
        imageIndex: i,
        totalImages: imageUris.length,
        progress: baseProgress,
      });
      
      const url = await uploadImage(imageUris[i], (uploadProgress) => {
        setUploadProgress({
          imageIndex: i,
          totalImages: imageUris.length,
          progress: baseProgress + (uploadProgress / imageUris.length),
        });
      });
      
      uploadedUrls.push(url);
    }
    
    return uploadedUrls;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(null);
      
      // Check authentication
      if (!isAuthenticated || !user) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to create products and services.',
          [{ text: 'OK', onPress: () => navigation.navigate('Auth' as any) }]
        );
        return;
      }

      // Get JWT token
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to create products and services.',
          [{ text: 'OK', onPress: () => navigation.navigate('Auth' as any) }]
        );
        return;
      }

      // Validate form
      if (!formData.name.trim()) {
        Alert.alert('Validation Error', `${itemType === 'product' ? 'Product' : 'Service'} name is required`);
        return;
      }

      if (formData.categories.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one category');
        return;
      }

      // Upload images first
      let imageUrls: string[] = [];
      if (formData.images.length > 0) {
        imageUrls = await uploadImages(formData.images);
      }

      // Determine if user is admin/business (for verification message)
      const isAdminOrBusiness = user.role && ['admin', 'super_admin', 'business', 'moderator', 'staff'].includes(user.role);
      const verificationMessage = isAdminOrBusiness
        ? `${itemType === 'product' ? 'Product' : 'Service'} created successfully!`
        : `Your ${itemType} has been submitted and is pending admin approval.`;

      // Create item based on type
      if (itemType === 'product') {
        const productData: CreateProductData = {
          productName: formData.name.trim(),
          description: formData.description.trim() || undefined,
          categoryIds: formData.categories, // Already category IDs
          mainImage: imageUrls[0] || undefined,
          additionalImages: imageUrls.length > 1 ? imageUrls.slice(1) : undefined,
        };

        const product = await createProduct(productData, token);
        
        console.log('✅ Product created:', product);
        
        Toast.show({
          type: 'success',
          text1: 'Success!',
          text2: verificationMessage,
          position: 'top',
          visibilityTime: 4000,
        });
        
        Alert.alert('Success!', verificationMessage, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const serviceData: CreateServiceData = {
          serviceName: formData.name.trim(),
          description: formData.description.trim() || undefined,
          categoryIds: formData.categories, // Already category IDs
          mainImage: imageUrls[0] || undefined,
          additionalImages: imageUrls.length > 1 ? imageUrls.slice(1) : undefined,
        };

        const service = await createService(serviceData, token);
        
        console.log('✅ Service created:', service);
        
        Toast.show({
          type: 'success',
          text1: 'Success!',
          text2: verificationMessage,
          position: 'top',
          visibilityTime: 4000,
        });
        
        Alert.alert('Success!', verificationMessage, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('❌ Error creating item:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to create ${itemType}. Please try again.`;
      
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Form validation
  const formIsValid = useMemo(() => {
    return (
      formData.name.trim().length > 0 &&
      formData.categories.length > 0
    );
  }, [formData]);

  const handleCancel = () => {
    navigation.goBack();
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted' || cameraStatus.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'We need camera and photo library permissions to add photos.'
      );
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newImages = [...formData.images, result.assets[0].uri];
      setFormData(prev => ({ ...prev, images: newImages.slice(0, 5) }));
    }
  };

  const pickImageFromLibrary = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - formData.images.length,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImageUris = result.assets.map(asset => asset.uri);
      const updatedImages = [...formData.images, ...newImageUris].slice(0, 5);
      setFormData(prev => ({ ...prev, images: updatedImages }));
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImageFromCamera();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: pickImageFromCamera },
          { text: 'Choose from Library', onPress: pickImageFromLibrary },
        ]
      );
    }
  };

  // Dynamic colors based on item type
  const getThemeColors = () => {
    if (itemType === 'product') {
      return {
        primary: '#FF8C42',
        background: '#FFF2E5',
        lightBackground: '#FFF2E5'
      };
    } else {
      return {
        primary: '#f2c14e',
        background: '#FFF9E6',
        lightBackground: '#FFF9E6'
      };
    }
  };

  const renderTypeSelector = () => {
    const colors = getThemeColors();
    
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What are you adding?</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              itemType === 'product' && {
                borderColor: '#FF8C42',
                backgroundColor: 'rgba(255, 140, 66, 0.1)',
              },
            ]}
            onPress={() => setItemType('product')}
          >
            <View style={styles.typeButtonContent}>
              <Ionicons 
                name={itemType === 'product' ? 'cube' : 'cube-outline'} 
                size={24} 
                color={itemType === 'product' ? '#FF8C42' : theme.colors.textLight} 
              />
              <Text
                style={[
                  styles.typeButtonText,
                  itemType === 'product' && { color: '#FF8C42' },
                ]}
              >
                Product
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              itemType === 'service' && {
                borderColor: '#f2c14e',
                backgroundColor: '#FFF9E6',
              },
            ]}
            onPress={() => setItemType('service')}
          >
            <View style={styles.typeButtonContent}>
              <Ionicons 
                name={itemType === 'service' ? 'business' : 'business-outline'} 
                size={24} 
                color={itemType === 'service' ? '#f2c14e' : theme.colors.textLight} 
              />
              <Text
                style={[
                  styles.typeButtonText,
                  itemType === 'service' && { color: '#f2c14e' },
                ]}
              >
                Service
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderBasicInfo = () => {
    const colors = getThemeColors();
    
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
      
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {itemType === 'product' ? 'Product Name' : 'Service Name'} *
          </Text>
          <TextInput
            style={styles.textInput}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder={`Enter ${itemType} name`}
            placeholderTextColor={theme.colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder={`Describe your ${itemType}`}
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Categories *</Text>
          
          {/* Selected categories display */}
          {formData.categories.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollView}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {formData.categories.map((categoryId) => (
                <View key={categoryId} style={[styles.selectedCategoryChip, { backgroundColor: colors.primary }]}>
                  <Text style={styles.selectedCategoryText}>
                    {getCategoryName(categoryId)}
                  </Text>
                  <TouchableOpacity onPress={() => toggleCategory(categoryId)}>
                    <Ionicons name="close-circle" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          
          {/* Category selector button */}
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.categoryButtonText}>
              {formData.categories.length > 0 
                ? `${formData.categories.length} categories selected` 
                : 'Tap to select categories'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderImageSection = () => {
    const colors = getThemeColors();
    
    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Images ({formData.images.length}/5)</Text>
        
        {formData.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollView}
            contentContainerStyle={styles.imageScrollContent}
          >
            {formData.images.map((imageUri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                {index === 0 && (
                  <View style={[styles.coverLabel, { backgroundColor: colors.primary }]}>
                    <Text style={styles.coverLabelText}>Cover</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        
        {formData.images.length < 5 && (
          <TouchableOpacity 
            style={styles.addImageButton}
            onPress={showImagePickerOptions}
          >
            <Ionicons name="camera" size={32} color={colors.primary} />
            <Text style={[styles.addImageText, { color: colors.primary }]}>Add Photos</Text>
            <Text style={styles.addImageSubtext}>
              Add up to {5 - formData.images.length} more photos
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  const renderActions = () => {
    const colors = getThemeColors();
    
    return (
      <View style={styles.actionsContainer}>
        {isUploading && uploadProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Uploading image {uploadProgress.imageIndex + 1} of {uploadProgress.totalImages}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${uploadProgress.progress}%`,
                    backgroundColor: colors.primary 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>{Math.round(uploadProgress.progress)}%</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.centeredActionButton,
            {
              backgroundColor: formIsValid && !isUploading ? colors.primary : '#CCCCCC',
              borderRadius: 16,
            }
          ]}
          onPress={handleSubmit}
          disabled={!formIsValid || isUploading}
        >
          {isUploading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="white" size="small" style={styles.loadingSpinner} />
              <Text style={styles.buttonText}>
                {uploadProgress ? 'Uploading...' : 'Creating...'}
              </Text>
            </View>
          ) : (
            <Text style={[
              styles.buttonText,
              { color: formIsValid ? 'white' : '#999999' }
            ]}>
              Add {itemType === 'product' ? 'Product' : 'Service'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategoryModal = () => {
    const colors = getThemeColors();
    
    return (
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalTitle}>
                Select {itemType === 'product' ? 'Product' : 'Service'} Categories
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCategoryPicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {categoriesLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.modalLoadingText}>Loading categories...</Text>
                </View>
              ) : categories.length > 0 ? (
                categories.map((category) => {
                  const isSelected = formData.categories.includes(category.id);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryOption,
                        isSelected && { backgroundColor: colors.background }
                      ]}
                      onPress={() => toggleCategory(category.id)} // Use ID
                    >
                      <View style={styles.categoryOptionContent}>
                        <View>
                          <Text style={[
                            styles.categoryOptionText,
                            isSelected && { color: colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.name} {/* Display name */}
                          </Text>
                          {category.description && (
                            <Text style={styles.categoryDescription}>
                              {category.description}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.modalEmptyContainer}>
                  <Text style={styles.modalEmptyText}>
                    No {itemType} categories available
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Text style={styles.modalDoneButtonText}>
                  Done ({formData.categories.length} selected)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { backgroundColor: getThemeColors().primary }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ADD ITEM</Text>
          <TouchableOpacity style={styles.heartButton}>
            <Ionicons name="camera" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderTypeSelector()}
            {renderBasicInfo()}
            {renderImageSection()}
          </ScrollView>
          
          {renderActions()}
        </View>
        
        {renderCategoryModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles remain the same as original
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D2D2D',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    paddingBottom: 10,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    paddingBottom: 10,
    paddingTop: 20,
    letterSpacing: 1,
  },
  heartButton: {
    paddingBottom: 10,
    paddingTop: 20,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: 220,
  },
  sectionCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  typeButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.radiusMd,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  typeButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing.xs,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.radiusSm,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    height: 100,
  },
  imageScrollView: {
    marginBottom: theme.spacing.md,
  },
  imageScrollContent: {
    paddingRight: theme.spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: theme.spacing.radiusSm,
    backgroundColor: theme.colors.surface,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coverLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  coverLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  addImageButton: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.spacing.radiusMd,
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  addImageText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  addImageSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 200,
  },
  categoryScrollView: {
    marginBottom: theme.spacing.sm,
  },
  categoryScrollContent: {
    paddingRight: theme.spacing.md,
  },
  selectedCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: theme.spacing.sm,
  },
  selectedCategoryText: {
    color: 'white',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: 'bold',
    marginRight: theme.spacing.xs,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.radiusSm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  categoryButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    flex: 1,
  },
  progressContainer: {
    position: 'absolute',
    top: -80,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: 'white',
    padding: theme.spacing.md,
    borderRadius: theme.spacing.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: theme.spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    flex: 1,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalScrollView: {
    maxHeight: 400,
    paddingHorizontal: theme.spacing.lg,
  },
  categoryOption: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryOptionText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  modalLoadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  modalEmptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalFooter: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalDoneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.radiusMd,
  },
  modalDoneButtonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default AddItemScreen;

