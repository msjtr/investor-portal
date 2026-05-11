document.addEventListener('DOMContentLoaded', () => {
    // 1. تعريف العناصر الأساسية (تأكد من مطابقة الـ IDs في الـ HTML)
    const registerForm = document.getElementById('registerForm');
    const regStep1 = document.getElementById('regStep1');
    const regStep2 = document.getElementById('regStep2');
    
    // المدخلات
    const passwordInput = document.getElementById('pass');
    const confirmPasswordInput = document.getElementById('confirmPass');
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirmEmail');
    const otpInput = document.getElementById('regOtp');
    
    // عناصر الحالة والمؤقت
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    const timerCount = document.getElementById('regTimer');
    const resendBtn = document.getElementById('resendRegBtn');
    const activateBtn = document.getElementById('activateBtn');

    // رابط الـ Webhook الخاص بك (Make.com)
    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5';

    let generatedPin = null;
    let countdownInterval = null;
    let tempUserData = null;

    // --- 1. نظام فحص قوة كلمة المرور المطور ---
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const requirements = {
            len: val.length >= 6,
            char: /[a-zA-Z]/.test(val),
            spec: /[\W_]/.test(val)
        };

        // تحديث الألوان في القائمة الجانبية (إضافة كلاس valid)
        if(document.getElementById('reqLen')) document.getElementById('reqLen').classList.toggle('valid', requirements.len);
        if(document.getElementById('reqChar')) document.getElementById('reqChar').classList.toggle('valid', requirements.char);
        if(document.getElementById('reqSpec')) document.getElementById('reqSpec').classList.toggle('valid', requirements.spec);

        // حساب القوة وتلوين شريط القوة
        let score = 0;
        if (requirements.len) score++;
        if (requirements.char) score++;
        if (requirements.spec) score++;

        if (strengthFill) {
            const width = (score / 3) * 100;
            strengthFill.style.width = `${width}%`;

            // تغيير الألوان والنصوص بناءً على القوة
            if (score === 1) {
                strengthFill.style.backgroundColor = "#ef4444"; // أحمر
                if(strengthText) strengthText.textContent = "قوة كلمة المرور: ضعيفة";
            } else if (score === 2) {
                strengthFill.style.backgroundColor = "#f59e0b"; // برتقالي
                if(strengthText) strengthText.textContent = "قوة كلمة المرور: متوسطة";
            } else if (score === 3) {
                strengthFill.style.backgroundColor = "#10b981"; // أخضر
                if(strengthText) strengthText.textContent = "قوة كلمة المرور: قوية جداً";
            } else {
                strengthFill.style.width = "0%";
                if(strengthText) strengthText.textContent = "قوة كلمة المرور: غير مستوفية";
            }
        }
    });

    // --- 2. نظام المؤقت الزمني (5 دقائق) ---
    function startTimer(duration) {
        let timer = duration;
        resendBtn.disabled = true;
        resendBtn.style.opacity = "0.5";
        
        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            let minutes = Math.floor(timer / 60);
            let seconds = timer % 60;

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            if(timerCount) timerCount.textContent = `${minutes}:${seconds}`;

            if (--timer < 0) {
                clearInterval(countdownInterval);
                if(timerCount) timerCount.textContent = "جاهز";
                resendBtn.disabled = false;
                resendBtn.style.opacity = "1";
                resendBtn.style.background = "var(--primary)";
            }
        }, 1000);
    }

    // --- 3. إرسال البيانات لـ Make.com ---
    async function sendToMake(userData, pin) {
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

    // --- 4. معالجة نموذج التسجيل الرئيسي ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // أ. التحقق من مطابقة البيانات وتطهيرها (Trim)
        if (emailInput.value.trim() !== confirmEmailInput.value.trim()) {
            alert("عذراً، البريد الإلكتروني غير متطابق!");
            return;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert("عذراً، كلمة المرور غير متطابقة!");
            return;
        }

        // ب. توليد كود التحقق (PIN)
        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        // ج. حفظ البيانات مؤقتاً
        tempUserData = {
            name: document.getElementById('fullName').value.trim(),
            email: emailInput.value.trim(),
            phone: document.getElementById('country').value + document.getElementById('phone').value.trim(),
            password: passwordInput.value
        };

        // د. الانتقال لشاشة الـ OTP وإرسال الكود
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري المعالجة...';

        const success = await sendToMake(tempUserData, generatedPin);
        
        if (success) {
            regStep1.style.display = 'none';
            regStep2.style.display = 'block';
            startTimer(300); // 5 دقائق
            // تركيز الماوس تلقائياً على حقل الـ OTP (لتحسين تجربة الجوال)
            if(otpInput) otpInput.focus();
        } else {
            alert("حدث خطأ أثناء إرسال الكود، يرجى المحاولة مرة أخرى.");
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // --- 5. إعادة إرسال الكود ---
    resendBtn.addEventListener('click', async () => {
        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        const originalText = resendBtn.textContent;
        resendBtn.textContent = 'جاري الإرسال...';
        
        const success = await sendToMake(tempUserData, generatedPin);
        if (success) {
            startTimer(300);
            setTimeout(() => resendBtn.textContent = originalText, 2000);
        } else {
            alert("فشل إعادة الإرسال، تحقق من اتصالك.");
            resendBtn.textContent = originalText;
        }
    });

    // --- 6. التحقق النهائي من الـ OTP والتوجيه ---
    activateBtn.addEventListener('click', () => {
        const userEnteredOtp = otpInput.value.trim();

        if (userEnteredOtp === generatedPin) {
            // محاكاة حفظ البيانات في المتصفح
            const users
