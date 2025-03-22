/**
 * match.js - eFootball Tournament Manager
 * Match model that encapsulates match data and operations
 */

class Match {
    /**
     * Create a new Match
     * @param {Object} config - Match configuration
     * @param {string} config.id - Match ID
     * @param {Object} config.homeTeam - Home team object
     * @param {Object} config.awayTeam - Away team object
     * @param {number} config.matchday - Matchday number (for group stage)
     * @param {string} config.round - Round name (for knockout stage)
     * @param {number} config.roundIndex - Round order index (for knockout stage)
     * @param {string} config.group - Group ID/name this match belongs to
     */
    constructor(config = {}) {
        this.id = config.id || this._generateId();
        this.homeTeam = config.homeTeam || { id: null, name: 'TBD' };
        this.awayTeam = config.awayTeam || { id: null, name: 'TBD' };
        this.homeScore = config.homeScore !== undefined ? config.homeScore : null;
        this.awayScore = config.awayScore !== undefined ? config.awayScore : null;
        this.played = config.played || false;
        this.matchday = config.matchday || null;
        this.round = config.round || null;
        this.roundIndex = config.roundIndex || null;
        this.group = config.group || null;
        this.date = config.date || new Date();
        this.venue = config.venue || '';
        this.winner = config.winner || null;
        this.createdAt = config.createdAt || new Date();
        this.updatedAt = config.updatedAt || new Date();
        
        // Extra properties for match statistics
        this.stats = config.stats || {
            // For potential future use - shots, possession, etc.
            homePossession: null,
            awayPossession: null,
            homeShots: null,
            awayShots: null,
            homeShotsOnTarget: null,
            awayShotsOnTarget: null,
            homeCorners: null,
            awayCorners: null,
            homeFouls: null,
            awayFouls: null,
            homeYellowCards: null,
            awayYellowCards: null,
            homeRedCards: null,
            awayRedCards: null
        };
        
        // Extra time and penalties (for knockout matches)
        this.extraTime = config.extraTime || {
            played: false,
            homeScore: null,
            awayScore: null
        };
        
        this.penalties = config.penalties || {
            played: false,
            homeScore: null,
            awayScore: null,
            winner: null
        };
    }
    
    /**
     * Update match result
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @returns {Match} - Return this instance for chaining
     */
    updateResult(homeScore, awayScore) {
        this.homeScore = parseInt(homeScore, 10);
        this.awayScore = parseInt(awayScore, 10);
        this.played = true;
        this.updatedAt = new Date();
        
        // Determine winner
        if (this.homeScore > this.awayScore) {
            this.winner = this.homeTeam;
        } else if (this.homeScore < this.awayScore) {
            this.winner = this.awayTeam;
        } else {
            this.winner = null; // Draw
        }
        
        return this;
    }
    
    /**
     * Update extra time result (for knockout matches)
     * @param {number} homeScore - Home team extra time score
     * @param {number} awayScore - Away team extra time score
     * @returns {Match} - Return this instance for chaining
     */
    updateExtraTimeResult(homeScore, awayScore) {
        this.extraTime.homeScore = parseInt(homeScore, 10);
        this.extraTime.awayScore = parseInt(awayScore, 10);
        this.extraTime.played = true;
        this.updatedAt = new Date();
        
        // Calculate aggregate score (original + extra time)
        const aggHomeScore = this.homeScore + this.extraTime.homeScore;
        const aggAwayScore = this.awayScore + this.extraTime.awayScore;
        
        // Determine winner
        if (aggHomeScore > aggAwayScore) {
            this.winner = this.homeTeam;
        } else if (aggHomeScore < aggAwayScore) {
            this.winner = this.awayTeam;
        } else {
            this.winner = null; // Still tied, needs penalties
        }
        
        return this;
    }
    
    /**
     * Update penalty shootout result (for knockout matches)
     * @param {number} homeScore - Home team penalty score
     * @param {number} awayScore - Away team penalty score
     * @returns {Match} - Return this instance for chaining
     */
    updatePenaltyResult(homeScore, awayScore) {
        this.penalties.homeScore = parseInt(homeScore, 10);
        this.penalties.awayScore = parseInt(awayScore, 10);
        this.penalties.played = true;
        this.updatedAt = new Date();
        
        // Determine winner
        if (this.penalties.homeScore > this.penalties.awayScore) {
            this.winner = this.homeTeam;
            this.penalties.winner = this.homeTeam;
        } else if (this.penalties.homeScore < this.penalties.awayScore) {
            this.winner = this.awayTeam;
            this.penalties.winner = this.awayTeam;
        } else {
            // This shouldn't happen in a penalty shootout, but just in case
            console.error('Penalty shootout cannot end in a draw');
        }
        
        return this;
    }
    
    /**
     * Check if a match is scheduled (has both teams assigned)
     * @returns {boolean} - Whether the match is scheduled
     */
    isScheduled() {
        return this.homeTeam && this.homeTeam.id && this.awayTeam && this.awayTeam.id;
    }
    
