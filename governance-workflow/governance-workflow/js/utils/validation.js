// js/utils/validation.js - Input Validation Utilities

/**
 * Validation Engine for Data Governance Decision Tool
 * Provides comprehensive input validation and sanitization
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class ValidationEngine {
    static PATTERNS = {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        URL: /^https?:\/\/.+/,
        ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,
        SAFE_HTML: /<script|<iframe|<object|<embed|javascript:|on\w+\s*=/i,
        ID: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
        VERSION: /^\d+\.\d+\.\d+$/,
        HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
        SLUG: /^[a-z0-9-]+$/,
        IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    };

    static LIMITS = {
        TITLE: { min: 5, max: 200 },
        DESCRIPTION: { min: 10, max: 1000 },
        NAME: { min: 2, max: 100 },
        EMAIL: { min: 5, max: 255 },
        PASSWORD: { min: 8, max: 128 },
        URL: { min: 10, max: 2048 },
        TEXT_INPUT: { min: 1, max: 500 },
        TEXTAREA: { min: 1, max: 5000 },
        FILE_SIZE: 10 * 1024 * 1024 // 10MB
    };

    static ALLOWED_FILE_TYPES = [
        '.json', '.csv', '.xlsx', '.xls', '.txt', '.pdf'
    ];

    static ERROR_MESSAGES = {
        REQUIRED: 'This field is required',
        INVALID_EMAIL: 'Please enter a valid email address',
        INVALID_URL: 'Please enter a valid URL',
        TOO_SHORT: 'Input is too short (minimum {min} characters)',
        TOO_LONG: 'Input is too long (maximum {max} characters)',
        INVALID_FORMAT: 'Invalid format',
        UNSAFE_CONTENT: 'Content contains unsafe elements',
        INVALID_FILE_TYPE: 'File type not allowed',
        FILE_TOO_LARGE: 'File size exceeds maximum limit',
        INVALID_NUMBER: 'Please enter a valid number',
        NUMBER_OUT_OF_RANGE: 'Number must be between {min} and {max}',
        INVALID_DATE: 'Please enter a valid date',
        DATE_OUT_OF_RANGE: 'Date must be between {min} and {max}',
        INVALID_SELECTION: 'Invalid selection',
        INSUFFICIENT_SELECTIONS: 'Please select at least {min} options',
        TOO_MANY_SELECTIONS: 'Please select no more than {max} options'
    };

    /**
     * Validate a string field
     */
    static validateString(value, options = {}) {
        const {
            required = false,
            minLength = null,
            maxLength = null,
            pattern = null,
            allowEmpty = false,
            trim = true,
            fieldName = 'Field'
        } = options;

        const result = {
            isValid: true,
            value: trim ? String(value).trim() : String(value),
            errors: []
        };

        // Check if required
        if (required && (!value || (trim && !String(value).trim()))) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.REQUIRED);
            return result;
        }

        // Allow empty if not required
        if (!required && (!value || (trim && !String(value).trim()))) {
            if (allowEmpty) {
                result.value = '';
                return result;
            }
        }

        const stringValue = result.value;

        // Check minimum length
        if (minLength !== null && stringValue.length < minLength) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.TOO_SHORT.replace('{min}', minLength)
            );
        }

        // Check maximum length
        if (maxLength !== null && stringValue.length > maxLength) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.TOO_LONG.replace('{max}', maxLength)
            );
        }

        // Check pattern
        if (pattern && !pattern.test(stringValue)) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.INVALID_FORMAT);
        }

        // Check for unsafe content
        if (this.PATTERNS.SAFE_HTML.test(stringValue)) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.UNSAFE_CONTENT);
        }

        return result;
    }

    /**
     * Validate email address
     */
    static validateEmail(email, required = false) {
        const stringValidation = this.validateString(email, {
            required,
            minLength: this.LIMITS.EMAIL.min,
            maxLength: this.LIMITS.EMAIL.max,
            fieldName: 'Email'
        });

        if (!stringValidation.isValid) {
            return stringValidation;
        }

        if (stringValidation.value && !this.PATTERNS.EMAIL.test(stringValidation.value)) {
            stringValidation.isValid = false;
            stringValidation.errors.push(this.ERROR_MESSAGES.INVALID_EMAIL);
        }

        return stringValidation;
    }

    /**
     * Validate URL
     */
    static validateURL(url, required = false) {
        const stringValidation = this.validateString(url, {
            required,
            minLength: this.LIMITS.URL.min,
            maxLength: this.LIMITS.URL.max,
            fieldName: 'URL'
        });

        if (!stringValidation.isValid) {
            return stringValidation;
        }

        if (stringValidation.value && !this.PATTERNS.URL.test(stringValidation.value)) {
            stringValidation.isValid = false;
            stringValidation.errors.push(this.ERROR_MESSAGES.INVALID_URL);
        }

        return stringValidation;
    }

    /**
     * Validate number
     */
    static validateNumber(value, options = {}) {
        const {
            required = false,
            min = null,
            max = null,
            integer = false,
            fieldName = 'Number'
        } = options;

        const result = {
            isValid: true,
            value: null,
            errors: []
        };

        // Check if required
        if (required && (value === null || value === undefined || value === '')) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.REQUIRED);
            return result;
        }

        // Allow empty if not required
        if (!required && (value === null || value === undefined || value === '')) {
            return result;
        }

        // Convert to number
        const numValue = Number(value);

        // Check if valid number
        if (isNaN(numValue)) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.INVALID_NUMBER);
            return result;
        }

        // Check if integer required
        if (integer && !Number.isInteger(numValue)) {
            result.isValid = false;
            result.errors.push('Must be a whole number');
            return result;
        }

        result.value = numValue;

        // Check minimum value
        if (min !== null && numValue < min) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.NUMBER_OUT_OF_RANGE
                    .replace('{min}', min)
                    .replace('{max}', max || '∞')
            );
        }

        // Check maximum value
        if (max !== null && numValue > max) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.NUMBER_OUT_OF_RANGE
                    .replace('{min}', min || '-∞')
                    .replace('{max}', max)
            );
        }

        return result;
    }

    /**
     * Validate date
     */
    static validateDate(value, options = {}) {
        const {
            required = false,
            minDate = null,
            maxDate = null,
            fieldName = 'Date'
        } = options;

        const result = {
            isValid: true,
            value: null,
            errors: []
        };

        // Check if required
        if (required && (!value || value === '')) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.REQUIRED);
            return result;
        }

        // Allow empty if not required
        if (!required && (!value || value === '')) {
            return result;
        }

        // Parse date
        const dateValue = new Date(value);

        // Check if valid date
        if (isNaN(dateValue.getTime())) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.INVALID_DATE);
            return result;
        }

        result.value = dateValue;

        // Check minimum date
        if (minDate && dateValue < new Date(minDate)) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.DATE_OUT_OF_RANGE
                    .replace('{min}', new Date(minDate).toLocaleDateString())
                    .replace('{max}', maxDate ? new Date(maxDate).toLocaleDateString() : 'now')
            );
        }

        // Check maximum date
        if (maxDate && dateValue > new Date(maxDate)) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.DATE_OUT_OF_RANGE
                    .replace('{min}', minDate ? new Date(minDate).toLocaleDateString() : 'any date')
                    .replace('{max}', new Date(maxDate).toLocaleDateString())
            );
        }

        return result;
    }

    /**
     * Validate selection (single or multiple)
     */
    static validateSelection(value, options = {}) {
        const {
            required = false,
            validOptions = [],
            multiple = false,
            minSelections = null,
            maxSelections = null,
            fieldName = 'Selection'
        } = options;

        const result = {
            isValid: true,
            value: multiple ? [] : null,
            errors: []
        };

        // Check if required
        if (required && (!value || (Array.isArray(value) && value.length === 0))) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.REQUIRED);
            return result;
        }

        // Allow empty if not required
        if (!required && (!value || (Array.isArray(value) && value.length === 0))) {
            return result;
        }

        if (multiple) {
            // Handle multiple selections
            const selections = Array.isArray(value) ? value : [value];
            
            // Validate each selection
            for (const selection of selections) {
                if (!validOptions.includes(selection)) {
                    result.isValid = false;
                    result.errors.push(this.ERROR_MESSAGES.INVALID_SELECTION);
                    break;
                }
            }

            if (result.isValid) {
                result.value = selections;

                // Check minimum selections
                if (minSelections !== null && selections.length < minSelections) {
                    result.isValid = false;
                    result.errors.push(
                        this.ERROR_MESSAGES.INSUFFICIENT_SELECTIONS.replace('{min}', minSelections)
                    );
                }

                // Check maximum selections
                if (maxSelections !== null && selections.length > maxSelections) {
                    result.isValid = false;
                    result.errors.push(
                        this.ERROR_MESSAGES.TOO_MANY_SELECTIONS.replace('{max}', maxSelections)
                    );
                }
            }
        } else {
            // Handle single selection
            if (!validOptions.includes(value)) {
                result.isValid = false;
                result.errors.push(this.ERROR_MESSAGES.INVALID_SELECTION);
            } else {
                result.value = value;
            }
        }

        return result;
    }

    /**
     * Validate file upload
     */
    static validateFile(file, options = {}) {
        const {
            required = false,
            allowedTypes = this.ALLOWED_FILE_TYPES,
            maxSize = this.LIMITS.FILE_SIZE,
            fieldName = 'File'
        } = options;

        const result = {
            isValid: true,
            value: null,
            errors: []
        };

        // Check if required
        if (required && !file) {
            result.isValid = false;
            result.errors.push(this.ERROR_MESSAGES.REQUIRED);
            return result;
        }

        // Allow empty if not required
        if (!required && !file) {
            return result;
        }

        result.value = file;

        // Check file type
        const fileName = file.name.toLowerCase();
        const isValidType = allowedTypes.some(type => fileName.endsWith(type));
        
        if (!isValidType) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.INVALID_FILE_TYPE + 
                ` (allowed: ${allowedTypes.join(', ')})`
            );
        }

        // Check file size
        if (file.size > maxSize) {
            result.isValid = false;
            result.errors.push(
                this.ERROR_MESSAGES.FILE_TOO_LARGE + 
                ` (max: ${this.formatFileSize(maxSize)})`
            );
        }

        return result;
    }

    /**
     * Validate question configuration
     */
    static validateQuestion(question) {
        const result = {
            isValid: true,
            errors: []
        };

        // Validate required fields
        const requiredFields = ['id', 'title', 'type', 'category'];
        for (const field of requiredFields) {
            if (!question[field]) {
                result.isValid = false;
                result.errors.push(`${field} is required`);
            }
        }

        // Validate ID format
        if (question.id && !this.PATTERNS.ID.test(question.id)) {
            result.isValid = false;
            result.errors.push('ID must start with a letter and contain only letters, numbers, hyphens, and underscores');
        }

        // Validate title length
        const titleValidation = this.validateString(question.title, {
            required: true,
            minLength: this.LIMITS.TITLE.min,
            maxLength: this.LIMITS.TITLE.max,
            fieldName: 'Title'
        });
        
        if (!titleValidation.isValid) {
            result.isValid = false;
            result.errors.push(...titleValidation.errors);
        }

        // Validate type-specific requirements
        if (question.type === 'single-select' || question.type === 'multi-select') {
            if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
                result.isValid = false;
                result.errors.push('Selection questions must have at least 2 options');
            }

            // Validate each option
            if (question.options) {
                question.options.forEach((option, index) => {
                    if (!option.value || !option.title) {
                        result.isValid = false;
                        result.errors.push(`Option ${index + 1} must have both value and title`);
                    }
                });
            }
        }

        // Validate weight
        if (question.weight !== undefined) {
            const weightValidation = this.validateNumber(question.weight, {
                min: 0,
                max: 10,
                fieldName: 'Weight'
            });
            
            if (!weightValidation.isValid) {
                result.isValid = false;
                result.errors.push(...weightValidation.errors);
            }
        }

        return result;
    }

    /**
     * Validate rule configuration
     */
    static validateRule(rule) {
        const result = {
            isValid: true,
            errors: []
        };

        // Validate required fields
        const requiredFields = ['id', 'name', 'conditions', 'actions'];
        for (const field of requiredFields) {
            if (!rule[field]) {
                result.isValid = false;
                result.errors.push(`${field} is required`);
            }
        }

        // Validate ID format
        if (rule.id && !this.PATTERNS.ID.test(rule.id)) {
            result.isValid = false;
            result.errors.push('ID must start with a letter and contain only letters, numbers, hyphens, and underscores');
        }

        // Validate name
        const nameValidation = this.validateString(rule.name, {
            required: true,
            minLength: this.LIMITS.NAME.min,
            maxLength: this.LIMITS.NAME.max,
            fieldName: 'Name'
        });
        
        if (!nameValidation.isValid) {
            result.isValid = false;
            result.errors.push(...nameValidation.errors);
        }

        // Validate conditions structure
        if (rule.conditions) {
            if (!rule.conditions.operator || !rule.conditions.rules) {
                result.isValid = false;
                result.errors.push('Conditions must have operator and rules');
            }

            if (rule.conditions.rules && !Array.isArray(rule.conditions.rules)) {
                result.isValid = false;
                result.errors.push('Condition rules must be an array');
            }
        }

        // Validate actions structure
        if (rule.actions && !Array.isArray(rule.actions)) {
            result.isValid = false;
            result.errors.push('Actions must be an array');
        }

        return result;
    }

    /**
     * Validate template configuration
     */
    static validateTemplate(template) {
        const result = {
            isValid: true,
            errors: []
        };

        // Validate required fields
        const requiredFields = ['id', 'name', 'description', 'sections'];
        for (const field of requiredFields) {
            if (!template[field]) {
                result.isValid = false;
                result.errors.push(`${field} is required`);
            }
        }

        // Validate ID format
        if (template.id && !this.PATTERNS.ID.test(template.id)) {
            result.isValid = false;
            result.errors.push('ID must start with a letter and contain only letters, numbers, hyphens, and underscores');
        }

        // Validate name
        const nameValidation = this.validateString(template.name, {
            required: true,
            minLength: this.LIMITS.NAME.min,
            maxLength: this.LIMITS.NAME.max,
            fieldName: 'Name'
        });
        
        if (!nameValidation.isValid) {
            result.isValid = false;
            result.errors.push(...nameValidation.errors);
        }

        // Validate description
        const descValidation = this.validateString(template.description, {
            required: true,
            minLength: this.LIMITS.DESCRIPTION.min,
            maxLength: this.LIMITS.DESCRIPTION.max,
            fieldName: 'Description'
        });
        
        if (!descValidation.isValid) {
            result.isValid = false;
            result.errors.push(...descValidation.errors);
        }

        // Validate sections
        if (template.sections && typeof template.sections !== 'object') {
            result.isValid = false;
            result.errors.push('Sections must be an object');
        }

        return result;
    }

    /**
     * Sanitize HTML content
     */
    static sanitizeHTML(html) {
        // Remove script tags and event handlers
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }

    /**
     * Sanitize string input
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') {
            return String(input);
        }

        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .substring(0, 10000); // Limit length
    }

    /**
     * Format file size for display
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate form data
     */
    static validateForm(formData, validationRules) {
        const result = {
            isValid: true,
            errors: {},
            values: {}
        };

        for (const [fieldName, rules] of Object.entries(validationRules)) {
            const value = formData[fieldName];
            let fieldResult;

            switch (rules.type) {
                case 'string':
                    fieldResult = this.validateString(value, rules);
                    break;
                case 'email':
                    fieldResult = this.validateEmail(value, rules.required);
                    break;
                case 'url':
                    fieldResult = this.validateURL(value, rules.required);
                    break;
                case 'number':
                    fieldResult = this.validateNumber(value, rules);
                    break;
                case 'date':
                    fieldResult = this.validateDate(value, rules);
                    break;
                case 'selection':
                    fieldResult = this.validateSelection(value, rules);
                    break;
                case 'file':
                    fieldResult = this.validateFile(value, rules);
                    break;
                default:
                    fieldResult = this.validateString(value, rules);
            }

            if (!fieldResult.isValid) {
                result.isValid = false;
                result.errors[fieldName] = fieldResult.errors;
            }

            result.values[fieldName] = fieldResult.value;
        }

        return result;
    }

    /**
     * Get validation rules for question types
     */
    static getQuestionValidationRules(questionType) {
        const baseRules = {
            id: { type: 'string', required: true, pattern: this.PATTERNS.ID },
            title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
            subtitle: { type: 'string', required: false, maxLength: 500 },
            type: { type: 'string', required: true },
            category: { type: 'string', required: true },
            required: { type: 'boolean', required: false },
            weight: { type: 'number', required: false, min: 0, max: 10 }
        };

        switch (questionType) {
            case 'single-select':
            case 'multi-select':
                return {
                    ...baseRules,
                    options: { type: 'array', required: true, minLength: 2 }
                };
            case 'text-input':
                return {
                    ...baseRules,
                    placeholder: { type: 'string', required: false, maxLength: 100 },
                    maxLength: { type: 'number', required: false, min: 1, max: 5000 }
                };
            case 'number-input':
                return {
                    ...baseRules,
                    min: { type: 'number', required: false },
                    max: { type: 'number', required: false },
                    step: { type: 'number', required: false, min: 0.01 },
                    unit: { type: 'string', required: false, maxLength: 20 }
                };
            case 'rating-scale':
                return {
                    ...baseRules,
                    scale: { type: 'number', required: true, min: 2, max: 10 },
                    labels: { type: 'array', required: false }
                };
            default:
                return baseRules;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationEngine;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ValidationEngine = ValidationEngine;
}