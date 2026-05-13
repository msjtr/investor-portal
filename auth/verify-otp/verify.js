/**
 * محرك صفحة التحقق من الرمز (OTP Verification Engine)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. جلب بيانات المستخدم المؤقتة لعرض بريده الإلكتروني
    const tempUser = Storage.get('temp_user');
    const emailDisplay = document.getElementById('userEmailDisplay');
    
    if (tempUser && tempUser.email) {
        emailDisplay.innerText = tempUser.email;
    } else {
        // إذا لم توجد بيانات، نرجعه لصفحة تسجيل الدخول لحماية المسار
        window.location.href = ROUTES.LOGIN;
        return;
    }

    // 2. تفعيل العداد التنازلي لإعادة الإرسال (60 ثانية)
    const timerDisplay = document.getElementById('timerCount');
    const timerTextContainer = document.getElementById('timerText');
    const resendBtn = document.getElementById('resendBtn');

    function startResendTimer() {
        resendBtn.classList.add('hidden');
        timerTextContainer.classList.remove('hidden');
        
        Countdown.start(60, timerDisplay, () => {
            // عند انتهاء الوقت
            timerTextContainer.classList.add('hidden');
            resendBtn.classList.remove('hidden');
        });
    }

    startResendTimer();

    // 3. التنقل الذكي التلقائي بين خانات إدخال الرمز
    const inputs = document.querySelectorAll('.otp-input');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // 4. معالجة إرسال الرمز وتأكيده
    document.getElementById('otpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const verifyBtn = document.getElementById('verifyBtn');

        // تجميع الأرقام من الخانات الستة
        let otpCode = '';
        inputs.forEach(input => otpCode += input.value);

        if (otpCode.length < 6) {
            if (typeof Notify !== 'undefined') {
                Notify.show('الرجاء إدخال رمز التحقق بالكامل', 'error');
            } else {
                alert('الرجاء إدخال رمز التحقق بالكامل');
            }
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `<span>جاري التحقق...</span>`;

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'verify_otp',
                payload: {
                    email: tempUser.email,
                    otp: otpCode
                }
            });

            if (response && response.success) {
                // مسح بيانات المستخدم المؤقتة بعد التوثيق الناجح
                Storage.remove('temp_user');
                
                // إشعار المستخدم بالنجاح
                if (typeof Notify !== 'undefined') {
                    Notify.show('تم التحقق بنجاح! جاري توجيهك...', 'success');
                } else {
                    alert('تم التحقق بنجاح! مرحباً بك.');
                }

                // التوجيه التلقائي للوحة التحكم بعد ثانية ونصف
                setTimeout(() => {
                    window.location.href = ROUTES.DASHBOARD || '../../dashboard/index.html';
                }, 1500);

            } else {
                const errorMessage = response?.message || 'رمز التحقق غير صحيح، حاول مجدداً.';
                if (typeof Notify !== 'undefined') {
                    Notify.show(errorMessage, 'error');
                } else {
                    alert(errorMessage);
                }
                // تفريغ الخانات وإعادة التركيز على الخانة الأولى
                inputs.forEach(input => input.value = '');
                inputs[0].focus();
            }
        } catch (error) {
            console.error('Verify Engine Error:', error);
            if (typeof Notify !== 'undefined') {
                Notify.show('تعذر الاتصال بالخادم.', 'error');
            } else {
                alert('تعذر الاتصال بالخادم.');
            }
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `<span>تأكيد الرمز</span>`;
        }
    });

    // 5. زر إعادة إرسال الكود
    resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        try {
            // إرسال طلب إعادة الإرسال لـ Make.com
            await API.post(API_CONFIG.BASE_URL, {
                action: 'resend_otp',
                payload: { email: tempUser.email }
            });
            
            startResendTimer();
            
            if (typeof Notify !== 'undefined') {
                Notify.show('تم إرسال رمز جديد إلى بريدك الإلكتروني.', 'success');
            } else {
                alert('تم إرسال رمز جديد إلى بريدك الإلكتروني.');
            }
        } catch (err) {
            if (typeof Notify !== 'undefined') {
                Notify.show('حدث خطأ أثناء محاولة إعادة الإرسال.', 'error');
            } else {
                alert('حدث خطأ أثناء محاولة إعادة الإرسال.');
            }
        } finally {
            resendBtn.disabled = false;
        }
    });
});
