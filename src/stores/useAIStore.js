import { create } from 'zustand';

const useAIStore = create((set, get) => ({
  messages: [],
  suggestions: [],
  isAnalyzing: false,
  isStreaming: false,
  status: 'idle', // 'idle' | 'watching' | 'analyzing' | 'error'
  lastAnalyzedAt: 0,
  
  addMessage: (msg) => set(s => ({ messages: [...s.messages, { id: Date.now() + Math.random(), timestamp: Date.now(), ...msg }] })),
  
  updateLastMessage: (content) => set(s => {
    const msgs = [...s.messages];
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
    }
    return { messages: msgs };
  }),
  
  setSuggestions: (suggestions) => set({ suggestions }),
  
  setIsAnalyzing: (v) => set({ isAnalyzing: v, status: v ? 'analyzing' : 'watching' }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  
  setStatus: (status) => set({ status }),
  setLastAnalyzedAt: (t) => set({ lastAnalyzedAt: t }),
  
  clearMessages: () => set({ messages: [], suggestions: [] }),
}));

export default useAIStore;
