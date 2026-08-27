// Advanced Reports Module

// تحميل مكتبة jsPDF
if (!window.jsPDF) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
}

class ReportsManager {
    constructor() {
        this.reports = [];
    }
    
    // تحميل التقارير
    async loadReports(tenantId) {
        try {
            const snapshot = await firestore.collection('reports')
                .where('tenantId', '==', tenantId)
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();
            
            this.reports = [];
            snapshot.forEach(doc => {
                this.reports.push({ id: doc.id, ...doc.data() });
            });
            
            return this.reports;
        } catch (error) {
            console.error('خطأ في تحميل التقارير:', error);
            return [];
        }
    }
    
    // إنشاء تقرير أسبوعي
    async generateWeeklyReport(driverCode, startDate, endDate) {
        try {
            const records = await this.getRecords(driverCode, startDate, endDate);
            const stats = this.calculateStats(records);
            
            const report = {
                type: 'weekly',
                driverCode: driverCode,
                startDate: startDate,
                endDate: endDate,
                stats: stats,
                records: records,
                createdAt: new Date(),
                tenantId: tenantId
            };
            
            // حفظ التقرير
            await firestore.collection('reports').add(report);
            
            return report;
        } catch (error) {
            console.error('خطأ في إنشاء التقرير الأسبوعي:', error);
            throw error;
        }
    }
    
    // إنشاء تقرير شهري
    async generateMonthlyReport(tenantId, month, year) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            const drivers = await this.getDrivers(tenantId);
            const driverStats = {};
            
            for (const driver of drivers) {
                const records = await this.getRecords(driver.code, startDate, endDate);
                driverStats[driver.code] = this.calculateStats(records);
            }
            
            const report = {
                type: 'monthly',
                tenantId: tenantId,
                month: month,
                year: year,
                driverStats: driverStats,
                totalStats: this.aggregateStats(Object.values(driverStats)),
                createdAt: new Date()
            };
            
            // حفظ التقرير
            await firestore.collection('reports').add(report);
            
