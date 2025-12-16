
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ComicStory, PanelData, ComicStyle, Language, GeneratedPanel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Dynamic schema generation based on panel count
const createStorySchema = (panelCount: number, language: Language): Schema => {
  const langName = language === 'pl' ? 'Polish' : 'English';
  
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: `Catchy comic title in ${langName}.` },
      panels: {
        type: Type.ARRAY,
        description: `Array of comic panels. Generate exactly ${panelCount} items.`,
        items: {
          type: Type.OBJECT,
          properties: {
            panelNumber: { type: Type.INTEGER },
            visualDescription: { 
              type: Type.STRING, 
              description: "Detailed visual description of the scene for an IMAGE GENERATOR in ENGLISH. Describe characters, lighting, action. Square or 4:3 aspect ratio." 
            },
            dialogue: { type: Type.STRING, description: `Character dialogue in ${langName}.` },
            character: { type: Type.STRING, description: "Name of the speaking character (if any)." },
            caption: { type: Type.STRING, description: `Narrative caption describing what is happening, in ${langName}.` },
          },
          required: ["panelNumber", "visualDescription"],
        },
      },
    },
    required: ["title", "panels"],
  };
};

export const generateStoryIdea = async (language: Language): Promise<string> => {
  const model = "gemini-2.5-flash";
  
  const usMarketContext = "Focus on high-concept, catchy themes popular in the USA market (e.g., Hollywood blockbusters, trending Netflix series, classic superhero tropes, or dark horse indie vibes). The idea should sound like a bestseller pitch.";

  const langPrompt = language === 'pl' 
    ? `Wymyśl jeden kreatywny, chwytliwy pomysł na komiks, bazując na trendach z USA. ${usMarketContext}. Zwróć tylko treść pomysłu w jednym lub dwóch zdaniach po polsku.`
    : `Come up with one creative, catchy comic book idea based on US market trends. ${usMarketContext}. Return only the idea content in one or two sentences in English.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: langPrompt,
      config: { temperature: 1 }
    });
    const fallback = language === 'pl' ? "Strażnik czasu, który musi naprawić rok 1985." : "A timekeeper who must fix the year 1985.";
    return response.text?.trim() || fallback;
  } catch (error) {
    console.error("Error generating idea:", error);
    const fallback = language === 'pl' ? "Kot detektyw rozwiązuje zagadkę w Nowym Jorku." : "A detective cat solving a mystery in New York.";
    return fallback;
  }
};

export const generateCharacterName = async (storyDescription: string, style: ComicStyle, language: Language): Promise<string> => {
    const model = "gemini-2.5-flash";
    const langName = language === 'pl' ? 'Polish' : 'English';
    
    const prompt = `
      Based on the following story description: "${storyDescription || 'A generic cool story'}"
      And the art style: "${style.name}"
      
      Generate a cool, fitting name for the MAIN CHARACTER. 
      It should sound appealing to a US audience but written in ${langName} alphabet (if applicable).
      Return ONLY the name (e.g., "Jack Reacher" or "Neon-X"). No extra text.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 1 }
      });
      return response.text?.trim().replace(/["']/g, "") || (language === 'pl' ? "Nieznajomy" : "Stranger");
    } catch (error) {
      console.error("Error generating name:", error);
      return "Hero";
    }
  };

