import React from 'react';
import { CheckCircle2, Shield, Network, Sprout } from 'lucide-react';
import { motion } from 'motion/react';

export function TabVision() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 p-8 grid grid-cols-12 gap-4"
    >
      <div className="col-span-8 bg-emerald-950/10 border border-emerald-500/10 rounded-3xl p-10 flex flex-col justify-center overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2v20"/><path d="M2 12h20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m4.93 19.07 14.14-14.14"/></svg>
        </div>
        <h1 className="text-5xl font-bold text-stone-50 leading-tight mb-6">
          I-SAW: <span className="text-emerald-400 italic">Plug & Play</span><br/>Infrastructure for K-12
        </h1>
        <p className="text-lg text-stone-400 max-w-xl leading-relaxed">
          Infrastructure for Sensing and Analytics on Wildlife. Bridging the gap between wilderness and advanced AI. We provide edge-networked intelligent systems designed to empower citizen science, transform field education, and protect data privacy at the edge.
        </p>
      </div>
      <div className="col-span-4 grid grid-rows-3 gap-4">
        <div className="bg-stone-900/80 border border-emerald-500/20 rounded-2xl p-6">
          <h3 className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wider">Networking</h3>
          <p className="text-xs text-stone-400">Our "Bullseye Ambush" strategy uses ultra-low-power local audio sentinels that continuously listen and wake up high-power camera traps via local MQTT channels upon detection.</p>
        </div>
        <div className="bg-stone-900/80 border border-emerald-500/20 rounded-2xl p-6">
          <h3 className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wider">Smart Sensing</h3>
          <p className="text-xs text-stone-400">Robust 3-step verification architecture: (1) Visual detection via wide-angle AI edge cameras tracking bird activity, (2) Audio matching of bird songs via external microphone arrays, and (3) Footfall sensors embedded on each perch confirming real physical landings.</p>
        </div>
        <div className="bg-stone-900/80 border border-emerald-500/20 rounded-2xl p-6">
          <h3 className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wider">Innovative Hardware</h3>
          <p className="text-xs text-stone-400">Multi-species alternating seed & nectar tray attracts all bird sizes. A completely open, see-through structure (no cameras inside the feeder) ensures fully unobstructed views from all angles while preserving natural context.</p>
        </div>
      </div>
    </motion.section>
  );
}
