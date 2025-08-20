// js/utils/constants.js - Application Constants and Configuration

/**
 * Application Constants for Data Governance Decision Tool
 * Centralized configuration and constant values
 * 
 * @version 1.0.0
 * @author System Administrator
 */

// Application Metadata
export const APP_CONFIG = {
    NAME: 'Data Governance Decision Tool',
    VERSION: '1.0.0',
    BUILD_DATE: '2025-08-19',
    AUTHOR: 'Enterprise Data Governance Team',
    LICENSE: 'MIT',
    REPOSITORY: 'https://github.com/enterprise/governance-workflow',
    DOCUMENTATION: 'https://governance-tool.enterprise.com/docs',
    SUPPORT_EMAIL: 'support@enterprise.com'
};

// Environment Configuration
export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

// Feature Flags
export const FEATURES = {
    ANALYTICS: true,
    AUDIT_LOG: true,
    EXPORT_PDF: true,
    EXPORT_EXCEL: true,
    EXPORT_JSON: true,
    EMAIL_INTEGRATION: true,
    MULTI_USER: false,
    SSO: false,
    ADVANCED_RULES: true,
    CUSTOM_THEMES: true,
    OFFLINE_MODE: true,
    AUTO_SAVE: true,
    DATA_ENCRYPTION: true,
    KEYBOARD_SHORTCUTS: true,
    ACCESSIBILITY: true
};

// Storage Configuration
export const STORAGE_CONFIG = {
    PREFIX: 'dgdt_',
    VERSION: '1.0.0',
    ENCRYPTION_KEY: 'dgdt-encryption-key-2025',
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    TTL_DEFAULT: 30 * 24 * 60 * 60 * 1000, // 30 days
    
    KEYS: {
        USER_PROFILE: 'user_profile',
        APP_STATE: 'app_state',
        GOVERNANCE_QUESTIONS: 'governance_questions',
        GOVERNANCE_RULES: 'governance_rules',
        RECOMMENDATION_TEMPLATES: 'recommendation_templates',
        SAVED_ASSESSMENTS: 'saved_assessments',
        COMPLETED_ASSESSMENTS: 'completed_assessments',
        AUDIT_LOGS: 'audit_logs',
        USAGE_ANALYTICS: 'usage_analytics',
        STORAGE_ANALYTICS: 'storage_analytics',
        STORAGE_ERRORS: 'storage_errors',
        USER_PREFERENCES: 'user_preferences',
        CUSTOM_THEMES: 'custom_themes'
    }
};

// UI Configuration
export const UI_CONFIG = {
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    MODAL_ANIMATION_DURATION: 250,
    PROGRESS_UPDATE_INTERVAL: 100,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    
    BREAKPOINTS: {
        MOBILE: 576,
        TABLET: 768,
        DESKTOP: 992,
        LARGE: 1200,
        XLARGE: 1400
    },
    
    COLORS: {
        PRIMARY: '#2563eb',
        SECONDARY: '#10b981',
        SUCCESS: '#10b981',
        WARNING: '#f59e0b',
        ERROR: '#ef4444',
        INFO: '#3b82f6'
    },
    
    GRADIENTS: {
        PRIMARY: 'linear-gradient(135deg, #2563eb, #10b981)',
        SECONDARY: 'linear-gradient(135deg, #3b82f6, #34d399)',
        SUCCESS: 'linear-gradient(135deg, #10b981, #34d399)',
        WARNING: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        ERROR: 'linear-gradient(135deg, #ef4444, #f87171)'
    }
};