    /**
     * Check if the match has gone to extra time
     * @returns {boolean} - Whether the match went to extra time
     */
    hadExtraTime() {
        return this.extraTime && this.extraTime.played;
    }
    
    /**
     * Check if the match has gone to penalties
     * @returns {boolean} - Whether the match went to penalties
     */
    hadPenalties() {
        return this.penalties && this.penalties.played;
    }
    
    /**
     * Get the final score display, including extra time and penalties if applicable
     * @returns {string} - Formatted score string
     */
    getFinalScoreDisplay() {
        if (!this.played) {
            return 'vs';
        }
        
        let scoreDisplay = `${this.homeScore} - ${this.awayScore}`;
        
        if (this.hadExtraTime()) {
            scoreDisplay += ` (AET: ${this.extraTime.homeScore} - ${this.extraTime.awayScore})`;
        }
        
        if (this.hadPenalties()) {
            scoreDisplay += ` (Pens: ${this.penalties.homeScore} - ${this.penalties.awayScore})`;
        }
        
        return scoreDisplay;
    }
    
    /**
     * Get match status text
     * @returns {string} - Status text
     */
    getStatusText() {
        if (!this.played) {
            // Format date nicely
            const options = { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            return new Date(this.date).toLocaleDateString(undefined, options);
        }
        
        if (this.hadPenalties()) {
            return 'Penalties';
        }
        
        if (this.hadExtraTime()) {
            return 'After Extra Time';
        }
        
        return 'Finished';
    }
    
    /**
     * Generate a unique ID
     * @returns {string} - Unique ID
     * @private
     */
    _generateId() {
        return 'match_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }
    
    /**
     * Serialize match data for storage
     * @returns {Object} - Serialized match data
     */
    serialize() {
        return {
            id: this.id,
            homeTeam: this.homeTeam,
            awayTeam: this.awayTeam,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
            played: this.played,
            matchday: this.matchday,
            round: this.round,
            roundIndex: this.roundIndex,
            group: this.group,
            date: this.date,
            venue: this.venue,
            winner: this.winner,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            stats: this.stats,
            extraTime: this.extraTime,
            penalties: this.penalties
        };
    }
    
    /**
     * Create a Match instance from serialized data
     * @param {Object} data - Serialized match data
     * @returns {Match} - New Match instance
     * @static
     */
    static deserialize(data) {
        return new Match(data);
    }
    
    /**
     * Create matches for a group stage
     * @param {Array} teams - Array of teams in the group
     * @param {string} groupId - Group ID/name
     * @returns {Array} - Array of Match instances
     * @static
     */
    static createGroupMatches(teams, groupId) {
        if (teams.length !== 4) {
            console.error('Group match creation requires exactly 4 teams');
            return [];
        }
        
        // Define the match pattern for a 4-team group (3 matchdays)
        const matchPattern = [
            // Matchday 1
            [
                { home: 0, away: 3 }, // Team 1 vs Team 4
                { home: 1, away: 2 }  // Team 2 vs Team 3
            ],
            // Matchday 2
            [
                { home: 0, away: 1 }, // Team 1 vs Team 2
                { home: 2, away: 3 }  // Team 3 vs Team 4
            ],
            // Matchday 3
            [
                { home: 2, away: 0 }, // Team 3 vs Team 1
                { home: 3, away: 1 }  // Team 4 vs Team 2
            ]
        ];
        
        const matches = [];
        
        // Generate date objects for scheduling (for demonstration)
        const startDate = new Date();
        const matchDays = [];
        for (let i = 0; i < 3; i++) {
            const matchDate = new Date(startDate);
            matchDate.setDate(matchDate.getDate() + (i * 7)); // Weekly matches
            matchDays.push(matchDate);
        }
        
        // Create matches based on the pattern
        matchPattern.forEach((matchdayPattern, matchdayIndex) => {
            const matchday = matchdayIndex + 1;
            
            matchdayPattern.forEach(({ home, away }, matchIndex) => {
                // Create match time (2 hours apart for same matchday)
                const matchTime = new Date(matchDays[matchdayIndex]);
                matchTime.setHours(matchTime.getHours() + (matchIndex * 2));
                
                matches.push(new Match({
                    homeTeam: teams[home],
                    awayTeam: teams[away],
                    matchday: matchday,
                    group: groupId,
                    date: matchTime
                }));
            });
        });
        
        return matches;
    }
    
    /**
     * Create knockout stage matches
     * @param {string} round - Round name
     * @param {number} roundIndex - Round order index
     * @param {number} matchCount - Number of matches in this round
     * @returns {Array} - Array of Match instances
     * @static
     */
    static createKnockoutMatches(round, roundIndex, matchCount) {
        const matches = [];
        
        // Base date for scheduling
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (roundIndex * 7)); // One week between rounds
        
        for (let i = 0; i < matchCount; i++) {
            // Create match time (1 day apart within round)
            const matchTime = new Date(startDate);
            matchTime.setDate(matchTime.getDate() + i);
            
            matches.push(new Match({
                round: round,
                roundIndex: roundIndex,
                date: matchTime
            }));
        }
        
        return matches;
    }
}
