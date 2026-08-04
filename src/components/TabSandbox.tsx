import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Anchor,
  Battery,
  Bell,
  Camera,
  ChevronDown,
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
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Honeypot Structure</h3>
        <HoneypotStructureDiagram />
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

function HoneypotStructureDiagram() {
  return (
    <svg viewBox="0 0 640 310" className="w-full h-auto max-w-3xl mx-auto" role="img" aria-label="Diagram of the honeypot structure">
      <circle cx="320" cy="14" r="6" fill="none" stroke="#10b981" strokeWidth="2" />
      <line x1="320" y1="20" x2="320" y2="34" stroke="#10b981" strokeWidth="2" />
      <polygon points="320,34 470,108 320,132 170,108" fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
      <line x1="320" y1="34" x2="320" y2="132" stroke="#34d399" strokeWidth="1.5" opacity="0.5" />
      <line x1="205" y1="112" x2="205" y2="228" stroke="#57534e" strokeWidth="3" />
      <line x1="265" y1="122" x2="265" y2="228" stroke="#57534e" strokeWidth="3" />
      <line x1="375" y1="122" x2="375" y2="228" stroke="#57534e" strokeWidth="3" />
      <line x1="435" y1="112" x2="435" y2="228" stroke="#57534e" strokeWidth="3" />
      <line x1="150" y1="170" x2="490" y2="170" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" />
      <polygon points="150,170 160,165 160,175" fill="#10b981" opacity="0.6" />
      <polygon points="490,170 480,165 480,175" fill="#10b981" opacity="0.6" />
      <rect x="140" y="228" width="60" height="26" fill="#d97706" opacity="0.55" />
      <rect x="200" y="228" width="60" height="26" fill="#e11d48" opacity="0.55" />
      <rect x="260" y="228" width="60" height="26" fill="#d97706" opacity="0.55" />
      <rect x="320" y="228" width="60" height="26" fill="#e11d48" opacity="0.55" />
      <rect x="380" y="228" width="60" height="26" fill="#d97706" opacity="0.55" />
      <rect x="440" y="228" width="60" height="26" fill="#e11d48" opacity="0.55" />
      <rect x="140" y="228" width="360" height="26" fill="none" stroke="#78716c" strokeWidth="1.5" rx="4" />
      <line x1="100" y1="254" x2="540" y2="254" stroke="#44403c" strokeWidth="1" />

      <circle cx="320" cy="34" r="3" fill="#34d399" />
      <line x1="320" y1="34" x2="380" y2="4" stroke="#57534e" strokeWidth="1" strokeDasharray="3 3" />
      <text x="384" y="8" fontSize="11" fill="#6ee7b7" fontFamily="monospace">On-feeder microphone</text>

      <circle cx="205" cy="228" r="3" fill="#34d399" />
      <line x1="205" y1="228" x2="90" y2="278" stroke="#57534e" strokeWidth="1" strokeDasharray="3 3" />
      <text x="10" y="290" fontSize="11" fill="#6ee7b7" fontFamily="monospace">Footfall sensor, each perch</text>

      <text x="255" y="160" fontSize="11" fill="#6ee7b7" fontFamily="monospace">Open, see-through interior</text>

      <line x1="440" y1="254" x2="500" y2="278" stroke="#57534e" strokeWidth="1" strokeDasharray="3 3" />
      <text x="440" y="292" fontSize="11" fill="#fbbf24" fontFamily="monospace">Seed</text>
      <text x="480" y="292" fontSize="11" fill="#fb7185" fontFamily="monospace">/ Nectar tray</text>
    </svg>
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
