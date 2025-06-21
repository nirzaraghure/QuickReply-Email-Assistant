chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateReply') {
        const { emailSubject, emailBody, apiKey } = request; // Receive apiKey here

        // Function to call Gemini API
        async function callGemini(subject, body, userApiKey) {
            let chatHistory = [];
            const prompt = `You are an AI email assistant. Generate a concise and professional reply to the following email.
            
            Subject: ${subject}
            
            Body:
            ${body}
            
            Please provide only the reply text, starting directly with the salutation (e.g., "Dear [Name]," or "Hi [Name],").`;

            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userApiKey}`; // Use the provided API key

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
                }

                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    return { success: true, reply: text };
                } else {
                    return { success: false, error: "No valid reply candidate received from Gemini." };
                }
            } catch (error) {
                console.error("Error calling Gemini API:", error);
                return { success: false, error: "Error generating reply: " + error.message };
            }
        }

        // Call the async function and send response
        callGemini(emailSubject, emailBody, apiKey).then(sendResponse);
        return true; // Indicates an asynchronous response
    }
});