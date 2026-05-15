/**
 * =================================================================
 * محرك التخزين المشفر الذكي (Enterprise Storage Engine) - منصة تِيرا
 * النسخة الاحترافية المحدثة: دعم التصدير الموديولي الشامل لتأمين الجلسات
 * Path: investor-portal/shared/scripts/storage.js
 * =================================================================
 */

// البادئة لضمان استقلالية بيانات تيرا في المتصفح
const prefix = 'tera_inv_';

// مفتاح التعمية (Salt) لتشفير بيانات الجلسة محلياً لمنع الإضافات الخبيثة
const _salt = "Tera$ecure#2026";

/**
 * محرك التشفير الداخلي (Base64 + Salt Obfuscation)
 */
function _encode(value) {
    try {
        const stringValue = JSON.stringify(value);
        return btoa(encodeURIComponent(stringValue + _salt));
    } catch (e) {
        console.error('[Storage Obfuscation] خطأ في تشفير البيانات الحساسة');
        return null;
    }
}

/**
 * محرك فك التشفير والتحقق من سلامة الملح والأمان الرقمي
 */
function _decode(encodedValue) {
    try {
        const decodedStr = decodeURIComponent(atob(encodedValue));
        if (decodedStr.endsWith(_salt)) {
            const cleanStr = decodedStr.slice(0, -_salt.length);
            return JSON.parse(cleanStr);
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * حفظ البيانات: يشفر البيانات الحساسة ويحفظ البيانات المؤقتة كـ JSON
 * متوافق مع الاستدعاء المباشر برمجياً في النواة والمحركات
 */
export function saveToStorage(key, value) {
    try {
        const storageKey = `${prefix}${key}`;
        
        // معالجة مرنة للبيانات المؤقتة أو المعلقة (temp أو pending) لتوفير سرعة وصول
        if (key.startsWith('temp_') || key.startsWith('pending_') || key === 'auth_mode') {
            const data = { payload: value, timestamp: Date.now() };
            localStorage.setItem(storageKey, JSON.stringify(data));
        } else {
            // البيانات الحساسة (مثل user_session) تخضع للتشفير الإلزامي الفوري
            const encrypted = _encode(value);
            if (encrypted) localStorage.setItem(storageKey, encrypted);
        }
    } catch (error) {
        console.error('[Storage Error] فشل حفظ البيانات في المستودع المحلي:', error);
    }
}

/**
 * جلب البيانات: يتعرف تلقائياً على نوع البيانات (مشفرة أو JSON) ويستخرجها بنجاح
 */
export function getFromStorage(key) {
    try {
        const storageKey = `${prefix}${key}`;
        const rawData = localStorage.getItem(storageKey);
        
        if (!rawData) return null;

        if (key.startsWith('temp_') || key.startsWith('pending_') || key === 'auth_mode') {
            const parsed = JSON.parse(rawData);
            return parsed.payload !== undefined ? parsed.payload : parsed;
        } else {
            return _decode(rawData);
        }
    } catch (error) {
        return localStorage.getItem(`${prefix}${key}`);
    }
}

/**
 * حذف عنصر محدد من الذاكرة المحلية
 */
export function removeFromStorage(key) {
    localStorage.removeItem(`${prefix}${key}`);
}

/**
 * مسح شامل لكافة بيانات منصة تيرا فقط عند تسجيل الخروج أو حدوث اختراق طارئ
 */
export function clearAllStorage() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
        }
    });
    sessionStorage.clear();
    console.info('[Storage Security] تم تأمين وتطهير ذاكرة الحساب التخزينية بنجاح.');
}

/**
 * التحقق الاستباقي من وجود المفتاح في المتصفح
 */
export function hasInStorage(key) {
    return localStorage.getItem(`${prefix}${key}`) !== null;
}

// تصدير كائن موحد كخيار احتياطي لدعم الأنظمة القديمة المستدعاة بنمط الكائنات
export const Storage = {
    set: saveToStorage,
    get: getFromStorage,
    remove: removeFromStorage,
    clearAll: clearAllStorage,
    has: hasInStorage,
    prefix: prefix
};
