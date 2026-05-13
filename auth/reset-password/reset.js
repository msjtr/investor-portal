/**
 * محرك إعادة تعيين كلمة المرور (Enterprise Reset Engine) - منصة تيرا
 * التحقق اللحظي، مؤشر القوة، وتأمين الجلسة النهائية
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. حماية المسار: التأكد من أن المستخدم اجتاز الـ OTP بنجاح
    const tempUser = Storage.get('temp_user');
    if (!tempUser || !tempUser.email) {
        console.warn("[Reset Engine] محاولة وصول غير مصرح بها. التوجيه لبوابة الدخول.");
        window.location.replace(ROUTES.LOGIN);
        return;
    }

    // 2. تفعيل ميزة إظهار/إخفاء كلمة المرور (باستخدام Helper المشترك)
    if (typeof setupPasswordToggle === 'function') {
        setupPasswordToggle('newPassword', 'toggleNewPass');
        setupPasswordToggle('confirmPassword', 'toggleConfirmPass');
    }

    // 3. جلب عناصر الواجهة
    const resetForm = document.getElementById('resetForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('resetBtn');
    const matchError = document.getElementById('matchError');
    
    const meterBar = document.getElementById('meterBar');
    const strengthText = document.getElementById('strengthText');

    // تعريف الشروط الأمنية الخمسة
    const rules = {
        length: { regex: /.{8,}/, element: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, element: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, element: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, element: document.getElementById('rule-number') },
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: document.getElementById('rule-special') }
    };

    let isPasswordSecure = false;

    // 4. دالة التحقق اللحظي وحساب قوة كلمة المرور
    newPassword.addEventListener('input', () => {
        const val = newPassword.value;
        let score = 0;

        // فحص الشروط وتحديث العلامات (✔/✖)
        for (const key in rules) {
            const rule = rules[key];
            if (rule.regex.test(val)) {
                rule.element.classList.replace('invalid', 'valid');
                score++;
            } else {
                rule.element.classList.replace('valid', 'invalid');
            }
        }

        // تحديد ما إذا كانت كلمة المرور مطابقة لكل الشروط
        isPasswordSecure = (score === 5);

        // تحديث مؤشر القوة البصري
        updateStrengthMeter(score, val.length);
        
        // التحقق من تفعيل الزر
        validateForm();
    });

    // 5. التحقق من تطابق الخانتين
    confirmPassword.addEventListener('input', validateForm);

    function validateForm() {
        const passwordsMatch = (newPassword.value === confirmPassword.value && confirmPassword.value !== "");
        
        // إظهار نص الخطأ إذا كانت الخانتان غير متطابقتين
        if (confirmPassword.value.length > 0 && !passwordsMatch) {
            matchError.classList.remove('hidden');
        } else {
            matchError.classList.add('hidden');
        }

        // تفعيل الزر فقط عند اكتمال الشروط وتطابق الخانتين
        resetBtn.disabled = !(isPasswordSecure && passwordsMatch);
    }

    // دالة تحديث شريط القوة
    function updateStrengthMeter(score, length) {
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

        const level = levels[score];
        meterBar.style.width = level.width;
        meterBar.style.backgroundColor = level.color;
        strengthText.innerText = level.text;
        strengthText.className = level.class;
    }

    // 6. إرسال الطلب النهائي لـ Make.com
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        resetBtn.disabled = true;
        resetBtn.classList.add('animate-pulse');
        resetBtn.innerHTML = `<span>جاري تحديث البيانات...</span>`;

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'reset_password',
                payload: {
                    email: tempUser.email,
                    new_password: newPassword.value
                },
                metadata: {
                    platform: APP_INFO.NAME,
                    timestamp: new Date().toISOString()
                }
            });

            if (response && response.success) {
                Notify.success("تم تحديث كلمة المرور بنجاح. مرحباً بك مجدداً!");
                
                // تنظيف البيانات المؤقتة وحفظ الجلسة الجديدة
                Storage.remove('temp_user');
                if (response.user_data) {
                    Storage.set('user_session', response.user_data);
                }

                // التوجيه للوحة التحكم بعد نجاح العملية
                setTimeout(() => {
                    window.location.replace(ROUTES.DASHBOARD || '../../dashboard/index.html');
                }, 1500);

            } else {
                Notify.error(response?.message || "عذراً، تعذر تحديث كلمة المرور.");
                resetBtnState(resetBtn);
            }
        } catch (error) {
            console.error('[Reset Engine] Error:', error);
            Notify.error("حدث خطأ فني أثناء الاتصال بالخادم.");
            resetBtnState(resetBtn);
        }
    });

    function resetBtnState(btn) {
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>حفظ كلمة المرور والدخول</span>`;
    }
});
