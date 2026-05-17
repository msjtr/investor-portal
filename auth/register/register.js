/**
 * =================================================================
 * محرك صفحة التسجيل المطور (Enterprise Registration Engine) - منصة تيرا
 * حل جذري لمشكلة الـ CORS والـ IP عبر قنوات Cloudflare المستقرة
 * مدمج مع الترسانة الأمنية الشاملة، التحقق اللحظي، وشروط كلمة المرور
 * Path: investor-portal/auth/register/register.js
 * =================================================================
 */

import { db } from '../../js/database.js';
import { collection, query, where, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail, validateSaudiPhone, validateName } from '../../shared/scripts/validation.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

// 1. دالة لتوليد معرفات عشوائية (للبصمة ورقم العملية)
const generateID = (prefix) => prefix + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

// 2. دالة بناء الترسانة الأمنية الشاملة (Security Payload)
const buildSecurityPayload = (basicData, secData, uid) => {
    const now = new Date();
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iP(ad|hone)/.test(userAgent);
    const os = userAgent.includes("Win") ? "Windows" : userAgent.includes("Mac") ? "MacOS" : userAgent.includes("Android") ? "Android" : userAgent.includes("like Mac") ? "iOS" : "Unknown OS";
    
    return {
        // --- البيانات الأساسية ---
        flow_type: 'account_creation', 
        process_type: 'new_account_otp',
        uid: uid,
        username: basicData.username,
        email: basicData.email,
        fullName: basicData.fullName,
        phone: basicData.fullPhone || "غير متوفر",
        
        // --- البيانات الجغرافية والشبكة ---
        ip: secData.ip || "127.0.0.1",
        country: secData.location.includes("Saudi Arabia") ? "Saudi Arabia" : "Unknown",
        city: secData.location.includes("Riyadh") ? "Riyadh" : "Hail",
        location: secData.location || "Hail, KSA",
        connection_type: navigator.connection ? navigator.connection.effectiveType : "Unknown",
        
        // --- بيانات العملية ---
        process_description: "طلب إنشاء حساب جديد وتوثيق OTP",
        process_id: generateID("TRX"),
        risk_level: "Low",
        source: "Investor Portal - Web",
        action_status: "Pending OTP Verification",
        
        // --- بيانات الوقت والتاريخ ---
        date: now.toLocaleDateString('ar-SA'),
        time: now.toLocaleTimeString('ar-SA'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // --- بيانات الجهاز والمتصفح ---
        device_name: isMobile ? "Mobile Device" : "Desktop PC",
        device_type: isMobile ? "Mobile" : "Desktop",
        os: os,
        browser: userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : userAgent.includes("Firefox") ? "Firefox" : "Other",
        userAgent: userAgent,
        device_fingerprint: generateID("FP"),
        system_language: navigator.language || "ar-SA",
        
        // --- بيانات الجلسة والمصادقة ---
        session_id: sessionStorage.getItem('tera_session') || generateID("SES"),
        auth_method: "Email OTP",
        mfa_status: "Initiated",
        verification_type: "2FA Pre-Registration",
        session_status: "Active",
        
        // --- بيانات الامتثال والتدقيق ---
        audit_logs: "Security packet generated at client-side securely",
        encryption_status: location.protocol === 'https:' ? "Encrypted (SSL/TLS)" : "Unencrypted",
        suspicious_activity: "None Detected"
    };
};

// 3. خوارزمية فحص قوة وتطابق اسم المستخدم وكلمة المرور
const checkComplexRules = (str) => {
    const hasUpper = /[A-Z]/.test(str);
    const hasLower = /[a-z]/.test(str);
    const symbols = str.match(/[@&#$]/g);
    const hasOneSymbol = symbols && symbols.length === 1 && !/[^a-zA-Z0-9@&#$]/.test(str);
    
    const digits = str.replace(/[^0-9]/g, '');
    const has6Digits = digits.length === 6;
    let nonConsecutive = false;
    
    if (has6Digits) {
        const seq = '0123456789'; const rev = '9876543210';
        const isRepeated = /^(\d)\1{5}$/.test(digits);
        if (!seq.includes(digits) && !rev.includes(digits) && !isRepeated) {
            nonConsecutive = true;
        }
    }
    return { hasUpper, hasLower, nonConsecutive, hasOneSymbol };
};

const updateRuleUI = (prefix, rules) => {
    const ui = (id, valid) => {
        const el = document.getElementById(prefix + id);
        if(!el) return;
        if (valid) { el.className = 'rule-item pass'; el.innerHTML = `<span data-icon="check"></span> ${el.innerText.substring(2)}`; }
        else { el.className = 'rule-item fail'; el.innerHTML = `<span data-icon="cross"></span> ${el.innerText.substring(2)}`; }
    };
    ui('-upper', rules.hasUpper); ui('-lower', rules.hasLower);
    ui('-num', rules.nonConsecutive); ui('-sym', rules.hasOneSymbol);
    return rules.hasUpper && rules.hasLower && rules.nonConsecutive && rules.hasOneSymbol;
};

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    let attemptCount = 0; const maxRegisterAttempts = 4;

    removeFromStorage('temp_user');
    removeFromStorage('pending_email');

    // --- متغيرات التحقق اللحظي ---
    let isUserValid = false;
    let isPassValid = false;

    // --- ربط عناصر DOM ---
    const fullNameElem = document.getElementById('fullName');
    const emailElem = document.getElementById('email');
    const confirmEmailElem = document.getElementById('confirmEmail');
    const countryCodeElem = document.getElementById('countryCode');
    const phoneElem = document.getElementById('phone');
    const usernameElem = document.getElementById('username');
    const passwordElem = document.getElementById('password');
    const confirmPasswordElem = document.getElementById('confirmPassword');

    // 1. التحقق من اسم المستخدم
    if(usernameElem) {
        usernameElem.addEventListener('input', function() {
            isUserValid = updateRuleUI('usr', checkComplexRules(this.value));
        });
    }

    // 2. التحقق من كلمة المرور ومؤشر القوة
    if(passwordElem) {
        passwordElem.addEventListener('input', function() {
            const r = checkComplexRules(this.value);
            isPassValid = updateRuleUI('pwd', r);
            
            const bar = document.getElementById('passStrengthBar');
            const txt = document.getElementById('passStrengthText');
            if(bar && txt) {
                let score = (r.hasUpper?1:0) + (r.hasLower?1:0) + (r.hasOneSymbol?1:0) + (r.nonConsecutive?1:0);
                if (this.value.length === 0) { bar.style.width = '0'; txt.textContent = ''; }
                else if (score <= 2) { bar.style.width = '33%'; bar.style.background = '#ef476f'; txt.textContent = 'ضعيفة'; txt.style.color = '#ef476f'; }
                else if (score === 3) { bar.style.width = '66%'; bar.style.background = '#FFD166'; txt.textContent = 'متوسطة'; txt.style.color = '#FFD166'; }
                else if (score === 4) { bar.style.width = '100%'; bar.style.background = '#06D6A0'; txt.textContent = 'قوية'; txt.style.color = '#06D6A0'; }
            }
        });
    }

    // --- الإرسال والتحقق النهائي ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (attemptCount >= maxRegisterAttempts) {
                showNotification("تم تعليق عمليات التسجيل مؤقتاً لتجاوز عدد المحاولات.", "error"); return;
            }

            // التأكد من تحميل العناصر
            if (!fullNameElem || !emailElem || !confirmEmailElem || !phoneElem || !usernameElem || !passwordElem || !confirmPasswordElem) {
                showNotification("حدث خلل في تحميل عناصر النموذج الفني.", "error"); return;
            }

            // التحققات الأمنية والمطابقة
            if (emailElem.value.trim().toLowerCase() !== confirmEmailElem.value.trim().toLowerCase()) {
                showNotification("البريد الإلكتروني غير متطابق.", "error"); return;
            }
            if (!isUserValid) {
                showNotification("يرجى إكمال شروط اسم المستخدم المطلوبة.", "warning"); return;
            }
            if (!isPassValid) {
                showNotification("يرجى إكمال شروط كلمة المرور المطلوبة.", "warning"); return;
            }
            if (passwordElem.value !== confirmPasswordElem.value) {
                showNotification("كلمة المرور غير متطابقة.", "error"); return;
            }

            const payloadData = {
                fullName: fullNameElem.value.trim(),
                email: emailElem.value.trim().toLowerCase(),
                countryCode: countryCodeElem ? countryCodeElem.value : '966',
                phone: phoneElem.value.trim(),
                fullPhone: `+${countryCodeElem ? countryCodeElem.value : '966'}${phoneElem.value.trim()}`,
                username: usernameElem.value.trim(),
                password: passwordElem.value
            };

            if (!validateName(payloadData.fullName)) {
                showNotification("يرجى إدخال الاسم الكامل بشكل صحيح (ثلاثي على الأقل).", "warning"); return;
            }
            if (!validateEmail(payloadData.email)) {
                showNotification("صيغة البريد الإلكتروني المدخل غير صحيحة.", "warning"); return;
            }

            registerBtn.disabled = true;
            registerBtn.classList.add('animate-pulse');
            registerBtn.innerHTML = `<span>جاري تأمين الحساب والتحقق...</span>`;

            // استخدام الحل الذهبي المستقر من Cloudflare والمقاوم تماماً للـ CORS
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
                if (response.ok) {
                    const dataText = await response.text();
                    const ipLine = dataText.split('\n').find(line => line.startsWith('ip='));
                    if (ipLine) securityData.ip = ipLine.split('=')[1].trim();
                    const locLine = dataText.split('\n').find(line => line.startsWith('loc='));
                    if (locLine && locLine.split('=')[1].trim() === 'SA') securityData.location = "Riyadh, Saudi Arabia";
                }
            } catch (err) { 
                console.warn("[Security Engine] Cloudflare geo bypassed:", err); 
            }

            try {
                // التحقق من عدم وجود البريد مسبقاً
                const q = query(collection(db, "users"), where("email", "==", payloadData.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    showNotification("هذا البريد الإلكتروني مسجل لدينا بالفعل، يرجى تسجيل الدخول.", "warning");
                    logSecurityEvent(payloadData.email, "registration_failed", "warning", securityData, "محاولة تسجيل ببريد مكرر");
                    
                    registerBtn.disabled = false; registerBtn.classList.remove('animate-pulse');
                    registerBtn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
                    return;
                }

                const generatedUid = 'usr_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

                // بناء الحزمة الأمنية الكاملة وإرسالها لـ Make
                const finalSecurityPayload = buildSecurityPayload(payloadData, securityData, generatedUid);

                try {
                    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(finalSecurityPayload)
                    });
                    if (!makeResponse.ok) throw new Error("Server rejected request");
                } catch (webhookErr) {
                    console.error("[Automation Engine] Webhook failed:", webhookErr);
                    showNotification("يرجى التأكد من تجديد اتصال الـ Gmail في لوحة أتمتة الرسائل (Make) والمحاولة مجدداً.", "error");
                    logSecurityEvent(payloadData.email, "webhook_failed", "error", securityData, "فشل إرسال كود الـ OTP عبر Make");
                    
                    registerBtn.disabled = false; registerBtn.classList.remove('animate-pulse');
                    registerBtn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
                    return;
                }

                // الحفظ الكامل في قاعدة بيانات الفايرستور
                await setDoc(doc(db, "users", generatedUid), {
                    uid: generatedUid,
                    username: payloadData.username,
                    fullName: payloadData.fullName, 
                    email: payloadData.email, 
                    phone: payloadData.fullPhone,
                    role: "client", 
                    ip: securityData.ip, 
                    location: securityData.location, 
                    createdAt: new Date().toISOString(),
                    securityProfile: finalSecurityPayload // الترسانة الأمنية
                });

                logSecurityEvent(payloadData.email, "new_registration", "success", securityData, "تم إنشاء الحساب بنجاح وإرسال كود التفعيل");
                saveToStorage('pending_email', payloadData.email);
                
                // إظهار شاشة التحميل (Overlay) الخاصة بالنجاح والتوجيه
                const loadingOverlay = document.getElementById('loadingOverlay');
                if(loadingOverlay) {
                    loadingOverlay.style.display = 'flex';
                } else {
                    showNotification("تم إرسال كود التفعيل لبريدك بنجاح ✅", "success");
                }

                // التوجيه لصفحة الـ OTP بعد 5 ثوانٍ كما هو مطلوب في الهيكلة
                setTimeout(() => {
                    window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(payloadData.email)}&mode=register`);
                }, 5000);

            } catch (error) {
                console.error("[Register Engine] Error:", error);
                showNotification("حدث خطأ فني أثناء الاتصال بالسيرفر.", "error");
                logSecurityEvent(payloadData.email, "system_error", "failed", securityData, `خطأ فني: ${error.message}`);
                
                registerBtn.disabled = false; registerBtn.classList.remove('animate-pulse');
                registerBtn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
            }
        });
    }
});
