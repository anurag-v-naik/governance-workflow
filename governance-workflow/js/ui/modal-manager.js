// js/ui/modal-manager.js - Modal Dialog Management

/**
 * Modal Manager for Data Governance Decision Tool
 * Manages modal dialogs, overlays, and popup interactions
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class ModalManager {
    static modals = new Map();
    static modalStack = [];
    static isInitialized = false;
    static defaultOptions = {
        backdrop: true,
        keyboard: true,
        focus: true,
        autoHide: false,
        hideDelay: 0,
        animation: true,
        size: 'medium',
        position: 'center',
        zIndex: 1050
    };

    /**
     * Initialize modal manager
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.setupEventListeners();
        this.discoverModals();
        this.createModalContainer();
        
        this.isInitialized = true;
        console.log('Modal Manager initialized');
    }

    /**
     * Setup global event listeners
     */
    static setupEventListeners() {
        // Global keyboard handler
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            this.handleBackdropClick(e);
        });

        // Listen for programmatic modal events
        if (typeof EventBus !== 'undefined') {
            EventBus.on('modal.show', (data) => {
                this.show(data.modalId, data.options, data.data);
            });

            EventBus.on('modal.hide', (data) => {
                this.hide(data.modalId);
            });

            EventBus.on('modal.hideAll', () => {
                this.hideAll();
            });
        }
    }

    /**
     * Discover existing modals in the DOM
     */
    static discoverModals() {
        document.querySelectorAll('.modal').forEach(modalElement => {
            const modalId = modalElement.id;
            if (modalId) {
                this.register(modalId, modalElement);
            }
        });
    }

    /**
     * Create modal container if it doesn't exist
     */
    static createModalContainer() {
        let container = document.getElementById('modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modal-container';
            container.className = 'modal-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    /**
     * Register a modal
     */
    static register(modalId, element, options = {}) {
        if (this.modals.has(modalId)) {
            console.warn(`Modal '${modalId}' is already registered`);
            return false;
        }

        const modal = {
            id: modalId,
            element: element,
            options: { ...this.defaultOptions, ...options },
            isVisible: false,
            data: null,
            callbacks: {
                beforeShow: [],
                afterShow: [],
                beforeHide: [],
                afterHide: []
            }
        };

        this.modals.set(modalId, modal);
        this.setupModalEventListeners(modal);
        
        console.log(`Modal '${modalId}' registered`);
        return true;
    }

    /**
     * Create a new modal dynamically
     */
    static create(modalId, config = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'medium',
            buttons = [],
            className = '',
            template = 'default'
        } = config;

        // Create modal HTML
        const modalHTML = this.generateModalHTML(modalId, {
            title,
            content,
            size,
            buttons,
            className,
            template
        });

        // Create modal element
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        const modal = modalElement.firstElementChild;

        // Add to container
        this.container.appendChild(modal);

        // Register the modal
        this.register(modalId, modal, config);

        return modal;
    }

    /**
     * Generate modal HTML
     */
    static generateModalHTML(modalId, config) {
        const { title, content, size, buttons, className, template } = config;

        let buttonsHTML = '';
        if (buttons.length > 0) {
            buttonsHTML = `
                <div class="modal-footer">
                    ${buttons.map(button => `
                        <button type="button" 
                                class="btn ${button.className || 'btn-secondary'}"
                                ${button.id ? `id="${button.id}"` : ''}
                                ${button.onclick ? `onclick="${button.onclick}"` : ''}
                                ${button.disabled ? 'disabled' : ''}>
                            ${button.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        switch (template) {
            case 'confirm':
                return this.generateConfirmModalHTML(modalId, config);
            case 'alert':
                return this.generateAlertModalHTML(modalId, config);
            case 'form':
                return this.generateFormModalHTML(modalId, config);
            default:
                return `
                    <div class="modal ${className}" id="${modalId}" tabindex="-1" aria-hidden="true">
                        <div class="modal-content modal-${size}">
                            <div class="modal-header">
                                <h2 class="modal-title">${title}</h2>
                                <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close">
                                    &times;
                                </button>
                            </div>
                            <div class="modal-body">
                                ${content}
                            </div>
                            ${buttonsHTML}
                        </div>
                    </div>
                `;
        }
    }

    /**
     * Generate confirmation modal HTML
     */
    static generateConfirmModalHTML(modalId, config) {
        const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' } = config;
        
        return `
            <div class="modal modal-confirm" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <div class="modal-icon modal-icon-${type}">
                            ${this.getIconForType(type)}
                        </div>
                        <h2 class="modal-title">${title}</h2>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            ${cancelText}
                        </button>
                        <button type="button" class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" 
                                id="${modalId}-confirm">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate alert modal HTML
     */
    static generateAlertModalHTML(modalId, config) {
        const { title, message, buttonText = 'OK', type = 'info' } = config;
        
        return `
            <div class="modal modal-alert" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <div class="modal-icon modal-icon-${type}">
                            ${this.getIconForType(type)}
                        </div>
                        <h2 class="modal-title">${title}</h2>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-dismiss="modal">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate form modal HTML
     */
    static generateFormModalHTML(modalId, config) {
        const { title, fields = [], submitText = 'Submit', cancelText = 'Cancel' } = config;
        
        const fieldsHTML = fields.map(field => {
            switch (field.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'number':
                    return `
                        <div class="form-group">
                            <label for="${field.id}" class="form-label">
                                ${field.label}
                                ${field.required ? '<span class="required">*</span>' : ''}
                            </label>
                            <input type="${field.type}" 
                                   id="${field.id}" 
                                   name="${field.name || field.id}"
                                   class="form-input"
                                   ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                                   ${field.required ? 'required' : ''}
                                   ${field.value ? `value="${field.value}"` : ''}>
                        </div>
                    `;
                case 'textarea':
                    return `
                        <div class="form-group">
                            <label for="${field.id}" class="form-label">
                                ${field.label}
                                ${field.required ? '<span class="required">*</span>' : ''}
                            </label>
                            <textarea id="${field.id}" 
                                      name="${field.name || field.id}"
                                      class="form-textarea"
                                      ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                                      ${field.required ? 'required' : ''}
                                      rows="${field.rows || 3}">${field.value || ''}</textarea>
                        </div>
                    `;
                case 'select':
                    return `
                        <div class="form-group">
                            <label for="${field.id}" class="form-label">
                                ${field.label}
                                ${field.required ? '<span class="required">*</span>' : ''}
                            </label>
                            <select id="${field.id}" 
                                    name="${field.name || field.id}"
                                    class="form-select"
                                    ${field.required ? 'required' : ''}>
                                ${field.options.map(option => `
                                    <option value="${option.value}" 
                                            ${option.selected ? 'selected' : ''}>
                                        ${option.text}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                case 'checkbox':
                    return `
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" 
                                       id="${field.id}" 
                                       name="${field.name || field.id}"
                                       ${field.checked ? 'checked' : ''}
                                       ${field.required ? 'required' : ''}>
                                <span class="checkbox-text">${field.label}</span>
                            </label>
                        </div>
                    `;
                default:
                    return '';
            }
        }).join('');
        
        return `
            <div class="modal modal-form" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-content modal-medium">
                    <div class="modal-header">
                        <h2 class="modal-title">${title}</h2>
                        <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close">
                            &times;
                        </button>
                    </div>
                    <form class="modal-form-content">
                        <div class="modal-body">
                            ${fieldsHTML}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                                ${cancelText}
                            </button>
                            <button type="submit" class="btn btn-primary">
                                ${submitText}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Get icon for modal type
     */
    static getIconForType(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            danger: '❌',
            question: '❓'
        };
        return icons[type] || icons.info;
    }

    /**
     * Setup event listeners for a specific modal
     */
    static setupModalEventListeners(modal) {
        const element = modal.element;

        // Close button handlers
        element.querySelectorAll('[data-dismiss="modal"], .modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide(modal.id);
            });
        });

        // Form submission for form modals
        const form = element.querySelector('.modal-form-content');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(modal, form);
            });
        }

        // Prevent modal content clicks from closing modal
        const modalContent = element.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    /**
     * Show a modal
     */
    static show(modalId, options = {}, data = null) {
        const modal = this.modals.get(modalId);
        if (!modal) {
            console.error(`Modal '${modalId}' not found`);
            return false;
        }

        if (modal.isVisible) {
            console.log(`Modal '${modalId}' is already visible`);
            return false;
        }

        // Call before show callbacks
        const beforeShowResult = this.callCallbacks(modal, 'beforeShow', data);
        if (beforeShowResult === false) {
            return false;
        }

        // Update modal data
        modal.data = data;
        modal.options = { ...modal.options, ...options };

        // Add to modal stack
        this.modalStack.push(modalId);

        // Show the modal
        this.showModal(modal);

        // Call after show callbacks
        this.callCallbacks(modal, 'afterShow', data);

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('modal.shown', {
                modalId: modalId,
                data: data
            });
        }

        return true;
    }

    /**
     * Hide a modal
     */
    static hide(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) {
            console.error(`Modal '${modalId}' not found`);
            return false;
        }

        if (!modal.isVisible) {
            console.log(`Modal '${modalId}' is not visible`);
            return false;
        }

        // Call before hide callbacks
        const beforeHideResult = this.callCallbacks(modal, 'beforeHide', modal.data);
        if (beforeHideResult === false) {
            return false;
        }

        // Remove from modal stack
        const index = this.modalStack.indexOf(modalId);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }

        // Hide the modal
        this.hideModal(modal);

        // Call after hide callbacks
        this.callCallbacks(modal, 'afterHide', modal.data);

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('modal.hidden', {
                modalId: modalId,
                data: modal.data
            });
        }

        return true;
    }

    /**
     * Show modal implementation
     */
    static showModal(modal) {
        const element = modal.element;
        
        // Set z-index based on stack position
        const zIndex = modal.options.zIndex + this.modalStack.length;
        element.style.zIndex = zIndex;

        // Add classes and attributes
        element.classList.remove('hidden');
        element.classList.add('show');
        element.setAttribute('aria-hidden', 'false');
        
        // Update visibility state
        modal.isVisible = true;

        // Handle backdrop
        if (modal.options.backdrop) {
            this.showBackdrop();
        }

        // Handle focus
        if (modal.options.focus) {
            this.focusModal(modal);
        }

        // Handle animation
        if (modal.options.animation) {
            element.style.opacity = '0';
            element.style.transform = 'scale(0.9)';
            
            // Trigger animation
            requestAnimationFrame(() => {
                element.style.transition = 'all 0.3s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
            });
        }

        // Auto hide if specified
        if (modal.options.autoHide && modal.options.hideDelay > 0) {
            setTimeout(() => {
                this.hide(modal.id);
            }, modal.options.hideDelay);
        }

        // Prevent body scroll
        document.body.classList.add('modal-open');
    }

    /**
     * Hide modal implementation
     */
    static hideModal(modal) {
        const element = modal.element;

        // Handle animation
        if (modal.options.animation) {
            element.style.transition = 'all 0.3s ease-out';
            element.style.opacity = '0';
            element.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                this.completeHideModal(modal);
            }, 300);
        } else {
            this.completeHideModal(modal);
        }
    }

    /**
     * Complete modal hide process
     */
    static completeHideModal(modal) {
        const element = modal.element;
        
        // Remove classes and attributes
        element.classList.remove('show');
        element.classList.add('hidden');
        element.setAttribute('aria-hidden', 'true');
        
        // Reset styles
        element.style.opacity = '';
        element.style.transform = '';
        element.style.transition = '';
        
        // Update visibility state
        modal.isVisible = false;
        modal.data = null;

        // Hide backdrop if no other modals
        if (this.modalStack.length === 0) {
            this.hideBackdrop();
            document.body.classList.remove('modal-open');
        }

        // Return focus to previous element
        this.returnFocus(modal);
    }

    /**
     * Show backdrop
     */
    static showBackdrop() {
        let backdrop = document.getElementById('modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'modal-backdrop';
            backdrop.className = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }
        
        backdrop.classList.add('show');
        backdrop.style.zIndex = this.defaultOptions.zIndex - 1;
    }

    /**
     * Hide backdrop
     */
    static hideBackdrop() {
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
            setTimeout(() => {
                if (backdrop.parentNode && this.modalStack.length === 0) {
                    backdrop.remove();
                }
            }, 300);
        }
    }

    /**
     * Focus modal
     */
    static focusModal(modal) {
        const element = modal.element;
        
        // Store current focus for restoration
        modal.previousFocus = document.activeElement;
        
        // Focus the modal or first focusable element
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else {
            element.focus();
        }

        // Trap focus within modal
        this.trapFocus(modal);
    }

    /**
     * Trap focus within modal
     */
    static trapFocus(modal) {
        const element = modal.element;
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Store the focus trap handler
        modal.focusTrapHandler = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        element.addEventListener('keydown', modal.focusTrapHandler);
    }

    /**
     * Return focus to previous element
     */
    static returnFocus(modal) {
        // Remove focus trap
        if (modal.focusTrapHandler) {
            modal.element.removeEventListener('keydown', modal.focusTrapHandler);
            modal.focusTrapHandler = null;
        }

        // Return focus to previous element
        if (modal.previousFocus && typeof modal.previousFocus.focus === 'function') {
            modal.previousFocus.focus();
        }
        
        modal.previousFocus = null;
    }

    /**
     * Handle global keydown events
     */
    static handleGlobalKeydown(e) {
        if (this.modalStack.length === 0) return;

        const topModalId = this.modalStack[this.modalStack.length - 1];
        const topModal = this.modals.get(topModalId);
        
        if (!topModal || !topModal.options.keyboard) return;

        // Escape key closes modal
        if (e.key === 'Escape') {
            e.preventDefault();
            this.hide(topModalId);
        }
    }

    /**
     * Handle backdrop clicks
     */
    static handleBackdropClick(e) {
        if (this.modalStack.length === 0) return;

        const topModalId = this.modalStack[this.modalStack.length - 1];
        const topModal = this.modals.get(topModalId);
        
        if (!topModal || !topModal.options.backdrop) return;

        // Check if click is on modal backdrop
        if (e.target.classList.contains('modal') && e.target.id === topModalId) {
            this.hide(topModalId);
        }
    }

    /**
     * Handle form submission in modals
     */
    static handleFormSubmit(modal, form) {
        const formData = new FormData(form);
        const data = {};
        
        // Convert FormData to object
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Emit form submit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('modal.form.submit', {
                modalId: modal.id,
                formData: data,
                form: form
            });
        }

        // Call form submit callbacks if any
        this.callCallbacks(modal, 'formSubmit', data);
    }

    /**
     * Hide all modals
     */
    static hideAll() {
        // Hide modals in reverse order (top to bottom)
        const modalsToHide = [...this.modalStack].reverse();
        modalsToHide.forEach(modalId => {
            this.hide(modalId);
        });
    }

    /**
     * Get top modal
     */
    static getTopModal() {
        if (this.modalStack.length === 0) return null;
        const topModalId = this.modalStack[this.modalStack.length - 1];
        return this.modals.get(topModalId);
    }

    /**
     * Check if any modal is visible
     */
    static hasVisibleModal() {
        return this.modalStack.length > 0;
    }

    /**
     * Get visible modals
     */
    static getVisibleModals() {
        return this.modalStack.map(modalId => this.modals.get(modalId));
    }

    /**
     * Add event callback
     */
    static on(modalId, event, callback) {
        const modal = this.modals.get(modalId);
        if (!modal) {
            console.error(`Modal '${modalId}' not found`);
            return false;
        }

        if (!modal.callbacks[event]) {
            modal.callbacks[event] = [];
        }

        modal.callbacks[event].push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = modal.callbacks[event].indexOf(callback);
            if (index > -1) {
                modal.callbacks[event].splice(index, 1);
            }
        };
    }

    /**
     * Remove event callback
     */
    static off(modalId, event, callback = null) {
        const modal = this.modals.get(modalId);
        if (!modal) return false;

        if (!callback) {
            // Remove all callbacks for event
            modal.callbacks[event] = [];
        } else {
            // Remove specific callback
            const index = modal.callbacks[event].indexOf(callback);
            if (index > -1) {
                modal.callbacks[event].splice(index, 1);
            }
        }

        return true;
    }

    /**
     * Call callbacks for an event
     */
    static callCallbacks(modal, event, data) {
        const callbacks = modal.callbacks[event] || [];
        let result = true;

        for (const callback of callbacks) {
            try {
                const callbackResult = callback(data, modal);
                if (callbackResult === false) {
                    result = false;
                    break;
                }
            } catch (error) {
                console.error(`Error in modal callback for ${event}:`, error);
            }
        }

        return result;
    }

    /**
     * Update modal content
     */
    static updateContent(modalId, content) {
        const modal = this.modals.get(modalId);
        if (!modal) return false;

        const bodyElement = modal.element.querySelector('.modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
            return true;
        }

        return false;
    }

    /**
     * Update modal title
     */
    static updateTitle(modalId, title) {
        const modal = this.modals.get(modalId);
        if (!modal) return false;

        const titleElement = modal.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
            return true;
        }

        return false;
    }

    /**
     * Convenience methods for common modal types
     */
    static alert(title, message, options = {}) {
        const modalId = `alert-${Date.now()}`;
        
        const modal = this.create(modalId, {
            title,
            message,
            template: 'alert',
            ...options
        });

        this.show(modalId);
        
        return new Promise((resolve) => {
            this.on(modalId, 'afterHide', () => {
                modal.remove();
                resolve();
            });
        });
    }

    static confirm(title, message, options = {}) {
        const modalId = `confirm-${Date.now()}`;
        
        const modal = this.create(modalId, {
            title,
            message,
            template: 'confirm',
            ...options
        });

        this.show(modalId);
        
        return new Promise((resolve) => {
            const confirmBtn = modal.querySelector(`#${modalId}-confirm`);
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.hide(modalId);
                    resolve(true);
                });
            }

            this.on(modalId, 'afterHide', () => {
                modal.remove();
                resolve(false);
            });
        });
    }

    static prompt(title, fields, options = {}) {
        const modalId = `prompt-${Date.now()}`;
        
        const modal = this.create(modalId, {
            title,
            fields,
            template: 'form',
            ...options
        });

        this.show(modalId);
        
        return new Promise((resolve) => {
            this.on(modalId, 'formSubmit', (data) => {
                this.hide(modalId);
                resolve(data);
            });

            this.on(modalId, 'afterHide', () => {
                modal.remove();
                resolve(null);
            });
        });
    }

    /**
     * Remove a modal
     */
    static remove(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) return false;

        // Hide modal if visible
        if (modal.isVisible) {
            this.hide(modalId);
        }

        // Remove from DOM
        if (modal.element && modal.element.parentNode) {
            modal.element.remove();
        }

        // Remove from registry
        this.modals.delete(modalId);
        
        console.log(`Modal '${modalId}' removed`);
        return true;
    }

    /**
     * Get modal data
     */
    static getData(modalId) {
        const modal = this.modals.get(modalId);
        return modal ? modal.data : null;
    }

    /**
     * Set modal data
     */
    static setData(modalId, data) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.data = data;
            return true;
        }
        return false;
    }

    /**
     * Get modal statistics
     */
    static getStats() {
        return {
            totalModals: this.modals.size,
            visibleModals: this.modalStack.length,
            modalStack: [...this.modalStack],
            registeredModals: Array.from(this.modals.keys())
        };
    }

    /**
     * Export modal data
     */
    static exportData() {
        const modalData = {};
        
        this.modals.forEach((modal, modalId) => {
            modalData[modalId] = {
                id: modal.id,
                isVisible: modal.isVisible,
                data: modal.data,
                options: modal.options
            };
        });

        return {
            modals: modalData,
            modalStack: this.modalStack,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Cleanup and destroy
     */
    static destroy() {
        // Hide all modals
        this.hideAll();

        // Remove all modals
        this.modals.forEach((modal, modalId) => {
            this.remove(modalId);
        });

        // Remove backdrop
        this.hideBackdrop();

        // Remove event listeners
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('click', this.handleBackdropClick);

        // Reset state
        this.modals.clear();
        this.modalStack = [];
        this.isInitialized = false;

        console.log('Modal Manager destroyed');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}