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
        removeExistingSuggestions(); // Clear suggestions when user types
        updateWordCount(); // Update word count immediately on input
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(getSuggestion, 1000);
    });

    // Function to get AI suggestion
    async function getSuggestion() {
        if (isProcessing) return;
        
        const content = storyContent.textContent.trim();
        const category = storyCategory.value;
        const language = languageSelect.value;
        const title = document.getElementById('storyTitle').value.trim();
        const apiKey = apiKeyInput.value.trim();
        
        // Remove any existing suggestions (including loading/error messages) before adding new ones
        removeExistingSuggestions();
        
        if (!apiKey) {
            appendSuggestion('Please enter your Google AI API key in settings', 'error');
            return;
        }
        
        // Only show "Start writing..." if the editor is completely empty (no text and no hidden elements like <br>)
        if (!content && storyContent.innerHTML.trim() === '') {
            appendSuggestion('Start writing to get suggestions...', 'info');
            return;
        }

        try {
            isProcessing = true;
            appendSuggestion('Getting suggestion...', 'loading');

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
            
            // Remove loading message after fetching data
            removeExistingSuggestions();
            
            if (data.isLanguageSupported) {
                appendSuggestion(data.suggestion, 'suggestion');
            } else {
                appendSuggestion('Language not supported', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            removeExistingSuggestions(); // Remove any previous loading/info messages
            appendSuggestion(`Error: ${error.message || 'Failed to get suggestion. Please try again.'}`, 'error');
        } finally {
            isProcessing = false;
        }
    }

    // Helper function to remove all suggestion-related spans
    function removeExistingSuggestions() {
        const suggestions = storyContent.getElementsByClassName('suggestion-text');
        while (suggestions.length > 0) {
            suggestions[0].remove();
        }
    }

    // Helper function to append suggestions inline at the current cursor position
    function appendSuggestion(text, type) {
        const suggestionContainerSpan = document.createElement('span');
        suggestionContainerSpan.className = `suggestion-text ${type}`;
        suggestionContainerSpan.contentEditable = 'false'; // The whole container is not editable

        // Create the span for the suggestion text itself
        const suggestionContentSpan = document.createElement('span');
        suggestionContentSpan.textContent = text;
        suggestionContentSpan.className = 'suggestion-content'; // To identify the text part
        suggestionContainerSpan.appendChild(suggestionContentSpan);

        // Only add an accept button if the type is 'suggestion'
        if (type === 'suggestion') {
            // Add a space before the button if the suggestion text exists and doesn't end with space/newline
            if (text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')) {
                suggestionContainerSpan.appendChild(document.createTextNode(' '));
            }

            const acceptButton = document.createElement('button'); // Changed to BUTTON element
            acceptButton.textContent = 'Accept';
            acceptButton.className = 'accept-suggestion-btn'; // Class to identify the button
            acceptButton.type = 'button'; // Prevent form submission if editor is inside a form
            
            suggestionContainerSpan.appendChild(acceptButton);
        }

        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Ensure the range is within storyContent before inserting
            if (!storyContent.contains(range.commonAncestorContainer)) {
                // If selection is outside storyContent (e.g., clicked elsewhere), append to end
                storyContent.appendChild(suggestionContainerSpan);
                range.selectNodeContents(storyContent);
                range.collapse(false); // Move cursor to end
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Collapse the range to the end point to insert at cursor
                range.collapse(false); 
                range.insertNode(suggestionContainerSpan);

                // After insertion, move the cursor back *before* the inserted suggestion
                // so the user can continue typing normally before the suggestion, or click it.
                range.setStartBefore(suggestionContainerSpan); // Set start point before the newly inserted span
                range.collapse(true); // Collapse the range to that point
                selection.removeAllRanges();
                selection.addRange(range);
                storyContent.focus(); // Ensure the editor has focus
            }
        } else {
            // Fallback: if no selection/range (e.g., editor just loaded, or no focus), append to end
            storyContent.appendChild(suggestionContainerSpan);
            // Cursor placement for fallback
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(storyContent);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            storyContent.focus();
        }
        updateWordCount(); // Update word count after adding suggestion (will exclude it)
    }

    // Modified event listener for handling suggestion acceptance
    storyContent.addEventListener('click', function(e) {
        if (e.target.classList.contains('accept-suggestion-btn')) {
            const clickedElement = e.target;
            const suggestionContainerSpan = clickedElement.closest('.suggestion-text');
            
            if (suggestionContainerSpan) {
                const suggestionContentSpan = suggestionContainerSpan.querySelector('.suggestion-content');
                if (suggestionContentSpan) {
                    const suggestionText = suggestionContentSpan.textContent;
                    const parent = suggestionContainerSpan.parentNode;

                    const newTextNode = document.createTextNode(suggestionText);
                    
                    parent.replaceChild(newTextNode, suggestionContainerSpan);
                    
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.setStartAfter(newTextNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    storyContent.focus();

                    updateWordCount();
                }
            }
        }
    });

    // Manual get suggestion button
    getSuggestionBtn.addEventListener('click', function() {
        removeExistingSuggestions(); // Clear existing suggestions before getting new ones
        getSuggestion();
    });

    // Clear all content
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all content?')) {
            storyContent.innerHTML = ''; // Clear all HTML content to remove any hidden nodes
            document.getElementById('storyTitle').value = '';
            languageSelect.value = 'English';
            updateWordCount();
            storyContent.focus(); // Put focus back on the editor
        }
    });

    // Handle category and language changes
    storyCategory.addEventListener('change', function() {
        removeExistingSuggestions(); // Clear existing suggestions
        getSuggestion();
    });
    languageSelect.addEventListener('change', function() {
        removeExistingSuggestions(); // Clear existing suggestions
        getSuggestion();
    });
});