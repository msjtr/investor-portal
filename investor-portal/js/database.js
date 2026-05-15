// js/database.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCikh505fV7E7mLjrxQLjvhMnFTJET5mNA",
    authDomain: "fi-khidmatik-admin.firebaseapp.com",
    projectId: "fi-khidmatik-admin",
    storageBucket: "fi-khidmatik-admin.firebasestorage.app",
    messagingSenderId: "814533039644",
    appId: "1:814533039644:web:77afb276af1ab96d9731d9",
    measurementId: "G-C3GWR8HBTD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
