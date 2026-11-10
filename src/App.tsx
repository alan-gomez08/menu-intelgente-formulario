import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Wizard from './components/Wizard';
import SplashScreen from './components/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1650);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-slate-900 selection:text-white relative overflow-x-hidden">
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash-intro" />}
      </AnimatePresence>

      {/* Luces ambientales tenues de fondo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-100/50 via-sky-50/25 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-20 -right-20 w-[600px] h-[500px] bg-gradient-to-tl from-slate-200/40 via-blue-50/20 to-transparent blur-3xl pointer-events-none -z-10" />
      <Wizard />
    </div>
  );
}

export default App;