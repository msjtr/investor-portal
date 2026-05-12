/* * محرك طلبات الـ API الموحد 
 * يتعامل مع الإرسال، الاستقبال، والأخطاء
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

            return await response.json();
        } catch (error) {
            console.error("API Fetch Error:", error);
            // هنا سيتم استدعاء نظام الإشعارات لاحقاً
            throw error;
        }
    }
};
