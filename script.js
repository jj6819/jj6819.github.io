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
    this.memeMode = false;
    this.timeFormat = '12';
    this.setupEventListeners();
    this.loadSettings();
    this.loadFromUrl();
    this.updateMemeUI();
    this.calculate();
    this.setupQuiz();
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
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

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', () => this.shareLink());

    const embedToggle = document.getElementById('embedToggle');
    const embedPanel = document.getElementById('embedPanel');
    const embedClose = document.getElementById('embedClose');
    const copyEmbedBtn = document.getElementById('copyEmbedBtn');

    if (embedToggle && embedPanel) {
      embedToggle.addEventListener('click', () => {
        embedPanel.style.display = embedPanel.style.display === 'none' ? 'block' : 'none';
        if (embedPanel.style.display === 'block') {
          embedPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    if (embedClose && embedPanel) {
      embedClose.addEventListener('click', () => {
        embedPanel.style.display = 'none';
      });
    }

    if (copyEmbedBtn) {
      copyEmbedBtn.addEventListener('click', () => {
        const embedCode = document.getElementById('embedCode');
        if (!embedCode) return;
        const code = embedCode.textContent;
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

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
        const isCurrentlyOff = !this.memeMode;
        this.setMemeMode(isCurrentlyOff ? 'on' : 'off');
      }
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
        const grid = document.getElementById('settingsGrid');
        if (grid) grid.classList.toggle('show');
      }
    });

    const toggleSet = document.getElementById('toggleSettings');
    if (toggleSet) {
      toggleSet.addEventListener('click', () => {
        const grid = document.getElementById('settingsGrid');
        if (grid) grid.classList.toggle('show');
      });
    }

    const latencyIn = document.getElementById('latency');
    if (latencyIn) {
      latencyIn.addEventListener('input', (e) => {
        this.settings.latency = parseInt(e.target.value);
        const val = document.getElementById('latencyValue');
        if (val) val.textContent = this.settings.latency;
        this.saveSettings();
        this.calculate();
      });
    }

    const cycleIn = document.getElementById('cycleLength');
    if (cycleIn) {
      cycleIn.addEventListener('input', (e) => {
        this.settings.cycleLength = parseInt(e.target.value);
        const val = document.getElementById('cycleLengthValue');
        if (val) val.textContent = this.settings.cycleLength;
        this.saveSettings();
        this.calculate();
      });
    }

    const windowIn = document.getElementById('wakeWindow');
    if (windowIn) {
      windowIn.addEventListener('input', (e) => {
        this.settings.wakeWindow = parseInt(e.target.value);
        const val = document.getElementById('wakeWindowValue');
        if (val) val.textContent = this.settings.wakeWindow;
        this.saveSettings();
        this.calculate();
      });
    }

    document.querySelectorAll('.toggle-option').forEach(btn => {
      btn.addEventListener('click', (e) => this.setTimeFormat(e.target.dataset.format));
    });

    const memeTog = document.getElementById('memeModeToggle');
    if (memeTog) {
      memeTog.addEventListener('click', () => {
        const isCurrentlyOff = !this.memeMode;
        this.setMemeMode(isCurrentlyOff ? 'on' : 'off');
      });
    }

    ['hourColumn', 'minuteColumn', 'periodColumn'].forEach(id => {
      const col = document.getElementById(id);
      if (col) {
        col.addEventListener('wheel', (e) => this.handleTimeScroll(e, id));
        col.addEventListener('touchstart', (e) => this.handleTouchStart(e, id));
        col.addEventListener('touchmove', (e) => this.handleTouchMove(e, id));
        col.addEventListener('keydown', (e) => this.handleTimeKeydown(e, id));
      }
    });

    const picker = document.getElementById('timePicker');
    if (picker) {
      picker.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    document.querySelectorAll(".nap-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const napMins = Number(btn.dataset.nap);
        const wakeWindowMins = this.settings.wakeWindow;
        const now = new Date();
        const start = new Date(now.getTime() + napMins * 60000);
        const end = new Date(start.getTime() + wakeWindowMins * 60000);
        const use24h = (this.timeFormat === "24");
        const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: !use24h });
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

  setupQuiz() {
    const quizBtn = document.getElementById('quizBtn');
    if (!quizBtn) return;
    quizBtn.onclick = () => {
      const startTime = this.to24Hour(this.hour, this.minute, this.period);
      const isMeme = this.memeMode;
      let identity = { name: "The Balanced Owl", emoji: "🦉", desc: "You prioritize steady rest and consistent cycles." };
      const targetWake = this.mode === 'wake' ? startTime : (startTime + this.settings.latency + 5 * this.settings.cycleLength) % (24 * 60);
      const targetH = Math.floor(targetWake / 60);
      if (targetH >= 4 && targetH < 7) {
        identity = { name: isMeme ? "The Productive Menace" : "The Early Riser", emoji: "🌅", desc: isMeme ? "Waking up before the sun even considers starting its shift." : "You thrive on getting a head start on the day." };
      } else if (targetH >= 22 || targetH < 4) {
        identity = { name: isMeme ? "High-Functioning Vampire" : "The Night Owl", emoji: "🧛", desc: isMeme ? "Sunlight is your natural enemy. Your best work happens in the dark." : "You are most creative and alert when the world is quiet." };
      } else if (this.settings.cycleLength !== 90) {
        identity = { name: "The Bio-Hacker", emoji: "🧪", desc: "Adjusting your cycles to match your unique internal rhythm." };
      }
      const overlay = document.createElement('div');
      overlay.className = 'quiz-overlay';
      overlay.innerHTML = `
        <div class="quiz-card">
          <div class="quiz-emoji">${identity.emoji}</div>
          <div class="quiz-name">${identity.name}</div>
          <div class="quiz-desc">${identity.desc}</div>
          <button class="share-btn" id="shareQuiz" style="width:100%; margin-left:0;">Copy Identity</button>
          <button class="quiz-close" id="closeQuiz">Close</button>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = document.getElementById('closeQuiz');
      if (close) close.onclick = () => overlay.remove();
      const share = document.getElementById('shareQuiz');
      if (share) {
        share.onclick = () => {
          const text = `I am ${identity.emoji} ${identity.name} on NightOwl Sleep Calc! ${identity.desc} #NightOwlSleep`;
          navigator.clipboard.writeText(text).then(() => {
            share.textContent = "Copied!";
            share.style.background = "#10b981";
            setTimeout(() => overlay.remove(), 1500);
          });
        };
      }
    };
  },

  setMemeMode(status) {
    this.memeMode = status === 'on';
    const toggleContainer = document.getElementById('memeModeToggle');
    if (toggleContainer) {
      const label = toggleContainer.querySelector('.meme-toggle-label');
      if (status === 'on') {
        toggleContainer.classList.add('active');
        if (label) label.textContent = 'Meme Mode';
      } else {
        toggleContainer.classList.remove('active');
        if (label) label.textContent = 'Normal';
      }
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
    const sub = document.querySelector('.subtitle');
    if (sub) {
      sub.textContent = isMeme ? memeVariants[Math.floor(Math.random() * memeVariants.length)] : "Bedtimes + wake windows based on 90-minute cycles";
    }
    const wakeBtn = document.querySelector('[data-mode="wake"]');
    const sleepBtn = document.querySelector('[data-mode="sleep"]');
    const wakeMemeOptions = ["I need to be human by...", "I must awaken by...", "Alarm time:", "Wake me up at..."];
    const sleepMemeOptions = ["I’m going to bed (for real).", "Put me in sleep mode.", "Initiate bedtime.", "It’s sleep o’clock."];
    if (isMeme) {
      if (wakeBtn) wakeBtn.innerHTML = `<span>⏰</span> ${wakeMemeOptions[Math.floor(Math.random() * wakeMemeOptions.length)]}`;
      if (sleepBtn) sleepBtn.innerHTML = `<span>🛏️</span> ${sleepMemeOptions[Math.floor(Math.random() * sleepMemeOptions.length)]}`;
    } else {
      if (wakeBtn) wakeBtn.innerHTML = `<span>⏰</span> Wake up at...`;
      if (sleepBtn) sleepBtn.innerHTML = `<span>🛏️</span> Bedtime now`;
    }
    const labels = document.querySelectorAll('.setting-label');
    const helpers = [
      isMeme ? "How long I doomscroll before sleep." : "",
      isMeme ? "My brain’s sleep playlist length." : "",
      isMeme ? "Grace period for my life choices." : "",
      isMeme ? "Civilian time vs 24h time." : ""
    ];
    labels.forEach((l, i) => this.updateHelper(l, helpers[i]));
    const timeLabel = document.getElementById('timeLabel');
    if (timeLabel) {
      const wakeTimeMeme = ["I want to wake up at... (no promises)", "Wake time (please don’t judge me):", "Target wake time:"];
      const sleepTimeMeme = ["I want to go to bed at... (for real this time)", "Bedtime (yes, I said it):", "When I intend to sleep:"];
      if (this.mode === 'wake') {
        timeLabel.textContent = isMeme ? wakeTimeMeme[Math.floor(Math.random() * wakeTimeMeme.length)] : "I want to wake up at...";
      } else {
        timeLabel.textContent = isMeme ? sleepTimeMeme[Math.floor(Math.random() * sleepTimeMeme.length)] : "I want to go to bed...";
      }
    }
    const resLabel = document.getElementById('resultsLabel');
    if (resLabel) {
      const resultMeme = ["Best times to sleep so you’re less cursed tomorrow", "Your ‘don’t be groggy’ options", "Here’s the least painful schedule", "Sleep windows (pick your destiny)"];
      if (isMeme) {
        resLabel.textContent = resultMeme[Math.floor(Math.random() * resultMeme.length)];
      } else {
        resLabel.textContent = this.mode === 'wake' ? 'Go to bed at...' : 'Wake up at...';
      }
    }
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      const shareMeme = ["Copy my sleep plan", "Share this wisdom", "Send to a friend who’s tired", "Export bedtime propaganda"];
      shareBtn.textContent = isMeme ? shareMeme[Math.floor(Math.random() * shareMeme.length)] : "Share Link";
    }
    const disclaimer = document.querySelector('.footer-disclaimer');
    if (disclaimer) {
      const disclaimerMeme = ["Educational tool only — not medical advice (sadly).", "Not a doctor, just an owl with opinions."];
      disclaimer.textContent = isMeme ? disclaimerMeme[Math.floor(Math.random() * disclaimerMeme.length)] : "Educational tool only — not medical advice.";
    }
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
    document.querySelectorAll('.toggle-option').forEach(btn => btn.classList.toggle('active', btn.dataset.format === format));
    const tog = document.getElementById('timeFormatToggle');
    if (tog) tog.classList.toggle('active', format === '24');
    this.updateTimePicker();
    this.calculate();
    this.saveSettings();
  },

  setMode(newMode) {
    this.mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === newMode));
    const activeBtn = document.querySelector('.mode-btn.active');
    if (activeBtn) {
      activeBtn.classList.add('mode-switched');
      setTimeout(() => activeBtn.classList.remove('mode-switched'), 600);
    }
    this.updateZzz();
    const label = document.getElementById('timeLabel');
    if (label) label.textContent = newMode === 'wake' ? 'I want to wake up at...' : 'I want to go to bed...';
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
    } else if (columnId === 'hourColumn') {
      if (this.timeFormat === '12') {
        this.hour = ((this.hour - 1 + direction + 12) % 12) + 1;
      } else {
        this.hour = (this.hour + direction + 24) % 24;
      }
    } else if (columnId === 'minuteColumn') {
      this.minute = (this.minute + direction + 60) % 60;
    }
    this.updateTimePicker();
    this.calculate();
  },

  handleTouchStart(e) {
    e.currentTarget.touchStartY = e.touches[0].clientY;
  },

  handleTouchMove(e, columnId) {
    if (!e.currentTarget.touchStartY) return;
    const diff = e.touches[0].clientY - e.currentTarget.touchStartY;
    if (Math.abs(diff) > 20) {
      const direction = diff > 0 ? -1 : 1;
      if (columnId === 'periodColumn' && this.timeFormat === '12') {
        this.period = direction > 0 ? 'PM' : 'AM';
      } else if (columnId === 'hourColumn') {
        if (this.timeFormat === '12') {
          this.hour = ((this.hour - 1 + direction + 12) % 12) + 1;
        } else {
          this.hour = (this.hour + direction + 24) % 24;
        }
      } else if (columnId === 'minuteColumn') {
        this.minute = (this.minute + direction + 60) % 60;
      }
      e.currentTarget.touchStartY = e.touches[0].clientY;
      this.updateTimePicker();
      this.calculate();
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
    const hSel = document.getElementById('hourSelected');
    const hAbv = document.getElementById('hourAbove');
    const hBel = document.getElementById('hourBelow');
    const pCol = document.getElementById('periodColumn');
    const mSel = document.getElementById('minuteSelected');
    const mAbv = document.getElementById('minuteAbove');
    const mBel = document.getElementById('minuteBelow');
    if (this.timeFormat === '12') {
      if (hSel) hSel.textContent = String(this.hour).padStart(2, '0');
      if (hAbv) hAbv.textContent = String(((this.hour - 2 + 12) % 12) + 1).padStart(2, '0');
      if (hBel) hBel.textContent = String((this.hour % 12) + 1).padStart(2, '0');
      const pSel = document.getElementById('periodSelected');
      const pAbv = document.getElementById('periodAbove');
      const pBel = document.getElementById('periodBelow');
      if (pSel) pSel.textContent = this.period;
      if (pAbv) pAbv.textContent = this.period === 'AM' ? 'PM' : 'AM';
      if (pBel) pBel.textContent = this.period === 'AM' ? 'PM' : 'AM';
      if (pCol) pCol.style.display = 'flex';
    } else {
      const h24 = this.period === 'AM' ? (this.hour === 12 ? 0 : this.hour) : (this.hour === 12 ? 12 : this.hour + 12);
      if (hSel) hSel.textContent = String(h24).padStart(2, '0');
      if (hAbv) hAbv.textContent = String((h24 - 1 + 24) % 24).padStart(2, '0');
      if (hBel) hBel.textContent = String((h24 + 1) % 24).padStart(2, '0');
      if (pCol) pCol.style.display = 'none';
    }
    if (mSel) mSel.textContent = String(this.minute).padStart(2, '0');
    if (mAbv) mAbv.textContent = String((this.minute - 1 + 60) % 60).padStart(2, '0');
    if (mBel) mBel.textContent = String((this.minute + 1) % 60).padStart(2, '0');
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
        results.push({
          cycles: cycles,
          wakeTime: wakeTime % (24 * 60),
          wakeTimeStr: this.formatTime(wakeTime),
          bedTime: bedTime,
          wakeWindowStr: `${this.formatTime(wakeTime)} - ${this.formatTime(wakeWindowEnd)}`,
          duration: `${(sleepDuration / 60).toFixed(1)} hrs`
        });
      }
    }
    this.renderResults(results);
    this.updateZzz();
  },

  updateZzz() {
    const existing = document.querySelector('.zzz-container');
    const owlImg = document.getElementById('owlImg');
    if (this.mode === 'sleep') {
      if (owlImg) owlImg.src = "/attached_assets/owl2_1767300759408.png";
      if (!existing) {
        const container = document.createElement('div');
        container.className = 'zzz-container';
        container.innerHTML = `<span class="zzz" style="font-size: 14px;">z</span><span class="zzz">z</span><span class="zzz">z</span>`;
        const picker = document.getElementById('timePicker');
        if (picker) picker.appendChild(container);
      }
    } else {
      if (owlImg) owlImg.src = "/attached_assets/owl1_1767300759408.png";
      if (existing) existing.remove();
    }
  },

  renderResults(results) {
    const isMeme = this.memeMode;
    const listHtml = results.map((r, i) => {
      const isBest = Math.abs(r.cycles - 5) === 0;
      const resultTime = this.mode === 'wake' ? r.bedTimeStr : r.wakeTimeStr;
      const isSelected = this.selectedResult === String(i);
      const windowLabel = this.mode === 'wake' ? 'Go to bed between:' : 'Wake between:';
      const showWindow = this.settings.wakeWindow > 0;
      let memeMicro = "";
      if (isMeme) {
        if (r.cycles === 4) memeMicro = ["Survival Mode", "Quick Reset", "Not ideal, but we move."][Math.floor(Math.random()*3)];
        else if (r.cycles === 5) memeMicro = ["Solid Human Energy", "Best Option", "Main character morning."][Math.floor(Math.random()*3)];
        else if (r.cycles === 6) memeMicro = ["Peak Adulting", "Full Recharge", "Boss fight ready."][Math.floor(Math.random()*3)];
      }
      let bestBadge = isMeme ? ["⭐ Least Painful", "⭐ Top Pick", "⭐ Main Quest", "⭐ Optimal Owl Choice"][i % 4] : "★ Best Option";
      return `
        <button class="result-card ${isSelected ? 'selected' : ''} ${isBest ? 'best' : ''}" data-index="${i}">
          <div class="copy-btn" title="Copy to clipboard" data-index="${i}">📋</div>
          ${isBest ? `<div class="badge-meme" style="font-size: 11px; color: #fbbf24; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${bestBadge}</div>` : ''}
          <div class="result-time">${resultTime}</div>
          ${showWindow ? `<div class="result-window">${windowLabel} ${r.wakeWindowStr}</div>` : ''}
          <div class="result-details"><span class="result-detail">${r.cycles} cycles</span><span class="result-detail">${r.duration}</span></div>
          ${isMeme ? `<div class="meme-micro" style="font-size: 12px; color: #fbbf24; margin-top: 4px; font-weight: 600;">"${memeMicro}"</div>` : ''}
          <div class="result-explanation">(${this.settings.latency}m latency + ${r.cycles} cycles × ${this.settings.cycleLength}m)</div>
        </button>
      `;
    }).join('');
    const list = document.getElementById('resultsList');
    if (list) list.innerHTML = listHtml;
    
    // Check if we are in results list for proper scoping
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    document.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) { this.copyResult(e.target.dataset.index); return; }
        const index = card.dataset.index;
        document.querySelectorAll('.result-card').forEach(c => { c.classList.remove('selected'); c.classList.remove('glow'); });
        card.classList.add('selected');
        card.classList.add('glow');
        setTimeout(() => card.classList.remove('glow'), 600);
        this.selectedResult = index;
      });
    });
    if (this.selectedResult !== null) {
      const selectedCard = document.querySelector(`.result-card[data-index="${this.selectedResult}"]`);
      if (selectedCard) { selectedCard.classList.add('glow'); setTimeout(() => selectedCard.classList.remove('glow'), 600); }
    }
    const lab = document.getElementById('resultsLabel');
    if (lab) lab.textContent = this.mode === 'wake' ? 'Go to bed at...' : 'Wake up at...';
  },

  copyResult(index) {
    const r = document.querySelectorAll('.result-card')[index];
    if (!r) return;
    const time = r.querySelector('.result-time').textContent;
    const details = Array.from(r.querySelectorAll('.result-detail')).map(d => d.textContent).join(' | ');
    const params = new URLSearchParams({ mode: this.mode, hour: this.hour, minute: this.minute, period: this.period, latency: this.settings.latency, cycleLength: this.settings.cycleLength, selectedResult: index });
    const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
    const text = `NightOwl Sleep Plan:\nTime: ${time}\n${details}\nPlan your sleep at: ${shareUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = r.querySelector('.copy-btn');
      if (btn) { const icon = btn.textContent; btn.textContent = '✅'; setTimeout(() => btn.textContent = icon, 1500); }
    });
  },

  saveSettings() {
    localStorage.setItem('sleepSettings', JSON.stringify({ settings: this.settings, timeFormat: this.timeFormat, memeMode: this.memeMode }));
  },

  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('mode')) { const m = params.get('mode'); if (m === 'wake' || m === 'sleep') this.setMode(m); }
    if (params.has('hour')) this.hour = Math.max(1, Math.min(12, parseInt(params.get('hour')) || 1));
    if (params.has('minute')) this.minute = Math.max(0, Math.min(59, parseInt(params.get('minute')) || 0));
    if (params.has('period')) { const p = params.get('period'); if (p === 'AM' || p === 'PM') this.period = p; }
    if (params.has('latency')) this.settings.latency = Math.max(0, Math.min(60, parseInt(params.get('latency')) || 10));
    if (params.has('cycleLength')) this.settings.cycleLength = Math.max(80, Math.min(110, parseInt(params.get('cycleLength')) || 90));
    if (params.has('selectedResult')) { const idx = parseInt(params.get('selectedResult')); if (idx >= 0 && idx <= 2) this.selectedResult = String(idx); }
    this.updateTimePicker();
  },

  shareLink() {
    if (this.selectedResult === null) {
      const btn = document.getElementById('shareBtn');
      if (btn) { const t = btn.textContent; btn.textContent = 'Select a result first!'; btn.classList.add('error-shake'); setTimeout(() => { btn.textContent = t; btn.classList.remove('error-shake'); }, 2000); }
      return;
    }
    const params = new URLSearchParams({ mode: this.mode, hour: this.hour, minute: this.minute, period: this.period, latency: this.settings.latency, cycleLength: this.settings.cycleLength, selectedResult: this.selectedResult });
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    const card = document.getElementById('shareCard');
    const body = document.getElementById('shareCardBody');
    const title = document.getElementById('shareCardTitle');
    const r = document.querySelectorAll('.result-card')[this.selectedResult];
    const time = r.querySelector('.result-time').textContent;
    let txt = this.mode === 'wake' ? `Go to bed: ${time} • Wake up: ${this.formatTime(this.to24Hour(this.hour, this.minute, this.period))}` : `Bedtime: Now • Wake up: ${time}`;
    if (card && body) { body.textContent = txt; card.style.display = 'block'; }
    const cal = document.getElementById('calendarBtn');
    if (cal) {
      cal.onclick = () => {
        const d = `NightOwl Sleep Plan: ${txt}\n\nhttps://nightowlsleepcalc.com`;
        const ics = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',`SUMMARY:${title?title.textContent:'Sleep Plan'}`,`DESCRIPTION:${d}`,'END:VEVENT','END:VCALENDAR'].join('\n');
        const b = new Blob([ics], { type: 'text/calendar' });
        const u = URL.createObjectURL(b);
        const l = document.createElement('a'); l.href = u; l.download = 'sleep.ics'; l.click();
      };
    }
    navigator.clipboard.writeText(shareUrl).then(() => {
      const b = document.getElementById('shareBtn');
      if (b) { const t = b.textContent; b.textContent = 'Link copied!'; setTimeout(() => b.textContent = t, 2000); }
    });
  },

  loadSettings() {
    const saved = localStorage.getItem('sleepSettings');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.settings) this.settings = { ...this.settings, ...data.settings };
        this.timeFormat = data.timeFormat || '12';
        this.memeMode = false;
        const lV = document.getElementById('latencyValue'); const cV = document.getElementById('cycleLengthValue'); const wV = document.getElementById('wakeWindowValue');
        if (lV) lV.textContent = this.settings.latency; if (cV) cV.textContent = this.settings.cycleLength; if (wV) wV.textContent = this.settings.wakeWindow;
        const lI = document.getElementById('latency'); const cI = document.getElementById('cycleLength'); const wI = document.getElementById('wakeWindow');
        if (lI) lI.value = this.settings.latency; if (cI) cI.value = this.settings.cycleLength; if (wI) wI.value = this.settings.wakeWindow;
        const tog = document.getElementById('memeModeToggle');
        if (tog) { tog.classList.remove('active'); const lab = tog.querySelector('.meme-toggle-label'); if (lab) lab.textContent = 'Normal'; }
        this.updateMemeUI();
      } catch (e) {}
    }
    this.updateTimePicker();
  }
};
window.onload = () => app.init();
