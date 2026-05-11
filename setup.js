const fs = require('fs');
const path = require('path');

// 1. تحديد المجلدات الرئيسية والفرعية
const directories = [
    'assets/images', 'assets/icons', 'assets/logos', 'assets/fonts',
    'styles', 'js', 'components', 'mock-data',
    'pages/auth',
    // مجلدات العميل
    'pages/client/dashboard', 'pages/client/investments', 'pages/client/opportunities', 
    'pages/client/profits', 'pages/client/withdraw', 'pages/client/notifications', 'pages/client/settings',
    // مجلدات الإدارة
    'pages/admin/dashboard', 'pages/admin/users', 'pages/admin/opportunities', 
    'pages/admin/profits', 'pages/admin/withdraw-requests', 'pages/admin/notifications', 'pages/admin/settings'
];

// 2. تحديد الملفات الفردية الأساسية
const files = [
    'index.html',
    'README.md',
    'styles/global.css',
    'styles/layout.css',
    'styles/components.css',
    'js/app.js',
    'js/auth.js',
    'js/router.js',
    'js/api.js',
    'js/utils.js',
    'components/header.html',
    'components/sidebar-admin.html',
    'components/sidebar-client.html',
    'pages/auth/login.html',
    'pages/auth/forgot-password.html',
    'pages/auth/auth.css',
    'mock-data/users.json',
    'mock-data/investments.json',
    'mock-data/opportunities.json'
];

// 3. التوليد التلقائي لملفات الصفحات (HTML, CSS, JS) لكل قسم لتقليل الكتابة
const clientSections = ['dashboard', 'investments', 'opportunities', 'profits', 'withdraw', 'notifications', 'settings'];
clientSections.forEach(sec => {
    files.push(`pages/client/${sec}/index.html`, `pages/client/${sec}/${sec}.css`, `pages/client/${sec}/${sec}.js`);
});

const adminSections = ['dashboard', 'users', 'opportunities', 'profits', 'withdraw-requests', 'notifications', 'settings'];
adminSections.forEach(sec => {
    files.push(`pages/admin/${sec}/index.html`, `pages/admin/${sec}/${sec}.css`, `pages/admin/${sec}/${sec}.js`);
});

// -- تنفيذ أوامر الإنشاء --

// إنشاء المجلدات
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ تم إنشاء المجلد: ${dir}`);
    }
});

// إنشاء الملفات
files.forEach(file => {
    if (!fs.existsSync(file)) {
        // إذا كان الملف users.json نضع فيه مصفوفة فارغة لتجنب أخطاء الـ JSON
        const content = file.endsWith('.json') ? '[]' : '';
        fs.writeFileSync(file, content, 'utf8');
        console.log(`📄 تم إنشاء الملف: ${file}`);
    }
});

console.log('🚀 تم بناء هيكل المشروع بنجاح!');
