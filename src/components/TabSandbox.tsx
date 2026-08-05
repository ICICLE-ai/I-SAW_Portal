import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Anchor,
  Battery,
  Bell,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Droplets,
  Eye,
  Filter,
  Footprints,
  Hand,
  Mic,
  Navigation,
  Network,
  PlaneTakeoff,
  Power,
  Radio,
  RefreshCw,
  Signpost,
  Thermometer,
  TreePine,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { motion } from 'motion/react';

// ---------------------------------------------------------------------------
// Shared sample data & helpers
// ---------------------------------------------------------------------------

const SPECIES_DATA = [
  { species: 'Northern Cardinal', visits: 128, minutes: 222, avgVisit: '1m 44s', peakHour: 7, sigma: 3, highlight: true },
  { species: 'Black-capped Chickadee', visits: 12, minutes: 102, avgVisit: '8m 30s', peakHour: 7, sigma: 1.5 },
  { species: 'Blue Jay', visits: 8, minutes: 45, avgVisit: '5m 37s', peakHour: 9, sigma: 1.2 },
  { species: 'Tufted Titmouse', visits: 5, minutes: 20, avgVisit: '4m 00s', peakHour: 8, sigma: 1 },
  { species: 'American Goldfinch', visits: 3, minutes: 12, avgVisit: '4m 00s', peakHour: 16, sigma: 1.5 },
];

const TIME_RANGES = ['Today', 'This Week', 'This Month'];

const RANGE_MULTIPLIER = { Today: 1, 'This Week': 7, 'This Month': 28 };
const RANGE_INDEX = { Today: 0, 'This Week': 1, 'This Month': 2 };
const ALL_SPECIES_DETECTED = { Today: 12, 'This Week': 15, 'This Month': 19 };
const ALL_PEAK_LABEL = { Today: '7 - 10 AM', 'This Week': '6 - 10 AM', 'This Month': '6 - 10 AM' };
const DATE_LABEL = { Today: 'May 14, 2025', 'This Week': 'May 12 - 18, 2025', 'This Month': 'May 2025' };
const RANGE_CHART_PARAMS = {
  Today: { sigma: 2.2, noise: 20 },
  'This Week': { sigma: 3, noise: 12 },
  'This Month': { sigma: 3.6, noise: 6 },
};

const RANGE_INSIGHTS = {
  Today: "Activity today follows the typical early-morning feeding rhythm, with most visits concentrated in the first few hours after sunrise.",
  'This Week': "This week's totals point to a typical spring feeding pattern: nesting pairs are provisioning young, which pushes visit frequency well above a single-day baseline.",
  'This Month': "This month's aggregate reflects the seasonal high point of the breeding period. Historical predator-prey patterns for this time of year suggest hawk activity stays low through the season, which likely helps keep visit rates steady.",
};

const SPECIES_INSIGHTS = {
  'Northern Cardinal': "Cardinals are territorial, high-frequency feeders that dominate the perch in tight morning bursts before defending it through midday.",
  'Black-capped Chickadee': "Chickadees cache food in short, frequent visits, which is why their visit count runs high relative to total feed time.",
  'Blue Jay': "Jays tend to arrive in brief mid-morning bursts, often displacing smaller species for a few minutes at a time.",
  'Tufted Titmouse': "Titmice closely track Chickadee feeding windows, often arriving in mixed foraging flocks early in the day.",
  'American Goldfinch': "Goldfinches favor afternoon visits, especially as their diet shifts toward seed heads later in the season.",
};

function formatDuration(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = Math.round(totalMinutes % 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function to12h(hour) {
  const hh = ((Math.round(hour) % 24) + 24) % 24;
  const period = hh >= 12 ? 'PM' : 'AM';
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12} ${period}`;
}

function formatPeakWindow(hour, spread = 1.5) {
  return `${to12h(hour - spread)} - ${to12h(hour + spread)}`;
}

function hourToRow(hour) {
  return Math.min(5, Math.max(0, Math.round((hour - 1) / 4)));
}

function computeStats(range, speciesKey) {
  const multiplier = RANGE_MULTIPLIER[range];
  if (speciesKey === 'all') {
    return {
      totalVisits: Math.round(128 * multiplier),
      speciesDetected: ALL_SPECIES_DETECTED[range],
      totalFeedTime: formatDuration(222 * multiplier),
      peakActivity: ALL_PEAK_LABEL[range],
    };
  }
  const s = SPECIES_DATA.find((d) => d.species === speciesKey);
  return {
    totalVisits: Math.round(s.visits * multiplier),
    speciesDetected: 1,
    totalFeedTime: formatDuration(s.minutes * multiplier),
    peakActivity: formatPeakWindow(s.peakHour),
  };
}

function buildChartBars(range, speciesKey) {
  const params = RANGE_CHART_PARAMS[range];
  const rangeIdx = RANGE_INDEX[range];
  return Array.from({ length: 24 }).map((_, i) => {
    let height;
    if (speciesKey === 'all') {
      const sigma = params.sigma;
      const peak1 = Math.exp(-Math.pow(i - 8.5, 2) / (2 * sigma * sigma));
      const peak2 = Math.exp(-Math.pow(i - 17, 2) / (2 * sigma * sigma));
      height = Math.max(10, (peak1 + peak2 * 0.6) * 100 + Math.random() * params.noise);
    } else {
      const s = SPECIES_DATA.find((d) => d.species === speciesKey);
      const sigma = s.sigma + rangeIdx * 0.4;
      const peak = Math.exp(-Math.pow(i - s.peakHour, 2) / (2 * sigma * sigma));
      height = Math.max(10, peak * 100 + Math.random() * params.noise * 0.6);
    }
    return { id: i, height: Math.min(100, height) };
  });
}

function buildHeatmapCells(range, speciesKey) {
  const rangeIdx = RANGE_INDEX[range];
  let centerRow, spreadDivisor;
  if (speciesKey === 'all') {
    centerRow = 2;
    spreadDivisor = 5 + rangeIdx * 1.5;
  } else {
    const s = SPECIES_DATA.find((d) => d.species === speciesKey);
    centerRow = hourToRow(s.peakHour);
    spreadDivisor = 3 + s.sigma + rangeIdx * 0.5;
  }
  return Array.from({ length: 13 * 6 }).map((_, i) => {
    const col = i % 13;
    const row = Math.floor(i / 13);
    const dist = Math.sqrt(Math.pow(col - 6, 2) + Math.pow(row - centerRow, 2));
    const intensity = Math.max(0.05, 1 - dist / spreadDivisor);
    const op = intensity * (Math.random() * 0.4 + 0.6);
    return { id: i, op };
  });
}

function buildInsight(range, speciesKey, stats) {
  const rangeText = RANGE_INSIGHTS[range];
  if (speciesKey === 'all') {
    return {
      summary: `${stats.totalVisits.toLocaleString()} confirmed visits across ${stats.speciesDetected} species, with activity concentrated around ${stats.peakActivity}.`,
      context: rangeText,
      recommendation:
        "Refill the nectar port near Station 4 and confirm Camera #2's solar panel is unobstructed to keep high-confidence detections flowing through the day.",
    };
  }
  const speciesText = SPECIES_INSIGHTS[speciesKey];
  return {
    summary: `${stats.totalVisits.toLocaleString()} confirmed ${speciesKey} visits, with feeding activity concentrated around ${stats.peakActivity}.`,
    context: `${speciesText} ${rangeText}`,
    recommendation:
      speciesKey === 'American Goldfinch'
        ? 'Consider timing refills for the afternoon to line up with Goldfinch visit patterns.'
        : "Refill the nectar port near Station 4 and confirm Camera #2's solar panel is unobstructed to keep high-confidence detections flowing.",
  };
}

// ---------------------------------------------------------------------------
// Top-level component
// ---------------------------------------------------------------------------

export function TabSandbox() {
  const [subTab, setSubTab] = useState('honeypot');

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 p-8 overflow-y-auto"
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-in { animation: fadeSlideIn 0.25s ease-out both; }
        select { color-scheme: dark; }
      `}</style>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-2 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-stone-50 tracking-tight">Smart Honeypot &amp; Analytics</h2>
            <p className="text-emerald-400 font-medium tracking-wide uppercase text-sm mt-1">
              Designed to attract every species. Built to confirm every visit.
            </p>
          </div>

          <div className="inline-flex self-start md:self-auto bg-stone-900/80 border border-stone-800 rounded-2xl p-1 gap-1">
            <SubTabButton label="The Smart Honeypot" active={subTab === 'honeypot'} onClick={() => setSubTab('honeypot')} />
            <SubTabButton label="Analytics" active={subTab === 'analytics'} onClick={() => setSubTab('analytics')} />
            <SubTabButton label="Gesture Drone Control" active={subTab === 'gesture-drone'} onClick={() => setSubTab('gesture-drone')} />
          </div>
        </div>

        <div key={subTab} className="fade-slide-in flex flex-col gap-6">
          {subTab === 'honeypot' && <HoneypotView />}
          {subTab === 'analytics' && <AnalyticsView />}
          {subTab === 'gesture-drone' && <GestureDroneView />}
        </div>
      </div>
    </motion.section>
  );
}

function SubTabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${
        active ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SUB-TAB 1: The Smart Honeypot
// ---------------------------------------------------------------------------

function HoneypotView() {
  return (
    <>
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <HoneypotSlideshow />
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Sample Sensor Deployment Map</h3>
          <span className="text-[10px] text-stone-500 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-800">
            2 cameras, 3 microphones
          </span>
        </div>
        <p className="text-stone-400 text-sm max-w-3xl mb-4">
          A simple top-down layout showing one honeypot covered by an array of external sensors. Overlapping
          coverage from multiple angles is what makes multi-modal confirmation possible.
        </p>
        <SensorDeploymentMap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Next-Gen Bird Honeypot</h3>
          <p className="text-stone-300 text-sm leading-relaxed max-w-2xl">
            The honeypot is a fully open, see-through feeder built so external cameras can capture a clean,
            unobstructed view of every bird from any angle, since no cameras live inside the structure itself.
            Instead, it relies on a set of on-device sensors, working together with a wider network of external
            sensors, to confirm exactly who visited, when, and for how long.
          </p>
        </div>
        <div className="lg:col-span-5 bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Open &amp; See-Through Design</h3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-2">
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> No cameras inside the honeypot itself</li>
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Fully open interior lets external cameras see clean through to the other side</li>
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Unobstructed sightlines from every angle</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">On-Device Sensing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Mic className="w-5 h-5" />}
            title="On-Feeder Microphone"
            description="Captures bird songs right at the feeder, used to confirm species identity from call and song."
          />
          <FeatureCard
            icon={<Footprints className="w-5 h-5" />}
            title="Footfall Sensor on Each Perch"
            description="Confirms a visit the moment a bird lands, detecting presence by weight and foot coverage."
          />
          <FeatureCard
            icon={<Droplets className="w-5 h-5" />}
            title="Alternating Seed &amp; Nectar Trays"
            description="Seed and nectar sections alternate around the perimeter to attract the widest possible range of species."
          />
        </div>
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6">How Confirmation Works</h3>
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <ConfirmationStep icon={<Camera className="w-5 h-5" />} title="1. Visual Detection" description="AI cameras detect bird activity and shape at the feeder." />
          <ConfirmationConnector symbol="+" />
          <ConfirmationStep icon={<Volume2 className="w-5 h-5" />} title="2. Audio Confirmation" description="Bird songs are captured and matched against species call libraries." />
          <ConfirmationConnector symbol="+" />
          <ConfirmationStep icon={<Footprints className="w-5 h-5" />} title="3. Footfall Confirmation" description="Perch sensors confirm a bird actually landed and fed." />
          <ConfirmationConnector symbol="=" />
          <div className="flex-1 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-emerald-300">High-Confidence Visit Confirmed</div>
            <div className="text-[11px] text-stone-400">Species confirmed via three independent signals</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Multiple Ways to Set Up</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MountCard icon={<Signpost className="w-6 h-6" />} title="Post-Mounted" description="Bolt to a standard feeder pole for a stable, camp-friendly install at a consistent height." />
          <MountCard icon={<TreePine className="w-6 h-6" />} title="Tree-Hung" description="Suspend from a branch using the integrated hanging loop for a natural, low-footprint setup." />
          <MountCard icon={<Anchor className="w-6 h-6" />} title="Ground Stake" description="Anchor into open ground with a stake kit, ideal for gardens, trailheads, or temporary rental deployments." />
        </div>
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <div className="mb-6">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Surrounding Sensors, Beyond the Honeypot</h3>
          <p className="text-stone-400 text-sm max-w-3xl">
            The honeypot never works alone. It's one node in a networked array of external sensors (see the
            deployment map above) that together build a single high-confidence, multi-modal dataset for every visit.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Camera className="w-5 h-5" />}
            title="AI Cameras"
            description="Wide-area cameras capture approach, activity, and behavior from multiple angles around the feeder."
          />
          <FeatureCard
            icon={<Radio className="w-5 h-5" />}
            title="Microphone Array"
            description="External microphones capture bird songs from all directions for independent audio confirmation."
          />
          <FeatureCard
            icon={<Thermometer className="w-5 h-5" />}
            title="Environmental Sensor Station"
            description="Monitors weather, air quality, and habitat conditions to give every detection full context."
          />
        </div>
      </div>
    </>
  );
}

const HONEYPOT_SLIDES = [
  { title: 'Structure Sketch', caption: 'A realistic look at the honeypot in the field, showing the open interior, footfall sensors, and alternating trays.' },
  { title: 'Setup Walkthrough', caption: 'A step-by-step look at how a counselor sets up a honeypot and starts collecting data, short-term and long-term.' },
];

