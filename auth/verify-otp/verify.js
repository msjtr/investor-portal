/**
 * محرك صفحة التحقق من الرمز (Enterprise OTP Engine) - منصة تيرا
 * يتميز بدعم العمليات المنفصلة والربط مع Webhook
 */

document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll(".otp-input");
    const verifyBtn = document.getElementById("verifyBtn");
    const timerDisplay = document.getElementById("timer");
    const resendBtn = document.getElementById("resendBtn");
    const otpContainer = document.getElementById("otp-inputs");
    
    let timeLeft = 180; // 3 دقائق
    let timerInterval;

    // --- 1. إدارة صناديق إدخال الـ OTP ---
    inputs.forEach((input, index) => {
        // التركيز على أول خانة تلقائياً
        if (index === 0) input.focus();

        input.addEventListener("input", (e) => {
            const value = e.target.value;
            
            // تنظيف المدخلات (أرقام فقط)
            e.target.value = value.replace(/[^0-9]/g, "");

            if (e.target.value) {
                input.classList.add("filled");
                // الانتقال للمربع التالي
                if (index < inputs.length - 1) {
                    inputs[index + 1].removeAttribute("disabled");
                    inputs[index + 1].focus();
                }
            } else {
                input.classList.remove("filled");
            }
            checkInputs(); // التحقق من اكتمال الكود لتفعيل الزر
        });

        // التعامل مع زر الحذف (Backspace)
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace") {
                if (!input.value && index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = "";
                    inputs[index - 1].classList.remove("filled");
                    checkInputs();
                }
            }
        });

        // دعم اللصق المباشر (Paste)
        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData)
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            if (pastedData.length > 0) {
                [...pastedData].forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].removeAttribute("disabled");
                        inputs[i].value = char;
                        inputs[i].classList.add("filled");
                    }
                });
                const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
                inputs[nextIndex].focus();
                checkInputs();
            }
        });
    });

    // تفعيل زر التأكيد عند اكتمال الـ 6 أرقام
    function checkInputs() {
        let code = "";
        inputs.forEach(input => code += input.value);
        if (code.length === 6) {
            verifyBtn.removeAttribute("disabled");
        } else {
            verifyBtn.setAttribute("disabled", true);
        }
    }

    // --- 2. العداد التنازلي ---
    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 180;
        resendBtn.classList.add("disabled");
        resendBtn.setAttribute("disabled", true);
        timerDisplay.style.color = "var(--danger)";
        
        timerInterval = setInterval(() => {
            timeLeft--;
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            
            timerDisplay.textContent = `0${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
                timerDisplay.style.color = "var(--text-muted)";
                resendBtn.classList.remove("disabled");
                resendBtn.removeAttribute("disabled");
            }
        }, 1000);
    }

    startTimer();

    // --- 3. معالجة التحقق وإرسال البيانات ---
    verifyBtn.addEventListener("click", async () => {
        let otpCode = "";
        inputs.forEach(input => otpCode += input.value);
        
        if (otpCode.length === 6) {
            verifyBtn.textContent = "جاري التحقق...";
            verifyBtn.disabled = true;

            // هنا نربط مع الـ Webhook (مثال على إرسال البيانات لـ Make)
            try {
                // محاكاة الاتصال حالياً - استبدل برابط الـ Webhook الحقيقي عند الجاهزية
                console.log("إرسال الكود للتحقق:", otpCode);
                
                setTimeout(() => {
                    // نجاح (مثال)
                    if(otpCode === "123456") { 
                        verifyBtn.textContent = "تم التأكيد بنجاح";
                        verifyBtn.style.background = "#22c55e"; // Success Green
                        setTimeout(() => {
                            window.location.href = "../../dashboard/index.html"; // توجه للوحة التحكم
                        }, 1000);
                    } else {
                        throw new Error("Invalid Code");
                    }
                }, 1500);

            } catch (error) {
                showError();
            }
        }
    });

    function showError() {
        verifyBtn.textContent = "رمز غير صحيح - حاول مجدداً";
        verifyBtn.style.background = "var(--danger)";
        otpContainer.classList.add("otp-error");
        
        setTimeout(() => {
            otpContainer.classList.remove("otp-error");
            verifyBtn.textContent = "تأكيد الرمز والدخول";
            verifyBtn.style.background = "var(--primary-dark)";
            verifyBtn.disabled = false;
            // مسح الخانات وإعادة التركيز
            inputs.forEach((input, i) => {
                input.value = "";
                input.classList.remove("filled");
                if(i > 0) input.disabled = true;
            });
            inputs[0].focus();
        }, 2000);
    }

    // إعادة الإرسال
    resendBtn.addEventListener("click", () => {
        if (!resendBtn.disabled) {
            // هنا تضع كود إعادة طلب الـ Webhook الخاص بالإرسال
            startTimer();
            alert("تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.");
        }
    });
});
