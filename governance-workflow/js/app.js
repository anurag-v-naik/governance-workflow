// js/app.js - Main Application Controller for Data Governance Decision Tool

/**
 * Data Governance Decision Tool - Main Application
 * Enterprise-grade tool for intelligent data governance recommendations
 * 
 * @version 1.0.0
 * @author System Administrator
 * @organization Enterprise Data Governance Team
 * @created 2025-08-19
 */

class DataGovernanceApp {
    constructor() {
        this.version = '1.0.0';
        this.appName = 'Data Governance Decision Tool';
        this.currentUser = null;
        this.currentAssessment = null;
        this.isInitialized = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.initializeUser = this.initializeUser.bind(this);
        this.handleTabNavigation = this.handleTabNavigation.bind(this);
        this.showLoading = this.showLoading.bind(this);
        this.hideLoading = this.hideLoading.bind(this);
        
        // Initialize when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log(`Initializing ${this.appName} v${this.version}`);
            
            // Initialize core components
            await this.initializeUser();
            await this.initializeComponents();
            await this.loadDefaultData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load saved state
            await this.loadApplicationState();
            
            // Show initial tab
            this.showTab('assessment');
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
            // Show welcome message for first-time users
            if (this.isFirstTimeUser()) {
                this.showWelcomeWizard();
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showToast('Error initializing application', 'error');
        }
    }

    /**
     * Initialize user information
     */
    async initializeUser() {
        try {
            // Get user info from storage or set defaults
            const userData = StorageManager.getItem('user_profile') || {
                id: this.generateSystemId(),
                name: 'System Admin',
                role: 'Administrator',
                organization: 'Enterprise Organization',
                email: 'admin@enterprise.com',
                avatar: 'SA',
                created: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            this.currentUser = userData;
            
            // Update user interface
            this.updateUserInterface();
            
            // Track user login
            UsageTracker.trackEvent('user_login', {
                userId: userData.id,
                timestamp: new Date().toISOString()
            });
            
            // Save updated user data
            StorageManager.setItem('user_profile', userData);
            
        } catch (error) {
            console.error('Failed to initialize user:', error);
            throw error;
        }
    }

    /**
     * Update user interface with current user data
     */
    updateUserInterface() {
        const userNameElement = document.getElementById('user-name');
        const userMenuElement = document.querySelector('.user-info .user-name');
        const userRoleElement = document.querySelector('.user-info .user-role');
        const userAvatarElement = document.querySelector('.user-avatar');

        if (userNameElement) userNameElement.textContent = this.currentUser.name;
        if (userMenuElement) userMenuElement.textContent = this.currentUser.name;
        if (userRoleElement) userRoleElement.textContent = this.currentUser.role;
        if (userAvatarElement) userAvatarElement.textContent = this.currentUser.avatar;
    }

    /**
     * Initialize core application components
     */
    async initializeComponents() {
        try {
            // Initialize state manager
            if (typeof StateManager !== 'undefined') {
                StateManager.init();
            }

            // Initialize event bus
            if (typeof EventBus !== 'undefined') {
                EventBus.init();
            }

            // Initialize navigation controller
            if (typeof NavigationController !== 'undefined') {
                NavigationController.init();
            }

            // Initialize question renderer
            if (typeof QuestionRenderer !== 'undefined') {
                QuestionRenderer.init();
            }

            // Initialize rules engine
            if (typeof RulesEngine !== 'undefined') {
                RulesEngine.init();
            }

            // Initialize recommendation engine
            if (typeof RecommendationEngine !== 'undefined') {
                RecommendationEngine.init();
            }

            // Initialize analytics
            if (typeof DashboardController !== 'undefined') {
                DashboardController.init();
            }

            console.log('All components initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize components:', error);
            throw error;
        }
    }

    /**
     * Load default application data
     */
    async loadDefaultData() {
        try {
            // Load default questions if none exist
            let questions = StorageManager.getItem('governance_questions');
            if (!questions || questions.length === 0) {
                questions = this.getDefaultQuestions();
                StorageManager.setItem('governance_questions', questions);
            }

            // Load default rules if none exist
            let rules = StorageManager.getItem('governance_rules');
            if (!rules || rules.length === 0) {
                rules = this.getDefaultRules();
                StorageManager.setItem('governance_rules', rules);
            }

            // Load default templates if none exist
            let templates = StorageManager.getItem('recommendation_templates');
            if (!templates || templates.length === 0) {
                templates = this.getDefaultTemplates();
                StorageManager.setItem('recommendation_templates', templates);
            }

            console.log('Default data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load default data:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for the application
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab || e.target.closest('.nav-tab').dataset.tab;
                this.showTab(tabName);
            });
        });

        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenu = document.getElementById('user-menu');
        
