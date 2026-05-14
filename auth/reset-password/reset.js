/**
 * =================================================================
 * محرك إعادة تعيين كلمة المرور (Enterprise Reset Engine) - منصة تيرا
 * التحقق اللحظي، مؤشر القوة، وتأمين الجلسة النهائية ببصمة الجهاز
 * الميزة المضافة: التقاط الـ IP والموقع الجغرافي لتوثيق العملية أمنياً
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. حماية المسار: التأكد من أن المستخدم اجتاز الـ OTP بنجاح
    const tempUser = typeof Storage !== 'undefined' ? Storage.get('temp_user') : null;
    if (!tempUser || !tempUser.email || tempUser.type !== 'reset_password') {
        console.warn("[Reset Engine] محاولة وصول غير مصرح بها أو انتهاء الجلسة. التوجيه لبوابة الدخول.");
        if (typeof ROUTES !== 'undefined' && ROUTES.LOGIN) {
            window.location.replace(ROUTES.LOGIN);
        } else {
            window.location.replace('../login/login.html');
        }
        return;
    }

    // 2. تفعيل ميزة إظهار كلمة المرور عبر المساعد المركزي (Helpers)
    if (typeof Helpers !== 'undefined' && typeof Helpers.setupPasswordVisibility === 'function') {
        Helpers.setupPasswordVisibility();
    }

    // 3. جلب عناصر الواجهة
    const resetForm = document.getElementById('resetForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('resetBtn');
    const matchError = document.getElementById('matchError');
    
    const meterBar = document.getElementById('meterBar');
    const strengthText = document.getElementById('strengthText');

    // تعريف الشروط الأمنية الخمسة المعتمدة في منصة تيرا
    const rules = {
        length: { regex: /.{8,}/, element: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, element: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, element: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, element: document.getElementById('rule-number') },
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: document.getElementById('rule-special') }
    };

    let isPasswordSecure = false;

    // 4. دالة التحقق اللحظي وحساب قوة كلمة المرور
    if (newPassword) {
        newPassword.addEventListener('input', () => {
            const val = newPassword.value;
            let score = 0;

            // فحص الشروط وتحديث العلامات البصرية (✔/✖)
            for (const key in rules) {
                const rule = rules[key];
                if (rule && rule.element) {
                    if (rule.regex.test(val)) {
                        rule.element.classList.replace('invalid', 'valid');
                        score++;
                    } else {
                        rule.element.classList.replace('valid', 'invalid');
                    }
                }
            }

            // تحديد ما إذا كانت كلمة المرور مطابقة لكافة المعايير الأمنية
            isPasswordSecure = (score === 5);

            // تحديث مؤشر القوة البصري (Color & Width)
            updateStrengthMeter(score, val.length);
            
            // التحقق من تفعيل زر الحفظ
            validateForm();
        });
    }

    // 5. التحقق من تطابق الخانتين اللحظي
    if (confirmPassword) {
        confirmPassword.addEventListener('input', validateForm);
    }

    function validateForm() {
        if (!newPassword || !confirmPassword || !resetBtn) return;
        
        const passwordsMatch = (newPassword.value === confirmPassword.value && confirmPassword.value !== "");
        
        // إظهار نص الخطأ إذا كانت الخانتان غير متطابقتين
        if (matchError) {
            if (confirmPassword.value.length > 0 && !passwordsMatch) {
                matchError.classList.remove('hidden');
            } else {
                matchError.classList.add('hidden');
            }
        }

        // تفعيل الزر فقط عند اكتمال القوة وتطابق الخانتين تماماً
        resetBtn.disabled = !(isPasswordSecure && passwordsMatch);
    }

    // دالة تحديث شريط القوة (Strength Levels)
    function updateStrengthMeter(score, length) {
        if (!meterBar || !strengthText) return;

        if (length === 0) {
            meterBar.style.width = '0%';
            strengthText.innerText = "ضعيفة";
            strengthText.className = "strength-weak";
            return;
        }

        const levels = [
            { text: "ضعيفة جداً", width: "15%", color: "#ef4444", class: "strength-weak" },
            { text: "ضعيفة", width: "30%", color: "#ef4444", class: "strength-weak" },
            { text: "متوسطة", width: "50%", color: "#f59e0b", class: "strength-medium" },
            { text: "قوية", width: "75%", color: "#38bdf8", class: "strength-strong" },
            { text: "قوية جداً", width: "100%", color: "#22c55e", class: "strength-excellent" },
            { text: "ممتازة", width: "100%", color: "#22c55e", class: "strength-excellent" }
        ];

        const level = levels[score] || levels[0];
        meterBar.style.width = level.width;
        meterBar.style.backgroundColor = level.color;
        strengthText.innerText = level.text;
        strengthText.className = level.class;
    }

    // 6. إرسال الطلب النهائي لـ Make.com مع بصمة الجهاز والموقع الجغرافي
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!resetBtn) return;
            resetBtn.disabled = true;
            resetBtn.classList.add('animate-pulse');
            resetBtn.innerHTML = `<span>جاري فحص الأمان وتحديث البيانات...</span>`;

            // التقاط بصمة الجهاز والبيانات الجغرافية (Security Layer)
            let deviceMeta = { fingerprint: "unknown", browser: "unknown", os: "unknown" };
            let securityData = { ip: "غير متوفر", location: "غير متوفر" };

            if (typeof Helpers !== 'undefined' && typeof Helpers.generateDeviceFingerprint === 'function') {
                deviceMeta = Helpers.generateDeviceFingerprint();
            }

            try {
                // جلب الـ IP والموقع الجغرافي لحظياً لتوثيق الإشعار الأمني
                const geoResponse = await fetch('https://ipapi.co/json/');
                const geoData = await geoResponse.json();
                securityData.ip = geoData.ip || "غير متوفر";
                securityData.location = `${geoData.city || ''}, ${geoData.country_name || ''}`.replace(/^, | , $/g, '') || "غير متوفر";
            } catch (geoErr) {
                console.warn("[Security Engine] Geo-location fetch failed for Reset:", geoErr);
            }

            try {
                // إرسال البيانات للـ Backend / Webhook متضمنة الـ IP لتعبئة الإيميل
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'reset', // تم التعديل لتطابق الـ switch في Make
                    payload: {
                        email: tempUser.email,
                        fullName: tempUser.fullName || tempUser.email.split('@')[0],
                        new_password: newPassword.value
                    },
                    metadata: {
                        device_id: deviceMeta.fingerprint,
                        browser: deviceMeta.browser,
                        os: deviceMeta.os,
                        platform: typeof APP_INFO !== 'undefined' ? APP_INFO.NAME : 'Tera Investor Portal',
                        timestamp: new Date().toISOString(),
                        // الحقول المضافة لتغذية الإيميل 👇
                        ip: securityData.ip,
                        location: securityData.location
                    }
                });

                if (response && response.success) {
                    if (typeof Notify !== 'undefined') {
                        Notify.success("تم تحديث كلمة المرور بنجاح. مرحباً بك مجدداً!");
                    }
                    
                    // تنظيف البيانات المؤقتة وحفظ جلسة الدخول المعتمدة والجديدة
                    if (typeof Storage !== 'undefined') {
                        Storage.remove('temp_user');
                        if (response.user_data) {
                            Storage.set('user_session', response.user_data);
                        }
                    }

                    // التوجيه السلس للوحة التحكم (Dashboard) بعد النجاح
                    setTimeout(() => {
                        if (typeof ROUTES !== 'undefined' && ROUTES.DASHBOARD) {
                            window.location.replace(ROUTES.DASHBOARD);
                        } else {
                            window.location.replace('../../dashboard/index.html');
                        }
                    }, 1500);

                } else {
                    if (typeof Notify !== 'undefined') {
                        Notify.error(response?.message || "عذراً، تعذر تحديث كلمة المرور حالياً.");
                    }
                    resetBtnState(resetBtn);
                }
            } catch (error) {
                console.error('[Reset Engine] Error:', error);
                if (typeof Notify !== 'undefined') {
                    Notify.error("حدث خطأ فني أثناء الاتصال بالخادم.");
                }
                resetBtnState(resetBtn);
            }
        });
    }

    function resetBtnState(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>حفظ كلمة المرور والدخول</span>`;
    }
});
