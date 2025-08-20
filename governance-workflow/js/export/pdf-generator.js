/**
 * Data Governance Decision Tool - PDF Generator
 * Client-side PDF generation for assessment reports and recommendations
 * Version: 1.0.0
 */

class PDFGenerator {
    constructor() {
        this.jsPDF = null;
        this.currentY = 20;
        this.pageHeight = 297; // A4 height in mm
        this.pageWidth = 210; // A4 width in mm
        this.margins = { top: 20, right: 20, bottom: 20, left: 20 };
        this.fonts = {
            title: { size: 24, style: 'bold' },
            heading: { size: 18, style: 'bold' },
            subheading: { size: 14, style: 'bold' },
            body: { size: 11, style: 'normal' },
            small: { size: 9, style: 'normal' }
        };
        this.colors = {
            primary: '#2563eb',
            secondary: '#64748b',
            success: '#059669',
            warning: '#d97706',
            danger: '#dc2626',
            text: '#374151',
            lightGray: '#f3f4f6'
        };
        this.loadJsPDF();
    }

    /**
     * Load jsPDF library dynamically
     */
    async loadJsPDF() {
        if (typeof window.jsPDF === 'undefined') {
            try {
                // Load jsPDF from CDN if not already loaded
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    this.jsPDF = window.jspdf.jsPDF;
                };
                document.head.appendChild(script);
            } catch (error) {
                console.error('Failed to load jsPDF:', error);
            }
        } else {
            this.jsPDF = window.jspdf.jsPDF;
        }
    }

    /**
     * Generate comprehensive assessment report
     * @param {Object} assessmentData - Assessment results and data
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Generated PDF as blob
     */
    async generateAssessmentReport(assessmentData, options = {}) {
        const doc = new this.jsPDF();
        this.currentY = this.margins.top;

        // Configure document
        this.setupDocument(doc, options);

        // Add title page
        this.addTitlePage(doc, assessmentData, options);

        // Add executive summary
        this.addNewPage(doc);
        this.addExecutiveSummary(doc, assessmentData);

        // Add assessment details
        this.addNewPage(doc);
        this.addAssessmentDetails(doc, assessmentData);

        // Add recommendations
        this.addNewPage(doc);
        this.addRecommendations(doc, assessmentData);

        // Add charts and visualizations
        if (options.includeCharts) {
            this.addNewPage(doc);
            await this.addCharts(doc, assessmentData);
        }

        // Add raw data if requested
        if (options.includeRawData) {
            this.addNewPage(doc);
            this.addRawData(doc, assessmentData);
        }

        // Add footer to all pages
        this.addFooterToAllPages(doc);

        return doc;
    }

    /**
     * Setup document properties and metadata
     * @param {jsPDF} doc - PDF document
     * @param {Object} options - Export options
     */
    setupDocument(doc, options) {
        doc.setProperties({
            title: options.title || 'Data Governance Assessment Report',
            subject: 'Data Governance Assessment',
            author: options.author || 'Data Governance Decision Tool',
            creator: 'Data Governance Decision Tool v1.0.0',
            producer: 'jsPDF',
            keywords: 'data governance, assessment, compliance, security'
        });
    }

    /**
     * Add title page
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     * @param {Object} options - Export options
     */
    addTitlePage(doc, data, options) {
        const centerX = this.pageWidth / 2;

        // Company logo (if provided)
        if (options.logoUrl) {
            // Add logo implementation here
        }

        // Main title
        this.setFont(doc, 'title');
        doc.setTextColor(this.colors.primary);
        doc.text('Data Governance Assessment Report', centerX, 60, { align: 'center' });

        // Subtitle
        this.setFont(doc, 'heading');
        doc.setTextColor(this.colors.secondary);
        doc.text('Comprehensive Analysis and Recommendations', centerX, 80, { align: 'center' });

        // Organization info
        this.currentY = 120;
        this.setFont(doc, 'body');
        doc.setTextColor(this.colors.text);
        
        if (data.organization) {
            this.addText(doc, `Organization: ${data.organization}`, centerX, { align: 'center' });
        }
        
        if (data.department) {
            this.addText(doc, `Department: ${data.department}`, centerX, { align: 'center' });
        }

        // Assessment details
        this.currentY += 20;
        this.addText(doc, `Assessment Date: ${new Date(data.timestamp).toLocaleDateString()}`, centerX, { align: 'center' });
        this.addText(doc, `Assessment ID: ${data.id || 'N/A'}`, centerX, { align: 'center' });

        // Summary box
        this.currentY += 30;
        this.addSummaryBox(doc, data);
    }

    /**
     * Add summary box to title page
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     */
    addSummaryBox(doc, data) {
        const boxX = this.margins.left + 20;
        const boxY = this.currentY;
        const boxWidth = this.pageWidth - this.margins.left - this.margins.right - 40;
        const boxHeight = 60;

        // Draw box
        doc.setFillColor(this.colors.lightGray);
        doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');
        doc.setDrawColor(this.colors.primary);
        doc.rect(boxX, boxY, boxWidth, boxHeight);

        // Add summary content
        this.setFont(doc, 'subheading');
        doc.setTextColor(this.colors.primary);
        doc.text('Assessment Summary', boxX + 10, boxY + 15);

        this.setFont(doc, 'body');
        doc.setTextColor(this.colors.text);
        
        const summary = this.generateSummaryText(data);
        const lines = doc.splitTextToSize(summary, boxWidth - 20);
        doc.text(lines, boxX + 10, boxY + 30);
    }

    /**
     * Generate summary text from assessment data
     * @param {Object} data - Assessment data
     * @returns {string} Summary text
     */
    generateSummaryText(data) {
        const totalQuestions = data.responses?.length || 0;
        const maturityScore = data.maturityScore || 'N/A';
        const riskLevel = data.riskLevel || 'N/A';
        
        return `This assessment evaluated ${totalQuestions} governance criteria. ` +
               `Overall maturity score: ${maturityScore}. Risk level: ${riskLevel}. ` +
               `Key recommendations and action items are detailed in this report.`;
    }

    /**
     * Add executive summary section
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     */
    addExecutiveSummary(doc, data) {
        this.addSectionHeader(doc, 'Executive Summary');

        // Key findings
        this.addSubheading(doc, 'Key Findings');
        const findings = data.keyFindings || this.generateKeyFindings(data);
        findings.forEach(finding => {
            this.addBulletPoint(doc, finding);
        });

        // Recommendations overview
        this.addSubheading(doc, 'Priority Recommendations');
        const priorityRecs = data.priorityRecommendations || this.extractPriorityRecommendations(data);
        priorityRecs.slice(0, 5).forEach((rec, index) => {
            this.addNumberedPoint(doc, `${rec.title}: ${rec.summary}`, index + 1);
        });

        // Risk assessment
        this.addSubheading(doc, 'Risk Assessment');
        this.addRiskAssessment(doc, data);
    }

    /**
     * Add assessment details section
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     */
    addAssessmentDetails(doc, data) {
        this.addSectionHeader(doc, 'Assessment Details');

        // Methodology
        this.addSubheading(doc, 'Assessment Methodology');
        this.addText(doc, 'This assessment was conducted using the Data Governance Decision Tool framework, ' +
                          'evaluating key governance domains including data quality, security, compliance, ' +
                          'and organizational maturity.');

        // Scope and coverage
        this.addSubheading(doc, 'Scope and Coverage');
        const scope = data.scope || this.generateScopeText(data);
        this.addText(doc, scope);

        // Detailed results by category
        this.addSubheading(doc, 'Results by Category');
        this.addCategoryResults(doc, data);
    }

    /**
     * Add category results
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     */
    addCategoryResults(doc, data) {
        const categories = data.categoryResults || this.groupResponsesByCategory(data);
        
        Object.entries(categories).forEach(([category, results]) => {
            if (this.currentY > this.pageHeight - 60) {
                this.addNewPage(doc);
            }

            this.setFont(doc, 'body');
            doc.setFontStyle('bold');
            this.addText(doc, `${category}:`);
            
            doc.setFontStyle('normal');
            this.addText(doc, `Score: ${results.score}/5 | Status: ${results.status}`);
            this.addText(doc, results.summary);
            this.currentY += 5;
        });
    }

    /**
     * Add recommendations section
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     */
    addRecommendations(doc, data) {
        this.addSectionHeader(doc, 'Detailed Recommendations');

        const recommendations = data.recommendations || [];
        
        recommendations.forEach((rec, index) => {
            if (this.currentY > this.pageHeight - 80) {
                this.addNewPage(doc);
            }

            // Recommendation header
            this.setFont(doc, 'subheading');
            doc.setTextColor(this.colors.primary);
            this.addText(doc, `${index + 1}. ${rec.title}`);

            // Priority and effort badges
            this.addRecommendationBadges(doc, rec);

            // Description
            this.setFont(doc, 'body');
            doc.setTextColor(this.colors.text);
            this.addText(doc, rec.description);

            // Implementation steps
            if (rec.steps && rec.steps.length > 0) {
                this.addText(doc, 'Implementation Steps:');
                rec.steps.forEach((step, stepIndex) => {
                    this.addNumberedPoint(doc, step, stepIndex + 1);
                });
            }

            // Expected benefits
            if (rec.benefits) {
                this.addText(doc, `Expected Benefits: ${rec.benefits}`);
            }

            this.currentY += 10;
        });
    }

    /**
     * Add recommendation badges (priority, effort, etc.)
     * @param {jsPDF} doc - PDF document
     * @param {Object} recommendation - Recommendation object
     */
    addRecommendationBadges(doc, recommendation) {
        const startX = this.margins.left;
        let badgeX = startX;

        // Priority badge
        if (recommendation.priority) {
            const color = this.getPriorityColor(recommendation.priority);
            this.addBadge(doc, recommendation.priority.toUpperCase(), badgeX, this.currentY, color);
            badgeX += 30;
        }

        // Effort badge
        if (recommendation.effort) {
            this.addBadge(doc, `${recommendation.effort} EFFORT`, badgeX, this.currentY, this.colors.secondary);
            badgeX += 35;
        }

        this.currentY += 15;
    }

    /**
     * Add a colored badge
     * @param {jsPDF} doc - PDF document
     * @param {string} text - Badge text
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} color - Badge color
     */
    addBadge(doc, text, x, y, color) {
        const width = 25;
        const height = 8;

        doc.setFillColor(color);
        doc.rect(x, y - 5, width, height, 'F');
        
        this.setFont(doc, 'small');
        doc.setTextColor('white');
        doc.text(text, x + width/2, y, { align: 'center' });
        
        doc.setTextColor(this.colors.text);
    }

    /**
     * Get priority color
     * @param {string} priority - Priority level
     * @returns {string} Color code
     */
    getPriorityColor(priority) {
        const colors = {
            high: this.colors.danger,
            medium: this.colors.warning,
            low: this.colors.success
        };
        return colors[priority.toLowerCase()] || this.colors.secondary;
    }

    /**
     * Add charts section
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     * /async addCharts(doc, data) {
        this.addSectionHeader(doc, 'Visualizations and Charts
');
        // Placeholder for chart generation logic
        this.addText(doc, 'Charts and visualizations will be added here.');
    }
    /**
     * Add raw data section
     * @param {jsPDF} doc - PDF document
     * @param {Object} data - Assessment data
     */
    addRawData(doc, data) {
        this.addSectionHeader(doc, 'Raw Data');
        const rawDataStr = JSON.stringify(data, null, 2);
        const lines = doc.splitTextToSize(rawDataStr, this.pageWidth - this.margins.left - this.margins.right);
        doc.text(lines, this.margins.left, this.currentY);
    }
    /**
     * Add section header
     * @param {jsPDF} doc - PDF document
     * @param {string} title - Section title
     */
    addSectionHeader(doc, title) {
        if (this.currentY > this.pageHeight - 40) {
            this.addNewPage(doc);
        }
        this.setFont(doc, 'heading');
        doc.setTextColor(this.colors.primary);
        this.addText(doc, title);
        this.currentY += 10;
    }
    /**
     * Add subheading
     * @param {jsPDF} doc - PDF document
     * @param {string} title - Subheading title
     */
    addSubheading(doc, title) {
        if (this.currentY > this.pageHeight - 30) {
            this.addNewPage(doc);
        }
        this.setFont(doc, 'subheading');
        doc.setTextColor(this.colors.secondary);
        this.addText(doc, title);
        this.currentY += 8;
    } 
    /**
     * Add bullet point
     * @param {jsPDF} doc - PDF document
     * @param {string} text - Bullet point text
     */
    addBulletPoint(doc, text) {
        if (this.currentY > this.pageHeight - 20) {
            this.addNewPage(doc);
        }
        this.setFont(doc, 'body');
        doc.setTextColor(this.colors.text);
        const bullet = '\u2022 ';
        const lines = doc.splitTextToSize(bullet + text, this.pageWidth - this.margins.left - this.margins.right);
        doc.text(lines, this.margins.left + 5, this.currentY);
        this.currentY += lines.length * 7;
    }
    /**
     * Add numbered point
     * @param {jsPDF} doc - PDF document
     * @param {string} text - Point text
     * @param {number} number - Point number
     */
    addNumberedPoint(doc, text, number) {
        if (this.currentY > this.pageHeight - 20) {
            this.addNewPage(doc);
        }
        this.setFont(doc, 'body');
        doc.setTextColor(this.colors.text);
        const prefix = `${number}. `;
        const lines = doc.splitTextToSize(prefix + text, this.pageWidth - this.margins.left - this.margins.right);
        doc.text(lines, this.margins.left + 5, this.currentY);
        this.currentY += lines.length * 7;
    }
    /**
     * Add text at current position
     * @param {jsPDF} doc - PDF document
     * @param {string} text - Text to add
     * @param {number} [x] - X position (optional)
     * @param {Object} [options] - Text options (optional)
     */
    addText(doc, text, x = this.margins.left, options = {}) {
        const lines = doc.splitTextToSize(text, this.pageWidth - this.margins.left - this.margins.right);
        doc.text(lines, x, this.currentY, options);
        this.currentY += lines.length * 7;
    }
    /**
     * Set font style and size
     * @param {jsPDF} doc - PDF document
     * @param {string} type - Font type (title, heading, subheading, body, small)
     */
    setFont(doc, type) {
        const font = this.fonts[type] || this.fonts.body;
        doc.setFont('helvetica', font.style);
        doc.setFontSize(font.size);
    }
    /**
     * Add new page and reset Y position
     * @param {jsPDF} doc - PDF document
     */
    addNewPage(doc) {
        doc.addPage();
        this.currentY = this.margins.top;
    }
    /**
     * Add footer to all pages
     * @param {jsPDF} doc - PDF document
     */
    addFooterToAllPages(doc) {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            this.setFont(doc, 'small');
            doc.setTextColor(this.colors.secondary);
            const footerText = `Data Governance Decision Tool - Page ${i} of ${pageCount}`;
            doc.text(footerText, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
        }
    }
}