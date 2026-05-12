document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.otp-input');
    const verifyForm = document.getElementById('otpForm');
    const emailDisplay = document.getElementById('userEmailDisplay');

    // جلب البريد المحفوظ
    const tempUser = Storage.get('temp_user');
    if (tempUser) emailDisplay.innerText = tempUser.email;

    // التنقل التلقائي بين المربعات
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) inputs[index + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) inputs[index - 1].focus();
        });
    });

    // إرسال الكود للتحقق في Make.com
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otpCode = Array.from(inputs).map(inp => inp.value).join('');
        
        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'verify_otp',
                payload: { email: tempUser.email, otp: otpCode }
            });

            if (response && response.success) {
                alert("تم التوثيق بنجاح!");
                window.location.href = ROUTES.HOME;
            } else {
                alert("رمز التحقق غير صحيح");
            }
        } catch (error) {
            alert("خطأ في الاتصال بالخادم");
        }
    });
});
