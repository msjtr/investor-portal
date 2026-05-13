/**
 * محرك صفحة تسجيل الدخول (Login Engine)
 */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;

    // تغيير حالة الزر لمنع الضغط المتكرر
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span>جاري التحقق...</span>`;

    try {
        // إرسال الطلب لـ Make.com (لاحظ أن الأكشن هنا هو login)
        const response = await API.post(API_CONFIG.BASE_URL, {
            action: 'login',
            payload: {
                email: emailInput,
                password: passwordInput
            },
            metadata: {
                timestamp: new Date().toISOString(),
                platform: APP_INFO.NAME
            }
        });

        // إذا استلمنا الرد السحري من Webhook Response اللي سويناه (200 OK)
        if (response && response.success) {
            // حفظ البريد مؤقتاً عشان صفحة التوثيق تعرف لمين ترسل رسالة الإعادة
            Storage.set('temp_user', { email: emailInput });
            
            // التوجيه فوراً لصفحة التوثيق (OTP)
            window.location.href = ROUTES.VERIFY;
        } else {
            alert(response?.message || "تعذر تسجيل الدخول، تأكد من البيانات.");
        }

    } catch (error) {
        console.error("Login Engine Error:", error);
        alert("حدث خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل سيناريو Make.com.");
    } finally {
        // إعادة الزر لحالته
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<span>تسجيل الدخول</span>`;
    }
});
