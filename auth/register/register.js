/**
 * محرك صفحة التسجيل (Registration Engine) - منصة تيرا
 * النسخة المحدثة: دعم ميزة إظهار كلمة المرور، التحقق الأمني، وإدارة الجلسات
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');

    // 1. تفعيل ميزة "عرض كلمة المرور" بالنص الصريح فور تحميل الصفحة
    if (typeof Helpers !== 'undefined' && Helpers.setupPasswordVisibility) {
        Helpers.setupPasswordVisibility();
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 2. تجميع وتنظيف البيانات
            const payloadData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                password: document.getElementById('password').value
            };

            // 3. فحص أمني مكثف قبل الإرسال
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

            // 4. تأمين الواجهة وتفعيل وضع "جاري المعالجة"
            registerBtn.disabled = true;
            registerBtn.classList.add('animate-pulse');
            registerBtn.innerHTML = `
                <span style="display:flex; align-items:center; gap:10px; justify-content:center;">
                    <div class="spinner-small"></div> جاري معالجة طلبك...
                </span>
            `;

            try {
                // 5. إرسال البيانات للـ Webhook المركزي (Make.com)
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'register',
                    payload: payloadData,
                    metadata: {
                        platform: APP_INFO.NAME,
                        version: APP_INFO.VERSION,
                        timestamp: new Date().toISOString()
                    }
                });

                // 6. معالجة الرد الذكي
                if (response && response.success) {
                    Storage.set('temp_user', { 
                        email: payloadData.email, 
                        phone: payloadData.phone,
                        fullName: payloadData.fullName,
                        type: 'registration'
                    });

                    Notify.success("تم إنشاء الحساب بنجاح! جاري إرسال كود التحقق...");
                    
                    setTimeout(() => {
                        window.location.href = ROUTES.VERIFY;
                    }, 1000);

                } else {
                    Notify.error(response?.message || "تعذر إكمال التسجيل، يرجى المحاولة لاحقاً");
                    resetBtn(registerBtn);
                }

            } catch (error) {
                console.error("[Registration Engine] Error:", error);
                Notify.error("عذراً، حدث خطأ فني أثناء الاتصال بالخادم");
                resetBtn(registerBtn);
            }
        });
    }
});

/**
 * إعادة الزر لحالته الطبيعية عند الخطأ
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
