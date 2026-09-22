import React from 'react';
import { useCityStore, CITIES } from '../store/cityStore';
import { motion } from 'framer-motion';
import { MapPin, Navigation2, X, Sparkles, Locate, Lock } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import toast from 'react-hot-toast';

export default function CityGateway({ children }: { children: React.ReactNode }) {
  const { selectedCity, setCity, resetCity } = useCityStore();
  const { detectLocation } = useLocationStore();

  const handleAutoDetect = async () => {
    try {
      toast.loading('Tracing your coordinates...', { id: 'loc-detect' });
      await detectLocation();
      
      // Auto-select the first active city if detection works
      const defaultCity = CITIES.find(c => c.isActive);
      if (defaultCity) {
        setCity(defaultCity);
        toast.success(`Welcome! Located in ${defaultCity.name}`, { id: 'loc-detect' });
      } else {
        toast.success('Location detected!', { id: 'loc-detect' });
      }
    } catch (err) {
      toast.error('Could not detect location. Please select manually.', { id: 'loc-detect' });
    }
  };

  if (!selectedCity) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center p-6 sm:p-10 min-h-screen bg-mesh text-gray-900 overflow-y-auto">
        <header className="w-full max-w-md text-center mb-10 mt-4">
          <h1 className="text-5xl font-[900] italic tracking-tighter text-gradient-brand drop-shadow-[0px_4px_10px_rgba(0,0,0,0.5)] uppercase mb-2 font-sans">
            SELECTION
          </h1>
          <p className="text-[10px] tracking-[0.3em] font-bold text-gray-400 uppercase">
            Select Your Delivery City
          </p>
        </header>

        <main className="w-full max-w-md space-y-4">
          <button
            onClick={handleAutoDetect}
            className="w-full flex items-center justify-center gap-4 py-5 px-6 rounded-[40px] border border-brand/40 bg-transparent hover:bg-brand/10 transition-all duration-300"
          >
            <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V5m0 14v-3m0-11a9 9 0 110 18 9 9 0 010-18z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <circle cx="12" cy="12" r="1" fill="currentColor"></circle>
            </svg>
            <span className="text-[12px] font-black tracking-[0.2em] uppercase text-gray-900">
              Auto Detect My Location
            </span>
          </button>
          
          <div className="h-4"></div>
 
          {CITIES.map((city) => (
            <button
              key={city.id}
              onClick={() => {
                if (city.isActive) {
                  setCity(city);
                } else {
                  toast.error(`Mintoo is currently only operating in BTM Layout!`, { id: 'city-lock' });
                }
              }}
              className={`w-full flex items-center py-6 px-8 rounded-[40px] transition-colors ${
                city.isActive 
                  ? 'justify-between border-2 border-brand bg-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-40'
              }`}
            >
              <div className="flex items-center gap-5">
                <svg className={`w-7 h-7 ${city.isActive ? 'text-brand' : 'text-gray-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span className={`text-2xl font-black italic ${city.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {city.name}
                </span>
              </div>
              {city.isActive && (
                <svg className="w-6 h-6 text-brand opacity-80" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2l1.5 4.5H18l-3.5 3 1.5 5-4-3-4 3 1.5-5-3.5-3h4.5z"></path>
                </svg>
              )}
            </button>
          ))}
        </main>

        <footer className="mt-auto w-full max-w-md pt-8 opacity-20 pointer-events-none">
          <div className="flex justify-around border-t border-gray-200 py-4">
            <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
            <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
            <div className="w-12 h-12 bg-gray-500 rounded-full -mt-4"></div>
            <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
            <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
          </div>
        </footer>
      </div>
    );
  }

  if (!selectedCity.isActive) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg luxury-card p-12 md:p-16 rounded-[50px] relative z-10 text-center"
        >
          <button onClick={resetCity} className="absolute top-8 right-8 p-3 text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-7 h-7" />
          </button>

          <div className="w-32 h-32 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto text-orange-500/20 border border-gray-200 mb-10">
            <MapPin className="w-16 h-16" />
          </div>
          
          <h2 className="text-4xl font-black italic tracking-tighter mb-6 text-gray-900 uppercase leading-none">
            Coming to <br /><span className="text-luxury-gold">{selectedCity.name}</span>
          </h2>
          <p className="text-gray-500 font-bold text-sm leading-relaxed mb-12 max-w-xs mx-auto uppercase tracking-widest opacity-60">
            We are curating an delivery network for your city.
          </p>

          <button 
            onClick={resetCity}
            className="w-full btn-luxury-red py-6"
          >
            Switch City
          </button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
