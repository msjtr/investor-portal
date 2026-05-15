/**
 * محرك صفحة التحقق من الرمز (Enterprise OTP Engine) - منصة تيرا
 */

document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll(".otp-input");
    const verifyBtn = document.getElementById("verifyBtn");
    const timerDisplay = document.getElementById("timer");
    const resendBtn = document.getElementById("resendBtn");
    const otpContainer = document.getElementById("otp-inputs");
    
    let timeLeft = 180; // 3 دقائق = 180 ثانية
    let timerInterval;

    // --- 1. إدارة صناديق إدخال الـ OTP ---
    inputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            // السماح برقم واحد فقط
            if (input.value.length > 1) {
                input.value = input.value.slice(0, 1);
            }
            
            if (input.value) {
                input.classList.add("filled");
                // الانتقال للمربع التالي
                if (index < inputs.length - 1) {
                    inputs[index + 1].removeAttribute("disabled");
                    inputs[index + 1].focus();
                }
            } else {
                input.classList.remove("filled");
            }
        });

        // التعامل مع زر الحذف (Backspace)
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].value = "";
                inputs[index - 1].classList.remove("filled");
                inputs[index].setAttribute("disabled", true);
            }
        });

        // منع الحروف
        input.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });

        // دعم اللصق المباشر لكود من 6 أرقام
        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
            if (pastedData.length === 6) {
                [...pastedData].forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].removeAttribute("disabled");
                        inputs[i].value = char;
                        inputs[i].classList.add("filled");
                    }
                });
                verifyBtn.focus(); // نقل التركيز لزر التأكيد
            }
        });
    });

    // --- 2. العداد التنازلي ---
    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 180;
        resendBtn.classList.add("disabled");
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
                resendBtn.classList.remove("disabled"); // تفعيل زر إعادة الإرسال
            }
        }, 1000);
    }

    startTimer();

    // --- 3. الأزرار والأحداث ---
    resendBtn.addEventListener("click", () => {
        if (!resendBtn.classList.contains("disabled")) {
            console.log("تم طلب إعادة إرسال الكود...");
            
            // مسح الخانات وإعادة تشغيل العداد
            inputs.forEach((input, index) => {
                input.value = "";
                input.classList.remove("filled");
                if (index > 0) input.setAttribute("disabled", true);
            });
            inputs[0].focus();
            startTimer();
            alert("تم إرسال كود جديد للتحقق.");
        }
    });

    verifyBtn.addEventListener("click", () => {
        let otpCode = "";
        inputs.forEach(input => otpCode += input.value);
        
        if (otpCode.length === 6) {
            console.log("جاري التحقق من الكود:", otpCode);
            verifyBtn.textContent = "جاري التحقق...";
            verifyBtn.disabled = true;
            inputs.forEach(input => input.disabled = true);
            
            // محاكاة الاتصال بالخادم
            setTimeout(() => {
                if(otpCode === "123456") { // كود تجريبي للنجاح
                    verifyBtn.textContent = "تم التأكيد بنجاح";
                    verifyBtn.style.backgroundColor = "var(--success-color)";
                    alert("تم تأكيد الكود بنجاح!");
                } else { // كود تجريبي للفشل
                    verifyBtn.textContent = "تأكيد الرمز والدخول";
                    verifyBtn.disabled = false;
                    inputs.forEach((input, idx) => { 
                        input.disabled = false; 
                        input.value = ""; 
                        input.classList.remove("filled"); 
                        if(idx > 0) input.setAttribute("disabled", true);
                    });
                    inputs[0].focus();
                    
                    // تأثير الاهتزاز عند الخطأ
                    otpContainer.classList.add("otp-error");
                    setTimeout(() => otpContainer.classList.remove("otp-error"), 400);
                    alert("رمز التحقق غير صحيح، يرجى المحاولة مجدداً.");
                }
            }, 1500);
        } else {
            alert("يرجى إكمال إدخال رمز التحقق المكون من 6 أرقام.");
        }
    });
});