// Question Types Configuration
export const QUESTION_TYPES = {
    SINGLE_SELECT: {
        id: 'single-select',
        name: 'Single Selection',
        description: 'User selects one option from multiple choices',
        icon: '⚪',
        configFields: ['options', 'icons', 'descriptions', 'scoring'],
        validation: {
            required: ['title', 'options'],
            minOptions: 2,
            maxOptions: 10
        }
    },
    
    MULTI_SELECT: {
        id: 'multi-select',
        name: 'Multiple Selection',
        description: 'User can select multiple options',
        icon: '☑️',
        configFields: ['options', 'icons', 'minSelections', 'maxSelections'],
        validation: {
            required: ['title', 'options'],
            minOptions: 2,
            maxOptions: 15
        }
    },
    
    TEXT_INPUT: {
        id: 'text-input',
        name: 'Text Input',
        description: 'Free-form text entry',
        icon: '📝',
        configFields: ['placeholder', 'validation', 'maxLength'],
        validation: {
            required: ['title'],
            maxLength: 500
        }
    },
    
    NUMBER_INPUT: {
        id: 'number-input',
        name: 'Numeric Input',
        description: 'Numeric value entry',
        icon: '🔢',
        configFields: ['min', 'max', 'step', 'unit'],
        validation: {
            required: ['title'],
            min: -999999,
            max: 999999
        }
    },
    
    DATE_INPUT: {
        id: 'date-input',
        name: 'Date Selection',
        description: 'Date picker interface',
        icon: '📅',
        configFields: ['minDate', 'maxDate', 'format'],
        validation: {
            required: ['title']
        }
    },
    
    RATING_SCALE: {
        id: 'rating-scale',
        name: 'Rating Scale',
        description: '1-5 or 1-10 rating system',
        icon: '⭐',
        configFields: ['scale', 'labels', 'descriptions'],
        validation: {
            required: ['title', 'scale'],
            minScale: 2,
            maxScale: 10
        }
    },
    
    CONDITIONAL: {
        id: 'conditional',
        name: 'Conditional Question',
        description: 'Shows based on previous answers',
        icon: '🔀',
        configFields: ['conditions', 'showWhen', 'hideWhen'],
        validation: {
            required: ['title', 'conditions']
        }
    }
};

// Rule Configuration
export const RULE_CONFIG = {
    OPERATORS: {
        LOGICAL: {
            AND: 'AND',
            OR: 'OR',
            NOT: 'NOT',
            XOR: 'XOR'
        },
        
        COMPARISON: {
            EQUALS: 'equals',
            NOT_EQUALS: 'not_equals',
            CONTAINS: 'contains',
            NOT_CONTAINS: 'not_contains',
            GREATER_THAN: 'greater_than',
            LESS_THAN: 'less_than',
            BETWEEN: 'between',
            IN_LIST: 'in_list',
            REGEX_MATCH: 'regex_match',
            IS_EMPTY: 'is_empty'
        }
    },
    
    ACTION_TYPES: {
        SCORE: 'score',
        RECOMMEND: 'recommend',
        ROUTE: 'route',
        VALIDATE: 'validate',
        NOTIFY: 'notify',
        SET_VARIABLE: 'set_variable',
        TRIGGER_WORKFLOW: 'trigger_workflow'
    },
    
    PRIORITIES: {
        CRITICAL: 1,
        HIGH: 2,
        MEDIUM: 3,
        LOW: 4,
        INFORMATIONAL: 5
    }
};

