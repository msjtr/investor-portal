/**
 * =================================================================
 * محرك صفحة استعادة كلمة المرور (Enterprise Forgot Engine) - منصة تِيرا
 * يدمج: تأمين الهوية عبر النواة، الفحص الاستباقي، وتوثيق الموقع الجغرافي
 * Path: investor-portal/auth/forgot-password/forgot.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة حسب هيكل المشروع
import { sendLoginRequest } from '../../js/core.js';
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail } from '../../shared/scripts/validation.js';

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    const forgotBtn = document.getElementById('forgotBtn');
    const emailInput = document.getElementById('email');

    // تتبع المحاولات المحلية كطبقة حماية أولية
    let resetAttempts = 0;
    const maxAttempts = 3;

    // تنظيف أي جلسات سابقة لضمان أمان العملية الجديدة
    removeFromStorage('temp_user');
    removeFromStorage('pending_email');
    removeFromStorage('auth_mode');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (resetAttempts >= maxAttempts) {
                showNotification("تجاوزت الحد المسموح للمحاولات. يرجى المحاولة لاحقاً.", "error");
                return;
            }

            const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

            // 1. التحقق الاستباقي الصارم
            if (!validateEmail(email)) {
                showNotification("يرجى إدخال بريد إلكتروني صحيح ومسجل.", "warning");
                highlightError(emailInput);
                return;
            }

            // 2. تفعيل وضع "جاري المعالجة" وتأمين الواجهة
            setLoadingState(forgotBtn, true);
            if (emailInput) emailInput.disabled = true;

            // 3. التقاط الـ IP والموقع الجغرافي لتوثيق الإشعار الأمني (Security Layer)
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                const geoData = await geoResponse.json();
                securityData.ip = geoData.ip;
                securityData.location = `${geoData.city}, ${geoData.country_name}`;
            } catch (geoErr) {
                console.warn("[Security Engine] Geo-fetch failed for Forgot:", geoErr);
            }

            try {
                // 4. استدعاء النواة المركزية (تم دمج الأكشن بداخلها ليتناسب مع Make)
                const success = await sendLoginRequest(email);

                if (success) {
                    // تخزين بيانات الجلسة المؤقتة لصفحة الـ OTP
                    saveToStorage('pending_email', email);
                    saveToStorage('auth_mode', 'reset_password'); // تحديد نوع العملية للتحويل لاحقاً لصفحة Reset

                    showNotification("تم إرسال كود التحقق (OTP) إلى بريدك المسجل ✅", "success");
                    
                    // التوجيه لصفحة التحقق
                    setTimeout(() => {
                        window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(email)}&mode=reset`);
                    }, 1500);

                } else {
                    resetAttempts++;
                    showNotification("عذراً، لم نتمكن من العثور على الحساب أو إرسال الرمز.", "error");
                    setLoadingState(forgotBtn, false);
                    if (emailInput) emailInput.disabled = false;
                }

            } catch (error) {
                console.error("[Forgot Engine] Communication Error:", error);
                showNotification("حدث خطأ فني أثناء الاتصال بالخادم.", "error");
                setLoadingState(forgotBtn, false);
                if (emailInput) emailInput.disabled = false;
            }
        });
    }

    /**
     * تفعيل/تعطيل حالة التحميل للزر
     */
    function setLoadingState(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `<span>جاري فحص الأمان وإرسال الرمز...</span>`;
        } else {
            btn.disabled = false;
            btn.innerHTML = `<span>إرسال كود الاستعادة</span>`;
        }
    }

    function highlightError(element) {
        if (!element) return;
        const group = element.closest('.input-group');
        if (group) {
            group.classList.add('input-error');
            setTimeout(() => group.classList.remove('input-error'), 3000);
        }
    }
});
