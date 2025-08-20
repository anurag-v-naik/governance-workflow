// js/core/state-manager.js - Application State Management

/**
 * State Manager for Data Governance Decision Tool
 * Centralized state management with reactive updates and persistence
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class StateManager {
    static instance = null;
    static listeners = new Map();
    static state = {
        // User state
        user: {
            profile: null,
            preferences: {},
            isAuthenticated: false
        },
        
        // Application state
        app: {
            initialized: false,
            currentTab: 'assessment',
            loading: false,
            error: null,
            version: '1.0.0'
        },
        
        // Assessment state
        assessment: {
            current: null,
            progress: 0,
            answers: {},
            currentQuestion: 0,
            totalQuestions: 0,
            isComplete: false,
            results: null
        },
        
        // Configuration state
        config: {
            questions: [],
            rules: [],
            templates: [],
            lastModified: null
        },
        
        // UI state
        ui: {
            theme: 'default',
            modals: {},
            notifications: [],
            sidebarCollapsed: false,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: false,
                isTablet: false
            }
        },
        
        // Analytics state
        analytics: {
            sessionId: null,
            events: [],
            metrics: {},
            enabled: true
        }
    };

    /**
     * Initialize state manager
     */
    static init() {
        if (this.instance) {
            return this.instance;
        }

        this.instance = this;
        this.setupReactivity();
        this.loadPersistedState();
        this.setupAutoSave();
        this.setupViewportTracking();
        
        console.log('State Manager initialized');
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
     * Setup reactive state updates
     */
    static setupReactivity() {
        // Wrap state in Proxy for reactive updates
        this.state = new Proxy(this.state, {
            set: (target, property, value, receiver) => {
                const oldValue = target[property];
                const result = Reflect.set(target, property, value, receiver);
                
                if (oldValue !== value) {
                    this.notifyListeners(property, value, oldValue);
                }
                
                return result;
            }
        });

        // Setup deep reactivity for nested objects
        this.makeReactive(this.state);
    }

    /**
     * Make object reactive (deep)
     */
    static makeReactive(obj, path = '') {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        return new Proxy(obj, {
            set: (target, property, value, receiver) => {
                const oldValue = target[property];
                const result = Reflect.set(target, property, value, receiver);
                const fullPath = path ? `${path}.${property}` : property;
                
                if (oldValue !== value) {
                    this.notifyListeners(fullPath, value, oldValue);
                }
                
                // Make new value reactive if it's an object
                if (typeof value === 'object' && value !== null) {
                    target[property] = this.makeReactive(value, fullPath);
                }
                
                return result;
            },
            
            get: (target, property, receiver) => {
                const value = Reflect.get(target, property, receiver);
                
                // Make nested objects reactive when accessed
                if (typeof value === 'object' && value !== null && !value.__isReactive) {
                    const fullPath = path ? `${path}.${property}` : property;
                    target[property] = this.makeReactive(value, fullPath);
                    target[property].__isReactive = true;
                    return target[property];
                }
                
                return value;
            }
        });
    }

    /**
     * Get state value
     */
    static getState(path = null) {
        if (!path) {
            return this.state;
        }

        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, this.state);
    }

    /**
     * Set state value
     */
    static setState(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, this.state);
        
        target[lastKey] = value;
        
        // Persist critical state changes
        this.persistState();
    }

    /**
     * Update state (merge with existing)
     */
    static updateState(path, updates) {
        const currentValue = this.getState(path);
        
        if (typeof currentValue === 'object' && currentValue !== null) {
            const mergedValue = { ...currentValue, ...updates };
            this.setState(path, mergedValue);
        } else {
            this.setState(path, updates);
        }
    }

    /**
     * Subscribe to state changes
     */
    static subscribe(path, callback, options = {}) {
        const {
            immediate = false,
            once = false
        } = options;

        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        
        const wrappedCallback = (newValue, oldValue, fullPath) => {
            if (once) {
                this.listeners.get(path).delete(wrappedCallback);
            }
            callback(newValue, oldValue, fullPath);
        };
        
        this.listeners.get(path).add(wrappedCallback);
        
        // Call immediately with current value if requested
        if (immediate) {
            const currentValue = this.getState(path);
            callback(currentValue, undefined, path);
        }
        
        // Return unsubscribe function
        return () => {
            const pathListeners = this.listeners.get(path);
            if (pathListeners) {
                pathListeners.delete(wrappedCallback);
                if (pathListeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }

    /**
     * Unsubscribe from state changes
     */
    static unsubscribe(path, callback = null) {
        if (!callback) {
            // Remove all listeners for path
            this.listeners.delete(path);
        } else {
            // Remove specific callback
            const pathListeners = this.listeners.get(path);
            if (pathListeners) {
                pathListeners.delete(callback);
                if (pathListeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        }
    }

    /**
     * Notify listeners of state changes
     */
    static notifyListeners(path, newValue, oldValue) {
        // Notify exact path listeners
        const exactListeners = this.listeners.get(path);
        if (exactListeners) {
            exactListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            });
        }

        // Notify wildcard listeners (path starts with listener path)
        this.listeners.forEach((callbacks, listenerPath) => {
            if (listenerPath !== path && path.startsWith(listenerPath + '.')) {
                callbacks.forEach(callback => {
                    try {
                        callback(newValue, oldValue, path);
                    } catch (error) {
                        console.error('Error in wildcard state listener:', error);
                    }
                });
            }
        });

        // Notify parent path listeners
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            const parentListeners = this.listeners.get(parentPath + '.*');
            if (parentListeners) {
                const parentValue = this.getState(parentPath);
                parentListeners.forEach(callback => {
                    try {
                        callback(parentValue, undefined, parentPath);
                    } catch (error) {
                        console.error('Error in parent state listener:', error);
                    }
                });
            }
        }
    }

    /**
     * Load persisted state from storage
     */
    static loadPersistedState() {
        try {
            if (typeof StorageManager !== 'undefined') {
                // Load user state
                const userProfile = StorageManager.getItem('user_profile');
                if (userProfile) {
                    this.setState('user.profile', userProfile);
                    this.setState('user.isAuthenticated', true);
                }

                // Load user preferences
                const preferences = StorageManager.getItem('user_preferences', {
                    theme: 'default',
                    language: 'en',
                    notifications: true,
                    autoSave: true
                });
                this.setState('user.preferences', preferences);

                // Load app state
                const appState = StorageManager.getItem('app_state');
                if (appState) {
                    this.setState('app.currentTab', appState.currentTab || 'assessment');
                }

                // Load current assessment
                const currentAssessment = StorageManager.getItem('current_assessment');
                if (currentAssessment) {
                    this.setState('assessment', currentAssessment);
                }

                // Load configuration
                const questions = StorageManager.getItem('governance_questions', []);
                const rules = StorageManager.getItem('governance_rules', []);
                const templates = StorageManager.getItem('recommendation_templates', []);
                
                this.setState('config.questions', questions);
                this.setState('config.rules', rules);
                this.setState('config.templates', templates);

                // Load UI preferences
                const uiState = StorageManager.getItem('ui_state', {});
                if (uiState.theme) {
                    this.setState('ui.theme', uiState.theme);
                }
                if (uiState.sidebarCollapsed !== undefined) {
                    this.setState('ui.sidebarCollapsed', uiState.sidebarCollapsed);
                }

                console.log('Persisted state loaded successfully');
            }
        } catch (error) {
            console.error('Failed to load persisted state:', error);
        }
    }

    /**
     * Persist state to storage
     */
    static persistState() {
        try {
            if (typeof StorageManager !== 'undefined') {
                // Persist user state
                if (this.state.user.profile) {
                    StorageManager.setItem('user_profile', this.state.user.profile);
                }
                
                if (this.state.user.preferences) {
                    StorageManager.setItem('user_preferences', this.state.user.preferences);
                }

                // Persist app state
                StorageManager.setItem('app_state', {
                    currentTab: this.state.app.currentTab,
                    lastSaved: new Date().toISOString()
                });

                // Persist current assessment
                if (this.state.assessment.current) {
                    StorageManager.setItem('current_assessment', this.state.assessment);
                }

                // Persist UI state
                StorageManager.setItem('ui_state', {
                    theme: this.state.ui.theme,
                    sidebarCollapsed: this.state.ui.sidebarCollapsed
                });
            }
        } catch (error) {
            console.error('Failed to persist state:', error);
        }
    }

    /**
     * Setup automatic state persistence
     */
    static setupAutoSave() {
        // Auto-save critical state changes
        const criticalPaths = [
            'user.profile',
            'user.preferences',
            'assessment',
            'app.currentTab'
        ];

        criticalPaths.forEach(path => {
            this.subscribe(path, () => {
                // Debounced save to avoid excessive writes
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.persistState();
                }, 1000);
            });
        });

        // Periodic full state save
        setInterval(() => {
            this.persistState();
        }, 30000); // Every 30 seconds
    }

    /**
     * Setup viewport tracking
     */
    static setupViewportTracking() {
        const updateViewport = () => {
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: window.innerWidth < 768,
                isTablet: window.innerWidth >= 768 && window.innerWidth < 1024
            };
            
            this.setState('ui.viewport', viewport);
        };

        // Initial update
        updateViewport();

        // Update on resize (debounced)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateViewport, 250);
        });
    }

    /**
     * User state management
     */
    static setUser(userProfile) {
        this.setState('user.profile', userProfile);
        this.setState('user.isAuthenticated', true);
    }

    static getUser() {
        return this.getState('user.profile');
    }

    static logout() {
        this.setState('user.profile', null);
        this.setState('user.isAuthenticated', false);
        this.setState('assessment.current', null);
        
        // Clear persisted user data
        if (typeof StorageManager !== 'undefined') {
            StorageManager.removeItem('user_profile');
            StorageManager.removeItem('current_assessment');
        }
    }

    /**
     * Assessment state management
     */
    static startAssessment(assessment) {
        this.setState('assessment.current', assessment);
        this.setState('assessment.progress', 0);
        this.setState('assessment.answers', {});
        this.setState('assessment.currentQuestion', 0);
        this.setState('assessment.isComplete', false);
        this.setState('assessment.results', null);
    }

    static updateAssessmentProgress(progress) {
        this.setState('assessment.progress', progress);
    }

    static setAssessmentAnswer(questionId, answer) {
        const answers = { ...this.getState('assessment.answers') };
        answers[questionId] = answer;
        this.setState('assessment.answers', answers);
    }

    static completeAssessment(results) {
        this.setState('assessment.isComplete', true);
        this.setState('assessment.results', results);
        this.setState('assessment.progress', 100);
    }

    static getCurrentAssessment() {
        return this.getState('assessment.current');
    }

    /**
     * Configuration state management
     */
    static setQuestions(questions) {
        this.setState('config.questions', questions);
        this.setState('config.lastModified', new Date().toISOString());
        
        if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem('governance_questions', questions);
        }
    }

    static addQuestion(question) {
        const questions = [...this.getState('config.questions')];
        questions.push(question);
        this.setQuestions(questions);
    }

    static updateQuestion(questionId, updates) {
        const questions = this.getState('config.questions').map(q => 
            q.id === questionId ? { ...q, ...updates } : q
        );
        this.setQuestions(questions);
    }

    static removeQuestion(questionId) {
        const questions = this.getState('config.questions').filter(q => q.id !== questionId);
        this.setQuestions(questions);
    }

    static setRules(rules) {
        this.setState('config.rules', rules);
        this.setState('config.lastModified', new Date().toISOString());
        
        if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem('governance_rules', rules);
        }
    }

    static addRule(rule) {
        const rules = [...this.getState('config.rules')];
        rules.push(rule);
        this.setRules(rules);
    }

    static updateRule(ruleId, updates) {
        const rules = this.getState('config.rules').map(r => 
            r.id === ruleId ? { ...r, ...updates } : r
        );
        this.setRules(rules);
    }

    static removeRule(ruleId) {
        const rules = this.getState('config.rules').filter(r => r.id !== ruleId);
        this.setRules(rules);
    }

    static setTemplates(templates) {
        this.setState('config.templates', templates);
        this.setState('config.lastModified', new Date().toISOString());
        
        if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem('recommendation_templates', templates);
        }
    }

    static addTemplate(template) {
        const templates = [...this.getState('config.templates')];
        templates.push(template);
        this.setTemplates(templates);
    }

    static updateTemplate(templateId, updates) {
        const templates = this.getState('config.templates').map(t => 
            t.id === templateId ? { ...t, ...updates } : t
        );
        this.setTemplates(templates);
    }

    static removeTemplate(templateId) {
        const templates = this.getState('config.templates').filter(t => t.id !== templateId);
        this.setTemplates(templates);
    }

    /**
     * UI state management
     */
    static setCurrentTab(tab) {
        this.setState('app.currentTab', tab);
    }

    static getCurrentTab() {
        return this.getState('app.currentTab');
    }

    static setLoading(loading) {
        this.setState('app.loading', loading);
    }

    static isLoading() {
        return this.getState('app.loading');
    }

    static setError(error) {
        this.setState('app.error', error);
    }

    static getError() {
        return this.getState('app.error');
    }

    static clearError() {
        this.setState('app.error', null);
    }

    static setTheme(theme) {
        this.setState('ui.theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    static getTheme() {
        return this.getState('ui.theme');
    }

    static showModal(modalId, data = {}) {
        const modals = { ...this.getState('ui.modals') };
        modals[modalId] = { visible: true, data };
        this.setState('ui.modals', modals);
    }

    static hideModal(modalId) {
        const modals = { ...this.getState('ui.modals') };
        if (modals[modalId]) {
            modals[modalId].visible = false;
        }
        this.setState('ui.modals', modals);
    }

    static addNotification(notification) {
        const notifications = [...this.getState('ui.notifications')];
        const notificationWithId = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...notification
        };
        notifications.push(notificationWithId);
        this.setState('ui.notifications', notifications);
        
        // Auto-remove notification after delay
        if (notification.duration !== 0) {
            setTimeout(() => {
                this.removeNotification(notificationWithId.id);
            }, notification.duration || 3000);
        }
        
        return notificationWithId.id;
    }

    static removeNotification(notificationId) {
        const notifications = this.getState('ui.notifications').filter(n => n.id !== notificationId);
        this.setState('ui.notifications', notifications);
    }

    static clearNotifications() {
        this.setState('ui.notifications', []);
    }

    /**
     * Analytics state management
     */
    static setSessionId(sessionId) {
        this.setState('analytics.sessionId', sessionId);
    }

    static addEvent(event) {
        const events = [...this.getState('analytics.events')];
        events.push(event);
        
        // Keep only last 100 events in memory
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        this.setState('analytics.events', events);
    }

    static updateMetric(key, value) {
        const metrics = { ...this.getState('analytics.metrics') };
        metrics[key] = value;
        this.setState('analytics.metrics', metrics);
    }

    static setAnalyticsEnabled(enabled) {
        this.setState('analytics.enabled', enabled);
    }

    /**
     * Computed state getters
     */
    static getAssessmentCompletion() {
        const totalQuestions = this.getState('config.questions').length;
        const answeredQuestions = Object.keys(this.getState('assessment.answers')).length;
        
        if (totalQuestions === 0) return 0;
        return Math.round((answeredQuestions / totalQuestions) * 100);
    }

    static getUnansweredQuestions() {
        const questions = this.getState('config.questions');
        const answers = this.getState('assessment.answers');
        
        return questions.filter(q => !(q.id in answers) && q.required !== false);
    }

    static isAssessmentComplete() {
        return this.getUnansweredQuestions().length === 0;
    }

    static getActiveRules() {
        return this.getState('config.rules').filter(r => r.active !== false);
    }

    static getQuestionsByCategory() {
        const questions = this.getState('config.questions');
        return questions.reduce((acc, question) => {
            const category = question.category || 'uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(question);
            return acc;
        }, {});
    }

    /**
     * State validation
     */
    static validateState() {
        const errors = [];
        
        // Validate user state
        const user = this.getState('user.profile');
        if (user && !user.id) {
            errors.push('User profile missing ID');
        }
        
        // Validate questions
        const questions = this.getState('config.questions');
        questions.forEach((question, index) => {
            if (!question.id || !question.title || !question.type) {
                errors.push(`Question at index ${index} is missing required fields`);
            }
        });
        
        // Validate rules
        const rules = this.getState('config.rules');
        rules.forEach((rule, index) => {
            if (!rule.id || !rule.name || !rule.conditions || !rule.actions) {
                errors.push(`Rule at index ${index} is missing required fields`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * State debugging utilities
     */
    static debug() {
        return {
            state: this.state,
            listeners: Array.from(this.listeners.keys()),
            listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
            validation: this.validateState()
        };
    }

    static exportState() {
        return {
            state: JSON.parse(JSON.stringify(this.state)),
            timestamp: new Date().toISOString(),
            version: this.state.app.version
        };
    }

    static importState(stateData) {
        try {
            if (stateData.state) {
                this.state = this.makeReactive(stateData.state);
                this.persistState();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import state:', error);
            return false;
        }
    }

    /**
     * Reset state to defaults
     */
    static reset(preserveUser = false) {
        const user = preserveUser ? this.getState('user') : null;
        
        // Reset to initial state
        this.state = this.makeReactive({
            user: user || {
                profile: null,
                preferences: {},
                isAuthenticated: false
            },
            app: {
                initialized: false,
                currentTab: 'assessment',
                loading: false,
                error: null,
                version: '1.0.0'
            },
            assessment: {
                current: null,
                progress: 0,
                answers: {},
                currentQuestion: 0,
                totalQuestions: 0,
                isComplete: false,
                results: null
            },
            config: {
                questions: [],
                rules: [],
                templates: [],
                lastModified: null
            },
            ui: {
                theme: 'default',
                modals: {},
                notifications: [],
                sidebarCollapsed: false,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    isMobile: false,
                    isTablet: false
                }
            },
            analytics: {
                sessionId: null,
                events: [],
                metrics: {},
                enabled: true
            }
        });
        
        // Notify all listeners of reset
        this.listeners.forEach((callbacks, path) => {
            const newValue = this.getState(path);
            callbacks.forEach(callback => {
                try {
                    callback(newValue, undefined, path);
                } catch (error) {
                    console.error('Error in reset listener:', error);
                }
            });
        });
        
        if (!preserveUser) {
            // Clear persisted data
            if (typeof StorageManager !== 'undefined') {
                StorageManager.clear();
            }
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}