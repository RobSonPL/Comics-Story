
export interface ComicStyle {
  id: string;
  name: string;
  description: string;
  previewClass: string; // CSS class for the thumbnail
  titleFont?: string; // Font class for titles
  bubbleFont?: string; // Font class for bubbles
}

export interface PanelData {
  panelNumber: number;
  visualDescription: string;
  dialogue?: string;
  caption?: string;
  character?: string;
}

export interface GeneratedPanel extends PanelData {
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface ComicStory {
  id?: string;
  title: string;
  panels: PanelData[];
  createdAt?: number;
}

export type LayoutOption = 1 | 2 | 4 | 6;
export type Language = 'pl' | 'en';

export interface AppState {
  prompt: string;
  characterName: string;
  author: string;
  logo: string | null; // Base64 string
  styleReference: string | null; // Base64 string for style transfer
  pageCount: number;
  selectedStyle: ComicStyle;
  layout: LayoutOption;
  language: Language;
}

export type MarketingAssetType = 'INTRO_PAGE' | 'BOX_MOCKUP';

export interface MarketingAsset {
  type: MarketingAssetType;
  imageUrl?: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
}
