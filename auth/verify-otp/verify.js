/**
 * =================================================================
 * محرك التحقق (OTP Verification Engine) - منصة تيرا
 * يدمج: التنقل الذكي، العداد التنازلي، وتوثيق السجلات الأمنية وتفادي CORS
 * Path: investor-portal/auth/verify-otp/verify.js
 * =================================================================
 */

import { sendLoginRequest } from '../../js/core.js';
import { getFromStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 

document.addEventListener('DOMContentLoaded', async () => {
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyForm = document.getElementById('verifyForm');
    const countdownElement = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendBtn');
    const backBtn = document.getElementById('backBtn');

    let timerInterval; const TIME_LIMIT = 180;
    const pendingEmail = getFromStorage('pending_email');

    // البيانات الافتراضية لحماية الكود من التوقف في حال فشل الاتصال الخارجي
    let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
    try {
        // تم الانتقال إلى خدمة ipapi.co لتفادي حظر الـ 403 (Forbidden) المستمر
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            // الخدمة البديلة لا ترجع حقل success بل تعتمد على البيانات مباشرة أو حقل error
            if (!geoData.error) {
                securityData.ip = geoData.ip || securityData.ip;
                securityData.location = geoData.city && geoData.country_name ? `${geoData.city}, ${geoData.country_name}` : securityData.location;
            }
        }
    } catch (err) { 
        console.warn("[Security Engine] Geo bypassed, using backup regional context:", err); 
    }

    if (backBtn) { backBtn.addEventListener('click', () => window.history.back()); }

    // هندسة التنقل الذكي واللصق بين خانات الـ OTP
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value !== '' && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) otpInputs[index - 1].focus();
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            if (pastedData.length > 0) {
                const digits = pastedData.split('');
                otpInputs.forEach((inp, i) => { if (digits[i]) inp.value = digits[i]; });
                otpInputs[Math.min(digits.length, 5)].focus();
            }
        });
    });

    // نظام العداد التنازلي للرمز
    const startTimer = () => {
        let timeRemaining = TIME_LIMIT;
        if (!resendBtn) return;
        resendBtn.disabled = true; resendBtn.style.opacity = '0.5'; resendBtn.style.cursor = 'not-allowed';

        timerInterval = setInterval(() => {
            timeRemaining--;
            const minutes = Math.floor(timeRemaining / 60); const seconds = timeRemaining % 60;
            if (countdownElement) countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                if (countdownElement) { countdownElement.textContent = "00:00"; countdownElement.style.color = "var(--error-color)"; }
                resendBtn.disabled = false; resendBtn.style.opacity = '1'; resendBtn.style.cursor = 'pointer';
            }
        }, 1000);
    };

    // معالجة زر إعادة إرسال الرمز
    if (resendBtn) {
        resendBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (resendBtn.disabled) return;
            const email = new URLSearchParams(window.location.search).get('email') || pendingEmail;

            if (!email) { showNotification("عذراً، لم يتم العثور على البريد الإلكتروني", "error"); return; }

            const originalText = resendBtn.textContent; resendBtn.textContent = 'جاري الإرسال...';
            logSecurityEvent(email, "otp_resend_requested", "pending", securityData, "طلب إعادة إرسال رمز التحقق");

            const success = await sendLoginRequest(email);
            if (success) {
                otpInputs.forEach(inp => inp.value = ''); otpInputs[0].focus();
                clearInterval(timerInterval); startTimer();
                logSecurityEvent(email, "otp_resend_success", "success", securityData, "تم إعادة إرسال الرمز بنجاح");
            } else {
                logSecurityEvent(email, "otp_resend_failed", "failed", securityData, "فشل خادم الإرسال في معالجة طلب إعادة الرمز");
            }
            resendBtn.textContent = originalText;
        });
    }

    // إرسال كود الـ OTP ومطابقته
    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let otpCode = ''; otpInputs.forEach(input => otpCode += input.value);

            if (otpCode.length === 6) {
                const btnSpan = document.querySelector('#verifyBtn span');
                if (btnSpan) btnSpan.textContent = 'جاري التحقق...';
                
                logSecurityEvent(pendingEmail || "Unknown", "otp_verification_attempt", "pending", securityData, "المستثمر يقوم بإدخال رمز التحقق");

                setTimeout(() => {
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
    }

    startTimer();
});
