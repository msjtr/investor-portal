// js/core.js

import { db } from './database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// استيراد الأنظمة المشتركة من مجلد shared حسب الشجرة الهجينة المستقرة
import { showNotification } from '../shared/scripts/notifications.js';
import { validateEmail } from '../shared/scripts/validation.js';
import { saveToStorage } from '../shared/scripts/storage.js';

/**
 * وظيفة النواة: جلب اسم العميل الحقيقي من Firebase من مجموعة customers
 */
export async function getCustomerName(email) {
    try {
        // تم التحديث للاستعلام من مجموعة customers المعتمدة في المخطط لديك
        const customersRef = collection(db, "customers");
        const q = query(customersRef, where("email", "==", email.trim().toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            // جلب الاسم الكامل (تأكد من مطابقة مسمى الحقل في الفايرستور fullName أو name)
            return userData.fullName || userData.name || "مستثمر منصة تيرا"; 
        }
        return null; // نُعيد null إذا كان الإيميل غير موجود لإيقاف العملية وتنبيه المستخدم
    } catch (e) {
        console.error("🚨 [Core Database Error]: خطأ في الاتصال بقاعدة البيانات:", e);
        return "مستثمر منصة تيرا";
    }
}

/**
 * وظيفة النواة: إدارة عملية تسجيل الدخول والربط مع Make Webhook اللحظي
 */
export async function sendLoginRequest(email) {
    // 1. التحقق من البريد الإلكتروني باستخدام نظام الـ validation المشترك الهجين
    if (!validateEmail(email)) {
        showNotification("البريد الإلكتروني غير صحيح", "error");
        return false;
    }

    try {
        // 2. جلب الهوية الحقيقية للمستثمر والتحقق من وجوده
        const name = await getCustomerName(email);

        if (!name) {
            showNotification("هذا البريد الإلكتروني غير مسجل لدينا في منصة تيرا", "error");
            return false;
        }

        // 3. إرسال البيانات لـ Make Webhook (الرابط الفوري والمحدث لحسابك)
        const webhookUrl = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13'; 
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login', // القيمة المفتاحية للـ Router والفلاتر في ميك
                email: email.trim().toLowerCase(),
                fullName: name,
                timestamp: new Date().toISOString(),
                region: "Hail" // توثيق الطلب الجغرافي من منطقة حائل
            })
        });

        if (response.ok) {
            // 4. حفظ الجلسة المبدئية المعلقة في الـ storage الموحد بنجاح
            saveToStorage('pending_email', email.trim().toLowerCase());
            
            // 5. إظهار تنبيه نجاح زجاجي نيون فخم يطابق هوية المنصة
            showNotification(`مرحباً ${name}، تم إرسال رمز التحقق (OTP) لبريدك بنجاح`, "success");
            return true;
        } else {
            showNotification("فشل إرسال الرمز من السيرفر، حاول ثانية", "warning");
            return false;
        }
    } catch (error) {
        showNotification("حدث خطأ في النواة المركزية أثناء الاتصال", "error");
        console.error("🚨 [Core Critical Error]:", error);
        return false;
    }
}
