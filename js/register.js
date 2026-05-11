document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');

    // ⚠️ الصق رابط الـ Webhook من Make.com بين علامتي التنصيص أدناه:
    const MAKE_WEBHOOK_URL = 'ضع_رابط_الـ_WEBHOOK_هنا';

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.textContent = '';
            successMessage.textContent = '';

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // توليد رمز تحقق أمني (OTP) من 4 أرقام
            const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

            // حفظ بيانات المستخدم مؤقتاً في المتصفح
            const newUser = {
                name: fullName,
                email: email,
                password: password,
                securityPin: generatedPin,
                role: 'client',
                status: 'active'
            };

            submitBtn.disabled = true;
            submitBtn.textContent = 'جاري إرسال كود التحقق... ⏳';

            try {
                // إرسال البيانات إلى منصة Make.com
                await fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: fullName,
                        email: email,
                        pin: generatedPin
                    })
                });

                // حفظ في localStorage بعد نجاح الإرسال
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
                existingUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

                successMessage.innerHTML = `تم التسجيل! 🎉<br>افحص بريدك الإلكتروني (صندوق الوارد أو الـ Spam) للحصول على كود التحقق.`;
                
                // الانتقال لصفحة تسجيل الدخول بعد 4 ثوانٍ
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 4000);

            } catch (error) {
                console.error('Error:', error);
                // في حال فشل الاتصال، نحفظ البيانات ونظهر الكود للمستخدم (كخطة احتياطية)
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
                existingUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
                
                successMessage.innerHTML = `تم التسجيل محلياً!<br>كود التحقق الخاص بك هو: <b>${generatedPin}</b><br>يرجى حفظه والانتقال لتسجيل الدخول.`;
            }
        });
    }
});
