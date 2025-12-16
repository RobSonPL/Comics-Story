import React from 'react';
import { GeneratedPanel, ComicStyle } from '../types';
import { Loader2, RefreshCw } from 'lucide-react';

interface ComicPanelProps {
  panel: GeneratedPanel;
  style: ComicStyle;
  className?: string;
  onRegenerate?: () => void;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panel, style, className = '', onRegenerate }) => {
  const isGenerating = panel.status === 'generating';
  const isPending = panel.status === 'pending';
  const isError = panel.status === 'error';

  return (
    <div className={`relative w-full aspect-square border-4 border-zinc-900 bg-zinc-800 overflow-hidden shadow-xl group ${className}`}>
      {/* Background Image / Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        {panel.imageUrl ? (
          <img 
            src={panel.imageUrl} 
            alt={`Panel ${panel.panelNumber}`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500">
            {isGenerating ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                <p className="text-sm font-medium animate-pulse">Rysowanie...</p>
                <p className="text-xs mt-2 opacity-70 truncate max-w-[200px]">{panel.visualDescription}</p>
              </>
            ) : isError ? (
              <>
                <div className="text-red-500 mb-2">⚠</div>
                <p className="text-xs text-red-400">Błąd generowania</p>
                {onRegenerate && (
                  <button 
                    onClick={onRegenerate}
                    className="mt-2 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-300 transition-colors"
                  >
                    Spróbuj ponownie
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-zinc-900/50 mb-3 flex items-center justify-center border border-zinc-700">
                  <span className="font-comic text-xl text-zinc-600">{panel.panelNumber}</span>
                </div>
                <p className="text-xs">Czekam na artystę...</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Overlays - Only show if image exists to prevent weird floating text on loader */}
      {panel.imageUrl && (
        <>
          {/* Caption Box */}
          {panel.caption && (
            <div className="absolute top-2 left-2 bg-yellow-100 border-2 border-black px-3 py-1 max-w-[90%] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <p className="font-comic text-xs md:text-sm text-black uppercase leading-tight">
                {panel.caption}
              </p>
            </div>
          )}

          {/* Dialogue Bubble */}
          {panel.dialogue && (
            <div className="absolute bottom-4 right-4 max-w-[80%] flex flex-col items-end">
               {/* Character Name Tag (Optional) */}
               {panel.character && (
                  <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md mr-4 uppercase tracking-wider shadow-sm">
                    {panel.character}
                  </div>
               )}
               {/* Bubble */}
              <div className="bg-white border-2 border-black rounded-[2rem] rounded-br-none px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
                <p className="font-comic text-sm md:text-base text-black leading-tight">
                  {panel.dialogue}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};