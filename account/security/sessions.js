/**
 * محرك الأمان وإدارة الجلسات (Enterprise Sessions Engine) - منصة تيرا
 * جلب الأجهزة النشطة، إنهاء جلسة معينة، وإنهاء جميع الجلسات (Revoke All)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. حماية المسار: التأكد من تسجيل دخول المستثمر وتوفر الـ Token
    const userSession = Storage.get('user_session');
    if (!userSession || !userSession.token) {
        Notify.error("جلستك غير صالحة. يرجى تسجيل الدخول مجدداً.");
        window.location.replace('../../auth/login/login.html');
        return;
    }

    const sessionsContainer = document.getElementById('sessionsContainer');
    const revokeAllBtn = document.getElementById('revokeAllBtn');

    // 2. دالة جلب الجلسات من الخادم وبناء القائمة ديناميكياً
    async function loadSessions() {
        try {
            // إظهار حالة تحميل (Skeleton)
            if (sessionsContainer) {
                sessionsContainer.style.opacity = '0.5';
            }

            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'get_sessions',
                payload: { user_id: userSession.id },
                token: userSession.token
            });

            if (response && response.success && response.sessions) {
                renderSessions(response.sessions);
            } else {
                // في حال عدم توفر ربط فعلي، نترك البيانات التجريبية المعروضة في الـ HTML كعرض أولي
                console.warn("[Sessions Engine] تعذر جلب الجلسات الحية، يتم عرض البيانات الافتراضية.");
            }
        } catch (error) {
            console.error("[Sessions Engine] Error:", error);
            Notify.error("حدث خطأ أثناء الاتصال بخادم الأمان.");
        } finally {
            if (sessionsContainer) {
                sessionsContainer.style.opacity = '1';
            }
        }
    }

    // دالة مساعدة لرسم البطاقات
    function renderSessions(sessionsList) {
        sessionsContainer.innerHTML = ''; // تفريغ القائمة
        
        sessionsList.forEach(sess => {
            const isCurrent = sess.is_current_device;
            const card = document.createElement('div');
            card.className = `device-item flex-between p-15 ${isCurrent ? 'current-device' : ''}`;
            
            // تحديد الأيقونة المناسبة
            const iconName = sess.device_type === 'mobile' ? 'phone' : 'desktop';
            
            card.innerHTML = `
                <div class="device-info flex-center gap-15">
                    <div class="device-icon-wrapper ${isCurrent ? 'active' : ''}">
                        <span data-icon="${iconName}"></span>
                    </div>
                    <div class="device-meta">
                        <div class="flex-center gap-5">
                            <span class="text-white font-bold text-sm">${sess.browser} — ${sess.os}</span>
                            ${isCurrent ? '<span class="badge-active">الجهاز الحالي</span>' : ''}
                        </div>
                        <span class="text-dim text-xs block mt-5">${sess.location} | IP: ${sess.ip_address}</span>
                        <span class="text-xs block mt-2 ${isCurrent ? 'text-primary' : 'text-dim'}">
                            ${isCurrent ? 'نشط الآن' : `آخر ظهور: ${sess.last_active}`}
                        </span>
                    </div>
                </div>
                ${!isCurrent ? `
                    <button class="btn-revoke-icon" data-session-id="${sess.session_id}" title="إنهاء هذه الجلسة">
                        <span data-icon="trash"></span>
                    </button>
                ` : ''}
            `;
            sessionsContainer.appendChild(card);
        });

        // تفعيل أزرار الحذف الفردية
        bindRevokeButtons();
    }

    // 3. ربط أزرار إنهاء الجلسة الفردية
    function bindRevokeButtons() {
        const revokeBtns = document.querySelectorAll('.btn-revoke-icon');
        revokeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sessionId = btn.getAttribute('data-session-id');
                // تأكيد بسيط قبل الحذف
                if (confirm("هل أنت متأكد من رغبتك في تسجيل خروج هذا الجهاز؟")) {
                    await revokeSession(sessionId, btn.closest('.device-item'));
                }
            });
        });
    }

    async function revokeSession(sessionId, cardElement) {
        try {
            cardElement.style.opacity = '0.3';
            const response = await API.post(API_CONFIG.BASE_URL, {
                action: 'revoke_session',
                payload: { session_id: sessionId, user_id: userSession.id },
                token: userSession.token
            });

            if (response && response.success) {
                Notify.success("تم إنهاء الجلسة بنجاح.");
                cardElement.remove(); // إزالة البطاقة من الشاشة فوراً
            } else {
                Notify.error("تعذر إنهاء الجلسة، حاول مجدداً.");
                cardElement.style.opacity = '1';
            }
        } catch (error) {
            Notify.error("خطأ في الاتصال بالخادم.");
            cardElement.style.opacity = '1';
        }
    }

    // 4. زر الخطر الأكبر: إنهاء جميع الجلسات الأخرى (Revoke All)
    if (revokeAllBtn) {
        revokeAllBtn.addEventListener('click', async () => {
            if (confirm("تنبيه أمني: سيتم تسجيل خروج حسابك من كافة الأجهزة والمتصفحات الأخرى فوراً. هل تريد الاستمرار؟")) {
                revokeAllBtn.disabled = true;
                revokeAllBtn.innerHTML = `<span>جاري الإنهاء...</span>`;

                try {
                    const response = await API.post(API_CONFIG.BASE_URL, {
                        action: 'revoke_all_sessions',
                        payload: { user_id: userSession.id },
                        token: userSession.token
                    });

                    if (response && response.success) {
                        Notify.success("تم تأمين الحساب وإنهاء جميع الجلسات الأخرى بنجاح.");
                        // إعادة تحميل الصفحة لتحديث القائمة ليتبقى الجهاز الحالي فقط
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        Notify.error("تعذر إكمال العملية، يرجى المحاولة لاحقاً.");
                        revokeAllBtn.disabled = false;
                        revokeAllBtn.innerHTML = `<span>إنهاء جميع الجلسات الأخرى</span>`;
                    }
                } catch (error) {
                    Notify.error("حدث خطأ فني أثناء الاتصال.");
                    revokeAllBtn.disabled = false;
                    revokeAllBtn.innerHTML = `<span>إنهاء جميع الجلسات الأخرى</span>`;
                }
            }
        });
    }

    // تشغيل التحميل الأولي عند فتح الصفحة
    loadSessions();
});
