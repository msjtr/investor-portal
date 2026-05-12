/**
 * محرك طلبات الـ API الموحد 
 * يتعامل مع الإرسال، الاستقبال، والأخطاء بذكاء ومرونة
 */
const API = {
    async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`خطأ في السيرفر: ${response.status}`);
            }

            // 1. قراءة الرد كنص خام أولاً لتجنب أخطاء التحويل المباشر
            const responseText = await response.text();

            // 2. محاولة تحويل النص إلى JSON إن أمكن
            try {
                return JSON.parse(responseText);
            } catch (jsonError) {
                // 3. معالجة ذكية لرد Make.com الافتراضي (Accepted)
                if (responseText.trim() === "Accepted") {
                    return { success: true, message: "تمت العملية بنجاح (Accepted)" };
                }
                // في حال رجع نص آخر غير الـ JSON
                return { success: true, message: responseText };
            }
        } catch (error) {
            console.error("API Fetch Error:", error);
            // هنا سيتم استدعاء نظام الإشعارات لاحقاً
            throw error;
        }
    }
};
