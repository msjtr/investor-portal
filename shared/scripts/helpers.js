/**
 * وظائف مساعدة عامة (Helpers Engine) - منصة تيرا
 * النسخة المحدثة: معالجة مالية دقيقة، نسخ ذكي، والتحقق من البيانات
 */
const Helpers = {
    /**
     * تنسيق المبالغ المالية بالفخامة السعودية (مثال: 1,500.50 ر.س)
     */
    formatCurrency: (amount, showSymbol = true) => {
        if (amount === undefined || amount === null) return '0.00';
        
        return new Intl.NumberFormat('ar-SA', {
            style: showSymbol ? 'currency' : 'decimal',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * نسخ نص إلى الحافظة مع إشعار تفاعلي
     */
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            // إذا كان نظام التنبيهات موجوداً، نرسل إشعار نجاح
            if (typeof Notify !== 'undefined') {
                Notify.success('تم النسخ إلى الحافظة');
            } else {
                console.log('%c [Helpers] تم النسخ بنجاح: ' + text, 'color: #38bdf8; font-weight: bold;');
            }
            return true;
        } catch (err) {
            console.error('[Helpers] فشل النسخ: ', err);
            return false;
        }
    },

    /**
     * التحقق من صحة البريد الإلكتروني (Regex)
     */
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * التحقق من رقم الجوال السعودي (يبدأ بـ 05 أو 5 ويحتوي على 9-10 أرقام)
     */
    isValidSaudiPhone: (phone) => {
        const regex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        return regex.test(phone);
    },

    /**
     * توليد معرف فريد (للاستخدام في العمليات المؤقتة)
     */
    generateUID: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};
