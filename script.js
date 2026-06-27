class RolltainerTracker {
    constructor() {
        this.status = 'stopped'; // stopped, running, paused, completed
        this.sessionCount = 0;
        this.totalCompleted = 0;
        this.history = [];
        this.runningAverage = 0;
        this.currentType = 'meds';
        this.timerInterval = null;
        this.seconds = 0;
        this.startTime = null;
        
        // Load saved data from localStorage
        this.loadData();
        
        // DOM elements
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
        
        // Bind event listeners
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
        
        // Update UI
        this.updateUI();
        this.updateTimerDisplay();
    }
    
    start() {
        if (this.status === 'stopped' || this.status === 'completed') {
            this.status = 'running';
            this.sessionCount = 1;
            
            if (this.status === 'stopped') {
                this.seconds = 0;
                this.startTime = Date.now();
            }
            
            // Start timer
            if (!this.timerInterval) {
                this.timerInterval = setInterval(() => {
                    this.seconds++;
                    this.updateTimerDisplay();
                    this.checkTimerGoal();
                }, 1000);
            }
            
            this.enableButtons(true);
            this.updateUI();
            this.addHistory(`Started session (${this.getTypeLabel(this.currentType)})`);
        } else if (this.status === 'paused') {
            this.status = 'running';
            this.startTime = Date.now() - (this.seconds * 1000);
            this.enableButtons(true);
            this.updateUI();
            this.addHistory(`Resumed session (${this.getTypeLabel(this.currentType)})`);
        }
    }
    
    pause() {
        if (this.status === 'running') {
            this.status = 'paused';
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.enableButtons(true);
            this.updateUI();
            this.addHistory(`Paused session (${this.getTypeLabel(this.currentType)})`);
        }
    }
    
    complete() {
        if (this.status === 'running' || this.status === 'paused') {
            this.totalCompleted++;
            this.sessionCount++;
            this.status = 'completed';
            
            // Stop timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Update running average
            this.calculateRunningAverage();
            
            // Format time
            const timeStr = this.formatTime(this.seconds);
            
            this.enableButtons(false);
            this.updateUI();
            this.addHistory(
                `Completed #${this.totalCompleted} | ${this.getTypeLabel(this.currentType)} | Time: ${timeStr}`
            );
            this.saveData();
            
            // Auto-start after 2 seconds
            setTimeout(() => {
                if (this.status === 'completed') {
                    this.start();
                }
            }, 2000);
        }
    }
    
    stop() {
        if (this.status !== 'stopped') {
            this.status = 'stopped';
            this.sessionCount = 0;
            
            // Stop timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.seconds = 0;
            
            this.enableButtons(false);
            this.updateUI();
            this.updateTimerDisplay();
            this.addHistory(`Stopped session (${this.getTypeLabel(this.currentType)})`);
            this.saveData();
        }
    }
    
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
        } else {
            this.timerStatus.textContent = '⏳ In Progress';
            this.timerStatus.className = 'goal-value status-badge';
            this.progressRing.style.stroke = '#4299e1';
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
    
    getTypeEmoji(value) {
        const emojis = {
            'meds': '💊',
            'food': '🍎',
            'dollar': '💰',
            'chem': '🧪',
            'sweets': '🍬',
            'toiletpaper': '🧻',
            'other': '📦'
        };
        return emojis[value] || '📦';
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
        
        // Update button texts
        if (isStopped || isCompleted) {
            this.startBtn.textContent = '▶ Start';
        } else if (isPaused) {
            this.startBtn.textContent = '▶ Resume';
        } else {
            this.startBtn.textContent = '▶ Running';
        }
    }
    
    updateUI() {
        // Update status display
        const statusText = this.status.charAt(0).toUpperCase() + this.status.slice(1);
        const statusEmojis = {
            'stopped': '⏹',
            'running': '▶',
            'paused': '⏸',
            'completed': '✅'
        };
        this.statusEl.textContent = `${statusEmojis[this.status] || '⏹'} ${statusText}`;
        this.statusEl.className = 'status-indicator ' + this.status;
        
        // Update stats
        this.totalCompletedEl.textContent = this.totalCompleted;
        this.runningAvgEl.textContent = this.runningAverage.toFixed(1);
        this.sessionCountEl.textContent = this.sessionCount;
        this.currentTypeEl.textContent = this.getTypeLabel(this.currentType);
        
        // Update history display
        this.renderHistory();
    }
    
    renderHistory() {
        if (this.history.length === 0) {
            this.historyListEl.innerHTML = '<p class="empty-message">No sessions recorded yet</p>';
            this.historyCountEl.textContent = '0 entries';
            return;
        }
        
        // Show last 30 items
        const items = this.history.slice(-30);
        this.historyListEl.innerHTML = items.map(item => {
            // Check if it's a completion entry to extract type
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
        
        // Auto-scroll to bottom
        this.historyListEl.scrollTop = this.historyListEl.scrollHeight;
    }
    
    addHistory(action) {
        const timestamp = new Date().toLocaleTimeString();
        this.history.push({ action, timestamp });
        this.renderHistory();
    }
    
    clearHistory() {
        if (this.history.length === 0) return;
        if (confirm('Are you sure you want to clear all history?')) {
            this.history = [];
            this.totalCompleted = 0;
            this.runningAverage = 0;
            this.status = 'stopped';
            this.sessionCount = 0;
            this.seconds = 0;
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            this.saveData();
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
        
        let csv = 'Action,Timestamp\n';
        this.history.forEach(item => {
            csv += `"${item.action}","${item.timestamp}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rolltainer_history_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    saveData() {
        const data = {
            history: this.history,
            totalCompleted: this.totalCompleted,
            runningAverage: this.runningAverage,
            seconds: this.seconds
        };
        localStorage.setItem('rolltainerData', JSON.stringify(data));
    }
    
    loadData() {
        const saved = localStorage.getItem('rolltainerData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.history = data.history || [];
                this.totalCompleted = data.totalCompleted || 0;
                this.runningAverage = data.runningAverage || 0;
                this.seconds = data.seconds || 0;
            } catch (e) {
                console.error('Error loading saved data:', e);
            }
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new RolltainerTracker();
});