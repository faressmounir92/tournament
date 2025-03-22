/**
 * knockoutController.js - eFootball Tournament Manager
 * Controller for managing knockout stage operations and bracket progression
 */

const KnockoutController = (function() {
    // Private properties
    let _rounds = [];
    let _currentRound = null;
    let _tournamentController = null;
    
    // Constants for round types
    const ROUND_TYPES = {
        ROUND_OF_16: 'Round of 16',
        QUARTER_FINALS: 'Quarterfinals',
        SEMI_FINALS: 'Semifinals',
        FINAL: 'Final'
    };

    /**
     * Initialize the knockout controller
     * @param {Object} tournamentController - Reference to the tournament controller
     */
    function init(tournamentController) {
        _tournamentController = tournamentController;
    }

    /**
     * Load knockout stage data from tournament
     * @param {Array} rounds - Array of round objects from tournament
     */
    function loadRounds(rounds) {
        if (!rounds || !Array.isArray(rounds)) {
            _rounds = [];
            return;
        }
        
        _rounds = rounds.map(round => {
            // Ensure each match is properly instantiated
            if (round.matches) {
                round.matches = round.matches.map(match => {
                    if (!(match instanceof Match)) {
                        return Match.deserialize(match);
                    }
                    return match;
                });
            }
            return round;
        });

        // Set default current round if available
        if (_rounds.length > 0 && !_currentRound) {
            _currentRound = _rounds[0];
        }
    }

    /**
     * Generate knockout stage based on qualified teams from group stage
     * @param {Object} qualifiedTeams - Object containing arrays of qualified teams by category
     * @param {number} groupCount - Number of groups in the tournament
     * @returns {Array} - Array of knockout rounds
     */
    function generateKnockoutStage(qualifiedTeams, groupCount) {
        const knockoutStage = [];
        
        // Determine knockout format based on group count
        switch (groupCount) {
            case 1:
                // 4 teams, straight to semifinals (top 4 from the group)
                const semifinalMatches = generateSemifinals(qualifiedTeams.winners);
                knockoutStage.push({
                    name: ROUND_TYPES.SEMI_FINALS,
                    matches: semifinalMatches
                });
                
                knockoutStage.push({
                    name: ROUND_TYPES.FINAL,
                    matches: generateFinals()
                });
                break;
                
            case 2:
            case 3:
            case 4:
                // 8 teams, straight to quarterfinals
                const quarterMatches = generateQuarterfinals(
                    qualifiedTeams.winners,
                    qualifiedTeams.runnersUp,
                    qualifiedTeams.bestThirds
                );
                knockoutStage.push({
                    name: ROUND_TYPES.QUARTER_FINALS,
                    matches: quarterMatches
                });
                
                knockoutStage.push({
                    name: ROUND_TYPES.SEMI_FINALS,
                    matches: generateSemifinals()
                });
                
                knockoutStage.push({
                    name: ROUND_TYPES.FINAL,
                    matches: generateFinals()
                });
                break;
                
            case 6:
            case 8:
                // Round of 16 first
                const roundOf16Matches = generateRoundOf16(
                    qualifiedTeams.winners,
                    qualifiedTeams.runnersUp,
                    qualifiedTeams.bestThirds
                );
                knockoutStage.push({
                    name: ROUND_TYPES.ROUND_OF_16,
                    matches: roundOf16Matches
                });
                
                knockoutStage.push({
                    name: ROUND_TYPES.QUARTER_FINALS,
                    matches: generateEmptyRound(4)
                });
                
                knockoutStage.push({
                    name: ROUND_TYPES.SEMI_FINALS,
                    matches: generateEmptyRound(2)
                });
                
                knockoutStage.push({
                    name: ROUND_TYPES.FINAL,
                    matches: generateFinals()
                });
                break;
                
            default:
                console.error('Unsupported group count for knockout stage generation');
                return [];
        }
        
        _rounds = knockoutStage;
        if (_rounds.length > 0) {
            _currentRound = _rounds[0];
        }
        
        return knockoutStage;
    }
    
    /**
     * Generate Round of 16 matches based on qualified teams
     * @param {Array} winners - Group winners
     * @param {Array} runnersUp - Group runners-up
     * @param {Array} bestThirds - Best third-placed teams
     * @returns {Array} - Array of Round of 16 match objects
     */
    function generateRoundOf16(winners = [], runnersUp = [], bestThirds = []) {
        // This follows a standard tournament pairing where winners face runners-up
        // from different groups, and winners from stronger groups may face best thirds
        const matches = [];
        
        // For 8 groups (16 teams): W1 vs R2, W2 vs R1, W3 vs R4, W4 vs R3, etc.
        // For 6 groups (16 teams): Include best thirds with specific pairings
        
        // Define the pairing pattern
        const pairings = [
            { home: winners[0], away: runnersUp[3] },
            { home: winners[1], away: runnersUp[2] },
            { home: winners[2], away: runnersUp[1] },
            { home: winners[3], away: runnersUp[0] },
            { home: winners[4], away: bestThirds[0] },
            { home: winners[5], away: bestThirds[1] },
            { home: winners[6] || bestThirds[2], away: bestThirds[3] || runnersUp[5] },
            { home: winners[7] || bestThirds[3], away: bestThirds[2] || runnersUp[4] }
        ];
        
        // Create match objects
        pairings.forEach((pair, index) => {
            if (pair.home && pair.away) {
                matches.push(new Match({
                    id: `r16_${index}`,
                    homeTeam: pair.home.team,
                    awayTeam: pair.away.team,
                    round: ROUND_TYPES.ROUND_OF_16,
                    roundIndex: 0,
                    date: new Date(Date.now() + (86400000 * index)) // Each match 1 day apart
                }));
            }
        });
        
        return matches;
    }
    
    /**
     * Generate Quarterfinal matches based on qualified teams
     * @param {Array} winners - Group winners
     * @param {Array} runnersUp - Group runners-up
     * @param {Array} bestThirds - Best third-placed teams
     * @returns {Array} - Array of Quarterfinal match objects
     */
    function generateQuarterfinals(winners = [], runnersUp = [], bestThirds = []) {
        const matches = [];
        
        // If we have teams passed in, this is the initial generation
        if (winners.length > 0 || runnersUp.length > 0 || bestThirds.length > 0) {
            // Create pairings based on expected knockout path
            const pairings = [];
            
            switch (winners.length) {
                case 2: // 2 groups format
                    pairings.push(
                        { home: winners[0], away: runnersUp[1] },
                        { home: winners[1], away: runnersUp[0] }
                    );
                    break;
                    
                case 3: // 3 groups format with best thirds
                    pairings.push(
                        { home: winners[0], away: bestThirds[0] },
                        { home: winners[1], away: runnersUp[2] },
                        { home: winners[2], away: runnersUp[1] },
                        { home: runnersUp[0], away: bestThirds[1] }
                    );
                    break;
                    
                case 4: // 4 groups format
                    pairings.push(
                        { home: winners[0], away: runnersUp[3] },
                        { home: winners[1], away: runnersUp[2] },
                        { home: winners[2], away: runnersUp[1] },
                        { home: winners[3], away: runnersUp[0] }
                    );
                    break;
                    
                default:
                    // For other formats, combine all qualified teams and pair them
                    const allTeams = [...winners, ...runnersUp, ...bestThirds];
                    for (let i = 0; i < Math.min(8, allTeams.length); i += 2) {
                        if (i + 1 < allTeams.length) {
                            pairings.push({ home: allTeams[i], away: allTeams[i + 1] });
                        }
                    }
            }
            
            // Create match objects
            pairings.forEach((pair, index) => {
                if (pair.home && pair.away) {
                    matches.push(new Match({
                        id: `qf_${index}`,
                        homeTeam: pair.home.team,
                        awayTeam: pair.away.team,
                        round: ROUND_TYPES.QUARTER_FINALS,
                        roundIndex: 1,
                        date: new Date(Date.now() + (86400000 * (index + 8))) // Start after R16
                    }));
                }
            });
        } else {
            // Generate empty quarterfinals (will be filled by progression)
            return generateEmptyRound(4, ROUND_TYPES.QUARTER_FINALS, 1);
        }
        
        return matches;
    }
    
    /**
     * Generate Semifinal matches based on qualified teams
     * @param {Array} teams - Teams qualified directly to semifinals (for 1-group format)
     * @returns {Array} - Array of Semifinal match objects
     */
    function generateSemifinals(teams = []) {
        // For 1-group tournament, teams are passed in
        if (teams.length > 0) {
            const matches = [];
            // Top 4 from single group go to semifinals: 1st vs 4th, 2nd vs 3rd
            if (teams.length >= 4) {
                matches.push(
                    new Match({
                        id: 'sf_0',
                        homeTeam: teams[0].team,
                        awayTeam: teams[3].team,
                        round: ROUND_TYPES.SEMI_FINALS,
                        roundIndex: teams.length > 4 ? 2 : 1, // If we had R16, this is round 2
                        date: new Date(Date.now() + (86400000 * 12)) // 12 days from tournament start
                    }),
                    new Match({
                        id: 'sf_1',
                        homeTeam: teams[1].team,
                        awayTeam: teams[2].team,
                        round: ROUND_TYPES.SEMI_FINALS,
                        roundIndex: teams.length > 4 ? 2 : 1,
                        date: new Date(Date.now() + (86400000 * 13))
                    })
                );
            }
            return matches;
        } else {
            // Generate empty semifinals (will be filled by progression)
            return generateEmptyRound(2, ROUND_TYPES.SEMI_FINALS, 2);
        }
    }
    
    /**
     * Generate Final match
     * @returns {Array} - Array with one Final match object
     */
    function generateFinals() {
        // Always just one final match
        return [
            new Match({
                id: 'final_0',
                homeTeam: { id: null, name: 'TBD' },
                awayTeam: { id: null, name: 'TBD' },
                round: ROUND_TYPES.FINAL,
                roundIndex: 3,
                date: new Date(Date.now() + (86400000 * 16)) // 16 days from tournament start
            })
        ];
    }
    
    /**
     * Generate empty round matches (placeholders)
     * @param {number} count - Number of matches to generate
     * @param {string} roundName - Name of the round
     * @param {number} roundIndex - Index of the round (0-based)
     * @returns {Array} - Array of empty match objects
     */
    function generateEmptyRound(count, roundName = '', roundIndex = 0) {
        const matches = [];
        for (let i = 0; i < count; i++) {
            matches.push(new Match({
                id: `${roundName.toLowerCase().replace(/\s+/g, '_')}_${i}`,
                homeTeam: { id: null, name: 'TBD' },
                awayTeam: { id: null, name: 'TBD' },
                round: roundName,
                roundIndex: roundIndex,
                date: new Date(Date.now() + (86400000 * (roundIndex * 4 + i + 8))) // Schedule based on round
            }));
        }
        return matches;
    }

    /**
     * Get all rounds
     * @returns {Array} - Array of round objects
     */
    function getRounds() {
        return _rounds;
    }

    /**
     * Get a specific round by name
     * @param {string} roundName - The name of the round to find
     * @returns {Object|null} - The round object or null if not found
     */
    function getRoundByName(roundName) {
        return _rounds.find(round => round.name === roundName) || null;
    }

    /**
     * Get current active round
     * @returns {Object|null} - The current round object or null
     */
    function getCurrentRound() {
        return _currentRound;
    }

    /**
     * Set current active round
     * @param {string} roundName - The name of the round to set as current
     */
    function setCurrentRound(roundName) {
        const round = getRoundByName(roundName);
        if (round) {
            _currentRound = round;
        }
    }

    /**
     * Get a specific match by ID
     * @param {string} matchId - The ID of the match to find
     * @returns {Object|null} - The match object or null if not found
     */
    function getMatchById(matchId) {
        for (const round of _rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
                return match;
            }
        }
        return null;
    }

    /**
     * Update a match result and progress winner to the next round
     * @param {string} matchId - The ID of the match to update
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @param {Object} extraTimeScores - Optional extra time scores
     * @param {Object} penaltyScores - Optional penalty shootout scores
     * @returns {boolean} - Success status
     */
    function updateMatchResult(matchId, homeScore, awayScore, extraTimeScores = null, penaltyScores = null) {
        // Find the round containing this match
        let matchFound = false;
        let match = null;
        let roundIndex = -1;
        let matchIndex = -1;
        
        for (let i = 0; i < _rounds.length; i++) {
            const matchIdx = _rounds[i].matches.findIndex(m => m.id === matchId);
            if (matchIdx !== -1) {
                matchFound = true;
                match = _rounds[i].matches[matchIdx];
                roundIndex = i;
                matchIndex = matchIdx;
                break;
            }
        }
        
        if (!matchFound || !match) {
            return false;
        }
        
        // Update the match result
        match.updateResult(homeScore, awayScore);
        
        // Add extra time and penalty results if provided
        if (extraTimeScores) {
            match.extraTime.played = true;
            match.extraTime.homeScore = extraTimeScores.home;
            match.extraTime.awayScore = extraTimeScores.away;
            
            // Calculate winner based on aggregate score
            const totalHomeScore = match.homeScore + match.extraTime.homeScore;
            const totalAwayScore = match.awayScore + match.extraTime.awayScore;
            
            if (totalHomeScore > totalAwayScore) {
                match.winner = match.homeTeam;
            } else if (totalAwayScore > totalHomeScore) {
                match.winner = match.awayTeam;
            } else {
                // Still tied after extra time, needs penalties
                match.winner = null;
            }
        }
        
        if (penaltyScores) {
            match.penalties.played = true;
            match.penalties.homeScore = penaltyScores.home;
            match.penalties.awayScore = penaltyScores.away;
            
            // Determine winner by penalties
            if (match.penalties.homeScore > match.penalties.awayScore) {
                match.winner = match.homeTeam;
                match.penalties.winner = match.homeTeam;
            } else if (match.penalties.homeScore < match.penalties.awayScore) {
                match.winner = match.awayTeam;
                match.penalties.winner = match.awayTeam;
            }
        }
        
        // Ensure there's a winner for knockout matches
        if (!match.winner) {
            if (homeScore > awayScore) {
                match.winner = match.homeTeam;
            } else if (awayScore > homeScore) {
                match.winner = match.awayTeam;
            }
        }
        
        // Progress winner to the next round if there is one
        progressWinnerToNextRound(match, roundIndex, matchIndex);
        
        // Notify tournament controller of the update
        if (_tournamentController) {
            _tournamentController.notifyKnockoutMatchUpdated(match.id);
            
            // Check if tournament is complete (final match played)
            if (isTournamentComplete()) {
                _tournamentController.notifyTournamentCompleted(getTournamentWinner());
            }
        }
        
        return true;
    }
    
    /**
     * Progress the winner of a match to the next round
     * @param {Object} match - The match object with result
     * @param {number} roundIndex - Index of the current round
     * @param {number} matchIndex - Index of the match within the round
     */
    function progressWinnerToNextRound(match, roundIndex, matchIndex) {
        if (!match.winner || roundIndex >= _rounds.length - 1) {
            return; // No winner or final round
        }
        
        const nextRoundIndex = roundIndex + 1;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        
        if (nextRoundIndex < _rounds.length && nextMatchIndex < _rounds[nextRoundIndex].matches.length) {
            const nextMatch = _rounds[nextRoundIndex].matches[nextMatchIndex];
            
            // Determine if winner goes to home or away position in next match
            const isHome = matchIndex % 2 === 0;
            
            if (isHome) {
                nextMatch.homeTeam = match.winner;
            } else {
                nextMatch.awayTeam = match.winner;
            }
            
            // Update the next match
            _rounds[nextRoundIndex].matches[nextMatchIndex] = nextMatch;
        }
    }

    /**
     * Get knockout stage statistics
     * @returns {Object} - Statistics for the knockout stage
     */
    function getKnockoutStageStats() {
        const stats = {
            rounds: _rounds.length,
            matches: 0,
            matchesPlayed: 0,
            matchesRemaining: 0,
            totalGoals: 0,
            extraTimeMatches: 0,
            penaltyShootouts: 0,
            upsets: 0, // Group winners losing to runners-up
            completed: false
        };
        
        _rounds.forEach(round => {
            round.matches.forEach(match => {
                stats.matches++;
                
                if (match.played) {
                    stats.matchesPlayed++;
                    stats.totalGoals += (match.homeScore + match.awayScore);
                    
                    if (match.extraTime && match.extraTime.played) {
                        stats.extraTimeMatches++;
                        stats.totalGoals += (match.extraTime.homeScore + match.extraTime.awayScore);
                    }
                    
                    if (match.penalties && match.penalties.played) {
                        stats.penaltyShootouts++;
                    }
                } else {
                    stats.matchesRemaining++;
                }
            });
        });
        
        // Average goals per match
        stats.averageGoalsPerMatch = stats.matchesPlayed > 0 
            ? (stats.totalGoals / stats.matchesPlayed).toFixed(2) 
            : 0;
        
        // Check if knockout stage is completed
        stats.completed = isKnockoutStageCompleted();
        
        return stats;
    }

    /**
     * Check if knockout stage is complete (all matches played)
     * @returns {boolean} - Whether all knockout matches are completed
     */
    function isKnockoutStageCompleted() {
        if (_rounds.length === 0) {
            return false;
        }
        
        return _rounds.every(round => 
            round.matches.every(match => match.played)
        );
    }

    /**
     * Check if tournament is complete (final match played)
     * @returns {boolean} - Whether the tournament is completed
     */
    function isTournamentComplete() {
        if (_rounds.length === 0) {
            return false;
        }
        
        const finalRound = _rounds[_rounds.length - 1];
        return finalRound.matches.every(match => match.played);
    }

    /**
     * Get the tournament winner (if tournament is complete)
     * @returns {Object|null} - The winning team or null if not determined
     */
    function getTournamentWinner() {
        if (!isTournamentComplete() || _rounds.length === 0) {
            return null;
        }
        
        const finalRound = _rounds[_rounds.length - 1];
        if (finalRound.matches.length === 0) {
            return null;
        }
        
        const finalMatch = finalRound.matches[0];
        return finalMatch.winner;
    }

    /**
     * Reset knockout stage (clear all match results but keep structure)
     */
    function resetKnockoutStage() {
        _rounds.forEach(round => {
            round.matches.forEach(match => {
                match.homeScore = null;
                match.awayScore = null;
                match.played = false;
                match.winner = null;
                match.extraTime = {
                    played: false,
                    homeScore: null,
                    awayScore: null
                };
                match.penalties = {
                    played: false,
                    homeScore: null,
                    awayScore: null,
                    winner: null
                };
            });
        });
    }

    // Return public API
    return {
        init,
        loadRounds,
        generateKnockoutStage,
        getRounds,
        getRoundByName,
        getCurrentRound,
        setCurrentRound,
        getMatchById,
        updateMatchResult,
        getKnockoutStageStats,
        isKnockoutStageCompleted,
        isTournamentComplete,
        getTournamentWinner,
        resetKnockoutStage,
        
        // Constants
        ROUND_TYPES
    };
})();
