import { db } from './database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// استيراد الأنظمة المشتركة من مجلد shared
import { showNotification } from '../shared/scripts/notifications.js';
import { validateEmail } from '../shared/scripts/validation.js';
import { saveToStorage } from '../shared/scripts/storage.js';

// رابط الويب هوك الموحد (بوابة ميك)
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

/**
 * وظيفة النواة: جلب اسم العميل الحقيقي من Firebase من مجموعة customers
 */
export async function getCustomerName(email) {
    try {
        const customersRef = collection(db, "customers");
        const q = query(customersRef, where("email", "==", email.trim().toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            return userData.fullName || userData.name || "مستثمر منصة تيرا"; 
        }
        return null; 
    } catch (e) {
        console.error("🚨 [Core Database Error]: خطأ في الاتصال بقاعدة البيانات:", e);
        return null; // نعيد null في حال الخطأ ليتولى ميك توجيه الإنذار
    }
}

/**
 * 1️⃣ وظيفة النواة (تسجيل الدخول): الربط مع مسار auth_security
 */
export async function sendLoginRequest(email) {
    if (!validateEmail(email)) {
        showNotification("البريد الإلكتروني غير صحيح", "error");
        return false;
    }

    try {
        const name = await getCustomerName(email);

        // نمرر الطلب لـ ميك في كل الأحوال. إذا كان name يساوي null، ميك سيحوله لمسار التنبيه الأمني
        const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flow_type: 'auth_security',        // التوجيه للراوتر الأخضر (المسار الثاني)
                process_type: 'one_time_login',    // نوع الكود المرسل
                email: email.trim().toLowerCase(),
                fullName: name || "غير معروف",     // إذا غير معروف، ميك سيفعل مسار الحماية
                timestamp: new Date().toISOString(),
                region: "Hail"
            })
        });

        if (response.ok) {
            saveToStorage('pending_email', email.trim().toLowerCase());
            // إذا كان الاسم غير موجود، نعطي رسالة عامة لأسباب أمنية لا تكشف حالة الحساب
            showNotification(`تم إرسال رمز التحقق (OTP) لبريدك بنجاح`, "success");
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

/**
 * 2️⃣ وظيفة النواة الجديدة (إنشاء حساب): الربط مع مسار account_creation
 */
export async function sendRegisterRequest(fullName, email) {
    if (!validateEmail(email)) {
        showNotification("البريد الإلكتروني غير صحيح", "error");
        return false;
    }

    try {
        // نتحقق إذا كان الإيميل مسجل مسبقاً لمنع التكرار
        const existingName = await getCustomerName(email);
        if (existingName) {
            showNotification("هذا البريد مسجل مسبقاً، يرجى التوجه لصفحة الدخول", "warning");
            return false;
        }

        const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flow_type: 'account_creation',     // التوجيه للراوتر الأخضر (المسار الأول)
                process_type: 'new_account_otp',   // نوع الكود المرسل
                email: email.trim().toLowerCase(),
                fullName: fullName,
                timestamp: new Date().toISOString(),
                region: "Hail"
            })
        });

        if (response.ok) {
            saveToStorage('pending_email', email.trim().toLowerCase());
            saveToStorage('pending_name', fullName);
            showNotification(`مرحباً بك، تم إرسال كود التفعيل لبريدك بنجاح`, "success");
            return true;
        } else {
            showNotification("فشل إرسال الرمز من السيرفر، حاول ثانية", "warning");
            return false;
        }
    } catch (error) {
        showNotification("حدث خطأ أثناء معالجة طلب التسجيل", "error");
        console.error("🚨 [Register Critical Error]:", error);
        return false;
    }
}
