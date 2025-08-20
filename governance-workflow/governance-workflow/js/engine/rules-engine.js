// js/engine/rules-engine.js - Rule Evaluation Engine

/**
 * Rules Engine for Data Governance Decision Tool
 * Evaluates business rules and applies actions based on assessment responses
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class RulesEngine {
    static rules = [];
    static isInitialized = false;
    static evaluationContext = {};
    static debugMode = false;

    /**
     * Initialize rules engine
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.loadRules();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('Rules Engine initialized');
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

        // Sort rules by priority (higher priority first)
        this.rules.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        if (typeof EventBus !== 'undefined') {
            EventBus.on('assessment.complete', (data) => {
                this.evaluateAssessment(data.answers, data.assessmentId);
            });

            EventBus.on('rules.evaluate', (data) => {
                this.evaluateRules(data.context, data.rules);
            });
        }
    }

    /**
     * Evaluate all rules against assessment answers
     */
    static evaluateAssessment(answers, assessmentId) {
        const context = {
            answers: answers,
            assessmentId: assessmentId,
            timestamp: new Date().toISOString(),
            user: StateManager?.getState('user.profile'),
            questions: StateManager?.getState('config.questions') || []
        };

        return this.evaluateRules(context);
    }

    /**
     * Evaluate rules against a context
     */
    static evaluateRules(context, rulesToEvaluate = null) {
        const rules = rulesToEvaluate || this.rules.filter(rule => rule.active !== false);
        const results = {
            evaluatedRules: 0,
            matchedRules: 0,
            appliedActions: 0,
            score: 0,
            recommendations: [],
            actions: [],
            errors: []
        };

        this.evaluationContext = context;

        if (this.debugMode) {
            console.log('Evaluating rules with context:', context);
        }

        for (const rule of rules) {
            try {
                results.evaluatedRules++;
                
                const ruleResult = this.evaluateRule(rule, context);
                
                if (ruleResult.matched) {
                    results.matchedRules++;
                    
                    // Apply rule actions
                    const actionResults = this.applyRuleActions(rule, context, ruleResult);
                    results.appliedActions += actionResults.length;
                    results.actions.push(...actionResults);
                    
                    // Accumulate score
                    if (ruleResult.score) {
                        results.score += ruleResult.score;
                    }
                    
                    // Collect recommendations
                    if (ruleResult.recommendations) {
                        results.recommendations.push(...ruleResult.recommendations);
                    }
                }
                
            } catch (error) {
                console.error(`Error evaluating rule ${rule.id}:`, error);
                results.errors.push({
                    ruleId: rule.id,
                    error: error.message
                });
            }
        }

        if (this.debugMode) {
            console.log('Rule evaluation results:', results);
        }

        // Emit results event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('rules.evaluated', {
                context: context,
                results: results
            });
        }

        return results;
    }

    /**
     * Evaluate a single rule
     */
    static evaluateRule(rule, context) {
        const result = {
            ruleId: rule.id,
            matched: false,
            score: 0,
            recommendations: [],
            conditions: []
        };

        if (!rule.conditions) {
            return result;
        }

        // Evaluate rule conditions
        const conditionResult = this.evaluateConditions(rule.conditions, context);
        result.matched = conditionResult.matched;
        result.conditions = conditionResult.details;

        if (this.debugMode) {
            console.log(`Rule ${rule.id} evaluation:`, {
                matched: result.matched,
                conditions: result.conditions
            });
        }

        return result;
    }

    /**
     * Evaluate rule conditions
     */
    static evaluateConditions(conditions, context) {
        const result = {
            matched: false,
            details: []
        };

        if (!conditions.rules || !Array.isArray(conditions.rules)) {
            return result;
        }

        const operator = conditions.operator || 'AND';
        const conditionResults = [];

        // Evaluate each condition
        for (const condition of conditions.rules) {
            const conditionResult = this.evaluateCondition(condition, context);
            conditionResults.push(conditionResult);
            result.details.push({
                condition: condition,
                result: conditionResult
            });
        }

        // Apply logical operator
        switch (operator.toUpperCase()) {
            case 'AND':
                result.matched = conditionResults.every(r => r.matched);
                break;
            case 'OR':
                result.matched = conditionResults.some(r => r.matched);
                break;
            case 'NOT':
                result.matched = !conditionResults[0]?.matched;
                break;
            case 'XOR':
                const trueCount = conditionResults.filter(r => r.matched).length;
                result.matched = trueCount === 1;
                break;
            default:
                result.matched = conditionResults.every(r => r.matched);
        }

        return result;
    }

    /**
     * Evaluate a single condition
     */
    static evaluateCondition(condition, context) {
        const result = {
            matched: false,
            value: null,
            expectedValue: condition.value,
            operator: condition.operator
        };

        try {
            // Get the field value from context
            const fieldValue = this.getFieldValue(condition.field, context);
            result.value = fieldValue;

            // Apply operator
            switch (condition.operator) {
                case 'equals':
                    result.matched = this.compareValues(fieldValue, condition.value, '===');
                    break;
                case 'not_equals':
                    result.matched = this.compareValues(fieldValue, condition.value, '!==');
                    break;
                case 'contains':
                    result.matched = this.containsValue(fieldValue, condition.value);
                    break;
                case 'not_contains':
                    result.matched = !this.containsValue(fieldValue, condition.value);
                    break;
                case 'greater_than':
                    result.matched = this.compareValues(fieldValue, condition.value, '>');
                    break;
                case 'less_than':
                    result.matched = this.compareValues(fieldValue, condition.value, '<');
                    break;
                case 'greater_than_or_equal':
                    result.matched = this.compareValues(fieldValue, condition.value, '>=');
                    break;
                case 'less_than_or_equal':
                    result.matched = this.compareValues(fieldValue, condition.value, '<=');
                    break;
                case 'between':
                    result.matched = this.isBetween(fieldValue, condition.value);
                    break;
                case 'in_list':
                    result.matched = this.isInList(fieldValue, condition.value);
                    break;
                case 'regex_match':
                    result.matched = this.regexMatch(fieldValue, condition.value);
                    break;
                case 'is_empty':
                    result.matched = this.isEmpty(fieldValue);
                    break;
                case 'is_not_empty':
                    result.matched = !this.isEmpty(fieldValue);
                    break;
                default:
                    console.warn(`Unknown operator: ${condition.operator}`);
                    result.matched = false;
            }

        } catch (error) {
            console.error('Error evaluating condition:', error);
            result.matched = false;
            result.error = error.message;
        }

        return result;
    }

    /**
     * Get field value from context
     */
    static getFieldValue(field, context) {
        // Handle dot notation for nested fields
        const fieldParts = field.split('.');
        let value = context;

        for (const part of fieldParts) {
            if (value && typeof value === 'object') {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Compare two values with an operator
     */
    static compareValues(value1, value2, operator) {
        // Handle type coercion
        if (typeof value1 === 'string' && typeof value2 === 'number') {
            const numValue = parseFloat(value1);
            if (!isNaN(numValue)) value1 = numValue;
        }
        if (typeof value2 === 'string' && typeof value1 === 'number') {
            const numValue = parseFloat(value2);
            if (!isNaN(numValue)) value2 = numValue;
        }

        switch (operator) {
            case '===': return value1 === value2;
            case '!==': return value1 !== value2;
            case '>': return value1 > value2;
            case '<': return value1 < value2;
            case '>=': return value1 >= value2;
            case '<=': return value1 <= value2;
            default: return false;
        }
    }

    /**
     * Check if value contains another value
     */
    static containsValue(value, searchValue) {
        if (Array.isArray(value)) {
            return value.includes(searchValue);
        }
        if (typeof value === 'string') {
            return value.toLowerCase().includes(String(searchValue).toLowerCase());
        }
        return false;
    }

    /**
     * Check if value is between two values
     */
    static isBetween(value, range) {
        if (!Array.isArray(range) || range.length !== 2) {
            return false;
        }
        const numValue = parseFloat(value);
        const min = parseFloat(range[0]);
        const max = parseFloat(range[1]);
        
        return !isNaN(numValue) && !isNaN(min) && !isNaN(max) && 
               numValue >= min && numValue <= max;
    }

    /**
     * Check if value is in a list
     */
    static isInList(value, list) {
        if (!Array.isArray(list)) {
            return false;
        }
        return list.includes(value);
    }

    /**
     * Check if value matches a regex pattern
     */
    static regexMatch(value, pattern) {
        try {
            const regex = new RegExp(pattern);
            return regex.test(String(value));
        } catch (error) {
            console.error('Invalid regex pattern:', pattern);
            return false;
        }
    }

    /**
     * Check if value is empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Apply rule actions
     */
    static applyRuleActions(rule, context, ruleResult) {
        const actionResults = [];

        if (!rule.actions || !Array.isArray(rule.actions)) {
            return actionResults;
        }

        for (const action of rule.actions) {
            try {
                const actionResult = this.applyAction(action, context, ruleResult, rule);
                actionResults.push(actionResult);
            } catch (error) {
                console.error(`Error applying action in rule ${rule.id}:`, error);
                actionResults.push({
                    type: action.type,
                    success: false,
                    error: error.message
                });
            }
        }

        return actionResults;
    }

    /**
     * Apply a single action
     */
    static applyAction(action, context, ruleResult, rule) {
        const result = {
            type: action.type,
            success: false,
            data: null
        };

        switch (action.type) {
            case 'score':
                result.data = this.applyScoreAction(action, context, ruleResult);
                result.success = true;
                break;
                
            case 'recommend':
                result.data = this.applyRecommendAction(action, context, ruleResult);
                result.success = true;
                break;
                
            case 'route':
                result.data = this.applyRouteAction(action, context, ruleResult);
                result.success = true;
                break;
                
            case 'validate':
                result.data = this.applyValidateAction(action, context, ruleResult);
                result.success = true;
                break;
                
            case 'notify':
                result.data = this.applyNotifyAction(action, context, ruleResult);
                result.success = true;
                break;
                
            case 'set_variable':
                result.data = this.applySetVariableAction(action, context, ruleResult);
                result.success = true;
                break;
                
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }

        return result;
    }

    /**
     * Apply score action
     */
    static applyScoreAction(action, context, ruleResult) {
        const params = action.parameters || {};
        const operation = params.operation || 'add';
        const value = params.value || 1;
        const weight = params.weight || 1;

        let scoreChange = 0;

        switch (operation) {
            case 'add':
                scoreChange = value * weight;
                break;
            case 'subtract':
                scoreChange = -(value * weight);
                break;
            case 'multiply':
                scoreChange = (ruleResult.score || 0) * value * weight;
                break;
            case 'set':
                scoreChange = value * weight;
                break;
        }

        ruleResult.score = (ruleResult.score || 0) + scoreChange;

        return {
            operation: operation,
            value: value,
            weight: weight,
            scoreChange: scoreChange,
            newScore: ruleResult.score
        };
    }

    /**
     * Apply recommendation action
     */
    static applyRecommendAction(action, context, ruleResult) {
        const params = action.parameters || {};
        const templateId = params.template;
        const message = params.message;
        const priority = params.priority || 'normal';

        const recommendation = {
            id: this.generateId(),
            templateId: templateId,
            message: message,
            priority: priority,
            ruleId: ruleResult.ruleId,
            timestamp: new Date().toISOString(),
            data: params.data || {}
        };

        if (!ruleResult.recommendations) {
            ruleResult.recommendations = [];
        }
        ruleResult.recommendations.push(recommendation);

        return recommendation;
    }

    /**
     * Apply route action
     */
    static applyRouteAction(action, context, ruleResult) {
        const params = action.parameters || {};
        const target = params.target;
        const condition = params.condition;

        return {
            target: target,
            condition: condition,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Apply validate action
     */
    static applyValidateAction(action, context, ruleResult) {
        const params = action.parameters || {};
        const field = params.field;
        const rule = params.rule;
        const message = params.message;

        // This would integrate with ValidationEngine
        return {
            field: field,
            rule: rule,
            message: message,
            valid: true // Placeholder
        };
    }

    /**
     * Apply notify action
     */
    static applyNotifyAction(action, context, ruleResult) {
        const params = action.parameters || {};
        const message = params.message;
        const type = params.type || 'info';
        const recipients = params.recipients || [];

        // Emit notification event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('notification.show', {
                message: message,
                type: type,
                source: 'rules-engine',
                ruleId: ruleResult.ruleId
            });
        }

        return {
            message: message,
            type: type,
            recipients: recipients,
            sent: true
        };
    }

    /**
     * Apply set variable action
     */
    static applySetVariableAction(action, context, ruleResult) {
        const params = action.parameters || {};
        const variable = params.variable;
        const value = params.value;
        const scope = params.scope || 'context';

        if (scope === 'context') {
            context[variable] = value;
        } else if (scope === 'global' && typeof StateManager !== 'undefined') {
            StateManager.setState(`rules.variables.${variable}`, value);
        }

        return {
            variable: variable,
            value: value,
            scope: scope
        };
    }

    /**
     * Test rules with sample data
     */
    static testRules(sampleData, rulesToTest = null) {
        const testContext = {
            answers: sampleData,
            assessmentId: 'test-assessment',
            timestamp: new Date().toISOString(),
            test: true
        };

        const results = this.evaluateRules(testContext, rulesToTest);
        
        return {
            context: testContext,
            results: results,
            summary: {
                totalRules: rulesToTest ? rulesToTest.length : this.rules.length,
                evaluatedRules: results.evaluatedRules,
                matchedRules: results.matchedRules,
                successRate: results.evaluatedRules > 0 ? 
                    (results.matchedRules / results.evaluatedRules * 100).toFixed(1) + '%' : '0%'
            }
        };
    }

    /**
     * Add new rule
     */
    static addRule(rule) {
        // Validate rule structure
        const validation = this.validateRule(rule);
        if (!validation.isValid) {
            throw new Error('Invalid rule: ' + validation.errors.join(', '));
        }

        // Add metadata
        rule.id = rule.id || this.generateId();
        rule.created = new Date().toISOString();
        rule.modified = new Date().toISOString();
        rule.active = rule.active !== false;

        this.rules.push(rule);
        this.saveRules();
        
        return rule;
    }

    /**
     * Update existing rule
     */
    static updateRule(ruleId, updates) {
        const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            throw new Error(`Rule ${ruleId} not found`);
        }

        const updatedRule = { ...this.rules[ruleIndex], ...updates };
        updatedRule.modified = new Date().toISOString();

        // Validate updated rule
        const validation = this.validateRule(updatedRule);
        if (!validation.isValid) {
            throw new Error('Invalid rule update: ' + validation.errors.join(', '));
        }

        this.rules[ruleIndex] = updatedRule;
        this.saveRules();
        
        return updatedRule;
    }

    /**
     * Remove rule
     */
    static removeRule(ruleId) {
        const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            return false;
        }

        this.rules.splice(ruleIndex, 1);
        this.saveRules();
        return true;
    }

    /**
     * Validate rule structure
     */
    static validateRule(rule) {
        const errors = [];

        if (!rule.id) errors.push('Rule ID is required');
        if (!rule.name) errors.push('Rule name is required');
        if (!rule.conditions) errors.push('Rule conditions are required');
        if (!rule.actions) errors.push('Rule actions are required');

        if (rule.conditions && !rule.conditions.rules) {
            errors.push('Rule conditions must have rules array');
        }

        if (rule.actions && !Array.isArray(rule.actions)) {
            errors.push('Rule actions must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
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
     * Enable debug mode
     */
    static enableDebug() {
        this.debugMode = true;
        console.log('Rules Engine debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    static disableDebug() {
        this.debugMode = false;
        console.log('Rules Engine debug mode disabled');
    }

    /**
     * Get rules statistics
     */
    static getStats() {
        const activeRules = this.rules.filter(r => r.active !== false);
        const rulesByCategory = this.rules.reduce((acc, rule) => {
            const category = rule.category || 'uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        return {
            totalRules: this.rules.length,
            activeRules: activeRules.length,
            inactiveRules: this.rules.length - activeRules.length,
            rulesByCategory: rulesByCategory,
            lastModified: Math.max(...this.rules.map(r => new Date(r.modified || r.created).getTime()))
        };
    }

    /**
     * Export rules
     */
    static exportRules() {
        return {
            rules: this.rules,
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            stats: this.getStats()
        };
    }

    /**
     * Import rules
     */
    static importRules(data, options = {}) {
        const { merge = false, validate = true } = options;

        if (validate) {
            for (const rule of data.rules) {
                const validation = this.validateRule(rule);
                if (!validation.isValid) {
                    throw new Error(`Invalid rule ${rule.id}: ${validation.errors.join(', ')}`);
                }
            }
        }

        if (merge) {
            // Merge with existing rules
            for (const importedRule of data.rules) {
                const existingIndex = this.rules.findIndex(r => r.id === importedRule.id);
                if (existingIndex >= 0) {
                    this.rules[existingIndex] = importedRule;
                } else {
                    this.rules.push(importedRule);
                }
            }
        } else {
            // Replace all rules
            this.rules = data.rules;
        }

        this.saveRules();
        return true;
    }

    /**
     * Utility functions
     */
    static generateId() {
        return 'rule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Reset engine
     */
    static reset() {
        this.rules = [];
        this.evaluationContext = {};
        this.saveRules();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RulesEngine;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.RulesEngine = RulesEngine;
}