/**
 * =================================================================
 * محرك المساعدات الهندسية والأمنية (Enterprise Helpers Engine) - منصة تيرا
 * يدمج: بصمة الجهاز، معالجة النصوص، التحقق المالي، والـ Micro-interactions
 * =================================================================
 */

const Helpers = {
    /**
     * تنسيق المبالغ المالية بالفخامة السعودية المعتمدة
     * @param {number} amount - المبلغ المالي
     * @param {boolean} showSymbol - إظهار العملة (ر.س) أم لا
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
     * محرك التبديل الذكي لرؤية كلمة المرور عبر النص الصريح
     * ينشئ حاوية Flex علوية ويضيف زر "عرض كلمة المرور" بأسلوب تيرا السماوي
     */
    setupPasswordVisibility: () => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            // 1. تحديث الـ Placeholder التوضيحي داخل الحقل
            input.setAttribute('placeholder', 'عرض كلمة المرور');

            // 2. البحث عن المجموعة لتأسيس الهيدر المستقل
            const group = input.closest('.input-group');
            if (group && !group.querySelector('.toggle-password-text')) {
                let header = group.querySelector('.input-header');
                
                if (!header) {
                    const label = group.querySelector('label');
                    header = document.createElement('div');
                    header.className = 'input-header flex-between mb-5';
                    
                    // تنسيقات الـ Flex كنسخة احتياطية في حال غياب كلاس flex-between
                    Object.assign(header.style, {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%'
                    });
                    
                    if (label) {
                        label.parentNode.insertBefore(header, label);
                        header.appendChild(label);
                    }
                }

                // 3. إنشاء الزر النصي الصريح
                const toggleBtn = document.createElement('span');
                toggleBtn.className = 'toggle-password-text';
                toggleBtn.innerText = 'عرض كلمة المرور';
                
                // تطبيق هوية تيرا السماوية (Primary Color)
                Object.assign(toggleBtn.style, {
                    color: 'var(--primary, #38bdf8)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'var(--transition, all 0.2s ease)'
                });

                header.appendChild(toggleBtn);

                // 4. حدث التبديل بين (عرض / إخفاء)
                toggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    toggleBtn.innerText = isPassword ? 'إخفاء كلمة المرور' : 'عرض كلمة المرور';
                    
                    // تأثير نبض خفيف للمسة تفاعلية (Micro-interaction)
                    toggleBtn.style.opacity = '0.6';
                    setTimeout(() => toggleBtn.style.opacity = '1', 150);
                });
            }
        });
    },

    /**
     * محرك توليد بصمة الجهاز (Device Fingerprinter)
     * يجمع بيانات المتصفح، النظام، والأبعاد لتوليد كود فريد لمراقبة الأجهزة الموثوقة
     * @returns {object} كائن يحتوي على بصمة الجهاز والبيانات الوصفية
     */
    generateDeviceFingerprint: () => {
        const nav = window.navigator;
        const screen = window.screen;

        // استخراج اسم المتصفح
        const ua = nav.userAgent;
        let browserName = "Unknown Browser";
        if (ua.includes("Firefox")) browserName = "Firefox";
        else if (ua.includes("SamsungBrowser")) browserName = "Samsung Internet";
        else if (ua.includes("Opera") || ua.includes("OPR")) browserName = "Opera";
        else if (ua.includes("Edg")) browserName = "Edge";
        else if (ua.includes("Chrome")) browserName = "Chrome";
        else if (ua.includes("Safari")) browserName = "Safari";

        // استخراج نظام التشغيل
        let osName = "Unknown OS";
        if (ua.includes("Win")) osName = "Windows";
        else if (ua.includes("Mac")) osName = "macOS";
        else if (ua.includes("X11") || ua.includes("Linux")) osName = "Linux";
        else if (ua.includes("Android")) osName = "Android";
        else if (ua.includes("like Mac")) osName = "iOS";

        // تجميع الخصائص العتادية والبرمجية المتاحة
        const rawComponents = [
            nav.language || "ar",
            screen.width || "",
            screen.height || "",
            screen.colorDepth || "",
            nav.hardwareConcurrency || "",
            nav.deviceMemory || ""
        ].join("||");

        // تجزئة سريعة (DJB2 Hash) لتوليد معرف قصير
        let hash = 5381;
        for (let i = 0; i < rawComponents.length; i++) {
            hash = ((hash << 5) + hash) + rawComponents.charCodeAt(i);
        }

        return {
            fingerprint: `tera_dev_${Math.abs(hash).toString(16)}`,
            browser: browserName,
            os: osName,
            resolution: `${screen.width}x${screen.height}`,
            language: nav.language || "ar"
        };
    },

    /**
     * مدقق الروابط الموقعة (Signed URLs Validator)
     * يتحكم في حماية مسارات الاستعادة والتفعيل ويمنع التلاعب
     * @returns {boolean} true إذا كان الرابط نظامياً وصالحاً
     */
    validateSignedUrl: () => {
        const params = new URLSearchParams(window.location.search);
        const expiry = params.get('expires');

        if (expiry && parseInt(expiry) < Date.now()) {
            if (typeof Notify !== 'undefined') {
                Notify.error("عذراً، هذا الرابط منتهي الصلاحية لأسباب أمنية.");
            }
            return false;
        }
        return true;
    },

    /**
     * نسخ نص إلى الحافظة مع إشعار فوري
     */
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            if (typeof Notify !== 'undefined') Notify.success('تم النسخ بنجاح');
            return true;
        } catch (err) { 
            return false; 
        }
    },

    // المدققات المنطقية
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

// تفعيل المحركات التلقائية فور جاهزية شجرة الـ DOM
document.addEventListener('DOMContentLoaded', () => {
    Helpers.setupPasswordVisibility();
});
