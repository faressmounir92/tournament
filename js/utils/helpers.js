/**
 * helpers.js - eFootball Tournament Manager
 * General utility functions used throughout the application
 */

const Helpers = (function() {
    /**
     * Create an element with attributes and children
     * @param {string} tag - The HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {Array|string|Node} children - Child elements or text content
     * @returns {HTMLElement} - The created element
     */
    function createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        if (children) {
            if (Array.isArray(children)) {
                children.forEach(child => {
                    if (child) {
                        appendChildToElement(element, child);
                    }
                });
            } else {
                appendChildToElement(element, children);
            }
        }
        
        return element;
    }
    
    /**
     * Append a child to an element
     * @param {HTMLElement} element - The parent element
     * @param {string|Node} child - The child to append
     */
    function appendChildToElement(element, child) {
        if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    }
    
    /**
     * Clear all children from an element
     * @param {HTMLElement} element - The element to clear
     */
    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    
    /**
     * Toggle the visibility of an element
     * @param {HTMLElement} element - The element to toggle
     * @param {boolean} show - Whether to show or hide the element
     */
    function toggleElement(element, show) {
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }
    
    /**
     * Format a date string
     * @param {Date|string} date - The date to format
     * @param {string} format - The format string (default: 'YYYY-MM-DD')
     * @returns {string} - The formatted date string
     */
    function formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
    
    /**
     * Shuffle an array (Fisher-Yates algorithm)
     * @param {Array} array - The array to shuffle
     * @returns {Array} - The shuffled array
     */
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    /**
     * Generate match schedules for a group
     * @param {Array} teams - Array of team objects
     * @returns {Array} - Array of match objects grouped by matchday
     */
    function generateMatchSchedule(teams) {
        // Ensure we have exactly 4 teams (standard group size)
        if (teams.length !== 4) {
            console.error('Match schedule generation requires exactly 4 teams');
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
        
        // Generate matches based on the pattern
        const matchSchedule = [];
        
        matchPattern.forEach((matchdayPattern, matchdayIndex) => {
            const matchday = matchdayIndex + 1;
            const matches = [];
            
            matchdayPattern.forEach(({ home, away }) => {
                matches.push({
                    id: generateMatchId(teams[home].id, teams[away].id, matchday),
                    matchday: matchday,
                    homeTeam: teams[home],
                    awayTeam: teams[away],
                    homeScore: null,
                    awayScore: null,
                    played: false,
                    date: new Date()
                });
            });
            
            matchSchedule.push({
                matchday: matchday,
                matches: matches
            });
        });
        
        return matchSchedule;
    }
    
    /**
     * Generate a unique match ID
     * @param {string} homeTeamId - Home team ID
     * @param {string} awayTeamId - Away team ID
     * @param {number} matchday - Matchday number
     * @returns {string} - Unique match ID
     */
    function generateMatchId(homeTeamId, awayTeamId, matchday) {
        return `match_${homeTeamId}_${awayTeamId}_${matchday}_${Date.now()}`;
    }
    
    /**
     * Calculate group standings based on match results
     * @param {Array} teams - Array of team objects
     * @param {Array} matches - Array of match objects
     * @returns {Array} - Sorted array of team standings
     */
    function calculateGroupStandings(teams, matches) {
        // Initialize standings with 0 values
        const standings = teams.map(team => ({
            ...team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));
        
        // Process played matches
        matches.forEach(match => {
            if (match.played && match.homeScore !== null && match.awayScore !== null) {
                const homeTeamIndex = standings.findIndex(team => team.id === match.homeTeam.id);
                const awayTeamIndex = standings.findIndex(team => team.id === match.awayTeam.id);
                
                if (homeTeamIndex !== -1 && awayTeamIndex !== -1) {
                    // Update matches played
                    standings[homeTeamIndex].played += 1;
                    standings[awayTeamIndex].played += 1;
                    
                    // Update goals
                    standings[homeTeamIndex].goalsFor += match.homeScore;
                    standings[homeTeamIndex].goalsAgainst += match.awayScore;
                    standings[awayTeamIndex].goalsFor += match.awayScore;
                    standings[awayTeamIndex].goalsAgainst += match.homeScore;
                    
                    // Update results and points
                    if (match.homeScore > match.awayScore) {
                        // Home team wins
                        standings[homeTeamIndex].won += 1;
                        standings[homeTeamIndex].points += 3;
                        standings[awayTeamIndex].lost += 1;
                    } else if (match.homeScore < match.awayScore) {
                        // Away team wins
                        standings[awayTeamIndex].won += 1;
                        standings[awayTeamIndex].points += 3;
                        standings[homeTeamIndex].lost += 1;
                    } else {
                        // Draw
                        standings[homeTeamIndex].drawn += 1;
                        standings[homeTeamIndex].points += 1;
                        standings[awayTeamIndex].drawn += 1;
                        standings[awayTeamIndex].points += 1;
                    }
                }
            }
        });
        
        // Calculate goal differences
        standings.forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });
        
        // Sort standings
        return sortGroupStandings(standings);
    }
    
    /**
     * Sort group standings using FIFA rules
     * 1. Points
     * 2. Goal difference
     * 3. Goals scored
     * 4. Head-to-head results
     * 5. Alphabetically (fallback)
     * @param {Array} standings - Array of team standings
     * @returns {Array} - Sorted standings
     */
    function sortGroupStandings(standings) {
        return [...standings].sort((a, b) => {
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
            
            // 5. Alphabetically (as fallback)
            return a.name.localeCompare(b.name);
            
            // Note: Head-to-head would require match data between these specific teams
            // This is simplified for now
        });
    }
    
    /**
     * Determine the qualified teams based on standings and group count
     * @param {Array} groups - Array of group objects with standings
     * @returns {Object} - Object containing arrays of qualified teams by category
     */
    function determineQualifiedTeams(groups) {
        const qualifiedTeams = {
            winners: [],
            runnersUp: [],
            bestThirds: []
        };
        
        // Add group winners and runners-up
        groups.forEach(group => {
            if (group.standings.length >= 1) {
                qualifiedTeams.winners.push({
                    team: group.standings[0],
                    group: group.name
                });
            }
            
            if (group.standings.length >= 2) {
                qualifiedTeams.runnersUp.push({
                    team: group.standings[1],
                    group: group.name
                });
            }
        });
        
        // If we have 3 or 6 groups, we need to determine best third-placed teams
        if (groups.length === 3 || groups.length === 6) {
            const thirdPlacedTeams = groups
                .filter(group => group.standings.length >= 3)
                .map(group => ({
                    team: group.standings[2],
                    group: group.name
                }));
            
            // Sort third-placed teams using the same criteria as group standings
            thirdPlacedTeams.sort((a, b) => {
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
            
            // Take the required number of best third-placed teams
            const requiredBestThirds = groups.length === 3 ? 2 : 4;
            qualifiedTeams.bestThirds = thirdPlacedTeams.slice(0, requiredBestThirds);
        }
        
        return qualifiedTeams;
    }
    
    /**
     * Generate knockout stage matches based on qualified teams
     * @param {Object} qualifiedTeams - Object containing qualified teams
     * @param {number} groupCount - Number of groups in the tournament
     * @returns {Array} - Array of knockout stage objects
     */
    function generateKnockoutStage(qualifiedTeams, groupCount) {
        const knockoutStage = [];
        let matches = [];
        
        // Determine knockout format based on group count
        switch (groupCount) {
            case 1:
                // 4 teams, straight to semifinals (top 4 from the group)
                matches = generateSemifinals(qualifiedTeams.winners.slice(0, 1), [], [], []);
                knockoutStage.push({
                    round: 'Semifinals',
                    matches: matches
                });
                
                knockoutStage.push({
                    round: 'Final',
                    matches: generateFinal()
                });
                break;
                
            case 2:
                // 8 teams, straight to quarterfinals
                matches = generateQuarterfinals(qualifiedTeams.winners, qualifiedTeams.runnersUp);
                knockoutStage.push({
                    round: 'Quarterfinals',
                    matches: matches
                });
                
                knockoutStage.push({
                    round: 'Semifinals',
                    matches: generateSemifinals()
                });
                
                knockoutStage.push({
                    round: 'Final',
                    matches: generateFinal()
                });
                break;
                
            case 3:
                // 8 teams: 3 group winners, 3 runners-up, 2 best third-placed
                matches = generateQuarterfinals(
                    qualifiedTeams.winners, 
                    qualifiedTeams.runnersUp,
                    qualifiedTeams.bestThirds
                );
                knockoutStage.push({
                    round: 'Quarterfinals',
                    matches: matches
                });
                
                knockoutStage.push({
                    round: 'Semifinals',
                    matches: generateSemifinals()
                });
                
                knockoutStage.push({
                    round: 'Final',
                    matches: generateFinal()
                });
                break;
                
            case 4:
                // 8 teams: 4 group winners, 4 runners-up, straight to quarterfinals
                matches = generateQuarterfinals(qualifiedTeams.winners, qualifiedTeams.runnersUp);
                knockoutStage.push({
                    round: 'Quarterfinals',
                    matches: matches
                });
                
                knockoutStage.push({
                    round: 'Semifinals',
                    matches: generateSemifinals()
                });
                
                knockoutStage.push({
                    round: 'Final',
                    matches: generateFinal()
                });
                break;
                
            case 6:
            case 8:
                // Round of 16 first
                matches = generateRoundOf16(
                    qualifiedTeams.winners,
                    qualifiedTeams.runnersUp,
                    qualifiedTeams.bestThirds
                );
                knockoutStage.push({
                    round: 'Round of 16',
                    matches: matches
                });
                
                knockoutStage.push({
                    round: 'Quarterfinals',
                    matches: generateQuarterfinals()
                });
                
                knockoutStage.push({
                    round: 'Semifinals',
                    matches: generateSemifinals()
                });
                
                knockoutStage.push({
                    round: 'Final',
                    matches: generateFinal()
                });
                break;
                
            default:
                console.error('Unsupported group count for knockout stage generation');
        }
        
        return knockoutStage;
    }
    
    /**
     * Generate Round of 16 matches
     * @param {Array} winners - Group winners
     * @param {Array} runnersUp - Group runners-up
     * @param {Array} bestThirds - Best third-placed teams
     * @returns {Array} - Array of Round of 16 match objects
     */
    function generateRoundOf16(winners = [], runnersUp = [], bestThirds = []) {
        // This is a placeholder - in a real implementation, you'd need to follow the
        // specific tournament format rules for how teams are paired in the Round of 16
        const matches = [];
        
        // For demonstration purposes, we'll pair teams in a standard way
        // In a real tournament, the pairings would follow specific rules
        // to avoid teams from the same group meeting again
        
        // Example pairing (simplified)
        const pairedTeams = [
            { home: winners[0], away: runnersUp[3] },
            { home: winners[1], away: runnersUp[2] },
            { home: winners[2], away: runnersUp[1] },
            { home: winners[3], away: runnersUp[0] },
            { home: winners[4], away: bestThirds[0] },
            { home: winners[5], away: bestThirds[1] },
            { home: winners[6], away: bestThirds[2] },
            { home: winners[7], away: bestThirds[3] }
        ];
        
        pairedTeams.forEach((pair, index) => {
            if (pair.home && pair.away) {
                matches.push({
                    id: `r16_${index}`,
                    round: 'Round of 16',
                    match: index + 1,
                    homeTeam: pair.home.team,
                    awayTeam: pair.away.team,
                    homeScore: null,
                    awayScore: null,
                    played: false,
                    winner: null,
                    date: new Date()
                });
            }
        });
        
        return matches;
    }
    
    /**
     * Generate Quarterfinal matches
     * @param {Array} winners - Group winners
     * @param {Array} runnersUp - Group runners-up
     * @param {Array} bestThirds - Best third-placed teams
     * @returns {Array} - Array of Quarterfinal match objects
     */
    function generateQuarterfinals(winners = [], runnersUp = [], bestThirds = []) {
        const matches = [];
        
        // If we have teams passed in, this is the initial generation
        if (winners.length > 0 || runnersUp.length > 0 || bestThirds.length > 0) {
            // Combine all qualified teams
            const allTeams = [...winners, ...runnersUp, ...bestThirds];
            
            // Create 4 quarterfinal matches
            for (let i = 0; i < 4; i++) {
                if (i * 2 + 1 < allTeams.length) {
                    matches.push({
                        id: `qf_${i}`,
                        round: 'Quarterfinals',
                        match: i + 1,
                        homeTeam: allTeams[i * 2].team,
                        awayTeam: allTeams[i * 2 + 1].team,
                        homeScore: null,
                        awayScore: null,
                        played: false,
                        winner: null,
                        date: new Date()
                    });
                }
            }
        } else {
            // This is a placeholder for bracket creation
            for (let i = 0; i < 4; i++) {
                matches.push({
                    id: `qf_${i}`,
                    round: 'Quarterfinals',
                    match: i + 1,
                    homeTeam: { name: 'TBD', id: `qf_home_${i}` },
                    awayTeam: { name: 'TBD', id: `qf_away_${i}` },
                    homeScore: null,
                    awayScore: null,
                    played: false,
                    winner: null,
                    date: new Date()
                });
            }
        }
        
        return matches;
    }
    
    /**
     * Generate Semifinal matches
     * @param {Array} winners - Group winners (for direct semifinals)
     * @returns {Array} - Array of Semifinal match objects
     */
    function generateSemifinals(winners = []) {
        const matches = [];
        
        // If winners are passed for direct semifinals (e.g., 1 group tournament)
        if (winners.length > 0) {
            // Create 2 semifinal matches
            for (let i = 0; i < 2; i++) {
                if (i * 2 + 1 < winners.length * 4) { // Assume winners contains just 1 team (top of group)
                    const team1Pos = i * 2;
                    const team2Pos = i * 2 + 1;
                    const team1 = team1Pos < winners.length * 4 ? 
                                 { name: `Group ${winners[0].group} ${getSuffix(team1Pos)}`, id: `sf_direct_${team1Pos}` } : 
                                 { name: 'TBD', id: `sf_direct_${i}_home` };
                    const team2 = team2Pos < winners.length * 4 ? 
                                 { name: `Group ${winners[0].group} ${getSuffix(team2Pos)}`, id: `sf_direct_${team2Pos}` } : 
                                 { name: 'TBD', id: `sf_direct_${i}_away` };
                    
                    matches.push({
                        id: `sf_${i}`,
                        round: 'Semifinals',
                        match: i + 1,
                        homeTeam: team1,
                        awayTeam: team2,
                        homeScore: null,
                        awayScore: null,
                        played: false,
                        winner: null,
                        date: new Date()
                    });
                }
            }
        } else {
            // This is a placeholder for bracket creation
            for (let i = 0; i < 2; i++) {
                matches.push({
                    id: `sf_${i}`,
                    round: 'Semifinals',
                    match: i + 1,
                    homeTeam: { name: 'TBD', id: `sf_home_${i}` },
                    awayTeam: { name: 'TBD', id: `sf_away_${i}` },
                    homeScore: null,
                    awayScore: null,
                    played: false,
                    winner: null,
                    date: new Date()
                });
            }
        }
        
        return matches;
    }
    
    /**
     * Generate Final match
     * @returns {Array} - Array with one Final match object
     */
    function generateFinal() {
        return [
            {
                id: 'final',
                round: 'Final',
                match: 1,
                homeTeam: { name: 'TBD', id: 'final_home' },
                awayTeam: { name: 'TBD', id: 'final_away' },
                homeScore: null,
                awayScore: null,
                played: false,
                winner: null,
                date: new Date()
            }
        ];
    }
    
    /**
     * Get suffix for position (1st, 2nd, etc.)
     * @param {number} position - The position (0-based)
     * @returns {string} - Position with suffix
     */
    function getSuffix(position) {
        position += 1; // Convert to 1-based
        const j = position % 10;
        const k = position % 100;
        
        if (j === 1 && k !== 11) {
            return position + "st";
        }
        if (j === 2 && k !== 12) {
            return position + "nd";
        }
        if (j === 3 && k !== 13) {
            return position + "rd";
        }
        return position + "th";
    }
    
    /**
     * Update a match result and recalculate standings
     * @param {Object} match - The match object to update
     * @param {number} homeScore - Home team score
     * @param {number} awayScore - Away team score
     * @param {Array} groups - Array of group objects
     * @returns {Object} - Updated match
     */
    function updateMatchResult(match, homeScore, awayScore, groups) {
        // Update match data
        match.homeScore = parseInt(homeScore, 10);
        match.awayScore = parseInt(awayScore, 10);
        match.played = true;
        
        // Determine winner
        if (match.homeScore > match.awayScore) {
            match.winner = match.homeTeam;
        } else if (match.homeScore < match.awayScore) {
            match.winner = match.awayTeam;
        } else {
            match.winner = null; // Draw
        }
        
        return match;
    }
    
    /**
     * Format a team name with its score (for display)
     * @param {Object} team - Team object
     * @param {number|null} score - Team score
     * @returns {string} - Formatted team and score
     */
    function formatTeamWithScore(team, score) {
        if (score === null) {
            return team.name;
        }
        return `${team.name} (${score})`;
    }
    
    /**
     * Check if all matches in a group have been played
     * @param {Array} matches - Array of match objects
     * @returns {boolean} - Whether all matches have been played
     */
    function areAllMatchesPlayed(matches) {
        return matches.every(match => match.played);
    }
    
    /**
     * Convert snake_case or kebab-case to Title Case
     * @param {string} str - The string to convert
     * @returns {string} - Title Case string
     */
    function toTitleCase(str) {
        if (!str) return '';
        
        return str
            .replace(/[-_]/g, ' ')
            .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    
    /**
     * Validate a tournament name
     * @param {string} name - The tournament name to validate
     * @returns {boolean} - Whether the name is valid
     */
    function isValidTournamentName(name) {
        return name && name.trim().length >= 3;
    }
    
    /**
     * Validate a team name
     * @param {string} name - The team name to validate
     * @returns {boolean} - Whether the name is valid
     */
    function isValidTeamName(name) {
        return name && name.trim().length >= 2;
    }
    
    /**
     * Generate random team names for testing
     * @param {number} count - Number of team names to generate
     * @returns {Array} - Array of team names
     */
    function generateRandomTeamNames(count) {
        const countries = [
            'Brazil', 'France', 'Germany', 'Italy', 'Argentina', 'Spain', 'England', 
            'Netherlands', 'Portugal', 'Belgium', 'Uruguay', 'Colombia', 'Mexico', 
            'Sweden', 'Croatia', 'Denmark', 'Japan', 'South Korea', 'Australia', 
            'Switzerland', 'Poland', 'Chile', 'USA', 'Nigeria', 'Cameroon', 'Egypt',
            'Morocco', 'Senegal', 'Ghana', 'Ivory Coast', 'Algeria', 'Tunisia'
        ];
        
        return shuffleArray(countries).slice(0, count);
    }
    
    // Return public API
    return {
        createElement,
        clearElement,
        toggleElement,
        formatDate,
        shuffleArray,
        generateMatchSchedule,
        calculateGroupStandings,
        determineQualifiedTeams,
        generateKnockoutStage,
        updateMatchResult,
        formatTeamWithScore,
        areAllMatchesPlayed,
        toTitleCase,
        isValidTournamentName,
        isValidTeamName,
        generateRandomTeamNames
    };
})();
