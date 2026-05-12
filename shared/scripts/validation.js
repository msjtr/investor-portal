/**
 * محرك التحقق من صحة البيانات (Validation Engine)
 */
const Validation = {
    // التحقق من صيغة البريد الإلكتروني
    isEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },
    
    // التحقق من رقم الجوال السعودي (يبدأ بـ 05 ويتكون من 10 أرقام)
    isSaudiPhone: (phone) => {
        const re = /^(05)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        return re.test(phone);
    },
    
    // التحقق من قوة كلمة المرور (8 أحرف على الأقل)
    isStrongPassword: (password) => {
        return password && password.length >= 8;
    }
};
