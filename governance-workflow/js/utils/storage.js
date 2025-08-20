// js/utils/storage.js - Storage Management Utility

/**
 * Storage Manager for Data Governance Decision Tool
 * Handles localStorage operations with encryption and error handling
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class StorageManager {
    static STORAGE_PREFIX = 'dgdt_'; // Data Governance Decision Tool prefix
    static ENCRYPTION_KEY = 'dgdt-encryption-key-2025';
    static MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

    /**
     * Initialize storage manager
     */
    static init() {
        this.checkStorageSupport();
        this.performMaintenance();
        console.log('Storage Manager initialized');
    }

    /**
     * Check if localStorage is supported
     */
    static checkStorageSupport() {
        try {
            const test = 'storage_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage is not supported:', e);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    static getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;
        const items = {};

        for (let key in localStorage) {
            if (key.startsWith(this.STORAGE_PREFIX)) {
                const size = localStorage[key].length;
                totalSize += size;
                itemCount++;
                items[key] = {
                    size: size,
                    lastModified: this.getItem(key.replace(this.STORAGE_PREFIX, ''))?.lastModified || 'Unknown'
                };
            }
        }

        return {
            totalSize,
            itemCount,
            items,
            maxSize: this.MAX_STORAGE_SIZE,
            usagePercentage: (totalSize / this.MAX_STORAGE_SIZE) * 100
        };
    }

    /**
     * Store data with optional encryption
     */
    static setItem(key, value, options = {}) {
        try {
            const {
                encrypt = false,
                ttl = null, // Time to live in milliseconds
                compress = false
            } = options;

            // Prepare storage object
            const storageObject = {
                data: value,
                timestamp: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                version: '1.0.0',
                encrypted: encrypt,
                compressed: compress,
                ttl: ttl ? Date.now() + ttl : null
            };

            // Compress if requested
            if (compress && typeof value === 'string') {
                storageObject.data = this.compress(value);
            }

            // Encrypt if requested
            if (encrypt) {
                storageObject.data = this.encrypt(JSON.stringify(storageObject.data));
            }

            const serialized = JSON.stringify(storageObject);
            
            // Check storage size
            if (serialized.length > this.MAX_STORAGE_SIZE / 10) {
                console.warn('Large storage item detected:', key, serialized.length);
            }

            localStorage.setItem(this.STORAGE_PREFIX + key, serialized);
            
            // Track storage operation
            this.trackStorageOperation('set', key, serialized.length);
            
            return true;

        } catch (error) {
            console.error('Failed to store item:', key, error);
            this.handleStorageError(error, 'setItem', key);
            return false;
        }
    }

    /**
     * Retrieve data with automatic decryption
     */
    static getItem(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(this.STORAGE_PREFIX + key);
            
            if (!stored) {
                return defaultValue;
            }

            const storageObject = JSON.parse(stored);

            // Check TTL
            if (storageObject.ttl && Date.now() > storageObject.ttl) {
                this.removeItem(key);
                return defaultValue;
            }

            let data = storageObject.data;

            // Decrypt if needed
            if (storageObject.encrypted) {
                data = JSON.parse(this.decrypt(data));
            }

            // Decompress if needed
            if (storageObject.compressed && typeof data === 'string') {
                data = this.decompress(data);
            }

            // Track storage operation
            this.trackStorageOperation('get', key, stored.length);

            return data;

        } catch (error) {
            console.error('Failed to retrieve item:', key, error);
            this.handleStorageError(error, 'getItem', key);
            return defaultValue;
        }
    }

    /**
     * Remove item from storage
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(this.STORAGE_PREFIX + key);
            this.trackStorageOperation('remove', key, 0);
            return true;
        } catch (error) {
            console.error('Failed to remove item:', key, error);
            this.handleStorageError(error, 'removeItem', key);
            return false;
        }
    }

    /**
     * Check if item exists
     */
    static hasItem(key) {
        return localStorage.getItem(this.STORAGE_PREFIX + key) !== null;
    }

    /**
     * Get all keys with prefix
     */
    static getAllKeys() {
        const keys = [];
        for (let key in localStorage) {
            if (key.startsWith(this.STORAGE_PREFIX)) {
                keys.push(key.replace(this.STORAGE_PREFIX, ''));
            }
        }
        return keys;
    }

    /**
     * Clear all application data
     */
    static clear() {
        try {
            const keys = this.getAllKeys();
            keys.forEach(key => {
                this.removeItem(key);
            });
            console.log('Storage cleared successfully');
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Export all data
     */
    static exportData() {
        try {
            const exportData = {};
            const keys = this.getAllKeys();
            
            keys.forEach(key => {
                exportData[key] = this.getItem(key);
            });

            return {
                data: exportData,
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                storageInfo: this.getStorageInfo()
            };

        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import data
     */
    static importData(importData, options = {}) {
        try {
            const {
                overwrite = false,
                validateData = true
            } = options;

            if (validateData && !this.validateImportData(importData)) {
                throw new Error('Invalid import data format');
            }

            const results = {
                imported: 0,
                skipped: 0,
                errors: []
            };

            for (const [key, value] of Object.entries(importData.data)) {
                try {
                    if (!overwrite && this.hasItem(key)) {
                        results.skipped++;
                        continue;
                    }

                    this.setItem(key, value);
                    results.imported++;

                } catch (error) {
                    results.errors.push({ key, error: error.message });
                }
            }

            console.log('Data import completed:', results);
            return results;

        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

    /**
     * Validate import data format
     */
    static validateImportData(importData) {
        return (
            importData &&
            typeof importData === 'object' &&
            importData.data &&
            typeof importData.data === 'object' &&
            importData.version &&
            importData.exportDate
        );
    }

    /**
     * Perform storage maintenance
     */
    static performMaintenance() {
        try {
            this.cleanExpiredItems();
            this.optimizeStorage();
            console.log('Storage maintenance completed');
        } catch (error) {
            console.error('Storage maintenance failed:', error);
        }
    }

    /**
     * Clean expired items
     */
    static cleanExpiredItems() {
        const keys = this.getAllKeys();
        let cleanedCount = 0;

        keys.forEach(key => {
            try {
                const stored = localStorage.getItem(this.STORAGE_PREFIX + key);
                if (stored) {
                    const storageObject = JSON.parse(stored);
                    if (storageObject.ttl && Date.now() > storageObject.ttl) {
                        this.removeItem(key);
                        cleanedCount++;
                    }
                }
            } catch (error) {
                console.warn('Error checking expiry for key:', key, error);
            }
        });

        if (cleanedCount > 0) {
            console.log(`Cleaned ${cleanedCount} expired items`);
        }
    }

    /**
     * Optimize storage by removing redundant data
     */
    static optimizeStorage() {
        const storageInfo = this.getStorageInfo();
        
        // If storage usage is above 80%, perform cleanup
        if (storageInfo.usagePercentage > 80) {
            console.warn('Storage usage high:', storageInfo.usagePercentage.toFixed(2) + '%');
            
            // Remove old audit logs if they exist
            const auditLogs = this.getItem('audit_logs', []);
            if (auditLogs.length > 1000) {
                const trimmedLogs = auditLogs.slice(-500); // Keep only last 500 entries
                this.setItem('audit_logs', trimmedLogs);
                console.log('Trimmed audit logs from', auditLogs.length, 'to', trimmedLogs.length);
            }

            // Remove old completed assessments
            const completedAssessments = this.getItem('completed_assessments', []);
            if (completedAssessments.length > 50) {
                const recentAssessments = completedAssessments.slice(-25); // Keep only last 25
                this.setItem('completed_assessments', recentAssessments);
                console.log('Trimmed completed assessments from', completedAssessments.length, 'to', recentAssessments.length);
            }
        }
    }

    /**
     * Simple encryption (for demonstration - use proper encryption in production)
     */
    static encrypt(text) {
        // This is a simple XOR cipher for demonstration
        // In production, use proper encryption libraries
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ this.ENCRYPTION_KEY.charCodeAt(i % this.ENCRYPTION_KEY.length)
            );
        }
        return btoa(result); // Base64 encode
    }

    /**
     * Simple decryption
     */
    static decrypt(encrypted) {
        try {
            const decoded = atob(encrypted); // Base64 decode
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(
                    decoded.charCodeAt(i) ^ this.ENCRYPTION_KEY.charCodeAt(i % this.ENCRYPTION_KEY.length)
                );
            }
            return result;
        } catch (error) {
            throw new Error('Decryption failed');
        }
    }

    /**
     * Simple compression using LZ-style algorithm
     */
    static compress(text) {
        // Simple run-length encoding for demonstration
        return text.replace(/(.)\1+/g, (match, char) => {
            return char + match.length;
        });
    }

    /**
     * Simple decompression
     */
    static decompress(compressed) {
        // Reverse the run-length encoding
        return compressed.replace(/(.)\d+/g, (match, char) => {
            const count = parseInt(match.slice(1));
            return char.repeat(count);
        });
    }

    /**
     * Track storage operations for analytics
     */
    static trackStorageOperation(operation, key, size) {
        try {
            const track = this.getItem('storage_analytics', { operations: [], totalOperations: 0 });
            
            track.operations.push({
                operation,
                key,
                size,
                timestamp: new Date().toISOString()
            });

            track.totalOperations++;

            // Keep only last 100 operations
            if (track.operations.length > 100) {
                track.operations = track.operations.slice(-100);
            }

            // Store without tracking to avoid recursion
            localStorage.setItem(this.STORAGE_PREFIX + 'storage_analytics', JSON.stringify({
                data: track,
                timestamp: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                version: '1.0.0'
            }));

        } catch (error) {
            // Silently fail to avoid breaking the main operation
            console.debug('Failed to track storage operation:', error);
        }
    }

    /**
     * Handle storage errors
     */
    static handleStorageError(error, operation, key) {
        const errorInfo = {
            operation,
            key,
            error: error.message,
            timestamp: new Date().toISOString(),
            storageInfo: this.getStorageInfo()
        };

        // Try to store error information
        try {
            const errors = this.getItem('storage_errors', []);
            errors.push(errorInfo);
            
            // Keep only last 50 errors
            if (errors.length > 50) {
                errors.splice(0, errors.length - 50);
            }
            
            this.setItem('storage_errors', errors);
        } catch (e) {
            console.error('Failed to store error information:', e);
        }

        // If storage is full, try to free up space
        if (error.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded, attempting cleanup...');
            this.performMaintenance();
        }
    }

    /**
     * Get storage analytics
     */
    static getStorageAnalytics() {
        return {
            info: this.getStorageInfo(),
            analytics: this.getItem('storage_analytics', { operations: [], totalOperations: 0 }),
            errors: this.getItem('storage_errors', [])
        };
    }

    /**
     * Backup data to download
     */
    static backupToFile() {
        try {
            const backupData = this.exportData();
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dgdt-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Backup downloaded successfully');
            return true;

        } catch (error) {
            console.error('Failed to create backup:', error);
            return false;
        }
    }

    /**
     * Restore data from file
     */
    static async restoreFromFile(file, options = {}) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            return this.importData(backupData, options);

        } catch (error) {
            console.error('Failed to restore from file:', error);
            throw error;
        }
    }

    /**
     * Get item metadata
     */
    static getItemMetadata(key) {
        try {
            const stored = localStorage.getItem(this.STORAGE_PREFIX + key);
            if (!stored) return null;

            const storageObject = JSON.parse(stored);
            return {
                key,
                size: stored.length,
                timestamp: storageObject.timestamp,
                lastModified: storageObject.lastModified,
                version: storageObject.version,
                encrypted: storageObject.encrypted || false,
                compressed: storageObject.compressed || false,
                ttl: storageObject.ttl,
                expired: storageObject.ttl ? Date.now() > storageObject.ttl : false
            };

        } catch (error) {
            console.error('Failed to get metadata for:', key, error);
            return null;
        }
    }

    /**
     * Search stored data
     */
    static search(query, options = {}) {
        const {
            keys = null, // Specific keys to search in
            caseSensitive = false,
            includeMetadata = false
        } = options;

        const searchKeys = keys || this.getAllKeys();
        const results = [];

        searchKeys.forEach(key => {
            try {
                const data = this.getItem(key);
                if (data && typeof data === 'object') {
                    const dataString = JSON.stringify(data);
                    const searchString = caseSensitive ? dataString : dataString.toLowerCase();
                    const queryString = caseSensitive ? query : query.toLowerCase();

                    if (searchString.includes(queryString)) {
                        const result = { key, data };
                        if (includeMetadata) {
                            result.metadata = this.getItemMetadata(key);
                        }
                        results.push(result);
                    }
                }
            } catch (error) {
                console.warn('Error searching key:', key, error);
            }
        });

        return results;
    }
}

// Initialize storage manager when script loads
if (typeof window !== 'undefined') {
    StorageManager.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}