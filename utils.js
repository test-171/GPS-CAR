// Utility Functions

// تهيئة الأخطاء
window.addEventListener('error', (event) => {
    console.error('خطأ:', event.error);
    notificationManager.addNotification('error', '❌ خطأ', event.error.message, '❌');
});

// معالجة الأخطاء غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise Rejection:', event.reason);
    notificationManager.addNotification('error', '❌ خطأ', 'حدث خطأ غير متوقع', '❌');
});

// دوال مساعدة
const Utils = {
    // تنسيق الرقم
    formatNumber(num) {
        return new Intl.NumberFormat('ar-EG').format(num);
    },
    
    // تنسيق التاريخ
    formatDate(date) {
        return new Date(date).toLocaleDateString('ar-EG');
    },
    
    // تنسيق الوقت
    formatTime(date) {
        return new Date(date).toLocaleTimeString('ar-EG');
    },
    
    // التحقق من صحة البريد
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // التحقق من صحة الهاتف
    isValidPhone(phone) {
        const re = /^[0-9]{10,15}$/;
        return re.test(phone.replace(/[^0-9]/g, ''));
    },
    
    // حساب المسافة بين نقطتين
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    
    // تأخير
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // اختبار الاتصال
    async testConnection() {
        try {
            const response = await fetch('https://www.google.com', {
                mode: 'no-cors',
                timeout: 5000
            });
            return true;
        } catch (error) {
            return false;
        }
    }
};

// تحسين الأداء
let performanceMonitor = {
    startTime: Date.now(),
    
    getLoadTime() {
        return Date.now() - this.startTime;
    },
    
    logPerformance() {
        console.log(`وقت التحميل: ${this.getLoadTime()}ms`);
    }
};

// تخزين مؤقت
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttl = 300000; // 5 دقائق
    }
    
    set(key, value) {
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }
    
    get(key) {
        if (!this.cache.has(key)) return null;
        
        const item = this.cache.get(key);
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    clear() {
        this.cache.clear();
    }
}

const cacheManager = new CacheManager();
