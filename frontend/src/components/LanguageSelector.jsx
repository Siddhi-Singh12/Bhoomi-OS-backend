import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector({ variant = 'light' }) {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = availableLanguages.find((l) => l.code === language) || availableLanguages[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = variant === 'dark';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
          isDark
            ? 'bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800'
            : 'bg-white border-gray-200/90 text-gray-700 hover:bg-gray-50 shadow-2xs'
        }`}
        title="Select Language / भाषा चुनें"
      >
        <Languages className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <span className="font-medium font-sans">{currentLang.nativeLabel}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b border-gray-100">
            Regional Language / भाषा
          </div>
          {availableLanguages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                language === l.code
                  ? 'bg-emerald-50 text-emerald-950 font-bold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>
                <span className="font-semibold block">{l.nativeLabel}</span>
                <span className="text-[10px] text-gray-400 block font-normal">{l.label}</span>
              </div>
              {language === l.code && <Check className="w-3.5 h-3.5 text-emerald-700" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
