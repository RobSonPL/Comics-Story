import React, { useState } from 'react';
import { GeneratedPanel, ComicStyle, Language } from '../types';
import { generateDialogueSuggestions } from '../services/geminiService';
import { Sparkles, MessageSquare, X, Save, Wand2 } from 'lucide-react';

interface DialogueEditorModalProps {
  panel: GeneratedPanel;
  style: ComicStyle;
  language: Language;
  onSave: (panelId: number, updates: Partial<GeneratedPanel>) => void;
  onClose: () => void;
}

export const DialogueEditorModal: React.FC<DialogueEditorModalProps> = ({
  panel,
  style,
  language,
  onSave,
  onClose
}) => {
  const [character, setCharacter] = useState(panel.character || '');
  const [dialogue, setDialogue] = useState(panel.dialogue || '');
  const [caption, setCaption] = useState(panel.caption || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; text: string; caption?: string }>>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const results = await generateDialogueSuggestions(panel, style, language);
      setSuggestions(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestion = (s: { text: string; caption?: string }) => {
    setDialogue(s.text);
    if (s.caption) setCaption(s.caption);
  };

  const handleSave = () => {
    onSave(panel.panelNumber, { character, dialogue, caption });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            {language === 'pl' ? 'Edytuj Dialogi' : 'Edit Dialogue'} <span className="text-zinc-500 text-sm font-mono">#{panel.panelNumber}</span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Visual Context */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-400 italic">
            Visual: {panel.visualDescription}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                {language === 'pl' ? 'Postać' : 'Character'}
              </label>
              <input
                type="text"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-zinc-400 uppercase">
                  {language === 'pl' ? 'Dialog' : 'Dialogue'}
                </label>
                <button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  <Wand2 className="w-3 h-3" />
                  {isGenerating 
                    ? (language === 'pl' ? 'Generowanie...' : 'Generating...') 
                    : (language === 'pl' ? 'Generuj Propozycje AI' : 'AI Suggestions')}
                </button>
              </div>
              <textarea
                value={dialogue}
                onChange={(e) => setDialogue(e.target.value)}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none font-comic tracking-wide"
              />
            </div>

            {suggestions.length > 0 && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applySuggestion(s)}
                    className="text-left bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 rounded p-2 text-sm transition-colors group"
                  >
                    <span className="text-[10px] uppercase font-bold text-indigo-400 mb-1 block">{s.type}</span>
                    <p className="text-zinc-200 group-hover:text-white">"{s.text}"</p>
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                {language === 'pl' ? 'Narracja (Caption)' : 'Caption'}
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none font-comic"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-bold transition-colors"
          >
            {language === 'pl' ? 'Anuluj' : 'Cancel'}
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20"
          >
            <Save className="w-4 h-4" />
            {language === 'pl' ? 'Zapisz Zmiany' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};