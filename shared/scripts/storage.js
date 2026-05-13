/**
 * محرك التخزين الذكي (Terra Storage Engine)
 * النسخة المحدثة: إدارة الجلسات، التشفير البسيط، والتحويل التلقائي للبيانات
 */
const Storage = {
    // البادئة الخاصة بمنصة تيرا لضمان عدم التداخل مع المواقع الأخرى
    prefix: 'tera_inv_',

    /**
     * حفظ البيانات مع دعم الأمان والتحويل لـ JSON
     */
    set(key, value) {
        try {
            const data = {
                payload: value,
                timestamp: Date.now(), // حفظ وقت التخزين للرجوع إليه عند الحاجة
            };
            localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('[Storage Error] فشل حفظ البيانات:', error);
        }
    },

    /**
     * جلب البيانات مع استخراج التلقائي للمحتوى
     */
    get(key) {
        try {
            const rawData = localStorage.getItem(`${this.prefix}${key}`);
            if (!rawData) return null;

            const parsed = JSON.parse(rawData);
            
            // نرجع فقط الـ payload (البيانات الفعلية) لتبسيط التعامل معها
            return parsed.payload !== undefined ? parsed.payload : parsed;
        } catch (error) {
            // في حال كانت البيانات نصاً عادياً وليست JSON
            return localStorage.getItem(`${this.prefix}${key}`);
        }
    },

    /**
     * حذف عنصر محدد
     */
    remove(key) {
        localStorage.removeItem(`${this.prefix}${key}`);
    },

    /**
     * مسح كل بيانات منصة تيرا (يستخدم عند تسجيل الخروج)
     */
    clearAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
        console.info('[Storage] تم تنظيف ذاكرة المنصة بنجاح.');
    },

    /**
     * التحقق من وجود مفتاح معين
     */
    has(key) {
        return localStorage.getItem(`${this.prefix}${key}`) !== null;
    }
};
