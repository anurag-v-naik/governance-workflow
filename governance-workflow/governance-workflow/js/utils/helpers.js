// js/utils/helpers.js - Common Utility Functions

/**
 * Helper Utilities for Data Governance Decision Tool
 * Common utility functions used throughout the application
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class Helpers {
    /**
     * Generate unique ID
     */
    static generateId(prefix = 'id') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Generate UUID v4
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Deep clone an object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }

        return cloned;
    }

    /**
     * Deep merge objects
     */
    static deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Check if value is an object
     */
    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Check if value is empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Debounce function
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format date to string
     */
    static formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const formats = {
            'YYYY-MM-DD': () => d.toISOString().split('T')[0],
            'DD/MM/YYYY': () => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
            'MM/DD/YYYY': () => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`,
            'YYYY-MM-DD HH:mm': () => d.toISOString().slice(0, 16).replace('T', ' '),
            'relative': () => this.getRelativeTime(d)
        };

        return formats[format] ? formats[format]() : d.toLocaleDateString();
    }

    /**
     * Get relative time (e.g., "2 hours ago")
     */
    static getRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
        
        const years = Math.floor(months / 12);
        return `${years} year${years !== 1 ? 's' : ''} ago`;
    }

    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format number with commas
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Calculate percentage
     */
    static calculatePercentage(value, total, decimals = 1) {
        if (total === 0) return 0;
        return Number(((value / total) * 100).toFixed(decimals));
    }

    /**
     * Capitalize first letter
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Convert string to title case
     */
    static toTitleCase(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    /**
     * Convert camelCase to kebab-case
     */
    static camelToKebab(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Convert kebab-case to camelCase
     */
    static kebabToCamel(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * Truncate string
     */
    static truncate(str, length = 100, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + suffix;
    }

    /**
     * Escape HTML
     */
    static escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Unescape HTML
     */
    static unescapeHTML(str) {
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    }

    /**
     * Generate random color
     */
    static generateRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Convert hex color to RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convert RGB to hex color
     */
    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Get contrast color (black or white)
     */
    static getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    /**
     * Sort array by property
     */
    static sortBy(array, property, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = this.getNestedProperty(a, property);
            const bVal = this.getNestedProperty(b, property);
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Group array by property
     */
    static groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = this.getNestedProperty(item, property);
            groups[key] = groups[key] || [];
            groups[key].push(item);
            return groups;
        }, {});
    }

    /**
     * Get nested property from object
     */
    static getNestedProperty(obj, path) {
        return path.split('.').reduce((current, prop) => 
            current && current[prop] !== undefined ? current[prop] : undefined, obj
        );
    }

    /**
     * Set nested property in object
     */
    static setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
        return obj;
    }

    /**
     * Remove duplicates from array
     */
    static unique(array, property = null) {
        if (property) {
            const seen = new Set();
            return array.filter(item => {
                const value = this.getNestedProperty(item, property);
                if (seen.has(value)) {
                    return false;
                }
                seen.add(value);
                return true;
            });
        }
        
        return [...new Set(array)];
    }

    /**
     * Flatten nested array
     */
    static flatten(array, depth = 1) {
        return depth > 0 ? array.reduce((acc, val) => 
            acc.concat(Array.isArray(val) ? this.flatten(val, depth - 1) : val), []) : array.slice();
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Shuffle array
     */
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get random item from array
     */
    static randomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Get random items from array
     */
    static randomItems(array, count) {
        const shuffled = this.shuffle(array);
        return shuffled.slice(0, Math.min(count, array.length));
    }

    /**
     * Calculate average
     */
    static average(numbers) {
        if (!numbers.length) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    /**
     * Calculate median
     */
    static median(numbers) {
        if (!numbers.length) return 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }

    /**
     * Calculate standard deviation
     */
    static standardDeviation(numbers) {
        if (!numbers.length) return 0;
        const avg = this.average(numbers);
        const squareDiffs = numbers.map(num => Math.pow(num - avg, 2));
        return Math.sqrt(this.average(squareDiffs));
    }

    /**
     * Get min/max values
     */
    static minMax(numbers) {
        if (!numbers.length) return { min: 0, max: 0 };
        return {
            min: Math.min(...numbers),
            max: Math.max(...numbers)
        };
    }

    /**
     * Clamp number between min and max
     */
    static clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }

    /**
     * Generate random number between min and max
     */
    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Generate random integer between min and max
     */
    static randomIntBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Check if device is mobile
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if device is tablet
     */
    static isTablet() {
        return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
    }

    /**
     * Check if device is desktop
     */
    static isDesktop() {
        return !this.isMobile() && !this.isTablet();
    }

    /**
     * Get viewport dimensions
     */
    static getViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    /**
     * Get scroll position
     */
    static getScrollPosition() {
        return {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop
        };
    }

    /**
     * Smooth scroll to element
     */
    static scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const top = rect.top + window.pageYOffset - offset;
        
        window.scrollTo({
            top: top,
            behavior: 'smooth'
        });
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const success = document.execCommand('copy');
                textArea.remove();
                return success;
            }
        } catch (error) {
            console.error('Failed to copy text:', error);
            return false;
        }
    }

    /**
     * Download data as file
     */
    static downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Parse CSV data
     */
    static parseCSV(csv, delimiter = ',') {
        const lines = csv.split('\n');
        const headers = lines[0].split(delimiter).map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(delimiter).map(v => v.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        
        return { headers, data };
    }

    /**
     * Convert array to CSV
     */
    static arrayToCSV(array, delimiter = ',') {
        if (!array.length) return '';
        
        const headers = Object.keys(array[0]);
        const csvHeaders = headers.join(delimiter);
        
        const csvRows = array.map(row => 
            headers.map(header => {
                const value = row[header] || '';
                return typeof value === 'string' && value.includes(delimiter) 
                    ? `"${value}"` : value;
            }).join(delimiter)
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Parse URL parameters
     */
    static parseURLParams(url = window.location.href) {
        const params = {};
        const urlObj = new URL(url);
        
        for (const [key, value] of urlObj.searchParams.entries()) {
            params[key] = value;
        }
        
        return params;
    }

    /**
     * Build URL with parameters
     */
    static buildURL(baseURL, params = {}) {
        const url = new URL(baseURL);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.set(key, value);
            }
        });
        
        return url.toString();
    }

    /**
     * Wait for specified time
     */
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    throw lastError;
                }
                
                const waitTime = delay * Math.pow(2, attempt - 1);
                await this.wait(waitTime);
            }
        }
    }

    /**
     * Create promise with timeout
     */
    static withTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), timeout)
            )
        ]);
    }

    /**
     * Create element with attributes
     */
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    /**
     * Add event listener with automatic cleanup
     */
    static addEventListenerWithCleanup(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        
        return () => {
            element.removeEventListener(event, handler, options);
        };
    }

    /**
     * Format currency
     */
    static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate URL format
     */
    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get browser information
     */
    static getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (userAgent.includes('Chrome')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Safari')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Edge')) {
            browser = 'Edge';
            version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
        }
        
        return { browser, version, userAgent };
    }

    /**
     * Check if feature is supported
     */
    static isFeatureSupported(feature) {
        const features = {
            localStorage: () => {
                try {
                    const test = 'test';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch {
                    return false;
                }
            },
            webWorkers: () => typeof Worker !== 'undefined',
            canvas: () => {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext && canvas.getContext('2d'));
            },
            webgl: () => {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext && canvas.getContext('webgl'));
            },
            geolocation: () => 'geolocation' in navigator,
            notifications: () => 'Notification' in window,
            serviceWorker: () => 'serviceWorker' in navigator,
            webAssembly: () => typeof WebAssembly !== 'undefined'
        };
        
        return features[feature] ? features[feature]() : false;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Helpers = Helpers;
}