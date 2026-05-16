/**
 * =================================================================
 * حارس الوصول الذكي (Auth Guard Engine) - منصة تِيرا
 * النسخة المحدثة: حماية المسارات، التوجيه الديناميكي، ومنع حلقات الـ Loop
 * Path: investor-portal/shared/scripts/auth-guard.js
 * =================================================================
 */

const AuthGuard = {
    /**
     * استخراج المسار الأساسي لضمان عمل الروابط سواء على लोकल هوست أو GitHub Pages
     */
    getBasePath() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('/investor-portal') ? '/investor-portal' : '';
    },

    /**
     * جلب آمن للبيانات حتى لو تأخر تحميل ملف storage.js
     */
    safeGet(key) {
        try {
            // المحاولة الأولى عبر الكائن الهجين
            if (window.Storage && typeof window.Storage.get === 'function') {
                return window.Storage.get(key);
            }
            // المحاولة الثانية: قراءة مباشرة من الذاكرة المحلية (Fallback)
            const prefix = 'tera_inv_';
            const raw = localStorage.getItem(`${prefix}${key}`);
            if (!raw) return null;
            
            // البيانات المؤقتة (مثل pending_email) غير مشفرة
            if (key.startsWith('temp_') || key.startsWith('pending_')) {
                const parsed = JSON.parse(raw);
                return parsed.payload !== undefined ? parsed.payload : parsed;
            }
            return raw; // وجود الجلسة المشفرة كنص يكفي لمعرفة أن المستخدم مسجل دخول
        } catch (e) {
            return null;
        }
    },

    check() {
        try {
            const user = this.safeGet('user_session'); // الجلسة المعتمدة
            const pendingEmail = this.safeGet('pending_email'); // المستخدم في انتظار التحقق (OTP)
            const currentPath = window.location.pathname.toLowerCase();
            const basePath = this.getBasePath();

            // روابط التوجيه الديناميكية المعتمدة لتجنب أخطاء ROUTES المفقودة
            const LOGIN_URL = `${basePath}/auth/login/login.html`;
            const DASHBOARD_URL = `${basePath}/index.html`; // يتم تعديله لمسار لوحة التحكم الفعلي لاحقاً

            // 1. تحديد تصنيفات الصفحات بدقة
            const isAuthPage = ['/login', '/register', '/forgot', '/reset'].some(page => currentPath.includes(page));
            const isVerifyPage = currentPath.includes('/verify-otp');
            
            // نعتبر أي مسار داخل /account/ مساراً محمياً (يمكنك إضافة مسارات أخرى هنا)
            const isProtectedRoute = currentPath.includes('/account/'); 

            // 2. منطق الحماية لصفحة التحقق (OTP)
            if (isVerifyPage) {
                if (user) {
                    console.info("[Auth Guard] المستخدم مسجل بالفعل، توجيه للوحة التحكم.");
                    this.redirect(DASHBOARD_URL);
                    return;
                }
                if (!pendingEmail) {
                    console.warn("[Auth Guard] محاولة وصول غير شرعي لصفحة التحقق. تحويل للدخول.");
                    this.redirect(LOGIN_URL);
                    return;
                }
            }

            // 3. حماية المسارات المغلقة (لوحة التحكم والملفات الشخصية)
            if (isProtectedRoute && !user) {
                console.warn("[Auth Guard] وصول مرفوض لمسار محمي. تحويل للدخول.");
                this.redirect(LOGIN_URL);
                return;
            }

            // 4. منع الازدواجية: إذا كان المستخدم مسجلاً وحاول فتح اللوجن أو التسجيل
            if (user && isAuthPage) {
                console.info("[Auth Guard] الجلسة نشطة مسبقاً، تحويل للوحة التحكم.");
                this.redirect(DASHBOARD_URL);
                return;
            }

        } catch (error) {
            console.error("[Auth Guard] Critical Error:", error);
        }
    },

    // محرك التوجيه الآمن لمنع دوامة التعليق (Infinite Loop)
    redirect(path) {
        if (!path) return;
        // التأكد من عدم إعادة التوجيه لنفس الصفحة الحالية
        const currentUrl = window.location.href.split('?')[0]; // تجاهل البرامترات
        const targetUrl = new URL(path, window.location.origin).href.split('?')[0];
        
        if (currentUrl !== targetUrl) {
            window.location.replace(path);
        }
    },

    // تسجيل الخروج وتنظيف الذاكرة
    logout() {
        try {
            if (window.Storage && typeof window.Storage.clearAll === 'function') {
                window.Storage.clearAll();
            } else {
                localStorage.clear();
                sessionStorage.clear();
            }
        } catch (e) { }
        
        console.info("🛡️ [Auth Guard] تم إنهاء الجلسة وتطهير الذاكرة بنجاح.");
        const basePath = this.getBasePath();
        window.location.replace(`${basePath}/auth/login/login.html`);
    }
};

// التنفيذ الفوري والصارم قبل رندر الصفحة
(function() {
    AuthGuard.check();
})();
