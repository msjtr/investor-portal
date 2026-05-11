document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');

    // رابط الـ Webhook الفعلي الخاص بك:
    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5';

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // تنظيف الرسائل السابقة
            errorMessage.textContent = '';
            successMessage.textContent = '';

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // توليد رمز تحقق (OTP) عشوائي من 4 أرقام
            const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

            // تجهيز بيانات المستخدم الجديد
            const newUser = {
                id: Date.now(),
                name: fullName,
                email: email,
                password: password,
                securityPin: generatedPin,
                role: 'client',
                status: 'active'
            };

            // تعطيل الزر أثناء الإرسال لمنع التكرار
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'جاري إرسال كود التحقق... ⏳';
            }

            try {
                // إرسال البيانات إلى منصة Make.com
                await fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 
                        'Accept': 'application/json',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        name: fullName,
                        email: email,
                        pin: generatedPin
                    })
                });

                // حفظ المستخدم في الذاكرة المحلية للدخول لاحقاً
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
                existingUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

                // عرض رسالة النجاح
                if (submitBtn) submitBtn.style.display = 'none';
                successMessage.innerHTML = `
                    تم تسجيل حسابك بنجاح! 🎉<br>
                    📧 <strong>تم إرسال كود التحقق الأمني إلى بريدك الإلكتروني.</strong><br>
                    يرجى مراجعة صندوق الوارد (أو مجلد Spam)، جاري تحويلك...
                `;

                // التحويل لصفحة الدخول بعد 4 ثوانٍ
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 4000);

            } catch (error) {
                console.error('Fetch Error:', error);
                
                // خطة بديلة في حال حظر المتصفح للاتصال: نحفظ العميل ونعرض الرمز لكي لا يتعطل
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
                existingUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

                if (submitBtn) submitBtn.style.display = 'none';
                successMessage.innerHTML = `
                    تم التسجيل بنجاح! 🎉<br>
                    🔑 كود التحقق الخاص بك للدخول هو: <b style="font-size: 18px; color: #4ade80;">${generatedPin}</b><br>
                    يرجى حفظ هذا الرمز واستخدامه عند تسجيل الدخول.
                `;
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 6000);
            }
        });
    }
});
