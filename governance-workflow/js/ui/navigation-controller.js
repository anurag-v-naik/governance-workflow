// js/ui/navigation-controller.js - Tab Navigation Controller

/**
 * Navigation Controller for Data Governance Decision Tool
 * Manages tab navigation and routing within the application
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class NavigationController {
    static currentTab = 'assessment';
    static tabs = new Map();
    static history = [];
    static maxHistory = 50;
    static isInitialized = false;
    static beforeNavigateCallbacks = [];
    static afterNavigateCallbacks = [];

    /**
     * Initialize navigation controller
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.setupTabs();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.restoreState();
        
        this.isInitialized = true;
        console.log('Navigation Controller initialized');
    }

    /**
     * Setup tab configuration
     */
    static setupTabs() {
        this.tabs.set('assessment', {
            id: 'assessment',
            name: 'Assessment',
            icon: '📊',
            element: document.getElementById('assessment-tab'),
            navElement: document.querySelector('[data-tab="assessment"]'),
            requiresAuth: false,
            requiresConfig: false,
            component: 'QuestionRenderer'
        });

        this.tabs.set('configuration', {
            id: 'configuration',
            name: 'Configuration',
            icon: '⚙️',
            element: document.getElementById('configuration-tab'),
            navElement: document.querySelector('[data-tab="configuration"]'),
            requiresAuth: true,
            requiresConfig: false,
            component: 'QuestionBuilder'
        });

        this.tabs.set('rules', {
            id: 'rules',
            name: 'Rules Engine',
            icon: '🔧',
            element: document.getElementById('rules-tab'),
            navElement: document.querySelector('[data-tab="rules"]'),
            requiresAuth: true,
            requiresConfig: false,
            component: 'RuleBuilder'
        });

        this.tabs.set('analytics', {
            id: 'analytics',
            name: 'Analytics',
            icon: '📈',
            element: document.getElementById('analytics-tab'),
            navElement: document.querySelector('[data-tab="analytics"]'),
            requiresAuth: false,
            requiresConfig: false,
            component: 'DashboardController'
        });

        this.tabs.set('templates', {
            id: 'templates',
            name: 'Templates',
            icon: '📝',
            element: document.getElementById('templates-tab'),
            navElement: document.querySelector('[data-tab="templates"]'),
            requiresAuth: true,
            requiresConfig: false,
            component: 'TemplateManager'
        });
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        // Tab click handlers
        document.querySelectorAll('.nav-tab').forEach(tabElement => {
            tabElement.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = tabElement.dataset.tab;
                if (tabId) {
                    this.navigateToTab(tabId);
                }
            });
        });

        // Browser back/forward handling
        window.addEventListener('popstate', (e) => {
            const state = e.state;
            if (state && state.tab) {
                this.navigateToTab(state.tab, { updateHistory: false });
            }
        });

        // Listen for programmatic navigation
        if (typeof EventBus !== 'undefined') {
            EventBus.on('navigation.tab.change', (data) => {
                this.navigateToTab(data.tab);
            });

            EventBus.on('navigation.back', () => {
                this.goBack();
            });

            EventBus.on('navigation.forward', () => {
                this.goForward();
            });
        }

        // Listen for state changes that might affect navigation
        if (typeof StateManager !== 'undefined') {
            StateManager.subscribe('user.isAuthenticated', (isAuth) => {
                this.updateTabVisibility();
            });

            StateManager.subscribe('app.currentTab', (tab) => {
                if (tab !== this.currentTab) {
                    this.navigateToTab(tab, { updateState: false });
                }
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + Number keys for tab navigation
            if (e.altKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabIds = Array.from(this.tabs.keys());
                if (tabIds[tabIndex]) {
                    this.navigateToTab(tabIds[tabIndex]);
                }
            }

            // Ctrl/Cmd + [ for back navigation
            if ((e.ctrlKey || e.metaKey) && e.key === '[') {
                e.preventDefault();
                this.goBack();
            }

            // Ctrl/Cmd + ] for forward navigation
            if ((e.ctrlKey || e.metaKey) && e.key === ']') {
                e.preventDefault();
                this.goForward();
            }

            // Escape to close current context
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
    }

    /**
     * Navigate to a specific tab
     */
    static navigateToTab(tabId, options = {}) {
        const {
            updateHistory = true,
            updateState = true,
            force = false,
            data = {}
        } = options;

        // Check if tab exists
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.error(`Tab '${tabId}' not found`);
            return false;
        }

        // Check if navigation is allowed
        if (!force && !this.canNavigateToTab(tabId)) {
            return false;
        }

        // Call before navigate callbacks
        const navigationData = {
            from: this.currentTab,
            to: tabId,
            data: data
        };

        for (const callback of this.beforeNavigateCallbacks) {
            try {
                const result = callback(navigationData);
                if (result === false) {
                    console.log('Navigation cancelled by before callback');
                    return false;
                }
            } catch (error) {
                console.error('Error in before navigate callback:', error);
            }
        }

        // Store previous tab for history
        const previousTab = this.currentTab;

        // Update current tab
        this.currentTab = tabId;

        // Update visual state
        this.updateTabDisplay();

        // Initialize tab component if needed
        this.initializeTabComponent(tab);

        // Update browser history
        if (updateHistory) {
            this.updateBrowserHistory(tabId);
        }

        // Update application state
        if (updateState && typeof StateManager !== 'undefined') {
            StateManager.setCurrentTab(tabId);
        }

        // Add to navigation history
        this.addToHistory(previousTab, tabId, data);

        // Emit navigation event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('navigation.changed', {
                from: previousTab,
                to: tabId,
                data: data,
                timestamp: new Date().toISOString()
            });
        }

        // Call after navigate callbacks
        for (const callback of this.afterNavigateCallbacks) {
            try {
                callback(navigationData);
            } catch (error) {
                console.error('Error in after navigate callback:', error);
            }
        }

        // Track navigation
        if (typeof UsageTracker !== 'undefined') {
            UsageTracker.trackEvent('tab_navigation', {
                from: previousTab,
                to: tabId,
                method: 'programmatic'
            });
        }

        return true;
    }

    /**
     * Check if navigation to tab is allowed
     */
    static canNavigateToTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        // Check authentication requirement
        if (tab.requiresAuth && typeof StateManager !== 'undefined') {
            const isAuthenticated = StateManager.getState('user.isAuthenticated');
            if (!isAuthenticated) {
                this.showAuthRequiredMessage();
                return false;
            }
        }

        // Check configuration requirement
        if (tab.requiresConfig && typeof StateManager !== 'undefined') {
            const questions = StateManager.getState('config.questions') || [];
            if (questions.length === 0) {
                this.showConfigRequiredMessage();
                return false;
            }
        }

        return true;
    }

    /**
     * Update tab display (visual state)
     */
    static updateTabDisplay() {
        // Update nav tab states
        document.querySelectorAll('.nav-tab').forEach(navTab => {
            navTab.classList.remove('active');
            if (navTab.dataset.tab === this.currentTab) {
                navTab.classList.add('active');
            }
        });

        // Update tab content visibility
        document.querySelectorAll('.tab-content').forEach(tabContent => {
            tabContent.classList.remove('active');
        });

        const currentTabElement = document.getElementById(`${this.currentTab}-tab`);
        if (currentTabElement) {
            currentTabElement.classList.add('active');
        }

        // Update page title
        const tab = this.tabs.get(this.currentTab);
        if (tab) {
            document.title = `${tab.name} - Data Governance Decision Tool`;
        }

        // Update accessibility
        this.updateAccessibility();
    }

    /**
     * Initialize tab component
     */
    static initializeTabComponent(tab) {
        if (!tab.component) return;

        // Get component class
        const ComponentClass = window[tab.component];
        if (!ComponentClass) {
            console.warn(`Component '${tab.component}' not found for tab '${tab.id}'`);
            return;
        }

        // Initialize component if it has an init method and hasn't been initialized
        if (typeof ComponentClass.init === 'function' && !ComponentClass.isInitialized) {
            try {
                ComponentClass.init();
            } catch (error) {
                console.error(`Error initializing component '${tab.component}':`, error);
            }
        }

        // Load tab-specific data if component has a load method
        if (typeof ComponentClass.load === 'function') {
            try {
                ComponentClass.load();
            } catch (error) {
                console.error(`Error loading data for component '${tab.component}':`, error);
            }
        }
    }

    /**
     * Update browser history
     */
    static updateBrowserHistory(tabId) {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        
        const state = {
            tab: tabId,
            timestamp: new Date().toISOString()
        };

        try {
            window.history.pushState(state, '', url.toString());
        } catch (error) {
            console.error('Error updating browser history:', error);
        }
    }

    /**
     * Add to navigation history
     */
    static addToHistory(from, to, data) {
        this.history.push({
            from,
            to,
            data,
            timestamp: new Date().toISOString()
        });

        // Maintain history size
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }

    /**
     * Go back in navigation history
     */
    static goBack() {
        if (this.history.length < 2) {
            return false;
        }

        // Find the last different tab
        let targetTab = null;
        for (let i = this.history.length - 2; i >= 0; i--) {
            if (this.history[i].to !== this.currentTab) {
                targetTab = this.history[i].to;
                break;
            }
        }

        if (targetTab) {
            this.navigateToTab(targetTab, { updateHistory: false });
            return true;
        }

        return false;
    }

    /**
     * Go forward in navigation history
     */
    static goForward() {
        // Browser handles this for now
        window.history.forward();
        return true;
    }

    /**
     * Get navigation history
     */
    static getHistory() {
        return [...this.history];
    }

    /**
     * Clear navigation history
     */
    static clearHistory() {
        this.history = [];
    }

    /**
     * Update tab visibility based on permissions
     */
    static updateTabVisibility() {
        this.tabs.forEach((tab, tabId) => {
            const navElement = tab.navElement;
            if (!navElement) return;

            let isVisible = true;

            // Check authentication requirement
            if (tab.requiresAuth && typeof StateManager !== 'undefined') {
                const isAuthenticated = StateManager.getState('user.isAuthenticated');
                if (!isAuthenticated) {
                    isVisible = false;
                }
            }

            // Update visibility
            navElement.style.display = isVisible ? '' : 'none';

            // If current tab becomes invisible, navigate to assessment
            if (!isVisible && this.currentTab === tabId) {
                this.navigateToTab('assessment');
            }
        });
    }

    /**
     * Update accessibility attributes
     */
    static updateAccessibility() {
        document.querySelectorAll('.nav-tab').forEach(navTab => {
            const isActive = navTab.dataset.tab === this.currentTab;
            navTab.setAttribute('aria-selected', isActive);
            navTab.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        document.querySelectorAll('.tab-content').forEach(tabContent => {
            const isActive = tabContent.classList.contains('active');
            tabContent.setAttribute('aria-hidden', !isActive);
        });
    }

    /**
     * Handle escape key
     */
    static handleEscape() {
        // Close any open modals first
        const openModals = document.querySelectorAll('.modal.show');
        if (openModals.length > 0) {
            openModals.forEach(modal => {
                if (typeof closeModal === 'function') {
                    closeModal(modal.id);
                }
            });
            return;
        }

        // If in a sub-view, go back to main view
        if (this.currentTab !== 'assessment') {
            this.navigateToTab('assessment');
        }
    }

    /**
     * Show authentication required message
     */
    static showAuthRequiredMessage() {
        if (typeof EventBus !== 'undefined') {
            EventBus.showNotification(
                'Authentication required to access this feature',
                'warning',
                5000
            );
        }
    }

    /**
     * Show configuration required message
     */
    static showConfigRequiredMessage() {
        if (typeof EventBus !== 'undefined') {
            EventBus.showNotification(
                'Please configure questions first in the Configuration tab',
                'info',
                5000
            );
        }
    }

    /**
     * Register before navigate callback
     */
    static onBeforeNavigate(callback) {
        if (typeof callback === 'function') {
            this.beforeNavigateCallbacks.push(callback);
            
            // Return unregister function
            return () => {
                const index = this.beforeNavigateCallbacks.indexOf(callback);
                if (index > -1) {
                    this.beforeNavigateCallbacks.splice(index, 1);
                }
            };
        }
    }

    /**
     * Register after navigate callback
     */
    static onAfterNavigate(callback) {
        if (typeof callback === 'function') {
            this.afterNavigateCallbacks.push(callback);
            
            // Return unregister function
            return () => {
                const index = this.afterNavigateCallbacks.indexOf(callback);
                if (index > -1) {
                    this.afterNavigateCallbacks.splice(index, 1);
                }
            };
        }
    }

    /**
     * Get current tab information
     */
    static getCurrentTab() {
        return this.tabs.get(this.currentTab);
    }

    /**
     * Get all tabs
     */
    static getAllTabs() {
        return Array.from(this.tabs.values());
    }

    /**
     * Check if tab exists
     */
    static hasTab(tabId) {
        return this.tabs.has(tabId);
    }

    /**
     * Add a new tab dynamically
     */
    static addTab(tabConfig) {
        const {
            id,
            name,
            icon,
            element,
            navElement,
            requiresAuth = false,
            requiresConfig = false,
            component = null
        } = tabConfig;

        if (!id || !name) {
            console.error('Tab ID and name are required');
            return false;
        }

        if (this.tabs.has(id)) {
            console.error(`Tab '${id}' already exists`);
            return false;
        }

        this.tabs.set(id, {
            id,
            name,
            icon,
            element,
            navElement,
            requiresAuth,
            requiresConfig,
            component
        });

        console.log(`Tab '${id}' added successfully`);
        return true;
    }

    /**
     * Remove a tab dynamically
     */
    static removeTab(tabId) {
        if (!this.tabs.has(tabId)) {
            console.error(`Tab '${tabId}' not found`);
            return false;
        }

        // If removing current tab, navigate to assessment
        if (this.currentTab === tabId) {
            this.navigateToTab('assessment');
        }

        this.tabs.delete(tabId);
        console.log(`Tab '${tabId}' removed successfully`);
        return true;
    }

    /**
     * Update tab configuration
     */
    static updateTab(tabId, updates) {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.error(`Tab '${tabId}' not found`);
            return false;
        }

        Object.assign(tab, updates);
        
        // Update display if it's the current tab
        if (this.currentTab === tabId) {
            this.updateTabDisplay();
        }

        return true;
    }

    /**
     * Set tab badge (notification indicator)
     */
    static setTabBadge(tabId, count) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.navElement) {
            return false;
        }

        // Remove existing badge
        const existingBadge = tab.navElement.querySelector('.tab-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add new badge if count > 0
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.setAttribute('aria-label', `${count} notifications`);
            tab.navElement.appendChild(badge);
        }

        return true;
    }

    /**
     * Clear tab badge
     */
    static clearTabBadge(tabId) {
        return this.setTabBadge(tabId, 0);
    }

    /**
     * Restore state from URL or storage
     */
    static restoreState() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab');
        
        if (urlTab && this.tabs.has(urlTab)) {
            this.currentTab = urlTab;
        } else if (typeof StateManager !== 'undefined') {
            // Fallback to stored state
            const storedTab = StateManager.getState('app.currentTab');
            if (storedTab && this.tabs.has(storedTab)) {
                this.currentTab = storedTab;
            }
        }

        // Initialize the current tab
        this.updateTabDisplay();
        const currentTab = this.tabs.get(this.currentTab);
        if (currentTab) {
            this.initializeTabComponent(currentTab);
        }
    }

    /**
     * Get navigation statistics
     */
    static getStats() {
        const tabVisits = {};
        
        // Count visits from history
        this.history.forEach(entry => {
            tabVisits[entry.to] = (tabVisits[entry.to] || 0) + 1;
        });

        return {
            currentTab: this.currentTab,
            totalNavigations: this.history.length,
            tabVisits,
            mostVisitedTab: Object.entries(tabVisits).reduce((a, b) => 
                tabVisits[a] > tabVisits[b] ? a : b, 'assessment'
            ),
            availableTabs: this.tabs.size,
            history: this.history.slice(-10) // Last 10 navigations
        };
    }

    /**
     * Export navigation data
     */
    static exportData() {
        return {
            currentTab: this.currentTab,
            history: this.history,
            stats: this.getStats(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import navigation data
     */
    static importData(data) {
        if (data.currentTab && this.tabs.has(data.currentTab)) {
            this.navigateToTab(data.currentTab);
        }
        
        if (data.history && Array.isArray(data.history)) {
            this.history = data.history.slice(-this.maxHistory);
        }
    }

    /**
     * Create breadcrumb navigation
     */
    static createBreadcrumb() {
        const breadcrumbItems = [];
        
        // Add home/assessment as root
        breadcrumbItems.push({
            name: 'Assessment',
            id: 'assessment',
            active: this.currentTab === 'assessment'
        });

        // Add current tab if not assessment
        if (this.currentTab !== 'assessment') {
            const currentTab = this.tabs.get(this.currentTab);
            if (currentTab) {
                breadcrumbItems.push({
                    name: currentTab.name,
                    id: currentTab.id,
                    active: true
                });
            }
        }

        return breadcrumbItems;
    }

    /**
     * Render breadcrumb HTML
     */
    static renderBreadcrumb(container) {
        if (!container) return;

        const breadcrumbs = this.createBreadcrumb();
        let html = '<nav class="breadcrumb" aria-label="Breadcrumb"><ol>';
        
        breadcrumbs.forEach((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            html += `
                <li class="breadcrumb-item ${crumb.active ? 'active' : ''}">
                    ${isLast ? 
                        `<span aria-current="page">${crumb.name}</span>` :
                        `<button type="button" onclick="NavigationController.navigateToTab('${crumb.id}')">${crumb.name}</button>`
                    }
                </li>
            `;
        });
        
        html += '</ol></nav>';
        container.innerHTML = html;
    }

    /**
     * Handle deep linking
     */
    static handleDeepLink(path) {
        const parts = path.split('/').filter(Boolean);
        
        if (parts.length === 0) {
            this.navigateToTab('assessment');
            return;
        }

        const tabId = parts[0];
        if (this.tabs.has(tabId)) {
            const data = { deepLink: parts.slice(1) };
            this.navigateToTab(tabId, { data });
        } else {
            console.error(`Deep link tab '${tabId}' not found`);
            this.navigateToTab('assessment');
        }
    }

    /**
     * Cleanup and destroy
     */
    static destroy() {
        // Remove event listeners
        document.querySelectorAll('.nav-tab').forEach(tabElement => {
            const newElement = tabElement.cloneNode(true);
            tabElement.parentNode.replaceChild(newElement, tabElement);
        });

        // Clear callbacks
        this.beforeNavigateCallbacks = [];
        this.afterNavigateCallbacks = [];

        // Clear history
        this.clearHistory();

        // Reset state
        this.currentTab = 'assessment';
        this.isInitialized = false;

        console.log('Navigation Controller destroyed');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationController;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.NavigationController = NavigationController;
}