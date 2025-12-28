import { useState, useEffect, useRef } from 'react';
import { Moon, Clock, Settings, Copy, Share2, Wind } from 'lucide-react';

interface SleepSettings {
  latency: number;
  cycleLength: number;
  wakeWindow: number;
  funMode: boolean;
}

interface TimeResult {
  time: string;
  time24: string;
  cycles: number;
  timeInBed: string;
  window: string;
  isRecommended: boolean;
  isBest: boolean;
}

// Helper: Convert 24-hour to 12-hour format with AM/PM
const formatTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

// Helper: Convert 12-hour to 24-hour format
const to24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Scrollable Column Component
const ScrollColumn = ({ 
  values, 
  selected, 
  onChange, 
  testId 
}: { 
  values: string[]; 
  selected: string; 
  onChange: (val: string) => void;
  testId: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollVelocityRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);
  const isContinuous = values.length === 12 || values.length === 60; // Hours or Minutes

  const selectedIndex = values.indexOf(selected);

  const getNextIndex = (direction: number) => {
    if (isContinuous) {
      return (selectedIndex + direction + values.length) % values.length;
    }
    return Math.max(0, Math.min(values.length - 1, selectedIndex + direction));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    const timeSinceLastWheel = now - lastWheelTimeRef.current;
    lastWheelTimeRef.current = now;

    // Dampen scroll velocity - only trigger on larger movements or slower scrolls
    const rawDirection = e.deltaY > 0 ? 1 : -1;
    
    // Accumulate velocity but require threshold
    scrollVelocityRef.current += rawDirection;

    // Only change on significant accumulation (threshold = 4 for much slower feel)
    if (Math.abs(scrollVelocityRef.current) >= 4) {
      const direction = scrollVelocityRef.current > 0 ? 1 : -1;
      const newIndex = getNextIndex(direction);
      onChange(values[newIndex]);
      scrollVelocityRef.current = 0;
    }
  };

  const handleTouchStart = useRef<number>(0);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (handleTouchStart.current === 0) return;
    const diff = e.touches[0].clientY - handleTouchStart.current;
    if (Math.abs(diff) > 20) {
      const direction = diff > 0 ? -1 : 1;
      const newIndex = getNextIndex(direction);
      onChange(values[newIndex]);
      handleTouchStart.current = e.touches[0].clientY;
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={(e) => (handleTouchStart.current = e.touches[0].clientY)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => (handleTouchStart.current = 0)}
      className="relative h-44 overflow-hidden rounded-lg bg-gradient-to-b from-slate-900/20 via-indigo-600/30 to-slate-900/20 dark:from-slate-700/40 dark:via-indigo-700/40 dark:to-slate-700/40 border border-indigo-400/30 dark:border-indigo-500/40 cursor-pointer"
      style={{ perspective: '1000px', touchAction: 'none' }}
      data-testid={testId}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-indigo-300/20 dark:ring-indigo-400/20" />
      
      {/* Scroll container */}
      <div className="relative h-full flex flex-col items-center justify-center">
        {/* Above numbers (faded) */}
        <div className="absolute top-0 left-0 right-0 h-20 flex flex-col items-center justify-end pointer-events-none">
          {selectedIndex > 0 || isContinuous ? (
            <div className="text-xl font-semibold text-slate-500 dark:text-slate-400 opacity-40">
              {isContinuous ? values[(selectedIndex - 1 + values.length) % values.length] : values[selectedIndex - 1]}
            </div>
          ) : null}
        </div>

        {/* Selected number (highlighted) */}
        <div className="text-5xl font-bold text-indigo-100 dark:text-indigo-200 text-center drop-shadow-lg">
          {selected}
        </div>

        {/* Below numbers (faded) */}
        <div className="absolute bottom-0 left-0 right-0 h-20 flex flex-col items-center justify-start pointer-events-none">
          {selectedIndex < values.length - 1 || isContinuous ? (
            <div className="text-xl font-semibold text-slate-500 dark:text-slate-400 opacity-40">
              {isContinuous ? values[(selectedIndex + 1) % values.length] : values[selectedIndex + 1]}
            </div>
          ) : null}
        </div>
      </div>

      {/* Center highlight line */}
      <div className="absolute top-1/2 left-0 right-0 h-16 -translate-y-1/2 border-y border-indigo-400/50 dark:border-indigo-300/50 pointer-events-none" />
    </div>
  );
};

