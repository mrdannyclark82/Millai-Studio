import { GoogleGenAI } from "@google/genai";
import { Message, MessageRole } from '../types';
import { MODELS } from '../constants';

const STORAGE_KEY_FACTS = 'milla_core_facts';

export interface MemoryFact {
  id: string;
  text: string;
  category: 'user' | 'preference' | 'relationship' | 'work';
  timestamp: number;
}

export const memoryService = {
  // --- Local Storage Management ---
  saveFacts: (facts: MemoryFact[]) => {
    localStorage.setItem(STORAGE_KEY_FACTS, JSON.stringify(facts));
  },

  loadFacts: (): MemoryFact[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FACTS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load facts", e);
      return [];
    }
  },

  addFact: (text: string, category: MemoryFact['category'] = 'user') => {
    const facts = memoryService.loadFacts();
    // Avoid duplicates
    if (facts.some(f => f.text.toLowerCase() === text.toLowerCase())) return;
    
    const newFact: MemoryFact = {
      id: Date.now().toString() + Math.random(),
      text,
      category,
      timestamp: Date.now()
    };
    memoryService.saveFacts([...facts, newFact]);
  },

  removeFact: (id: string) => {
    const facts = memoryService.loadFacts();
    memoryService.saveFacts(facts.filter(f => f.id !== id));
  },

  getSystemContext: (): string => {
    const facts = memoryService.loadFacts();
    if (facts.length === 0) return "";

    const grouped = facts.reduce((acc, fact) => {
        acc[fact.category] = acc[fact.category] || [];
        acc[fact.category].push(fact.text);
        return acc;
    }, {} as Record<string, string[]>);

    let context = "\n\nCORE MEMORIES (Things you know about Danny Ray):";
    if (grouped.user) context += "\n- User Details: " + grouped.user.join("; ");
    if (grouped.preference) context += "\n- Preferences: " + grouped.preference.join("; ");
    if (grouped.work) context += "\n- Work/Projects: " + grouped.work.join("; ");
    if (grouped.relationship) context += "\n- Relationship Details: " + grouped.relationship.join("; ");
    
    return context + "\n\n";
  },

  // --- AI Extraction ---
  analyzeAndExtract: async (messages: Message[]) => {
    // Only analyze if we have enough new context (e.g. last 10 messages)
    if (messages.length < 5) return;

    const recentHistory = messages.slice(-10).map(m => `${m.role}: ${m.text}`).join('\n');
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Analyze this chat history and extract permanent facts about the user (Danny Ray) that Milla should remember long-term.
      Focus on: Names, Job, Specific Likes/Dislikes, Important Life Events, Relationship dynamics established.
      Ignore: Casual greetings, short-term requests (e.g. "make me a video").
      
      Return JSON: { "facts": [{ "text": "Danny is a senior frontend engineer", "category": "work" }] }
      Categories: 'user', 'preference', 'relationship', 'work'.
      If no new important facts, return { "facts": [] }.

      Chat:
      ${recentHistory}
    `;

    try {
      const response = await ai.models.generateContent({
        model: MODELS.FLASH,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const text = response.text;
      if (!text) return;
      
      const result = JSON.parse(text);
      if (result.facts && Array.isArray(result.facts)) {
         const currentFacts = memoryService.loadFacts();
         let updated = false;
         
         result.facts.forEach((f: any) => {
             // Simple duplicate check
             if (!currentFacts.some(existing => existing.text.toLowerCase().includes(f.text.toLowerCase()))) {
                 memoryService.addFact(f.text, f.category || 'user');
                 updated = true;
                 console.log("🧠 New Core Memory Unlocked:", f.text);
             }
         });
      }
    } catch (e) {
      console.error("Memory Extraction Failed", e);
    }
  }
};