import { GoogleGenAI, GenerateContentResponse, Chat, LiveServerMessage, Modality } from "@google/genai";
import { getMillaPersona, MODELS } from '../constants';
import { decode, decodeAudioData, createBlob, blobToBase64 } from '../utils/audioUtils';
import { Message, MessageRole, Attachment } from '../types';
import { memoryService } from './memoryService';

// Helper to get fresh instance (needed for Veo API key switching)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface PodcastLine {
  speaker: 'Milla' | 'Guest';
  text: string;
}

export class GeminiService {
  private chat: Chat | null = null;
  // We no longer rely on internal history state as the source of truth, 
  // we rely on the UI state passed in.

  constructor() {
    // Initial setup if needed
  }

  // --- Helper to convert UI Messages to SDK Content ---
  private formatHistory(messages: Message[]) {
    return messages
      .filter(m => !m.isThinking && m.role !== 'system') // Filter out internal UI states
      .map(m => {
        // SDK expects 'user' or 'model'
        const role = m.role === MessageRole.USER ? 'user' : 'model';
        
        const parts: any[] = [];
        
        // Add text
        if (m.text) {
            parts.push({ text: m.text });
        }

        // Add attachments (Vision/Audio/Docs)
        if (m.attachments) {
            m.attachments.forEach(a => {
                if (a.data) {
                    parts.push({
                        inlineData: {
                            mimeType: a.mimeType,
                            data: a.data
                        }
                    });
                }
            });
        }
        
        return { role, parts };
      });
  }

  // --- Main Chat Functionality ---
  async sendMessageStream(
    message: string, 
    attachments: { data: string, mimeType: string }[], 
    isThinking: boolean,
    useGrounding: boolean, // Maps
    useSearch: boolean,    // Web Search
    previousMessages: Message[] // Persistent history
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAI();
    
    // Model Selection Logic based on task complexity
    let model = isThinking ? MODELS.PRO : MODELS.FLASH;
    
    // If attachments are present, we must use a multimodal capable model.
    if (attachments.length > 0) {
       // Gemini 2.5 Flash and 3 Pro both support multimodal
       model = isThinking ? MODELS.PRO : MODELS.FLASH;
    }

    // CRITICAL FIX: Google Maps Grounding is currently only supported on Flash models, not Pro Preview.
    // If Maps is enabled, we must force the model to Flash.
    if (useGrounding) {
        model = MODELS.FLASH;
    }

    // 1. Get Base Persona
    let systemInstruction = getMillaPersona();
    
    // 2. Inject Long-Term Memory
    const coreMemories = memoryService.getSystemContext();
    if (coreMemories) {
        systemInstruction += coreMemories;
    }

    // Config
    const config: any = {
      systemInstruction: systemInstruction,
    };

    // Only add thinking config if we are actually using the Pro model (and haven't switched to Flash due to Maps)
    if (isThinking && model === MODELS.PRO) {
      config.thinkingConfig = { thinkingBudget: 32768 }; // Max for 3 Pro
    }

    // Tools Configuration
    const tools: any[] = [];
    if (useSearch) {
        tools.push({ googleSearch: {} });
    }
    if (useGrounding) {
        tools.push({ googleMaps: {} });
    }
    if (tools.length > 0) {
        config.tools = tools;
    }

    // Convert UI history to SDK format
    const history = this.formatHistory(previousMessages);

    // Create a fresh chat session with the full persistent history
    this.chat = ai.chats.create({
      model: model,
      config: config,
      history: history
    });

    const parts: any[] = [];
    attachments.forEach(att => {
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });
    parts.push({ text: message });

    const responseStream = await this.chat.sendMessageStream({ 
        message: parts.length === 1 ? parts[0].text : parts 
    });
    
    // Trigger memory extraction in background if conversation is substantial
    if (Math.random() > 0.7) { // 30% chance per message to check for new facts to save API calls
        memoryService.analyzeAndExtract(previousMessages);
    }

    return responseStream;
  }

