// Firebase Storage Configuration Only
// All other Firebase services (Auth, Firestore) have been migrated to Prisma

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration (Storage only)
// IMPORTANT: Use environment variables for API keys in production
// 
// REQUIRED for Storage (image uploads):
// VITE_FIREBASE_API_KEY=your_api_key
// VITE_FIREBASE_PROJECT_ID=your_project_id
// VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket (or auto-generated from projectId)
//
// OPTIONAL (auto-generated if not provided):
// VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com (auto: projectId.firebaseapp.com)
// VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
// VITE_FIREBASE_APP_ID=your_app_id

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ''}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ''}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if Firebase config is available (only API key and project ID are required for Storage)
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Only warn once in development about missing config
if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.info(
    '[Firebase] Storage not configured. Set VITE_FIREBASE_* env vars for image uploads.'
  );
}

// Initialize Firebase (required for Storage/image uploads)
export const app = initializeApp(firebaseConfig);

// Export Storage - used for image uploads
export const storage = getStorage(app);

