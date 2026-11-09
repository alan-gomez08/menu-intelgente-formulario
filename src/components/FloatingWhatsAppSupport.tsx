import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FloatingWhatsAppSupportProps {
  currentStepTitle?: string;
  companyName?: string;
  restaurantName?: string;
  stepNumber?: number;
}

export const WhatsAppIcon = ({ size = 28, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
  </svg>
);

export const FloatingWhatsAppSupport: React.FC<FloatingWhatsAppSupportProps> = ({
  currentStepTitle,
  companyName,
  restaurantName,
  stepNumber
}) => {
  const [showBubble, setShowBubble] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Número de WhatsApp configurado o fallback corporativo
  const agencyPhone = import.meta.env.VITE_AGENCY_WHATSAPP || '5491178188323';

  // Mensaje contextual inteligente según el avance del cliente
  const businessName = restaurantName || companyName;
  const businessContext = businessName?.trim() ? ` para mi local "${businessName.trim()}"` : '';
  const stepContext = currentStepTitle ? ` (estoy en: ${currentStepTitle}${stepNumber !== undefined ? ` · Paso ${stepNumber}` : ''})` : '';
  const whatsappMessage = `¡Hola AG Digital Studio! Necesito una consulta o asistencia para configurar el Menú Digital${businessContext}${stepContext}.`;
  const whatsappUrl = `https://wa.me/${agencyPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  // Animación de entrada de la burbuja tras 1.2 segundos para captar la atención de forma elegante
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDismissed) {
        setShowBubble(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isDismissed]);

  // Colapsa suavemente la burbuja tras 4.5 segundos para no obstruir pantalla en móviles
  useEffect(() => {
    if (!showBubble) return;

    const autoCollapseTimer = setTimeout(() => {
      setShowBubble(false);
    }, 4500);

    return () => clearTimeout(autoCollapseTimer);
  }, [showBubble]);

  const handleDismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowBubble(false);
    setIsDismissed(true);
  };

  const isBubbleVisible = (showBubble && !isDismissed) || isHovered;

  return (
    <div
      className="fixed bottom-[74px] sm:bottom-6 right-3 sm:right-6 z-30 flex items-center gap-2 pointer-events-none select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* BURBUJA ANIMADA DE ASISTENCIA */}
      <AnimatePresence>
        {isBubbleVisible && (
          <motion.div
            initial={{ opacity: 0, x: 15, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="pointer-events-auto relative flex items-center gap-2 bg-slate-950/95 text-white backdrop-blur-xl border border-slate-800/90 shadow-[0_12px_35px_-8px_rgba(15,23,42,0.35)] rounded-2xl py-2 px-3 max-w-[175px] xs:max-w-[210px] sm:max-w-[270px] cursor-pointer group transition-all"
            onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
            role="alert"
          >
            {/* PUNTO VERDE INDICADOR DE DISPONIBILIDAD */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]" />
            </span>

            {/* TEXTO DE LLAMADO A LA ACCIÓN */}
            <div className="flex flex-col min-w-0 pr-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-white leading-tight flex items-center gap-1 truncate">
                <WhatsAppIcon size={13} className="text-[#25D366] shrink-0" />
                <span>¿Dudas o ayuda?</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 leading-tight truncate group-hover:text-slate-200 transition-colors">
                Contactar por WhatsApp
              </span>
            </div>

            {/* BOTÓN CERRAR MENSAJE (X) */}
            <button
              type="button"
              onClick={handleDismissBubble}
              className="p-1 -mr-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Cerrar sugerencia"
              aria-label="Cerrar sugerencia de ayuda"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE PRINCIPAL DE WHATSAPP */}
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar asistencia por WhatsApp"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 280, delay: 0.3 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="pointer-events-auto relative w-12 h-12 sm:w-[56px] sm:h-[56px] rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(37,211,102,0.45)] hover:shadow-[0_12px_32px_rgba(37,211,102,0.6)] border-2 border-white/50 transition-all cursor-pointer group shrink-0"
      >
        {/* RESPLANDOR PULSANTE DISCRETO */}
        <span className="absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping -z-10 pointer-events-none opacity-40 group-hover:opacity-75" />

        {/* ÍCONO OFICIAL DE WHATSAPP */}
        <WhatsAppIcon size={26} className="text-white drop-shadow-sm transition-transform duration-200 group-hover:scale-110 sm:hidden" />
        <WhatsAppIcon size={29} className="text-white drop-shadow-sm transition-transform duration-200 group-hover:scale-110 hidden sm:block" />
      </motion.a>
    </div>
  );
};

export default FloatingWhatsAppSupport;
