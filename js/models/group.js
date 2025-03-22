/**
 * group.js - eFootball Tournament Manager
 * Group model that encapsulates group stage data and operations
 */

class Group {
    /**
     * Create a new Group
     * @param {Object} config - Group configuration
     * @param {string} config.id - Group ID
     * @param {string} config.name - Group name (e.g., 'A', 'B', etc.)
     * @param {Array} config.teams - Array of team objects
     */
    constructor(config = {}) {
        this.id = config.id || this._generateId();
        this.name = config.name || 'Group';
        this.teams = config.teams || [];
        this.matches = config.matches || [];
        this.standings = config.standings || [];
        this.createdAt = config.createdAt || new Date();
        this.updatedAt = config.updatedAt || new Date();
        
        // Calculate initial standings if teams are provided but no standings
        if (this.teams.length > 0 && this.standings.length === 0) {
            this.recalculateStandings();
        }
    }
    
    /**
     * Add a team to the group
     * @param {Object} team - Team object
     * @returns {Group} - Return this instance for chaining
     */
    addTeam(team) {
        // Check if team already exists in the group
        const existingTeamIndex = this.teams.findIndex(t => t.id === team.id);
        
        if (existingTeamIndex === -1) {
            this.teams.push(team);
            this.updatedAt = new Date();
            this.recalculateStandings();
        }
        
        return this;
    }
    
    /**
     * Remove a team from the group
     * @param {string} teamId - Team ID to remove
     * @returns {Group} - Return this instance for chaining
     */
    removeTeam(teamId) {
        const initialLength = this.teams.length;
        this.teams = this.teams.filter(team => team.id !== teamId);
        
        if (this.teams.length !== initialLength) {
            this.updatedAt = new Date();
            this.recalculateStandings();
        }
        
        return this;
    }
    
    /**
     * Generate matches for the group
     * @returns {Group} - Return this instance for chaining
     */
    generateMatches() {
        if (this.teams.length !== 4) {
            console.error('Match generation requires exactly 4 teams in the group');
            return this;
        }
        
        // Use the static method from Match class to create group matches
        this.matches = Match.createGroupMatches(this.teams, this.id);
        this.updatedAt = new Date();
        
        return this;
    }
    
    /**
     * Update a match result and recalculate standings
     * @param {string} matchId - The ID of the match to update
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @returns {boolean} - Success status
     */
    updateMatchResult(matchId, homeScore, awayScore) {
        const matchIndex = this.matches.findIndex(match => match.id === matchId);
        
        if (matchIndex === -1) {
            return false;
        }
        
        // Update the match using Match class method
        this.matches[matchIndex].updateResult(homeScore, awayScore);
        this.updatedAt = new Date();
        
        // Recalculate standings
        this.recalculateStandings();
        
        return true;
    }
    
    /**
     * Recalculate group standings based on match results
     * @returns {Group} - Return this instance for chaining
     */
    recalculateStandings() {
        // Initialize standings with empty stats
        this.standings = this.teams.map(team => ({
            id: team.id,
            name: team.name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));
        
        // Process all played matches
        this.matches.forEach(match => {
            if (match.played && match.homeScore !== null && match.awayScore !== null) {
                // Find home and away team in standings
                const homeTeamIndex = this.standings.findIndex(team => team.id === match.homeTeam.id);
                const awayTeamIndex = this.standings.findIndex(team => team.id === match.awayTeam.id);
                
                if (homeTeamIndex !== -1 && awayTeamIndex !== -1) {
                    // Update matches played
                    this.standings[homeTeamIndex].played += 1;
                    this.standings[awayTeamIndex].played += 1;
                    
                    // Update goals
                    this.standings[homeTeamIndex].goalsFor += match.homeScore;
                    this.standings[homeTeamIndex].goalsAgainst += match.awayScore;
                    this.standings[awayTeamIndex].goalsFor += match.awayScore;
                    this.standings[awayTeamIndex].goalsAgainst += match.homeScore;
                    
                    // Update results and points
                    if (match.homeScore > match.awayScore) {
                        // Home team wins
                        this.standings[homeTeamIndex].won += 1;
                        this.standings[homeTeamIndex].points += 3;
                        this.standings[awayTeamIndex].lost += 1;
                    } else if (match.homeScore < match.awayScore) {
                        // Away team wins
                        this.standings[awayTeamIndex].won += 1;
                        this.standings[awayTeamIndex].points += 3;
                        this.standings[homeTeamIndex].lost += 1;
                    } else {
                        // Draw
                        this.standings[homeTeamIndex].drawn += 1;
                        this.standings[homeTeamIndex].points += 1;
                        this.standings[awayTeamIndex].drawn += 1;
                        this.standings[awayTeamIndex].points += 1;
                    }
                }
            }
        });
        
        // Calculate goal differences
        this.standings.forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });
        
        // Sort standings using FIFA rules
        this.sortStandings();
        
