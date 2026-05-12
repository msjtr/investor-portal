/**
 * محرك صفحة التسجيل (Registration Engine)
 * يستقبل بيانات المستثمر الجديد ويرسلها فوراً إلى Make.com
 */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. جلب عناصر الواجهة
    const registerBtn = document.getElementById('registerBtn');
    
    // 2. تجميع وتنظيف البيانات المدخلة
    const payloadData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value
    };

    // 3. تأمين واجهة المستخدم (تغيير حالة الزر لمنع الإرسال المزدوج)
    registerBtn.disabled = true;
    registerBtn.innerHTML = `<span>جاري معالجة البيانات...</span>`;

    try {
        // 4. إرسال البيانات للـ Webhook المركزي (Make.com)
        const response = await API.post(API_CONFIG.BASE_URL, {
            action: 'register',
            payload: payloadData,
            metadata: {
                platform: APP_INFO.NAME,
                version: APP_INFO.VERSION,
                timestamp: new Date().toISOString()
            }
        });

        // 5. معالجة الرد القادم من الخادم
        if (response && response.success) {
            // حفظ بيانات المستخدم مؤقتاً في التخزين المحلي لاستخدامها في صفحة التوثيق
            Storage.set('temp_user', { 
                email: payloadData.email, 
                phone: payloadData.phone,
                fullName: payloadData.fullName 
            });

            // توجيه المستثمر فوراً لصفحة إدخال رمز التحقق (OTP)
            window.location.href = ROUTES.VERIFY;
        } else {
            // في حال رفض الخادم للطلب (مثلاً: البريد مسجل مسبقاً)
            alert(response?.message || "عذراً، تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.");
        }

    } catch (error) {
        console.error("Registration Engine Error:", error);
        alert("تعذر الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت وتفعيل سيناريو Make.com.");
    } finally {
        // 6. إعادة الزر لحالته الطبيعية في حال حدوث خطأ
        registerBtn.disabled = false;
        registerBtn.innerHTML = `<span>إنشاء الحساب</span>`;
    }
});
