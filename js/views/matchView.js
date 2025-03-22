/**
 * matchView.js - eFootball Tournament Manager
 * View module for rendering and managing individual match components
 */

const MatchView = (function() {
    // Private properties
    let _matchController = null;
    let _tournamentController = null;
    
    // DOM element references for match result modal
    let _resultModal = null;
    let _homeTeamName = null;
    let _awayTeamName = null;
    let _homeTeamScore = null;
    let _awayTeamScore = null;
    let _saveResultBtn = null;
    
    // Templates
    const _templates = {
        // Standard match card template
        matchCard: (match, group = null) => `
            <div class="match-card animate-fade-in" data-match-id="${match.id}">
                <div class="match-header">
                    ${_generateMatchHeader(match, group)}
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
                <div class="match-status">${_formatMatchStatus(match)}</div>
                <div class="match-actions">
                    <button class="btn btn-match-result ${match.played ? 'btn-secondary' : 'btn-primary'}" data-match-id="${match.id}">
                        ${match.played ? 'Edit Result' : 'Enter Result'}
                    </button>
                </div>
            </div>
        `,
        
        // Compact match card (for lists and dashboard)
        compactMatchCard: (match) => `
            <div class="match-card-compact" data-match-id="${match.id}">
                <div class="match-info">
                    <div class="match-context">${_getMatchContext(match)}</div>
                    <div class="match-date">${_formatMatchDate(match.date, false)}</div>
                </div>
                <div class="match-result">
                    <div class="team home-team">
                        <span class="team-name">${match.homeTeam.name}</span>
                    </div>
                    <div class="score">
                        ${match.played ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                    </div>
                    <div class="team away-team">
                        <span class="team-name">${match.awayTeam.name}</span>
                    </div>
                </div>
                ${match.played ? _generateMatchHighlights(match) : ''}
            </div>
        `,
        
        // Match details view (expanded information)
        matchDetails: (match) => `
            <div class="match-details-container">
                <div class="match-details-header">
                    <h3>${_getMatchContext(match)}</h3>
                    <div class="match-date-time">${_formatMatchDate(match.date)}</div>
                </div>
                
                <div class="match-details-teams">
                    <div class="match-team home-team">
                        <div class="team-name">${match.homeTeam.name}</div>
                        ${match.played ? `<div class="team-score">${match.homeScore}</div>` : ''}
                    </div>
                    
                    ${!match.played ? '<div class="match-vs">vs</div>' : ''}
                    
                    <div class="match-team away-team">
                        <div class="team-name">${match.awayTeam.name}</div>
                        ${match.played ? `<div class="team-score">${match.awayScore}</div>` : ''}
                    </div>
                </div>
                
                ${match.played ? _generateDetailedResults(match) : ''}
                
                <div class="match-actions">
                    <button class="btn btn-match-result ${match.played ? 'btn-secondary' : 'btn-primary'}" data-match-id="${match.id}">
                        ${match.played ? 'Edit Result' : 'Enter Result'}
                    </button>
                </div>
            </div>
        `,
        
        // Match list item
        matchListItem: (match) => `
            <div class="match-list-item ${match.played ? 'completed' : ''}" data-match-id="${match.id}">
                <div class="match-list-context">${_getMatchContext(match)}</div>
                <div class="match-list-teams">
                    <span class="team-name home-team">${match.homeTeam.name}</span>
                    <span class="match-score">${match.played ? `${match.homeScore} - ${match.awayScore}` : 'vs'}</span>
                    <span class="team-name away-team">${match.awayTeam.name}</span>
                </div>
                <div class="match-list-date">${_formatMatchDate(match.date, false)}</div>
                <div class="match-list-status">${match.played ? 'Completed' : 'Scheduled'}</div>
            </div>
        `,
        
        // Extra time details
        extraTime: (match) => `
            <div class="extra-time-details">
                <div class="extra-time-header">Extra Time</div>
                <div class="extra-time-score">
                    <span class="home-score">${match.extraTime.homeScore}</span>
                    <span class="score-divider">:</span>
                    <span class="away-score">${match.extraTime.awayScore}</span>
                </div>
            </div>
        `,
        
        // Penalty shootout details
        penalties: (match) => `
            <div class="penalty-details">
                <div class="penalty-header">Penalties</div>
                <div class="penalty-score">
                    <span class="home-score">${match.penalties.homeScore}</span>
                    <span class="score-divider">:</span>
                    <span class="away-score">${match.penalties.awayScore}</span>
                </div>
            </div>
        `
    };

    /**
     * Initialize the match view
     * @param {Object} matchController - Reference to the match controller
     * @param {Object} tournamentController - Reference to the tournament controller
     */
    function init(matchController, tournamentController) {
        _matchController = matchController;
        _tournamentController = tournamentController;
        
        // Get DOM elements for match result modal
        _resultModal = document.getElementById('matchResultModal');
        
        if (_resultModal) {
            _homeTeamName = document.getElementById('homeTeamName');
            _awayTeamName = document.getElementById('awayTeamName');
            _homeTeamScore = document.getElementById('homeTeamScore');
            _awayTeamScore = document.getElementById('awayTeamScore');
            _saveResultBtn = document.getElementById('saveResultBtn');
            
            // Add event listeners for modal
            const closeModalBtn = _resultModal.querySelector('.close-modal');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', _closeResultModal);
            }
            
            if (_saveResultBtn) {
                _saveResultBtn.addEventListener('click', _saveMatchResult);
            }
            
            // Close modal when clicking outside content
            _resultModal.addEventListener('click', (event) => {
                if (event.target === _resultModal) {
                    _closeResultModal();
                }
            });
        }
        
        // Add event listeners for tournament events
        if (_tournamentController) {
            _tournamentController.addEventListener('matchUpdated', _handleMatchUpdated);
        }
        
        // Attach global event listener for match result buttons
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-match-result')) {
                const matchId = event.target.dataset.matchId;
                if (matchId) {
                    showMatchResultModal(matchId);
                }
            }
        });
    }

    /**
     * Render a match card
     * @param {string} matchId - ID of the match to render
     * @param {HTMLElement} container - Container element to render into
     * @param {string} style - Style of match card ('standard', 'compact', 'detailed', 'list')
     */
    function renderMatch(matchId, container, style = 'standard') {
        if (!_matchController || !container) return;
        
        const match = _matchController.getMatchById(matchId);
        if (!match) return;
        
        let html = '';
        let group = null;
        
        // Get group name if applicable
        if (match.group) {
            // Find the group this match belongs to
            const tournament = _tournamentController.getCurrentTournament();
            if (tournament && tournament.groups) {
                const matchGroup = tournament.groups.find(g => g.id === match.group);
                if (matchGroup) {
                    group = matchGroup.name;
                }
            }
        }
        
        // Render based on style
        switch (style) {
            case 'compact':
                html = _templates.compactMatchCard(match);
                break;
            case 'detailed':
                html = _templates.matchDetails(match);
                break;
            case 'list':
                html = _templates.matchListItem(match);
                break;
            case 'standard':
            default:
                html = _templates.matchCard(match, group);
                break;
        }
        
        container.innerHTML = html;
    }

    /**
     * Render multiple matches
     * @param {Array} matchIds - Array of match IDs to render
     * @param {HTMLElement} container - Container element to render into
     * @param {string} style - Style of match cards
     */
    function renderMatches(matchIds, container, style = 'standard') {
        if (!_matchController || !container) return;
        
        let html = '';
        
        matchIds.forEach(matchId => {
            const match = _matchController.getMatchById(matchId);
            if (!match) return;
            
            let group = null;
            
            // Get group name if applicable
            if (match.group) {
                // Find the group this match belongs to
                const tournament = _tournamentController.getCurrentTournament();
                if (tournament && tournament.groups) {
                    const matchGroup = tournament.groups.find(g => g.id === match.group);
                    if (matchGroup) {
                        group = matchGroup.name;
                    }
                }
            }
            
            // Render based on style
            switch (style) {
                case 'compact':
                    html += _templates.compactMatchCard(match);
                    break;
                case 'detailed':
                    html += _templates.matchDetails(match);
                    break;
                case 'list':
                    html += _templates.matchListItem(match);
                    break;
                case 'standard':
                default:
                    html += _templates.matchCard(match, group);
                    break;
            }
        });
        
        container.innerHTML = html;
        
        // Add staggered animations
        setTimeout(() => {
            const matchElements = container.querySelectorAll('.match-card, .match-card-compact, .match-list-item');
            matchElements.forEach((element, index) => {
                element.style.animationDelay = `${index * 0.1}s`;
            });
        }, 0);
    }

    /**
     * Render upcoming matches
     * @param {HTMLElement} container - Container element to render into
     * @param {number} limit - Maximum number of matches to show
     * @param {string} style - Style of match cards
     */
    function renderUpcomingMatches(container, limit = 5, style = 'list') {
        if (!_matchController || !container) return;
        
        const upcomingMatches = _matchController.getUpcomingMatches();
        const matchesToShow = upcomingMatches.slice(0, limit);
        
        if (matchesToShow.length === 0) {
            container.innerHTML = '<div class="empty-state">No upcoming matches</div>';
            return;
        }
        
        const matchIds = matchesToShow.map(match => match.id);
        renderMatches(matchIds, container, style);
    }

    /**
     * Render recent matches
     * @param {HTMLElement} container - Container element to render into
     * @param {number} limit - Maximum number of matches to show
     * @param {string} style - Style of match cards
     */
    function renderRecentMatches(container, limit = 5, style = 'list') {
        if (!_matchController || !container) return;
        
        const recentMatches = _matchController.getRecentMatches(limit);
        
        if (recentMatches.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent matches</div>';
            return;
        }
        
        const matchIds = recentMatches.map(match => match.id);
        renderMatches(matchIds, container, style);
    }

    /**
     * Update a match element in the DOM
     * @param {string} matchId - ID of the match to update
     */
    function updateMatchElement(matchId) {
        const matchElements = document.querySelectorAll(`[data-match-id="${matchId}"]`);
        
        if (matchElements.length === 0) return;
        
        matchElements.forEach(element => {
            const style = element.classList.contains('match-card-compact') ? 'compact' : 
                          element.classList.contains('match-list-item') ? 'list' :
                          element.classList.contains('match-details-container') ? 'detailed' : 'standard';
            
            renderMatch(matchId, element.parentElement, style);
            
            // Add update animation
            const updatedElement = element.parentElement.querySelector(`[data-match-id="${matchId}"]`);
            if (updatedElement) {
                updatedElement.classList.add('score-flash');
                setTimeout(() => {
                    updatedElement.classList.remove('score-flash');
                }, 2000);
            }
        });
    }

    /**
     * Show match result modal
     * @param {string} matchId - ID of the match
     */
    function showMatchResultModal(matchId) {
        if (!_resultModal || !_matchController) return;
        
        const match = _matchController.getMatchById(matchId);
        if (!match) return;
        
        // Set modal content
        if (_homeTeamName) _homeTeamName.textContent = match.homeTeam.name;
        if (_awayTeamName) _awayTeamName.textContent = match.awayTeam.name;
        if (_homeTeamScore) _homeTeamScore.value = match.played ? match.homeScore : 0;
        if (_awayTeamScore) _awayTeamScore.value = match.played ? match.awayScore : 0;
        
        // Store match ID in save button
        if (_saveResultBtn) {
            _saveResultBtn.dataset.matchId = matchId;
            
            // Determine if this is a knockout match
            _saveResultBtn.dataset.stage = match.round ? 'knockout' : 'group';
        }
        
        // Handle knockout-specific modal additions if needed
        if (match.round && typeof KnockoutView !== 'undefined' && KnockoutView._addKnockoutOptions) {
            KnockoutView._addKnockoutOptions(_resultModal, match);
        }
        
        // Show modal
        _resultModal.classList.add('active');
        
        // Focus on home team score input
        if (_homeTeamScore) {
            _homeTeamScore.focus();
            _homeTeamScore.select();
        }
    }

    /**
     * Close match result modal
     * @private
     */
    function _closeResultModal() {
        if (!_resultModal) return;
        
        _resultModal.classList.remove('active');
    }

    /**
     * Save match result from modal
     * @private
     */
    function _saveMatchResult() {
        if (!_saveResultBtn || !_matchController) return;
        
        const matchId = _saveResultBtn.dataset.matchId;
        if (!matchId) return;
        
        // Validate scores
        const homeScore = parseInt(_homeTeamScore.value, 10);
        const awayScore = parseInt(_awayTeamScore.value, 10);
        
        if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
            alert('Please enter valid scores (non-negative numbers)');
            return;
        }
        
        // Check if this is a knockout match
        const isKnockout = _saveResultBtn.dataset.stage === 'knockout';
        
        if (isKnockout && typeof KnockoutView !== 'undefined') {
            // Let KnockoutView handle knockout match results
            KnockoutView._saveKnockoutMatchResult(matchId);
        } else {
            // Standard group match
            const success = _matchController.updateMatchResult(matchId, homeScore, awayScore);
            
            if (success) {
                _closeResultModal();
            } else {
                alert('Failed to update match result. Please try again.');
            }
        }
    }

    /**
     * Generate match header content
     * @param {Object} match - Match object
     * @param {string} group - Group name
     * @returns {string} - HTML string for match header
     * @private
     */
    function _generateMatchHeader(match, group) {
        if (match.round) {
            return `<span>${match.round}</span>`;
        } else if (match.matchday && group) {
            return `<span>Group ${group} - Matchday ${match.matchday}</span>`;
        } else if (match.matchday) {
            return `<span>Matchday ${match.matchday}</span>`;
        } else {
            return '<span>Match</span>';
        }
    }

    /**
     * Format match date for display
     * @param {Date} date - Match date
     * @param {boolean} includeTime - Whether to include time
     * @returns {string} - Formatted date string
     * @private
     */
    function _formatMatchDate(date, includeTime = true) {
        if (!date) return '';
        
        const matchDate = new Date(date);
        
        const options = {
            month: 'short',
            day: 'numeric'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
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
     * Format match status for display
     * @param {Object} match - Match object
     * @returns {string} - Match status text
     * @private
     */
    function _formatMatchStatus(match) {
        if (!match.played) {
            return 'Scheduled';
        }
        
        if (match.extraTime && match.extraTime.played) {
            return match.penalties && match.penalties.played ? 'Penalties' : 'After Extra Time';
        }
        
        return 'Completed';
    }

    /**
     * Get match context (group/round information)
     * @param {Object} match - Match object
     * @returns {string} - Context string
     * @private
     */
    function _getMatchContext(match) {
        if (match.round) {
            return match.round;
        } else if (match.matchday && match.group) {
            // Try to get the group name
            let groupName = match.group;
            if (typeof groupName === 'string' && groupName.startsWith('group_')) {
                // Try to extract a simple letter from the ID
                const tournament = _tournamentController.getCurrentTournament();
                if (tournament && tournament.groups) {
                    const group = tournament.groups.find(g => g.id === match.group);
                    if (group) {
                        groupName = group.name;
                    }
                }
            }
            
            return `Group ${groupName} - MD${match.matchday}`;
        } else if (match.matchday) {
            return `Matchday ${match.matchday}`;
        } else {
            return 'Match';
        }
    }

    /**
     * Generate match highlights HTML
     * @param {Object} match - Match object
     * @returns {string} - HTML string for match highlights
     * @private
     */
    function _generateMatchHighlights(match) {
        let highlights = `<div class="match-highlights">`;
        
        // Add extra time info if applicable
        if (match.extraTime && match.extraTime.played) {
            highlights += `<span class="match-highlight aet">AET</span>`;
        }
        
        // Add penalties info if applicable
        if (match.penalties && match.penalties.played) {
            highlights += `<span class="match-highlight pen">Penalties</span>`;
        }
        
        highlights += `</div>`;
        
        return highlights;
    }

    /**
     * Generate detailed results HTML (including extra time and penalties)
     * @param {Object} match - Match object
     * @returns {string} - HTML string for detailed results
     * @private
     */
    function _generateDetailedResults(match) {
        let resultsHTML = `<div class="match-results-details">`;
        
        // Add extra time info
        if (match.extraTime && match.extraTime.played) {
            resultsHTML += _templates.extraTime(match);
        }
        
        // Add penalties info
        if (match.penalties && match.penalties.played) {
            resultsHTML += _templates.penalties(match);
        }
        
        resultsHTML += `</div>`;
        
        return resultsHTML;
    }

    /**
     * Handle match updated event
     * @param {Object} data - Event data
     * @private
     */
    function _handleMatchUpdated(data) {
        if (data.matchId) {
            updateMatchElement(data.matchId);
        }
    }

    // Return public API
    return {
        init,
        renderMatch,
        renderMatches,
        renderUpcomingMatches,
        renderRecentMatches,
        updateMatchElement,
        showMatchResultModal
    };
})();