function HoneypotSlideshow() {
  const [slide, setSlide] = useState(0);
  const goTo = (i) => setSlide((i + HONEYPOT_SLIDES.length) % HONEYPOT_SLIDES.length);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Honeypot Structure</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo(slide - 1)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {HONEYPOT_SLIDES.map((s, i) => (
              <button
                key={s.title}
                onClick={() => goTo(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-emerald-500' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo(slide + 1)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div key={slide} className="fade-slide-in">
        {slide === 0 ? <HoneypotSketch /> : <SetupAnimation />}
        <p className="text-center text-xs text-stone-500 mt-4 max-w-xl mx-auto">{HONEYPOT_SLIDES[slide].caption}</p>
      </div>
    </div>
  );
}

function renderGrassBlades(y = 336) {
  return Array.from({ length: 40 }).map((_, i) => (
    <line key={i} x1={i * 17} y1={y} x2={i * 17 - 4} y2={y - 12} stroke="#3f5c34" strokeWidth="2" strokeLinecap="round" />
  ));
}

function sceneBackdrop() {
  return (
    <>
      <ellipse cx="90" cy="330" rx="110" ry="70" fill="#2f4a2a" opacity="0.3" />
      <ellipse cx="560" cy="340" rx="120" ry="75" fill="#2f4a2a" opacity="0.3" />
      <rect x="0" y="336" width="640" height="84" fill="#22301c" />
      <rect x="0" y="332" width="640" height="8" fill="#3a5a2f" />
      {renderGrassBlades(336)}
    </>
  );
}

function Bird({ x, y, scale = 1, color = '#a3352b', flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M-3,0 q-7,-5 -11,1" stroke={color} strokeWidth="2" fill="none" opacity="0.85" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="9" ry="6" fill={color} />
      <circle cx="8" cy="-5" r="4" fill={color} />
      <polygon points="12,-5 19,-3.5 12,-2" fill="#d19a3d" />
    </g>
  );
}

function buildTrayRing(cx = 320, cy = 300, rx = 180, ry = 58, irx = 100, iry = 32) {
  const point = (deg, R, r) => {
    const rad = (deg * Math.PI) / 180;
    return `${(cx + R * Math.cos(rad)).toFixed(1)},${(cy + r * Math.sin(rad)).toFixed(1)}`;
  };
  const segments = [];
  for (let i = 0; i < 6; i++) {
    const a0 = -90 + i * 60;
    const a1 = a0 + 60;
    const d = `M${point(a0, rx, ry)} A${rx},${ry} 0 0 1 ${point(a1, rx, ry)} L${point(a1, irx, iry)} A${irx},${iry} 0 0 0 ${point(a0, irx, iry)} Z`;
    segments.push({ d, color: i % 2 === 0 ? 'url(#nectarGrad)' : 'url(#seedGrad)' });
  }
  return segments;
}

function HoneypotSketch() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Realistic illustration of the honeypot feeder, showing the open interior, footfall sensors, and alternating seed and nectar trays">
      <defs>
        <radialGradient id="nectarGrad" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e8845f" />
          <stop offset="45%" stopColor="#b3462c" />
          <stop offset="100%" stopColor="#651f13" />
        </radialGradient>
        <radialGradient id="seedGrad" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e6c48a" />
          <stop offset="45%" stopColor="#c99a52" />
          <stop offset="100%" stopColor="#6e4b22" />
        </radialGradient>
      </defs>
      {sceneBackdrop()}
      <ellipse cx="320" cy="352" rx="195" ry="22" fill="#000000" opacity="0.32" />

      {/* solid base skirt so the structure reads as grounded, not floating */}
      <ellipse cx="320" cy="344" rx="184" ry="20" fill="#161410" />

      {/* tray, drawn as a ring/trough of alternating seed & nectar bins, each bin individually shaded for depth */}
      {buildTrayRing().map((seg, i) => (
        <path key={i} d={seg.d} fill={seg.color} />
      ))}
      {/* radial divider lines between bins, so each trough reads as a distinct concave section */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 320 + 48 * Math.cos(rad);
        const y1 = 300 + 16 * Math.sin(rad);
        const x2 = 320 + 180 * Math.cos(rad);
        const y2 = 300 + 58 * Math.sin(rad);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00000055" strokeWidth="1.5" />;
      })}
      {/* shading for depth: a shadow toward the hollow center, a highlight along the outer rim */}
      <ellipse cx="320" cy="300" rx="62" ry="21" fill="none" stroke="#000000" strokeWidth="18" opacity="0.32" />
      <ellipse cx="320" cy="300" rx="172" ry="55" fill="none" stroke="#fff7ed" strokeWidth="7" opacity="0.16" />
      <ellipse cx="320" cy="300" rx="180" ry="58" fill="none" stroke="#1c1a16" strokeWidth="3" />
      <ellipse cx="320" cy="300" rx="48" ry="16" fill="#1c1a16" />
      <ellipse cx="320" cy="300" rx="48" ry="16" fill="none" stroke="#0f0d0b" strokeWidth="2" />

      {/* pillars, each with a small contact shadow so they read as resting on the tray rim, not floating.
          The two middle pillars sit near true center but at clearly different depths (back, front) to
          match an accurate 3/4 perspective, rather than being pushed out toward the sides. */}
      <ellipse cx="206" cy="301" rx="10" ry="4" fill="#161410" opacity="0.55" />
      <rect x="200" y="150" width="12" height="150" rx="4" fill="#a97c4f" />
      <rect x="207" y="150" width="4" height="150" fill="#7c5a37" opacity="0.5" />

      <ellipse cx="300" cy="250" rx="8" ry="3.5" fill="#161410" opacity="0.55" />
      <rect x="296" y="180" width="8" height="70" rx="4" fill="#a97c4f" opacity="0.9" />

      <ellipse cx="342" cy="355" rx="10" ry="4" fill="#161410" opacity="0.55" />
      <rect x="338" y="185" width="9" height="170" rx="4" fill="#a97c4f" />

      <ellipse cx="438" cy="301" rx="10" ry="4" fill="#161410" opacity="0.55" />
      <rect x="432" y="150" width="12" height="150" rx="4" fill="#a97c4f" />
      <rect x="439" y="150" width="4" height="150" fill="#7c5a37" opacity="0.5" />

      {/* header beam connecting pillar tops for a finished, structural look */}
      <path d="M200,159 Q320,148 444,159" stroke="#6b4a28" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* hip roof, two faces, with eaves overhang */}
      <polygon points="320,58 320,160 480,166" fill="#22402a" />
      <polygon points="320,58 160,166 320,160" fill="#3f6b4f" />
      <polygon points="320,58 480,166 320,188 160,166" fill="none" stroke="#16281c" strokeWidth="2.5" strokeLinejoin="round" />
      <g stroke="#16281c" strokeWidth="1" opacity="0.35">
        <line x1="200" y1="140" x2="230" y2="128" /><line x1="220" y1="150" x2="250" y2="138" />
        <line x1="420" y1="140" x2="450" y2="128" opacity="0.25" /><line x1="400" y1="150" x2="430" y2="138" opacity="0.25" />
      </g>

      {/* single, clean hanging loop */}
      <circle cx="320" cy="44" r="7" fill="none" stroke="#78716c" strokeWidth="3" />
      <line x1="320" y1="51" x2="320" y2="58" stroke="#78716c" strokeWidth="3" />

      <rect x="352" y="70" width="10" height="18" rx="4" fill="#292524" />

      <line x1="160" y1="215" x2="480" y2="215" stroke="#dcd3c4" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.5" />

      {/* perches + birds for scale */}
      <rect x="180" y="272" width="26" height="6" rx="3" fill="#8a6239" />
      <rect x="446" y="272" width="26" height="6" rx="3" fill="#8a6239" />
      <Bird x={468} y={262} scale={1.1} color="#a3352b" flip />
      <Bird x={196} y={264} scale={0.85} color="#57534e" />

      {/* footfall sensors, single clean pulse each */}
      <circle cx="206" cy="278" r="3" fill="#34d399" />
      <circle cx="206" cy="278" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;10;3" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="446" cy="278" r="3" fill="#34d399" />
      <circle cx="446" cy="278" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;10;3" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
      </circle>

      {/* labels */}
      <line x1="357" y1="72" x2="420" y2="46" stroke="#a8a29e" strokeWidth="1" />
      <text x="424" y="50" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">On-feeder microphone</text>

      <line x1="206" y1="278" x2="80" y2="230" stroke="#a8a29e" strokeWidth="1" />
      <text x="14" y="226" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Footfall sensor, each perch</text>

      <text x="235" y="205" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Open, see-through interior</text>

      <line x1="460" y1="312" x2="560" y2="360" stroke="#a8a29e" strokeWidth="1" />
      <text x="500" y="376" fontSize="11" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">Nectar</text>
      <text x="500" y="390" fontSize="11" fill="#e7c07d" fontFamily="ui-sans-serif, system-ui">/ Seed tray</text>
    </svg>
  );
}

function SceneKit() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of an open field pack with the honeypot sensors and hardware laid out beside it">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="170" ry="16" fill="#000000" opacity="0.25" />

      <path d="M235,220 q-14,0 -14,20 v90 q0,20 18,20 h150 q18,0 18,-20 v-90 q0,-20 -14,-20 Z" fill="#5b6b47" />
      <path d="M235,220 q-14,0 -14,20 v90 q0,20 18,20 h150 q18,0 18,-20 v-90 q0,-20 -14,-20 Z" fill="none" stroke="#3f4a33" strokeWidth="2" />
      <path d="M239,222 q40,-46 122,-4 l-10,14 q-52,-30 -102,4 Z" fill="#71835b" />
      <path d="M239,222 q40,-46 122,-4" fill="none" stroke="#3f4a33" strokeWidth="3" strokeLinecap="round" />
      <path d="M250,258 q-20,20 0,60" stroke="#3f4a33" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M390,258 q20,20 0,60" stroke="#3f4a33" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="270" y="290" width="80" height="40" rx="6" fill="#4c5a3c" stroke="#3f4a33" strokeWidth="1.5" />

      <polygon points="150,300 120,330 180,330" fill="#3f6b4f" stroke="#1c2e20" strokeWidth="1.5" />
      <text x="150" y="348" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Honeypot</text>

      <rect x="440" y="300" width="30" height="20" rx="3" fill="#1c1917" stroke="#57534e" strokeWidth="1.5" />
      <circle cx="470" cy="310" r="7" fill="#3f3d38" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="470" cy="310" r="3" fill="#93c5fd" opacity="0.6" />
      <text x="455" y="335" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Camera</text>

      <rect x="495" y="295" width="12" height="26" rx="6" fill="#1c1917" stroke="#57534e" strokeWidth="1.5" />
      <line x1="501" y1="321" x2="501" y2="332" stroke="#57534e" strokeWidth="2" />
      <text x="501" y="345" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Mic</text>

      {/* a curious bird watching from the bushes */}
      <Bird x={555} y={300} scale={0.8} color="#57534e" flip />
    </svg>
  );
}

function SceneMount() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of the honeypot being mounted onto a post in the ground">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="140" ry="14" fill="#000000" opacity="0.25" />

      <rect x="310" y="180" width="20" height="176" rx="4" fill="#8a6239" />
      <rect x="317" y="180" width="6" height="176" fill="#6b4a28" opacity="0.5" />

      <path d="M320,110 L400,110 A80,26 0 0,1 320,136 A80,26 0 0,1 240,110 A80,26 0 0,1 320,84 Z" fill="#b3462c" opacity="0.9" />
      <ellipse cx="320" cy="110" rx="80" ry="26" fill="none" stroke="#1c1a16" strokeWidth="2" />
      <rect x="270" y="55" width="6" height="55" fill="#a97c4f" />
      <rect x="366" y="55" width="6" height="55" fill="#a97c4f" />
      <polygon points="320,20 320,55 400,55" fill="#284a30" />
      <polygon points="320,20 240,55 320,55" fill="#3f6b4f" />
      <polygon points="320,20 400,55 320,68 240,55" fill="none" stroke="#1c2e20" strokeWidth="1.5" />

      <path d="M215,90 q-16,20 0,45" stroke="#a8a29e" strokeWidth="2" fill="none" />
      <path d="M425,90 q16,20 0,45" stroke="#a8a29e" strokeWidth="2" fill="none" />

      <circle cx="320" cy="178" r="5" fill="none" stroke="#e7e5e4" strokeWidth="1.5" />
      <line x1="320" y1="173" x2="320" y2="183" stroke="#e7e5e4" strokeWidth="1.5" />
      <line x1="315" y1="178" x2="325" y2="178" stroke="#e7e5e4" strokeWidth="1.5" />

      {/* a bird watching the install from the tree line */}
      <Bird x={110} y={300} scale={0.85} color="#a3352b" />
    </svg>
  );
}

function SceneSensors() {
  const onlineDot = (x, y, delay = '0s') => (
    <g>
      <circle cx={x} cy={y} r="3.2" fill="#10b981" />
      <circle cx={x} cy={y} r="3.2" fill="none" stroke="#10b981" strokeWidth="1.5">
        <animate attributeName="r" values="3.2;9;3.2" dur="2s" begin={delay} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" begin={delay} repeatCount="indefinite" />
      </circle>
    </g>
  );

  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of external cameras and microphones confirming they are online and covering the honeypot from every side">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="150" ry="15" fill="#000000" opacity="0.25" />

      {/* dashed coverage ring showing the full-perimeter array */}
      <ellipse cx="320" cy="286" rx="235" ry="118" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="7 8" opacity="0.35" />

      {/* full-coverage confirmation badge */}
      <circle cx="292" cy="130" r="8" fill="none" stroke="#34d399" strokeWidth="2" />
      <path d="M288,130 l3,3 l6,-7" stroke="#34d399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="308" y="134" fontSize="12" fill="#6ee7b7" fontFamily="ui-sans-serif, system-ui">All sensors online &middot; full coverage confirmed</text>

      <rect x="310" y="270" width="20" height="70" rx="3" fill="#8a6239" />
      <path d="M320,220 L370,220 A50,16 0 0,1 320,236 A50,16 0 0,1 270,220 A50,16 0 0,1 320,204 Z" fill="#b3462c" />
      <polygon points="320,170 270,200 370,200" fill="#3f6b4f" stroke="#1c2e20" strokeWidth="1.5" />

      {/* a bird already checking out the freshly mounted honeypot */}
      <Bird x={345} y={186} scale={0.9} color="#a3352b" />

      {/* camera 1, left */}
      <line x1="140" y1="340" x2="140" y2="270" stroke="#57534e" strokeWidth="3" />
      <rect x="126" y="250" width="28" height="20" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="140" cy="260" r="6" fill="#3f3d38" />
      <line x1="154" y1="260" x2="315" y2="222" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
      {onlineDot(140, 244, '0s')}

      {/* camera 2, right */}
      <line x1="500" y1="340" x2="500" y2="270" stroke="#57534e" strokeWidth="3" />
      <rect x="486" y="250" width="28" height="20" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="500" cy="260" r="6" fill="#3f3d38" />
      <line x1="486" y1="260" x2="325" y2="222" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
      {onlineDot(500, 244, '0.4s')}

      {/* mic 1, left */}
      <line x1="220" y1="356" x2="220" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="214" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="220" y1="286" x2="308" y2="235" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
      {onlineDot(220, 280, '0.8s')}

      {/* mic 2, center-front */}
      <line x1="320" y1="356" x2="320" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="314" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="320" y1="286" x2="320" y2="238" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
      {onlineDot(320, 280, '1.2s')}

      {/* mic 3, right */}
      <line x1="420" y1="356" x2="420" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="414" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="420" y1="286" x2="332" y2="235" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
      {onlineDot(420, 280, '1.6s')}
    </svg>
  );
}

function SceneShortTerm() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of the honeypot's sensors actively detecting a bird while a tablet shows a live incoming feed">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="150" ry="15" fill="#000000" opacity="0.25" />

      {/* honeypot, background */}
      <g opacity="0.85">
        <rect x="470" y="240" width="14" height="60" rx="2" fill="#8a6239" />
        <path d="M477,200 L512,200 A35,12 0 0,1 477,212 A35,12 0 0,1 442,200 A35,12 0 0,1 477,188 Z" fill="#b3462c" />
        <polygon points="477,160 442,182 512,182" fill="#3f6b4f" />
      </g>

      {/* a bird actively feeding, triggering the footfall sensor */}
      <Bird x={465} y={192} scale={0.9} color="#a3352b" flip />
      <circle cx="479" cy="199" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;9;3" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
      </circle>

      {/* camera actively recording */}
      <rect x="380" y="255" width="26" height="18" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="406" cy="264" r="5" fill="#3f3d38" />
      <circle cx="392" cy="252" r="3" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="392" y="245" fontSize="9" textAnchor="middle" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">REC</text>

      {/* signal arcs from honeypot toward the tablet */}
      <path d="M440,220 q-40,-10 -80,20" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M440,230 q-60,0 -110,45" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.05;0.5" dur="2s" begin="0.4s" repeatCount="indefinite" />
      </path>

      {/* tablet, live feed */}
      <rect x="150" y="230" width="130" height="90" rx="10" fill="#1c1917" stroke="#57534e" strokeWidth="2" />
      <rect x="160" y="240" width="110" height="70" rx="4" fill="#0c1f18" />
      <circle cx="167" cy="248" r="3" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="176" y="251" fontSize="9" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">LIVE</text>
      <rect x="172" y="288" width="10" height="14" fill="#34d399" />
      <rect x="188" y="278" width="10" height="24" fill="#34d399" />
      <rect x="204" y="266" width="10" height="36" fill="#34d399" />
      <rect x="220" y="272" width="10" height="30" fill="#34d399" />

      <line x1="180" y1="320" x2="160" y2="356" stroke="#57534e" strokeWidth="3" />
      <line x1="250" y1="320" x2="270" y2="356" stroke="#57534e" strokeWidth="3" />
    </svg>
  );
}

function SceneLongTerm() {
  const heat = [
    0.2, 0.3, 0.5, 0.7, 0.6, 0.4, 0.2,
    0.3, 0.5, 0.8, 0.9, 0.7, 0.5, 0.3,
    0.4, 0.6, 0.9, 1.0, 0.8, 0.6, 0.4,
    0.2, 0.4, 0.6, 0.7, 0.5, 0.3, 0.2,
  ];
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of a dashboard board showing a heatmap and a rising trend line built from weeks of visits">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="160" ry="15" fill="#000000" opacity="0.25" />

      {/* board on a stand */}
      <rect x="140" y="100" width="360" height="210" rx="12" fill="#0c1f18" stroke="#57534e" strokeWidth="2" />
      <text x="320" y="128" fontSize="12" textAnchor="middle" fill="#a7f3d0" fontFamily="ui-sans-serif, system-ui">12 Weeks of Activity</text>

      {/* heatmap grid */}
      {heat.map((op, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        return (
          <rect
            key={i}
            x={166 + col * 30}
            y={140 + row * 24}
            width={26}
            height={20}
            rx={3}
            fill="#10b981"
            opacity={op}
          />
        );
      })}

      {/* rising trend line beneath the heatmap */}
      <path d="M166,290 L196,282 L226,270 L256,272 L286,255 L316,248 L346,232 L376,238 L406,215 L436,205 L466,190" stroke="#6ee7b7" strokeWidth="2.5" fill="none" />
      {[166, 226, 286, 346, 406, 466].map((x, i) => (
        <circle key={x} cx={x} cy={[290, 270, 255, 232, 215, 190][i]} r="3" fill="#34d399" />
      ))}

      {/* stand legs */}
      <line x1="200" y1="310" x2="170" y2="356" stroke="#57534e" strokeWidth="3" />
      <line x1="440" y1="310" x2="470" y2="356" stroke="#57534e" strokeWidth="3" />

      {/* a bird perched on the frame, watching the trends build */}
      <Bird x={470} y={95} scale={0.85} color="#57534e" />
    </svg>
  );
}

const SETUP_STEPS = [
  { title: '1. Pack the Kit', description: 'Open the field pack to reveal the honeypot, camera, and microphone.', render: SceneKit },
  { title: '2. Mount the Honeypot', description: 'Lower the assembled honeypot onto its post, tree mount, or ground stake.', render: SceneMount },
  { title: '3. Deploy the Sensors', description: 'Place external cameras and microphones around the perimeter.', render: SceneSensors },
  { title: '4. Short-Term Data Collection', description: 'The sensors are actively working, confirming each visit as it happens.', render: SceneShortTerm },
  { title: '5. Long-Term Data Collection', description: 'Weeks of visits build into heatmaps and trend lines you can explore.', render: SceneLongTerm },
];

