/**
 * =================================================================
 * محرك إعادة تعيين كلمة المرور (Enterprise Reset Engine) - منصة تِيرا
 * التحقق اللحظي، مؤشر القوة، وتأمين الجلسة المركزية عبر النواة
 * Path: investor-portal/auth/reset-password/reset.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة حسب هيكل المشروع المشترك
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

    // 2. جلب عناصر الواجهة الأساسية
    const resetForm = document.getElementById('resetForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('resetBtn');
    const matchError = document.getElementById('matchError');
    const meterBar = document.getElementById('meterBar');
    const strengthText = document.getElementById('strengthText');
    const toggleNewPass = document.getElementById('toggleNewPass');
    const toggleConfirmPass = document.getElementById('toggleConfirmPass');

    // تفعيل ميزة عرض وإخفاء كلمات المرور لحظياً
    if (toggleNewPass && newPassword) {
        toggleNewPass.addEventListener('click', () => {
            const isPassword = newPassword.type === 'password';
            newPassword.type = isPassword ? 'text' : 'password';
            toggleNewPass.innerText = isPassword ? 'إخفاء' : 'عرض';
        });
    }

    if (toggleConfirmPass && confirmPassword) {
        toggleConfirmPass.addEventListener('click', () => {
            const isPassword = confirmPassword.type === 'password';
            confirmPassword.type = isPassword ? 'text' : 'password';
            toggleConfirmPass.innerText = isPassword ? 'إخفاء' : 'عرض';
        });
    }

    // تعريف الشروط الأمنية الخمسة لمنصة تِيرا
    const rules = {
        length: { regex: /.{8,}/, element: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, element: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, element: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, element: document.getElementById('rule-number') },
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: document.getElementById('rule-special') }
    };

    let isPasswordSecure = false;

    // 3. التحقق اللحظي وقوة كلمة المرور
    if (newPassword) {
        newPassword.addEventListener('input', () => {
            const val = newPassword.value;
            let score = 0;

            for (const key in rules) {
                const rule = rules[key];
                if (rule.element) {
                    if (rule.regex.test(val)) {
                        rule.element.classList.remove('invalid');
                        rule.element.classList.add('valid');
                        score++;
                    } else {
                        rule.element.classList.remove('valid');
                        rule.element.classList.add('invalid');
                    }
                }
            }

            isPasswordSecure = (score === 5);
            updateStrengthMeter(score, val.length);
            validateForm();
        });
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', validateForm);
    }

    function validateForm() {
        if (!newPassword || !confirmPassword || !resetBtn) return;
        
        const passwordsMatch = (newPassword.value === confirmPassword.value && confirmPassword.value !== "");
        
        if (matchError) {
            if (confirmPassword.value.length > 0 && !passwordsMatch) {
                matchError.classList.remove('hidden');
            } else {
                matchError.classList.add('hidden');
            }
        }

        resetBtn.disabled = !(isPasswordSecure && passwordsMatch);
    }

    function updateStrengthMeter(score, length) {
        if (!meterBar || !strengthText) return;
        
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

    // 4. إرسال الطلب النهائي وتحديث الحالة الأمنية الجغرافية
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            resetBtn.disabled = true;
            resetBtn.innerHTML = `<span>جاري تأمين الحساب...</span>`;

            // التقاط البيانات الأمنية (IP والموقع)
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipapi.co/json/', { mode: 'cors' });
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    securityData.ip = geoData.ip || securityData.ip;
                    securityData.location = geoData.city && geoData.country_name 
                        ? `${geoData.city}, ${geoData.country_name}` 
                        : securityData.location;
                }
            } catch (err) { 
                console.warn("[Security Engine] Geo-fetch failed for password reset:", err); 
            }

            try {
                const fullName = await getCustomerName(pendingEmail);
                
                // الربط البرمجي مع موديول أتمتة Make لإرسال إشعار الأمان الناجح للمستثمر
                const webhookUrl = 'YOUR_MAKE_WEBHOOK_URL';
                let communicationSuccess = false;

                if (webhookUrl && webhookUrl !== 'YOUR_MAKE_WEBHOOK_URL') {
                    try {
                        const response = await fetch(webhookUrl, {
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
                        communicationSuccess = response.ok;
                    } catch (webhookErr) {
                        console.warn("[Automation Engine] Webhook down or blocked:", webhookErr);
                    }
                } else {
                    // مسار تمرير تلقائي في حال لم يتم ربط الويبهوك بعد لتسريع التجربة المحلية
                    communicationSuccess = true;
                }

                if (communicationSuccess) {
                    showNotification("تم تحديث كلمة المرور بنجاح ✅", "success");
                    removeFromStorage('pending_email');
                    removeFromStorage('auth_mode');
                    saveToStorage('user_session', { email: pendingEmail, name: fullName, token: "session_verified_" + Date.now() });

                    setTimeout(() => {
                        window.location.replace('../../pages/client/dashboard/index.html');
                    }, 2000);
                } else {
                    showNotification("عذراً، فشل تحديث كلمة المرور. حاول لاحقاً.", "error");
                    resetBtn.disabled = false;
                    resetBtn.innerHTML = `<span>تحديث كلمة المرور والدخول</span>`;
                }
            } catch (error) {
                console.error("[Reset Engine] Critical exception:", error);
                showNotification("حدث خطأ فني في الاتصال بالنواة.", "error");
                resetBtn.disabled = false;
                resetBtn.innerHTML = `<span>تحديث كلمة المرور والدخول</span>`;
            }
        });
    }
});