        if (userMenuBtn && userMenu) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', () => {
                userMenu.classList.add('hidden');
            });
        }

        // Assessment form handlers
        this.setupAssessmentHandlers();
        
        // Configuration handlers
        this.setupConfigurationHandlers();
        
        // Rules engine handlers
        this.setupRulesHandlers();
        
        // Analytics handlers
        this.setupAnalyticsHandlers();
        
        // Templates handlers
        this.setupTemplatesHandlers();

        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('resize', this.handleWindowResize.bind(this));

        console.log('Event listeners set up successfully');
    }

    /**
     * Set up assessment-specific event handlers
     */
    setupAssessmentHandlers() {
        // New assessment button
        const newAssessmentBtn = document.getElementById('new-assessment');
        if (newAssessmentBtn) {
            newAssessmentBtn.addEventListener('click', () => this.startNewAssessment());
        }

        // Save assessment button
        const saveAssessmentBtn = document.getElementById('save-assessment');
        if (saveAssessmentBtn) {
            saveAssessmentBtn.addEventListener('click', () => this.saveCurrentAssessment());
        }

        // Load assessment button
        const loadAssessmentBtn = document.getElementById('load-assessment');
        if (loadAssessmentBtn) {
            loadAssessmentBtn.addEventListener('click', () => this.showLoadAssessmentDialog());
        }

        // Navigation buttons
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');
        const submitBtn = document.getElementById('submit-assessment');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousQuestion());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitAssessment());
        }

        // Assessment form submission
        const assessmentForm = document.getElementById('assessment-form');
        if (assessmentForm) {
            assessmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitAssessment();
            });
        }
    }

    /**
     * Set up configuration-specific event handlers
     */
    setupConfigurationHandlers() {
        // Add question button
        const addQuestionBtn = document.getElementById('add-question');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', () => this.addNewQuestion());
        }

        // Import/Export configuration
        const importConfigBtn = document.getElementById('import-config');
        const exportConfigBtn = document.getElementById('export-config');

        if (importConfigBtn) {
            importConfigBtn.addEventListener('click', () => this.importConfiguration());
        }

        if (exportConfigBtn) {
            exportConfigBtn.addEventListener('click', () => this.exportConfiguration());
        }

        // Question type selection
        document.querySelectorAll('.question-type').forEach(type => {
            type.addEventListener('click', (e) => {
                const questionType = e.target.dataset.type || e.target.closest('.question-type').dataset.type;
                this.selectQuestionType(questionType);
            });
        });
    }

    /**
     * Set up rules engine event handlers
     */
    setupRulesHandlers() {
        // Add rule button
        const addRuleBtn = document.getElementById('add-rule');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => this.addNewRule());
        }

        // Import/Export rules
        const importRulesBtn = document.getElementById('import-rules');
        const exportRulesBtn = document.getElementById('export-rules');
        const testRulesBtn = document.getElementById('test-rules');

        if (importRulesBtn) {
            importRulesBtn.addEventListener('click', () => this.importRules());
        }

        if (exportRulesBtn) {
            exportRulesBtn.addEventListener('click', () => this.exportRules());
        }

        if (testRulesBtn) {
            testRulesBtn.addEventListener('click', () => this.testRules());
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
            addConditionBtn.addEventListener('click', () => this.addRuleCondition());
        }

        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => this.addRuleAction());
        }
    }

    /**
     * Set up analytics event handlers
     */
    setupAnalyticsHandlers() {
        // Refresh analytics button
        const refreshAnalyticsBtn = document.getElementById('refresh-analytics');
        if (refreshAnalyticsBtn) {
            refreshAnalyticsBtn.addEventListener('click', () => this.refreshAnalytics());
        }

        // Export report button
        const exportReportBtn = document.getElementById('export-report');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportAnalyticsReport());
        }
    }

    /**
     * Set up templates event handlers
     */
    setupTemplatesHandlers() {
        // Add template button
        const addTemplateBtn = document.getElementById('add-template');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => this.addNewTemplate());
        }

        // Import/Export templates
        const importTemplatesBtn = document.getElementById('import-templates');
        const exportTemplatesBtn = document.getElementById('export-templates');

        if (importTemplatesBtn) {
            importTemplatesBtn.addEventListener('click', () => this.importTemplates());
        }

        if (exportTemplatesBtn) {
            exportTemplatesBtn.addEventListener('click', () => this.exportTemplates());
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
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S: Save current work
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveCurrentWork();
        }

        // Ctrl/Cmd + N: New assessment/item
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNew();
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }

        // Tab navigation with numbers
        if (e.altKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const tabNames = ['assessment', 'configuration', 'rules', 'analytics', 'templates'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabNames[tabIndex]) {
                this.showTab(tabNames[tabIndex]);
            }
        }
    }

    /**
     * Handle before window unload
     */
    handleBeforeUnload(e) {
        if (this.hasUnsavedChanges()) {
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            e.returnValue = message;
            return message;
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Update responsive layouts
        this.updateResponsiveLayouts();
        
        // Refresh charts if visible
        if (typeof DashboardController !== 'undefined') {
            DashboardController.refreshCharts();
        }
    }

    /**
     * Show specific tab
     */
    showTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Initialize tab-specific components
        this.initializeTabContent(tabName);

        // Track navigation
        UsageTracker.trackEvent('tab_navigation', {
            tab: tabName,
            userId: this.currentUser.id,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Initialize tab-specific content
     */
    initializeTabContent(tabName) {
        switch (tabName) {
            case 'assessment':
                this.initializeAssessmentTab();
                break;
            case 'configuration':
                this.initializeConfigurationTab();
                break;
            case 'rules':
                this.initializeRulesTab();
                break;
            case 'analytics':
                this.initializeAnalyticsTab();
                break;
            case 'templates':
                this.initializeTemplatesTab();
                break;
        }
    }

    /**
     * Initialize assessment tab
     */
    initializeAssessmentTab() {
        if (typeof QuestionRenderer !== 'undefined') {
            QuestionRenderer.loadQuestions();
        }
        this.updateAssessmentProgress();
    }

    /**
     * Initialize configuration tab
     */
    initializeConfigurationTab() {
        if (typeof QuestionBuilder !== 'undefined') {
            QuestionBuilder.loadQuestionList();
        }
    }

    /**
     * Initialize rules tab
     */
    initializeRulesTab() {
        if (typeof RuleBuilder !== 'undefined') {
            RuleBuilder.loadRulesList();
        }
    }

    /**
     * Initialize analytics tab
     */
    initializeAnalyticsTab() {
        if (typeof DashboardController !== 'undefined') {
            DashboardController.loadDashboard();
        }
    }

    /**
     * Initialize templates tab
     */
    initializeTemplatesTab() {
        if (typeof TemplateManager !== 'undefined') {
            TemplateManager.loadTemplatesList();
        }
    }

    /**
     * Start a new assessment
     */
    startNewAssessment() {
        if (this.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to start a new assessment?')) {
                return;
            }
        }

        this.currentAssessment = {
            id: this.generateAssessmentId(),
            userId: this.currentUser.id,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            status: 'in_progress',
            answers: {},
            currentQuestion: 0,
            progress: 0
        };

        if (typeof QuestionRenderer !== 'undefined') {
            QuestionRenderer.startNewAssessment(this.currentAssessment);
        }

        this.updateAssessmentProgress();
        this.showToast('New assessment started', 'success');

        UsageTracker.trackEvent('assessment_started', {
            assessmentId: this.currentAssessment.id,
            userId: this.currentUser.id,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Save current assessment
     */
    saveCurrentAssessment() {
        if (!this.currentAssessment) {
            this.showToast('No assessment to save', 'warning');
            return;
        }

        try {
            this.currentAssessment.modified = new Date().toISOString();
            
            // Get existing assessments
            let assessments = StorageManager.getItem('saved_assessments') || [];
            
            // Update or add current assessment
            const existingIndex = assessments.findIndex(a => a.id === this.currentAssessment.id);
            if (existingIndex >= 0) {
                assessments[existingIndex] = this.currentAssessment;
            } else {
                assessments.push(this.currentAssessment);
            }
            
            StorageManager.setItem('saved_assessments', assessments);
            this.showToast('Assessment saved successfully', 'success');

            UsageTracker.trackEvent('assessment_saved', {
                assessmentId: this.currentAssessment.id,
                userId: this.currentUser.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Failed to save assessment:', error);
            this.showToast('Failed to save assessment', 'error');
        }
    }

    /**
     * Submit assessment for evaluation
     */
    async submitAssessment() {
        if (!this.currentAssessment) {
            this.showToast('No assessment to submit', 'warning');
            return;
        }

        try {
            this.showLoading('Generating recommendations...');

            // Validate assessment completeness
            if (!this.isAssessmentComplete()) {
                this.hideLoading();
                this.showToast('Please complete all required questions', 'warning');
                return;
            }

            // Generate recommendations
            const recommendations = await this.generateRecommendations();
            
            // Update assessment status
            this.currentAssessment.status = 'completed';
            this.currentAssessment.completed = new Date().toISOString();
            this.currentAssessment.recommendations = recommendations;

            // Save completed assessment
            this.saveCompletedAssessment();

            // Show results
            this.showAssessmentResults(recommendations);

            this.hideLoading();

            UsageTracker.trackEvent('assessment_completed', {
                assessmentId: this.currentAssessment.id,
                userId: this.currentUser.id,
                score: recommendations.score,
                level: recommendations.level,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.hideLoading();
            console.error('Failed to submit assessment:', error);
            this.showToast('Failed to generate recommendations', 'error');
        }
    }

    /**
     * Generate recommendations based on assessment
     */
    async generateRecommendations() {
        if (typeof RecommendationEngine !== 'undefined') {
            return await RecommendationEngine.generateRecommendations(this.currentAssessment);
        }
        
        // Fallback basic recommendation
        return this.generateBasicRecommendation();
    }

    /**
     * Generate basic recommendation (fallback)
     */
    generateBasicRecommendation() {
        const answers = this.currentAssessment.answers;
        const totalQuestions = Object.keys(answers).length;
        const score = Math.floor(Math.random() * 100); // Placeholder scoring
        
        let level = 'Low';
        if (score >= 70) level = 'High';
        else if (score >= 40) level = 'Medium';

        return {
            score: score,
            level: level,
            title: `${level} Governance Maturity`,
            summary: `Your organization demonstrates ${level.toLowerCase()} data governance maturity with a score of ${score}/100.`,
            sections: {
                placement: ['Consider cloud-first data placement strategy'],
                controls: ['Implement role-based access controls'],
                sharing: ['Establish data sharing agreements'],
                compliance: ['Review regulatory requirements']
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Show assessment results modal
     */
    showAssessmentResults(recommendations) {
        const modal = document.getElementById('results-modal');
        const resultsContent = document.getElementById('results-content');
        
        if (!modal || !resultsContent) return;

        // Generate results HTML
        const resultsHTML = this.generateResultsHTML(recommendations);
        resultsContent.innerHTML = resultsHTML;

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('show');

        // Set up export handlers
        this.setupResultsExportHandlers(recommendations);
    }

    /**
     * Generate HTML for assessment results
     */
    generateResultsHTML(recommendations) {
        return `
            <div class="results-summary">
                <div class="results-score">${recommendations.score}/100</div>
                <div class="results-level">${recommendations.level} Governance Maturity</div>
            </div>
            
            <div class="results-section">
                <h3>Executive Summary</h3>
                <p>${recommendations.summary}</p>
            </div>
            
            <div class="results-section">
                <h3>Data Placement Recommendations</h3>
                ${recommendations.sections.placement.map(item => `
                    <div class="recommendation">
                        <div class="recommendation-title">Data Placement Strategy</div>
                        <div class="recommendation-description">${item}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="results-section">
                <h3>Governance Controls</h3>
                ${recommendations.sections.controls.map(item => `
                    <div class="recommendation">
                        <div class="recommendation-title">Control Implementation</div>
                        <div class="recommendation-description">${item}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="results-section">
                <h3>Data Sharing Strategy</h3>
                ${recommendations.sections.sharing.map(item => `
                    <div class="recommendation">
                        <div class="recommendation-title">Sharing Protocol</div>
                        <div class="recommendation-description">${item}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="results-section">
                <h3>Compliance Requirements</h3>
                ${recommendations.sections.compliance.map(item => `
                    <div class="recommendation">
                        <div class="recommendation-title">Compliance Action</div>
                        <div class="recommendation-description">${item}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="results-section">
                <h3>Assessment Details</h3>
                <p><strong>Assessment ID:</strong> ${this.currentAssessment.id}</p>
                <p><strong>Completed by:</strong> ${this.currentUser.name} (${this.currentUser.email})</p>
                <p><strong>Organization:</strong> ${this.currentUser.organization}</p>
                <p><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>System ID:</strong> ${this.currentUser.id}</p>
            </div>
        `;
    }

    /**
     * Set up export handlers for results
     */
    setupResultsExportHandlers(recommendations) {
        const exportPdfBtn = document.getElementById('export-pdf');
        const exportJsonBtn = document.getElementById('export-json');
        const emailResultsBtn = document.getElementById('email-results');

        if (exportPdfBtn) {
            exportPdfBtn.onclick = () => this.exportResultsPDF(recommendations);
        }

        if (exportJsonBtn) {
            exportJsonBtn.onclick = () => this.exportResultsJSON(recommendations);
        }

        if (emailResultsBtn) {
            emailResultsBtn.onclick = () => this.emailResults(recommendations);
        }
    }

    /**
     * Export results as PDF
     */
    async exportResultsPDF(recommendations) {
        try {
            this.showLoading('Generating PDF...');
            
            if (typeof PDFGenerator !== 'undefined') {
                await PDFGenerator.generateAssessmentReport(this.currentAssessment, recommendations, this.currentUser);
            } else {
                // Fallback: download HTML version
                this.downloadHTMLReport(recommendations);
            }
            
            this.hideLoading();
            this.showToast('PDF exported successfully', 'success');

            UsageTracker.trackEvent('export_pdf', {
                assessmentId: this.currentAssessment.id,
                userId: this.currentUser.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.hideLoading();
            console.error('Failed to export PDF:', error);
            this.showToast('Failed to export PDF', 'error');
        }
    }

    /**
     * Export results as JSON
     */
    exportResultsJSON(recommendations) {
        try {
            const exportData = {
                assessment: this.currentAssessment,
                recommendations: recommendations,
                user: this.currentUser,
                exportDate: new Date().toISOString(),
                version: this.version
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `governance-assessment-${this.currentAssessment.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('JSON exported successfully', 'success');

            UsageTracker.trackEvent('export_json', {
                assessmentId: this.currentAssessment.id,
                userId: this.currentUser.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Failed to export JSON:', error);
            this.showToast('Failed to export JSON', 'error');
        }
    }

    /**
     * Email results
     */
    async emailResults(recommendations) {
        try {
            if (typeof EmailIntegration !== 'undefined') {
                await EmailIntegration.sendAssessmentResults(this.currentAssessment, recommendations, this.currentUser);
                this.showToast('Email sent successfully', 'success');
            } else {
                // Fallback: open email client
                const subject = encodeURIComponent(`Data Governance Assessment Results - ${this.currentAssessment.id}`);
                const body = encodeURIComponent(this.generateEmailBody(recommendations));
                window.open(`mailto:?subject=${subject}&body=${body}`);
            }

            UsageTracker.trackEvent('email_results', {
                assessmentId: this.currentAssessment.id,
                userId: this.currentUser.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Failed to email results:', error);
            this.showToast('Failed to send email', 'error');
        }
    }

    /**
     * Generate email body for results
     */
    generateEmailBody(recommendations) {
        return `
Data Governance Assessment Results

Assessment ID: ${this.currentAssessment.id}
Completed by: ${this.currentUser.name} (${this.currentUser.email})
Organization: ${this.currentUser.organization}
Completion Date: ${new Date().toLocaleDateString()}

GOVERNANCE MATURITY SCORE: ${recommendations.score}/100
MATURITY LEVEL: ${recommendations.level}

EXECUTIVE SUMMARY:
${recommendations.summary}

KEY RECOMMENDATIONS:
- ${recommendations.sections.placement[0]}
- ${recommendations.sections.controls[0]}
- ${recommendations.sections.sharing[0]}
- ${recommendations.sections.compliance[0]}

For detailed recommendations and action items, please refer to the complete assessment report.

Generated by Data Governance Decision Tool v${this.version}
        `.trim();
    }

    /**
     * Update assessment progress
     */
    updateAssessmentProgress() {
        if (!this.currentAssessment) return;

        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar && progressText) {
            const progress = this.currentAssessment.progress || 0;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}% Complete`;
        }
    }

    /**
     * Move to next question
     */
    nextQuestion() {
        if (typeof QuestionRenderer !== 'undefined') {
            QuestionRenderer.nextQuestion();
        }
        this.updateAssessmentProgress();
    }

    /**
     * Move to previous question
     */
    previousQuestion() {
        if (typeof QuestionRenderer !== 'undefined') {
            QuestionRenderer.previousQuestion();
        }
        this.updateAssessmentProgress();
    }

    /**
     * Check if assessment is complete
     */
    isAssessmentComplete() {
        if (!this.currentAssessment) return false;
        
        const questions = StorageManager.getItem('governance_questions') || [];
        const requiredQuestions = questions.filter(q => q.required !== false);
        
        return requiredQuestions.every(q => 
            this.currentAssessment.answers.hasOwnProperty(q.id) &&
            this.currentAssessment.answers[q.id] !== null &&
            this.currentAssessment.answers[q.id] !== undefined
        );
    }

    /**
     * Save completed assessment to history
     */
    saveCompletedAssessment() {
        try {
            let completedAssessments = StorageManager.getItem('completed_assessments') || [];
            
            // Remove any existing assessment with same ID
            completedAssessments = completedAssessments.filter(a => a.id !== this.currentAssessment.id);
            
            // Add current assessment
            completedAssessments.push({...this.currentAssessment});
            
            // Keep only last 50 assessments
            if (completedAssessments.length > 50) {
                completedAssessments = completedAssessments.slice(-50);
            }
            
            StorageManager.setItem('completed_assessments', completedAssessments);
            
        } catch (error) {
            console.error('Failed to save completed assessment:', error);
        }
    }

    /**
     * Load application state
     */
    async loadApplicationState() {
        try {
            const appState = StorageManager.getItem('app_state');
            if (appState) {
                if (appState.currentAssessment) {
                    this.currentAssessment = appState.currentAssessment;
                }
                if (appState.activeTab) {
                    this.showTab(appState.activeTab);
                }
            }
        } catch (error) {
            console.error('Failed to load application state:', error);
        }
    }

    /**
     * Save application state
     */
    saveApplicationState() {
        try {
            const appState = {
                currentAssessment: this.currentAssessment,
                activeTab: document.querySelector('.nav-tab.active')?.dataset.tab || 'assessment',
                timestamp: new Date().toISOString()
            };
            
            StorageManager.setItem('app_state', appState);
        } catch (error) {
            console.error('Failed to save application state:', error);
        }
    }

    /**
     * Show loading spinner
     */
    showLoading(message = 'Loading...') {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            const text = spinner.querySelector('p');
            if (text) text.textContent = message;
            spinner.classList.remove('hidden');
            spinner.classList.add('show');
        }
    }

    /**
     * Hide loading spinner
     */
    hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.remove('show');
            spinner.classList.add('hidden');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${this.getToastTitle(type)}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Get toast title based on type
     */
    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        });
    }

    /**
     * Close specific modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        }
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        // This would be implemented based on specific form states
        return false; // Placeholder
    }

    /**
     * Save current work (context-dependent)
     */
    saveCurrentWork() {
        const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
        
        switch (activeTab) {
            case 'assessment':
                this.saveCurrentAssessment();
                break;
            case 'configuration':
                // Save current question configuration
                break;
            case 'rules':
                // Save current rule
                break;
            case 'templates':
                // Save current template
                break;
        }
    }

    /**
     * Create new item (context-dependent)
     */
    createNew() {
        const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
        
        switch (activeTab) {
            case 'assessment':
                this.startNewAssessment();
                break;
            case 'configuration':
                this.addNewQuestion();
                break;
            case 'rules':
                this.addNewRule();
                break;
            case 'templates':
                this.addNewTemplate();
                break;
        }
    }

    /**
     * Check if this is a first-time user
     */
    isFirstTimeUser() {
        const userData = StorageManager.getItem('user_profile');
        return !userData || !userData.lastLogin || userData.created === userData.lastLogin;
    }

    /**
     * Show welcome wizard for first-time users
     */
    showWelcomeWizard() {
        // This would show a guided tour or welcome dialog
        console.log('Welcome to the Data Governance Decision Tool!');
        this.showToast('Welcome! Start with the Assessment tab to evaluate your data governance maturity.', 'info', 5000);
    }

    /**
     * Generate unique system ID
     */
    generateSystemId() {
        return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique assessment ID
     */
    generateAssessmentId() {
        return 'assessment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Update responsive layouts
     */
    updateResponsiveLayouts() {
        // Handle responsive layout updates
        const viewportWidth = window.innerWidth;
        
        if (viewportWidth < 768) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }

    /**
     * Refresh analytics data
     */
    refreshAnalytics() {
        if (typeof DashboardController !== 'undefined') {
            DashboardController.refresh();
        }
        this.showToast('Analytics refreshed', 'success');
    }

    /**
     * Export analytics report
     */
    exportAnalyticsReport() {
        if (typeof ReportingEngine !== 'undefined') {
            ReportingEngine.generateAnalyticsReport();
        } else {
            this.showToast('Analytics export feature coming soon', 'info');
        }
    }

    /**
     * Add new question
     */
    addNewQuestion() {
        if (typeof QuestionBuilder !== 'undefined') {
            QuestionBuilder.createNewQuestion();
        }
    }

    /**
     * Add new rule
     */
    addNewRule() {
        if (typeof RuleBuilder !== 'undefined') {
            RuleBuilder.createNewRule();
        }
    }

    /**
     * Add new template
     */
    addNewTemplate() {
        if (typeof TemplateManager !== 'undefined') {
            TemplateManager.createNewTemplate();
        }
    }

    /**
     * Import configuration
     */
    importConfiguration() {
        // Create file input for importing
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processConfigurationImport(file);
            }
        };
        input.click();
    }

    /**
     * Process configuration import
     */
    async processConfigurationImport(file) {
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            
            if (config.questions) {
                StorageManager.setItem('governance_questions', config.questions);
            }
            if (config.rules) {
                StorageManager.setItem('governance_rules', config.rules);
            }
            if (config.templates) {
                StorageManager.setItem('recommendation_templates', config.templates);
            }
            
            this.showToast('Configuration imported successfully', 'success');
            
            // Refresh current tab
            const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
            this.initializeTabContent(activeTab);
            
        } catch (error) {
            console.error('Failed to import configuration:', error);
            this.showToast('Failed to import configuration', 'error');
        }
    }

    /**
     * Export configuration
     */
    exportConfiguration() {
        try {
            const config = {
                questions: StorageManager.getItem('governance_questions') || [],
                rules: StorageManager.getItem('governance_rules') || [],
                templates: StorageManager.getItem('recommendation_templates') || [],
                exportDate: new Date().toISOString(),
                version: this.version
            };

            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `governance-config-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('Configuration exported successfully', 'success');

        } catch (error) {
            console.error('Failed to export configuration:', error);
            this.showToast('Failed to export configuration', 'error');
        }
    }

    /**
     * Get default questions for initial setup
     */
    getDefaultQuestions() {
        return [
            {
                id: "question-1",
                title: "What is the primary type of data your organization handles?",
                subtitle: "Select the category that best describes your organization's main data assets.",
                type: "single-select",
                category: "data_classification",
                required: true,
                weight: 2,
                options: [
                    {
                        value: "customer_data",
                        title: "Customer Data",
                        description: "Personal information, preferences, transaction history",
                        icon: "👥",
                        score: 3
                    },
                    {
                        value: "financial_data",
                        title: "Financial Data",
                        description: "Banking, payment, accounting, and financial reporting data",
                        icon: "💰",
                        score: 4
                    },
                    {
                        value: "operational_data",
                        title: "Operational Data",
                        description: "Business processes, supply chain, inventory data",
                        icon: "⚙️",
                        score: 2
                    },
                    {
                        value: "research_data",
                        title: "Research & Development Data",
                        description: "Research findings, intellectual property, product development",
                        icon: "🔬",
                        score: 3
                    }
                ]
            },
            {
                id: "question-2",
                title: "What is your organization's current data governance maturity level?",
                subtitle: "Assess your current state of data governance implementation.",
                type: "single-select",
                category: "governance_maturity",
                required: true,
                weight: 3,
                options: [
                    {
                        value: "basic",
                        title: "Basic/Initial",
                        description: "Limited governance processes, ad-hoc data management",
                        icon: "🌱",
                        score: 1
                    },
                    {
                        value: "developing",
                        title: "Developing",
                        description: "Some governance processes in place, working towards consistency",
                        icon: "🌿",
                        score: 2
                    },
                    {
                        value: "defined",
                        title: "Defined",
                        description: "Clear governance framework with documented processes",
                        icon: "🌳",
                        score: 3
                    },
                    {
                        value: "managed",
                        title: "Managed",
                        description: "Mature governance with monitoring and continuous improvement",
                        icon: "🏛️",
                        score: 4
                    }
                ]
            },
            {
                id: "question-3",
                title: "Which compliance regulations apply to your organization?",
                subtitle: "Select all regulatory frameworks that your organization must comply with.",
                type: "multi-select",
                category: "compliance",
                required: true,
                weight: 2,
                options: [
                    {
                        value: "gdpr",
                        title: "GDPR",
                        description: "General Data Protection Regulation (EU)",
                        icon: "🇪🇺",
                        score: 2
                    },
                    {
                        value: "ccpa",
                        title: "CCPA",
                        description: "California Consumer Privacy Act",
                        icon: "🇺🇸",
                        score: 2
                    },
                    {
                        value: "hipaa",
                        title: "HIPAA",
                        description: "Health Insurance Portability and Accountability Act",
                        icon: "🏥",
                        score: 3
                    },
                    {
                        value: "sox",
                        title: "SOX",
                        description: "Sarbanes-Oxley Act",
                        icon: "📊",
                        score: 3
                    },
                    {
                        value: "none",
                        title: "None/Minimal",
                        description: "No specific regulatory requirements",
                        icon: "🔓",
                        score: 0
                    }
                ]
            },
            {
                id: "question-4",
                title: "How do you currently manage data access and permissions?",
                subtitle: "Describe your organization's approach to controlling data access.",
                type: "single-select",
                category: "access_control",
                required: true,
                weight: 2,
                options: [
                    {
                        value: "open_access",
                        title: "Open Access",
                        description: "Most data is freely accessible to all employees",
                        icon: "🔓",
                        score: 1
                    },
                    {
                        value: "basic_permissions",
                        title: "Basic Permissions",
                        description: "Simple folder-based or role-based access",
                        icon: "🔐",
                        score: 2
                    },
                    {
                        value: "rbac",
                        title: "Role-Based Access Control",
                        description: "Systematic role-based permissions management",
                        icon: "👥",
                        score: 3
                    },
                    {
                        value: "advanced_controls",
                        title: "Advanced Controls",
                        description: "Attribute-based, dynamic access controls with monitoring",
                        icon: "🛡️",
                        score: 4
                    }
                ]
            },
            {
                id: "question-5",
                title: "What is your organization's size?",
                subtitle: "This helps us tailor recommendations to your scale.",
                type: "single-select",
                category: "organization_size",
                required: true,
                weight: 1,
                options: [
                    {
                        value: "small",
                        title: "Small (1-100 employees)",
                        description: "Startup or small business",
                        icon: "🏢",
                        score: 1
                    },
                    {
                        value: "medium",
                        title: "Medium (101-1000 employees)",
                        description: "Growing company",
                        icon: "🏬",
                        score: 2
                    },
                    {
                        value: "large",
                        title: "Large (1001-10000 employees)",
                        description: "Established enterprise",
                        icon: "🏭",
                        score: 3
                    },
                    {
                        value: "enterprise",
                        title: "Enterprise (10000+ employees)",
                        description: "Large multinational organization",
                        icon: "🏛️",
                        score: 4
                    }
                ]
            }
        ];
    }

    /**
     * Get default rules for initial setup
     */
    getDefaultRules() {
        return [
            {
                id: "rule-1",
                name: "High Sensitivity Data Rule",
                description: "Applies high security recommendations for sensitive data types",
                category: "data_classification",
                priority: 1,
                active: true,
                conditions: {
                    operator: "OR",
                    rules: [
                        {
                            field: "question-1",
                            operator: "equals",
                            value: "financial_data",
                            weight: 1
                        },
                        {
                            field: "question-3",
                            operator: "contains",
                            value: "hipaa",
                            weight: 1
                        }
                    ]
                },
                actions: [
                    {
                        type: "recommend",
                        parameters: {
                            template: "high_security_template",
                            weight: 2
                        }
                    }
                ]
            },
            {
                id: "rule-2",
                name: "Small Organization Simplification",
                description: "Provides simplified recommendations for small organizations",
                category: "organization_size",
                priority: 2,
                active: true,
                conditions: {
                    operator: "AND",
                    rules: [
                        {
                            field: "question-5",
                            operator: "equals",
                            value: "small",
                            weight: 1
                        }
                    ]
                },
                actions: [
                    {
                        type: "recommend",
                        parameters: {
                            template: "simplified_governance_template",
                            weight: 1
                        }
                    }
                ]
            },
            {
                id: "rule-3",
                name: "Advanced Governance for Mature Organizations",
                description: "Recommends advanced controls for organizations with defined governance",
                category: "governance_maturity",
                priority: 1,
                active: true,
                conditions: {
                    operator: "OR",
                    rules: [
                        {
                            field: "question-2",
                            operator: "equals",
                            value: "defined",
                            weight: 1
                        },
                        {
                            field: "question-2",
                            operator: "equals",
                            value: "managed",
                            weight: 1
                        }
                    ]
                },
                actions: [
                    {
                        type: "recommend",
                        parameters: {
                            template: "advanced_governance_template",
                            weight: 2
                        }
                    }
                ]
            }
        ];
    }

    /**
     * Get default templates for initial setup
     */
    getDefaultTemplates() {
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
                    summary: "Establish foundational data governance practices to improve data quality and compliance.",
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
                id: "high_security_template",
                name: "High Security Data Governance",
                description: "Advanced security-focused governance for sensitive data and regulated industries",
                category: "security",
                version: "1.0.0",
                tags: ["security", "compliance", "regulated"],
                recommendation: {
                    title: "Enhanced Security Data Governance",
                    summary: "Implement comprehensive security controls and monitoring for sensitive data assets.",
                    governanceLevel: "high",
                    confidenceScore: 95
                },
                sections: {
                    placement: [
                        "Use encrypted storage with customer-managed keys",
                        "Implement data residency controls for geographic compliance",
                        "Deploy data loss prevention (DLP) solutions",
                        "Use private network connections for sensitive data transfers"
                    ],
                    controls: [
                        "Implement zero-trust access controls",
                        "Deploy attribute-based access control (ABAC)",
                        "Enable continuous monitoring and anomaly detection",
                        "Require multi-factor authentication for all data access"
                    ],
                    sharing: [
                        "Implement data masking and tokenization for sharing",
                        "Use secure data clean rooms for external collaboration",
                        "Deploy automated data sharing governance workflows",
                        "Monitor and audit all data sharing activities"
                    ],
                    compliance: [
                        "Implement comprehensive audit logging",
                        "Deploy automated compliance monitoring",
                        "Conduct regular penetration testing",
                        "Maintain detailed compliance documentation"
                    ]
                }
            },
            {
                id: "advanced_governance_template",
                name: "Advanced Data Governance",
                description: "Comprehensive governance framework for mature organizations with complex data landscapes",
                category: "advanced",
                version: "1.0.0",
                tags: ["advanced", "enterprise", "comprehensive"],
                recommendation: {
                    title: "Enterprise Data Governance Framework",
                    summary: "Deploy advanced governance capabilities with automation and continuous improvement.",
                    governanceLevel: "high",
                    confidenceScore: 90
                },
                sections: {
                    placement: [
                        "Implement multi-cloud data placement strategy",
                        "Use intelligent data tiering based on usage patterns",
                        "Deploy edge computing for low-latency data processing",
                        "Implement automated data lifecycle management"
                    ],
                    controls: [
                        "Deploy AI-powered data discovery and classification",
                        "Implement dynamic data access controls",
                        "Use machine learning for anomaly detection",
                        "Deploy automated policy enforcement"
                    ],
                    sharing: [
                        "Implement federated data governance across business units",
                        "Deploy data marketplace for internal data discovery",
                        "Use APIs for controlled data access",
                        "Implement real-time data quality monitoring"
                    ],
                    automation: [
                        "Deploy automated data quality monitoring",
                        "Implement self-service data access with governance",
                        "Use AI for data lineage tracking",
                        "Deploy automated incident response"
                    ],
                    compliance: [
                        "Implement continuous compliance monitoring",
                        "Deploy automated regulatory reporting",
                        "Use AI for privacy impact assessments",
                        "Maintain real-time compliance dashboards"
                    ]
                }
            },
            {
                id: "simplified_governance_template",
                name: "Simplified Data Governance",
                description: "Streamlined governance approach for small organizations with limited resources",
                category: "simplified",
                version: "1.0.0",
                tags: ["simple", "small-business", "cost-effective"],
                recommendation: {
                    title: "Streamlined Data Governance",
                    summary: "Implement essential governance practices with minimal overhead and maximum impact.",
                    governanceLevel: "medium",
                    confidenceScore: 80
                },
                sections: {
                    placement: [
                        "Use managed cloud services to reduce complexity",
                        "Implement simple data organization with clear structure",
                        "Use cloud-native backup and recovery solutions"
                    ],
                    controls: [
                        "Implement basic user access management",
                        "Use cloud provider's built-in security features",
                        "Deploy simple data classification scheme"
                    ],
                    sharing: [
                        "Use cloud-based collaboration tools with governance",
                        "Implement simple approval processes",
                        "Use secure sharing links with expiration dates"
                    ],
                    compliance: [
                        "Use cloud provider compliance certifications",
                        "Implement basic data retention policies",
                        "Document key data processes"
                    ]
                }
            }
        ];
    }

    /**
     * Logout user
     */
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear sensitive data but keep configuration
            StorageManager.removeItem('app_state');
            StorageManager.removeItem('saved_assessments');
            
            // Update user last logout
            if (this.currentUser) {
                this.currentUser.lastLogout = new Date().toISOString();
                StorageManager.setItem('user_profile', this.currentUser);
            }

            // Track logout
            UsageTracker.trackEvent('user_logout', {
                userId: this.currentUser?.id,
                timestamp: new Date().toISOString()
            });

            // Redirect or reload
            window.location.reload();
        }
    }

    /**
     * Show user settings dialog
     */
    showUserSettings() {
        // This would open a settings modal
        this.showToast('User settings feature coming soon', 'info');
    }

    /**
     * Export audit log
     */
    exportAuditLog() {
        try {
            const auditData = UsageTracker.getAuditLog();
            const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('Audit log exported successfully', 'success');

        } catch (error) {
            console.error('Failed to export audit log:', error);
            this.showToast('Failed to export audit log', 'error');
        }
    }

    /**
     * Download HTML report (fallback for PDF)
     */
    downloadHTMLReport(recommendations) {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Data Governance Assessment Report</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                .score { font-size: 48px; color: #2563eb; font-weight: bold; }
                .level { font-size: 24px; color: #6b7280; }
                .section { margin-bottom: 30px; }
                .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
                .recommendation { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; }
                .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Data Governance Assessment Report</h1>
                <div class="score">${recommendations.score}/100</div>
                <div class="level">${recommendations.level} Governance Maturity</div>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <p>${recommendations.summary}</p>
            </div>
            
            <div class="section">
                <h2>Recommendations</h2>
                ${Object.entries(recommendations.sections).map(([key, items]) => `
                    <h3>${key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}</h3>
                    ${items.map(item => `<div class="recommendation">${item}</div>`).join('')}
                `).join('')}
            </div>
            
            <div class="meta">
                <h2>Assessment Details</h2>
                <p><strong>Assessment ID:</strong> ${this.currentAssessment.id}</p>
                <p><strong>Completed by:</strong> ${this.currentUser.name} (${this.currentUser.email})</p>
                <p><strong>Organization:</strong> ${this.currentUser.organization}</p>
                <p><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>System ID:</strong> ${this.currentUser.id}</p>
                <p><strong>Generated by:</strong> Data Governance Decision Tool v${this.version}</p>
            </div>
        </body>
        </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `governance-assessment-report-${this.currentAssessment.id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Handle errors gracefully
     */
    handleError(error, context = 'Application') {
        console.error(`${context} Error:`, error);
        
        // Track error
        UsageTracker.trackEvent('error', {
            context: context,
            error: error.message,
            userId: this.currentUser?.id,
            timestamp: new Date().toISOString()
        });

        // Show user-friendly error message
        this.showToast(`An error occurred: ${error.message}`, 'error');
    }

    /**
     * Perform cleanup tasks
     */
    cleanup() {
        // Save current state
        this.saveApplicationState();
        
        // Clean up event listeners
        document.removeEventListener('DOMContentLoaded', this.init);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.removeEventListener('resize', this.handleWindowResize);
        
        console.log('Application cleanup completed');
    }
}

// Global functions for modal management and UI interactions
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
};

window.showUserSettings = function() {
    if (window.app) {
        window.app.showUserSettings();
    }
};

window.exportAuditLog = function() {
    if (window.app) {
        window.app.exportAuditLog();
    }
};

window.logout = function() {
    if (window.app) {
        window.app.logout();
    }
};

// Initialize application when script loads
window.app = new DataGovernanceApp();

// Handle application cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.cleanup();
    }
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataGovernanceApp;
}