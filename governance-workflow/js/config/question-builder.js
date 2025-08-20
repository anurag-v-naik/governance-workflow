// js/config/question-builder.js - Question Configuration Builder

/**
 * Question Builder for Data Governance Decision Tool
 * Visual question configuration and management interface
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class QuestionBuilder {
    static questions = [];
    static currentQuestion = null;
    static isInitialized = false;
    static isDirty = false;

    /**
     * Initialize question builder
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.loadQuestions();
        this.setupEventListeners();
        this.renderQuestionList();
        this.renderQuestionTypes();
        
        this.isInitialized = true;
        console.log('Question Builder initialized');
    }

    /**
     * Load questions from storage
     */
    static loadQuestions() {
        if (typeof StateManager !== 'undefined') {
            this.questions = StateManager.getState('config.questions') || [];
        } else {
            this.questions = StorageManager?.getItem('governance_questions') || [];
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        // Add question button
        const addQuestionBtn = document.getElementById('add-question');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', () => this.createNewQuestion());
        }

        // Import/Export buttons
        const importBtn = document.getElementById('import-config');
        const exportBtn = document.getElementById('export-config');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importConfiguration());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportConfiguration());
        }

        // Question type selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.question-type')) {
                const questionType = e.target.closest('.question-type');
                this.selectQuestionType(questionType.dataset.type);
            }
        });

        // Auto-save on changes
        document.addEventListener('input', (e) => {
            if (e.target.closest('.question-editor')) {
                this.markDirty();
                this.debouncedSave();
            }
        });

        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    /**
     * Render question types sidebar
     */
    static renderQuestionTypes() {
        const container = document.querySelector('.question-types');
        if (!container) return;

        const questionTypes = [
            { type: 'single-select', name: 'Single Select', icon: '⚪', description: 'Choose one option' },
            { type: 'multi-select', name: 'Multi Select', icon: '☑️', description: 'Choose multiple options' },
            { type: 'text-input', name: 'Text Input', icon: '📝', description: 'Free text entry' },
            { type: 'number-input', name: 'Number Input', icon: '🔢', description: 'Numeric value' },
            { type: 'date-input', name: 'Date Input', icon: '📅', description: 'Date selection' },
            { type: 'rating-scale', name: 'Rating Scale', icon: '⭐', description: 'Star or numeric rating' }
        ];

        container.innerHTML = questionTypes.map(type => `
            <div class="question-type" data-type="${type.type}">
                <div class="type-icon">${type.icon}</div>
                <div class="type-info">
                    <div class="type-name">${type.name}</div>
                    <div class="type-description">${type.description}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render question list
     */
    static renderQuestionList() {
        const container = document.getElementById('question-list');
        if (!container) return;

        if (this.questions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Questions Yet</h3>
                    <p>Create your first question by selecting a type from the sidebar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.questions.map((question, index) => `
            <div class="question-item ${this.currentQuestion?.id === question.id ? 'active' : ''}" 
                 data-question-id="${question.id}">
                <div class="question-item-header">
                    <div class="question-item-title">${this.escapeHTML(question.title)}</div>
                    <div class="question-item-type">${this.getTypeName(question.type)}</div>
                </div>
                <div class="question-item-description">
                    ${question.subtitle ? this.escapeHTML(question.subtitle) : 'No description'}
                </div>
                <div class="question-item-actions">
                    <button type="button" class="btn-icon" onclick="QuestionBuilder.editQuestion('${question.id}')" 
                            title="Edit question">
                        ✏️
                    </button>
                    <button type="button" class="btn-icon" onclick="QuestionBuilder.duplicateQuestion('${question.id}')" 
                            title="Duplicate question">
                        📋
                    </button>
                    <button type="button" class="btn-icon" onclick="QuestionBuilder.deleteQuestion('${question.id}')" 
                            title="Delete question">
                        🗑️
                    </button>
                    <button type="button" class="btn-icon drag-handle" title="Drag to reorder">
                        ⋮⋮
                    </button>
                </div>
            </div>
        `).join('');

        // Setup drag and drop for reordering
        this.setupDragAndDrop(container);

        // Setup click handlers
        container.querySelectorAll('.question-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.question-item-actions')) {
                    const questionId = item.dataset.questionId;
                    this.editQuestion(questionId);
                }
            });
        });
    }

    /**
     * Setup drag and drop for question reordering
     */
    static setupDragAndDrop(container) {
        let draggedElement = null;
        let draggedIndex = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.closest('.drag-handle')) {
                draggedElement = e.target.closest('.question-item');
                draggedIndex = Array.from(container.children).indexOf(draggedElement);
                draggedElement.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedElement);
            } else {
                container.insertBefore(draggedElement, afterElement);
            }
        });

        container.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                
                const newIndex = Array.from(container.children).indexOf(draggedElement);
                if (newIndex !== draggedIndex) {
                    this.reorderQuestion(draggedIndex, newIndex);
                }
                
                draggedElement = null;
                draggedIndex = null;
            }
        });

        // Make question items draggable
        container.querySelectorAll('.question-item').forEach(item => {
            item.setAttribute('draggable', 'true');
        });
    }

    /**
     * Get element after which to insert dragged item
     */
    static getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.question-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Reorder question in array
     */
    static reorderQuestion(fromIndex, toIndex) {
        const question = this.questions.splice(fromIndex, 1)[0];
        this.questions.splice(toIndex, 0, question);
        this.saveQuestions();
        this.markDirty();
    }

    /**
     * Create new question
     */
    static createNewQuestion(type = 'single-select') {
        const question = {
            id: this.generateQuestionId(),
            title: 'New Question',
            subtitle: '',
            type: type,
            category: 'general',
            required: true,
            weight: 1,
            options: type.includes('select') ? [
                { value: 'option1', title: 'Option 1', description: '', score: 1 },
                { value: 'option2', title: 'Option 2', description: '', score: 2 }
            ] : undefined,
            validation: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.questions.push(question);
        this.currentQuestion = question;
        this.renderQuestionList();
        this.renderQuestionEditor(question);
        this.markDirty();
        
        // Focus on title field
        setTimeout(() => {
            const titleField = document.getElementById('question-title');
            if (titleField) {
                titleField.select();
            }
        }, 100);
    }

    /**
     * Edit existing question
     */
    static editQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        this.currentQuestion = question;
        this.renderQuestionList(); // Update active state
        this.renderQuestionEditor(question);
    }

    /**
     * Duplicate question
     */
    static duplicateQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        const duplicatedQuestion = {
            ...JSON.parse(JSON.stringify(question)),
            id: this.generateQuestionId(),
            title: question.title + ' (Copy)',
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.questions.push(duplicatedQuestion);
        this.renderQuestionList();
        this.editQuestion(duplicatedQuestion.id);
        this.markDirty();
    }

    /**
     * Delete question
     */
    static deleteQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        if (confirm(`Are you sure you want to delete "${question.title}"?`)) {
            this.questions = this.questions.filter(q => q.id !== questionId);
            
            if (this.currentQuestion?.id === questionId) {
                this.currentQuestion = null;
                this.renderQuestionEditor(null);
            }
            
            this.renderQuestionList();
            this.markDirty();
        }
    }

    /**
     * Render question editor
     */
    static renderQuestionEditor(question) {
        const container = document.getElementById('question-editor');
        if (!container) return;

        if (!question) {
            container.innerHTML = `
                <div class="editor-placeholder">
                    <h3>Question Editor</h3>
                    <p>Select a question to edit or create a new one.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="question-editor-form">
                <h3>Edit Question</h3>
                
                <div class="form-group">
                    <label for="question-title" class="form-label">Question Title *</label>
                    <input type="text" id="question-title" class="form-input" 
                           value="${this.escapeHTML(question.title)}" required>
                </div>
                
                <div class="form-group">
                    <label for="question-subtitle" class="form-label">Subtitle</label>
                    <textarea id="question-subtitle" class="form-textarea" rows="2"
                              placeholder="Optional descriptive text">${this.escapeHTML(question.subtitle || '')}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="question-type" class="form-label">Question Type *</label>
                        <select id="question-type" class="form-select" required>
                            <option value="single-select" ${question.type === 'single-select' ? 'selected' : ''}>Single Select</option>
                            <option value="multi-select" ${question.type === 'multi-select' ? 'selected' : ''}>Multi Select</option>
                            <option value="text-input" ${question.type === 'text-input' ? 'selected' : ''}>Text Input</option>
                            <option value="number-input" ${question.type === 'number-input' ? 'selected' : ''}>Number Input</option>
                            <option value="date-input" ${question.type === 'date-input' ? 'selected' : ''}>Date Input</option>
                            <option value="rating-scale" ${question.type === 'rating-scale' ? 'selected' : ''}>Rating Scale</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="question-category" class="form-label">Category</label>
                        <input type="text" id="question-category" class="form-input" 
                               value="${this.escapeHTML(question.category || '')}" placeholder="e.g. Data Quality">
                    </div>
                    <div class="form-group">
                        <label for="question-required" class="form-label">Required</label>
                        <input type="checkbox" id="question-required" class="form-checkbox" 
                               ${question.required ? 'checked' : ''}>
                    </div>
                    <div class="form-group">
                        <label for="question-weight" class="form-label">Weight</label>
                        <input type="number" id="question-weight" class="form-input" 
                               value="${question.weight}" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label for="question-options" class="form-label">Options</label>
                        <button type="button" id="add-option" class="btn-secondary">Add Option</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="question-validation" class="form-label">Validation</label>
                    <textarea id="question-validation" class="form-textarea" rows="2"
                              placeholder="Optional validation rules">${this.escapeHTML(JSON.stringify(question.validation || {}, null, 2))}</textarea>
                </div> 
                <div class="form-actions">
                    <button type="button" id="save-question" class="btn-primary">Save Question</button>
                    <button type="button" id="cancel-edit" class="btn-secondary">Cancel</button>
                    <button type="button" id="delete-question" class="btn-danger">Delete Question</button>
                </div>
            </div>
        `;
        // Setup event listeners for editor
        this.setupQuestionEditorListeners(question);
    }
    /**
     * Setup event listeners for question editor
     */
    static setupQuestionEditorListeners(question) { 
        const titleField = document.getElementById('question-title');
        const subtitleField = document.getElementById('question-subtitle');
        const typeField = document.getElementById('question-type');
        const categoryField = document.getElementById('question-category');
        const requiredField = document.getElementById('question-required');
        const weightField = document.getElementById('question-weight');
        const validationField = document.getElementById('question-validation');
        const saveBtn = document.getElementById('save-question');
        const cancelBtn = document.getElementById('cancel-edit');
        const deleteBtn = document.getElementById('delete-question');
        const addOptionBtn = document.getElementById('add-option');

        // Save question
        saveBtn.addEventListener('click', () => {
            question.title = titleField.value.trim();
            question.subtitle = subtitleField.value.trim();
            question.type = typeField.value;
            question.category = categoryField.value.trim();
            question.required = requiredField.checked;
            question.weight = parseInt(weightField.value, 10);
            question.validation = JSON.parse(validationField.value || '{}');

            this.saveQuestions();
            this.isDirty = false;
            this.renderQuestionList();
            this.renderQuestionEditor(null);
        });

        // Cancel edit
        cancelBtn.addEventListener('click', () => {
            this.renderQuestionEditor(null);
        });

        // Delete question
        deleteBtn.addEventListener('click', () => {
            this.deleteQuestion(question.id);
        });

        // Add option
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => {
                this.addOptionToQuestion(question);
            });
        }

        // Focus on title field
        titleField.focus();
    }
    /**
     * Add option to question
     */
    static addOptionToQuestion(question) {
        if (!question.options) {
            question.options = [];
        }

        const newOption = {
            value: `option${question.options.length + 1}`,
            title: `Option ${question.options.length + 1}`,
            description: '',
            score: 1
        };

        question.options.push(newOption);
        this.renderQuestionEditor(question);
        this.markDirty();
    }
    /**
     * Save questions to storage
     */
    static saveQuestions() {
        if (typeof StateManager !== 'undefined') {
            StateManager.setState('config.questions', this.questions);
        } else {
            StorageManager?.setItem('governance_questions', this.questions);
        }
        this.isDirty = false;
        console.log('Questions saved successfully');
    } 
    /**
     * Generate unique question ID
     */
    static generateQuestionId() {
        return 'q-' + Math.random().toString(36).substr(2, 9);
    }
    /**
     * Select question type
     */
    static selectQuestionType(type) {
        const questionType = document.querySelector(`.question-type[data-type="${type}"]`);
        if (questionType) {
            this.createNewQuestion(type);
        } else {
            console.warn(`Question type "${type}" not found`);
        }
    }
    /**
     * Escape HTML for safe rendering
     */
    static escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
    }
    /**
     * Get type name from type string
     */
    static getTypeName(type) {
        const typeNames = {
            'single-select': 'Single Select',
            'multi-select': 'Multi Select',
            'text-input': 'Text Input',
            'number-input': 'Number Input',
            'date-input': 'Date Input',
            'rating-scale': 'Rating Scale'
        };
        return typeNames[type] || type;
    }
    /**
     * Mark builder as dirty (unsaved changes)
     */
    static markDirty() {
        this.isDirty = true;
        console.log('Unsaved changes detected');
    }
    /**
     * Debounced save function to prevent excessive saves
     */
    static debouncedSave = this.debounce(() => {
        this.saveQuestions();
    }, 1000);
    /**
     * Debounce function to limit execution rate
     */
    static debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
}
// Initialize the Question Builder when the script loads
document.addEventListener('DOMContentLoaded', () => {
    QuestionBuilder.init();
});
// Export the QuestionBuilder class for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestionBuilder;
}
// If running in a browser environment, attach to the global window object
if (typeof window !== 'undefined') {
    window.QuestionBuilder = QuestionBuilder;
}
// Ensure the main function is called to kick off the builder
function main() {
    QuestionBuilder.init();
}
// If this script is run directly, call the main function
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