// TimePicker Component - Wheel Picker
const TimePicker = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const time12 = formatTo12Hour(value);
  const hours = parseInt(time12.split(':')[0]);
  const minutes = parseInt(time12.split(':')[1]);
  const period = time12.includes('PM') ? 'PM' : 'AM';

  const hourValues = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minuteValues = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const periodValues = ['AM', 'PM'];

  const handleHourChange = (newHour: string) => {
    const newTime12 = `${newHour}:${String(minutes).padStart(2, '0')} ${period}`;
    onChange(to24Hour(newTime12));
  };

  const handleMinuteChange = (newMinute: string) => {
    const newTime12 = `${String(hours).padStart(2, '0')}:${newMinute} ${period}`;
    onChange(to24Hour(newTime12));
  };

  const handlePeriodChange = (newPeriod: string) => {
    const newTime12 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${newPeriod}`;
    onChange(to24Hour(newTime12));
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-indigo-400/30 dark:border-indigo-500/40 p-6 shadow-2xl">
      <div className="flex gap-4 items-center justify-center">
        <ScrollColumn
          values={hourValues}
          selected={String(hours).padStart(2, '0')}
          onChange={handleHourChange}
          testId="column-hour"
        />
        <div className="text-4xl font-bold text-indigo-300 dark:text-indigo-200 mb-8">:</div>
        <ScrollColumn
          values={minuteValues}
          selected={String(minutes).padStart(2, '0')}
          onChange={handleMinuteChange}
          testId="column-minute"
        />
        <ScrollColumn
          values={periodValues}
          selected={period}
          onChange={handlePeriodChange}
          testId="column-period"
        />
      </div>
    </div>
  );
};

const OwlMascot = ({ funMode, isAnimating }: { funMode: boolean; isAnimating: boolean }) => {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="mx-auto mb-4">
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#6B3410', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8B4513', stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id="faceGrad" cx="40%" cy="40%">
          <stop offset="0%" style={{ stopColor: '#E8C4A0', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#D2B48C', stopOpacity: 1 }} />
        </radialGradient>
        <style>{`
          @keyframes blink {
            0%, 49%, 51%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.2); }
          }
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }
          @keyframes tilt {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-6deg); }
          }
          @keyframes wingTuck {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(4px); }
          }
          @keyframes floatZzz {
            0% { opacity: 1; transform: translateY(0) translateX(0); }
            100% { opacity: 0; transform: translateY(-35px) translateX(25px); }
          }
          .owl-body {
            ${funMode ? 'animation: breathe 3s ease-in-out infinite;' : ''}
          }
          .owl-head {
            ${isAnimating && funMode ? 'animation: tilt 0.6s ease-in-out;' : ''}
          }
          .owl-left-eye, .owl-right-eye {
            ${funMode && !isAnimating ? 'animation: blink 8s ease-in-out infinite;' : ''}
          }
          .owl-wing {
            ${isAnimating && funMode ? 'animation: wingTuck 0.6s ease-in-out;' : ''}
          }
          .zzz {
            ${isAnimating && funMode ? 'animation: floatZzz 1.8s ease-out forwards;' : ''}
          }
          @media (prefers-reduced-motion: reduce) {
            .owl-body, .owl-left-eye, .owl-right-eye, .owl-head, .owl-wing, .zzz {
              animation: none !important;
            }
          }
        `}</style>
      </defs>

      {/* Back wings (darker) */}
      <ellipse cx="32" cy="80" rx="12" ry="26" fill="#5D2E0F" className="owl-wing" />
      <ellipse cx="108" cy="80" rx="12" ry="26" fill="#5D2E0F" className="owl-wing" />

      {/* Body */}
      <ellipse cx="70" cy="85" rx="32" ry="36" fill="url(#bodyGrad)" className="owl-body" />
      
      {/* Head circle */}
      <circle cx="70" cy="48" r="25" fill="#6B4423" className="owl-head" />
      
      {/* Face */}
      <circle cx="70" cy="48" r="22" fill="url(#faceGrad)" />
      
      {/* Ear tufts - more prominent */}
      <polygon points="42,22 35,5 48,15" fill="#5D2E0F" />
      <polygon points="98,22 105,5 92,15" fill="#5D2E0F" />
      <polygon points="40,24 32,8 46,18" fill="#6B4423" />
      <polygon points="100,24 108,8 94,18" fill="#6B4423" />
      
      {/* Eyebrows */}
      <path d="M 50 32 Q 54 28 58 32" stroke="#5D2E0F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 82 32 Q 86 28 90 32" stroke="#5D2E0F" strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Left Eye */}
      <g>
        <circle cx="54" cy="48" r="8" fill="white" />
        <circle cx="54" cy="48" r="5.5" fill="#2C1810" className="owl-left-eye" />
        <circle cx="55.5" cy="46" r="2" fill="white" />
      </g>
      
      {/* Right Eye */}
      <g>
        <circle cx="86" cy="48" r="8" fill="white" />
        <circle cx="86" cy="48" r="5.5" fill="#2C1810" className="owl-right-eye" />
        <circle cx="87.5" cy="46" r="2" fill="white" />
      </g>
      
      {/* Beak */}
      <polygon points="70,56 65,64 75,64" fill="#D97706" />
      <polygon points="70,56 66,62 74,62" fill="#F59E0B" />
      
      {/* Front wings */}
      <ellipse cx="40" cy="85" rx="13" ry="28" fill="#8B4513" className="owl-wing" />
      <ellipse cx="100" cy="85" rx="13" ry="28" fill="#8B4513" className="owl-wing" />
      
      {/* Belly - lighter */}
      <ellipse cx="70" cy="88" rx="24" ry="28" fill="#E8C4A0" />
      
      {/* Belly detail */}
      <ellipse cx="70" cy="92" rx="18" ry="20" fill="#D2B48C" opacity="0.6" />
      
      {/* Feet - more detailed */}
      <g>
        {/* Left foot */}
        <circle cx="55" cy="120" r="4" fill="#D97706" />
        <line x1="52" y1="122" x2="48" y2="126" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="123" x2="55" y2="127" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="58" y1="122" x2="62" y2="126" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g>
        {/* Right foot */}
        <circle cx="85" cy="120" r="4" fill="#D97706" />
        <line x1="82" y1="122" x2="78" y2="126" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="85" y1="123" x2="85" y2="127" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="88" y1="122" x2="92" y2="126" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      </g>

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
        const bedTime24 = minutesToTime(bedMinutes);
        const bedTime12 = formatTo12Hour(bedTime24);
        
        const bedWindow = {
          start: formatTo12Hour(minutesToTime(bedMinutes)),
          end: formatTo12Hour(minutesToTime(bedMinutes + settings.wakeWindow)),
        };

        results.push({
          time: bedTime12,
          time24: bedTime24,
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
        const wakeTime24 = minutesToTime(wakeMinutes);
        const wakeTime12 = formatTo12Hour(wakeTime24);

        const wakeWindow = {
          start: formatTo12Hour(minutesToTime(wakeMinutes)),
          end: formatTo12Hour(minutesToTime(wakeMinutes + settings.wakeWindow)),
        };

        results.push({
          time: wakeTime12,
          time24: wakeTime24,
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

        {/* AdSense Ad Space */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {/* Google AdSense horizontal ad will be placed here */}
              <p>Advertisement Space</p>
            </div>
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
            onClick={() => {
              setMode('bed');
              const now = new Date();
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              setSelectedTime(`${hours}:${minutes}`);
            }}
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
        <div className="mb-8">
          <label className="block text-lg font-semibold mb-4">
            {mode === 'wake' ? 'I want to wake up at…' : 'I\'m going to bed now'}
          </label>
          <TimePicker value={selectedTime} onChange={setSelectedTime} />
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
              className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-left font-medium ${
                selectedResult?.time === result.time
                  ? 'border-indigo-600 bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              } ${
                result.isBest
                  ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg'
                  : ''
              }`}
              data-testid={`button-result-${idx}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`text-3xl sm:text-4xl font-bold ${
                    selectedResult?.time === result.time ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {result.time}
                  </div>
                  <div className={`text-sm mt-2 ${
                    selectedResult?.time === result.time ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {result.window}
                  </div>
                </div>
                <div className={`text-right ${selectedResult?.time === result.time ? 'text-indigo-50' : 'text-slate-700 dark:text-slate-300'}`}>
                  <div className={`text-sm font-bold ${selectedResult?.time === result.time ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                    {result.cycles} cycles
                  </div>
                  <div className={`text-xs mt-1 ${selectedResult?.time === result.time ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
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
