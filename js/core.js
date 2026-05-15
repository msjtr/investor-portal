// js/core.js
import { db } from './database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// وظيفة النواة: جلب اسم العميل الحقيقي
export async function getCustomerName(email) {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data().fullName; // الاسم المسجل رسمياً
        }
        return "عميل تيرا";
    } catch (e) {
        console.error("خطأ في النواة:", e);
        return "عميل تيرا";
    }
}

// وظيفة النواة: إرسال الطلب لـ Make
export async function sendLoginRequest(email) {
    const name = await getCustomerName(email);
    const response = await fetch('رابط_الويبهوك_الخاص_بك', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            fullName: name // هنا حل المشكلة!
        })
    });
    return response.ok;
}
