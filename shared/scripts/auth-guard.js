/**
 * حارس الوصول الذكي (Auth Guard Engine) - منصة تيرا
 * النسخة المحدثة: حماية المسارات، إدارة الجلسات، ومنع حلقات التوجيه.
 */
const AuthGuard = {
    check() {
        try {
            const user = Storage.get('user_session'); // الجلسة المعتمدة
            const tempUser = Storage.get('temp_user'); // المستخدم في انتظار التحقق
            const currentPath = window.location.pathname.toLowerCase();

            // 1. تحديد تصنيفات الصفحات بدقة
            const isAuthPage = ['login', 'register', 'forgot', 'reset'].some(page => currentPath.includes(page));
            const isVerifyPage = currentPath.includes('verify-otp');
            const isIndexPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html');

            // 2. منطق الحماية لصفحة التحقق (OTP)
            // لا يسمح بدخولها إلا لمن لديه جلسة مؤقتة (سجل بياناته للتو) ولم يكمل التفعيل بعد
            if (isVerifyPage) {
                if (user) {
                    // إذا كان مسجلاً أصلاً، يذهب للوحة التحكم
                    this.redirect(ROUTES.DASHBOARD || '../../dashboard/index.html');
                    return;
                }
                if (!tempUser) {
                    // إذا حاول الدخول مباشرة بدون بريد مؤقت، يطرد للوجن
                    console.warn("[Auth Guard] محاولة وصول غير شرعي لصفحة التحقق.");
                    this.redirect(ROUTES.LOGIN);
                    return;
                }
            }

            // 3. حماية المسارات المغلقة (لوحة التحكم والملف الشخصي)
            // أي مسار ليس صفحة دخول أو صفحة رئيسية يعتبر مساراً محمياً
            const isProtectedRoute = !isAuthPage && !isVerifyPage && !isIndexPage;

            if (isProtectedRoute && !user) {
                console.warn("[Auth Guard] وصول مرفوض لمسار محمي.");
                this.redirect(ROUTES.LOGIN);
                return;
            }

            // 4. منع الازدواجية: إذا كان المستخدم مسجلاً وحاول فتح اللوجن أو التسجيل
            if (user && isAuthPage) {
                console.info("[Auth Guard] المستخدم مسجل بالفعل، تحويل للوحة التحكم.");
                this.redirect(ROUTES.DASHBOARD || '../../dashboard/index.html');
                return;
            }

        } catch (error) {
            console.error("Auth Guard Critical Error:", error);
        }
    },

    // محرك التوجيه الآمن لمنع التعليق
    redirect(path) {
        if (!path) return;
        // التأكد من عدم إعادة التوجيه لنفس الصفحة الحالية لتجنب الـ Loop
        if (window.location.href !== new URL(path, window.location.origin).href) {
            window.location.replace(path);
        }
    },

    // تسجيل الخروج وتنظيف الذاكرة
    logout() {
        Storage.clearAll();
        console.log("[Auth Guard] تم إنهاء الجلسة.");
        window.location.replace(ROUTES.LOGIN);
    }
};

// التنفيذ الفوري قبل رندر الصفحة لضمان أقصى درجات الأمان
(function() {
    AuthGuard.check();
})();
