/**
 * محرك العداد التنازلي (Countdown Timer) - منصة تيرا
 * النسخة المحدثة: إدارة ذكية للعد التنازلي مع دعم التنسيق الرقمي الفخم
 */
const Countdown = {
    interval: null, // مخزن داخلي لمنع تداخل العدادات

    /**
     * بدء العداد التنازلي
     * @param {number} durationInSeconds - المدة بالثواني
     * @param {HTMLElement} displayElement - العنصر الذي سيظهر فيه الوقت
     * @param {function} onComplete - ما سيحدث عند انتهاء الوقت
     */
    start(durationInSeconds, displayElement, onComplete) {
        // 1. إيقاف أي عداد نشط سابقاً لضمان عدم حدوث تضارب
        if (this.interval) {
            clearInterval(this.interval);
        }

        let timer = durationInSeconds;
        
        // تحديث أولي فوراً قبل بدء الـ Interval لتجنب تأخير ثانية واحدة
        this.updateDisplay(timer, displayElement);

        this.interval = setInterval(() => {
            timer--;

            if (timer >= 0) {
                this.updateDisplay(timer, displayElement);
            } else {
                // 2. عند انتهاء الوقت
                this.stop();
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }
        }, 1000);

        return this.interval;
    },

    /**
     * تحديث شكل الأرقام في الواجهة
     */
    updateDisplay(timer, displayElement) {
        if (!displayElement) return;

        const minutes = parseInt(timer / 60, 10);
        const seconds = parseInt(timer % 60, 10);

        // تنسيق الوقت بصيغة 00:00
        const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
        const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;

        displayElement.textContent = `${formattedMinutes}:${formattedSeconds}`;
        
        // إضافة نبض خفيف للأرقام عند اقتراب النهاية (آخر 10 ثواني)
        if (timer <= 10) {
            displayElement.style.color = "var(--error, #ef4444)";
            displayElement.classList.add('animate-pulse');
        } else {
            displayElement.style.color = "var(--primary, #38bdf8)";
            displayElement.classList.remove('animate-pulse');
        }
    },

    /**
     * إيقاف العداد يدوياً
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
};
