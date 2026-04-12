import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCFnr_TbEEnYPqBSJRPSn0G3oORHo9Guu0",
  authDomain: "archiflow-c2855.firebaseapp.com",
  projectId: "archiflow-c2855",
  storageBucket: "archiflow-c2855.firebasestorage.app",
  messagingSenderId: "247246043394",
  appId: "1:247246043394:web:408e1365957eea4ee2aa1b",
  measurementId: "G-9MHDE7DX1H"
};

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
