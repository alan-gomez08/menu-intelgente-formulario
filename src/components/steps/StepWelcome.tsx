import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowRight
} from 'lucide-react';

const DEFAULT_DEMO_URL =
  import.meta.env.VITE_DEMO_URL || 'https://menu-inteligente.alanlautaro-gomez.workers.dev/';

interface StepWelcomeProps {
  onStart: () => void;
  demoUrl?: string;
}

export const StepWelcome: React.FC<StepWelcomeProps> = ({ 
  onStart, 
  demoUrl = DEFAULT_DEMO_URL 
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[75vh] w-full max-w-2xl mx-auto py-8 sm:py-16 px-4 text-center">
      {/* Luces ambientales suaves de fondo con micro-animación */}
      <motion.div 
        animate={{ 
          scale: [1, 1.08, 1],
          opacity: [0.35, 0.55, 0.35]
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-200/50 via-slate-200/40 to-blue-200/40 rounded-full blur-3xl pointer-events-none -z-10" 
      />

      {/* 1. Badge superior de Web App */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs mb-5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Web App Gastronómica · Menú Inteligente</span>
      </motion.div>

      {/* 2. Titular principal con tipografía editorial adaptado a Web App y Menú */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.12] mb-5">
          Configurá la Web App y Menú Digital de tu local
        </h1>
        <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-xl mx-auto font-normal">
          Completá los datos clave en solo 5 minutos. Cargaremos tus categorías, platos, fotos y medios de cobro para que tus clientes ordenen desde una Web App interactiva y recibas los pedidos organizados por WhatsApp, sin comisiones por venta.
        </p>
      </motion.div>

      {/* 3. Acciones directas: Comenzar + Demo en vivo (sin tarjetas intermedias) */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col items-center gap-4 mt-2"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          {/* Botón Principal de Inicio */}
          <button
            type="button"
            onClick={onStart}
            className="w-full sm:w-auto px-8 sm:px-10 h-14 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer group"
          >
            <span>Comenzar Configuración</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Botón directo para el Demo en Vivo */}
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 h-14 bg-white/90 hover:bg-slate-50 text-slate-800 hover:text-slate-950 font-bold rounded-2xl text-sm sm:text-base border border-slate-200/90 hover:border-slate-300 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-2xs group backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Ver Demo en Vivo</span>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </a>
        </div>

        {/* Micro-notas de tranquilidad */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-400 font-medium pt-2">
          <span>5 minutos estimados</span>
          <span>·</span>
          <span>Pedidos directo a WhatsApp</span>
          <span>·</span>
          <span>Guardado automático</span>
        </div>
      </motion.div>
    </div>
  );
};

export default StepWelcome;
