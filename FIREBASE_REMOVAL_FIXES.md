# Firebase Removal - TypeScript Fixes

## Files That Need Firestore Code Commented Out

The following files still have Firestore references that need to be commented out or migrated to API:

1. `src/sections/product/view/products-view.tsx` - Multiple `firebaseDB` references
2. `src/sections/product/view/product-view-selected.tsx` - `auth` and `firebaseDB` references
3. `src/sections/service/view/services-view.tsx` - Multiple `firebaseDB` references
4. `src/sections/service/view/service-view-selected.tsx` - `auth` and `firebaseDB` references
5. `src/sections/owner/view/owner-view.tsx` - Multiple `firebaseDB` references
6. `src/sections/owner/view/owner-view-selected.tsx` - Multiple `firebaseDB` references
7. `src/sections/user/view/user-view.tsx` - `firebaseDB` reference

## Quick Fix Pattern

For each file, replace:
- `collection(firebaseDB, 'collectionName')` → Comment out, add TODO
- `getDocs(collection)` → Comment out, add TODO for API call
- `auth.currentUser` → Use `useAuth()` hook instead
- `doc(firebaseDB, 'collection', id)` → Comment out, add TODO

## Example Replacement

```typescript
// OLD:
const productsCollection = collection(firebaseDB, 'products');
const snapshot = await getDocs(productsCollection);

// NEW:
// TODO: Migrate to API - GET /api/products
// const response = await fetch('/api/products');
// const data = await response.json();
// const products = data.products;
const products: any[] = [];
```

