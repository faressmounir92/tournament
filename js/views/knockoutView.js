/**
 * knockoutView.js - eFootball Tournament Manager
 * View module for rendering and managing knockout stage components
 */

const KnockoutView = (function() {
    // Private properties
    let _knockoutController = null;
    let _matchController = null;
    let _tournamentController = null;
    
    // DOM element references
    let _knockoutBracket = null;
    
    // Templates
    const _templates = {
        // Knockout bracket template
        knockoutBracket: (rounds) => `
            <div class="knockout-bracket-container">
                ${rounds.map((round, index) => _templates.roundColumn(round, index)).join('')}
            </div>
        `,
        
        // Round column template
        roundColumn: (round, roundIndex) => `
            <div class="round" data-round="${round.name.toLowerCase().replace(/\s+/g, '-')}">
                <div class="round-header">${round.name}</div>
                <div class="round-matches">
                    ${round.matches.map((match, matchIndex) => 
                        _templates.bracketMatch(match, roundIndex, matchIndex)
                    ).join('')}
                </div>
            </div>
        `,
        
        // Bracket match template
        bracketMatch: (match, roundIndex, matchIndex) => `
            <div class="bracket-match animate-fade-in-right" 
                data-match-id="${match.id}" 
                style="animation-delay: ${(roundIndex * 0.2) + (matchIndex * 0.1)}s">
                <div class="bracket-match-wrapper">
                    <div class="bracket-team home-team ${match.winner && match.winner.id === match.homeTeam.id ? 'winner' : ''} 
                                              ${!match.homeTeam.id ? 'empty' : ''}">
                        <div class="team-name">${match.homeTeam.name}</div>
                        <div class="team-score">${match.played ? match.homeScore : ''}</div>
                    </div>
                    <div class="bracket-team away-team ${match.winner && match.winner.id === match.awayTeam.id ? 'winner' : ''}
                                              ${!match.awayTeam.id ? 'empty' : ''}">
                        <div class="team-name">${match.awayTeam.name}</div>
                        <div class="team-score">${match.played ? match.awayScore : ''}</div>
                    </div>
                    <div class="match-details">
                        ${_formatMatchDetails(match)}
                    </div>
                    <div class="match-actions">
                        <button class="btn btn-sm btn-match-result ${match.played ? 'btn-secondary' : 'btn-primary'}" 
                            data-match-id="${match.id}" ${(!match.homeTeam.id || !match.awayTeam.id) ? 'disabled' : ''}>
                            ${match.played ? 'Edit' : 'Result'}
                        </button>
                    </div>
                </div>
                ${_generateConnectors(roundIndex, matchIndex)}
            </div>
        `,
        
        // Empty state template
        emptyState: (message) => `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `,
        
        // Trophy template for winner
        trophy: (team) => `
            <div class="tournament-winner animate-scale-in">
                <div class="trophy-icon animate-trophy-shine">🏆</div>
                <h3 class="winner-name">${team.name}</h3>
                <p class="winner-title">Tournament Champion</p>
            </div>
        `,
        
        // Extra time template
        extraTime: (match) => `
            <div class="extra-time-box">
                <div class="extra-time-label">AET</div>
                <div class="extra-time-score">
                    ${match.extraTime.homeScore} - ${match.extraTime.awayScore}
                </div>
            </div>
        `,
        
        // Penalties template
        penalties: (match) => `
            <div class="penalties-box">
                <div class="penalties-label">Penalties</div>
                <div class="penalties-score">
                    ${match.penalties.homeScore} - ${match.penalties.awayScore}
                </div>
            </div>
        `
    };

    /**
     * Initialize the knockout view
     * @param {Object} knockoutController - Reference to the knockout controller
     * @param {Object} matchController - Reference to the match controller
     * @param {Object} tournamentController - Reference to the tournament controller
     */
    function init(knockoutController, matchController, tournamentController) {
        _knockoutController = knockoutController;
        _matchController = matchController;
        _tournamentController = tournamentController;
        
        // Get DOM elements
        _knockoutBracket = document.getElementById('knockoutBracket');
        
        // Add event listeners
        if (_tournamentController) {
            _tournamentController.addEventListener('tournamentLoaded', _handleTournamentLoaded);
            _tournamentController.addEventListener('tournamentCreated', _handleTournamentLoaded);
            _tournamentController.addEventListener('matchUpdated', _handleMatchUpdated);
            _tournamentController.addEventListener('stageChanged', _handleStageChanged);
            _tournamentController.addEventListener('tournamentCompleted', _handleTournamentCompleted);
            _tournamentController.addEventListener('groupStageCompleted', _handleGroupStageCompleted);
        }
        
        // Add DOM event listeners
        document.addEventListener('click', _handleDocumentClick);
    }

    /**
     * Render the knockout bracket
     */
    function render() {
        if (!_knockoutBracket || !_knockoutController) return;
        
        // Clear existing content
        _knockoutBracket.innerHTML = '';
        
        const rounds = _knockoutController.getRounds();
        
        if (rounds.length === 0) {
            _knockoutBracket.innerHTML = _templates.emptyState('Knockout stage not available yet');
            return;
        }
        
        // Check if tournament is complete
        if (_knockoutController.isTournamentComplete()) {
            const winner = _knockoutController.getTournamentWinner();
            if (winner) {
                // Show winner first, then render bracket
                _knockoutBracket.innerHTML = _templates.trophy(winner);
                
                // Render bracket after showing trophy
                setTimeout(() => {
                    const bracketHtml = _templates.knockoutBracket(rounds);
                    
                    // Create a wrapper for the bracket to not overwrite the trophy
                    const bracketWrapper = document.createElement('div');
                    bracketWrapper.className = 'knockout-bracket-wrapper animate-fade-in';
                    bracketWrapper.innerHTML = bracketHtml;
                    
                    _knockoutBracket.appendChild(bracketWrapper);
                }, 1500);
                
                return;
            }
        }
        
        // Render bracket
        _knockoutBracket.innerHTML = _templates.knockoutBracket(rounds);
    }

    /**
     * Update a specific match in the bracket
     * @param {string} matchId - ID of the match to update
     */
    function updateMatch(matchId) {
        if (!_knockoutBracket) return;
        
        const matchElement = _knockoutBracket.querySelector(`[data-match-id="${matchId}"]`);
        if (!matchElement) return;
        
        const match = _matchController.getMatchById(matchId);
        if (!match) return;
        
        // Find round index and match index
        let roundIndex = -1;
        let matchIndex = -1;
        
        const rounds = _knockoutController.getRounds();
        
        for (let i = 0; i < rounds.length; i++) {
            const mIndex = rounds[i].matches.findIndex(m => m.id === matchId);
            if (mIndex !== -1) {
                roundIndex = i;
                matchIndex = mIndex;
                break;
            }
        }
        
        if (roundIndex === -1 || matchIndex === -1) return;
        
        // Update match element
        const parentElement = matchElement.parentElement;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = _templates.bracketMatch(match, roundIndex, matchIndex);
        
        // Replace match element with new content
        const newMatchElement = tempDiv.firstElementChild;
        parentElement.replaceChild(newMatchElement, matchElement);
        
        // Add animation
        newMatchElement.classList.add('score-flash');
        setTimeout(() => {
            newMatchElement.classList.remove('score-flash');
        }, 2000);
        
        // If this match affected later rounds, update them too
        if (match.winner) {
            // Update matches in next round
            const nextRoundIndex = roundIndex + 1;
            const nextMatchIndex = Math.floor(matchIndex / 2);
            
            if (nextRoundIndex < rounds.length) {
                const nextRound = rounds[nextRoundIndex];
                if (nextMatchIndex < nextRound.matches.length) {
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    updateMatch(nextMatch.id);
                }
            }
        }
        
        // Check if tournament is complete
        if (_knockoutController.isTournamentComplete()) {
            const winner = _knockoutController.getTournamentWinner();
            if (winner) {
                _showWinnerCelebration(winner);
            }
        }
    }

    /**
     * Show winner celebration effects
     * @param {Object} winner - Winning team
     * @private
     */
    function _showWinnerCelebration(winner) {
        // Check if trophy is already displayed
        if (_knockoutBracket.querySelector('.tournament-winner')) return;
        
        // Create trophy display
        const trophyDiv = document.createElement('div');
        trophyDiv.innerHTML = _templates.trophy(winner);
        
        // Add to DOM before the bracket
        _knockoutBracket.prepend(trophyDiv.firstElementChild);
        
        // Create confetti effect
        _createConfetti();
    }
    
    /**
     * Create confetti effect for winner celebration
     * @private
     */
    function _createConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'winner-celebration';
        document.body.appendChild(confettiContainer);
        
        // Create confetti pieces
        const colors = ['#1a73e8', '#ffa000', '#0f9d58', '#d93025', '#ffca28'];
        
        for (let i = 0; i < 150; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.opacity = Math.random();
            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
            confetti.style.animationDelay = `${Math.random() * 5}s`;
            
            confettiContainer.appendChild(confetti);
        }
        
        // Remove after animation completes
        setTimeout(() => {
            document.body.removeChild(confettiContainer);
        }, 10000);
    }

    /**
     * Generate bracket connectors between matches
     * @param {number} roundIndex - Index of the round
     * @param {number} matchIndex - Index of the match within the round
     * @returns {string} - HTML string for connectors
     * @private
     */
    function _generateConnectors(roundIndex, matchIndex) {
        // Only generate connectors for matches that aren't in the final
        if (roundIndex === 3) return '';
        
        // Even-indexed matches get horizontal connector to the right
        if (matchIndex % 2 === 0) {
            return '<div class="bracket-connector right"></div>';
        }
        
        return '';
    }

    /**
     * Format match details string
     * @param {Object} match - Match object
     * @returns {string} - HTML string for match details
     * @private
     */
    function _formatMatchDetails(match) {
        if (!match.played) {
            return _formatMatchDate(match.date);
        }
        
        let details = '';
        
        // Add extra time info
        if (match.extraTime && match.extraTime.played) {
            details += _templates.extraTime(match);
        }
        
        // Add penalties info
        if (match.penalties && match.penalties.played) {
            details += _templates.penalties(match);
        }
        
        // If no extra details, show date
        if (!details) {
            details = `<div class="match-date">Completed</div>`;
        }
        
        return details;
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
        
        return `<div class="match-date">${matchDate.toLocaleDateString(undefined, options)}</div>`;
    }

    /**
     * Show the match result modal for entering/editing results
     * @param {string} matchId - ID of the match
     * @private
     */
    function _showMatchResultModal(matchId) {
        const match = _matchController.getMatchById(matchId);
        if (!match) return;
        
        // Don't show modal if match is not yet scheduled (teams not determined)
        if (!match.homeTeam.id || !match.awayTeam.id) {
            return;
        }
        
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
        saveResultBtn.dataset.stage = 'knockout';
        
        // Add extra time and penalties options for knockout matches
        _addKnockoutOptions(modal, match);
        
        // Show modal
        modal.classList.add('active');
        
        // Focus on home team score input
        homeTeamScore.focus();
        homeTeamScore.select();
    }
    
    /**
     * Add extra time and penalties options to the match result modal
     * @param {HTMLElement} modal - Modal element
     * @param {Object} match - Match object
     * @private
     */
    function _addKnockoutOptions(modal, match) {
        // Check if extra time and penalties sections already exist
        let extraTimeSection = modal.querySelector('.extra-time-section');
        let penaltiesSection = modal.querySelector('.penalties-section');
        
        // Create extra time section if it doesn't exist
        if (!extraTimeSection) {
            extraTimeSection = document.createElement('div');
            extraTimeSection.className = 'extra-time-section';
            
            extraTimeSection.innerHTML = `
                <div class="extra-time-header">
                    <label for="extraTimeCheck">
                        <input type="checkbox" id="extraTimeCheck"> Extra Time
                    </label>
                </div>
                <div class="extra-time-inputs" style="display:none;">
                    <div class="team-result">
                        <span>Home ET</span>
                        <input type="number" id="homeExtraTimeScore" min="0" value="0">
                    </div>
                    <div class="vs-indicator">VS</div>
                    <div class="team-result">
                        <span>Away ET</span>
                        <input type="number" id="awayExtraTimeScore" min="0" value="0">
                    </div>
                </div>
            `;
            
            // Find where to insert the extra time section (after regular time inputs)
            const matchResultForm = modal.querySelector('.match-result-form');
            const saveResultBtn = modal.querySelector('#saveResultBtn');
            
            if (matchResultForm && saveResultBtn) {
                matchResultForm.insertBefore(extraTimeSection, saveResultBtn);
            }
            
            // Add event listener for checkbox
            const extraTimeCheck = extraTimeSection.querySelector('#extraTimeCheck');
            const extraTimeInputs = extraTimeSection.querySelector('.extra-time-inputs');
            
            extraTimeCheck.addEventListener('change', function() {
                extraTimeInputs.style.display = this.checked ? 'flex' : 'none';
                
                // If extra time is checked, enable penalties checkbox
                if (this.checked) {
                    penaltiesCheck.disabled = false;
                } else {
                    penaltiesCheck.checked = false;
                    penaltiesCheck.disabled = true;
                    penaltiesInputs.style.display = 'none';
                }
            });
        }
        
        // Create penalties section if it doesn't exist
        if (!penaltiesSection) {
            penaltiesSection = document.createElement('div');
            penaltiesSection.className = 'penalties-section';
            
            penaltiesSection.innerHTML = `
                <div class="penalties-header">
                    <label for="penaltiesCheck">
                        <input type="checkbox" id="penaltiesCheck" disabled> Penalties
                    </label>
                </div>
                <div class="penalties-inputs" style="display:none;">
                    <div class="team-result">
                        <span>Home Pen</span>
                        <input type="number" id="homePenaltiesScore" min="0" value="0">
                    </div>
                    <div class="vs-indicator">VS</div>
                    <div class="team-result">
                        <span>Away Pen</span>
                        <input type="number" id="awayPenaltiesScore" min="0" value="0">
                    </div>
                </div>
            `;
            
            // Find where to insert the penalties section (after extra time section)
            const matchResultForm = modal.querySelector('.match-result-form');
            const saveResultBtn = modal.querySelector('#saveResultBtn');
            
            if (matchResultForm && saveResultBtn) {
                matchResultForm.insertBefore(penaltiesSection, saveResultBtn);
            }
            
            // Add event listener for checkbox
            const penaltiesCheck = penaltiesSection.querySelector('#penaltiesCheck');
            const penaltiesInputs = penaltiesSection.querySelector('.penalties-inputs');
            
            penaltiesCheck.addEventListener('change', function() {
                penaltiesInputs.style.display = this.checked ? 'flex' : 'none';
            });
        }
        
        // Set initial values based on match data
        const extraTimeCheck = modal.querySelector('#extraTimeCheck');
        const homeExtraTimeScore = modal.querySelector('#homeExtraTimeScore');
        const awayExtraTimeScore = modal.querySelector('#awayExtraTimeScore');
        const extraTimeInputs = modal.querySelector('.extra-time-inputs');
        
        const penaltiesCheck = modal.querySelector('#penaltiesCheck');
        const homePenaltiesScore = modal.querySelector('#homePenaltiesScore');
        const awayPenaltiesScore = modal.querySelector('#awayPenaltiesScore');
        const penaltiesInputs = modal.querySelector('.penalties-inputs');
        
        // Set extra time values
        if (match.extraTime && match.extraTime.played) {
            extraTimeCheck.checked = true;
            extraTimeInputs.style.display = 'flex';
            homeExtraTimeScore.value = match.extraTime.homeScore;
            awayExtraTimeScore.value = match.extraTime.awayScore;
            penaltiesCheck.disabled = false;
        } else {
            extraTimeCheck.checked = false;
            extraTimeInputs.style.display = 'none';
            homeExtraTimeScore.value = 0;
            awayExtraTimeScore.value = 0;
            penaltiesCheck.disabled = true;
        }
        
        // Set penalties values
        if (match.penalties && match.penalties.played) {
            penaltiesCheck.checked = true;
            penaltiesInputs.style.display = 'flex';
            homePenaltiesScore.value = match.penalties.homeScore;
            awayPenaltiesScore.value = match.penalties.awayScore;
        } else {
            penaltiesCheck.checked = false;
            penaltiesInputs.style.display = 'none';
            homePenaltiesScore.value = 0;
            awayPenaltiesScore.value = 0;
        }
    }

    /**
     * Save knockout match result from modal
     * @param {string} matchId - Match ID
     * @private
     */
    function _saveKnockoutMatchResult(matchId) {
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
        
        // Check if extra time is used
        const extraTimeCheck = document.getElementById('extraTimeCheck');
        let extraTimeData = null;
        
        if (extraTimeCheck && extraTimeCheck.checked) {
            const homeExtraTimeScore = document.getElementById('homeExtraTimeScore');
            const awayExtraTimeScore = document.getElementById('awayExtraTimeScore');
            
            const homeETScore = parseInt(homeExtraTimeScore.value, 10);
            const awayETScore = parseInt(awayExtraTimeScore.value, 10);
            
            if (isNaN(homeETScore) || isNaN(awayETScore) || homeETScore < 0 || awayETScore < 0) {
                alert('Please enter valid extra time scores');
                return;
            }
            
            extraTimeData = {
                home: homeETScore,
                away: awayETScore
            };
        }
        
        // Check if penalties are used
        const penaltiesCheck = document.getElementById('penaltiesCheck');
        let penaltiesData = null;
        
        if (penaltiesCheck && penaltiesCheck.checked) {
            const homePenaltiesScore = document.getElementById('homePenaltiesScore');
            const awayPenaltiesScore = document.getElementById('awayPenaltiesScore');
            
            const homePenScore = parseInt(homePenaltiesScore.value, 10);
            const awayPenScore = parseInt(awayPenaltiesScore.value, 10);
            
            if (isNaN(homePenScore) || isNaN(awayPenScore) || homePenScore < 0 || awayPenScore < 0) {
                alert('Please enter valid penalty scores');
                return;
            }
            
            // Ensure penalties have a winner
            if (homePenScore === awayPenScore) {
                alert('Penalty shootout cannot end in a tie. Please ensure one team wins.');
                return;
            }
            
            penaltiesData = {
                home: homePenScore,
                away: awayPenScore
            };
        }
        
        // Update match result
        if (_matchController) {
            const success = _matchController.updateMatchResult(matchId, homeScore, awayScore, {
                extraTime: extraTimeData,
                penalties: penaltiesData
            });
            
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
     * Handle document click events
     * @param {Event} event - Click event
     * @private
     */
    function _handleDocumentClick(event) {
        // Match result button click (for knockout matches)
        if (event.target.classList.contains('btn-match-result') && _knockoutBracket.contains(event.target)) {
            const matchId = event.target.dataset.matchId;
            if (matchId) {
                _showMatchResultModal(matchId);
            }
            return;
        }
        
        // Save result button click (check if knockout match)
        if (event.target.id === 'saveResultBtn' && event.target.dataset.stage === 'knockout') {
            const matchId = event.target.dataset.matchId;
            _saveKnockoutMatchResult(matchId);
            return;
        }
    }

    /**
     * Handle tournament loaded event
     * @private
     */
    function _handleTournamentLoaded() {
        const currentStage = _tournamentController.getCurrentStage();
        
        if (currentStage === 'knockout' || currentStage === 'complete') {
            render();
        }
    }

    /**
     * Handle match updated event
     * @param {Object} data - Event data
     * @private
     */
    function _handleMatchUpdated(data) {
        if (data.stage === 'knockout' && data.matchId) {
            updateMatch(data.matchId);
        }
    }

    /**
     * Handle stage changed event
     * @param {Object} data - Event data
     * @private
     */
    function _handleStageChanged(data) {
        if (data.newStage === 'knockout' || data.newStage === 'complete') {
            render();
        }
    }

    /**
     * Handle tournament completed event
     * @param {Object} data - Event data
     * @private
     */
    function _handleTournamentCompleted(data) {
        render(); // Re-render to show winner trophy
    }

    /**
     * Handle group stage completed event
     * @private
     */
    function _handleGroupStageCompleted() {
        render(); // Render knockout bracket when group stage completes
    }

    // Return public API
    return {
        init,
        render,
        updateMatch
    };
})();
