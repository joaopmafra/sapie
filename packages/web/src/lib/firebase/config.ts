import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// TODO remove; we won't allow direct Firebase calls from the web app
// import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
};

// Initialize Firebase
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.log(
    'Please configure your Firebase environment variables in .env.local'
  );
  // Create a dummy app for development
  app = !getApps().length
    ? initializeApp({
        apiKey: 'demo-key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo',
        storageBucket: 'demo.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:demo',
      })
    : getApp();
}

// Initialize Firebase Auth
export const auth = getAuth(app);

// TODO remove; we won't allow direct Firebase calls from the web app
// Initialize Firestore
// export const db = getFirestore(app);

// Connect to Firebase emulators in development
if (import.meta.env.DEV) {
  try {
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://localhost:9099', {
        disableWarnings: true,
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
