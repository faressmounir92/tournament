/**
 * storage.js - eFootball Tournament Manager
 * Utility functions for saving and loading data using localStorage
 */

const StorageUtil = (function() {
    // Key constants
    const STORAGE_KEYS = {
        TOURNAMENT_DATA: 'efootball_tournament_data',
        CURRENT_TOURNAMENT: 'efootball_current_tournament',
        THEME: 'efootball_theme',
        TOURNAMENTS_LIST: 'efootball_tournaments_list'
    };

    /**
     * Save tournament data to localStorage
     * @param {Object} tournamentData - The tournament data to save
     * @returns {boolean} - Success status
     */
    function saveTournament(tournamentData) {
        try {
            if (!tournamentData || !tournamentData.id) {
                console.error('Invalid tournament data');
                return false;
            }

            // Generate a unique ID if one doesn't exist
            if (!tournamentData.id) {
                tournamentData.id = generateUniqueId();
            }

            // Save the tournament to localStorage
            localStorage.setItem(
                `${STORAGE_KEYS.TOURNAMENT_DATA}_${tournamentData.id}`,
                JSON.stringify(tournamentData)
            );

            // Update the tournaments list
            const tournamentsList = getTournamentsList();
            if (!tournamentsList.includes(tournamentData.id)) {
                tournamentsList.push(tournamentData.id);
                localStorage.setItem(
                    STORAGE_KEYS.TOURNAMENTS_LIST,
                    JSON.stringify(tournamentsList)
                );
            }

            // Set as current tournament
            setCurrentTournament(tournamentData.id);

            return true;
        } catch (error) {
            console.error('Error saving tournament:', error);
            return false;
        }
    }

    /**
     * Load tournament data from localStorage
     * @param {string} tournamentId - The ID of the tournament to load
     * @returns {Object|null} - The tournament data or null if not found
     */
    function loadTournament(tournamentId) {
        try {
            if (!tournamentId) {
                console.error('Tournament ID is required');
                return null;
            }

            const tournamentData = localStorage.getItem(
                `${STORAGE_KEYS.TOURNAMENT_DATA}_${tournamentId}`
            );
            
            if (!tournamentData) {
                return null;
            }

            return JSON.parse(tournamentData);
        } catch (error) {
            console.error('Error loading tournament:', error);
            return null;
        }
    }

    /**
     * Load the current tournament
     * @returns {Object|null} - The current tournament data or null if none exists
     */
    function loadCurrentTournament() {
        try {
            const currentTournamentId = localStorage.getItem(STORAGE_KEYS.CURRENT_TOURNAMENT);
            
            if (!currentTournamentId) {
                return null;
            }

            return loadTournament(currentTournamentId);
        } catch (error) {
            console.error('Error loading current tournament:', error);
            return null;
        }
    }

    /**
     * Set the current tournament ID
     * @param {string} tournamentId - The ID of the tournament to set as current
     */
    function setCurrentTournament(tournamentId) {
        if (tournamentId) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_TOURNAMENT, tournamentId);
        }
    }

    /**
     * Delete a tournament
     * @param {string} tournamentId - The ID of the tournament to delete
     * @returns {boolean} - Success status
     */
    function deleteTournament(tournamentId) {
        try {
            if (!tournamentId) {
                return false;
            }

            // Remove tournament data
            localStorage.removeItem(`${STORAGE_KEYS.TOURNAMENT_DATA}_${tournamentId}`);

            // Update tournaments list
            const tournamentsList = getTournamentsList().filter(id => id !== tournamentId);
            localStorage.setItem(
                STORAGE_KEYS.TOURNAMENTS_LIST,
                JSON.stringify(tournamentsList)
            );

            // If this was the current tournament, clear the current tournament
            const currentTournamentId = localStorage.getItem(STORAGE_KEYS.CURRENT_TOURNAMENT);
            if (currentTournamentId === tournamentId) {
                localStorage.removeItem(STORAGE_KEYS.CURRENT_TOURNAMENT);
            }

            return true;
        } catch (error) {
            console.error('Error deleting tournament:', error);
            return false;
        }
    }

    /**
     * Get a list of all saved tournament IDs
     * @returns {Array} - Array of tournament IDs
     */
    function getTournamentsList() {
        try {
            const list = localStorage.getItem(STORAGE_KEYS.TOURNAMENTS_LIST);
            return list ? JSON.parse(list) : [];
        } catch (error) {
            console.error('Error getting tournaments list:', error);
            return [];
        }
    }

    /**
     * Save the theme preference
     * @param {string} theme - The theme name ('light' or 'dark')
     */
    function saveThemePreference(theme) {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }

    /**
     * Get the saved theme preference
     * @returns {string} - The theme name ('light' or 'dark')
     */
    function getThemePreference() {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    }

    /**
     * Clear all tournament data from localStorage
     */
    function clearAllData() {
        const tournamentsList = getTournamentsList();
        
        // Remove all tournament data
        tournamentsList.forEach(id => {
            localStorage.removeItem(`${STORAGE_KEYS.TOURNAMENT_DATA}_${id}`);
        });
        
        // Clear lists and current tournament
        localStorage.removeItem(STORAGE_KEYS.TOURNAMENTS_LIST);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_TOURNAMENT);
    }

    /**
     * Generate a unique ID
     * @returns {string} - A unique ID
     */
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} - Whether localStorage is available
     */
    function isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Return public API
    return {
        saveTournament,
        loadTournament,
        loadCurrentTournament,
        setCurrentTournament,
        deleteTournament,
        getTournamentsList,
        saveThemePreference,
        getThemePreference,
        clearAllData,
        isStorageAvailable
    };
})();
