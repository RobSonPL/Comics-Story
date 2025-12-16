
import React, { useState, useRef } from 'react';
import { COMIC_STYLES, LAYOUT_OPTIONS } from '../constants';
import { AppState, ComicStyle, Language } from '../types';
import { Sparkles, Wand2, Layers, User, PenTool, Upload, Image as ImageIcon, ChevronDown, LayoutGrid, Square, Columns, Grid, Globe, Palette, X, Loader2 } from 'lucide-react';
import { generateStoryIdea, generateCharacterName } from '../services/geminiService';

interface InputFormProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onSubmit: () => void;
  isGenerating: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({
  state,
  setState,
  onSubmit,
  isGenerating,
}) => {
  const [isIdeaLoading, setIsIdeaLoading] = useState(false);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleRefInputRef = useRef<HTMLInputElement>(null);

  const updateState = (key: keyof AppState, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateIdea = async () => {
    setIsIdeaLoading(true);
    try {
      const idea = await generateStoryIdea(state.language);
      updateState('prompt', idea);
    } catch (e) {
      console.error(e);
    } finally {
      setIsIdeaLoading(false);
    }
  };

  const handleGenerateName = async () => {
      if (!state.prompt && !confirm(state.language === 'pl' ? "Opisz historię, aby wygenerować pasujące imię. Kontynuować z losowym?" : "Describe the story to generate a fitting name. Continue with random?")) {
          return;
      }
      
      setIsNameLoading(true);
      try {
          const name = await generateCharacterName(state.prompt, state.selectedStyle, state.language);
          updateState('characterName', name);
      } catch (e) {
          console.error(e);
      } finally {
          setIsNameLoading(false);
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateState('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateState('styleReference', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearStyleRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateState('styleReference', null);
    if (styleRefInputRef.current) styleRefInputRef.current.value = '';
  };

  const getLayoutIcon = (val: number) => {
      switch(val) {
          case 1: return <Square className="w-5 h-5" />;
          case 2: return <Columns className="w-5 h-5 rotate-90" />; // Vertical stack roughly
          case 4: return <LayoutGrid className="w-5 h-5" />;
          case 6: return <Grid className="w-5 h-5" />;
          default: return <Square className="w-5 h-5" />;
      }
  };

  const totalPanels = state.pageCount * state.layout;

  return (
    <div className="w-full max-w-5xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
      
      {/* Decorative gradient blob */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Story Details */}
        <div className="lg:col-span-7 space-y-6">
            
            {/* Language Selector */}
            <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-400" /> Język / Language:
                </span>
                <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                    <button
                        onClick={() => updateState('language', 'pl')}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                            state.language === 'pl' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        🇵🇱 PL
                    </button>
                    <button
                        onClick={() => updateState('language', 'en')}
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                            state.language === 'en' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        🇬🇧 EN
                    </button>
                </div>
            </div>

            {/* Prompt */}
            <div>
                <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    {state.language === 'pl' ? 'O czym ma być komiks?' : 'What is the comic about?'}
                    </label>
                    <button 
                    onClick={handleGenerateIdea}
                    disabled={isGenerating || isIdeaLoading}
                    className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                    <Wand2 className={`w-3 h-3 ${isIdeaLoading ? 'animate-spin' : ''}`} />
                    {isIdeaLoading 
                        ? (state.language === 'pl' ? 'Myślenie...' : 'Thinking...') 
                        : (state.language === 'pl' ? 'Wylosuj pomysł' : 'Random Idea')}
                    </button>
                </div>
                <textarea
                    value={state.prompt}
                    onChange={(e) => updateState('prompt', e.target.value)}
                    placeholder={state.language === 'pl' ? "Opisz swoją historię tutaj..." : "Describe your story here..."}
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none text-lg"
                    disabled={isGenerating}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Character Name */}
                <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-2">
                        <User className="w-3 h-3" /> {state.language === 'pl' ? 'Główny Bohater' : 'Main Character'}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={state.characterName}
                            onChange={(e) => updateState('characterName', e.target.value)}
                            placeholder="np. Cyber-Kot"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 pr-10 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            onClick={handleGenerateName}
                            disabled={isNameLoading || isGenerating}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-indigo-400 disabled:opacity-50 transition-colors"
                            title={state.language === 'pl' ? "Wymyśl imię" : "Generate Name"}
                        >
                            {isNameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                 {/* Author */}
                 <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-2">
                        <PenTool className="w-3 h-3" /> {state.language === 'pl' ? 'Autor' : 'Author'}
                    </label>
                    <input
                        type="text"
                        value={state.author}
                        onChange={(e) => updateState('author', e.target.value)}
                        placeholder={state.language === 'pl' ? "Twoje imię" : "Your Name"}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            {/* Logo Upload */}
             <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> {state.language === 'pl' ? 'Logo na okładkę (Opcjonalne)' : 'Cover Logo (Optional)'}
                </label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-zinc-800 rounded-lg p-4 hover:bg-zinc-900/50 transition-colors flex items-center gap-4 group"
                >
                    <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-700 group-hover:border-indigo-500 transition-colors overflow-hidden">
                        {state.logo ? (
                            <img src={state.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Upload className="w-5 h-5 text-zinc-500" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-zinc-300 font-medium">
                            {state.logo 
                                ? (state.language === 'pl' ? 'Logo załadowane' : 'Logo Uploaded') 
                                : (state.language === 'pl' ? 'Kliknij, aby dodać logo' : 'Click to upload logo')}
                        </p>
                        <p className="text-xs text-zinc-500">
                            {state.logo 
                                ? (state.language === 'pl' ? 'Kliknij, aby zmienić' : 'Click to change') 
                                : 'PNG, JPG (Max 2MB)'}
                        </p>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                        accept="image/*"
                    />
                </div>
            </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-5 space-y-6">
             {/* Page Count */}
             <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        {state.language === 'pl' ? 'Liczba Stron' : 'Page Count'}
                    </label>
                    <span className="text-2xl font-comic text-emerald-400">{state.pageCount}</span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="40" 
                    value={state.pageCount} 
                    onChange={(e) => updateState('pageCount', parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                />
                
                {/* Layout Selector */}
                <div className="mt-6">
                    <label className="text-sm font-bold text-zinc-300 mb-3 block">
                        {state.language === 'pl' ? 'Układ Strony (Panele na stronę)' : 'Page Layout (Panels per page)'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {LAYOUT_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => updateState('layout', opt.value)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                                    state.layout === opt.value
                                        ? 'bg-emerald-600 border-emerald-500 text-white'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                }`}
                            >
                                {getLayoutIcon(opt.value)}
                                <span className="text-[10px] mt-1 font-bold">{opt.value}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        {state.language === 'pl' ? 'Podsumowanie' : 'Summary'}
                    </p>
                    <p className="text-sm text-zinc-300 mt-1">
                        {state.language === 'pl' ? (
                            <>Wygenerujesz <span className="text-emerald-400 font-bold">{totalPanels}</span> obrazków na {state.pageCount} stronach.</>
                        ) : (
                            <>Generating <span className="text-emerald-400 font-bold">{totalPanels}</span> panels across {state.pageCount} pages.</>
                        )}
                    </p>
                </div>
             </div>

             {/* Style Selector Section */}
             <div>
                <label className="text-sm font-bold text-zinc-300 mb-3 block">
                    {state.language === 'pl' ? 'Styl Artystyczny' : 'Art Style'}
                </label>
                
                {/* Dropdown Selector */}
                <div className="relative mb-4">
                    <select
                        value={state.selectedStyle.id}
                        onChange={(e) => {
                            const style = COMIC_STYLES.find(s => s.id === e.target.value);
                            if (style) updateState('selectedStyle', style);
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 pr-10 text-white appearance-none focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        {COMIC_STYLES.map((style) => (
                            <option key={style.id} value={style.id}>
                                {style.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>

                {/* Selected Style Preview Text */}
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 flex items-start gap-3">
                     <div className={`w-10 h-10 rounded-md shrink-0 ${state.selectedStyle.previewClass} shadow-inner`}></div>
                     <div>
                         <p className="text-sm font-bold text-zinc-200">{state.selectedStyle.name}</p>
                         <p className="text-xs text-zinc-500 leading-tight mt-1">{state.selectedStyle.description}</p>
                     </div>
                </div>

                {/* Custom Style Reference Upload */}
                <div className="mt-4">
                  <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-2">
                      <Palette className="w-3 h-3" /> 
                      {state.language === 'pl' ? 'Własny styl (Obraz referencyjny)' : 'Custom Style (Reference Image)'}
                  </label>
                  
                  <div 
                      onClick={() => styleRefInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-lg p-3 hover:bg-zinc-900/50 transition-colors flex items-center gap-3 group relative overflow-hidden ${
                        state.styleReference ? 'border-indigo-500 bg-indigo-900/10' : 'border-zinc-800'
                      }`}
                  >
                      {state.styleReference ? (
                        <>
                           <div className="w-10 h-10 rounded overflow-hidden border border-indigo-500/50">
                              <img src={state.styleReference} alt="Style Ref" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs text-indigo-300 font-bold truncate">
                                {state.language === 'pl' ? 'Styl aktywny' : 'Style Active'}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate">
                                {state.language === 'pl' ? 'Używany jako wzorzec' : 'Used as reference'}
                              </p>
                           </div>
                           <button 
                             onClick={clearStyleRef}
                             className="p-1 hover:bg-red-500/20 rounded-full text-zinc-500 hover:text-red-400 transition-colors"
                           >
                              <X className="w-4 h-4" />
                           </button>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-zinc-900 rounded flex items-center justify-center text-zinc-600 group-hover:text-zinc-400">
                             <Upload className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                             <p className="text-xs text-zinc-400 font-medium group-hover:text-zinc-300">
                               {state.language === 'pl' ? 'Wgraj obrazek stylu' : 'Upload style image'}
                             </p>
                             <p className="text-[10px] text-zinc-600">
                               {state.language === 'pl' ? 'Nadpisuje wybrany styl' : 'Overrides selected style'}
                             </p>
                          </div>
                        </>
                      )}
                      
                      <input 
                          type="file" 
                          ref={styleRefInputRef} 
                          onChange={handleStyleRefUpload} 
                          className="hidden" 
                          accept="image/*"
                      />
                  </div>
                </div>

             </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-center pt-8 mt-6 border-t border-zinc-800/50">
        <button
          onClick={onSubmit}
          disabled={!state.prompt.trim() || isGenerating}
          className={`
            w-full md:w-auto relative overflow-hidden rounded-xl px-12 py-4 font-bold text-white text-lg tracking-wide transition-all duration-300 shadow-xl
            ${!state.prompt.trim() || isGenerating 
              ? 'bg-zinc-800 cursor-not-allowed text-zinc-500' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 hover:shadow-indigo-500/30'
            }
          `}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <Sparkles className="w-6 h-6 animate-spin" />
              {state.language === 'pl' 
                ? `Tworzenie Komiksu (${state.pageCount} str)...` 
                : `Creating Comic (${state.pageCount} pages)...`}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              {state.language === 'pl' ? 'Rozpocznij Tworzenie' : 'Start Creation'}
              <Sparkles className="w-6 h-6" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
