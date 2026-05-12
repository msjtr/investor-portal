/**
 * نظام الإشعارات المنبثقة الاحترافي (Toast Notifications)
 */
const Notify = {
    show: (message, type = 'success') => {
        // إنشاء عنصر الإشعار
        const toast = document.createElement('div');
        
        // تحديد اللون بناءً على نوع الإشعار (نجاح = أخضر، خطأ = أحمر)
        const bgColor = type === 'success' ? '#10b981' : '#ef4444';
        
        toast.innerText = message;
        
        // التنسيق الفخم للإشعار
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-20px)',
            backgroundColor: bgColor,
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            zIndex: '9999',
            fontFamily: 'Cairo, sans-serif',
            fontSize: '0.95rem',
            fontWeight: '600',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            opacity: '0',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(toast);

        // أنيميشن الظهور
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });

        // أنيميشن الاختفاء بعد 3 ثواني
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
