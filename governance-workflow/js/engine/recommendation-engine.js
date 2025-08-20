// js/engine/recommendation-engine.js - Recommendation Generation Engine

/**
 * Recommendation Engine for Data Governance Decision Tool
 * Generates intelligent recommendations based on assessment results and rules
 * 
 * @version 1.0.0
 * @author System Administrator
 */

class RecommendationEngine {
    static templates = [];
    static isInitialized = false;
    static recommendationCache = new Map();
    static scoringWeights = {
        dataClassification: 0.25,
        governanceMaturity: 0.30,
        compliance: 0.20,
        accessControl: 0.15,
        organizationSize: 0.10
    };

    /**
     * Initialize recommendation engine
     */
    static init() {
        if (this.isInitialized) {
            return;
        }

        this.loadTemplates();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('Recommendation Engine initialized');
    }

    /**
     * Load recommendation templates
     */
    static loadTemplates() {
        if (typeof StateManager !== 'undefined') {
            this.templates = StateManager.getState('config.templates') || [];
        } else {
            this.templates = StorageManager?.getItem('recommendation_templates') || [];
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners() {
        if (typeof EventBus !== 'undefined') {
            EventBus.on('assessment.generate-results', (data) => {
                this.generateRecommendations(data.answers, data.assessmentId);
            });
        }
    }

    /**
     * Generate recommendations for an assessment
     */
    static async generateRecommendations(assessment) {
        const cacheKey = this.generateCacheKey(assessment);
        
        // Check cache first
        if (this.recommendationCache.has(cacheKey)) {
            return this.recommendationCache.get(cacheKey);
        }

        try {
            // Calculate overall score
            const scoreResult = this.calculateScore(assessment);
            
            // Determine governance level
            const governanceLevel = this.determineGovernanceLevel(scoreResult.totalScore);
            
            // Select appropriate template
            const template = this.selectTemplate(assessment, scoreResult, governanceLevel);
            
            // Generate contextual recommendations
            const recommendations = this.generateContextualRecommendations(
                assessment, scoreResult, template
            );
            
            // Apply rules engine results if available
            const rulesResults = await this.applyRulesEngine(assessment);
            
            // Merge recommendations
            const finalRecommendations = this.mergeRecommendations(
                recommendations, rulesResults, template
            );
            
            // Create final result
            const result = {
                id: this.generateRecommendationId(),
                assessmentId: assessment.id,
                score: scoreResult.totalScore,
                maxScore: scoreResult.maxScore,
                percentage: Math.round((scoreResult.totalScore / scoreResult.maxScore) * 100),
                level: governanceLevel,
                template: template,
                recommendations: finalRecommendations,
                scoreBreakdown: scoreResult.breakdown,
                generatedAt: new Date().toISOString(),
                version: '1.0.0'
            };

            // Cache the result
            this.recommendationCache.set(cacheKey, result);
            
            // Emit event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('recommendations.generated', result);
            }

            return result;

        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw error;
        }
    }

    /**
     * Calculate assessment score
     */
    static calculateScore(assessment) {
        const questions = StateManager?.getState('config.questions') || [];
        const answers = assessment.answers || {};
        
        let totalScore = 0;
        let maxScore = 0;
        const breakdown = {};

        // Group questions by category
        const questionsByCategory = questions.reduce((acc, question) => {
            const category = question.category || 'general';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(question);
            return acc;
        }, {});

        // Calculate score for each category
        for (const [category, categoryQuestions] of Object.entries(questionsByCategory)) {
            let categoryScore = 0;
            let categoryMaxScore = 0;

            for (const question of categoryQuestions) {
                const answer = answers[question.id];
                const weight = question.weight || 1;
                
                if (answer !== undefined && answer !== null) {
                    const questionScore = this.calculateQuestionScore(question, answer);
                    categoryScore += questionScore * weight;
                }
                
                // Calculate max possible score for this question
                const maxQuestionScore = this.getMaxQuestionScore(question);
                categoryMaxScore += maxQuestionScore * weight;
            }

            breakdown[category] = {
                score: categoryScore,
                maxScore: categoryMaxScore,
                percentage: categoryMaxScore > 0 ? Math.round((categoryScore / categoryMaxScore) * 100) : 0,
                weight: this.scoringWeights[category] || 0.1
            };

            // Apply category weight to total score
            const categoryWeight = this.scoringWeights[category] || 0.1;
            totalScore += categoryScore * categoryWeight;
            maxScore += categoryMaxScore * categoryWeight;
        }

        return {
            totalScore: Math.round(totalScore),
            maxScore: Math.round(maxScore),
            breakdown: breakdown
        };
    }

    /**
     * Calculate score for a single question
     */
    static calculateQuestionScore(question, answer) {
        switch (question.type) {
            case 'single-select':
                return this.calculateSingleSelectScore(question, answer);
            
            case 'multi-select':
                return this.calculateMultiSelectScore(question, answer);
            
            case 'rating-scale':
                return this.calculateRatingScore(question, answer);
            
            case 'number-input':
                return this.calculateNumberScore(question, answer);
            
            case 'text-input':
                return this.calculateTextScore(question, answer);
            
            default:
                return 0;
        }
    }

    /**
     * Calculate score for single select questions
     */
    static calculateSingleSelectScore(question, answer) {
        if (!question.options) return 0;
        
        const selectedOption = question.options.find(opt => opt.value === answer);
        return selectedOption ? (selectedOption.score || 0) : 0;
    }

    /**
     * Calculate score for multi select questions
     */
    static calculateMultiSelectScore(question, answer) {
        if (!question.options || !Array.isArray(answer)) return 0;
        
        let totalScore = 0;
        for (const selectedValue of answer) {
            const option = question.options.find(opt => opt.value === selectedValue);
            if (option) {
                totalScore += option.score || 0;
            }
        }
        return totalScore;
    }

    /**
     * Calculate score for rating scale questions
     */
    static calculateRatingScore(question, answer) {
        const scale = question.scale || 5;
        const numericAnswer = parseInt(answer);
        
        if (isNaN(numericAnswer) || numericAnswer < 1 || numericAnswer > scale) {
            return 0;
        }
        
        // Normalize to 0-10 scale
        return Math.round((numericAnswer / scale) * 10);
    }

    /**
     * Calculate score for number input questions
     */
    static calculateNumberScore(question, answer) {
        const numericAnswer = parseFloat(answer);
        if (isNaN(numericAnswer)) return 0;
        
        const min = question.min || 0;
        const max = question.max || 100;
        
        // Normalize to 0-10 scale
        const normalized = Math.max(0, Math.min(1, (numericAnswer - min) / (max - min)));
        return Math.round(normalized * 10);
    }

    /**
     * Calculate score for text input questions
     */
    static calculateTextScore(question, answer) {
        if (!answer || typeof answer !== 'string') return 0;
        
        // Basic scoring based on answer length and quality
        const trimmedAnswer = answer.trim();
        if (trimmedAnswer.length === 0) return 0;
        if (trimmedAnswer.length < 10) return 2;
        if (trimmedAnswer.length < 50) return 5;
        if (trimmedAnswer.length < 100) return 7;
        return 10;
    }

    /**
     * Get maximum possible score for a question
     */
    static getMaxQuestionScore(question) {
        switch (question.type) {
            case 'single-select':
                if (!question.options) return 0;
                return Math.max(...question.options.map(opt => opt.score || 0));
                
            case 'multi-select':
                if (!question.options) return 0;
                return question.options.reduce((sum, opt) => sum + (opt.score || 0), 0);
                
            case 'rating-scale':
            case 'number-input':
            case 'text-input':
            default:
                return 10; // Normalized max score
        }
    }

    /**
     * Determine governance level based on score
     */
    static determineGovernanceLevel(score) {
        const maxPossibleScore = 100; // Assuming normalized to 100
        const percentage = (score / maxPossibleScore) * 100;
        
        if (percentage >= 80) return 'high';
        if (percentage >= 60) return 'medium';
        if (percentage >= 40) return 'developing';
        return 'basic';
    }

    /**
     * Select appropriate template based on assessment
     */
    static selectTemplate(assessment, scoreResult, governanceLevel) {
        const answers = assessment.answers || {};
        
        // Priority-based template selection
        const templatePriorities = [
            // High security for sensitive data
            {
                condition: (answers) => 
                    answers['question-1'] === 'financial_data' || 
                    (Array.isArray(answers['question-3']) && answers['question-3'].includes('hipaa')),
                templateId: 'high_security_template'
            },
            
            // Simplified for small organizations
            {
                condition: (answers) => answers['question-5'] === 'small',
                templateId: 'simplified_governance_template'
            },
            
            // Advanced for mature organizations
            {
                condition: (answers) => 
                    answers['question-2'] === 'defined' || answers['question-2'] === 'managed',
                templateId: 'advanced_governance_template'
            },
            
            // Default basic template
            {
                condition: () => true,
                templateId: 'basic_governance_template'
            }
        ];

        // Find the first matching template
        for (const priority of templatePriorities) {
            if (priority.condition(answers)) {
                const template = this.templates.find(t => t.id === priority.templateId);
                if (template) {
                    return template;
                }
            }
        }

        // Fallback to basic template
        return this.templates.find(t => t.id === 'basic_governance_template') || 
               this.getDefaultTemplate();
    }

    /**
     * Generate contextual recommendations
     */
    static generateContextualRecommendations(assessment, scoreResult, template) {
        const recommendations = {
            summary: this.generateSummary(assessment, scoreResult, template),
            sections: {}
        };

        // Generate recommendations for each section
        if (template.sections) {
            for (const [sectionName, sectionTemplate] of Object.entries(template.sections)) {
                recommendations.sections[sectionName] = this.generateSectionRecommendations(
                    sectionName, sectionTemplate, assessment, scoreResult
                );
            }
        }

        return recommendations;
    }

    /**
     * Generate executive summary
     */
    static generateSummary(assessment, scoreResult, template) {
        const user = StateManager?.getState('user.profile') || {};
        const organizationName = user.organization || 'Your organization';
        const percentage = Math.round((scoreResult.totalScore / scoreResult.maxScore) * 100);
        const level = this.determineGovernanceLevel(scoreResult.totalScore);
        
        let summary = template.recommendation?.summary || 
            `${organizationName} demonstrates ${level} data governance maturity with a score of ${percentage}/100.`;
        
        // Add contextual insights
        const insights = this.generateInsights(assessment, scoreResult);
        if (insights.length > 0) {
            summary += ' ' + insights.join(' ');
        }

        return summary;
    }

    /**
     * Generate contextual insights
     */
    static generateInsights(assessment, scoreResult) {
        const insights = [];
        const answers = assessment.answers || {};
        
        // Compliance insights
        if (Array.isArray(answers['question-3'])) {
            const complianceFrameworks = answers['question-3'];
            if (complianceFrameworks.includes('gdpr') || complianceFrameworks.includes('hipaa')) {
                insights.push('Strong compliance requirements detected - enhanced security measures recommended.');
            }
        }

        // Organization size insights
        if (answers['question-5'] === 'enterprise') {
            insights.push('As a large enterprise, consider implementing advanced governance automation.');
        } else if (answers['question-5'] === 'small') {
            insights.push('Focus on essential governance practices with minimal overhead.');
        }

        // Maturity level insights
        if (answers['question-2'] === 'basic') {
            insights.push('Building foundational governance capabilities will provide immediate value.');
        } else if (answers['question-2'] === 'managed') {
            insights.push('Your mature governance foundation enables advanced optimization opportunities.');
        }

        return insights;
    }

    /**
     * Generate section-specific recommendations
     */
    static generateSectionRecommendations(sectionName, sectionTemplate, assessment, scoreResult) {
        const baseRecommendations = Array.isArray(sectionTemplate) ? 
            [...sectionTemplate] : [];
        
        // Add contextual recommendations based on assessment
        const contextualRecommendations = this.getContextualRecommendations(
            sectionName, assessment, scoreResult
        );
        
        return [...baseRecommendations, ...contextualRecommendations];
    }

    /**
     * Get contextual recommendations for a section
     */
    static getContextualRecommendations(sectionName, assessment, scoreResult) {
        const recommendations = [];
        const answers = assessment.answers || {};
        
        switch (sectionName) {
            case 'placement':
                if (answers['question-1'] === 'financial_data') {
                    recommendations.push('Use dedicated encrypted storage for financial data with geographic restrictions');
                }
                if (answers['question-5'] === 'enterprise') {
                    recommendations.push('Implement multi-region data placement strategy for disaster recovery');
                }
                break;
                
            case 'controls':
                if (answers['question-4'] === 'open_access') {
                    recommendations.push('PRIORITY: Implement immediate access controls - current open access poses significant risk');
                }
                if (Array.isArray(answers['question-3']) && answers['question-3'].includes('sox')) {
                    recommendations.push('Implement SOX-compliant audit controls with detailed logging');
                }
                break;
                
            case 'sharing':
                if (answers['question-2'] === 'basic') {
                    recommendations.push('Start with simple approval workflows before implementing complex sharing protocols');
                }
                break;
                
            case 'compliance':
                if (Array.isArray(answers['question-3'])) {
                    const frameworks = answers['question-3'];
                    frameworks.forEach(framework => {
                        switch (framework) {
                            case 'gdpr':
                                recommendations.push('Implement GDPR-specific data mapping and consent management');
                                break;
                            case 'hipaa':
                                recommendations.push('Deploy HIPAA-compliant encryption and access audit systems');
                                break;
                            case 'sox':
                                recommendations.push('Establish SOX-compliant financial data controls and reporting');
                                break;
                        }
                    });
                }
                break;
        }
        
        return recommendations;
    }

    /**
     * Apply rules engine results
     */
    static async applyRulesEngine(assessment) {
        if (typeof RulesEngine === 'undefined') {
            return { recommendations: [], actions: [] };
        }

        try {
            const rulesResults = RulesEngine.evaluateAssessment(
                assessment.answers, 
                assessment.id
            );
            
            return rulesResults;
        } catch (error) {
            console.error('Error applying rules engine:', error);
            return { recommendations: [], actions: [] };
        }
    }

    /**
     * Merge recommendations from different sources
     */
    static mergeRecommendations(templateRecommendations, rulesResults, template) {
        const merged = { ...templateRecommendations };
        
        // Add rules-based recommendations
        if (rulesResults.recommendations && rulesResults.recommendations.length > 0) {
            if (!merged.sections.rules) {
                merged.sections.rules = [];
            }
            
            rulesResults.recommendations.forEach(rec => {
                merged.sections.rules.push(rec.message || 'Rule-based recommendation');
            });
        }

        // Prioritize recommendations
        for (const sectionName of Object.keys(merged.sections)) {
            merged.sections[sectionName] = this.prioritizeRecommendations(
                merged.sections[sectionName]
            );
        }

        return merged;
    }

    /**
     * Prioritize recommendations within a section
     */
    static prioritizeRecommendations(recommendations) {
        return recommendations.sort((a, b) => {
            // PRIORITY items first
            const aPriority = typeof a === 'string' && a.includes('PRIORITY');
            const bPriority = typeof b === 'string' && b.includes('PRIORITY');
            
            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;
            
            return 0;
        });
    }

    /**
     * Generate recommendation ID
     */
    static generateRecommendationId() {
        return 'rec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate cache key for recommendations
     */
    static generateCacheKey(assessment) {
        const answersString = JSON.stringify(assessment.answers);
        const questionsVersion = StateManager?.getState('config.lastModified') || 'v1';
        return `${assessment.id}-${btoa(answersString)}-${questionsVersion}`;
    }

    /**
     * Get default template if none found
     */
    static getDefaultTemplate() {
        return {
            id: 'default_template',
            name: 'Default Governance Template',
            description: 'Basic governance recommendations',
            recommendation: {
                title: 'Data Governance Recommendations',
                summary: 'Based on your assessment, here are our recommendations.',
                governanceLevel: 'basic'
            },
            sections: {
                placement: [
                    'Implement centralized data storage with appropriate security controls',
                    'Establish clear data classification and handling procedures'
                ],
                controls: [
                    'Deploy role-based access controls for sensitive data',
                    'Implement regular access reviews and audit procedures'
                ],
                sharing: [
                    'Create data sharing agreements and approval processes',
                    'Establish secure channels for external data collaboration'
                ],
                compliance: [
                    'Document data handling procedures and retention policies',
                    'Conduct regular compliance assessments and reviews'
                ]
            }
        };
    }

    /**
     * Update scoring weights
     */
    static updateScoringWeights(newWeights) {
        this.scoringWeights = { ...this.scoringWeights, ...newWeights };
        
        // Clear cache as weights affect scoring
        this.recommendationCache.clear();
    }

    /**
     * Clear recommendation cache
     */
    static clearCache() {
        this.recommendationCache.clear();
    }

    /**
     * Get cached recommendations
     */
    static getCachedRecommendation(assessmentId) {
        for (const [key, value] of this.recommendationCache.entries()) {
            if (value.assessmentId === assessmentId) {
                return value;
            }
        }
        return null;
    }

    /**
     * Export recommendation data
     */
    static exportRecommendationData(recommendationId) {
        // Find recommendation in cache or storage
        for (const [key, value] of this.recommendationCache.entries()) {
            if (value.id === recommendationId) {
                return {
                    recommendation: value,
                    exportDate: new Date().toISOString(),
                    format: 'json'
                };
            }
        }
        return null;
    }

    /**
     * Generate recommendations preview
     */
    static generatePreview(partialAnswers) {
        // Generate quick preview based on partial answers
        const previewScore = this.calculatePartialScore(partialAnswers);
        const estimatedLevel = this.determineGovernanceLevel(previewScore);
        
        return {
            estimatedScore: previewScore,
            estimatedLevel: estimatedLevel,
            completeness: this.calculateCompleteness(partialAnswers),
            preview: true
        };
    }

    /**
     * Calculate partial score for preview
     */
    static calculatePartialScore(partialAnswers) {
        const questions = StateManager?.getState('config.questions') || [];
        const totalQuestions = questions.length;
        const answeredQuestions = Object.keys(partialAnswers).length;
        
        if (answeredQuestions === 0) return 0;
        
        // Calculate score for answered questions and extrapolate
        let currentScore = 0;
        let currentMaxScore = 0;
        
        for (const question of questions) {
            if (partialAnswers[question.id] !== undefined) {
                currentScore += this.calculateQuestionScore(question, partialAnswers[question.id]);
                currentMaxScore += this.getMaxQuestionScore(question);
            }
        }
        
        if (currentMaxScore === 0) return 0;
        
        // Extrapolate to full assessment
        const completionRatio = answeredQuestions / totalQuestions;
        const averageScore = currentScore / currentMaxScore;
        
        return Math.round(averageScore * 100 * completionRatio);
    }

    /**
     * Calculate assessment completeness
     */
    static calculateCompleteness(answers) {
        const questions = StateManager?.getState('config.questions') || [];
        const requiredQuestions = questions.filter(q => q.required !== false);
        const answeredRequired = requiredQuestions.filter(q => 
            answers[q.id] !== undefined && answers[q.id] !== null
        );
        
        return {
            total: (Object.keys(answers).length / questions.length) * 100,
            required: (answeredRequired.length / requiredQuestions.length) * 100
        };
    }

    /**
     * Get recommendation statistics
     */
    static getStats() {
        return {
            cacheSize: this.recommendationCache.size,
            templatesLoaded: this.templates.length,
            scoringWeights: this.scoringWeights,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Reset engine
     */
    static reset() {
        this.recommendationCache.clear();
        this.templates = [];
        this.loadTemplates();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecommendationEngine;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.RecommendationEngine = RecommendationEngine;
}