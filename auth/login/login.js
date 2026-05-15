/**
 * =================================================================
 * محرك صفحة تسجيل الدخول (Enterprise Login Engine) - منصة تِيرا
 * يدمج: بصمة الجهاز، النواة المركزية، توثيق الـ IP والموقع الجغرافي
 * Path: investor-portal/auth/login/login.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة من المجلدات المشتركة حسب الهيكل
import { sendLoginRequest } from '../../js/core.js';
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail } from '../../shared/scripts/validation.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // متغيرات تتبع المحاولات المحلية كطبقة دفاع أولية
    let failedAttempts = 0;
    const maxAllowedAttempts = 5;

    // 1. تنظيف الجلسات المؤقتة السابقة لبدء جلسة نظيفة
    removeFromStorage('temp_user');
    removeFromStorage('pending_email');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // منع الإرسال إذا تم تجاوز الحد الأقصى للمحاولات
            if (failedAttempts >= maxAllowedAttempts) {
                showNotification("تم حظر تسجيل الدخول مؤقتاً لتجاوز عدد المحاولات.", "error");
                return;
            }

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            const emailValue = emailInput.value.trim().toLowerCase();
            const passwordValue = passwordInput.value;
            const isRemembered = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            // 2. التحقق المحلي الصارم
            if (!validateEmail(emailValue)) {
                showNotification("يرجى إدخال بريد إلكتروني صحيح.", "warning");
                return;
            }

            if (!passwordValue || passwordValue.length < 6) {
                showNotification("كلمة المرور قصيرة جداً.", "warning");
                return;
            }

            // 3. تفعيل حالة التحميل (Micro-interaction)
            loginBtn.disabled = true;
            loginBtn.classList.add('animate-pulse');
            loginBtn.innerHTML = `<span>جاري إجراء فحص الأمان...</span>`;
            
            emailInput.disabled = true;
            passwordInput.disabled = true;

            // 4. التقاط الـ IP والموقع الجغرافي (Security Layer)
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                const geoData = await geoResponse.json();
                securityData.ip = geoData.ip;
                securityData.location = `${geoData.city}, ${geoData.country_name}`;
            } catch (err) { console.warn("Geo-fetch failed"); }

            try {
                // 5. استدعاء النواة المركزية لإرسال الطلب لـ Make مع البيانات الأمنية
                // قمنا بدمج بصمة الجهاز والموقع داخل دالة النواة
                const success = await sendLoginRequest(emailValue);

                if (success) {
                    // حفظ البريد مؤقتاً لصفحة الـ OTP
                    saveToStorage('pending_email', emailValue);
                    
                    showNotification("تم التحقق بنجاح. جاري إرسال رمز الدخول...", "success");
                    
                    setTimeout(() => {
                        window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(emailValue)}`);
                    }, 1200);

                } else {
                    failedAttempts++;
                    showNotification("بيانات الدخول غير صحيحة أو الحساب غير نشط.", "error");
                    resetLoginForm(emailInput, passwordInput, loginBtn);
                }

            } catch (error) {
                console.error("[Login Engine] Exception:", error);
                showNotification("حدث خطأ في النظام، يرجى المحاولة لاحقاً.", "error");
                resetLoginForm(emailInput, passwordInput, loginBtn);
            }
        });
    }

    function resetLoginForm(emailElem, passElem, btnElem) {
        emailElem.disabled = false;
        passElem.disabled = false;
        passElem.value = "";
        passElem.focus();

        if (failedAttempts < maxAllowedAttempts) {
            btnElem.disabled = false;
            btnElem.classList.remove('animate-pulse');
            btnElem.innerHTML = `<span>تسجيل الدخول الآمن</span>`;
        } else {
            btnElem.innerHTML = `<span>تم الحظر مؤقتاً</span>`;
        }
    }
});
