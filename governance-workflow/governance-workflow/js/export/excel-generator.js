/**
 * Data Governance Decision Tool - Excel Generator
 * Client-side Excel (XLSX) generation for assessment reports and recommendations
 * Version: 1.0.0
 */

class ExcelGenerator {
    constructor() {
        this.XLSX = null;
        this.loadXLSX();
    }

    /**
     * Load SheetJS (xlsx) library dynamically
     */
    async loadXLSX() {
        if (typeof window.XLSX === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => {
                this.XLSX = window.XLSX;
            };
            document.head.appendChild(script);
        } else {
            this.XLSX = window.XLSX;
        }
    }

    /**
     * Generate Excel assessment report
     * @param {Object} assessmentData - Assessment results and data
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Generated Excel file as blob
     */
    async generateAssessmentReport(assessmentData, options = {}) {
        if (!this.XLSX) await this.loadXLSX();

        // Prepare sheets
        const sheets = {};

        // Summary Sheet
        sheets['Summary'] = this.generateSummarySheet(assessmentData);

        // Recommendations Sheet
        sheets['Recommendations'] = this.generateRecommendationsSheet(assessmentData);

        // Raw Data Sheet (optional)
        if (options.includeRawData) {
            sheets['Raw Data'] = this.generateRawDataSheet(assessmentData);
        }

        // Create workbook
        const wb = this.XLSX.utils.book_new();
        Object.entries(sheets).forEach(([name, ws]) => {
            this.XLSX.utils.book_append_sheet(wb, ws, name);
        });

        // Write to binary and return as Blob
        const wbout = this.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    /**
     * Generate summary sheet
     */
    generateSummarySheet(data) {
        const rows = [
            ['Assessment Report'],
            ['Organization', data.organization || ''],
            ['Department', data.department || ''],
            ['Assessment Date', new Date(data.timestamp).toLocaleDateString()],
            ['Assessment ID', data.id || ''],
            [],
            ['Maturity Score', data.maturityScore || ''],
            ['Risk Level', data.riskLevel || ''],
            [],
            ['Key Findings'],
            ...(data.keyFindings || []).map(f => [f])
        ];
        return this.XLSX.utils.aoa_to_sheet(rows);
    }

    /**
     * Generate recommendations sheet
     */
    generateRecommendationsSheet(data) {
        const recs = data.recommendations || [];
        const rows = [
            ['#', 'Title', 'Priority', 'Effort', 'Description', 'Benefits'],
            ...recs.map((rec, i) => [
                i + 1,
                rec.title,
                rec.priority,
                rec.effort,
                rec.description,
                rec.benefits
            ])
        ];
        return this.XLSX.utils.aoa_to_sheet(rows);
    }

    /**
     * Generate raw data sheet
     */
    generateRawDataSheet(data) {
        // Flatten responses or include all raw data as needed
        const responses = data.responses || [];
        const rows = [
            Object.keys(responses[0] || {}),
            ...responses.map(r => Object.values(r))
        ];
        return this.XLSX.utils.aoa_to_sheet(rows);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelGenerator;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ExcelGenerator = ExcelGenerator;
}