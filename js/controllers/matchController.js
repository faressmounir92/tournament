/**
 * matchController.js - eFootball Tournament Manager
 * Controller for managing match operations and interactions
 */

const MatchController = (function() {
    // Private properties
    let _matches = [];
    let _currentMatch = null;
    let _tournamentController = null;
    let _groupController = null;
    let _knockoutController = null;
    
    // Match status constants
    const MATCH_STATUS = {
        SCHEDULED: 'scheduled',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    };

    /**
     * Initialize the match controller
     * @param {Object} tournamentController - Reference to the tournament controller
     * @param {Object} groupController - Reference to the group controller
     * @param {Object} knockoutController - Reference to the knockout controller
     */
    function init(tournamentController, groupController, knockoutController) {
        _tournamentController = tournamentController;
        _groupController = groupController;
        _knockoutController = knockoutController;
    }

    /**
     * Load matches data
     * @param {Array} matches - Array of match objects
     */
    function loadMatches(matches) {
        if (!matches || !Array.isArray(matches)) {
            _matches = [];
            return;
        }
        
        _matches = matches.map(match => {
            if (!(match instanceof Match)) {
                return Match.deserialize(match);
            }
            return match;
        });
    }

    /**
     * Get all matches
     * @returns {Array} - Array of match objects
     */
    function getMatches() {
        return _matches;
    }

    /**
     * Get matches by status
     * @param {string} status - Match status (from MATCH_STATUS constants)
     * @returns {Array} - Array of matches with the specified status
     */
    function getMatchesByStatus(status) {
        return _matches.filter(match => {
            if (status === MATCH_STATUS.SCHEDULED) {
                return !match.played;
            } else if (status === MATCH_STATUS.COMPLETED) {
                return match.played;
            }
            return false;
        });
    }

    /**
     * Get a specific match by ID
     * @param {string} matchId - The ID of the match to find
     * @returns {Object|null} - The match object or null if not found
     */
    function getMatchById(matchId) {
        // First check in loaded matches
        const match = _matches.find(m => m.id === matchId);
        if (match) {
            return match;
        }
        
        // If not found, check in group controller
        if (_groupController) {
            for (const group of _groupController.getGroups()) {
                const groupMatch = group.matches.find(m => m.id === matchId);
                if (groupMatch) {
                    return groupMatch;
                }
            }
        }
        
        // If still not found, check in knockout controller
        if (_knockoutController) {
            return _knockoutController.getMatchById(matchId);
        }
        
        return null;
    }

    /**
     * Set current active match
     * @param {string} matchId - The ID of the match to set as current
     */
    function setCurrentMatch(matchId) {
        const match = getMatchById(matchId);
        if (match) {
            _currentMatch = match;
        }
    }

    /**
     * Get current active match
     * @returns {Object|null} - The current match object or null
     */
    function getCurrentMatch() {
        return _currentMatch;
    }

    /**
     * Update a match result
     * @param {string} matchId - The ID of the match to update
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @param {Object} options - Additional options (extra time, penalties)
     * @returns {boolean} - Success status
     */
    function updateMatchResult(matchId, homeScore, awayScore, options = {}) {
        const match = getMatchById(matchId);
        if (!match) {
            return false;
        }
        
        // Determine if this is a group match or knockout match
        if (match.group) {
            // Group stage match
            return _groupController.updateMatchResult(matchId, homeScore, awayScore);
        } else if (match.round) {
            // Knockout stage match
            return _knockoutController.updateMatchResult(
                matchId, 
                homeScore, 
                awayScore, 
                options.extraTime, 
                options.penalties
            );
        }
        
        return false;
    }

    /**
     * Get all matches for a specific matchday
     * @param {number} matchday - The matchday number
     * @returns {Array} - Array of matches for the given matchday
     */
    function getMatchesByMatchday(matchday) {
        if (_groupController) {
            return _groupController.getMatchesByMatchday(matchday);
        }
        return [];
    }

    /**
     * Get all matches for a specific knockout round
     * @param {string} roundName - The name of the knockout round
     * @returns {Array} - Array of matches for the given round
     */
    function getMatchesByRound(roundName) {
        if (_knockoutController) {
            const round = _knockoutController.getRoundByName(roundName);
            return round ? round.matches : [];
        }
        return [];
    }

    /**
     * Get upcoming matches (scheduled within the next specified days)
     * @param {number} days - Number of days to look ahead
     * @returns {Array} - Array of upcoming matches
     */
    function getUpcomingMatches(days = 7) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);
        
        return _matches.filter(match => {
            return !match.played && 
                   match.date >= now && 
                   match.date <= futureDate;
        }).sort((a, b) => a.date - b.date);
    }

    /**
     * Get recently completed matches
     * @param {number} count - Number of recent matches to return
     * @returns {Array} - Array of recently completed matches
     */
    function getRecentMatches(count = 5) {
        return _matches
            .filter(match => match.played)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, count);
    }

    /**
     * Reschedule a match
     * @param {string} matchId - The ID of the match to reschedule
     * @param {Date} newDate - The new date for the match
     * @returns {boolean} - Success status
     */
    function rescheduleMatch(matchId, newDate) {
        const match = getMatchById(matchId);
        if (!match || match.played) {
            return false;
        }
        
        match.date = new Date(newDate);
        return true;
    }

    /**
     * Get head-to-head statistics between two teams
     * @param {string} teamId1 - ID of the first team
     * @param {string} teamId2 - ID of the second team
     * @returns {Object} - Head-to-head statistics
     */
    function getHeadToHeadStats(teamId1, teamId2) {
        const stats = {
            matches: 0,
            team1Wins: 0,
            team2Wins: 0,
            draws: 0,
            team1Goals: 0,
            team2Goals: 0
        };
        
        const headToHeadMatches = _matches.filter(match => {
            return (match.homeTeam.id === teamId1 && match.awayTeam.id === teamId2) ||
                   (match.homeTeam.id === teamId2 && match.awayTeam.id === teamId1);
        });
        
        headToHeadMatches.forEach(match => {
            if (!match.played) {
                return;
            }
            
            stats.matches++;
            
            if (match.homeTeam.id === teamId1) {
                stats.team1Goals += match.homeScore;
                stats.team2Goals += match.awayScore;
                
                if (match.homeScore > match.awayScore) {
                    stats.team1Wins++;
                } else if (match.homeScore < match.awayScore) {
                    stats.team2Wins++;
                } else {
                    stats.draws++;
                }
            } else {
                stats.team1Goals += match.awayScore;
                stats.team2Goals += match.homeScore;
                
                if (match.awayScore > match.homeScore) {
                    stats.team1Wins++;
                } else if (match.awayScore < match.homeScore) {
                    stats.team2Wins++;
                } else {
                    stats.draws++;
                }
            }
        });
        
        return stats;
    }

    /**
     * Get match completion percentage for the tournament
     * @returns {number} - Percentage of matches completed (0-100)
     */
    function getMatchCompletionPercentage() {
        if (_matches.length === 0) {
            return 0;
        }
        
        const completedMatches = _matches.filter(match => match.played).length;
        return Math.round((completedMatches / _matches.length) * 100);
    }

    /**
     * Get detailed statistics for a specific match
     * @param {string} matchId - The ID of the match
     * @returns {Object} - Match statistics or null if match not found
     */
    function getMatchStatistics(matchId) {
        const match = getMatchById(matchId);
        if (!match) {
            return null;
        }
        
        // Basic match info
        const stats = {
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            played: match.played,
            date: match.date,
            venue: match.venue,
            round: match.round,
            group: match.group,
            matchday: match.matchday,
            extraTime: match.extraTime,
            penalties: match.penalties
        };
        
        // Add extended stats if the match has been played
        if (match.played) {
            stats.totalGoals = (match.homeScore + match.awayScore);
            stats.scoringRate = stats.totalGoals > 0 ? 
                Math.round(90 / stats.totalGoals) : 0; // Minutes per goal
            stats.result = match.homeScore > match.awayScore ? 
                'home_win' : (match.homeScore < match.awayScore ? 'away_win' : 'draw');
            stats.winner = match.winner;
            
            // Add extra time stats if applicable
            if (match.extraTime && match.extraTime.played) {
                stats.extraTimeGoals = (match.extraTime.homeScore + match.extraTime.awayScore);
                stats.totalGoals += stats.extraTimeGoals;
            }
            
            // Add detailed stats if available
            if (match.stats) {
                stats.details = match.stats;
            }
        }
        
        return stats;
    }

    /**
     * Generate matches for a specific tournament structure
     * @param {Object} tournament - Tournament configuration
     * @returns {Array} - Generated matches
     */
    function generateMatches(tournament) {
        if (!tournament || !tournament.groups) {
            return [];
        }
        
        const allMatches = [];
        
        // Generate group stage matches
        tournament.groups.forEach(group => {
            const groupMatches = Match.createGroupMatches(group.teams, group.id);
            allMatches.push(...groupMatches);
        });
        
        _matches = allMatches;
        return allMatches;
    }

    /**
     * Get next match to be played
     * @returns {Object|null} - Next match or null if no upcoming matches
     */
    function getNextMatch() {
        const now = new Date();
        
        const upcomingMatches = _matches.filter(match => 
            !match.played && match.date >= now
        );
        
        if (upcomingMatches.length === 0) {
            return null;
        }
        
        return upcomingMatches.sort((a, b) => a.date - b.date)[0];
    }

    /**
     * Format match date for display
     * @param {Date} date - Match date
     * @param {boolean} includeTime - Whether to include time
     * @returns {string} - Formatted date string
     */
    function formatMatchDate(date, includeTime = true) {
        if (!date) {
            return '';
        }
        
        const options = { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return new Date(date).toLocaleDateString(undefined, options);
    }

    /**
     * Format match result for display
     * @param {Object} match - Match object
     * @returns {string} - Formatted result string
     */
    function formatMatchResult(match) {
        if (!match) {
            return '';
        }
        
        if (!match.played) {
            return 'vs';
        }
        
        let result = `${match.homeScore} - ${match.awayScore}`;
        
        if (match.extraTime && match.extraTime.played) {
            result += ` (AET: ${match.extraTime.homeScore} - ${match.extraTime.awayScore})`;
        }
        
        if (match.penalties && match.penalties.played) {
            result += ` (Pen: ${match.penalties.homeScore} - ${match.penalties.awayScore})`;
        }
        
        return result;
    }

    // Return public API
    return {
        init,
        loadMatches,
        getMatches,
        getMatchesByStatus,
        getMatchById,
        setCurrentMatch,
        getCurrentMatch,
        updateMatchResult,
        getMatchesByMatchday,
        getMatchesByRound,
        getUpcomingMatches,
        getRecentMatches,
        rescheduleMatch,
        getHeadToHeadStats,
        getMatchCompletionPercentage,
        getMatchStatistics,
        generateMatches,
        getNextMatch,
        formatMatchDate,
        formatMatchResult,
        
        // Constants
        MATCH_STATUS
    };
})();
