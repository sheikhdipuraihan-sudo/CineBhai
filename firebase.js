import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCMi510deKlX1N3eo_T8mu-9wOUlU2_PUE',
  authDomain: 'bhaiedikii.firebaseapp.com',
  projectId: 'bhaiedikii',
  storageBucket: 'bhaiedikii.firebasestorage.app',
  messagingSenderId: '268934087919',
  appId: '1:268934087919:web:9bd4cee4ea6adaac35471a',
  measurementId: 'G-YD9NNQNFG3'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