        return this;
    }
    
    /**
     * Sort group standings using FIFA rules
     * 1. Points
     * 2. Goal difference
     * 3. Goals scored
     * 4. Head-to-head results
     * 5. Alphabetically (fallback)
     * @returns {Group} - Return this instance for chaining
     */
    sortStandings() {
        this.standings.sort((a, b) => {
            // 1. Points
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            
            // 2. Goal difference
            if (b.goalDifference !== a.goalDifference) {
                return b.goalDifference - a.goalDifference;
            }
            
            // 3. Goals scored
            if (b.goalsFor !== a.goalsFor) {
                return b.goalsFor - a.goalsFor;
            }
            
            // 4. Head-to-head results
            const headToHeadResult = this._getHeadToHeadResult(a.id, b.id);
            if (headToHeadResult !== 0) {
                return headToHeadResult;
            }
            
            // 5. Alphabetically (as fallback)
            return a.name.localeCompare(b.name);
        });
        
        return this;
    }
    
    /**
     * Get head-to-head result between two teams
     * @param {string} teamAId - First team ID
     * @param {string} teamBId - Second team ID
     * @returns {number} - Positive if team A won, negative if team B won, 0 if draw or no match
     * @private
     */
    _getHeadToHeadResult(teamAId, teamBId) {
        // Find matches between these two teams
        const match = this.matches.find(m => {
            return (
                (m.homeTeam.id === teamAId && m.awayTeam.id === teamBId) ||
                (m.homeTeam.id === teamBId && m.awayTeam.id === teamAId)
            ) && m.played;
        });
        
        if (!match) {
            return 0; // No match found or not played yet
        }
        
        if (match.homeTeam.id === teamAId) {
            // Team A was home
            if (match.homeScore > match.awayScore) {
                return 1; // Team A won
            } else if (match.homeScore < match.awayScore) {
                return -1; // Team B won
            }
        } else {
            // Team A was away
            if (match.awayScore > match.homeScore) {
                return 1; // Team A won
            } else if (match.awayScore < match.homeScore) {
                return -1; // Team B won
            }
        }
        
        return 0; // Draw
    }
    
    /**
     * Get matches for a specific matchday
     * @param {number} matchday - The matchday number
     * @returns {Array} - Array of matches for the given matchday
     */
    getMatchesByMatchday(matchday) {
        return this.matches.filter(match => match.matchday === matchday);
    }
    
    /**
     * Check if all matches in the group have been played
     * @returns {boolean} - Whether all matches have been played
     */
    isCompleted() {
        return this.matches.every(match => match.played);
    }
    
    /**
     * Get the top N teams from the group
     * @param {number} count - Number of teams to get
     * @returns {Array} - Array of top teams
     */
    getTopTeams(count) {
        return this.standings.slice(0, count);
    }
    
    /**
     * Mark teams as qualified based on their position
     * @param {number} directQualifyCount - Number of teams that directly qualify
     * @param {boolean} includeBestThird - Whether third place might qualify as best third
     * @returns {Group} - Return this instance for chaining
     */
    markQualifiedTeams(directQualifyCount = 2, includeBestThird = false) {
        // Make sure standings are up to date
        this.recalculateStandings();
        
        // Mark teams as qualified
        this.standings.forEach((team, index) => {
            team.qualified = index < directQualifyCount;
            team.bestThird = includeBestThird && index === 2;
        });
        
        return this;
    }
    
    /**
     * Get group stats (matches played, goals, etc.)
     * @returns {Object} - Group statistics
     */
    getStats() {
        let totalGoals = 0;
        let matchesPlayed = 0;
        
        this.matches.forEach(match => {
            if (match.played) {
                matchesPlayed++;
                totalGoals += (match.homeScore + match.awayScore);
            }
        });
        
        return {
            teams: this.teams.length,
            matches: this.matches.length,
            matchesPlayed: matchesPlayed,
            matchesRemaining: this.matches.length - matchesPlayed,
            totalGoals: totalGoals,
            averageGoalsPerMatch: matchesPlayed > 0 ? (totalGoals / matchesPlayed).toFixed(2) : 0,
            completed: this.isCompleted()
        };
    }
    
    /**
     * Generate a unique ID
     * @returns {string} - Unique ID
     * @private
     */
    _generateId() {
        return 'group_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }
    
    /**
     * Serialize group data for storage
     * @returns {Object} - Serialized group data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            teams: this.teams,
            matches: this.matches.map(match => {
                if (match instanceof Match) {
                    return match.serialize();
                }
                return match;
            }),
            standings: this.standings,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    /**
     * Create a Group instance from serialized data
     * @param {Object} data - Serialized group data
     * @returns {Group} - New Group instance
     * @static
     */
    static deserialize(data) {
        // Convert match data to Match instances
        if (data.matches) {
            data.matches = data.matches.map(matchData => {
                if (!(matchData instanceof Match)) {
                    return Match.deserialize(matchData);
                }
                return matchData;
            });
        }
        
        return new Group(data);
    }
}
