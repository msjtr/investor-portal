/**
 * محرك صفحة استعادة كلمة المرور
 * يرسل طلب الاستعادة إلى الـ Webhook المركزي في Make.com
 */
document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const forgotBtn = document.getElementById('forgotBtn');
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();

        // تأمين الواجهة لمنع تكرار الإرسال
        forgotBtn.disabled = true;
        forgotBtn.innerHTML = `<span>جاري إرسال الرابط...</span>`;

        try {
            // إرسال حزمة البيانات إلى Make.com
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'forgot_password',
                payload: { email }
            });

            // قراءة الرد القادم من الخادم
            if (response && response.success) {
                // حفظ البريد محلياً للتعرف عليه في صفحة إعادة التعيين (Reset) لاحقاً
                Storage.set('reset_email', email);
                
                alert("تم إرسال تعليمات استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.");
                // إعادة توجيه المستثمر لصفحة الدخول
                window.location.href = "https://msjtr.github.io/investor-portal/auth/login/login.html";
            } else {
                alert(response?.message || "عذراً، البريد الإلكتروني غير مسجل لدينا.");
            }
        } catch (error) {
            console.error("Forgot Password Error:", error);
            alert("حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً وتأكيد تفعيل السيناريو.");
        } finally {
            // إعادة الزر لحالته الأصلية
            forgotBtn.disabled = false;
            forgotBtn.innerHTML = `<span>إرسال رابط الاستعادة</span>`;
            emailInput.value = '';
        }
    });
});
