/**
 * محرك صفحة تسجيل الدخول (Login Engine) - منصة تيرا
 * النسخة المحدثة: دعم التحقق الأمني، إظهار كلمة المرور بالنص، وإدارة الجلسات
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    // 1. تفعيل ميزة "عرض كلمة المرور" بالنص الصريح فور تحميل الصفحة
    if (typeof Helpers !== 'undefined' && Helpers.setupPasswordVisibility) {
        Helpers.setupPasswordVisibility();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('email').value.trim();
        const passwordInput = document.getElementById('password').value;

        // 2. التحقق الأولي من صحة البيانات
        if (!Validation.isEmail(emailInput)) {
            Notify.error("يرجى إدخال بريد إلكتروني صحيح");
            return;
        }

        if (!passwordInput || passwordInput.length < 6) {
            Notify.error("كلمة المرور يجب أن تكون 6 خانات على الأقل");
            return;
        }

        // 3. تأمين الزر وتفعيل حالة "جاري التحقق"
        loginBtn.disabled = true;
        loginBtn.classList.add('animate-pulse');
        loginBtn.innerHTML = `
            <span style="display:flex; align-items:center; gap:10px; justify-content:center;">
                <div class="spinner-small"></div> جاري التحقق...
            </span>
        `;

        try {
            // 4. إرسال الطلب لـ Make.com
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

            // 5. معالجة الرد الذكي
            if (response && response.success) {
                // حفظ البريد مؤقتاً لصفحة الـ OTP
                Storage.set('temp_user', { 
                    email: emailInput,
                    last_attempt: new Date().getTime(),
                    type: 'login'
                });
                
                Notify.success("تم التحقق بنجاح، جاري إرسال رمز الأمان...");
                
                // التوجيه لصفحة التوثيق بعد ثانية واحدة
                setTimeout(() => {
                    window.location.href = ROUTES.VERIFY;
                }, 1000);

            } else {
                // عرض رسالة الخطأ القادمة من الخادم (مثل: الحساب غير موجود)
                Notify.error(response?.message || "بيانات الدخول غير صحيحة");
                resetLoginBtn(loginBtn);
            }

        } catch (error) {
            console.error("[Login Engine] Error:", error);
            Notify.error("عذراً، تعذر الاتصال بالخادم حالياً");
            resetLoginBtn(loginBtn);
        }
    });
});

/**
 * وظيفة لإعادة الزر لحالته الطبيعية عند الخطأ
 */
function resetLoginBtn(btn) {
    btn.disabled = false;
    btn.classList.remove('animate-pulse');
    btn.innerHTML = `<span>تسجيل الدخول</span>`;
}

/**
 * تنظيف الجلسات القديمة عند تحميل الصفحة لضمان أمان المسار
 */
window.addEventListener('load', () => {
    Storage.remove('temp_user');
});
