document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // ⚠️ ضع الرابط السري الذي نسخته من منصة Make.com هنا بين علامتي التنصيص
    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/YOUR_WEBHOOK_URL_HERE';

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.textContent = '';
            successMessage.textContent = '';

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            let whatsapp = document.getElementById('whatsapp').value.trim();
            const password = document.getElementById('password').value;

            if (password.length < 4) {
                errorMessage.textContent = 'كلمة المرور يجب أن تكون 4 رموز على الأقل.';
                return;
            }

            // تنظيف رقم الواتساب (إزالة علامة + أو المسافات ليتوافق مع API الواتساب)
            whatsapp = whatsapp.replace(/\D/g, '');

            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            if (existingUsers.some(u => u.email === email)) {
                errorMessage.textContent = 'البريد الإلكتروني مسجل مسبقاً.';
                return;
            }

            // توليد كود التحقق الأمني (OTP) من 4 أرقام
            const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

            const newUser = {
                id: Date.now(),
                name: fullName,
                email: email,
                whatsapp: whatsapp,
                password: password,
                securityPin: generatedPin,
                role: 'client',
                status: 'active'
            };

            // تعطيل الزر وعرض حالة التحميل
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'جاري إرسال كود التحقق للواتساب... ⏳';

            try {
                // إرسال البيانات إلى Make.com
                const response = await fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: fullName,
                        whatsapp: whatsapp,
                        pin: generatedPin
                    })
                });

                if (response.ok) {
                    // حفظ الحساب في المتصفح ليتمكن من تسجيل الدخول
                    existingUsers.push(newUser);
                    localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

                    submitBtn.style.display = 'none';
                    successMessage.innerHTML = `
                        تم تسجيل حسابك بنجاح! 🎉<br>
                        💬 <strong>تم إرسال كود التحقق الأمني إلى واتساب الخاص بك.</strong><br>
                        يرجى مراجعة الواتساب، جاري تحويلك لتسجيل الدخول...
                    `;

                    // تحويل المستخدم لصفحة الدخول بعد 4 ثوانٍ
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 4000);
                } else {
                    throw new Error('فشل إرسال الطلب');
                }
            } catch (error) {
                console.error('Webhook Error:', error);
                errorMessage.textContent = 'حدث خطأ أثناء الاتصال ببوابة الواتساب، يرجى المحاولة.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'تسجيل وإرسال كود التحقق';
            }
        });
    }
});
