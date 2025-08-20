// js/ui/question-renderer.js - Dynamic Question Rendering

/**
 * Question Renderer for Data Governance Decision Tool
 * Handles dynamic rendering and interaction with assessment questions
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class QuestionRenderer {
    static currentQuestionIndex = 0;
    static questions = [];
    static answers = {};
    static assessment = null;
    static container = null;
    static isInitialized = false;

    /**
     * Initialize question renderer
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.container = document.getElementById('question-container');
        if (!this.container) {
            console.error('Question container not found');
            return;
        }

        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Question Renderer initialized');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        // Listen for state changes
        if (typeof StateManager !== 'undefined') {
            StateManager.subscribe('assessment.currentQuestion', (questionIndex) => {
                this.currentQuestionIndex = questionIndex;
                this.renderCurrentQuestion();
            });

            StateManager.subscribe('assessment.answers', (answers) => {
                this.answers = answers;
                this.updateProgress();
            });

            StateManager.subscribe('config.questions', (questions) => {
                this.questions = questions;
                this.renderCurrentQuestion();
            });
        }

        // Listen for events
        if (typeof EventBus !== 'undefined') {
            EventBus.on('question.next', () => this.nextQuestion());
            EventBus.on('question.previous', () => this.previousQuestion());
            EventBus.on('question.answer', (data) => this.handleAnswer(data.questionId, data.answer));
        }

        // Handle form submission
        const form = document.getElementById('assessment-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitCurrentQuestion();
            });
        }
    }

    /**
     * Load questions and start assessment
     */
    static loadQuestions() {
        if (typeof StateManager !== 'undefined') {
            this.questions = StateManager.getState('config.questions') || [];
            this.answers = StateManager.getState('assessment.answers') || {};
            this.assessment = StateManager.getState('assessment.current');
        } else {
            // Fallback to storage
            this.questions = StorageManager?.getItem('governance_questions') || [];
        }

        this.currentQuestionIndex = 0;
        this.renderCurrentQuestion();
        this.updateProgress();
        this.updateNavigation();
    }

    /**
     * Start new assessment
     */
    static startNewAssessment(assessment) {
        this.assessment = assessment;
        this.answers = {};
        this.currentQuestionIndex = 0;
        
        this.loadQuestions();
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('assessment.start', {
                assessmentId: assessment.id,
                totalQuestions: this.questions.length
            });
        }
    }

    /**
     * Render current question
     */
    static renderCurrentQuestion() {
        if (!this.container || !this.questions.length) {
            this.renderEmptyState();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        if (!question) {
            this.renderCompletionState();
            return;
        }

        // Check if question should be shown based on conditions
        if (!this.shouldShowQuestion(question)) {
            // Skip to next question
            this.nextQuestion();
            return;
        }

        const questionHTML = this.generateQuestionHTML(question);
        this.container.innerHTML = questionHTML;

        // Setup question-specific event listeners
        this.setupQuestionEventListeners(question);

        // Restore previous answer if exists
        this.restoreAnswer(question);

        // Focus management
        this.focusQuestion();

        // Track question view
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('analytics.page.view', {
                page: `question-${question.id}`,
                questionIndex: this.currentQuestionIndex,
                questionType: question.type
            });
        }
    }

    /**
     * Generate HTML for a question
     */
    static generateQuestionHTML(question) {
        const questionNumber = this.currentQuestionIndex + 1;
        const totalQuestions = this.questions.length;
        const isRequired = question.required !== false;

        let html = `
            <div class="question" data-question-id="${question.id}" data-question-type="${question.type}">
                <div class="question-header">
                    <div class="question-number">Question ${questionNumber} of ${totalQuestions}</div>
                    ${isRequired ? '<span class="required-indicator">*</span>' : ''}
                </div>
                
                <h3 class="question-title">${this.escapeHTML(question.title)}</h3>
                
                ${question.subtitle ? `
                    <p class="question-subtitle">${this.escapeHTML(question.subtitle)}</p>
                ` : ''}
                
                <div class="question-input">
                    ${this.generateInputHTML(question)}
                </div>
                
                ${question.helpText ? `
                    <div class="question-help">
                        <button type="button" class="help-toggle" aria-expanded="false">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                            </svg>
                            Help
                        </button>
                        <div class="help-content hidden">
                            ${this.escapeHTML(question.helpText)}
                        </div>
                    </div>
                ` : ''}
                
                <div class="question-validation-error hidden"></div>
            </div>
        `;

        return html;
    }

    /**
     * Generate input HTML based on question type
     */
    static generateInputHTML(question) {
        switch (question.type) {
            case 'single-select':
                return this.generateSingleSelectHTML(question);
            case 'multi-select':
                return this.generateMultiSelectHTML(question);
            case 'text-input':
                return this.generateTextInputHTML(question);
            case 'number-input':
                return this.generateNumberInputHTML(question);
            case 'date-input':
                const dateInput = questionElement.querySelector('input[type="date"]');
                return dateInput && dateInput.value ? dateInput.value : null;
                
            default:
                return null;
        }
    }

    /**
     * Set answer for a question
     */
    static setAnswer(questionId, answer) {
        this.answers[questionId] = answer;
        
        // Update state manager
        if (typeof StateManager !== 'undefined') {
            StateManager.setAssessmentAnswer(questionId, answer);
        }
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('question.answer', {
                questionId,
                answer,
                timestamp: new Date().toISOString()
            });
        }
        
        // Update progress
        this.updateProgress();
    }

    /**
     * Restore previous answer for a question
     */
    static restoreAnswer(question) {
        const answer = this.answers[question.id];
        if (answer === undefined || answer === null) return;

        const questionElement = this.container.querySelector(`[data-question-id="${question.id}"]`);
        if (!questionElement) return;

        switch (question.type) {
            case 'single-select':
            case 'rating-scale':
                const radioInput = questionElement.querySelector(`input[value="${answer}"]`);
                if (radioInput) {
                    radioInput.checked = true;
                    radioInput.closest('.option')?.classList.add('selected');
                }
                break;
                
            case 'multi-select':
                if (Array.isArray(answer)) {
                    answer.forEach(value => {
                        const checkboxInput = questionElement.querySelector(`input[value="${value}"]`);
                        if (checkboxInput) {
                            checkboxInput.checked = true;
                            checkboxInput.closest('.option')?.classList.add('selected');
                        }
                    });
                }
                break;
                
            case 'text-input':
                const textInput = questionElement.querySelector('textarea, input[type="text"]');
                if (textInput) {
                    textInput.value = answer;
                    // Update character count
                    const currentCount = questionElement.querySelector('.current-count');
                    if (currentCount) {
                        currentCount.textContent = answer.length;
                    }
                }
                break;
                
            case 'number-input':
                const numberInput = questionElement.querySelector('input[type="number"]');
                if (numberInput) {
                    numberInput.value = answer;
                }
                break;
                
            case 'date-input':
                const dateInput = questionElement.querySelector('input[type="date"]');
                if (dateInput) {
                    dateInput.value = answer;
                }
                break;
        }
    }

    /**
     * Validate current question
     */
    static validateQuestion(question) {
        const answer = this.answers[question.id];
        const validation = this.validateAnswer(question, answer);
        
        if (!validation.isValid) {
            this.showValidationError(question.id, validation.errors);
            return false;
        }
        
        this.clearValidationError(question.id);
        return true;
    }

    /**
     * Validate answer against question rules
     */
    static validateAnswer(question, answer) {
        const result = { isValid: true, errors: [] };
        
        // Check if required
        if (question.required !== false) {
            if (answer === null || answer === undefined || answer === '') {
                result.isValid = false;
                result.errors.push('This field is required');
                return result;
            }
            
            if (Array.isArray(answer) && answer.length === 0) {
                result.isValid = false;
                result.errors.push('Please select at least one option');
                return result;
            }
        }
        
        // Type-specific validation
        switch (question.type) {
            case 'multi-select':
                if (Array.isArray(answer)) {
                    const minSelections = question.minSelections || 0;
                    const maxSelections = question.maxSelections || question.options?.length || 999;
                    
                    if (answer.length < minSelections) {
                        result.isValid = false;
                        result.errors.push(`Please select at least ${minSelections} options`);
                    }
                    
                    if (answer.length > maxSelections) {
                        result.isValid = false;
                        result.errors.push(`Please select no more than ${maxSelections} options`);
                    }
                }
                break;
                
            case 'text-input':
                if (typeof answer === 'string') {
                    const minLength = question.minLength || 0;
                    const maxLength = question.maxLength || 500;
                    
                    if (answer.length < minLength) {
                        result.isValid = false;
                        result.errors.push(`Minimum length is ${minLength} characters`);
                    }
                    
                    if (answer.length > maxLength) {
                        result.isValid = false;
                        result.errors.push(`Maximum length is ${maxLength} characters`);
                    }
                    
                    if (question.pattern) {
                        const regex = new RegExp(question.pattern);
                        if (!regex.test(answer)) {
                            result.isValid = false;
                            result.errors.push('Please enter a valid format');
                        }
                    }
                }
                break;
                
            case 'number-input':
                if (typeof answer === 'number') {
                    if (question.min !== undefined && answer < question.min) {
                        result.isValid = false;
                        result.errors.push(`Minimum value is ${question.min}`);
                    }
                    
                    if (question.max !== undefined && answer > question.max) {
                        result.isValid = false;
                        result.errors.push(`Maximum value is ${question.max}`);
                    }
                }
                break;
                
            case 'date-input':
                if (answer) {
                    const date = new Date(answer);
                    
                    if (question.minDate) {
                        const minDate = new Date(question.minDate);
                        if (date < minDate) {
                            result.isValid = false;
                            result.errors.push(`Date must be after ${minDate.toLocaleDateString()}`);
                        }
                    }
                    
                    if (question.maxDate) {
                        const maxDate = new Date(question.maxDate);
                        if (date > maxDate) {
                            result.isValid = false;
                            result.errors.push(`Date must be before ${maxDate.toLocaleDateString()}`);
                        }
                    }
                }
                break;
        }
        
        return result;
    }

    /**
     * Show validation error
     */
    static showValidationError(questionId, errors) {
        const questionElement = this.container.querySelector(`[data-question-id="${questionId}"]`);
        if (!questionElement) return;

        const errorContainer = questionElement.querySelector('.question-validation-error');
        if (errorContainer) {
            errorContainer.innerHTML = errors.map(error => 
                `<div class="error-message">${this.escapeHTML(error)}</div>`
            ).join('');
            errorContainer.classList.remove('hidden');
        }

        // Add error class to question
        questionElement.classList.add('has-error');
    }

    /**
     * Clear validation error
     */
    static clearValidationError(questionId) {
        const questionElement = this.container.querySelector(`[data-question-id="${questionId}"]`);
        if (!questionElement) return;

        const errorContainer = questionElement.querySelector('.question-validation-error');
        if (errorContainer) {
            errorContainer.classList.add('hidden');
            errorContainer.innerHTML = '';
        }

        questionElement.classList.remove('has-error');
    }

    /**
     * Check if question should be shown based on conditions
     */
    static shouldShowQuestion(question) {
        if (!question.conditions) return true;

        const { showWhen, hideWhen } = question.conditions;

        // Check show conditions
        if (showWhen && showWhen.length > 0) {
            const shouldShow = showWhen.some(condition => 
                this.evaluateCondition(condition)
            );
            if (!shouldShow) return false;
        }

        // Check hide conditions
        if (hideWhen && hideWhen.length > 0) {
            const shouldHide = hideWhen.some(condition => 
                this.evaluateCondition(condition)
            );
            if (shouldHide) return false;
        }

        return true;
    }

    /**
     * Evaluate a single condition
     */
    static evaluateCondition(condition) {
        const { questionId, operator, value } = condition;
        const answer = this.answers[questionId];

        switch (operator) {
            case 'equals':
                return answer === value;
            case 'not_equals':
                return answer !== value;
            case 'contains':
                return Array.isArray(answer) ? answer.includes(value) : false;
            case 'not_contains':
                return Array.isArray(answer) ? !answer.includes(value) : true;
            case 'is_empty':
                return !answer || answer === '' || (Array.isArray(answer) && answer.length === 0);
            case 'is_not_empty':
                return answer && answer !== '' && (!Array.isArray(answer) || answer.length > 0);
            default:
                return false;
        }
    }

    /**
     * Navigate to next question
     */
    static nextQuestion() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        
        // Validate current question before proceeding
        if (currentQuestion && !this.validateQuestion(currentQuestion)) {
            return;
        }

        // Find next visible question
        let nextIndex = this.currentQuestionIndex + 1;
        while (nextIndex < this.questions.length) {
            const nextQuestion = this.questions[nextIndex];
            if (this.shouldShowQuestion(nextQuestion)) {
                break;
            }
            nextIndex++;
        }

        if (nextIndex < this.questions.length) {
            this.currentQuestionIndex = nextIndex;
            
            if (typeof StateManager !== 'undefined') {
                StateManager.setState('assessment.currentQuestion', nextIndex);
            }
            
            this.renderCurrentQuestion();
            this.updateNavigation();
            this.updateProgress();
        } else {
            // Reached the end
            this.completeAssessment();
        }
    }

    /**
     * Navigate to previous question
     */
    static previousQuestion() {
        // Find previous visible question
        let prevIndex = this.currentQuestionIndex - 1;
        while (prevIndex >= 0) {
            const prevQuestion = this.questions[prevIndex];
            if (this.shouldShowQuestion(prevQuestion)) {
                break;
            }
            prevIndex--;
        }

        if (prevIndex >= 0) {
            this.currentQuestionIndex = prevIndex;
            
            if (typeof StateManager !== 'undefined') {
                StateManager.setState('assessment.currentQuestion', prevIndex);
            }
            
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }

    /**
     * Submit current question
     */
    static submitCurrentQuestion() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        if (!currentQuestion) return;

        if (this.validateQuestion(currentQuestion)) {
            this.nextQuestion();
        }
    }

    /**
     * Complete assessment
     */
    static completeAssessment() {
        // Validate all answered questions
        const validationErrors = [];
        
        for (const question of this.questions) {
            if (this.shouldShowQuestion(question)) {
                const validation = this.validateAnswer(question, this.answers[question.id]);
                if (!validation.isValid) {
                    validationErrors.push({
                        questionId: question.id,
                        questionTitle: question.title,
                        errors: validation.errors
                    });
                }
            }
        }

        if (validationErrors.length > 0) {
            this.showCompletionErrors(validationErrors);
            return;
        }

        // Assessment is complete
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('assessment.complete', {
                assessmentId: this.assessment?.id,
                answers: this.answers,
                totalQuestions: this.questions.length,
                answeredQuestions: Object.keys(this.answers).length
            });
        }

        this.renderCompletionState();
    }

    /**
     * Show completion errors
     */
    static showCompletionErrors(errors) {
        let html = `
            <div class="completion-errors">
                <h3>Please complete the following questions:</h3>
                <ul>
        `;
        
        errors.forEach(error => {
            html += `<li><strong>${this.escapeHTML(error.questionTitle)}</strong>: ${error.errors.join(', ')}</li>`;
        });
        
        html += `
                </ul>
                <button type="button" class="btn btn-primary" onclick="QuestionRenderer.goToFirstError()">
                    Review Questions
                </button>
            </div>
        `;
        
        this.container.innerHTML = html;
    }

    /**
     * Go to first question with error
     */
    static goToFirstError() {
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions[i];
            if (this.shouldShowQuestion(question)) {
                const validation = this.validateAnswer(question, this.answers[question.id]);
                if (!validation.isValid) {
                    this.currentQuestionIndex = i;
                    
                    if (typeof StateManager !== 'undefined') {
                        StateManager.setState('assessment.currentQuestion', i);
                    }
                    
                    this.renderCurrentQuestion();
                    this.updateNavigation();
                    return;
                }
            }
        }
    }

    /**
     * Update progress indicator
     */
    static updateProgress() {
        const totalQuestions = this.questions.filter(q => this.shouldShowQuestion(q)).length;
        const answeredQuestions = Object.keys(this.answers).length;
        const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

        // Update progress bar
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}% Complete`;
        }

        // Update state
        if (typeof StateManager !== 'undefined') {
            StateManager.updateAssessmentProgress(progress);
        }
    }

    /**
     * Update navigation buttons
     */
    static updateNavigation() {
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');
        const submitBtn = document.getElementById('submit-assessment');

        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }

        const isLastQuestion = this.currentQuestionIndex >= this.questions.length - 1;
        
        if (nextBtn && submitBtn) {
            if (isLastQuestion) {
                nextBtn.classList.add('hidden');
                submitBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.remove('hidden');
                submitBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Render empty state
     */
    static renderEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No Questions Available</h3>
                <p>Please add questions in the Configuration tab to start an assessment.</p>
                <button type="button" class="btn btn-primary" onclick="StateManager.setCurrentTab('configuration')">
                    Go to Configuration
                </button>
            </div>
        `;
    }

    /**
     * Render completion state
     */
    static renderCompletionState() {
        this.container.innerHTML = `
            <div class="completion-state">
                <div class="completion-icon">✅</div>
                <h3>Assessment Complete!</h3>
                <p>Thank you for completing the data governance assessment. Your responses have been recorded.</p>
                <div class="completion-actions">
                    <button type="button" class="btn btn-primary" onclick="QuestionRenderer.generateResults()">
                        View Results
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="QuestionRenderer.startNewAssessment()">
                        Start New Assessment
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generate and show results
     */
    static generateResults() {
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('assessment.generate-results', {
                assessmentId: this.assessment?.id,
                answers: this.answers
            });
        }
    }

    /**
     * Focus management
     */
    static focusQuestion() {
        // Focus the first input in the question
        const firstInput = this.container.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Utility: Escape HTML
     */
    static escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Export assessment data
     */
    static exportData() {
        return {
            assessment: this.assessment,
            questions: this.questions,
            answers: this.answers,
            currentQuestionIndex: this.currentQuestionIndex,
            progress: this.calculateProgress(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import assessment data
     */
    static importData(data) {
        if (data.assessment) this.assessment = data.assessment;
        if (data.questions) this.questions = data.questions;
        if (data.answers) this.answers = data.answers;
        if (data.currentQuestionIndex !== undefined) {
            this.currentQuestionIndex = data.currentQuestionIndex;
        }

        this.renderCurrentQuestion();
        this.updateProgress();
        this.updateNavigation();
    }

    /**
     * Calculate progress
     */
    static calculateProgress() {
        const visibleQuestions = this.questions.filter(q => this.shouldShowQuestion(q));
        const answeredQuestions = Object.keys(this.answers).length;
        return visibleQuestions.length > 0 ? (answeredQuestions / visibleQuestions.length) * 100 : 0;
    }

    /**
     * Reset renderer
     */
    static reset() {
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.answers = {};
        this.assessment = null;
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Generate single select question HTML
     */
    static generateSingleSelectHTML(question) {
        if (!question.options || !question.options.length) {
            return '<p class="error">No options provided for this question</p>';
        }

        let html = '<div class="question-options single-select">';
        
        question.options.forEach((option, index) => {
            const optionId = `${question.id}-option-${index}`;
            html += `
                <div class="option" data-value="${this.escapeHTML(option.value)}">
                    <input type="radio" 
                           id="${optionId}" 
                           name="${question.id}" 
                           value="${this.escapeHTML(option.value)}"
                           class="option-input">
                    <label for="${optionId}" class="option-label">
                        ${option.icon ? `<span class="option-icon">${option.icon}</span>` : ''}
                        <div class="option-content">
                            <div class="option-title">${this.escapeHTML(option.title)}</div>
                            ${option.description ? `
                                <div class="option-description">${this.escapeHTML(option.description)}</div>
                            ` : ''}
                        </div>
                    </label>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Generate multi select question HTML
     */
    static generateMultiSelectHTML(question) {
        if (!question.options || !question.options.length) {
            return '<p class="error">No options provided for this question</p>';
        }

        const minSelections = question.minSelections || 0;
        const maxSelections = question.maxSelections || question.options.length;

        let html = `
            <div class="question-options multi-select" 
                 data-min-selections="${minSelections}" 
                 data-max-selections="${maxSelections}">
        `;
        
        if (minSelections > 0 || maxSelections < question.options.length) {
            html += `
                <div class="selection-info">
                    ${minSelections > 0 ? `Select at least ${minSelections}` : 'Select'}
                    ${maxSelections < question.options.length ? ` up to ${maxSelections}` : ''}
                    ${minSelections > 0 && maxSelections < question.options.length ? ' options' : ''}
                </div>
            `;
        }
        
        question.options.forEach((option, index) => {
            const optionId = `${question.id}-option-${index}`;
            html += `
                <div class="option" data-value="${this.escapeHTML(option.value)}">
                    <input type="checkbox" 
                           id="${optionId}" 
                           name="${question.id}" 
                           value="${this.escapeHTML(option.value)}"
                           class="option-input">
                    <label for="${optionId}" class="option-label">
                        ${option.icon ? `<span class="option-icon">${option.icon}</span>` : ''}
                        <div class="option-content">
                            <div class="option-title">${this.escapeHTML(option.title)}</div>
                            ${option.description ? `
                                <div class="option-description">${this.escapeHTML(option.description)}</div>
                            ` : ''}
                        </div>
                    </label>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Generate text input HTML
     */
    static generateTextInputHTML(question) {
        const placeholder = question.placeholder || '';
        const maxLength = question.maxLength || 500;
        const pattern = question.pattern || '';

        return `
            <div class="text-input-container">
                <textarea 
                    id="${question.id}" 
                    name="${question.id}"
                    placeholder="${this.escapeHTML(placeholder)}"
                    maxlength="${maxLength}"
                    ${pattern ? `pattern="${this.escapeHTML(pattern)}"` : ''}
                    class="form-textarea"
                    rows="4"></textarea>
                <div class="character-count">
                    <span class="current-count">0</span>/<span class="max-count">${maxLength}</span>
                </div>
            </div>
        `;
    }

    /**
     * Generate number input HTML
     */
    static generateNumberInputHTML(question) {
        const min = question.min !== undefined ? question.min : '';
        const max = question.max !== undefined ? question.max : '';
        const step = question.step || '1';
        const unit = question.unit || '';

        return `
            <div class="number-input-container">
                <input 
                    type="number" 
                    id="${question.id}" 
                    name="${question.id}"
                    ${min !== '' ? `min="${min}"` : ''}
                    ${max !== '' ? `max="${max}"` : ''}
                    step="${step}"
                    class="form-input"
                    placeholder="Enter a number">
                ${unit ? `<span class="input-unit">${this.escapeHTML(unit)}</span>` : ''}
            </div>
        `;
    }

    /**
     * Generate date input HTML
     */
    static generateDateInputHTML(question) {
        const minDate = question.minDate || '';
        const maxDate = question.maxDate || '';

        return `
            <div class="date-input-container">
                <input 
                    type="date" 
                    id="${question.id}" 
                    name="${question.id}"
                    ${minDate ? `min="${minDate}"` : ''}
                    ${maxDate ? `max="${maxDate}"` : ''}
                    class="form-input">
            </div>
        `;
    }

    /**
     * Generate rating scale HTML
     */
    static generateRatingScaleHTML(question) {
        const scale = question.scale || 5;
        const labels = question.labels || [];
        
        let html = '<div class="rating-scale-container">';
        html += '<div class="rating-options">';
        
        for (let i = 1; i <= scale; i++) {
            const label = labels[i - 1] || i.toString();
            html += `
                <div class="rating-option">
                    <input type="radio" 
                           id="${question.id}-rating-${i}" 
                           name="${question.id}" 
                           value="${i}"
                           class="rating-input">
                    <label for="${question.id}-rating-${i}" class="rating-label">
                        <span class="rating-value">${i}</span>
                        <span class="rating-text">${this.escapeHTML(label)}</span>
                    </label>
                </div>
            `;
        }
        
        html += '</div>';
        
        if (question.scaleLabels) {
            html += `
                <div class="rating-scale-labels">
                    <span class="scale-label-start">${this.escapeHTML(question.scaleLabels.start || '')}</span>
                    <span class="scale-label-end">${this.escapeHTML(question.scaleLabels.end || '')}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Setup question-specific event listeners
     */
    static setupQuestionEventListeners(question) {
        const questionElement = this.container.querySelector('.question');
        if (!questionElement) return;

        // Handle help toggle
        const helpToggle = questionElement.querySelector('.help-toggle');
        if (helpToggle) {
            helpToggle.addEventListener('click', () => {
                const helpContent = questionElement.querySelector('.help-content');
                const isExpanded = helpToggle.getAttribute('aria-expanded') === 'true';
                
                helpToggle.setAttribute('aria-expanded', !isExpanded);
                helpContent.classList.toggle('hidden');
            });
        }

        // Handle input changes
        const inputs = questionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.handleInputChange(question, input);
            });

            input.addEventListener('input', () => {
                this.handleInputInput(question, input);
            });
        });

        // Handle option clicks
        const options = questionElement.querySelectorAll('.option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                if (e.target.type === 'radio' || e.target.type === 'checkbox') {
                    return; // Let the input handle it
                }
                
                const input = option.querySelector('input');
                if (input) {
                    if (input.type === 'radio') {
                        input.checked = true;
                    } else if (input.type === 'checkbox') {
                        input.checked = !input.checked;
                    }
                    
                    input.dispatchEvent(new Event('change'));
                }
            });
        });

        // Character count for text inputs
        const textarea = questionElement.querySelector('textarea');
        if (textarea) {
            const updateCharCount = () => {
                const currentCount = questionElement.querySelector('.current-count');
                if (currentCount) {
                    currentCount.textContent = textarea.value.length;
                }
            };
            
            textarea.addEventListener('input', updateCharCount);
            updateCharCount(); // Initial count
        }
    }

    /**
     * Handle input change events
     */
    static handleInputChange(question, input) {
        const answer = this.getAnswerFromInput(question, input);
        this.setAnswer(question.id, answer);
        
        // Validate the answer
        this.validateQuestion(question);
        
        // Auto-advance for single select questions (optional)
        if (question.type === 'single-select' && question.autoAdvance) {
            setTimeout(() => this.nextQuestion(), 500);
        }
    }

    /**
     * Handle input input events (real-time)
     */
    static handleInputInput(question, input) {
        // Real-time validation for text inputs
        if (input.type === 'text' || input.tagName === 'TEXTAREA') {
            this.clearValidationError(question.id);
        }
    }

    /**
     * Get answer from input elements
     */
    static getAnswerFromInput(question, changedInput = null) {
        const questionElement = this.container.querySelector(`[data-question-id="${question.id}"]`);
        if (!questionElement) return null;

        switch (question.type) {
            case 'single-select':
            case 'rating-scale':
                const radioInput = questionElement.querySelector('input[type="radio"]:checked');
                return radioInput ? radioInput.value : null;
                
            case 'multi-select':
                const checkboxInputs = questionElement.querySelectorAll('input[type="checkbox"]:checked');
                return Array.from(checkboxInputs).map(input => input.value);
                
            case 'text-input':
                const textInput = questionElement.querySelector('textarea, input[type="text"]');
                return textInput ? textInput.value.trim() : '';
                
            case 'number-input':
                const numberInput = questionElement.querySelector('input[type="number"]');
                return numberInput && numberInput.value ? Number(numberInput.value) : null;
                
            case 'date-input':
                const dateInput = questionElement.querySelector('input[type="date"]');
                return dateInput && dateInput.value ? dateInput.value : null;
            default:
                return null; // Unknown type
        }
    }
    /**
     * Set answer for a question
     */
    static setAnswer(questionId, answer) {
        this.answers[questionId] = answer;
        if (typeof StateManager !== 'undefined') {
            StateManager.setState(`assessment.answers.${questionId}`, answer);
        }
    }
    /**
     * Render current question
     */
    static renderCurrentQuestion() {
        if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= this.questions.length) {
            this.renderEmptyState();
            return;
        }  
        const question = this.questions[this.currentQuestionIndex];
        if (!question || !this.shouldShowQuestion(question)) {
            this.renderEmptyState();
            return;
        }
        this.container.innerHTML = `
            <div class="question" data-question-id="${question.id}">
                <h3 class="question-title">${this.escapeHTML(question.title)}</h3>
                ${question.description ? `<p class="question-description">${this.escapeHTML(question.description)}</p>` : ''}
                ${question.helpText ? `
                    <button type="button" class="help-toggle" aria-expanded="false">
                        Help
                    </button>
                    <div class="help-content hidden">
                        ${this.escapeHTML(question.helpText)}
                    </div>
                ` : ''}
                <div class="question-options">
                    ${this.generateQuestionHTML(question)}
                </div>
                <div class="question-validation-error hidden"></div>
            </div>
        `;
        this.setupQuestionEventListeners(question);
        this.focusQuestion();
        this.updateProgress();
        this.updateNavigation();
        if (typeof StateManager !== 'undefined') {
            StateManager.setState('assessment.currentQuestion', this.currentQuestionIndex);
        }
    }  
    /**
     * Validate a question's answer
     */
    static validateQuestion(question) {
        const answer = this.answers[question.id];
        const validation = this.validateAnswer(question, answer);
        if (!validation.isValid) {
            this.showValidationError(question.id, validation.errors);
        }
        else {
            this.clearValidationError(question.id);
        }
        return validation.isValid;
    }
    /**
     * Validate answer based on question type
     */
    static validateAnswer(question, answer) {
        const result = {
            isValid: true,
            errors: []
        };
        if (answer === undefined || answer === null || answer === '') {
            if (question.required) {
                result.isValid = false;
                result.errors.push('This question is required');
            }
            return result;
        }
        switch (question.type) {
            case 'single-select':
            case 'rating-scale':
                if (!answer) {
                    result.isValid = false;
                    result.errors.push('Please select an option');
                }
                break;
                
            case 'multi-select':
                if (Array.isArray(answer) && answer.length === 0) {
                    result.isValid = false;
                    result.errors.push('Please select at least one option');
                } else if (Array.isArray(answer)) {
                    const minSelections = question.minSelections || 0;
                    const maxSelections = question.maxSelections || answer.length;
                    
                    if (answer.length < minSelections) {
                        result.isValid = false;
                        result.errors.push(`Select at least ${minSelections} options`);
                    }
                    
                    if (answer.length > maxSelections) {
                        result.isValid = false;
                        result.errors.push(`Select up to ${maxSelections} options`);
                    }
                }
                break;
                
            case 'text-input':
                if (typeof answer === 'string') {
                    const minLength = question.minLength || 0;
                    const maxLength = question.maxLength || 500;

                    if (answer.length < minLength) {
                        result.isValid = false;
                        result.errors.push(`Minimum length is ${minLength} characters`);
                    }
                    if (answer.length > maxLength) {
                        result.isValid = false;
                        result.errors.push(`Maximum length is ${maxLength} characters`);
                    }
                    if (question.pattern && !new RegExp(question.pattern).test(answer)) {
                        result.isValid = false;
                        result.errors.push(`Input does not match required pattern: ${question.pattern}`);
                    }
                } else {
                    result.isValid = false;
                    result.errors.push('Invalid input type, expected a string');
                }
                break;
            case 'number-input':
                if (typeof answer === 'number') {
                    const min = question.min !== undefined ? question.min : -Infinity;
                    const max = question.max !== undefined ? question.max : Infinity;

                    if (answer < min) {
                        result.isValid = false;
                        result.errors.push(`Value must be at least ${min}`);
                    }
                    if (answer > max) {
                        result.isValid = false;
                        result.errors.push(`Value must not exceed ${max}`);
                    }
                }
                else {
                    result.isValid = false;
                    result.errors.push('Invalid input type, expected a number');
                }
                break;
            case 'date-input':
                if (typeof answer === 'string') {
                    const date = new Date(answer);
                    if (isNaN(date.getTime())) {
                        result.isValid = false;
                        result.errors.push('Invalid date format');
                    } else {
                        const minDate = question.minDate ? new Date(question.minDate) : null;
                        const maxDate = question.maxDate ? new Date(question.maxDate) : null;

                        if (minDate && date < minDate) {
                            result.isValid = false;
                            result.errors.push(`Date must be on or after ${minDate.toISOString().split('T')[0]}`);
                        }
                        if (maxDate && date > maxDate) {
                            result.isValid = false;
                            result.errors.push(`Date must be on or before ${maxDate.toISOString().split('T')[0]}`);
                        }
                    }
                }
                else {
                    result.isValid = false;
                    result.errors.push('Invalid input type, expected a date string');
                }
                break;
            default:
                result.isValid = false;
                result.errors.push(`Unknown question type: ${question.type}`);
                break;
        }
        return result;
    }
    /**
     * Show validation error for a question
     */
    static showValidationError(questionId, errors) {
        const questionElement = this.container.querySelector(`[data-question-id="${questionId}"]`);
        if (!questionElement) return;
        const errorElement = questionElement.querySelector('.question-validation-error');
        if (errorElement) {
            errorElement.classList.remove('hidden');
            errorElement.innerHTML = errors.map(error => `<p class="error">${this.escapeHTML(error)}</p>`).join('');
        }  
        const inputs = questionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.add('input-error');
            input.setAttribute('aria-invalid', 'true');
        });
    }
    /**
     * Clear validation error for a question
     */
    static clearValidationError(questionId) {
        const questionElement = this.container.querySelector(`[data-question-id="${questionId}"]`);
        if (!questionElement) return;
        const errorElement = questionElement.querySelector('.question-validation-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
            errorElement.innerHTML = '';
        }  
        const inputs = questionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.remove('input-error');
            input.removeAttribute('aria-invalid');
        });
    } 
    /**
     * Determine if a question should be shown based on conditions
     */
    static shouldShowQuestion(question) {
        if (!question.conditions || question.conditions.length === 0) {
            return true; // No conditions, always show
        }
        return question.conditions.every(condition => {
            const targetAnswer = this.answers[condition.questionId];
            switch (condition.operator) {
                case 'equals':
                    return targetAnswer === condition.value;
                case 'not-equals':
                    return targetAnswer !== condition.value;
                case 'in':
                    return Array.isArray(condition.value) && condition.value.includes(targetAnswer);
                case 'not-in':
                    return Array.isArray(condition.value) && !condition.value.includes(targetAnswer);
                case 'greater-than':
                    return typeof targetAnswer === 'number' && targetAnswer > condition.value;
                case 'less-than':
                    return typeof targetAnswer === 'number' && targetAnswer < condition.value;
                case 'contains':
                    return Array.isArray(targetAnswer) && targetAnswer.includes(condition.value);
                case 'not-contains':
                    return Array.isArray(targetAnswer) && !targetAnswer.includes(condition.value);
                default:
                    return false; // Unknown operator
            }
        });
    }  
    /**
     * Start a new assessment
     */
    static startNewAssessment() {
        this.currentQuestionIndex = 0;
        this.answers = {};
        if (typeof StateManager !== 'undefined') {
            StateManager.setState('assessment.answers', {});
            StateManager.setState('assessment.currentQuestion', 0);
        }
        this.renderCurrentQuestion();
        this.updateProgress();
        this.updateNavigation();
    }   
    /**
     * Navigate to the previous question
     */
    static prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }
    /**
     * Navigate to the next question
     */
    static nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }
    /**
     * Submit the assessment
     */
    static submitAssessment() {
        // Validate all questions before submission
        const errors = [];
        this.questions.forEach(question => {
            if (this.shouldShowQuestion(question)) {
                const isValid = this.validateQuestion(question);
                if (!isValid) {
                    errors.push({
                        questionTitle: question.title,
                        errors: this.validateAnswer(question, this.answers[question.id]).errors
                    });
                }
            }
        });
        if (errors.length > 0) {
            // Show first error
            this.goToFirstError();
            alert('Please correct the errors before submitting the assessment.');
            return;
        }
        // Emit event with answers
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('assessment.submitted', { assessmentId: this.assessment?.id, answers: this.answers });
        }
        this.renderCompletionState();
    }
    /**
     * Go to the first question with an error
     */
    static goToFirstError() {
        for (let i = 0; i < this.questions.length; i++) {   
            const question = this.questions[i];
            if (this.shouldShowQuestion(question)) {
                const validation = this.validateAnswer(question, this.answers[question.id]);
                if (!validation.isValid) {
                    this.currentQuestionIndex = i;
                    this.renderCurrentQuestion();
                    this.updateNavigation();
                    return;
                }
            }
        }
    }       
    /**
     * Update progress bar and text
     */
    static updateProgress() {
        const totalQuestions = this.questions.filter(q => this.shouldShowQuestion(q)).length;
        const answeredQuestions = Object.keys(this.answers).length;
        const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');  
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            progressFill.setAttribute('aria-valuenow', Math.round(progress).toString());
        }
        if (progressText) {
            progressText.textContent = `Progress: ${Math.round(progress)}% (${answeredQuestions} of ${totalQuestions} answered)`;
        }
    }
    /**
     * Update navigation button states
     */
    static updateNavigation() {
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');
        const submitBtn = document.getElementById('submit-assessment'); 
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
        const isLastQuestion = this.currentQuestionIndex === this.questions.length - 1;
        if (nextBtn && submitBtn) { 
            if (isLastQuestion) {
                nextBtn.classList.add('hidden');
                submitBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.remove('hidden');
                submitBtn.classList.add('hidden');
            }
        }
    }   
    /**
     * Render empty state when no questions are available
     */
    static renderEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>No questions available for this assessment.</p>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Render configuration state when no assessment is loaded
     */
    static renderConfigState() {
        this.container.innerHTML = `
            <div class="config-state">
                <p>Please load an assessment to begin.</p>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Render completion state after submission
     */
    static renderCompletionState() {
        this.container.innerHTML = `
            <div class="completion-state">
                <h3>Assessment Complete</h3>
                <p>Thank you for completing the assessment.</p>
                <div class="completion-actions">
                    <button type="button" class="btn btn-primary" onclick="QuestionRenderer.generateResults()">
                        View Results
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="QuestionRenderer.startNewAssessment()">
                        Start New Assessment
                    </button>
                </div>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Generate and display results summary
     */
    static generateResults() {
        let resultsHTML = '<div class="results-summary"><h3>Assessment Results</h3><ul>';
        this.questions.forEach(question => {        
            if (this.shouldShowQuestion(question)) {
                const answer = this.answers[question.id];
                let answerDisplay = '';
                if (answer === undefined || answer === null || answer === '') {
                    answerDisplay = '<em>No answer provided</em>';
                } else if (Array.isArray(answer)) {
                    answerDisplay = answer.length > 0 ? this.escapeHTML(answer.join(', ')) : '<em>No selections made</em>';
                } else {
                    answerDisplay = this.escapeHTML(answer.toString());
                }
                resultsHTML += `
                    <li>
                        <strong>${this.escapeHTML(question.title)}:</strong> ${answerDisplay}
                    </li>
                `;
            }
        });
        resultsHTML += '</ul></div>';
        this.container.innerHTML = resultsHTML + `
            <div class="results-actions">
                <button type="button" class="btn btn-secondary" onclick="QuestionRenderer.startNewAssessment()">
                    Start New Assessment
                </button>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Focus the current question for accessibility
     */
    static focusQuestion() {
        const questionElement = this.container.querySelector('.question');
        if (questionElement) {
            questionElement.setAttribute('tabindex', '-1');
            questionElement.focus();
        }
    }   
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        }           );
    }   
 
    
    /** AVN - Below Section */


    /**
     * Generate single select question HTML
     */
    static generateSingleSelectHTML(question) {
        if (!question.options || !question.options.length) {
            return '<p class="error">No options provided for this question</p>';
        }

        let html = '<div class="question-options single-select">';
        
        question.options.forEach((option, index) => {
            const optionId = `${question.id}-option-${index}`;
            html += `
                <div class="option" data-value="${this.escapeHTML(option.value)}">
                    <input type="radio" 
                           id="${optionId}" 
                           name="${question.id}" 
                           value="${this.escapeHTML(option.value)}"
                           class="option-input">
                    <label for="${optionId}" class="option-label">
                        ${option.icon ? `<span class="option-icon">${option.icon}</span>` : ''}
                        <div class="option-content">
                            <div class="option-title">${this.escapeHTML(option.title)}</div>
                            ${option.description ? `
                                <div class="option-description">${this.escapeHTML(option.description)}</div>
                            ` : ''}
                        </div>
                    </label>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Generate multi select question HTML
     */
    static generateMultiSelectHTML(question) {
        if (!question.options || !question.options.length) {
            return '<p class="error">No options provided for this question</p>';
        }

        const minSelections = question.minSelections || 0;
        const maxSelections = question.maxSelections || question.options.length;

        let html = `
            <div class="question-options multi-select" 
                 data-min-selections="${minSelections}" 
                 data-max-selections="${maxSelections}">
        `;
        
        if (minSelections > 0 || maxSelections < question.options.length) {
            html += `
                <div class="selection-info">
                    ${minSelections > 0 ? `Select at least ${minSelections}` : 'Select'}
                    ${maxSelections < question.options.length ? ` up to ${maxSelections}` : ''}
                    ${minSelections > 0 && maxSelections < question.options.length ? ' options' : ''}
                </div>
            `;
        }
        
        question.options.forEach((option, index) => {
            const optionId = `${question.id}-option-${index}`;
            html += `
                <div class="option" data-value="${this.escapeHTML(option.value)}">
                    <input type="checkbox" 
                           id="${optionId}" 
                           name="${question.id}" 
                           value="${this.escapeHTML(option.value)}"
                           class="option-input">
                    <label for="${optionId}" class="option-label">
                        ${option.icon ? `<span class="option-icon">${option.icon}</span>` : ''}
                        <div class="option-content">
                            <div class="option-title">${this.escapeHTML(option.title)}</div>
                            ${option.description ? `
                                <div class="option-description">${this.escapeHTML(option.description)}</div>
                            ` : ''}
                        </div>
                    </label>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Generate text input HTML
     */
    static generateTextInputHTML(question) {
        const placeholder = question.placeholder || '';
        const maxLength = question.maxLength || 500;
        const pattern = question.pattern || '';

        return `
            <div class="text-input-container">
                <textarea 
                    id="${question.id}" 
                    name="${question.id}"
                    placeholder="${this.escapeHTML(placeholder)}"
                    maxlength="${maxLength}"
                    ${pattern ? `pattern="${this.escapeHTML(pattern)}"` : ''}
                    class="form-textarea"
                    rows="4"></textarea>
                <div class="character-count">
                    <span class="current-count">0</span>/<span class="max-count">${maxLength}</span>
                </div>
            </div>
        `;
    }

    /**
     * Generate number input HTML
     */
    static generateNumberInputHTML(question) {
        const min = question.min !== undefined ? question.min : '';
        const max = question.max !== undefined ? question.max : '';
        const step = question.step || '1';
        const unit = question.unit || '';

        return `
            <div class="number-input-container">
                <input 
                    type="number" 
                    id="${question.id}" 
                    name="${question.id}"
                    ${min !== '' ? `min="${min}"` : ''}
                    ${max !== '' ? `max="${max}"` : ''}
                    step="${step}"
                    class="form-input"
                    placeholder="Enter a number">
                ${unit ? `<span class="input-unit">${this.escapeHTML(unit)}</span>` : ''}
            </div>
        `;
    }

    /**
     * Generate date input HTML
     */
    static generateDateInputHTML(question) {
        const minDate = question.minDate || '';
        const maxDate = question.maxDate || '';

        return `
            <div class="date-input-container">
                <input 
                    type="date" 
                    id="${question.id}" 
                    name="${question.id}"
                    ${minDate ? `min="${minDate}"` : ''}
                    ${maxDate ? `max="${maxDate}"` : ''}
                    class="form-input">
            </div>
        `;
    }

    /**
     * Generate rating scale HTML
     */
    static generateRatingScaleHTML(question) {
        const scale = question.scale || 5;
        const labels = question.labels || [];
        
        let html = '<div class="rating-scale-container">';
        html += '<div class="rating-options">';
        
        for (let i = 1; i <= scale; i++) {
            const label = labels[i - 1] || i.toString();
            html += `
                <div class="rating-option">
                    <input type="radio" 
                           id="${question.id}-rating-${i}" 
                           name="${question.id}" 
                           value="${i}"
                           class="rating-input">
                    <label for="${question.id}-rating-${i}" class="rating-label">
                        <span class="rating-value">${i}</span>
                        <span class="rating-text">${this.escapeHTML(label)}</span>
                    </label>
                </div>
            `;
        }
        
        html += '</div>';
        
        if (question.scaleLabels) {
            html += `
                <div class="rating-scale-labels">
                    <span class="scale-label-start">${this.escapeHTML(question.scaleLabels.start || '')}</span>
                    <span class="scale-label-end">${this.escapeHTML(question.scaleLabels.end || '')}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Setup question-specific event listeners
     */
    static setupQuestionEventListeners(question) {
        const questionElement = this.container.querySelector('.question');
        if (!questionElement) return;

        // Handle help toggle
        const helpToggle = questionElement.querySelector('.help-toggle');
        if (helpToggle) {
            helpToggle.addEventListener('click', () => {
                const helpContent = questionElement.querySelector('.help-content');
                const isExpanded = helpToggle.getAttribute('aria-expanded') === 'true';
                
                helpToggle.setAttribute('aria-expanded', !isExpanded);
                helpContent.classList.toggle('hidden');
            });
        }

        // Handle input changes
        const inputs = questionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.handleInputChange(question, input);
            });

            input.addEventListener('input', () => {
                this.handleInputInput(question, input);
            });
        });

        // Handle option clicks
        const options = questionElement.querySelectorAll('.option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                if (e.target.type === 'radio' || e.target.type === 'checkbox') {
                    return; // Let the input handle it
                }
                
                const input = option.querySelector('input');
                if (input) {
                    if (input.type === 'radio') {
                        input.checked = true;
                    } else if (input.type === 'checkbox') {
                        input.checked = !input.checked;
                    }
                    
                    input.dispatchEvent(new Event('change'));
                }
            });
        });

        // Character count for text inputs
        const textarea = questionElement.querySelector('textarea');
        if (textarea) {
            const updateCharCount = () => {
                const currentCount = questionElement.querySelector('.current-count');
                if (currentCount) {
                    currentCount.textContent = textarea.value.length;
                }
            };
            
            textarea.addEventListener('input', updateCharCount);
            updateCharCount(); // Initial count
        }
    }

    /**
     * Handle input change events
     */
    static handleInputChange(question, input) {
        const answer = this.getAnswerFromInput(question, input);
        this.setAnswer(question.id, answer);
        
        // Validate the answer
        this.validateQuestion(question);
        
        // Auto-advance for single select questions (optional)
        if (question.type === 'single-select' && question.autoAdvance) {
            setTimeout(() => this.nextQuestion(), 500);
        }
    }

    /**
     * Handle input input events (real-time)
     */
    static handleInputInput(question, input) {
        // Real-time validation for text inputs
        if (input.type === 'text' || input.tagName === 'TEXTAREA') {
            this.clearValidationError(question.id);
        }
    }

    /**
     * Get answer from input elements
     */
    static getAnswerFromInput(question, changedInput = null) {
        const questionElement = this.container.querySelector(`[data-question-id="${question.id}"]`);
        if (!questionElement) return null;

        switch (question.type) {
            case 'single-select':
            case 'rating-scale':
                const radioInput = questionElement.querySelector('input[type="radio"]:checked');
                return radioInput ? radioInput.value : null;
                
            case 'multi-select':
                const checkboxInputs = questionElement.querySelectorAll('input[type="checkbox"]:checked');
                return Array.from(checkboxInputs).map(input => input.value);
                
            case 'text-input':
                const textInput = questionElement.querySelector('textarea, input[type="text"]');
                return textInput ? textInput.value.trim() : '';
                
            case 'number-input':
                const numberInput = questionElement.querySelector('input[type="number"]');
                return numberInput && numberInput.value ? Number(numberInput.value) : null;
                
            case 'date-input':
                const dateInput = questionElement.querySelector('input[type="date"]');
                return dateInput && dateInput.value ? dateInput.value : null;
            default:
                return null; // Unknown type
        }
    }
    /**
     * Set answer for a question
     */
    static setAnswer(questionId, answer) {
        this.answers[questionId] = answer;
        if (typeof StateManager !== 'undefined') {
            StateManager.setState(`assessment.answers.${questionId}`, answer);
        }
    }
    /**
     * Render current question
     */
    static renderCurrentQuestion() {
        if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= this.questions.length) {
            this.renderEmptyState();
            return;
        }  
        const question = this.questions[this.currentQuestionIndex];
        if (!question || !this.shouldShowQuestion(question)) {
            this.renderEmptyState();
            return;
        }
        this.container.innerHTML = `
            <div class="question" data-question-id="${question.id}">
                <h3 class="question-title">${this.escapeHTML(question.title)}</h3>
                ${question.description ? `<p class="question-description">${this.escapeHTML(question.description)}</p>` : ''}
                ${question.helpText ? `
                    <button type="button" class="help-toggle" aria-expanded="false">
                        Help
                    </button>
                    <div class="help-content hidden">
                        ${this.escapeHTML(question.helpText)}
                    </div>
                ` : ''}
                <div class="question-options">
                    ${this.generateQuestionHTML(question)}
                </div>
                <div class="question-validation-error hidden"></div>
            </div>
        `;
        this.setupQuestionEventListeners(question);
        this.focusQuestion();
        this.updateProgress();
        this.updateNavigation();
        if (typeof StateManager !== 'undefined') {
            StateManager.setState('assessment.currentQuestion', this.currentQuestionIndex);
        }
    }  
    /**
     * Validate a question's answer
     */
    static validateQuestion(question) {
        const answer = this.answers[question.id];
        const validation = this.validateAnswer(question, answer);
        if (!validation.isValid) {
            this.showValidationError(question.id, validation.errors);
        }
        else {
            this.clearValidationError(question.id);
        }
        return validation.isValid;
    }
    /**
     * Validate answer based on question type
     */
    static validateAnswer(question, answer) {
        const result = {
            isValid: true,
            errors: []
        };
        if (answer === undefined || answer === null || answer === '') {
            if (question.required) {
                result.isValid = false;
                result.errors.push('This question is required');
            }
            return result;
        }
        switch (question.type) {
            case 'single-select':
            case 'rating-scale':
                if (!answer) {
                    result.isValid = false;
                    result.errors.push('Please select an option');
                }
                break;
                
            case 'multi-select':
                if (Array.isArray(answer) && answer.length === 0) {
                    result.isValid = false;
                    result.errors.push('Please select at least one option');
                } else if (Array.isArray(answer)) {
                    const minSelections = question.minSelections || 0;
                    const maxSelections = question.maxSelections || answer.length;
                    
                    if (answer.length < minSelections) {
                        result.isValid = false;
                        result.errors.push(`Select at least ${minSelections} options`);
                    }
                    
                    if (answer.length > maxSelections) {
                        result.isValid = false;
                        result.errors.push(`Select up to ${maxSelections} options`);
                    }
                }
                break;
                
            case 'text-input':
                if (typeof answer === 'string') {
                    const minLength = question.minLength || 0;
                    const maxLength = question.maxLength || 500;

                    if (answer.length < minLength) {
                        result.isValid = false;
                        result.errors.push(`Minimum length is ${minLength} characters`);
                    }
                    if (answer.length > maxLength) {
                        result.isValid = false;
                        result.errors.push(`Maximum length is ${maxLength} characters`);
                    }
                    if (question.pattern && !new RegExp(question.pattern).test(answer)) {
                        result.isValid = false;
                        result.errors.push(`Input does not match required pattern: ${question.pattern}`);
                    }
                } else {
                    result.isValid = false;
                    result.errors.push('Invalid input type, expected a string');
                }
                break;
            case 'number-input':
                if (typeof answer === 'number') {
                    const min = question.min !== undefined ? question.min : -Infinity;
                    const max = question.max !== undefined ? question.max : Infinity;

                    if (answer < min) {
                        result.isValid = false;
                        result.errors.push(`Value must be at least ${min}`);
                    }
                    if (answer > max) {
                        result.isValid = false;
                        result.errors.push(`Value must not exceed ${max}`);
                    }
                }
                else {
                    result.isValid = false;
                    result.errors.push('Invalid input type, expected a number');
                }
                break;
            case 'date-input':
                if (typeof answer === 'string') {
                    const date = new Date(answer);
                    if (isNaN(date.getTime())) {
                        result.isValid = false;
                        result.errors.push('Invalid date format');
                    } else {
                        const minDate = question.minDate ? new Date(question.minDate) : null;
                        const maxDate = question.maxDate ? new Date(question.maxDate) : null;

                        if (minDate && date < minDate) {
                            result.isValid = false;
                            result.errors.push(`Date must be on or after ${minDate.toISOString().split('T')[0]}`);
                        }
                        if (maxDate && date > maxDate) {
                            result.isValid = false;
                            result.errors.push(`Date must be on or before ${maxDate.toISOString().split('T')[0]}`);
                        }
                    }
                }
                else {
                    result.isValid = false;
                    result.errors.push('Invalid input type, expected a date string');
                }
                break;
            default:
                result.isValid = false;
                result.errors.push(`Unknown question type: ${question.type}`);
                break;
        }
        return result;
    }
    /**
     * Show validation error for a question
     */
    static showValidationError(questionId, errors) {
        const questionElement = this.container.querySelector(`[data-question-id="${questionId}"]`);
        if (!questionElement) return;
        const errorElement = questionElement.querySelector('.question-validation-error');
        if (errorElement) {
            errorElement.classList.remove('hidden');
            errorElement.innerHTML = errors.map(error => `<p class="error">${this.escapeHTML(error)}</p>`).join('');
        }  
        const inputs = questionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.add('input-error');
            input.setAttribute('aria-invalid', 'true');
        });
    }
    /**
     * Clear validation error for a question
     */
    static clearValidationError(questionId) {
        const questionElement = this.container.querySelector(`[data-question-id="${questionId}"]`);
        if (!questionElement) return;
        const errorElement = questionElement.querySelector('.question-validation-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
            errorElement.innerHTML = '';
        }  
        const inputs = questionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.remove('input-error');
            input.removeAttribute('aria-invalid');
        });
    } 
    /**
     * Determine if a question should be shown based on conditions
     */
    static shouldShowQuestion(question) {
        if (!question.conditions || question.conditions.length === 0) {
            return true; // No conditions, always show
        }
        return question.conditions.every(condition => {
            const targetAnswer = this.answers[condition.questionId];
            switch (condition.operator) {
                case 'equals':
                    return targetAnswer === condition.value;
                case 'not-equals':
                    return targetAnswer !== condition.value;
                case 'in':
                    return Array.isArray(condition.value) && condition.value.includes(targetAnswer);
                case 'not-in':
                    return Array.isArray(condition.value) && !condition.value.includes(targetAnswer);
                case 'greater-than':
                    return typeof targetAnswer === 'number' && targetAnswer > condition.value;
                case 'less-than':
                    return typeof targetAnswer === 'number' && targetAnswer < condition.value;
                case 'contains':
                    return Array.isArray(targetAnswer) && targetAnswer.includes(condition.value);
                case 'not-contains':
                    return Array.isArray(targetAnswer) && !targetAnswer.includes(condition.value);
                default:
                    return false; // Unknown operator
            }
        });
    }  
    /**
     * Start a new assessment
     */
    static startNewAssessment() {
        this.currentQuestionIndex = 0;
        this.answers = {};
        if (typeof StateManager !== 'undefined') {
            StateManager.setState('assessment.answers', {});
            StateManager.setState('assessment.currentQuestion', 0);
        }
        this.renderCurrentQuestion();
        this.updateProgress();
        this.updateNavigation();
    }   
    /**
     * Navigate to the previous question
     */
    static prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }
    /**
     * Navigate to the next question
     */
    static nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderCurrentQuestion();
            this.updateNavigation();
        }
    }
    /**
     * Submit the assessment
     */
    static submitAssessment() {
        // Validate all questions before submission
        const errors = [];
        this.questions.forEach(question => {
            if (this.shouldShowQuestion(question)) {
                const isValid = this.validateQuestion(question);
                if (!isValid) {
                    errors.push({
                        questionTitle: question.title,
                        errors: this.validateAnswer(question, this.answers[question.id]).errors
                    });
                }
            }
        });
        if (errors.length > 0) {
            // Show first error
            this.goToFirstError();
            alert('Please correct the errors before submitting the assessment.');
            return;
        }
        // Emit event with answers
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('assessment.submitted', { assessmentId: this.assessment?.id, answers: this.answers });
        }
        this.renderCompletionState();
    }
    /**
     * Go to the first question with an error
     */
    static goToFirstError() {
        for (let i = 0; i < this.questions.length; i++) {   
            const question = this.questions[i];
            if (this.shouldShowQuestion(question)) {
                const validation = this.validateAnswer(question, this.answers[question.id]);
                if (!validation.isValid) {
                    this.currentQuestionIndex = i;
                    this.renderCurrentQuestion();
                    this.updateNavigation();
                    return;
                }
            }
        }
    }       
    /**
     * Update progress bar and text
     */
    static updateProgress() {
        const totalQuestions = this.questions.filter(q => this.shouldShowQuestion(q)).length;
        const answeredQuestions = Object.keys(this.answers).length;
        const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');  
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            progressFill.setAttribute('aria-valuenow', Math.round(progress).toString());
        }
        if (progressText) {
            progressText.textContent = `Progress: ${Math.round(progress)}% (${answeredQuestions} of ${totalQuestions} answered)`;
        }
    }
    /**
     * Update navigation button states
     */
    static updateNavigation() {
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');
        const submitBtn = document.getElementById('submit-assessment'); 
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
        const isLastQuestion = this.currentQuestionIndex === this.questions.length - 1;
        if (nextBtn && submitBtn) { 
            if (isLastQuestion) {
                nextBtn.classList.add('hidden');
                submitBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.remove('hidden');
                submitBtn.classList.add('hidden');
            }
        }
    }   
    /**
     * Render empty state when no questions are available
     */
    static renderEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>No questions available for this assessment.</p>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Render configuration state when no assessment is loaded
     */
    static renderConfigState() {
        this.container.innerHTML = `
            <div class="config-state">
                <p>Please load an assessment to begin.</p>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Render completion state after submission
     */
    static renderCompletionState() {
        this.container.innerHTML = `
            <div class="completion-state">
                <h3>Assessment Complete</h3>
                <p>Thank you for completing the assessment.</p>
                <div class="completion-actions">
                    <button type="button" class="btn btn-primary" onclick="QuestionRenderer.generateResults()">
                        View Results
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="QuestionRenderer.startNewAssessment()">
                        Start New Assessment
                    </button>
                </div>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Generate and display results summary
     */
    static generateResults() {
        let resultsHTML = '<div class="results-summary"><h3>Assessment Results</h3><ul>';
        this.questions.forEach(question => {        
            if (this.shouldShowQuestion(question)) {
                const answer = this.answers[question.id];
                let answerDisplay = '';
                if (answer === undefined || answer === null || answer === '') {
                    answerDisplay = '<em>No answer provided</em>';
                } else if (Array.isArray(answer)) {
                    answerDisplay = answer.length > 0 ? this.escapeHTML(answer.join(', ')) : '<em>No selections made</em>';
                } else {
                    answerDisplay = this.escapeHTML(answer.toString());
                }
                resultsHTML += `
                    <li>
                        <strong>${this.escapeHTML(question.title)}:</strong> ${answerDisplay}
                    </li>
                `;
            }
        });
        resultsHTML += '</ul></div>';
        this.container.innerHTML = resultsHTML + `
            <div class="results-actions">
                <button type="button" class="btn btn-secondary" onclick="QuestionRenderer.startNewAssessment()">
                    Start New Assessment
                </button>
            </div>
        `;
        this.updateProgress();
        this.updateNavigation();
    }
    /**
     * Focus the current question for accessibility
     */
    static focusQuestion() {
        const questionElement = this.container.querySelector('.question');
        if (questionElement) {
            questionElement.setAttribute('tabindex', '-1');
            questionElement.focus();
        }
    }   
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        }           );
    }
    /**
     * Generate question HTML based on type
     */
    static generateQuestionHTML(question) {
        switch (question.type) {
            case 'single-select':
                return this.generateSingleSelectHTML(question);
            case 'multi-select':
                return this.generateMultiSelectHTML(question);
            case 'text-input':
                return this.generateTextInputHTML(question);
            case 'number-input':
                return this.generateNumberInputHTML(question);
            case 'date-input':
                return this.generateDateInputHTML(question);    
            case 'rating-scale':
                return this.generateRatingScaleHTML(question);
            default:
                return '<p class="error">Unknown question type</p>';
        }
    }
    /**
     * Main entry point to initialize the question renderer
     */
    static main(questions, containerId, assessment = null) {
        this.questions = questions || [];
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }
        this.assessment = assessment || null;
        this.currentQuestionIndex = 0;
        this.answers = {};
        if (typeof StateManager !== 'undefined') {
            StateManager.setState('assessment.questions', this.questions);
            StateManager.setState('assessment.containerId', containerId);
            StateManager.setState('assessment.assessment', this.assessment);
            StateManager.setState('assessment.currentQuestion', this.currentQuestionIndex);
            StateManager.setState('assessment.answers', this.answers); 
        }
        this.container.classList.add('question-renderer');
        this.container.innerHTML = ''; // Clear previous content
        if (this.questions.length === 0) {
            this.renderConfigState();
        }
        else {
            this.renderCurrentQuestion();
        }
        this.updateProgress();
        this.updateNavigation();
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('assessment.initialized', { assessmentId: this.assessment?.id, questions: this.questions });
        }
    }
}          

