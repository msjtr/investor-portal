/**
 * وظائف مساعدة عامة (Helpers)
 */
const Helpers = {
    // تنسيق المبالغ المالية (مثال: 1500.50 -> 1,500.50 ر.س)
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('ar-SA', { 
            style: 'currency', 
            currency: 'SAR' 
        }).format(amount);
    },
    
    // نسخ نص إلى الحافظة (لنسخ الأكواد أو الروابط)
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            if (typeof Notify !== 'undefined') {
                Notify.show('تم النسخ بنجاح');
            }
        } catch (err) {
            console.error('فشل النسخ: ', err);
        }
    }
};
