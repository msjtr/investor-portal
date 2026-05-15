/**
 * =================================================================
 * محرك صفحة التسجيل (Enterprise Registration Engine) - منصة تيرا
 * يدمج: بصمة الجهاز، النواة المركزية، توثيق الـ IP والموقع الجغرافي
 * Path: investor-portal/auth/register/register.js
 * =================================================================
 */

// استيراد النواة والوظائف المساعدة حسب هيكل المشروع
import { db } from '../../js/database.js';
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { saveToStorage, removeFromStorage } from '../../shared/scripts/storage.js';
import { showNotification } from '../../shared/scripts/notifications.js';
import { validateEmail, validateSaudiPhone, validateName } from '../../shared/scripts/validation.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const agreeCheckbox = document.getElementById('agreeTerms');

    // تتبع المحاولات المحلية لمنع الإغراق
    let attemptCount = 0;
    const maxRegisterAttempts = 4;

    // 1. تنظيف الجلسات المؤقتة لبدء عملية تسجيل جديدة
    removeFromStorage('temp_user');
    removeFromStorage('pending_email');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (attemptCount >= maxRegisterAttempts) {
                showNotification("تم تعليق التسجيل مؤقتاً لتجاوز عدد المحاولات.", "error");
                return;
            }

            // 2. جلب المدخلات
            const fullNameElem = document.getElementById('fullName');
            const emailElem = document.getElementById('email');
            const phoneElem = document.getElementById('phone');
            const passwordElem = document.getElementById('password');

            const payloadData = {
                fullName: fullNameElem.value.trim(),
                email: emailElem.value.trim().toLowerCase(),
                phone: phoneElem.value.trim(),
                password: passwordElem.value
            };

            // 3. فحص أمني وتدقيق منطقي
            if (!agreeCheckbox || !agreeCheckbox.checked) {
                showNotification("يجب الموافقة على الشروط والأحكام للاستمرار.", "warning");
                return;
            }

            // استخدام نظام الـ Validation المشترك في شجرة ملفاتك
            if (!validateName(payloadData.fullName)) {
                showNotification("يرجى إدخال الاسم الكامل بشكل صحيح.", "warning");
                return;
            }

            if (!validateEmail(payloadData.email)) {
                showNotification("صيغة البريد الإلكتروني غير صحيحة.", "warning");
                return;
            }

            if (!validateSaudiPhone(payloadData.phone)) {
                showNotification("يرجى إدخال رقم جوال سعودي صحيح (05).", "warning");
                return;
            }

            // 4. تفعيل حالة "جاري المعالجة"
            registerBtn.disabled = true;
            registerBtn.classList.add('animate-pulse');
            registerBtn.innerHTML = `<span>جاري تأمين الحساب...</span>`;

            // 5. التقاط الـ IP والموقع الجغرافي (Security Layer)
            let securityData = { ip: "127.0.0.1", location: "Hail, KSA" };
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                const geoData = await geoResponse.json();
                securityData.ip = geoData.ip;
                securityData.location = `${geoData.city}, ${geoData.country_name}`;
            } catch (err) { console.warn("Geo-fetch failed"); }

            try {
                // 6. التحقق من Firebase: هل الإيميل موجود مسبقاً؟
                const q = query(collection(db, "users"), where("email", "==", payloadData.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    showNotification("هذا الحساب مسجل لدينا بالفعل، جرب تسجيل الدخول.", "warning");
                    resetButton(registerBtn);
                    return;
                }

                // 7. حفظ البيانات في Firebase (النواة)
                await addDoc(collection(db, "users"), {
                    fullName: payloadData.fullName,
                    email: payloadData.email,
                    phone: payloadData.phone,
                    role: "client",
                    ip: securityData.ip,
                    location: securityData.location,
                    createdAt: new Date().toISOString()
                });

                // 8. إرسال إشعار لـ Make (اختياري للترحيب أو الأتمتة)
                const webhookUrl = 'YOUR_MAKE_WEBHOOK_URL';
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'new_registration',
                        payload: {
                            email: payloadData.email,
                            fullName: payloadData.fullName,
                            location: securityData.location
                        }
                    })
                });

                // 9. النجاح والتوجيه
                saveToStorage('pending_email', payloadData.email);
                showNotification("أهلاً بك في تيرا! تم إنشاء حسابك بنجاح ✅", "success");
                
                setTimeout(() => {
                    window.location.replace('../login/login.html');
                }, 1500);

            } catch (error) {
                console.error("[Registration Engine] Error:", error);
                attemptCount++;
                showNotification("حدث خطأ فني، يرجى المحاولة لاحقاً.", "error");
                resetButton(registerBtn);
            }
        });
    }

    function resetButton(btn) {
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        btn.innerHTML = `<span>إنشاء الحساب الاستثماري</span>`;
    }
});