function SetupAnimation() {
  const [step, setStep] = useState(0);
  const goToStep = (i) => setStep((i + SETUP_STEPS.length) % SETUP_STEPS.length);

  useEffect(() => {
    const id = setTimeout(() => setStep((s) => (s + 1) % SETUP_STEPS.length), 4000);
    return () => clearTimeout(id);
  }, [step]);

  const Current = SETUP_STEPS[step].render;

  return (
    <div>
      <div key={step} className="fade-slide-in">
        <Current />
        <div className="text-center mt-2">
          <div className="text-sm font-bold text-emerald-300">{SETUP_STEPS[step].title}</div>
          <div className="text-xs text-stone-500 mt-1">{SETUP_STEPS[step].description}</div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => goToStep(step - 1)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
          aria-label="Previous step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {SETUP_STEPS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => goToStep(i)}
              aria-label={`Go to ${s.title}`}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-emerald-500' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`}
            />
          ))}
        </div>
        <button
          onClick={() => goToStep(step + 1)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
          aria-label="Next step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SensorDeploymentMap() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      <svg viewBox="0 0 480 480" className="w-full max-w-md mx-auto h-auto" role="img" aria-label="Top-down map of sensor deployment around the honeypot">
        <path d="M110,110 L336.5,149.9 A230,230 0 0,1 149.9,336.5 Z" fill="#10b981" opacity="0.08" stroke="#34d399" strokeWidth="1" />
        <path d="M370,110 L330.1,336.5 A230,230 0 0,1 143.5,149.9 Z" fill="#10b981" opacity="0.08" stroke="#34d399" strokeWidth="1" />

        <circle cx="90" cy="370" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="240" cy="430" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="390" cy="370" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />

        <polygon points="240,222 255,231 255,249 240,258 225,249 225,231" fill="#0c0a09" stroke="#34d399" strokeWidth="2" />
        <text x="240" y="276" fontSize="11" textAnchor="middle" fill="#6ee7b7" fontFamily="monospace">Honeypot</text>

        <circle cx="110" cy="110" r="6" fill="#34d399" />
        <text x="110" y="98" fontSize="10" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace">Camera 1</text>
        <circle cx="370" cy="110" r="6" fill="#34d399" />
        <text x="370" y="98" fontSize="10" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace">Camera 2</text>

        <circle cx="90" cy="370" r="5" fill="#fbbf24" />
        <text x="90" y="358" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 1</text>
        <circle cx="240" cy="430" r="5" fill="#fbbf24" />
        <text x="240" y="450" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 2</text>
        <circle cx="390" cy="370" r="5" fill="#fbbf24" />
        <text x="390" y="358" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 3</text>
      </svg>

      <div className="flex flex-row lg:flex-col gap-4 shrink-0">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-sm bg-emerald-500/20 border border-emerald-400 inline-block"></span>
          Camera field of view
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-full border border-amber-400 border-dashed inline-block"></span>
          Microphone pickup range
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-sm bg-stone-950 border border-emerald-400 inline-block"></span>
          Honeypot (center)
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors flex flex-col gap-3">
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-900/40 text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-stone-100 mb-1">{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function MountCard({ icon, title, description }) {
  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors flex flex-col gap-3">
      <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-stone-950/50 border border-stone-800 text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-stone-100 mb-1">{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ConfirmationStep({ icon, title, description }) {
  return (
    <div className="flex-1 bg-stone-950/50 border border-stone-800 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
      <div className="p-2 bg-stone-900 text-emerald-400 rounded-xl">{icon}</div>
      <div className="text-sm font-bold text-stone-200">{title}</div>
      <div className="text-[11px] text-stone-400">{description}</div>
    </div>
  );
}

