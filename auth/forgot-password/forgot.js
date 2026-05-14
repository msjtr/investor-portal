/**
 * =================================================================
 * محرك صفحة استعادة كلمة المرور (Enterprise Forgot Engine) - منصة تيرا
 * يدمج: تأمين الهوية، الفحص الاستباقي، وإدارة الجلسات المؤقتة
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    const forgotBtn = document.getElementById('forgotBtn');
    const emailInput = document.getElementById('email');

    // تتبع المحاولات المحلية (Rate Limiter)
    let resetAttempts = 0;
    const maxAttempts = 3;

    // تنظيف أي جلسات استعادة سابقة عند فتح الصفحة
    Storage.remove('temp_user');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (resetAttempts >= maxAttempts) {
                Notify.error("تجاوزت الحد المسموح للمحاولات. يرجى المحاولة بعد قليل.");
                return;
            }

            const email = emailInput.value.trim();

            // 1. التحقق الاستباقي قبل إجهاد الخادم
            if (typeof Validation !== 'undefined' && !Validation.isEmail(email)) {
                Notify.error("يرجى إدخال بريد إلكتروني صحيح");
                highlightError(emailInput);
                return;
            }

            // 2. تفعيل وضع "جاري المعالجة" وتأمين النموذج
            setLoadingState(forgotBtn, true);
            emailInput.disabled = true;

            try {
                // 3. جلب بصمة الجهاز لتعزيز الأمان في الـ Webhook
                let deviceMeta = { fingerprint: "unknown" };
                if (typeof Helpers !== 'undefined' && typeof Helpers.generateDeviceFingerprint === 'function') {
                    deviceMeta = Helpers.generateDeviceFingerprint();
                }

                // 4. إرسال الطلب لـ Make.com (Action: forgot_password)
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'forgot_password',
                    payload: { email },
                    metadata: {
                        device_id: deviceMeta.fingerprint,
                        timestamp: new Date().toISOString(),
                        platform: typeof APP_INFO !== 'undefined' ? APP_INFO.NAME : 'Tera Investor Portal',
                        context: 'password_recovery'
                    }
                });

                // 5. معالجة الرد الذكي
                if (response && response.success) {
                    // تخزين بيانات الجلسة المؤقتة لصفحة الـ OTP
                    Storage.set('temp_user', { 
                        email: email, 
                        type: 'reset_password',
                        timestamp: Date.now()
                    });

                    Notify.success("تم إرسال رمز التحقق (OTP) إلى بريدك بنجاح.");
                    
                    setTimeout(() => {
                        window.location.replace(ROUTES.VERIFY || '../verify-otp/verify.html');
                    }, 1500);

                } else {
                    resetAttempts++;
                    handleFailure(response?.message || "عذراً، هذا البريد غير مسجل في نظامنا.");
                }

            } catch (error) {
                console.error("[Forgot Engine] Communication Error:", error);
                Notify.error("عذراً، حدث خطأ أثناء الاتصال بالخادم.");
                handleFailure();
            }
        });
    }

    /**
     * تفعيل/تعطيل حالة التحميل للزر
     */
    function setLoadingState(btn, isLoading) {
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('animate-pulse');
            btn.innerHTML = `
                <span class="flex-center gap-10">
                    <div class="spinner-small" style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: rotation 0.8s linear infinite;"></div>
                    <span>جاري إرسال الرمز...</span>
                </span>
            `;
        } else {
            btn.disabled = false;
            btn.classList.remove('animate-pulse');
            btn.innerHTML = `<span>إرسال رمز الاستعادة</span>`;
            emailInput.disabled = false;
        }
    }

    /**
     * معالجة حالات الفشل (اهتزاز البطاقة وتنبيه الخطأ)
     */
    function handleFailure(message) {
        if (message) Notify.error(message);
        
        const card = document.querySelector('.auth-card');
        if (card) {
            card.classList.add('animate-shake');
            setTimeout(() => card.classList.remove('animate-shake'), 500);
        }
        
        setLoadingState(forgotBtn, false);
        highlightError(emailInput);
    }

    /**
     * تمييز الحقل بصرياً عند وجود خطأ
     */
    function highlightError(element) {
        const group = element.closest('.input-group');
        if (group) {
            group.classList.add('input-error');
            setTimeout(() => group.classList.remove('input-error'), 3000);
        }
    }
});
