// js/database.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
// إضافة مكتبة التحقق لربطها بأنظمة الأمان في الشجرة
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCikh505fV7E7mLjrxQLjvhMnFTJET5mNA",
    authDomain: "fi-khidmatik-admin.firebaseapp.com",
    projectId: "fi-khidmatik-admin",
    storageBucket: "fi-khidmatik-admin.firebasestorage.app",
    messagingSenderId: "814533039644",
    appId: "1:814533039644:web:77afb276af1ab96d9731d9",
    measurementId: "G-C3GWR8HBTD"
};

// 1. تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// 2. تصدير قاعدة البيانات (Firestore) - تُستخدم في core.js
export const db = getFirestore(app);

// 3. تصدير نظام التحقق (Auth) - يُستخدم في auth-guard.js والملفات الأمنية
export const auth = getAuth(app);

console.log("تم تفعيل قاعدة البيانات ونظام الأمان لمنصة تيرا ✅");
