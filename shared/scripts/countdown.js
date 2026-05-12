/**
 * محرك العداد التنازلي (Countdown Timer) لصفحات التحقق
 */
const Countdown = {
    start: (durationInSeconds, displayElement, onComplete) => {
        let timer = durationInSeconds, minutes, seconds;
        
        const interval = setInterval(() => {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            // إضافة صفر على اليسار إذا كان الرقم أقل من 10
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            // عرض الوقت في العنصر المحدد
            if (displayElement) {
                displayElement.textContent = minutes + ":" + seconds;
            }

            // عند انتهاء الوقت
            if (--timer < 0) {
                clearInterval(interval);
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }
        }, 1000);
        
        // إرجاع رقم العداد في حال أردنا إيقافه يدوياً لاحقاً
        return interval; 
    }
};
