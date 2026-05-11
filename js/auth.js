document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const btnNext = document.getElementById('btnNext');
    const btnBack = document.getElementById('btnBack');
    const errorMessage = document.getElementById('errorMessage');
    const subTitle = document.getElementById('subTitle');

    let matchedUser = null;

    if (btnNext) {
        btnNext.addEventListener('click', async () => {
            errorMessage.textContent = '';
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                errorMessage.textContent = 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.';
                return;
            }

            try {
                // مسار جلب البيانات الوهمية
                const response = await fetch('../../mock-data/users.json');
                const users = await response.json();

                matchedUser = users.find(u => u.email === email && u.password === password && u.status === 'active');

                if (matchedUser) {
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                    subTitle.textContent = 'التحقق الأمني بخطوتين';
                } else {
                    errorMessage.textContent = 'البيانات غير صحيحة أو الحساب غير مفعل.';
                }
            } catch (error) {
                console.error('Error:', error);
                errorMessage.textContent = 'حدث خطأ في الاتصال بالنظام.';
            }
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            step2.style.display = 'none';
            step1.style.display = 'block';
            subTitle.textContent = 'مرحباً بك مجدداً';
            errorMessage.textContent = '';
            document.getElementById('securityPin').value = '';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pinInput = document.getElementById('securityPin').value;

            if (matchedUser && matchedUser.securityPin === pinInput) {
                // حفظ الجلسة في المتصفح
                localStorage.setItem('currentUser', JSON.stringify(matchedUser));
                
                // التوجيه للوحة التحكم حسب الدور
                if (matchedUser.role === 'admin') {
                    window.location.href = '../admin/dashboard/index.html';
                } else {
                    window.location.href = '../client/dashboard/index.html';
                }
            } else {
                errorMessage.textContent = 'رقم الضمان الأمني غير صحيح.';
            }
        });
    }
});
