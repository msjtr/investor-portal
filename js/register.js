document.addEventListener('DOMContentLoaded', () => {
    // 1. تعريف العناصر الأساسية
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
    const strengthFill = document.getElementById('strengthFill');
    const matchMsg = document.getElementById('matchMsg');
    const timerCount = document.getElementById('regTimer');
    const resendBtn = document.getElementById('resendRegBtn');
    const activateBtn = document.getElementById('activateBtn');

    // عناصر التنبيه (Toast) المدعومة بالـ 3D
    const toastOverlay = document.getElementById('toastOverlay');
    const toastMsg = document.getElementById('toastMsg');
    const toastIconContainer = document.getElementById('toastIconContainer'); // تم التعديل لحاوية الـ 3D

    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5';

    let generatedPin = null;
    let countdownInterval = null;
    let tempUserData = null;

    // --- 2. نظام الكاش (الحفظ التلقائي واسترجاع البيانات) ---
    const fieldsToCache = ['fullName', 'email', 'confirmEmail', 'phone', 'username'];
    fieldsToCache.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const savedValue = localStorage.getItem('cache_' + id);
            if (savedValue) element.value = savedValue;

            element.addEventListener('input', () => {
                localStorage.setItem('cache_' + id, element.value);
            });
        }
    });

    // --- وظيفة التنبيه الجمالي ثلاثي الأبعاد في المنتصف ---
    function showToast(message, isSuccess = true) {
        // تفريغ الحاوية أولاً
        toastIconContainer.innerHTML = '';
        
        // إنشاء وحقن أيقونة 3D متحركة بناءً على النتيجة
        const icon = document.createElement('lord-icon');
        icon.setAttribute('trigger', 'in');
        icon.style.width = '80px';
        icon.style.height = '80px';

        if (isSuccess) {
            icon.setAttribute('src', 'https://cdn.lordicon.com/guqkthbs.json'); // أيقونة نجاح 3D
            icon.setAttribute('colors', 'primary:#10b981'); // أخضر
        } else {
            icon.setAttribute('src', 'https://cdn.lordicon.com/bmnlikjh.json'); // أيقونة خطأ 3D
            icon.setAttribute('colors', 'primary:#ef4444'); // أحمر
        }

        toastIconContainer.appendChild(icon);
        toastMsg.textContent = message;
        toastOverlay.style.display = 'block';
        
        setTimeout(() => { toastOverlay.style.display = 'none'; }, 3000);
    }

    // --- 3. نظام فحص كلمة المرور (إنجليزي فقط + قوة) ---
    passwordInput.addEventListener('input', () => {
        passwordInput.value = passwordInput.value.replace(/[^\x00-\x7F]/g, "");

        const val = passwordInput.value;
        const reqs = {
            len: val.length >= 6,
            char: /[a-zA-Z]/.test(val),
            spec: /[\W_]/.test(val)
        };

        if(document.getElementById('reqLen')) document.getElementById('reqLen').classList.toggle('valid', reqs.len);
        if(document.getElementById('reqChar')) document.getElementById('reqChar').classList.toggle('valid', reqs.char);
        if(document.getElementById('reqSpec')) document.getElementById('reqSpec').classList.toggle('valid', reqs.spec);

        let score = Object.values(reqs).filter(Boolean).length;
        if (strengthFill) {
            strengthFill.style.width = (score / 3 * 100) + "%";
            strengthFill.style.backgroundColor = score === 3 ? "#10b981" : score === 2 ? "#f59e0b" : "#ef4444";
        }
        checkMatch();
    });

    // --- 4. نظام فحص المطابقة الفوري ---
    confirmPasswordInput.addEventListener('input', checkMatch);

    function checkMatch() {
        if (!confirmPasswordInput.value) {
            if(matchMsg) matchMsg.style.display = 'none';
            return;
        }
        if(matchMsg) {
            matchMsg.style.display = 'block';
            if (passwordInput.value === confirmPasswordInput.value) {
                matchMsg.textContent = "● كلمات المرور متطابقة";
                matchMsg.style.color = "#4ade80";
            } else {
                matchMsg.textContent = "● كلمات المرور غير متطابقة";
                matchMsg.style.color = "#f87171";
            }
        }
    }

    // --- 5. نظام المؤقت الزمني (5 دقائق) ---
    function startTimer(duration) {
        let timer = duration;
        resendBtn.disabled = true;
        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            let m = Math.floor(timer / 60), s = timer % 60;
            timerCount.textContent = `${m}:${s < 10 ? '0'+s : s}`;
            if (--timer < 0) {
                clearInterval(countdownInterval);
                timerCount.textContent = "جاهز";
                resendBtn.disabled = false;
                resendBtn.style.background = "var(--primary)";
            }
        }, 1000);
    }

    // --- 6. معالجة نموذج التسجيل والـ Webhook ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (emailInput.value.trim() !== confirmEmailInput.value.trim()) {
            showToast("عذراً، البريد الإلكتروني غير متطابق!", false);
            return;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            showToast("عذراً، كلمة المرور غير متطابقة!", false);
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري إرسال كود التفعيل...';

        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        
        tempUserData = {
            name: document.getElementById('fullName').value.trim(),
            username: document.getElementById('username').value.trim(),
            email: emailInput.value.trim(),
            phone: document.getElementById('countryCode').value + document.getElementById('phone').value.trim(),
            password: passwordInput.value
        };

        try {
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: tempUserData.name,
                    username: tempUserData.username,
                    email: tempUserData.email,
                    pin: generatedPin
                })
            });

            if (response.ok) {
                showToast("تم إرسال الكود لبريدك بنجاح", true);
                regStep1.style.display = 'none';
                regStep2.style.display = 'block';
                startTimer(300);
            } else { throw new Error(); }
        } catch (error) {
            showToast("فشل إرسال الكود، تأكد من الاتصال", false);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء حساب';
        }
    });

    // --- 7. التفعيل النهائي والدخول ---
    activateBtn.addEventListener('click', () => {
        if (otpInput.value.trim() === generatedPin) {
            showToast("تم تفعيل حسابكم بنجاح! 🎉", true);
            
            fieldsToCache.forEach(id => localStorage.removeItem('cache_' + id));
            
            setTimeout(() => { window.location.href = "login.html"; }, 2000);
        } else {
            showToast("كود التحقق غير صحيح", false);
        }
    });
});

// وظيفة العين (خارج النطاق لتكون متاحة للـ onclick في HTML)
function togglePass(id) {
    const input = document.getElementById(id);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}
