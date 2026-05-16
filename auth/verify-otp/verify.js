/**
 * =================================================================
 * محرك التحقق (OTP Verification Engine) - منصة تيرا
 * يدمج: التنقل الذكي، العداد التنازلي، وتوثيق السجلات الأمنية
 * Path: investor-portal/auth/verify-otp/verify.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة من المجلدات المشتركة
import { sendLoginRequest } from '../../js/core.js';
import { getFromStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; // استدعاء المسجل الأمني

document.addEventListener('DOMContentLoaded', async () => {
    // 1. تعريف العناصر من واجهة المستخدم
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyForm = document.getElementById('verifyForm');
    const countdownElement = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendBtn');
    const backBtn = document.getElementById('backBtn');

    let timerInterval;
    const TIME_LIMIT = 180; // 3 دقائق

    // جلب البريد المعلق من التخزين لمعرفة من يحاول الدخول
    const pendingEmail = getFromStorage('pending_email');

    // التقاط بيانات الجهاز والموقع للتوثيق الأمني
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
        console.warn("[Security Engine] Geo-fetch bypassed:", err); 
    }

    // تفعيل وظيفة زر الرجوع
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // 2. هندسة التنقل الذكي بين خانات الـ OTP
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value !== '' && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            if (pastedData.length > 0) {
                const digits = pastedData.split('');
                otpInputs.forEach((inp, i) => {
                    if (digits[i]) inp.value = digits[i];
                });
                const focusIndex = Math.min(digits.length, 5);
                otpInputs[focusIndex].focus();
            }
        });
    });

    // 3. نظام العداد التنازلي
    function startTimer() {
        let timeRemaining = TIME_LIMIT;
        resendBtn.disabled = true;
        resendBtn.style.cursor = 'not-allowed';
        resendBtn.style.opacity = '0.5';

        timerInterval = setInterval(() => {
            timeRemaining--;
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                countdownElement.textContent = "00:00";
                countdownElement.style.color = "var(--error-color)";
                resendBtn.disabled = false;
                resendBtn.style.cursor = 'pointer';
                resendBtn.style.opacity = '1';
            }
        }, 1000);
    }

    // 4. معالجة زر "إعادة إرسال" عبر النواة وتوثيقها أمنياً
    resendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!resendBtn.disabled) {
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email') || pendingEmail;

            if (!email) {
                showNotification("عذراً، لم يتم العثور على البريد الإلكتروني", "error");
                return;
            }

            const originalText = resendBtn.textContent;
            resendBtn.textContent = 'جاري الإرسال...';
            
            // توثيق طلب إعادة الإرسال
            logSecurityEvent(email, "otp_resend_requested", "pending", securityData, "طلب إعادة إرسال رمز التحقق");

            const success = await sendLoginRequest(email); // ملاحظة: يجب التأكد مستقبلاً هل هو تسجيل أم دخول
            
            if (success) {
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
                clearInterval(timerInterval);
                startTimer();
                logSecurityEvent(email, "otp_resend_success", "success", securityData, "تم إعادة إرسال الرمز بنجاح");
            } else {
                logSecurityEvent(email, "otp_resend_failed", "failed", securityData, "فشل خادم الإرسال في معالجة طلب إعادة الرمز");
            }
            resendBtn.textContent = originalText;
        }
    });

    // 5. إرسال النموذج النهائي للتحقق
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let otpCode = '';
        otpInputs.forEach(input => otpCode += input.value);

        if (otpCode.length === 6) {
            const btnSpan = document.querySelector('#verifyBtn span');
            const originalText = btnSpan.textContent;
            btnSpan.textContent = 'جاري التحقق...';
            
            // توثيق محاولة إدخال الرمز
            logSecurityEvent(pendingEmail || "Unknown", "otp_verification_attempt", "pending", securityData, "المستثمر يقوم بإدخال رمز التحقق الآن");

            // ⚠️ المنطقة الهندسية القادمة: هنا يتم التحقق الفعلي من قاعدة البيانات أو السيرفر
            // ... (سيتم برمجتها بعد تعديل لوحة Make) ...

            setTimeout(() => {
                //จำลอง النجاح المؤقت
                logSecurityEvent(pendingEmail || "Unknown", "otp_verified", "success", securityData, "تم مطابقة الرمز بنجاح، دخول آمن");
                showNotification("تم التحقق بنجاح، مرحباً بك في تيرا", "success");
                removeFromStorage('pending_email');
                window.location.href = '../../pages/client/dashboard/index.html';
            }, 1500);

        } else {
            showNotification("يرجى إدخال الكود كاملاً (6 أرقام)", "warning");
            logSecurityEvent(pendingEmail || "Unknown", "otp_input_error", "warning", securityData, "محاولة إدخال رمز غير مكتمل");
        }
    });

    startTimer();
});
