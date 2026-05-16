/**
 * =================================================================
 * محرك صفحة تسجيل الدخول (Enterprise Login Engine) - منصة تِيرا
 * يدمج: التحقق الفعلي لكلمة المرور، بصمة الجهاز، النواة، السجلات الأمنية
 * Path: investor-portal/auth/login/login.js
 * =================================================================
 */

// استيراد النواة وأدوات قاعدة البيانات للتحقق الفعلي
import { db } from '../../js/database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// استيراد الوظائف المساعدة من المجلدات المشتركة
import { sendLoginRequest } from '../../js/core.js';
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail } from '../../shared/scripts/validation.js';

// استدعاء المسجل الأمني لتوثيق الحركات
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // متغيرات تتبع المحاولات المحلية لمنع الإغراق
    let failedAttempts = 0;
    const maxAllowedAttempts = 5;

    // 1. تنظيف الجلسات المؤقتة السابقة لضمان بدء عملية دخول نظيفة
    removeFromStorage('temp_user');
    removeFromStorage('pending_email');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // التقاط مبدئي للـ IP والموقع لتوثيق أي عملية (ناجحة أو فاشلة)
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipapi.co/json/', { mode: 'cors' });
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    securityData.ip = geoData.ip || securityData.ip;
                    securityData.location = geoData.city && geoData.country_name 
                        ? `${geoData.city}, ${geoData.country_name}` 
                        : securityData.location;
                }
            } catch (err) { 
                console.warn("[Security Engine] Geo-location fetch fallback triggered:", err); 
            }

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            if (!emailInput || !passwordInput) {
                showNotification("حدث خطأ في تحميل عناصر واجهة النموذج.", "error");
                return;
            }

            const emailValue = emailInput.value.trim().toLowerCase();
            const passwordValue = passwordInput.value;
            const isRemembered = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            // منع الإرسال وقفل النموذج إذا تم تجاوز الحد الأقصى للمحاولات الفاشلة
            if (failedAttempts >= maxAllowedAttempts) {
                showNotification("تم حظر تسجيل الدخول مؤقتاً لتجاوز عدد المحاولات المسموحة.", "error");
                logSecurityEvent(emailValue || "Unknown", "login_rate_limited", "warning", securityData, "تم حظر المستخدم لتجاوز الحد الأقصى للمحاولات الفاشلة");
                return;
            }

            // 2. التحقق المحلي الصارم (Zero Trust Validation)
            if (!validateEmail(emailValue)) {
                showNotification("يرجى إدخال عنوان بريد إلكتروني صحيح.", "warning");
                return;
            }

            if (!passwordValue || passwordValue.length < 6) {
                showNotification("بيانات الدخول المدخلة غير صحيحة.", "warning");
                return;
            }

            // 3. تأمين الواجهة وتفعيل حالة التحميل بمنع النقرات المتكررة
            loginBtn.disabled = true;
            loginBtn.classList.add('animate-pulse');
            loginBtn.innerHTML = `<span>جاري إجراء فحص الأمان...</span>`;
            
            emailInput.disabled = true;
            passwordInput.disabled = true;

            try {
                // 4. فحص الأمان الفعلي: التحقق من وجود الإيميل ومطابقة كلمة المرور من Firestore
                const q = query(collection(db, "users"), where("email", "==", emailValue));
                const querySnapshot = await getDocs(q);

                let isPasswordCorrect = false;

                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    // مطابقة كلمة المرور (في الأنظمة المتقدمة يتم تشفيرها، لكن حالياً نطابقها مباشرة)
                    if (userData.password === passwordValue) {
                        isPasswordCorrect = true;
                    }
                }

                // إذا الحساب غير موجود أو الباسوورد خطأ
                if (!isPasswordCorrect) {
                    failedAttempts++;
                    showNotification("بيانات الدخول غير صحيحة أو الحساب غير نشط بالمنصة.", "error"); // رسالة مبهمة لأسباب أمنية
                    logSecurityEvent(emailValue, "login_failed", "failed", securityData, "محاولة دخول فاشلة: بيانات غير متطابقة");
                    resetLoginForm(emailInput, passwordInput, loginBtn);
                    return; // نوقف العملية ولا نرسل الـ OTP
                }

                // 5. في حال نجاح التحقق من الباسوورد، نستدعي النواة المركزية لإرسال الـ OTP عبر Make
                const success = await sendLoginRequest(emailValue);

                if (success) {
                    // توثيق النجاح وإرسال الرمز
                    logSecurityEvent(emailValue, "login_otp_sent", "success", securityData, "تم التحقق من كلمة المرور وإرسال رمز OTP بنجاح");

                    // حفظ البريد وسياق تذكر الجهاز مؤقتاً
                    saveToStorage('pending_email', emailValue);
                    if (isRemembered) {
                        saveToStorage('temp_remember_device', true);
                    }
                    
                    showNotification("تم التحقق بنجاح. جاري إرسال رمز الدخول الحصري (OTP)...", "success");
                    
                    setTimeout(() => {
                        window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(emailValue)}`);
                    }, 1200);

                } else {
                    failedAttempts++;
                    showNotification("تعذر الاتصال بخادم الأمان لإرسال الرمز، يرجى المحاولة لاحقاً.", "error");
                    logSecurityEvent(emailValue, "otp_send_failed", "error", securityData, "نجح الدخول لكن فشل إرسال كود الـ OTP عبر ميك");
                    resetLoginForm(emailInput, passwordInput, loginBtn);
                }

            } catch (error) {
                console.error("[Login Engine] Exception caught during authentication flow:", error);
                showNotification("حدث خطأ فني في الخادم، يرجى إعادة المحاولة لاحقاً.", "error");
                logSecurityEvent(emailValue, "system_error", "failed", securityData, `خطأ فني أثناء تسجيل الدخول: ${error.message}`);
                resetLoginForm(emailInput, passwordInput, loginBtn);
            }
        });
    }

    /**
     * إعادة تعيين واجهة تسجيل الدخول وتنظيف حقل كلمة المرور مع معالجة حظر الإغراق
     */
    function resetLoginForm(emailElem, passElem, btnElem) {
        if (!emailElem || !passElem || !btnElem) return;

        emailElem.disabled = false;
        passElem.disabled = false;
        passElem.value = "";
        passElem.focus();

        const remainingAttempts = maxAllowedAttempts - failedAttempts;

        if (remainingAttempts > 0) {
            btnElem.disabled = false;
            btnElem.classList.remove('animate-pulse');
            btnElem.innerHTML = `<span>تسجيل الدخول الآمن</span>`;
            
            // حقن تأثير اهتزاز البطاقة البصري للخطأ إذا كان متاحاً في التنسيق
            const authCard = document.querySelector('.auth-card');
            if (authCard) {
                authCard.classList.add('input-error');
                setTimeout(() => authCard.classList.remove('input-error'), 400);
            }
        } else {
            btnElem.disabled = true;
            btnElem.classList.remove('animate-pulse');
            btnElem.innerHTML = `<span>تم حظر المحاولات مؤقتاً</span>`;
            showNotification("تم قفل واجهة الدخول لمدة دقيقة لحماية الحساب من التخمين.", "error");
            
            setTimeout(() => {
                failedAttempts = 0;
                btnElem.disabled = false;
                btnElem.innerHTML = `<span>تسجيل الدخول الآمن</span>`;
            }, 60000); // فتح الحظر بعد دقيقة
        }
    }
});
