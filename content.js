chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractEmailContent') {
        try {
            let subject = '';
            let body = '';

            // Try to find the subject line
            // Common selectors for Gmail subject line
            const subjectElement1 = document.querySelector('h2.hP'); // Gmail's main subject element
            const subjectElement2 = document.querySelector('.hP .bog'); // Another possible subject element
            const subjectElement3 = document.querySelector('[role="heading"] .hP'); // Generic heading with subject class
            const subjectElement4 = document.querySelector('.adn.ads .iw'); // When composing, subject is input field

            if (subjectElement1) {
                subject = subjectElement1.innerText.trim();
            } else if (subjectElement2) {
                subject = subjectElement2.innerText.trim();
            } else if (subjectElement3) {
                 subject = subjectElement3.innerText.trim();
            } else if (subjectElement4) {
                 subject = subjectElement4.value ? subjectElement4.value.trim() : ''; // For input fields
            }

            // Try to find the email body
            // This is more complex as Gmail's DOM changes. We'll try a few common patterns.
            // Look for the main message body div in an opened email
            let messageBodyDiv = document.querySelector('div[role="listitem"] .ajx.gt.atz'); // Specific to opened emails
            if (!messageBodyDiv) {
                messageBodyDiv = document.querySelector('div[role="listitem"] div[aria-label="Message Body"]');
            }
            if (!messageBodyDiv) {
                // Another common pattern for the main content area
                messageBodyDiv = document.querySelector('div.rH > div.HO .nH.hx > div.nH > div.nH > div.ii.gt > div.a3s.aiL');
            }
            if (!messageBodyDiv) {
                // Fallback for older or different Gmail layouts
                messageBodyDiv = document.querySelector('.a3s.aiL');
            }
            if (!messageBodyDiv) {
                 // Try to get content from an active compose window
                messageBodyDiv = document.querySelector('div.editable.LW-avf[aria-label="Message Body"]');
            }

            if (messageBodyDiv) {
                body = messageBodyDiv.innerText.trim();
            }

            if (body) {
                sendResponse({ success: true, emailContent: { subject, body } });
            } else {
                sendResponse({ success: false, error: "Could not find email content. Please ensure an email is open." });
            }
        } catch (e) {
            console.error("Error extracting email content:", e);
            sendResponse({ success: false, error: "Error during content extraction: " + e.message });
        }
        return true; // Indicates an asynchronous response
    }
});