import React, { useState } from 'react';
import { Download, Settings2, Package, ArrowRight, Check, TerminalSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function TabOnboarding() {
  const [activeSubTab, setActiveSubTab] = useState<'quickstart' | 'diy' | 'rental'>('quickstart');

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 p-8 grid grid-cols-12 gap-8"
    >
      <div className="col-span-3 flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-stone-50 mb-6">Onboarding <br/><span className="text-emerald-500 underline decoration-stone-800 underline-offset-8">Hub</span></h2>
        <SubTabButton
          active={activeSubTab === 'quickstart'}
          onClick={() => setActiveSubTab('quickstart')}
          label="Quick Start"
        />
        <SubTabButton
          active={activeSubTab === 'diy'}
          onClick={() => setActiveSubTab('diy')}
          label="DIY Hardware"
        />
        <SubTabButton
          active={activeSubTab === 'rental'}
          onClick={() => setActiveSubTab('rental')}
          label="Request Kit"
        />
      </div>

      <div className="col-span-9 bg-stone-900 rounded-[2rem] p-10 flex flex-col shadow-2xl relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeSubTab === 'quickstart' && <QuickStart key="quickstart" />}
          {activeSubTab === 'diy' && <DiyConfigurator key="diy" />}
          {activeSubTab === 'rental' && <RentalService key="rental" />}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function SubTabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl font-medium transition-colors ${
        active 
          ? 'bg-stone-800 text-emerald-400 border border-emerald-500/20' 
          : 'text-stone-400 hover:bg-stone-900 border border-transparent'
      }`}
    >
      {label}
    </button>
  );
}

function QuickStart() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      const scriptContent = `#!/bin/bash
echo "Setting up I-SAW Backpack Portal..."

# Clone the repository
git clone https://github.com/xw0108/Backpack.git
cd Backpack

echo "Installing dependencies (Test Mode)..."
./install.sh

echo "Starting Backpack Portal..."
./start.sh
`;

      const blob = new Blob([scriptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'setup-drone.sh';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <h3 className="text-xl font-bold mb-2">I-SAW Backpack Portal</h3>
      <p className="text-stone-400 text-sm mb-6 max-w-2xl">
        Deploy the full field-kit control center and gesture-controlled drone flight system. The script automatically handles environment setup, Python dependencies, and pretrained ONNX models.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
        {/* Left Col: Setup & Run */}
        <div className="bg-stone-950/50 rounded-2xl border border-stone-800 p-6 flex flex-col">
          <h4 className="text-sm font-bold text-stone-200 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            Quick Setup (Linux x86_64)
          </h4>
          <p className="text-xs text-stone-400 mb-4">
            Download the deployment script on the right, which will automatically fetch the source code, install dependencies, and run it safely in test mode with no drone connected.
          </p>
          
          <div className="bg-black rounded-xl p-4 font-mono text-[11px] overflow-hidden border border-stone-800 relative flex-1 flex flex-col justify-center">
            <div className="flex space-x-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <div className="text-stone-500 mb-1"># 1. Give execution permission</div>
            <div className="text-emerald-500 mb-3">$ chmod +x setup-drone.sh</div>
            
            <div className="text-stone-500 mb-1"># 2. Run the automated deployment script</div>
            <div className="text-emerald-500 mb-3">$ ./setup-drone.sh</div>

            <div className="text-stone-500 mt-2">Setting up I-SAW Backpack Portal...</div>
            <div className="text-stone-500">Cloning into 'Backpack'...</div>
            <div className="text-stone-500">Installing dependencies (Test Mode)...</div>
            <div className="text-stone-500">Starting Backpack Portal...</div>
            <div className="text-stone-300 mt-2">Server running on <span className="text-emerald-400 font-bold">http://localhost:8000</span></div>
          </div>
        </div>

        {/* Right Col: Feature Overview & Download */}
        <div className="flex flex-col gap-4">
          <div className="bg-stone-950/50 rounded-2xl border border-stone-800 p-6 flex-1">
             <h4 className="text-sm font-bold text-stone-200 mb-4">Key Features</h4>
             <ul className="space-y-3 text-sm text-stone-300">
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 mt-0.5">&bull;</span>
                 <span><strong className="text-stone-100">45+ Pre-trained Gestures:</strong> Detects likes, peace signs, fists, stops, and more out of the box using ONNX.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 mt-0.5">&bull;</span>
                 <span><strong className="text-stone-100">Live & Test Modes:</strong> Test safely with no aircraft, or run with <code className="text-emerald-400 font-mono text-xs">--live</code> to fly a real Parrot Anafi.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 mt-0.5">&bull;</span>
                 <span><strong className="text-stone-100">Bounded Movement:</strong> Prevents fly-aways by tracking balanced opposing gestures.</span>
               </li>
             </ul>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-2xl flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <span className="flex items-center justify-center">
                 <span className="animate-spin h-5 w-5 border-2 border-stone-950 border-t-transparent rounded-full mr-3"></span>
                 PACKAGING MODULE...
              </span>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                GET DEPLOYMENT PACKAGE
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DiyConfigurator() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      const config = {
        network: {
          broker_type: "local_mqtt",
          fallback_tacc: "https://tacc-ingest.ecology-edge.net",
          discovery: "auto_mesh"
        },
        hardware: {
          audio_sentinel: "active",
          camera_trap: "sleep_until_wake",
          power_mode: "ultra_low"
        },
        provisioning: {
          auto_register: true,
          keys_generated: true
        }
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'backpack-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <h3 className="text-xl font-bold mb-2">DIY Configuration Generator</h3>
      <p className="text-stone-400 text-sm mb-8">For custom Raspberry Pi assemblies, generate your unique ecosystem provisioning file.</p>
      
      <div className="bg-stone-950/50 border border-stone-800 p-8 rounded-2xl mb-8 flex-1">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block">Topology</label>
            <select className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-300 focus:outline-none focus:border-emerald-500">
              <option>Concentric-Star (Default)</option>
              <option>Mesh Relay</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block">Cloud Target</label>
            <input type="text" value="tacc.cloud.edu" className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-300 focus:outline-none" readOnly />
          </div>
        </div>
        
        <p className="text-xs text-stone-500 mt-8 max-w-lg leading-relaxed">
           This payload maps your local MQTT broker topologies, Docker Compose overrides, and TACC cloud endpoints. Placing this <code className="text-emerald-400 font-mono">config.json</code> file on your device allows the platform to automatically read, register your custom backpack, and provision secure access keys.
        </p>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {downloading ? (
          <span className="flex h-5 w-5 items-center justify-center mr-2">
             <span className="animate-spin h-4 w-4 border-2 border-stone-950 border-t-transparent rounded-full"></span>
          </span>
        ) : (
          <Download className="w-5 h-5 mr-2" />
        )}
        {downloading ? 'COMPILING JSON...' : 'GENERATE SAMPLE config.json FILE'}
      </button>
    </motion.div>
  );
}

function RentalService() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full text-center py-12"
    >
      <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 relative">
         <div className="absolute top-2 right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
        <Package className="w-10 h-10 text-emerald-500" />
      </div>
      <h3 className="text-2xl font-bold mb-4 text-stone-50">Request a Prebuilt Kit</h3>
      <p className="text-stone-400 text-sm max-w-md mb-8 leading-relaxed">
        Ready-to-use AI backpacks for K-12 camps. No setup required. We ship it fully configured to your campsite. Arrives charged, connected, and ready to deploy into the wilderness.
      </p>

      <a 
        href="#"
        onClick={(e) => e.preventDefault()}
        className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-full text-lg shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 group inline-flex items-center gap-2"
      >
        Open Intake Form
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </a>
      <p className="mt-6 text-xs text-stone-600">Rental services available for academic sessions starting 2024.</p>
    </motion.div>
  );
}
