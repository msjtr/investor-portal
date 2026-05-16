/**
 * =================================================================
 * محرك صفحة التسجيل (Enterprise Registration Engine) - منصة تيرا
 * يدمج: بصمة الجهاز، النواة المركزية، توثيق الـ IP والموقع الجغرافي والسجلات الأمنية
 * Path: investor-portal/auth/register/register.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة حسب هيكل المشروع المشترك
import { db } from '../../js/database.js';
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail, validateSaudiPhone, validateName } from '../../shared/scripts/validation.js';

// استدعاء المسجل الأمني لتوثيق الحركات
import { logSecurityEvent } from '../../shared/scripts/logger.js'; 

// رابط الويب هوك الخاص بمنصة Make (المسار الموحد)
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const agreeCheckbox = document.getElementById('agreeTerms');

    // تتبع المحاولات المحلية لمنع الإغراق كطبقة حماية أولية
    let attemptCount = 0;
    const maxRegisterAttempts = 4;

    // 1. تنظيف الجلسات المؤقتة القديمة لبدء عملية تسجيل جديدة وآمنة
    removeFromStorage('temp_user');
    removeFromStorage('pending_email');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (attemptCount >= maxRegisterAttempts) {
                showNotification("تم تعليق عمليات التسجيل مؤقتاً لتجاوز عدد المحاولات.", "error");
                return;
            }

            // 2. جلب وتأمين عناصر المدخلات
            const fullNameElem = document.getElementById('fullName');
            const emailElem = document.getElementById('email');
            const phoneElem = document.getElementById('phone');
            const passwordElem = document.getElementById('password');

            if (!fullNameElem || !emailElem || !phoneElem || !passwordElem) {
                showNotification("حدث خلل في تحميل عناصر النموذج الفني.", "error");
                return;
            }

            const payloadData = {
                fullName: fullNameElem.value.trim(),
                email: emailElem.value.trim().toLowerCase(),
                phone: phoneElem.value.trim(),
                password: passwordElem.value
            };

            // 3. فحص أمني وتدقيق منطقي استباقي (Zero Trust Validation)
            if (!agreeCheckbox || !agreeCheckbox.checked) {
                showNotification("يجب الموافقة على الشروط والأحكام للاستمرار.", "warning");
                return;
            }

            if (!validateName(payloadData.fullName)) {
                showNotification("يرجى إدخال الاسم الكامل بشكل صحيح (ثلاثي على الأقل).", "warning");
                return;
            }

            if (!validateEmail(payloadData.email)) {
                showNotification("صيغة البريد الإلكتروني المدخل غير صحيحة.", "warning");
                return;
            }

            if (!validateSaudiPhone(payloadData.phone)) {
                showNotification("يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05.", "warning");
                return;
            }

            if (payloadData.password.length < 6) {
                showNotification("يجب أن تكون كلمة المرور مكونة من 6 خانات أو أكثر.", "warning");
                return;
            }

            // 4. تفعيل حالة "جاري المعالجة" وتأمين الواجهة لمنع النقرات المتكررة
            registerBtn.disabled = true;
            registerBtn.classList.add('animate-pulse');
            registerBtn.innerHTML = `<span>جاري تأمين الحساب والتحقق...</span>`;

            // 5. التقاط الـ IP والموقع الجغرافي لتوثيق السجل الأمني للعملية
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
                console.warn("[Security Engine] Geo-fetch bypassed or blocked by CORS:", err); 
            }

            try {
                // 6. التحقق من قاعدة بيانات Firestore: هل الحساب موجود مسبقاً؟
                const q = query(collection(db, "users"), where("email", "==", payloadData.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    showNotification("هذا البريد الإلكتروني مسجل لدينا بالفعل، يرجى تسجيل الدخول.", "warning");
                    // توثيق المحاولة المكررة
                    logSecurityEvent(payloadData.email, "registration_failed", "warning", securityData, "محاولة تسجيل ببريد إلكتروني مسجل مسبقاً");
                    resetButton(registerBtn);
                    return;
                }

                // 7. إرسال الطلب لـ Make (نظام الـ 5 مسارات) قبل حفظ البيانات لضمان الإرسال
                try {
                    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            flow_type: 'account_creation',    // يوجه الراوتر الأخضر
                            process_type: 'new_account_otp',  // يحدد نوع القالب
                            email: payloadData.email,
                            fullName: payloadData.fullName,
                            phone: payloadData.phone,
                            location: securityData.location,
                            ip: securityData.ip
                        })
                    });

                    if (!makeResponse.ok) {
                        throw new Error("Server rejected the request");
                    }
                } catch (webhookErr) {
                    console.error("[Automation Engine] Webhook communication failed:", webhookErr);
                    showNotification("تعذر الاتصال بخادم إرسال الرموز، يرجى المحاولة لاحقاً.", "error");
                    // توثيق فشل الاتصال بالويب هوك
                    logSecurityEvent(payloadData.email, "webhook_failed", "error", securityData, "فشل إرسال كود الـ OTP عبر منصة Make");
                    resetButton(registerBtn);
                    return; // إيقاف العملية إذا فشل إرسال الكود
                }

                // 8. حفظ بيانات المستثمر الجديد في النواة المركزية بـ Firebase (بعد نجاح Make)
                await addDoc(collection(db, "users"), {
                    fullName: payloadData.fullName,
                    email: payloadData.email,
                    phone: payloadData.phone,
                    role: "client",
                    ip: securityData.ip,
                    location: securityData.location,
                    createdAt: new Date().toISOString()
                });

                // توثيق العملية الناجحة في السجلات الأمنية
                logSecurityEvent(payloadData.email, "new_registration", "success", securityData, "تم إنشاء الحساب بنجاح وإرسال كود التفعيل");

                // 9. تخزين الجلسة المؤقتة والتوجه لصفحة التحقق من الـ OTP
                saveToStorage('pending_email', payloadData.email);
                showNotification("تم إرسال كود التفعيل لبريدك بنجاح ✅", "success");
                
                setTimeout(() => {
                    // تحويل المستثمر لصفحة التحقق
                    window.location.replace('../verify-otp/verify.html');
                }, 1500);

            } catch (error) {
                console.error("[Registration Engine] Critical Technical Error:", error);
                attemptCount++;
                showNotification("حدث خطأ فني أثناء معالجة الطلب، يرجى المحاولة لاحقاً.", "error");
                // توثيق الخطأ الفني الحرج
                logSecurityEvent(payloadData.email, "system_error", "failed", securityData, `خطأ فني: ${error.message}`);
                resetButton(registerBtn);
            }
        });
    }

    /**
     * إعادة تعيين حالة الزر عند حدوث خطأ أو تنبيه
     */
    function resetButton(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
    }
});