// Analytics Configuration
export const ANALYTICS_CONFIG = {
    EVENTS: {
        // User Events
        USER_LOGIN: 'user_login',
        USER_LOGOUT: 'user_logout',
        USER_IDENTIFIED: 'user_identified',
        
        // Navigation Events
        TAB_NAVIGATION: 'tab_navigation',
        PAGE_VIEW: 'page_view',
        
        // Assessment Events
        ASSESSMENT_STARTED: 'assessment_started',
        ASSESSMENT_PROGRESS: 'assessment_progress',
        ASSESSMENT_COMPLETED: 'assessment_completed',
        ASSESSMENT_SAVED: 'assessment_saved',
        
        // Configuration Events
        QUESTION_CREATED: 'question_created',
        QUESTION_MODIFIED: 'question_modified',
        RULE_CREATED: 'rule_created',
        RULE_MODIFIED: 'rule_modified',
        TEMPLATE_CREATED: 'template_created',
        TEMPLATE_MODIFIED: 'template_modified',
        
        // Export Events
        EXPORT_PDF: 'export_pdf',
        EXPORT_JSON: 'export_json',
        EXPORT_EXCEL: 'export_excel',
        EMAIL_RESULTS: 'email_results',
        
        // System Events
        ERROR: 'error',
        PERFORMANCE: 'performance',
        FEATURE_USAGE: 'feature_usage',
        USER_INTERACTION: 'user_interaction',
        FORM_INTERACTION: 'form_interaction',
        
        // Session Events
        SESSION_START: 'session_start',
        SESSION_END: 'session_end',
        VISIBILITY_CHANGE: 'visibility_change',
        VIEWPORT_CHANGE: 'viewport_change'
    },
    
    CATEGORIES: {
        GENERAL: 'general',
        NAVIGATION: 'navigation',
        UI: 'ui',
        ASSESSMENT: 'assessment',
        CONFIGURATION: 'configuration',
        EXPORT: 'export',
        SYSTEM: 'system',
        ERROR: 'error',
        PERFORMANCE: 'performance',
        SESSION: 'session',
        FORM: 'form',
        FEATURE: 'feature'
    },
    
    PRIORITIES: {
        LOW: 'low',
        NORMAL: 'normal',
        HIGH: 'high',
        CRITICAL: 'critical'
    }
};

// Export Configuration
export const EXPORT_CONFIG = {
    FORMATS: {
        PDF: 'pdf',
        JSON: 'json',
        EXCEL: 'excel',
        CSV: 'csv',
        HTML: 'html'
    },
    
    PDF_OPTIONS: {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        margins: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        }
    },
    
    EXCEL_OPTIONS: {
        sheetName: 'Governance Assessment',
        includeCharts: true,
        includeFormatting: true
    }
};

// Security Configuration
export const SECURITY_CONFIG = {
    CSP_HEADERS: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'"],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'media-src': ["'self'"],
        'frame-src': ["'none'"]
    },
    
    VALIDATION_RULES: {
        MAX_INPUT_LENGTH: 1000,
        MAX_TEXTAREA_LENGTH: 5000,
        ALLOWED_FILE_TYPES: ['.json', '.csv', '.xlsx'],
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        
        PATTERNS: {
            EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            URL: /^https?:\/\/.+/,
            ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,
            SAFE_HTML: /<script|<iframe|<object|<embed|javascript:/i
        }
    },
    
    AUDIT_CONFIG: {
        RETENTION_DAYS: 365,
        MAX_LOG_SIZE: 1000,
        SENSITIVE_FIELDS: ['password', 'token', 'key', 'secret'],
        LOG_LEVELS: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']
    }
};

// Template Configuration
export const TEMPLATE_CONFIG = {
    CATEGORIES: {
        BASIC: 'basic',
        ADVANCED: 'advanced',
        SECURITY: 'security',
        COMPLIANCE: 'compliance',
        INDUSTRY_SPECIFIC: 'industry_specific'
    },
    
    GOVERNANCE_LEVELS: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high'
    },
    
    SECTIONS: {
        PLACEMENT: 'placement',
        CONTROLS: 'controls',
        SHARING: 'sharing',
        AUTOMATION: 'automation',
        COMPLIANCE: 'compliance',
        TIMELINE: 'timeline',
        BUDGET: 'budget',
        RISK_MANAGEMENT: 'risk_management',
        MONITORING: 'monitoring'
    },
    
    INDUSTRIES: {
        HEALTHCARE: 'healthcare',
        FINANCIAL: 'financial',
        RETAIL: 'retail',
        MANUFACTURING: 'manufacturing',
        TECHNOLOGY: 'technology',
        EDUCATION: 'education',
        GOVERNMENT: 'government',
        GENERIC: 'generic'
    }
};

