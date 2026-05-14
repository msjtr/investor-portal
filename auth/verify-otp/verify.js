/**
 * محرك صفحة التحقق من الرمز (Enterprise OTP Engine) - منصة تيرا
 * يتضمن: المصادقة الاستباقية، تتبع المحاولات (Brute Force Protection)، ميزة اللصق الذكي، والتوجيه الديناميكي
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. تأمين المسار وجلب بيانات الجلسة المؤقتة
    const tempUser = typeof Storage !== 'undefined' ? Storage.get('temp_user') : null;
    const emailDisplay = document.getElementById('userEmailDisplay');
    const inputs = document.querySelectorAll('.otp-input');
    const otpContainer = document.querySelector('.otp-inputs-container');
    
    // متغيرات الحماية لمنع التخمين
    let maxAttempts = 3;
    const attemptsContainer = document.getElementById('attemptsContainer');
    const attemptsCount = document.getElementById('attemptsCount');

    if (!tempUser || !tempUser.email) {
        console.warn("[Verify Engine] وصول غير مصرح به أو انتهاء الجلسة المؤقتة. التوجيه لبوابة الدخول.");
        if (typeof ROUTES !== 'undefined' && ROUTES.LOGIN) {
            window.location.replace(ROUTES.LOGIN);
        } else {
            window.location.replace('../login/login.html');
        }
        return;
    }

    // عرض البريد الإلكتروني المشفر بصرياً للمستخدم للتأكيد
    if (emailDisplay) emailDisplay.innerText = tempUser.email;

    // 2. إدارة العداد التنازلي لإعادة الإرسال (3 دقائق متوافقة مع الصلاحية)
    const timerDisplay = document.getElementById('timerCount');
    const timerWrapper = document.getElementById('timerWrapper');
    const resendBtn = document.getElementById('resendBtn');

    function startResendTimer() {
        if (resendBtn) resendBtn.classList.add('hidden');
        if (timerWrapper) timerWrapper.classList.remove('hidden');
        
        // ضبط العداد على 180 ثانية (3 دقائق)
        if (typeof Countdown !== 'undefined' && Countdown.start) {
            Countdown.start(180, timerDisplay, () => {
                if (timerWrapper) timerWrapper.classList.add('hidden');
                if (resendBtn) resendBtn.classList.remove('hidden');
                if (typeof Notify !== 'undefined') Notify.info("يمكنك الآن طلب إرسال رمز تحقق جديد.");
            });
        }
    }

    startResendTimer();

    // 3. التنقل الذكي وميزة اللصق (UX & Smart Paste)
    if (inputs.length > 0) {
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
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;
            
            const pastedData = clipboardData.getData('text').trim();
            
            if (/^\d{6}$/.test(pastedData)) {
                inputs.forEach((input, idx) => {
                    input.value = pastedData[idx];
                });
                // نقل التركيز لزر التأكيد مباشرة لتسريع العملية
                const verifyBtn = document.getElementById('verifyBtn');
                if (verifyBtn) verifyBtn.focus();
            } else {
                if (typeof Notify !== 'undefined') {
                    Notify.error("يرجى التأكد من نسخ رمز التحقق المكون من 6 أرقام فقط.");
                }
            }
        });
    }

    // 4. معالجة إرسال الرمز وتأكيده مع الـ Webhook المركزي
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const verifyBtn = document.getElementById('verifyBtn');
            if (!verifyBtn) return;

            // تجميع الرمز النهائي
            let otpCode = "";
            inputs.forEach(input => otpCode += input.value);

            if (otpCode.length < 6) {
                if (typeof Notify !== 'undefined') Notify.error("يرجى إكمال إدخال رمز التحقق (6 أرقام).");
                return;
            }

            // تفعيل وضع المعالجة وتجميد الواجهة
            verifyBtn.disabled = true;
            verifyBtn.classList.add('animate-pulse');
            verifyBtn.innerHTML = `<span>جاري المصادقة والدخول...</span>`;
            inputs.forEach(input => input.disabled = true);

            try {
                // إرسال كود التحقق للـ Backend
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'verify_otp', // تأكد أن هذا يتطابق مع إعدادات مساراتك
                    payload: {
                        email: tempUser.email,
                        otp: otpCode,
                        type: tempUser.action || tempUser.type || 'login'
                    }
                });

                if (response && response.success) {
                    if (typeof Notify !== 'undefined') Notify.success("تم التحقق بنجاح.");
                    
                    // التوجيه الديناميكي بناءً على نوع العملية
                    setTimeout(() => {
                        const actionType = tempUser.action || tempUser.type;
                        if (actionType === 'reset') {
                            // التوجيه لصفحة تعيين كلمة المرور الجديدة
                            if (typeof ROUTES !== 'undefined' && ROUTES.RESET_PASSWORD) {
                                window.location.replace(ROUTES.RESET_PASSWORD);
                            } else {
                                window.location.replace('../reset-password/reset.html');
                            }
                        } else {
                            // مسار الدخول الطبيعي للوحة التحكم
                            if (typeof Storage !== 'undefined') {
                                if (response.user_data) Storage.set('user_session', response.user_data);
                                Storage.remove('temp_user');
                            }
                            if (typeof ROUTES !== 'undefined' && ROUTES.DASHBOARD) {
                                window.location.replace(ROUTES.DASHBOARD);
                            } else {
                                window.location.replace('../../dashboard/index.html');
                            }
                        }
                    }, 1200);

                } else {
                    // معالجة المحاولات الخاطئة (Attempt Limiter Logic)
                    maxAttempts--;
                    
                    if (maxAttempts > 0) {
                        if (typeof Notify !== 'undefined') {
                            Notify.error(response?.message || "رمز التحقق غير صحيح.");
                        }
                        
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
                        if (typeof Notify !== 'undefined') {
                            Notify.error("تجاوزت الحد الأقصى للمحاولات. تم قفل الحساب احترازياً.");
                        }
                        if (attemptsContainer) {
                            attemptsContainer.innerHTML = `<span class="text-danger font-bold">تم حظر المحاولات مؤقتاً</span>`;
                            attemptsContainer.classList.remove('hidden');
                        }
                        
                        // توجيه المستخدم لصفحة الدخول بعد لحظات
                        setTimeout(() => {
                            if (typeof Storage !== 'undefined') Storage.remove('temp_user');
                            if (typeof ROUTES !== 'undefined' && ROUTES.LOGIN) {
                                window.location.replace(ROUTES.LOGIN);
                            } else {
                                window.location.replace('../login/login.html');
                            }
                        }, 3000);
                    }
                }
            } catch (error) {
                console.error('[Verify Engine] Error:', error);
                if (typeof Notify !== 'undefined') Notify.error("عذراً، تعذر الاتصال بخادم المصادقة.");
                inputs.forEach(input => input.disabled = false);
                resetButtonState(verifyBtn);
            }
        });
    }

    // 5. محرك إعادة إرسال الرمز
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            if (typeof Notify !== 'undefined') Notify.info("جاري إرسال رمز تحقق جديد...");

            try {
                // إرسال طلب إعادة الإرسال متضمناً الأكشن الصحيح
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: tempUser.action || tempUser.type || 'login',
                    payload: { 
                        email: tempUser.email,
                        fullName: tempUser.fullName || tempUser.email.split('@')[0]
                    },
                    metadata: {
                        platform: "بوابة المستثمرين",
                        timestamp: new Date().toISOString()
                    }
                });

                if (response && response.success) {
                    if (typeof Notify !== 'undefined') {
                        Notify.success("تم إرسال الرمز بنجاح إلى وسيلة الاتصال المعتمدة.");
                    }
                    startResendTimer();
                    // إعادة ضبط المحاولات عند إرسال كود جديد
                    maxAttempts = 3;
                    if (attemptsContainer) attemptsContainer.classList.add('hidden');
                } else {
                    if (typeof Notify !== 'undefined') {
                        Notify.error("تعذر إرسال الرمز، يرجى المحاولة بعد قليل.");
                    }
                    resendBtn.disabled = false;
                }
            } catch (err) {
                console.error('[Verify Engine] Resend Error:', err);
                if (typeof Notify !== 'undefined') {
                    Notify.error("خطأ في الاتصال بالخادم أثناء طلب الرمز.");
                }
                resendBtn.disabled = false;
            }
        });
    }

    // دالة مساعدة لإعادة حالة الزر
    function resetButtonState(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>تأكيد الرمز والدخول</span>`;
    }
});
