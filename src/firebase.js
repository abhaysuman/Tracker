import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDuj0ruym56r9XXbrRBbyUdhsbuUZIdabQ",      
  authDomain: "gf-mood-tracker-a26de.firebaseapp.com", 
  projectId: "gf-mood-tracker-a26de",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
// ---------------------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);