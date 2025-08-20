/**
 * Data Governance Decision Tool - Validation Engine
 * Comprehensive input validation and sanitization system
 * Version: 1.0.0
 */

class ValidationEngine {
    constructor() {
        this.rules = new Map();
        this.customValidators = new Map();
        this.sanitizers = new Map();
        this.errorMessages = new Map();
        this.initializeDefaultRules();
        this.initializeErrorMessages();
    }

    /**
     * Initialize default validation rules
     */
    initializeDefaultRules() {
        // Basic validation rules
        this.rules.set('required', (value) => {
            return value !== null && value !== undefined && value !== '';
        });

        this.rules.set('email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        });

        this.rules.set('url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });

        this.rules.set('numeric', (value) => {
            return !isNaN(value) && !isNaN(parseFloat(value));
        });

        this.rules.set('integer', (value) => {
            return Number.isInteger(Number(value));
        });

        this.rules.set('positive', (value) => {
            return Number(value) > 0;
        });

        this.rules.set('range', (value, min, max) => {
            const num = Number(value);
            return num >= min && num <= max;
        });

        this.rules.set('minLength', (value, min) => {
            return String(value).length >= min;
        });

        this.rules.set('maxLength', (value, max) => {
            return String(value).length <= max;
        });

        this.rules.set('pattern', (value, pattern) => {
            const regex = new RegExp(pattern);
            return regex.test(value);
        });

        this.rules.set('alphanumeric', (value) => {
            return /^[a-zA-Z0-9]+$/.test(value);
        });

        this.rules.set('noSpecialChars', (value) => {
            return /^[a-zA-Z0-9\s\-_.,!?]+$/.test(value);
        });

        // Data governance specific validations
        this.rules.set('dataClassification', (value) => {
            const validClassifications = ['public', 'internal', 'confidential', 'restricted'];
            return validClassifications.includes(value.toLowerCase());
        });

        this.rules.set('retentionPeriod', (value) => {
            const num = Number(value);
            return num >= 0 && num <= 100; // 0-100 years
        });

        this.rules.set('complianceFramework', (value) => {
            const validFrameworks = ['gdpr', 'hipaa', 'sox', 'pci-dss', 'iso27001', 'nist'];
            return validFrameworks.includes(value.toLowerCase());
        });
    }

    /**
     * Initialize error messages
     */
    initializeErrorMessages() {
        this.errorMessages.set('required', 'This field is required');
        this.errorMessages.set('email', 'Please enter a valid email address');
        this.errorMessages.set('url', 'Please enter a valid URL');
        this.errorMessages.set('numeric', 'Please enter a valid number');
        this.errorMessages.set('integer', 'Please enter a whole number');
        this.errorMessages.set('positive', 'Please enter a positive number');
        this.errorMessages.set('range', 'Value must be within the specified range');
        this.errorMessages.set('minLength', 'Input is too short');
        this.errorMessages.set('maxLength', 'Input is too long');
        this.errorMessages.set('pattern', 'Input format is invalid');
        this.errorMessages.set('alphanumeric', 'Only letters and numbers are allowed');
        this.errorMessages.set('noSpecialChars', 'Special characters are not allowed');
        this.errorMessages.set('dataClassification', 'Invalid data classification level');
        this.errorMessages.set('retentionPeriod', 'Retention period must be between 0 and 100 years');
        this.errorMessages.set('complianceFramework', 'Invalid compliance framework');
    }

    /**
     * Validate a single field
     * @param {*} value - Value to validate
     * @param {Array} rules - Array of validation rules
     * @param {string} fieldName - Name of the field for error messages
     * @returns {Object} Validation result
     */
    validateField(value, rules, fieldName = 'Field') {
        const result = {
            isValid: true,
            errors: [],
            sanitizedValue: this.sanitizeValue(value, rules)
        };

        for (const rule of rules) {
            if (typeof rule === 'string') {
                // Simple rule name
                if (!this.executeRule(rule, value)) {
                    result.isValid = false;
                    result.errors.push(this.getErrorMessage(rule, fieldName));
                }
            } else if (typeof rule === 'object') {
                // Rule with parameters
                const { name, params = [], message } = rule;
                if (!this.executeRule(name, value, ...params)) {
                    result.isValid = false;
                    result.errors.push(message || this.getErrorMessage(name, fieldName, params));
                }
            }
        }

        return result;
    }

    /**
     * Validate multiple fields
     * @param {Object} data - Data object to validate
     * @param {Object} schema - Validation schema
     * @returns {Object} Validation result for all fields
     */
    validateForm(data, schema) {
        const result = {
            isValid: true,
            errors: {},
            sanitizedData: {}
        };

        for (const [fieldName, fieldRules] of Object.entries(schema)) {
            const fieldValue = data[fieldName];
            const fieldResult = this.validateField(fieldValue, fieldRules, fieldName);
            
            if (!fieldResult.isValid) {
                result.isValid = false;
                result.errors[fieldName] = fieldResult.errors;
            }
            
            result.sanitizedData[fieldName] = fieldResult.sanitizedValue;
        }

        return result;
    }

    /**
     * Execute a validation rule
     * @param {string} ruleName - Name of the rule
     * @param {*} value - Value to validate
     * @param {...any} params - Additional parameters
     * @returns {boolean} Validation result
     */
    executeRule(ruleName, value, ...params) {
        if (this.rules.has(ruleName)) {
            return this.rules.get(ruleName)(value, ...params);
        } else if (this.customValidators.has(ruleName)) {
            return this.customValidators.get(ruleName)(value, ...params);
        }
        
        console.warn(`Validation rule '${ruleName}' not found`);
        return true; // Default to valid if rule not found
    }

    /**
     * Get error message for a rule
     * @param {string} ruleName - Name of the rule
     * @param {string} fieldName - Name of the field
     * @param {Array} params - Rule parameters
     * @returns {string} Error message
     */
    getErrorMessage(ruleName, fieldName, params = []) {
        let message = this.errorMessages.get(ruleName) || 'Validation failed';
        
        // Replace placeholders in message
        message = message.replace('{field}', fieldName);
        params.forEach((param, index) => {
            message = message.replace(`{${index}}`, param);
        });
        
        return message;
    }

    /**
     * Sanitize input value
     * @param {*} value - Value to sanitize
     * @param {Array} rules - Validation rules that may contain sanitization hints
     * @returns {*} Sanitized value
     */
    sanitizeValue(value, rules) {
        if (value === null || value === undefined) {
            return value;
        }

        let sanitized = value;

        // Basic sanitization
        if (typeof sanitized === 'string') {
            // Trim whitespace
            sanitized = sanitized.trim();
            
            // Remove potentially dangerous characters
            sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/on\w+\s*=/gi, '');
        }

        // Apply custom sanitizers based on rules
        for (const rule of rules) {
            const ruleName = typeof rule === 'string' ? rule : rule.name;
            if (this.sanitizers.has(ruleName)) {
                sanitized = this.sanitizers.get(ruleName)(sanitized);
            }
        }

        return sanitized;
    }

    /**
     * Add custom validation rule
     * @param {string} name - Rule name
     * @param {Function} validator - Validation function
     * @param {string} errorMessage - Error message template
     */
    addCustomRule(name, validator, errorMessage) {
        this.customValidators.set(name, validator);
        if (errorMessage) {
            this.errorMessages.set(name, errorMessage);
        }
    }

    /**
     * Add custom sanitizer
     * @param {string} name - Sanitizer name
     * @param {Function} sanitizer - Sanitization function
     */
    addCustomSanitizer(name, sanitizer) {
        this.sanitizers.set(name, sanitizer);
    }

    /**
     * Validate data governance assessment response
     * @param {Object} response - Assessment response
     * @returns {Object} Validation result
     */
    validateAssessmentResponse(response) {
        const schema = {
            questionId: ['required', 'alphanumeric'],
            value: ['required'],
            timestamp: ['required', 'numeric'],
            confidence: [{ name: 'range', params: [1, 5] }]
        };

        return this.validateForm(response, schema);
    }

    /**
     * Validate governance configuration
     * @param {Object} config - Configuration object
     * @returns {Object} Validation result
     */
    validateGovernanceConfig(config) {
        const schema = {
            dataClassification: ['required', 'dataClassification'],
            retentionPeriod: ['required', 'retentionPeriod'],
            complianceFramework: ['complianceFramework'],
            accessControls: ['required'],
            encryptionRequired: ['required']
        };

        return this.validateForm(config, schema);
    }

    /**
     * Validate export configuration
     * @param {Object} exportConfig - Export configuration
     * @returns {Object} Validation result
     */
    validateExportConfig(exportConfig) {
        const schema = {
            format: ['required', { name: 'pattern', params: ['^(pdf|excel|json)$'] }],
            includeCharts: ['required'],
            includeRawData: ['required'],
            filename: ['required', { name: 'maxLength', params: [255] }]
        };

        return this.validateForm(exportConfig, schema);
    }

    /**
     * Batch validate multiple items
     * @param {Array} items - Array of items to validate
     * @param {Object} schema - Validation schema
     * @returns {Object} Batch validation result
     */
    batchValidate(items, schema) {
        const results = {
            isValid: true,
            validItems: [],
            invalidItems: [],
            errors: []
        };

        items.forEach((item, index) => {
            const validation = this.validateForm(item, schema);
            if (validation.isValid) {
                results.validItems.push({
                    index,
                    item: validation.sanitizedData
                });
            } else {
                results.isValid = false;
                results.invalidItems.push({
                    index,
                    item,
                    errors: validation.errors
                });
                results.errors.push({
                    index,
                    errors: validation.errors
                });
            }
        });

        return results;
    }

    /**
     * Create validation schema from question configuration
     * @param {Object} questionConfig - Question configuration
     * @returns {Object} Validation schema
     */
    createSchemaFromQuestion(questionConfig) {
        const schema = [];

        if (questionConfig.required) {
            schema.push('required');
        }

        switch (questionConfig.type) {
            case 'email':
                schema.push('email');
                break;
            case 'number':
                schema.push('numeric');
                if (questionConfig.min !== undefined && questionConfig.max !== undefined) {
                    schema.push({ name: 'range', params: [questionConfig.min, questionConfig.max] });
                }
                break;
            case 'text':
                if (questionConfig.minLength) {
                    schema.push({ name: 'minLength', params: [questionConfig.minLength] });
                }
                if (questionConfig.maxLength) {
                    schema.push({ name: 'maxLength', params: [questionConfig.maxLength] });
                }
                if (questionConfig.pattern) {
                    schema.push({ name: 'pattern', params: [questionConfig.pattern] });
                }
                break;
            case 'select':
                if (questionConfig.options) {
                    const validOptions = questionConfig.options.map(opt => opt.value);
                    schema.push({
                        name: 'custom',
                        validator: (value) => validOptions.includes(value),
                        message: 'Please select a valid option'
                    });
                }
                break;
        }

        return schema;
    }

    /**
     * Real-time validation for form fields
     * @param {HTMLElement} field - Form field element
     * @param {Array} rules - Validation rules
     * @returns {boolean} Validation result
     */
    validateFieldRealTime(field, rules) {
        const value = field.value;
        const result = this.validateField(value, rules, field.name || 'Field');
        
        // Update field styling
        field.classList.remove('valid', 'invalid');
        field.classList.add(result.isValid ? 'valid' : 'invalid');
        
        // Update error message display
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = result.errors.join(', ');
            errorElement.style.display = result.errors.length > 0 ? 'block' : 'none';
        }
        
        return result.isValid;
    }

    /**
     * Clear validation state
     * @param {HTMLElement} field - Form field element
     */
    clearValidation(field) {
        field.classList.remove('valid', 'invalid');
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    /**
     * Get validation summary
     * @param {Object} validationResults - Results from form validation
     * @returns {Object} Validation summary
     */
    getValidationSummary(validationResults) {
        const summary = {
            totalFields: 0,
            validFields: 0,
            invalidFields: 0,
            errorCount: 0,
            errors: []
        };

        for (const [fieldName, errors] of Object.entries(validationResults.errors || {})) {
            summary.totalFields++;
            if (errors.length === 0) {
                summary.validFields++;
            } else {
                summary.invalidFields++;
                summary.errorCount += errors.length;
                summary.errors.push({
                    field: fieldName,
                    errors: errors
                });
            }
        }

        return summary;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationEngine;
} else if (typeof window !== 'undefined') {
    window.ValidationEngine = ValidationEngine;
}