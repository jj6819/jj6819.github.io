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
    if (this.initialized) return;
    this.initialized = true;

    this.memeMode = false;
    this.timeFormat = '12';
    
    this.tomorrowMode = 'sharp';
    this.setupEventListeners();
    this.loadSettings();
    this.loadFromUrl();
    this.updateMemeUI();
    this.calculate();
    
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    
    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
      });
    }
  },

  setupEventListeners() {
    // Info Toggles (Expandable Sections)
    const pairs = [
      { btn: 'infoToggle', content: 'infoSection' },
      { btn: 'infoToggle2', content: 'infoSection2' },
      { btn: 'infoToggle3', content: 'infoSection3' },
      { btn: 'infoToggle4', content: 'infoSection4' },
      { btn: 'infoToggle5', content: 'infoSection5' }
    ];

    pairs.forEach(pair => {
      const btn = document.getElementById(pair.btn);
      
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Get the current section
          const section = document.getElementById(pair.content);
          if (!section) return;

          const isCurrentlyOpen = section.style.display === 'block';

          // Close ALL sections
          pairs.forEach(p => {
             const s = document.getElementById(p.content);
             const b = document.getElementById(p.btn);
             if (s) s.style.display = 'none';
             if (b) b.classList.remove('expanded');
          });

          // Toggle THIS one if it wasn't open
          if (!isCurrentlyOpen) {
            section.style.display = 'block';
            btn.classList.add('expanded');
          }
        });
      }
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setMode(e.target.closest('.mode-btn').dataset.mode));
    });

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', () => this.shareLink());

    const embedToggle = document.getElementById('embedToggle');
    const embedPanel = document.getElementById('embedPanel');
    const embedClose = document.getElementById('embedClose');
    const copyEmbedBtn = document.getElementById('copyEmbedBtn');

    if (embedToggle) {
        embedToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (embedPanel) {
                const isHidden = embedPanel.style.display === 'none' || embedPanel.style.display === '';
                embedPanel.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    embedPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
    }

    if (embedClose) {
      embedClose.addEventListener('click', () => {
        if (embedPanel) embedPanel.style.display = 'none';
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

    // --- Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
      // Toggle Meme Mode with 'M'
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
        const isCurrentlyOff = !this.memeMode;
        this.setMemeMode(isCurrentlyOff ? 'on' : 'off');
      }
      // Open/Close Settings with 'S'
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
        const grid = document.getElementById('settingsGrid');
        if (grid) grid.classList.toggle('show');
      }
    });

    const toggleSettingsBtn = document.getElementById('toggleSettings');
    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const grid = document.getElementById('settingsGrid');
            if (grid) {
                grid.classList.toggle('show');
            }
        });
    }

    const latencyInput = document.getElementById('latency');
    if (latencyInput) {
        latencyInput.addEventListener('input', (e) => {
            this.settings.latency = parseInt(e.target.value);
            document.getElementById('latencyValue').textContent = this.settings.latency;
            this.saveSettings();
            this.calculate();
        });
    }

    const cycleLengthInput = document.getElementById('cycleLength');
    if (cycleLengthInput) {
        cycleLengthInput.addEventListener('input', (e) => {
            this.settings.cycleLength = parseInt(e.target.value);
            document.getElementById('cycleLengthValue').textContent = this.settings.cycleLength;
            this.saveSettings();
            this.calculate();
        });
    }

    const wakeWindowInput = document.getElementById('wakeWindow');
    if (wakeWindowInput) {
        wakeWindowInput.addEventListener('input', (e) => {
            this.settings.wakeWindow = parseInt(e.target.value);
            document.getElementById('wakeWindowValue').textContent = this.settings.wakeWindow;
            this.saveSettings();
            this.calculate();
        });
    }

    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.setTimeFormat(e.target.dataset.format));
    });

    const memeModeToggle = document.getElementById('memeModeToggle');
    if (memeModeToggle) {
        memeModeToggle.addEventListener('click', () => {
            const isCurrentlyOff = !this.memeMode;
            this.setMemeMode(isCurrentlyOff ? 'on' : 'off');
        });
    }

    document.querySelectorAll('.tm-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setTomorrowMode(btn.dataset.tm));
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

    const timePicker = document.getElementById('timePicker');
    if (timePicker) {
        timePicker.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    // --- Nap Calculator ---
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

        // Add active state to button
        document.querySelectorAll('.nap-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
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
    
    // Randomize meme variants
    const memeVariants = [
      "Bedtimes + wake windows for people who hate mornings",
      "Sleep math for the chronically sleepy",
      "Plan your cycles. Avoid the zombie mode",
      "You can’t out-hustle sleep. Try timing it",
      "Helping you wake up like a person, not a cryptid"
    ];
    
    // Header
    const headerSub = isMeme 
      ? memeVariants[Math.floor(Math.random() * memeVariants.length)]
      : "Bedtimes + wake windows based on 90-minute cycles";
    document.querySelector('.subtitle').textContent = headerSub;

    // Mode Buttons
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

    // Setting Helpers
    const labels = document.querySelectorAll('.setting-label');
    const latencyHelper = isMeme ? "How long I doomscroll before sleep." : "";
    const cycleHelper = isMeme ? "My brain’s sleep playlist length." : "";
    const windowHelper = isMeme ? "Grace period for my life choices." : "";
    const formatHelper = isMeme ? "Civilian time vs 24h time." : "";

    this.updateHelper(labels[0], latencyHelper);
    this.updateHelper(labels[1], cycleHelper);
    this.updateHelper(labels[2], windowHelper);
    this.updateHelper(labels[3], formatHelper);

    // Time Label
    const timeLabel = document.getElementById('timeLabel');
    const wakeTimeMeme = ["I want to wake up at... (no promises)", "Wake time (please don’t judge me):", "Target wake time:"];
    const sleepTimeMeme = ["I want to go to bed at... (for real this time)", "Bedtime (yes, I said it):", "When I intend to sleep:"];

    if (this.mode === 'wake') {
      timeLabel.textContent = isMeme ? wakeTimeMeme[Math.floor(Math.random() * wakeTimeMeme.length)] : "I want to wake up at...";
    } else {
      timeLabel.textContent = isMeme ? sleepTimeMeme[Math.floor(Math.random() * sleepTimeMeme.length)] : "I want to go to bed...";
    }

    // Results Label
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

    // Share Button
    const shareMeme = ["Copy my sleep plan", "Share this wisdom", "Send to a friend who’s tired", "Export bedtime propaganda"];
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.textContent = isMeme ? shareMeme[Math.floor(Math.random() * shareMeme.length)] : "🔗 Share Link";

    // Footer
    const disclaimer = document.querySelector('.footer-disclaimer');
    const disclaimerMeme = ["Educational tool only — not medical advice (sadly).", "Not a doctor, just an owl with opinions."];
    disclaimer.textContent = isMeme 
      ? disclaimerMeme[Math.floor(Math.random() * disclaimerMeme.length)]
      : "Educational tool only — not medical advice.";
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

    // Immediately update owl image and zzz on mode switch for better responsiveness
    this.updateZzz();
    
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
    
    this.selectedResult = null;
    const shareCard = document.getElementById('shareCard');
    if (shareCard) shareCard.style.display = 'none';

    this.calculate();
  },

  handleTimeScroll(e, columnId) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - this.lastWheelTime < 300) return; // Slowed down from 150ms
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
    if (Math.abs(diff) > 40) { // Increased threshold from 20px for slower sensitivity
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
    const tmMode = this.tomorrowMode || 'sharp';

    // Tomorrow Mode Logic: Recommended Cycle
    let recommendedCycle = 5; 
    if (tmMode === 'sharp') recommendedCycle = 6;
    if (tmMode === 'recover') recommendedCycle = 6;

    if (tmMode === 'survive') {
      const now = luxon.DateTime.local();
      const c5 = results.find(r => r.cycles === 5);
      if (c5) {
        const bedTimeDT = luxon.DateTime.local().startOf('day').plus({ minutes: c5.bedTime });
        if (now > bedTimeDT.plus({ minutes: this.settings.wakeWindow })) {
          recommendedCycle = 4;
        }
      }
    }

    const tmNote = document.getElementById('tmNote');
    if (tmNote) {
      let noteText = "";
      const baseResult = results.find(r => r.cycles === recommendedCycle) || results[1];
      const wakeTimeMin = baseResult.wakeTime;
      const wakeTimeDT = luxon.DateTime.local().startOf('day').plus({ minutes: wakeTimeMin });
      const napStart = wakeTimeDT.plus({ hours: 7 }).toLocaleString(luxon.DateTime.TIME_SIMPLE);

      if (tmMode === 'sharp') {
        noteText = `🎯 Recommended: 6 cycles for maximum cognitive performance.`;
      } else if (tmMode === 'survive') {
        noteText = `☕ Recommended: ${recommendedCycle} cycles. Try a 20-min power nap around ${napStart} to stay alert.`;
      } else if (tmMode === 'recover') {
        noteText = `🛌 Recommended: 6 cycles. A 90-min recovery nap around ${napStart} is encouraged.`;
      }

      tmNote.textContent = noteText;
      tmNote.hidden = false;
    }

    const listHtml = results.map((r, i) => {
      const isRecommended = r.cycles === recommendedCycle;
      const isBest = Math.abs(r.cycles - 5) === 0;
      const resultTime = this.mode === 'wake' ? r.bedTimeStr : r.wakeTimeStr;
      const isSelected = parseInt(this.selectedResult) === i;
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
        <button class="result-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}" data-index="${i}" data-cycles="${r.cycles}" data-testid="card-result-${i}">
          <div class="copy-btn" title="Copy to clipboard" data-index="${i}">📋</div>
          ${isRecommended ? `<div class="recommended-badge">Recommended</div>` : (isBest && !isMeme ? `<div class="badge-meme" style="font-size: 11px; color: #fbbf24; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${bestBadge}</div>` : '')}
          ${isBest && isMeme ? `<div class="badge-meme" style="font-size: 11px; color: #fbbf24; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${bestBadge}</div>` : ''}
          <div class="result-time">${resultTime}</div>
          ${showWindow ? `<div class="result-window">${windowLabel} ${r.wakeWindowStr}</div>` : ''}
          <div class="result-details">
            <span class="result-detail">${r.cycles} cycles</span>
            <span class="result-detail">${r.duration}</span>
          </div>
          ${isMeme ? `<div class="meme-micro" style="font-size: 12px; color: #fbbf24; margin-top: 4px; font-weight: 600;">"${memeMicro}"</div>` : ''}
          <div class="result-explanation">
            ${this.mode === 'wake' ? `(${this.settings.latency}m latency + ${r.cycles} cycles × ${this.settings.cycleLength}m)` : `(${this.settings.latency}m latency + ${r.cycles} cycles × ${this.settings.cycleLength}m)`}
          </div>
        </button>
      `;
    }).join('');

    document.getElementById('resultsList').innerHTML = listHtml;

    document.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', (e) => {
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

  setTomorrowMode(mode) {
    this.tomorrowMode = mode;
    document.querySelectorAll('.tm-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tm === mode);
    });
    this.saveSettings();
    this.calculate();
  },

  saveSettings() {
    localStorage.setItem('sleepSettings', JSON.stringify({
      settings: this.settings,
      timeFormat: this.timeFormat,
      memeMode: this.memeMode,
      tomorrowMode: this.tomorrowMode
    }));
  },

  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('mode')) {
      const mode = params.get('mode');
      if (mode === 'wake' || mode === 'sleep') {
        this.setMode(mode);
      } else if (mode === 'jetlag') {
        const jetLagBtn = document.querySelector('[data-app-mode="jetlag"]');
        if (jetLagBtn) {
          jetLagBtn.click();
          // Scroll to calculator
          jetLagBtn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else if (mode === 'caffeine') {
        const caffeineBtn = document.querySelector('[data-app-mode="caffeine"]');
        if (caffeineBtn) {
          caffeineBtn.click();
          // Scroll to calculator
          caffeineBtn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else if (mode === 'nap') {
        const napBtn = document.querySelector('[data-app-mode="nap"]');
        if (napBtn) {
          napBtn.click();
          // Scroll to calculator
          napBtn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
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
    
    // Show share card preview
    const shareCard = document.getElementById('shareCard');
    const shareCardBody = document.getElementById('shareCardBody');
    const shareCardTitle = document.getElementById('shareCardTitle');
    
    if (this.selectedResult === null) {
      const btn = document.getElementById('shareBtn');
      const originalText = btn.textContent;
      btn.textContent = 'Select a result first!';
      btn.classList.add('error-shake');
      setTimeout(() => { 
        btn.textContent = originalText; 
        btn.classList.remove('error-shake');
      }, 2000);
      return;
    }

    let previewText = '';
    const r = document.querySelectorAll('.result-card')[this.selectedResult];
    const time = r.querySelector('.result-time').textContent;
    const windowText = r.querySelector('.result-window')?.textContent || '';
    
    if (this.mode === 'wake') {
      shareCardTitle.textContent = "Tonight's Sleep Plan";
      previewText = `Go to bed: ${windowText.replace('Go to bed between:', '').trim() || time} • Wake up: ${this.formatTime(this.to24Hour(this.hour, this.minute, this.period))}`;
    } else {
      shareCardTitle.textContent = "Wake up Plan";
      previewText = `Bedtime: Now • Wake up: ${windowText.replace('Wake between:', '').trim() || time}`;
    }

    if (shareCard && shareCardBody) {
      shareCardBody.textContent = previewText;
      shareCard.style.display = 'block';
    }

    // --- Calendar Integration ---
    const calendarBtn = document.getElementById('calendarBtn');
    if (calendarBtn) {
      calendarBtn.onclick = () => {
        const title = shareCardTitle.textContent;
        const description = `NightOwl Sleep Plan: ${previewText}\n\nPlan your sleep at: https://nightowlsleepcalc.com`;
        
        // Create iCalendar data for native device support (iOS, Android, etc.)
        const startTime = new Date(); // Using current date for simplicity
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
        
        const formatDate = (date) => {
          return date.toISOString().replace(/-|:|\.\d+/g, '');
        };

        const icsData = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PROID:-//NightOwl//Sleep Calculator//EN',
          'BEGIN:VEVENT',
          `DTSTART:${formatDate(startTime)}`,
          `DTEND:${formatDate(endTime)}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
          'URL:https://nightowlsleepcalc.com',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\n');

        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'sleep-plan.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      };
    }

    navigator.clipboard.writeText(shareUrl).then(() => {
      const btn = document.getElementById('shareBtn');
      const originalText = btn.textContent;
      btn.textContent = 'Link copied!';
      
      // Attempt to share using Web Share API if supported for better rich preview
      if (navigator.share) {
        navigator.share({
          title: 'NightOwl Sleep Plan',
          text: previewText,
          url: shareUrl
        }).catch(() => {
          // Fallback to clipboard which we already did
        });
      }
      
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
        this.hour = data.hour || 1;
        this.minute = data.minute || 0;
        this.period = data.period || 'AM';
        this.tomorrowMode = data.tomorrowMode || 'sharp';

        // Update Tomorrow Mode UI
        document.querySelectorAll('.tm-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tm === this.tomorrowMode);
        });
        
        // Force Meme Mode OFF on every refresh as requested
        this.memeMode = false;
        
        // Update UI
        const latencyVal = document.getElementById('latencyValue');
        const cycleVal = document.getElementById('cycleLengthValue');
        const windowVal = document.getElementById('wakeWindowValue');
        const latencyInp = document.getElementById('latency');
        const cycleInp = document.getElementById('cycleLength');
        const windowInp = document.getElementById('wakeWindow');

        if (latencyVal) latencyVal.textContent = this.settings.latency;
        if (cycleVal) cycleVal.textContent = this.settings.cycleLength;
        if (windowVal) windowVal.textContent = this.settings.wakeWindow;
        if (latencyInp) latencyInp.value = this.settings.latency;
        if (cycleInp) cycleInp.value = this.settings.cycleLength;
        if (windowInp) windowInp.value = this.settings.wakeWindow;
        
        document.querySelectorAll('.toggle-option[data-format]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.format === this.timeFormat);
        });
        const formatToggle = document.getElementById('timeFormatToggle');
        if (formatToggle) {
          formatToggle.classList.toggle('active', this.timeFormat === '24');
        }

        // Forcing a hard reset of classes on load to ensure "Off" is the only one active
        const toggleContainer = document.getElementById('memeModeToggle');
        if (toggleContainer) {
          toggleContainer.classList.remove('active');
          const memeLabel = toggleContainer.querySelector('.meme-toggle-label');
          if (memeLabel) memeLabel.textContent = 'Normal';
        }
        
        this.updateMemeUI();
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
    this.updateTimePicker();
  }
};

// ========== STAR FIELD (Shared) ==========
function createStars() {
  const container = document.getElementById('starsContainer');
  if (!container) return;
  const starCount = 100;
  for (let i = 0; i < starCount; i++) {
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

// ========== SLEEP TICKET FEATURE ==========
const sleepTicket = {
  currentQuote: '',
  currentPersonality: null,
  challengeIndex: -1,
  challengeStickers: [
    "Post yours 👇",
    "Your turn 😈",
    "Tag your sleep twin",
    "What's your type?",
    "Rate my sleep 1-10",
    "I dare you",
    "Roast my schedule",
    "Reply with yours"
  ],

  memePersonalities: {
    'night-owl': {
      name: 'Doomscroller',
      icon: '/attached_assets/generated_images/cute_doomscroller_icon.png'
    },
    'early-bird': {
      name: 'Morning Psycho',
      icon: '/attached_assets/generated_images/morning_psycho_personality_icon.png'
    },
    'power-napper': {
      name: 'Desk Sleeper',
      icon: '/attached_assets/generated_images/desk_sleeper_warm_icon.png'
    },
    'cycle-optimizer': {
      name: 'Sleep Nerd',
      icon: '/attached_assets/generated_images/sleep_nerd_v2_icon.png'
    },
    'sleep-minimalist': {
      name: 'Chaos Goblin',
      icon: '/attached_assets/generated_images/cute_chaos_goblin_icon.png'
    },
    'deep-sleeper': {
      name: 'Snore Lord',
      icon: '/attached_assets/generated_images/snore_lord_with_circle.png'
    },
    'quick-drifter': {
      name: 'Instant KO',
      icon: '/attached_assets/generated_images/instant_ko_sleep_icon.png'
    }
  },

  personalities: {
    'night-owl': {
      name: 'Night Owl',
      icon: '/attached_assets/generated_images/night_owl_personality_icon.png',
      quotes: [
        "The night is dark and full of dreams",
        "Owls see what others sleep through",
        "Creativity peaks when the world sleeps",
        "The best ideas come after midnight",
        "Night owls rule the quiet hours",
        "Stars shine brightest for those awake to see",
        "The moon understands what the sun cannot",
        "Late nights, deep thoughts",
        "Silence is the night owl's symphony",
        "While the world sleeps, we create"
      ],
      memeQuotes: [
        "3 AM me has made some questionable life choices",
        "Sleep schedule? I prefer chaos",
        "My bed is lava until the sun comes up",
        "Netflix asks if I'm still watching. Bold of them to assume I ever stopped",
        "I'm not nocturnal, I'm just avoiding tomorrow",
        "Morning people scare me and I don't trust them",
        "The bags under my eyes are designer",
        "My brain has no thoughts until 11 PM, then it writes a novel",
        "I'm a night owl because my anxiety picks the schedule",
        "4 AM me and 4 PM me are completely different people",
        "I don't have a sleep schedule, I have sleep suggestions",
        "Told myself I'd sleep early. It's 3 AM. We both knew I was lying",
        "Productivity peaks when everyone stops texting me",
        "Sunlight? In this economy?",
        "I'm not tired, I'm just loading slowly"
      ]
    },
    'early-bird': {
      name: 'Early Bird',
      icon: '/attached_assets/generated_images/early_bird_personality_icon.png',
      quotes: [
        "The early bird gets the worm",
        "Rise with the sun, shine with purpose",
        "Morning magic starts the night before",
        "Dawn is the promise of a new beginning",
        "Early mornings, peaceful victories",
        "The sunrise belongs to those who wake for it",
        "First light, first win",
        "Morning people move mountains",
        "Seize the day before it begins",
        "The world is quiet at dawn — and it's all yours"
      ],
      memeQuotes: [
        "I've already judged you three times before your alarm went off",
        "Woke up at 5 AM. Personality trait unlocked",
        "My body just... does this. I didn't ask for it",
        "Night owls: 'one more episode.' Me: 'one more sunrise'",
        "I'm not a morning person, I'm a morning demon",
        "Finished my to-do list before you finished your dream",
        "The gym at 5 AM is just me and the demons",
        "I see the sunrise every day. Not on purpose at first",
        "Waking up early is free, yet so expensive",
        "I peaked at 6 AM. It's been downhill since",
        "Early bird gets the worm but also crippling loneliness at breakfast",
        "I wake up before the coffee shop. This is my villain origin story",
        "My alarm is decorative at this point",
        "5 AM thoughts hit different when you've been up since 4",
        "Being a morning person is just socially acceptable insomnia"
      ]
    },
    'power-napper': {
      name: 'Power Napper',
      icon: '/attached_assets/generated_images/power_napper_personality_icon.png',
      quotes: [
        "A quick nap fixes everything",
        "Power naps are productivity hacks",
        "20 minutes to recharge the world",
        "Nap now, conquer later",
        "Short sleep, big energy",
        "The art of the strategic snooze",
        "Rest is not laziness, it's fuel",
        "Napping is a superpower in disguise"
      ],
      memeQuotes: [
        "20 minute nap turned into a 4 hour coma. Classic",
        "Just resting my eyes... *wakes up in a different decade*",
        "Naps are just free trial versions of death",
        "I'm not lazy, I'm horizontally productive",
        "Took a power nap. Woke up with no power",
        "My naps have plot twists",
        "If napping was in the Olympics, I'd make my country proud",
        "Sorry I missed your call, my pillow needed me",
        "I nap so hard I wake up in a different mood",
        "Quick nap before my nap",
        "Napping is self care and I'm very caring",
        "I don't snooze, I strategically delay consciousness",
        "My naps have their own weather system"
      ]
    },
    'cycle-optimizer': {
      name: 'Cycle Optimizer',
      icon: '/attached_assets/generated_images/cycle_optimizer_personality_icon.png',
      quotes: [
        "Sleep smarter, not longer",
        "Cycles are the secret to waking refreshed",
        "Precision rest for peak performance",
        "Every cycle counts",
        "Optimize your nights, own your mornings",
        "Sleep is science, not luck",
        "The right timing changes everything",
        "Master your cycles, master your energy"
      ],
      memeQuotes: [
        "I calculated exactly when to sleep. My therapist is concerned",
        "REM cycles are my love language. Nobody swipes right",
        "Sleep math is real math and I'm the professor",
        "Optimized my bedtime. Still emotionally unavailable",
        "Science said 5 cycles. I said bet",
        "My spreadsheet for sleep has tabs. Multiple tabs",
        "I don't just sleep, I perform scheduled unconsciousness",
        "Woke up refreshed because I respect the algorithm",
        "My sleep is peer-reviewed",
        "I treat bedtime like a board meeting",
        "Accidentally explained sleep cycles on a first date. There was no second date",
        "I have a PhD in lying down strategically",
        "My circadian rhythm has a LinkedIn"
      ]
    },
    'sleep-minimalist': {
      name: 'Sleep Minimalist',
      icon: '/attached_assets/generated_images/sleep_minimalist_personality_icon.png',
      quotes: [
        "Less sleep, more life — if done right",
        "Quality over quantity",
        "Minimalist nights, maximalist days",
        "Sleep lean, dream big",
        "Efficiency in rest",
        "Make every hour count",
        "The art of doing more with less sleep",
        "Streamlined rest for busy minds"
      ],
      memeQuotes: [
        "4 hours of sleep? That's basically hibernation",
        "Sleep is for the weak. Unfortunately, I am weak",
        "I'll sleep when I'm dead, which at this rate is Tuesday",
        "Espresso isn't a drink, it's a coping mechanism",
        "Running on vibes, spite, and 3 hours of sleep",
        "8 hours is for people with nothing to worry about",
        "My eye bags are carrying my entire personality",
        "Sleep? In THIS economy? In THIS mental state?",
        "I function on coffee and poor decisions",
        "Less sleep more... actually no, just less sleep",
        "My body runs on airplane mode",
        "I'm not sleep deprived, I'm just built wrong",
        "4 hours felt like 8 if you don't think about it"
      ]
    },
    'deep-sleeper': {
      name: 'Deep Sleeper',
      icon: '/attached_assets/generated_images/deep_sleeper_personality_icon.png',
      quotes: [
        "Deep sleep heals everything",
        "Sink into the night and emerge renewed",
        "The deeper the sleep, the brighter the morning",
        "Rest like you mean it",
        "Dreams live in the deep",
        "Sleep is the best meditation — Dalai Lama",
        "Heavy sleepers wake lightest",
        "Dive deep into the night"
      ],
      memeQuotes: [
        "I sleep through earthquakes, alarms, and my responsibilities",
        "12 alarms. Snoozed all of them. Felt nothing",
        "My sleep is so deep, I astral project",
        "Waking me up is violence and I will press charges",
        "I don't sleep, I enter the void",
        "Missed your call, text, and the entire morning",
        "My bed and I are in a toxic but committed relationship",
        "I teleport to morning. Side effects include confusion",
        "I sleep like I'm getting paid for it",
        "Once slept through a fire alarm. Still here somehow",
        "My snooze button filed a restraining order",
        "I hibernate professionally",
        "Sleep so deep I need GPS to find consciousness"
      ]
    },
    'quick-drifter': {
      name: 'Quick Drifter',
      icon: '/attached_assets/generated_images/quick_drifter_personality_icon.png',
      quotes: [
        "Asleep before the pillow settles",
        "Drifting off is an art form",
        "Fast asleep, well rested",
        "The gift of easy sleep",
        "No tossing, no turning, just dreams",
        "Sleep comes easy to the peaceful mind",
        "Quick to sleep, quick to rise",
        "Effortless rest, endless energy"
      ],
      memeQuotes: [
        "I fall asleep so fast it's basically a medical condition",
        "Pillow + head = immediate shutdown",
        "I'm not narcoleptic, I'm just extremely efficient",
        "Insomnia could never. She doesn't know me",
        "I can fall asleep anywhere. It's a problem actually",
        "I fell asleep writing th...",
        "Can't overthink if you're unconscious in 3 seconds",
        "Speed sleeping since the womb",
        "My brain has a 5 second power-off timer",
        "People hate me for this one simple trick",
        "I don't count sheep, sheep count on me",
        "Asleep before my head hits the pillow. Literally",
        "My sleep latency is negative at this point"
      ]
    }
  },

  detectPersonality(result) {
    const bedHour = Math.floor((result?.bedTime || 0) / 60);
    const wakeHour = Math.floor((result?.wakeTime || 0) / 60);
    const latency = app.settings.latency;
    const cycles = result?.cycles || 5;

    // Priority-based personality detection
    // 1. Latency-based (user setting) - highest priority
    if (latency <= 5) return 'quick-drifter';
    if (latency >= 25) return 'deep-sleeper';
    
    // 2. Cycle-based (user selection)
    if (cycles <= 4) return 'sleep-minimalist';
    if (cycles >= 6) return 'cycle-optimizer';
    
    // 3. Time-based (calculated from results)
    if (wakeHour >= 4 && wakeHour < 6) return 'early-bird';
    if (bedHour >= 0 && bedHour < 4) return 'night-owl';
    
    // Default
    if (bedHour >= 22 || bedHour < 1) return 'cycle-optimizer';
    return 'night-owl';
  },

  travelQuotes: [
    "I haven't been everywhere, but it's on my list.",
    "Jet lag is just your soul catching up to your body.",
    "I followed my heart and it led me to the airport.",
    "Time zones are just a suggestion.",
    "Adventure awaits (after a nap).",
    "Collect moments, not things. And maybe some sleep.",
    "Travel is the only thing you buy that makes you richer.",
    "Waking up in a new city is the best feeling in the world.",
    "My favorite thing to do is go where I've never been.",
    "Work, Travel, Save, Repeat (and Sleep)."
  ],

  getRandomQuote(personalityKey) {
    if (this.isJetLag) {
      return `"${this.travelQuotes[Math.floor(Math.random() * this.travelQuotes.length)]}"`;
    }
    const personality = this.personalities[personalityKey];
    const quotes = app.memeMode ? personality.memeQuotes : personality.quotes;
    return `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
  },

  updateTicketPreview() {
    this.isJetLag = false;
    // Get result - either from selected card or calculate default
    let result;
    
    if (app.selectedResult !== null) {
      // Get result from the selected card's data
      result = this.getResultFromIndex(app.selectedResult);
    } else {
      result = this.getDefaultResult();
    }
    
    const personalityKey = this.detectPersonality(result);
    this.currentPersonality = personalityKey;
    const personality = this.personalities[personalityKey];
    const memePersonality = this.memePersonalities[personalityKey];
    
    // Update title based on meme mode
    const modalTitle = document.querySelector('.ticket-modal-title');
    if (modalTitle) {
      modalTitle.textContent = app.memeMode ? 'Your Sleep Ticket (Meme Mode)' : 'Your Sleep Ticket';
    }
    
    // Set background
    document.getElementById('ticketBg').className = `ticket-bg ${personalityKey}`;
    
    // Set icon and name - use meme version if meme mode is on
    if (app.memeMode && memePersonality) {
      document.getElementById('ticketIcon').src = memePersonality.icon;
      document.getElementById('ticketPersonalityName').textContent = memePersonality.name;
    } else {
      document.getElementById('ticketIcon').src = personality.icon;
      document.getElementById('ticketPersonalityName').textContent = personality.name;
    }
    
    // Set quote
    this.currentQuote = this.getRandomQuote(personalityKey);
    document.getElementById('ticketQuote').textContent = this.currentQuote;
    
    // Set times
    let bedtimeStr, wakeTimeStr, cyclesStr;
    
    if (app.mode === 'wake') {
      bedtimeStr = result.wakeWindowStr || result.bedTimeStr;
      wakeTimeStr = app.formatTime(app.to24Hour(app.hour, app.minute, app.period));
    } else {
      bedtimeStr = app.formatTime(app.to24Hour(app.hour, app.minute, app.period));
      wakeTimeStr = result.wakeWindowStr || result.wakeTimeStr;
    }
    cyclesStr = `${result.cycles} cycles · ${result.duration}`;
    
    document.getElementById('ticketBedtime').textContent = bedtimeStr;
    document.getElementById('ticketWakeTime').textContent = wakeTimeStr;
    document.getElementById('ticketCycles').textContent = cyclesStr;
  },

  getResultFromIndex(index) {
    // Calculate the result for the given index (0=4 cycles, 1=5 cycles, 2=6 cycles)
    const startTime = app.to24Hour(app.hour, app.minute, app.period);
    const idx = parseInt(index) || 0;
    const cycles = 4 + Math.min(idx, 2); // index 0=4, 1=5, 2=6 (capped at 2)
    const sleepDuration = app.settings.latency + cycles * app.settings.cycleLength;
    
    if (app.mode === 'wake') {
      let bedTime = startTime - sleepDuration;
      if (bedTime < 0) bedTime += 24 * 60;
      const bedWindowEnd = (bedTime + app.settings.wakeWindow) % (24 * 60);
      
      return {
        cycles: cycles,
        bedTime: bedTime,
        bedTimeStr: app.formatTime(bedTime),
        wakeTime: startTime,
        wakeWindowStr: `${app.formatTime(bedTime)} – ${app.formatTime(bedWindowEnd)}`,
        duration: `${(sleepDuration / 60).toFixed(1)} hrs`
      };
    } else {
      const wakeTime = (startTime + sleepDuration) % (24 * 60);
      const wakeWindowEnd = (wakeTime + app.settings.wakeWindow) % (24 * 60);
      
      return {
        cycles: cycles,
        bedTime: startTime,
        bedTimeStr: app.formatTime(startTime),
        wakeTime: wakeTime,
        wakeTimeStr: app.formatTime(wakeTime),
        wakeWindowStr: `${app.formatTime(wakeTime)} – ${app.formatTime(wakeWindowEnd)}`,
        duration: `${(sleepDuration / 60).toFixed(1)} hrs`
      };
    }
  },

  getDefaultResult() {
    // Calculate the 5-cycle result (middle option)
    const startTime = app.to24Hour(app.hour, app.minute, app.period);
    const cycles = 5;
    const sleepDuration = app.settings.latency + cycles * app.settings.cycleLength;
    
    if (app.mode === 'wake') {
      let bedTime = startTime - sleepDuration;
      if (bedTime < 0) bedTime += 24 * 60;
      const bedWindowEnd = (bedTime + app.settings.wakeWindow) % (24 * 60);
      
      return {
        cycles: cycles,
        bedTime: bedTime,
        bedTimeStr: app.formatTime(bedTime),
        wakeTime: startTime,
        wakeWindowStr: `${app.formatTime(bedTime)} – ${app.formatTime(bedWindowEnd)}`,
        duration: `${(sleepDuration / 60).toFixed(1)} hrs`
      };
    } else {
      const wakeTime = (startTime + sleepDuration) % (24 * 60);
      const wakeWindowEnd = (wakeTime + app.settings.wakeWindow) % (24 * 60);
      
      return {
        cycles: cycles,
        bedTime: startTime,
        bedTimeStr: app.formatTime(startTime),
        wakeTime: wakeTime,
        wakeTimeStr: app.formatTime(wakeTime),
        wakeWindowStr: `${app.formatTime(wakeTime)} – ${app.formatTime(wakeWindowEnd)}`,
        duration: `${(sleepDuration / 60).toFixed(1)} hrs`
      };
    }
  },

  regenerateQuote() {
    if (this.currentPersonality || this.isJetLag) {
      this.currentQuote = this.getRandomQuote(this.currentPersonality);
      document.getElementById('ticketQuote').textContent = this.currentQuote;
    }
  },

  cycleChallenge() {
    const challengeEl = document.getElementById('ticketChallenge');
    if (!challengeEl) return;
    
    this.challengeIndex++;
    if (this.challengeIndex >= this.challengeStickers.length) {
      this.challengeIndex = 0;
    }
    
    challengeEl.textContent = this.challengeStickers[this.challengeIndex];
    challengeEl.style.display = 'block';
  },

  resetChallenge() {
    this.challengeIndex = -1;
    const challengeEl = document.getElementById('ticketChallenge');
    if (challengeEl) {
      challengeEl.style.display = 'none';
      challengeEl.textContent = '';
    }
  },

  async downloadTicket() {
    const ticketEl = document.getElementById('ticketPreview');
    const downloadBtn = document.getElementById('downloadTicketBtn');
    const defaultHTML = '<span class="btn-icon">📱</span><span class="btn-text">Download</span>';
    
    downloadBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Generating...</span>';
    downloadBtn.disabled = true;
    
    try {
      // Use html2canvas via CDN
      const canvas = await html2canvas(ticketEl, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });
      
      const link = document.createElement('a');
      link.download = `sleep-ticket-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      downloadBtn.innerHTML = '<span class="btn-icon">✅</span><span class="btn-text">Downloaded!</span>';
      setTimeout(() => {
        downloadBtn.innerHTML = defaultHTML;
        downloadBtn.disabled = false;
      }, 2000);
    } catch (err) {
      console.error('Error generating ticket:', err);
      downloadBtn.innerHTML = '<span class="btn-icon">⚠️</span><span class="btn-text">Try Again</span>';
      setTimeout(() => {
        downloadBtn.innerHTML = defaultHTML;
        downloadBtn.disabled = false;
      }, 2000);
    }
  },

  openModal() {
    this.resetChallenge();
    this.updateTicketPreview();
    
    // Reset subtitle for sleep calculator mode
    const subtitle = document.getElementById('ticketSubtitle');
    if (subtitle) subtitle.textContent = "Share your sleep personality on Instagram Stories";

    document.getElementById('ticketModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('ticketModal').style.display = 'none';
    document.body.style.overflow = '';
  },

  init() {
    const ticketToggle = document.getElementById('ticketToggle');
    const ticketModalClose = document.getElementById('ticketModalClose');
    const ticketModal = document.getElementById('ticketModal');
    const regenerateBtn = document.getElementById('regenerateQuoteBtn');
    const downloadBtn = document.getElementById('downloadTicketBtn');

    if (ticketToggle) {
      ticketToggle.addEventListener('click', () => this.openModal());
    }

    if (ticketModalClose) {
      ticketModalClose.addEventListener('click', () => this.closeModal());
    }

    if (ticketModal) {
      ticketModal.addEventListener('click', (e) => {
        if (e.target === ticketModal) this.closeModal();
      });
    }

    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => this.regenerateQuote());
    }

    const challengeBtn = document.getElementById('challengeBtn');
    if (challengeBtn) {
      challengeBtn.addEventListener('click', () => this.cycleChallenge());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadTicket());
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ticketModal?.style.display === 'flex') {
        this.closeModal();
      }
    });
  }
};

/* ========== JET LAG PLANNER ========== */
const jetLagPlanner = {
  initialized: false,
  segments: [],
  airports: {
    // North America
    "ATL": { city: "Atlanta", tz: "America/New_York" },
    "JFK": { city: "New York (JFK)", tz: "America/New_York" },
    "EWR": { city: "Newark", tz: "America/New_York" },
    "LGA": { city: "New York (LGA)", tz: "America/New_York" },
    "LAX": { city: "Los Angeles", tz: "America/Los_Angeles" },
    "SFO": { city: "San Francisco", tz: "America/Los_Angeles" },
    "ORD": { city: "Chicago (O'Hare)", tz: "America/Chicago" },
    "DFW": { city: "Dallas/Fort Worth", tz: "America/Chicago" },
    "DEN": { city: "Denver", tz: "America/Denver" },
    "SEA": { city: "Seattle", tz: "America/Los_Angeles" },
    "LAS": { city: "Las Vegas", tz: "America/Los_Angeles" },
    "MCO": { city: "Orlando", tz: "America/New_York" },
    "MIA": { city: "Miami", tz: "America/New_York" },
    "CLT": { city: "Charlotte", tz: "America/New_York" },
    "PHX": { city: "Phoenix", tz: "America/Phoenix" },
    "IAH": { city: "Houston", tz: "America/Chicago" },
    "BOS": { city: "Boston", tz: "America/New_York" },
    "MSP": { city: "Minneapolis", tz: "America/Chicago" },
    "DTW": { city: "Detroit", tz: "America/New_York" },
    "PHL": { city: "Philadelphia", tz: "America/New_York" },
    "SLC": { city: "Salt Lake City", tz: "America/Denver" },
    "SAN": { city: "San Diego", tz: "America/Los_Angeles" },
    "IAD": { city: "Washington (Dulles)", tz: "America/New_York" },
    "DCA": { city: "Washington (Reagan)", tz: "America/New_York" },
    "YYZ": { city: "Toronto", tz: "America/Toronto" },
    "YVR": { city: "Vancouver", tz: "America/Vancouver" },
    "YUL": { city: "Montreal", tz: "America/Toronto" },
    "YYC": { city: "Calgary", tz: "America/Edmonton" },
    "MEX": { city: "Mexico City", tz: "America/Mexico_City" },
    "CUN": { city: "Cancun", tz: "America/Cancun" },

    // Europe
    "LHR": { city: "London (Heathrow)", tz: "Europe/London" },
    "LGW": { city: "London (Gatwick)", tz: "Europe/London" },
    "CDG": { city: "Paris (CDG)", tz: "Europe/Paris" },
    "ORY": { city: "Paris (Orly)", tz: "Europe/Paris" },
    "AMS": { city: "Amsterdam", tz: "Europe/Amsterdam" },
    "FRA": { city: "Frankfurt", tz: "Europe/Berlin" },
    "MUC": { city: "Munich", tz: "Europe/Berlin" },
    "IST": { city: "Istanbul", tz: "Europe/Istanbul" },
    "MAD": { city: "Madrid", tz: "Europe/Madrid" },
    "BCN": { city: "Barcelona", tz: "Europe/Madrid" },
    "FCO": { city: "Rome", tz: "Europe/Rome" },
    "ZRH": { city: "Zurich", tz: "Europe/Zurich" },
    "VIE": { city: "Vienna", tz: "Europe/Vienna" },
    "CPH": { city: "Copenhagen", tz: "Europe/Copenhagen" },
    "OSL": { city: "Oslo", tz: "Europe/Oslo" },
    "ARN": { city: "Stockholm", tz: "Europe/Stockholm" },
    "HEL": { city: "Helsinki", tz: "Europe/Helsinki" },
    "DUB": { city: "Dublin", tz: "Europe/Dublin" },
    "BRU": { city: "Brussels", tz: "Europe/Brussels" },
    "LIS": { city: "Lisbon", tz: "Europe/Lisbon" },
    "ATH": { city: "Athens", tz: "Europe/Athens" },

    // Asia & Pacific
    "HND": { city: "Tokyo (Haneda)", tz: "Asia/Tokyo" },
    "NRT": { city: "Tokyo (Narita)", tz: "Asia/Tokyo" },
    "KIX": { city: "Osaka", tz: "Asia/Tokyo" },
    "ICN": { city: "Seoul", tz: "Asia/Seoul" },
    "PEK": { city: "Beijing", tz: "Asia/Shanghai" },
    "PVG": { city: "Shanghai", tz: "Asia/Shanghai" },
    "HKG": { city: "Hong Kong", tz: "Asia/Hong_Kong" },
    "TPE": { city: "Taipei", tz: "Asia/Taipei" },
    "SIN": { city: "Singapore", tz: "Asia/Singapore" },
    "BKK": { city: "Bangkok", tz: "Asia/Bangkok" },
    "KUL": { city: "Kuala Lumpur", tz: "Asia/Kuala_Lumpur" },
    "CGK": { city: "Jakarta", tz: "Asia/Jakarta" },
    "MNL": { city: "Manila", tz: "Asia/Manila" },
    "SGN": { city: "Ho Chi Minh City", tz: "Asia/Ho_Chi_Minh" },
    "DEL": { city: "New Delhi", tz: "Asia/Kolkata" },
    "BOM": { city: "Mumbai", tz: "Asia/Kolkata" },
    "SYD": { city: "Sydney", tz: "Australia/Sydney" },
    "MEL": { city: "Melbourne", tz: "Australia/Melbourne" },
    "BNE": { city: "Brisbane", tz: "Australia/Brisbane" },
    "AKL": { city: "Auckland", tz: "Pacific/Auckland" },

    // Middle East
    "DXB": { city: "Dubai", tz: "Asia/Dubai" },
    "AUH": { city: "Abu Dhabi", tz: "Asia/Dubai" },
    "DOH": { city: "Doha", tz: "Asia/Qatar" },
    "RUH": { city: "Riyadh", tz: "Asia/Riyadh" },
    "TLV": { city: "Tel Aviv", tz: "Asia/Jerusalem" },

    // South America
    "GRU": { city: "São Paulo", tz: "America/Sao_Paulo" },
    "GIG": { city: "Rio de Janeiro", tz: "America/Sao_Paulo" },
    "BOG": { city: "Bogota", tz: "America/Bogota" },
    "LIM": { city: "Lima", tz: "America/Lima" },
    "SCL": { city: "Santiago", tz: "America/Santiago" },
    "EZE": { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },

    // Africa
    "JNB": { city: "Johannesburg", tz: "Africa/Johannesburg" },
    "CPT": { city: "Cape Town", tz: "Africa/Johannesburg" },
    "CAI": { city: "Cairo", tz: "Africa/Cairo" },
    "LOS": { city: "Lagos", tz: "Africa/Lagos" },
    "ADD": { city: "Addis Ababa", tz: "Africa/Addis_Ababa" }
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.setupModeSwitch();
    this.setupEventListeners();
    this.addSegment();
    this.setupAirportAutocomplete();
  },

  setupAirportAutocomplete() {
    // Create datalist
    let datalist = document.getElementById('airport-codes');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'airport-codes';
      document.body.appendChild(datalist);
    }
    
    // Populate datalist
    datalist.innerHTML = Object.entries(this.airports).map(([code, data]) => 
      `<option value="${code}">${data.city}</option>`
    ).join('');
  },

  setupModeSwitch() {
    const modeBtns = document.querySelectorAll('.app-mode-btn');
    const sleepMode = document.getElementById('sleepCalcMode');
    const napMode = document.getElementById('napMode');
    const jetLagMode = document.getElementById('jetLagMode');
    const caffeineMode = document.getElementById('caffeineMode');

    if (!modeBtns.length) return;

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.appMode;
        
        // Update tabs
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle Content
        if (sleepMode) sleepMode.style.display = 'none';
        if (napMode) napMode.style.display = 'none';
        if (jetLagMode) jetLagMode.style.display = 'none';
        if (caffeineMode) caffeineMode.style.display = 'none';

        if (mode === 'calculator') {
          if(sleepMode) sleepMode.style.display = 'block';
        } else if (mode === 'nap') {
          if(napMode) napMode.style.display = 'block';
        } else if (mode === 'jetlag') {
          if(jetLagMode) jetLagMode.style.display = 'block';
        } else if (mode === 'caffeine') {
          if(caffeineMode) caffeineMode.style.display = 'block';
        }
      });
    });
  },

  setupEventListeners() {
    const addSegBtn = document.getElementById('addSegmentBtn');
    if (addSegBtn) addSegBtn.addEventListener('click', () => this.addSegment());
    
    const genBtn = document.getElementById('generateJetLagBtn');
    if (genBtn) genBtn.addEventListener('click', () => this.generatePlan());
    
    const ticketBtn = document.getElementById('jetLagTicketBtn');
    if (ticketBtn) ticketBtn.addEventListener('click', () => this.openTicketModal());
    
    const shareBtn = document.getElementById('jetLagShareBtn');
    if (shareBtn) shareBtn.addEventListener('click', () => this.sharePlan());
  },

  addSegment() {
    const list = document.getElementById('segmentList');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'segment-card';
    div.innerHTML = `
      <div class="segment-header">
        <span class="segment-number">Flight ${this.segments.length + 1}</span>
        <button class="remove-segment" onclick="this.closest('.segment-card').remove()">×</button>
      </div>
      <div class="segment-inputs">
        <div class="input-group">
          <label>From (Airport Code)</label>
          <div class="airport-input-wrapper">
            <input type="text" class="input-field airport-input" placeholder="e.g. JFK" maxlength="3" list="airport-codes" oninput="this.value = this.value.toUpperCase()">
          </div>
        </div>
        <div class="input-group">
          <label>To (Airport Code)</label>
          <div class="airport-input-wrapper">
            <input type="text" class="input-field airport-input" placeholder="e.g. LHR" maxlength="3" list="airport-codes" oninput="this.value = this.value.toUpperCase()">
          </div>
        </div>
        <div class="input-group">
          <label>Departure (Local Time)</label>
          <input type="datetime-local" class="input-field depart-time">
        </div>
        <div class="input-group">
          <label>Arrival (Local Time)</label>
          <input type="datetime-local" class="input-field arrive-time">
        </div>
      </div>
    `;
    list.appendChild(div);
  },

  generatePlan() {
    // Collect Data
    const cards = document.querySelectorAll('.segment-card');
    this.segments = [];
    
    if (typeof luxon === 'undefined') {
        alert('Timezone library loading...'); 
        return;
    }
    const DateTime = luxon.DateTime;

    let valid = true;

    cards.forEach(card => {
      const from = card.querySelector('.input-group:nth-child(1) input').value;
      const to = card.querySelector('.input-group:nth-child(2) input').value;
      const departStr = card.querySelector('.depart-time').value;
      const arriveStr = card.querySelector('.arrive-time').value;

      if (!from || !to || !departStr || !arriveStr) {
        valid = false;
        return;
      }

      if (!this.airports[from] || !this.airports[to]) {
        alert(`Unknown airport code: ${!this.airports[from] ? from : to}. Try major hubs like JFK, LHR, LAX.`);
        valid = false;
        return;
      }

      // Create DateTime objects with Timezones
      const departTime = DateTime.fromISO(departStr, { zone: this.airports[from].tz });
      const arriveTime = DateTime.fromISO(arriveStr, { zone: this.airports[to].tz });

      this.segments.push({
        from, to, departTime, arriveTime
      });
    });

    if (!valid) {
        if (this.segments.length === 0) alert("Please fill in all flight details.");
        return;
    }

    this.calculateSchedule();
  },

  calculateSchedule() {
    const timeline = document.getElementById('jetLagTimeline');
    timeline.innerHTML = '';
    const results = document.getElementById('jetLagResults');
    results.style.display = 'block';

    const finalSegment = this.segments[this.segments.length - 1];
    const destZone = finalSegment.arriveTime.zoneName;
    
    const canSleepOnPlane = document.querySelector('input[name="planeSleep"]:checked').value === 'yes';
    const strategy = document.querySelector('input[name="strategy"]:checked').value;

    this.segments.forEach((seg, index) => {
      // Capture Origin Time string before converting
      const originTimeStr = seg.departTime.toFormat('h:mm a');
      
      // 1. Departure Event
      this.addTimelineItem(seg.departTime.setZone(destZone), 
          `Depart ${seg.from}`, 
          `Flight to ${seg.to} (Local time: ${originTimeStr})`, 
          destZone);

      // 2. In-flight sleep
      const flightDuration = seg.arriveTime.diff(seg.departTime, 'minutes').minutes;
      
      if (canSleepOnPlane && flightDuration > 180) {
         // Suggest sleep starting 1 hour after takeoff
         const sleepStart = seg.departTime.plus({ minutes: 60 });
         const sleepStartOriginStr = sleepStart.toFormat('h:mm a');

         // Wake up 90 mins before landing
         const sleepEnd = seg.arriveTime.minus({ minutes: 90 });
         
         if (sleepEnd > sleepStart) {
            const duration = sleepEnd.diff(sleepStart, 'minutes').minutes;
            const cycles = Math.floor(duration / 90);
            
            if (cycles > 0) {
               this.addTimelineItem(sleepStart.setZone(destZone), 
                 `Sleep on Plane (${cycles} cycles)`, 
                 `~${Math.round(cycles * 1.5)} hours. Start at ${sleepStartOriginStr} (Origin time). Wear mask & earplugs.`, 
                 destZone
               );
            }
         }
      }

      // 3. Arrival
      this.addTimelineItem(seg.arriveTime.setZone(destZone), `Arrive ${seg.to}`, `Land at local time ${seg.arriveTime.toFormat('h:mm a')}`, destZone);
    });

    // 4. First Night Sleep Calculation
    const arrival = finalSegment.arriveTime;
    let bedTime;

    if (arrival.hour >= 0 && arrival.hour < 5) {
       // Late night arrival (12am-5am): Sleep ASAP
       bedTime = arrival.plus({ hours: 1.5 });
    } else if (arrival.hour >= 5 && arrival.hour < 12) {
       // Morning arrival (5am-12pm): Try to stay awake until early evening
       bedTime = arrival.set({ hour: 20, minute: 30 }); // 8:30 PM
       
       // If "Nap Strategy" selected and exhausted (no plane sleep), suggest nap
       if (strategy === 'naps' && !canSleepOnPlane) {
           this.addTimelineItem(arrival.plus({ hours: 1 }).setZone(destZone), 
               `Power Nap`, `20 minutes only to recharge without ruining tonight's sleep.`, destZone);
           // Push bedtime slightly later since they napped
           bedTime = bedTime.plus({ minutes: 30 });
       }
    } else if (arrival.hour >= 12 && arrival.hour < 17) {
       // Afternoon arrival (12pm-5pm): Standard bedtime
       bedTime = arrival.set({ hour: 22, minute: 0 }); // 10:00 PM
       
       // If exhausted, pull bedtime earlier
       if (!canSleepOnPlane) {
           bedTime = bedTime.minus({ hours: 1 }); // 9:00 PM
       }
    } else {
       // Evening arrival (5pm-11:59pm): Wind down for ~3 hours
       bedTime = arrival.plus({ hours: 3 });
       
       // If exhausted, shorten wind down
       if (!canSleepOnPlane) {
           bedTime = arrival.plus({ hours: 2 });
       }

       // But don't stay up past 2am if possible, and don't sleep before 10pm if arriving early evening
       if (bedTime.hour >= 2 && bedTime.day !== arrival.day) {
           bedTime = arrival.plus({ hours: 1.5 }); // Cap wind down if it pushes too late
       }
    }

    // Ensure bedtime is in the future
    if (bedTime < arrival) {
        bedTime = bedTime.plus({ days: 1 });
    }

    this.addTimelineItem(
      bedTime.setZone(destZone), 
      `Goal Bedtime`, 
      `Your target bedtime in ${this.airports[finalSegment.to].city} to reset your body clock. Try to stay awake until then! <br><br>👉 <strong>Tap "Jet Lag Ticket" below to save this goal.</strong>`, 
      destZone,
      true // isGoal flag
    );
    
    // Scroll to results
    results.scrollIntoView({ behavior: 'smooth' });
    
    // Store for ticket
    this.currentPlan = {
      destCity: this.airports[finalSegment.to].city,
      bedTime: bedTime.toFormat('h:mm a'),
      wakeTime: bedTime.plus({ hours: 7.5 }).toFormat('h:mm a'),
      cycles: strategy === 'naps' ? "Nap Strategy" : "Cycle Strategy"
    };
  },

  sharePlan() {
    if (!this.currentPlan) return;
    const text = `✈️ My Jet Lag Plan for ${this.currentPlan.destCity}:\n` +
                 `Bedtime: ${this.currentPlan.bedTime}\n` +
                 `Wake Up: ${this.currentPlan.wakeTime}\n` +
                 `Strategy: ${this.currentPlan.cycles}\n` +
                 `\nGenerate yours at nightowlsleepcalc.com`;
    
    if (navigator.share) {
      navigator.share({ title: 'Jet Lag Plan', text: text, url: 'https://nightowlsleepcalc.com' }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('jetLagShareBtn');
        const originalText = btn.innerHTML;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
      });
    }
  },

  addTimelineItem(timeObj, title, desc, zone, isGoal = false) {
    const timeline = document.getElementById('jetLagTimeline');
    const div = document.createElement('div');
    div.className = `timeline-block ${isGoal ? 'goal-block' : ''}`;
    div.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-time">${timeObj.toFormat('MMM dd, h:mm a')} (${timeObj.zoneName.split('/')[1]})</div>
      <div class="timeline-title">${title} ${isGoal ? '🏁' : ''}</div>
      <div class="timeline-desc">${desc}</div>
    `;
    timeline.appendChild(div);
  },

  openTicketModal() {
    if (!this.currentPlan) return;
    
    // Set flag on sleepTicket so regeneration works
    sleepTicket.isJetLag = true;
    
    const ticketModal = document.getElementById('ticketModal');
    const ticketBg = document.getElementById('ticketBg');
    const ticketIcon = document.getElementById('ticketIcon');
    const ticketPersonalityName = document.getElementById('ticketPersonalityName');
    const ticketQuote = document.getElementById('ticketQuote');
    const ticketBedtime = document.getElementById('ticketBedtime');
    const ticketWakeTime = document.getElementById('ticketWakeTime');
    const ticketCycles = document.getElementById('ticketCycles');
    const ticketSubtitle = document.getElementById('ticketSubtitle');

    const ticketBedtimeLabel = document.getElementById('ticketBedtimeLabel');

    // Reuse existing modal but modify content
    ticketModal.style.display = 'flex';

    // Update subtitle for jet lag mode
    if (ticketSubtitle) ticketSubtitle.textContent = "Share your jet lag ticket on Instagram Stories";
    
    // Set Ticket Content
    ticketBg.className = 'ticket-bg bg-gradient-3'; 
    ticketIcon.src = '/attached_assets/generated_images/cute_3d_pilot_owl_icon.png';
    // Use innerHTML to allow styling "Jet Lag" and City separately
    ticketPersonalityName.innerHTML = `<div class="ticket-header-small">Jet Lag</div><div class="ticket-dest-large">${this.currentPlan.destCity}</div>`;
    ticketQuote.textContent = sleepTicket.getRandomQuote();
    
    // Explicitly set the label to GOAL BEDTIME for clarity
    if (ticketBedtimeLabel) ticketBedtimeLabel.textContent = "GOAL BEDTIME";
    
    ticketBedtime.textContent = this.currentPlan.bedTime;
    ticketWakeTime.textContent = this.currentPlan.wakeTime;
    ticketCycles.textContent = this.currentPlan.cycles || "Sync Strategy";
  }
};

const caffeineCalc = {
  init() {
    const btn = document.getElementById('calcCaffeineBtn');
    if (btn) btn.addEventListener('click', () => this.calculate());
  },

  calculate() {
    const bedtimeInput = document.getElementById('caffeineBedtime').value;
    const mg = parseInt(document.getElementById('caffeineSource').value);
    
    // Get beverage name for label
    const sourceSelect = document.getElementById('caffeineSource');
    const selectedText = sourceSelect.options[sourceSelect.selectedIndex].text;
    const beverageName = selectedText.split(' (')[0]; // "Coffee", "Black Tea", etc.
    
    if (!bedtimeInput) return;

    // Convert bedtime to minutes from midnight
    const [h, m] = bedtimeInput.split(':').map(Number);
    let bedtimeMins = h * 60 + m;
    
    // Caffeine Half-life logic
    // We want < 25mg remaining at bedtime to sleep well (arbitrary but safe threshold)
    // Formula: Final = Initial * (1/2)^(time/halfLife)
    // We need to solve for 'time': time = halfLife * log2(Initial/Final)
    
    const halfLife = 5; // hours
    const targetMg = 20; // safe threshold
    
    // How many half-lives to get to target?
    // time = 5 * Math.log2(mg / 20)
    
    const hoursNeeded = halfLife * Math.log2(mg / targetMg);
    const minsNeeded = hoursNeeded * 60;
    
    // If bedtime is 11pm (23:00), and we need 10 hours buffer
    // Cutoff = Bedtime - minsNeeded
    
    let cutoffMins = bedtimeMins - minsNeeded;
    if (cutoffMins < 0) cutoffMins += 24 * 60; // Handle previous day wrapping
    
    const cutoffDate = new Date();
    cutoffDate.setHours(Math.floor(cutoffMins / 60));
    cutoffDate.setMinutes(Math.floor(cutoffMins % 60));
    
    const formatter = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
    
    const resultEl = document.getElementById('caffeineResults');
    const timeEl = document.getElementById('caffeineCutoffTime');
    const leftEl = document.getElementById('caffeineLeft');
    const labelEl = document.getElementById('caffeineResultLabel');
    
    if (resultEl && timeEl) {
      timeEl.textContent = formatter.format(cutoffDate);
      if(leftEl) leftEl.textContent = `less than ${targetMg}mg`;
      if(labelEl) labelEl.textContent = `Latest ${beverageName} Time`;
      
      resultEl.style.display = 'block';
      resultEl.classList.add('glow');
      setTimeout(() => resultEl.classList.remove('glow'), 600);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof sleepTicket !== 'undefined') sleepTicket.init();
  } catch (e) {
    console.error("Error init sleepTicket", e);
  }

  try {
    if (typeof jetLagPlanner !== 'undefined') jetLagPlanner.init();
  } catch (e) {
    console.error("Error init jetLagPlanner", e);
  }

  try {
    if (typeof caffeineCalc !== 'undefined') caffeineCalc.init();
  } catch (e) {
    console.error("Error init caffeineCalc", e);
  }

  try {
    if (typeof app !== 'undefined') app.init();
  } catch (e) {
    console.error("Error init app", e);
  }
});
