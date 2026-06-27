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
                this.status = 'stopped';  // ALWAYS START AS STOPPED
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
    // IMPORTANT: Ensure timer is stopped and status is 'stopped'
    this.stopTimer();
    this.seconds = 0;
    this.status = 'stopped';
    this.updateUI();
    this.updateTimerDisplay();
    this.enableButtons(false);
}
