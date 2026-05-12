document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.otp-input');
    const verifyForm = document.getElementById('otpForm');
    const resendBtn = document.getElementById('resendBtn');
    const timerSpan = document.getElementById('timer');
    const emailDisplay = document.getElementById('userEmailDisplay');

    // 1. عرض البريد الإلكتروني المحفوظ من صفحة التسجيل
    const tempUser = Storage.get('temp_user');
    if (tempUser && tempUser.email) {
        emailDisplay.innerText = tempUser.email;
    } else {
        // لو لم يجد إيميل، يعيده لصفحة التسجيل كإجراء أمان
        window.location.href = ROUTES.REGISTER;
    }

    // 2. التنقل التلقائي الذكي بين المربعات
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        // 3. دعم ميزة النسخ واللصق للكود المكون من 6 أرقام
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').trim();
            if (/^\d{6}$/.test(pastedData)) {
                inputs.forEach((inp, i) => inp.value = pastedData[i]);
                inputs[inputs.length - 1].focus();
            }
        });
    });

    // 4. مؤقت إعادة الإرسال (60 ثانية)
    let timeLeft = 60;
    const startTimer = () => {
        resendBtn.disabled = true;
        const timerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = `(${timeLeft})`;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                resendBtn.disabled = false;
                timerSpan.innerText = '';
            }
        }, 1000);
    };
    startTimer();

    // 5. إرسال الكود للتحقق
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const verifyBtn = document.getElementById('verifyBtn');
        
        // تجميع الأرقام من المربعات الستة
        const otpCode = Array.from(inputs).map(inp => inp.value).join('');
        
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `<span>جاري التحقق...</span>`;

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'verify_otp',
                payload: {
                    email: tempUser.email,
                    otp: otpCode
                }
            });

            if (response && response.success) {
                // تفعيل الحساب وتحويله لجلسة رسمية نشطة
                Storage.set('user_session', { ...tempUser, status: 'active', verified: true });
                Storage.remove('temp_user');
                
                alert("تم توثيق الحساب بنجاح! مرحباً بك في لوحة التحكم.");
                // توجيهه للوحة التحكم (حسب المسار المعتمد عندك)
                window.location.href = ROUTES.HOME; 
            } else {
                alert(response?.message || "رمز التحقق غير صحيح أو منتهي الصلاحية.");
                inputs.forEach(inp => inp.value = '');
                inputs[0].focus();
            }
        } catch (error) {
            console.error("Verification Error:", error);
            alert("حدث خطأ في الاتصال بالخادم.");
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `<span>تأكيد الرمز</span>`;
        }
    });

    // 6. برمجة زر إعادة الإرسال
    resendBtn.addEventListener('click', async () => {
        timeLeft = 60;
        startTimer();
        try {
            await API.post(API_CONFIG.BASE_URL, {
                action: 'resend_otp',
                payload: { email: tempUser.email }
            });
            alert("تم إرسال كود جديد إلى بريدك الإلكتروني.");
        } catch (error) {
            console.error("Resend Error:", error);
        }
    });
});
