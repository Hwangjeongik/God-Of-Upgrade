// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAIwcNAbzb72hew0ZZ3ZPkptTtX1lPdED8",
  authDomain: "god-of-upgrade.firebaseapp.com",
  projectId: "god-of-upgrade",
  storageBucket: "god-of-upgrade.firebasestorage.app",
  messagingSenderId: "710419981185",
  appId: "1:710419981185:web:f5553863c35f7cd395be80",
  measurementId: "G-G13T55MC5Q"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;