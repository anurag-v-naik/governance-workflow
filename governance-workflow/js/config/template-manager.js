// js/config/template-manager.js - Template Management

/**
 * Template Manager for Data Governance Decision Tool
 * Manages recommendation templates and customizations
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class TemplateManager {
    static templates = [];
    static currentTemplate = null;
    static isInitialized = false;
    static isDirty = false;

    /**
     * Initialize template manager
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.loadTemplates();
        this.setupEventListeners();
        this.renderTemplatesList();
        this.renderTemplateEditor();
        
        this.isInitialized = true;
        console.log('Template Manager initialized');
    }

    /**
     * Load templates from storage
     */
    static loadTemplates() {
        if (typeof StateManager !== 'undefined') {
            this.templates = StateManager.getState('config.templates') || [];
        } else {
            this.templates = StorageManager?.getItem('recommendation_templates') || [];
        }

        // Load default templates if none exist
        if (this.templates.length === 0) {
            this.templates = this.getDefaultTemplates();
            this.saveTemplates();
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        // Add template button
        const addTemplateBtn = document.getElementById('add-template');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => this.createNewTemplate());
        }

        // Import/Export buttons
        const importBtn = document.getElementById('import-templates');
        const exportBtn = document.getElementById('export-templates');

        if (importBtn) {
            importBtn.addEventListener('click', () => this.importTemplates());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTemplates());
        }

        // Template form handlers
        const saveTemplateBtn = document.getElementById('save-template');
        const previewTemplateBtn = document.getElementById('preview-template');

        if (saveTemplateBtn) {
            saveTemplateBtn.addEventListener('click', () => this.saveCurrentTemplate());
        }

        if (previewTemplateBtn) {
            previewTemplateBtn.addEventListener('click', () => this.previewTemplate());
        }
    }

    /**
     * Render templates list
     */
    static renderTemplatesList() {
        const container = document.getElementById('templates-container');
        if (!container) return;

        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No Templates Available</h3>
                    <p>Create your first recommendation template.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.templates.map(template => `
            <div class="template-card ${this.currentTemplate?.id === template.id ? 'active' : ''}" 
                 data-template-id="${template.id}">
                <div class="template-card-header">
                    <div class="template-title">${this.escapeHTML(template.name)}</div>
                    <div class="template-category">${template.category || 'General'}</div>
                </div>
                <div class="template-description">
                    ${template.description ? this.escapeHTML(template.description) : 'No description'}
                </div>
                <div class="template-meta">
                    <span class="template-version">v${template.version || '1.0.0'}</span>
                    <span class="template-tags">
                        ${(template.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </span>
                </div>
                <div class="template-actions">
                    <button type="button" class="btn-icon" onclick="TemplateManager.editTemplate('${template.id}')" 
                            title="Edit template">
                        ✏️
                    </button>
                    <button type="button" class="btn-icon" onclick="TemplateManager.duplicateTemplate('${template.id}')" 
                            title="Duplicate template">
                        📋
                    </button>
                    <button type="button" class="btn-icon" onclick="TemplateManager.previewTemplate('${template.id}')" 
                            title="Preview template">
                        👁️
                    </button>
                    <button type="button" class="btn-icon" onclick="TemplateManager.deleteTemplate('${template.id}')" 
                            title="Delete template">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // Setup click handlers
        container.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.template-actions')) {
                    const templateId = card.dataset.templateId;
                    this.editTemplate(templateId);
                }
            });
        });
    }

    /**
     * Render template editor
     */
    static renderTemplateEditor() {
        const container = document.getElementById('template-form');
        if (!container) return;

        if (!this.currentTemplate) {
            container.innerHTML = `
                <div class="editor-placeholder">
                    <h3>Template Editor</h3>
                    <p>Select a template to edit or create a new one.</p>
                </div>
            `;
            return;
        }

        const template = this.currentTemplate;
        container.innerHTML = `
            <div class="template-editor-form">
                <h3>Edit Template</h3>
                
                <div class="form-group">
                    <label for="template-name" class="form-label">Template Name *</label>
                    <input type="text" id="template-name" class="form-input" 
                           value="${this.escapeHTML(template.name)}" required>
                </div>
                
                <div class="form-group">
                    <label for="template-description" class="form-label">Description *</label>
                    <textarea id="template-description" class="form-textarea" rows="3" required
                              placeholder="Describe the purpose and scope of this template">${this.escapeHTML(template.description || '')}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="template-category" class="form-label">Category</label>
                        <select id="template-category" class="form-select">
                            <option value="basic" ${template.category === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="advanced" ${template.category === 'advanced' ? 'selected' : ''}>Advanced</option>
                            <option value="security" ${template.category === 'security' ? 'selected' : ''}>Security</option>
                            <option value="compliance" ${template.category === 'compliance' ? 'selected' : ''}>Compliance</option>
                            <option value="industry_specific" ${template.category === 'industry_specific' ? 'selected' : ''}>Industry Specific</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="template-version" class="form-label">Version</label>
                        <input type="text" id="template-version" class="form-input" 
                               value="${template.version || '1.0.0'}" placeholder="1.0.0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="template-tags" class="form-label">Tags</label>
                    <input type="text" id="template-tags" class="form-input" 
                           value="${(template.tags || []).join(', ')}" placeholder="basic, starter, compliance">
                    <small class="form-help">Comma-separated tags for categorization</small>
                </div>

                <div class="recommendation-config">
                    <h4>Recommendation Configuration</h4>
                    
                    <div class="form-group">
                        <label for="recommendation-title" class="form-label">Title</label>
                        <input type="text" id="recommendation-title" class="form-input" 
                               value="${this.escapeHTML(template.recommendation?.title || '')}" 
                               placeholder="Data Governance Recommendations">
                    </div>
                    
                    <div class="form-group">
                        <label for="recommendation-summary" class="form-label">Summary Template</label>
                        <textarea id="recommendation-summary" class="form-textarea" rows="2"
                                  placeholder="Your organization demonstrates {level} governance maturity...">${this.escapeHTML(template.recommendation?.summary || '')}</textarea>
                        <small class="form-help">Use {level}, {score}, {organization} as placeholders</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="governance-level" class="form-label">Governance Level</label>
                            <select id="governance-level" class="form-select">
                                <option value="low" ${template.recommendation?.governanceLevel === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${template.recommendation?.governanceLevel === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${template.recommendation?.governanceLevel === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="confidence-score" class="form-label">Confidence Score</label>
                            <input type="number" id="confidence-score" class="form-input" 
                                   value="${template.recommendation?.confidenceScore || 85}" min="0" max="100">
                        </div>
                    </div>
                </div>

                <div class="sections-config">
                    <h4>Recommendation Sections</h4>
                    ${this.renderSectionEditors(template.sections || {})}
                </div>

                <div class="template-form-actions">
                    <button type="button" id="save-template" class="btn btn-primary">Save Template</button>
                    <button type="button" id="preview-template" class="btn btn-secondary">Preview</button>
                    <button type="button" id="cancel-template" class="btn btn-secondary">Cancel</button>
                    <button type="button" id="delete-template" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `;

        this.setupTemplateEditorListeners();
    }

    /**
     * Render section editors
     */
    static renderSectionEditors(sections) {
        const sectionTypes = [
            { key: 'placement', name: 'Data Placement', icon: '🗄️' },
            { key: 'controls', name: 'Governance Controls', icon: '🔒' },
            { key: 'sharing', name: 'Data Sharing', icon: '🤝' },
            { key: 'compliance', name: 'Compliance', icon: '⚖️' },
            { key: 'automation', name: 'Automation', icon: '🤖' },
            { key: 'monitoring', name: 'Monitoring', icon: '📊' }
        ];

        return sectionTypes.map(sectionType => `
            <div class="section-editor" data-section="${sectionType.key}">
                <div class="section-header">
                    <span class="section-icon">${sectionType.icon}</span>
                    <h5>${sectionType.name}</h5>
                    <button type="button" class="btn-small add-recommendation" 
                            onclick="TemplateManager.addRecommendation('${sectionType.key}')">
                        Add Recommendation
                    </button>
                </div>
                <div class="recommendations-list" id="recommendations-${sectionType.key}">
                    ${this.renderRecommendations(sections[sectionType.key] || [])}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render recommendations list
     */
    static renderRecommendations(recommendations) {
        return recommendations.map((rec, index) => `
            <div class="recommendation-item" data-index="${index}">
                <textarea class="recommendation-text form-textarea" rows="2" 
                          placeholder="Enter recommendation text...">${this.escapeHTML(rec)}</textarea>
                <button type="button" class="btn-icon remove-recommendation" 
                        onclick="TemplateManager.removeRecommendation(this)">🗑️</button>
            </div>
        `).join('');
    }

    /**
     * Setup template editor listeners
     */
    static setupTemplateEditorListeners() {
        const saveBtn = document.getElementById('save-template');
        const previewBtn = document.getElementById('preview-template');
        const cancelBtn = document.getElementById('cancel-template');
        const deleteBtn = document.getElementById('delete-template');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentTemplate());
        }

        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewCurrentTemplate());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelTemplateEdit());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteTemplate(this.currentTemplate.id));
        }

        // Auto-save on changes
        const form = document.querySelector('.template-editor-form');
        if (form) {
            form.addEventListener('input', () => this.markDirty());
        }
    }

    /**
     * Create new template
     */
    static createNewTemplate() {
        const template = {
            id: this.generateTemplateId(),
            name: 'New Template',
            description: '',
            category: 'basic',
            version: '1.0.0',
            tags: [],
            recommendation: {
                title: 'Data Governance Recommendations',
                summary: 'Your organization demonstrates {level} data governance maturity.',
                governanceLevel: 'medium',
                confidenceScore: 85
            },
            sections: {
                placement: [],
                controls: [],
                sharing: [],
                compliance: []
            },
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.currentTemplate = template;
        this.renderTemplateEditor();
        this.markDirty();
    }

    /**
     * Edit existing template
     */
    static editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        this.currentTemplate = JSON.parse(JSON.stringify(template)); // Deep copy
        this.renderTemplatesList(); // Update active state
        this.renderTemplateEditor();
    }

    /**
     * Save current template
     */
    static saveCurrentTemplate() {
        if (!this.currentTemplate) return;

        // Collect form data
        const nameField = document.getElementById('template-name');
        const descField = document.getElementById('template-description');
        const categoryField = document.getElementById('template-category');
        const versionField = document.getElementById('template-version');
        const tagsField = document.getElementById('template-tags');
        const titleField = document.getElementById('recommendation-title');
        const summaryField = document.getElementById('recommendation-summary');
        const levelField = document.getElementById('governance-level');
        const confidenceField = document.getElementById('confidence-score');

        if (!nameField?.value.trim() || !descField?.value.trim()) {
            alert('Template name and description are required');
            return;
        }

        // Update template
        this.currentTemplate.name = nameField.value.trim();
        this.currentTemplate.description = descField.value.trim();
        this.currentTemplate.category = categoryField?.value || 'basic';
        this.currentTemplate.version = versionField?.value || '1.0.0';
        this.currentTemplate.tags = tagsField?.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.currentTemplate.modified = new Date().toISOString();

        // Update recommendation config
        this.currentTemplate.recommendation = {
            title: titleField?.value || 'Data Governance Recommendations',
            summary: summaryField?.value || '',
            governanceLevel: levelField?.value || 'medium',
            confidenceScore: parseInt(confidenceField?.value) || 85
        };

        // Collect sections
        this.currentTemplate.sections = this.collectSections();

        // Save to templates array
        const existingIndex = this.templates.findIndex(t => t.id === this.currentTemplate.id);
        if (existingIndex >= 0) {
            this.templates[existingIndex] = this.currentTemplate;
        } else {
            this.templates.push(this.currentTemplate);
        }

        this.saveTemplates();
        this.renderTemplatesList();
        this.isDirty = false;
        alert('Template saved successfully');
    }

    /**
     * Collect sections from form
     */
    static collectSections() {
        const sections = {};
        const sectionEditors = document.querySelectorAll('.section-editor');

        sectionEditors.forEach(editor => {
            const sectionKey = editor.dataset.section;
            const recommendations = [];
            
            const recItems = editor.querySelectorAll('.recommendation-item textarea');
            recItems.forEach(textarea => {
                const text = textarea.value.trim();
                if (text) {
                    recommendations.push(text);
                }
            });

            sections[sectionKey] = recommendations;
        });

        return sections;
    }

    /**
     * Add recommendation to section
     */
    static addRecommendation(sectionKey) {
        const container = document.getElementById(`recommendations-${sectionKey}`);
        if (!container) return;

        const index = container.children.length;
        const recHTML = this.renderRecommendations(['']);
        container.insertAdjacentHTML('beforeend', recHTML);
    }

    /**
     * Remove recommendation
     */
    static removeRecommendation(button) {
        const recommendationItem = button.closest('.recommendation-item');
        if (recommendationItem) {
            recommendationItem.remove();
        }
    }

    /**
     * Preview template
     */
    static previewTemplate(templateId = null) {
        let template;
        if (templateId) {
            template = this.templates.find(t => t.id === templateId);
        } else {
            template = this.currentTemplate;
        }

        if (!template) return;

        this.showTemplatePreview(template);
    }

    /**
     * Preview current template
     */
    static previewCurrentTemplate() {
        if (!this.currentTemplate) return;

        // Temporarily update with current form data
        const tempTemplate = { ...this.currentTemplate };
        tempTemplate.sections = this.collectSections();
        
        this.showTemplatePreview(tempTemplate);
    }

    /**
     * Show template preview modal
     */
    static showTemplatePreview(template) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>Template Preview: ${this.escapeHTML(template.name)}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="template-preview">
                        <div class="preview-header">
                            <h3>${template.recommendation?.title || 'Data Governance Recommendations'}</h3>
                            <div class="preview-meta">
                                <span class="governance-level level-${template.recommendation?.governanceLevel || 'medium'}">
                                    ${(template.recommendation?.governanceLevel || 'medium').toUpperCase()} Governance Level
                                </span>
                                <span class="confidence-score">
                                    Confidence: ${template.recommendation?.confidenceScore || 85}%
                                </span>
                            </div>
                        </div>
                        
                        <div class="preview-summary">
                            <h4>Executive Summary</h4>
                            <p>${template.recommendation?.summary || 'No summary provided'}</p>
                        </div>
                        
                        ${Object.entries(template.sections || {}).map(([sectionKey, recommendations]) => `
                            <div class="preview-section">
                                <h4>${this.getSectionName(sectionKey)}</h4>
                                ${recommendations.length > 0 ? `
                                    <ul>
                                        ${recommendations.map(rec => `<li>${this.escapeHTML(rec)}</li>`).join('')}
                                    </ul>
                                ` : '<p class="no-recommendations">No recommendations configured for this section.</p>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Get section display name
     */
    static getSectionName(sectionKey) {
        const names = {
            placement: 'Data Placement Recommendations',
            controls: 'Governance Controls',
            sharing: 'Data Sharing Strategy',
            compliance: 'Compliance Requirements',
            automation: 'Automation Opportunities',
            monitoring: 'Monitoring and Auditing'
        };
        return names[sectionKey] || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
    }

    /**
     * Duplicate template
     */
    static duplicateTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const duplicatedTemplate = {
            ...JSON.parse(JSON.stringify(template)),
            id: this.generateTemplateId(),
            name: template.name + ' (Copy)',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.templates.push(duplicatedTemplate);
        this.saveTemplates();
        this.renderTemplatesList();
    }

    /**
     * Delete template
     */
    static deleteTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
            this.templates = this.templates.filter(t => t.id !== templateId);
            
            if (this.currentTemplate?.id === templateId) {
                this.currentTemplate = null;
                this.renderTemplateEditor();
            }
            
            this.saveTemplates();
            this.renderTemplatesList();
        }
    }

    /**
     * Cancel template edit
     */
    static cancelTemplateEdit() {
        if (this.isDirty && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
            return;
        }

        this.currentTemplate = null;
        this.renderTemplateEditor();
        this.isDirty = false;
    }

    /**
     * Export templates
     */
    static exportTemplates() {
        const exportData = {
            templates: this.templates,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `governance-templates-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import templates
     */
    static importTemplates() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processTemplatesImport(file);
            }
        };
        input.click();
    }

    /**
     * Process templates import
     */
    static async processTemplatesImport(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (importData.templates && Array.isArray(importData.templates)) {
                if (confirm(`Import ${importData.templates.length} templates? This will merge with existing templates.`)) {
                    // Merge templates, avoiding ID conflicts
                    importData.templates.forEach(template => {
                        template.id = this.generateTemplateId();
                        template.imported = new Date().toISOString();
                    });

                    this.templates.push(...importData.templates);
                    this.saveTemplates();
                    this.renderTemplatesList();
                    alert('Templates imported successfully');
                }
            } else {
                alert('Invalid templates file format');
            }
        } catch (error) {
            console.error('Failed to import templates:', error);
            alert('Failed to import templates: ' + error.message);
        }
    }

    /**
     * Save templates to storage
     */
    static saveTemplates() {
        if (typeof StateManager !== 'undefined') {
            StateManager.setTemplates(this.templates);
        } else if (typeof StorageManager !== 'undefined') {
            StorageManager.setItem('recommendation_templates', this.templates);
        }
    }

    /**
     * Generate unique template ID
     */
    static generateTemplateId() {
        return 'template-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
     * Load templates list
     */
    static loadTemplatesList() {
        this.loadTemplates();
        this.renderTemplatesList();
    }

    /**
     * Create new template with defaults
     */
    static createNewTemplate() {
        this.createNewTemplate();
    }

    /**
     * Get default templates
     */
    static getDefaultTemplates() {
        return [
            {
                id: "basic_governance_template",
                name: "Basic Data Governance",
                description: "Fundamental governance recommendations for organizations starting their data governance journey",
                category: "basic",
                version: "1.0.0",
                tags: ["starter", "basic", "foundation"],
                recommendation: {
                    title: "Basic Data Governance Framework",
                    summary: "Your organization demonstrates {level} data governance maturity with opportunities for improvement.",
                    governanceLevel: "low",
                    confidenceScore: 85
                },
                sections: {
                    placement: [
                        "Centralize data in cloud storage with basic security controls",
                        "Implement simple folder structure with clear naming conventions",
                        "Use managed cloud services to reduce operational overhead"
                    ],
                    controls: [
                        "Establish basic role-based access controls",
                        "Implement data classification (Public, Internal, Confidential)",
                        "Create simple data retention policies"
                    ],
                    sharing: [
                        "Define clear data sharing agreements",
                        "Implement basic approval workflows for external sharing",
                        "Use secure file sharing platforms for external collaboration"
                    ],
                    compliance: [
                        "Document data handling procedures",
                        "Conduct annual data inventory",
                        "Implement basic privacy controls"
                    ]
                }
            },
            {
                id: "advanced_governance_template",
                name: "Advanced Data Governance",
                description: "Comprehensive governance framework for mature organizations",
                category: "advanced",
                version: "1.0.0",
                tags: ["advanced", "enterprise", "comprehensive"],
                recommendation: {
                    title: "Enterprise Data Governance Framework",
                    summary: "Your organization shows {level} governance maturity with capabilities for advanced optimization.",
                    governanceLevel: "high",
                    confidenceScore: 95
                },
                sections: {
                    placement: [
                        "Implement multi-cloud data placement strategy",
                        "Use intelligent data tiering based on usage patterns",
                        "Deploy edge computing for low-latency data processing"
                    ],
                    controls: [
                        "Deploy AI-powered data discovery and classification",
                        "Implement dynamic data access controls",
                        "Use machine learning for anomaly detection"
                    ],
                    sharing: [
                        "Implement federated data governance across business units",
                        "Deploy data marketplace for internal data discovery",
                        "Use APIs for controlled data access"
                    ],
                    compliance: [
                        "Implement continuous compliance monitoring",
                        "Deploy automated regulatory reporting",
                        "Use AI for privacy impact assessments"
                    ]
                }
            }
        ];
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TemplateManager = TemplateManager;
}
// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    TemplateManager.init();
});
// Main entry point
function main() {
    TemplateManager.init();
}  
// Run main if in browser context
if (typeof window !== 'undefined') {
    main();
}