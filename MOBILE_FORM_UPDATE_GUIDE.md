# Mobile Form Update Guide

## Overview
This guide provides the updated mobile form code that matches the consolidated backend API structure.

## Key Changes Required

### 1. **API Endpoints**
- **Products**: `POST /api/products`
- **Services**: `POST /api/services`
- Use separate endpoints based on `itemType`

### 2. **Field Name Changes**
- `name` → `productName` (for products) or `serviceName` (for services)
- `category` (string) → `categoryIds` (array of category IDs)
- `images` → Split into `mainImage` (first image) and `additionalImages` (rest)
- Remove `userId` (automatically set from JWT token)
- Remove `type` field (use different endpoints instead)

### 3. **Category Handling**
- Categories must be sent as **IDs** (not names)
- Use `categoryIds: string[]` format
- The form currently uses category names - needs to map names to IDs

### 4. **Image Handling**
- First image → `mainImage` (string)
- Remaining images → `additionalImages` (string[])

### 5. **Authentication**
- Use JWT token in `Authorization: Bearer <token>` header
- No need to send `userId` - backend extracts it from token
- Token should be stored after login via `POST /api/auth/mobile-login`

### 6. **Verification Status**
- Regular users: Products/services are **unverified by default**
- Show message: "Your item has been submitted and is pending admin approval"
- Business/Admin users: Items are verified automatically

## Updated Service Function

Create or update `services/productService.ts`:

```typescript
import { API_BASE_URL } from '../config';

export interface CreateProductData {
  productName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  categoryIds?: string[];
  businessId?: string;
  productOwner?: string;
}

export interface CreateServiceData {
  serviceName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  categoryIds?: string[];
  businessId?: string;
  serviceOwner?: string;
}

/**
 * Create a product
 */
export const createProduct = async (
  data: CreateProductData,
  token: string
): Promise<any> => {
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

/**
 * Create a service
 */
export const createService = async (
  data: CreateServiceData,
  token: string
): Promise<any> => {
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

/**
 * Upload image to storage (Firebase Storage or your storage service)
 * Returns the image URL
 */
export const uploadImage = async (
  imageUri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Implement your image upload logic here
  // This should upload to Firebase Storage or your storage service
  // and return the public URL
  
  // Example implementation:
  // const response = await fetch(imageUri);
  // const blob = await response.blob();
  // const storageRef = ref(storage, `products/${Date.now()}_${Math.random()}`);
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
  
  throw new Error('Image upload not implemented');
};
```

## Updated Form Component

Key changes to make in `AddItemScreen.tsx`:

### 1. Update Form State
```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  categories: [] as string[], // Store category IDs, not names
  images: [] as string[],
  // Remove: price, location (not in current schema)
});
```

### 2. Update Category Selection
```typescript
// When selecting categories, store IDs instead of names
const toggleCategory = (categoryId: string) => {
  setFormData(prev => ({
    ...prev,
    categories: prev.categories.includes(categoryId)
      ? prev.categories.filter(id => id !== categoryId)
      : [...prev.categories, categoryId]
  }));
};

// Display category names but store IDs
const getCategoryName = (categoryId: string) => {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.name || categoryId;
};
```

### 3. Update Image Upload
```typescript
// Upload images and get URLs
const uploadImages = async (imageUris: string[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  
  for (let i = 0; i < imageUris.length; i++) {
    const progress = (i / imageUris.length) * 100;
    setUploadProgress({
      imageIndex: i,
      totalImages: imageUris.length,
      progress,
    });
    
    const url = await uploadImage(imageUris[i], (uploadProgress) => {
      setUploadProgress({
        imageIndex: i,
        totalImages: imageUris.length,
        progress: (i / imageUris.length) * 100 + (uploadProgress / imageUris.length),
      });
    });
    
    uploadedUrls.push(url);
  }
  
  return uploadedUrls;
};
```

### 4. Update Form Submission
```typescript
const handleSubmit = async () => {
  try {
    setIsUploading(true);
    setUploadProgress(null);
    
    // Check authentication
    if (!isAuthenticated || !user) {
      Alert.alert('Authentication Required', 'Please sign in to create items.');
      return;
    }

    // Get JWT token from storage
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      Alert.alert('Authentication Required', 'Please sign in to create items.');
      navigation.navigate('Auth' as any);
      return;
    }

    // Validate form
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
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

    // Prepare data based on item type
    if (itemType === 'product') {
      const productData: CreateProductData = {
        productName: formData.name,
        description: formData.description || undefined,
        categoryIds: formData.categories, // Already category IDs
        mainImage: imageUrls[0] || undefined,
        additionalImages: imageUrls.slice(1) || undefined,
      };

      const product = await createProduct(productData, token);
      
      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: user.role === 'user' 
          ? 'Your product has been submitted and is pending admin approval.'
          : 'Product created successfully!',
        position: 'top',
        visibilityTime: 4000,
      });
      
      Alert.alert(
        'Success!',
        user.role === 'user'
          ? 'Your product has been submitted and is pending admin approval.'
          : 'Product created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      const serviceData: CreateServiceData = {
        serviceName: formData.name,
        description: formData.description || undefined,
        categoryIds: formData.categories, // Already category IDs
        mainImage: imageUrls[0] || undefined,
        additionalImages: imageUrls.slice(1) || undefined,
      };

      const service = await createService(serviceData, token);
      
      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: user.role === 'user'
          ? 'Your service has been submitted and is pending admin approval.'
          : 'Service created successfully!',
        position: 'top',
        visibilityTime: 4000,
      });
      
      Alert.alert(
        'Success!',
        user.role === 'user'
          ? 'Your service has been submitted and is pending admin approval.'
          : 'Service created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  } catch (error) {
    console.error('Error creating item:', error);
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
```

### 5. Update Category Display
```typescript
// In category modal, use category.id instead of category.name
{categories.map((category) => {
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
})}

// In selected categories display
{formData.categories.map((categoryId) => {
  const category = categories.find(cat => cat.id === categoryId);
  return (
    <View key={categoryId} style={[styles.selectedCategoryChip, { backgroundColor: colors.primary }]}>
      <Text style={styles.selectedCategoryText}>
        {category?.name || categoryId} {/* Display name, store ID */}
      </Text>
      <TouchableOpacity onPress={() => toggleCategory(categoryId)}>
        <Ionicons name="close-circle" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
})}
```

### 6. Update Form Validation
```typescript
const formIsValid = useMemo(() => {
  return (
    formData.name.trim().length > 0 &&
    formData.categories.length > 0
  );
}, [formData]);
```

## Important Notes

1. **Category IDs vs Names**: The form must store and send category IDs, not names. Map category names to IDs when displaying.

2. **Image Upload**: Images must be uploaded to storage (Firebase Storage or your storage service) before creating the product/service. The API expects URLs, not local file URIs.

3. **Authentication**: Always use JWT token from `SecureStore`. The backend automatically extracts user ID from the token.

4. **Verification Status**: Regular users' items are unverified. Show appropriate messaging.

5. **Price and Location**: These fields are not in the current Product/Service schema. If needed, they should be added to the schema first.

6. **Error Handling**: Handle network errors, validation errors, and authentication errors appropriately.

## Testing Checklist

- [ ] Form validates required fields
- [ ] Categories are stored as IDs, displayed as names
- [ ] Images are uploaded before submission
- [ ] JWT token is sent in Authorization header
- [ ] Product creation works for regular users
- [ ] Service creation works for regular users
- [ ] Verification status message shows for regular users
- [ ] Business/admin users get verified items
- [ ] Error messages are clear and helpful
- [ ] Form resets after successful submission

