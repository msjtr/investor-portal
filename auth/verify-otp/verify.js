// js/auth/verify.js

// استيراد النواة والوظائف المساعدة من المجلدات المشتركة حسب الهيكل
import { sendLoginRequest } from '../../js/core.js';
import { getFromStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. تعريف العناصر من واجهة المستخدم
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyForm = document.getElementById('verifyForm');
    const countdownElement = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendBtn');
    const backBtn = document.getElementById('backBtn');

    let timerInterval;
    const TIME_LIMIT = 180; // 3 دقائق

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

    // 4. معالجة زر "إعادة إرسال" عبر النواة (core.js)
    resendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!resendBtn.disabled) {
            // جلب الإيميل من الرابط أو التخزين
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email') || getFromStorage('pending_email');

            if (!email) {
                showNotification("عذراً، لم يتم العثور على البريد الإلكتروني", "error");
                return;
            }

            const originalText = resendBtn.textContent;
            resendBtn.textContent = 'جاري الإرسال...';
            
            const success = await sendLoginRequest(email);
            
            if (success) {
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
                clearInterval(timerInterval);
                startTimer();
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
            btnSpan.textContent = 'جاري التحقق...';
            
            // هنا يتم إرسال الكود لـ Make أو Firebase Auth للتأكد
            // سنفترض حالياً الانتقال للداشبورد بعد نجاح وهمي للتجربة
            setTimeout(() => {
                showNotification("تم التحقق بنجاح، مرحباً بك في تيرا", "success");
                removeFromStorage('pending_email'); // تنظيف التخزين بعد النجاح
                window.location.href = '../../pages/client/dashboard/index.html';
            }, 1500);

        } else {
            showNotification("يرجى إدخال الكود كاملاً (6 أرقام)", "warning");
        }
    });

    startTimer();
});
