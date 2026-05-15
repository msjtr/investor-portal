/**
 * =================================================================
 * نظام الإشعارات المنبثقة الاحترافي (Terra Toast System)
 * نسخة الإنتاج الهجينة: تدعم الـ ES Modules والـ Script التقليدي معاً لمنع تعليق النواة
 * Path: investor-portal/shared/scripts/notifications.js
 * =================================================================
 */

/**
 * محرك بناء وعرض الإشعارات الذكية برمجياً داخل الـ DOM
 */
const renderToastNotification = (message, type = 'success') => {
    // 1. إنشاء حاوية الإشعار في الصفحة
    const toast = document.createElement('div');
    
    // 2. هندسة اختيار الأيقونة والألوان النيونية بناءً على الهوية البصرية لمنصة تِيرا
    let iconContent = '';
    let bgColor = '';
    let borderColor = '';
    let textColor = '#ffffff';

    // التحقق من توفر مكتبة الأيقونات الهجينة المحدثة في نافذة المتصفح
    const globalIcons = window.TerraIcons;

    switch (type) {
        case 'success':
            iconContent = globalIcons && globalIcons.success ? globalIcons.success : '✅';
            bgColor = 'rgba(6, 40, 32, 0.85)'; // أخضر عميق زجاجي
            borderColor = 'rgba(34, 197, 94, 0.3)';
            break;
        case 'error':
            iconContent = globalIcons && globalIcons.error ? globalIcons.error : '🚨';
            bgColor = 'rgba(43, 14, 21, 0.85)'; // أحمر عميق زجاجي
            borderColor = 'rgba(239, 68, 68, 0.3)';
            break;
        case 'warning':
            iconContent = globalIcons && globalIcons.warning ? globalIcons.warning : '⚠️';
            bgColor = 'rgba(45, 31, 12, 0.85)'; // ذهبي عميق زجاجي
            borderColor = 'rgba(245, 158, 11, 0.3)';
            break;
        default:
            iconContent = globalIcons && globalIcons.info ? globalIcons.info : 'ℹ️';
            bgColor = 'rgba(15, 32, 53, 0.85)'; // أزرق تيرا زجاجي
            borderColor = 'rgba(56, 189, 248, 0.3)';
    }

    // 3. بناء الهيكل الهيكلي وتضمين الأيقونة
    toast.innerHTML = `<span class="terra-toast-icon" style="display: flex; align-items: center; justify-content: center; margin-left: 10px;">${iconContent}</span>
                       <span class="terra-toast-text" style="line-height: 1.4;">${message}</span>`;

    // 4. التنسيق السيبراني المتقدم بنمط Glassmorphic الكامل
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        backgroundColor: bgColor,
        color: textColor,
        padding: '14px 24px',
        borderRadius: '12px',
        zIndex: '100000',
        fontFamily: "'Cairo', sans-serif",
        fontSize: '0.95rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        direction: 'rtl',
        backdropFilter: 'blur(15px)',
        webkitBackdropFilter: 'blur(15px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        opacity: '0',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        whiteSpace: 'nowrap',
        border: `1px solid ${borderColor}`
    });

    document.body.appendChild(toast);

    // 5. أنيميشن الانبثاق والظهور السلس
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });

    // 6. التدمير الذاتي الآمن للإشعار بعد انتهاء المدة الزمنية
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
};

// 1. تسجيل المحرك على النطاق العام للمتصفح (Window Scope) لحماية الملفات والنماذج التقليدية
window.showNotification = renderToastNotification;
window.Notify = {
    show: renderToastNotification,
    success: (msg) => renderToastNotification(msg, 'success'),
    error: (msg) => renderToastNotification(msg, 'error'),
    info: (msg) => renderToastNotification(msg, 'info'),
    warning: (msg) => renderToastNotification(msg, 'warning')
};

// 2. توفير التصدير الموديولي الصارم (Named Export) لحل خطأ core.js ومحركات الـ Auth فوراً
export { renderToastNotification as showNotification };
export const Notify = window.Notify;
