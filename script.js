const app = {
  mode: 'wake',
  hour: 1,
  minute: 0,
  period: 'AM',
  timeFormat: '12',
  settings: {
    latency: 10,
    cycleLength: 90,
    wakeWindow: 10
  },
  selectedResult: null,
  scrollVelocity: 0,
  lastWheelTime: 0,

  init() {
    this.setupEventListeners();
    this.loadSettings();
    this.loadFromUrl();
    this.calculate();
    document.getElementById('year').textContent = new Date().getFullYear();
  },

  setupEventListeners() {
    for (let i = 1; i <= 6; i++) {
      document.getElementById(`infoToggle${i === 1 ? '' : i}`).addEventListener('click', () => {
        const infoSection = document.getElementById(`infoSection${i === 1 ? '' : i}`);
        const infoToggle = document.getElementById(`infoToggle${i === 1 ? '' : i}`);
        const isExpanded = infoSection.style.display !== 'none';
        
        // Close all other panels
        for (let j = 1; j <= 6; j++) {
          if (j === i) continue; // Skip the current panel
          const otherSection = document.getElementById(`infoSection${j === 1 ? '' : j}`);
          const otherToggle = document.getElementById(`infoToggle${j === 1 ? '' : j}`);
          otherSection.style.display = 'none';
          otherToggle.classList.remove('expanded');
        }
        
        // Toggle current panel
        infoSection.style.display = isExpanded ? 'none' : 'block';
        infoToggle.classList.toggle('expanded');
      });
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setMode(e.target.closest('.mode-btn').dataset.mode));
    });

    document.getElementById('shareBtn').addEventListener('click', () => this.shareLink());

    document.getElementById('toggleSettings').addEventListener('click', () => {
      document.getElementById('settingsGrid').classList.toggle('show');
    });

    document.getElementById('latency').addEventListener('input', (e) => {
      this.settings.latency = parseInt(e.target.value);
      document.getElementById('latencyValue').textContent = this.settings.latency;
      this.saveSettings();
      this.calculate();
    });

    document.getElementById('cycleLength').addEventListener('input', (e) => {
      this.settings.cycleLength = parseInt(e.target.value);
      document.getElementById('cycleLengthValue').textContent = this.settings.cycleLength;
      this.saveSettings();
      this.calculate();
    });

    document.getElementById('wakeWindow').addEventListener('input', (e) => {
      this.settings.wakeWindow = parseInt(e.target.value);
      document.getElementById('wakeWindowValue').textContent = this.settings.wakeWindow;
      this.saveSettings();
      this.calculate();
    });

    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.setTimeFormat(e.target.dataset.format));
    });

    ['hourColumn', 'minuteColumn', 'periodColumn'].forEach(id => {
      const col = document.getElementById(id);
      if (col) {
        col.addEventListener('wheel', (e) => this.handleTimeScroll(e, id));
        col.addEventListener('touchstart', (e) => this.handleTouchStart(e, id));
        col.addEventListener('touchmove', (e) => this.handleTouchMove(e, id));
        col.addEventListener('keydown', (e) => this.handleTimeKeydown(e, id));
      }
    });

    document.getElementById('timePicker').addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  },

  setTimeFormat(format) {
    if (this.timeFormat === '12' && format === '24') {
      let hour24 = this.hour;
      if (this.period === 'PM' && this.hour !== 12) hour24 += 12;
      if (this.period === 'AM' && this.hour === 12) hour24 = 0;
      this.hour = hour24;
      this.period = 'AM';
    } else if (this.timeFormat === '24' && format === '12') {
      const period = this.hour >= 12 ? 'PM' : 'AM';
      const hour12 = this.hour % 12 || 12;
      this.hour = hour12;
      this.period = period;
    }
    this.timeFormat = format;
    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });
    document.getElementById('timeFormatToggle').classList.toggle('active', format === '24');
    this.updateTimePicker();
    this.calculate();
    this.saveSettings();
  },

  setMode(newMode) {
    this.mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });
    
    // Add visual feedback animation
    const activeBtn = document.querySelector('.mode-btn.active');
    if (activeBtn) {
      activeBtn.classList.add('mode-switched');
      setTimeout(() => activeBtn.classList.remove('mode-switched'), 600);
    }
    
    const newLabel = newMode === 'wake' ? 'I want to wake up at...' : 'I want to go to bed...';
    document.getElementById('timeLabel').textContent = newLabel;
    
    // Set timer to current time when switching to "Bedtime now" mode
    if (newMode === 'sleep') {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (this.timeFormat === '12') {
        this.period = currentHour >= 12 ? 'PM' : 'AM';
        this.hour = currentHour % 12 || 12;
      } else {
        this.hour = currentHour;
        this.period = 'AM';
      }
      this.minute = currentMinute;
      this.updateTimePicker();
    }
    
    this.calculate();
  },

  handleTimeScroll(e, columnId) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - this.lastWheelTime < 150) return;
    this.lastWheelTime = now;
    const direction = e.deltaY > 0 ? 1 : -1;
    if (columnId === 'periodColumn' && this.timeFormat === '12') {
      this.period = direction > 0 ? 'PM' : 'AM';
      this.updateTimePicker();
      this.calculate();
    } else if (columnId === 'hourColumn') {
      if (this.timeFormat === '12') {
        this.hour = ((this.hour - 1 + direction + 12) % 12) + 1;
      } else {
        this.hour = (this.hour + direction + 24) % 24;
      }
      this.updateTimePicker();
      this.calculate();
    } else if (columnId === 'minuteColumn') {
      this.minute = (this.minute + direction + 60) % 60;
      this.updateTimePicker();
      this.calculate();
    }
  },

  handleTouchStart(e, columnId) {
    e.currentTarget.touchStartY = e.touches[0].clientY;
  },

  handleTouchMove(e, columnId) {
    if (!e.currentTarget.touchStartY) return;
    const diff = e.touches[0].clientY - e.currentTarget.touchStartY;
    if (Math.abs(diff) > 20) {
      const direction = diff > 0 ? -1 : 1;
      if (columnId === 'periodColumn' && this.timeFormat === '12') {
        this.period = direction > 0 ? 'PM' : 'AM';
        e.currentTarget.touchStartY = e.touches[0].clientY;
        this.updateTimePicker();
        this.calculate();
      } else if (columnId === 'hourColumn') {
        if (this.timeFormat === '12') {
          this.hour = ((this.hour - 1 + direction + 12) % 12) + 1;
        } else {
          this.hour = (this.hour + direction + 24) % 24;
        }
        e.currentTarget.touchStartY = e.touches[0].clientY;
        this.updateTimePicker();
        this.calculate();
      } else if (columnId === 'minuteColumn') {
        this.minute = (this.minute + direction + 60) % 60;
        e.currentTarget.touchStartY = e.touches[0].clientY;
        this.updateTimePicker();
        this.calculate();
      }
    }
  },

  handleTimeKeydown(e, columnId) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.handleTimeScroll({ deltaY: -1, preventDefault: () => {}, stopPropagation: () => {} }, columnId);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.handleTimeScroll({ deltaY: 1, preventDefault: () => {}, stopPropagation: () => {} }, columnId);
    }
  },

  updateTimePicker() {
    if (this.timeFormat === '12') {
      document.getElementById('hourSelected').textContent = String(this.hour).padStart(2, '0');
      document.getElementById('hourAbove').textContent = String(((this.hour - 2 + 12) % 12) + 1).padStart(2, '0');
      document.getElementById('hourBelow').textContent = String((this.hour % 12) + 1).padStart(2, '0');
      document.getElementById('periodSelected').textContent = this.period;
      document.getElementById('periodAbove').textContent = this.period === 'AM' ? 'PM' : 'AM';
      document.getElementById('periodBelow').textContent = this.period === 'AM' ? 'PM' : 'AM';
      document.getElementById('periodColumn').style.display = 'flex';
    } else {
      const hour24 = this.period === 'AM' ? this.hour === 12 ? 0 : this.hour : this.hour === 12 ? 12 : this.hour + 12;
      document.getElementById('hourSelected').textContent = String(hour24).padStart(2, '0');
      document.getElementById('hourAbove').textContent = String((hour24 - 1 + 24) % 24).padStart(2, '0');
      document.getElementById('hourBelow').textContent = String((hour24 + 1) % 24).padStart(2, '0');
      document.getElementById('periodColumn').style.display = 'none';
    }

    document.getElementById('minuteSelected').textContent = String(this.minute).padStart(2, '0');
    document.getElementById('minuteAbove').textContent = String((this.minute - 1 + 60) % 60).padStart(2, '0');
    document.getElementById('minuteBelow').textContent = String((this.minute + 1) % 60).padStart(2, '0');
  },

  to24Hour(hour, minute, period) {
    let h = hour;
    if (period === 'PM' && hour !== 12) h += 12;
    if (period === 'AM' && hour === 12) h = 0;
    return h * 60 + minute;
  },

  formatTime(totalMinutes) {
    totalMinutes = totalMinutes % (24 * 60);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (this.timeFormat === '12') {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    } else {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  },

  calculate() {
    const startTime = this.to24Hour(this.hour, this.minute, this.period);
    const results = [];

    if (this.mode === 'wake') {
      for (let cycles = 4; cycles <= 6; cycles++) {
        const sleepDuration = this.settings.latency + cycles * this.settings.cycleLength;
        let bedTime = startTime - sleepDuration;
        if (bedTime < 0) bedTime += 24 * 60;

        const bedWindowEnd = (bedTime + this.settings.wakeWindow) % (24 * 60);

        results.push({
          cycles: cycles,
          bedTime: bedTime,
          bedTimeStr: this.formatTime(bedTime),
          wakeTime: startTime,
          wakeWindowStr: `${this.formatTime(bedTime)} - ${this.formatTime(bedWindowEnd)}`,
          duration: `${(sleepDuration / 60).toFixed(1)} hrs`
        });
      }
    } else {
      const bedTime = startTime;
      for (let cycles = 4; cycles <= 6; cycles++) {
        const sleepDuration = this.settings.latency + cycles * this.settings.cycleLength;
        const wakeTime = bedTime + sleepDuration;

        const wakeWindowEnd = (wakeTime + this.settings.wakeWindow) % (24 * 60);

        results[cycles - 4] = {
          cycles: cycles,
          wakeTime: wakeTime % (24 * 60),
          wakeTimeStr: this.formatTime(wakeTime),
          bedTime: bedTime,
          wakeWindowStr: `${this.formatTime(wakeTime)} - ${this.formatTime(wakeWindowEnd)}`,
          duration: `${(sleepDuration / 60).toFixed(1)} hrs`
        };
      }
    }

    this.renderResults(results);
  },

  renderResults(results) {
    const listHtml = results.map((r, i) => {
      const isBest = Math.abs(r.cycles - 5) === 0;
      const resultTime = this.mode === 'wake' ? r.bedTimeStr : r.wakeTimeStr;
      const isSelected = this.selectedResult === i;
      const windowLabel = this.mode === 'wake' ? 'Go to bed between:' : 'Wake between:';
      const showWindow = this.settings.wakeWindow > 0;

      return `
        <button class="result-card ${isSelected ? 'selected' : ''} ${isBest ? 'best' : ''}" data-index="${i}">
          <div class="copy-btn" title="Copy to clipboard" data-index="${i}">📋</div>
          <div class="result-time">${resultTime}</div>
          ${showWindow ? `<div class="result-window">${windowLabel} ${r.wakeWindowStr}</div>` : ''}
          <div class="result-details">
            <span class="result-detail">${r.cycles} cycles</span>
            <span class="result-detail">${r.duration}</span>
          </div>
          <div class="result-explanation">
            ${this.mode === 'wake' ? `(${this.settings.latency}m latency + ${r.cycles} cycles × ${this.settings.cycleLength}m)` : `(${this.settings.latency}m latency + ${r.cycles} cycles × ${this.settings.cycleLength}m)`}
          </div>
        </button>
      `;
    }).join('');

    document.getElementById('resultsList').innerHTML = listHtml;

    document.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // If clicking copy button, don't trigger selection
        if (e.target.classList.contains('copy-btn')) {
          this.copyResult(e.target.dataset.index);
          return;
        }

        const index = card.dataset.index;
        document.querySelectorAll('.result-card').forEach(c => {
          c.classList.remove('selected');
          c.classList.remove('glow');
        });
        card.classList.add('selected');
        card.classList.add('glow');
        setTimeout(() => card.classList.remove('glow'), 600);
        this.selectedResult = index;
      });
    });

    // If a result was loaded from URL, trigger glow animation on it
    if (this.selectedResult !== null) {
      const selectedCard = document.querySelector(`.result-card[data-index="${this.selectedResult}"]`);
      if (selectedCard) {
        selectedCard.classList.add('glow');
        setTimeout(() => selectedCard.classList.remove('glow'), 600);
      }
    }

    document.getElementById('resultsLabel').textContent = this.mode === 'wake' ? 'Go to bed at...' : 'Wake up at...';
  },

  copyResult(index) {
    const r = document.querySelectorAll('.result-card')[index];
    if (!r) return;
    const time = r.querySelector('.result-time').textContent;
    const windowText = r.querySelector('.result-window')?.textContent || '';
    const details = Array.from(r.querySelectorAll('.result-detail')).map(d => d.textContent).join(' | ');
    
    const params = new URLSearchParams({
      mode: this.mode,
      hour: this.hour,
      minute: this.minute,
      period: this.period,
      latency: this.settings.latency,
      cycleLength: this.settings.cycleLength,
      selectedResult: index
    });

    const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
    const text = `NightOwl Sleep Plan:\nTime: ${time}\n${windowText ? `${windowText}\n` : ''}${details}\nPlan your sleep at: ${shareUrl}`;

    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = r.querySelector('.copy-btn');
      if (copyBtn) {
        const originalIcon = copyBtn.textContent;
        copyBtn.textContent = '✅';
        setTimeout(() => {
          copyBtn.textContent = originalIcon;
        }, 1500);
      }
    });
  },

  saveSettings() {
    localStorage.setItem('sleepSettings', JSON.stringify({
      settings: this.settings,
      timeFormat: this.timeFormat
    }));
  },

  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('mode')) {
      const mode = params.get('mode');
      if (mode === 'wake' || mode === 'sleep') this.setMode(mode);
    }
    if (params.has('hour')) this.hour = Math.max(1, Math.min(12, parseInt(params.get('hour')) || 1));
    if (params.has('minute')) this.minute = Math.max(0, Math.min(59, parseInt(params.get('minute')) || 0));
    if (params.has('period')) {
      const period = params.get('period');
      if (period === 'AM' || period === 'PM') this.period = period;
    }
    if (params.has('latency')) this.settings.latency = Math.max(0, Math.min(60, parseInt(params.get('latency')) || 10));
    if (params.has('cycleLength')) this.settings.cycleLength = Math.max(80, Math.min(110, parseInt(params.get('cycleLength')) || 90));
    if (params.has('selectedResult')) {
      const selectedIdx = parseInt(params.get('selectedResult'));
      if (selectedIdx >= 0 && selectedIdx <= 2) {
        this.selectedResult = selectedIdx;
      }
    }
    this.updateTimePicker();
  },

  shareLink() {
    const params = new URLSearchParams({
      mode: this.mode,
      hour: this.hour,
      minute: this.minute,
      period: this.period,
      latency: this.settings.latency,
      cycleLength: this.settings.cycleLength
    });
    if (this.selectedResult !== null) {
      params.append('selectedResult', this.selectedResult);
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      const btn = document.getElementById('shareBtn');
      const originalText = btn.textContent;
      btn.textContent = 'Link copied!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    }).catch(() => { alert('Could not copy link. URL: ' + shareUrl); });
  },

  loadSettings() {
    const saved = localStorage.getItem('sleepSettings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
        }
        this.timeFormat = data.timeFormat || '12';
        
        // Update UI
        document.getElementById('latencyValue').textContent = this.settings.latency;
        document.getElementById('cycleLengthValue').textContent = this.settings.cycleLength;
        document.getElementById('wakeWindowValue').textContent = this.settings.wakeWindow;
        document.getElementById('latency').value = this.settings.latency;
        document.getElementById('cycleLength').value = this.settings.cycleLength;
        document.getElementById('wakeWindow').value = this.settings.wakeWindow;
        
        document.querySelectorAll('.toggle-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.format === this.timeFormat);
        });
        document.getElementById('timeFormatToggle').classList.toggle('active', this.timeFormat === '24');
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }
};

app.init();
