import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Sparkles, Bot, CheckCircle2, 
  ArrowRight, X, Play, RefreshCw, Zap, MessageSquare, BrainCircuit
} from 'lucide-react';
import { saveMemory, getRelevantMemories, AIMemory } from '../src/lib/memory';

interface LiveVoiceAgentBarProps {
  onExecuteAction: (action: string, payload?: any) => void;
  activeTab: string;
  shipmentsCount: number;
}

export const LiveVoiceAgentBar: React.FC<LiveVoiceAgentBarProps> = ({
  onExecuteAction,
  activeTab,
  shipmentsCount
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiSpeechReply, setAiSpeechReply] = useState('');
  const [lastActionExecuted, setLastActionExecuted] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>([15, 25, 45, 30, 60, 20]);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [useNeuralVoice, setUseNeuralVoice] = useState(true);
  const [isServerConnected, setIsServerConnected] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Health check polling to ensure "Strong Connection"
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setIsServerConnected(true);
        } else {
          setIsServerConnected(false);
        }
      } catch (e) {
        setIsServerConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Set up Speech Recognition on mount
  useEffect(() => {
    loadMemories();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      // Bengali + English support
      recognition.lang = 'bn-BD';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setTranscript(resultTranscript);

        if (event.results[current].isFinal) {
          handleVoiceCommand(resultTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition Event:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Voice notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadMemories = async () => {
    const fetched = await getRelevantMemories();
    setMemories(fetched);
  };

  // Animate audio wave bars when listening
  useEffect(() => {
    let interval: any;
    if (isListening || isSpeaking || isLearning) {
      interval = setInterval(() => {
        setAudioLevel([
          Math.floor(10 + Math.random() * 70),
          Math.floor(15 + Math.random() * 85),
          Math.floor(25 + Math.random() * 95),
          Math.floor(20 + Math.random() * 90),
          Math.floor(30 + Math.random() * 80),
          Math.floor(10 + Math.random() * 60)
        ]);
      }, 120);
    } else {
      setAudioLevel([12, 18, 24, 20, 16, 12]);
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking, isLearning]);

  // Text to Speech playback function
  const speakVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Find Bengali or English voice if available
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('BD'));
    const enVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.lang.includes('en'));

    if (bnVoice && /[ঀ-৿]/.test(text)) {
      utterance.voice = bnVoice;
      utterance.lang = 'bn-BD';
    } else if (enVoice) {
      utterance.voice = enVoice;
      utterance.lang = 'en-US';
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Humanized Neural Voice Synthesis (Server-Side High Quality)
  const playNeuralAudio = async (base64Data: string) => {
    try {
      stopSpeaking();
      setIsSpeaking(true);
      
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const arrayBuffer = bytes.buffer;
      const dataView = new DataView(arrayBuffer);
      const float32Array = new Float32Array(arrayBuffer.byteLength / 2);
      
      for (let i = 0; i < float32Array.length; i++) {
        // Convert 16-bit PCM to Float32
        float32Array[i] = dataView.getInt16(i * 2, true) / 32768;
      }
      
      const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } catch (e) {
      console.warn('Neural playback error, falling back to local synthesis:', e);
      setIsSpeaking(false);
    }
  };

  // Process user voice transcript through Gemini /api/voice-command
  const handleVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setIsListening(false);

    try {
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          activeTab,
          shipmentsCount,
          memories: memories,
          context: { role: 'Operations Director', company: 'Red Bird International' }
        })
      });

      if (!response.ok) {
        throw new Error('Server voice processing returned an error');
      }

      const data = await response.json();
      setAiSpeechReply(data.speechResponse);
      setLastActionExecuted(data.feedbackMessage || 'Action Executed');

      // Speak back using High Quality Neural Voice if available
      if (data.audio && useNeuralVoice) {
        playNeuralAudio(data.audio);
      } else {
        speakVoice(data.speechResponse);
      }

      // Execute UI action
      if (data.action) {
        onExecuteAction(data.action, data.actionPayload);
      }

      // Handle self-learning
      const suggestedMemories = data.suggestedMemories || [];
      if (suggestedMemories.length > 0) {
        setIsLearning(true);
        for (const m of suggestedMemories) {
          await saveMemory(m);
        }
        await loadMemories();
        setTimeout(() => setIsLearning(false), 3000);
      }
    } catch (err: any) {
      console.error('Voice Command Error:', err);
      // Fast client-side fallback
      handleClientSideRuleExecution(text);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rule-based instant client fallback
  const handleClientSideRuleExecution = (text: string) => {
    const lower = text.toLowerCase();
    let reply = "আমি আপনার নির্দেশ বুঝতে পেরেছি।";
    let action = "GENERAL_ANSWER";

    if (lower.includes("ইনভয়েস") || lower.includes("invoice") || lower.includes("বিল")) {
      action = "CREATE_NEW_INVOICE";
      reply = "হ্যাঁ সুমন স্যার, আপনার জন্য নতুন এক্সপোর্ট ইনভয়েস জেনারেটর চালু করছি।";
    } else if (lower.includes("লেবেল") || lower.includes("label") || lower.includes("shipping label")) {
      action = "GENERATE_SHIPPING_LABEL";
      reply = "আন্তর্জাতিক শিপিং লেবেল জেনারেটর প্রস্তুত করা হয়েছে।";
    } else if (lower.includes("পিকআপ") || lower.includes("pickup") || lower.includes("schedule")) {
      action = "SCHEDULE_PICKUP";
      reply = "ফ্যাক্টরি ও চট্টগ্রাম পোর্ট পিকআপ শিডিউলার খোলা হয়েছে।";
    } else if (lower.includes("বায়ার") || lower.includes("buyer") || lower.includes("সোর্সিং")) {
      action = "BUYER_SOURCING";
      reply = "বায়ার সোর্সিং ও মার্কেট ইন্টেলিজেন্স ড্যাশবোর্ডে নিয়ে যাচ্ছি।";
    } else if (lower.includes("ডোমেইন") || lower.includes("domain")) {
      action = "CUSTOM_DOMAIN";
      reply = "কাস্টম ডোমেইন কানেকশন ও ডিএনএস ভেরিফিকেশন প্যানেল খোলা হয়েছে।";
    }

    setAiSpeechReply(reply);
    speakVoice(reply);
    onExecuteAction(action);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // If already running, abort and start fresh
          recognitionRef.current.abort();
          setTimeout(() => recognitionRef.current.start(), 100);
        }
      } else {
        setErrorMessage('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      }
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-red-950 text-white rounded-3xl p-5 border border-red-500/20 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Left: AI Avatar & Live Audio Waves */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isListening 
                ? 'bg-red-600 text-white shadow-red-600/50 ring-4 ring-red-500/30 animate-pulse' 
                : isSpeaking 
                ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-4 ring-emerald-500/20'
                : 'bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-red-600/30'
            }`}>
              <Bot size={24} />
            </div>
            {isListening && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-slate-900 rounded-full animate-ping"></span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm uppercase tracking-tight text-white flex items-center gap-1.5">
                <span>Scarlet Real-time Voice Partner</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/30">
                  Live Voice Assistant
                </span>
                <div className="flex items-center gap-1.5 ml-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isServerConnected ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse'}`} />
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isServerConnected ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                    {isServerConnected ? 'Neural Online' : 'Connecting'}
                  </span>
                </div>
              </h4>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {isListening ? (
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Listening... বাংলায় বা ইংরেজিতে বলুন (e.g. "ইনভয়েস তৈরি করো", "শিপিং লেবেল বানাও")
                </span>
              ) : isSpeaking ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Volume2 size={13} className="animate-bounce" />
                  Speaking response out loud...
                </span>
              ) : isLearning ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                  <BrainCircuit size={13} />
                  Scarlet শিখছেন... আপনার পছন্দগুলো মেমরিতে সেভ করা হচ্ছে
                </span>
              ) : isProcessing ? (
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin" />
                  Processing voice command with Gemini 1.5 Flash...
                </span>
              ) : (
                <span>রিয়েল-টাইম ভয়েস কমান্ড দিয়ে কথা বলুন, Scarlet সরাসরি কাজ করে দেবে।</span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Live Waveform Visualizer */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-900/80 rounded-2xl border border-slate-800 self-center">
          {audioLevel.map((height, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-100 ${
                isListening
                  ? 'bg-red-500 shadow-sm shadow-red-500/50'
                  : isSpeaking
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : 'bg-slate-700'
              }`}
              style={{ height: `${Math.max(8, height / 2.2)}px` }}
            ></span>
          ))}
          <span className="text-[10px] font-mono text-slate-400 ml-2 font-bold">
            {isListening ? 'LIVE MIC' : isSpeaking ? 'VOICE OUT' : 'READY'}
          </span>
        </div>

        {/* Right: Mic Button & Speech Control */}
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all"
              title="Stop Speaking"
            >
              <VolumeX size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/40'
                : 'bg-white hover:bg-slate-100 text-slate-900 shadow-lg'
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} className="text-red-600" />}
            <span>{isListening ? 'Stop Listening' : 'Talk with Voice'}</span>
          </button>
        </div>
      </div>

      {/* Transcript & Feedback Pill */}
      {(transcript || aiSpeechReply || lastActionExecuted || errorMessage) && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            {transcript && (
              <div className="bg-slate-800/90 text-slate-200 px-3 py-1 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] uppercase font-bold mr-1.5">You said:</span>
                <span className="font-bold">"{transcript}"</span>
              </div>
            )}
            {lastActionExecuted && (
              <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-500/30 flex items-center gap-1 font-bold">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>{lastActionExecuted}</span>
              </div>
            )}
            {errorMessage && (
              <div className="bg-red-500/20 text-red-300 px-3 py-1 rounded-xl border border-red-500/30 font-bold">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Quick Voice Prompt Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] text-slate-400 font-bold">
            <span className="text-slate-500 whitespace-nowrap">Try saying:</span>
            {[
              'নতুন ইনভয়েস তৈরি করো',
              'শিপিং লেবেল বানাও',
              'পিকআপ শিডিউল করো',
              'বায়ার সোর্সিং দেখাও',
              'ডোমেইন কানেকশন'
            ].map((cmd, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTranscript(cmd);
                  handleVoiceCommand(cmd);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap transition-colors"
              >
                "{cmd}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveVoiceAgentBar;
