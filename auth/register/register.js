/**
 * محرك صفحة التسجيل (Registration Engine) - منصة تيرا
 * النسخة المحدثة: فحص أمني شامل، إشعارات احترافية، وإدارة الجلسات المؤقتة
 */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const registerBtn = document.getElementById('registerBtn');
    
    // 1. تجميع وتنظيف البيانات
    const payloadData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value
    };

    // 2. فحص أمني مكثف قبل الإرسال (Front-end Validation)
    if (!Validation.isValidName(payloadData.fullName)) {
        Notify.error("يرجى إدخال الاسم الكامل (الاسم الأول والأخير)");
        return;
    }

    if (!Validation.isEmail(payloadData.email)) {
        Notify.error("صيغة البريد الإلكتروني غير صحيحة");
        return;
    }

    if (!Validation.isSaudiPhone(payloadData.phone)) {
        Notify.error("يرجى إدخال رقم جوال سعودي صحيح (05xxxxxxxx)");
        return;
    }

    if (!Validation.isStrongPassword(payloadData.password)) {
        Notify.error("كلمة المرور ضعيفة (يجب أن تشمل 8 أحرف وأرقام)");
        return;
    }

    // 3. تأمين الواجهة وتفعيل وضع "جاري المعالجة"
    registerBtn.disabled = true;
    registerBtn.classList.add('animate-pulse');
    registerBtn.innerHTML = `
        <span style="display:flex; align-items:center; gap:10px;">
            <div class="spinner-small"></div> جاري معالجة طلبك...
        </span>
    `;

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

        // 5. معالجة الرد الذكي
        if (response && response.success) {
            // حفظ بيانات المستثمر مؤقتاً لتمريرها لصفحة OTP
            Storage.set('temp_user', { 
                email: payloadData.email, 
                phone: payloadData.phone,
                fullName: payloadData.fullName,
                type: 'registration'
            });

            Notify.success("تم إنشاء الحساب بنجاح! جاري إرسال كود التحقق...");
            
            // التوجيه لصفحة التحقق بعد ثانية واحدة
            setTimeout(() => {
                window.location.href = ROUTES.VERIFY;
            }, 1000);

        } else {
            // معالجة حالات الرفض (مثلاً: الإيميل موجود مسبقاً)
            Notify.error(response?.message || "تعذر إكمال التسجيل، يرجى المحاولة لاحقاً");
            this.resetBtn(registerBtn);
        }

    } catch (error) {
        console.error("[Registration Engine] Error:", error);
        Notify.error("عذراً، حدث خطأ فني أثناء الاتصال بالخادم");
        this.resetBtn(registerBtn);
    }
});

/**
 * إعادة الزر لحالته الطبيعية
 */
function resetBtn(btn) {
    btn.disabled = false;
    btn.classList.remove('animate-pulse');
    btn.innerHTML = `<span>إنشاء الحساب</span>`;
}

/**
 * تنظيف أي بيانات قديمة عند تحميل الصفحة
 */
window.addEventListener('load', () => {
    Storage.remove('temp_user');
});
