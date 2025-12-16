import React from 'react';
import { GeneratedPanel, ComicStyle, LayoutOption, Language } from '../types';
import { Loader2, RefreshCw, MessageSquarePlus } from 'lucide-react';
import { UI_TRANSLATIONS } from '../constants';

interface ComicPageProps {
  panels: GeneratedPanel[];
  style: ComicStyle;
  layout: LayoutOption;
  pageNumber: number;
  language: Language;
  id?: string;
  onRegeneratePanel: (panel: GeneratedPanel) => void;
  onEditPanel: (panel: GeneratedPanel) => void;
}

export const ComicPage: React.FC<ComicPageProps> = ({ 
  panels, 
  style, 
  layout, 
  pageNumber, 
  language, 
  id, 
  onRegeneratePanel,
  onEditPanel
}) => {
  const t = UI_TRANSLATIONS[language];

  // Determine grid columns/rows based on layout
  const getGridClass = () => {
    switch(layout) {
      case 1: return 'grid-cols-1 grid-rows-1';
      case 2: return 'grid-cols-1 grid-rows-2';
      case 4: return 'grid-cols-2 grid-rows-2';
      case 6: return 'grid-cols-2 grid-rows-3';
      default: return 'grid-cols-1 grid-rows-1';
    }
  };

  return (
    <div id={id} className="relative w-full aspect-a4 bg-white shadow-2xl flex flex-col border border-zinc-200 overflow-hidden group print-optimize">
      
      {/* Page Header */}
      <div className="h-6 flex items-center justify-between px-4 border-b border-zinc-100 bg-zinc-50/50 text-[10px] text-zinc-400 font-mono uppercase tracking-widest shrink-0">
        <span>{t.page} {pageNumber}</span>
        <span>{style.name}</span>
      </div>

      {/* Main Grid Content */}
      <div className={`flex-1 grid ${getGridClass()} gap-2 bg-white p-2`}>
        {panels.map((panel, idx) => {
           const isGenerating = panel.status === 'generating';
           const isError = panel.status === 'error';
           
           return (
             <div key={panel.panelNumber} className="relative w-full h-full border-2 border-black overflow-hidden bg-zinc-100 flex items-center justify-center group/panel">
                
                {panel.imageUrl ? (
                  <>
                    <img 
                      src={panel.imageUrl} 
                      alt={`Panel ${panel.panelNumber}`} 
                      className="w-full h-full object-cover"
                    />
                     {/* Action Buttons for Panel */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/panel:opacity-100 transition-opacity data-html2canvas-ignore z-20">
                         <button 
                             onClick={() => onEditPanel(panel)}
                             className="p-1.5 bg-blue-600/80 text-white rounded hover:bg-blue-600 backdrop-blur-sm"
                             title="Edytuj dialogi"
                         >
                             <MessageSquarePlus className="w-3 h-3" />
                         </button>
                         <button 
                             onClick={() => onRegeneratePanel(panel)}
                             className="p-1.5 bg-black/60 text-white rounded hover:bg-black backdrop-blur-sm"
                             title="Regeneruj obraz"
                         >
                             <RefreshCw className="w-3 h-3" />
                         </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-zinc-500">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
                        <p className="text-xs font-medium animate-pulse">Rysowanie...</p>
                      </>
                    ) : isError ? (
                      <>
                        <div className="text-red-500 mb-1">⚠</div>
                        <button 
                          onClick={() => onRegeneratePanel(panel)}
                          className="px-2 py-1 bg-zinc-200 text-xs rounded hover:bg-zinc-300"
                        >
                          Ponów
                        </button>
                      </>
                    ) : (
                      <span className="text-2xl opacity-20 font-bold">{idx + 1}</span>
                    )}
                  </div>
                )}

                {/* Text Overlays - Inside Panel */}
                {panel.imageUrl && (
                  <>
                    {/* Caption (Narrator) - Always Top Left */}
                    {panel.caption && (
                       <div className={`absolute top-0 left-0 max-w-[90%] bg-yellow-100 border-b-2 border-r-2 border-black px-2 py-1 z-10 shadow-sm ${style.bubbleFont || 'font-comic'}`}>
                          <p className="text-[10px] md:text-xs text-black uppercase leading-tight">
                            {panel.caption}
                          </p>
                       </div>
                    )}

                    {/* Dialogue - Bottom Right */}
                    {panel.dialogue && (
                        <div className="absolute bottom-2 right-2 max-w-[85%] flex flex-col items-end z-10">
                            {panel.character && (
                                <div className={`text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-t uppercase mr-2 shadow-sm ${style.titleFont || 'font-sans'}`}>
                                    {panel.character}
                                </div>
                            )}
                            <div className={`bg-white border-2 border-black rounded-[1rem] rounded-br-none px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,0.3)] ${style.bubbleFont || 'font-comic'}`}>
                                <p className="text-xs md:text-sm text-black leading-tight">
                                    {panel.dialogue}
                                </p>
                            </div>
                        </div>
                    )}
                  </>
                )}
             </div>
           );
        })}
      </div>

    </div>
  );
};