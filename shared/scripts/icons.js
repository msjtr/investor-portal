/**
 * المخزن المركزي لأيقونات المنصة (Central Icons Library)
 */
const Icons = {
    // أيقونة البريد الإلكتروني
    email: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    
    // أيقونة القفل (كلمة المرور)
    lock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    
    // أيقونة المستخدم (الاسم)
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    
    // أيقونة الجوال (رقم الهاتف)
    phone: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
    
    // أيقونة الرجوع / الإغلاق
    close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>`
};

// المحرك الذكي لزرع الأيقونات تلقائياً في الصفحات
document.addEventListener('DOMContentLoaded', () => {
    const iconElements = document.querySelectorAll('[data-icon]');
    
    iconElements.forEach(el => {
        const iconName = el.getAttribute('data-icon');
        if (Icons[iconName]) {
            el.innerHTML = Icons[iconName];
        } else {
            console.warn(`تحذير: الأيقونة "${iconName}" غير موجودة في ملف icons.js`);
        }
    });
});
