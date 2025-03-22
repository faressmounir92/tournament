/**
 * tournament.js - eFootball Tournament Manager
 * Tournament model that encapsulates tournament data and logic
 */

class Tournament {
    /**
     * Create a new Tournament
     * @param {Object} config - Tournament configuration
     * @param {string} config.name - Tournament name
     * @param {number} config.groupCount - Number of groups
     * @param {Array} config.teams - Array of team names or objects
     */
    constructor(config = {}) {
        this.id = config.id || this._generateId();
        this.name = config.name || 'New Tournament';
        this.groupCount = config.groupCount || 1;
        this.createdAt = config.createdAt || new Date();
        this.updatedAt = config.updatedAt || new Date();
        this.currentStage = config.currentStage || 'group';
        this.status = config.status || 'active';
        
        // Initialize groups and teams
        this.groups = config.groups || [];
        
        // If teams are provided but no groups, create and populate groups
        if (config.teams && config.teams.length > 0 && this.groups.length === 0) {
            this._initializeGroups(config.teams);
        }
        
        // Initialize knockout stage
        this.knockout = config.knockout || null;
        
        // Initialize events
        this.events = config.events || [];
    }
    
    /**
     * Initialize groups and assign teams
     * @param {Array} teamNames - Array of team names or objects
     * @private
     */
    _initializeGroups(teamNames) {
        // Validate we have enough teams
        const teamsPerGroup = 4; // Standard size for football groups
        const requiredTeams = this.groupCount * teamsPerGroup;
        
        if (teamNames.length < requiredTeams) {
            throw new Error(`Not enough teams provided. ${requiredTeams} teams required for ${this.groupCount} groups.`);
        }
        
        // Shuffle teams for random assignment
        const shuffledTeams = Helpers.shuffleArray(teamNames);
        
        // Create groups and assign teams
        this.groups = [];
        
        for (let i = 0; i < this.groupCount; i++) {
            const groupTeams = [];
            
            // Extract 4 teams for this group
            for (let j = 0; j < teamsPerGroup; j++) {
                const teamIndex = i * teamsPerGroup + j;
                
                if (teamIndex < shuffledTeams.length) {
                    const team = typeof shuffledTeams[teamIndex] === 'string'
                        ? { id: this._generateTeamId(), name: shuffledTeams[teamIndex] }
                        : shuffledTeams[teamIndex];
                    
                    // Ensure team has an id
                    if (!team.id) {
                        team.id = this._generateTeamId();
                    }
                    
                    groupTeams.push(team);
                }
            }
            
            // Create group
            const group = {
                id: this._generateGroupId(),
                name: String.fromCharCode(65 + i), // A, B, C, etc.
                teams: groupTeams,
                matches: [],
                standings: []
            };
            
            // Generate match schedule for this group
            const matchSchedule = Helpers.generateMatchSchedule(groupTeams);
            
            // Flatten matchday structure and add to group matches
            matchSchedule.forEach(matchday => {
                matchday.matches.forEach(match => {
                    group.matches.push(match);
                });
            });
            
            // Calculate initial standings (all zeros)
            group.standings = Helpers.calculateGroupStandings(groupTeams, group.matches);
            
            this.groups.push(group);
        }
    }
    
    /**
     * Update a match result
     * @param {string} matchId - The ID of the match to update
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @returns {boolean} - Success status
     */
    updateMatchResult(matchId, homeScore, awayScore) {
        let matchUpdated = false;
        
        // Try to find and update match in group stage
        if (this.currentStage === 'group') {
            for (const group of this.groups) {
                const matchIndex = group.matches.findIndex(match => match.id === matchId);
                
                if (matchIndex !== -1) {
                    // Update match
                    const match = group.matches[matchIndex];
                    group.matches[matchIndex] = Helpers.updateMatchResult(match, homeScore, awayScore);
                    
                    // Recalculate standings
                    group.standings = Helpers.calculateGroupStandings(group.teams, group.matches);
                    
                    // Check if all group matches are played to determine qualified teams
                    if (Helpers.areAllMatchesPlayed(group.matches)) {
                        this._checkGroupsCompletion();
                    }
                    
                    matchUpdated = true;
                    break;
                }
            }
        } 
        // Try to find and update match in knockout stage
        else if (this.currentStage === 'knockout' && this.knockout) {
            for (const round of this.knockout) {
                const matchIndex = round.matches.findIndex(match => match.id === matchId);
                
                if (matchIndex !== -1) {
                    // For knockout games, we need a winner, so if scores are equal,
                    // we would typically have penalties, but for simplicity, we'll just update
                    const match = round.matches[matchIndex];
                    round.matches[matchIndex] = Helpers.updateMatchResult(match, homeScore, awayScore);
                    
                    // Progress the winner to the next round
                    this._updateKnockoutProgression(round.matches[matchIndex]);
                    
                    matchUpdated = true;
                    break;
                }
            }
        }
        
        if (matchUpdated) {
            this.updatedAt = new Date();
            this._addEvent('match_updated', { 
                matchId, 
                homeScore, 
                awayScore, 
                timestamp: new Date() 
            });
        }
        
        return matchUpdated;
    }
    
    /**
     * Check if all group matches are completed and generate knockout stage if needed
     * @private
     */
    _checkGroupsCompletion() {
        // Check if all groups have all matches played
        const allGroupsCompleted = this.groups.every(group => {
            return Helpers.areAllMatchesPlayed(group.matches);
        });
        
        if (allGroupsCompleted && this.currentStage === 'group') {
            // Determine qualified teams
            const qualifiedTeams = Helpers.determineQualifiedTeams(this.groups);
            
            // Generate knockout stage
            this.knockout = Helpers.generateKnockoutStage(qualifiedTeams, this.groupCount);
            
            // Change current stage
            this.currentStage = 'knockout';
            
            // Add event
            this._addEvent('group_stage_completed', { 
                timestamp: new Date(),
                qualified: {
                    winners: qualifiedTeams.winners.map(item => item.team.name),
                    runnersUp: qualifiedTeams.runnersUp.map(item => item.team.name),
                    bestThirds: qualifiedTeams.bestThirds.map(item => item.team.name)
                }
            });
        }
    }
    
