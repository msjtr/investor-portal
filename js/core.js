// js/core.js

import { db } from './database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// استيراد الأنظمة المشتركة من مجلد shared حسب الشجرة
import { showNotification } from '../shared/scripts/notifications.js';
import { validateEmail } from '../shared/scripts/validation.js';
import { saveToStorage } from '../shared/scripts/storage.js';

/**
 * وظيفة النواة: جلب اسم العميل الحقيقي من Firebase
 */
export async function getCustomerName(email) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            return userData.fullName; // الاسم المسجل رسمياً في قاعدة بيانات تيرا
        }
        return "عميل منصة تيرا"; // اسم افتراضي في حال عدم الوجود
    } catch (e) {
        console.error("خطأ في الاتصال بقاعدة البيانات:", e);
        return "عميل منصة تيرا";
    }
}

/**
 * وظيفة النواة: إدارة عملية تسجيل الدخول والربط مع Make
 */
export async function sendLoginRequest(email) {
    // 1. التحقق من البريد الإلكتروني باستخدام نظام الـ validation المشترك
    if (!validateEmail(email)) {
        showNotification("البريد الإلكتروني غير صحيح", "error");
        return false;
    }

    try {
        // 2. جلب الهوية الحقيقية للمستثمر
        const name = await getCustomerName(email);

        // 3. إرسال البيانات لـ Make Webhook
        // ملاحظة: استبدل الرابط أدناه بالرابط الفعلي من منصة Make
        const webhookUrl = 'https://hook.eu1.make.com/xxxxxxxxxxxxxxxxxxxx'; 
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'auth_request',
                payload: {
                    email: email,
                    fullName: name,
                    timestamp: new Date().toISOString(),
                    region: "Hail" // توثيق الطلب من منطقة حائل
                }
            })
        });

        if (response.ok) {
            // 4. حفظ جلسة مبدئية في الـ storage المشترك
            saveToStorage('pending_email', email);
            
            // 5. إظهار تنبيه نجاح باستخدام نظام التنبيهات المشترك
            showNotification(`تم إرسال رمز التحقق إلى ${name}`, "success");
            return true;
        } else {
            showNotification("فشل إرسال الرمز، حاول ثانية", "warning");
            return false;
        }
    } catch (error) {
        showNotification("حدث خطأ في النواة المركزية", "error");
        console.error("Core Error:", error);
        return false;
    }
}