            return report;
        } catch (error) {
            console.error('خطأ في إنشاء التقرير الشهري:', error);
            throw error;
        }
    }
    
    // الحصول على السجلات
    async getRecords(driverCode, startDate, endDate) {
        try {
            const snapshot = await database.ref('locationHistory')
                .orderByChild('timestamp')
                .startAt(startDate.getTime())
                .endAt(endDate.getTime())
                .once('value');
            
            const records = [];
            if (snapshot.exists()) {
                Object.values(snapshot.val()).forEach(record => {
                    if (record.driverCode === driverCode) {
                        records.push(record);
                    }
                });
            }
            
            return records;
        } catch (error) {
            console.error('خطأ في الحصول على السجلات:', error);
            return [];
        }
    }
    
    // حساب الإحصائيات
    calculateStats(records) {
        let totalDistance = 0;
        let maxSpeed = 0;
        let avgSpeed = 0;
        let speedSum = 0;
        let speedCount = 0;
        let totalStopTime = 0;
        let startTime = null;
        let endTime = null;
        let tripCount = 0;
        
        records.forEach((record, index) => {
            if (index === 0) {
                startTime = new Date(record.timestamp);
            }
            endTime = new Date(record.timestamp);
            
            if (index > 0) {
                const prev = records[index - 1];
                const distance = this.calculateDistance(
                    prev.latitude, prev.longitude,
                    record.latitude, record.longitude
                );
                totalDistance += distance;
                
                if (record.speed === 0 && prev.speed > 0) {
                    tripCount++;
                }
                
                if (record.speed === 0) {
                    totalStopTime += (record.timestamp - prev.timestamp) / 1000 / 60;
                }
            }
            
            if (record.speed) {
                maxSpeed = Math.max(maxSpeed, record.speed);
                speedSum += record.speed;
                speedCount++;
            }
        });
        
        if (speedCount > 0) {
            avgSpeed = (speedSum / speedCount).toFixed(2);
        }
        
        return {
            totalDistance: totalDistance.toFixed(2),
            maxSpeed: maxSpeed.toFixed(2),
            avgSpeed: avgSpeed,
            totalStopTime: totalStopTime.toFixed(0),
            startTime: startTime,
            endTime: endTime,
            tripCount: tripCount,
            recordsCount: records.length
        };
    }
    
    // دمج الإحصائيات
    aggregateStats(statsList) {
        return {
            totalDistance: statsList.reduce((sum, s) => sum + parseFloat(s.totalDistance), 0).toFixed(2),
            maxSpeed: Math.max(...statsList.map(s => parseFloat(s.maxSpeed))).toFixed(2),
            avgSpeed: (statsList.reduce((sum, s) => sum + parseFloat(s.avgSpeed), 0) / statsList.length).toFixed(2),
            totalStopTime: statsList.reduce((sum, s) => sum + parseFloat(s.totalStopTime), 0).toFixed(0),
            tripCount: statsList.reduce((sum, s) => sum + s.tripCount, 0)
        };
    }
    
    // حساب المسافة
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    // الحصول على السائقين
    async getDrivers(tenantId) {
        const snapshot = await database.ref('vehicleDrivers').once('value');
        const drivers = [];
        if (snapshot.exists()) {
            Object.entries(snapshot.val()).forEach(([code, driver]) => {
                if (driver.tenantId === tenantId) {
                    drivers.push({ code, ...driver });
                }
            });
        }
        return drivers;
    }
    
    // تصدير التقرير كـ PDF
    async exportToPDF(report) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // إعدادات النص العربي
            doc.setFont('Arial');
            doc.setLanguage('ar');
            
            // العنوان
            doc.setFontSize(16);
            doc.text('تقرير السائق', 105, 20, { align: 'center' });
            
            // المعلومات الأساسية
            doc.setFontSize(12);
            doc.text(`السائق: ${report.driverCode}`, 20, 40);
            doc.text(`الفترة: ${report.startDate} إلى ${report.endDate}`, 20, 50);
            doc.text(`التاريخ: ${new Date().toLocaleDateString('ar-EG')}`, 20, 60);
            
            // الإحصائيات
            doc.setFontSize(11);
            let yPos = 80;
            
            const stats = [
                `إجمالي المسافة: ${report.stats.totalDistance} كم`,
                `أقصى سرعة: ${report.stats.maxSpeed} كم/س`,
                `متوسط السرعة: ${report.stats.avgSpeed} كم/س`,
                `وقت التوقف: ${report.stats.totalStopTime} دقيقة`,
                `عدد الرحلات: ${report.stats.tripCount}`
            ];
            
            stats.forEach(stat => {
                doc.text(stat, 20, yPos);
                yPos += 10;
            });
            
            // تحميل الملف
            doc.save(`تقرير_${report.driverCode}_${new Date().toISOString().split('T')[0]}.pdf`);
            
            notificationManager.addNotification('success', '✅ تم التصدير', 'تم تحميل التقرير بنجاح', '📄');
        } catch (error) {
            console.error('خطأ في تصدير PDF:', error);
            notificationManager.addNotification('error', '❌ خطأ', 'حدث خطأ في تصدير التقرير', '❌');
        }
    }
    
    // تصدير التقرير كـ CSV
    exportToCSV(report) {
        try {
            let csv = 'المقياس,القيمة\n';
            csv += `السائق,${report.driverCode}\n`;
            csv += `إجمالي المسافة,${report.stats.totalDistance} كم\n`;
            csv += `أقصى سرعة,${report.stats.maxSpeed} كم/س\n`;
            csv += `متوسط السرعة,${report.stats.avgSpeed} كم/س\n`;
            csv += `وقت التوقف,${report.stats.totalStopTime} دقيقة\n`;
            csv += `عدد الرحلات,${report.stats.tripCount}\n`;
            
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
            element.setAttribute('download', `تقرير_${report.driverCode}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            
            notificationManager.addNotification('success', '✅ تم التصدير', 'تم تحميل التقرير بنجاح', '📄');
        } catch (error) {
            console.error('خطأ في تصدير CSV:', error);
            notificationManager.addNotification('error', '❌ خطأ', 'حدث خطأ في تصدير التقرير', '❌');
        }
    }
}

const reportsManager = new ReportsManager();
