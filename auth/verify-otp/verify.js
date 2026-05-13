/**
 * محرك صفحة التحقق من الرمز (OTP Verification Engine) - منصة تيرا
 * النسخة المحدثة: تنقل ذكي، إدارة عداد إعادة الإرسال، وتوثيق آمن مع Make.com
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. تأمين المسار وجلب بيانات المستخدم المؤقتة
    const tempUser = Storage.get('temp_user');
    const emailDisplay = document.getElementById('userEmailDisplay');
    const inputs = document.querySelectorAll('.otp-input');
    
    if (!tempUser || !tempUser.email) {
        console.warn("[Verify Engine] لا توجد جلسة مؤقتة، العودة لتسجيل الدخول.");
        window.location.replace(ROUTES.LOGIN);
        return;
    }

    // عرض البريد الإلكتروني للمستخدم للتأكيد
    emailDisplay.innerText = tempUser.email;

    // 2. إدارة العداد التنازلي لإعادة الإرسال
    const timerDisplay = document.getElementById('timerCount');
    const timerWrapper = document.getElementById('timerWrapper');
    const resendBtn = document.getElementById('resendBtn');

    function startResendTimer() {
        resendBtn.classList.add('hidden');
        timerWrapper.classList.remove('hidden');
        
        // استخدام محرك العداد الذي طورناه سابقاً (60 ثانية)
        Countdown.start(60, timerDisplay, () => {
            timerWrapper.classList.add('hidden');
            resendBtn.classList.remove('hidden');
            Notify.info("يمكنك الآن طلب رمز جديد إذا لم يصلك القديم.");
        });
    }

    startResendTimer();

    // 3. التنقل الذكي التلقائي بين خانات إدخال الرمز (User Experience)
    inputs.forEach((input, index) => {
        // عند الكتابة: انتقل للمربع التالي
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        // عند المسح (Backspace): ارجع للمربع السابق
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        // منع إدخال غير الأرقام
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });

    // 4. معالجة إرسال الرمز وتأكيده مع الخادم
    document.getElementById('otpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const verifyBtn = document.getElementById('verifyBtn');

        // تجميع الرمز من الخانات
        let otpCode = "";
        inputs.forEach(input => otpCode += input.value);

        if (otpCode.length < 6) {
            Notify.error("يرجى إكمال رمز التحقق المكون من 6 أرقام");
            return;
        }

        // تفعيل حالة التحميل في الزر
        verifyBtn.disabled = true;
        verifyBtn.classList.add('animate-pulse');
        verifyBtn.innerHTML = `<span>جاري تأكيد الرمز...</span>`;

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'verify_otp',
                payload: {
                    email: tempUser.email,
                    otp: otpCode,
                    type: tempUser.type || 'login'
                }
            });

            if (response && response.success) {
                // حفظ الجلسة النهائية بنجاح
                Storage.set('user_session', response.user_data);
                Storage.remove('temp_user'); // تنظيف البيانات المؤقتة
                
                Notify.success("تم التحقق بنجاح! مرحباً بك في منصة تيرا.");

                // التوجيه للوحة التحكم بعد نجاح العملية
                setTimeout(() => {
                    window.location.replace(ROUTES.DASHBOARD || '../../dashboard/index.html');
                }, 1500);

            } else {
                Notify.error(response?.message || "رمز التحقق غير صحيح، يرجى المحاولة مجدداً.");
                // تفريغ الخانات وإعادة التركيز للبدء من جديد
                inputs.forEach(input => input.value = "");
                inputs[0].focus();
                
                verifyBtn.disabled = false;
                verifyBtn.classList.remove('animate-pulse');
                verifyBtn.innerHTML = `<span>تأكيد الرمز</span>`;
            }
        } catch (error) {
            console.error('[Verify Engine] Error:', error);
            Notify.error("عذراً، حدث خطأ فني أثناء الاتصال.");
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('animate-pulse');
            verifyBtn.innerHTML = `<span>تأكيد الرمز</span>`;
        }
    });

    // 5. محرك إعادة إرسال الرمز
    resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        Notify.info("جاري طلب رمز جديد...");

        try {
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'resend_otp',
                payload: { email: tempUser.email }
            });

            if (response && response.success) {
                Notify.success("تم إرسال رمز جديد بنجاح.");
                startResendTimer();
            } else {
                Notify.error("فشل إرسال الرمز، حاول مجدداً بعد قليل.");
                resendBtn.disabled = false;
            }
        } catch (err) {
            Notify.error("تعذر الاتصال بالخادم لإعادة الإرسال.");
            resendBtn.disabled = false;
        }
    });
});
