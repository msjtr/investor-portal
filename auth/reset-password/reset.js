/**
 * =================================================================
 * محرك إعادة تعيين كلمة المرور (Enterprise Reset Engine) - منصة تِيرا
 * التحقق اللحظي، التحديث الفعلي في النواة، السجلات الأمنية، والربط بالمسارات
 * Path: investor-portal/auth/reset-password/reset.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة
import { getCustomerName } from '../../js/core.js';
import { getFromStorage, removeFromStorage, saveToStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; // استدعاء المسجل الأمني

// استيراد أدوات قاعدة البيانات لتحديث كلمة المرور فعلياً
import { db } from '../../js/database.js';
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// رابط الويب هوك الخاص بمنصة Make (المسار الموحد)
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

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

    // 4. إرسال الطلب النهائي والتحديث الفعلي في النواة
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
                
                // --- إضافة هامة: تحديث كلمة المرور فعلياً في قاعدة البيانات ---
                const q = query(collection(db, "users"), where("email", "==", pendingEmail.toLowerCase()));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    showNotification("عذراً، لم يتم العثور على الحساب.", "error");
                    logSecurityEvent(pendingEmail, "password_reset_failed", "error", securityData, "محاولة تغيير كلمة مرور لحساب غير موجود");
                    throw new Error("User not found in
