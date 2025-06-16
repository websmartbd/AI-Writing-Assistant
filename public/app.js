document.addEventListener('DOMContentLoaded', function() {
    // Get all required elements
    const storyContent = document.getElementById('editor');
    const suggestion = document.getElementById('suggestion');
    const acceptSuggestionBtn = document.getElementById('acceptSuggestionBtn');
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    const languageSelect = document.getElementById('language');
    const storyCategory = document.getElementById('storyCategory');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const getSuggestionBtn = document.getElementById('getSuggestionBtn');
    const themeToggle = document.getElementById('themeToggle');
    const wordCount = document.getElementById('wordCount');
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    
    let debounceTimer;
    let isSettingsVisible = false;
    let isProcessing = false;
    let isDarkMode = false;

    // Load saved API key
    const savedApiKey = localStorage.getItem('googleAiApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    // Toggle API key visibility
    toggleApiKeyBtn.addEventListener('click', function() {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleApiKeyBtn.querySelector('i').classList.toggle('fa-eye');
        toggleApiKeyBtn.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Save API key when changed
    apiKeyInput.addEventListener('change', function() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('googleAiApiKey', apiKey);
        } else {
            localStorage.removeItem('googleAiApiKey');
        }
    });

    // Function to apply theme based on isDarkMode state
    function applyTheme() {
        const icon = themeToggle.querySelector('i');
        if (isDarkMode) {
            document.documentElement.classList.add('dark-mode');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            document.documentElement.classList.remove('dark-mode');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        localStorage.setItem('themePreference', isDarkMode ? 'dark' : 'light');
    }

    // Check for saved theme preference on load
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme === 'dark') {
        isDarkMode = true;
    } else {
        isDarkMode = false;
    }
    applyTheme(); // Apply the theme initially

    // Initialize word count
    updateWordCount();

    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        isDarkMode = !isDarkMode;
        applyTheme(); // Apply the new theme
    });

    // Hover effect for theme toggle button
    themeToggle.addEventListener('mouseover', function() {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            if (isDarkMode) {
                // Currently dark mode (moon), show sun on hover
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                // Currently day mode (sun), show moon on hover
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    });

    themeToggle.addEventListener('mouseout', function() {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            if (isDarkMode) {
                // Currently dark mode, revert to moon
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            } else {
                // Currently day mode, revert to sun
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    });

    // Settings toggle functionality
    settingsToggle.addEventListener('click', function() {
        isSettingsVisible = !isSettingsVisible;
        settingsPanel.classList.toggle('hidden');
        // Rotate the settings icon when toggled
        const icon = settingsToggle.querySelector('i');
        if (icon) {
            icon.style.transform = isSettingsVisible ? 'rotate(90deg)' : 'rotate(0deg)';
            icon.style.transition = 'transform 0.3s ease';
        }
    });

    // Word count functionality
    function updateWordCount() {
        const text = storyContent.textContent.trim();
        const words = text ? text.split(/\s+/).length : 0;
        wordCount.textContent = `${words} words`;
    }

    // Update word count on input
    storyContent.addEventListener('input', function() {
        updateWordCount();
    });

    // Function to get AI suggestion
    async function getSuggestion() {
        if (isProcessing) return;
        
        const content = storyContent.textContent.trim();
        const category = storyCategory.value;
        const language = languageSelect.value;
        const title = document.getElementById('storyTitle').value.trim();
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            suggestion.textContent = 'Please enter your Google AI API key in settings';
            suggestion.classList.remove('hidden');
            acceptSuggestionBtn.classList.add('hidden');
            return;
        }
        
        if (!content) {
            suggestion.textContent = 'Start writing to get suggestions...';
            suggestion.classList.remove('hidden');
            acceptSuggestionBtn.classList.add('hidden');
            return;
        }

        try {
            isProcessing = true;
            suggestion.textContent = 'Getting suggestion...';
            suggestion.classList.remove('hidden');
            acceptSuggestionBtn.classList.add('hidden');

            const response = await fetch('/api/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: content,
                    category: category,
                    language: language,
                    title: title,
                    apiKey: apiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.isLanguageSupported) {
                suggestion.textContent = data.suggestion;
                suggestion.classList.remove('hidden');
                acceptSuggestionBtn.classList.remove('hidden');
            } else {
                suggestion.textContent = 'Language not supported';
                suggestion.classList.remove('hidden');
                acceptSuggestionBtn.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error:', error);
            suggestion.textContent = `Error: ${error.message || 'Failed to get suggestion. Please try again.'}`;
            suggestion.classList.remove('hidden');
            acceptSuggestionBtn.classList.add('hidden');
        } finally {
            isProcessing = false;
        }
    }

    // Debounced input handler
    storyContent.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(getSuggestion, 1000);
    });

    // Manual get suggestion button
    getSuggestionBtn.addEventListener('click', getSuggestion);

    // Accept suggestion
    acceptSuggestionBtn.addEventListener('click', function() {
        const currentText = storyContent.textContent;
        storyContent.textContent = currentText + ' ' + suggestion.textContent;
        suggestion.classList.add('hidden');
        acceptSuggestionBtn.classList.add('hidden');
        updateWordCount();
    });

    // Clear all content
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all content?')) {
            storyContent.textContent = '';
            suggestion.textContent = '';
            suggestion.classList.add('hidden');
            acceptSuggestionBtn.classList.add('hidden');
            document.getElementById('storyTitle').value = '';
            languageSelect.value = 'English';
            updateWordCount();
        }
    });

    // Handle category and language changes
    storyCategory.addEventListener('change', getSuggestion);
    languageSelect.addEventListener('change', getSuggestion);
});