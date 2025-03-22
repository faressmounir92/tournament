/**
 * groupController.js - eFootball Tournament Manager
 * Controller for managing group operations and interactions
 */

const GroupController = (function() {
    // Private properties
    let _groups = [];
    let _currentGroup = null;
    let _currentMatchday = 1;
    let _tournamentController = null;

    /**
     * Initialize the group controller
     * @param {Object} tournamentController - Reference to the tournament controller
     */
    function init(tournamentController) {
        _tournamentController = tournamentController;
    }

    /**
     * Load groups data from tournament
     * @param {Array} groups - Array of group objects from tournament
     */
    function loadGroups(groups) {
        _groups = groups.map(group => {
            // Ensure each group has the required properties
            if (!(group instanceof Group)) {
                return Group.deserialize(group);
            }
            return group;
        });

        // Set default current group if available
        if (_groups.length > 0 && !_currentGroup) {
            _currentGroup = _groups[0];
        }
    }

    /**
     * Get all groups
     * @returns {Array} - Array of group objects
     */
    function getGroups() {
        return _groups;
    }

    /**
     * Get a specific group by ID
     * @param {string} groupId - The ID of the group to find
     * @returns {Object|null} - The group object or null if not found
     */
    function getGroupById(groupId) {
        return _groups.find(group => group.id === groupId) || null;
    }

    /**
     * Get current active group
     * @returns {Object|null} - The current group object or null
     */
    function getCurrentGroup() {
        return _currentGroup;
    }

    /**
     * Set current active group
     * @param {string} groupId - The ID of the group to set as current
     */
    function setCurrentGroup(groupId) {
        const group = getGroupById(groupId);
        if (group) {
            _currentGroup = group;
        }
    }

    /**
     * Get current matchday
     * @returns {number} - Current matchday number
     */
    function getCurrentMatchday() {
        return _currentMatchday;
    }

    /**
     * Set current matchday
     * @param {number} matchday - Matchday number to set as current
     */
    function setCurrentMatchday(matchday) {
        if (matchday >= 1 && matchday <= 3) { // Standard group stage has 3 matchdays
            _currentMatchday = matchday;
        }
    }

    /**
     * Generate matches for all groups
     */
    function generateMatches() {
        _groups.forEach(group => {
            group.generateMatches();
        });
    }

    /**
     * Update a match result and recalculate standings
     * @param {string} matchId - The ID of the match to update
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @returns {boolean} - Success status
     */
    function updateMatchResult(matchId, homeScore, awayScore) {
        // Find the group containing this match
        const groupIndex = _groups.findIndex(group => {
            return group.matches.some(match => match.id === matchId);
        });

        if (groupIndex === -1) {
            return false;
        }

        // Update the match result using the Group method
        const success = _groups[groupIndex].updateMatchResult(matchId, homeScore, awayScore);

        if (success) {
            // Notify tournament controller of the update
            if (_tournamentController) {
                _tournamentController.notifyMatchUpdated(_groups[groupIndex].id, matchId);
            }

            // Check if all group matches are completed
            const allMatchesPlayed = _groups.every(group => group.isCompleted());
            if (allMatchesPlayed && _tournamentController) {
                _tournamentController.notifyGroupStageCompleted();
            }
        }

        return success;
    }

    /**
     * Get all matches for a specific matchday
     * @param {number} matchday - The matchday number
     * @returns {Array} - Array of match objects grouped by group
     */
    function getMatchesByMatchday(matchday) {
        const matchdayMatches = [];

        _groups.forEach(group => {
            const matches = group.getMatchesByMatchday(matchday);
            if (matches.length > 0) {
                matchdayMatches.push({
                    group: group.name,
                    groupId: group.id,
                    matches: matches
                });
            }
        });

        return matchdayMatches;
    }

    /**
     * Mark qualified teams in all groups based on tournament format
     * @param {Object} format - Qualification format (e.g., {direct: 2, bestThird: true})
     */
    function markQualifiedTeams(format = { direct: 2, bestThird: false }) {
        _groups.forEach(group => {
            group.markQualifiedTeams(format.direct, format.bestThird);
        });

        // If we need to determine best third-place teams
        if (format.bestThird) {
            calculateBestThirdPlaceTeams();
        }
    }

    /**
     * Calculate the best third-place teams across all groups
     * @param {number} count - Number of third-place teams to qualify
     */
    function calculateBestThirdPlaceTeams(count = 4) {
        // Get all third-place teams
        const thirdPlaceTeams = _groups.map(group => {
            if (group.standings.length >= 3) {
                const team = group.standings[2];
                return {
                    id: team.id,
                    groupId: group.id,
                    groupName: group.name,
                    team: team
                };
            }
            return null;
        }).filter(item => item !== null);

        // Sort third-place teams (using the same criteria as group standings)
        thirdPlaceTeams.sort((a, b) => {
            // 1. Points
            if (b.team.points !== a.team.points) {
                return b.team.points - a.team.points;
            }
            
            // 2. Goal difference
            if (b.team.goalDifference !== a.team.goalDifference) {
                return b.team.goalDifference - a.team.goalDifference;
            }
            
            // 3. Goals scored
            if (b.team.goalsFor !== a.team.goalsFor) {
                return b.team.goalsFor - a.team.goalsFor;
            }
            
            // 4. Alphabetically (as fallback)
            return a.team.name.localeCompare(b.team.name);
        });

        // Mark the best third-place teams as qualified
        const bestThirdTeams = thirdPlaceTeams.slice(0, count);
        
        bestThirdTeams.forEach(item => {
            const group = getGroupById(item.groupId);
            if (group) {
                const teamIndex = group.standings.findIndex(t => t.id === item.team.id);
                if (teamIndex !== -1) {
                    group.standings[teamIndex].qualified = true;
                    group.standings[teamIndex].bestThird = true;
                }
            }
        });
    }

    /**
     * Get overall group stage statistics
     * @returns {Object} - Combined statistics for all groups
     */
    function getGroupStageStats() {
        const stats = {
            groups: _groups.length,
            teams: 0,
            matches: 0,
            matchesPlayed: 0,
            matchesRemaining: 0,
            totalGoals: 0,
            averageGoalsPerMatch: 0,
            completed: false
        };
        
        _groups.forEach(group => {
            const groupStats = group.getStats();
            stats.teams += groupStats.teams;
            stats.matches += groupStats.matches;
            stats.matchesPlayed += groupStats.matchesPlayed;
            stats.matchesRemaining += groupStats.matchesRemaining;
            stats.totalGoals += groupStats.totalGoals;
        });
        
        // Calculate average goals per match
        if (stats.matchesPlayed > 0) {
            stats.averageGoalsPerMatch = (stats.totalGoals / stats.matchesPlayed).toFixed(2);
        }
        
        // Check if all groups are completed
        stats.completed = _groups.every(group => group.isCompleted());
        
        return stats;
    }

    /**
     * Get qualified teams for knockout stage
     * @returns {Object} - Object containing arrays of qualified teams by category
     */
    function getQualifiedTeams() {
        const qualifiedTeams = {
            winners: [],
            runnersUp: [],
            bestThirds: []
        };
        
        _groups.forEach(group => {
            group.standings.forEach((team, index) => {
                if (team.qualified) {
                    if (index === 0) {
                        // Group winner
                        qualifiedTeams.winners.push({
                            team: team,
                            group: group.name
                        });
                    } else if (index === 1) {
                        // Runner-up
                        qualifiedTeams.runnersUp.push({
                            team: team,
                            group: group.name
                        });
                    } else if (team.bestThird) {
                        // Best third (if applicable)
                        qualifiedTeams.bestThirds.push({
                            team: team,
                            group: group.name
                        });
                    }
                }
            });
        });
        
        return qualifiedTeams;
    }

    /**
     * Check if all group matches are completed
     * @returns {boolean} - Whether all group matches are completed
     */
    function isGroupStageCompleted() {
        return _groups.every(group => group.isCompleted());
    }

    // Return public API
    return {
        init,
        loadGroups,
        getGroups,
        getGroupById,
        getCurrentGroup,
        setCurrentGroup,
        getCurrentMatchday,
        setCurrentMatchday,
        generateMatches,
        updateMatchResult,
        getMatchesByMatchday,
        markQualifiedTeams,
        calculateBestThirdPlaceTeams,
        getGroupStageStats,
        getQualifiedTeams,
        isGroupStageCompleted
    };
})();
