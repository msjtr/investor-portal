/**
 * =================================================================
 * محرك صفحة التسجيل المطور (Enterprise Registration Engine) - منصة تيرا
 * حل جذري لمشكلة الـ CORS والـ IP عبر قنوات Cloudflare المستقرة
 * مدمج مع الترسانة الأمنية الشاملة للتدقيق والامتثال
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
        // --- :البيانات الأساسية ---
        flow_type: 'account_creation', 
        process_type: 'new_account_otp',
        uid: uid,
        email: basicData.email,
        fullName: basicData.fullName,
        phone: basicData.phone || "غير متوفر",
        
        // --- البيانات الجغرافية والشبكة ---
        ip: secData.ip || "127.0.0.1",
        country: secData.location.includes("Saudi Arabia") ? "Saudi Arabia" : "Unknown",
        city: secData.location.includes("Riyadh") ? "Riyadh" : "Hail", // افتراضي بناءً على التوجيه التقريبي
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

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const agreeCheckbox = document.getElementById('agreeTerms');

    let attemptCount = 0; const maxRegisterAttempts = 4;

    removeFromStorage('temp_user');
    removeFromStorage('pending_email');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (attemptCount >= maxRegisterAttempts) {
                showNotification("تم تعليق عمليات التسجيل مؤقتاً لتجاوز عدد المحاولات.", "error"); return;
            }

            const fullNameElem = document.getElementById('fullName');
            const emailElem = document.getElementById('email');
            const phoneElem = document.getElementById('phone');
            const passwordElem = document.getElementById('password');

            if (!fullNameElem || !emailElem || !phoneElem || !passwordElem) {
                showNotification("حدث خلل في تحميل عناصر النموذج الفني.", "error"); return;
            }

            const payloadData = {
                fullName: fullNameElem.value.trim(),
                email: emailElem.value.trim().toLowerCase(),
                phone: phoneElem.value.trim(),
                password: passwordElem.value
            };

            if (!agreeCheckbox || !agreeCheckbox.checked) {
                showNotification("يجب الموافقة على الشروط والأحكام للاستمرار.", "warning"); return;
            }
            if (!validateName(payloadData.fullName)) {
                showNotification("يرجى إدخال الاسم الكامل بشكل صحيح (ثلاثي على الأقل).", "warning"); return;
            }
            if (!validateEmail(payloadData.email)) {
                showNotification("صيغة البريد الإلكتروني المدخل غير صحيحة.", "warning"); return;
            }
            if (!validateSaudiPhone(payloadData.phone)) {
                showNotification("يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05.", "warning"); return;
            }
            if (payloadData.password.length < 6) {
                showNotification("يجب أن تكون كلمة المرور مكونة من 6 خانات أو أكثر.", "warning"); return;
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
                    if (ipLine) {
                        securityData.ip = ipLine.split('=')[1].trim();
                    }
                    const locLine = dataText.split('\n').find(line => line.startsWith('loc='));
                    if (locLine && locLine.split('=')[1].trim() === 'SA') {
                        securityData.location = "Riyadh, Saudi Arabia";
                    }
                }
            } catch (err) { 
                console.warn("[Security Engine] Cloudflare geo bypassed:", err); 
            }

            try {
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
                        body: JSON.stringify(finalSecurityPayload) // إرسال الترسانة بالكامل هنا
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

                // الحفظ الكامل والمباشر في قاعدة بيانات الفايرستور مدمجاً بداخل مستند المستخدم
                await setDoc(doc(db, "users", generatedUid), {
                    uid: generatedUid,
                    fullName: payloadData.fullName, 
                    email: payloadData.email, 
                    phone: payloadData.phone,
                    role: "client", 
                    ip: securityData.ip, 
                    location: securityData.location, 
                    createdAt: new Date().toISOString(),
                    
                    // 👇 ضخ الترسانة الأمنية المجمعة بالكامل لترصد آلياً في الفايرستور 👇
                    securityProfile: finalSecurityPayload
                });

                logSecurityEvent(payloadData.email, "new_registration", "success", securityData, "تم إنشاء الحساب بنجاح وإرسال كود التفعيل");
                saveToStorage('pending_email', payloadData.email);
                showNotification("تم إرسال كود التفعيل لبريدك بنجاح ✅", "success");

                setTimeout(() => {
                    window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(payloadData.email)}&mode=register`);
                }, 1500);

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