export const generateComicScript = async (
  prompt: string, 
  style: ComicStyle, 
  pageCount: number,
  layout: number,
  characterName: string,
  language: Language
): Promise<ComicStory> => {
  const model = "gemini-2.5-flash";
  const totalPanels = pageCount * layout;
  const langName = language === 'pl' ? 'POLISH' : 'ENGLISH';
  
  const characterContext = characterName ? `Main character is: ${characterName}.` : "";

  const systemInstruction = `You are a comic book author.
  Task: Create a comic script with ${totalPanels} panels, spread over ${pageCount} pages (${layout} per page).
  Style: ${style.name} (${style.description}).
  ${characterContext}
  
  REQUIREMENTS:
  1. visualDescription (ENGLISH): Describe the scene, character appearance, and setting for the Artist (AI).
  2. dialogue (${langName}): What characters say.
  3. caption (${langName}): Narrative description.
  4. title (${langName}): Title of the story.
  
  The story must be coherent, having a beginning, middle, and end.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: createStorySchema(totalPanels, language),
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from model");
    
    const parsed = JSON.parse(text);
    return {
        ...parsed,
        id: crypto.randomUUID(),
        createdAt: Date.now()
    } as ComicStory;
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

export const extendComicScript = async (
  existingPanels: GeneratedPanel[],
  currentTitle: string,
  style: ComicStyle,
  newPageCount: number,
  layout: number,
  characterName: string,
  language: Language
): Promise<PanelData[]> => {
  const model = "gemini-2.5-flash";
  const panelsToAdd = newPageCount * layout;
  const startPanelNumber = existingPanels.length + 1;
  const langName = language === 'pl' ? 'POLISH' : 'ENGLISH';
  const characterContext = characterName ? `Main character is: ${characterName}.` : "";

  // Get context from last few panels
  const recentPanels = existingPanels.slice(-3).map(p => 
    `Panel ${p.panelNumber}: ${p.caption || ''} ${p.character ? p.character + ':' : ''} ${p.dialogue || ''} (Visual: ${p.visualDescription})`
  ).join('\n');

  const systemInstruction = `You are a comic book author continuing an existing story.
  Title: "${currentTitle}"
  Style: ${style.name}
  ${characterContext}
  
  CONTEXT (Last 3 panels):
  ${recentPanels}
  
  TASK:
  Continue the story by generating ${panelsToAdd} NEW panels.
  Start numbering from Panel ${startPanelNumber}.
  
  REQUIREMENTS:
  1. visualDescription (ENGLISH): Describe scene for AI Artist.
  2. dialogue (${langName}).
  3. caption (${langName}).
  `;

  // Schema for just the panels array, not the whole story object
  const schema = {
    type: Type.ARRAY,
    description: `Array of ${panelsToAdd} new comic panels starting from number ${startPanelNumber}.`,
    items: {
      type: Type.OBJECT,
      properties: {
        panelNumber: { type: Type.INTEGER },
        visualDescription: { type: Type.STRING, description: "Visual description in English." },
        dialogue: { type: Type.STRING },
        character: { type: Type.STRING },
        caption: { type: Type.STRING },
      },
      required: ["panelNumber", "visualDescription"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Continue the story.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned for extension");
    
    // The schema returns just the array of panels
    const newPanels = JSON.parse(text) as PanelData[];
    return newPanels;

  } catch (error) {
    console.error("Error extending script:", error);
    throw error;
  }
};

export const generateDialogueSuggestions = async (
  panel: PanelData,
  style: ComicStyle,
  language: Language
): Promise<Array<{ type: string; text: string; caption?: string }>> => {
  const model = "gemini-2.5-flash";
  const langName = language === 'pl' ? 'Polish' : 'English';
  
  const systemInstruction = `You are a comic dialogue editor.
  Task: Generate 3 distinct dialogue options for a comic panel.
  
  Panel Visuals: "${panel.visualDescription}"
  Current Dialogue: "${panel.dialogue || ''}"
  Character: "${panel.character || 'Unknown'}"
  Style: ${style.name}
  Language: ${langName}
  
  Return 3 options:
  1. Standard/Consistent: Fits the story perfectly.
  2. Dramatic/Intense: More emotional or action-packed.
  3. Funny/Witty: A lighter or humorous take (if appropriate).
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: "Type of option (e.g., Dramatic, Funny)" },
        text: { type: Type.STRING, description: "The dialogue text" },
        caption: { type: Type.STRING, description: "Optional narrative caption to go with it" }
      },
      required: ["type", "text"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Generate dialogue options.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8,
      },
    });

    return JSON.parse(response.text || '[]') as Array<{ type: string; text: string; caption?: string }>;
  } catch (e) {
    console.error("Dialogue generation failed", e);
    return [];
  }
};

// Helper to strip data:image/xyz;base64, prefix
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

