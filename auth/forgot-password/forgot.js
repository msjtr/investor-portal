/**
 * محرك صفحة استعادة كلمة المرور (Forgot Password Engine) - منصة تيرا
 * النسخة المحدثة: فحص استباقي، إشعارات زجاجية، وتكامل مع Webhook الاستعادة
 */

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const forgotBtn = document.getElementById('forgotBtn');
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();

        // 1. التحقق الأولي من صحة البريد قبل إزعاج الخادم
        if (!Validation.isEmail(email)) {
            Notify.error("يرجى إدخال بريد إلكتروني صحيح");
            return;
        }

        // 2. تأمين الواجهة وتفعيل حالة "جاري الإرسال"
        forgotBtn.disabled = true;
        forgotBtn.classList.add('animate-pulse');
        forgotBtn.innerHTML = `
            <span style="display:flex; align-items:center; gap:10px;">
                <div class="spinner-small"></div> جاري إرسال الرمز...
            </span>
        `;

        try {
            // 3. إرسال الطلب لـ Make.com (Action: forgot_password)
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'forgot_password',
                payload: { email },
                metadata: {
                    timestamp: new Date().toISOString(),
                    platform: APP_INFO.NAME
                }
            });

            // 4. معالجة الرد الذكي من الخادم
            if (response && response.success) {
                // حفظ البريد مؤقتاً لصفحة الـ OTP (في حال أردت تفعيل التحقق قبل التغيير)
                Storage.set('temp_user', { 
                    email: email,
                    type: 'reset_password'
                });
                
                Notify.success("تم إرسال رمز الاستعادة بنجاح، يرجى فحص بريدك.");
                
                // التوجيه لصفحة التحقق بعد ثانية ونصف
                setTimeout(() => {
                    window.location.href = ROUTES.VERIFY;
                }, 1500);

            } else {
                // عرض رسالة الخطأ (مثل: البريد غير مسجل)
                Notify.error(response?.message || "عذراً، البريد الإلكتروني غير موجود لدينا.");
                this.resetBtn(forgotBtn);
            }

        } catch (error) {
            console.error("[Forgot Engine] Error:", error);
            Notify.error("حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.");
            this.resetBtn(forgotBtn);
        }
    });

    /**
     * إعادة الزر لحالته الطبيعية
     */
    function resetBtn(btn) {
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>إرسال رمز الاستعادة</span>`;
    }
});
