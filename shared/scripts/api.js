/**
 * المحرك المركزي للاتصال بالخادم (API Engine)
 * مطور للتعامل مع ردود Make.com بذكاء وتجنب انهيار الـ JSON
 */
const API = {
    post: async (url, data) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            // فحص نوعية الرد القادم من الخادم
            const contentType = response.headers.get("content-type");
            
            // إذا كان الرد JSON حقيقي، اقرأه بشكل طبيعي
            if (contentType && contentType.includes("application/json")) {
                return await response.json();
            } else {
                // إذا كان الرد نص عادي (مثل كلمة "Accepted" من Make)، تعامل معه بأمان
                const textResponse = await response.text();
                console.warn("[API Engine] الخادم رد بنص عادي بدلاً من JSON:", textResponse);
                return { 
                    success: response.ok, 
                    message: textResponse 
                };
            }
        } catch (error) {
            console.error("API Fetch Error:", error);
            return { 
                success: false, 
                message: "فشل الاتصال بالخادم. يرجى المحاولة لاحقاً." 
            };
        }
    }
};
