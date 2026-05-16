/**
 * =================================================================
 * محرك صفحة تسجيل الدخول (Enterprise Login Engine) - منصة تِيرا
 * يدمج: التحقق الفعلي، تتبع الإغراق، السجلات الأمنية، وحقن البيانات الجغرافية
 * Path: investor-portal/auth/login/login.js
 * =================================================================
 */
import { db } from '../../js/database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { sendLoginRequest } from '../../js/core.js';
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail } from '../../shared/scripts/validation.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    
    let failedAttempts = 0; const maxAllowedAttempts = 5;
    removeFromStorage('temp_user'); removeFromStorage('pending_email');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.style.opacity = type === 'text' ? '1' : '0.6';
        });
    }

    const resetFormUI = (emailElem, passElem, btnElem) => {
        if (!emailElem || !passElem || !btnElem) return;
        emailElem.disabled = false; passElem.disabled = false;
        passElem.value = ""; passElem.focus();

        if (maxAllowedAttempts - failedAttempts > 0) {
            btnElem.disabled = false; btnElem.classList.remove('animate-pulse');
            btnElem.innerHTML = `<span>تسجيل الدخول الآمن</span>`;
            const card = document.querySelector('.auth-card');
            if (card) { card.classList.add('input-error'); setTimeout(() => card.classList.remove('input-error'), 400); }
        } else {
            btnElem.disabled = true; btnElem.classList.remove('animate-pulse');
            btnElem.innerHTML = `<span>تم حظر المحاولات مؤقتاً</span>`;
            showNotification("تم قفل الواجهة لحماية الحساب من التخمين.", "error");
            setTimeout(() => { failedAttempts = 0; btnElem.disabled = false; btnElem.innerHTML = `<span>تسجيل الدخول الآمن</span>`; }, 60000);
        }
    };

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipwho.is/');
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.success) {
                        securityData.ip = geoData.ip || securityData.ip;
                        securityData.location = geoData.city && geoData.country ? `${geoData.city}, ${geoData.country}` : securityData.location;
                    }
                }
            } catch (err) { console.warn("[Security Engine] Geo bypassed:", err); }

            const emailInput = document.getElementById('email');
            if (!emailInput || !passwordInput) { showNotification("حدث خطأ في تحميل عناصر الواجهة.", "error"); return; }

            const emailValue = emailInput.value.trim().toLowerCase();
            const passwordValue = passwordInput.value;
            const isRemembered = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

            if (failedAttempts >= maxAllowedAttempts) {
                showNotification("تسجيل الدخول معلق مؤقتاً لتجاوز محاولات الاختراق.", "error");
                logSecurityEvent(emailValue || "Unknown", "login_rate_limited", "warning", securityData, "محاولة دخول مرفوضة: واجهة مقفلة");
                return;
            }
            if (!validateEmail(emailValue)) { showNotification("يرجى إدخال بريد إلكتروني صحيح.", "warning"); return; }
            if (!passwordValue || passwordValue.length < 6) { showNotification("بيانات الدخول المدخلة غير صحيحة.", "warning"); return; }

            if (loginBtn) { loginBtn.disabled = true; loginBtn.classList.add('animate-pulse'); loginBtn.innerHTML = `<span>جاري فحص الأمان...</span>`; }
            emailInput.disabled = true; passwordInput.disabled = true;

            try {
                const q = query(collection(db, "users"), where("email", "==", emailValue));
                const querySnapshot = await getDocs(q);
                let isPasswordCorrect = false;

                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    if (userData.password === passwordValue) isPasswordCorrect = true;
                }

                if (!isPasswordCorrect) {
                    failedAttempts++;
                    showNotification("بيانات الدخول غير صحيحة أو الحساب غير نشط بالمنصة.", "error");
                    logSecurityEvent(emailValue, "login_failed", "failed", securityData, "محاولة دخول فاشلة: باسوورد خاطئ");
                    resetFormUI(emailInput, passwordInput, loginBtn); return;
                }

                const success = await sendLoginRequest(emailValue);
                if (success) {
                    logSecurityEvent(emailValue, "login_otp_sent", "success", securityData, "تم التحقق من الباسوورد وإرسال الـ OTP");
                    saveToStorage('pending_email', emailValue);
                    if (isRemembered) saveToStorage('temp_remember_device', true);
                    showNotification("تم التحقق بنجاح. جاري إرسال رمز الدخول الحصري (OTP)...", "success");
                    setTimeout(() => window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(emailValue)}&userAgent=${encodeURIComponent(navigator.userAgent)}`), 1200);
                } else {
                    failedAttempts++;
                    showNotification("تعذر الاتصال بخادم الأمان لإرسال الرمز.", "error");
                    logSecurityEvent(emailValue, "otp_send_failed", "error", securityData, "فشل سيرفر الـ Webhook في معالجة الـ OTP");
                    resetFormUI(emailInput, passwordInput, loginBtn);
                }
            } catch (error) {
                console.error("[Login Engine] Auth Flow Error:", error);
                showNotification("حدث خطأ فني في الخادم الافتراضي.", "error");
                logSecurityEvent(emailValue, "system_error", "failed", securityData, `خطأ نظام حرج: ${error.message}`);
                resetFormUI(emailInput, passwordInput, loginBtn);
            }
        });
    }
});
