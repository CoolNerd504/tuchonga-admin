// Firebase Storage Configuration Only
// All other Firebase services (Auth, Firestore) have been migrated to Prisma

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyArhC49QRCUpji3JOaeO7fV_TGeE1hn-cU',
  authDomain: 'tuchonga-bf6af.firebaseapp.com',
  projectId: 'tuchonga-bf6af',
  storageBucket: 'tuchonga-bf6af.firebasestorage.app',
  messagingSenderId: '527986241949',
  appId: '1:527986241949:web:c2116e04e1dcf69e997f74',
};

// Initialize Firebase (only for Storage)
export const app = initializeApp(firebaseConfig);

// Export only Storage - all other services migrated to Prisma
export const storage = getStorage(app);

