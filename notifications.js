// Notifications & Alerts Module
let notificationsData = [];
let alertSettings = {
    speedAlert: 120,
    stopAlert: 30,
    emailNotifications: true
};

// نظام التنبيهات
class NotificationManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }
    
    // إضافة تنبيه
    addNotification(type, title, message, icon = '📢') {
        const notification = {
            id: Date.now(),
            type: type, // 'success', 'error', 'warning', 'info'
            title: title,
            message: message,
            icon: icon,
            timestamp: new Date(),
            read: false
        };
        
        this.queue.push(notification);
        notificationsData.push(notification);
        
        // عرض التنبيه
        this.showNotification(notification);
        
        // حفظ في localStorage
        this.saveToStorage();
    }
    
    // عرض التنبيه
    showNotification(notification) {
        const container = document.getElementById('notifications-container');
        if (!container) return;
        
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${notification.icon}</span>
                <div class="notification-body">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                </div>
                <button class="notification-close" onclick="notificationManager.removeNotification(${notification.id})">×</button>
            </div>
        `;
        
        container.appendChild(element);
        
        // إزالة التنبيه بعد 5 ثوان
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, 5000);
    }
    
    // إزالة التنبيه
    removeNotification(id) {
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) element.remove();
        
        notificationsData = notificationsData.filter(n => n.id !== id);
        this.saveToStorage();
    }
    
    // حفظ التنبيهات
    saveToStorage() {
        localStorage.setItem('notifications', JSON.stringify(notificationsData));
    }
    
    // تحميل التنبيهات
    loadFromStorage() {
        const saved = localStorage.getItem('notifications');
        if (saved) {
            notificationsData = JSON.parse(saved);
        }
    }
}

const notificationManager = new NotificationManager();

// نظام التنبيهات المتقدم
class AlertsSystem {
    constructor() {
        this.activeAlerts = [];
    }
    
    // فحص تجاوز السرعة
    checkSpeedAlert(driverCode, currentSpeed, maxSpeed = alertSettings.speedAlert) {
        if (currentSpeed > maxSpeed) {
            const alert = {
                type: 'speed',
                driverCode: driverCode,
                currentSpeed: currentSpeed,
                maxSpeed: maxSpeed,
                timestamp: new Date()
            };
            
            this.activeAlerts.push(alert);
            notificationManager.addNotification(
                'warning',
                '⚠️ تنبيه تجاوز السرعة',
                `السائق ${driverCode} تجاوز السرعة: ${currentSpeed} كم/س`,
                '⚡'
            );
            
            // إرسال بريد إذا كان مفعل
            if (alertSettings.emailNotifications) {
                this.sendEmailAlert(alert);
            }
        }
    }
    
    // فحص التوقف المفاجئ
    checkStopAlert(driverCode, stopDuration) {
        if (stopDuration > alertSettings.stopAlert) {
            const alert = {
                type: 'stop',
                driverCode: driverCode,
                stopDuration: stopDuration,
                timestamp: new Date()
            };
            
            this.activeAlerts.push(alert);
            notificationManager.addNotification(
                'info',
                '🛑 توقف مفاجئ',
                `السائق ${driverCode} متوقف منذ ${stopDuration} دقيقة`,
                '⏸️'
            );
        }
    }
    
    // إرسال بريد التنبيه
    async sendEmailAlert(alert) {
        try {
            // هنا يتم الاتصال بـ API لإرسال البريد
            await firebase.functions().httpsCallable('sendAlertEmail')({
                alert: alert,
                recipient: currentUser.email
            });
        } catch (error) {
            console.error('خطأ في إرسال البريد:', error);
        }
    }
    
    // الحصول على التنبيهات النشطة
    getActiveAlerts() {
        return this.activeAlerts.filter(a => {
            const timeDiff = (new Date() - a.timestamp) / 1000 / 60;
            return timeDiff < 30; // التنبيهات من آخر 30 دقيقة
        });
    }
}

const alertsSystem = new AlertsSystem();

// إضافة حاوية التنبيهات إلى HTML
function initNotificationsContainer() {
    if (!document.getElementById('notifications-container')) {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
}

// تهيئة النظام
window.addEventListener('load', () => {
    initNotificationsContainer();
    notificationManager.loadFromStorage();
});
