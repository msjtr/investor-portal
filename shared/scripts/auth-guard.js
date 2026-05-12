/**
 * حارس الوصول الذكي (Auth Guard Engine)
 * يضمن أمن المسارات ويمنع حدوث حلقات التوجيه اللانهائية (Redirect Loops)
 */
const AuthGuard = {
    check() {
        try {
            const user = Storage.get('user_session');
            const currentPath = window.location.pathname.toLowerCase();

            // 1. تحديد ما إذا كانت الصفحة الحالية عامة (مسموحة للزوار غير المسجلين)
            const isAuthPage = currentPath.includes('/auth/login') || 
                               currentPath.includes('/auth/register') ||
                               currentPath.includes('/auth/forgot') ||
                               currentPath.includes('/auth/reset');

            const isIndexPage = currentPath.endsWith('/') || 
                                currentPath.endsWith('/index.html');

            // 2. إذا كانت الصفحة محمية (مثل الداشبورد) والمستخدم غير مسجل -> اطرده للوجن
            if (!user && !isAuthPage && !isIndexPage) {
                console.warn("[Auth Guard] مسار محمي، جاري التوجيه لتسجيل الدخول.");
                window.location.replace(ROUTES.LOGIN);
                return;
            }

            // 3. إذا كان المستخدم مسجلاً وحاول فتح اللوجن أو التسجيل مجدداً -> اطرده للرئيسية/الداشبورد
            if (user && isAuthPage) {
                console.info("[Auth Guard] جلسة نشطة بالفعل، جاري التوجيه.");
                // ملاحظة: يتم التوجيه لـ ROUTES.HOME حالياً، وتستبدل بـ ROUTES.DASHBOARD لاحقاً
                window.location.replace(ROUTES.HOME);
                return;
            }

        } catch (error) {
            console.error("Auth Guard Check Error:", error);
        }
    },

    logout() {
        Storage.clearAll();
        window.location.replace(ROUTES.LOGIN);
    }
};

// تشغيل الفحص بأمان بعد اكتمال تحميل شجرة المتصفح (DOM)
window.addEventListener('DOMContentLoaded', () => {
    AuthGuard.check();
});
