/**
 * Soccer League Manager
 * Main JavaScript file handling league creation, fixtures, and standings
 */

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the app
  LeagueManager.init();
});

// Main LeagueManager object using module pattern
const LeagueManager = (function() {
  // Private variables
  let _currentLeague = null;
  let _currentMatchday = 1;
  let _currentTab = 'standings';
  let _fixtureView = 'all'; // all, pending, completed
  
  // DOM elements (caching for performance)
  const _domElements = {
    // Screens
    welcomeScreen: document.getElementById('welcomeScreen'),
    setupScreen: document.getElementById('leagueSetupScreen'),
    leagueViewScreen: document.getElementById('leagueViewScreen'),
    
    // Buttons
    createLeagueBtn: document.getElementById('createLeagueBtn'),
    backToWelcomeBtn: document.getElementById('backToWelcomeBtn'),
    saveLeagueBtn: document.getElementById('saveLeagueBtn'),
    newLeagueBtn: document.getElementById('newLeagueBtn'),
    themeToggleBtn: document.getElementById('themeToggle'),
    aboutLinkBtn: document.getElementById('aboutLink'),
    
    // Navigation tabs
    standingsBtn: document.getElementById('standingsBtn'),
    fixturesBtn: document.getElementById('fixturesBtn'),
    statsBtn: document.getElementById('statsBtn'),
    
    // Fixtures navigation
    prevMatchdayBtn: document.getElementById('prevMatchdayBtn'),
    nextMatchdayBtn: document.getElementById('nextMatchdayBtn'),
    currentMatchdayDisplay: document.getElementById('currentMatchdayDisplay'),
    allFixturesBtn: document.getElementById('allFixturesBtn'),
    pendingFixturesBtn: document.getElementById('pendingFixturesBtn'),
    completedFixturesBtn: document.getElementById('completedFixturesBtn'),
    
    // Content containers
    playersInputContainer: document.getElementById('playersInputContainer'),
    standingsTableBody: document.getElementById('standingsTableBody'),
    fixturesList: document.getElementById('fixturesList'),
    leagueDisplayName: document.getElementById('leagueDisplayName'),
    
    // Modals
    aboutModal: document.getElementById('aboutModal'),
    matchResultModal: document.getElementById('matchResultModal'),
    
    // Modal content
    homeTeamName: document.getElementById('homeTeamName'),
    awayTeamName: document.getElementById('awayTeamName'),
    homeTeamScore: document.getElementById('homeTeamScore'),
    awayTeamScore: document.getElementById('awayTeamScore'),
    modalMatchInfo: document.getElementById('modalMatchInfo'),
    saveResultBtn: document.getElementById('saveResultBtn'),
    
    // Stats content
    topScorers: document.getElementById('topScorers'),
    leagueStats: document.getElementById('leagueStats')
  };
  
  // Templates
  const _templates = {
    standingsTableRow: document.getElementById('standingRowTemplate'),
    fixtureCard: document.getElementById('fixtureTemplate')
  };
  
  /**
   * Initialize the application
   */
  function init() {
    // Try to load saved league
    loadSavedLeague();
    
    // Add event listeners
    addEventListeners();
    
    // Set default theme
    initTheme();
  }
  
  /**
   * Add event listeners to interactive elements
   */
  function addEventListeners() {
    // Button clicks
    _domElements.createLeagueBtn.addEventListener('click', showSetupScreen);
    _domElements.backToWelcomeBtn.addEventListener('click', showWelcomeScreen);
    _domElements.newLeagueBtn.addEventListener('click', showSetupScreen);
    _domElements.saveLeagueBtn.addEventListener('click', saveLeague);
    _domElements.themeToggleBtn.addEventListener('click', toggleTheme);
    _domElements.aboutLinkBtn.addEventListener('click', showAboutModal);
    
    // Navigation tabs
    _domElements.standingsBtn.addEventListener('click', () => switchTab('standings'));
    _domElements.fixturesBtn.addEventListener('click', () => switchTab('fixtures'));
    _domElements.statsBtn.addEventListener('click', () => switchTab('stats'));
    
    // Fixture navigation
    _domElements.prevMatchdayBtn.addEventListener('click', navigateToPrevMatchday);
    _domElements.nextMatchdayBtn.addEventListener('click', navigateToNextMatchday);
    _domElements.allFixturesBtn.addEventListener('click', () => setFixtureView('all'));
    _domElements.pendingFixturesBtn.addEventListener('click', () => setFixtureView('pending'));
    _domElements.completedFixturesBtn.addEventListener('click', () => setFixtureView('completed'));
    
    // Form submission
    const setupForm = document.getElementById('leagueSetupForm');
    if (setupForm) {
      setupForm.addEventListener('submit', handleLeagueSetup);
    }
    
    // Number of players change
    const playerSelect = document.getElementById('numberOfPlayers');
    if (playerSelect) {
      playerSelect.addEventListener('change', handlePlayerCountChange);
    }
    
    // Match result modal
    const closeModalButtons = document.querySelectorAll('.close-modal');
    closeModalButtons.forEach(button => {
      button.addEventListener('click', () => {
        closeModal(_domElements.matchResultModal);
        closeModal(_domElements.aboutModal);
      });
    });
    
    // Save result button
    _domElements.saveResultBtn.addEventListener('click', saveMatchResult);
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === _domElements.matchResultModal) {
        closeModal(_domElements.matchResultModal);
      }
      if (event.target === _domElements.aboutModal) {
        closeModal(_domElements.aboutModal);
      }
    });
    
    // Fixture cards (delegated event handler for dynamic content)
    document.addEventListener('click', handleFixtureClick);
  }
  
  /**
   * Initialize theme based on saved preference or OS setting
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
  
  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }
  
  /**
   * Show welcome screen
   */
  function showWelcomeScreen() {
    hideAllScreens();
    _domElements.welcomeScreen.classList.add('active');
  }
  
  /**
   * Show league setup screen
   */
  function showSetupScreen() {
    hideAllScreens();
    _domElements.setupScreen.classList.add('active');
    
    // Reset form
    const setupForm = document.getElementById('leagueSetupForm');
    if (setupForm) {
      setupForm.reset();
    }
    
    // Clear player inputs
    _domElements.playersInputContainer.innerHTML = '';
  }
  
  /**
   * Show league view screen
   */
  function showLeagueViewScreen() {
    hideAllScreens();
    _domElements.leagueViewScreen.classList.add('active');
    
    // Set league name
    if (_currentLeague) {
      _domElements.leagueDisplayName.textContent = _currentLeague.name;
    }
    
    // Show default tab
    switchTab(_currentTab);
  }
  
  /**
   * Hide all screens
   */
  function hideAllScreens() {
    _domElements.welcomeScreen.classList.remove('active');
    _domElements.setupScreen.classList.remove('active');
    _domElements.leagueViewScreen.classList.remove('active');
  }
  
  /**
   * Switch between tabs in the league view
   * @param {string} tab - Tab name: 'standings', 'fixtures', or 'stats'
   */
  function switchTab(tab) {
    // Update current tab
    _currentTab = tab;
    
    // Update active tab button
    _domElements.standingsBtn.classList.remove('active');
    _domElements.fixturesBtn.classList.remove('active');
    _domElements.statsBtn.classList.remove('active');
    
    // Show selected tab content
    document.getElementById('standingsContent').classList.remove('active');
    document.getElementById('fixturesContent').classList.remove('active');
    document.getElementById('statsContent').classList.remove('active');
    
    // Set active tab
    switch (tab) {
      case 'standings':
        _domElements.standingsBtn.classList.add('active');
        document.getElementById('standingsContent').classList.add('active');
        renderStandings();
        break;
      case 'fixtures':
        _domElements.fixturesBtn.classList.add('active');
        document.getElementById('fixturesContent').classList.add('active');
        renderFixtures();
        break;
      case 'stats':
        _domElements.statsBtn.classList.add('active');
        document.getElementById('statsContent').classList.add('active');
        renderStats();
        break;
    }
  }
  
  /**
   * Handle change in number of players
   * @param {Event} event - Change event
   */
  function handlePlayerCountChange(event) {
    const playerCount = parseInt(event.target.value, 10);
    
    if (!playerCount || isNaN(playerCount)) {
      _domElements.playersInputContainer.innerHTML = '';
      return;
    }
    
    // Generate player input fields
    generatePlayerInputs(playerCount);
  }
  
  /**
   * Generate player input fields based on count
   * @param {number} count - Number of players
   */
  function generatePlayerInputs(count) {
    _domElements.playersInputContainer.innerHTML = '';
    
    // Create input fields
    const container = document.createElement('div');
    container.className = 'player-inputs animate-fade-in-up';
    
    for (let i = 0; i < count; i++) {
      const playerNumber = i + 1;
      
      const row = document.createElement('div');
      row.className = 'player-input-row staggered-item';
      
      row.innerHTML = `
        <label for="player_${i}">Player ${playerNumber}:</label>
        <input type="text" id="player_${i}" name="player_${i}" required placeholder="Enter player name">
      `;
      
      container.appendChild(row);
    }
    
    _domElements.playersInputContainer.appendChild(container);
  }
  
  /**
   * Handle league setup form submission
   * @param {Event} event - Form submit event
   */
  function handleLeagueSetup(event) {
    event.preventDefault();
    
    // Get form data
    const leagueName = document.getElementById('leagueName').value;
    const numberOfPlayers = parseInt(document.getElementById('numberOfPlayers').value, 10);
    
    // Validate inputs
    if (!leagueName || !numberOfPlayers || isNaN(numberOfPlayers)) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    // Collect player names
    const players = [];
    const playerInputs = document.querySelectorAll('#playersInputContainer input[type="text"]');
    
    playerInputs.forEach((input, index) => {
      const playerName = input.value.trim();
      if (!playerName) {
        showNotification(`Please enter a name for Player ${index + 1}`, 'error');
        return;
      }
      players.push(playerName);
    });
    
    // Validate player count
    if (players.length !== numberOfPlayers) {
      showNotification('Please fill in all player names', 'error');
      return;
    }
    
    // Create league
    createLeague(leagueName, players);
    
    // Show league view
    showLeagueViewScreen();
    
    // Show success notification
    showNotification('League created successfully!', 'success');
  }
  
  /**
   * Create a new league
   * @param {string} name - League name
   * @param {Array} players - Array of player names
   */
  function createLeague(name, players) {
    // Create league object
    _currentLeague = {
      id: generateId(),
      name: name,
      players: players.map(playerName => ({
        id: generateId(),
        name: playerName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      })),
      fixtures: [],
      stats: {
        totalGoals: 0,
        matchesPlayed: 0,
        totalMatches: 0,
        averageGoals: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Generate fixtures
    generateFixtures();
    
    // Save league
    saveLeague();
  }
  
  /**
   * Generate fixtures for the league
   * Uses round-robin algorithm for home and away matches (leg 1 and leg 2)
   */
  function generateFixtures() {
    if (!_currentLeague || !_currentLeague.players || _currentLeague.players.length < 2) {
      return;
    }
    
    const players = _currentLeague.players;
    const fixtures = [];
    
    // If odd number of players, add a "bye" player
    let allPlayers = [...players];
    if (allPlayers.length % 2 !== 0) {
      allPlayers.push({ id: 'bye', name: 'BYE' });
    }
    
    const n = allPlayers.length;
    
    // Generate matches using round-robin tournament algorithm
    // First half: each team plays against all others once (home/leg 1)
    for (let round = 0; round < n - 1; round++) {
      for (let match = 0; match < n / 2; match++) {
        const home = (round + match) % (n - 1);
        const away = (n - 1 - match + round) % (n - 1);
        
        // Last team stays fixed, others rotate around it
        if (match === 0) {
          const homeTeam = allPlayers[home];
          const awayTeam = allPlayers[n - 1];
          
          // Skip matches involving the "bye" player
          if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
            fixtures.push({
              id: generateId(),
              matchday: round + 1,
              homeTeamId: homeTeam.id,
              homeTeamName: homeTeam.name,
              awayTeamId: awayTeam.id,
              awayTeamName: awayTeam.name,
              homeScore: null,
              awayScore: null,
              played: false,
              date: new Date(),
              leg: 1 // Explicitly mark as leg 1
            });
          }
        } else {
          const homeTeam = allPlayers[home];
          const awayTeam = allPlayers[away];
          
          // Skip matches involving the "bye" player
          if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
            fixtures.push({
              id: generateId(),
              matchday: round + 1,
              homeTeamId: homeTeam.id,
              homeTeamName: homeTeam.name,
              awayTeamId: awayTeam.id,
              awayTeamName: awayTeam.name,
              homeScore: null,
              awayScore: null,
              played: false,
              date: new Date(),
              leg: 1 // Explicitly mark as leg 1
            });
          }
        }
      }
    }
    
    // Second half: reverse home/away for all matches (away/leg 2)
    const firstHalfFixtures = [...fixtures];
    const secondHalfFixtures = firstHalfFixtures.map(match => {
      return {
        id: generateId(),
        matchday: match.matchday + (n - 1),
        homeTeamId: match.awayTeamId,
        homeTeamName: match.awayTeamName,
        awayTeamId: match.homeTeamId,
        awayTeamName: match.homeTeamName,
        homeScore: null,
        awayScore: null,
        played: false,
        date: new Date(),
        leg: 2 // Explicitly mark as leg 2
      };
    });
    
    // Combine fixtures and update league
    _currentLeague.fixtures = [...fixtures, ...secondHalfFixtures];
    
    // Update league stats
    _currentLeague.stats.totalMatches = _currentLeague.fixtures.length;
  }
  
  /**
   * Navigate to previous matchday
   */
  function navigateToPrevMatchday() {
    if (_currentMatchday > 1) {
      _currentMatchday--;
      renderFixtures();
    }
  }
  
  /**
   * Navigate to next matchday
   */
  function navigateToNextMatchday() {
    if (_currentLeague && _currentLeague.fixtures) {
      const totalMatchdays = getMaxMatchday();
      if (_currentMatchday < totalMatchdays) {
        _currentMatchday++;
        renderFixtures();
      }
    }
  }
  
  /**
   * Set fixture view mode
   * @param {string} viewMode - View mode: 'all', 'pending', or 'completed'
   */
  function setFixtureView(viewMode) {
    _fixtureView = viewMode;
    
    // Update buttons
    _domElements.allFixturesBtn.classList.remove('active');
    _domElements.pendingFixturesBtn.classList.remove('active');
    _domElements.completedFixturesBtn.classList.remove('active');
    
    switch (viewMode) {
      case 'all':
        _domElements.allFixturesBtn.classList.add('active');
        break;
      case 'pending':
        _domElements.pendingFixturesBtn.classList.add('active');
        break;
      case 'completed':
        _domElements.completedFixturesBtn.classList.add('active');
        break;
    }
    
    renderFixtures();
  }
  
  /**
   * Get maximum matchday number in fixtures
   * @returns {number} Maximum matchday number
   */
  function getMaxMatchday() {
    if (!_currentLeague || !_currentLeague.fixtures || _currentLeague.fixtures.length === 0) {
      return 1;
    }
    
    return Math.max(..._currentLeague.fixtures.map(fixture => fixture.matchday));
  }
  
  /**
   * Render standings table
   */
  function renderStandings() {
    if (!_currentLeague || !_domElements.standingsTableBody) {
      return;
    }
    
    // Sort players by standings
    const sortedPlayers = [..._currentLeague.players].sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // 2. Goal difference
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      
      // 3. Goals for
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      
      // 4. Head-to-head (would need match data)
      
      // 5. Alphabetically (as fallback)
      return a.name.localeCompare(b.name);
    });
    
    // Clear table
    _domElements.standingsTableBody.innerHTML = '';
    
    // Add rows for each player
    sortedPlayers.forEach((player, index) => {
      const position = index + 1;
      
      // Create row from template
      const templateContent = _templates.standingsTableRow.innerHTML;
      const filledTemplate = templateContent
        .replace('{position}', position)
        .replace('{team-name}', player.name)
        .replace('{played}', player.played)
        .replace('{won}', player.won)
        .replace('{drawn}', player.drawn)
        .replace('{lost}', player.lost)
        .replace('{goals-for}', player.goalsFor)
        .replace('{goals-against}', player.goalsAgainst)
        .replace('{goal-difference}', player.goalDifference)
        .replace('{points}', player.points);
      
      // Create row element
      const row = document.createElement('tr');
      row.className = 'standings-row';
      row.dataset.playerId = player.id;
      row.innerHTML = filledTemplate;
      
      // Add to table
      _domElements.standingsTableBody.appendChild(row);
    });
  }
  
  /**
   * Render fixtures
   */
  function renderFixtures() {
    if (!_currentLeague || !_domElements.fixturesList) {
      return;
    }
    
    // Update matchday display
    _domElements.currentMatchdayDisplay.textContent = `Matchday ${_currentMatchday}`;
    
    // Enable/disable navigation buttons
    _domElements.prevMatchdayBtn.disabled = _currentMatchday <= 1;
    _domElements.nextMatchdayBtn.disabled = _currentMatchday >= getMaxMatchday();
    
    // Filter fixtures by matchday and view mode
    let filteredFixtures = _currentLeague.fixtures;
    
    // Filter by matchday (if not showing all)
    if (_currentMatchday) {
      filteredFixtures = filteredFixtures.filter(fixture => fixture.matchday === _currentMatchday);
    }
    
    // Filter by view mode
    if (_fixtureView === 'pending') {
      filteredFixtures = filteredFixtures.filter(fixture => !fixture.played);
    } else if (_fixtureView === 'completed') {
      filteredFixtures = filteredFixtures.filter(fixture => fixture.played);
    }
    
    // Sort fixtures by matchday
    filteredFixtures.sort((a, b) => {
      // Sort by matchday first
      if (a.matchday !== b.matchday) {
        return a.matchday - b.matchday;
      }
      
      // Then by played status (pending first)
      return a.played ? 1 : -1;
    });
    
    // Clear fixture list
    _domElements.fixturesList.innerHTML = '';
    
    // Add fixture cards
    filteredFixtures.forEach((fixture, index) => {
      const fixtureCard = createFixtureCard(fixture, index);
      _domElements.fixturesList.appendChild(fixtureCard);
    });
    
    // Show empty state if no fixtures
    if (filteredFixtures.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = '<p>No fixtures match the current filter</p>';
      _domElements.fixturesList.appendChild(emptyState);
    }
  }
  
  /**
   * Create a fixture card element
   * @param {Object} fixture - Fixture data
   * @param {number} index - Index for staggered animation
   * @returns {HTMLElement} Fixture card element
   */
  function createFixtureCard(fixture, index) {
    // Create card from template
    const templateContent = _templates.fixtureCard.innerHTML;
    
    // Format score display
    let scoreDisplay = 'vs';
    if (fixture.played) {
      scoreDisplay = `${fixture.homeScore} - ${fixture.awayScore}`;
    }
    
    // Set status
    let status = 'Scheduled';
    let buttonText = 'Enter Result';
    
    if (fixture.played) {
      status = 'Completed';
      buttonText = 'Edit Result';
    }
    
    // Add leg indicator
    const legIndicator = fixture.leg ? 
      `<span class="leg-indicator leg-${fixture.leg}">Leg ${fixture.leg}</span>` : '';
    
    // Fill template
    const filledTemplate = templateContent
      .replace('{match-id}', fixture.id)
      .replace('{matchday}', fixture.matchday)
      .replace('{status}', status + legIndicator)
      .replace('{home-team}', fixture.homeTeamName)
      .replace('{away-team}', fixture.awayTeamName)
      .replace('{score}', scoreDisplay)
      .replace('{button-text}', buttonText)
      .replace('{match-id}', fixture.id); // Repeated for button
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'fixture-card staggered-item animate-fade-in';
    card.style.animationDelay = `${index * 50}ms`;
    card.dataset.matchId = fixture.id;
    card.dataset.played = fixture.played;
    card.innerHTML = filledTemplate;
    
    return card;
  }
  
  /**
   * Render league statistics
   */
  function renderStats() {
    if (!_currentLeague) return;
    
    renderLeagueStats();
    renderTopScorers();
  }
  
  /**
   * Render league overall statistics
   */
  function renderLeagueStats() {
    if (!_domElements.leagueStats) return;
    
    // Calculate stats
    const totalMatches = _currentLeague.stats.totalMatches;
    const matchesPlayed = _currentLeague.stats.matchesPlayed;
    const matchesRemaining = totalMatches - matchesPlayed;
    const completion = totalMatches ? Math.round((matchesPlayed / totalMatches) * 100) : 0;
    const totalGoals = _currentLeague.stats.totalGoals;
    const avgGoals = matchesPlayed ? (totalGoals / matchesPlayed).toFixed(2) : '0.00';
    
    // Format stats HTML
    _domElements.leagueStats.innerHTML = `
      <div class="stat-box">
        <div class="stat-label">Matches Played</div>
        <div class="stat-value">${matchesPlayed} / ${totalMatches}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Completion</div>
        <div class="stat-value">${completion}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Goals</div>
        <div class="stat-value">${totalGoals}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Avg. Goals</div>
        <div class="stat-value">${avgGoals}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Teams</div>
        <div class="stat-value">${_currentLeague.players.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Remaining</div>
        <div class="stat-value">${matchesRemaining}</div>
      </div>
    `;
  }
  
  /**
   * Render top scorers (placeholder - would need goals per player data)
   */
  function renderTopScorers() {
    if (!_domElements.topScorers) return;
    
    // In a real app, you would track goals scored by each player
    // For this demo, we'll use player scoring stats based on goals for
    const scorers = [..._currentLeague.players]
      .sort((a, b) => b.goalsFor - a.goalsFor)
      .slice(0, 5); // Top 5
    
    // Clear container
    _domElements.topScorers.innerHTML = '';
    
    // Check if we have any scorers
    if (scorers.length === 0) {
      _domElements.topScorers.innerHTML = '<div class="empty-state"><p>No goals scored yet</p></div>';
      return;
    }
    
    // Add scorers
    scorers.forEach((player, index) => {
      const item = document.createElement('div');
      item.className = 'stats-item';
      item.innerHTML = `
        <div class="player-stats">
          <div class="player-rank">${index + 1}</div>
          <div class="player-name">${player.name}</div>
          <div class="player-value">${player.goalsFor}</div>
        </div>
      `;
      _domElements.topScorers.appendChild(item);
    });
  }
  
  /**
   * Handle fixture card click
   * @param {Event} event - Click event
   */
  function handleFixtureClick(event) {
    // Check if button was clicked
    const resultButton = event.target.closest('.btn-result');
    if (!resultButton) return;
    
    // Get fixture ID
    const fixtureId = resultButton.dataset.matchId;
    if (!fixtureId) return;
    
    // Show result entry modal
    showMatchResultModal(fixtureId);
  }
  
  /**
   * Show match result modal
   * @param {string} fixtureId - Fixture ID
   */
  function showMatchResultModal(fixtureId) {
    if (!_currentLeague || !fixtureId) return;
    
    // Find fixture
    const fixture = _currentLeague.fixtures.find(f => f.id === fixtureId);
    if (!fixture) return;
    
    // Set modal content
    _domElements.homeTeamName.textContent = fixture.homeTeamName;
    _domElements.awayTeamName.textContent = fixture.awayTeamName;
    _domElements.homeTeamScore.value = fixture.played ? fixture.homeScore : 0;
    _domElements.awayTeamScore.value = fixture.played ? fixture.awayScore : 0;
    
    // Include leg information in the modal
    const legInfo = fixture.leg ? `Leg ${fixture.leg} - ` : '';
    _domElements.modalMatchInfo.textContent = `${legInfo}Matchday ${fixture.matchday}`;
    
    // Set fixture ID for save button
    _domElements.saveResultBtn.dataset.fixtureId = fixtureId;
    
    // Show modal
    showModal(_domElements.matchResultModal);
    
    // Focus on home score
    _domElements.homeTeamScore.focus();
    _domElements.homeTeamScore.select();
  }
  
  /**
   * Save match result from modal
   */
  function saveMatchResult() {
    // Get fixture ID
    const fixtureId = _domElements.saveResultBtn.dataset.fixtureId;
    if (!fixtureId || !_currentLeague) return;
	
	// Validate scores
    const homeScore = parseInt(_domElements.homeTeamScore.value, 10);
    const awayScore = parseInt(_domElements.awayTeamScore.value, 10);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      showNotification('Please enter valid scores (non-negative numbers)', 'error');
      return;
    }
    
    // Find fixture
    const fixture = _currentLeague.fixtures.find(f => f.id === fixtureId);
    if (!fixture) return;
    
    // Check if this is an update or new result
    const isUpdate = fixture.played;
    
    // Store previous scores for stats update
    const prevHomeScore = fixture.homeScore;
    const prevAwayScore = fixture.awayScore;
    
    // Update fixture
    fixture.homeScore = homeScore;
    fixture.awayScore = awayScore;
    fixture.played = true;
    
    // Update standings
    updateStandingsForMatch(fixture, isUpdate, prevHomeScore, prevAwayScore);
    
    // Update league stats
    updateLeagueStats();
    
    // Update timestamp
    _currentLeague.updatedAt = new Date();
    
    // Save league
    saveLeague();
    
    // Close modal
    closeModal(_domElements.matchResultModal);
    
    // Show success notification
    showNotification('Match result saved successfully!', 'success');
    
    // Re-render current view
    if (_currentTab === 'standings') {
      renderStandings();
    } else if (_currentTab === 'fixtures') {
      renderFixtures();
    } else if (_currentTab === 'stats') {
      renderStats();
    }
  }
  
  /**
   * Update standings based on match result
   * @param {Object} fixture - Fixture data
   * @param {boolean} isUpdate - Whether this is an update to existing result
   * @param {number|null} prevHomeScore - Previous home score (for updates)
   * @param {number|null} prevAwayScore - Previous away score (for updates)
   */
  function updateStandingsForMatch(fixture, isUpdate, prevHomeScore, prevAwayScore) {
    if (!_currentLeague || !fixture) return;
    
    // Find players
    const homePlayer = _currentLeague.players.find(p => p.id === fixture.homeTeamId);
    const awayPlayer = _currentLeague.players.find(p => p.id === fixture.awayTeamId);
    
    if (!homePlayer || !awayPlayer) return;
    
    // If updating existing result, rollback previous statistics
    if (isUpdate && prevHomeScore !== null && prevAwayScore !== null) {
      // Remove previous match from count
      homePlayer.played--;
      awayPlayer.played--;
      
      // Remove goals
      homePlayer.goalsFor -= prevHomeScore;
      homePlayer.goalsAgainst -= prevAwayScore;
      awayPlayer.goalsFor -= prevAwayScore;
      awayPlayer.goalsAgainst -= prevHomeScore;
      
      // Update goal difference
      homePlayer.goalDifference = homePlayer.goalsFor - homePlayer.goalsAgainst;
      awayPlayer.goalDifference = awayPlayer.goalsFor - awayPlayer.goalsAgainst;
      
      // Remove result from count
      if (prevHomeScore > prevAwayScore) {
        // Home team won previously
        homePlayer.won--;
        homePlayer.points -= 3;
        awayPlayer.lost--;
      } else if (prevHomeScore < prevAwayScore) {
        // Away team won previously
        homePlayer.lost--;
        awayPlayer.won--;
        awayPlayer.points -= 3;
      } else {
        // Previous result was a draw
        homePlayer.drawn--;
        homePlayer.points -= 1;
        awayPlayer.drawn--;
        awayPlayer.points -= 1;
      }
    }
    
    // Update matches played
    homePlayer.played++;
    awayPlayer.played++;
    
    // Update goals
    homePlayer.goalsFor += fixture.homeScore;
    homePlayer.goalsAgainst += fixture.awayScore;
    awayPlayer.goalsFor += fixture.awayScore;
    awayPlayer.goalsAgainst += fixture.homeScore;
    
    // Update goal difference
    homePlayer.goalDifference = homePlayer.goalsFor - homePlayer.goalsAgainst;
    awayPlayer.goalDifference = awayPlayer.goalsFor - awayPlayer.goalsAgainst;
    
    // Update result and points
    if (fixture.homeScore > fixture.awayScore) {
      // Home team wins
      homePlayer.won++;
      homePlayer.points += 3;
      awayPlayer.lost++;
    } else if (fixture.homeScore < fixture.awayScore) {
      // Away team wins
      homePlayer.lost++;
      awayPlayer.won++;
      awayPlayer.points += 3;
    } else {
      // Draw
      homePlayer.drawn++;
      homePlayer.points += 1;
      awayPlayer.drawn++;
      awayPlayer.points += 1;
    }
  }
  
  /**
   * Update league statistics
   */
  function updateLeagueStats() {
    if (!_currentLeague) return;
    
    // Count played matches
    _currentLeague.stats.matchesPlayed = _currentLeague.fixtures.filter(f => f.played).length;
    
    // Count total goals
    _currentLeague.stats.totalGoals = _currentLeague.fixtures.reduce((total, fixture) => {
      if (fixture.played) {
        return total + fixture.homeScore + fixture.awayScore;
      }
      return total;
    }, 0);
    
    // Calculate average goals per match
    if (_currentLeague.stats.matchesPlayed > 0) {
      _currentLeague.stats.averageGoals = (_currentLeague.stats.totalGoals / _currentLeague.stats.matchesPlayed).toFixed(2);
    }
  }
  
  /**
   * Show about modal
   */
  function showAboutModal() {
    showModal(_domElements.aboutModal);
  }
  
  /**
   * Show a modal
   * @param {HTMLElement} modal - Modal element
   */
  function showModal(modal) {
    if (!modal) return;
    
    modal.classList.add('active');
  }
  
  /**
   * Close a modal
   * @param {HTMLElement} modal - Modal element
   */
  function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
  }
  
  /**
   * Save league to local storage
   */
  function saveLeague() {
    if (!_currentLeague) return;
    
    try {
      // Update timestamp
      _currentLeague.updatedAt = new Date();
      
      // Save to local storage
      localStorage.setItem('soccerLeague', JSON.stringify(_currentLeague));
      
      // Show success notification (optionally)
      // showNotification('League saved successfully!', 'success');
      
      return true;
    } catch (error) {
      console.error('Error saving league:', error);
      showNotification('Failed to save league', 'error');
      
      return false;
    }
  }
  
  /**
   * Load saved league from local storage
   */
  function loadSavedLeague() {
    try {
      const savedLeague = localStorage.getItem('soccerLeague');
      
      if (savedLeague) {
        _currentLeague = JSON.parse(savedLeague);
        
        // Convert date strings back to Date objects
        _currentLeague.createdAt = new Date(_currentLeague.createdAt);
        _currentLeague.updatedAt = new Date(_currentLeague.updatedAt);
        
        // Show league view
        showLeagueViewScreen();
        
        return true;
      }
    } catch (error) {
      console.error('Error loading league:', error);
      showNotification('Failed to load saved league', 'error');
    }
    
    return false;
  }
  
  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  function showNotification(message, type = 'info') {
    // Check if notification element exists
    let notification = document.querySelector('.notification');
    
    // Create if it doesn't exist
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    // Set content and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('active');
    }, 10);
    
    // Hide after delay
    setTimeout(() => {
      notification.classList.remove('active');
    }, 3000);
  }
  
  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  // Return public API
  return {
    init,
    createLeague,
    saveLeague,
    loadSavedLeague,
    showNotification
  };
})();