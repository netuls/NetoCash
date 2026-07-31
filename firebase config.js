import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Essas chaves sao publicas por natureza (usadas no navegador) - a seguranca real fica nas Regras do Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyDJOPgeVMStBc-3u_wR4rZiENqjhyK9XAc",
  authDomain: "neto-finaceiro.firebaseapp.com",
  projectId: "neto-finaceiro",
  storageBucket: "neto-finaceiro.firebasestorage.app",
  messagingSenderId: "749393620370",
  appId: "1:749393620370:web:e4ff178564b1291607654b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const COLLECTION_NAME = "transacoes";
