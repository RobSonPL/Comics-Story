
import React from 'react';
import { ComicStyle, Language } from '../types';
import { UI_TRANSLATIONS } from '../constants';

interface ComicCoverProps {
  title: string;
  author: string;
  logo: string | null;
  style: ComicStyle;
  language: Language;
  id?: string;
}

export const ComicCover: React.FC<ComicCoverProps> = ({ title, author, logo, style, language, id }) => {
  const t = UI_TRANSLATIONS[language];

  return (
    <div id={id} className="w-full aspect-a4 bg-white shadow-2xl overflow-hidden relative flex flex-col items-center border border-zinc-200 print-optimize">
      
      {/* Background Pattern based on style */}
      <div className={`absolute inset-0 opacity-10 ${style.previewClass} w-full h-full`}></div>
      
      {/* Header / Logo Area */}
      <div className="z-10 w-full p-8 flex justify-center">
        {logo ? (
          <img src={logo} alt="Logo" className="h-24 object-contain" />
        ) : (
          <div className="h-24 w-24 rounded-full bg-zinc-900 flex items-center justify-center text-white font-comic text-xl">
            LOGO
          </div>
        )}
      </div>

      {/* Main Title Area */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center w-full px-8 text-center">
        <div className="border-4 border-black p-2 w-full bg-white rotate-1 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <h1 className="text-5xl md:text-7xl font-comic text-black uppercase break-words leading-none py-8">
            {title || (language === 'pl' ? "TYTUŁ KOMIKSU" : "COMIC TITLE")}
            </h1>
        </div>
        
        <div className="mt-12 bg-zinc-900 text-white px-6 py-2 rotate-[-2deg]">
             <p className="font-comic text-2xl uppercase tracking-widest">{t.specialEdition}</p>
        </div>
      </div>

      {/* Footer / Author */}
      <div className="z-10 w-full p-8 bg-zinc-900 text-white mt-auto">
        <div className="flex justify-between items-end border-t border-zinc-700 pt-4">
             <div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">{t.scriptArt}</p>
                <p className="font-comic text-2xl text-yellow-500">{author || t.authorUnknown}</p>
             </div>
             {/* Removed AI GENERATED and Date per previous request, keeping author focus */}
        </div>
      </div>
    </div>
  );
};
