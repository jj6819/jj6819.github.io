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
  socialJetLagEnabled: false,
  selectedResult: null,
  scrollVelocity: 0,
  lastWheelTime: 0,

  init() {
    this.memeMode = false;
    this.timeFormat = '12';
    this.setupEventListeners();
    this.loadSettings();
    this.loadFromUrl();
    this.updateMemeUI();
    this.calculate();
    document.getElementById('year').textContent = new Date().getFullYear();
  },

  setupEventListeners() {
    for (let i = 1; i <= 4; i++) {
      const toggleId = `infoToggle${i === 1 ? '' : i}`;
      const sectionId = `infoSection${i === 1 ? '' : i}`;
      const toggleEl = document.getElementById(toggleId);
      
      if (toggleEl) {
        toggleEl.addEventListener('click', () => {
          const infoSection = document.getElementById(sectionId);
          const isExpanded = infoSection.style.display !== 'none';
          
          for (let j = 1; j <= 4; j++) {
            if (j === i) continue;
            const otherSection = document.getElementById(`infoSection${j === 1 ? '' : j}`);
            const otherToggle = document.getElementById(`infoToggle${j === 1 ? '' : j}`);
            if (otherSection) otherSection.style.display = 'none';
            if (otherToggle) otherToggle.classList.remove('expanded');
          }
          
          infoSection.style.display = isExpanded ? 'none' : 'block';
          toggleEl.classList.toggle('expanded');
        });
      }
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setMode(e.target.closest('.mode-btn').dataset.mode));
    });

    document.getElementById('shareBtn').addEventListener('click', () => this.shareLink());

    const embedToggle = document.getElementById('embedToggle');
    const embedPanel = document.getElementById('embedPanel');
    const embedClose = document.getElementById('embedClose');
    const copyEmbedBtn = document.getElementById('copyEmbedBtn');

    if (embedToggle) {
      embedToggle.addEventListener('click', () => {
        embedPanel.style.display = embedPanel.style.display === 'none' ? 'block' : 'none';
        if (embedPanel.style.display === 'block') {
          embedPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    if (embedClose) {
      embedClose.addEventListener('click', () => {
        embedPanel.style.display = 'none';
      });
    }

    if (copyEmbedBtn) {
      copyEmbedBtn.addEventListener('click', () => {
        const code = document.getElementById('embedCode').textContent;
        navigator.clipboard.writeText(code).then(() => {
          const originalText = copyEmbedBtn.textContent;
          copyEmbedBtn.textContent = 'Copied!';
          copyEmbedBtn.classList.add('success');
          setTimeout(() => {
            copyEmbedBtn.textContent = originalText;
            copyEmbedBtn.classList.remove('success');
          }, 2000);
        });
      });
    }

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

    document.getElementById('memeModeToggle').addEventListener('click', () => {
      const isCurrentlyOff = !this.memeMode;
      this.setMemeMode(isCurrentlyOff ? 'on' : 'off');
    });

    document.getElementById('socialJetLagToggle').addEventListener('click', () => {
      this.socialJetLagEnabled = !this.socialJetLagEnabled;
      this.updateSocialJetLagUI();
      this.saveSettings();
    });

    document.getElementById('weekdayWake').addEventListener('input', () => {
      this.updateSocialJetLagUI();
      this.saveSettings();
    });

    document.getElementById('weekendWake').addEventListener('input', () => {
      this.updateSocialJetLagUI();
      this.saveSettings();
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

    document.querySelectorAll(".nap-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const napMins = Number(btn.dataset.nap);
        const wakeWindowMins = this.settings.wakeWindow;

        const now = new Date();
        const start = new Date(now.getTime() + napMins * 60000);
        const end = new Date(start.getTime() + wakeWindowMins * 60000);

        const use24h = (this.timeFormat === "24");
        const fmt = new Intl.DateTimeFormat(undefined, { 
          hour: "numeric", 
          minute: "2-digit", 
          hour12: !use24h 
        });

        const out = document.getElementById("napOutput");
        if (out) {
          out.innerHTML = `<strong>Wake between:</strong> ${fmt.format(start)} – ${fmt.format(end)}`;
          out.classList.add('glow');
          setTimeout(() => out.classList.remove('glow'), 600);
        }

        document.querySelectorAll('.nap-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },

  saveSettings() {
    const settings = {
      ...this.settings,
      timeFormat: this.timeFormat,
      socialJetLagEnabled: this.socialJetLagEnabled,
      weekdayWake: document.getElementById('weekdayWake').value,
      weekendWake: document.getElementById('weekendWake').value
    };
    localStorage.setItem('nightowl_settings', JSON.stringify(settings));
  },

  loadSettings() {
    const saved = localStorage.getItem('nightowl_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.settings = {
          latency: settings.latency ?? 10,
          cycleLength: settings.cycleLength ?? 90,
          wakeWindow: settings.wakeWindow ?? 10
        };
        this.timeFormat = settings.timeFormat || '12';
        this.socialJetLagEnabled = settings.socialJetLagEnabled || false;
        
        document.getElementById('latency').value = this.settings.latency;
        document.getElementById('latencyValue').textContent = this.settings.latency;
        document.getElementById('cycleLength').value = this.settings.cycleLength;
        document.getElementById('cycleLengthValue').textContent = this.settings.cycleLength;
        document.getElementById('wakeWindow').value = this.settings.wakeWindow;
        document.getElementById('wakeWindowValue').textContent = this.settings.wakeWindow;
        
        if (settings.weekdayWake) document.getElementById('weekdayWake').value = settings.weekdayWake;
        if (settings.weekendWake) document.getElementById('weekendWake').value = settings.weekendWake;

        document.querySelectorAll('.toggle-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.format === this.timeFormat);
        });
        document.getElementById('timeFormatToggle').classList.toggle('active', this.timeFormat === '24');

        const toggleContainer = document.getElementById('memeModeToggle');
        if (toggleContainer) {
          toggleContainer.classList.remove('active');
          toggleContainer.querySelector('.meme-toggle-label').textContent = 'Normal';
        }
        
        this.updateSocialJetLagUI();
        this.updateMemeUI();
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    } else {
      this.socialJetLagEnabled = false;
      this.updateSocialJetLagUI();
    }
  },

  setMemeMode(status) {
    this.memeMode = status === 'on';
    
    const toggleContainer = document.getElementById('memeModeToggle');
    const label = toggleContainer.querySelector('.meme-toggle-label');
    
    if (status === 'on') {
      toggleContainer.classList.add('active');
      label.textContent = 'Meme Mode';
    } else {
      toggleContainer.classList.remove('active');
      label.textContent = 'Normal';
    }
    
    this.setTimeFormat('12');
    this.updateMemeUI();
    this.calculate();
    this.saveSettings();
  },

  updateMemeUI() {
    const isMeme = this.memeMode;
    const memeVariants = [
      "Bedtimes + wake windows for people who hate mornings",
      "Sleep math for the chronically sleepy",
      "Plan your cycles. Avoid the zombie mode",
      "You can’t out-hustle sleep. Try timing it",
      "Helping you wake up like a person, not a cryptid"
    ];
    
    const headerSub = isMeme 
      ? memeVariants[Math.floor(Math.random() * memeVariants.length)]
      : "Bedtimes + wake windows based on 90-minute cycles";
    document.querySelector('.subtitle').textContent = headerSub;

    const wakeBtn = document.querySelector('[data-mode="wake"]');
    const sleepBtn = document.querySelector('[data-mode="sleep"]');
    
    const wakeMemeOptions = ["I need to be human by...", "I must awaken by...", "Alarm time:", "Wake me up at..."];
    const sleepMemeOptions = ["I’m going to bed (for real).", "Put me in sleep mode.", "Initiate bedtime.", "It’s sleep o’clock."];

    if (isMeme) {
      wakeBtn.innerHTML = `<span>⏰</span> ${wakeMemeOptions[Math.floor(Math.random() * wakeMemeOptions.length)]}`;
      sleepBtn.innerHTML = `<span>🛏️</span> ${sleepMemeOptions[Math.floor(Math.random() * sleepMemeOptions.length)]}`;
    } else {
      wakeBtn.innerHTML = `<span>⏰</span> Wake up at...`;
      sleepBtn.innerHTML = `<span>🛏️</span> Bedtime now`;
    }

    const labels = document.querySelectorAll('.setting-label');
    const latencyHelper = isMeme ? "How long I doomscroll before sleep." : "";
    const cycleHelper = isMeme ? "My brain’s sleep playlist length." : "";
    const windowHelper = isMeme ? "Grace period for my life choices." : "";
    const formatHelper = isMeme ? "Civilian time vs 24h time." : "";

    this.updateHelper(labels[0], latencyHelper);
    this.updateHelper(labels[1], cycleHelper);
    this.updateHelper(labels[2], windowHelper);
    this.updateHelper(labels[3], formatHelper);

    const timeLabel = document.getElementById('timeLabel');
    const wakeTimeMeme = ["I want to wake up at... (no promises)", "Wake time (please don’t judge me):", "Target wake time:"];
    const sleepTimeMeme = ["I want to go to bed at... (for real this time)", "Bedtime (yes, I said it):", "When I intend to sleep:"];

    if (this.mode === 'wake') {
      timeLabel.textContent = isMeme ? wakeTimeMeme[Math.floor(Math.random() * wakeTimeMeme.length)] : "I want to wake up at...";
    } else {
      timeLabel.textContent = isMeme ? sleepTimeMeme[Math.floor(Math.random() * sleepTimeMeme.length)] : "I want to go to bed...";
    }

    const resLabel = document.getElementById('resultsLabel');
    const resultMeme = [
      "Best times to sleep so you’re less cursed tomorrow",
      "Your ‘don’t be groggy’ options",
      "Here’s the least painful schedule",
      "Sleep windows (pick your destiny)"
    ];
    if (isMeme) {
      resLabel.textContent = resultMeme[Math.floor(Math.random() * resultMeme.length)];
    } else {
      resLabel.textContent = this.mode === 'wake' ? 'Go to bed at...' : 'Wake up at...';
    }

    const shareMeme = ["Copy my sleep plan", "Share this wisdom", "Send to a friend who’s tired", "Export bedtime propaganda"];
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.textContent = isMeme ? shareMeme[Math.floor(Math.random() * shareMeme.length)] : "Share Link";

    const disclaimer = document.querySelector('.footer-disclaimer');
    const disclaimerMeme = ["Educational tool only — not medical advice (sadly).", "Not a doctor, just an owl with opinions."];
    disclaimer.textContent = isMeme 
      ? disclaimerMeme[Math.floor(Math.random() * disclaimerMeme.length)]
      : "Educational tool only — not medical advice.";
  },

  minutesToTime(totalMins) {
    let hrs = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  timeToMinutes(timeStr) {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  },

  formatDisplayTime(totalMins) {
    let hrs = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;

    if (this.timeFormat === '12') {
      const period = hrs >= 12 ? 'PM' : 'AM';
      const hour12 = hrs % 12 || 12;
      return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`;
    }
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  updateSocialJetLagUI() {
    const container = document.getElementById('socialJetLagToggle');
    const inputs = document.getElementById('socialJetLagInputs');
    const resultDiv = document.getElementById('socialJetLagResult');

    if (this.socialJetLagEnabled) {
      container.classList.add('active');
      inputs.style.display = 'block';

      const weekdayEl = document.getElementById('weekdayWake');
      const weekendEl = document.getElementById('weekendWake');
      
      const weekdayValue = weekdayEl.value;
      const weekendValue = weekendEl.value;

      const weekdayMins = this.timeToMinutes(weekdayValue);
      const weekendMins = this.timeToMinutes(weekendValue);
      
      // Update the display labels for the inputs to show the selected format
      const weekdayLabel = weekdayEl.previousElementSibling;
      const weekendLabel = weekendEl.previousElementSibling;
      
      // Force 24h format if the toggle is set to 24h
      const formattedWeekday = this.formatDisplayTime(weekdayMins);
      const formattedWeekend = this.formatDisplayTime(weekendMins);

      if (weekdayLabel) weekdayLabel.textContent = `Weekday Wake (${formattedWeekday})`;
      if (weekendLabel) weekendLabel.textContent = `Weekend Wake (${formattedWeekend})`;

      // Also update the input values if they look like 12h but should be 24h
      // However, HTML time inputs ARE 24h. The issue might be initial values or loading.
      
      let diff = weekendMins - weekdayMins;
      if (diff < 0) diff = 0; 

      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      
      let severity = "Low";
      let severityClass = "severity-low";
      if (diff >= 120) { severity = "High"; severityClass = "severity-high"; }
      else if (diff >= 60) { severity = "Moderate"; severityClass = "severity-moderate"; }
      else if (diff >= 30) { severity = "Mild"; severityClass = "severity-mild"; }

      const smootherMins = weekdayMins + Math.min(diff, 60);
      const smootherTime = this.formatDisplayTime(smootherMins);

      resultDiv.innerHTML = `
        <div class="social-result-value">Social jet lag: <span class="${severityClass}">${hours}h ${mins}m (${severity})</span></div>
        <div class="social-result-target">Smoother weekend target: ${smootherTime}</div>
      `;
    } else {
      container.classList.remove('active');
      inputs.style.display = 'none';
    }
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
    
    // Update active state of buttons
    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });
    
    const formatToggle = document.getElementById('timeFormatToggle');
    if (formatToggle) {
      formatToggle.classList.toggle('active', format === '24');
    }

    this.updateTimePicker();
    this.updateSocialJetLagUI();
    this.calculate();
    this.saveSettings();
  },

  updateHelper(labelEl, text) {
    let helper = labelEl.parentElement.querySelector('.setting-helper');
    if (text) {
      if (!helper) {
        helper = document.createElement('div');
        helper.className = 'setting-helper';
        labelEl.after(helper);
      }
      helper.textContent = text;
    } else if (helper) {
      helper.remove();
    }
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
    
    // Sync Social Jet Lag inputs with format (purely for consistency, though HTML time inputs are usually 24h internally)
    // The display in Social Jet Lag results already uses formatDisplayTime() which respects this.timeFormat
    
    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });
    document.getElementById('timeFormatToggle').classList.toggle('active', format === '24');
    this.updateTimePicker();
    this.updateSocialJetLagUI();
    this.calculate();
    this.saveSettings();
  },

  setMode(newMode) {
    this.mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });
    
    const activeBtn = document.querySelector('.mode-btn.active');
    if (activeBtn) {
      activeBtn.classList.add('mode-switched');
      setTimeout(() => activeBtn.classList.remove('mode-switched'), 600);
    }

    this.updateZzz();
    
    const newLabel = newMode === 'wake' ? 'I want to wake up at...' : 'I want to go to bed...';
    document.getElementById('timeLabel').textContent = newLabel;
    
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
    
    this.selectedResult = null;
    const shareCard = document.getElementById('shareCard');
    if (shareCard) shareCard.style.display = 'none';

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
    this.updateZzz();
  },

  updateZzz() {
    const existing = document.querySelector('.zzz-container');
    const owlImg = document.getElementById('owlImg');
    
    if (this.mode === 'sleep') {
      if (owlImg) {
        owlImg.src = "/attached_assets/owl2_1767300759408.png";
      }
      
      if (!existing) {
        const container = document.createElement('div');
        container.className = 'zzz-container';
        container.innerHTML = `
          <span class="zzz" style="font-size: 14px;">z</span>
          <span class="zzz">z</span>
          <span class="zzz">z</span>
        `;
        document.getElementById('timePicker').appendChild(container);
      }
    } else {
      if (owlImg) {
        owlImg.src = "/attached_assets/owl1_1767300759408.png";
      }
      if (existing) existing.remove();
    }
  },

  renderResults(results) {
    const isMeme = this.memeMode;
    this.updateSocialJetLagUI();
    const listHtml = results.map((r, i) => {
      const isBest = Math.abs(r.cycles - 5) === 0;
      const resultTime = this.mode === 'wake' ? r.bedTimeStr : r.wakeTimeStr;
      const isSelected = this.selectedResult === i;
      const windowLabel = this.mode === 'wake' ? 'Go to bed between:' : 'Wake between:';
      const showWindow = this.settings.wakeWindow > 0;

      let memeMicro = "";
      if (isMeme) {
        if (r.cycles === 4) {
          const variants = ["Survival Mode", "Quick Reset", "Not ideal, but we move."];
          memeMicro = variants[Math.floor(Math.random() * variants.length)];
        } else if (r.cycles === 5) {
          const variants = ["Solid Human Energy", "Best Option", "Main character morning."];
          memeMicro = variants[Math.floor(Math.random() * variants.length)];
        } else if (r.cycles === 6) {
          const variants = ["Peak Adulting", "Full Recharge", "Boss fight ready."];
          memeMicro = variants[Math.floor(Math.random() * variants.length)];
        }
      }

      let bestBadge = "★ Best Option";
      if (isMeme) {
        const badges = ["⭐ Least Painful", "⭐ Top Pick", "⭐ Main Quest", "⭐ Optimal Owl Choice"];
        bestBadge = badges[i % badges.length];
      }

      return `
        <button class="result-card ${isSelected ? 'selected' : ''} ${isBest ? 'best' : ''}" data-index="${i}">
          <div class="copy-btn" title="Copy to clipboard" data-index="${i}">📋</div>
          ${isBest ? `<div class="badge-meme" style="font-size: 11px; color: #fbbf24; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${bestBadge}</div>` : ''}
          <div class="result-time">${resultTime}</div>
          ${showWindow ? `<div class="result-window">${windowLabel} ${r.wakeWindowStr}</div>` : ''}
          <div class="result-details">
            <span class="result-detail">${r.cycles} cycles</span>
            <span class="result-detail">${r.duration}</span>
          </div>
          ${isMeme ? `<div class="meme-micro" style="font-size: 12px; color: #fbbf24; margin-top: 4px; font-weight: 600;">"${memeMicro}"</div>` : ''}
          <div class="result-explanation">
            ${this.mode === 'wake' ? `Going to bed at this time gives you ${r.duration} of actual sleep.` : `Waking up at this time gives you ${r.duration} of actual sleep.`}
          </div>
        </button>
      `;
    }).join('');

    document.getElementById('resultsList').innerHTML = listHtml;

    document.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
          this.copyToClipboard(results[e.target.dataset.index]);
          return;
        }
        const index = parseInt(card.dataset.index);
        this.selectedResult = index;
        this.renderResults(results);
        this.updateShareCard(results[index]);
      });
    });
  },

  updateShareCard(result) {
    const shareCard = document.getElementById('shareCard');
    const title = document.getElementById('shareCardTitle');
    const body = document.getElementById('shareCardBody');
    
    shareCard.style.display = 'block';
    title.textContent = this.mode === 'wake' ? "Tonight's Bedtime" : "Tomorrow's Wake Up";
    
    if (this.mode === 'wake') {
      body.innerHTML = `I'm aiming for ${result.bedTimeStr}.<br>That's ${result.cycles} cycles of sleep! 🌙`;
    } else {
      body.innerHTML = `I'm waking up at ${result.wakeTimeStr}.<br>That's ${result.cycles} cycles of sleep! ⏰`;
    }
  },

  copyToClipboard(result) {
    const time = this.mode === 'wake' ? result.bedTimeStr : result.wakeTimeStr;
    const text = `I'm using NightOwl to plan my sleep! My target ${this.mode === 'wake' ? 'bedtime' : 'wake time'} is ${time} (${result.cycles} cycles). Check your sleep cycle at https://nightowlsleepcalc.com/`;
    
    const index = this.selectedResult !== null ? this.selectedResult : 0;
    
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector(`.result-card[data-index="${index}"] .copy-btn`);
      if (btn) {
        const original = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => btn.textContent = original, 2000);
      }
    });
  },

  shareLink() {
    const url = new URL(window.location.origin);
    url.searchParams.set('h', this.hour);
    url.searchParams.set('m', this.minute);
    url.searchParams.set('p', this.period);
    url.searchParams.set('f', this.timeFormat);
    url.searchParams.set('mode', this.mode);
    
    navigator.clipboard.writeText(url.toString()).then(() => {
      const shareBtn = document.getElementById('shareBtn');
      const originalText = shareBtn.textContent;
      shareBtn.textContent = 'Link Copied!';
      shareBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      setTimeout(() => {
        shareBtn.textContent = originalText;
        shareBtn.style.background = '';
      }, 2000);
    });
  },

  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('h')) this.hour = parseInt(params.get('h'));
    if (params.has('m')) this.minute = parseInt(params.get('m'));
    if (params.has('p')) this.period = params.get('p');
    if (params.has('f')) this.timeFormat = params.get('f');
    if (params.has('mode')) this.mode = params.get('mode');
    this.updateTimePicker();
  }
};

function createStars() {
  const container = document.getElementById('starsContainer');
  const count = 150;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
    star.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(star);
  }
}

app.init();
