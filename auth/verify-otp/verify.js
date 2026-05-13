/**
 * محرك صفحة التحقق من الرمز (Enterprise OTP Engine) - منصة تيرا
 * يتضمن: المصادقة الاستباقية، تتبع المحاولات (Brute Force Protection)، ميزة اللصق الذكي، والتوجيه الديناميكي
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. تأمين المسار وجلب بيانات الجلسة المؤقتة
    const tempUser = Storage.get('temp_user');
    const emailDisplay = document.getElementById('userEmailDisplay');
    const inputs = document.querySelectorAll('.otp-input');
    const otpContainer = document.querySelector('.otp-inputs-container');
    
    // متغيرات الحماية لمنع التخمين
    let maxAttempts = 3;
    const attemptsContainer = document.getElementById('attemptsContainer');
    const attemptsCount = document.getElementById('attemptsCount');

    if (!tempUser || !tempUser.email) {
        console.warn("[Verify Engine] وصول غير مصرح به أو انتهاء الجلسة المؤقتة. التوجيه لبوابة الدخول.");
        window.location.replace(ROUTES.LOGIN);
        return;
    }

    // عرض البريد الإلكتروني المشفر بصرياً للمستخدم للتأكيد
    if (emailDisplay) emailDisplay.innerText = tempUser.email;

    // 2. إدارة العداد التنازلي لإعادة الإرسال
    const timerDisplay = document.getElementById('timerCount');
    const timerWrapper = document.getElementById('timerWrapper');
    const resendBtn = document.getElementById('resendBtn');

    function startResendTimer() {
        if (resendBtn) resendBtn.classList.add('hidden');
        if (timerWrapper) timerWrapper.classList.remove('hidden');
        
        Countdown.start(60, timerDisplay, () => {
            if (timerWrapper) timerWrapper.classList.add('hidden');
            if (resendBtn) resendBtn.classList.remove('hidden');
            Notify.info("يمكنك الآن طلب إرسال رمز تحقق جديد.");
        });
    }

    startResendTimer();

    // 3. التنقل الذكي وميزة اللصق (UX & Smart Paste)
    inputs.forEach((input, index) => {
        // التنقل التلقائي للأمام عند الكتابة
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        // الرجوع التلقائي للخلف عند المسح
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        // فلترة الإدخال ليقبل الأرقام فقط
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });

    // ميزة اللصق الذكية (Paste Detection)
    inputs[0].addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
        
        if (/^\d{6}$/.test(pastedData)) {
            inputs.forEach((input, idx) => {
                input.value = pastedData[idx];
            });
            // نقل التركيز لزر التأكيد مباشرة لتسريع العملية
            document.getElementById('verifyBtn').focus();
        } else {
            Notify.error("يرجى التأكد من نسخ رمز التحقق المكون من 6 أرقام فقط.");
        }
    });

    // 4. معالجة إرسال الرمز وتأكيده مع الـ Webhook المركزي
    document.getElementById('otpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const verifyBtn = document.getElementById('verifyBtn');

        // تجميع الرمز النهائي
        let otpCode = "";
        inputs.forEach(input => otpCode += input.value);

        if (otpCode.length < 6) {
            Notify.error("يرجى إكمال إدخال رمز التحقق (6 أرقام).");
            return;
        }

        // تفعيل وضع المعالجة وتجميد الواجهة
        verifyBtn.disabled = true;
        verifyBtn.classList.add('animate-pulse');
        verifyBtn.innerHTML = `<span>جاري المصادقة...</span>`;
        inputs.forEach(input => input.disabled = true);

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'verify_otp',
                payload: {
                    email: tempUser.email,
                    otp: otpCode,
                    type: tempUser.type || 'login'
                }
            });

            if (response && response.success) {
                Notify.success("تم التحقق بنجاح.");
                
                // التوجيه الديناميكي بناءً على نوع العملية
                setTimeout(() => {
                    if (tempUser.type === 'reset_password') {
                        // في حال كان قادماً من مسار استعادة كلمة المرور
                        window.location.replace(ROUTES.RESET_PASSWORD || '../reset-password/reset.html');
                    } else {
                        // مسار الدخول الطبيعي
                        Storage.set('user_session', response.user_data);
                        Storage.remove('temp_user');
                        window.location.replace(ROUTES.DASHBOARD || '../../dashboard/index.html');
                    }
                }, 1200);

            } else {
                // معالجة المحاولات الخاطئة (Attempt Limiter Logic)
                maxAttempts--;
                
                if (maxAttempts > 0) {
                    Notify.error(response?.message || "رمز التحقق غير صحيح.");
                    
                    // تفعيل الأنيميشن والتنبيه البصري للخطأ
                    if (otpContainer) otpContainer.classList.add('otp-error');
                    if (attemptsContainer) attemptsContainer.classList.remove('hidden');
                    if (attemptsCount) attemptsCount.innerText = maxAttempts;
                    
                    setTimeout(() => {
                        if (otpContainer) otpContainer.classList.remove('otp-error');
                    }, 400);

                    // تفريغ الخانات وإعادة تفعيلها
                    inputs.forEach(input => {
                        input.disabled = false;
                        input.value = "";
                    });
                    inputs[0].focus();
                    
                    resetButtonState(verifyBtn);
                } else {
                    // تجميد الحساب عند استنفاد المحاولات (Account Lockout)
                    Notify.error("تجاوزت الحد الأقصى للمحاولات. تم قفل الحساب احترازياً.");
                    if (attemptsContainer) attemptsContainer.innerHTML = `<span class="text-danger font-bold">تم حظر المحاولات مؤقتاً</span>`;
                    
                    // توجيه المستخدم لصفحة الدخول بعد لحظات
                    setTimeout(() => {
                        Storage.remove('temp_user');
                        window.location.replace(ROUTES.LOGIN);
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('[Verify Engine] Error:', error);
            Notify.error("عذراً، تعذر الاتصال بخادم المصادقة.");
            inputs.forEach(input => input.disabled = false);
            resetButtonState(verifyBtn);
        }
    });

    // 5. محرك إعادة إرسال الرمز
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            Notify.info("جاري إرسال رمز تحقق جديد...");

            try {
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'resend_otp',
                    payload: { email: tempUser.email }
                });

                if (response && response.success) {
                    Notify.success("تم إرسال الرمز بنجاح إلى وسيلة الاتصال المعتمدة.");
                    startResendTimer();
                    // إعادة ضبط المحاولات عند إرسال كود جديد
                    maxAttempts = 3;
                    if (attemptsContainer) attemptsContainer.classList.add('hidden');
                } else {
                    Notify.error("تعذر إرسال الرمز، يرجى المحاولة بعد قليل.");
                    resendBtn.disabled = false;
                }
            } catch (err) {
                Notify.error("خطأ في الاتصال بالخادم أثناء طلب الرمز.");
                resendBtn.disabled = false;
            }
        });
    }

    // دالة مساعدة لإعادة حالة الزر
    function resetButtonState(btn) {
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>تأكيد الرمز</span>`;
    }
});
