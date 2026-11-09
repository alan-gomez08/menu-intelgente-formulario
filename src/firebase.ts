import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAu8Fp1Y8mBB0eRZFsRV9G1GffOzL8tjtM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "portal-onboarding-182f0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "portal-onboarding-182f0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "portal-onboarding-182f0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "978904534090",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:978904534090:web:5b028f5e191508a0702ab3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-H8JKEC9GD8"
};

// 1. Inicializamos la App
const app = initializeApp(firebaseConfig);

// 2. Exportamos Firestore (Base de datos) y Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

export const FIRESTORE_COLLECTION = import.meta.env.VITE_FIRESTORE_COLLECTION || "Menu inteligente";