function ConfirmationConnector({ symbol }) {
  return (
    <div className="flex items-center justify-center text-stone-600 font-bold text-lg shrink-0 lg:w-6">
      {symbol}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-TAB 2: Analytics
// ---------------------------------------------------------------------------

function AnalyticsView() {
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedRange, setSelectedRange] = useState('Today');

  const multiplier = RANGE_MULTIPLIER[selectedRange];

  const stats = useMemo(() => computeStats(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);
  const insight = useMemo(() => buildInsight(selectedRange, selectedSpecies, stats), [selectedRange, selectedSpecies, stats]);
  const chartBars = useMemo(() => buildChartBars(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);
  const heatmapCells = useMemo(() => buildHeatmapCells(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);

  const tableRows = useMemo(
    () =>
      SPECIES_DATA.filter((s) => selectedSpecies === 'all' || s.species === selectedSpecies).map((s) => ({
        ...s,
        visits: Math.round(s.visits * multiplier),
        totalTime: formatDuration(s.minutes * multiplier),
      })),
    [selectedSpecies, multiplier]
  );

  return (
    <>
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-widest shrink-0">
          <Filter className="w-4 h-4" /> Filters
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="inline-flex bg-stone-950/50 border border-stone-800 rounded-xl p-1 gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  selectedRange === range ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="appearance-none bg-stone-950/50 border border-stone-800 text-stone-300 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 outline-none hover:border-emerald-500/30 transition-colors cursor-pointer"
            >
              <option value="all">All Species</option>
              {SPECIES_DATA.map((s) => (
                <option key={s.species} value={s.species}>
                  {s.species}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <button className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-emerald-400 transition-colors shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              {selectedRange} At A Glance{selectedSpecies !== 'all' ? ` - ${selectedSpecies}` : ''}
            </h3>
            <span className="text-stone-400 text-[10px] font-mono bg-stone-950 border border-stone-800 px-2 py-1 rounded-lg">
              {DATE_LABEL[selectedRange]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6 flex-1">
            <MetricCard value={stats.totalVisits.toLocaleString()} label="Total Visits" />
            <MetricCard value={String(stats.speciesDetected)} label="Species Detected" />
            <MetricCard value={stats.totalFeedTime} label="Total Feed Time" />
            <MetricCard value={stats.peakActivity} label="Peak Activity" />
          </div>
        </div>

        <div className="lg:col-span-8 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Visits Over Time</h3>
            <div className="flex items-center space-x-4 text-[10px] uppercase font-bold text-stone-500">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-emerald-500 mr-1.5"></span> Visits</span>
            </div>
          </div>
          <div className="h-40 flex items-end justify-between gap-1 flex-1 pb-2 border-b border-stone-800">
            {chartBars.map((bar) => (
              <div
                key={bar.id}
                className="w-full bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-400"
                style={{ height: `${bar.height}%`, opacity: bar.height > 30 ? 1 : 0.4 }}
              ></div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone-500 uppercase mt-2 font-mono">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Activity Heatmap</h3>
            <span className="text-[10px] text-stone-500 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-800">
              0 - 1000
            </span>
          </div>
          <div className="flex flex-1 items-stretch">
            <div className="flex flex-col justify-between text-[10px] font-mono text-stone-500 mr-3 py-1">
              <span>1 AM</span>
              <span>5 AM</span>
              <span>9 AM</span>
              <span>1 PM</span>
              <span>5 PM</span>
              <span>Night</span>
            </div>
            <div className="flex-1 grid grid-cols-13 grid-rows-6 gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              {heatmapCells.map((cell) => (
                <div key={cell.id} className="bg-emerald-500 rounded-sm" style={{ opacity: cell.op }}></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-stone-500 mt-3 ml-[42px]">
            <span>1</span>
            <span>4</span>
            <span>7</span>
            <span>10</span>
            <span>13</span>
          </div>
        </div>

        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Species Visit Summary</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="text-[10px] text-stone-500 uppercase tracking-wider border-b border-stone-800">
                <tr>
                  <th className="pb-3 font-semibold">Species</th>
                  <th className="pb-3 font-semibold text-right">Visits</th>
                  <th className="pb-3 font-semibold text-right">Total Time</th>
                  <th className="pb-3 font-semibold text-right">Avg Visit</th>
                  <th className="pb-3 font-semibold text-right">Peak Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <SpeciesRow
                      key={row.species}
                      species={row.species}
                      visits={row.visits}
                      totalTime={row.totalTime}
                      avgVisit={row.avgVisit}
                      peak={formatPeakWindow(row.peakHour, 0.5)}
                      highlight={row.highlight}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-500 text-xs">
                      No visits recorded for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Smart Alerts</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertCard
            icon={<Droplets className="w-5 h-5" />}
            title="Nectar Running Low"
            description="Station 4's nectar tray is at 12% capacity. Refill within the next day to maintain visit rates."
            severity="warning"
          />
          <AlertCard
            icon={<Battery className="w-5 h-5" />}
            title="Camera Battery Low"
            description="External camera #2 is at 15% battery. Solar charging may be obstructed by nearby foliage."
            severity="warning"
          />
          <AlertCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Unusual Activity Spike"
            description="Visit volume at 6 AM was 3x the seasonal average. Worth a quick check of the feed trays."
            severity="info"
          />
        </div>
      </div>

      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-lg shadow-emerald-900/5 pb-12">
        <div className="p-4 bg-emerald-900/40 text-emerald-400 rounded-2xl shrink-0">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">What This Means For You</h3>
          <p className="text-stone-300 text-sm leading-relaxed max-w-4xl">
            <span className="font-semibold text-emerald-300">Summary:</span> {insight.summary}{' '}
            <br className="hidden sm:block" />
            <span className="font-semibold text-emerald-300">Context:</span> {insight.context}{' '}
            <br className="hidden sm:block" />
            <span className="font-semibold text-emerald-300">Recommendation:</span> {insight.recommendation}
          </p>
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="flex flex-col justify-center items-center text-center p-4 bg-stone-950/50 rounded-2xl border border-stone-800 hover:border-emerald-500/30 transition-colors">
      <div className="text-2xl md:text-3xl font-black text-stone-100 tracking-tighter mb-1">{value}</div>
      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function SpeciesRow({ species, visits, totalTime, avgVisit, peak, highlight = false }: { key?: React.Key; species: string; visits: number; totalTime: string; avgVisit: string; peak: string; highlight?: boolean }) {
  return (
    <tr className={`transition-colors ${highlight ? 'bg-emerald-950/10' : 'hover:bg-stone-800/30'}`}>
      <td className={`py-3 ${highlight ? 'text-emerald-400 font-semibold' : 'text-stone-200'}`}>{species}</td>
      <td className="py-3 text-right font-mono text-xs">{visits.toLocaleString()}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{totalTime}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{avgVisit}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{peak}</td>
    </tr>
  );
}

function AlertCard({ icon, title, description, severity }) {
  const styles =
    severity === 'warning'
      ? { wrap: 'bg-amber-950/20 border-amber-500/20', iconWrap: 'bg-amber-900/30 text-amber-400', title: 'text-amber-300' }
      : { wrap: 'bg-emerald-950/20 border-emerald-500/20', iconWrap: 'bg-emerald-900/30 text-emerald-400', title: 'text-emerald-300' };

  return (
    <div className={`rounded-2xl border p-5 flex gap-4 ${styles.wrap}`}>
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl ${styles.iconWrap}`}>{icon}</div>
      <div>
        <h4 className={`text-sm font-semibold mb-1 ${styles.title}`}>{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}function GestureDroneView() {
  const actions = [
    { gesture: "Open Palm", command: "Hover / Lock", icon: <Hand className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Fist", command: "Land", icon: <ChevronDown className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Point Up", command: "Ascend", icon: <TrendingUp className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Directional", command: "Vector Flight", icon: <Navigation className="w-5 h-5 text-indigo-400" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-stone-900/80 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden shadow-lg shadow-indigo-900/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-stone-50 tracking-tight mb-2 flex items-center gap-3">
              <Crosshair className="w-8 h-8 text-indigo-400" />
              AI Gesture-Controlled Drone Teleoperation
            </h3>
            <p className="text-indigo-300 font-medium tracking-wide text-sm mb-6 uppercase">
              Hands-Free UAV Navigation for Field Researchers &amp; Wildlife Monitoring
            </p>
            <div className="space-y-4">
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Real-Time Detection Engine
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Powered by optimized YOLO vision models and MediaPipe pipelines (<code className="text-emerald-400 font-mono">realtime_detection.py</code>) for low-latency hand tracking.
                </p>
              </div>
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" /> Dynamic Action Mapping
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Translates real-time static &amp; dynamic hand gestures (<code className="text-emerald-400 font-mono">actions.json</code>) into drone flight commands (e.g., Takeoff, Land, Vector Direction, Hover/Lock, Camera Tilt).
                </p>
              </div>
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" /> High-Precision Model Metrics
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Built on validated YOLO detection runs with optimized Box Precision-Recall (BoxPR) and F1-score performance for outdoor field environments.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-6">
            <div className="bg-stone-950/80 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Interactive Command Matrix</h4>
              <div className="grid grid-cols-2 gap-3">
                {actions.map((act, i) => (
                  <div key={i} className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-500/50 transition-all hover:scale-[1.02]">
                    <div className="p-3 bg-indigo-950/60 rounded-xl shadow-inner border border-indigo-500/10">{act.icon}</div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">{act.gesture}</div>
                      <div className="text-sm text-stone-100 font-semibold">{act.command}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-950/80 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Technical Specs &amp; Performance</h4>
              <ul className="space-y-4">
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Detection Engine</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold bg-indigo-950/30 px-2 py-1 rounded border border-indigo-500/20">YOLOv8 / MediaPipe</span>
                </li>
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Control Latency</span>
                  <span className="font-mono text-emerald-400 text-xs font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> &lt; 50ms</span>
                </li>
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Action Config</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold">actions.json</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span className="text-stone-400">Deployment Field</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold">Touchless Aerial Monitoring</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}const SPECIES_DATA = [
  { species: 'Northern Cardinal', visits: 128, minutes: 222, avgVisit: '1m 44s', peakHour: 7, sigma: 3, highlight: true },
  { species: 'Black-capped Chickadee', visits: 12, minutes: 102, avgVisit: '8m 30s', peakHour: 7, sigma: 1.5 },
  { species: 'Blue Jay', visits: 8, minutes: 45, avgVisit: '5m 37s', peakHour: 9, sigma: 1.2 },
  { species: 'Tufted Titmouse', visits: 5, minutes: 20, avgVisit: '4m 00s', peakHour: 8, sigma: 1 },
  { species: 'American Goldfinch', visits: 3, minutes: 12, avgVisit: '4m 00s', peakHour: 16, sigma: 1.5 },
];

const TIME_RANGES = ['Today', 'This Week', 'This Month'];

const RANGE_MULTIPLIER = { Today: 1, 'This Week': 7, 'This Month': 28 };
const RANGE_INDEX = { Today: 0, 'This Week': 1, 'This Month': 2 };
const ALL_SPECIES_DETECTED = { Today: 12, 'This Week': 15, 'This Month': 19 };
const ALL_PEAK_LABEL = { Today: '7 - 10 AM', 'This Week': '6 - 10 AM', 'This Month': '6 - 10 AM' };
const DATE_LABEL = { Today: 'May 14, 2025', 'This Week': 'May 12 - 18, 2025', 'This Month': 'May 2025' };
const RANGE_CHART_PARAMS = {
  Today: { sigma: 2.2, noise: 20 },
  'This Week': { sigma: 3, noise: 12 },
  'This Month': { sigma: 3.6, noise: 6 },
};

const RANGE_INSIGHTS = {
  Today: "Activity today follows the typical early-morning feeding rhythm, with most visits concentrated in the first few hours after sunrise.",
  'This Week': "This week's totals point to a typical spring feeding pattern: nesting pairs are provisioning young, which pushes visit frequency well above a single-day baseline.",
  'This Month': "This month's aggregate reflects the seasonal high point of the breeding period. Historical predator-prey patterns for this time of year suggest hawk activity stays low through the season, which likely helps keep visit rates steady.",
};

const SPECIES_INSIGHTS = {
  'Northern Cardinal': "Cardinals are territorial, high-frequency feeders that dominate the perch in tight morning bursts before defending it through midday.",
  'Black-capped Chickadee': "Chickadees cache food in short, frequent visits, which is why their visit count runs high relative to total feed time.",
  'Blue Jay': "Jays tend to arrive in brief mid-morning bursts, often displacing smaller species for a few minutes at a time.",
  'Tufted Titmouse': "Titmice closely track Chickadee feeding windows, often arriving in mixed foraging flocks early in the day.",
  'American Goldfinch': "Goldfinches favor afternoon visits, especially as their diet shifts toward seed heads later in the season.",
};

function formatDuration(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = Math.round(totalMinutes % 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function to12h(hour) {
  const hh = ((Math.round(hour) % 24) + 24) % 24;
  const period = hh >= 12 ? 'PM' : 'AM';
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12} ${period}`;
}

function formatPeakWindow(hour, spread = 1.5) {
  return `${to12h(hour - spread)} - ${to12h(hour + spread)}`;
}

function hourToRow(hour) {
  return Math.min(5, Math.max(0, Math.round((hour - 1) / 4)));
}

function computeStats(range, speciesKey) {
  const multiplier = RANGE_MULTIPLIER[range];
  if (speciesKey === 'all') {
    return {
      totalVisits: Math.round(128 * multiplier),
      speciesDetected: ALL_SPECIES_DETECTED[range],
      totalFeedTime: formatDuration(222 * multiplier),
      peakActivity: ALL_PEAK_LABEL[range],
    };
  }
  const s = SPECIES_DATA.find((d) => d.species === speciesKey);
  return {
    totalVisits: Math.round(s.visits * multiplier),
    speciesDetected: 1,
    totalFeedTime: formatDuration(s.minutes * multiplier),
    peakActivity: formatPeakWindow(s.peakHour),
  };
}

function buildChartBars(range, speciesKey) {
  const params = RANGE_CHART_PARAMS[range];
  const rangeIdx = RANGE_INDEX[range];
  return Array.from({ length: 24 }).map((_, i) => {
    let height;
    if (speciesKey === 'all') {
      const sigma = params.sigma;
      const peak1 = Math.exp(-Math.pow(i - 8.5, 2) / (2 * sigma * sigma));
      const peak2 = Math.exp(-Math.pow(i - 17, 2) / (2 * sigma * sigma));
      height = Math.max(10, (peak1 + peak2 * 0.6) * 100 + Math.random() * params.noise);
    } else {
      const s = SPECIES_DATA.find((d) => d.species === speciesKey);
      const sigma = s.sigma + rangeIdx * 0.4;
      const peak = Math.exp(-Math.pow(i - s.peakHour, 2) / (2 * sigma * sigma));
      height = Math.max(10, peak * 100 + Math.random() * params.noise * 0.6);
    }
    return { id: i, height: Math.min(100, height) };
  });
}

function buildHeatmapCells(range, speciesKey) {
  const rangeIdx = RANGE_INDEX[range];
  let centerRow, spreadDivisor;
  if (speciesKey === 'all') {
    centerRow = 2;
    spreadDivisor = 5 + rangeIdx * 1.5;
  } else {
    const s = SPECIES_DATA.find((d) => d.species === speciesKey);
    centerRow = hourToRow(s.peakHour);
    spreadDivisor = 3 + s.sigma + rangeIdx * 0.5;
  }
  return Array.from({ length: 13 * 6 }).map((_, i) => {
    const col = i % 13;
    const row = Math.floor(i / 13);
    const dist = Math.sqrt(Math.pow(col - 6, 2) + Math.pow(row - centerRow, 2));
    const intensity = Math.max(0.05, 1 - dist / spreadDivisor);
    const op = intensity * (Math.random() * 0.4 + 0.6);
    return { id: i, op };
  });
}

function buildInsight(range, speciesKey, stats) {
  const rangeText = RANGE_INSIGHTS[range];
  if (speciesKey === 'all') {
    return {
      summary: `${stats.totalVisits.toLocaleString()} confirmed visits across ${stats.speciesDetected} species, with activity concentrated around ${stats.peakActivity}.`,
      context: rangeText,
      recommendation:
        "Refill the nectar port near Station 4 and confirm Camera #2's solar panel is unobstructed to keep high-confidence detections flowing through the day.",
    };
  }
  const speciesText = SPECIES_INSIGHTS[speciesKey];
  return {
    summary: `${stats.totalVisits.toLocaleString()} confirmed ${speciesKey} visits, with feeding activity concentrated around ${stats.peakActivity}.`,
    context: `${speciesText} ${rangeText}`,
    recommendation:
      speciesKey === 'American Goldfinch'
        ? 'Consider timing refills for the afternoon to line up with Goldfinch visit patterns.'
        : "Refill the nectar port near Station 4 and confirm Camera #2's solar panel is unobstructed to keep high-confidence detections flowing.",
  };
}

// ---------------------------------------------------------------------------
// Top-level component
// ---------------------------------------------------------------------------

export function TabSandbox() {
  const [subTab, setSubTab] = useState('honeypot');

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 p-8 overflow-y-auto"
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-in { animation: fadeSlideIn 0.25s ease-out both; }
        select { color-scheme: dark; }
      `}</style>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-2 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-stone-50 tracking-tight">Smart Honeypot &amp; Analytics</h2>
            <p className="text-emerald-400 font-medium tracking-wide uppercase text-sm mt-1">
              Designed to attract every species. Built to confirm every visit.
            </p>
          </div>

          <div className="inline-flex self-start md:self-auto bg-stone-900/80 border border-stone-800 rounded-2xl p-1 gap-1">
            <SubTabButton label="The Smart Honeypot" active={subTab === 'honeypot'} onClick={() => setSubTab('honeypot')} />
            <SubTabButton label="Analytics" active={subTab === 'analytics'} onClick={() => setSubTab('analytics')} />
            <SubTabButton label="Gesture Drone Control" active={subTab === 'gesture-drone'} onClick={() => setSubTab('gesture-drone')} />
          </div>
        </div>

        <div key={subTab} className="fade-slide-in flex flex-col gap-6">
          {subTab === 'honeypot' && <HoneypotView />}
          {subTab === 'analytics' && <AnalyticsView />}
          {subTab === 'gesture-drone' && <GestureDroneView />}
        </div>
      </div>
    </motion.section>
  );
}

function SubTabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${
        active ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SUB-TAB 1: The Smart Honeypot
// ---------------------------------------------------------------------------

function HoneypotView() {
  return (
    <>
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <HoneypotSlideshow />
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Sample Sensor Deployment Map</h3>
          <span className="text-[10px] text-stone-500 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-800">
            2 cameras, 3 microphones
          </span>
        </div>
        <p className="text-stone-400 text-sm max-w-3xl mb-4">
          A simple top-down layout showing one honeypot covered by an array of external sensors. Overlapping
          coverage from multiple angles is what makes multi-modal confirmation possible.
        </p>
        <SensorDeploymentMap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Next-Gen Bird Honeypot</h3>
          <p className="text-stone-300 text-sm leading-relaxed max-w-2xl">
            The honeypot is a fully open, see-through feeder built so external cameras can capture a clean,
            unobstructed view of every bird from any angle, since no cameras live inside the structure itself.
            Instead, it relies on a set of on-device sensors, working together with a wider network of external
            sensors, to confirm exactly who visited, when, and for how long.
          </p>
        </div>
        <div className="lg:col-span-5 bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Open &amp; See-Through Design</h3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-2">
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> No cameras inside the honeypot itself</li>
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Fully open interior lets external cameras see clean through to the other side</li>
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Unobstructed sightlines from every angle</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">On-Device Sensing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Mic className="w-5 h-5" />}
            title="On-Feeder Microphone"
            description="Captures bird songs right at the feeder, used to confirm species identity from call and song."
          />
          <FeatureCard
            icon={<Footprints className="w-5 h-5" />}
            title="Footfall Sensor on Each Perch"
            description="Confirms a visit the moment a bird lands, detecting presence by weight and foot coverage."
          />
          <FeatureCard
            icon={<Droplets className="w-5 h-5" />}
            title="Alternating Seed &amp; Nectar Trays"
            description="Seed and nectar sections alternate around the perimeter to attract the widest possible range of species."
          />
        </div>
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6">How Confirmation Works</h3>
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <ConfirmationStep icon={<Camera className="w-5 h-5" />} title="1. Visual Detection" description="AI cameras detect bird activity and shape at the feeder." />
          <ConfirmationConnector symbol="+" />
          <ConfirmationStep icon={<Volume2 className="w-5 h-5" />} title="2. Audio Confirmation" description="Bird songs are captured and matched against species call libraries." />
          <ConfirmationConnector symbol="+" />
          <ConfirmationStep icon={<Footprints className="w-5 h-5" />} title="3. Footfall Confirmation" description="Perch sensors confirm a bird actually landed and fed." />
          <ConfirmationConnector symbol="=" />
          <div className="flex-1 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-emerald-300">High-Confidence Visit Confirmed</div>
            <div className="text-[11px] text-stone-400">Species confirmed via three independent signals</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Multiple Ways to Set Up</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MountCard icon={<Signpost className="w-6 h-6" />} title="Post-Mounted" description="Bolt to a standard feeder pole for a stable, camp-friendly install at a consistent height." />
          <MountCard icon={<TreePine className="w-6 h-6" />} title="Tree-Hung" description="Suspend from a branch using the integrated hanging loop for a natural, low-footprint setup." />
          <MountCard icon={<Anchor className="w-6 h-6" />} title="Ground Stake" description="Anchor into open ground with a stake kit, ideal for gardens, trailheads, or temporary rental deployments." />
        </div>
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <div className="mb-6">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Surrounding Sensors, Beyond the Honeypot</h3>
          <p className="text-stone-400 text-sm max-w-3xl">
            The honeypot never works alone. It's one node in a networked array of external sensors (see the
            deployment map above) that together build a single high-confidence, multi-modal dataset for every visit.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Camera className="w-5 h-5" />}
            title="AI Cameras"
            description="Wide-area cameras capture approach, activity, and behavior from multiple angles around the feeder."
          />
          <FeatureCard
            icon={<Radio className="w-5 h-5" />}
            title="Microphone Array"
            description="External microphones capture bird songs from all directions for independent audio confirmation."
          />
          <FeatureCard
            icon={<Thermometer className="w-5 h-5" />}
            title="Environmental Sensor Station"
            description="Monitors weather, air quality, and habitat conditions to give every detection full context."
          />
        </div>
      </div>
    </>
  );
}

const HONEYPOT_SLIDES = [
  { title: 'Structure Sketch', caption: 'A realistic look at the honeypot in the field, showing the open interior, footfall sensors, and alternating trays.' },
  { title: 'Setup Walkthrough', caption: 'A step-by-step look at how a counselor sets up a honeypot and starts collecting data, short-term and long-term.' },
];

function HoneypotSlideshow() {
  const [slide, setSlide] = useState(0);
  const goTo = (i) => setSlide((i + HONEYPOT_SLIDES.length) % HONEYPOT_SLIDES.length);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Honeypot Structure</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo(slide - 1)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {HONEYPOT_SLIDES.map((s, i) => (
              <button
                key={s.title}
                onClick={() => goTo(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-emerald-500' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo(slide + 1)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div key={slide} className="fade-slide-in">
        {slide === 0 ? <HoneypotSketch /> : <SetupAnimation />}
        <p className="text-center text-xs text-stone-500 mt-4 max-w-xl mx-auto">{HONEYPOT_SLIDES[slide].caption}</p>
      </div>
    </div>
  );
}

function renderGrassBlades(y = 336) {
  return Array.from({ length: 40 }).map((_, i) => (
    <line key={i} x1={i * 17} y1={y} x2={i * 17 - 4} y2={y - 12} stroke="#3f5c34" strokeWidth="2" strokeLinecap="round" />
  ));
}

function sceneBackdrop() {
  return (
    <>
      <ellipse cx="90" cy="330" rx="110" ry="70" fill="#2f4a2a" opacity="0.3" />
      <ellipse cx="560" cy="340" rx="120" ry="75" fill="#2f4a2a" opacity="0.3" />
      <rect x="0" y="336" width="640" height="84" fill="#22301c" />
      <rect x="0" y="332" width="640" height="8" fill="#3a5a2f" />
      {renderGrassBlades(336)}
    </>
  );
}

function Bird({ x, y, scale = 1, color = '#a3352b', flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M-3,0 q-7,-5 -11,1" stroke={color} strokeWidth="2" fill="none" opacity="0.85" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="9" ry="6" fill={color} />
      <circle cx="8" cy="-5" r="4" fill={color} />
      <polygon points="12,-5 19,-3.5 12,-2" fill="#d19a3d" />
    </g>
  );
}

function buildTrayRing(cx = 320, cy = 300, rx = 180, ry = 58, irx = 100, iry = 32) {
  const point = (deg, R, r) => {
    const rad = (deg * Math.PI) / 180;
    return `${(cx + R * Math.cos(rad)).toFixed(1)},${(cy + r * Math.sin(rad)).toFixed(1)}`;
  };
  const segments = [];
  for (let i = 0; i < 6; i++) {
    const a0 = -90 + i * 60;
    const a1 = a0 + 60;
    const d = `M${point(a0, rx, ry)} A${rx},${ry} 0 0 1 ${point(a1, rx, ry)} L${point(a1, irx, iry)} A${irx},${iry} 0 0 0 ${point(a0, irx, iry)} Z`;
    segments.push({ d, color: i % 2 === 0 ? 'url(#nectarGrad)' : 'url(#seedGrad)' });
  }
  return segments;
}

function HoneypotSketch() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Realistic illustration of the honeypot feeder, showing the open interior, footfall sensors, and alternating seed and nectar trays">
      <defs>
        <radialGradient id="nectarGrad" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e8845f" />
          <stop offset="45%" stopColor="#b3462c" />
          <stop offset="100%" stopColor="#651f13" />
        </radialGradient>
        <radialGradient id="seedGrad" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e6c48a" />
          <stop offset="45%" stopColor="#c99a52" />
          <stop offset="100%" stopColor="#6e4b22" />
        </radialGradient>
      </defs>
      {sceneBackdrop()}
      <ellipse cx="320" cy="352" rx="195" ry="22" fill="#000000" opacity="0.32" />

      {/* solid base skirt so the structure reads as grounded, not floating */}
      <ellipse cx="320" cy="344" rx="184" ry="20" fill="#161410" />

      {/* tray, drawn as a ring/trough of alternating seed & nectar bins, each bin individually shaded for depth */}
      {buildTrayRing().map((seg, i) => (
        <path key={i} d={seg.d} fill={seg.color} />
      ))}
      {/* radial divider lines between bins, so each trough reads as a distinct concave section */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 320 + 48 * Math.cos(rad);
        const y1 = 300 + 16 * Math.sin(rad);
        const x2 = 320 + 180 * Math.cos(rad);
        const y2 = 300 + 58 * Math.sin(rad);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00000055" strokeWidth="1.5" />;
      })}
      {/* shading for depth: a shadow toward the hollow center, a highlight along the outer rim */}
      <ellipse cx="320" cy="300" rx="62" ry="21" fill="none" stroke="#000000" strokeWidth="18" opacity="0.32" />
      <ellipse cx="320" cy="300" rx="172" ry="55" fill="none" stroke="#fff7ed" strokeWidth="7" opacity="0.16" />
      <ellipse cx="320" cy="300" rx="180" ry="58" fill="none" stroke="#1c1a16" strokeWidth="3" />
      <ellipse cx="320" cy="300" rx="48" ry="16" fill="#1c1a16" />
      <ellipse cx="320" cy="300" rx="48" ry="16" fill="none" stroke="#0f0d0b" strokeWidth="2" />

      {/* pillars, each with a small contact shadow so they read as resting on the tray rim, not floating.
          The two middle pillars sit near true center but at clearly different depths (back, front) to
          match an accurate 3/4 perspective, rather than being pushed out toward the sides. */}
      <ellipse cx="206" cy="301" rx="10" ry="4" fill="#161410" opacity="0.55" />
      <rect x="200" y="150" width="12" height="150" rx="4" fill="#a97c4f" />
      <rect x="207" y="150" width="4" height="150" fill="#7c5a37" opacity="0.5" />

      <ellipse cx="300" cy="250" rx="8" ry="3.5" fill="#161410" opacity="0.55" />
      <rect x="296" y="180" width="8" height="70" rx="4" fill="#a97c4f" opacity="0.9" />

      <ellipse cx="342" cy="355" rx="10" ry="4" fill="#161410" opacity="0.55" />
      <rect x="338" y="185" width="9" height="170" rx="4" fill="#a97c4f" />

      <ellipse cx="438" cy="301" rx="10" ry="4" fill="#161410" opacity="0.55" />
      <rect x="432" y="150" width="12" height="150" rx="4" fill="#a97c4f" />
      <rect x="439" y="150" width="4" height="150" fill="#7c5a37" opacity="0.5" />

      {/* header beam connecting pillar tops for a finished, structural look */}
      <path d="M200,159 Q320,148 444,159" stroke="#6b4a28" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* hip roof, two faces, with eaves overhang */}
      <polygon points="320,58 320,160 480,166" fill="#22402a" />
      <polygon points="320,58 160,166 320,160" fill="#3f6b4f" />
      <polygon points="320,58 480,166 320,188 160,166" fill="none" stroke="#16281c" strokeWidth="2.5" strokeLinejoin="round" />
      <g stroke="#16281c" strokeWidth="1" opacity="0.35">
        <line x1="200" y1="140" x2="230" y2="128" /><line x1="220" y1="150" x2="250" y2="138" />
        <line x1="420" y1="140" x2="450" y2="128" opacity="0.25" /><line x1="400" y1="150" x2="430" y2="138" opacity="0.25" />
      </g>

      {/* single, clean hanging loop */}
      <circle cx="320" cy="44" r="7" fill="none" stroke="#78716c" strokeWidth="3" />
      <line x1="320" y1="51" x2="320" y2="58" stroke="#78716c" strokeWidth="3" />

      <rect x="352" y="70" width="10" height="18" rx="4" fill="#292524" />

      <line x1="160" y1="215" x2="480" y2="215" stroke="#dcd3c4" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.5" />

      {/* perches + birds for scale */}
      <rect x="180" y="272" width="26" height="6" rx="3" fill="#8a6239" />
      <rect x="446" y="272" width="26" height="6" rx="3" fill="#8a6239" />
      <Bird x={468} y={262} scale={1.1} color="#a3352b" flip />
      <Bird x={196} y={264} scale={0.85} color="#57534e" />

      {/* footfall sensors, single clean pulse each */}
      <circle cx="206" cy="278" r="3" fill="#34d399" />
      <circle cx="206" cy="278" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;10;3" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="446" cy="278" r="3" fill="#34d399" />
      <circle cx="446" cy="278" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;10;3" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
      </circle>

      {/* labels */}
      <line x1="357" y1="72" x2="420" y2="46" stroke="#a8a29e" strokeWidth="1" />
      <text x="424" y="50" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">On-feeder microphone</text>

      <line x1="206" y1="278" x2="80" y2="230" stroke="#a8a29e" strokeWidth="1" />
      <text x="14" y="226" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Footfall sensor, each perch</text>

      <text x="235" y="205" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Open, see-through interior</text>

      <line x1="460" y1="312" x2="560" y2="360" stroke="#a8a29e" strokeWidth="1" />
      <text x="500" y="376" fontSize="11" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">Nectar</text>
      <text x="500" y="390" fontSize="11" fill="#e7c07d" fontFamily="ui-sans-serif, system-ui">/ Seed tray</text>
    </svg>
  );
}

function SceneKit() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of an open field pack with the honeypot sensors and hardware laid out beside it">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="170" ry="16" fill="#000000" opacity="0.25" />

      <path d="M235,220 q-14,0 -14,20 v90 q0,20 18,20 h150 q18,0 18,-20 v-90 q0,-20 -14,-20 Z" fill="#5b6b47" />
      <path d="M235,220 q-14,0 -14,20 v90 q0,20 18,20 h150 q18,0 18,-20 v-90 q0,-20 -14,-20 Z" fill="none" stroke="#3f4a33" strokeWidth="2" />
      <path d="M239,222 q40,-46 122,-4 l-10,14 q-52,-30 -102,4 Z" fill="#71835b" />
      <path d="M239,222 q40,-46 122,-4" fill="none" stroke="#3f4a33" strokeWidth="3" strokeLinecap="round" />
      <path d="M250,258 q-20,20 0,60" stroke="#3f4a33" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M390,258 q20,20 0,60" stroke="#3f4a33" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="270" y="290" width="80" height="40" rx="6" fill="#4c5a3c" stroke="#3f4a33" strokeWidth="1.5" />

      <polygon points="150,300 120,330 180,330" fill="#3f6b4f" stroke="#1c2e20" strokeWidth="1.5" />
      <text x="150" y="348" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Honeypot</text>

      <rect x="440" y="300" width="30" height="20" rx="3" fill="#1c1917" stroke="#57534e" strokeWidth="1.5" />
      <circle cx="470" cy="310" r="7" fill="#3f3d38" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="470" cy="310" r="3" fill="#93c5fd" opacity="0.6" />
      <text x="455" y="335" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Camera</text>

      <rect x="495" y="295" width="12" height="26" rx="6" fill="#1c1917" stroke="#57534e" strokeWidth="1.5" />
      <line x1="501" y1="321" x2="501" y2="332" stroke="#57534e" strokeWidth="2" />
      <text x="501" y="345" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Mic</text>

      {/* a curious bird watching from the bushes */}
      <Bird x={555} y={300} scale={0.8} color="#57534e" flip />
    </svg>
  );
}

function SceneMount() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of the honeypot being mounted onto a post in the ground">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="140" ry="14" fill="#000000" opacity="0.25" />

      <rect x="310" y="180" width="20" height="176" rx="4" fill="#8a6239" />
      <rect x="317" y="180" width="6" height="176" fill="#6b4a28" opacity="0.5" />

      <path d="M320,110 L400,110 A80,26 0 0,1 320,136 A80,26 0 0,1 240,110 A80,26 0 0,1 320,84 Z" fill="#b3462c" opacity="0.9" />
      <ellipse cx="320" cy="110" rx="80" ry="26" fill="none" stroke="#1c1a16" strokeWidth="2" />
      <rect x="270" y="55" width="6" height="55" fill="#a97c4f" />
      <rect x="366" y="55" width="6" height="55" fill="#a97c4f" />
      <polygon points="320,20 320,55 400,55" fill="#284a30" />
      <polygon points="320,20 240,55 320,55" fill="#3f6b4f" />
      <polygon points="320,20 400,55 320,68 240,55" fill="none" stroke="#1c2e20" strokeWidth="1.5" />

      <path d="M215,90 q-16,20 0,45" stroke="#a8a29e" strokeWidth="2" fill="none" />
      <path d="M425,90 q16,20 0,45" stroke="#a8a29e" strokeWidth="2" fill="none" />

      <circle cx="320" cy="178" r="5" fill="none" stroke="#e7e5e4" strokeWidth="1.5" />
      <line x1="320" y1="173" x2="320" y2="183" stroke="#e7e5e4" strokeWidth="1.5" />
      <line x1="315" y1="178" x2="325" y2="178" stroke="#e7e5e4" strokeWidth="1.5" />

      {/* a bird watching the install from the tree line */}
      <Bird x={110} y={300} scale={0.85} color="#a3352b" />
    </svg>
  );
}

function SceneSensors() {
  const onlineDot = (x, y, delay = '0s') => (
    <g>
      <circle cx={x} cy={y} r="3.2" fill="#10b981" />
      <circle cx={x} cy={y} r="3.2" fill="none" stroke="#10b981" strokeWidth="1.5">
        <animate attributeName="r" values="3.2;9;3.2" dur="2s" begin={delay} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" begin={delay} repeatCount="indefinite" />
      </circle>
    </g>
  );

  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of external cameras and microphones confirming they are online and covering the honeypot from every side">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="150" ry="15" fill="#000000" opacity="0.25" />

      {/* dashed coverage ring showing the full-perimeter array */}
      <ellipse cx="320" cy="286" rx="235" ry="118" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="7 8" opacity="0.35" />

      {/* full-coverage confirmation badge */}
      <circle cx="292" cy="130" r="8" fill="none" stroke="#34d399" strokeWidth="2" />
      <path d="M288,130 l3,3 l6,-7" stroke="#34d399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="308" y="134" fontSize="12" fill="#6ee7b7" fontFamily="ui-sans-serif, system-ui">All sensors online &middot; full coverage confirmed</text>

      <rect x="310" y="270" width="20" height="70" rx="3" fill="#8a6239" />
      <path d="M320,220 L370,220 A50,16 0 0,1 320,236 A50,16 0 0,1 270,220 A50,16 0 0,1 320,204 Z" fill="#b3462c" />
      <polygon points="320,170 270,200 370,200" fill="#3f6b4f" stroke="#1c2e20" strokeWidth="1.5" />

      {/* a bird already checking out the freshly mounted honeypot */}
      <Bird x={345} y={186} scale={0.9} color="#a3352b" />

      {/* camera 1, left */}
      <line x1="140" y1="340" x2="140" y2="270" stroke="#57534e" strokeWidth="3" />
      <rect x="126" y="250" width="28" height="20" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="140" cy="260" r="6" fill="#3f3d38" />
      <line x1="154" y1="260" x2="315" y2="222" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
      {onlineDot(140, 244, '0s')}

      {/* camera 2, right */}
      <line x1="500" y1="340" x2="500" y2="270" stroke="#57534e" strokeWidth="3" />
      <rect x="486" y="250" width="28" height="20" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="500" cy="260" r="6" fill="#3f3d38" />
      <line x1="486" y1="260" x2="325" y2="222" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
      {onlineDot(500, 244, '0.4s')}

      {/* mic 1, left */}
      <line x1="220" y1="356" x2="220" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="214" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="220" y1="286" x2="308" y2="235" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
      {onlineDot(220, 280, '0.8s')}

      {/* mic 2, center-front */}
      <line x1="320" y1="356" x2="320" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="314" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="320" y1="286" x2="320" y2="238" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
      {onlineDot(320, 280, '1.2s')}

      {/* mic 3, right */}
      <line x1="420" y1="356" x2="420" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="414" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="420" y1="286" x2="332" y2="235" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
      {onlineDot(420, 280, '1.6s')}
    </svg>
  );
}

function SceneShortTerm() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of the honeypot's sensors actively detecting a bird while a tablet shows a live incoming feed">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="150" ry="15" fill="#000000" opacity="0.25" />

      {/* honeypot, background */}
      <g opacity="0.85">
        <rect x="470" y="240" width="14" height="60" rx="2" fill="#8a6239" />
        <path d="M477,200 L512,200 A35,12 0 0,1 477,212 A35,12 0 0,1 442,200 A35,12 0 0,1 477,188 Z" fill="#b3462c" />
        <polygon points="477,160 442,182 512,182" fill="#3f6b4f" />
      </g>

      {/* a bird actively feeding, triggering the footfall sensor */}
      <Bird x={465} y={192} scale={0.9} color="#a3352b" flip />
      <circle cx="479" cy="199" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;9;3" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
      </circle>

      {/* camera actively recording */}
      <rect x="380" y="255" width="26" height="18" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="406" cy="264" r="5" fill="#3f3d38" />
      <circle cx="392" cy="252" r="3" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="392" y="245" fontSize="9" textAnchor="middle" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">REC</text>

      {/* signal arcs from honeypot toward the tablet */}
      <path d="M440,220 q-40,-10 -80,20" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M440,230 q-60,0 -110,45" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.05;0.5" dur="2s" begin="0.4s" repeatCount="indefinite" />
      </path>

      {/* tablet, live feed */}
      <rect x="150" y="230" width="130" height="90" rx="10" fill="#1c1917" stroke="#57534e" strokeWidth="2" />
      <rect x="160" y="240" width="110" height="70" rx="4" fill="#0c1f18" />
      <circle cx="167" cy="248" r="3" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="176" y="251" fontSize="9" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">LIVE</text>
      <rect x="172" y="288" width="10" height="14" fill="#34d399" />
      <rect x="188" y="278" width="10" height="24" fill="#34d399" />
      <rect x="204" y="266" width="10" height="36" fill="#34d399" />
      <rect x="220" y="272" width="10" height="30" fill="#34d399" />

      <line x1="180" y1="320" x2="160" y2="356" stroke="#57534e" strokeWidth="3" />
      <line x1="250" y1="320" x2="270" y2="356" stroke="#57534e" strokeWidth="3" />
    </svg>
  );
}

function SceneLongTerm() {
  const heat = [
    0.2, 0.3, 0.5, 0.7, 0.6, 0.4, 0.2,
    0.3, 0.5, 0.8, 0.9, 0.7, 0.5, 0.3,
    0.4, 0.6, 0.9, 1.0, 0.8, 0.6, 0.4,
    0.2, 0.4, 0.6, 0.7, 0.5, 0.3, 0.2,
  ];
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of a dashboard board showing a heatmap and a rising trend line built from weeks of visits">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="160" ry="15" fill="#000000" opacity="0.25" />

      {/* board on a stand */}
      <rect x="140" y="100" width="360" height="210" rx="12" fill="#0c1f18" stroke="#57534e" strokeWidth="2" />
      <text x="320" y="128" fontSize="12" textAnchor="middle" fill="#a7f3d0" fontFamily="ui-sans-serif, system-ui">12 Weeks of Activity</text>

      {/* heatmap grid */}
      {heat.map((op, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        return (
          <rect
            key={i}
            x={166 + col * 30}
            y={140 + row * 24}
            width={26}
            height={20}
            rx={3}
            fill="#10b981"
            opacity={op}
          />
        );
      })}

      {/* rising trend line beneath the heatmap */}
      <path d="M166,290 L196,282 L226,270 L256,272 L286,255 L316,248 L346,232 L376,238 L406,215 L436,205 L466,190" stroke="#6ee7b7" strokeWidth="2.5" fill="none" />
      {[166, 226, 286, 346, 406, 466].map((x, i) => (
        <circle key={x} cx={x} cy={[290, 270, 255, 232, 215, 190][i]} r="3" fill="#34d399" />
      ))}

      {/* stand legs */}
      <line x1="200" y1="310" x2="170" y2="356" stroke="#57534e" strokeWidth="3" />
      <line x1="440" y1="310" x2="470" y2="356" stroke="#57534e" strokeWidth="3" />

      {/* a bird perched on the frame, watching the trends build */}
      <Bird x={470} y={95} scale={0.85} color="#57534e" />
    </svg>
  );
}

const SETUP_STEPS = [
  { title: '1. Pack the Kit', description: 'Open the field pack to reveal the honeypot, camera, and microphone.', render: SceneKit },
  { title: '2. Mount the Honeypot', description: 'Lower the assembled honeypot onto its post, tree mount, or ground stake.', render: SceneMount },
  { title: '3. Deploy the Sensors', description: 'Place external cameras and microphones around the perimeter.', render: SceneSensors },
  { title: '4. Short-Term Data Collection', description: 'The sensors are actively working, confirming each visit as it happens.', render: SceneShortTerm },
  { title: '5. Long-Term Data Collection', description: 'Weeks of visits build into heatmaps and trend lines you can explore.', render: SceneLongTerm },
];

function SetupAnimation() {
  const [step, setStep] = useState(0);
  const goToStep = (i) => setStep((i + SETUP_STEPS.length) % SETUP_STEPS.length);

  useEffect(() => {
    const id = setTimeout(() => setStep((s) => (s + 1) % SETUP_STEPS.length), 4000);
    return () => clearTimeout(id);
  }, [step]);

  const Current = SETUP_STEPS[step].render;

  return (
    <div>
      <div key={step} className="fade-slide-in">
        <Current />
        <div className="text-center mt-2">
          <div className="text-sm font-bold text-emerald-300">{SETUP_STEPS[step].title}</div>
          <div className="text-xs text-stone-500 mt-1">{SETUP_STEPS[step].description}</div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => goToStep(step - 1)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
          aria-label="Previous step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {SETUP_STEPS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => goToStep(i)}
              aria-label={`Go to ${s.title}`}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-emerald-500' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`}
            />
          ))}
        </div>
        <button
          onClick={() => goToStep(step + 1)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
          aria-label="Next step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SensorDeploymentMap() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      <svg viewBox="0 0 480 480" className="w-full max-w-md mx-auto h-auto" role="img" aria-label="Top-down map of sensor deployment around the honeypot">
        <path d="M110,110 L336.5,149.9 A230,230 0 0,1 149.9,336.5 Z" fill="#10b981" opacity="0.08" stroke="#34d399" strokeWidth="1" />
        <path d="M370,110 L330.1,336.5 A230,230 0 0,1 143.5,149.9 Z" fill="#10b981" opacity="0.08" stroke="#34d399" strokeWidth="1" />

        <circle cx="90" cy="370" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="240" cy="430" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="390" cy="370" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />

        <polygon points="240,222 255,231 255,249 240,258 225,249 225,231" fill="#0c0a09" stroke="#34d399" strokeWidth="2" />
        <text x="240" y="276" fontSize="11" textAnchor="middle" fill="#6ee7b7" fontFamily="monospace">Honeypot</text>

        <circle cx="110" cy="110" r="6" fill="#34d399" />
        <text x="110" y="98" fontSize="10" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace">Camera 1</text>
        <circle cx="370" cy="110" r="6" fill="#34d399" />
        <text x="370" y="98" fontSize="10" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace">Camera 2</text>

        <circle cx="90" cy="370" r="5" fill="#fbbf24" />
        <text x="90" y="358" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 1</text>
        <circle cx="240" cy="430" r="5" fill="#fbbf24" />
        <text x="240" y="450" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 2</text>
        <circle cx="390" cy="370" r="5" fill="#fbbf24" />
        <text x="390" y="358" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 3</text>
      </svg>

      <div className="flex flex-row lg:flex-col gap-4 shrink-0">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-sm bg-emerald-500/20 border border-emerald-400 inline-block"></span>
          Camera field of view
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-full border border-amber-400 border-dashed inline-block"></span>
          Microphone pickup range
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-sm bg-stone-950 border border-emerald-400 inline-block"></span>
          Honeypot (center)
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors flex flex-col gap-3">
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-900/40 text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-stone-100 mb-1">{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function MountCard({ icon, title, description }) {
  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors flex flex-col gap-3">
      <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-stone-950/50 border border-stone-800 text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-stone-100 mb-1">{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ConfirmationStep({ icon, title, description }) {
  return (
    <div className="flex-1 bg-stone-950/50 border border-stone-800 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
      <div className="p-2 bg-stone-900 text-emerald-400 rounded-xl">{icon}</div>
      <div className="text-sm font-bold text-stone-200">{title}</div>
      <div className="text-[11px] text-stone-400">{description}</div>
    </div>
  );
}

function ConfirmationConnector({ symbol }) {
  return (
    <div className="flex items-center justify-center text-stone-600 font-bold text-lg shrink-0 lg:w-6">
      {symbol}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-TAB 2: Analytics
// ---------------------------------------------------------------------------

function AnalyticsView() {
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedRange, setSelectedRange] = useState('Today');

  const multiplier = RANGE_MULTIPLIER[selectedRange];

  const stats = useMemo(() => computeStats(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);
  const insight = useMemo(() => buildInsight(selectedRange, selectedSpecies, stats), [selectedRange, selectedSpecies, stats]);
  const chartBars = useMemo(() => buildChartBars(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);
  const heatmapCells = useMemo(() => buildHeatmapCells(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);

  const tableRows = useMemo(
    () =>
      SPECIES_DATA.filter((s) => selectedSpecies === 'all' || s.species === selectedSpecies).map((s) => ({
        ...s,
        visits: Math.round(s.visits * multiplier),
        totalTime: formatDuration(s.minutes * multiplier),
      })),
    [selectedSpecies, multiplier]
  );

  return (
    <>
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-widest shrink-0">
          <Filter className="w-4 h-4" /> Filters
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="inline-flex bg-stone-950/50 border border-stone-800 rounded-xl p-1 gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  selectedRange === range ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="appearance-none bg-stone-950/50 border border-stone-800 text-stone-300 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 outline-none hover:border-emerald-500/30 transition-colors cursor-pointer"
            >
              <option value="all">All Species</option>
              {SPECIES_DATA.map((s) => (
                <option key={s.species} value={s.species}>
                  {s.species}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <button className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-emerald-400 transition-colors shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              {selectedRange} At A Glance{selectedSpecies !== 'all' ? ` - ${selectedSpecies}` : ''}
            </h3>
            <span className="text-stone-400 text-[10px] font-mono bg-stone-950 border border-stone-800 px-2 py-1 rounded-lg">
              {DATE_LABEL[selectedRange]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6 flex-1">
            <MetricCard value={stats.totalVisits.toLocaleString()} label="Total Visits" />
            <MetricCard value={String(stats.speciesDetected)} label="Species Detected" />
            <MetricCard value={stats.totalFeedTime} label="Total Feed Time" />
            <MetricCard value={stats.peakActivity} label="Peak Activity" />
          </div>
        </div>

        <div className="lg:col-span-8 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Visits Over Time</h3>
            <div className="flex items-center space-x-4 text-[10px] uppercase font-bold text-stone-500">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-emerald-500 mr-1.5"></span> Visits</span>
            </div>
          </div>
          <div className="h-40 flex items-end justify-between gap-1 flex-1 pb-2 border-b border-stone-800">
            {chartBars.map((bar) => (
              <div
                key={bar.id}
                className="w-full bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-400"
                style={{ height: `${bar.height}%`, opacity: bar.height > 30 ? 1 : 0.4 }}
              ></div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone-500 uppercase mt-2 font-mono">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Activity Heatmap</h3>
            <span className="text-[10px] text-stone-500 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-800">
              0 - 1000
            </span>
          </div>
          <div className="flex flex-1 items-stretch">
            <div className="flex flex-col justify-between text-[10px] font-mono text-stone-500 mr-3 py-1">
              <span>1 AM</span>
              <span>5 AM</span>
              <span>9 AM</span>
              <span>1 PM</span>
              <span>5 PM</span>
              <span>Night</span>
            </div>
            <div className="flex-1 grid grid-cols-13 grid-rows-6 gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              {heatmapCells.map((cell) => (
                <div key={cell.id} className="bg-emerald-500 rounded-sm" style={{ opacity: cell.op }}></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-stone-500 mt-3 ml-[42px]">
            <span>1</span>
            <span>4</span>
            <span>7</span>
            <span>10</span>
            <span>13</span>
          </div>
        </div>

        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Species Visit Summary</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="text-[10px] text-stone-500 uppercase tracking-wider border-b border-stone-800">
                <tr>
                  <th className="pb-3 font-semibold">Species</th>
                  <th className="pb-3 font-semibold text-right">Visits</th>
                  <th className="pb-3 font-semibold text-right">Total Time</th>
                  <th className="pb-3 font-semibold text-right">Avg Visit</th>
                  <th className="pb-3 font-semibold text-right">Peak Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <SpeciesRow
                      key={row.species}
                      species={row.species}
                      visits={row.visits}
                      totalTime={row.totalTime}
                      avgVisit={row.avgVisit}
                      peak={formatPeakWindow(row.peakHour, 0.5)}
                      highlight={row.highlight}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-500 text-xs">
                      No visits recorded for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Smart Alerts</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertCard
            icon={<Droplets className="w-5 h-5" />}
            title="Nectar Running Low"
            description="Station 4's nectar tray is at 12% capacity. Refill within the next day to maintain visit rates."
            severity="warning"
          />
          <AlertCard
            icon={<Battery className="w-5 h-5" />}
            title="Camera Battery Low"
            description="External camera #2 is at 15% battery. Solar charging may be obstructed by nearby foliage."
            severity="warning"
          />
          <AlertCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Unusual Activity Spike"
            description="Visit volume at 6 AM was 3x the seasonal average. Worth a quick check of the feed trays."
            severity="info"
          />
        </div>
      </div>

      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-lg shadow-emerald-900/5 pb-12">
        <div className="p-4 bg-emerald-900/40 text-emerald-400 rounded-2xl shrink-0">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">What This Means For You</h3>
          <p className="text-stone-300 text-sm leading-relaxed max-w-4xl">
            <span className="font-semibold text-emerald-300">Summary:</span> {insight.summary}{' '}
            <br className="hidden sm:block" />
            <span className="font-semibold text-emerald-300">Context:</span> {insight.context}{' '}
            <br className="hidden sm:block" />
            <span className="font-semibold text-emerald-300">Recommendation:</span> {insight.recommendation}
          </p>
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="flex flex-col justify-center items-center text-center p-4 bg-stone-950/50 rounded-2xl border border-stone-800 hover:border-emerald-500/30 transition-colors">
      <div className="text-2xl md:text-3xl font-black text-stone-100 tracking-tighter mb-1">{value}</div>
      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function SpeciesRow({ species, visits, totalTime, avgVisit, peak, highlight = false }: { key?: React.Key; species: string; visits: number; totalTime: string; avgVisit: string; peak: string; highlight?: boolean }) {
  return (
    <tr className={`transition-colors ${highlight ? 'bg-emerald-950/10' : 'hover:bg-stone-800/30'}`}>
      <td className={`py-3 ${highlight ? 'text-emerald-400 font-semibold' : 'text-stone-200'}`}>{species}</td>
      <td className="py-3 text-right font-mono text-xs">{visits.toLocaleString()}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{totalTime}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{avgVisit}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{peak}</td>
    </tr>
  );
}

function AlertCard({ icon, title, description, severity }) {
  const styles =
    severity === 'warning'
      ? { wrap: 'bg-amber-950/20 border-amber-500/20', iconWrap: 'bg-amber-900/30 text-amber-400', title: 'text-amber-300' }
      : { wrap: 'bg-emerald-950/20 border-emerald-500/20', iconWrap: 'bg-emerald-900/30 text-emerald-400', title: 'text-emerald-300' };

  return (
    <div className={`rounded-2xl border p-5 flex gap-4 ${styles.wrap}`}>
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl ${styles.iconWrap}`}>{icon}</div>
      <div>
        <h4 className={`text-sm font-semibold mb-1 ${styles.title}`}>{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}function GestureDroneView() {
  const actions = [
    { gesture: "Open Palm", command: "Hover / Lock", icon: <Hand className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Fist", command: "Land", icon: <ChevronDown className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Point Up", command: "Ascend", icon: <TrendingUp className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Directional", command: "Vector Flight", icon: <Navigation className="w-5 h-5 text-indigo-400" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-stone-900/80 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden shadow-lg shadow-indigo-900/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-stone-50 tracking-tight mb-2 flex items-center gap-3">
              <Crosshair className="w-8 h-8 text-indigo-400" />
              AI Gesture-Controlled Drone Teleoperation
            </h3>
            <p className="text-indigo-300 font-medium tracking-wide text-sm mb-6 uppercase">
              Hands-Free UAV Navigation for Field Researchers &amp; Wildlife Monitoring
            </p>
            <div className="space-y-4">
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Real-Time Detection Engine
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Powered by optimized YOLO vision models and MediaPipe pipelines (<code className="text-emerald-400 font-mono">realtime_detection.py</code>) for low-latency hand tracking.
                </p>
              </div>
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" /> Dynamic Action Mapping
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Translates real-time static &amp; dynamic hand gestures (<code className="text-emerald-400 font-mono">actions.json</code>) into drone flight commands (e.g., Takeoff, Land, Vector Direction, Hover/Lock, Camera Tilt).
                </p>
              </div>
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" /> High-Precision Model Metrics
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Built on validated YOLO detection runs with optimized Box Precision-Recall (BoxPR) and F1-score performance for outdoor field environments.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-6">
            <div className="bg-stone-950/80 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Interactive Command Matrix</h4>
              <div className="grid grid-cols-2 gap-3">
                {actions.map((act, i) => (
                  <div key={i} className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-500/50 transition-all hover:scale-[1.02]">
                    <div className="p-3 bg-indigo-950/60 rounded-xl shadow-inner border border-indigo-500/10">{act.icon}</div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">{act.gesture}</div>
                      <div className="text-sm text-stone-100 font-semibold">{act.command}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-950/80 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Technical Specs &amp; Performance</h4>
              <ul className="space-y-4">
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Detection Engine</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold bg-indigo-950/30 px-2 py-1 rounded border border-indigo-500/20">YOLOv8 / MediaPipe</span>
                </li>
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Control Latency</span>
                  <span className="font-mono text-emerald-400 text-xs font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> &lt; 50ms</span>
                </li>
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Action Config</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold">actions.json</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span className="text-stone-400">Deployment Field</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold">Touchless Aerial Monitoring</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}const SPECIES_DATA = [
  { species: 'Northern Cardinal', visits: 128, minutes: 222, avgVisit: '1m 44s', peakHour: 7, sigma: 3, highlight: true },
  { species: 'Black-capped Chickadee', visits: 12, minutes: 102, avgVisit: '8m 30s', peakHour: 7, sigma: 1.5 },
  { species: 'Blue Jay', visits: 8, minutes: 45, avgVisit: '5m 37s', peakHour: 9, sigma: 1.2 },
  { species: 'Tufted Titmouse', visits: 5, minutes: 20, avgVisit: '4m 00s', peakHour: 8, sigma: 1 },
  { species: 'American Goldfinch', visits: 3, minutes: 12, avgVisit: '4m 00s', peakHour: 16, sigma: 1.5 },
];

const TIME_RANGES = ['Today', 'This Week', 'This Month'];

const RANGE_MULTIPLIER = { Today: 1, 'This Week': 7, 'This Month': 28 };
const RANGE_INDEX = { Today: 0, 'This Week': 1, 'This Month': 2 };
const ALL_SPECIES_DETECTED = { Today: 12, 'This Week': 15, 'This Month': 19 };
const ALL_PEAK_LABEL = { Today: '7 - 10 AM', 'This Week': '6 - 10 AM', 'This Month': '6 - 10 AM' };
const DATE_LABEL = { Today: 'May 14, 2025', 'This Week': 'May 12 - 18, 2025', 'This Month': 'May 2025' };
const RANGE_CHART_PARAMS = {
  Today: { sigma: 2.2, noise: 20 },
  'This Week': { sigma: 3, noise: 12 },
  'This Month': { sigma: 3.6, noise: 6 },
};

const RANGE_INSIGHTS = {
  Today: "Activity today follows the typical early-morning feeding rhythm, with most visits concentrated in the first few hours after sunrise.",
  'This Week': "This week's totals point to a typical spring feeding pattern: nesting pairs are provisioning young, which pushes visit frequency well above a single-day baseline.",
  'This Month': "This month's aggregate reflects the seasonal high point of the breeding period. Historical predator-prey patterns for this time of year suggest hawk activity stays low through the season, which likely helps keep visit rates steady.",
};

const SPECIES_INSIGHTS = {
  'Northern Cardinal': "Cardinals are territorial, high-frequency feeders that dominate the perch in tight morning bursts before defending it through midday.",
  'Black-capped Chickadee': "Chickadees cache food in short, frequent visits, which is why their visit count runs high relative to total feed time.",
  'Blue Jay': "Jays tend to arrive in brief mid-morning bursts, often displacing smaller species for a few minutes at a time.",
  'Tufted Titmouse': "Titmice closely track Chickadee feeding windows, often arriving in mixed foraging flocks early in the day.",
  'American Goldfinch': "Goldfinches favor afternoon visits, especially as their diet shifts toward seed heads later in the season.",
};

function formatDuration(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = Math.round(totalMinutes % 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function to12h(hour) {
  const hh = ((Math.round(hour) % 24) + 24) % 24;
  const period = hh >= 12 ? 'PM' : 'AM';
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12} ${period}`;
}

function formatPeakWindow(hour, spread = 1.5) {
  return `${to12h(hour - spread)} - ${to12h(hour + spread)}`;
}

function hourToRow(hour) {
  return Math.min(5, Math.max(0, Math.round((hour - 1) / 4)));
}

function computeStats(range, speciesKey) {
  const multiplier = RANGE_MULTIPLIER[range];
  if (speciesKey === 'all') {
    return {
      totalVisits: Math.round(128 * multiplier),
      speciesDetected: ALL_SPECIES_DETECTED[range],
      totalFeedTime: formatDuration(222 * multiplier),
      peakActivity: ALL_PEAK_LABEL[range],
    };
  }
  const s = SPECIES_DATA.find((d) => d.species === speciesKey);
  return {
    totalVisits: Math.round(s.visits * multiplier),
    speciesDetected: 1,
    totalFeedTime: formatDuration(s.minutes * multiplier),
    peakActivity: formatPeakWindow(s.peakHour),
  };
}

function buildChartBars(range, speciesKey) {
  const params = RANGE_CHART_PARAMS[range];
  const rangeIdx = RANGE_INDEX[range];
  return Array.from({ length: 24 }).map((_, i) => {
    let height;
    if (speciesKey === 'all') {
      const sigma = params.sigma;
      const peak1 = Math.exp(-Math.pow(i - 8.5, 2) / (2 * sigma * sigma));
      const peak2 = Math.exp(-Math.pow(i - 17, 2) / (2 * sigma * sigma));
      height = Math.max(10, (peak1 + peak2 * 0.6) * 100 + Math.random() * params.noise);
    } else {
      const s = SPECIES_DATA.find((d) => d.species === speciesKey);
      const sigma = s.sigma + rangeIdx * 0.4;
      const peak = Math.exp(-Math.pow(i - s.peakHour, 2) / (2 * sigma * sigma));
      height = Math.max(10, peak * 100 + Math.random() * params.noise * 0.6);
    }
    return { id: i, height: Math.min(100, height) };
  });
}

function buildHeatmapCells(range, speciesKey) {
  const rangeIdx = RANGE_INDEX[range];
  let centerRow, spreadDivisor;
  if (speciesKey === 'all') {
    centerRow = 2;
    spreadDivisor = 5 + rangeIdx * 1.5;
  } else {
    const s = SPECIES_DATA.find((d) => d.species === speciesKey);
    centerRow = hourToRow(s.peakHour);
    spreadDivisor = 3 + s.sigma + rangeIdx * 0.5;
  }
  return Array.from({ length: 13 * 6 }).map((_, i) => {
    const col = i % 13;
    const row = Math.floor(i / 13);
    const dist = Math.sqrt(Math.pow(col - 6, 2) + Math.pow(row - centerRow, 2));
    const intensity = Math.max(0.05, 1 - dist / spreadDivisor);
    const op = intensity * (Math.random() * 0.4 + 0.6);
    return { id: i, op };
  });
}

function buildInsight(range, speciesKey, stats) {
  const rangeText = RANGE_INSIGHTS[range];
  if (speciesKey === 'all') {
    return {
      summary: `${stats.totalVisits.toLocaleString()} confirmed visits across ${stats.speciesDetected} species, with activity concentrated around ${stats.peakActivity}.`,
      context: rangeText,
      recommendation:
        "Refill the nectar port near Station 4 and confirm Camera #2's solar panel is unobstructed to keep high-confidence detections flowing through the day.",
    };
  }
  const speciesText = SPECIES_INSIGHTS[speciesKey];
  return {
    summary: `${stats.totalVisits.toLocaleString()} confirmed ${speciesKey} visits, with feeding activity concentrated around ${stats.peakActivity}.`,
    context: `${speciesText} ${rangeText}`,
    recommendation:
      speciesKey === 'American Goldfinch'
        ? 'Consider timing refills for the afternoon to line up with Goldfinch visit patterns.'
        : "Refill the nectar port near Station 4 and confirm Camera #2's solar panel is unobstructed to keep high-confidence detections flowing.",
  };
}

// ---------------------------------------------------------------------------
// Top-level component
// ---------------------------------------------------------------------------

export function TabSandbox() {
  const [subTab, setSubTab] = useState('honeypot');

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 p-8 overflow-y-auto"
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-in { animation: fadeSlideIn 0.25s ease-out both; }
        select { color-scheme: dark; }
      `}</style>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-2 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-stone-50 tracking-tight">Smart Honeypot &amp; Analytics</h2>
            <p className="text-emerald-400 font-medium tracking-wide uppercase text-sm mt-1">
              Designed to attract every species. Built to confirm every visit.
            </p>
          </div>

          <div className="inline-flex self-start md:self-auto bg-stone-900/80 border border-stone-800 rounded-2xl p-1 gap-1">
            <SubTabButton label="The Smart Honeypot" active={subTab === 'honeypot'} onClick={() => setSubTab('honeypot')} />
            <SubTabButton label="Analytics" active={subTab === 'analytics'} onClick={() => setSubTab('analytics')} />
            <SubTabButton label="Gesture Drone Control" active={subTab === 'gesture-drone'} onClick={() => setSubTab('gesture-drone')} />
          </div>
        </div>

        <div key={subTab} className="fade-slide-in flex flex-col gap-6">
          {subTab === 'honeypot' && <HoneypotView />}
          {subTab === 'analytics' && <AnalyticsView />}
          {subTab === 'gesture-drone' && <GestureDroneView />}
        </div>
      </div>
    </motion.section>
  );
}

function SubTabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${
        active ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SUB-TAB 1: The Smart Honeypot
// ---------------------------------------------------------------------------

function HoneypotView() {
  return (
    <>
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <HoneypotSlideshow />
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Sample Sensor Deployment Map</h3>
          <span className="text-[10px] text-stone-500 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-800">
            2 cameras, 3 microphones
          </span>
        </div>
        <p className="text-stone-400 text-sm max-w-3xl mb-4">
          A simple top-down layout showing one honeypot covered by an array of external sensors. Overlapping
          coverage from multiple angles is what makes multi-modal confirmation possible.
        </p>
        <SensorDeploymentMap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Next-Gen Bird Honeypot</h3>
          <p className="text-stone-300 text-sm leading-relaxed max-w-2xl">
            The honeypot is a fully open, see-through feeder built so external cameras can capture a clean,
            unobstructed view of every bird from any angle, since no cameras live inside the structure itself.
            Instead, it relies on a set of on-device sensors, working together with a wider network of external
            sensors, to confirm exactly who visited, when, and for how long.
          </p>
        </div>
        <div className="lg:col-span-5 bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Open &amp; See-Through Design</h3>
          <ul className="text-stone-300 text-sm leading-relaxed space-y-2">
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> No cameras inside the honeypot itself</li>
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Fully open interior lets external cameras see clean through to the other side</li>
            <li className="flex gap-2"><Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Unobstructed sightlines from every angle</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">On-Device Sensing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Mic className="w-5 h-5" />}
            title="On-Feeder Microphone"
            description="Captures bird songs right at the feeder, used to confirm species identity from call and song."
          />
          <FeatureCard
            icon={<Footprints className="w-5 h-5" />}
            title="Footfall Sensor on Each Perch"
            description="Confirms a visit the moment a bird lands, detecting presence by weight and foot coverage."
          />
          <FeatureCard
            icon={<Droplets className="w-5 h-5" />}
            title="Alternating Seed &amp; Nectar Trays"
            description="Seed and nectar sections alternate around the perimeter to attract the widest possible range of species."
          />
        </div>
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6">How Confirmation Works</h3>
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <ConfirmationStep icon={<Camera className="w-5 h-5" />} title="1. Visual Detection" description="AI cameras detect bird activity and shape at the feeder." />
          <ConfirmationConnector symbol="+" />
          <ConfirmationStep icon={<Volume2 className="w-5 h-5" />} title="2. Audio Confirmation" description="Bird songs are captured and matched against species call libraries." />
          <ConfirmationConnector symbol="+" />
          <ConfirmationStep icon={<Footprints className="w-5 h-5" />} title="3. Footfall Confirmation" description="Perch sensors confirm a bird actually landed and fed." />
          <ConfirmationConnector symbol="=" />
          <div className="flex-1 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-emerald-300">High-Confidence Visit Confirmed</div>
            <div className="text-[11px] text-stone-400">Species confirmed via three independent signals</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Multiple Ways to Set Up</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MountCard icon={<Signpost className="w-6 h-6" />} title="Post-Mounted" description="Bolt to a standard feeder pole for a stable, camp-friendly install at a consistent height." />
          <MountCard icon={<TreePine className="w-6 h-6" />} title="Tree-Hung" description="Suspend from a branch using the integrated hanging loop for a natural, low-footprint setup." />
          <MountCard icon={<Anchor className="w-6 h-6" />} title="Ground Stake" description="Anchor into open ground with a stake kit, ideal for gardens, trailheads, or temporary rental deployments." />
        </div>
      </div>

      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6">
        <div className="mb-6">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Surrounding Sensors, Beyond the Honeypot</h3>
          <p className="text-stone-400 text-sm max-w-3xl">
            The honeypot never works alone. It's one node in a networked array of external sensors (see the
            deployment map above) that together build a single high-confidence, multi-modal dataset for every visit.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Camera className="w-5 h-5" />}
            title="AI Cameras"
            description="Wide-area cameras capture approach, activity, and behavior from multiple angles around the feeder."
          />
          <FeatureCard
            icon={<Radio className="w-5 h-5" />}
            title="Microphone Array"
            description="External microphones capture bird songs from all directions for independent audio confirmation."
          />
          <FeatureCard
            icon={<Thermometer className="w-5 h-5" />}
            title="Environmental Sensor Station"
            description="Monitors weather, air quality, and habitat conditions to give every detection full context."
          />
        </div>
      </div>
    </>
  );
}

const HONEYPOT_SLIDES = [
  { title: 'Structure Sketch', caption: 'A realistic look at the honeypot in the field, showing the open interior, footfall sensors, and alternating trays.' },
  { title: 'Setup Walkthrough', caption: 'An animated, step-by-step look at how a counselor sets up a honeypot in the field.' },
];

function HoneypotSlideshow() {
  const [slide, setSlide] = useState(0);
  const goTo = (i) => setSlide((i + HONEYPOT_SLIDES.length) % HONEYPOT_SLIDES.length);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Honeypot Structure</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo(slide - 1)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {HONEYPOT_SLIDES.map((s, i) => (
              <button
                key={s.title}
                onClick={() => goTo(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-emerald-500' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo(slide + 1)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-400 hover:bg-stone-800/60 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div key={slide} className="fade-slide-in">
        {slide === 0 ? <HoneypotSketch /> : <SetupAnimation />}
        <p className="text-center text-xs text-stone-500 mt-4 max-w-xl mx-auto">{HONEYPOT_SLIDES[slide].caption}</p>
      </div>
    </div>
  );
}

function renderGrassBlades(y = 336) {
  return Array.from({ length: 40 }).map((_, i) => (
    <line key={i} x1={i * 17} y1={y} x2={i * 17 - 4} y2={y - 12} stroke="#3f5c34" strokeWidth="2" strokeLinecap="round" />
  ));
}

function sceneBackdrop() {
  return (
    <>
      <ellipse cx="90" cy="330" rx="110" ry="70" fill="#2f4a2a" opacity="0.3" />
      <ellipse cx="560" cy="340" rx="120" ry="75" fill="#2f4a2a" opacity="0.3" />
      <rect x="0" y="336" width="640" height="84" fill="#22301c" />
      <rect x="0" y="332" width="640" height="8" fill="#3a5a2f" />
      {renderGrassBlades(336)}
    </>
  );
}

function HoneypotSketch() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Realistic illustration of the honeypot feeder, showing the open interior, footfall sensors, and alternating seed and nectar trays">
      {sceneBackdrop()}
      <ellipse cx="320" cy="340" rx="190" ry="20" fill="#000000" opacity="0.3" />

      <path d="M320,300 L500,300 A180,58 0 0,1 410,352 Z" fill="#b3462c" />
      <path d="M320,300 L410,352 A180,58 0 0,1 230,352 Z" fill="#c99a52" />
      <path d="M320,300 L230,352 A180,58 0 0,1 140,300 Z" fill="#b3462c" />
      <path d="M320,300 L140,300 A180,58 0 0,1 230,248 Z" fill="#c99a52" />
      <path d="M320,300 L230,248 A180,58 0 0,1 410,248 Z" fill="#b3462c" />
      <path d="M320,300 L410,248 A180,58 0 0,1 500,300 Z" fill="#c99a52" />
      <ellipse cx="320" cy="300" rx="180" ry="58" fill="none" stroke="#1c1a16" strokeWidth="3" />
      <g fill="#7a5325" opacity="0.7">
        <circle cx="250" cy="330" r="2" /><circle cx="258" cy="336" r="2" /><circle cx="266" cy="326" r="2" />
        <circle cx="380" cy="330" r="2" /><circle cx="388" cy="322" r="2" /><circle cx="372" cy="338" r="2" />
      </g>
      <ellipse cx="460" cy="312" rx="18" ry="6" fill="#e8735a" opacity="0.6" />
      <ellipse cx="180" cy="312" rx="18" ry="6" fill="#e8735a" opacity="0.6" />

      <rect x="200" y="150" width="12" height="150" rx="4" fill="#a97c4f" />
      <rect x="207" y="150" width="4" height="150" fill="#7c5a37" opacity="0.5" />
      <rect x="260" y="165" width="10" height="140" rx="4" fill="#a97c4f" />
      <rect x="378" y="165" width="10" height="140" rx="4" fill="#a97c4f" />
      <rect x="432" y="150" width="12" height="150" rx="4" fill="#a97c4f" />
      <rect x="439" y="150" width="4" height="150" fill="#7c5a37" opacity="0.5" />

      <polygon points="320,60 320,160 470,160" fill="#284a30" />
      <polygon points="320,60 170,160 320,160" fill="#3f6b4f" />
      <polygon points="320,60 470,160 320,185 170,160" fill="none" stroke="#1c2e20" strokeWidth="2" strokeLinejoin="round" />
      <g stroke="#1c2e20" strokeWidth="1" opacity="0.4">
        <line x1="200" y1="140" x2="230" y2="128" /><line x1="220" y1="150" x2="250" y2="138" />
        <line x1="420" y1="140" x2="450" y2="128" opacity="0.25" /><line x1="400" y1="150" x2="430" y2="138" opacity="0.25" />
      </g>

      <circle cx="320" cy="44" r="7" fill="none" stroke="#78716c" strokeWidth="3" />
      <line x1="320" y1="51" x2="320" y2="60" stroke="#78716c" strokeWidth="3" />

      <rect x="352" y="70" width="10" height="18" rx="4" fill="#292524" />
      <circle cx="357" cy="72" r="3" fill="#57534e" />

      <line x1="160" y1="215" x2="480" y2="215" stroke="#dcd3c4" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.55" />

      <rect x="180" y="272" width="26" height="6" rx="3" fill="#8a6239" />
      <rect x="446" y="272" width="26" height="6" rx="3" fill="#8a6239" />
      <ellipse cx="466" cy="262" rx="12" ry="8" fill="#a3352b" />
      <circle cx="476" cy="256" r="4.5" fill="#a3352b" />
      <polygon points="480,256 488,254 480,259" fill="#d19a3d" />

      <ellipse cx="206" cy="278" rx="7" ry="3" fill="#1c1917" />
      <circle cx="206" cy="278" r="3" fill="#34d399" />
      <circle cx="206" cy="278" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;10;3" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="446" cy="278" rx="7" ry="3" fill="#1c1917" />
      <circle cx="446" cy="278" r="3" fill="#34d399" />
      <circle cx="446" cy="278" r="3" fill="none" stroke="#34d399" strokeWidth="1.5">
        <animate attributeName="r" values="3;10;3" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
      </circle>

      <line x1="357" y1="72" x2="420" y2="46" stroke="#a8a29e" strokeWidth="1" />
      <text x="424" y="50" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">On-feeder microphone</text>

      <line x1="206" y1="278" x2="80" y2="230" stroke="#a8a29e" strokeWidth="1" />
      <text x="14" y="226" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Footfall sensor, each perch</text>

      <text x="235" y="205" fontSize="11" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Open, see-through interior</text>

      <line x1="460" y1="312" x2="560" y2="360" stroke="#a8a29e" strokeWidth="1" />
      <text x="500" y="376" fontSize="11" fill="#fca5a5" fontFamily="ui-sans-serif, system-ui">Nectar</text>
      <text x="500" y="390" fontSize="11" fill="#e7c07d" fontFamily="ui-sans-serif, system-ui">/ Seed tray</text>
    </svg>
  );
}

function SceneKit() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of an open field pack with the honeypot sensors and hardware laid out beside it">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="170" ry="16" fill="#000000" opacity="0.25" />

      <path d="M235,220 q-14,0 -14,20 v90 q0,20 18,20 h150 q18,0 18,-20 v-90 q0,-20 -14,-20 Z" fill="#5b6b47" />
      <path d="M235,220 q-14,0 -14,20 v90 q0,20 18,20 h150 q18,0 18,-20 v-90 q0,-20 -14,-20 Z" fill="none" stroke="#3f4a33" strokeWidth="2" />
      <path d="M239,222 q40,-46 122,-4 l-10,14 q-52,-30 -102,4 Z" fill="#71835b" />
      <path d="M239,222 q40,-46 122,-4" fill="none" stroke="#3f4a33" strokeWidth="3" strokeLinecap="round" />
      <path d="M250,258 q-20,20 0,60" stroke="#3f4a33" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M390,258 q20,20 0,60" stroke="#3f4a33" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="270" y="290" width="80" height="40" rx="6" fill="#4c5a3c" stroke="#3f4a33" strokeWidth="1.5" />

      <polygon points="150,300 120,330 180,330" fill="#3f6b4f" stroke="#1c2e20" strokeWidth="1.5" />
      <text x="150" y="348" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Honeypot</text>

      <rect x="440" y="300" width="30" height="20" rx="3" fill="#1c1917" stroke="#57534e" strokeWidth="1.5" />
      <circle cx="470" cy="310" r="7" fill="#3f3d38" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="470" cy="310" r="3" fill="#93c5fd" opacity="0.6" />
      <text x="455" y="335" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Camera</text>

      <rect x="495" y="295" width="12" height="26" rx="6" fill="#1c1917" stroke="#57534e" strokeWidth="1.5" />
      <line x1="501" y1="321" x2="501" y2="332" stroke="#57534e" strokeWidth="2" />
      <text x="501" y="345" fontSize="10" textAnchor="middle" fill="#e7e5e4" fontFamily="ui-sans-serif, system-ui">Mic</text>
    </svg>
  );
}

function SceneMount() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of the honeypot being mounted onto a post in the ground">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="140" ry="14" fill="#000000" opacity="0.25" />

      <rect x="310" y="180" width="20" height="176" rx="4" fill="#8a6239" />
      <rect x="317" y="180" width="6" height="176" fill="#6b4a28" opacity="0.5" />

      <path d="M320,110 L400,110 A80,26 0 0,1 320,136 A80,26 0 0,1 240,110 A80,26 0 0,1 320,84 Z" fill="#b3462c" opacity="0.9" />
      <ellipse cx="320" cy="110" rx="80" ry="26" fill="none" stroke="#1c1a16" strokeWidth="2" />
      <rect x="270" y="55" width="6" height="55" fill="#a97c4f" />
      <rect x="366" y="55" width="6" height="55" fill="#a97c4f" />
      <polygon points="320,20 320,55 400,55" fill="#284a30" />
      <polygon points="320,20 240,55 320,55" fill="#3f6b4f" />
      <polygon points="320,20 400,55 320,68 240,55" fill="none" stroke="#1c2e20" strokeWidth="1.5" />

      <path d="M215,90 q-16,20 0,45" stroke="#a8a29e" strokeWidth="2" fill="none" />
      <path d="M425,90 q16,20 0,45" stroke="#a8a29e" strokeWidth="2" fill="none" />

      <circle cx="320" cy="178" r="5" fill="none" stroke="#e7e5e4" strokeWidth="1.5" />
      <line x1="320" y1="173" x2="320" y2="183" stroke="#e7e5e4" strokeWidth="1.5" />
      <line x1="315" y1="178" x2="325" y2="178" stroke="#e7e5e4" strokeWidth="1.5" />
    </svg>
  );
}

function SceneSensors() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of external cameras and microphones being placed around the mounted honeypot">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="150" ry="15" fill="#000000" opacity="0.25" />

      <rect x="310" y="270" width="20" height="70" rx="3" fill="#8a6239" />
      <path d="M320,220 L370,220 A50,16 0 0,1 320,236 A50,16 0 0,1 270,220 A50,16 0 0,1 320,204 Z" fill="#b3462c" />
      <polygon points="320,170 270,200 370,200" fill="#3f6b4f" stroke="#1c2e20" strokeWidth="1.5" />

      <line x1="140" y1="340" x2="140" y2="270" stroke="#57534e" strokeWidth="3" />
      <rect x="126" y="250" width="28" height="20" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="140" cy="260" r="6" fill="#3f3d38" />
      <line x1="154" y1="260" x2="270" y2="222" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />

      <line x1="500" y1="340" x2="500" y2="270" stroke="#57534e" strokeWidth="3" />
      <rect x="486" y="250" width="28" height="20" rx="3" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <circle cx="500" cy="260" r="6" fill="#3f3d38" />
      <line x1="486" y1="260" x2="370" y2="222" stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />

      <line x1="220" y1="356" x2="220" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="214" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
      <line x1="420" y1="356" x2="420" y2="300" stroke="#57534e" strokeWidth="2.5" />
      <rect x="414" y="286" width="12" height="18" rx="6" fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />
    </svg>
  );
}

function SceneData() {
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Sketch of a tablet displaying live visit data with the honeypot in the background">
      {sceneBackdrop()}
      <ellipse cx="320" cy="356" rx="150" ry="15" fill="#000000" opacity="0.25" />

      <g opacity="0.75">
        <rect x="470" y="240" width="14" height="60" rx="2" fill="#8a6239" />
        <path d="M477,200 L512,200 A35,12 0 0,1 477,212 A35,12 0 0,1 442,200 A35,12 0 0,1 477,188 Z" fill="#b3462c" />
        <polygon points="477,160 442,182 512,182" fill="#3f6b4f" />
      </g>

      <path d="M440,220 q-40,-10 -80,20" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M440,230 q-60,0 -110,45" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.05;0.5" dur="2s" begin="0.4s" repeatCount="indefinite" />
      </path>

      <rect x="150" y="230" width="130" height="90" rx="10" fill="#1c1917" stroke="#57534e" strokeWidth="2" />
      <rect x="160" y="240" width="110" height="70" rx="4" fill="#0c1f18" />
      <rect x="172" y="288" width="10" height="14" fill="#34d399" />
      <rect x="188" y="278" width="10" height="24" fill="#34d399" />
      <rect x="204" y="266" width="10" height="36" fill="#34d399" />
      <rect x="220" y="272" width="10" height="30" fill="#34d399" />
      <path d="M172,262 L188,250 L204,254 L220,244 L240,248" stroke="#6ee7b7" strokeWidth="2" fill="none" />

      <line x1="180" y1="320" x2="160" y2="356" stroke="#57534e" strokeWidth="3" />
      <line x1="250" y1="320" x2="270" y2="356" stroke="#57534e" strokeWidth="3" />
    </svg>
  );
}

const SETUP_STEPS = [
  { title: '1. Pack the Kit', description: 'Open the field pack to reveal the honeypot, camera, and microphone.', render: SceneKit },
  { title: '2. Mount the Honeypot', description: 'Lower the assembled honeypot onto its post, tree mount, or ground stake.', render: SceneMount },
  { title: '3. Deploy the Sensors', description: 'Place external cameras and microphones around the perimeter.', render: SceneSensors },
  { title: '4. Collect the Data', description: 'High-confidence visits start streaming to the dashboard.', render: SceneData },
];

function SetupAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % SETUP_STEPS.length), 4000);
    return () => clearInterval(id);
  }, []);

  const Current = SETUP_STEPS[step].render;

  return (
    <div>
      <div key={step} className="fade-slide-in">
        <Current />
        <div className="text-center mt-2">
          <div className="text-sm font-bold text-emerald-300">{SETUP_STEPS[step].title}</div>
          <div className="text-xs text-stone-500 mt-1">{SETUP_STEPS[step].description}</div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {SETUP_STEPS.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setStep(i)}
            aria-label={`Go to ${s.title}`}
            className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-emerald-500' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`}
          />
        ))}
      </div>
    </div>
  );
}

function SensorDeploymentMap() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      <svg viewBox="0 0 480 480" className="w-full max-w-md mx-auto h-auto" role="img" aria-label="Top-down map of sensor deployment around the honeypot">
        <path d="M110,110 L336.5,149.9 A230,230 0 0,1 149.9,336.5 Z" fill="#10b981" opacity="0.08" stroke="#34d399" strokeWidth="1" />
        <path d="M370,110 L330.1,336.5 A230,230 0 0,1 143.5,149.9 Z" fill="#10b981" opacity="0.08" stroke="#34d399" strokeWidth="1" />

        <circle cx="90" cy="370" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="240" cy="430" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="390" cy="370" r="170" fill="#f59e0b" opacity="0.05" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />

        <polygon points="240,222 255,231 255,249 240,258 225,249 225,231" fill="#0c0a09" stroke="#34d399" strokeWidth="2" />
        <text x="240" y="276" fontSize="11" textAnchor="middle" fill="#6ee7b7" fontFamily="monospace">Honeypot</text>

        <circle cx="110" cy="110" r="6" fill="#34d399" />
        <text x="110" y="98" fontSize="10" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace">Camera 1</text>
        <circle cx="370" cy="110" r="6" fill="#34d399" />
        <text x="370" y="98" fontSize="10" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace">Camera 2</text>

        <circle cx="90" cy="370" r="5" fill="#fbbf24" />
        <text x="90" y="358" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 1</text>
        <circle cx="240" cy="430" r="5" fill="#fbbf24" />
        <text x="240" y="450" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 2</text>
        <circle cx="390" cy="370" r="5" fill="#fbbf24" />
        <text x="390" y="358" fontSize="10" textAnchor="middle" fill="#fde68a" fontFamily="monospace">Mic 3</text>
      </svg>

      <div className="flex flex-row lg:flex-col gap-4 shrink-0">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-sm bg-emerald-500/20 border border-emerald-400 inline-block"></span>
          Camera field of view
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-full border border-amber-400 border-dashed inline-block"></span>
          Microphone pickup range
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="w-4 h-4 rounded-sm bg-stone-950 border border-emerald-400 inline-block"></span>
          Honeypot (center)
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors flex flex-col gap-3">
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-900/40 text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-stone-100 mb-1">{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function MountCard({ icon, title, description }) {
  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors flex flex-col gap-3">
      <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-stone-950/50 border border-stone-800 text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-stone-100 mb-1">{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ConfirmationStep({ icon, title, description }) {
  return (
    <div className="flex-1 bg-stone-950/50 border border-stone-800 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
      <div className="p-2 bg-stone-900 text-emerald-400 rounded-xl">{icon}</div>
      <div className="text-sm font-bold text-stone-200">{title}</div>
      <div className="text-[11px] text-stone-400">{description}</div>
    </div>
  );
}

function ConfirmationConnector({ symbol }) {
  return (
    <div className="flex items-center justify-center text-stone-600 font-bold text-lg shrink-0 lg:w-6">
      {symbol}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-TAB 2: Analytics
// ---------------------------------------------------------------------------

function AnalyticsView() {
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedRange, setSelectedRange] = useState('Today');

  const multiplier = RANGE_MULTIPLIER[selectedRange];

  const stats = useMemo(() => computeStats(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);
  const insight = useMemo(() => buildInsight(selectedRange, selectedSpecies, stats), [selectedRange, selectedSpecies, stats]);
  const chartBars = useMemo(() => buildChartBars(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);
  const heatmapCells = useMemo(() => buildHeatmapCells(selectedRange, selectedSpecies), [selectedRange, selectedSpecies]);

  const tableRows = useMemo(
    () =>
      SPECIES_DATA.filter((s) => selectedSpecies === 'all' || s.species === selectedSpecies).map((s) => ({
        ...s,
        visits: Math.round(s.visits * multiplier),
        totalTime: formatDuration(s.minutes * multiplier),
      })),
    [selectedSpecies, multiplier]
  );

  return (
    <>
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-widest shrink-0">
          <Filter className="w-4 h-4" /> Filters
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="inline-flex bg-stone-950/50 border border-stone-800 rounded-xl p-1 gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  selectedRange === range ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="appearance-none bg-stone-950/50 border border-stone-800 text-stone-300 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 outline-none hover:border-emerald-500/30 transition-colors cursor-pointer"
            >
              <option value="all">All Species</option>
              {SPECIES_DATA.map((s) => (
                <option key={s.species} value={s.species}>
                  {s.species}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <button className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-emerald-400 transition-colors shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              {selectedRange} At A Glance{selectedSpecies !== 'all' ? ` - ${selectedSpecies}` : ''}
            </h3>
            <span className="text-stone-400 text-[10px] font-mono bg-stone-950 border border-stone-800 px-2 py-1 rounded-lg">
              {DATE_LABEL[selectedRange]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6 flex-1">
            <MetricCard value={stats.totalVisits.toLocaleString()} label="Total Visits" />
            <MetricCard value={String(stats.speciesDetected)} label="Species Detected" />
            <MetricCard value={stats.totalFeedTime} label="Total Feed Time" />
            <MetricCard value={stats.peakActivity} label="Peak Activity" />
          </div>
        </div>

        <div className="lg:col-span-8 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Visits Over Time</h3>
            <div className="flex items-center space-x-4 text-[10px] uppercase font-bold text-stone-500">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-emerald-500 mr-1.5"></span> Visits</span>
            </div>
          </div>
          <div className="h-40 flex items-end justify-between gap-1 flex-1 pb-2 border-b border-stone-800">
            {chartBars.map((bar) => (
              <div
                key={bar.id}
                className="w-full bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-400"
                style={{ height: `${bar.height}%`, opacity: bar.height > 30 ? 1 : 0.4 }}
              ></div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone-500 uppercase mt-2 font-mono">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Activity Heatmap</h3>
            <span className="text-[10px] text-stone-500 font-bold bg-stone-950 px-2 py-1 rounded border border-stone-800">
              0 - 1000
            </span>
          </div>
          <div className="flex flex-1 items-stretch">
            <div className="flex flex-col justify-between text-[10px] font-mono text-stone-500 mr-3 py-1">
              <span>1 AM</span>
              <span>5 AM</span>
              <span>9 AM</span>
              <span>1 PM</span>
              <span>5 PM</span>
              <span>Night</span>
            </div>
            <div className="flex-1 grid grid-cols-13 grid-rows-6 gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              {heatmapCells.map((cell) => (
                <div key={cell.id} className="bg-emerald-500 rounded-sm" style={{ opacity: cell.op }}></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-stone-500 mt-3 ml-[42px]">
            <span>1</span>
            <span>4</span>
            <span>7</span>
            <span>10</span>
            <span>13</span>
          </div>
        </div>

        <div className="lg:col-span-7 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Species Visit Summary</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="text-[10px] text-stone-500 uppercase tracking-wider border-b border-stone-800">
                <tr>
                  <th className="pb-3 font-semibold">Species</th>
                  <th className="pb-3 font-semibold text-right">Visits</th>
                  <th className="pb-3 font-semibold text-right">Total Time</th>
                  <th className="pb-3 font-semibold text-right">Avg Visit</th>
                  <th className="pb-3 font-semibold text-right">Peak Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <SpeciesRow
                      key={row.species}
                      species={row.species}
                      visits={row.visits}
                      totalTime={row.totalTime}
                      avgVisit={row.avgVisit}
                      peak={formatPeakWindow(row.peakHour, 0.5)}
                      highlight={row.highlight}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-500 text-xs">
                      No visits recorded for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Smart Alerts</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertCard
            icon={<Droplets className="w-5 h-5" />}
            title="Nectar Running Low"
            description="Station 4's nectar tray is at 12% capacity. Refill within the next day to maintain visit rates."
            severity="warning"
          />
          <AlertCard
            icon={<Battery className="w-5 h-5" />}
            title="Camera Battery Low"
            description="External camera #2 is at 15% battery. Solar charging may be obstructed by nearby foliage."
            severity="warning"
          />
          <AlertCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Unusual Activity Spike"
            description="Visit volume at 6 AM was 3x the seasonal average. Worth a quick check of the feed trays."
            severity="info"
          />
        </div>
      </div>

      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-lg shadow-emerald-900/5 pb-12">
        <div className="p-4 bg-emerald-900/40 text-emerald-400 rounded-2xl shrink-0">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">What This Means For You</h3>
          <p className="text-stone-300 text-sm leading-relaxed max-w-4xl">
            <span className="font-semibold text-emerald-300">Summary:</span> {insight.summary}{' '}
            <br className="hidden sm:block" />
            <span className="font-semibold text-emerald-300">Context:</span> {insight.context}{' '}
            <br className="hidden sm:block" />
            <span className="font-semibold text-emerald-300">Recommendation:</span> {insight.recommendation}
          </p>
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="flex flex-col justify-center items-center text-center p-4 bg-stone-950/50 rounded-2xl border border-stone-800 hover:border-emerald-500/30 transition-colors">
      <div className="text-2xl md:text-3xl font-black text-stone-100 tracking-tighter mb-1">{value}</div>
      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function SpeciesRow({ species, visits, totalTime, avgVisit, peak, highlight = false }: { key?: React.Key; species: string; visits: number; totalTime: string; avgVisit: string; peak: string; highlight?: boolean }) {
  return (
    <tr className={`transition-colors ${highlight ? 'bg-emerald-950/10' : 'hover:bg-stone-800/30'}`}>
      <td className={`py-3 ${highlight ? 'text-emerald-400 font-semibold' : 'text-stone-200'}`}>{species}</td>
      <td className="py-3 text-right font-mono text-xs">{visits.toLocaleString()}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{totalTime}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{avgVisit}</td>
      <td className="py-3 text-right font-mono text-xs text-stone-400">{peak}</td>
    </tr>
  );
}

function AlertCard({ icon, title, description, severity }) {
  const styles =
    severity === 'warning'
      ? { wrap: 'bg-amber-950/20 border-amber-500/20', iconWrap: 'bg-amber-900/30 text-amber-400', title: 'text-amber-300' }
      : { wrap: 'bg-emerald-950/20 border-emerald-500/20', iconWrap: 'bg-emerald-900/30 text-emerald-400', title: 'text-emerald-300' };

  return (
    <div className={`rounded-2xl border p-5 flex gap-4 ${styles.wrap}`}>
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl ${styles.iconWrap}`}>{icon}</div>
      <div>
        <h4 className={`text-sm font-semibold mb-1 ${styles.title}`}>{title}</h4>
        <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}function GestureDroneView() {
  const actions = [
    { gesture: "Open Palm", command: "Hover / Lock", icon: <Hand className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Fist", command: "Land", icon: <ChevronDown className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Point Up", command: "Ascend", icon: <TrendingUp className="w-5 h-5 text-indigo-400" /> },
    { gesture: "Directional", command: "Vector Flight", icon: <Navigation className="w-5 h-5 text-indigo-400" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-stone-900/80 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden shadow-lg shadow-indigo-900/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-stone-50 tracking-tight mb-2 flex items-center gap-3">
              <Crosshair className="w-8 h-8 text-indigo-400" />
              AI Gesture-Controlled Drone Teleoperation
            </h3>
            <p className="text-indigo-300 font-medium tracking-wide text-sm mb-6 uppercase">
              Hands-Free UAV Navigation for Field Researchers &amp; Wildlife Monitoring
            </p>
            <div className="space-y-4">
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Real-Time Detection Engine
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Powered by optimized YOLO vision models and MediaPipe pipelines (<code className="text-emerald-400 font-mono">realtime_detection.py</code>) for low-latency hand tracking.
                </p>
              </div>
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" /> Dynamic Action Mapping
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Translates real-time static &amp; dynamic hand gestures (<code className="text-emerald-400 font-mono">actions.json</code>) into drone flight commands (e.g., Takeoff, Land, Vector Direction, Hover/Lock, Camera Tilt).
                </p>
              </div>
              <div className="bg-stone-950/50 p-5 rounded-2xl border border-stone-800 hover:border-indigo-500/30 transition-colors">
                <h4 className="text-sm font-bold text-stone-200 mb-2 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" /> High-Precision Model Metrics
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Built on validated YOLO detection runs with optimized Box Precision-Recall (BoxPR) and F1-score performance for outdoor field environments.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-6">
            <div className="bg-stone-950/80 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Interactive Command Matrix</h4>
              <div className="grid grid-cols-2 gap-3">
                {actions.map((act, i) => (
                  <div key={i} className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-500/50 transition-all hover:scale-[1.02]">
                    <div className="p-3 bg-indigo-950/60 rounded-xl shadow-inner border border-indigo-500/10">{act.icon}</div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">{act.gesture}</div>
                      <div className="text-sm text-stone-100 font-semibold">{act.command}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-950/80 border border-indigo-500/20 rounded-3xl p-6">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Technical Specs &amp; Performance</h4>
              <ul className="space-y-4">
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Detection Engine</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold bg-indigo-950/30 px-2 py-1 rounded border border-indigo-500/20">YOLOv8 / MediaPipe</span>
                </li>
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Control Latency</span>
                  <span className="font-mono text-emerald-400 text-xs font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> &lt; 50ms</span>
                </li>
                <li className="flex justify-between items-center text-sm border-b border-stone-800/50 pb-3">
                  <span className="text-stone-400">Action Config</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold">actions.json</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span className="text-stone-400">Deployment Field</span>
                  <span className="font-mono text-indigo-300 text-xs font-semibold">Touchless Aerial Monitoring</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
