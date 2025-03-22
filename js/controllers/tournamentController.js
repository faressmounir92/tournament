/**
 * tournamentController.js - eFootball Tournament Manager
 * Core controller that manages the overall tournament and coordinates other controllers
 */

const TournamentController = (function() {
    // Private properties
    let _tournament = null;
    let _currentStage = 'setup'; // setup, group, knockout, complete
    let _isLoading = false;
    
    // References to other controllers
    let _groupController = null;
    let _matchController = null;
    let _knockoutController = null;
    
    // Event listeners
    const _eventListeners = {
        tournamentCreated: [],
        tournamentLoaded: [],
        tournamentSaved: [],
        tournamentReset: [],
        stageChanged: [],
        matchUpdated: [],
        groupStageCompleted: [],
        knockoutStageCompleted: [],
        tournamentCompleted: []
    };
    
    // Tournament stage constants
    const TOURNAMENT_STAGES = {
        SETUP: 'setup',
        GROUP: 'group',
        KNOCKOUT: 'knockout',
        COMPLETE: 'complete'
    };

    /**
     * Initialize the tournament controller
     * @param {Object} groupController - Reference to the group controller
     * @param {Object} matchController - Reference to the match controller
     * @param {Object} knockoutController - Reference to the knockout controller
     */
    function init(groupController, matchController, knockoutController) {
        _groupController = groupController;
        _matchController = matchController;
        _knockoutController = knockoutController;
        
        // Initialize other controllers with reference to this controller
        if (_groupController) _groupController.init(this);
        if (_matchController) _matchController.init(this, _groupController, _knockoutController);
        if (_knockoutController) _knockoutController.init(this);
        
        // Try to load current tournament from storage
        loadCurrentTournament();
    }

    /**
     * Create a new tournament
     * @param {Object} config - Tournament configuration
     * @returns {Object} - Created tournament
     */
    function createTournament(config) {
        _isLoading = true;
        
        try {
            // Create new Tournament instance
            _tournament = new Tournament(config);
            
            // Generate matches if needed
            if (_tournament.groups.length > 0) {
                // Load groups into group controller
                if (_groupController) {
                    _groupController.loadGroups(_tournament.groups);
                }
                
                // Generate matches for all groups
                if (_tournament.groups.some(group => group.matches.length === 0)) {
                    if (_groupController) {
                        _groupController.generateMatches();
                        
                        // Update tournament with generated matches
                        _tournament.groups = _groupController.getGroups();
                    }
                }
                
                // Update current stage
                _currentStage = TOURNAMENT_STAGES.GROUP;
            }
            
            // Trigger event
            _triggerEvent('tournamentCreated', _tournament);
            
            // Save tournament
            saveTournament();
            
            return _tournament;
        } catch (error) {
            console.error('Error creating tournament:', error);
            return null;
        } finally {
            _isLoading = false;
        }
    }

    /**
     * Load a tournament by ID
     * @param {string} tournamentId - The ID of the tournament to load
     * @returns {Object|null} - Loaded tournament or null if not found
     */
    function loadTournament(tournamentId) {
        _isLoading = true;
        
        try {
            // Load tournament from storage
            const tournamentData = StorageUtil.loadTournament(tournamentId);
            
            if (!tournamentData) {
                return null;
            }
            
            // Create Tournament instance from data
            _tournament = Tournament.deserialize(tournamentData);
            
            // Load data into controllers
            if (_groupController && _tournament.groups) {
                _groupController.loadGroups(_tournament.groups);
            }
            
            if (_knockoutController && _tournament.knockout) {
                _knockoutController.loadRounds(_tournament.knockout);
            }
            
            // Determine current stage
            if (_tournament.status === 'completed') {
                _currentStage = TOURNAMENT_STAGES.COMPLETE;
            } else if (_tournament.currentStage === 'knockout') {
                _currentStage = TOURNAMENT_STAGES.KNOCKOUT;
            } else if (_tournament.groups && _tournament.groups.length > 0) {
                _currentStage = TOURNAMENT_STAGES.GROUP;
            } else {
                _currentStage = TOURNAMENT_STAGES.SETUP;
            }
            
            // Trigger event
            _triggerEvent('tournamentLoaded', _tournament);
            
            return _tournament;
        } catch (error) {
            console.error('Error loading tournament:', error);
            return null;
        } finally {
            _isLoading = false;
        }
    }

    /**
     * Load the current tournament from storage
     * @returns {Object|null} - Loaded tournament or null if none exists
     */
    function loadCurrentTournament() {
        const tournament = StorageUtil.loadCurrentTournament();
        
        if (tournament) {
            return loadTournament(tournament.id);
        }
        
        return null;
    }

    /**
     * Save the current tournament
     * @returns {boolean} - Success status
     */
    function saveTournament() {
        if (!_tournament) {
            return false;
        }
        
        try {
            // Update tournament properties before saving
            _tournament.updatedAt = new Date();
            _tournament.currentStage = _currentStage;
            
            // If we're using controllers, make sure to get the latest data
            if (_groupController) {
                _tournament.groups = _groupController.getGroups();
            }
            
            if (_knockoutController) {
                _tournament.knockout = _knockoutController.getRounds();
            }
            
            // Save to storage
            const success = StorageUtil.saveTournament(_tournament.serialize());
            
            if (success) {
                _triggerEvent('tournamentSaved', _tournament);
            }
            
            return success;
        } catch (error) {
            console.error('Error saving tournament:', error);
            return false;
        }
    }

    /**
     * Reset the current tournament (clear all match results)
     * @returns {boolean} - Success status
     */
    function resetTournament() {
        if (!_tournament) {
            return false;
        }
        
        try {
            // Reset group stage
            if (_groupController) {
                const groups = _groupController.getGroups();
                
                groups.forEach(group => {
                    group.matches.forEach(match => {
                        match.homeScore = null;
                        match.awayScore = null;
                        match.played = false;
                        match.winner = null;
                    });
                    
                    group.recalculateStandings();
                });
                
                _groupController.loadGroups(groups);
            }
            
            // Reset knockout stage
            if (_knockoutController) {
                _knockoutController.resetKnockoutStage();
            }
            
            // Set stage back to group
            _currentStage = TOURNAMENT_STAGES.GROUP;
            _tournament.currentStage = 'group';
            _tournament.status = 'active';
            
            // Save changes
            saveTournament();
            
            // Trigger event
            _triggerEvent('tournamentReset', _tournament);
            
            return true;
        } catch (error) {
            console.error('Error resetting tournament:', error);
            return false;
        }
    }

    /**
     * Get the current tournament
     * @returns {Object|null} - Current tournament or null if none exists
     */
    function getCurrentTournament() {
        return _tournament;
    }

    /**
     * Get the current tournament stage
     * @returns {string} - Current stage (from TOURNAMENT_STAGES constants)
     */
    function getCurrentStage() {
        return _currentStage;
    }

    /**
     * Set the current tournament stage
     * @param {string} stage - The stage to set (from TOURNAMENT_STAGES constants)
     */
    function setCurrentStage(stage) {
        if (Object.values(TOURNAMENT_STAGES).includes(stage)) {
            const previousStage = _currentStage;
            _currentStage = stage;
            
            if (_tournament) {
                _tournament.currentStage = stage;
                saveTournament();
            }
            
            _triggerEvent('stageChanged', { 
                previousStage: previousStage, 
                newStage: stage 
            });
        }
    }

    /**
     * Progress tournament to the next stage
     * @returns {boolean} - Success status
     */
    function progressToNextStage() {
        switch (_currentStage) {
            case TOURNAMENT_STAGES.SETUP:
                setCurrentStage(TOURNAMENT_STAGES.GROUP);
                return true;
                
            case TOURNAMENT_STAGES.GROUP:
                // Check if all group matches are played
                if (_groupController && _groupController.isGroupStageCompleted()) {
                    // Generate knockout stage based on qualified teams
                    if (_knockoutController) {
                        const qualifiedTeams = _groupController.getQualifiedTeams();
                        const groupCount = _tournament.groups.length;
                        
                        const knockoutRounds = _knockoutController.generateKnockoutStage(
                            qualifiedTeams, 
                            groupCount
                        );
                        
                        // Update tournament with knockout stage
                        _tournament.knockout = knockoutRounds;
                    }
                    
                    setCurrentStage(TOURNAMENT_STAGES.KNOCKOUT);
                    return true;
                }
                return false;
                
            case TOURNAMENT_STAGES.KNOCKOUT:
                // Check if knockout stage is complete
                if (_knockoutController && _knockoutController.isTournamentComplete()) {
                    _tournament.status = 'completed';
                    setCurrentStage(TOURNAMENT_STAGES.COMPLETE);
                    return true;
                }
                return false;
                
            default:
                return false;
        }
    }

    /**
     * Notification from GroupController that a match has been updated
     * @param {string} groupId - The ID of the group containing the match
     * @param {string} matchId - The ID of the updated match
     */
    function notifyMatchUpdated(groupId, matchId) {
        if (_isLoading) return;
        
        // Save tournament with updated match data
        saveTournament();
        
        // Trigger event
        _triggerEvent('matchUpdated', { groupId, matchId });
    }

    /**
     * Notification from KnockoutController that a match has been updated
     * @param {string} matchId - The ID of the updated match
     */
    function notifyKnockoutMatchUpdated(matchId) {
        if (_isLoading) return;
        
        // Save tournament with updated match data
        saveTournament();
        
        // Trigger event
        _triggerEvent('matchUpdated', { stage: 'knockout', matchId });
    }

    /**
     * Notification from GroupController that group stage is completed
     */
    function notifyGroupStageCompleted() {
        if (_isLoading) return;
        
        // Progress to knockout stage
        progressToNextStage();
        
        // Trigger event
        _triggerEvent('groupStageCompleted', {
            groups: _groupController ? _groupController.getGroups() : [],
            qualifiedTeams: _groupController ? _groupController.getQualifiedTeams() : {}
        });
    }

    /**
     * Notification from KnockoutController that tournament is completed
     * @param {Object} winner - The tournament winner
     */
    function notifyTournamentCompleted(winner) {
        if (_isLoading) return;
        
        // Update tournament status
        _tournament.status = 'completed';
        setCurrentStage(TOURNAMENT_STAGES.COMPLETE);
        
        // Save tournament
        saveTournament();
        
        // Trigger event
        _triggerEvent('tournamentCompleted', {
            winner: winner,
            tournament: _tournament
        });
    }

    /**
     * Get tournament statistics
     * @returns {Object} - Tournament statistics
     */
    function getTournamentStats() {
        if (!_tournament) {
            return null;
        }
        
        const stats = {
            id: _tournament.id,
            name: _tournament.name,
            createdAt: _tournament.createdAt,
            updatedAt: _tournament.updatedAt,
            currentStage: _currentStage,
            status: _tournament.status,
            groups: _tournament.groups.length,
            teamsCount: 0,
            matchesTotal: 0,
            matchesPlayed: 0,
            matchesRemaining: 0,
            goalsTotal: 0,
            goalsAverage: 0,
            progress: 0
        };
        
        // Group stage stats
        if (_groupController) {
            const groupStats = _groupController.getGroupStageStats();
            stats.teamsCount = groupStats.teams;
            stats.matchesTotal += groupStats.matches;
            stats.matchesPlayed += groupStats.matchesPlayed;
            stats.matchesRemaining += groupStats.matchesRemaining;
            stats.goalsTotal += groupStats.totalGoals;
        }
        
        // Knockout stage stats
        if (_knockoutController && _tournament.knockout) {
            const knockoutStats = _knockoutController.getKnockoutStageStats();
            stats.matchesTotal += knockoutStats.matches;
            stats.matchesPlayed += knockoutStats.matchesPlayed;
            stats.matchesRemaining += knockoutStats.matchesRemaining;
            stats.goalsTotal += knockoutStats.totalGoals;
        }
        
        // Calculate average goals and progress
        if (stats.matchesPlayed > 0) {
            stats.goalsAverage = (stats.goalsTotal / stats.matchesPlayed).toFixed(2);
        }
        
        if (stats.matchesTotal > 0) {
            stats.progress = Math.round((stats.matchesPlayed / stats.matchesTotal) * 100);
        }
        
        return stats;
    }

    /**
     * Get all saved tournaments
     * @returns {Array} - Array of tournament summary objects
     */
    function getSavedTournaments() {
        const tournamentIds = StorageUtil.getTournamentsList();
        const tournaments = [];
        
        tournamentIds.forEach(id => {
            const tournamentData = StorageUtil.loadTournament(id);
            
            if (tournamentData) {
                tournaments.push({
                    id: tournamentData.id,
                    name: tournamentData.name,
                    createdAt: tournamentData.createdAt,
                    updatedAt: tournamentData.updatedAt,
                    status: tournamentData.status,
                    groups: tournamentData.groups ? tournamentData.groups.length : 0
                });
            }
        });
        
        // Sort by creation date (newest first)
        return tournaments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Delete a tournament
     * @param {string} tournamentId - The ID of the tournament to delete
     * @returns {boolean} - Success status
     */
    function deleteTournament(tournamentId) {
        const success = StorageUtil.deleteTournament(tournamentId);
        
        // If the current tournament was deleted, reset controller state
        if (success && _tournament && _tournament.id === tournamentId) {
            _tournament = null;
            _currentStage = TOURNAMENT_STAGES.SETUP;
            
            if (_groupController) {
                _groupController.loadGroups([]);
            }
            
            if (_knockoutController) {
                _knockoutController.loadRounds([]);
            }
        }
        
        return success;
    }

    /**
     * Add event listener
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when the event occurs
     */
    function addEventListener(eventName, callback) {
        if (_eventListeners[eventName]) {
            _eventListeners[eventName].push(callback);
        }
    }

    /**
     * Remove event listener
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    function removeEventListener(eventName, callback) {
        if (_eventListeners[eventName]) {
            _eventListeners[eventName] = _eventListeners[eventName].filter(
                listener => listener !== callback
            );
        }
    }

    /**
     * Trigger an event
     * @param {string} eventName - Name of the event to trigger
     * @param {*} data - Data to pass to event listeners
     * @private
     */
    function _triggerEvent(eventName, data) {
        if (_eventListeners[eventName]) {
            _eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventName} event listener:`, error);
                }
            });
        }
    }

    // Return public API
    return {
        init,
        createTournament,
        loadTournament,
        loadCurrentTournament,
        saveTournament,
        resetTournament,
        getCurrentTournament,
        getCurrentStage,
        setCurrentStage,
        progressToNextStage,
        notifyMatchUpdated,
        notifyKnockoutMatchUpdated,
        notifyGroupStageCompleted,
        notifyTournamentCompleted,
        getTournamentStats,
        getSavedTournaments,
        deleteTournament,
        addEventListener,
        removeEventListener,
        
        // Constants
        TOURNAMENT_STAGES
    };
})();
