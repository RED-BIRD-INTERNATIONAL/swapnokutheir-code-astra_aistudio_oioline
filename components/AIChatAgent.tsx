import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Maximize2,
  Minimize2,
  ArrowRight,
  ExternalLink,
  Layers,
  HelpCircle,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { ShipmentProfile } from '../types';

interface AIChatAgentProps {
  shipments?: any[];
  onNavigateTab?: (tab: string) => void;
  onFilterShipments?: (searchTerm: string) => void;
  onUpdateShipmentStatus?: (shipmentId: string, newStatus: string) => void;
  currentActiveTab?: string;
  userName?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actionExecuted?: string;
}

export const AIChatAgent: React.FC<AIChatAgentProps> = ({
  shipments = [],
  onNavigateTab,
  onFilterShipments,
  onUpdateShipmentStatus,
  currentActiveTab = 'dashboard',
  userName = 'Sumon Hossain',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'bn-BD' | 'en-US'>('bn-BD');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `আসসালামু আলাইকুম সুমন ভাই! আমি আপনার অ্যাডমিন লাইভ এআই এজেন্ট। শিপমেন্ট ট্র্যাকিং, স্ট্যাটাস আপডেট, রুট অ্যানালাইসিস বা ড্যাশবোর্ডের যেকোনো কাজ আমাকে ভয়েস বা টেক্সটে সরাসরি বলতে পারেন। আজ আপনাকে কীভাবে সাহায্য করতে পারি?`,
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputMessage(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Web Speech Recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      recognitionRef.current = null;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [speechLanguage]);

  // Stop speaking when unmounted or disabled
  useEffect(() => {
    if (!isSpeakingEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isSpeakingEnabled]);

  // Web Speech API: Text-to-Speech function
  const speakText = (text: string) => {
    if (!isSpeakingEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any previous speech
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const cleanText = text
        .replace(/[*#_`~[\]]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[{}"\\]/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = speechLanguage;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to find a matching voice for the language
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const matchedVoice = voices.find(
          (v) => v.lang.toLowerCase() === speechLanguage.toLowerCase() || v.lang.startsWith(speechLanguage.slice(0, 2))
        );
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        } else {
          // If Bengali voice not present on system, use any available natural voice
          const naturalVoice = voices.find(v => v.name.includes('Natural') || v.name.includes('Google'));
          if (naturalVoice) utterance.voice = naturalVoice;
        }
      }

      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Web Speech API is not supported in this browser.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        // Stop any current speech playback so mic doesn't pick it up
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        recognitionRef.current.lang = speechLanguage;
        recognitionRef.current.start();
      } catch (err: any) {
        console.warn('Could not start speech recognition:', err);
        setSpeechError('Microphone permission required or already listening.');
      }
    }
  };

  // Execute operational actions based on prompt intent
  const detectAndExecuteActions = (text: string): string | undefined => {
    const lower = text.toLowerCase();

    // 1. Navigation actions
    if (lower.includes('analytics') || lower.includes('অ্যানালিটিক্স') || lower.includes('গ্রাফ') || lower.includes('kpi')) {
      onNavigateTab?.('analytics');
      return 'Navigated to Analytics Intelligence view';
    }
    if (lower.includes('leadtime') || lower.includes('লিড টাইম') || lower.includes('lead time')) {
      onNavigateTab?.('leadtime');
      return 'Navigated to Lead Time Analytics view';
    }
    if (lower.includes('routes') || lower.includes('রুট') || lower.includes('carrier') || lower.includes('ক্যারিয়ার')) {
      onNavigateTab?.('routes');
      return 'Navigated to Transport Routes & Air Carriers';
    }
    if (lower.includes('live agent') || lower.includes('লাইভ এজেন্ট') || lower.includes('astra') || lower.includes('অ্যাস্ট্রা') || lower.includes('studio')) {
      onNavigateTab?.('live-agent');
      return 'Switched to Full Astra Live Agent Studio';
    }
    if (lower.includes('new shipment') || lower.includes('নতুন শিপমেন্ট') || lower.includes('create shipment')) {
      onNavigateTab?.('new-shipment');
      return 'Opened New Shipment profile creation form';
    }
    if (lower.includes('dashboard') || lower.includes('ড্যাশবোর্ড') || lower.includes('হোম')) {
      onNavigateTab?.('dashboard');
      return 'Navigated to Operations Dashboard';
    }
    if (lower.includes('users') || lower.includes('ব্যবহারকারী') || lower.includes('অ্যাডমিন কনসোল')) {
      onNavigateTab?.('users');
      return 'Navigated to User Access & Role Control';
    }

    // 2. Search / Filter actions
    if (lower.includes('filter') || lower.includes('ফিল্টার') || lower.includes('search') || lower.includes('খুঁজ') || lower.includes('দেখান')) {
      const pendingMatch = lower.includes('pending') || lower.includes('পেন্ডিং');
      const transitMatch = lower.includes('transit') || lower.includes('ইন ট্রানজিট');
      const deliveredMatch = lower.includes('delivered') || lower.includes('পৌঁছেছে');

      if (pendingMatch) {
        onFilterShipments?.('Pending');
        onNavigateTab?.('shipment');
        return 'Filtered shipments by "Pending" status';
      }
      if (transitMatch) {
        onFilterShipments?.('In Transit');
        onNavigateTab?.('shipment');
        return 'Filtered shipments by "In Transit" status';
      }
      if (deliveredMatch) {
        onFilterShipments?.('Delivered');
        onNavigateTab?.('shipment');
        return 'Filtered shipments by "Delivered" status';
      }
    }

    return undefined;
  };

  // Send message to Gemini via /api/chat
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputMessage).trim();
    if (!messageContent || isLoading) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Context summary for Gemini
    const shipmentContext = {
      total: shipments.length,
      pending: shipments.filter((s) => s.status?.toLowerCase().includes('pending')).length,
      inTransit: shipments.filter((s) => s.status?.toLowerCase().includes('transit')).length,
      delivered: shipments.filter((s) => s.status?.toLowerCase().includes('deliver')).length,
      recentSamples: shipments.slice(0, 5).map((s) => ({
        id: s.id,
        trackingNumber: s.trackingNumber,
        buyer: s.buyer,
        status: s.status,
        destination: s.destination,
        pieces: s.pieces,
      })),
      currentTab: currentActiveTab,
      user: userName,
    };

    // Check client-side direct navigation/filters first
    const actionResult = detectAndExecuteActions(messageContent);

    try {
      // Build conversation history for API
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      const enrichedPrompt = `User: ${userName}. Current App Context: Active Tab="${currentActiveTab}", Total Shipments=${shipmentContext.total} (Pending=${shipmentContext.pending}, In Transit=${shipmentContext.inTransit}, Delivered=${shipmentContext.delivered}).
User Query: "${messageContent}".
Instructions:
Respond warmly, respectfully, and concisely as Sumon Hossain's dedicated real-time autonomous AI agent in natural Bengali (or English if user speaks English). Confirm any actions performed clearly.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enrichedPrompt,
          history: historyPayload,
          voiceResponse: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.text || 'আপনার অনুরোধটি সম্পন্ন হয়েছে। আর কোনো সহায়তা প্রয়োজন?';

      const assistantMessage: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
        actionExecuted: actionResult,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak aloud using Web Speech API
      speakText(assistantText);
    } catch (err: any) {
      console.error('AIChatAgent query error:', err);

      // Graceful smart fallback with local context
      let fallbackText = `সুমন ভাই, আমি আপনার কমান্ড পেয়েছি। বর্তমানে মোট ${shipmentContext.total} টি শিপমেন্ট রয়েছে (পেন্ডিং: ${shipmentContext.pending}, ট্রানজিটে: ${shipmentContext.inTransit}, ডেলিভার্ড: ${shipmentContext.delivered})।`;
      if (actionResult) {
        fallbackText += `\nআমি আপনার নির্দেশ অনুযায়ী অ্যাকশন কার্যকর করেছি: ${actionResult}।`;
      }

      const fallbackMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: fallbackText,
        timestamp: new Date(),
        actionExecuted: actionResult,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      speakText(fallbackText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    { label: '📊 আজকের শিপমেন্ট ওভারভিউ', prompt: 'আজকের মোট শিপমেন্ট কয়টি এবং বর্তমান স্ট্যাটাস কী?' },
    { label: '⏳ পেন্ডিং শিপমেন্ট ফিল্টার', prompt: 'পেন্ডিং শিপমেন্ট ফিল্টার করে দেখান' },
    { label: '📈 অ্যানালিটিক্স ড্যাশবোর্ড', prompt: 'অ্যানালিটিক্স ড্যাশবোর্ডে নিয়ে চলুন' },
    { label: '🚀 লাইভ এআই স্টুডিও', prompt: 'ফুল লাইভ এআই স্টুডিও ওপেন করুন' },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* FLOATING TRIGGER BUTTON (Always visible at bottom-right corner)          */}
      {/* ========================================================================= */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Chat Agent"
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white pl-4 pr-5 py-3.5 rounded-full shadow-2xl shadow-red-600/40 border border-white/20 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-400/50"
          >
            {/* Glowing Ping Rings */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>

            {/* AI Orb Icon */}
            <div className="relative w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
            </div>

            {/* Label & Description */}
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase">AI Live Agent</span>
                <span className="text-[9px] bg-white/25 px-1.5 py-0.2 rounded-full font-bold">Online</span>
              </div>
              <p className="text-[10px] text-white/80 font-medium">ভয়েস বা টেক্সটে কমান্ড দিন</p>
            </div>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHAT AGENT POPUP WINDOW                                                   */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'w-[95vw] sm:w-[600px] h-[85vh] max-h-[750px]'
              : 'w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Astra AI Agent</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 font-semibold border border-red-500/30">
                    Gemini Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">সুমন হোসেনের ব্যক্তিগত অ্যাসিস্ট্যান্ট</p>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-1.5">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setSpeechLanguage((prev) => (prev === 'bn-BD' ? 'en-US' : 'bn-BD'))}
                title={`Language: ${speechLanguage === 'bn-BD' ? 'বাংলা (Bengali)' : 'English'}`}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700 transition-colors"
              >
                {speechLanguage === 'bn-BD' ? 'বাংলা' : 'EN'}
              </button>

              {/* TTS Voice Toggle */}
              <button
                type="button"
                onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
                title={isSpeakingEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
                className={`p-2 rounded-xl border transition-all ${
                  isSpeakingEnabled
                    ? 'bg-red-600/20 text-red-400 border-red-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {isSpeakingEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isExpanded ? 'Restore size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  if (isListening && recognitionRef.current) {
                    try {
                      recognitionRef.current.stop();
                    } catch (e) {}
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Minimize Agent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto gap-2 scrollbar-none">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>লাইভ ডেটা লিঙ্কড: {shipments.length} টি শিপমেন্ট</span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => {
                  onNavigateTab('live-agent');
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold whitespace-nowrap"
              >
                ফুল স্টুডিও মোড <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-600/30'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`space-y-1.5 max-w-[82%]`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-red-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/80 shadow-sm'
                      }`}
                    >
                      {message.content}
                    </div>

                    {/* Executed Action Badge */}
                    {message.actionExecuted && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{message.actionExecuted}</span>
                      </div>
                    )}

                    <span className="block text-[9px] text-slate-500 px-1">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2.5 text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-[11px] text-slate-400">চিন্তা করছি...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700 text-[10px] text-slate-300 whitespace-nowrap transition-all duration-200 shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Listening Live Waveform Notice */}
          {isListening && (
            <div className="px-4 py-2 bg-red-600/20 border-t border-red-500/40 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-xs font-bold text-red-300">
                  কথা শুনছি... ({speechLanguage === 'bn-BD' ? 'বাংলা' : 'English'})
                </span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded-md"
              >
                থামান
              </button>
            </div>
          )}

          {/* Error Notice */}
          {speechError && (
            <div className="px-4 py-1.5 bg-amber-950/60 border-t border-amber-500/30 text-[10px] text-amber-300 flex items-center justify-between">
              <span>{speechError}</span>
              <button onClick={() => setSpeechError(null)} className="text-amber-200 hover:text-white">✕</button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            {/* Microphone Toggle (Web Speech API) */}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Stop listening' : 'Start speaking (Web Speech)'}
              className={`p-2.5 rounded-2xl border transition-all ${
                isListening
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/40 scale-105 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isListening ? 'কথা বলুন...' : 'কমান্ড বা প্রশ্ন লিখুন...'}
              className="flex-1 bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-red-600/30"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatAgent;
