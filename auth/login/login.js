/**
 * =================================================================
 * محرك صفحة تسجيل الدخول (Enterprise Login Engine) - منصة تيرا
 * يدمج: بصمة الجهاز، منع التخمين (Brute Force Protection)، وإدارة الجلسات
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // متغيرات تتبع المحاولات المحلية كطبقة دفاع أولية (Defense in Depth)
    let failedAttempts = 0;
    const maxAllowedAttempts = 5;

    // 1. تفعيل ميزة "عرض كلمة المرور" التلقائية عبر المساعد المركزي
    if (typeof Helpers !== 'undefined' && typeof Helpers.setupPasswordVisibility === 'function') {
        Helpers.setupPasswordVisibility();
    }

    // 2. تنظيف الجلسات المؤقتة السابقة لضمان بدء جلسة مصادقة نظيفة
    Storage.remove('temp_user');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // منع الإرسال إذا تم تجاوز الحد الأقصى للمحاولات
        if (failedAttempts >= maxAllowedAttempts) {
            Notify.error("تم حظر تسجيل الدخول مؤقتاً لتجاوز عدد المحاولات المسموحة.");
            return;
        }

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        const emailValue = emailInput.value.trim();
        const passwordValue = passwordInput.value;
        const isRemembered = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

        // 3. التحقق المحلي الصارم من المدخلات
        if (typeof Validation !== 'undefined' && !Validation.isEmail(emailValue)) {
            Notify.error("يرجى إدخال عنوان بريد إلكتروني مسجل وصحيح.");
            addInputError(emailInput);
            return;
        }

        if (!passwordValue || passwordValue.length < 6) {
            Notify.error("بيانات الدخول غير صحيحة.");
            addInputError(passwordInput);
            return;
        }

        // 4. توليد بصمة الجهاز المشفرة لتقييم المخاطر (Risk Engine Integration)
        let deviceMeta = { fingerprint: "unknown", browser: "unknown", os: "unknown" };
        if (typeof Helpers !== 'undefined' && typeof Helpers.generateDeviceFingerprint === 'function') {
            deviceMeta = Helpers.generateDeviceFingerprint();
        }

        // 5. تأمين الواجهة وتفعيل حالة التحميل (Micro-interaction)
        loginBtn.disabled = true;
        loginBtn.classList.add('animate-pulse');
        loginBtn.innerHTML = `
            <span class="flex-center gap-10">
                <div class="spinner-small" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: rotation 0.8s linear infinite;"></div>
                <span>جاري المصادقة والأمان...</span>
            </span>
        `;
        
        emailInput.disabled = true;
        passwordInput.disabled = true;

        try {
            // 6. إرسال الطلب للخادم / Webhook
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'login',
                payload: {
                    email: emailValue,
                    password: passwordValue,
                    remember_device: isRemembered
                },
                metadata: {
                    device_id: deviceMeta.fingerprint,
                    browser: deviceMeta.browser,
                    os: deviceMeta.os,
                    resolution: deviceMeta.resolution,
                    timestamp: new Date().toISOString(),
                    platform: typeof APP_INFO !== 'undefined' ? APP_INFO.NAME : 'Tera Investor Portal'
                }
            });

            // 7. معالجة الاستجابة
            if (response && response.success) {
                // حفظ بيانات المصادقة الأولية للانتقال لطبقة الـ OTP
                Storage.set('temp_user', { 
                    email: emailValue,
                    type: 'login',
                    remember_device: isRemembered,
                    timestamp: Date.now()
                });
                
                Notify.success("تمت المصادقة بنجاح. جاري التوجيه لرمز التحقق...");
                
                // التوجيه السلس لصفحة التحقق
                setTimeout(() => {
                    window.location.replace(ROUTES.VERIFY || '../verify-otp/verify.html');
                }, 1200);

            } else {
                // تسجيل محاولة فاشلة وتطبيق قيود الأمان
                failedAttempts++;
                handleLoginFailure(response?.message || "بيانات الدخول غير صحيحة.");
                resetLoginForm(emailInput, passwordInput, loginBtn);
            }

        } catch (error) {
            console.error("[Login Engine] Exception:", error);
            Notify.error("تعذر الاتصال بخادم المصادقة، يرجى المحاولة لاحقاً.");
            resetLoginForm(emailInput, passwordInput, loginBtn);
        }
    });

    /**
     * معالجة المحاولات الفاشلة وتطبيق الحظر المحلي
     */
    function handleLoginFailure(errorMessage) {
        const remaining = maxAllowedAttempts - failedAttempts;
        
        if (remaining > 0) {
            Notify.error(errorMessage);
            // إضافة اهتزاز لحاويات الإدخال كدلالة بصرية للرفض
            const formCard = document.querySelector('.auth-card');
            if (formCard) {
                formCard.classList.add('animate-shake');
                setTimeout(() => formCard.classList.remove('animate-shake'), 500);
            }
        } else {
            Notify.error("تجاوزت الحد الأقصى للمحاولات. تم قفل تسجيل الدخول مؤقتاً.");
            loginBtn.disabled = true;
            loginBtn.innerHTML = `<span>تم حظر المحاولات مؤقتاً</span>`;
            // إعادة تحميل الصفحة أو التوجيه بعد دقيقة لفك الحظر المحلي
            setTimeout(() => window.location.reload(), 60000);
        }
    }

    /**
     * دالة مساعدة لتمييز الحقل الخاطئ بصرياً
     */
    function addInputError(inputElement) {
        const wrapper = inputElement.closest('.input-group');
        if (wrapper) {
            wrapper.classList.add('input-error');
            setTimeout(() => wrapper.classList.remove('input-error'), 3000);
        }
    }

    /**
     * إعادة النموذج لحالته الطبيعية للاستمرار بالمحاولات
     */
    function resetLoginForm(emailElem, passElem, btnElem) {
        emailElem.disabled = false;
        passElem.disabled = false;
        
        // التركيز على حقل كلمة المرور ومسحه لتسهيل الكتابة مجدداً
        passElem.value = "";
        passElem.focus();

        if (failedAttempts < maxAllowedAttempts) {
            btnElem.disabled = false;
            btnElem.classList.remove('animate-pulse');
            btnElem.innerHTML = `<span>تسجيل الدخول</span>`;
        }
    }
});
