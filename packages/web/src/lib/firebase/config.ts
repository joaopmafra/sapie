import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// TODO remove; we won't allow direct Firebase calls from the web app
// import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log(firebaseConfig);

// Initialize Firebase
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.log('Please configure your Firebase environment variables in .env');
}

// Initialize Firebase Auth
export const auth = getAuth(app);

// TODO remove; we won't allow direct Firebase calls from the web app
// Initialize Firestore
// export const db = getFirestore(app);

// Connect to Firebase Auth emulator in development when using demo project
if (import.meta.env.VITE_FIREBASE_EMULATOR_REQUIRED === 'true') {
  try {
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
        disableWarnings: false,
      });
    }
  } catch (error) {
    console.log('Auth emulator connection failed:', error);
  }

  // TODO remove; we won't allow direct Firebase calls from the web app
  // try {
  //   connectFirestoreEmulator(db, 'localhost', 8080);
  // } catch (error) {
  //   console.log('Firestore emulator connection failed:', error);
  // }
}

export default app;
