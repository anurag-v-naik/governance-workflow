// js/analytics/usage-tracker.js - Usage Analytics and Audit Tracking

/**
 * Usage Tracker for Data Governance Decision Tool
 * Tracks user interactions, system events, and generates audit logs
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class UsageTracker {
    static SESSION_STORAGE_KEY = 'dgdt_session';
    static AUDIT_LOG_KEY = 'audit_logs';
    static ANALYTICS_KEY = 'usage_analytics';
    static MAX_EVENTS_PER_SESSION = 1000;
    static MAX_AUDIT_LOG_SIZE = 10000;

    static sessionData = {
        sessionId: null,
        startTime: null,
        userId: null,
        events: [],
        pageViews: 0,
        interactions: 0
    };

    /**
     * Initialize usage tracker
     */
    static init() {
        this.startSession();
        this.setupEventListeners();
        this.trackPageView();
        console.log('Usage Tracker initialized');
    }

    /**
     * Start a new tracking session
     */
    static startSession() {
        this.sessionData = {
            sessionId: this.generateSessionId(),
            startTime: new Date().toISOString(),
            userId: null,
            events: [],
            pageViews: 0,
            interactions: 0,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Store session data
        if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem(this.SESSION_STORAGE_KEY, this.sessionData);
        }

        console.log('New tracking session started:', this.sessionData.sessionId);
    }

    /**
     * Set user information for tracking
     */
    static setUser(userId, userInfo = {}) {
        this.sessionData.userId = userId;
        this.sessionData.userInfo = userInfo;
        
        this.trackEvent('user_identified', {
            userId: userId,
            userInfo: userInfo
        });

        this.updateSession();
    }

    /**
     * Track a custom event
     */
    static trackEvent(eventName, properties = {}, options = {}) {
        const {
            category = 'general',
            priority = 'normal',
            sensitive = false
        } = options;

        const event = {
            id: this.generateEventId(),
            name: eventName,
            category: category,
            properties: properties,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionData.sessionId,
            userId: this.sessionData.userId,
            priority: priority,
            sensitive: sensitive,
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent.substring(0, 200) // Truncate for storage
        };

        // Add to session events
        this.sessionData.events.push(event);
        this.sessionData.interactions++;

        // Limit session events
        if (this.sessionData.events.length > this.MAX_EVENTS_PER_SESSION) {
            this.sessionData.events = this.sessionData.events.slice(-this.MAX_EVENTS_PER_SESSION / 2);
        }

        // Update session storage
        this.updateSession();

        // Add to audit log if important
        if (priority === 'high' || this.isAuditableEvent(eventName)) {
            this.addToAuditLog(event);
        }

        // Update analytics aggregates
        this.updateAnalytics(event);

        console.debug('Event tracked:', eventName, properties);
    }

    /**
     * Track page view
     */
    static trackPageView(page = null) {
        const pageInfo = {
            page: page || window.location.pathname,
            title: document.title,
            url: window.location.href,
            referrer: document.referrer,
            loadTime: performance.now()
        };

        this.sessionData.pageViews++;
        
        this.trackEvent('page_view', pageInfo, { category: 'navigation' });
    }

    /**
     * Track user interaction
     */
    static trackInteraction(element, action, details = {}) {
        const interactionData = {
            element: element.tagName,
            elementId: element.id,
            className: element.className,
            action: action,
            details: details,
            position: this.getElementPosition(element)
        };

        this.trackEvent('user_interaction', interactionData, { category: 'ui' });
    }

    /**
     * Track performance metrics
     */
    static trackPerformance(metric, value, context = {}) {
        const performanceData = {
            metric: metric,
            value: value,
            context: context,
            timestamp: performance.now(),
            memory: this.getMemoryInfo(),
            connection: this.getConnectionInfo()
        };

        this.trackEvent('performance', performanceData, { category: 'system' });
    }

    /**
     * Track error events
     */
    static trackError(error, context = {}) {
        const errorData = {
            message: error.message,
            stack: error.stack ? error.stack.substring(0, 1000) : null, // Limit stack trace
            type: error.name,
            context: context,
            url: window.location.href,
            lineNumber: error.lineNumber,
            columnNumber: error.columnNumber
        };

        this.trackEvent('error', errorData, { 
            category: 'error', 
            priority: 'high' 
        });
    }

    /**
     * Track form interactions
     */
    static trackFormInteraction(formElement, action, fieldData = {}) {
        const formData = {
            formId: formElement.id,
            formName: formElement.name,
            action: action,
            fieldCount: formElement.elements.length,
            fieldData: fieldData, // Should be sanitized before passing
            completionTime: fieldData.completionTime || null
        };

        this.trackEvent('form_interaction', formData, { 
            category: 'form',
            sensitive: true // Forms may contain sensitive data
        });
    }

    /**
     * Track assessment progress
     */
    static trackAssessmentProgress(assessmentId, progress, details = {}) {
        const progressData = {
            assessmentId: assessmentId,
            progress: progress,
            currentQuestion: details.currentQuestion,
            totalQuestions: details.totalQuestions,
            timeSpent: details.timeSpent,
            questionsAnswered: details.questionsAnswered
        };

        this.trackEvent('assessment_progress', progressData, { 
            category: 'assessment',
            priority: 'normal'
        });
    }

    /**
     * Track feature usage
     */
    static trackFeatureUsage(feature, action, duration = null) {
        const featureData = {
            feature: feature,
            action: action,
            duration: duration,
            timestamp: new Date().toISOString()
        };

        this.trackEvent('feature_usage', featureData, { category: 'feature' });
    }

    /**
     * Setup automatic event listeners
     */
    static setupEventListeners() {
        // Track clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.classList.contains('clickable')) {
                this.trackInteraction(e.target, 'click');
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            this.trackFormInteraction(e.target, 'submit');
        });

        // Track input focus/blur for form analytics
        document.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                this.trackInteraction(e.target, 'focus');
            }
        }, true);

        // Track window events
        window.addEventListener('beforeunload', () => {
            this.endSession();
        });

        window.addEventListener('error', (e) => {
            this.trackError(e.error || new Error(e.message), {
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });

        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.trackError(new Error(e.reason), {
                type: 'unhandled_promise_rejection'
            });
        });

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('visibility_change', {
                hidden: document.hidden,
                visibilityState: document.visibilityState
            }, { category: 'session' });
        });

        // Track viewport changes
        window.addEventListener('resize', this.debounce(() => {
            this.trackEvent('viewport_change', {
                width: window.innerWidth,
                height: window.innerHeight
            }, { category: 'ui' });
        }, 500));
    }

    /**
     * Check if event should be audited
     */
    static isAuditableEvent(eventName) {
        const auditableEvents = [
            'user_login',
            'user_logout',
            'assessment_completed',
            'configuration_changed',
            'rule_created',
            'rule_modified',
            'template_created',
            'template_modified',
            'data_exported',
            'data_imported',
            'user_identified',
            'error'
        ];

        return auditableEvents.includes(eventName);
    }

    /**
     * Add event to audit log
     */
    static addToAuditLog(event) {
        try {
            let auditLog = [];
            
            if (typeof StorageManager !== 'undefined') {
                auditLog = StorageManager.getItem(this.AUDIT_LOG_KEY, []);
            }

            // Create audit entry
            const auditEntry = {
                id: this.generateAuditId(),
                eventId: event.id,
                eventName: event.name,
                userId: event.userId,
                sessionId: event.sessionId,
                timestamp: event.timestamp,
                properties: event.sensitive ? '[REDACTED]' : event.properties,
                ipAddress: '[REDACTED]', // Would be populated server-side
                userAgent: event.userAgent,
                url: event.url,
                integrity: this.generateIntegrityHash(event)
            };

            auditLog.push(auditEntry);

            // Maintain audit log size
            if (auditLog.length > this.MAX_AUDIT_LOG_SIZE) {
                auditLog = auditLog.slice(-this.MAX_AUDIT_LOG_SIZE / 2);
            }

            if (typeof StorageManager !== 'undefined') {
                StorageManager.setItem(this.AUDIT_LOG_KEY, auditLog);
            }

        } catch (error) {
            console.error('Failed to add to audit log:', error);
        }
    }

    /**
     * Update analytics aggregates
     */
    static updateAnalytics(event) {
        try {
            let analytics = {};
            
            if (typeof StorageManager !== 'undefined') {
                analytics = StorageManager.getItem(this.ANALYTICS_KEY, {
                    totalEvents: 0,
                    eventCounts: {},
                    categoryStats: {},
                    userStats: {},
                    sessionStats: {},
                    dailyStats: {},
                    lastUpdated: new Date().toISOString()
                });
            }

            // Update total events
            analytics.totalEvents++;

            // Update event counts
            analytics.eventCounts[event.name] = (analytics.eventCounts[event.name] || 0) + 1;

            // Update category stats
            if (!analytics.categoryStats[event.category]) {
                analytics.categoryStats[event.category] = { count: 0, lastEvent: null };
            }
            analytics.categoryStats[event.category].count++;
            analytics.categoryStats[event.category].lastEvent = event.timestamp;

            // Update user stats
            if (event.userId) {
                if (!analytics.userStats[event.userId]) {
                    analytics.userStats[event.userId] = { 
                        eventCount: 0, 
                        firstSeen: event.timestamp,
                        lastSeen: event.timestamp,
                        sessions: new Set()
                    };
                }
                analytics.userStats[event.userId].eventCount++;
                analytics.userStats[event.userId].lastSeen = event.timestamp;
                analytics.userStats[event.userId].sessions.add(event.sessionId);
            }

            // Update session stats
            if (!analytics.sessionStats[event.sessionId]) {
                analytics.sessionStats[event.sessionId] = {
                    eventCount: 0,
                    startTime: event.timestamp,
                    userId: event.userId
                };
            }
            analytics.sessionStats[event.sessionId].eventCount++;

            // Update daily stats
            const dateKey = event.timestamp.split('T')[0];
            if (!analytics.dailyStats[dateKey]) {
                analytics.dailyStats[dateKey] = { events: 0, users: new Set(), sessions: new Set() };
            }
            analytics.dailyStats[dateKey].events++;
            if (event.userId) {
                analytics.dailyStats[dateKey].users.add(event.userId);
            }
            analytics.dailyStats[dateKey].sessions.add(event.sessionId);

            // Convert Sets to arrays for storage
            Object.keys(analytics.dailyStats).forEach(date => {
                if (analytics.dailyStats[date].users instanceof Set) {
                    analytics.dailyStats[date].users = analytics.dailyStats[date].users.size;
                }
                if (analytics.dailyStats[date].sessions instanceof Set) {
                    analytics.dailyStats[date].sessions = analytics.dailyStats[date].sessions.size;
                }
            });

            Object.keys(analytics.userStats).forEach(userId => {
                if (analytics.userStats[userId].sessions instanceof Set) {
                    analytics.userStats[userId].sessions = analytics.userStats[userId].sessions.size;
                }
            });

            analytics.lastUpdated = new Date().toISOString();

            if (typeof StorageManager !== 'undefined') {
                StorageManager.setItem(this.ANALYTICS_KEY, analytics);
            }

        } catch (error) {
            console.error('Failed to update analytics:', error);
        }
    }

    /**
     * Update session data in storage
     */
    static updateSession() {
        this.sessionData.lastActivity = new Date().toISOString();
        
        if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem(this.SESSION_STORAGE_KEY, this.sessionData);
        }
    }

    /**
     * End current session
     */
    static endSession() {
        const endTime = new Date().toISOString();
        const duration = new Date(endTime) - new Date(this.sessionData.startTime);

        this.trackEvent('session_end', {
            duration: duration,
            endTime: endTime,
            totalEvents: this.sessionData.events.length,
            totalInteractions: this.sessionData.interactions,
            totalPageViews: this.sessionData.pageViews
        }, { category: 'session', priority: 'normal' });

        // Update session data
        this.sessionData.endTime = endTime;
        this.sessionData.duration = duration;
        this.updateSession();

        console.log('Session ended:', this.sessionData.sessionId, 'Duration:', duration + 'ms');
    }

    /**
     * Get analytics summary
     */
    static getAnalyticsSummary() {
        let analytics = {};
        
        if (typeof StorageManager !== 'undefined') {
            analytics = StorageManager.getItem(this.ANALYTICS_KEY, {});
        }

        return {
            totalEvents: analytics.totalEvents || 0,
            topEvents: this.getTopItems(analytics.eventCounts, 10),
            categoryBreakdown: analytics.categoryStats || {},
            activeUsers: Object.keys(analytics.userStats || {}).length,
            activeSessions: Object.keys(analytics.sessionStats || {}).length,
            recentActivity: this.getRecentActivity(),
            currentSession: this.sessionData
        };
    }

    /**
     * Get audit log
     */
    static getAuditLog(options = {}) {
        const {
            userId = null,
            eventName = null,
            startDate = null,
            endDate = null,
            limit = 100
        } = options;

        let auditLog = [];
        
        if (typeof StorageManager !== 'undefined') {
            auditLog = StorageManager.getItem(this.AUDIT_LOG_KEY, []);
        }

        // Apply filters
        let filteredLog = auditLog;

        if (userId) {
            filteredLog = filteredLog.filter(entry => entry.userId === userId);
        }

        if (eventName) {
            filteredLog = filteredLog.filter(entry => entry.eventName === eventName);
        }

        if (startDate) {
            filteredLog = filteredLog.filter(entry => entry.timestamp >= startDate);
        }

        if (endDate) {
            filteredLog = filteredLog.filter(entry => entry.timestamp <= endDate);
        }

        // Sort by timestamp (newest first) and limit
        return filteredLog
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Get recent activity
     */
    static getRecentActivity(limit = 20) {
        return this.sessionData.events
            .slice(-limit)
            .reverse()
            .map(event => ({
                name: event.name,
                timestamp: event.timestamp,
                category: event.category,
                properties: event.sensitive ? '[REDACTED]' : event.properties
            }));
    }

    /**
     * Generate session ID
     */
    static generateSessionId() {
        return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate event ID
     */
    static generateEventId() {
        return 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate audit ID
     */
    static generateAuditId() {
        return 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate integrity hash for audit
     */
    static generateIntegrityHash(event) {
        // Simple hash for demonstration - use proper crypto in production
        const data = JSON.stringify({
            id: event.id,
            name: event.name,
            timestamp: event.timestamp,
            userId: event.userId
        });
        
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Get element position for click tracking
     */
    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * Get memory information
     */
    static getMemoryInfo() {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * Get connection information
     */
    static getConnectionInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }
        return null;
    }

    /**
     * Get top items from object by count
     */
    static getTopItems(obj, limit = 10) {
        return Object.entries(obj || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));
    }

    /**
     * Debounce utility function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Clear all tracking data
     */
    static clearAllData() {
        if (typeof StorageManager !== 'undefined') {
            StorageManager.removeItem(this.SESSION_STORAGE_KEY);
            StorageManager.removeItem(this.AUDIT_LOG_KEY);
            StorageManager.removeItem(this.ANALYTICS_KEY);
        }
        
        this.sessionData = {
            sessionId: null,
            startTime: null,
            userId: null,
            events: [],
            pageViews: 0,
            interactions: 0
        };

        console.log('All tracking data cleared');
    }

    /**
     * Export tracking data
     */
    static exportTrackingData() {
        const exportData = {
            session: this.sessionData,
            analytics: StorageManager?.getItem(this.ANALYTICS_KEY, {}) || {},
            auditLog: StorageManager?.getItem(this.AUDIT_LOG_KEY, []) || [],
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        return exportData;
    }

    /**
     * Get compliance report
     */
    static getComplianceReport(options = {}) {
        const {
            startDate = null,
            endDate = null,
            includePersonalData = false
        } = options;

        const auditLog = this.getAuditLog({ startDate, endDate });
        const analytics = this.getAnalyticsSummary();

        return {
            reportGenerated: new Date().toISOString(),
            period: { startDate, endDate },
            summary: {
                totalAuditEntries: auditLog.length,
                totalEvents: analytics.totalEvents,
                activeUsers: analytics.activeUsers,
                activeSessions: analytics.activeSessions
            },
            auditLog: includePersonalData ? auditLog : auditLog.map(entry => ({
                ...entry,
                userId: entry.userId ? '[REDACTED]' : null,
                properties: '[REDACTED]'
            })),
            dataRetention: {
                auditLogSize: auditLog.length,
                maxAuditLogSize: this.MAX_AUDIT_LOG_SIZE,
                retentionPolicy: 'Events retained based on importance and storage limits'
            },
            privacy: {
                dataMinimization: 'Only necessary data is collected',
                encryption: 'Sensitive data is marked and can be encrypted',
                userConsent: 'Tracking is anonymous and for operational purposes',
                dataSubjectRights: 'Users can request data deletion'
            }
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsageTracker;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.UsageTracker = UsageTracker;
}