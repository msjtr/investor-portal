/**
 * محرك صفحة التحقق من الرمز (Enterprise OTP Engine) - منصة تيرا
 * الموقع: investor-portal/auth/verify-otp/verify.js
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. تعريف العناصر من الهوية البصرية ---
    const otpContainer = document.getElementById("otp-inputs");
    const inputs = document.querySelectorAll(".otp-input");
    const verifyBtn = document.getElementById("verifyBtn");
    const timerDisplay = document.getElementById("timer");
    const resendBtn = document.getElementById("resendBtn");
    
    let timeLeft = 180; // 3 دقائق حسب الوثيقة
    let timerInterval;

    // --- 2. إدارة العداد التنازلي (Timer Engine) ---
    const startTimer = () => {
        clearInterval(timerInterval);
        timeLeft = 180;
        resendBtn.classList.add("disabled");
        resendBtn.disabled = true;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            
            timerDisplay.textContent = `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
                resendBtn.classList.remove("disabled");
                resendBtn.disabled = false;
                // استخدام نظام التنبيهات المركزي إذا كان متاحاً
                if (window.Notifications) Notifications.error("انتهت صلاحية الرمز، يرجى إعادة الإرسال.");
            }
        }, 1000);
    };

    // --- 3. منطق إدخال الرمز والتحكم في الحقول ---
    inputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            // تنظيف المدخلات (أرقام فقط)
            e.target.value = e.target.value.replace(/[^0-9]/g, "");

            if (e.target.value) {
                input.classList.add("filled");
                // الانتقال التلقائي للخانة التالية
                if (index < inputs.length - 1) {
                    inputs[index + 1].removeAttribute("disabled");
                    inputs[index + 1].focus();
                }
            } else {
                input.classList.remove("filled");
            }
            updateVerifyButtonState();
        });

        // دعم الحذف المتراجع (Backspace)
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].value = "";
                inputs[index - 1].classList.remove("filled");
                updateVerifyButtonState();
            }
        });

        // دعم اللصق الذكي (Smart Paste)
        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
            if (pastedData.length > 0) {
                [...pastedData].forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].removeAttribute("disabled");
                        inputs[i].value = char;
                        inputs[i].classList.add("filled");
                    }
                });
                if (pastedData.length === 6) verifyBtn.focus();
                updateVerifyButtonState();
            }
        });
    });

    const updateVerifyButtonState = () => {
        const code = Array.from(inputs).map(i => i.value).join("");
        verifyBtn.disabled = code.length !== 6;
    };

    // --- 4. معالجة التحقق النهائي والربط مع API ---
    verifyBtn.addEventListener("click", async () => {
        const otpCode = Array.from(inputs).map(i => i.value).join("");
        
        // تفعيل حالة التحميل في الزر
        verifyBtn.disabled = true;
        const originalText = verifyBtn.innerHTML;
        verifyBtn.innerHTML = `<span>جاري التحقق الأمني...</span>`;

        try {
            // هنا يتم استدعاء ملف api.js المركزي الخاص بك
            // المثال: const response = await API.auth.verifyOTP(otpCode);
            
            console.log("التحقق من الرمز في منصة TERA:", otpCode);

            // محاكاة استجابة الخادم للنجاح
            setTimeout(() => {
                if (otpCode === "123456") { // كود تجريبي
                    if (window.Notifications) Notifications.success("تم التحقق بنجاح، مرحباً بك.");
                    // استخدام Helpers للتوجيه إذا كان متاحاً
                    window.location.href = "../../dashboard/index.html"; 
                } else {
                    handleError();
                }
            }, 1500);

        } catch (error) {
            handleError();
        }
    });

    const handleError = () => {
        otpContainer.classList.add("otp-error"); // تفعيل اهتزاز الخطأ من CSS
        verifyBtn.innerHTML = `<span>الرمز غير صحيح</span>`;
        verifyBtn.style.backgroundColor = "var(--danger)";

        setTimeout(() => {
            otpContainer.classList.remove("otp-error");
            verifyBtn.innerHTML = `<span>تأكيد الرمز والدخول</span>`;
            verifyBtn.style.backgroundColor = ""; // يعود للون المركزي
            verifyBtn.disabled = false;
            
            // إعادة ضبط الحقول
            inputs.forEach((input, i) => {
                input.value = "";
                input.classList.remove("filled");
                if (i > 0) input.disabled = true;
            });
            inputs[0].focus();
        }, 2000);
    };

    // --- 5. إعادة الإرسال ---
    resendBtn.addEventListener("click", () => {
        if (!resendBtn.disabled) {
            startTimer();
            if (window.Notifications) Notifications.info("تم إرسال رمز جديد إلى وسيلة الاتصال المسجلة.");
            // استدعاء دالة الإرسال من API.js هنا
        }
    });

    // بدء تشغيل العداد فور التحميل
    startTimer();
});
