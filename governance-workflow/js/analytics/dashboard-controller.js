/**
 * Data Governance Decision Tool - Dashboard Controller
 * Controls the analytics dashboard: loads, renders, and updates analytics widgets
 * Version: 1.0.0
 */

class DashboardController {
    static widgets = [];
    static data = null;
    static initialized = false;

    /**
     * Initialize the dashboard
     * @param {Object} analyticsData - Precomputed analytics data
     */
    static init(analyticsData) {
        if (this.initialized) return;
        this.data = analyticsData;
        this.renderAllWidgets();
        this.setupEventListeners();
        this.initialized = true;
        console.log('DashboardController initialized');
    }

    /**
     * Render all dashboard widgets
     */
    static renderAllWidgets() {
        this.renderSummaryWidget();
        this.renderTrendsWidget();
        this.renderCategoryBreakdownWidget();
        this.renderRiskWidget();
        // Add more widgets as needed
    }

    /**
     * Render summary widget
     */
    static renderSummaryWidget() {
        const el = document.getElementById('dashboard-summary');
        if (!el || !this.data) return;
        el.innerHTML = `
            <div class="summary-metric">
                <span class="metric-label">Assessments</span>
                <span class="metric-value">${this.data.totalAssessments ?? 0}</span>
            </div>
            <div class="summary-metric">
                <span class="metric-label">Avg. Maturity</span>
                <span class="metric-value">${this.data.avgMaturityScore ?? 'N/A'}</span>
            </div>
            <div class="summary-metric">
                <span class="metric-label">High Risks</span>
                <span class="metric-value">${this.data.highRiskCount ?? 0}</span>
            </div>
        `;
    }

    /**
     * Render trends widget (e.g., line chart)
     */
    static renderTrendsWidget() {
        const el = document.getElementById('dashboard-trends');
        if (!el || !this.data?.trends) return;
        // Example: render a simple SVG line chart (replace with chart library as needed)
        el.innerHTML = this.generateTrendsSVG(this.data.trends);
    }

    /**
     * Generate SVG for trends
     */
    static generateTrendsSVG(trends) {
        // Placeholder: simple SVG line chart
        // Replace with chart.js, d3.js, or other library for production
        if (!Array.isArray(trends) || trends.length === 0) return '<svg></svg>';
        const width = 300, height = 80, margin = 10;
        const max = Math.max(...trends);
        const min = Math.min(...trends);
        const points = trends.map((v, i) => {
            const x = margin + (i * (width - 2 * margin) / (trends.length - 1));
            const y = height - margin - ((v - min) / (max - min || 1)) * (height - 2 * margin);
            return `${x},${y}`;
        }).join(' ');
        return `<svg width="${width}" height="${height}"><polyline fill="none" stroke="#2563eb" stroke-width="2" points="${points}" /></svg>`;
    }

    /**
     * Render category breakdown widget (e.g., pie chart)
     */
    static renderCategoryBreakdownWidget() {
        const el = document.getElementById('dashboard-category-breakdown');
        if (!el || !this.data?.categoryBreakdown) return;
        el.innerHTML = this.generateCategoryPieSVG(this.data.categoryBreakdown);
    }

    /**
     * Generate SVG for category breakdown
     */
    static generateCategoryPieSVG(breakdown) {
        // Placeholder: simple SVG pie chart
        // Replace with chart.js, d3.js, or other library for production
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
        let angle = 0;
        let svg = '<svg width="100" height="100" viewBox="0 0 32 32">';
        Object.entries(breakdown).forEach(([cat, val], i) => {
            const sliceAngle = (val / total) * 2 * Math.PI;
            const x1 = 16 + 16 * Math.cos(angle);
            const y1 = 16 + 16 * Math.sin(angle);
            angle += sliceAngle;
            const x2 = 16 + 16 * Math.cos(angle);
            const y2 = 16 + 16 * Math.sin(angle);
            const largeArc = sliceAngle > Math.PI ? 1 : 0;
            svg += `<path d="M16,16 L${x1},${y1} A16,16 0 ${largeArc} 1 ${x2},${y2} Z" fill="#${((i * 1234567) % 0xffffff).toString(16).padStart(6, '0')}" />`;
        });
        svg += '</svg>';
        return svg;
    }

    /**
     * Render risk widget
     */
    static renderRiskWidget() {
        const el = document.getElementById('dashboard-risk');
        if (!el || !this.data?.riskLevels) return;
        el.innerHTML = this.generateRiskBars(this.data.riskLevels);
    }

    /**
     * Generate HTML for risk bars
     */
    static generateRiskBars(riskLevels) {
        // riskLevels: { high: n, medium: n, low: n }
        const total = Object.values(riskLevels).reduce((a, b) => a + b, 0) || 1;
        return `
            <div class="risk-bar high" style="width:${(riskLevels.high/total)*100}%">High: ${riskLevels.high}</div>
            <div class="risk-bar medium" style="width:${(riskLevels.medium/total)*100}%">Medium: ${riskLevels.medium}</div>
            <div class="risk-bar low" style="width:${(riskLevels.low/total)*100}%">Low: ${riskLevels.low}</div>
        `;
    }

    /**
     * Setup event listeners for dashboard interactivity
     */
    static setupEventListeners() {
        // Example: refresh button
        const refreshBtn = document.getElementById('dashboard-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.renderAllWidgets();
            });
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardController;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DashboardController = DashboardController;
}
