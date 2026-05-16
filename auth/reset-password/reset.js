/**
 * =================================================================
 * محرك إعادة تعيين كلمة المرور (Enterprise Reset Engine) - منصة تِيرا
 * التحقق اللحظي، التحديث الفعلي في النواة، السجلات الأمنية، وتفادي CORS
 * Path: investor-portal/auth/reset-password/reset.js
 * =================================================================
 */

import { getCustomerName } from '../../js/core.js';
import { getFromStorage, removeFromStorage, saveToStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 
import { db } from '../../js/database.js';
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

document.addEventListener('DOMContentLoaded', async () => {
    const pendingEmail = getFromStorage('pending_email') || new URLSearchParams(window.location.search).get('email');
    if (!pendingEmail) {
        console.warn("[Reset Engine] وصول غير مصرح به. العودة لصفحة الدخول.");
        window.location.replace('../login/login.html'); return;
    }

    const resetForm = document.getElementById('resetForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('resetBtn');
    const matchError = document.getElementById('matchError');
    const meterBar = document.getElementById('meterBar');
    const strengthText = document.getElementById('strengthText');
    const toggleNewPass = document.getElementById('toggleNewPass');
    const toggleConfirmPass = document.getElementById('toggleConfirmPass');

    const handleToggle = (btn, input) => {
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
            const isPass = input.type === 'password'; input.type = isPass ? 'text' : 'password';
            btn.style.opacity = isPass ? '1' : '0.6';
        });
    };
    handleToggle(toggleNewPass, newPassword); handleToggle(toggleConfirmPass, confirmPassword);

    const rules = {
        length: { regex: /.{8,}/, element: document.getElementById('rule-length') },
        upper: { regex: /[A-Z]/, element: document.getElementById('rule-upper') },
        lower: { regex: /[a-z]/, element: document.getElementById('rule-lower') },
        number: { regex: /[0-9]/, element: document.getElementById('rule-number') },
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: document.getElementById('rule-special') }
    };
    let isPasswordSecure = false;

    const validateForm = () => {
        if (!newPassword || !confirmPassword || !resetBtn) return;
        const match = (newPassword.value === confirmPassword.value && confirmPassword.value !== "");
        if (matchError) {
            if (confirmPassword.value.length > 0 && !match) matchError.classList.remove('hidden');
            else matchError.classList.add('hidden');
        }
        resetBtn.disabled = !(isPasswordSecure && match);
    };

    if (newPassword) {
        newPassword.addEventListener('input', () => {
            const val = newPassword.value; let score = 0;
            for (const key in rules) {
                const r = rules[key];
                if (r.element) {
                    if (r.regex.test(val)) { r.element.className = 'rule-item valid'; score++; }
                    else r.element.className = 'rule-item invalid';
                }
            }
            isPasswordSecure = (score === 5);
            if (meterBar && strengthText) {
                if (val.length === 0) { meterBar.style.width = '0%'; strengthText.innerText = "ضعيفة"; }
                else {
                    const colors = ["#ef4444", "#ef4444", "#f59e0b", "#38bdf8", "#22c55e", "#22c55e"];
                    const texts = ["ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "قوية جداً", "ممتازة"];
                    meterBar.style.width = `${(score / 5) * 100}%`; meterBar.style.backgroundColor = colors[score];
                    strengthText.innerText = texts[score];
                }
            }
            validateForm();
        });
    }
    if (confirmPassword) confirmPassword.addEventListener('input', validateForm);

    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (resetBtn) { resetBtn.disabled = true; resetBtn.innerHTML = `<span>جاري تأمين الحساب...</span>`; }

            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipwho.is/');
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.success) {
                        securityData.ip = geoData.ip || securityData.ip;
                        securityData.location = geoData.city && geoData.country ? `${geoData.city}, ${geoData.country}` : securityData.location;
                    }
                }
            } catch (err) { console.warn("[Security Engine] Geo bypassed:", err); }

            try {
                const fullName = await getCustomerName(pendingEmail);
                const q = query(collection(db, "users"), where("email", "==", pendingEmail.toLowerCase()));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    showNotification("عذراً، لم يتم العثور على الحساب.", "error");
                    logSecurityEvent(pendingEmail, "password_reset_failed", "error", securityData, "محاولة تغيير باسوورد لحساب غير موجود");
                    if (resetBtn) { resetBtn.disabled = false; resetBtn.innerHTML = `<span>تحديث كلمة المرور والدخول</span>`; }
                    return;
                }

                const userDocRef = doc(db, "users", querySnapshot.docs[0].id);
                await updateDoc(userDocRef, { password: newPassword.value, lastPasswordReset: new Date().toISOString() });

                try {
                    await fetch(MAKE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            flow_type: 'recovery', process_type: 'password_reset_success',
                            email: pendingEmail, fullName: fullName,
                            location: securityData.location, ip: securityData.ip, userAgent: navigator.userAgent
                        })
                    });
                } catch (webhookErr) { console.warn("[Automation] Webhook down:", webhookErr); }

                logSecurityEvent(pendingEmail, "password_reset_success", "success", securityData, "تم تغيير كلمة المرور بنجاح");
                showNotification("تم تحديث كلمة المرور بنجاح ✅", "success");
                removeFromStorage('pending_email'); removeFromStorage('auth_mode');
                saveToStorage('user_session', { email: pendingEmail, name: fullName, token: "session_verified_" + Date.now() });

                setTimeout(() => window.location.replace('../../pages/client/dashboard/index.html'), 2000);

            } catch (error) {
                console.error("[Reset Engine] Error:", error);
                showNotification("حدث خطأ فني في الاتصال بالنواة.", "error");
                logSecurityEvent(pendingEmail, "system_error", "failed", securityData, "فشل فني أثناء تحديث كلمة المرور");
                if (resetBtn) { resetBtn.disabled = false; resetBtn.innerHTML = `<span>تحديث كلمة المرور والدخول</span>`; }
            }
        });
    }
});
