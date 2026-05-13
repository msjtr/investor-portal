/**
 * المحرك المركزي للاتصال بالخادم (API Engine) - منصة تيرا
 * النسخة المحدثة: معالجة ذكية لردود Make.com، إدارة الوقت (Timeout)، ودعم الأمان.
 */
const API = {
    /**
     * إرسال طلب POST مع معالجة الأخطاء المتقدمة
     * @param {string} url - رابط الـ Webhook
     * @param {object} data - البيانات المرسلة
     * @returns {object} - الرد المعالج (JSON)
     */
    post: async (url, data) => {
        // تحديد مهلة زمنية للطلب (15 ثانية) لكي لا ينتظر المستخدم للأبد
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // الحصول على نوع المحتوى القادم من Make.com
            const contentType = response.headers.get("content-type");

            // 1. معالجة رد الـ JSON (الحالة المثالية)
            if (contentType && contentType.includes("application/json")) {
                const result = await response.json();
                // التأكد من وجود Success في الرد، وإذا لم توجد نعتمد على كود الـ HTTP
                return {
                    success: result.success !== undefined ? result.success : response.ok,
                    ...result
                };
            } 
            
            // 2. معالجة الردود النصية (مثل "Accepted" الافتراضية من Make)
            const textResponse = await response.text();
            console.info("[API Engine] رد غير هيكلي من الخادم:", textResponse);
            
            return { 
                success: response.ok, 
                message: textResponse || (response.ok ? "تمت العملية بنجاح" : "حدث خطأ في الخادم")
            };

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.error("[API Engine] انتهت مهلة الاتصال (Timeout)");
                return { success: false, message: "استغرق الخادم وقتاً طويلاً للرد. يرجى المحاولة مجدداً." };
            }

            console.error("[API Engine] خطأ في الاتصال:", error);
            return { 
                success: false, 
                message: "تعذر الاتصال بالخادم. تأكد من جودة الإنترنت وحاول لاحقاً." 
            };
        }
    }
};
