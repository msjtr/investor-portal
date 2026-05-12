document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // تغيير حالة الزر للتوضيح
    loginBtn.innerText = "جاري التحقق...";
    loginBtn.disabled = true;

    try {
        const response = await API.post(API_CONFIG.BASE_URL, {
            action: 'login',
            email: email,
            password: password
        });

        if (response.success) {
            Storage.set('user_session', response.user);
            window.location.href = ROUTES.HOME;
        } else {
            alert("خطأ: " + response.message);
        }
    } catch (error) {
        alert("فشل الاتصال بالسيرفر، حاول مرة أخرى");
    } finally {
        loginBtn.innerText = "دخول";
        loginBtn.disabled = false;
    }
});
