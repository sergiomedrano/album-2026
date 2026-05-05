import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Tu configuración web de Firebase, usando las variables de entorno
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase
// Si ya hay una instancia (por el hot-reload de Next.js), usa esa. Si no, crea una nueva.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportamos las instancias de Firestore y Auth para usarlas en toda la app
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };