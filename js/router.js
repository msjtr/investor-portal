document.addEventListener('DOMContentLoaded', () => {
    // 1. ربط العناصر (تأكد من مطابقة الـ IDs في الـ HTML الجديد)
    const registerForm = document.getElementById('registerForm');
    const regStep1 = document.getElementById('regStep1');
    const regStep2 = document.getElementById('regStep2');
    
    const passwordInput = document.getElementById('pass');
    const confirmPasswordInput = document.getElementById('confirmPass');
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirmEmail');
    
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    const timerDisplay = document.getElementById('regTimer');
    const resendBtn = document.getElementById('resendRegBtn');
    const activateBtn = document.getElementById('activateBtn');
    const otpInput = document.getElementById('regOtp');

    // رابط الـ Webhook الخاص بك في Make.com
    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5';

    let generatedPin = null;
    let countdownInterval = null;
    let tempUserData = null;

    // --- 2. نظام قوة كلمة المرور المطور ---
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const requirements = {
            len: val.length >= 6,
            char: /[a-zA-Z]/.test(val),
            spec: /[\W_]/.test(val)
        };

        // تحديث ألوان القواعد الجانبية
        if(document.getElementById('reqLen')) document.getElementById('reqLen').classList.toggle('valid', requirements.len);
        if(document.getElementById('reqChar')) document.getElementById('reqChar').classList.toggle('valid', requirements.char);
        if(document.getElementById('reqSpec')) document.getElementById('reqSpec').classList.toggle('valid', requirements.spec);

        // حساب القوة وتحديث شريط التقدم
        let score = 0;
        if (requirements.len) score++;
        if (requirements.char) score++;
        if (requirements.spec) score++;

        const width = (score / 3) * 100;
        if (strengthFill) {
            strengthFill.style.width = width + "%";
            // تغيير الألوان بناءً على المستوى
            if (score === 1) { strengthFill.style.backgroundColor = "#ef4444"; strengthText.textContent = "ضعيفة"; }
            else if (score === 2) { strengthFill.style.backgroundColor = "#f59e0b"; strengthText.textContent = "متوسطة"; }
            else if (score === 3) { strengthFill.style.backgroundColor = "#10b981"; strengthText.textContent = "قوية جداً"; }
            else { strengthFill.style.width = "0%"; strengthText.textContent = ""; }
        }
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
                resendBtn.style.background = "var(--primary)";
            }
        }, 1000);
    }

    // --- 4. دالة إرسال البيانات لـ Make.com ---
    async function sendToWebhook(userData, pin) {
        try {
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    pin: pin
                })
            });
            return response.ok;
        } catch (error) {
            console.error('Webhook Error:', error);
            return false;
        }
    }

    // --- 5. معالجة نموذج التسجيل ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // أ. التحققات الأساسية
        if (emailInput.value.trim() !== confirmEmailInput.value.trim()) {
            alert("خطأ: البريد الإلكتروني غير متطابق!");
            return;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert("خطأ: كلمة المرور غير متطابقة!");
            return;
        }

        // ب. توليد الـ PIN وتجهيز البيانات
        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        tempUserData = {
            name: document.getElementById('fullName').value.trim(),
            email: emailInput.value.trim(),
            phone: document.getElementById('country').value + document.getElementById('phone').value.trim(),
            password: passwordInput.value
        };

        // ج. إرسال الكود وتغيير الشاشة
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإرسال...';

        const success = await sendToWebhook(tempUserData, generatedPin);

        if (success) {
            regStep1.style.display = 'none';
            regStep2.style.display = 'block';
            startTimer(300); // 5 دقائق
            if(otpInput) otpInput.focus(); // تركيز تلقائي لتحسين تجربة الجوال
        } else {
            alert("عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.");
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء حساب';
        }
    });

    // --- 6. إعادة إرسال الكود ---
    resendBtn.addEventListener('click', async () => {
        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        resendBtn.textContent = 'جاري الإرسال...';
        
        const success = await sendToWebhook(tempUserData, generatedPin);
        if (success) {
            startTimer(300);
            setTimeout(() => resendBtn.textContent = 'إعادة إرسال الكود', 2000);
        }
    });

    // --- 7. التفعيل النهائي والدخول ---
    activateBtn.addEventListener('click', () => {
        const userEnteredOtp = otpInput.value.trim();

        if (userEnteredOtp === generatedPin) {
            // حفظ في الذاكرة المحلية (Mock DB)
            const users = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            users.push({ ...tempUserData, isVerified: true, createdAt: new Date() });
            localStorage.setItem('registeredUsers', JSON.stringify(users));

            alert("تم تفعيل حسابكم بنجاح! 🎉 جاري توجيهكم...");
            window.location.href = "login.html"; 
        } else {
            alert("كود التحقق غير صحيح، يرجى التأكد من الرسالة الواصلة لبريدك.");
        }
    });

    // منع الحروف في حقل الـ OTP (للجوال)
    if(otpInput) {
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
});
