/**
 * وظائف مساعدة عامة (Helpers Engine) - منصة تيرا
 * النسخة الاحترافية: تشمل محرك إظهار كلمة المرور ومعالجة البيانات
 */
const Helpers = {
    /**
     * تنسيق المبالغ المالية بالفخامة السعودية
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
     * محرك إظهار/إخفاء كلمة المرور (حل مشكلة اختفاء النص التوضيحي)
     * يبحث عن حقول كلمة المرور ويضيف لها ميزة التبديل ويجبر النص على الظهور
     */
    setupPasswordVisibility: () => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            // 1. إجبار النص التوضيحي برمجياً
            input.setAttribute('placeholder', 'عرض كلمة المرور');

            // 2. إضافة زر العين (Toggle) داخل الـ Wrapper
            const wrapper = input.closest('.input-wrapper');
            if (wrapper && !wrapper.querySelector('.password-toggle')) {
                const toggleBtn = document.createElement('span');
                toggleBtn.className = 'password-toggle';
                // نستخدم أيقونة العين من مكتبتنا (أو نص مؤقت)
                toggleBtn.innerHTML = Icons.eye || '👁️';
                
                // تنسيق الزر برمجياً لضمان المحاذاة
                Object.assign(toggleBtn.style, {
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#38bdf8',
                    zIndex: '10',
                    display: 'flex',
                    opacity: '0.6',
                    transition: '0.3s'
                });

                wrapper.appendChild(toggleBtn);

                // حدث الضغط لإظهار/إخفاء النص
                toggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    toggleBtn.style.opacity = isPassword ? '1' : '0.6';
                    // إعادة تأكيد الـ Placeholder عند التبديل
                    input.placeholder = "عرض كلمة المرور";
                });
            }
        });
    },

    /**
     * نسخ نص إلى الحافظة
     */
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            if (typeof Notify !== 'undefined') {
                Notify.success('تم النسخ إلى الحافظة');
            }
            return true;
        } catch (err) {
            return false;
        }
    },

    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    isValidSaudiPhone: (phone) => {
        const regex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        return regex.test(phone);
    },

    generateUID: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// تفعيل ميزة إظهار كلمة المرور تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Helpers.setupPasswordVisibility();
});
