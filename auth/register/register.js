/**
 * =================================================================
 * محرك صفحة التسجيل (Enterprise Registration Engine) - منصة تيرا
 * يدمج: بصمة الجهاز، النواة المركزية، توثيق الـ IP والموقع الجغرافي والسجلات الأمنية
 * Path: investor-portal/auth/register/register.js
 * =================================================================
 */

import { db } from '../../js/database.js';
// تم إضافة doc و setDoc لضمان تسمية المستند بالـ uid بشكل صحيح في الفايرستور
import { collection, query, where, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail, validateSaudiPhone, validateName } from '../../shared/scripts/validation.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

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
                // 1. التحقق من عدم تكرار البريد الإلكتروني
                const q = query(collection(db, "users"), where("email", "==", payloadData.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    showNotification("هذا البريد الإلكتروني مسجل لدينا بالفعل، يرجى تسجيل الدخول.", "warning");
                    logSecurityEvent(payloadData.email, "registration_failed", "warning", securityData, "محاولة تسجيل ببريد مكرر");
                    
                    registerBtn.disabled = false; registerBtn.classList.remove('animate-pulse');
                    registerBtn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
                    return;
                }

                // 2. توليد معرف مستخدم فريد (uid) ثابت ومربوط هندسياً بالعملية
                const generatedUid = 'usr_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

                // 3. إرسال البيانات الحية إلى ميك بما فيها الـ uid المتناسق
                try {
                    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            flow_type: 'account_creation', 
                            process_type: 'new_account_otp',
                            uid: generatedUid, // الكبسولة الذهبية التي تحتاجها لوحة Make الحين!
                            email: payloadData.email, 
                            fullName: payloadData.fullName, 
                            phone: payloadData.phone,
                            location: securityData.location, 
                            ip: securityData.ip, 
                            userAgent: navigator.userAgent
                        })
                    });
                    if (!makeResponse.ok) throw new Error("Server rejected request");
                } catch (webhookErr) {
                    console.error("[Automation Engine] Webhook failed:", webhookErr);
                    showNotification("تعذر الاتصال بخادم إرسال الرموز، يرجى المحاولة لاحقاً.", "error");
                    logSecurityEvent(payloadData.email, "webhook_failed", "error", securityData, "فشل إرسال كود الـ OTP عبر Make");
                    
                    registerBtn.disabled = false; registerBtn.classList.remove('animate-pulse');
                    registerBtn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
                    return;
                }

                // 4. حفظ البيانات في الفايرستور باستخدام setDoc ليكون معرف المستند هو نفسه الـ uid
                await setDoc(doc(db, "users", generatedUid), {
                    uid: generatedUid,
                    fullName: payloadData.fullName, 
                    email: payloadData.email, 
                    phone: payloadData.phone,
                    role: "client", 
                    ip: securityData.ip, 
                    location: securityData.location, 
                    createdAt: new Date().toISOString()
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
