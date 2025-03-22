/**
 * groupView.js - eFootball Tournament Manager
 * View module for rendering and managing group stage components
 */

const GroupView = (function() {
    // Private properties
    let _groupController = null;
    let _matchController = null;
    let _tournamentController = null;
    
    // DOM element references
    let _groupsContainer = null;
    let _matchesList = null;
    let _matchdayTabs = null;
    
    // Current state
    let _currentMatchday = 1;
    
    // Templates
    const _templates = {
        // Group card template
        groupCard: (group) => `
            <div class="group-card animate-fade-in-up staggered-item" data-group-id="${group.id}">
                <div class="group-header">Group ${group.name}</div>
                <table class="group-standings">
                    <thead>
                        <tr>
                            <th class="team-rank">#</th>
                            <th class="team-name">Team</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GF</th>
                            <th>GA</th>
                            <th>GD</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_generateStandingsRows(group)}
                    </tbody>
                </table>
            </div>
        `,
        
        // Match card template
        matchCard: (match, group) => `
            <div class="match-card animate-fade-in staggered-item" data-match-id="${match.id}">
                <div class="match-header">
                    <span>Group ${group} - Matchday ${match.matchday}</span>
                    <span>${_formatMatchDate(match.date)}</span>
                </div>
                <div class="match-teams">
                    <div class="match-team">
                        <div class="team-name">${match.homeTeam.name}</div>
                    </div>
                    <div class="match-score">
                        ${_formatMatchScore(match)}
                    </div>
                    <div class="match-team">
                        <div class="team-name">${match.awayTeam.name}</div>
                    </div>
                </div>
                <div class="match-status">${match.played ? 'Completed' : 'Scheduled'}</div>
                <div class="match-actions">
                    <button class="btn btn-match-result ${match.played ? 'btn-secondary' : 'btn-primary'}" data-match-id="${match.id}">
                        ${match.played ? 'Edit Result' : 'Enter Result'}
                    </button>
                </div>
            </div>
        `,
        
        // Matchday tab template
        matchdayTab: (matchday, isActive) => `
            <div class="matchday-tab ${isActive ? 'active' : ''}" data-matchday="${matchday}">
                Matchday ${matchday}
            </div>
        `,
        
        // Empty state template
        emptyState: (message) => `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `
    };

    /**
     * Initialize the group view
     * @param {Object} groupController - Reference to the group controller
     * @param {Object} matchController - Reference to the match controller
     * @param {Object} tournamentController - Reference to the tournament controller
     */
    function init(groupController, matchController, tournamentController) {
        _groupController = groupController;
        _matchController = matchController;
        _tournamentController = tournamentController;
        
        // Get DOM elements
        _groupsContainer = document.getElementById('groupsContainer');
        _matchesList = document.getElementById('matchesList');
        _matchdayTabs = document.getElementById('matchdayTabs');
        
        // Add event listeners
        if (_tournamentController) {
            _tournamentController.addEventListener('tournamentLoaded', _handleTournamentLoaded);
            _tournamentController.addEventListener('tournamentCreated', _handleTournamentLoaded);
            _tournamentController.addEventListener('matchUpdated', _handleMatchUpdated);
            _tournamentController.addEventListener('stageChanged', _handleStageChanged);
        }
        
        // Add DOM event listeners
        document.addEventListener('click', _handleDocumentClick);
    }

    /**
     * Render all group view components
     */
    function render() {
        if (!_groupController) return;
        
        renderGroups();
        renderMatchdayTabs();
        renderMatches();
    }

    /**
     * Render group standings
     */
    function renderGroups() {
        if (!_groupsContainer) return;
        
        // Clear existing content
        _groupsContainer.innerHTML = '';
        
        const groups = _groupController.getGroups();
        
        if (groups.length === 0) {
            _groupsContainer.innerHTML = _templates.emptyState('No groups available');
            return;
        }
        
        // Create group cards
        let groupCardsHTML = '';
        
        groups.forEach(group => {
            groupCardsHTML += _templates.groupCard(group);
        });
        
        _groupsContainer.innerHTML = groupCardsHTML;
        
        // Add animation classes to staggered items
        setTimeout(() => {
            const groupCards = _groupsContainer.querySelectorAll('.group-card');
            groupCards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
            });
        }, 0);
    }

    /**
     * Render matchday tabs
     */
    function renderMatchdayTabs() {
        if (!_matchdayTabs) return;
        
        // Clear existing content
        _matchdayTabs.innerHTML = '';
        
        // Create matchday tabs (standard group stage has 3 matchdays)
        for (let i = 1; i <= 3; i++) {
            const isActive = i === _currentMatchday;
            _matchdayTabs.innerHTML += _templates.matchdayTab(i, isActive);
        }
        
        // Add event listeners to tabs
        const tabs = _matchdayTabs.querySelectorAll('.matchday-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const matchday = parseInt(tab.dataset.matchday, 10);
                _setCurrentMatchday(matchday);
            });
        });
    }

    /**
     * Render matches for the current matchday
     */
    function renderMatches() {
        if (!_matchesList) return;
        
        // Clear existing content
        _matchesList.innerHTML = '';
        
        if (!_groupController) {
            _matchesList.innerHTML = _templates.emptyState('No matches available');
            return;
        }
        
        // Get matches for current matchday
        const matchdayMatches = _groupController.getMatchesByMatchday(_currentMatchday);
        
        if (matchdayMatches.length === 0) {
            _matchesList.innerHTML = _templates.emptyState(`No matches found for Matchday ${_currentMatchday}`);
            return;
        }
        
        // Create match cards
        let matchCardsHTML = '';
        
        matchdayMatches.forEach(groupMatches => {
            groupMatches.matches.forEach(match => {
                matchCardsHTML += _templates.matchCard(match, groupMatches.group);
            });
        });
        
        _matchesList.innerHTML = matchCardsHTML;
        
        // Add animation classes to staggered items
        setTimeout(() => {
            const matchCards = _matchesList.querySelectorAll('.match-card');
            matchCards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
            });
        }, 0);
    }

    /**
     * Update a specific match card
     * @param {string} matchId - ID of the match to update
     */
    function updateMatchCard(matchId) {
        if (!_matchesList) return;
        
        const matchCard = _matchesList.querySelector(`[data-match-id="${matchId}"]`);
        if (!matchCard) return;
        
        const match = _matchController.getMatchById(matchId);
        if (!match) return;
        
        // Find group info
        let groupName = '';
        const groups = _groupController.getGroups();
        
        for (const group of groups) {
            if (group.id === match.group) {
                groupName = group.name;
                break;
            }
        }
        
        // Update match card
        matchCard.outerHTML = _templates.matchCard(match, groupName);
        
        // Add animation
        const newCard = _matchesList.querySelector(`[data-match-id="${matchId}"]`);
        if (newCard) {
            newCard.classList.add('score-flash');
        }
    }

    /**
     * Update a specific group card
     * @param {string} groupId - ID of the group to update
     */
    function updateGroupCard(groupId) {
        if (!_groupsContainer) return;
        
        const groupCard = _groupsContainer.querySelector(`[data-group-id="${groupId}"]`);
        if (!groupCard) return;
        
        const group = _groupController.getGroupById(groupId);
        if (!group) return;
        
        // Update group card
        groupCard.outerHTML = _templates.groupCard(group);
        
        // Add animation
        const newCard = _groupsContainer.querySelector(`[data-group-id="${groupId}"]`);
        if (newCard) {
            newCard.classList.add('animate-pulse');
            setTimeout(() => {
                newCard.classList.remove('animate-pulse');
            }, 2000);
        }
    }

    /**
     * Set the current matchday and update display
     * @param {number} matchday - Matchday number
     */
    function _setCurrentMatchday(matchday) {
        if (matchday >= 1 && matchday <= 3) {
            _currentMatchday = matchday;
            
            // Update UI
            const tabs = _matchdayTabs.querySelectorAll('.matchday-tab');
            tabs.forEach(tab => {
                const tabMatchday = parseInt(tab.dataset.matchday, 10);
                if (tabMatchday === matchday) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // Update controller
            if (_groupController) {
                _groupController.setCurrentMatchday(matchday);
            }
            
            // Render matches for new matchday
            renderMatches();
        }
    }

    /**
     * Format match date for display
     * @param {Date} date - Match date
     * @returns {string} - Formatted date string
     * @private
     */
    function _formatMatchDate(date) {
        if (!date) return '';
        
        const matchDate = new Date(date);
        
        const options = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return matchDate.toLocaleDateString(undefined, options);
    }

    /**
     * Format match score for display
     * @param {Object} match - Match object
     * @returns {string} - HTML string for match score
     * @private
     */
    function _formatMatchScore(match) {
        if (!match.played) {
            return '<span class="score-divider">vs</span>';
        }
        
        return `
            <span class="score-value">${match.homeScore}</span>
            <span class="score-divider">:</span>
            <span class="score-value">${match.awayScore}</span>
        `;
    }

    /**
     * Generate table rows for group standings
     * @param {Object} group - Group object
     * @returns {string} - HTML string for standings rows
     * @private
     */
    function _generateStandingsRows(group) {
        if (!group.standings || group.standings.length === 0) {
            return '<tr><td colspan="10">No standings data</td></tr>';
        }
        
        let rowsHTML = '';
        
        group.standings.forEach((team, index) => {
            // Determine row class based on qualification
            let rowClass = '';
            if (team.qualified && !team.bestThird) {
                rowClass = 'qualified';
            } else if (team.bestThird) {
                rowClass = 'best-third';
            }
            
            rowsHTML += `
                <tr class="${rowClass}">
                    <td class="team-rank">${index + 1}</td>
                    <td class="team-name">${team.name}</td>
                    <td>${team.played}</td>
                    <td>${team.won}</td>
                    <td>${team.drawn}</td>
                    <td>${team.lost}</td>
                    <td>${team.goalsFor}</td>
                    <td>${team.goalsAgainst}</td>
                    <td>${team.goalDifference}</td>
                    <td class="team-points">${team.points}</td>
                </tr>
            `;
        });
        
        return rowsHTML;
    }

    /**
     * Show the match result modal for entering/editing results
     * @param {string} matchId - ID of the match
     * @private
     */
    function _showMatchResultModal(matchId) {
        const match = _matchController.getMatchById(matchId);
        if (!match) return;
        
        // Get modal elements
        const modal = document.getElementById('matchResultModal');
        if (!modal) {
            console.error('Match result modal not found');
            return;
        }
        
        const homeTeamName = document.getElementById('homeTeamName');
        const awayTeamName = document.getElementById('awayTeamName');
        const homeTeamScore = document.getElementById('homeTeamScore');
        const awayTeamScore = document.getElementById('awayTeamScore');
        const saveResultBtn = document.getElementById('saveResultBtn');
        
        // Set values
        homeTeamName.textContent = match.homeTeam.name;
        awayTeamName.textContent = match.awayTeam.name;
        homeTeamScore.value = match.played ? match.homeScore : 0;
        awayTeamScore.value = match.played ? match.awayScore : 0;
        
        // Set match ID on save button
        saveResultBtn.dataset.matchId = matchId;
        
        // Show modal
        modal.classList.add('active');
        
        // Focus on home team score input
        homeTeamScore.focus();
        homeTeamScore.select();
    }

    /**
     * Save match result from modal
     * @private
     */
    function _saveMatchResult() {
        const saveResultBtn = document.getElementById('saveResultBtn');
        const matchId = saveResultBtn.dataset.matchId;
        
        if (!matchId) return;
        
        const homeTeamScore = document.getElementById('homeTeamScore');
        const awayTeamScore = document.getElementById('awayTeamScore');
        
        // Validate input
        const homeScore = parseInt(homeTeamScore.value, 10);
        const awayScore = parseInt(awayTeamScore.value, 10);
        
        if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
            alert('Please enter valid scores (non-negative numbers)');
            return;
        }
        
        // Update match result
        if (_matchController) {
            const success = _matchController.updateMatchResult(matchId, homeScore, awayScore);
            
            if (success) {
                // Close modal
                const modal = document.getElementById('matchResultModal');
                if (modal) {
                    modal.classList.remove('active');
                }
            } else {
                alert('Failed to update match result. Please try again.');
            }
        }
    }

    /**
     * Close the match result modal
     * @private
     */
    function _closeMatchResultModal() {
        const modal = document.getElementById('matchResultModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Handle document click events
     * @param {Event} event - Click event
     * @private
     */
    function _handleDocumentClick(event) {
        // Match result button click
        if (event.target.classList.contains('btn-match-result')) {
            const matchId = event.target.dataset.matchId;
            if (matchId) {
                _showMatchResultModal(matchId);
            }
            return;
        }
        
        // Save result button click
        if (event.target.id === 'saveResultBtn') {
            _saveMatchResult();
            return;
        }
        
        // Close modal button click
        if (event.target.classList.contains('close-modal')) {
            _closeMatchResultModal();
            return;
        }
        
        // Close modal on background click
        if (event.target.classList.contains('modal')) {
            _closeMatchResultModal();
            return;
        }
    }

    /**
     * Handle tournament loaded event
     * @private
     */
    function _handleTournamentLoaded() {
        render();
    }

    /**
     * Handle match updated event
     * @param {Object} data - Event data
     * @private
     */
    function _handleMatchUpdated(data) {
        if (data.groupId) {
            // Update group standings
            updateGroupCard(data.groupId);
        }
        
        if (data.matchId) {
            // Update match card
            updateMatchCard(data.matchId);
        }
    }

    /**
     * Handle stage changed event
     * @param {Object} data - Event data
     * @private
     */
    function _handleStageChanged(data) {
        if (data.newStage === 'group') {
            render();
        }
    }

    // Return public API
    return {
        init,
        render,
        renderGroups,
        renderMatchdayTabs,
        renderMatches,
        updateMatchCard,
        updateGroupCard
    };
})();
