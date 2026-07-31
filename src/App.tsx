/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CanvasBackground } from './components/CanvasBackground';
import { TabVision } from './components/TabVision';
import { TabSandbox } from './components/TabSandbox';
import { TabOnboarding } from './components/TabOnboarding';
import { BrainCircuit } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'vision' | 'sandbox' | 'onboarding'>('vision');

  return (
    <div className="fixed inset-0 bg-stone-950 text-stone-200 font-sans overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <CanvasBackground />
      </div>

      <div className="relative flex flex-col h-full z-10">
        <header className="flex items-center justify-between px-8 py-4 border-b border-emerald-900/30 bg-stone-950/80 backdrop-blur-md">
          <div className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-xl flex items-center justify-center border border-indigo-500/30 shadow-md shrink-0 rotate-90">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-emerald-50 flex items-center gap-3 whitespace-nowrap">
              I-SAW <span className="text-emerald-400 whitespace-nowrap">Portal</span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wider whitespace-nowrap shrink-0">
                ICICLE-AI
              </span>
            </span>
          </div>

          <nav className="hidden md:flex space-x-1 p-1 bg-stone-900/50 rounded-full border border-stone-800">
            <NavButton 
              active={activeTab === 'vision'} 
              onClick={() => setActiveTab('vision')}
              label="Project Vision & Strategic Pillars"
              subtitle="What we're doing"
            />
            <NavButton 
              active={activeTab === 'sandbox'} 
              onClick={() => setActiveTab('sandbox')}
              label="Data Sandbox & Functional Capabilities"
              subtitle="What you get"
            />
            <NavButton 
              active={activeTab === 'onboarding'} 
              onClick={() => setActiveTab('onboarding')}
              label="Onboarding Hub"
              subtitle="How to start"
            />
          </nav>

          <div className="md:hidden flex gap-2">
             <select 
               className="bg-stone-900 border border-stone-800 text-stone-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
               value={activeTab}
               onChange={(e) => setActiveTab(e.target.value as any)}
             >
               <option value="vision">Project Vision</option>
               <option value="sandbox">Data Sandbox</option>
               <option value="onboarding">Onboarding Hub</option>
             </select>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center px-3 py-1 bg-emerald-950/40 border border-emerald-500/20 rounded text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              EDGE_NODE_ACTIVE
            </div>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden">
          {activeTab === 'vision' && <TabVision />}
          {activeTab === 'sandbox' && <TabSandbox />}
          {activeTab === 'onboarding' && <TabOnboarding />}
        </main>
        
        <footer className="px-8 py-4 border-t border-stone-900 bg-stone-950 flex justify-between items-center text-[10px] text-stone-600 font-mono uppercase tracking-widest hidden md:flex">
           <div>&copy; 2024 I-SAW: SENSING AND ANALYTICS ON WILDLIFE</div>
           <div className="flex space-x-6">
             <span>MQTT_V3.1.1</span>
             <span>EDGE_ENGINE_V1.0.4</span>
             <span className="text-emerald-500/50">ENCRYPTED_AES_256</span>
           </div>
        </footer>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, label, subtitle }: { active: boolean; onClick: () => void; label: string; subtitle?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
        active 
          ? 'bg-emerald-500 text-stone-950' 
          : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/50'
      }`}
    >
      <span className="text-sm font-bold">{label}</span>
      {subtitle && <span className={`text-[10px] uppercase tracking-wider ${active ? 'text-emerald-950/70 font-bold' : 'text-stone-500'}`}>{subtitle}</span>}
    </button>
  );
}
