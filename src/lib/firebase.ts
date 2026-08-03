/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// In AI Studio, these are usually provided in firebase-applet-config.json
// or we can hardcode them since it's a specific deployment.
const firebaseConfig = {
  apiKey: "AIzaSyDPGzT8bq-8Kgj6xaTshJW2E6TpKMXSy0c",
  authDomain: "exemplary-wares-nt3g1.firebaseapp.com",
  projectId: "exemplary-wares-nt3g1",
  storageBucket: "exemplary-wares-nt3g1.firebasestorage.app",
  messagingSenderId: "383359500107",
  appId: "1:383359500107:web:6f1172d8b0adf4ae9072ce"
};

// Database ID for this AI Studio project
const FIRESTORE_DB_ID = "ai-studio-0e597511-4fcc-418a-8f71-48de21db167e";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, FIRESTORE_DB_ID);
export const googleProvider = new GoogleAuthProvider();
