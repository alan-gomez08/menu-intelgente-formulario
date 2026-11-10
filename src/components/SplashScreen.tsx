import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  // Bloquear scroll accidental durante la pantalla de carga inicial
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col items-center justify-center px-6 select-none overflow-hidden"
    >
      {/* Brillo ambiental sutil armonizado con los tonos cobre y azul marino del logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 0.7, 0.5], scale: [0.7, 1.05, 1] }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none blur-3xl bg-[radial-gradient(circle,rgba(205,148,112,0.22)_0%,rgba(15,23,42,0.08)_50%,transparent_75%)]"
      />

      {/* Contenedor central */}
      <div className="relative flex flex-col items-center">
        {/* Halo expansivo arquitectónico */}
        <motion.div
          initial={{ scale: 0.65, opacity: 0 }}
          animate={{ scale: [0.65, 1.25], opacity: [0, 0.45, 0] }}
          transition={{ duration: 1.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-slate-300/70 pointer-events-none"
        />

        {/* Monograma AG animado con reflejo metálico en máscara */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative inline-flex items-center justify-center"
        >
          <img
            src="/assets/Logo.webp"
            alt="AG Digital Studio"
            className="w-24 sm:w-28 h-auto object-contain drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
          />

          {/* Destello diagonal estricto sobre la silueta del logo */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              WebkitMaskImage: "url('/assets/Logo.webp')",
              maskImage: "url('/assets/Logo.webp')",
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
          >
            <motion.div
              initial={{ x: '-140%' }}
              animate={{ x: '220%' }}
              transition={{ duration: 0.85, delay: 0.45, ease: [0.25, 1, 0.5, 1] }}
              style={{ skewX: -22 }}
              className="w-2/3 h-full bg-gradient-to-r from-transparent via-white/85 to-transparent"
            />
          </div>
        </motion.div>

        {/* Marca y subtítulo con entrada escalonada */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 flex flex-col items-center text-center"
        >
          <span className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-none">
            Menú Digital Inteligente
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-[0.24em] mt-2">
            AG Digital Studio
          </span>
        </motion.div>

        {/* Línea de pre-carga minimalista */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-6 w-28 sm:w-36 h-[2px] rounded-full bg-slate-200/80 overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.45, delay: 0.1, ease: [0.65, 0, 0.35, 1] }}
            style={{ transformOrigin: 'left' }}
            className="h-full w-full bg-gradient-to-r from-slate-800 via-[#b97d5b] to-slate-950"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
