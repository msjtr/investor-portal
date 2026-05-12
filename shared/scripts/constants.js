/* المسارات المركزية والروابط الثابتة - متوافق مع GitHub Pages */
const ROUTES = {
    HOME: "/investor-portal/index.html",
    LOGIN: "/investor-portal/auth/login/login.html",
    REGISTER: "/investor-portal/auth/register/register.html",
    VERIFY: "/investor-portal/auth/verify-otp/verify.html",
    FORGOT: "/investor-portal/auth/forgot-password/forgot.html",
    RESET: "/investor-portal/auth/reset-password/reset.html"
};

/* الأصول والصور المركزية (Absolute URLs لضمان الاستقرار ومنع 404) */
const ASSETS = {
    LOGO: "https://msjtr.github.io/investor-portal/assets/images/logo.svg",
    FAVICON: "https://msjtr.github.io/investor-portal/assets/images/favicon.svg",
    AUTH_BG: "https://msjtr.github.io/investor-portal/assets/images/auth-bg.webp",
    SHARE_THUMB: "https://msjtr.github.io/investor-portal/assets/images/share-thumb.png"
};

const API_CONFIG = {
    BASE_URL: "https://hook.eu1.make.com/4ityw5er8v5ps0ab9gxqojxh5zsitoz5",
    TIMEOUT: 10000, // 10 ثواني
    RETRY_COUNT: 3
};

const APP_INFO = {
    NAME: "بوابة المستثمرين",
    VERSION: "1.0.0"
};
