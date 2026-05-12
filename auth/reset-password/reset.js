document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetForm');
    
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const resetBtn = document.getElementById('resetBtn');
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const resetEmail = Storage.get('reset_email');

        if (newPassword !== confirmPassword) {
            alert("كلمات المرور غير متطابقة!");
            return;
        }

        resetBtn.disabled = true;
        resetBtn.innerHTML = `<span>جاري التحديث...</span>`;

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'reset_password',
                payload: { 
                    email: resetEmail,
                    password: newPassword 
                }
            });

            if (response && response.success) {
                Storage.remove('reset_email');
                alert("تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
                window.location.href = ROUTES.LOGIN;
            } else {
                alert(response?.message || "حدث خطأ أثناء التحديث.");
            }
        } catch (error) {
            alert("خطأ في الاتصال بالخادم.");
        } finally {
            resetBtn.disabled = false;
            resetBtn.innerHTML = `<span>تحديث كلمة المرور</span>`;
        }
    });
});