// Validation Constants
export const VALIDATION_CONFIG = {
    REQUIRED_FIELDS: {
        QUESTION: ['id', 'title', 'type', 'category'],
        RULE: ['id', 'name', 'conditions', 'actions'],
        TEMPLATE: ['id', 'name', 'description', 'sections'],
        USER: ['id', 'name', 'role'],
        ASSESSMENT: ['id', 'userId', 'created']
    },
    
    FIELD_LIMITS: {
        TITLE: { min: 5, max: 200 },
        DESCRIPTION: { min: 10, max: 1000 },
        NAME: { min: 2, max: 100 },
        EMAIL: { min: 5, max: 255 },
        PASSWORD: { min: 8, max: 128 },
        URL: { min: 10, max: 2048 }
    },
    
    REGEX_PATTERNS: {
        ID: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
        VERSION: /^\d+\.\d+\.\d+$/,
        SLUG: /^[a-z0-9-]+$/,
        HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    }
};

// API Configuration (for future server-side features)
export const API_CONFIG = {
    BASE_URL: '/api',
    VERSION: 'v1',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    
    ENDPOINTS: {
        ASSESSMENTS: '/assessments',
        QUESTIONS: '/questions',
        RULES: '/rules',
        TEMPLATES: '/templates',
        ANALYTICS: '/analytics',
        EXPORT: '/export',
        HEALTH: '/health',
        VERSION: '/version'
    },
    
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
    }
};

// Performance Configuration
export const PERFORMANCE_CONFIG = {
    LAZY_LOADING: {
        ENABLED: true,
        THRESHOLD: 100, // pixels
        ROOT_MARGIN: '50px'
    },
    
    DEBOUNCE_DELAYS: {
        SEARCH: 300,
        RESIZE: 250,
        SCROLL: 100,
        INPUT: 500
    },
    
    CACHE_SETTINGS: {
        STATIC_ASSETS: 31536000, // 1 year
        HTML_FILES: 3600, // 1 hour
        API_RESPONSES: 300, // 5 minutes
        USER_DATA: 86400 // 1 day
    },
    
    LIMITS: {
        MAX_CONCURRENT_REQUESTS: 10,
        MAX_RETRIES: 3,
        TIMEOUT: 30000,
        MAX_PAYLOAD_SIZE: 10 * 1024 * 1024 // 10MB
    }
};

// Default Configuration Values
export const DEFAULTS = {
    USER: {
        name: 'System User',
        role: 'User',
        avatar: 'SU',
        preferences: {
            theme: 'default',
            language: 'en',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            notifications: true
        }
    },
    
    ASSESSMENT: {
        autoSave: true,
        showProgress: true,
        allowBack: true,
        requireAllQuestions: false,
        timeLimit: null
    },
    
    EXPORT: {
        format: 'pdf',
        includeMetadata: true,
        includeCharts: true,
        compression: true
    }
};

// Error Messages
export const ERROR_MESSAGES = {
    GENERIC: 'An unexpected error occurred. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    STORAGE: 'Storage error. Please check available space.',
    VALIDATION: 'Please check your input and try again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    TIMEOUT: 'The request timed out. Please try again.',
    FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
    INVALID_FORMAT: 'Invalid file format.',
    BROWSER_NOT_SUPPORTED: 'Your browser is not supported. Please use a modern browser.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    SAVED: 'Data saved successfully',
    EXPORTED: 'Export completed successfully',
    IMPORTED: 'Import completed successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    COMPLETED: 'Task completed successfully'
};

// Make constants available globally if needed
if (typeof window !== 'undefined') {
    window.GOVERNANCE_CONSTANTS = {
        APP_CONFIG,
        ENVIRONMENTS,
        FEATURES,
        STORAGE_CONFIG,
        UI_CONFIG,
        QUESTION_TYPES,
        RULE_CONFIG,
        ANALYTICS_CONFIG,
        EXPORT_CONFIG,
        SECURITY_CONFIG,
        TEMPLATE_CONFIG,
        VALIDATION_CONFIG,
        API_CONFIG,
        PERFORMANCE_CONFIG,
        DEFAULTS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES
    };
}