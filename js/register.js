document.addEventListener('DOMContentLoaded', () => {
    // 1. تعريف العناصر الأساسية
    const registerForm = document.getElementById('registerForm');
    const regStep1 = document.getElementById('regStep1');
    const regStep2 = document.getElementById('regStep2');
    
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirmEmail');
    const otpInput = document.getElementById('regOtp');
    
    const strengthFill = document.getElementById('strengthFill');
    const timerCount = document.getElementById('regTimer');
    const resendBtn = document.getElementById('resendRegBtn');
    const activateBtn = document.getElementById('activateBtn');

    const toastOverlay = document.getElementById('toastOverlay');
    const toastMsg = document.getElementById('toastMsg');
    const toastIconContainer = document.getElementById('toastIconContainer');

    const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5';

    let generatedPin = null;
    let countdownInterval = null;
    let tempUserData = null;

    // --- 2. نظام الكاش (الحفظ التلقائي) ---
    const fieldsToCache = ['fullName', 'email', 'confirmEmail', 'phone', 'username'];
    fieldsToCache.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const savedValue = localStorage.getItem('inv_cache_' + id);
            if (savedValue) {
                element.value = savedValue;
                element.style.borderColor = 'var(--primary)'; // تمييز الحقل المسترجع
            }

            element.addEventListener('input', () => {
                localStorage.setItem('inv_cache_' + id, element.value);
                element.style.borderColor = 'var(--border)';
            });
        }
    });

    // --- وظيفة التنبيه الجمالي 3D ---
    function showToast(message, isSuccess = true) {
        toastIconContainer.innerHTML = '';
        
        const icon = document.createElement('lord-icon');
        icon.setAttribute('trigger', 'loop');
        icon.setAttribute('delay', '500');
        icon.style.width = '70px';
        icon.style.height = '70px';

        if (isSuccess) {
            icon.setAttribute('src', 'https://cdn.lordicon.com/lupuorrc.json'); // أيقونة نجاح متحركة
            icon.setAttribute('colors', 'primary:#10b981,secondary:#10b981');
        } else {
            icon.setAttribute('src', 'https://cdn.lordicon.com/tdrtuzcl.json'); // أيقونة خطأ متحركة
            icon.setAttribute('colors', 'primary:#ef4444,secondary:#ef4444');
        }

        toastIconContainer.appendChild(icon);
        toastMsg.textContent = message;
        toastOverlay.style.display = 'block';
        
        setTimeout(() => { toastOverlay.style.display = 'none'; }, 3500);
    }

    // --- 3. نظام قوة كلمة المرور (إنجليزي فقط) ---
    passwordInput.addEventListener('input', () => {
        // منع الحروف العربية فوراً
        passwordInput.value = passwordInput.value.replace(/[^\x00-\x7F]/g, "");

        const val = passwordInput.value;
        const reqs = {
            len: val.length >= 6,
            char: /[a-zA-Z]/.test(val),
            spec: /[\W_]/.test(val)
        };

        // تحديث حالة الشروط بصرياً
        if(document.getElementById('reqLen')) document.getElementById('reqLen').classList.toggle('valid', reqs.len);
        if(document.getElementById('reqChar')) document.getElementById('reqChar').classList.toggle('valid', reqs.char);
        if(document.getElementById('reqSpec')) document.getElementById('reqSpec').classList.toggle('valid', reqs.spec);

        let score = Object.values(reqs).filter(Boolean).length;
        if (strengthFill) {
            strengthFill.style.width = (score / 3 * 100) + "%";
            strengthFill.style.backgroundColor = score === 3 ? "var(--success)" : score === 2 ? "var(--warning)" : "var(--danger)";
        }
    });

    // --- 4. نظام المؤقت الزمني ---
    function startTimer(duration) {
        let timer = duration;
        resendBtn.disabled = true;
        resendBtn.style.opacity = "0.5";
        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            let m = Math.floor(timer / 60), s = timer % 60;
            timerCount.textContent = `${m}:${s < 10 ? '0'+s : s}`;
            if (--timer < 0) {
                clearInterval(countdownInterval);
                timerCount.textContent = "جاهز";
                resendBtn.disabled = false;
                resendBtn.style.opacity = "1";
                resendBtn.style.background = "var(--primary)";
            }
        }, 1000);
    }

    // --- 5. إرسال النموذج (Make.com Webhook) ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (emailInput.value.trim() !== confirmEmailInput.value.trim()) {
            showToast("البريد الإلكتروني غير متطابق!", false);
            return;
        }

        const submitBtn = registerForm.querySelector('.btn-main');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري المعالجة...';

        generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        
        tempUserData = {
            name: document.getElementById('fullName').value.trim(),
            email: emailInput.value.trim(),
            pin: generatedPin
        };

        try {
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tempUserData)
            });

            if (response.ok) {
                showToast("تم إرسال كود التحقق لبريدك", true);
                regStep1.style.display = 'none';
                regStep2.style.display = 'block';
                startTimer(300);
            } else { throw new Error(); }
        } catch (error) {
            showToast("فشل الاتصال بالخادم", false);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء حساب المستثمر';
        }
    });

    // --- 6. التفعيل النهائي ---
    activateBtn.addEventListener('click', () => {
        if (otpInput.value.trim() === generatedPin) {
            showToast("أهلاً بك! تم تفعيل الحساب بنجاح", true);
            
            // مسح الكاش بعد النجاح
            fieldsToCache.forEach(id => localStorage.removeItem('inv_cache_' + id));
            
            setTimeout(() => { window.location.href = "login.html"; }, 2500);
        } else {
            showToast("كود التحقق خاطئ", false);
        }
    });
});

// وظيفة تبديل رؤية كلمة المرور
function toggleView(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.textContent = isPass ? 'visibility_off' : 'visibility';
}
