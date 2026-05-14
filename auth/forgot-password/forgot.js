/**
 * =================================================================
 * محرك صفحة استعادة كلمة المرور (Enterprise Forgot Engine) - منصة تيرا
 * يدمج: تأمين الهوية، الفحص الاستباقي، وإدارة الجلسات المؤقتة
 * الميزة المضافة: التقاط الـ IP والموقع الجغرافي لتوثيق الإشعار الأمني
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    const forgotBtn = document.getElementById('forgotBtn');
    const emailInput = document.getElementById('email');

    // تتبع المحاولات المحلية كطبقة حماية أولية (Rate Limiter)
    let resetAttempts = 0;
    const maxAttempts = 3;

    // تنظيف أي جلسات استعادة سابقة عند فتح الصفحة لضمان أمان الجلسة
    if (typeof Storage !== 'undefined') {
        Storage.remove('temp_user');
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (resetAttempts >= maxAttempts) {
                if (typeof Notify !== 'undefined') {
                    Notify.error("تجاوزت الحد المسموح للمحاولات. يرجى المحاولة بعد قليل.");
                }
                return;
            }

            const email = emailInput ? emailInput.value.trim() : '';

            // 1. التحقق الاستباقي الصارم قبل إجهاد الخادم
            if (typeof Validation !== 'undefined' && !Validation.isEmail(email)) {
                if (typeof Notify !== 'undefined') Notify.error("يرجى إدخال بريد إلكتروني صحيح ومسجل.");
                highlightError(emailInput);
                return;
            }

            // 2. تفعيل وضع "جاري المعالجة" وتأمين الواجهة
            setLoadingState(forgotBtn, true);
            if (emailInput) emailInput.disabled = true;

            // 3. التقاط بصمة الجهاز والبيانات الجغرافية (Security Layer)
            let deviceMeta = { fingerprint: "unknown", browser: "unknown", os: "unknown" };
            let securityData = { ip: "غير متوفر", location: "غير متوفر" };

            if (typeof Helpers !== 'undefined' && typeof Helpers.generateDeviceFingerprint === 'function') {
                deviceMeta = Helpers.generateDeviceFingerprint();
            }

            try {
                // جلب الـ IP والموقع الجغرافي لحظياً لتغذية إشعار الأمان
                const geoResponse = await fetch('https://ipapi.co/json/');
                const geoData = await geoResponse.json();
                securityData.ip = geoData.ip || "غير متوفر";
                securityData.location = `${geoData.city || ''}, ${geoData.country_name || ''}`.replace(/^, | , $/g, '') || "غير متوفر";
            } catch (geoErr) {
                console.warn("[Security Engine] Geo-location fetch failed for Forgot:", geoErr);
            }

            try {
                // 4. إرسال الطلب لـ Make.com مع الأكشن المعتمد والبيانات الأمنية المكتملة
                const response = await API.post(API_CONFIG.BASE_URL, {
                    action: 'reset', // تم ضبطه ليتطابق مع الـ Switch في Make
                    payload: { 
                        email: email,
                        fullName: email.split('@')[0] // إرسال اسم تقريبي لتغذية الإيميل حتى إكمال التحقق
                    },
                    metadata: {
                        device_id: deviceMeta.fingerprint,
                        browser: deviceMeta.browser,
                        os: deviceMeta.os,
                        timestamp: new Date().toISOString(),
                        platform: typeof APP_INFO !== 'undefined' ? APP_INFO.NAME : 'Tera Investor Portal',
                        context: 'password_recovery',
                        // البيانات المضافة لتغذية الإيميل 👇
                        ip: securityData.ip,
                        location: securityData.location
                    }
                });

                // 5. معالجة الرد الذكي
                if (response && response.success) {
                    // تخزين بيانات الجلسة المؤقتة لصفحة الـ OTP
                    if (typeof Storage !== 'undefined') {
                        Storage.set('temp_user', { 
                            email: email, 
                            type: 'reset_password',
                            action: 'reset',
                            timestamp: Date.now()
                        });
                    }

                    if (typeof Notify !== 'undefined') {
                        Notify.success("تم إرسال كود التحقق (OTP) المشفر إلى وسيلة الاتصال المعتمدة.");
                    }
                    
                    // التوجيه السلس لصفحة التحقق
                    setTimeout(() => {
                        if (typeof ROUTES !== 'undefined' && ROUTES.VERIFY) {
                            window.location.replace(ROUTES.VERIFY);
                        } else {
                            window.location.replace('../verify-otp/verify.html');
                        }
                    }, 1500);

                } else {
                    resetAttempts++;
                    handleFailure(response?.message || "عذراً، تعذر إرسال رمز التحقق. يرجى المحاولة لاحقاً.");
                }

            } catch (error) {
                console.error("[Forgot Engine] Communication Error:", error);
                if (typeof Notify !== 'undefined') Notify.error("عذراً، حدث خطأ فني أثناء الاتصال بالخادم.");
                handleFailure();
            }
        });
    }

    /**
     * تفعيل/تعطيل حالة التحميل للزر
     */
    function setLoadingState(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('animate-pulse');
            btn.innerHTML = `
                <span class="flex-center gap-10">
                    <div class="spinner-small" style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: rotation 0.8s linear infinite;"></div>
                    <span>جاري فحص الأمان وإرسال الرمز...</span>
                </span>
            `;
        } else {
            btn.disabled =
