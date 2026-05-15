/**
 * =================================================================
 * محرك التدقيق والتحقق الصارم (Enterprise Validation Engine) - منصة تِيرا
 * نسخة الإنتاج الهجينة: تدعم الـ ES Modules والـ Script التقليدي معاً لمنع تعليق النواة
 * Path: investor-portal/shared/scripts/validation.js
 * =================================================================
 */

/**
 * التحقق الاستباقي الصارم من صيغة البريد الإلكتروني بدقة
 */
const checkEmail = (email) => {
    if (!email) return false;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase().trim());
};

/**
 * التحقق من رقم الجوال السعودي
 * يدعم الصيغ: 05XXXXXXXX أو 5XXXXXXXX مع التحقق من مشغلي الاتصالات
 */
const checkSaudiPhone = (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const re = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    return re.test(cleanPhone);
};

/**
 * التحقق من الاسم الكامل (يجب أن يكون اسمين على الأقل وبدون أرقام)
 */
const checkName = (name) => {
    if (!name) return false;
    const cleanName = name.trim();
    const hasSpace = cleanName.includes(' ');
    const noNumbers = !/\d/.test(cleanName);
    return cleanName.length >= 3 && hasSpace && noNumbers;
};

/**
 * التحقق من قوة كلمة المرور (Security Level)
 */
const checkStrongPassword = (password) => {
    if (!password) return false;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const isLongEnough = password.length >= 8;
    return isLongEnough && hasNumber && hasLetter;
};

/**
 * تنظيف المدخلات من الأكواد البرمجية الخبيثة (XSS Protection)
 */
const sanitizeInput = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/[<>]/g, '').trim();
};

// 1. تسجيل المحرك بكامل وظائفه ومسمياته على النطاق العام (Window Scope) لحماية الملفات التقليدية
window.validateEmail = checkEmail;
window.validateSaudiPhone = checkSaudiPhone;
window.validateName = checkName;

window.Validation = {
    isEmail: checkEmail,
    isSaudiPhone: checkSaudiPhone,
    isStrongPassword: checkStrongPassword,
    isValidName: checkName,
    sanitize: sanitizeInput
};

// 2. توفير التصدير الموديولي الصارم (Named Exports) الذي تبحث عنه النواة ومحركات الـ Auth حالياً
export { checkEmail as validateEmail };
export { checkSaudiPhone as validateSaudiPhone };
export { checkName as validateName };
export { checkStrongPassword as isStrongPassword };
export { sanitizeInput as sanitize };

// التصدير الافتراضي الاحتياطي للكائن بالأسلوب القديم
export default window.Validation;
