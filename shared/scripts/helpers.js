/**
 * وظائف مساعدة عامة (Helpers Engine) - منصة تيرا
 * النسخة النخبوية: محرك تبديل النصوص الصريح ومعالجة البيانات المالية
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
     * محرك تبديل رؤية كلمة المرور عبر (النص الصريح)
     * يضيف جملة "عرض كلمة المرور" بجانب العنوان ويتحكم في الحقل
     */
    setupPasswordVisibility: () => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            // 1. تثبيت النص التوضيحي داخل المربع
            input.setAttribute('placeholder', 'عرض كلمة المرور');

            // 2. البحث عن العنوان (Label) أو رأس المجموعة لإضافة زر النص
            const group = input.closest('.input-group');
            if (group && !group.querySelector('.toggle-password-text')) {
                // إنشاء حاوية العنوان إذا لم تكن موجودة بتنسيق Flex
                let header = group.querySelector('.input-header');
                if (!header) {
                    const label = group.querySelector('label');
                    header = document.createElement('div');
                    header.className = 'input-header';
                    header.style.display = 'flex';
                    header.style.justifyContent = 'space-between';
                    header.style.alignItems = 'center';
                    header.style.marginBottom = '8px';
                    
                    if (label) {
                        label.parentNode.insertBefore(header, label);
                        header.appendChild(label);
                    }
                }

                // 3. إضافة جملة "عرض كلمة المرور" كزر نصي
                const toggleBtn = document.createElement('span');
                toggleBtn.className = 'toggle-password-text';
                toggleBtn.innerText = 'عرض كلمة المرور';
                
                // تنسيق الزر النصي ليكون متوافقاً مع هوية تيرا السماوية
                Object.assign(toggleBtn.style, {
                    color: '#38bdf8',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: '0.3s'
                });

                header.appendChild(toggleBtn);

                // 4. حدث الضغط للتبديل بين (عرض / إخفاء)
                toggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    toggleBtn.innerText = isPassword ? 'إخفاء كلمة المرور' : 'عرض كلمة المرور';
                    
                    // تأثير نبض خفيف عند الضغط
                    toggleBtn.style.opacity = '0.5';
                    setTimeout(() => toggleBtn.style.opacity = '1', 100);
                });
            }
        });
    },

    /**
     * نسخ نص إلى الحافظة مع إشعار نجاح
     */
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            if (typeof Notify !== 'undefined') Notify.success('تم النسخ بنجاح');
            return true;
        } catch (err) { return false; }
    },

    isValidEmail: (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidSaudiPhone: (phone) => {
        return /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/.test(phone);
    },

    generateUID: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// تشغيل المحرك تلقائياً فور جاهزية الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Helpers.setupPasswordVisibility();
});