export const detectSpeechBubblePosition = async (
    base64Image: string
): Promise<{ x: number, y: number }> => {
    const model = "gemini-2.5-flash";
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64(base64Image)
                        }
                    },
                    {
                        text: "Analyze this image. Locate the head of the main speaker/character. Return the X and Y coordinates (as percentages 0-100) where a speech bubble should be placed slightly above their head. Return JSON: { \"x\": number, \"y\": number }."
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER }
                    }
                }
            }
        });

        const text = response.text;
        if(text) {
             const coords = JSON.parse(text);
             // Clamp values to keep inside frame
             return {
                 x: Math.min(Math.max(coords.x, 10), 90),
                 y: Math.min(Math.max(coords.y, 10), 80)
             };
        }
        return { x: 50, y: 20 }; // Default
    } catch (e) {
        console.error("Failed to detect bubble position", e);
        return { x: 50, y: 20 }; // Default fallback
    }
};

export const generatePanelImage = async (
  panel: PanelData, 
  style: ComicStyle, 
  characterName: string,
  styleReference: string | null
): Promise<string> => {
  const model = "gemini-2.5-flash-image"; 
  
  const characterInfo = characterName ? `Main character is ${characterName}. Keep appearance consistent.` : "";
  let imagePrompt = `
    Generate an image for a comic book panel.
    Style Description: ${style.name} - ${style.description}.
    ${characterInfo}
    Scene Description: ${panel.visualDescription}.
    
    Requirements:
    - High quality, detailed, cinematic lighting.
    - NO TEXT, NO SPEECH BUBBLES inside the artwork.
    - STRICTLY RETURN AN IMAGE. Do not provide textual commentary.
  `;

  if (styleReference) {
      imagePrompt += "\nStyle Reference: USE THE ATTACHED IMAGE AS A STRICT STYLE REFERENCE for line art style, color palette, and mood.";
  }

  const parts: any[] = [];
  
  // If style reference exists, add it as inline data
  if (styleReference) {
      parts.push({
          inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg for simplicity, or we could parse from string
              data: cleanBase64(styleReference)
          }
      });
  }

  parts.push({ text: imagePrompt });

  // Retry logic to handle cases where model returns text instead of image
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      console.warn(`Attempt ${attempt}: Model returned text only or no data. Retrying...`);
      // Optional: Log what it returned for debugging
      // console.log("Returned text:", response.candidates?.[0]?.content?.parts?.[0]?.text);

    } catch (error) {
      console.error(`Attempt ${attempt} error for panel ${panel.panelNumber}:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to generate image after 3 attempts (No image data found).");
};

export const generateMarketingAsset = async (
  type: 'INTRO_PAGE' | 'BOX_MOCKUP',
  comicTitle: string,
  style: ComicStyle,
  characterName: string,
  base64CoverImage?: string,
  author?: string
): Promise<string> => {
    const model = "gemini-2.5-flash-image";
    let prompt = "";
    let aspectRatio = "1:1";

    if (type === 'INTRO_PAGE') {
        aspectRatio = "3:4";
        prompt = `
            Create a cinematic, high-quality comic book cover/intro page art.
            Title concept: "${comicTitle}".
            Author: "${author || 'Unknown'}".
            Style: ${style.name} (${style.description}).
            Character: ${characterName}.
            Epic pose, dramatic lighting, vertical composition (Aspect Ratio 3:4).
            Integrate the Title visually if possible, or leave space for it.
        `;
    } else {
        prompt = `
            Product photography, 3D render of a collector's box set for a comic book.
            The box should have the comic art style: ${style.name}.
            Title on box: "${comicTitle}".
            Isometric view, studio lighting, white background.
            High quality, photorealistic 3D mockup.
        `;
    }

    const parts: any[] = [{ text: prompt }];

    // If we had a cover image to project onto the box, we could pass it, but for now we generate from scratch/style
    // to keep it simple. If base64CoverImage was passed, we could use it as style ref.
    if (base64CoverImage && type === 'BOX_MOCKUP') {
        parts.unshift({
             inlineData: {
                 mimeType: 'image/jpeg',
                 data: cleanBase64(base64CoverImage)
             }
        });
        parts[1].text += "\nUse the attached image as the cover art on the box.";
    }

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: { parts },
                config: {
                    imageConfig: { aspectRatio: aspectRatio as any }
                }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        } catch (e) {
             console.error(`Marketing asset attempt ${attempt} failed`, e);
             lastError = e;
        }
    }
    throw lastError || new Error("No image data found");
};
