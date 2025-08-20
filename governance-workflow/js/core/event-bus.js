// js/core/event-bus.js - Event Handling System

/**
 * Event Bus for Data Governance Decision Tool
 * Centralized event management for component communication
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class EventBus {
    static instance = null;
    static events = new Map();
    static wildcardEvents = new Map();
    static eventHistory = [];
    static maxHistory = 1000;
    static debugMode = false;

    /**
     * Initialize event bus
     */
    static init() {
        if (this.instance) {
            return this.instance;
        }

        this.instance = this;
        this.setupGlobalErrorHandling();
        console.log('Event Bus initialized');
        return this.instance;
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!this.instance) {
            return this.init();
        }
        return this.instance;
    }

    /**
     * Subscribe to an event
     */
    static on(eventName, callback, options = {}) {
        const {
            once = false,
            priority = 0,
            context = null,
            filter = null
        } = options;

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listener = {
            callback,
            once,
            priority,
            context,
            filter,
            id: this.generateListenerId(),
            created: new Date().toISOString()
        };

        const listeners = this.events.get(eventName);
        listeners.push(listener);

        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            console.log(`Event listener added: ${eventName}`, listener);
        }

        // Return unsubscribe function
        return () => this.off(eventName, listener.id);
    }

    /**
     * Subscribe to an event (one-time)
     */
    static once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     */
    static off(eventName, callbackOrId = null) {
        if (!callbackOrId) {
            // Remove all listeners for event
            this.events.delete(eventName);
            return true;
        }

        const listeners = this.events.get(eventName);
        if (!listeners) {
            return false;
        }

        const index = listeners.findIndex(listener => 
            listener.id === callbackOrId || listener.callback === callbackOrId
        );

        if (index !== -1) {
            listeners.splice(index, 1);
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
            return true;
        }

        return false;
    }

    /**
     * Emit an event
     */
    static emit(eventName, data = null, options = {}) {
        const {
            async = false,
            timeout = 5000,
            stopOnError = false
        } = options;

        const eventData = {
            name: eventName,
            data,
            timestamp: new Date().toISOString(),
            id: this.generateEventId(),
            source: this.getEventSource()
        };

        // Add to history
        this.addToHistory(eventData);

        if (this.debugMode) {
            console.log(`Event emitted: ${eventName}`, eventData);
        }

        // Handle async vs sync emission
        if (async) {
            return this.emitAsync(eventName, eventData, { timeout, stopOnError });
        } else {
            return this.emitSync(eventName, eventData, { stopOnError });
        }
    }

    /**
     * Emit event synchronously
     */
    static emitSync(eventName, eventData, options = {}) {
        const { stopOnError = false } = options;
        const results = [];
        const errors = [];

        // Get direct listeners
        const listeners = this.events.get(eventName) || [];
        
        // Get wildcard listeners
        const wildcardListeners = this.getWildcardListeners(eventName);
        
        // Combine and sort by priority
        const allListeners = [...listeners, ...wildcardListeners]
            .sort((a, b) => b.priority - a.priority);

        for (const listener of allListeners) {
            try {
                // Apply filter if present
                if (listener.filter && !listener.filter(eventData)) {
                    continue;
                }

                // Call listener
                const result = listener.context 
                    ? listener.callback.call(listener.context, eventData)
                    : listener.callback(eventData);

                results.push({
                    listenerId: listener.id,
                    result,
                    success: true
                });

                // Remove one-time listeners
                if (listener.once) {
                    this.off(eventName, listener.id);
                }

            } catch (error) {
                const errorInfo = {
                    listenerId: listener.id,
                    error,
                    success: false
                };

                errors.push(errorInfo);

                if (this.debugMode) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }

                if (stopOnError) {
                    break;
                }
            }
        }

        return {
            eventName,
            iterations,
            totalTime,
            avgTime,
            eventsPerSecond: iterations / (totalTime / 1000)
        };
    }

    /**
     * Batch event operations
     */
    static batch() {
        const batchedEvents = [];
        let isEmitting = false;

        return {
            add: (eventName, data, options = {}) => {
                batchedEvents.push({ eventName, data, options });
                return this;
            },
            emit: async (batchOptions = {}) => {
                if (isEmitting) {
                    throw new Error('Batch is already emitting');
                }

                isEmitting = true;
                const results = [];

                try {
                    if (batchOptions.parallel) {
                        // Emit all events in parallel
                        const promises = batchedEvents.map(event => 
                            this.emit(event.eventName, event.data, { 
                                ...event.options, 
                                async: true 
                            })
                        );
                        const batchResults = await Promise.all(promises);
                        results.push(...batchResults);
                    } else {
                        // Emit events sequentially
                        for (const event of batchedEvents) {
                            const result = await this.emit(
                                event.eventName, 
                                event.data, 
                                { ...event.options, async: true }
                            );
                            results.push(result);

                            if (batchOptions.stopOnError && !result.success) {
                                break;
                            }
                        }
                    }
                } finally {
                    isEmitting = false;
                    batchedEvents.length = 0; // Clear the batch
                }

                return {
                    success: results.every(r => r.success),
                    results
                };
            },
            clear: () => {
                batchedEvents.length = 0;
                return this;
            },
            size: () => batchedEvents.length
        };
    }

    /**
     * Event validation
     */
    static validateEvent(eventName, schema) {
        this.on(eventName, (eventData) => {
            if (!this.validateEventData(eventData.data, schema)) {
                throw new Error(`Event ${eventName} data does not match schema`);
            }
        }, { priority: 1000 }); // High priority to validate first
    }

    static validateEventData(data, schema) {
        if (!schema) return true;

        for (const [key, rules] of Object.entries(schema)) {
            const value = data[key];

            if (rules.required && (value === undefined || value === null)) {
                return false;
            }

            if (value !== undefined && rules.type && typeof value !== rules.type) {
                return false;
            }

            if (rules.validate && typeof rules.validate === 'function') {
                if (!rules.validate(value)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Event state management
     */
    static createEventState(initialState = {}) {
        let state = { ...initialState };
        const stateListeners = new Set();

        return {
            get: (key) => key ? state[key] : state,
            set: (key, value) => {
                const oldValue = state[key];
                state[key] = value;
                
                stateListeners.forEach(listener => {
                    listener({ key, value, oldValue, state: { ...state } });
                });
            },
            update: (updates) => {
                const oldState = { ...state };
                state = { ...state, ...updates };
                
                stateListeners.forEach(listener => {
                    listener({ updates, oldState, state: { ...state } });
                });
            },
            reset: () => {
                const oldState = { ...state };
                state = { ...initialState };
                
                stateListeners.forEach(listener => {
                    listener({ reset: true, oldState, state: { ...state } });
                });
            },
            subscribe: (listener) => {
                stateListeners.add(listener);
                return () => stateListeners.delete(listener);
            }
        };
    }

    /**
     * Utility functions
     */
    static generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    static generateListenerId() {
        return `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    static getEventSource() {
        // Try to get the calling function for debugging
        const stack = new Error().stack;
        const lines = stack.split('\n');
        
        // Find the first line that's not from this file
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i];
            if (!line.includes('event-bus.js')) {
                const match = line.match(/at\s+(.+?)\s+\(/);
                return match ? match[1] : 'unknown';
            }
        }
        
        return 'unknown';
    }

    static addToHistory(eventData) {
        this.eventHistory.push(eventData);
        
        // Maintain history size limit
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.splice(0, this.eventHistory.length - this.maxHistory);
        }
    }

    /**
     * Global error handling setup
     */
    static setupGlobalErrorHandling() {
        // Handle unhandled promise rejections in event handlers
        window.addEventListener('unhandledrejection', (event) => {
            if (this.debugMode) {
                console.error('Unhandled promise rejection in event handler:', event.reason);
            }
            
            this.emit('error.unhandled-promise', {
                error: event.reason,
                timestamp: new Date().toISOString()
            });
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            if (this.debugMode) {
                console.error('Global error:', event.error);
            }
            
            this.emit('error.global', {
                error: event.error,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Predefined application events
     */
    static APPLICATION_EVENTS = {
        // Application lifecycle
        APP_INIT: 'app.init',
        APP_READY: 'app.ready',
        APP_ERROR: 'app.error',
        
        // User events
        USER_LOGIN: 'user.login',
        USER_LOGOUT: 'user.logout',
        USER_PROFILE_UPDATE: 'user.profile.update',
        
        // Assessment events
        ASSESSMENT_START: 'assessment.start',
        ASSESSMENT_PROGRESS: 'assessment.progress',
        ASSESSMENT_COMPLETE: 'assessment.complete',
        ASSESSMENT_SAVE: 'assessment.save',
        ASSESSMENT_LOAD: 'assessment.load',
        
        // Question events
        QUESTION_ANSWER: 'question.answer',
        QUESTION_VALIDATE: 'question.validate',
        QUESTION_NEXT: 'question.next',
        QUESTION_PREVIOUS: 'question.previous',
        
        // Configuration events
        CONFIG_LOAD: 'config.load',
        CONFIG_SAVE: 'config.save',
        CONFIG_UPDATE: 'config.update',
        CONFIG_VALIDATE: 'config.validate',
        
        // UI events
        TAB_CHANGE: 'ui.tab.change',
        MODAL_OPEN: 'ui.modal.open',
        MODAL_CLOSE: 'ui.modal.close',
        NOTIFICATION_SHOW: 'ui.notification.show',
        NOTIFICATION_HIDE: 'ui.notification.hide',
        
        // Export events
        EXPORT_START: 'export.start',
        EXPORT_COMPLETE: 'export.complete',
        EXPORT_ERROR: 'export.error',
        
        // Analytics events
        ANALYTICS_TRACK: 'analytics.track',
        ANALYTICS_PAGE_VIEW: 'analytics.page.view',
        ANALYTICS_EVENT: 'analytics.event'
    };

    /**
     * Convenience methods for common events
     */
    static trackEvent(eventName, data) {
        return this.emit(this.APPLICATION_EVENTS.ANALYTICS_EVENT, {
            eventName,
            data,
            timestamp: new Date().toISOString()
        });
    }

    static showNotification(message, type = 'info', duration = 3000) {
        return this.emit(this.APPLICATION_EVENTS.NOTIFICATION_SHOW, {
            message,
            type,
            duration,
            id: this.generateEventId()
        });
    }

    static hideNotification(notificationId) {
        return this.emit(this.APPLICATION_EVENTS.NOTIFICATION_HIDE, {
            id: notificationId
        });
    }

    static changeTab(tabName) {
        return this.emit(this.APPLICATION_EVENTS.TAB_CHANGE, {
            tab: tabName,
            timestamp: new Date().toISOString()
        });
    }

    static openModal(modalId, data = {}) {
        return this.emit(this.APPLICATION_EVENTS.MODAL_OPEN, {
            modalId,
            data
        });
    }

    static closeModal(modalId) {
        return this.emit(this.APPLICATION_EVENTS.MODAL_CLOSE, {
            modalId
        });
    }

    /**
     * Event bus cleanup
     */
    static destroy() {
        // Clear all event listeners
        this.events.clear();
        this.wildcardEvents.clear();
        this.eventHistory = [];
        
        // Remove global error handlers
        // Note: We can't actually remove these as we don't store references
        // In a real implementation, you'd want to store the handler references
        
        this.instance = null;
        console.log('Event Bus destroyed');
    }

    /**
     * Create a scoped event bus for a component
     */
    static createScope(scopeName) {
        const scopedBus = {
            on: (eventName, callback, options) => 
                this.on(`${scopeName}.${eventName}`, callback, options),
            once: (eventName, callback, options) => 
                this.once(`${scopeName}.${eventName}`, callback, options),
            off: (eventName, callbackOrId) => 
                this.off(`${scopeName}.${eventName}`, callbackOrId),
            emit: (eventName, data, options) => 
                this.emit(`${scopeName}.${eventName}`, data, options),
            emitAsync: (eventName, data, options) => 
                this.emit(`${scopeName}.${eventName}`, data, { ...options, async: true }),
            destroy: () => {
                // Remove all listeners for this scope
                const scopePattern = `${scopeName}.`;
                const eventsToRemove = [];
                
                this.events.forEach((listeners, eventName) => {
                    if (eventName.startsWith(scopePattern)) {
                        eventsToRemove.push(eventName);
                    }
                });
                
                eventsToRemove.forEach(eventName => {
                    this.events.delete(eventName);
                });
            }
        };

        return scopedBus;
    }


    /** AVN */
    /**
     * Emit event asynchronously
     */
    static async emitAsync(eventName, eventData, options = {}) {
        const { timeout = 5000, stopOnError = false } = options;
        const results = [];
        const errors = [];

        // Get all listeners
        const listeners = this.events.get(eventName) || [];
        const wildcardListeners = this.getWildcardListeners(eventName);
        const allListeners = [...listeners, ...wildcardListeners]
            .sort((a, b) => b.priority - a.priority);

        // Create promises for all listeners
        const promises = allListeners.map(async (listener) => {
            try {
                // Apply filter if present
                if (listener.filter && !listener.filter(eventData)) {
                    return null;
                }

                // Create promise with timeout
                const listenerPromise = Promise.resolve(
                    listener.context 
                        ? listener.callback.call(listener.context, eventData)
                        : listener.callback(eventData)
                );

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Listener timeout')), timeout)
                );

                const result = await Promise.race([listenerPromise, timeoutPromise]);

                // Remove one-time listeners
                if (listener.once) {
                    this.off(eventName, listener.id);
                }

                return {
                    listenerId: listener.id,
                    result,
                    success: true
                };

            } catch (error) {
                return {
                    listenerId: listener.id,
                    error,
                    success: false
                };
            }
        });

        // Wait for all promises or stop on first error
        if (stopOnError) {
            for (const promise of promises) {
                const result = await promise;
                if (result) {
                    if (result.success) {
                        results.push(result);
                    } else {
                        errors.push(result);
                        break;
                    }
                }
            }
        } else {
            const allResults = await Promise.all(promises);
            allResults.forEach(result => {
                if (result) {
                    if (result.success) {
                        results.push(result);
                    } else {
                        errors.push(result);
                    }
                }
            });
        }

        return {
            eventName,
            eventId: eventData.id,
            results,
            errors,
            success: errors.length === 0
        };
    }

    /**
     * Subscribe to wildcard events (e.g., 'user.*')
     */
    static onWildcard(pattern, callback, options = {}) {
        if (!this.wildcardEvents.has(pattern)) {
            this.wildcardEvents.set(pattern, []);
        }

        const listener = {
            callback,
            pattern,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            filter: options.filter || null,
            id: this.generateListenerId(),
            created: new Date().toISOString()
        };

        const listeners = this.wildcardEvents.get(pattern);
        listeners.push(listener);
        listeners.sort((a, b) => b.priority - a.priority);

        return () => this.offWildcard(pattern, listener.id);
    }

    /**
     * Unsubscribe from wildcard events
     */
    static offWildcard(pattern, callbackOrId = null) {
        if (!callbackOrId) {
            this.wildcardEvents.delete(pattern);
            return true;
        }

        const listeners = this.wildcardEvents.get(pattern);
        if (!listeners) {
            return false;
        }

        const index = listeners.findIndex(listener => 
            listener.id === callbackOrId || listener.callback === callbackOrId
        );

        if (index !== -1) {
            listeners.splice(index, 1);
            if (listeners.length === 0) {
                this.wildcardEvents.delete(pattern);
            }
            return true;
        }

        return false;
    }

    /**
     * Get wildcard listeners for an event
     */
    static getWildcardListeners(eventName) {
        const matchingListeners = [];

        this.wildcardEvents.forEach((listeners, pattern) => {
            if (this.matchesPattern(eventName, pattern)) {
                matchingListeners.push(...listeners);
            }
        });

        return matchingListeners;
    }

    /**
     * Check if event name matches wildcard pattern
     */
    static matchesPattern(eventName, pattern) {
        // Convert wildcard pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(eventName);
    }

    /**
     * Create event namespace
     */
    static namespace(name) {
        return {
            on: (eventName, callback, options) => 
                this.on(`${name}.${eventName}`, callback, options),
            once: (eventName, callback, options) => 
                this.once(`${name}.${eventName}`, callback, options),
            off: (eventName, callbackOrId) => 
                this.off(`${name}.${eventName}`, callbackOrId),
            emit: (eventName, data, options) => 
                this.emit(`${name}.${eventName}`, data, options),
            emitAsync: (eventName, data, options) => 
                this.emit(`${name}.${eventName}`, data, { ...options, async: true })
        };
    }

    /**
     * Event pipeline with middleware
     */
    static pipeline(eventName) {
        const middlewares = [];

        return {
            use: (middleware) => {
                middlewares.push(middleware);
                return this;
            },
            emit: async (data, options = {}) => {
                let processedData = data;

                // Process through middlewares
                for (const middleware of middlewares) {
                    try {
                        processedData = await middleware(processedData, eventName);
                        if (processedData === false) {
                            // Middleware cancelled the event
                            return { cancelled: true };
                        }
                    } catch (error) {
                        console.error('Error in event middleware:', error);
                        if (options.stopOnMiddlewareError) {
                            throw error;
                        }
                    }
                }

                // Emit the processed event
                return this.emit(eventName, processedData, options);
            }
        };
    }

    /**
     * Event debugging utilities
     */
    static enableDebug() {
        this.debugMode = true;
        console.log('Event Bus debug mode enabled');
    }

    static disableDebug() {
        this.debugMode = false;
        console.log('Event Bus debug mode disabled');
    }

    static getEventHistory(limit = 100) {
        return this.eventHistory.slice(-limit);
    }

    static getEventStats() {
        const stats = {
            totalEvents: this.eventHistory.length,
            totalListeners: 0,
            eventTypes: {},
            wildcardPatterns: Array.from(this.wildcardEvents.keys())
        };

        // Count listeners
        this.events.forEach((listeners, eventName) => {
            stats.totalListeners += listeners.length;
            stats.eventTypes[eventName] = listeners.length;
        });

        this.wildcardEvents.forEach((listeners) => {
            stats.totalListeners += listeners.length;
        });

        return stats;
    }

    static clearHistory() {
        this.eventHistory = [];
    }

    /**
     * Event performance monitoring
     */
    static profileEvent(eventName, callback, iterations = 1000) {
        const start = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            this.emit(eventName, { iteration: i });
        }
        
        const end = performance.now();
        const totalTime = end - start;
        const avgTime = totalTime / iterations;
        
        return {
            eventName,
            iterations,
            totalTime,
            avgTime,
            eventsPerSecond: iterations / (totalTime / 1000)
        };
    }
    
    static profileEventAsync(eventName, callback, iterations = 1000) {
        const start = performance.now();
        const promises = [];

        for (let i = 0; i < iterations; i++) {
            promises.push(this.emitAsync(eventName, { iteration: i }));
        }

        return Promise.all(promises).then(() => {
            const end = performance.now();
            const totalTime = end - start;
            const avgTime = totalTime / iterations;

            return {
                eventName,
                iterations,
                totalTime,
                avgTime,
                eventsPerSecond: iterations / (totalTime / 1000)
            };
        });
    }

    static reset() {
        this.instance = null;
        this.events.clear();
        this.wildcardEvents.clear();
        this.eventHistory = [];
        console.log('Event Bus reset');
    }

    static getDebugInfo() {
        return {
            instance: this.instance,
            events: Array.from(this.events.keys()),
            wildcardEvents: Array.from(this.wildcardEvents.keys()),
            eventHistory: this.eventHistory.slice(-10), // Last 10 events
            debugMode: this.debugMode
        };
    }

    static getEventListeners(eventName) {
        return this.events.get(eventName) || [];
    }

    static getWildcardListenersForEvent(eventName) {
        return this.getWildcardListeners(eventName);
    }

    static getAllListeners() {
        const allListeners = [];
        this.events.forEach((listeners, eventName) => {
            allListeners.push({ eventName, listeners });
        });
        return allListeners;
    }

    static getAllWildcardListeners() {
        const allWildcardListeners = [];
        this.wildcardEvents.forEach((listeners, pattern) => {
            allWildcardListeners.push({ pattern, listeners });
        });
        return allWildcardListeners;
    }

    static getEventSourceInfo(eventName) {
        const listeners = this.getEventListeners(eventName);
        return listeners.map(listener => ({
            id: listener.id,
            created: listener.created,
            context: listener.context ? listener.context.constructor.name : 'global',
            filter: !!listener.filter
        }));
    }

    static getWildcardEventSourceInfo(pattern) {
        const listeners = this.wildcardEvents.get(pattern) || [];
        return listeners.map(listener => ({
            id: listener.id,
            created: listener.created,
            context: listener.context ? listener.context.constructor.name : 'global',
            filter: !!listener.filter
        }));
    }

    static getEventCount(eventName) {
        return (this.events.get(eventName) || []).length + 
               this.getWildcardListeners(eventName).length;
    }

    static getWildcardEventCount(pattern) {
        return (this.wildcardEvents.get(pattern) || []).length;
    }

    static getEventNames() {
        return Array.from(this.events.keys());
    }

    static getWildcardPatterns() {
        return Array.from(this.wildcardEvents.keys());
    }

    static getEventHistory(limit = 100) {
        return this.eventHistory.slice(-limit);
    }

    static clearEventHistory() {
        this.eventHistory = [];
        console.log('Event history cleared');
    }
}

    