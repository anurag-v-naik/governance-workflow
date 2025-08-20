/**
 * Data Governance Decision Tool - Email Integration
 * Client-side email export for assessment reports and recommendations
 * Version: 1.0.0
 */

class EmailIntegration {
    /**
     * Send assessment report via email
     * @param {Object} options - { to, subject, body, attachments: [{ filename, blob }] }
     * @returns {Promise<void>}
     */
    static async sendEmail({ to, subject, body, attachments = [] }) {
        // This implementation uses the mailto: protocol for basic email, or EmailJS for advanced use
        if (window.emailjs) {
            // Example using EmailJS (https://www.emailjs.com/)
            try {
                const formData = new FormData();
                formData.append('to_email', to);
                formData.append('subject', subject);
                formData.append('message', body);
                // Attachments (if supported by your email backend)
                for (const att of attachments) {
                    formData.append('attachments', att.blob, att.filename);
                }
                await window.emailjs.sendForm('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', formData, 'YOUR_USER_ID');
                alert('Email sent successfully!');
            } catch (err) {
                alert('Failed to send email: ' + err.message);
            }
        } else {
            // Fallback: open mail client with mailto (attachments not supported)
            const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailto;
        }
    }

    /**
     * Utility to convert Blob to Base64 (for email attachments if needed)
     */
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailIntegration;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.EmailIntegration = EmailIntegration;
}
