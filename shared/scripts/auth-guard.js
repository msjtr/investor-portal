/**
 * حارس الوصول الذكي (Auth Guard Engine) - منصة تيرا
 * يضمن أمن المسارات ويمنع الوصول غير المصرح به أو حلقات التوجيه اللانهائية
 */
const AuthGuard = {
    check() {
        try {
            const user = Storage.get('user_session'); // الجلسة النهائية بعد النجاح
            const tempUser = Storage.get('temp_user'); // المستخدم في مرحلة التحقق (OTP)
            const currentPath = window.location.pathname.toLowerCase();

            // 1. تعريف صفحات الدخول العامة (متاحة للجميع)
            const isAuthPage = currentPath.includes('/auth/login') || 
                               currentPath.includes('/auth/register') ||
                               currentPath.includes('/auth/forgot') ||
                               currentPath.includes('/auth/reset');

            const isVerifyPage = currentPath.includes('/auth/verify-otp');
            
            const isIndexPage = currentPath.endsWith('/') || 
                                currentPath.endsWith('/index.html');

            // 2. الحماية الأمنية: إذا حاول الدخول لصفحة التحقق وهو لم يسجل دخول أصلاً
            if (isVerifyPage && !tempUser && !user) {
                console.warn("[Auth Guard] وصول غير مصرح لصفحة التحقق.");
                window.location.replace(ROUTES.LOGIN);
                return;
            }

            // 3. منع الدخول للوحة التحكم (Dashboard) بدون جلسة نشطة
            // افترضنا أن أي مسار لا يشمل auth أو index هو مسار محمي
            const isProtectedRoute = !isAuthPage && !isVerifyPage && !isIndexPage;

            if (isProtectedRoute && !user) {
                console.warn("[Auth Guard] مسار محمي، جاري التوجيه لتسجيل الدخول.");
                window.location.replace(ROUTES.LOGIN);
                return;
            }

            // 4. إذا كان المستخدم مسجلاً بالفعل وحاول العودة لصفحات الدخول
            if (user && (isAuthPage || isVerifyPage)) {
                console.info("[Auth Guard] جلسة نشطة بالفعل، التوجيه للوحة التحكم.");
                // التوجيه للوحة التحكم مباشرة
                window.location.replace(ROUTES.DASHBOARD || '../../dashboard/index.html');
                return;
            }

        } catch (error) {
            console.error("Auth Guard Error:", error);
        }
    },

    // وظيفة تسجيل الخروج الآمن
    logout() {
        Storage.clearAll();
        console.log("[Auth Guard] تم تسجيل الخروج بنجاح.");
        window.location.replace(ROUTES.LOGIN);
    }
};

// تشغيل الفحص فوراً قبل تحميل محتوى الصفحة لضمان الأمن
(function() {
    AuthGuard.check();
})();
