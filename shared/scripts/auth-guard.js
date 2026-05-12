/**
 * حارس الوصول (Auth Guard)
 * يضمن أمن المسارات ويتحقق من وجود الجلسة
 */
const AuthGuard = {
    check() {
        const user = Storage.get('user_session');
        const currentPath = window.location.pathname;

        // إذا لم يكن مسجلاً ويحاول دخول صفحات غير صفحة الدخول/التسجيل
        if (!user && !currentPath.includes('/auth/')) {
            window.location.href = ROUTES.LOGIN;
        }

        // إذا كان مسجلاً ويحاول الدخول لصفحة "الدخول" أو "التسجيل" مجدداً
        if (user && currentPath.includes('/auth/')) {
            window.location.href = ROUTES.HOME;
        }
    },

    logout() {
        Storage.clearAll();
        window.location.href = ROUTES.LOGIN;
    }
};

// تشغيل الفحص فور تحميل الملف
AuthGuard.check();
