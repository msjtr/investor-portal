document.addEventListener('DOMContentLoaded', () => {
    // 1. تعريف العناصر من واجهة المستخدم
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyForm = document.getElementById('verifyForm');
    const countdownElement = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendBtn');
    const backBtn = document.getElementById('backBtn'); // تعريف زر الرجوع

    let timerInterval;
    const TIME_LIMIT = 180; // 3 دقائق بالثواني

    // تفعيل وظيفة زر الرجوع
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back(); // يعيد المستخدم للصفحة السابقة تلقائياً
        });
    }

    // 2. هندسة التنقل الذكي بين خانات الـ OTP
    otpInputs.forEach((input, index) => {
        // عند كتابة رقم
        input.addEventListener('input', (e) => {
            // السماح بالأرقام فقط
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // الانتقال للخانة التالية إذا تم إدخال رقم ولم نكن في الخانة الأخيرة
            if (e.target.value !== '' && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        // عند الضغط على أزرار الكيبورد (خاصة زر المسح Backspace)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                // الرجوع للخانة السابقة إذا كانت الحالية فارغة
                otpInputs[index - 1].focus();
            }
        });

        // 3. ميزة (اللصق - Paste) الذكية
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6); // أخذ أول 6 أرقام فقط
            
            if (pastedData.length > 0) {
                const digits = pastedData.split('');
                otpInputs.forEach((inp, i) => {
                    if (digits[i]) {
                        inp.value = digits[i];
                    }
                });
                
                // نقل المؤشر للخانة المناسبة بعد اللصق
                const focusIndex = Math.min(digits.length, 5);
                otpInputs[focusIndex].focus();
            }
        });
    });

    // 4. نظام العداد التنازلي (3 دقائق)
    function startTimer() {
        let timeRemaining = TIME_LIMIT;
        
        // تعطيل زر إعادة الإرسال برمجياً وشكلياً
        resendBtn.disabled = true;
        resendBtn.classList.replace('text-primary', 'text-dim');
        resendBtn.style.cursor = 'not-allowed';

        timerInterval = setInterval(() => {
            timeRemaining--;
            
            // حساب الدقائق والثواني
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            
            // تحديث العرض بصيغة MM:SS
            countdownElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // عند انتهاء الوقت
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                countdownElement.textContent = "00:00";
                countdownElement.classList.replace('text-primary', 'text-error'); // تغيير اللون للأحمر
                
                // تفعيل زر إعادة الإرسال
                resendBtn.disabled = false;
                resendBtn.classList.replace('text-dim', 'text-primary');
                resendBtn.style.cursor = 'pointer';
            }
        }, 1000);
    }

    // 5. معالجة زر "إعادة إرسال" (تم التحديث ليرسل للمنصة فعلياً)
    resendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!resendBtn.disabled) {
            
            // تغيير النص لتفاعل بصري
            const originalText = resendBtn.textContent;
            resendBtn.textContent = 'جاري الإرسال...';
            
            try {
                // جلب بيانات العميل (لو ما لقى اسم بيحط عميلنا العزيز)
                const storedEmail = localStorage.getItem('userEmail') || '';
                const storedName = localStorage.getItem('userFullName') || 'عميلنا العزيز';
                
                // ⚠️ مهم جداً: ضع رابط الـ Webhook حقك مكان هذا الرابط ⚠️
                const webhookUrl = 'رابط_الـ_Webhook_الخاص_بك_هنا';
                
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_otp', // تأكد أن هذا يطابق الفلتر في Make
                        payload: {
                            email: storedEmail,
                            fullName: storedName
                        },
                        metadata: {
                            os: navigator.platform,
                            browser: navigator.userAgent
                        }
                    })
                });
                
                console.log("تم طلب كود جديد بنجاح!");
                
                // إعادة ضبط العداد وتفريغ الخانات
                countdownElement.classList.replace('text-error', 'text-primary');
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
                startTimer();

            } catch (error) {
                console.error("حدث خطأ أثناء طلب كود جديد:", error);
                alert("تعذر إرسال الكود، يرجى المحاولة لاحقاً.");
            } finally {
                resendBtn.textContent = originalText;
            }
        }
    });

    // 6. إرسال النموذج (التأكيد)
    verifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // تجميع الكود من الخانات الستة
        let otpCode = '';
        otpInputs.forEach(input => {
            otpCode += input.value;
        });

        // التحقق من اكتمال الكود
        if (otpCode.length === 6) {
            console.log("الكود المدخل:", otpCode);
            
            // لتجربة الواجهة فقط، تغيير نص الزر
            const btnSpan = document.querySelector('#verifyBtn span');
            const originalText = btnSpan.textContent;
            btnSpan.textContent = 'جاري التحقق...';
            document.getElementById('verifyBtn').disabled = true;
            
            setTimeout(() => {
                btnSpan.textContent = originalText;
                document.getElementById('verifyBtn').disabled = false;
            }, 2000);

        } else {
            console.warn("الرجاء إدخال الكود المكون من 6 أرقام بشكل كامل.");
            // التركيز على أول خانة فارغة
            const firstEmptyInput = Array.from(otpInputs).find(input => input.value === '');
            if (firstEmptyInput) firstEmptyInput.focus();
        }
    });

    // 7. تشغيل العداد فور تحميل الصفحة
    startTimer();
});
