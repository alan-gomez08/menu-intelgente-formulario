import { useEffect, useId } from 'react';
import { motion } from 'framer-motion';

// Trazos vectoriales calibrados sobre el monograma AG (346x271)
const PATH_A_LEGS = 'M 20 268 L 131 54 L 219 219';
const PATH_A_CROSSBAR_LEFT = 'M 46 184 L 118 184';
const PATH_A_CROSSBAR_RIGHT = 'M 164 180 L 196 180';

// Trazo continuo de la G: nace en el arco superior derecho, rodea la corona,
// atraviesa la A por el centro, baja por la curva inferior y remata la barra horizontal
const PATH_G_SWEEP =
  'M 296 86 C 275 42, 195 40, 160 78 C 138 100, 130 118, 135 165 C 142 215, 178 245, 230 245 C 284 246, 300 224, 299 153 L 225 153';

// Guías luminosas finas para acentuar el trazado caligráfico sobre los bordes
const TRACER_A_LEGS = 'M 27 253 L 131 44 L 219 218';
const TRACER_A_BAR = 'M 52 184 L 118 184';

export default function SplashScreen() {
  const maskId = useId();
  const tracerGradId = useId();

  // Evitar scroll accidental mientras dura la pantalla de introducción
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
      {/* Brillo ambiental sutil armonizado con los tonos cobre y azul marino */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 0.75, 0.55], scale: [0.7, 1.05, 1] }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none blur-3xl bg-[radial-gradient(circle,rgba(205,148,112,0.22)_0%,rgba(15,23,42,0.08)_50%,transparent_75%)]"
      />

      <div className="relative flex flex-col items-center">
        {/* Monograma AG animado paso a paso: primero se escribe la A, luego la G la atraviesa */}
        <div className="relative inline-flex items-center justify-center">
          <svg
            viewBox="0 0 346 271"
            className="w-32 sm:w-36 h-auto overflow-visible drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
            aria-label="AG Digital Studio"
          >
            <defs>
              {/* Máscara progresiva que revela la textura metálica real de Logo.webp */}
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="346"
                height="271"
              >
                <rect x="0" y="0" width="346" height="271" fill="black" />

                {/* 1. Escritura de la A (pierna izquierda -> vértice -> pierna derecha) */}
                <motion.path
                  d={PATH_A_LEGS}
                  fill="none"
                  stroke="white"
                  strokeWidth="42"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeMiterlimit="10"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* 1b. Barra horizontal izquierda de la A */}
                <motion.path
                  d={PATH_A_CROSSBAR_LEFT}
                  fill="none"
                  stroke="white"
                  strokeWidth="34"
                  strokeLinecap="butt"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, delay: 0.35, ease: 'easeOut' }}
                />

                {/* 1c. Remate derecho del travesaño de la A */}
                <motion.path
                  d={PATH_A_CROSSBAR_RIGHT}
                  fill="none"
                  stroke="white"
                  strokeWidth="40"
                  strokeLinecap="butt"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.14, delay: 0.45, ease: 'easeOut' }}
                />

                {/* 2. La G entra desde arriba, atraviesa el interior de la A y cierra su barra */}
                <motion.path
                  d={PATH_G_SWEEP}
                  fill="none"
                  stroke="white"
                  strokeWidth="56"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.72, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* 3. Consolidación final de la máscara para bordes perfectos */}
                <motion.rect
                  x="0"
                  y="0"
                  width="346"
                  height="271"
                  fill="white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18, delay: 1.2 }}
                />
              </mask>

              <linearGradient id={tracerGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e5aa85" />
                <stop offset="50%" stopColor="#b97d5b" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Logo real metálico revelado por la máscara animada */}
            <image
              href="/assets/Logo.webp"
              x="0"
              y="0"
              width="346"
              height="271"
              preserveAspectRatio="xMidYMid meet"
              mask={`url(#${maskId})`}
            />

            {/* Guías luminosas finas que acompañan el trazo de la A y el cruce de la G */}
            <motion.path
              d={TRACER_A_LEGS}
              fill="none"
              stroke="#c98e6b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.85, 0.65, 0] }}
              transition={{
                pathLength: { duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.72, delay: 0.05, times: [0, 0.15, 0.7, 1] },
              }}
            />

            <motion.path
              d={TRACER_A_BAR}
              fill="none"
              stroke="#c98e6b"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.85, 0] }}
              transition={{
                pathLength: { duration: 0.2, delay: 0.35, ease: 'easeOut' },
                opacity: { duration: 0.38, delay: 0.35, times: [0, 0.3, 1] },
              }}
            />

            <motion.path
              d={PATH_G_SWEEP}
              fill="none"
              stroke={`url(#${tracerGradId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.9, 0.75, 0] }}
              transition={{
                pathLength: { duration: 0.72, delay: 0.5, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.88, delay: 0.5, times: [0, 0.15, 0.75, 1] },
              }}
            />
          </svg>

          {/* Destello especular diagonal sobre la silueta exacta al completar AG */}
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
              transition={{ duration: 0.55, delay: 1.15, ease: [0.25, 1, 0.5, 1] }}
              style={{ skewX: -22 }}
              className="w-2/3 h-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
            />
          </div>
        </div>

        {/* Marca y subtítulo que acompañan el cierre del trazado */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 flex flex-col items-center text-center"
        >
          <span className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-none">
            Menú Digital Inteligente
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-[0.24em] mt-2">
            AG Digital Studio
          </span>
        </motion.div>

        {/* Línea de progreso minimalista sincronizada a 1.65s */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="mt-6 w-28 sm:w-36 h-[2px] rounded-full bg-slate-200/80 overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.65, 0, 0.35, 1] }}
            style={{ transformOrigin: 'left' }}
            className="h-full w-full bg-gradient-to-r from-slate-800 via-[#b97d5b] to-slate-950"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
