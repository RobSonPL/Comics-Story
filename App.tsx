import React, { useState, useEffect, useRef } from 'react';
import { InputForm } from './components/InputForm';
import { ComicPage } from './components/ComicPage';
import { ComicCover } from './components/ComicCover';
import { DialogueEditorModal } from './components/DialogueEditorModal'; // Import new modal
import { AppState, GeneratedPanel, ComicStory, MarketingAsset, MarketingAssetType } from './types';
import { COMIC_STYLES } from './constants';
import { generateComicScript, generatePanelImage, extendComicScript, generateMarketingAsset } from './services/geminiService';
import { saveComicToDB, getSavedComics, deleteComicFromDB, SavedComic } from './services/db';
import { BookOpen, AlertTriangle, FileText, FileArchive, Save, History, Trash2, Loader2, Plus, Cloud, Check, Layers, Package, Image as ImageIcon, Download } from 'lucide-react';

// External libraries loaded via importmap/cdn
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import html2canvas from 'html2canvas';

export default function App() {
  // Global App State
  const [appState, setAppState] = useState<AppState>({
    prompt: '',
    characterName: '',
    author: '',
    logo: null,
    styleReference: null,
    pageCount: 1, // Default to 1 page
    selectedStyle: COMIC_STYLES[0],
    layout: 1, // Default layout 1 panel per page
    language: 'pl', // Default to Polish
  });

  const [isScriptGenerating, setIsScriptGenerating] = useState(false);
  const [generatedPanels, setGeneratedPanels] = useState<GeneratedPanel[]>([]);
  const [comicTitle, setComicTitle] = useState('');
  const [currentComicId, setCurrentComicId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Extension State
  const [extensionPageCount, setExtensionPageCount] = useState(1);
  const [isExtending, setIsExtending] = useState(false);

  // Marketing Assets State
  const [marketingAssets, setMarketingAssets] = useState<Record<MarketingAssetType, MarketingAsset>>({
    INTRO_PAGE: { type: 'INTRO_PAGE', status: 'idle' },
    BOX_MOCKUP: { type: 'BOX_MOCKUP', status: 'idle' }
  });

  // Editing State
  const [editingPanel, setEditingPanel] = useState<GeneratedPanel | null>(null);

  // Sidebar State
  const [showHistory, setShowHistory] = useState(false);
  const [savedComics, setSavedComics] = useState<SavedComic[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-save State
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Refs to hold latest state for auto-save intervals and async callbacks
  const latestDataRef = useRef({
    appState,
    generatedPanels,
    comicTitle,
    currentComicId
  });

  // Keep refs synced with state
  useEffect(() => {
    latestDataRef.current = {
      appState,
      generatedPanels,
      comicTitle,
      currentComicId
    };
  }, [appState, generatedPanels, comicTitle, currentComicId]);

  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-save Interval (5 minutes)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const { generatedPanels, currentComicId } = latestDataRef.current;
      if (currentComicId && generatedPanels.length > 0) {
        saveProject(true);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  const loadHistory = async () => {
    try {
        const comics = await getSavedComics();
        setSavedComics(comics);
    } catch (e) {
        console.error("Failed to load history", e);
    }
  };

  const handleNewProject = () => {
    if (generatedPanels.length > 0) {
        if (!window.confirm(appState.language === 'pl' ? "Czy chcesz rozpocząć nowy projekt? Wszystkie niezapisane postępy zostaną utracone." : "Start new project? Unsaved progress will be lost.")) {
            return;
        }
    }
    
    // Reset state but keep user preferences like author/logo/style/layout/language
    setAppState(prev => ({
        ...prev,
        prompt: '',
        characterName: '',
        pageCount: 1,
        styleReference: null // Reset style ref too
    }));
    setGeneratedPanels([]);
    setComicTitle('');
    setCurrentComicId('');
    setError(null);
    setLastSavedTime(null);
    setAutoSaveStatus('idle');
    setMarketingAssets({
        INTRO_PAGE: { type: 'INTRO_PAGE', status: 'idle' },
        BOX_MOCKUP: { type: 'BOX_MOCKUP', status: 'idle' }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerate = async () => {
    if (!appState.prompt.trim()) return;

    setError(null);
    setIsScriptGenerating(true);
    setGeneratedPanels([]);
    setComicTitle('');
    setCurrentComicId('');
    setLastSavedTime(null);
    setMarketingAssets({
        INTRO_PAGE: { type: 'INTRO_PAGE', status: 'idle' },
        BOX_MOCKUP: { type: 'BOX_MOCKUP', status: 'idle' }
    });

    try {
      // 1. Generate Script
      const script: ComicStory = await generateComicScript(
        appState.prompt, 
        appState.selectedStyle, 
        appState.pageCount,
        appState.layout,
        appState.characterName,
        appState.language
      );
      
      setComicTitle(script.title);
      setCurrentComicId(script.id || crypto.randomUUID());
      
      // Initialize panels
      const initialPanels: GeneratedPanel[] = script.panels.map(p => ({
        ...p,
        status: 'pending'
      }));
      setGeneratedPanels(initialPanels);
      setIsScriptGenerating(false);

      // Force an initial save of the script
      setTimeout(() => saveProject(true), 100);

      // 2. Generate Images Sequentially
      for (const panel of initialPanels) {
          await generateSinglePanelImage(panel, appState.selectedStyle, appState.characterName, appState.styleReference);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || (appState.language === 'pl' ? "Nie udało się wygenerować scenariusza. Sprawdź ustawienia API Key." : "Failed to generate script. Check API Key settings."));
      setIsScriptGenerating(false);
    }
  };

  const handleExtendComic = async () => {
      if (isExtending) return;
      setIsExtending(true);
      setError(null);

      try {
          const newPanelsData = await extendComicScript(
              generatedPanels,
              comicTitle,
              appState.selectedStyle,
              extensionPageCount,
              appState.layout,
              appState.characterName,
              appState.language
          );

          const newGeneratedPanels: GeneratedPanel[] = newPanelsData.map(p => ({
              ...p,
              status: 'pending'
          }));

          // Append to existing panels
          setGeneratedPanels(prev => [...prev, ...newGeneratedPanels]);
          
          // Update page count in state to reflect total
          setAppState(prev => ({
              ...prev,
              pageCount: prev.pageCount + extensionPageCount
          }));

          // Start image generation for NEW panels
          for (const panel of newGeneratedPanels) {
               await generateSinglePanelImage(panel, appState.selectedStyle, appState.characterName, appState.styleReference);
          }

      } catch (err: any) {
          console.error("Extension failed:", err);
          setError(appState.language === 'pl' ? "Nie udało się rozszerzyć historii." : "Failed to extend story.");
      } finally {
          setIsExtending(false);
      }
  };

  const handleGenerateAsset = async (type: MarketingAssetType) => {
      setMarketingAssets(prev => ({ ...prev, [type]: { ...prev[type], status: 'generating' } }));
      
      try {
          // If box mockup, try to capture cover as reference
          let coverBase64 = undefined;
          if (type === 'BOX_MOCKUP') {
              const coverData = await captureElement('comic-cover');
              if (coverData) coverBase64 = coverData;
          }

          const imageUrl = await generateMarketingAsset(
              type,
              comicTitle,
              appState.selectedStyle,
              appState.characterName,
              coverBase64
          );

          setMarketingAssets(prev => ({
              ...prev,
              [type]: { type, status: 'completed', imageUrl }
          }));

      } catch (e) {
          console.error("Marketing asset error", e);
          setMarketingAssets(prev => ({ ...prev, [type]: { ...prev[type], status: 'error' } }));
          setError(appState.language === 'pl' ? "Błąd generowania materiałów promocyjnych." : "Failed to generate marketing assets.");
      }
  };

  const downloadAsset = (asset: MarketingAsset) => {
      if (asset.imageUrl) {
          const link = document.createElement('a');
          link.href = asset.imageUrl;
          link.download = `${comicTitle.replace(/\s+/g, '_')}_${asset.type}.png`;
          link.click();
      }
  };

  const generateSinglePanelImage = async (panel: GeneratedPanel, style: any, charName: string, styleRef: string | null) => {
      updatePanelStatus(panel.panelNumber, 'generating');
      try {
        const base64Image = await generatePanelImage(panel, style, charName, styleRef);
        
        setGeneratedPanels(prev => {
            const newPanels = prev.map(p => {
                if (p.panelNumber === panel.panelNumber) {
                    return { ...p, imageUrl: base64Image, status: 'completed' as const };
                }
                return p;
            });
            return newPanels;
        });

        // Trigger auto-save after successful generation
        setTimeout(() => saveProject(true), 100);

      } catch (err) {
        updatePanelStatus(panel.panelNumber, 'error');
      }
  };

  const updatePanelStatus = (panelNumber: number, status: GeneratedPanel['status']) => {
    setGeneratedPanels(prev => prev.map(p => {
      if (p.panelNumber === panelNumber) return { ...p, status };
      return p;
    }));
  };

  const handleRegeneratePanel = (panel: GeneratedPanel) => {
    generateSinglePanelImage(panel, appState.selectedStyle, appState.characterName, appState.styleReference);
  };

  // --- Dialogue Editing Handlers ---
  const handleEditPanel = (panel: GeneratedPanel) => {
    setEditingPanel(panel);
  };

  const handleSavePanelChanges = (panelNumber: number, updates: Partial<GeneratedPanel>) => {
    setGeneratedPanels(prev => prev.map(p => {
      if (p.panelNumber === panelNumber) return { ...p, ...updates };
      return p;
    }));
    // Save to DB immediately after text edit
    setTimeout(() => saveProject(true), 100);
  };
  // --------------------------------

  const saveProject = async (isAuto = false) => {
      const { appState: currentAppState, generatedPanels: currentPanels, comicTitle: currentTitle, currentComicId: currentId } = latestDataRef.current;

      if (!currentId || currentPanels.length === 0) return;
      
      if (!isAuto) setIsSaving(true);
      setAutoSaveStatus('saving');
      
      const comicToSave: SavedComic = {
          id: currentId,
          title: currentTitle,
          author: currentAppState.author,
          createdAt: Date.now(),
          panels: currentPanels,
          style: currentAppState.selectedStyle,
          logo: currentAppState.logo,
          styleReference: currentAppState.styleReference
      };

      try {
          await saveComicToDB(comicToSave);
          await loadHistory(); 
          setLastSavedTime(new Date());
          setAutoSaveStatus('saved');
          setTimeout(() => {
              setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 3000);

      } catch (e) {
          console.error("Save failed", e);
          if (!isAuto) setError("Błąd zapisu do bazy.");
      } finally {
          if (!isAuto) setIsSaving(false);
      }
  };

  const handleLoadComic = (comic: SavedComic) => {
      setComicTitle(comic.title);
      setCurrentComicId(comic.id);
      setGeneratedPanels(comic.panels);
      setAppState(prev => ({
          ...prev,
          author: comic.author,
          selectedStyle: comic.style,
          logo: comic.logo,
          styleReference: comic.styleReference || null,
          pageCount: Math.ceil(comic.panels.length / (appState.layout || 1))
      }));
      setLastSavedTime(new Date(comic.createdAt));
      setShowHistory(false);
  };

  const handleDeleteComic = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm(appState.language === 'pl' ? "Czy na pewno chcesz usunąć ten komiks?" : "Are you sure you want to delete this comic?")) {
        await deleteComicFromDB(id);
        await loadHistory();
        if (currentComicId === id) {
             handleNewProject();
        }
      }
  };

  const captureElement = async (elementId: string): Promise<string | null> => {
      const element = document.getElementById(elementId);
      if (!element) return null;
      
      try {
          const canvas = await html2canvas(element, {
              scale: 2, 
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
          });
          return canvas.toDataURL('image/jpeg', 0.9);
      } catch (e) {
          console.error(`Error capturing ${elementId}`, e);
          return null;
      }
  };

  const handleExportPDF = async () => {
    if (generatedPanels.length === 0) return;
    setIsExporting(true);

    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;

        const coverImg = await captureElement('comic-cover');
        if (coverImg) {
            doc.addImage(coverImg, 'JPEG', 0, 0, pageWidth, pageHeight);
        }

        const totalPages = Math.ceil(generatedPanels.length / appState.layout);

        for (let i = 1; i <= totalPages; i++) {
            const pageImg = await captureElement(`comic-page-${i}`);
            if (pageImg) {
                doc.addPage();
                doc.addImage(pageImg, 'JPEG', 0, 0, pageWidth, pageHeight);
            }
        }

        doc.save(`${comicTitle.replace(/\s+/g, '_')}_comic.pdf`);
    } catch (e) {
        console.error(e);
        setError("Błąd generowania PDF.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
     if (generatedPanels.length === 0) return;
     setIsExporting(true);

     try {
        const zip = new JSZip();
        const fullPagesFolder = zip.folder("full_pages");
        const rawArtFolder = zip.folder("raw_artwork");

        const coverImg = await captureElement('comic-cover');
        if (coverImg && fullPagesFolder) {
             const data = coverImg.split(',')[1];
             fullPagesFolder.file("cover.jpg", data, { base64: true });
        }
        
        const totalPages = Math.ceil(generatedPanels.length / appState.layout);

        for (let i = 1; i <= totalPages; i++) {
             const pageImg = await captureElement(`comic-page-${i}`);
             if (pageImg && fullPagesFolder) {
                 const data = pageImg.split(',')[1];
                 fullPagesFolder.file(`page_${i}.jpg`, data, { base64: true });
             }
        }

        for (const panel of generatedPanels) {
            if (panel.status === 'completed' && panel.imageUrl && rawArtFolder) {
                const rawData = panel.imageUrl.split(',')[1];
                rawArtFolder.file(`panel_${panel.panelNumber}.png`, rawData, { base64: true });
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const saveAs = (FileSaver as any).saveAs || FileSaver;
        saveAs(content, "comic_pack.zip");

     } catch (e) {
         console.error(e);
         setError("Błąd tworzenia archiwum ZIP.");
     } finally {
         setIsExporting(false);
     }
  };

  const getPages = () => {
      const pages = [];
      for (let i = 0; i < generatedPanels.length; i += appState.layout) {
          pages.push(generatedPanels.slice(i, i + appState.layout));
      }
      return pages;
  };

  const pages = getPages();

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 font-sans relative">
      
      {/* Dialogue Editor Modal */}
      {editingPanel && (
        <DialogueEditorModal 
          panel={editingPanel}
          style={appState.selectedStyle}
          language={appState.language}
          onSave={handleSavePanelChanges}
          onClose={() => setEditingPanel(null)}
        />
      )}
      
      {/* Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div 
                    className="flex items-center gap-2 cursor-pointer group" 
                    onClick={handleNewProject}
                    title={appState.language === 'pl' ? "Rozpocznij nowy projekt" : "Start new project"}
                >
                    <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-500 transition-colors">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-comic text-white tracking-wide group-hover:text-indigo-200 transition-colors">
                            komiks
                        </h1>
                        <p className="text-[10px] text-zinc-500 font-mono hidden md:block">Edycja A4 • Gemini 2.5</p>
                    </div>
                </div>

                {/* Auto-save Indicator */}
                {(autoSaveStatus !== 'idle' || lastSavedTime) && generatedPanels.length > 0 && (
                    <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
                        {autoSaveStatus === 'saving' ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                <span>{appState.language === 'pl' ? "Zapisywanie..." : "Saving..."}</span>
                            </>
                        ) : (
                            <>
                                <Cloud className="w-3 h-3 text-emerald-500" />
                                <span>
                                    {appState.language === 'pl' ? "Zapisano" : "Saved"}
                                    {lastSavedTime && ` ${lastSavedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex gap-2">
                 <button 
                    onClick={handleNewProject}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20 border border-emerald-500/50"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{appState.language === 'pl' ? "Nowy Projekt" : "New Project"}</span>
                </button>

                 <button 
                    onClick={() => setShowHistory(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors border border-zinc-700"
                >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">{appState.language === 'pl' ? "Historia" : "History"}</span>
                </button>

                {generatedPanels.length > 0 && (
                    <>
                        <button 
                            onClick={() => saveProject(false)} 
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span className="hidden sm:inline">{appState.language === 'pl' ? "Zapisz" : "Save"}</span>
                        </button>
                        <button 
                            onClick={handleExportZip} 
                            disabled={isExporting}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                            <span className="hidden sm:inline">ZIP</span>
                        </button>
                        <button 
                            onClick={handleExportPDF} 
                            disabled={isExporting}
                            className="bg-white hover:bg-zinc-200 text-black px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-white/10 disabled:opacity-50"
                        >
                             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    </>
                )}
            </div>
        </div>
      </header>

      {/* History Sidebar */}
      {showHistory && (
          <div className="fixed inset-0 z-[60] flex justify-end">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
              <div className="relative w-full max-w-md bg-zinc-900 h-full border-l border-zinc-800 p-6 overflow-y-auto shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <History className="w-5 h-5 text-indigo-400" /> {appState.language === 'pl' ? "Zapisane Komiksy" : "Saved Comics"}
                      </h2>
                      <button onClick={() => setShowHistory(false)} className="text-zinc-400 hover:text-white">✕</button>
                  </div>
                  
                  {savedComics.length === 0 ? (
                      <p className="text-zinc-500 text-center mt-10">{appState.language === 'pl' ? "Brak zapisanych komiksów." : "No saved comics."}</p>
                  ) : (
                      <div className="space-y-4">
                          {savedComics.map(comic => (
                              <div key={comic.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all group cursor-pointer" onClick={() => handleLoadComic(comic)}>
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <h3 className="font-bold text-zinc-200">{comic.title}</h3>
                                          <p className="text-xs text-zinc-500 mt-1">{appState.language === 'pl' ? "Autor" : "Author"}: {comic.author || "-"}</p>
                                          <p className="text-xs text-zinc-600 mt-1">{new Date(comic.createdAt).toLocaleDateString()} • {comic.panels.length} {appState.language === 'pl' ? "obrazków" : "panels"}</p>
                                      </div>
                                      <button 
                                        onClick={(e) => handleDeleteComic(e, comic.id)}
                                        className="text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-900/10 transition-colors"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto px-4 pt-10 space-y-12">
        
        {/* Input Section */}
        <section className="flex flex-col items-center">
            {generatedPanels.length === 0 && (
                <div className="text-center mb-10 max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <h2 className="text-4xl md:text-6xl font-comic text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-200 to-indigo-400 mb-6 drop-shadow-sm">
                        {appState.language === 'pl' ? "Twórz Komiksy w Formacie A4" : "Create A4 Comics with AI"}
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl font-light">
                        {appState.language === 'pl' 
                            ? "Kompletne narzędzie wydawnicze AI. Zapisz, wydrukuj, stwórz historię." 
                            : "Complete AI publishing tool. Save, print, create your story."}
                    </p>
                </div>
            )}

            <InputForm 
                state={appState}
                setState={setAppState}
                onSubmit={handleGenerate}
                isGenerating={isScriptGenerating || generatedPanels.some(p => p.status === 'generating')}
            />
        </section>

        {/* Error Message */}
        {error && (
            <div className="max-w-4xl mx-auto bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-200 animate-in fade-in">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
            </div>
        )}

        {/* Results Section (The Book) */}
        {generatedPanels.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                
                <div className="flex flex-col items-center mb-12">
                     <span className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-widest">
                         {appState.language === 'pl' ? "Podgląd Wydruku" : "Print Preview"}
                     </span>
                     <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
                </div>

                {/* The "Book" Layout */}
                <div className="flex flex-col gap-16 items-center pb-20">
                    
                    {/* Cover Page */}
                    <div className="w-full max-w-[500px]"> {/* ~A4 max width for screen */}
                         <ComicCover 
                            id="comic-cover"
                            title={comicTitle} 
                            author={appState.author} 
                            logo={appState.logo}
                            style={appState.selectedStyle}
                            language={appState.language}
                         />
                    </div>

                    {/* Pages Rendered Dynamically */}
                    {pages.map((pagePanels, index) => (
                        <div key={index} className="w-full max-w-[500px]">
                            <ComicPage 
                                id={`comic-page-${index + 1}`}
                                panels={pagePanels} 
                                style={appState.selectedStyle}
                                layout={appState.layout}
                                pageNumber={index + 1}
                                language={appState.language}
                                onRegeneratePanel={handleRegeneratePanel}
                                onEditPanel={handleEditPanel}
                            />
                        </div>
                    ))}

                    {/* EXTEND COMIC BUTTON SECTION */}
                    <div className="w-full max-w-[500px] bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
                        <h3 className="text-xl font-comic text-white mb-2">
                             {appState.language === 'pl' ? "Ciąg dalszy nastąpi...?" : "To be continued...?"}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            {appState.language === 'pl' 
                                ? "Czy chcesz dodać więcej stron do tej historii? AI wygeneruje kontynuację." 
                                : "Do you want to add more pages to this story? AI will generate a continuation."}
                        </p>
                        
                        <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-lg border border-zinc-800 mb-4">
                            <label className="text-sm text-zinc-300 font-bold px-2">
                                +
                            </label>
                             <select
                                value={extensionPageCount}
                                onChange={(e) => setExtensionPageCount(Number(e.target.value))}
                                className="bg-zinc-800 text-white rounded px-2 py-1 outline-none border border-zinc-700 focus:border-indigo-500"
                            >
                                {[1, 2, 3, 4, 5].map(num => (
                                    <option key={num} value={num}>{num} {appState.language === 'pl' ? (num === 1 ? 'Strona' : 'Strony') : (num === 1 ? 'Page' : 'Pages')}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleExtendComic}
                            disabled={isExtending || generatedPanels.some(p => p.status === 'generating')}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExtending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {appState.language === 'pl' ? "Pisanie scenariusza..." : "Writing script..."}
                                </>
                            ) : (
                                <>
                                    <Layers className="w-5 h-5" />
                                    {appState.language === 'pl' ? "Dodaj Strony" : "Add Pages"}
                                </>
                            )}
                        </button>
                    </div>

                    {/* MARKETING ASSETS SECTION */}
                    <div className="w-full max-w-[900px] mt-12 pt-12 border-t border-zinc-800">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-comic text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
                                {appState.language === 'pl' ? "Studio Wydawnicze" : "Publishing Studio"}
                            </h3>
                            <p className="text-zinc-500 text-sm">
                                {appState.language === 'pl' 
                                    ? "Wygeneruj profesjonalne materiały do promocji swojego komiksu" 
                                    : "Generate professional assets to promote your comic"}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Intro Page Card */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center hover:border-emerald-500/50 transition-colors">
                                <div className="w-16 h-16 bg-emerald-900/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                                    <ImageIcon className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h4 className="font-bold text-white mb-2">
                                    {appState.language === 'pl' ? "Okładka Premium" : "Premium Cover Art"}
                                </h4>
                                <p className="text-xs text-zinc-400 text-center mb-6 h-8">
                                    {appState.language === 'pl' ? "Kinowa, wysokiej jakości grafika promocyjna." : "Cinematic, high-quality promotional artwork."}
                                </p>

                                <div className="w-full aspect-[2/3] bg-zinc-950 rounded-lg mb-6 overflow-hidden flex items-center justify-center border border-zinc-800 relative group">
                                    {marketingAssets.INTRO_PAGE.status === 'generating' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                            <span className="text-xs text-emerald-500 animate-pulse">Generowanie AI...</span>
                                        </div>
                                    ) : marketingAssets.INTRO_PAGE.imageUrl ? (
                                        <>
                                            <img src={marketingAssets.INTRO_PAGE.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={() => downloadAsset(marketingAssets.INTRO_PAGE)}
                                                    className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform"
                                                >
                                                    <Download className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-zinc-700 text-sm">Podgląd</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleGenerateAsset('INTRO_PAGE')}
                                    disabled={marketingAssets.INTRO_PAGE.status === 'generating'}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                                >
                                    {marketingAssets.INTRO_PAGE.status === 'generating' 
                                        ? (appState.language === 'pl' ? "Generowanie..." : "Generating...") 
                                        : (appState.language === 'pl' ? "Generuj Okładkę" : "Generate Cover")}
                                </button>
                            </div>

                            {/* Box Mockup Card */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center hover:border-cyan-500/50 transition-colors">
                                <div className="w-16 h-16 bg-cyan-900/20 rounded-full flex items-center justify-center mb-4 border border-cyan-500/20">
                                    <Package className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h4 className="font-bold text-white mb-2">
                                    {appState.language === 'pl' ? "Pudełko Kolekcjonerskie" : "Collector's Box"}
                                </h4>
                                <p className="text-xs text-zinc-400 text-center mb-6 h-8">
                                    {appState.language === 'pl' ? "Wizualizacja 3D produktu na białym tle." : "3D product visualization on white background."}
                                </p>

                                <div className="w-full aspect-[4/3] bg-zinc-950 rounded-lg mb-6 overflow-hidden flex items-center justify-center border border-zinc-800 relative group">
                                     {marketingAssets.BOX_MOCKUP.status === 'generating' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                                            <span className="text-xs text-cyan-500 animate-pulse">Renderowanie 3D...</span>
                                        </div>
                                    ) : marketingAssets.BOX_MOCKUP.imageUrl ? (
                                        <>
                                            <img src={marketingAssets.BOX_MOCKUP.imageUrl} alt="Box" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={() => downloadAsset(marketingAssets.BOX_MOCKUP)}
                                                    className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform"
                                                >
                                                    <Download className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-zinc-700 text-sm">Podgląd</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleGenerateAsset('BOX_MOCKUP')}
                                    disabled={marketingAssets.BOX_MOCKUP.status === 'generating'}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                                >
                                     {marketingAssets.BOX_MOCKUP.status === 'generating' 
                                        ? (appState.language === 'pl' ? "Tworzenie..." : "Creating...") 
                                        : (appState.language === 'pl' ? "Generuj Pudełko" : "Generate Box")}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </section>
        )}
      </main>
    </div>
  );
}