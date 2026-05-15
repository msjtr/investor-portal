/**
 * =================================================================
 * محرك إعادة تعيين كلمة المرور (Enterprise Reset Engine) - منصة تيرا
 * التحقق اللحظي، مؤشر القوة، وتأمين الجلسة المركزية عبر النواة
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة حسب هيكل المشروع
import { getCustomerName } from '../../js/core.js';
import { getFromStorage, removeFromStorage, saveToStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. حماية المسار: التأكد من وجود إيميل معلق (اجتاز الـ OTP)
    const pendingEmail = getFromStorage('pending_email') || new URLSearchParams(window.location.search).get('email');
    
    if (!pendingEmail) {
        console.warn("[Reset Engine] وصول غير مصرح به. العودة لصفحة الدخول.");
        window.location.replace('../login/login.html');
        return;
    }

    // 2. جلب عناصر الواجهة
    const resetForm = document.getElementById('resetForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('resetBtn');
    const matchError = document.getElementById('matchError');
    const meterBar = document.getElementById('meterBar');
    const strengthText = document.getElementById('strengthText');

    // تعريف الشروط الأمنية الخمسة لمنصة تيرا
    const rules = {
        length: { regex: /.{8,}/, element: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, element: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, element: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, element: document.getElementById('rule-number') },
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: document.getElementById('rule-special') }
    };

    let isPasswordSecure = false;

    // 3. التحقق اللحظي وقوة كلمة المرور
    newPassword.addEventListener('input', () => {
        const val = newPassword.value;
        let score = 0;

        for (const key in rules) {
            const rule = rules[key];
            if (rule.regex.test(val)) {
                rule.element.classList.replace('invalid', 'valid');
                score++;
            } else {
                rule.element.classList.replace('valid', 'invalid');
            }
        }

        isPasswordSecure = (score === 5);
        updateStrengthMeter(score, val.length);
        validateForm();
    });

    confirmPassword.addEventListener('input', validateForm);

    function validateForm() {
        const passwordsMatch = (newPassword.value === confirmPassword.value && confirmPassword.value !== "");
        
        if (confirmPassword.value.length > 0 && !passwordsMatch) {
            matchError.classList.remove('hidden');
        } else {
            matchError.classList.add('hidden');
        }

        resetBtn.disabled = !(isPasswordSecure && passwordsMatch);
    }

    function updateStrengthMeter(score, length) {
        if (length === 0) {
            meterBar.style.width = '0%';
            strengthText.innerText = "ضعيفة";
            return;
        }
        const colors = ["#ef4444", "#ef4444", "#f59e0b", "#38bdf8", "#22c55e", "#22c55e"];
        const texts = ["ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "قوية جداً", "ممتازة"];
        
        meterBar.style.width = `${(score / 5) * 100}%`;
        meterBar.style.backgroundColor = colors[score];
        strengthText.innerText = texts[score];
    }

    // 4. إرسال الطلب النهائي لـ Make وتحديث الحالة
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        resetBtn.disabled = true;
        resetBtn.innerHTML = `<span>جاري تأمين الحساب...</span>`;

        // التقاط البيانات الأمنية (IP والموقع)
        let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
        try {
            const geoResponse = await fetch('https://ipapi.co/json/');
            const geoData = await geoResponse.json();
            securityData.ip = geoData.ip;
            securityData.location = `${geoData.city}, ${geoData.country_name}`;
        } catch (err) { console.warn("Geo-fetch failed"); }

        try {
            const fullName = await getCustomerName(pendingEmail);
            
            // الربط مع موديول Make (تأكد من وضع الرابط الصحيح)
            const response = await fetch('YOUR_MAKE_WEBHOOK_URL', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'password_reset_success',
                    payload: {
                        email: pendingEmail,
                        fullName: fullName,
                        new_password: newPassword.value
                    },
                    metadata: {
                        ip: securityData.ip,
                        location: securityData.location,
                        device: navigator.platform,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (response.ok) {
                showNotification("تم تحديث كلمة المرور بنجاح ✅", "success");
                removeFromStorage('pending_email');
                saveToStorage('user_session', { email: pendingEmail, name: fullName });

                setTimeout(() => {
                    window.location.replace('../../pages/client/dashboard/index.html');
                }, 2000);
            } else {
                showNotification("عذراً، فشل التحديث. حاول لاحقاً", "error");
                resetBtn.disabled = false;
                resetBtn.innerHTML = `<span>تحديث كلمة المرور والدخول</span>`;
            }
        } catch (error) {
            showNotification("خطأ فني في الاتصال", "error");
            resetBtn.disabled = false;
        }
    });
});
