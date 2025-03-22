/**
 * tournamentView.js - eFootball Tournament Manager
 * View module for rendering and managing tournament-wide components
 */

const TournamentView = (function() {
    // Private properties
    let _tournamentController = null;
    let _groupController = null;
    let _knockoutController = null;
    let _matchController = null;
    
    // DOM element references
    let _welcomeScreen = null;
    let _setupScreen = null;
    let _viewScreen = null;
    let _tournamentNameDisplay = null;
    let _groupStageBtn = null;
    let _knockoutStageBtn = null;
    let _groupStageContent = null;
    let _knockoutStageContent = null;
    
    // Current state
    let _currentScreen = 'welcome';

    /**
     * Initialize the tournament view
     * @param {Object} tournamentController - Reference to the tournament controller
     * @param {Object} groupController - Reference to the group controller
     * @param {Object} knockoutController - Reference to the knockout controller
     * @param {Object} matchController - Reference to the match controller
     */
    function init(tournamentController, groupController, knockoutController, matchController) {
        _tournamentController = tournamentController;
        _groupController = groupController;
        _knockoutController = knockoutController;
        _matchController = matchController;
        
        // Get DOM elements
        _welcomeScreen = document.getElementById('welcomeScreen');
        _setupScreen = document.getElementById('tournamentSetupScreen');
        _viewScreen = document.getElementById('tournamentViewScreen');
        _tournamentNameDisplay = document.getElementById('tournamentDisplayName');
        _groupStageBtn = document.getElementById('groupStageBtn');
        _knockoutStageBtn = document.getElementById('knockoutStageBtn');
        _groupStageContent = document.getElementById('groupStageContent');
        _knockoutStageContent = document.getElementById('knockoutStageContent');
        
        // Initialize other views if they exist
        if (typeof GroupView !== 'undefined') {
            GroupView.init(_groupController, _matchController, _tournamentController);
        }
        
        if (typeof KnockoutView !== 'undefined') {
            KnockoutView.init(_knockoutController, _matchController, _tournamentController);
        }
        
        if (typeof MatchView !== 'undefined') {
            MatchView.init(_matchController, _tournamentController);
        }
        
        // Add event listeners for tournament events
        if (_tournamentController) {
            _tournamentController.addEventListener('tournamentLoaded', _handleTournamentLoaded);
            _tournamentController.addEventListener('tournamentCreated', _handleTournamentCreated);
            _tournamentController.addEventListener('stageChanged', _handleStageChanged);
            _tournamentController.addEventListener('groupStageCompleted', _handleGroupStageCompleted);
            _tournamentController.addEventListener('tournamentCompleted', _handleTournamentCompleted);
        }
        
        // Add DOM event listeners
        _addEventListeners();
        
        // Load current tournament if available
        if (_tournamentController) {
            _tournamentController.loadCurrentTournament();
        }
    }

    /**
     * Add DOM event listeners
     * @private
     */
    function _addEventListeners() {
        // Welcome screen
        const createTournamentBtn = document.getElementById('createTournamentBtn');
        if (createTournamentBtn) {
            createTournamentBtn.addEventListener('click', _showSetupScreen);
        }
        
        // Setup screen
        const tournamentSetupForm = document.getElementById('tournamentSetupForm');
        if (tournamentSetupForm) {
            tournamentSetupForm.addEventListener('submit', _handleTournamentSetup);
        }
        
        const backToWelcomeBtn = document.getElementById('backToWelcomeBtn');
        if (backToWelcomeBtn) {
            backToWelcomeBtn.addEventListener('click', _showWelcomeScreen);
        }
        
        const numberOfGroupsSelect = document.getElementById('numberOfGroups');
        if (numberOfGroupsSelect) {
            numberOfGroupsSelect.addEventListener('change', _handleGroupCountChange);
        }
        
        // Navigation buttons
        if (_groupStageBtn) {
            _groupStageBtn.addEventListener('click', () => _showStageContent('group'));
        }
        
        if (_knockoutStageBtn) {
            _knockoutStageBtn.addEventListener('click', () => _showStageContent('knockout'));
        }
        
        // Tournament actions
        const newTournamentBtn = document.getElementById('newTournamentBtn');
        if (newTournamentBtn) {
            newTournamentBtn.addEventListener('click', _showSetupScreen);
        }
        
        const saveTournamentBtn = document.getElementById('saveTournamentBtn');
        if (saveTournamentBtn) {
            saveTournamentBtn.addEventListener('click', _saveTournament);
        }
        
        // About link
        const aboutLink = document.getElementById('aboutLink');
        if (aboutLink) {
            aboutLink.addEventListener('click', _showAboutModal);
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', _toggleTheme);
            
            // Set initial theme from storage
            const savedTheme = StorageUtil.getThemePreference();
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
        }
    }

    /**
     * Show welcome screen
     * @private
     */
    function _showWelcomeScreen() {
        _hideAllScreens();
        _welcomeScreen.classList.add('active');
        _currentScreen = 'welcome';
    }

    /**
     * Show tournament setup screen
     * @private
     */
    function _showSetupScreen() {
        _hideAllScreens();
        
        // Reset form
        const tournamentNameInput = document.getElementById('tournamentName');
        const numberOfGroupsSelect = document.getElementById('numberOfGroups');
        
        if (tournamentNameInput) tournamentNameInput.value = '';
        if (numberOfGroupsSelect) numberOfGroupsSelect.selectedIndex = 0;
        
        // Clear team inputs
        const teamsInputContainer = document.getElementById('teamsInputContainer');
        if (teamsInputContainer) teamsInputContainer.innerHTML = '';
        
        _setupScreen.classList.add('active');
        _currentScreen = 'setup';
    }

    /**
     * Show tournament view screen
     * @private
     */
    function _showViewScreen() {
        _hideAllScreens();
        _viewScreen.classList.add('active');
        _currentScreen = 'view';
        
        // Load current tournament data
        const tournament = _tournamentController.getCurrentTournament();
        
        // Set tournament name
        if (_tournamentNameDisplay && tournament) {
            _tournamentNameDisplay.textContent = tournament.name;
        }
        
        // Determine which stage to show
        const currentStage = _tournamentController.getCurrentStage();
        _showStageContent(currentStage === 'complete' ? 'knockout' : currentStage);
    }

    /**
     * Hide all screens
     * @private
     */
    function _hideAllScreens() {
        _welcomeScreen.classList.remove('active');
        _setupScreen.classList.remove('active');
        _viewScreen.classList.remove('active');
    }

    /**
     * Show group or knockout stage content
     * @param {string} stage - Stage to show ('group' or 'knockout')
     * @private
     */
    function _showStageContent(stage) {
        if (stage === 'group') {
            _groupStageBtn.classList.add('active');
            _knockoutStageBtn.classList.remove('active');
            _groupStageContent.classList.add('active');
            _knockoutStageContent.classList.remove('active');
            
            // Render group stage
            if (typeof GroupView !== 'undefined') {
                GroupView.render();
            }
        } else if (stage === 'knockout') {
            _groupStageBtn.classList.remove('active');
            _knockoutStageBtn.classList.add('active');
            _groupStageContent.classList.remove('active');
            _knockoutStageContent.classList.add('active');
            
            // Render knockout stage
            if (typeof KnockoutView !== 'undefined') {
                KnockoutView.render();
            }
        }
    }

    /**
     * Handle tournament setup form submission
     * @param {Event} event - Form submit event
     * @private
     */
    function _handleTournamentSetup(event) {
        event.preventDefault();
        
        // Get form data
        const tournamentName = document.getElementById('tournamentName').value;
        const numberOfGroups = parseInt(document.getElementById('numberOfGroups').value, 10);
        
        // Validate inputs
        if (!tournamentName || !numberOfGroups) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Collect team names
        const teams = [];
        const teamInputs = document.querySelectorAll('#teamsInputContainer input[type="text"]');
        
        teamInputs.forEach(input => {
            const teamName = input.value.trim();
            if (teamName) {
                teams.push(teamName);
            }
        });
        
        // Validate team count
        const requiredTeams = numberOfGroups * 4;
        if (teams.length !== requiredTeams) {
            alert(`You need to enter ${requiredTeams} team names (${numberOfGroups} groups × 4 teams)`);
            return;
        }
        
        // Create tournament
        if (_tournamentController) {
            const tournament = _tournamentController.createTournament({
                name: tournamentName,
                groupCount: numberOfGroups,
                teams: teams
            });
            
            if (tournament) {
                _showViewScreen();
            } else {
                alert('Failed to create tournament. Please try again.');
            }
        }
    }

    /**
     * Handle change in number of groups
     * @param {Event} event - Change event
     * @private
     */
    function _handleGroupCountChange(event) {
        const groupCount = parseInt(event.target.value, 10);
        const teamsInputContainer = document.getElementById('teamsInputContainer');
        
        if (!groupCount || !teamsInputContainer) return;
        
        // Clear existing inputs
        teamsInputContainer.innerHTML = '';
        
        // Calculate number of teams needed
        const teamsCount = groupCount * 4;
        
        // Create group team inputs
        for (let i = 0; i < groupCount; i++) {
            const groupLetter = String.fromCharCode(65 + i); // A, B, C, etc.
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-teams-inputs';
            groupDiv.innerHTML = `<h3>Group ${groupLetter}</h3>`;
            
            // Create 4 team inputs per group
            for (let j = 0; j < 4; j++) {
                const teamIndex = (i * 4) + j;
                const teamNumber = teamIndex + 1;
                
                const teamInputRow = document.createElement('div');
                teamInputRow.className = 'team-input-row';
                teamInputRow.innerHTML = `
                    <label for="team_${teamIndex}">Team ${teamNumber}:</label>
                    <input type="text" id="team_${teamIndex}" name="team_${teamIndex}" required placeholder="Enter team name">
                `;
                
                groupDiv.appendChild(teamInputRow);
            }
            
            teamsInputContainer.appendChild(groupDiv);
        }
        
        // Add animation classes
        const groupDivs = teamsInputContainer.querySelectorAll('.group-teams-inputs');
        groupDivs.forEach((div, index) => {
            div.classList.add('animate-fade-in-up');
            div.style.animationDelay = `${index * 0.1}s`;
        });
    }

    /**
     * Save current tournament
     * @private
     */
    function _saveTournament() {
        if (_tournamentController) {
            const success = _tournamentController.saveTournament();
            
            if (success) {
                alert('Tournament saved successfully');
            } else {
                alert('Failed to save tournament. Please try again.');
            }
        }
    }

    /**
     * Toggle light/dark theme
     * @private
     */
    function _toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Save theme preference
        StorageUtil.saveThemePreference(newTheme);
    }

    /**
     * Show about modal
     * @private
     */
    function _showAboutModal() {
        // Create modal if it doesn't exist
        let aboutModal = document.getElementById('aboutModal');
        
        if (!aboutModal) {
            aboutModal = document.createElement('div');
            aboutModal.id = 'aboutModal';
            aboutModal.className = 'modal';
            
            aboutModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h3>About eFootball Tournament Manager</h3>
                    <div class="about-content">
                        <p>eFootball Tournament Manager is a tool for creating and managing tournaments for eFootball 2025.</p>
                        <p>Create professional tournaments with group stages and knockout rounds, track results, and determine champions.</p>
                        <p>Version: 1.0.0</p>
                        <p>Website: <a href="https://efootballtournament.com" target="_blank">efootballtournament.com</a></p>
                        <p>&copy; 2025 eFootball Tournament Manager</p>
                    </div>
                </div>
            `;
            
            document.body.appendChild(aboutModal);
            
            // Add event listener for close button
            const closeBtn = aboutModal.querySelector('.close-modal');
            closeBtn.addEventListener('click', () => {
                aboutModal.classList.remove('active');
            });
            
            // Close modal when clicking outside content
            aboutModal.addEventListener('click', (event) => {
                if (event.target === aboutModal) {
                    aboutModal.classList.remove('active');
                }
            });
        }
        
        // Show modal
        aboutModal.classList.add('active');
    }

    /**
     * Handle tournament loaded event
     * @param {Object} tournament - Loaded tournament
     * @private
     */
    function _handleTournamentLoaded(tournament) {
        if (tournament) {
            _showViewScreen();
        }
    }

    /**
     * Handle tournament created event
     * @param {Object} tournament - Created tournament
     * @private
     */
    function _handleTournamentCreated(tournament) {
        if (tournament) {
            _showViewScreen();
        }
    }

    /**
     * Handle stage changed event
     * @param {Object} data - Event data
     * @private
     */
    function _handleStageChanged(data) {
        if (_currentScreen === 'view') {
            _showStageContent(data.newStage);
            
            // Enable/disable knockout button based on stage
            if (_knockoutStageBtn) {
                if (data.newStage === 'group') {
                    _knockoutStageBtn.disabled = true;
                } else {
                    _knockoutStageBtn.disabled = false;
                }
            }
        }
    }

    /**
     * Handle group stage completed event
     * @private
     */
    function _handleGroupStageCompleted() {
        // Switch to knockout stage view
        _showStageContent('knockout');
        
        // Show celebration/notification
        _showStageCompletionNotification('Group stage completed! Knockout stage has been generated.');
    }

    /**
     * Handle tournament completed event
     * @param {Object} data - Event data with winner information
     * @private
     */
    function _handleTournamentCompleted(data) {
        if (data.winner) {
            // Show winner notification
            _showStageCompletionNotification(`Tournament completed! ${data.winner.name} is the champion!`, 'winner');
        }
    }

    /**
     * Show notification for stage completion
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('winner' or 'stage')
     * @private
     */
    function _showStageCompletionNotification(message, type = 'stage') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `stage-notification ${type === 'winner' ? 'winner-notification' : ''}`;
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Add animation
        setTimeout(() => {
            notification.classList.add('active');
        }, 100);
        
        // Add event listener for close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('active');
            
            // Remove after animation
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        });
        
        // Auto-hide after some time
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('active');
                
                // Remove after animation
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, 5000);
    }

    /**
     * Render tournament statistics
     * @param {HTMLElement} container - Container element
     */
    function renderTournamentStats(container) {
        if (!_tournamentController || !container) return;
        
        const stats = _tournamentController.getTournamentStats();
        
        if (!stats) {
            container.innerHTML = '<div class="empty-state">No tournament statistics available</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="tournament-stats">
                <div class="stats-header">
                    <h3>Tournament Statistics</h3>
                </div>
                <div class="stats-content">
                    <div class="stat-item">
                        <div class="stat-label">Progress</div>
                        <div class="stat-value">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${stats.progress}%"></div>
                            </div>
                            <span>${stats.progress}%</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Teams</div>
                        <div class="stat-value">${stats.teamsCount}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Matches</div>
                        <div class="stat-value">${stats.matchesPlayed} / ${stats.matchesTotal}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Goals</div>
                        <div class="stat-value">${stats.goalsTotal} (${stats.goalsAverage} per match)</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Current Stage</div>
                        <div class="stat-value">${_formatStageName(stats.currentStage)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format stage name for display
     * @param {string} stage - Stage name
     * @returns {string} - Formatted stage name
     * @private
     */
    function _formatStageName(stage) {
        switch (stage) {
            case 'group':
                return 'Group Stage';
            case 'knockout':
                return 'Knockout Stage';
            case 'complete':
                return 'Completed';
            default:
                return 'Setup';
        }
    }

    // Return public API
    return {
        init,
        renderTournamentStats
    };
})();
