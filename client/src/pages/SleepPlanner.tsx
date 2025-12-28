import { useState, useEffect } from 'react';
import { Moon, Clock, Settings, Copy, Share2, Wind } from 'lucide-react';

interface SleepSettings {
  latency: number;
  cycleLength: number;
  wakeWindow: number;
  funMode: boolean;
}

interface TimeResult {
  time: string;
  cycles: number;
  timeInBed: string;
  window: string;
  isRecommended: boolean;
  isBest: boolean;
}

const OwlMascot = ({ funMode, isAnimating }: { funMode: boolean; isAnimating: boolean }) => {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mb-4">
      <defs>
        <style>{`
          @keyframes blink {
            0%, 49%, 51%, 100% { d: path('M 45 50 Q 48 50 48 47 Q 48 50 51 50'); }
            50% { d: path('M 45 50 Q 48 48 51 50'); }
          }
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          @keyframes tilt {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-5deg); }
          }
          @keyframes wingTuck {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(3px); }
          }
          @keyframes floatZzz {
            0% { opacity: 1; transform: translateY(0) translateX(0); }
            100% { opacity: 0; transform: translateY(-30px) translateX(20px); }
          }
          .owl-body {
            ${funMode ? 'animation: breathe 3s ease-in-out infinite;' : ''}
          }
          .owl-eyes {
            ${funMode && !isAnimating ? 'animation: blink 8s ease-in-out infinite;' : ''}
          }
          .owl-head {
            ${isAnimating && funMode ? 'animation: tilt 0.6s ease-in-out;' : ''}
          }
          .owl-wing {
            ${isAnimating && funMode ? 'animation: wingTuck 0.6s ease-in-out;' : ''}
          }
          .zzz {
            ${isAnimating && funMode ? 'animation: floatZzz 1.8s ease-out forwards;' : ''}
          }
          @media (prefers-reduced-motion: reduce) {
            .owl-body, .owl-eyes, .owl-head, .owl-wing, .zzz {
              animation: none !important;
            }
          }
        `}</style>
      </defs>

      {/* Body */}
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#8B4513" className="owl-body" />
      
      {/* Head */}
      <circle cx="60" cy="45" r="22" fill="#A0522D" className="owl-head" />
      
      {/* Ear tufts */}
      <polygon points="40,25 35,10 45,20" fill="#8B4513" />
      <polygon points="80,25 85,10 75,20" fill="#8B4513" />
      
      {/* Face */}
      <circle cx="60" cy="45" r="18" fill="#D2B48C" />
      
      {/* Eyes */}
      <g className="owl-eyes">
        {/* Left eye white */}
        <circle cx="50" cy="42" r="6" fill="white" />
        {/* Left eye pupil */}
        <circle cx="50" cy="43" r="3.5" fill="black" />
        {/* Right eye white */}
        <circle cx="70" cy="42" r="6" fill="white" />
        {/* Right eye pupil */}
        <circle cx="70" cy="43" r="3.5" fill="black" />
      </g>
      
      {/* Beak */}
      <polygon points="60,50 55,56 65,56" fill="#FF8C00" />
      
      {/* Wings */}
      <ellipse cx="35" cy="75" rx="10" ry="20" fill="#654321" className="owl-wing" />
      <ellipse cx="85" cy="75" rx="10" ry="20" fill="#654321" className="owl-wing" />
      
      {/* Belly */}
      <ellipse cx="60" cy="80" rx="20" ry="24" fill="#F5DEB3" />
      
      {/* Feet */}
      <circle cx="50" cy="107" r="3" fill="#FF8C00" />
      <circle cx="70" cy="107" r="3" fill="#FF8C00" />

      {/* ZZZ animation */}
      {isAnimating && funMode && (
        <>
          <text x="75" y="25" fontSize="16" fontWeight="bold" fill="#4F46E5" className="zzz">z</text>
          <text x="85" y="18" fontSize="14" fontWeight="bold" fill="#4F46E5" className="zzz" style={{animationDelay: '0.2s'}}>z</text>
          <text x="95" y="12" fontSize="12" fontWeight="bold" fill="#4F46E5" className="zzz" style={{animationDelay: '0.4s'}}>z</text>
        </>
      )}
    </svg>
  );
};

