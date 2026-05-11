document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const btnNext = document.getElementById('btnNext');
    const btnBack = document.getElementById('btnBack');
    const btnResend = document.getElementById('resendBtn');
    const errorMessage = document.getElementById('errorMessage');
    const subTitle = document.getElementById('subTitle');
    const timerDisplay = document.getElementById('timer');

    // ⚠️ استبدل هذا الرابط برابط Webhook الخاص بك من Make.com
    const MAKE_WEBHOOK_URL = 'ضع_رابط_الـ_WEBHOOK_هنا';

    let matchedUser = null;
    let countdownInterval = null;
    let generatedOtp = null;

    // --- 1. نظام المؤقت الزمني (5 دقائق) ---
    function startTimer(duration) {
        let timer = duration;
        btnResend.disabled = true; // تعطيل زر إعادة الإرسال في البداية
        
        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            timerDisplay.textContent = `${minutes}:${seconds}`;

            if (--timer < 0) {
                clearInterval(countdownInterval);
                timerDisplay.textContent = "جاهز";
                btnResend.disabled = false; // تفعيل الزر بعد انتهاء الوقت
            }
        }, 1000);
    }

    // --- 2. توليد وإرسال كود التحقق (OTP) ---
    async function sendVerificationCode(user) {
        // توليد رمز عشوائي من 4 أرقام
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        
        try {
            await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    name: user.fullName || user.name, // حسب المسمى في ملف الـ JSON
                    pin: generatedOtp
                })
            });
            console.log("OTP Sent Successfully");
        } catch (error) {
            console.error('Failed to send OTP:', error);
        }
    }

    // --- 3. الخطوة الأولى: التحقق من الإيميل والباسورد ---
    if (btnNext) {
        btnNext.addEventListener('click', async () => {
            errorMessage.textContent = '';
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email || !password) {
                errorMessage.textContent = 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.';
                return;
            }

            try {
                // جلب بيانات المستخدمين
                const response = await fetch('../../mock-data/users.json');
                const users = await response.json();

                matchedUser = users.find(u => u.email === email && u.password === password && u.status === 'active');

                if (matchedUser) {
                    // إرسال الكود فوراً وبدء المؤقت
                    sendVerificationCode(matchedUser);
                    
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                    subTitle.textContent = 'التحقق الأمني بخطوتين';
                    startTimer(300); // بدء مؤقت 5 دقائق (300 ثانية)
                } else {
                    errorMessage.textContent = 'البيانات غير صحيحة أو الحساب غير مفعل.';
                }
            } catch (error) {
                console.error('Error:', error);
                errorMessage.textContent = 'حدث خطأ في الاتصال بالنظام.';
            }
        });
    }

    // --- 4. إعادة إرسال الكود ---
    if (btnResend) {
        btnResend.addEventListener('click', () => {
            if (matchedUser) {
                sendVerificationCode(matchedUser);
                startTimer(300); // إعادة تشغيل المؤقت
                errorMessage.textContent = 'تم إعادة إرسال الكود بنجاح.';
                errorMessage.style.color = '#4ade80';
            }
        });
    }

    // --- 5. العودة للخطوة الأولى ---
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            step2.style.display = 'none';
            step1.style.display = 'block';
            subTitle.textContent = 'مرحباً بك مجدداً';
            errorMessage.textContent = '';
            document.getElementById('securityPin').value = '';
            if (countdownInterval) clearInterval(countdownInterval);
        });
    }

    // --- 6. الخطوة الثانية: التحقق من كود الـ OTP والدخول ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pinInput = document.getElementById('securityPin').value.trim();

            if (generatedOtp && pinInput === generatedOtp) {
                // حفظ الجلسة
                localStorage.setItem('currentUser', JSON.stringify(matchedUser));
                
                // التوجيه للوحة التحكم
                if (matchedUser.role === 'admin') {
                    window.location.href = '../admin/dashboard/index.html';
                } else {
                    window.location.href = '../client/dashboard/index.html';
                }
            } else {
                errorMessage.style.color = '#f87171';
                errorMessage.textContent = 'كود التحقق غير صحيح، يرجى المحاولة مرة أخرى.';
            }
        });
    }
});
