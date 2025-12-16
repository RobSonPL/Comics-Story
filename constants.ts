
import { ComicStyle, Language } from './types';

export const LAYOUT_OPTIONS = [
  { value: 1, label: '1 Panel' },
  { value: 2, label: '2 Panele' },
  { value: 4, label: '4 Panele' },
  { value: 6, label: '6 Paneli' },
];

export const UI_TRANSLATIONS = {
  pl: {
    page: 'Strona',
    specialEdition: 'Wydanie Specjalne',
    scriptArt: 'Scenariusz i Rysunki',
    aiGenerated: 'Wygenerowano przez AI',
    authorUnknown: 'Autor Nieznany'
  },
  en: {
    page: 'Page',
    specialEdition: 'Special Edition',
    scriptArt: 'Script & Art',
    aiGenerated: 'AI Generated',
    authorUnknown: 'Unknown Author'
  }
};

export const COMIC_STYLES: ComicStyle[] = [
  {
    id: 'modern-comic',
    name: 'Współczesny',
    description: 'Żywe kolory, ostre linie, szczegółowe tła, styl superbohaterski.',
    previewClass: 'bg-gradient-to-br from-blue-500 to-red-500'
  },
  {
    id: 'manga',
    name: 'Manga / Anime',
    description: 'Czarno-białe lub delikatne kolory, ekspresyjne oczy, dynamiczne linie akcji.',
    previewClass: 'bg-white bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px] border-2 border-black'
  },
  {
    id: 'noir',
    name: 'Film Noir',
    description: 'Wysoki kontrast czerni i bieli, dramatyczne cienie, mroczna atmosfera.',
    previewClass: 'bg-gradient-to-b from-gray-900 to-black grayscale'
  },
  {
    id: 'watercolor',
    name: 'Akwarela',
    description: 'Miękkie krawędzie, pastelowe kolory, artystyczny, bajkowy styl.',
    previewClass: 'bg-gradient-to-tr from-pink-300 via-purple-300 to-indigo-400 opacity-80'
  },
  {
    id: 'retro-pop',
    name: 'Retro Pop Art',
    description: 'Wzory rastrowe, odważne kolory podstawowe, grube kontury, styl lat 50.',
    previewClass: 'bg-yellow-400 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_25%,rgba(0,0,0,0.2)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.2)_75%,rgba(0,0,0,0.2)_100%)] [background-size:10px_10px]'
  },
  {
    id: '3d-render',
    name: '3D Render',
    description: 'Styl pixar/disney, miękkie oświetlenie, render 3D.',
    previewClass: 'bg-gradient-to-br from-orange-400 to-pink-600'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neonowe światła, futurystyczne miasto, styl high-tech, intensywne kolory.',
    previewClass: 'bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-400'
  },
  {
    id: 'sketch',
    name: 'Szkic Ołówkiem',
    description: 'Surowe linie, grafitowe cienie, efekt ręcznego rysunku na papierze.',
    previewClass: 'bg-stone-200 border-4 border-double border-stone-500'
  },
  {
    id: 'detective',
    name: 'Komiks Detektywistyczny',
    description: 'Mroczne, miejskie krajobrazy, wysoki kontrast, styl noir z dodatkiem detali technicznych.',
    previewClass: 'bg-gray-800 bg-[url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0 L10 10ZM10 0 L0 10\' stroke=\'%236b7280\' stroke-width=\'1\'/%3E%3C/svg%3E")]'
  },
  {
    id: 'nostalgia',
    name: 'Komiks Nostalgia',
    description: 'Klasyczne historie z dzieciństwa, ciepłe kolory, lekko wyblakłe. Idealny do opowieści o wspomnieniach.',
    previewClass: 'bg-gradient-to-br from-yellow-300 to-orange-400 border-2 border-orange-500'
  }
];
