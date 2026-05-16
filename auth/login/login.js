/**
 * =================================================================
 * محرك صفحة استعادة كلمة المرور (Enterprise Forgot Engine) - منصة تِيرا
 * يدمج: تأمين الهوية، الفحص الاستباقي، السجلات الأمنية، ونظام مسار الاستعادة وتفادي CORS
 * Path: investor-portal/auth/forgot-password/forgot.js
 * =================================================================
 */

// استيراد أدوات قاعدة البيانات للتحقق من وجود الحساب
import { db } from '../../js/database.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// استيراد الوظائف المساعدة والسجلات الأمنية
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail } from '../../shared/scripts/validation.js';
import { logSecurityEvent } from '../../shared/scripts/logger.js'; // المسجل الأمني
import { getCustomerName } from '../../js/core.js'; // جلب الاسم للإيميل

// رابط الويب هوك الخاص بمنصة Make (المسار الموحد)
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/czm13rtz2r49er30mxqtkwumncg8hn13';

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    const forgotBtn = document.getElementById('forgotBtn');
    const emailInput = document.getElementById('email');

    // تتبع المحاولات المحلية كطبقة حماية أولية
    let resetAttempts = 0;
    const maxAttempts = 3;

    // تنظيف أي جلسات سابقة لضمان أمان العملية الجديدة
    removeFromStorage('temp_user');
    removeFromStorage('pending_email');
    removeFromStorage('auth_mode');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (resetAttempts >= maxAttempts) {
                showNotification("تجاوزت الحد المسموح للمحاولات. يرجى المحاولة لاحقاً.", "error");
                return;
            }

            const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

            // 1. التحقق الاستباقي الصارم
            if (!validateEmail(email)) {
                showNotification("يرجى إدخال بريد إلكتروني صحيح ومسجل.", "warning");
                highlightError(emailInput);
                return;
            }

            // 2. تفعيل وضع "جاري المعالجة" وتأمين الواجهة
            setLoadingState(forgotBtn, true);
            if (emailInput) emailInput.disabled = true;

            // 3. التقاط الـ IP والموقع الجغرافي (تحديث ipwho.is لتفادي الـ CORS)
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
            } catch (geoErr) {
                console.warn("[Security Engine] Geo-fetch bypassed:", geoErr);
            }

            try {
                // 4. التحقق الفعلي من أن الحساب موجود في قاعدة البيانات قبل إرسال أي رمز
                const q = query(collection(db, "users"), where("email", "==", email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    resetAttempts++;
                    // لأسباب أمنية لا نخبر المهاجم أن الإيميل غير موجود، بل نعطي رسالة عامة
                    showNotification("عذراً، لم نتمكن من العثور على الحساب أو إرسال الرمز.", "error");
                    logSecurityEvent(email, "forgot_password_failed", "warning", securityData, "محاولة استعادة كلمة مرور لبريد غير مسجل");
                    
                    setLoadingState(forgotBtn, false);
                    if (emailInput) emailInput.disabled = false;
                    return;
                }

                const fullName = await getCustomerName(email);

                // 5. إرسال الطلب لـ Make (نظام الـ 5 مسارات) لتوليد وإرسال الـ OTP
                try {
                    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            flow_type: 'recovery',               // توجيه الراوتر الأخضر למسار الاستعادة (المسار 3)
                            process_type: 'forgot_password_otp', // نوع القالب في Gmail
                            email: email,
                            fullName: fullName,
                            location: securityData.location,
                            ip: securityData.ip,
                            userAgent: navigator.userAgent       // جلب بيانات المتصفح للإيميل
                        })
                    });

                    if (!makeResponse.ok) {
                        throw new Error("Make server rejected the request");
                    }
                } catch (webhookErr) {
                    console.error("[Automation Engine] Webhook communication failed:", webhookErr);
                    showNotification("تعذر الاتصال بخادم إرسال الرموز، يرجى المحاولة لاحقاً.", "error");
                    logSecurityEvent(email, "webhook_failed", "error", securityData, "فشل الاتصال بمنصة Make أثناء محاولة الاستعادة");
                    
                    setLoadingState(forgotBtn, false);
                    if (emailInput) emailInput.disabled = false;
                    return;
                }

                // توثيق نجاح الإرسال في السجلات الأمنية
                logSecurityEvent(email, "forgot_password_otp_sent", "success", securityData, "تم إرسال رمز OTP لاستعادة كلمة المرور");

                // 6. تخزين بيانات الجلسة المؤقتة والتوجيه لصفحة الـ OTP
                saveToStorage('pending_email', email);
                saveToStorage('auth_mode', 'reset_password'); // تحديد نوع العملية لـ verify.js ليعرف وين يحول العميل بعدين

                showNotification("تم إرسال كود التحقق (OTP) إلى بريدك المسجل ✅", "success");
                
                setTimeout(() => {
                    window.location.replace(`../verify-otp/verify.html?email=${encodeURIComponent(email)}&mode=reset`);
                }, 1500);

            } catch (error) {
                console.error("[Forgot Engine
