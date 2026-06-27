class RolltainerTracker {
    constructor() {
        this.status = 'stopped';
        this.sessionCount = 0;
        this.totalCompleted = 0;
        this.history = [];
        this.runningAverage = 0;
        this.currentType = 'meds';
        this.timerInterval = null;
        this.seconds = 0;
        this.startTime = null;
        this.currentUser = null;
        this.dataExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // DOM elements - Login
        this.loginScreen = document.getElementById('loginScreen');
        this.mainApp = document.getElementById('mainApp');
        this.usernameInput = document.getElementById('usernameInput');
        this.loginBtn = document.getElementById('loginBtn');
        this.currentUserDisplay = document.getElementById('currentUserDisplay');
        this.welcomeName = document.getElementById('welcomeName');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // DOM elements - Main app
        this.statusEl = document.getElementById('status');
        this.totalCompletedEl = document.getElementById('totalCompleted');
        this.runningAvgEl = document.getElementById('runningAvg');
        this.sessionCountEl = document.getElementById('sessionCount');
        this.currentTypeEl = document.getElementById('currentType');
        this.historyListEl = document.getElementById('historyList');
        this.historyCountEl = document.getElementById('historyCount');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.timerStatus = document.getElementById('timerStatus');
        this.progressRing = document.querySelector('.progress-ring-fill');
        
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.completeBtn = document.getElementById('completeBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.exportHistoryBtn = document.getElementById('exportHistoryBtn');
        this.typeDropdown = document.getElementById('rolltainerType');
        
        // Check if user is already logged in
        this.checkAutoLogin();
        
        // Bind login events
        this.loginBtn.addEventListener('click', () => this.login());
        this.usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.login();
        });
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Bind main app events
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.completeBtn.addEventListener('click', () => this.complete());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.exportHistoryBtn.addEventListener('click', () => this.exportHistory());
        this.typeDropdown.addEventListener('change', (e) => {
            this.currentType = e.target.value;
            this.updateUI();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                if (this.status === 'stopped' || this.status === 'completed') {
                    this.start();
                } else if (this.status === 'running') {
                    this.complete();
                }
            }
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
                if (this.status === 'running') {
                    this.pause();
                } else if (this.status === 'paused') {
                    this.start();
                }
            }
        });
    }
    
    // ==================== LOGIN SYSTEM ====================
    
    login() {
        const name = this.usernameInput.value.trim();
        if (!name) {
            this.usernameInput.style.borderColor = '#fc8181';
            this.usernameInput.placeholder = 'Please enter your name!';
            setTimeout(() => {
                this.usernameInput.style.borderColor = '#e2e8f0';
                this.usernameInput.placeholder = 'Enter your name...';
            }, 2000);
            return;
        }
        
        this.currentUser = name;
        this.saveUserSession(name);
        this.showMainApp(name);
        this.loadUserData(name);
    }
    
    logout() {
        if (confirm(`Logout ${this.currentUser}? Your data will be saved.`)) {
            this.currentUser = null;
            localStorage.removeItem('rolltainer_user');
            this.loginScreen.style.display = 'flex';
            this.mainApp.style.display = 'none';
            this.usernameInput.value = '';
            this.stopTimer();
            this.status = 'stopped';
            this.sessionCount = 0;
            this.seconds = 0;
            this.updateTimerDisplay();
        }
    }
    
    checkAutoLogin() {
        const savedUser = localStorage.getItem('rolltainer_user');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                const now = Date.now();
                
                // Check if session is still valid (24 hours)
                if (now - userData.timestamp < this.dataExpiry) {
                    this.currentUser = userData.name;
                    this.showMainApp(userData.name);
                    this.loadUserData(userData.name);
                    return;
                } else {
                    // Session expired, clear old data
                    localStorage.removeItem('rolltainer_user');
                    this.cleanExpiredData();
                }
            } catch (e) {
                localStorage.removeItem('rolltainer_user');
            }
        }
        // Show login screen
        this.loginScreen.style.display = 'flex';
        this.mainApp.style.display = 'none';
    }
    
    saveUserSession(name) {
        localStorage.setItem('rolltainer_user', JSON.stringify({
            name: name,
            timestamp: Date.now()
        }));
    }
    
    showMainApp(name) {
        this.loginScreen.style.display = 'none';
        this.mainApp.style.display = 'block';
        this.currentUserDisplay.textContent = `👤 ${name}`;
        this.welcomeName.textContent = name;
    }
    
    // ==================== DATA MANAGEMENT ====================
    
    getStorageKey() {
        return `rolltainer_data_${this.currentUser}`;
    }
    
    loadUserData(name) {
        const key = `rolltainer_data_${name}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const now = Date.now();
                
                // Check if data is expired (24 hours)
                if (now - data.timestamp < this.dataExpiry) {
                    this.history = data.history || [];
                    this.totalCompleted = data.totalCompleted || 0;
                    this.runningAverage = data.runningAverage || 0;
                    this.seconds = data.seconds || 0;
                    this.sessionCount = data.sessionCount || 0;
                    this.status = 'stopped';
                } else {
                    // Data expired, clear it
                    localStorage.removeItem(key);
                    this.history = [];
                    this.totalCompleted = 0;
                    this.runningAverage = 0;
                    this.seconds = 0;
                    this.sessionCount = 0;
                    this.status = 'stopped';
                }
            } catch (e) {
                console.error('Error loading data:', e);
                this.history = [];
                this.totalCompleted = 0;
                this.runningAverage = 0;
                this.seconds = 0;
                this.sessionCount = 0;
                this.status = 'stopped';
            }
        }
        this.updateUI();
        this.updateTimerDisplay();
        this.enableButtons(false);
    }
    
    saveUserData() {
        if (!this.currentUser) return;
        const key = this.getStorageKey();
        const data = {
            history: this.history,
            totalCompleted: this.totalCompleted,
            runningAverage: this.runningAverage,
            seconds: this.seconds,
            sessionCount: this.sessionCount,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
    }
    
    cleanExpiredData() {
        // Clean up expired user data from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('rolltainer_data_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const now = Date.now();
                    if (now - data.timestamp >= this.dataExpiry) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // ==================== TIMER FUNCTIONS ====================
    
    start() {
        // Only allow start if stopped, completed, or paused
        if (this.status === 'stopped' || this.status === 'completed' || this.status === 'paused') {
            
            // If starting fresh from stopped or completed, reset everything
            if (this.status === 'stopped' || this.status === 'completed') {
                this.seconds = 0;
                this.sessionCount = 1;
                this.startTime = Date.now();
            }
            
            this.status = 'running';
            
            // Clear any existing interval before starting a new one
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Start the timer interval
            this.timerInterval = setInterval(() => {
                this.seconds++;
                this.updateTimerDisplay();
                this.checkTimerGoal();
            }, 1000);
            
            this.enableButtons(true);
            this.updateUI();
            this.addHistory(`Started session (${this.getTypeLabel(this.currentType)})`);
            this.saveUserData();
        }
    }
    
    pause() {
        if (this.status === 'running') {
            this.status = 'paused';
            
            // Clear the interval to stop the timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            this.enableButtons(true);
            this.updateUI();
            this.addHistory(`Paused session (${this.getTypeLabel(this.currentType)})`);
            this.saveUserData();
        }
    }
    
    complete() {
        if (this.status === 'running' || this.status === 'paused') {
            
            // CRITICAL: Stop the timer completely
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Save the time for history before resetting
            const timeStr = this.formatTime(this.seconds);
            
            // Update stats
            this.totalCompleted++;
            this.sessionCount++;
            this.status = 'completed';
            
            // Reset timer to 0
            this.seconds = 0;
            
            // Update running average
            this.calculateRunningAverage();
            
            // Update UI
            this.enableButtons(false);
            this.updateUI();
            this.updateTimerDisplay();
            
            // Add to history
            this.addHistory(
                `Completed #${this.totalCompleted} | ${this.getTypeLabel(this.currentType)} | Time: ${timeStr}`
            );
            this.saveUserData();
            
            // NO AUTO-START - User must click Start manually
        }
    }
    
    stop() {
        if (this.status !== 'stopped') {
            this.status = 'stopped';
            this.sessionCount = 0;
            
            // Stop the timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.seconds = 0;
            
            this.enableButtons(false);
            this.updateUI();
            this.updateTimerDisplay();
            this.addHistory(`Stopped session (${this.getTypeLabel(this.currentType)})`);
            this.saveUserData();
        }
    }
    
    stopTimer() {
        // Helper to stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    // ==================== UI FUNCTIONS ====================
    
    calculateRunningAverage() {
        if (this.history.length > 0) {
            const completedItems = this.history.filter(item => 
                item.action.includes('Completed')
            );
            
            if (completedItems.length > 0) {
                const total = completedItems.reduce((sum, item) => {
                    const match = item.action.match(/#(\d+)/);
                    return sum + (match ? parseInt(match[1]) : 0);
                }, 0);
                this.runningAverage = total / completedItems.length;
            } else {
                this.runningAverage = this.totalCompleted;
            }
        } else {
            this.runningAverage = this.totalCompleted;
        }
    }
    
    checkTimerGoal() {
        const minutes = this.seconds / 60;
        if (minutes >= 60) {
            this.timerStatus.textContent = '⚠️ Over 60 min';
            this.timerStatus.className = 'goal-value status-badge overdue';
            this.progressRing.style.stroke = '#fc8181';
        } else if (minutes >= 45) {
            this.timerStatus.textContent = '✅ On Track!';
            this.timerStatus.className = 'goal-value status-badge on-track';
            this.progressRing.style.stroke = '#48bb78';
        } else if (this.status === 'running' || this.status === 'paused') {
            this.timerStatus.textContent = '⏳ In Progress';
            this.timerStatus.className = 'goal-value status-badge';
            this.progressRing.style.stroke = '#4299e1';
        } else {
            this.timerStatus.textContent = '⏹ Not Started';
            this.timerStatus.className = 'goal-value status-badge';
            this.progressRing.style.stroke = '#e2e8f0';
        }
        
        // Update progress ring
        const circumference = 326.726;
        const progress = Math.min(this.seconds / 3600, 1);
        const offset = circumference - (progress * circumference);
        this.progressRing.style.strokeDashoffset = offset;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    updateTimerDisplay() {
        this.timerDisplay.textContent = this.formatTime(this.seconds);
        this.checkTimerGoal();
    }
    
    getTypeLabel(value) {
        const types = {
            'meds': '💊 Meds',
            'food': '🍎 Food',
            'dollar': '💰 Dollar',
            'chem': '🧪 Chem',
            'sweets': '🍬 Sweets',
            'toiletpaper': '🧻 Toilet Paper',
            'other': '📦 Other'
        };
        return types[value] || value;
    }
    
    enableButtons(isActive) {
        const isRunning = this.status === 'running';
        const isPaused = this.status === 'paused';
        const isCompleted = this.status === 'completed';
        const isStopped = this.status === 'stopped';
        
        this.startBtn.disabled = !(isStopped || isCompleted || isPaused);
        this.pauseBtn.disabled = !isRunning;
        this.completeBtn.disabled = !(isRunning || isPaused);
        this.stopBtn.disabled = isStopped;
        
        if (isStopped || isCompleted) {
            this.startBtn.textContent = '▶ Start';
        } else if (isPaused) {
            this.startBtn.textContent = '▶ Resume';
        } else {
            this.startBtn.textContent = '▶ Running';
        }
    }
    
    updateUI() {
        const statusText = this.status.charAt(0).toUpperCase() + this.status.slice(1);
        const statusEmojis = {
            'stopped': '⏹',
            'running': '▶',
            'paused': '⏸',
            'completed': '✅'
        };
        this.statusEl.textContent = `${statusEmojis[this.status] || '⏹'} ${statusText}`;
        this.statusEl.className = 'status-indicator ' + this.status;
        
        this.totalCompletedEl.textContent = this.totalCompleted;
        this.runningAvgEl.textContent = this.runningAverage.toFixed(1);
        this.sessionCountEl.textContent = this.sessionCount;
        this.currentTypeEl.textContent = this.getTypeLabel(this.currentType);
        
        this.renderHistory();
    }
    
    renderHistory() {
        if (this.history.length === 0) {
            this.historyListEl.innerHTML = '<p class="empty-message">No sessions recorded yet</p>';
            this.historyCountEl.textContent = '0 entries';
            return;
        }
        
        const items = this.history.slice(-30);
        this.historyListEl.innerHTML = items.map(item => {
            let typeBadge = '';
            if (item.action.includes('Completed')) {
                const typeMatch = item.action.match(/\| (💊\s?Meds|🍎\s?Food|💰\s?Dollar|🧪\s?Chem|🍬\s?Sweets|🧻\s?Toilet Paper|📦\s?Other)/);
                if (typeMatch) {
                    typeBadge = `<span class="type-badge">${typeMatch[1]}</span>`;
                }
            }
            
            return `
                <div class="history-item">
                    <span class="action">
                        ${item.action.split('|')[0].trim()} 
                        ${typeBadge}
                    </span>
                    <span class="timestamp">${item.timestamp}</span>
                </div>
            `;
        }).join('');
        
        this.historyCountEl.textContent = `${this.history.length} entries`;
        this.historyListEl.scrollTop = this.historyListEl.scrollHeight;
    }
    
    addHistory(action) {
        const timestamp = new Date().toLocaleTimeString();
        this.history.push({ action, timestamp });
        this.renderHistory();
    }
    
    clearHistory() {
        if (this.history.length === 0) return;
        if (confirm(`Clear all history for ${this.currentUser}?`)) {
            this.history = [];
            this.totalCompleted = 0;
            this.runningAverage = 0;
            this.sessionCount = 0;
            this.seconds = 0;
            this.stopTimer();
            this.status = 'stopped';
            this.saveUserData();
            this.updateUI();
            this.updateTimerDisplay();
            this.enableButtons(false);
        }
    }
    
    exportHistory() {
        if (this.history.length === 0) {
            alert('No history to export!');
            return;
        }
        
        let csv = `Rolltainer Tracker History - ${this.currentUser}\n`;
        csv += `Action,Timestamp\n`;
        this.history.forEach(item => {
            csv += `"${item.action}","${item.timestamp}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rolltainer_history_${this.currentUser}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new RolltainerTracker();
});
