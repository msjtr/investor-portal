document.addEventListener('DOMContentLoaded', () => {
    // 1. ربط العناصر من الواجهة
    const registerForm = document.getElementById('registerForm');
    const registrationSection = document.getElementById('registrationFormSection');
    const otpSection = document.getElementById('otpSection');
    
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirmEmail');
    
    const strengthBar = document.getElementById('strengthBar');
    const timerDisplay = document.getElementById('timer');
    const resendBtn = document.getElementById('resendBtn');
    const submitBtn = document.getElementById('submitBtn');
    const finalVerifyBtn = document.getElementById('finalVerifyBtn');

    // رابط الـ Webhook الفعلي الخاص بك
    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5';

    let generatedPin = null;
    let countdownInterval = null;
    let tempUserData = null; // حفظ البيانات مؤقتاً لحين التفعيل

    // --- 2. نظام قوة كلمة المرور ---
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const requirements = {
            len: val.length >= 6,
            char: /[a-zA-Z]/.test(val),
            spec: /[\W_]/.test(val)
        };

        // تحديث ألوان القواعد
        document.getElementById('len').className = requirements.len ? 'rule valid' : 'rule';
        document.getElementById('char').className = requirements.char ? 'rule valid' : 'rule';
        document.getElementById('spec').className = requirements.spec ? 'rule valid' : 'rule';

        // حساب القوة وتلوين الشريط
        let strength = 0;
        if (requirements.len) strength += 33.3;
        if (requirements.char) strength += 33.3;
        if (requirements.spec) strength += 33.4;

        strengthBar.style.width = strength + "%";
        if (strength < 40) strengthBar.style.backgroundColor = "#f87171"; // أحمر
        else if (strength < 80) strengthBar.style.backgroundColor = "#fbbf24"; // أصفر
        else strengthBar.style.backgroundColor = "#4ade80"; // أخضر
    });

    // --- 3. نظام المؤقت الزمني (5 دقائق) ---
    function startTimer(duration) {
        let timer = duration;
        resendBtn.disabled = true;
        resendBtn.style.opacity = "0.5";
        
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
                resendBtn.disabled = false;
                resendBtn.style.opacity = "1";
                resendBtn.style.borderColor = "#38bdf8";
                resendBtn.style.color = "#38bdf8";
            }
        }, 1000);
    }

    // --- 4. دالة إرسال البيانات لـ Make.com ---
    async function sendToWebhook(name, email, pin) {
        try {
            await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, pin })
            });
        } catch (error) {
            console.error('Webhook Error:', error);
        }
    }

    // --- 5. معالجة نموذج التسجيل ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // أ. التحقق من مطابقة البريد الإلكتروني
        if (emailInput.value.trim() !== confirmEmailInput.value.trim()) {
            alert("خطأ: البريد الإلكتروني غير متطابق!");
            return;
        }

        // ب. التحقق من مطابقة كلمة المرور
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert("خطأ: كلمة المرور غير متطابقة!");
            return;
        }

        // ج. توليد كود التحقق (OTP)
        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        // د. تجهيز بيانات المستخدم مؤقتاً
        tempUserData = {
            id: Date.now(),
            name: document.getElementById('fullName').value.trim(),
            email: emailInput.value.trim(),
            phone: document.getElementById('countryCode').value + document.getElementById('phone').value.trim(),
            password: passwordInput.value,
            securityPin: generatedPin,
            role: 'client',
            status: 'active'
        };

        // هـ. إرسال الكود وتغيير الواجهة
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري المعالجة...';

        await sendToWebhook(tempUserData.name, tempUserData.email, generatedPin);

        // إخفاء التسجيل وإظهار التفعيل
        document.getElementById('registrationFormSection').style.display = 'none';
        otpSection.style.display = 'block';
        startTimer(300); // مؤقت 5 دقائق
    });

    // --- 6. إعادة إرسال الكود ---
    resendBtn.addEventListener('click', async () => {
        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        tempUserData.securityPin = generatedPin;
        
        resendBtn.textContent = 'تم الإرسال...';
        await sendToWebhook(tempUserData.name, tempUserData.email, generatedPin);
        
        startTimer(300);
        setTimeout(() => resendBtn.textContent = 'إعادة إرسال الكود', 2000);
    });

    // --- 7. التفعيل النهائي والدخول ---
    finalVerifyBtn.addEventListener('click', () => {
        const userEnteredOtp = document.getElementById('otpInput').value.trim();

        if (userEnteredOtp === generatedPin) {
            // حفظ المستخدم بشكل دائم في الذاكرة المحلية
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            existingUsers.push(tempUserData);
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
            
            // حفظ الجلسة الحالية
            localStorage.setItem('currentUser', JSON.stringify(tempUserData));

            alert("تم تفعيل حسابكم بنجاح! 🎉 جاري توجيهكم للوحة التحكم...");
            window.location.href = '../client/dashboard/index.html'; 
        } else {
            alert("كود التحقق غير صحيح، يرجى التأكد من الكود المرسل لبريدك.");
        }
    });
});
