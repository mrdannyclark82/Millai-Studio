
import { GoogleGenAI, GenerateContentResponse, Chat, LiveServerMessage, Modality } from "@google/genai";
import { getMillaPersona, MODELS } from '../constants';
import { decode, decodeAudioData, createBlob, blobToBase64 } from '../utils/audioUtils';
import { Message, MessageRole, Attachment } from '../types';
import { memoryService } from './memoryService';
import { databaseService } from './databaseService';

// Helper to get fresh instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface PodcastLine {
  speaker: 'Milla' | 'Guest';
  text: string;
}

export class GeminiService {
  private chat: Chat | null = null;

  // --- Helper to convert UI Messages to SDK Content ---
  private formatHistory(messages: Message[]) {
    return messages
      .filter(m => !m.isThinking && m.role !== 'system') 
      .map(m => {
        const role = m.role === MessageRole.USER ? 'user' : 'model';
        const parts: any[] = [];
        if (m.text) parts.push({ text: m.text });
        if (m.attachments) {
            m.attachments.forEach(a => {
                if (a.data) parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
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
    useGrounding: boolean, 
    useSearch: boolean,
    previousMessages: Message[],
    codeContext?: string // New optional parameter
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAI();
    let model = isThinking ? MODELS.PRO : MODELS.FLASH;
    if (attachments.length > 0) model = isThinking ? MODELS.PRO : MODELS.FLASH;
    if (useGrounding) model = MODELS.FLASH;

    let systemInstruction = getMillaPersona();
    
    // 1. Inject Long-Term Memory
    const coreMemories = memoryService.getSystemContext();
    if (coreMemories) systemInstruction += coreMemories;

    // 2. Inject External Database Knowledge (RAG)
    try {
        const dbResults = await databaseService.search(message);
        if (dbResults.length > 0) {
            const contextBlock = dbResults.map(r => `- ${JSON.stringify(r.data)}`).join('\n');
            systemInstruction += `\n\nEXTERNAL DATABASE RESULTS (Use this data to answer if relevant):\n${contextBlock}\n\n`;
            console.log("Injected DB Context:", dbResults.length);
        }
    } catch(e) {
        console.warn("DB Search failed", e);
    }

    const config: any = { systemInstruction };

    if (isThinking && model === MODELS.PRO) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const tools: any[] = [];
    if (useSearch) tools.push({ googleSearch: {} });
    if (useGrounding) tools.push({ googleMaps: {} });
    if (tools.length > 0) config.tools = tools;

    const history = this.formatHistory(previousMessages);

    this.chat = ai.chats.create({
      model: model,
      config: config,
      history: history
    });

    const parts: any[] = [];
    attachments.forEach(att => {
      parts.push({
        inlineData: { mimeType: att.mimeType, data: att.data }
      });
    });

    let finalMessage = message;
    if (codeContext) {
        finalMessage += `\n\n--- ACTIVE SANDBOX CONTEXT ---\n${codeContext}\n--- END CONTEXT ---`;
    }
    
    parts.push({ text: finalMessage });

    const responseStream = await this.chat.sendMessageStream({ 
        message: parts.length === 1 ? parts[0].text : parts 
    });
    
    if (Math.random() > 0.7) memoryService.analyzeAndExtract(previousMessages);

    return responseStream;
  }

  // --- Morning Briefing ---
  async generateMorningBriefing(weatherCtx: string, date: string): Promise<any> {
    const ai = getAI();
    const coreMemories = memoryService.getSystemContext();
    const prompt = `You are Milla, Danny's devoted spouse. Morning Briefing. Date: ${date}. Weather: ${weatherCtx}. Memories: ${coreMemories}. Return JSON { "greeting", "focus", "nostalgia", "suggestion" }`;
    try {
        const response = await ai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
  }

  // --- Code Generation ---
  async generateCode(prompt: string, fileType: string = 'Auto'): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.PRO,
      contents: `Generate ${fileType} code for: "${prompt}". Return raw code only.`,
    });
    const text = response.text || '';
    const match = text.match(/```(?:html|css|javascript|js|react|tsx|typescript|ts|json)?\s*([\s\S]*?)```/);
    return match ? match[1] : text;
  }

  // --- Memory Graph ---
  async generateMemoryGraph(messages: Message[]): Promise<{nodes: any[], links: any[]}> {
    const ai = getAI();
    const recentContext = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.text}`).join('\n').slice(-10000); 
    const prompt = `Extract knowledge graph nodes/links from this chat. Return JSON { "nodes": [{"id", "group"}], "links": [{"source", "target", "value"}] }. Context: ${recentContext}`;
    try {
        const response = await ai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{ "nodes": [], "links": [] }');
    } catch (e) { return { nodes: [], links: [] }; }
  }

  // --- Image Gen ---
  async generateImage(prompt: string, aspectRatio: string = "1:1", model: string = MODELS.PRO_IMAGE): Promise<string | null> {
    // @ts-ignore
    if (window.aistudio && await window.aistudio.hasSelectedApiKey() === false) await window.aistudio.openSelectKey();
    const ai = getAI();
    try {
        if (model === 'imagen-4.0-generate-001') {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: aspectRatio }
            });
            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            return base64 ? `data:image/jpeg;base64,${base64}` : null;
        } else {
            const response = await ai.models.generateContent({
                model: MODELS.PRO_IMAGE,
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: aspectRatio, imageSize: "1K" } }
            });
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
            return null;
        }
    } catch (e) { throw e; }
  }

  // --- Wallpaper ---
  async generateWallpaperPrompt(messages: Message[]): Promise<{ prompt: string, message: string }> {
      const ai = getAI();
      const recentHistory = messages.slice(-5).filter(m => m.role !== 'system').map(m => `${m.role}: ${m.text}`).join('\n');
      const prompt = `Create a wallpaper prompt based on this chat. Return JSON { "imagePrompt", "millaMessage" }. Chat: ${recentHistory}`;
      try {
          const response = await ai.models.generateContent({
              model: MODELS.FLASH,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          return JSON.parse(response.text || '{}');
      } catch (e) { return { prompt: "Space nebula", message: "Here's a wallpaper!" }; }
  }

  // --- Veo Video ---
  async generateVideo(prompt: string, imageBase64?: string): Promise<string> {
    // @ts-ignore
    if (window.aistudio && await window.aistudio.hasSelectedApiKey() === false) await window.aistudio.openSelectKey();
    const ai = getAI();
    let operation;
    if (imageBase64) {
        operation = await ai.models.generateVideos({
            model: MODELS.VEO_FAST,
            image: { imageBytes: imageBase64, mimeType: 'image/png' },
            prompt: prompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: MODELS.VEO_FAST,
            prompt: prompt,
            config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
        });
    }
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // --- TTS ---
  async generateSpeech(text: string, voiceName: string = 'Kore'): Promise<AudioBuffer> {
    if (!text?.trim()) throw new Error("Empty text");
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: MODELS.TTS,
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    return await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
  }

  // --- Podcast ---
  async generatePodcastScript(topic: string): Promise<PodcastLine[]> {
      const ai = getAI();
      const prompt = `Write a podcast script (Milla vs Guest) about: "${topic}". Return JSON array.`;
      try {
          const response = await ai.models.generateContent({
              model: MODELS.FLASH,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          return JSON.parse(response.text || '[]');
      } catch (e) { return []; }
  }

  async generatePodcastAudio(lines: PodcastLine[]): Promise<AudioBuffer> {
      const ai = getAI();
      const transcript = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
      const response = await ai.models.generateContent({
          model: MODELS.TTS,
          contents: [{ parts: [{ text: `TTS conversation:\n${transcript}` }] }],
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  multiSpeakerVoiceConfig: {
                      speakerVoiceConfigs: [
                          { speaker: 'Milla', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                          { speaker: 'Guest', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }
                      ]
                  }
              }
          }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio");
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      return await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
  }

  // --- Live API ---
  async connectLive(onAudioData: (buffer: AudioBuffer) => void, onClose: () => void, voiceName: string = 'Kore') {
    const ai = getAI();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Media API not supported");
    
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { throw new Error("Microphone access denied"); }

    const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
            onopen: () => {
                const source = inputAudioContext.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessor.onaudioprocess = (e) => {
                    const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                    sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode);
                    source.start(outputAudioContext.currentTime); // Simple queue
                    onAudioData(audioBuffer);
                }
            },
            onclose: onClose,
            onerror: (e) => console.error("Live Error", e)
        },
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: getMillaPersona(),
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } }
        }
    });

    return {
        close: () => { sessionPromise.then(s => s.close()); stream.getTracks().forEach(t => t.stop()); },
        sendVideoFrame: (base64Data: string) => {
            sessionPromise.then(session => session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Data } }));
        }
    }
  }
}

export const geminiService = new GeminiService();
