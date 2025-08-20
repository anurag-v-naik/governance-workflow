// js/config/rule-builder.js - Rules Engine Configuration Builder

/**
 * Rule Builder for Data Governance Decision Tool
 * Visual rule configuration and management interface
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class RuleBuilder {
    static rules = [];
    static currentRule = null;
    static isInitialized = false;
    static isDirty = false;

    /**
     * Initialize rule builder
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.loadRules();
        this.setupEventListeners();
        this.renderRulesList();
        this.renderRuleEditor();
        
        this.isInitialized = true;
        console.log('Rule Builder initialized');
    }

    /**
     * Load rules from storage
     */
    static loadRules() {
        if (typeof StateManager !== 'undefined') {
            this.rules = StateManager.getState('config.rules') || [];
        } else {
            this.rules = StorageManager?.getItem('governance_rules') || [];
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        // Add rule button
        const addRuleBtn = document.getElementById('add-rule');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => this.createNewRule());
        }

        // Import/Export buttons
        const importBtn = document.getElementById('import-rules');
        const exportBtn = document.getElementById('export-rules');
        const testBtn = document.getElementById('test-rules');

        if (importBtn) {
            importBtn.addEventListener('click', () => this.importRules());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportRules());
        }

        if (testBtn) {
            testBtn.addEventListener('click', () => this.testRules());
        }

        // Rule form handlers
        const saveRuleBtn = document.getElementById('save-rule');
        const cancelRuleBtn = document.getElementById('cancel-rule');
        const addConditionBtn = document.getElementById('add-condition');
        const addActionBtn = document.getElementById('add-action');

        if (saveRuleBtn) {
            saveRuleBtn.addEventListener('click', () => this.saveCurrentRule());
        }

        if (cancelRuleBtn) {
            cancelRuleBtn.addEventListener('click', () => this.cancelRuleEdit());
        }

        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', () => this.addCondition());
        }

        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => this.addAction());
        }
    }

    /**
     * Render rules list
     */
    static renderRulesList() {
        const container = document.getElementById('rules-container');
        if (!container) return;

        if (this.rules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚙️</div>
                    <h3>No Rules Configured</h3>
                    <p>Create your first rule to define governance logic.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.rules.map((rule, index) => `
            <div class="rule-item ${this.currentRule?.id === rule.id ? 'active' : ''}" 
                 data-rule-id="${rule.id}">
                <div class="rule-item-header">
                    <div class="rule-item-title">${this.escapeHTML(rule.name)}</div>
                    <div class="rule-item-status ${rule.active ? 'active' : 'inactive'}">
                        ${rule.active ? 'Active' : 'Inactive'}
                    </div>
                </div>
                <div class="rule-item-description">
                    ${rule.description ? this.escapeHTML(rule.description) : 'No description'}
                </div>
                <div class="rule-item-meta">
                    <span class="rule-priority">Priority: ${rule.priority || 1}</span>
                    <span class="rule-category">${rule.category || 'General'}</span>
                </div>
                <div class="rule-item-actions">
                    <button type="button" class="btn-icon" onclick="RuleBuilder.editRule('${rule.id}')" 
                            title="Edit rule">
                        ✏️
                    </button>
                    <button type="button" class="btn-icon" onclick="RuleBuilder.toggleRule('${rule.id}')" 
                            title="Toggle active/inactive">
                        ${rule.active ? '⏸️' : '▶️'}
                    </button>
                    <button type="button" class="btn-icon" onclick="RuleBuilder.duplicateRule('${rule.id}')" 
                            title="Duplicate rule">
                        📋
                    </button>
                    <button type="button" class="btn-icon" onclick="RuleBuilder.deleteRule('${rule.id}')" 
                            title="Delete rule">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // Setup click handlers
        container.querySelectorAll('.rule-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.rule-item-actions')) {
                    const ruleId = item.dataset.ruleId;
                    this.editRule(ruleId);
                }
            });
        });
    }

    /**
     * Render rule editor
     */
    static renderRuleEditor() {
        const container = document.getElementById('rule-editor');
        if (!container) return;

        if (!this.currentRule) {
            container.innerHTML = `
                <div class="editor-placeholder">
                    <h3>Rule Editor</h3>
                    <p>Select a rule to edit or create a new one.</p>
                </div>
            `;
            return;
        }

        const rule = this.currentRule;
        container.innerHTML = `
            <div class="rule-editor-form">
                <h3>Edit Rule</h3>
                
                <div class="form-group">
                    <label for="rule-name" class="form-label">Rule Name *</label>
                    <input type="text" id="rule-name" class="form-input" 
                           value="${this.escapeHTML(rule.name)}" required>
                </div>
                
                <div class="form-group">
                    <label for="rule-description" class="form-label">Description</label>
                    <textarea id="rule-description" class="form-textarea" rows="2"
                              placeholder="Describe what this rule does">${this.escapeHTML(rule.description || '')}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="rule-category" class="form-label">Category</label>
                        <select id="rule-category" class="form-select">
                            <option value="data_classification" ${rule.category === 'data_classification' ? 'selected' : ''}>Data Classification</option>
                            <option value="governance_maturity" ${rule.category === 'governance_maturity' ? 'selected' : ''}>Governance Maturity</option>
                            <option value="compliance" ${rule.category === 'compliance' ? 'selected' : ''}>Compliance</option>
                            <option value="access_control" ${rule.category === 'access_control' ? 'selected' : ''}>Access Control</option>
                            <option value="organization_size" ${rule.category === 'organization_size' ? 'selected' : ''}>Organization Size</option>
                            <option value="general" ${rule.category === 'general' ? 'selected' : ''}>General</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="rule-priority" class="form-label">Priority</label>
                        <input type="number" id="rule-priority" class="form-input" 
                               value="${rule.priority || 1}" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label for="rule-active" class="form-label">Active</label>
                        <input type="checkbox" id="rule-active" class="form-checkbox" 
                               ${rule.active !== false ? 'checked' : ''}>
                    </div>
                </div>
                
                <div class="conditions-section">
                    <h4>Conditions</h4>
                    <div class="operator-select">
                        <label>Logical Operator:</label>
                        <select id="conditions-operator" class="form-select">
                            <option value="AND" ${rule.conditions?.operator === 'AND' ? 'selected' : ''}>AND</option>
                            <option value="OR" ${rule.conditions?.operator === 'OR' ? 'selected' : ''}>OR</option>
                            <option value="NOT" ${rule.conditions?.operator === 'NOT' ? 'selected' : ''}>NOT</option>
                        </select>
                    </div>
                    <div id="conditions-container" class="conditions-container">
                        ${this.renderConditions(rule.conditions?.rules || [])}
                    </div>
                    <button type="button" id="add-condition" class="btn btn-secondary btn-sm">Add Condition</button>
                </div>

                <div class="actions-section">
                    <h4>Actions</h4>
                    <div id="actions-container" class="actions-container">
                        ${this.renderActions(rule.actions || [])}
                    </div>
                    <button type="button" id="add-action" class="btn btn-secondary btn-sm">Add Action</button>
                </div>

                <div class="rule-form-actions">
                    <button type="button" id="save-rule" class="btn btn-primary">Save Rule</button>
                    <button type="button" id="cancel-rule" class="btn btn-secondary">Cancel</button>
                    <button type="button" id="delete-rule" class="btn btn-danger">Delete Rule</button>
                </div>
            </div>
        `;

        this.setupRuleEditorListeners();
    }

    /**
     * Render conditions
     */
    static renderConditions(conditions) {
        return conditions.map((condition, index) => `
            <div class="condition-item" data-index="${index}">
                <div class="condition-form">
                    <select class="condition-field form-select">
                        <option value="">Select Field</option>
                        <option value="question-1" ${condition.field === 'question-1' ? 'selected' : ''}>Data Type</option>
                        <option value="question-2" ${condition.field === 'question-2' ? 'selected' : ''}>Governance Maturity</option>
                        <option value="question-3" ${condition.field === 'question-3' ? 'selected' : ''}>Compliance</option>
                        <option value="question-4" ${condition.field === 'question-4' ? 'selected' : ''}>Access Control</option>
                        <option value="question-5" ${condition.field === 'question-5' ? 'selected' : ''}>Organization Size</option>
                    </select>
                    <select class="condition-operator form-select">
                        <option value="equals" ${condition.operator === 'equals' ? 'selected' : ''}>Equals</option>
                        <option value="not_equals" ${condition.operator === 'not_equals' ? 'selected' : ''}>Not Equals</option>
                        <option value="contains" ${condition.operator === 'contains' ? 'selected' : ''}>Contains</option>
                        <option value="not_contains" ${condition.operator === 'not_contains' ? 'selected' : ''}>Not Contains</option>
                    </select>
                    <input type="text" class="condition-value form-input" 
                           value="${this.escapeHTML(condition.value || '')}" placeholder="Value">
                    <button type="button" class="btn-icon remove-condition" onclick="RuleBuilder.removeCondition(${index})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render actions
     */
    static renderActions(actions) {
        return actions.map((action, index) => `
            <div class="action-item" data-index="${index}">
                <div class="action-form">
                    <select class="action-type form-select">
                        <option value="recommend" ${action.type === 'recommend' ? 'selected' : ''}>Recommend Template</option>
                        <option value="score" ${action.type === 'score' ? 'selected' : ''}>Adjust Score</option>
                        <option value="notify" ${action.type === 'notify' ? 'selected' : ''}>Send Notification</option>
                        <option value="route" ${action.type === 'route' ? 'selected' : ''}>Route to Section</option>
                    </select>
                    <input type="text" class="action-parameters form-input" 
                           value="${this.escapeHTML(JSON.stringify(action.parameters || {}))}" 
                           placeholder="Parameters (JSON)">
                    <button type="button" class="btn-icon remove-action" onclick="RuleBuilder.removeAction(${index})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup rule editor listeners
     */
    static setupRuleEditorListeners() {
        // Rule form handlers
        const saveRuleBtn = document.getElementById('save-rule');
        const cancelRuleBtn = document.getElementById('cancel-rule');
        const deleteRuleBtn = document.getElementById('delete-rule');

        if (saveRuleBtn) {
            saveRuleBtn.addEventListener('click', () => this.saveCurrentRule());
        }

        if (cancelRuleBtn) {
            cancelRuleBtn.addEventListener('click', () => this.cancelRuleEdit());
        }

        if (deleteRuleBtn) {
            deleteRuleBtn.addEventListener('click', () => this.deleteRule(this.currentRule.id));
        }

        // Add condition/action handlers
        const addConditionBtn = document.getElementById('add-condition');
        const addActionBtn = document.getElementById('add-action');

        if (addConditionBtn) {
            addConditionBtn.addEventListener('click', () => this.addCondition());
        }

        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => this.addAction());
        }
    }

    /**
     * Create new rule
     */
    static createNewRule() {
        const rule = {
            id: this.generateRuleId(),
            name: 'New Rule',
            description: '',
            category: 'general',
            priority: 1,
            active: true,
            conditions: {
                operator: 'AND',
                rules: []
            },
            actions: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.currentRule = rule;
        this.renderRuleEditor();
        this.markDirty();
    }

    /**
     * Edit existing rule
     */
    static editRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule) return;

        this.currentRule = { ...rule }; // Create a copy
        this.renderRulesList(); // Update active state
        this.renderRuleEditor();
    }

    /**
     * Save current rule
     */
    static saveCurrentRule() {
        if (!this.currentRule) return;

        // Collect form data
        const nameField = document.getElementById('rule-name');
        const descField = document.getElementById('rule-description');
        const categoryField = document.getElementById('rule-category');
        const priorityField = document.getElementById('rule-priority');
        const activeField = document.getElementById('rule-active');
        const operatorField = document.getElementById('conditions-operator');

        if (!nameField?.value.trim()) {
            alert('Rule name is required');
            return;
        }

        // Update rule
        this.currentRule.name = nameField.value.trim();
        this.currentRule.description = descField?.value.trim() || '';
        this.currentRule.category = categoryField?.value || 'general';
        this.currentRule.priority = parseInt(priorityField?.value) || 1;
        this.currentRule.active = activeField?.checked !== false;
        this.currentRule.modified = new Date().toISOString();

        // Collect conditions
        this.currentRule.conditions = {
            operator: operatorField?.value || 'AND',
            rules: this.collectConditions()
        };

        // Collect actions
        this.currentRule.actions = this.collectActions();

        // Save to rules array
        const existingIndex = this.rules.findIndex(r => r.id === this.currentRule.id);
        if (existingIndex >= 0) {
            this.rules[existingIndex] = this.currentRule;
        } else {
            this.rules.push(this.currentRule);
        }

        this.saveRules();
        this.renderRulesList();
        this.currentRule = null;
        this.renderRuleEditor();
        this.isDirty = false;
    }

    /**
     * Collect conditions from form
     */
    static collectConditions() {
        const conditionItems = document.querySelectorAll('.condition-item');
        const conditions = [];

        conditionItems.forEach(item => {
            const field = item.querySelector('.condition-field')?.value;
            const operator = item.querySelector('.condition-operator')?.value;
            const value = item.querySelector('.condition-value')?.value;

            if (field && operator && value) {
                conditions.push({ field, operator, value, weight: 1 });
            }
        });

        return conditions;
    }

    /**
     * Collect actions from form
     */
    static collectActions() {
        const actionItems = document.querySelectorAll('.action-item');
        const actions = [];

        actionItems.forEach(item => {
            const type = item.querySelector('.action-type')?.value;
            const parametersStr = item.querySelector('.action-parameters')?.value;

            if (type) {
                let parameters = {};
                try {
                    parameters = JSON.parse(parametersStr || '{}');
                } catch (e) {
                    console.warn('Invalid JSON in action parameters:', e);
                }

                actions.push({ type, parameters });
            }
        });

        return actions;
    }

    /**
     * Add condition
     */
    static addCondition() {
        const container = document.getElementById('conditions-container');
        if (!container) return;

        const index = container.children.length;
        const conditionHTML = this.renderConditions([{ field: '', operator: 'equals', value: '' }]);
        container.insertAdjacentHTML('beforeend', conditionHTML);
    }

    /**
     * Remove condition
     */
    static removeCondition(index) {
        const conditionItem = document.querySelector(`.condition-item[data-index="${index}"]`);
        if (conditionItem) {
            conditionItem.remove();
        }
    }

    /**
     * Add action
     */
    static addAction() {
        const container = document.getElementById('actions-container');
        if (!container) return;

        const index = container.children.length;
        const actionHTML = this.renderActions([{ type: 'recommend', parameters: {} }]);
        container.insertAdjacentHTML('beforeend', actionHTML);
    }

    /**
     * Remove action
     */
    static removeAction(index) {
        const actionItem = document.querySelector(`.action-item[data-index="${index}"]`);
        if (actionItem) {
            actionItem.remove();
        }
    }

    /**
     * Toggle rule active state
     */
    static toggleRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule) return;

        rule.active = !rule.active;
        rule.modified = new Date().toISOString();
        
        this.saveRules();
        this.renderRulesList();
    }

    /**
     * Duplicate rule
     */
    static duplicateRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule) return;

        const duplicatedRule = {
            ...JSON.parse(JSON.stringify(rule)),
            id: this.generateRuleId(),
            name: rule.name + ' (Copy)',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.rules.push(duplicatedRule);
        this.saveRules();
        this.renderRulesList();
    }

    /**
     * Delete rule
     */
    static deleteRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule) return;

        if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
            this.rules = this.rules.filter(r => r.id !== ruleId);
            
            if (this.currentRule?.id === ruleId) {
                this.currentRule = null;
                this.renderRuleEditor();
            }
            
            this.saveRules();
            this.renderRulesList();
        }
    }

    /**
     * Cancel rule edit
     */
    static cancelRuleEdit() {
        this.currentRule = null;
        this.renderRuleEditor();
        this.isDirty = false;
    }

    /**
     * Test rules
     */
    static testRules() {
        if (typeof RulesEngine !== 'undefined') {
            // Create test data
            const testData = {
                'question-1': 'financial_data',
                'question-2': 'basic',
                'question-3': ['gdpr', 'sox'],
                'question-4': 'basic_permissions',
                'question-5': 'medium'
            };

            const results = RulesEngine.testRules(testData, this.rules);
            this.showTestResults(results);
        } else {
            alert('Rules Engine not available for testing');
        }
    }

    /**
     * Show test results
     */
    static showTestResults(results) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Rule Test Results</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="test-summary">
                        <p><strong>Total Rules:</strong> ${results.summary.totalRules}</p>
                        <p><strong>Evaluated:</strong> ${results.results.evaluatedRules}</p>
                        <p><strong>Matched:</strong> ${results.results.matchedRules}</p>
                        <p><strong>Success Rate:</strong> ${results.summary.successRate}</p>
                    </div>
                    <div class="test-details">
                        <h3>Test Data Used:</h3>
                        <pre>${JSON.stringify(results.context.answers, null, 2)}</pre>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Export rules
     */
    static exportRules() {
        const exportData = {
            rules: this.rules,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `governance-rules-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import rules
     */
    static importRules() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processRulesImport(file);
            }
        };
        input.click();
    }

    /**
     * Process rules import
     */
    static async processRulesImport(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (importData.rules && Array.isArray(importData.rules)) {
                if (confirm(`Import ${importData.rules.length} rules? This will replace existing rules.`)) {
                    this.rules = importData.rules;
                    this.saveRules();
                    this.renderRulesList();
                    this.currentRule = null;
                    this.renderRuleEditor();
                    alert('Rules imported successfully');
                }
            } else {
                alert('Invalid rules file format');
            }
        } catch (error) {
            console.error('Failed to import rules:', error);
            alert('Failed to import rules: ' + error.message);
        }
    }

    /**
     * Save rules to storage
     */
    static saveRules() {
        if (typeof StateManager !== 'undefined') {
            StateManager.setRules(this.rules);
        } else if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem('governance_rules', this.rules);
        }
    }

    /**
     * Generate unique rule ID
     */
    static generateRuleId() {
        return 'rule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Mark as dirty (unsaved changes)
     */
    static markDirty() {
        this.isDirty = true;
    }

    /**
     * Escape HTML
     */
    static escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Load rules list
     */
    static loadRulesList() {
        this.loadRules();
        this.renderRulesList();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RuleBuilder;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.RuleBuilder = RuleBuilder;
}