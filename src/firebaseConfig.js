// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import{ getAuth} from "firebase/auth"
import {getFirestore} from "firebase/firestore"
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyArhC49QRCUpji3JOaeO7fV_TGeE1hn-cU",
  authDomain: "tuchonga-bf6af.firebaseapp.com",
  projectId: "tuchonga-bf6af",
  databaseURL:"https://tuchonga-bf6af-default-rtdb.firebaseio.com/",
  storageBucket: "tuchonga-bf6af.firebasestorage.app",
  messagingSenderId: "527986241949",
  appId: "1:527986241949:web:c2116e04e1dcf69e997f74",
  measurementId: "G-C4ZWK2EH0N"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app)
export const firebaseDB = getFirestore(app)
export const storage = getStorage(app);