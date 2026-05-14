/**
 * =================================================================
 * محرك صفحة التسجيل (Enterprise Registration Engine) - منصة تيرا
 * يدمج: بصمة الجهاز، التحقق الصارم، حماية التخمين، والتوجيه الذكي
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const agreeCheckbox = document.getElementById('agreeTerms');

    // تتبع المحاولات المحلية لمنع الإغراق (Rate Limiter Defense)
    let attemptCount = 0;
    const maxRegisterAttempts = 4;

    // 1. تفعيل ميزة "عرض كلمة المرور" بالنص الصريح عبر المساعد المركزي
    if (typeof Helpers !== 'undefined' && typeof Helpers.setupPasswordVisibility === 'function') {
        Helpers.setupPasswordVisibility();
    }

    // 2. تنظيف الجلسات المؤقتة لبدء عملية تسجيل جديدة ونظيفة
    Storage.remove('temp_user');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // حظر الحساب محلياً إذا تجاوز الحد الأقصى للمحاولات الخاطئة
            if (attemptCount >= maxRegisterAttempts) {
                Notify.error("تم تعليق التسجيل مؤقتاً لتجاوز عدد المحاولات المسموحة.");
                return;
            }

            // 3. جلب المدخلات وتنظيفها
            const fullNameElem = document.getElementById('fullName');
            const emailElem = document.getElementById('email');
            const phoneElem = document.getElementById('phone');
            const passwordElem = document.getElementById('password');

            const payloadData = {
                fullName: fullNameElem.value.trim(),
                email: emailElem.value.trim(),
                phone: phoneElem.value.trim(),
                password: passwordElem.value
            };

            // 4. فحص أمني وتدقيق منطقي محلي
            if (!agreeCheckbox || !agreeCheckbox.checked) {
                Notify.error("يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للاستمرار.");
                return;
            }

            if (typeof Validation !== 'undefined') {
                if (!Validation.isValidName(payloadData.fullName)) {
                    Notify.error("يرجى إدخال الاسم الكامل (الاسم الأول والأخير).");
                    highlightError(fullNameElem);
                    return;
                }

                if (!Validation.isEmail(payloadData.email)) {
                    Notify.error("صيغة البريد الإلكتروني غير صحيحة.");
                    highlightError(emailElem);
                    return;
                }

                if (!Validation.isSaudiPhone(payloadData.phone)) {
                    Notify.error("يرجى إدخال رقم جوال سعودي صحيح (يبدأ بـ 05).");
                    highlightError(phoneElem);
                    return;
                }

                if (!Validation.isStrongPassword(payloadData.password)) {
                    Notify.error("كلمة المرور المدخلة ضعيفة. يجب أن تتكون من 8 أحرف وأرقام على الأقل.");
                    highlightError(passwordElem);
                    return;
                }
            }

            // 5. توليد بصمة الجهاز المشفرة لطبقة منع الاحتيال (Fraud Prevention Layer)
            let deviceMeta = { fingerprint: "unknown", browser: "unknown", os: "unknown" };
            if (typeof Helpers !== 'undefined' && typeof Helpers.generateDeviceFingerprint === 'function') {
                deviceMeta = Helpers.generateDeviceFingerprint();
            }

            // 6. تأمين الواجهة وتفعيل حالة "جاري المعالجة" (Micro-interaction)
            registerBtn.disabled = true;
            registerBtn.classList.add('animate-pulse');
            registerBtn.innerHTML = `
                <span class="flex-center gap-10">
                    <div class="spinner-small" style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: rotation 0.8s linear infinite;"></div>
                    <span>جاري إنشاء وتأمين الحساب...</span>
                </span>
            `;

            // تجميد الحقول لمنع التعديل أثناء الإرسال
            [fullNameElem, emailElem, phoneElem, passwordElem, agreeCheckbox].forEach(el => el.disabled = true);

            try {
                // 7. إرسال البيانات للـ Webhook المركزي (Make.com)
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'register',
                    payload: payloadData,
                    metadata: {
                        device_id: deviceMeta.fingerprint,
                        browser: deviceMeta.browser,
                        os: deviceMeta.os,
                        resolution: deviceMeta.resolution,
                        platform: typeof APP_INFO !== 'undefined' ? APP_INFO.NAME : 'Tera Investor Portal',
                        version: typeof APP_INFO !== 'undefined' ? APP_INFO.VERSION : '1.0.0',
                        timestamp: new Date().toISOString()
                    }
                });

                // 8. معالجة الرد الذكي
                if (response && response.success) {
                    // حفظ بيانات الاتصال مؤقتاً لصفحة الـ OTP
                    Storage.set('temp_user', { 
                        email: payloadData.email, 
                        phone: payloadData.phone,
                        fullName: payloadData.fullName,
                        type: 'registration',
                        timestamp: Date.now()
                    });

                    Notify.success("تم إنشاء الحساب بنجاح! جاري التوجيه لرمز التحقق...");
                    
                    setTimeout(() => {
                        window.location.replace(ROUTES.VERIFY || '../verify-otp/verify.html');
                    }, 1200);

                } else {
                    attemptCount++;
                    handleRegisterFailure(response?.message || "تعذر إكمال التسجيل، يرجى المحاولة لاحقاً.");
                    resetRegisterForm([fullNameElem, emailElem, phoneElem, passwordElem, agreeCheckbox], registerBtn);
                }

            } catch (error) {
                console.error("[Registration Engine] Error:", error);
                attemptCount++;
                Notify.error("عذراً، حدث خطأ فني أثناء الاتصال بالخادم.");
                resetRegisterForm([fullNameElem, emailElem, phoneElem, passwordElem, agreeCheckbox], registerBtn);
            }
        });
    }

    /**
     * تمييز الحقل الخاطئ بصرياً
     */
    function highlightError(element) {
        const group = element.closest('.input-group');
        if (group) {
            group.classList.add('input-error');
            setTimeout(() => group.classList.remove('input-error'), 3000);
        }
    }

    /**
     * معالجة المحاولات الفاشلة وتطبيق الحظر
     */
    function handleRegisterFailure(msg) {
        const remainingLeft = maxRegisterAttempts - attemptCount;
        
        if (remainingLeft > 0) {
            Notify.error(msg);
            const card = document.querySelector('.auth-card');
            if (card) {
                card.classList.add('animate-shake');
                setTimeout(() => card.classList.remove('animate-shake'), 500);
            }
        } else {
            Notify.error("تجاوزت الحد الأقصى لمحاولات التسجيل. تم تعليق النموذج مؤقتاً.");
            registerBtn.disabled = true;
            registerBtn.innerHTML = `<span>تم تعليق التسجيل مؤقتاً</span>`;
            setTimeout(() => window.location.reload(), 60000);
        }
    }

    /**
     * إعادة تفعيل النموذج
     */
    function resetRegisterForm(elementsArray, btn) {
        elementsArray.forEach(el => el.disabled = false);
        
        if (attemptCount < maxRegisterAttempts) {
            btn.disabled = false;
            btn.classList.remove('animate-pulse');
            btn.innerHTML = `<span>إنشاء الحساب</span>`;
        }
    }
});