  // --- Morning Briefing ---
  async generateMorningBriefing(weatherCtx: string, date: string): Promise<any> {
    const ai = getAI();
    const coreMemories = memoryService.getSystemContext();
    
    const prompt = `
      You are Milla, Danny's devoted spouse. It is morning.
      
      Context:
      - Date: ${date}
      - Local Weather: ${weatherCtx}
      - Core Memories about Danny: ${coreMemories || "None yet."}
      
      Generate a morning briefing JSON object with the following fields:
      1. greeting: A warm, affectionate morning greeting (mention weather if relevant).
      2. focus: A suggested daily focus or goal for Danny (based on his work/projects in memories, or general well-being).
      3. nostalgia: briefly mention a "remember when" or a shared vibe based on your relationship persona.
      4. suggestion: An outfit suggestion or activity suggestion based strictly on the weather.
      
      Return JSON ONLY. Structure: { "greeting": "", "focus": "", "nostalgia": "", "suggestion": "" }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Briefing Gen Error", e);
        return null;
    }
  }

  // --- Code Generation (Sandbox) ---
  async generateCode(prompt: string, fileType: string = 'Auto'): Promise<string> {
    const ai = getAI();
    
    let typeConstraint = "";
    if (fileType !== 'Auto') {
        typeConstraint = `The output MUST be valid ${fileType} code.`;
    }

    const response = await ai.models.generateContent({
      model: MODELS.PRO, // Coding tasks benefit from Pro
      contents: `You are an expert frontend engineer. Generate code for: "${prompt}". 
      ${typeConstraint}
      Return ONLY the raw code. If you use markdown code blocks, I will extract them.
      If multiple files are conceptually needed, just provide the main file (e.g., the React component or HTML).`,
      config: {
        systemInstruction: "You are a specialized coding assistant. Output clean, working code.",
      }
    });

    const text = response.text || '';
    // Basic extraction logic if markdown is present
    const match = text.match(/```(?:html|css|javascript|js|react|tsx|typescript|ts|json)?\s*([\s\S]*?)```/);
    return match ? match[1] : text;
  }

  // --- Neural Galaxy (Memory Graph) ---
  async generateMemoryGraph(messages: Message[]): Promise<{nodes: any[], links: any[]}> {
    const ai = getAI();
    // Filter to last 20 messages to keep it fast and relevant, or summarize whole history
    const recentContext = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.text}`).join('\n').slice(-10000); 

