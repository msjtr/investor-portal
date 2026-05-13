/**
 * نظام الإشعارات المنبثقة الاحترافي (Terra Toast System)
 * النسخة المحدثة: دعم الأيقونات، التصميم الزجاجي، وإدارة الطوابير
 */
const Notify = {
    /**
     * عرض إشعار ذكي
     * @param {string} message - نص الرسالة
     * @param {string} type - نوع الإشعار (success, error, info)
     */
    show(message, type = 'success') {
        // 1. إنشاء حاوية الإشعار
        const toast = document.createElement('div');
        
        // 2. اختيار الأيقونة واللون بناءً على النوع
        let icon = '';
        let bgColor = '';
        
        switch (type) {
            case 'success':
                icon = `<span style="margin-left:10px; display:flex;">${Icons.check || '✓'}</span>`;
                bgColor = 'rgba(16, 185, 129, 0.9)'; // أخضر زجاجي
                break;
            case 'error':
                icon = `<span style="margin-left:10px; display:flex;">${Icons.info || '✕'}</span>`;
                bgColor = 'rgba(239, 68, 68, 0.9)'; // أحمر زجاجي
                break;
            default:
                icon = `<span style="margin-left:10px; display:flex;">${Icons.info || 'i'}</span>`;
                bgColor = 'rgba(56, 189, 248, 0.9)'; // سماوي زجاجي
        }

        // 3. بناء محتوى الإشعار
        toast.innerHTML = `${icon}<span>${message}</span>`;

        // 4. التنسيق الفخم المتوافق مع هوية تيرا
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px', /* تغيير المكان للأسفل لراحة العين */
            left: '50%',
            transform: 'translateX(-50%) translateY(20px)',
            backgroundColor: bgColor,
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '16px',
            zIndex: '10000',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '1rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            opacity: '0',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        });

        document.body.appendChild(toast);

        // 5. أنيميشن الظهور (Spring Effect)
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });

        // 6. الاختفاء التلقائي بعد 4 ثوانٍ
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    },

    // وظائف اختصار للسهولة
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
};
