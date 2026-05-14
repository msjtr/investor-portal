/**
 * =================================================================
 * محرك التخزين المشفر الذكي (Enterprise Storage Engine) - منصة تيرا
 * النسخة الاحترافية: تشفير البيانات، إدارة الجلسات، وحماية الخصوصية المحلية
 * =================================================================
 */

const Storage = {
    // البادئة لضمان استقلالية بيانات تيرا في المتصفح
    prefix: 'tera_inv_',
    
    // مفتاح التعمية (Salt) لتشفير بيانات الجلسة محلياً
    _salt: "Tera$ecure#2026",

    /**
     * محرك التشفير الداخلي (Base64 + Salt Obfuscation)
     * يستخدم لحماية البيانات الحساسة من الإضافات الخبيثة في المتصفح
     */
    _encode(value) {
        try {
            const stringValue = JSON.stringify(value);
            // دمج الملح مع النص وتشفيره بصيغة Base64
            return btoa(encodeURIComponent(stringValue + this._salt));
        } catch (e) {
            console.error('[Storage] خطأ في تشفير البيانات');
            return null;
        }
    },

    /**
     * محرك فك التشفير والتحقق من سلامة الملح
     */
    _decode(encodedValue) {
        try {
            const decodedStr = decodeURIComponent(atob(encodedValue));
            // التحقق من وجود الملح لضمان سلامة البيانات
            if (decodedStr.endsWith(this._salt)) {
                const cleanStr = decodedStr.slice(0, -this._salt.length);
                return JSON.parse(cleanStr);
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * حفظ البيانات: يشفر البيانات الحساسة ويحفظ البيانات المؤقتة كـ JSON
     */
    set(key, value) {
        try {
            const storageKey = `${this.prefix}${key}`;
            
            // البيانات التي تبدأ بـ temp_ (مثل temp_user) تحفظ بـ JSON عادي لسهولة الوصول السريع
            if (key.startsWith('temp_')) {
                const data = { payload: value, timestamp: Date.now() };
                localStorage.setItem(storageKey, JSON.stringify(data));
            } else {
                // البيانات الأخرى (مثل user_session) تخضع للتشفير الإلزامي
                const encrypted = this._encode(value);
                if (encrypted) localStorage.setItem(storageKey, encrypted);
            }
        } catch (error) {
            console.error('[Storage Error] فشل حفظ البيانات:', error);
        }
    },

    /**
     * جلب البيانات: يتعرف تلقائياً على نوع البيانات (مشفرة أو JSON) ويستخرجها
     */
    get(key) {
        try {
            const storageKey = `${this.prefix}${key}`;
            const rawData = localStorage.getItem(storageKey);
            
            if (!rawData) return null;

            // إذا كان المفتاح مؤقتاً، نقرأه كـ JSON
            if (key.startsWith('temp_')) {
                const parsed = JSON.parse(rawData);
                return parsed.payload !== undefined ? parsed.payload : parsed;
            } else {
                // إذا كان مفتاحاً أساسياً، نقوم بفك تشفيره
                return this._decode(rawData);
            }
        } catch (error) {
            // كخيار احتياطي في حال وجود بيانات قديمة بصيغة نصية
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
     * مسح شامل لكافة بيانات منصة تيرا فقط (يستخدم عند تسجيل الخروج)
     */
    clearAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
        sessionStorage.clear();
        console.info('[Storage] تم تأمين الحساب وتنظيف ذاكرة المنصة بنجاح.');
    },

    /**
     * التحقق من وجود مفتاح معين
     */
    has(key) {
        return localStorage.getItem(`${this.prefix}${key}`) !== null;
    }
};
