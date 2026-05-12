/* * محرك التخزين الذكي (Abstraction Layer) 
 */
const Storage = {
    // حفظ البيانات مع تحويل التلقائي لـ JSON
    set(key, value) {
        const data = typeof value === 'object' ? JSON.stringify(value) : value;
        localStorage.setItem(`inv_portal_${key}`, data);
    },

    // جلب البيانات مع التحويل التلقائي لنوعها الأصلي
    get(key) {
        const data = localStorage.getItem(`inv_portal_${key}`);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    },

    // حذف عنصر محدد
    remove(key) {
        localStorage.removeItem(`inv_portal_${key}`);
    },

    // مسح ذاكرة المنصة بالكامل (عند تسجيل الخروج)
    clearAll() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('inv_portal_'))
            .forEach(key => localStorage.removeItem(key));
    }
};