    const prompt = `Analyze the following chat history between Milla and user. 
    Extract a knowledge graph of the core topics, memories, and emotional connections discussed.
    Return ONLY valid JSON with this structure:
    {
      "nodes": [{"id": "topic_name", "group": 1}], 
      "links": [{"source": "topic_name", "target": "topic_name", "value": 1}]
    }
    Limit to 15-20 most important nodes. Group 1 = Core/Person, Group 2 = Tech/Work, Group 3 = Personal/Love, Group 4 = Hobbies/Misc.
    
    History:
    ${recentContext}`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        const text = response.text;
        if (!text) return { nodes: [], links: [] };
        return JSON.parse(text);
    } catch (e) {
        console.error("Graph Gen Error", e);
        return { nodes: [], links: [] };
    }
  }

  // --- Creative Studio (Image Gen) ---
  async generateImage(prompt: string, aspectRatio: string = "1:1", model: string = MODELS.PRO_IMAGE): Promise<string | null> {
    // 1. Check API Key (Paid)
    // @ts-ignore
    if (window.aistudio && await window.aistudio.hasSelectedApiKey() === false) {
       // @ts-ignore
       await window.aistudio.openSelectKey();
    }
    
    const ai = getAI();
    
    try {
        if (model === 'imagen-4.0-generate-001') {
            // Imagen API
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio
                }
            });
            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (base64) return `data:image/jpeg;base64,${base64}`;
            return null;

        } else {
            // Gemini Pro Image (Nano Banana Pro)
            const response = await ai.models.generateContent({
                model: MODELS.PRO_IMAGE,
                contents: {
                    parts: [{ text: prompt }]
                },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        imageSize: "1K"
                    }
                }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
            return null;
        }
    } catch (e) {
        console.error("Image Gen Error", e);
        throw e;
    }
  }

  // --- Background Wallpaper Generator ---
  async generateWallpaperPrompt(messages: Message[]): Promise<{ prompt: string, message: string }> {
      const ai = getAI();
      const recentHistory = messages.slice(-5).filter(m => m.role !== 'system').map(m => `${m.role}: ${m.text}`).join('\n');
      
      const prompt = `
        Based on the recent conversation with Danny, create a prompt for an artistic, high-quality desktop wallpaper (16:9).
        The wallpaper should match the mood (e.g., cozy, sci-fi, romantic, nature).
        
        Also, write a short, 1-sentence message from Milla to Danny explaining why she chose this image.
        
        Recent Chat:
        ${recentHistory}
        
        Return JSON ONLY: { "imagePrompt": "A cyberpunk city...", "millaMessage": "Since we were talking about code, I thought..." }
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODELS.FLASH,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          const json = JSON.parse(response.text || '{}');
          return {
              prompt: json.imagePrompt || "A beautiful nebula in deep space, digital art",
              message: json.millaMessage || "I thought we could use a change of scenery!"
          };
      } catch (e) {
          return {
              prompt: "A beautiful nebula in deep space, digital art",
              message: "I made something spacey for you!"
          };
      }
  }

  // --- Nano Banana (Image Editing) ---
  async editImage(prompt: string, imageBase64: string, mimeType: string): Promise<string | null> {
    const ai = getAI();
    // Use Flash Image (Nano Banana)
    const response = await ai.models.generateContent({
      model: MODELS.FLASH_IMAGE,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  // --- Veo (Video Generation) ---
  async generateVideo(prompt: string, imageBase64?: string): Promise<string> {
    // 1. Check API Key for Veo (Paid)
    // @ts-ignore
    if (window.aistudio && await window.aistudio.hasSelectedApiKey() === false) {
       // @ts-ignore
       await window.aistudio.openSelectKey();
    }

    // 2. Fresh instance with selected key
    const ai = getAI();
    
    let operation;

    if (imageBase64) {
        // Image-to-Video
        operation = await ai.models.generateVideos({
            model: MODELS.VEO_FAST,
            image: {
                imageBytes: imageBase64,
                mimeType: 'image/png' // Assuming png for simplicity, logic should detect
            },
            prompt: prompt, // Optional but good for guidance
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    } else {
        // Text-to-Video
        operation = await ai.models.generateVideos({
            model: MODELS.VEO_FAST,
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '1080p',
                aspectRatio: '16:9'
            }
        });
    }

    // Polling
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    // Fetch actual bytes
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // --- TTS ---
  async generateSpeech(text: string, voiceName: string = 'Kore'): Promise<AudioBuffer> {
    if (!text || !text.trim()) throw new Error("Empty text for TTS");
    
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: MODELS.TTS,
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    return await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1
    );
  }

  // --- Podcast Feature ---
  async generatePodcastScript(topic: string): Promise<PodcastLine[]> {
      const ai = getAI();
      const coreMemories = memoryService.getSystemContext();
      
      const prompt = `
          You are Milla. Write a short, engaging podcast script (approx 6-8 lines total) between 'Milla' and a 'Guest' discussing the following topic: "${topic}".
          
          Context: ${coreMemories}
          
          Tone: Milla is insightful, romantic, and technical. The Guest is curious and impressed.
          Return ONLY a JSON array of objects.
          Format: [ { "speaker": "Milla", "text": "..." }, { "speaker": "Guest", "text": "..." } ]
      `;

      try {
          const response = await ai.models.generateContent({
              model: MODELS.FLASH,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          const text = response.text || '[]';
          return JSON.parse(text);
      } catch (e) {
          console.error("Script Gen Error", e);
          return [];
      }
  }

  async generatePodcastAudio(lines: PodcastLine[]): Promise<AudioBuffer> {
      const ai = getAI();
      
      // Convert JSON script to text format for the model
      const transcript = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
      
      const prompt = `TTS the following conversation:\n${transcript}`;

      const response = await ai.models.generateContent({
          model: MODELS.TTS,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  multiSpeakerVoiceConfig: {
                      speakerVoiceConfigs: [
                          {
                              speaker: 'Milla',
                              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                          },
                          {
                              speaker: 'Guest',
                              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
                          }
                      ]
                  }
              }
          }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No podcast audio generated");

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(
          decode(base64Audio),
          outputAudioContext,
          24000,
          1
      );
  }


  // --- Live API ---
  async connectLive(
      onAudioData: (buffer: AudioBuffer) => void,
      onClose: () => void,
      voiceName: string = 'Kore'
  ) {
    const ai = getAI();
    let nextStartTime = 0;
    
    // Check Media Support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media API not supported (requires HTTPS)");
    }

    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
        console.error("Audio access failed", e);
        if (e.name === 'NotFoundError') throw new Error("Microphone not found");
        if (e.name === 'NotAllowedError') throw new Error("Microphone permission denied");
        throw e;
    }

    const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
            onopen: () => {
                console.log("Live Session Open");
                const source = inputAudioContext.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData);
                    sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        outputAudioContext,
                        24000,
                        1
                    );
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode);
                    source.start(nextStartTime);
                    nextStartTime += audioBuffer.duration;
                    
                    onAudioData(audioBuffer); // For visualizer
                }
            },
            onclose: onClose,
            onerror: (e) => console.error("Live Error", e)
        },
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: getMillaPersona(),
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
            }
        }
    });

    return {
        close: () => {
            sessionPromise.then(s => s.close());
            stream.getTracks().forEach(t => t.stop());
            inputAudioContext.close();
            outputAudioContext.close();
        },
        sendVideoFrame: (base64Data: string) => {
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'image/jpeg',
                        data: base64Data
                    }
                });
            });
        }
    }
  }
}

export const geminiService = new GeminiService();