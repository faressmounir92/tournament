/**
 * app.js - eFootball Tournament Manager
 * Main application script that initializes and connects all components
 */

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing eFootball Tournament Manager...');
    
    // Check if local storage is available
    if (!StorageUtil.isStorageAvailable()) {
        alert('Warning: Local storage is not available. Your tournament data will not be saved between sessions.');
    }
    
    // Initialize controllers (order matters for dependency injection)
    
    // 1. Initialize the tournament controller first as other controllers depend on it
    console.log('Initializing TournamentController...');
    
    // Wait for dependant controller initializations
    setTimeout(() => {
        // 2. Initialize supporting controllers
        console.log('Initializing GroupController...');
        GroupController.init(TournamentController);
        
        console.log('Initializing KnockoutController...');
        KnockoutController.init(TournamentController);
        
        console.log('Initializing MatchController...');
        MatchController.init(TournamentController, GroupController, KnockoutController);
        
        // 3. Now that all controllers are initialized, complete tournament controller init
        TournamentController.init(GroupController, MatchController, KnockoutController);
        
        // 4. Initialize views
        console.log('Initializing views...');
        TournamentView.init(TournamentController, GroupController, KnockoutController, MatchController);
        
        // 5. Load saved theme preference
        loadThemePreference();
        
        console.log('eFootball Tournament Manager initialized successfully!');
    }, 0);
    
    // Add global event listeners
    addGlobalEventListeners();
});

/**
 * Load saved theme preference
 */
function loadThemePreference() {
    const theme = StorageUtil.getThemePreference();
    if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
        console.log(`Applied saved theme preference: ${theme}`);
    } else {
        // Check if user prefers dark mode at system level
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            StorageUtil.saveThemePreference('dark');
            console.log('Applied dark theme based on system preference');
        }
    }
}

/**
 * Add global event listeners
 */
function addGlobalEventListeners() {
    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            // Only change theme automatically if user hasn't set a preference
            if (!StorageUtil.getThemePreference()) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                console.log(`Theme changed to ${newTheme} based on system preference`);
            }
        });
    }
    
    // Handle unload event to save current state
    window.addEventListener('beforeunload', function() {
        // Ensure tournament is saved before leaving
        if (TournamentController && TournamentController.getCurrentTournament()) {
            TournamentController.saveTournament();
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + S to save tournament
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (TournamentController && TournamentController.getCurrentTournament()) {
                TournamentController.saveTournament();
                showNotification('Tournament saved successfully!');
            }
        }
    });
}

/**
 * Show a temporary notification
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.app-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'app-notification';
        document.body.appendChild(notification);
    }
    
    // Clear existing timeouts and classes
    if (notification.timeout) {
        clearTimeout(notification.timeout);
    }
    
    notification.className = 'app-notification';
    notification.classList.add(type, 'active');
    notification.innerHTML = message;
    
    // Hide after 3 seconds
    notification.timeout = setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

/**
 * Custom error handler
 */
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Application error:', error);
    
    // Show user-friendly error message
    showNotification('An error occurred. Please try again or refresh the page.', 'error');
    
    // Log more details to console
    if (error && error.stack) {
        console.error('Error stack:', error.stack);
    }
    
    return true; // Prevent default browser error handling
};
