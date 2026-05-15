/**
 * محرك صفحة التحقق من الرمز (Enterprise OTP Engine) - معدل ليعمل بشكل مستقل
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("تم تشغيل محرك TERA للتحقق...");

    // 1. تعريف العناصر الأساسية من واجهة المستخدم (HTML)
    const verifyBtn = document.getElementById('verifyBtn');
    const resendBtn = document.getElementById('resendBtn');
    const emailDisplay = document.getElementById('userEmailDisplay');
    const inputs = document.querySelectorAll('.otp-input');
    const otpContainer = document.querySelector('.otp-inputs-container');
    const timerDisplay = document.getElementById('timerCount') || document.getElementById('timer');
    const timerWrapper = document.getElementById('timerWrapper');
    
    // متغيرات الحماية لمنع التخمين
    let maxAttempts = 3;
    const attemptsContainer = document.getElementById('attemptsContainer');
    const attemptsCount = document.getElementById('attemptsCount');

    // جلب بيانات المستخدم (مع دعم مباشر لـ localStorage القياسية)
    let tempUser = null;
    try {
        const storedData = localStorage.getItem('temp_user') || sessionStorage.getItem('temp_user');
        if (storedData) tempUser = JSON.parse(storedData);
    } catch (e) { console.warn("لا توجد بيانات جلسة."); }

    // وضع افتراضي للتجارب (لكي لا يطردك من الصفحة أثناء البرمجة)
    if (!tempUser) {
        tempUser = { email: "client@tera-services.com.sa", action: "login" };
    }

    if (emailDisplay) emailDisplay.innerText = tempUser.email;

    // 2. إدارة العداد التنازلي لإعادة الإرسال (3 دقائق = 180 ثانية)
    let countdownInterval;
    function startResendTimer() {
        if (resendBtn) {
            resendBtn.classList.add('disabled', 'hidden');
            resendBtn.style.pointerEvents = 'none';
        }
        if (timerWrapper) timerWrapper.classList.remove('hidden');
        
        let timeLeft = 180; 
        clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            timeLeft--;
            let m = Math.floor(timeLeft / 60);
            let s = timeLeft % 60;
            if (timerDisplay) timerDisplay.textContent = `0${m}:${s < 10 ? '0'+s : s}`;

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                if (timerWrapper) timerWrapper.classList.add('hidden');
                if (resendBtn) {
                    resendBtn.classList.remove('disabled', 'hidden');
                    resendBtn.style.pointerEvents = 'auto';
                }
            }
        }, 1000);
    }

    startResendTimer();

    // 3. التنقل الذكي وميزة اللصق (UX & Smart Paste)
    if (inputs.length > 0) {
        inputs.forEach((input, index) => {
            // الانتقال التلقائي للأمام
            input.addEventListener('input', (e) => {
                if (input.value.length > 1) input.value = input.value.slice(0, 1); // منع إدخال أكثر من رقم
                if (input.value !== '' && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });

            // الرجوع للخلف عند مسح الرقم
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && input.value === '' && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            // منع كتابة الحروف
            input.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key)) e.preventDefault();
            });

            // ميزة اللصق الذكية
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const clipboardData = e.clipboardData || window.clipboardData;
                const pastedData = clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); // استخراج الأرقام فقط
                
                if (pastedData.length === 6) {
                    inputs.forEach((inp, idx) => inp.value = pastedData[idx]);
                    if (verifyBtn) verifyBtn.focus(); // التوجيه لزر التأكيد
                } else {
                    alert("يرجى التأكد من نسخ رمز التحقق المكون من 6 أرقام فقط.");
                }
            });
        });
    }

    // 4. معالجة التحقق من الرمز (تم ربطها بزر التأكيد مباشرة بدلاً من Form)
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // تجميع الرمز
            let otpCode = "";
            inputs.forEach(input => otpCode += input.value);

            if (otpCode.length < 6) {
                alert("يرجى إكمال إدخال رمز التحقق (6 أرقام).");
                return;
            }

            // تجميد الواجهة أثناء التحقق
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = `جاري المصادقة...`;
            inputs.forEach(input => input.disabled = true);

            // محاكاة الاتصال بالخادم (Make Webhook)
            setTimeout(() => {
                // هنا تفحص إذا كان الكود صحيح (مثلاً 123456 للتجربة)
                if (otpCode === "123456") { 
                    alert("تم التحقق بنجاح! جاري توجيهك...");
                    // التوجيه
                    const actionType = tempUser.action || 'login';
                    if (actionType === 'reset') {
                        window.location.replace('../reset-password/reset.html');
                    } else {
                        window.location.replace('../../dashboard/index.html');
                    }
                } else {
                    // الكود خاطئ - معالجة محاولات التخمين
                    maxAttempts--;
                    if (maxAttempts > 0) {
                        alert(`رمز التحقق غير صحيح. متبقي لك ${maxAttempts} محاولات.`);
                        
                        // تأثير الاهتزاز
                        if (otpContainer) otpContainer.classList.add('otp-error');
                        setTimeout(() => {
                            if (otpContainer) otpContainer.classList.remove('otp-error');
                        }, 400);

                        // تفريغ الخانات
                        inputs.forEach(input => {
                            input.disabled = false;
                            input.value = "";
                        });
                        inputs[0].focus();
                        resetButtonState(verifyBtn);
                    } else {
                        alert("تجاوزت الحد الأقصى للمحاولات. تم قفل الحساب احترازياً.");
                        inputs.forEach(input => input.disabled = true);
                        verifyBtn.innerHTML = "تم حظر المحاولات";
                    }
                }
            }, 1500); // تأخير وهمي لمحاكاة الاتصال بالنت
        });
    }

    // 5. محرك إعادة الإرسال
    if (resendBtn) {
        resendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (resendBtn.classList.contains('disabled')) return;

            resendBtn.disabled = true;
            alert("تم إرسال كود جديد إلى بريدك الإلكتروني.");
            
            // إعادة ضبط الخانات والعداد
            maxAttempts = 3;
            inputs.forEach(input => {
                input.value = "";
                input.disabled = false;
            });
            inputs[0].focus();
            resetButtonState(verifyBtn);
            startResendTimer();
        });
    }

    // دالة مساعدة لزر التأكيد
    function resetButtonState(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = `تأكيد الرمز والدخول`;
    }
});
