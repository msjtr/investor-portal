/**
 * =================================================================
 * محرك صفحة استعادة كلمة المرور (Enterprise Forgot Engine) - منصة تِيرا
 * يدمج: تأمين الهوية، الفحص الاستباقي، السجلات الأمنية، ونظام مسار الاستعادة
 * Path: investor-portal/auth/forgot-password/forgot.js
 * =================================================================
 */
import { db } from '../../js/database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail } from '../../shared/scripts/validation.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 
import { getCustomerName } from '../../js/core.js'; 

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    const forgotBtn = document.getElementById('forgotBtn');
    const emailInput = document.getElementById('email');
    let resetAttempts = 0; const maxAttempts = 3;

    removeFromStorage('temp_user');
    removeFromStorage('pending_email');
    removeFromStorage('auth_mode');

    const setBtnState = (isLoading) => {
        if (!forgotBtn) return;
        forgotBtn.disabled = isLoading;
        forgotBtn.innerHTML = isLoading ? `<span>جاري فحص الأمان وإرسال الرمز...</span>` : `<span>إرسال كود الاستعادة</span>`;
    };

    const triggerError = (el) => {
        if (!el) return;
        const group = el.closest('.input-group');
        if (group) { 
            group.classList.add('input-error'); 
            setTimeout(() => group.classList.remove('input-error'), 3000); 
        }
    };

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (resetAttempts >= maxAttempts) {
                showNotification("تجاوزت الحد المسموح للمحاولات. يرجى المحاولة لاحقاً.", "error"); return;
            }
            const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

            if (!validateEmail(email)) {
                showNotification("يرجى إدخال بريد إلكتروني صحيح ومسجل.", "warning"); 
                triggerError(emailInput); return;
            }

            setBtnState(true);
            if (emailInput) emailInput.disabled = true;

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

            try {
                const q = query(collection(db, "users"), where("email", "==", email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    resetAttempts++;
                    showNotification("عذراً، لم نتمكن من العثور على الحساب أو إرسال الرمز.", "error");
                    logSecurityEvent(email, "forgot_password_failed", "warning", securityData, "محاولة استعادة بريد غير مسجل");
                    triggerError(emailInput);
                    setBtnState(false); if (emailInput) emailInput.disabled = false; return;
                }

                const fullName = await getCustomerName(email);

                try {
                    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            flow_type: 'recovery',
                            process_type: 'forgot_password_otp',
                            email: email, fullName: fullName,
                            location: securityData.location, ip: securityData.ip,
                            userAgent: navigator.userAgent
                        })
                    });
                    if (!makeResponse.ok) throw new Error("Make rejected request");
                } catch (webhookErr) {
                    console.error("[Automation Engine] Webhook failed:", webhookErr);
                    showNotification("تعذر الاتصال بخادم إرسال الرموز، يرجى المحاولة لاحقاً.", "error");
                    logSecurityEvent(email, "webhook_failed", "error", securityData, "فشل الاتصال بمنصة Make");
                    setBtnState(false); if (emailInput) emailInput.disabled = false; return;
                }

                logSecurityEvent(email, "forgot_password_otp_sent", "success", securityData, "تم إرسال رمز OTP للاستعادة");
                saveToStorage('pending_email', email);
                saveToStorage('auth_mode', 'reset_password');
                showNotification("تم إرسال كود التحقق (OTP) إلى بريدك المسجل ✅", "success");
                
                setTimeout(() => {
                    window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(email)}&mode=reset`);
                }, 1500);

            } catch (error) {
                console.error("[Forgot Engine] Error:", error);
                showNotification("حدث خطأ فني أثناء الاتصال بالخادم.", "error");
                logSecurityEvent(email, "system_error", "failed", securityData, `خطأ فني في محرك الاستعادة: ${error.message}`);
                setBtnState(false); if (emailInput) emailInput.disabled = false;
            }
        });
    }
});
