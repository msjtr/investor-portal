/**
 * محرك صفحة تسجيل الدخول (Login Engine) - منصة تيرا
 * النسخة المحدثة: دعم التحقق الأمني، الإشعارات الفخمة، وإدارة الجلسات المؤقتة
 */

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;

    // 1. التحقق الأولي من صحة البيانات قبل إزعاج الخادم
    if (!Validation.isEmail(emailInput)) {
        Notify.error("يرجى إدخال بريد إلكتروني صحيح");
        return;
    }

    if (!passwordInput || passwordInput.length < 6) {
        Notify.error("يرجى إدخال كلمة المرور بشكل صحيح");
        return;
    }

    // 2. تغيير حالة الزر (تأثير جاري التحميل الفخم)
    loginBtn.disabled = true;
    loginBtn.classList.add('animate-pulse');
    loginBtn.innerHTML = `
        <span style="display:flex; align-items:center; gap:10px;">
            <div class="spinner-small"></div> جاري التحقق...
        </span>
    `;

    try {
        // 3. إرسال الطلب لـ Make.com
        const response = await API.post(API_CONFIG.BASE_URL, {
            action: 'login',
            payload: {
                email: emailInput,
                password: passwordInput
            },
            metadata: {
                timestamp: new Date().toISOString(),
                platform: APP_INFO.NAME,
                version: APP_INFO.VERSION
            }
        });

        // 4. معالجة الرد الذكي
        if (response && response.success) {
            // حفظ البريد مؤقتاً ليكون متاحاً لصفحة الـ OTP
            Storage.set('temp_user', { 
                email: emailInput,
                last_attempt: new Date().getTime()
            });
            
            Notify.success("تم التحقق بنجاح، جاري إرسال رمز الأمان...");
            
            // التوجيه لصفحة التوثيق بعد تأخير بسيط ليشعر المستخدم بالنجاح
            setTimeout(() => {
                window.location.href = ROUTES.VERIFY;
            }, 1000);

        } else {
            // عرض رسالة الخطأ القادمة من Make.com (مثل: كلمة المرور خاطئة)
            Notify.error(response?.message || "البيانات غير متطابقة، يرجى المحاولة مجدداً");
            loginBtn.disabled = false;
            loginBtn.classList.remove('animate-pulse');
            loginBtn.innerHTML = `<span>تسجيل الدخول</span>`;
        }

    } catch (error) {
        console.error("[Login Engine] Error:", error);
        Notify.error("عذراً، تعذر الاتصال بالخادم حالياً");
        loginBtn.disabled = false;
        loginBtn.classList.remove('animate-pulse');
        loginBtn.innerHTML = `<span>تسجيل الدخول</span>`;
    }
});

/**
 * وظيفة إضافية: تنظيف الجلسات القديمة عند فتح الصفحة
 */
window.addEventListener('load', () => {
    // إذا دخل المستخدم صفحة اللوجن، نمسح أي بيانات مؤقتة قديمة
    Storage.remove('temp_user');
});
