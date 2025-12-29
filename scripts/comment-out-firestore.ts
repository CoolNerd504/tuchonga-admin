/**
 * Helper script to comment out Firestore operations
 * Run this to find and comment out all Firestore calls
 * 
 * This is a reference - actual fixes should be done manually in each file
 */

// Patterns to find and comment:
// 1. collection(firebaseDB, ...) -> // TODO: Migrate to API
// 2. getDocs(...) -> // TODO: Migrate to API - GET /api/...
// 3. doc(firebaseDB, ...) -> // TODO: Migrate to API
// 4. auth.currentUser -> useAuth() hook
// 5. addDoc(...) -> // TODO: Migrate to API - POST /api/...
// 6. updateDoc(...) -> // TODO: Migrate to API - PUT /api/...
// 7. deleteDoc(...) -> // TODO: Migrate to API - DELETE /api/...
// 8. setDoc(...) -> // TODO: Migrate to API - PUT /api/...

export const firestorePatterns = {
  collection: 'collection(firebaseDB,',
  getDocs: 'getDocs(',
  doc: 'doc(firebaseDB,',
  authUser: 'auth.currentUser',
  addDoc: 'addDoc(',
  updateDoc: 'updateDoc(',
  deleteDoc: 'deleteDoc(',
  setDoc: 'setDoc(',
  createUser: 'createUserWithEmailAndPassword(',
};

