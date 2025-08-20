/**
 * Data Governance Decision Tool - Reporting Engine
 * Generates analytics and summary reports from assessment data
 * Version: 1.0.0
 */

class ReportingEngine {
    /**
     * Generate a summary report from assessment data
     * @param {Object} assessmentData - The assessment data object
     * @returns {Object} Summary report object
     */
    static generateSummaryReport(assessmentData) {
        const totalQuestions = assessmentData.responses?.length || 0;
        const answered = assessmentData.responses?.filter(r => r.answer !== undefined && r.answer !== null).length || 0;
        const completion = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
        const maturityScore = assessmentData.maturityScore || null;
        const riskLevel = assessmentData.riskLevel || null;
        const keyFindings = assessmentData.keyFindings || [];
        const recommendations = assessmentData.recommendations || [];
        return {
            organization: assessmentData.organization || '',
            department: assessmentData.department || '',
            assessmentId: assessmentData.id || '',
            date: assessmentData.timestamp ? new Date(assessmentData.timestamp).toLocaleDateString() : '',
            totalQuestions,
            answered,
            completion,
            maturityScore,
            riskLevel,
            keyFindings,
            recommendations
        };
    }

    /**
     * Generate a detailed report by category
     * @param {Object} assessmentData
     * @returns {Object} Category-wise report
     */
    static generateCategoryReport(assessmentData) {
        const responses = assessmentData.responses || [];
        const grouped = {};
        responses.forEach(r => {
            if (!grouped[r.category]) grouped[r.category] = [];
            grouped[r.category].push(r);
        });
        const report = {};
        Object.entries(grouped).forEach(([category, items]) => {
            const score = items.reduce((sum, r) => sum + (r.score || 0), 0) / items.length;
            report[category] = {
                total: items.length,
                answered: items.filter(r => r.answer !== undefined && r.answer !== null).length,
                avgScore: score,
                responses: items
            };
        });
        return report;
    }

    /**
     * Generate a CSV string from assessment data
     * @param {Object} assessmentData
     * @returns {string} CSV data
     */
    static generateCSV(assessmentData) {
        const responses = assessmentData.responses || [];
        if (responses.length === 0) return '';
        const headers = Object.keys(responses[0]);
        const csvRows = [headers.join(',')];
        responses.forEach(r => {
            csvRows.push(headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
        });
        return csvRows.join('\n');
    }

    /**
     * Generate a JSON report
     * @param {Object} assessmentData
     * @returns {string} JSON string
     */
    static generateJSON(assessmentData) {
        return JSON.stringify(assessmentData, null, 2);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportingEngine;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReportingEngine = ReportingEngine;
}