    /**
     * Update knockout progression - move winning team to next round
     * @param {Object} match - The updated match
     * @private
     */
    _updateKnockoutProgression(match) {
        if (!match.winner) {
            return; // No winner yet
        }
        
        // Find the round and match position
        let roundIndex = -1;
        let matchPosition = -1;
        
        for (let i = 0; i < this.knockout.length; i++) {
            const round = this.knockout[i];
            const pos = round.matches.findIndex(m => m.id === match.id);
            
            if (pos !== -1) {
                roundIndex = i;
                matchPosition = pos;
                break;
            }
        }
        
        if (roundIndex === -1 || matchPosition === -1) {
            return; // Match not found
        }
        
        // Check if there's a next round
        if (roundIndex + 1 < this.knockout.length) {
            const nextRound = this.knockout[roundIndex + 1];
            const nextMatchIndex = Math.floor(matchPosition / 2);
            
            if (nextMatchIndex < nextRound.matches.length) {
                // Decide which team position (home or away) to update
                const isHome = matchPosition % 2 === 0;
                
                if (isHome) {
                    nextRound.matches[nextMatchIndex].homeTeam = match.winner;
                } else {
                    nextRound.matches[nextMatchIndex].awayTeam = match.winner;
                }
                
                // Add event
                this._addEvent('team_advanced', {
                    teamName: match.winner.name,
                    fromRound: match.round,
                    toRound: nextRound.round,
                    timestamp: new Date()
                });
            }
        } else {
            // This is the final - tournament is complete
            this.status = 'completed';
            
            // Add event
            this._addEvent('tournament_completed', {
                winner: match.winner.name,
                timestamp: new Date()
            });
        }
    }
    
    /**
     * Get all matches for a specific matchday
     * @param {number} matchday - The matchday number
     * @returns {Array} - Array of matches for the given matchday
     */
    getMatchesByMatchday(matchday) {
        const matches = [];
        
        this.groups.forEach(group => {
            group.matches.forEach(match => {
                if (match.matchday === matchday) {
                    matches.push({
                        ...match,
                        group: group.name
                    });
                }
            });
        });
        
        return matches;
    }
    
    /**
     * Get the total number of matchdays in the group stage
     * @returns {number} - Total number of matchdays
     */
    getTotalMatchdays() {
        // For a standard 4-team group, there are 3 matchdays
        // If group sizes vary, this would need to be calculated dynamically
        return 3;
    }
    
    /**
     * Get the tournament status summary
     * @returns {Object} - Tournament status information
     */
    getStatus() {
        const totalMatches = this._countTotalMatches();
        const playedMatches = this._countPlayedMatches();
        
        return {
            name: this.name,
            currentStage: this.currentStage,
            status: this.status,
            progress: totalMatches > 0 ? (playedMatches / totalMatches * 100).toFixed(0) : 0,
            totalMatches,
            playedMatches,
            remainingMatches: totalMatches - playedMatches,
            groups: this.groups.length,
            teams: this._countTotalTeams(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    /**
     * Add an event to the tournament history
     * @param {string} type - Event type
     * @param {Object} data - Event data
     * @private
     */
    _addEvent(type, data) {
        this.events.push({
            type,
            ...data
        });
    }
    
    /**
     * Count total matches in the tournament
     * @returns {number} - Total match count
     * @private
     */
    _countTotalMatches() {
        let count = 0;
        
        // Count group matches
        this.groups.forEach(group => {
            count += group.matches.length;
        });
        
        // Count knockout matches
        if (this.knockout) {
            this.knockout.forEach(round => {
                count += round.matches.length;
            });
        }
        
        return count;
    }
    
    /**
     * Count played matches in the tournament
     * @returns {number} - Played match count
     * @private
     */
    _countPlayedMatches() {
        let count = 0;
        
        // Count group matches
        this.groups.forEach(group => {
            count += group.matches.filter(match => match.played).length;
        });
        
        // Count knockout matches
        if (this.knockout) {
            this.knockout.forEach(round => {
                count += round.matches.filter(match => match.played).length;
            });
        }
        
        return count;
    }
    
    /**
     * Count total teams in the tournament
     * @returns {number} - Total team count
     * @private
     */
    _countTotalTeams() {
        let count = 0;
        
        this.groups.forEach(group => {
            count += group.teams.length;
        });
        
        return count;
    }
    
    /**
     * Generate unique tournament ID
     * @returns {string} - Unique ID
     * @private
     */
    _generateId() {
        return 'tournament_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }
    
    /**
     * Generate unique team ID
     * @returns {string} - Unique ID
     * @private
     */
    _generateTeamId() {
        return 'team_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }
    
    /**
     * Generate unique group ID
     * @returns {string} - Unique ID
     * @private
     */
    _generateGroupId() {
        return 'group_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }
    
    /**
     * Serialize tournament data for storage
     * @returns {Object} - Serialized tournament data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            groupCount: this.groupCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            currentStage: this.currentStage,
            status: this.status,
            groups: this.groups,
            knockout: this.knockout,
            events: this.events
        };
    }
    
    /**
     * Create a Tournament instance from serialized data
     * @param {Object} data - Serialized tournament data
     * @returns {Tournament} - New Tournament instance
     * @static
     */
    static deserialize(data) {
        return new Tournament(data);
    }
}
