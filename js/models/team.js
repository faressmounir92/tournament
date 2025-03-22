/**
 * team.js - eFootball Tournament Manager
 * Team model that encapsulates team data and statistics
 */

class Team {
    /**
     * Create a new Team
     * @param {Object} config - Team configuration
     * @param {string} config.id - Team ID
     * @param {string} config.name - Team name
     * @param {string} config.group - Group ID this team belongs to
     */
    constructor(config = {}) {
        this.id = config.id || this._generateId();
        this.name = config.name || 'Unnamed Team';
        this.group = config.group || null;
        this.createdAt = config.createdAt || new Date();
        
        // Team statistics - will be updated during tournament
        this.stats = config.stats || {
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            position: null,
            isQualified: false,
            isBestThird: false
        };
        
        // Additional properties that can be added later
        this.coach = config.coach || '';
        this.colorCode = config.colorCode || this._generateRandomColor();
    }
    
    /**
     * Update team statistics based on a match result
     * @param {number} goalsScored - Goals scored by this team
     * @param {number} goalsConceded - Goals conceded by this team
     * @returns {Team} - Return this instance for chaining
     */
    updateStats(goalsScored, goalsConceded) {
        this.stats.played += 1;
        this.stats.goalsFor += goalsScored;
        this.stats.goalsAgainst += goalsConceded;
        
        // Update results
        if (goalsScored > goalsConceded) {
            this.stats.won += 1;
            this.stats.points += 3;
        } else if (goalsScored < goalsConceded) {
            this.stats.lost += 1;
        } else {
            this.stats.drawn += 1;
            this.stats.points += 1;
        }
        
        // Update goal difference
        this.stats.goalDifference = this.stats.goalsFor - this.stats.goalsAgainst;
        
        return this;
    }
    
    /**
     * Update qualification status
     * @param {boolean} isQualified - Whether the team has qualified
     * @param {boolean} isBestThird - Whether the team qualified as a best third
     * @param {number} position - Final position in group
     * @returns {Team} - Return this instance for chaining
     */
    updateQualificationStatus(isQualified, isBestThird = false, position = null) {
        this.stats.isQualified = isQualified;
        this.stats.isBestThird = isBestThird;
        
        if (position !== null) {
            this.stats.position = position;
        }
        
        return this;
    }
    
    /**
     * Reset team statistics
     * @returns {Team} - Return this instance for chaining
     */
    resetStats() {
        this.stats = {
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            position: null,
            isQualified: false,
            isBestThird: false
        };
        
        return this;
    }
    
    /**
     * Get win rate as a percentage
     * @returns {number} - Win rate percentage
     */
    getWinRate() {
        if (this.stats.played === 0) {
            return 0;
        }
        
        return (this.stats.won / this.stats.played * 100).toFixed(1);
    }
    
    /**
     * Calculate points per game
     * @returns {number} - Points per game
     */
    getPointsPerGame() {
        if (this.stats.played === 0) {
            return 0;
        }
        
        return (this.stats.points / this.stats.played).toFixed(2);
    }
    
    /**
     * Get an HTML representation of the team name with optional styling
     * @param {boolean} includeColor - Whether to include team color styling
     * @returns {string} - HTML string
     */
    getHtmlDisplay(includeColor = true) {
        if (includeColor && this.colorCode) {
            return `<span class="team-name" style="color: ${this.colorCode}">${this.name}</span>`;
        }
        
        return `<span class="team-name">${this.name}</span>`;
    }
    
    /**
     * Set the team color code
     * @param {string} colorCode - CSS color value
     * @returns {Team} - Return this instance for chaining
     */
    setColor(colorCode) {
        this.colorCode = colorCode;
        return this;
    }
    
    /**
     * Generate random color for the team
     * @returns {string} - CSS hex color value
     * @private
     */
    _generateRandomColor() {
        // List of distinct colors that are easy to distinguish
        const colors = [
            '#e53935', // Red
            '#1e88e5', // Blue
            '#43a047', // Green
            '#ffb300', // Amber
            '#8e24aa', // Purple
            '#00acc1', // Cyan
            '#f4511e', // Deep Orange
            '#5c6bc0', // Indigo
            '#00897b', // Teal
            '#c0ca33'  // Lime
        ];
        
        // Get random color from the list
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Generate a unique ID
     * @returns {string} - Unique ID
     * @private
     */
    _generateId() {
        return 'team_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }
    
    /**
     * Serialize team data for storage
     * @returns {Object} - Serialized team data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            group: this.group,
            createdAt: this.createdAt,
            stats: this.stats,
            coach: this.coach,
            colorCode: this.colorCode
        };
    }
    
    /**
     * Create a Team instance from serialized data
     * @param {Object} data - Serialized team data
     * @returns {Team} - New Team instance
     * @static
     */
    static deserialize(data) {
        return new Team(data);
    }
}
