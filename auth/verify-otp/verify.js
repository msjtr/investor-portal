/**
 * TERA OTP Controller - Specialized for Verify-OTP Page
 * المجلد: investor-portal/auth/verify-otp/verify.js
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. تعريف العناصر الأساسية ---
    const otpInputs = document.querySelectorAll(".otp-input");
    const verifyBtn = document.getElementById("verifyBtn");
    const timerDisplay = document.getElementById("timer");
    const resendBtn = document.getElementById("resendBtn");
    const otpContainer = document.getElementById("otp-inputs");
    
    let timeLeft = 180; // 3 دقائق حسب الوثيقة المعتمدة
    let timerInterval;

    // --- 2. محرك إدارة العداد التنازلي ---
    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 180;
        resendBtn.classList.add("disabled");
        resendBtn.disabled = true;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerDisplay.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
                resendBtn.classList.remove("disabled");
                resendBtn.disabled = false;
            }
        }, 1000);
    }

    // --- 3. محرك التحكم بصناديق الإدخال (OTP Logic) ---
    otpInputs.forEach((input, index) => {
        // التركيز التلقائي على أول خانة
        if (index === 0) input.focus();

        input.addEventListener("input", (e) => {
            // السماح بالأرقام فقط (لزيادة الأمان ومنع الأخطاء)
            e.target.value = e.target.value.replace(/[^0-9]/g, "");

            if (e.target.value) {
                input.classList.add("filled");
                // الانتقال التلقائي للخانة التالية
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].removeAttribute("disabled");
                    otpInputs[index + 1].focus();
                }
            } else {
                input.classList.remove("filled");
            }
            checkCompletion();
        });

        // التعامل مع الحذف المتراجع (Backspace)
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace") {
                if (!input.value && index > 0) {
                    otpInputs[index - 1].focus();
                    otpInputs[index - 1].value = "";
                    otpInputs[index - 1].classList.remove("filled");
                    checkCompletion();
                }
            }
        });

        // دعم اللصق (Paste) لكود مكون من 6 أرقام
        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const data = (e.clipboardData || window.clipboardData).getData("text");
            const digits = data.replace(/\D/g, "").slice(0, 6);
            
            if (digits.length > 0) {
                [...digits].forEach((char, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].removeAttribute("disabled");
                        otpInputs[i].value = char;
                        otpInputs[i].classList.add("filled");
                    }
                });
                if (digits.length === 6) {
                    verifyBtn.focus();
                } else {
                    otpInputs[digits.length].focus();
                }
                checkCompletion();
            }
        });
    });

    // تفعيل زر التأكيد عند اكتمال الـ 6 أرقام
    function checkCompletion() {
        const code = Array.from(otpInputs).map(i => i.value).join("");
        verifyBtn.disabled = code.length !== 6;
    }

    // --- 4. معالجة إرسال الكود والتحقق ---
    verifyBtn.addEventListener("click", async () => {
        const finalCode = Array.from(otpInputs).map(i => i.value).join("");
        
        // تغيير حالة الزر أثناء المعالجة (UX)
        verifyBtn.disabled = true;
        verifyBtn.textContent = "جاري التحقق...";

        try {
            // هنا يتم الربط مع الـ Backend أو الـ Webhook الخاص بك
            console.log("إرسال طلب التحقق للكود:", finalCode);
            
            // محاكاة استجابة الخادم
            setTimeout(() => {
                if (finalCode === "123456") { // كود تجريبي
                    handleSuccess();
                } else {
                    handleError();
                }
            }, 1500);

        } catch (err) {
            handleError();
        }
    });

    // حالة النجاح
    function handleSuccess() {
        verifyBtn.textContent = "تم التأكيد بنجاح";
        verifyBtn.style.backgroundColor = "#22c55e"; // Success Green
        // التوجيه للخطوة التالية (مثلاً لوحة التحكم)
        setTimeout(() => {
            window.location.href = "../../dashboard/index.html";
        }, 1000);
    }

    // حالة الخطأ (تأثير الاهتزاز المبرمج في CSS)
    function handleError() {
        otpContainer.classList.add("otp-error");
        verifyBtn.textContent = "رمز غير صحيح - حاول مجدداً";
        verifyBtn.style.backgroundColor = "var(--danger)";
        
        setTimeout(() => {
            otpContainer.classList.remove("otp-error");
            verifyBtn.textContent = "تأكيد الرمز والدخول";
            verifyBtn.style.backgroundColor = "var(--primary-dark)";
            verifyBtn.disabled = false;
            
            // إعادة ضبط الخانات
            otpInputs.forEach((input, i) => {
                input.value = "";
                input.classList.remove("filled");
                if (i > 0) input.disabled = true;
            });
            otpInputs[0].focus();
        }, 2000);
    }

    // إعادة الإرسال
    resendBtn.addEventListener("click", () => {
        if (!resendBtn.disabled) {
            console.log("طلب إعادة إرسال الكود لـ Webhook...");
            startTimer();
            // هنا يتم استدعاء Webhook الإرسال
        }
    });

    // تشغيل العداد عند فتح الصفحة
    startTimer();
});