export default function SleepPlanner() {
  const [mode, setMode] = useState<'wake' | 'bed'>('wake');
  const [selectedTime, setSelectedTime] = useState('07:00');
  const [settings, setSettings] = useState<SleepSettings>(() => {
    const saved = localStorage.getItem('sleepSettings');
    return saved ? JSON.parse(saved) : {
      latency: 15,
      cycleLength: 90,
      wakeWindow: 15,
      funMode: true,
    };
  });
  const [selectedResult, setSelectedResult] = useState<TimeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [animatingOwl, setAnimatingOwl] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('sleepSettings', JSON.stringify(settings));
  }, [settings]);

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    let m = minutes % (24 * 60);
    if (m < 0) m += 24 * 60;
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const calculateResults = (): TimeResult[] => {
    const results: TimeResult[] = [];
    const cycles = [4, 5, 6, 7];

    if (mode === 'wake') {
      const wakeMinutes = timeToMinutes(selectedTime);
      cycles.forEach(cycleCount => {
        const bedTimeInBed = cycleCount * settings.cycleLength + settings.latency;
        const bedMinutes = wakeMinutes - bedTimeInBed;
        const bedTime = minutesToTime(bedMinutes);
        
        const bedWindow = {
          start: minutesToTime(bedMinutes),
          end: minutesToTime(bedMinutes + settings.wakeWindow),
        };

        results.push({
          time: bedTime,
          cycles: cycleCount,
          timeInBed: formatTimeInBed(bedTimeInBed),
          window: `${bedWindow.start} – ${bedWindow.end}`,
          isRecommended: cycleCount === 5 || cycleCount === 6,
          isBest: false,
        });
      });
    } else {
      const now = new Date();
      const bedMinutes = now.getHours() * 60 + now.getMinutes();
      cycles.forEach(cycleCount => {
        const wakeTimeInBed = cycleCount * settings.cycleLength + settings.latency;
        const wakeMinutes = bedMinutes + wakeTimeInBed;
        const wakeTime = minutesToTime(wakeMinutes);

        const wakeWindow = {
          start: minutesToTime(wakeMinutes),
          end: minutesToTime(wakeMinutes + settings.wakeWindow),
        };

        results.push({
          time: wakeTime,
          cycles: cycleCount,
          timeInBed: formatTimeInBed(wakeTimeInBed),
          window: `${wakeWindow.start} – ${wakeWindow.end}`,
          isRecommended: cycleCount === 5 || cycleCount === 6,
          isBest: false,
        });
      });
    }

    // Rank best options
    const recommended = results.filter(r => r.isRecommended);
    if (recommended.length > 0) {
      recommended.slice(0, 2).forEach(r => {
        results[results.indexOf(r)].isBest = true;
      });
    }

    return results;
  };

  const formatTimeInBed = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleResultSelect = (result: TimeResult) => {
    setSelectedResult(result);
    setAnimatingOwl(true);
    setTimeout(() => setAnimatingOwl(false), 600);
  };

  const handleCopy = () => {
    if (selectedResult) {
      navigator.clipboard.writeText(selectedResult.time);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const params = new URLSearchParams({
      mode,
      time: selectedTime,
      latency: settings.latency.toString(),
      cycle: settings.cycleLength.toString(),
      result: selectedResult?.time || '',
    });
    const shareUrl = `${window.location.origin}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const results = calculateResults();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm bg-white/30 dark:bg-slate-800/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                NightOwl
              </h1>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              data-testid="button-settings"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Mode Toggle */}
        <div className="mb-8 flex gap-3 justify-center">
          <button
            onClick={() => setMode('wake')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              mode === 'wake'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
            data-testid="button-wake-mode"
          >
            <Clock className="inline w-5 h-5 mr-2" />
            Wake up at…
          </button>
          <button
            onClick={() => setMode('bed')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              mode === 'bed'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
            data-testid="button-bed-mode"
          >
            <Moon className="inline w-5 h-5 mr-2" />
            Bedtime now
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Settings</h2>

            {/* Latency Slider */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Sleep Latency</label>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{settings.latency} min</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={settings.latency}
                onChange={(e) => setSettings({ ...settings, latency: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                data-testid="slider-latency"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Time to fall asleep</p>
            </div>

            {/* Cycle Length Slider */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Cycle Length</label>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{settings.cycleLength} min</span>
              </div>
              <input
                type="range"
                min="80"
                max="110"
                value={settings.cycleLength}
                onChange={(e) => setSettings({ ...settings, cycleLength: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                data-testid="slider-cycle"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">One sleep cycle duration</p>
            </div>

            {/* Wake Window Slider */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Wake Window
                </label>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{settings.wakeWindow} min</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={settings.wakeWindow}
                onChange={(e) => setSettings({ ...settings, wakeWindow: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                data-testid="slider-wake-window"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Flexible wake time range</p>
            </div>

            {/* Fun Mode Toggle */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
              <label className="text-sm font-medium">
                Fun mode 🦉
              </label>
              <button
                onClick={() => setSettings({ ...settings, funMode: !settings.funMode })}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  settings.funMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                data-testid="button-fun-mode"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                    settings.funMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {prefersReducedMotion && !settings.funMode && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">Animations are disabled for your device.</p>
            )}
          </div>
        )}

        {/* Time Input */}
        <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <label className="block text-sm font-medium mb-3">
            {mode === 'wake' ? 'I want to wake up at…' : 'I\'m going to bed now'}
          </label>
          {mode === 'wake' ? (
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="input-wake-time"
            />
          ) : (
            <div className="px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-lg font-semibold">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Owl Mascot */}
        <div className="mb-8 flex justify-center">
          <OwlMascot funMode={settings.funMode && !prefersReducedMotion} isAnimating={animatingOwl} />
        </div>

        {/* Results */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 px-2 mb-4">
            {mode === 'wake' ? 'Go to bed at…' : 'Wake up at…'}
          </h2>

          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleResultSelect(result)}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                selectedResult?.time === result.time
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              } ${
                result.isBest
                  ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-md'
                  : ''
              }`}
              data-testid={`button-result-${idx}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {result.time}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {result.window}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {result.cycles} cycles
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {result.timeInBed}
                  </div>
                </div>
              </div>
              {result.isBest && (
                <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                  ✨ Recommended
                </div>
              )}
              {result.isRecommended && !result.isBest && (
                <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                  Good option
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        {selectedResult && (
          <div className="mt-8 flex gap-3 justify-center flex-col sm:flex-row">
            <button
              onClick={handleCopy}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              data-testid="button-copy"
            >
              <Copy className="w-5 h-5" />
              {copied ? 'Copied!' : 'Copy time'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4">How it works</h3>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <strong>Sleep cycles:</strong> Each cycle lasts about 90 minutes. Your body naturally progresses through stages of light sleep, deep sleep, and REM sleep.
            </p>
            <p>
              <strong>Sleep latency:</strong> The time it takes you to fall asleep after going to bed, typically 10–20 minutes.
            </p>
            <p>
              <strong>Wake window:</strong> A flexible time range around your target wake time, since you won't wake at the exact minute.
            </p>
            <p>
              <strong>Best options:</strong> 5–6 cycles (7.5–9 hours) provide excellent rest. Aim to wake between cycles for the easiest mornings.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>Sleep well. Wake wisely. 🦉</p>
        </div>
      </footer>

      {/* Accessibility: Copy feedback */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg"
          data-testid="status-copied"
        >
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
