document.addEventListener('DOMContentLoaded', () => {
    const extractAndGenerateBtn = document.getElementById('extractAndGenerateBtn');
    const replySuggestionTextarea = document.getElementById('replySuggestion');
    const copyReplyBtn = document.getElementById('copyReplyBtn');
    const clearReplyBtn = document.getElementById('clearReplyBtn'); // New clear button
    const loadingSpinner = document.getElementById('loadingSpinner');
    const responseContainer = document.getElementById('responseContainer');
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    const messageBox = document.getElementById('messageBox');

    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyStatus = document.getElementById('apiKeyStatus');

    // Function to show a message in the message box
    function showMessageBox(message, type = 'info') {
        messageBox.textContent = message;
        messageBox.classList.remove('message-box-success', 'message-box-error', 'message-box-info', 'hidden', 'show');
        if (type === 'success') {
            messageBox.classList.add('message-box-success');
        } else if (type === 'error') {
            messageBox.classList.add('message-box-error');
        } else {
            messageBox.classList.add('message-box-info');
        }
        // Force reflow to restart animation
        void messageBox.offsetWidth;
        messageBox.classList.add('show'); // Trigger fade-in and slide
        setTimeout(() => {
            messageBox.classList.remove('show'); // Trigger fade-out
            setTimeout(() => {
                messageBox.classList.add('hidden'); // Hide completely after animation
            }, 300); // Match CSS transition duration
        }, 3000); // Display for 3 seconds
    }

    // Function to show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
        responseContainer.classList.add('hidden');
        loadingSpinner.style.display = 'none';
        extractAndGenerateBtn.disabled = false; // Enable button
    }

    // Function to hide error message
    function hideError() {
        errorContainer.classList.add('hidden');
        errorMessage.textContent = '';
    }

    // Load API Key on popup open
    chrome.storage.local.get(['geminiApiKey'], function(result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
            apiKeyInput.type = 'password'; // Keep it hidden if already saved
            apiKeyStatus.textContent = 'API Key is saved.';
            apiKeyStatus.classList.remove('text-red-600');
            apiKeyStatus.classList.add('text-green-600');
        } else {
            apiKeyStatus.textContent = 'No API Key saved. Please enter it.';
            apiKeyStatus.classList.remove('text-green-600');
            apiKeyStatus.classList.add('text-red-600');
        }
    });

    // Save API Key button listener
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ geminiApiKey: apiKey }, function() {
                apiKeyInput.type = 'password'; // Hide the key after saving
                apiKeyStatus.textContent = 'API Key saved successfully!';
                apiKeyStatus.classList.remove('text-red-600');
                apiKeyStatus.classList.add('text-green-600');
                showMessageBox('API Key saved!', 'success');
            });
        } else {
            apiKeyStatus.textContent = 'API Key cannot be empty.';
            apiKeyStatus.classList.remove('text-green-600');
            apiKeyStatus.classList.add('text-red-600');
            showMessageBox('API Key is empty!', 'error');
        }
    });

    // Toggle API Key visibility
    apiKeyInput.addEventListener('focus', () => {
        apiKeyInput.type = 'text'; // Show key when focused
    });
    apiKeyInput.addEventListener('blur', () => {
        if (apiKeyInput.value.trim() !== '') {
            apiKeyInput.type = 'password'; // Hide key when unfocused if not empty
        }
    });


    extractAndGenerateBtn.addEventListener('click', async () => {
        hideError();
        replySuggestionTextarea.value = '';
        responseContainer.classList.add('hidden');
        loadingSpinner.style.display = 'block'; // Show spinner
        extractAndGenerateBtn.disabled = true; // Disable button during loading

        // Get API Key from storage
        const storedApiKey = await new Promise(resolve => {
            chrome.storage.local.get(['geminiApiKey'], function(result) {
                resolve(result.geminiApiKey);
            });
        });

        if (!storedApiKey) {
            showError("Please enter and save your Gemini API Key in the settings above.");
            loadingSpinner.style.display = 'none';
            extractAndGenerateBtn.disabled = false; // Re-enable button
            return;
        }

        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url.includes('mail.google.com')) {
                showError("Please open an email in Gmail to use this extension.");
                loadingSpinner.style.display = 'none';
                extractAndGenerateBtn.disabled = false; // Re-enable button
                return;
            }

            // Inject and execute the content script to extract email data
            // We use executeScript to ensure content.js is run on demand
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // This function runs in the context of the content script
                    let subject = '';
                    let body = '';

                    // Try to find the subject line
                    const subjectElement1 = document.querySelector('h2.hP');
                    const subjectElement2 = document.querySelector('.hP .bog');
                    const subjectElement3 = document.querySelector('[role="heading"] .hP');
                    const subjectElement4 = document.querySelector('.adn.ads .iw');

                    if (subjectElement1) {
                        subject = subjectElement1.innerText.trim();
                    } else if (subjectElement2) {
                        subject = subjectElement2.innerText.trim();
                    } else if (subjectElement3) {
                         subject = subjectElement3.innerText.trim();
                    } else if (subjectElement4) {
                         subject = subjectElement4.value ? subjectElement4.value.trim() : '';
                    }

                    // Try to find the email body
                    let messageBodyDiv = document.querySelector('div[role="listitem"] .ajx.gt.atz');
                    if (!messageBodyDiv) {
                        messageBodyDiv = document.querySelector('div[role="listitem"] div[aria-label="Message Body"]');
                    }
                    if (!messageBodyDiv) {
                        messageBodyDiv = document.querySelector('div.rH > div.HO .nH.hx > div.nH > div.nH > div.ii.gt > div.a3s.aiL');
                    }
                    if (!messageBodyDiv) {
                        messageBodyDiv = document.querySelector('.a3s.aiL');
                    }
                    if (!messageBodyDiv) {
                         messageBodyDiv = document.querySelector('div.editable.LW-avf[aria-label="Message Body"]');
                    }

                    if (messageBodyDiv) {
                        body = messageBodyDiv.innerText.trim();
                    }

                    if (body) {
                        return { success: true, emailContent: { subject, body } };
                    } else {
                        return { success: false, error: "Could not find email content. Please ensure an email is open." };
                    }
                }
            });

            // The result from the executed script is in results[0].result
            const response = results[0]?.result;

            if (response && response.success && response.emailContent) {
                const { subject, body } = response.emailContent;

                if (!body || body.trim() === '') {
                    showError("Could not extract email body. Please ensure an email is open and visible.");
                    loadingSpinner.style.display = 'none';
                    extractAndGenerateBtn.disabled = false;
                    return;
                }

                // Send extracted content and API key to background script for Gemini API call
                const geminiResponse = await chrome.runtime.sendMessage({
                    action: 'generateReply',
                    emailSubject: subject,
                    emailBody: body,
                    apiKey: storedApiKey
                });

                if (geminiResponse && geminiResponse.success && geminiResponse.reply) {
                    replySuggestionTextarea.value = geminiResponse.reply;
                    responseContainer.classList.remove('hidden');
                } else {
                    showError(geminiResponse.error || "Failed to get a reply suggestion from Gemini.");
                }
            } else {
                showError(response?.error || "Failed to extract email content. Check the console for details.");
            }
        } catch (error) {
            console.error("Error in popup.js:", error);
            showError("An unexpected error occurred: " + error.message);
        } finally {
            loadingSpinner.style.display = 'none';
            extractAndGenerateBtn.disabled = false;
        }
    });

    copyReplyBtn.addEventListener('click', () => {
        if (replySuggestionTextarea.value) {
            replySuggestionTextarea.select();
            document.execCommand('copy');
            showMessageBox('Reply copied to clipboard!', 'success');
        } else {
            showMessageBox('No reply to copy.', 'info');
        }
    });

    clearReplyBtn.addEventListener('click', () => {
        replySuggestionTextarea.value = '';
        responseContainer.classList.add('hidden');
        showMessageBox('Reply cleared.', 'info');
    });
});