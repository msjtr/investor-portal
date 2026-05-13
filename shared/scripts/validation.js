/**
 * محرك التحقق من صحة البيانات (Terra Validation Engine)
 * النسخة المحدثة: معايير أمنية عالية ودعم المدخلات السعودية
 */
const Validation = {
    /**
     * التحقق من صيغة البريد الإلكتروني بدقة
     */
    isEmail: (email) => {
        if (!email) return false;
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase().trim());
    },
    
    /**
     * التحقق من رقم الجوال السعودي
     * يدعم الصيغ: 05XXXXXXXX أو 5XXXXXXXX
     */
    isSaudiPhone: (phone) => {
        if (!phone) return false;
        // يزيل المسافات أو الرموز الزائدة قبل الفحص
        const cleanPhone = phone.trim().replace(/[\s-]/g, '');
        const re = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        return re.test(cleanPhone);
    },
    
    /**
     * التحقق من قوة كلمة المرور (Security Level)
     * المعيار: 8 أحرف على الأقل، تتضمن رقم واحد وحرف واحد على الأقل
     */
    isStrongPassword: (password) => {
        if (!password) return false;
        // التحقق من الطول (8 أحرف) ووجود أرقام وحروف
        const hasNumber = /\d/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);
        const isLongEnough = password.length >= 8;
        
        return isLongEnough && hasNumber && hasLetter;
    },

    /**
     * التحقق من الاسم (يجب أن يكون اسمين على الأقل وبدون أرقام)
     */
    isValidName: (name) => {
        if (!name) return false;
        const cleanName = name.trim();
        // التحقق من وجود مسافة (اسمين) وعدم وجود أرقام
        const hasSpace = cleanName.includes(' ');
        const noNumbers = !/\d/.test(cleanName);
        return cleanName.length >= 3 && hasSpace && noNumbers;
    },

    /**
     * تنظيف المدخلات من الأكواد البرمجية (XSS Protection)
     */
    sanitize: (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/[<>]/g, '').trim();
    }
};
