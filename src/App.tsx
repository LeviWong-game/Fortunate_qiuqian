import React, { useState, useEffect, useRef } from "react";
import { 
  Briefcase, 
  Heart, 
  Coins, 
  Leaf, 
  BookOpen, 
  History, 
  User, 
  Menu, 
  X, 
  Share2, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  Bookmark, 
  PlusCircle, 
  Copy, 
  UserCheck, 
  Dribbble, 
  Compass,
  AlertCircle,
  Mic,
  MicOff,
  Radio,
  Key,
  Link2,
  FileImage,
  RefreshCw,
  FolderOpen,
  Cloud,
  Check
} from "lucide-react";
import { CategoryId, FortuneResult, User as UserType } from "./types";
import { CATEGORIES, RETRIEVING_TXT } from "./data";
import LoginRegister from "./components/LoginRegister";
import DivinationRitualOverlay from "./components/DivinationRitualOverlay";
import { supabase } from "./lib/supabase";

const FORTUNE_TUBE_IMAGE = "/media/fortune-tube-transparent.png";
const FORTUNE_TUBE_RITUAL_VIDEO = "/media/fortune-tube-ritual.mp4";

export default function App() {
  // Navigation & Screen states
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"home" | "divine" | "history" | "profile">("home");
  
  // Divination interaction states
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("general");
  const [question, setQuestion] = useState<string>("");
  const [mentalState, setMentalState] = useState<string>("");
  const [recentEvents, setRecentEvents] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [shakeProgress, setShakeProgress] = useState<number>(0);
  const [retrievingText, setRetrievingText] = useState<string>(RETRIEVING_TXT[0]);
  const [shakeCount, setShakeCount] = useState<number>(0);
  
  // Active Divination result
  const [currentResult, setCurrentResult] = useState<FortuneResult | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  
  // Voice Recognition states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [activeSpeechError, setActiveSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // User Authentication
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  // History Record Persistence
  const [historyRecords, setHistoryRecords] = useState<FortuneResult[]>([]);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Left Drawer (Menu) state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // AI Generated Fortune Scene states
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const isPlaceholderImage = (url?: string) => Boolean(url?.includes("picsum.photos"));

  const sanitizeFortuneRecord = (record: FortuneResult): FortuneResult => {
    if (!isPlaceholderImage(record.imageUrl)) return record;
    const { imageUrl, ...cleanRecord } = record;
    return cleanRecord;
  };

  const sanitizeFortuneRecords = (records: FortuneResult[]) => records.map(sanitizeFortuneRecord);





  // Retrieve matching visual scene from the back-end DashScope endpoint.
  const retrieveSlipImage = async (result: FortuneResult) => {
    // If we already have a cached image URL for this record, use it directly
    if (result.imageUrl && !isPlaceholderImage(result.imageUrl)) {
      setSlipImage(result.imageUrl);
      setShowImageModal(true);
      return;
    }

    setIsGeneratingImage(true);
    setSlipImage(null);
    let finalUrl: string | null = null;
    try {
      const response = await fetch("/api/fortune/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: result.title, poetry: result.poetry, recordId: result.id })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        if (!data.imageUrl || isPlaceholderImage(data.imageUrl)) {
          throw new Error("Image endpoint did not return a real generated image.");
        }
        finalUrl = data.imageUrl;
      } else {
        throw new Error(data.error || "Image server returned bad response code");
      }
    } catch (e) {
      console.error("Retrieve slip image failed:", e);
      notify("水墨意境图生成失败，请检查部署环境的 DASHSCOPE_API_KEY 与函数日志。");
    } finally {
      setIsGeneratingImage(false);
    }

    if (!finalUrl) return;

    setSlipImage(finalUrl);
    setShowImageModal(true);

    // Cache the image URL into the current result and history records
    setCurrentResult(prev => prev ? { ...prev, imageUrl: finalUrl } : null);
    setHistoryRecords(prev => {
      const updated = prev.map(r => 
        (r.id === result.id && r.timestamp === result.timestamp) ? { ...r, imageUrl: finalUrl } : r
      );
      // Update local storage for guests
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          localStorage.setItem("zenfortune_history_guest", JSON.stringify(updated));
        }
      });
      return updated;
    });
  };



  // References for sound, shake triggers and animation
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Restore user session on mount via Supabase Auth
  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "修行者";
        setCurrentUser({
          id: session.user.id,
          username,
          email: session.user.email,
          token: session.access_token,
          createdAt: session.user.created_at,
        });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "修行者";
        setCurrentUser({
          id: session.user.id,
          username,
          email: session.user.email,
          token: session.access_token,
          createdAt: session.user.created_at,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch history from Supabase when user changes
  useEffect(() => {
    if (currentUser?.token) {
      fetchHistoryFromServer(currentUser.token);
    } else {
      // Guest mode: use localStorage fallback
      const stored = localStorage.getItem("zenfortune_history_guest");
      if (stored) {
        try {
          const sanitized = sanitizeFortuneRecords(JSON.parse(stored));
          setHistoryRecords(sanitized);
          localStorage.setItem("zenfortune_history_guest", JSON.stringify(sanitized));
        } catch (e) {
          setHistoryRecords([]);
        }
      } else {
        setHistoryRecords([]);
      }
    }
  }, [currentUser]);

  // Fetch history records from server API
  const fetchHistoryFromServer = async (token: string) => {
    try {
      const response = await fetch("/api/fortune/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryRecords(sanitizeFortuneRecords(data.records || []));
      } else {
        console.error("Failed to fetch history:", response.statusText);
        setHistoryRecords([]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistoryRecords([]);
    }
  };

  // Save a fortune record to Supabase (or localStorage for guests)
  const saveRecordToServer = async (record: FortuneResult): Promise<FortuneResult> => {
    if (currentUser?.token) {
      try {
        const response = await fetch("/api/fortune/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify(record),
        });
        if (response.ok) {
          const data = await response.json();
          return data.record || record;
        }
      } catch (err) {
        console.error("Error saving record to server:", err);
      }
    } else {
      // Guest mode: save to localStorage
      const stored = localStorage.getItem("zenfortune_history_guest");
      const existing = stored ? JSON.parse(stored) : [];
      existing.unshift(sanitizeFortuneRecord(record));
      localStorage.setItem("zenfortune_history_guest", JSON.stringify(existing));
    }
    return sanitizeFortuneRecord(record);
  };

  // Wrapper to update local state after saving
  const saveRecords = (records: FortuneResult[]) => {
    const sanitized = sanitizeFortuneRecords(records);
    setHistoryRecords(sanitized);
    if (!currentUser?.token) {
      localStorage.setItem("zenfortune_history_guest", JSON.stringify(sanitized));
    }
  };

  // Play dynamic digital traditional sounds (temple block wooden pop)
  const playRattleSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      for (let i = 0; i < 3; i++) {
        const time = ctx.currentTime + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(620 - i * 40, time);
        osc.frequency.exponentialRampToValueAtTime(140, time + 0.04);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.04);
        osc.start(time);
        osc.stop(time + 0.05);
      }
    } catch (e) {
      console.error("Rattle audio synthesis error:", e);
    }
  };

  // Play a gorgeous high-pitched bell/chime to signify active speech capturing
  const playChimeSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const time = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, time);
      osc.frequency.exponentialRampToValueAtTime(350, time + 0.35);
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.start(time);
      osc.stop(time + 0.4);
    } catch (e) {
      console.error("Chime audio synthesis error:", e);
    }
  };

  // Trigger brief web view notification
  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Voice Interaction hold timers
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SpeechRecognition on mount or select category
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
    } else {
      setIsSpeechSupported(false);
    }
  }, []);

  const handleVoiceToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isShaking) return;
    
    if (isRecording) {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }

      setIsRecording(false);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }

      let finalWords = voiceTranscript.trim();
      if (
        finalWords === "正在倾注灵意。请述说心中祈求..." ||
        finalWords === "正在调谐灵识..." ||
        !finalWords
      ) {
        finalWords = "";
      }

      if (finalWords) {
        setQuestion(finalWords);
        notify(`🔮 祈愿通达：“${finalWords}”`);
        setTimeout(() => {
          startDivinationRitual(finalWords);
        }, 700);
      } else {
        notify("✨ 已凝聚静意，为您起运卜释...");
        startDivinationRitual("");
      }
      return;
    }

    playChimeSound();
    setIsRecording(true);
    setVoiceTranscript("正在倾注灵意。请述说心中祈求...");
    setActiveSpeechError(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
      }
      
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "zh-CN";

      rec.onstart = () => {
        console.log("Speech recognition active via toggle");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0].transcript;
        }
        if (interim) {
          setVoiceTranscript(interim);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setActiveSpeechError("已阻。麦克风权限受限");
        } else {
          setActiveSpeechError("心意流转中...");
        }
      };

      rec.onend = () => {};

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch (err) {
        console.error("Start speech failed:", err);
      }
    } else {
      // Simulate typing flow for unsupported Web Speech API
      const index = Math.floor(Math.random() * 3);
      const defaults = [
        "祈求万事顺意，破除眼下迷障",
        "愿良人常伴，心意亨通和合",
        "探问学干通达，否极泰来"
      ];
      setVoiceTranscript("正在调谐灵识...");
      holdTimeoutRef.current = setTimeout(() => {
        setVoiceTranscript(defaults[index]);
      }, 1200);
    }
  };

  // Trigger client-side animation shake sequence simulating container
  const startDivinationRitual = async (overrideQuestion?: string) => {
    if (isShaking) return;
    setIsShaking(true);
    setShakeProgress(0);
    setShakeCount(0);
    
    // Smoothly cycle through traditional messages during simulated loading
    let currentTextIdx = 0;
    const textInterval = setInterval(() => {
      currentTextIdx = (currentTextIdx + 1) % RETRIEVING_TXT.length;
      setRetrievingText(RETRIEVING_TXT[currentTextIdx]);
    }, 1200);

    // Audio rattle intervals
    const rattleInterval = setInterval(() => {
      playRattleSound();
    }, 400);

    // Dynamic simulation loading bar tracking progress
    const progressInterval = setInterval(() => {
      setShakeProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(textInterval);
          clearInterval(rattleInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 180);

    const activeQuestion = (overrideQuestion !== undefined ? overrideQuestion : question).trim();

    // Call the server endpoint for genuine divination content tailored by Gemini Core
    try {
      const response = await fetch("/api/fortune/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category: selectedCategory, 
          question: activeQuestion,
          mentalState: mentalState,
          recentEvents: recentEvents
        })
      });
      
      if (!response.ok) {
        throw new Error("Divination endpoint response was not verified.");
      }

      const rawResult = await response.json();
      
      // Delay just enough to map beautifully to our 3.6s incense burn ritual
      setTimeout(() => {
        const fullResult: FortuneResult = {
          title: rawResult.title,
          poetry: rawResult.poetry,
          category: rawResult.category,
          categoryLabel: rawResult.categoryLabel || CATEGORIES.find(c => c.id === rawResult.category)?.name || "综合",
          stamp: rawResult.stamp,
          explanation: rawResult.explanation,
          advice: rawResult.advice,
          timestamp: new Date().toISOString(),
          question: activeQuestion ? activeQuestion : undefined,
          mentalState: mentalState.trim() ? mentalState : undefined,
          recentEvents: recentEvents.trim() ? recentEvents : undefined
        };

        setCurrentResult(fullResult);
        setIsShaking(false);
        setShowResultModal(true);
        setQuestion(""); // Reset search bar
        setMentalState(""); // Reset mental state
        setRecentEvents(""); // Reset events
        
        // Retrieve beautiful generated scene matching poetry
        retrieveSlipImage(fullResult);
        // Save to Supabase (or localStorage for guests)
        saveRecordToServer(fullResult).then((savedRecord) => {
          setHistoryRecords(prev => [savedRecord, ...prev]);
          notify("✨ 签诗已妥帖存入功德簿中。");
        });
      }, 3600);

    } catch (err) {
      console.error(err);
      // Adaptive local offline generation if server route is faulted
      setTimeout(() => {
        const localSeed = {
          title: "鱼跃龙门",
          poetry: "波涛汹涌起狂澜，金鳞一跃上青天。脱胎换骨从此始，名声显赫耀家园。",
          stamp: "上上",
          explanation: `【由于无法连接天机，针对您当前的情绪与遭遇推算出《鱼跃龙门》】\n您当前的心境表现为“${mentalState || "平静"}”，近期遇到了“${recentEvents || "冷暖变易"}”等吉凶际遇。预测您未来的气运将迎来一次重大的蓄势突破。虽然眼前有些许浮尘困扰，但金鳞化龙之势已不可挡，好事终将发生。`,
          advice: [
            "心理自我调节：坚定志向，不因眼前微末风浪而摇摆。深长呼吸，将郁怒之气散去，重燃本心光芒。",
            "遇喜勿傲：若遇好事，需守住谦逊纯真，不沾尘不傲物，方能使福泽福报绵延不竭。",
            "正念修身：每日静坐五分钟，反思心起心灭。以极大的耐心包容世间琐事纠葛，不留痕迹。"
          ]
        };

        const resultFallback: FortuneResult = {
          title: localSeed.title,
          poetry: localSeed.poetry,
          category: selectedCategory,
          categoryLabel: CATEGORIES.find(c => c.id === selectedCategory)?.name || "综合",
          stamp: localSeed.stamp,
          explanation: localSeed.explanation,
          advice: localSeed.advice,
          timestamp: new Date().toISOString(),
          question: question.trim() ? question : undefined,
          mentalState: mentalState.trim() ? mentalState : undefined,
          recentEvents: recentEvents.trim() ? recentEvents : undefined
        };

        setCurrentResult(resultFallback);
        setIsShaking(false);
        setShowResultModal(true);
        setQuestion("");
        setMentalState("");
        setRecentEvents("");
        
        // Retrieve beautiful generated scene matching poetry
        retrieveSlipImage(resultFallback);
        saveRecordToServer(resultFallback).then((savedRecord) => {
          setHistoryRecords(prev => [savedRecord, ...prev]);
        });
        notify("⛩️ 灵台自通，已接引古圣福愿。");
      }, 3600);
    }
  };

  // Easy Share simulation (Clipboard text copy)
  const copyResultToClipboard = (result: FortuneResult) => {
    const textToCopy = `【禅运 • ${result.categoryLabel || "占卜"}】\n签第：${result.title} (${result.stamp})\n诗云：${result.poetry}\n局势：${result.explanation}\n建议：\n${result.advice.map((a, i) => `${i+1}. ${a}`).join("\n")}\n—— 禅运(ZenFortune) 指点迷津`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        notify("📋 禅运天机已复制至剪贴板，可随意分享。");
      })
      .catch((e) => {
        notify("❌ 复制失败，请截图分享");
      });
  };

  // Deleting records
  const deleteRecord = async (index: number) => {
    const record = historyRecords[index];
    if (currentUser?.token && record.id) {
      try {
        await fetch(`/api/fortune/history/${record.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
      } catch (err) {
        console.error("Error deleting record:", err);
      }
    }
    const fresh = [...historyRecords];
    fresh.splice(index, 1);
    saveRecords(fresh);
    notify("💫 往昔记录已云散归虚。");
  };

  return (
    <div className="min-h-screen parchment-texture font-sans text-deep-ink flex flex-col relative select-none">
      
      {/* Toast Notifier */}
      {toastMessage && (
        <div id="toast" className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-primary-container px-6 py-3 border border-accent-gold shadow-xl rounded-lg animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-gold" />
          <span className="text-black text-body-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Screen 1: Splash Screen Page layout */}
      {showSplash ? (
        <main id="splash-view" className="relative min-h-screen w-full flex flex-col items-center justify-between py-8 px-4 overflow-y-auto parchment-texture">
          {/* Background Ink Wash Decoration */}
          <div className="absolute inset-0 z-0 flex items-end justify-center pointer-events-none">
            <div 
              className="w-full h-1/2 ink-mountain-overlay bg-no-repeat bg-bottom bg-contain opacity-20" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAaeOwzGYdlB0aEobfXaSSzzN06lLCyLsbb0sAr8GKrff3v6foXjXdWk06oDxQccyLiwJckO3yOEci3D-sQhqAkuEQC_NvBLo3VR379JQnaQQfCyHRe3WHFqaS3I_t530fw15wjnEn1eFSPasWffF4neT9BZ1PBjGnnbSVs424B68e0MOJZflk1gvyWmvkfbM9xJYlD38abYX3rbwmuYtlGcMTTOMPX1r9E9cqlXBsKIicvLflwbb3LgHgVAGrOLvNF-XvgmUvyCUU')" }}
            />
          </div>

          {/* Top Brand Logo Banner */}
          <div className="w-full flex flex-col items-center text-center pt-6 z-10 space-y-1">
            <div className="bg-vermilion text-white text-[9px] font-bold tracking-[0.25em] px-2.5 py-0.5 rounded-full scale-90">
              JIN GONG ZEN
            </div>
            <h1 id="splash-title" className="font-serif text-3xl sm:text-4xl text-deep-ink font-semibold tracking-[0.35em] pl-[0.35em]">
              禅运
            </h1>
            <p className="text-[10px] tracking-[0.25em] pl-[0.25em] text-deep-ink/50 uppercase font-sans">
              ZEN FORTUNE
            </p>
          </div>

          {/* Connected App-Style Onboarding Card */}
          <div className="w-full max-w-sm bg-white/45 backdrop-blur-md border border-parchment-dim/70 shadow-lg rounded-3xl p-6 sm:p-8 flex flex-col items-center space-y-6 relative z-10 my-auto text-center">
            {/* Elegant Inner Frame Decoration */}
            <div className="absolute top-3 left-3 right-3 bottom-3 border border-dashed border-deep-ink/10 rounded-2xl pointer-events-none" />
            
            {/* Proportional Image Container to avoid crowding and blurry graphics */}
            <div 
              id="splash-tube-container"
              onClick={() => {
                playRattleSound();
                setShowSplash(false);
              }}
              className="relative w-40 h-60 sm:w-44 sm:h-64 flex items-center justify-center animate-float cursor-pointer hover:scale-105 transition-all duration-300"
            >
              {/* Soft Golden Halo behind the tube */}
              <div className="absolute inset-0 rounded-full bg-accent-gold/15 blur-2xl scale-75"></div>
              
              <img 
                id="splash-tube-img"
                alt="Zen Fortune Tube" 
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
                src={FORTUNE_TUBE_IMAGE}
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-2 bg-deep-ink/5 blur-md rounded-[100%]"></div>
            </div>

            {/* Title & Guidelines with Sharp Font Hierarchy */}
            <div className="space-y-2">
              <div className="text-body-sm font-semibold text-deep-ink/80 tracking-[0.2em] font-serif">
                — 澄澈自心 • 指点迷津 —
              </div>
              <p className="text-xs text-deep-ink/65 leading-relaxed max-w-[260px] mx-auto">
                基于中华传统卜签精髓与现代情绪心理指引。摇出吉凶运势，解读身心灵性调节方案。
              </p>
            </div>

            {/* Direct App Entry Button inside the interactive widget */}
            <button 
              id="enter-button"
              onClick={() => {
                playRattleSound();
                setShowSplash(false);
              }}
              className="w-full py-3.5 bg-vermilion text-white text-body-sm font-semibold tracking-[0.2em] pl-[0.2em] rounded-xl shadow-md hover:bg-vermilion/95 hover:shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer z-10"
            >
              <span>静心入室</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom branding footer */}
          <div className="w-full text-center z-10 opacity-35 pb-2">
            <span className="text-[10px] tracking-[0.3em] font-bold font-mono">
              EST. MMXXVI • ZENFORTUNE WEBAPP
            </span>
          </div>
        </main>
      ) : (
        /* Workspace Main Layout Frame */
        <div id="main-content" className="flex-1 flex flex-col justify-between overflow-x-hidden min-h-screen">
          
          {/* Main Top Header */}
          <header id="app-header" className="sticky top-0 z-40 bg-parchment/90 backdrop-blur-md border-b border-parchment-dim px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                id="menu-toggle"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 -ml-2 rounded-md hover:bg-parchment-dim/40 transition active:scale-95"
              >
                <Menu className="w-6 h-6 text-deep-ink" />
              </button>
              <span id="header-brand-title" className="font-serif text-2xl font-bold tracking-widest text-deep-ink">禅运</span>
            </div>

            {/* Right side user indicator */}
            <button 
              id="top-profile-btn"
              onClick={() => setActiveTab("profile")}
              className="px-4 py-2 bg-parchment-high border border-parchment-dim rounded-full flex items-center gap-2 hover:bg-parchment-highest transition text-body-sm text-deep-ink/90 active:scale-95"
            >
              <span>{currentUser ? currentUser.username : "功德登坛"}</span>
              <User className="w-4 h-4 text-vermilion" />
            </button>
          </header>

          {/* Left Slide-out Information Drawer/Menu */}
          {isDrawerOpen && (
            <div id="sidebar-overlay" className="fixed inset-0 z-50 flex">
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsDrawerOpen(false)}
              />
              
              <div id="sidebar-drawer" className="relative z-10 w-4/5 max-w-sm h-full bg-parchment border-r border-parchment-dim shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-parchment-dim pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-2xl tracking-widest">禅庭</span>
                    </div>
                    <button 
                      id="close-drawer"
                      onClick={() => setIsDrawerOpen(false)} 
                      className="p-1 rounded-md hover:bg-parchment-dim text-deep-ink"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-wider text-vermilion">占卜指引</h3>
                    <p className="text-body-sm text-deep-ink/70 leading-relaxed">
                      华夏占卜之妙，在于诚敬。意念凝聚之时，磁场便与天地虚静交汇。在开始摇晃竹筒前，极力在心底观想您问询的人、事、或者当下的情绪状态。
                    </p>
                    <p className="text-body-sm text-deep-ink/70 leading-relaxed">
                      一纸签诗并不能直接撰写您的未来，而是通过古代先贤智慧，助您清宁心室、化除烦恼、求得当下的安稳。
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-parchment-dim/60">
                    <h3 className="text-xs font-bold tracking-wider text-vermilion">四大纲度</h3>
                    <ul className="text-body-sm space-y-2 text-deep-ink/80">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-vermilion rounded-full"></span>
                        <span><b>事业：</b>问询抉择，方向，工作与学业功名。</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-vermilion rounded-full"></span>
                        <span><b>爱情：</b>问询红尘羁绊，夫妻缘分，相处灵通。</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-vermilion rounded-full"></span>
                        <span><b>财富：</b>问询丰盈，聚守耗损，长远福禄基业。</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-vermilion rounded-full"></span>
                        <span><b>健康：</b>问询气度，精气神，排空郁结，病气消解。</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-parchment-dim text-center text-xs text-deep-ink/40">
                  <p>© 2026 禅运 ZenFortune Inc.</p>
                  <p className="mt-1">由 3.5-Flash 与灵气生成引擎驱动</p>
                </div>
              </div>
            </div>
          )}

          {/* Active View Deck */}
          <main className="flex-1 max-w-lg w-full mx-auto p-6 pb-24 overflow-y-auto">
            
            {/* TAB 1: HOME (Screens 3 Layout containing initial inputs) */}
            {activeTab === "home" && (
              <div id="home-view" className="space-y-6">
                
                {/* 3D Canister Visual Header */}
                <div className="bg-gradient-to-b from-parchment-high/40 to-parchment-highest/60 border border-parchment-dim rounded-2xl p-6 text-center space-y-4">
                  <div className="relative w-40 h-40 mx-auto">
                    <img 
                      id="home-mini-tube-img"
                      alt="Mini Divination Tube" 
                      className="w-full h-full object-contain animate-float drop-shadow-[0_10px_20px_rgba(0,0,0,0.06)]"
                      src={FORTUNE_TUBE_IMAGE}
                    />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold mt-1">寻求内心的明晰</h2>
                    <p className="text-body-sm text-deep-ink/75 mt-1 leading-relaxed">
                      摇动签筒，让宇宙指引你今日前行的道路。请于下方注入你求索的执念或直率诉求。
                    </p>
                  </div>
                </div>

                {/* Optional Question Input field */}
                <div className="space-y-4 bg-white/40 border border-parchment-dim rounded-xl p-4 shadow-sm">
                  <div className="space-y-2">
                    <label id="input-lbl" className="text-xs font-bold tracking-wider text-vermilion uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-serif">
                        心中求问的疑难或疑惑 (选填)
                      </span>
                      <span className="text-[10px] text-deep-ink/40 font-mono">QUESTION</span>
                    </label>
                    <div className="relative">
                      <input 
                        id="question-input"
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="例：今日面试是否顺利？与同伴发生争端该如何化解？"
                        className="w-full bg-parchment-low/30 border-b border-deep-ink/20 focus:border-vermilion focus:outline-none py-2 px-1 transition text-body-sm text-deep-ink placeholder:text-deep-ink/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Fortune Telling Mode: Current Mental State Input field */}
                <div className="space-y-2 bg-white/40 border border-parchment-dim rounded-xl p-4 shadow-sm">
                  <label id="mental-lbl" className="text-xs font-bold tracking-wider text-vermilion uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-serif">
                      当前心境或情绪状态 (限时体验)
                    </span>
                    <span className="text-[10px] text-deep-ink/40 font-mono">MENTAL STATE</span>
                  </label>
                  <input 
                    id="mental-input"
                    type="text"
                    value={mentalState}
                    onChange={(e) => setMentalState(e.target.value)}
                    placeholder="例：有些焦虑不安，担心工作出纰漏，渴望重获内心的平静"
                    className="w-full bg-parchment-low/30 border-b border-deep-ink/20 focus:border-vermilion focus:outline-none py-2 px-1 transition text-body-sm text-deep-ink placeholder:text-deep-ink/30"
                  />
                  {/* Quick Tags Selection */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {[
                      { label: "平静安稳", query: "内心宁静，无风无浪" },
                      { label: "焦虑迷茫", query: "事业处于瓶颈期，感到未来迷离而担忧焦虑" },
                      { label: "有些急躁", query: "情绪起伏不定，有些许急于求成" },
                      { label: "平淡松弛", query: "心胸豁达，心绪松弛安然，无大喜大悲" },
                      { label: "身心俱疲", query: "每日奔波事务，身体和情绪都有疲倦" },
                      { label: "心向往之", query: "对新计划充满信心，意气风发，期待满满" }
                    ].map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMentalState(tag.query);
                          playRattleSound();
                        }}
                        className="text-[10px] bg-parchment-dim/50 border border-parchment-dim/80 text-deep-ink/75 px-2 py-0.5 rounded-full hover:bg-parchment-high hover:border-vermilion/35 transition cursor-pointer active:scale-95"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fortune Telling Mode: Recent Good/Bad Events Input field */}
                <div className="space-y-2 bg-white/40 border border-parchment-dim rounded-xl p-4 shadow-sm">
                  <label id="events-lbl" className="text-xs font-bold tracking-wider text-vermilion uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-serif">
                      近期遭遇的吉凶经历/阻碍 (必填/选填)
                    </span>
                    <span className="text-[10px] text-deep-ink/40 font-mono">RECENT EVENTS</span>
                  </label>
                  <input 
                    id="events-input"
                    type="text"
                    value={recentEvents}
                    onChange={(e) => setRecentEvents(e.target.value)}
                    placeholder="例：刚进行了一次糟糕的沟通，或者意外得了一笔奖励"
                    className="w-full bg-parchment-low/30 border-b border-deep-ink/20 focus:border-vermilion focus:outline-none py-2 px-1 transition text-body-sm text-deep-ink placeholder:text-deep-ink/30"
                  />
                  {/* Quick Tags Selection */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {[
                      { label: "升职加薪", query: "获得了事业或生活上的积极奖励、升职加薪" },
                      { label: "产生摩擦", query: "和亲近之人或搭档有些摩擦争执" },
                      { label: "破财亏折", query: "意外失去了财物，有一笔计划外亏折" },
                      { label: "睡眠不佳", query: "近期夜晚思虑连连，入眠质量不佳" },
                      { label: "家庭馨宁", query: "家人平安和顺，相处闲暇而温馨" }
                    ].map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRecentEvents(tag.query);
                          playRattleSound();
                        }}
                        className="text-[10px] bg-parchment-dim/50 border border-parchment-dim/80 text-deep-ink/75 px-2 py-0.5 rounded-full hover:bg-parchment-high hover:border-vermilion/35 transition cursor-pointer active:scale-95"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Grid Categories Cards */}
                <div className="space-y-3">
                  <h3 id="category-section-title" className="text-xs font-bold tracking-wider text-deep-ink/50 uppercase">
                    选择您祈求的占卜大类
                  </h3>
                  
                  <div id="category-grid" className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          id={`cat-${cat.id}`}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            playRattleSound();
                          }}
                          className={`relative border text-left p-4 rounded-xl transition-all duration-300 ${
                            isSelected 
                              ? "bg-gradient-to-br from-parchment-low to-parchment-high border-vermilion shadow-md ring-1 ring-vermilion/20 translate-y-[-2px]" 
                              : "border-parchment-dim hover:bg-parchment-high/40 hover:border-deep-ink/20"
                          } group`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`p-2 rounded-lg ${isSelected ? 'bg-vermilion/10 text-vermilion' : 'bg-parchment-dim/40 text-deep-ink/60'}`}>
                              {cat.id === "career" && <Briefcase className="w-5 h-5" />}
                              {cat.id === "love" && <Heart className="w-5 h-5" />}
                              {cat.id === "wealth" && <Coins className="w-5 h-5" />}
                              {cat.id === "health" && <Leaf className="w-5 h-5" />}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 bg-vermilion rounded-full"></span>
                            )}
                          </div>
                          <h4 className="font-serif text-base font-bold text-deep-ink">{cat.name}</h4>
                          <span className="text-[11px] block text-deep-ink/40 tracking-wider font-semibold mt-0.5">{cat.subtitle}</span>
                          <p className="text-[11px] text-deep-ink/60 leading-normal mt-2 line-clamp-2">
                            {cat.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Universal Action Launch button */}
                <button
                  id="cast-action-btn"
                  onClick={() => {
                    setActiveTab("divine");
                    startDivinationRitual();
                  }}
                  className="w-full mt-4 py-4 bg-vermilion text-white text-body-lg font-bold tracking-widest rounded-xl shadow-lg hover:bg-vermilion/95 hover:shadow-xl transition active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-accent-gold animate-pulse" />
                  <span>开始求签仪式</span>
                </button>
              </div>
            )}

            {/* TAB 2: DIVINE CEREMONY (Screens 2 Shake Overlay representation) */}
            {activeTab === "divine" && (
              <div id="divination-room" className="space-y-8 py-4 text-center">
                
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <button 
                    id="exit-divinity"
                    onClick={() => {
                      setIsShaking(false);
                      setActiveTab("home");
                    }}
                    className="px-4 py-2 bg-parchment-low hover:bg-parchment-dim border border-parchment-dim rounded-full text-xs text-deep-ink active:scale-95 transition"
                  >
                    返回
                  </button>
                  <span className="text-xs text-vermilion font-bold tracking-widest bg-vermilion/5 px-3 py-1 rounded-full border border-vermilion/15">
                    正在解构: {CATEGORIES.find(c => c.id === selectedCategory)?.name || "综合"}
                  </span>
                </div>

                <div className="bg-parchment-low/50 border border-parchment-dim rounded-2xl p-6 md:p-8 min-h-[420px] flex flex-col relative overflow-hidden z-10 shadow-inner">
                  
                  {/* Constellation Network Background (SVG lines and nodes representing combinations of prediction types) */}
                  <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none opacity-60">
                     <svg className="w-full h-full text-deep-ink/40" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                        {/* Filter definitions for glowing star elements */}
                        <defs>
                           <filter id="glow-heavy" x="-30%" y="-30%" width="160%" height="160%">
                              <feGaussianBlur stdDeviation="3.5" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                           </filter>
                           <filter id="glow-light" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="1.5" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                           </filter>
                           <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#fefcbf" stopOpacity="0.1" />
                              <stop offset="60%" stopColor="#fcf8e3" stopOpacity="0.03" />
                              <stop offset="100%" stopColor="#fcf8e3" stopOpacity="0" />
                           </radialGradient>
                        </defs>

                        {/* Background Astrolabe concentric rings */}
                        <circle cx="200" cy="200" r="185" fill="none" className="stroke-parchment-dim/30" strokeWidth="1" />
                        <circle cx="200" cy="200" r="155" fill="none" className="stroke-vermilion/5" strokeWidth="0.8" strokeDasharray="4 4" />
                        <circle cx="200" cy="200" r="110" fill="none" className="stroke-accent-gold/10" strokeWidth="0.8" strokeDasharray="6 3" />
                        <circle cx="200" cy="200" r="75" fill="none" className="stroke-deep-ink/5" strokeWidth="0.5" />
                        <circle cx="200" cy="200" r="155" fill="url(#ring-glow)" />

                        {/* --- Relationship Edges (Connections between Node Combinations) --- */}
                        {/* 1. Career ↔ Wealth Combo (名利双收) Lines */}
                        <path d="M 200 45 L 278 122 L 355 200" fill="none"
                              className={`transition-all duration-700 ${selectedCategory === 'career' || selectedCategory === 'wealth' || selectedCategory === 'general' ? 'stroke-amber-500/50 stroke-[1.5px]' : 'stroke-parchment-dim/40 stroke-[0.8px]'}`} 
                              strokeDasharray={selectedCategory === 'career' || selectedCategory === 'wealth' || selectedCategory === 'general' ? 'none' : '4 2'}
                        />

                        {/* 2. Wealth ↔ Health (福寿安康) Edge */}
                        <path d="M 355 200 L 278 278 L 200 355" fill="none"
                              className={`transition-all duration-700 ${selectedCategory === 'wealth' || selectedCategory === 'health' || selectedCategory === 'general' ? 'stroke-emerald-600/50 stroke-[1.5px]' : 'stroke-parchment-dim/40 stroke-[0.8px]'}`} 
                              strokeDasharray={selectedCategory === 'wealth' || selectedCategory === 'health' || selectedCategory === 'general' ? 'none' : '4 2'}
                        />

                        {/* 3. Health ↔ Love (百年好合) Edge */}
                        <path d="M 200 355 L 122 278 L 45 200" fill="none"
                              className={`transition-all duration-700 ${selectedCategory === 'health' || selectedCategory === 'love' || selectedCategory === 'general' ? 'stroke-rose-600/50 stroke-[1.5px]' : 'stroke-parchment-dim/40 stroke-[0.8px]'}`} 
                              strokeDasharray={selectedCategory === 'health' || selectedCategory === 'love' || selectedCategory === 'general' ? 'none' : '4 2'}
                        />

                        {/* 4. Love ↔ Career (成家立业) Edge */}
                        <path d="M 45 200 L 122 122 L 200 45" fill="none"
                              className={`transition-all duration-700 ${selectedCategory === 'love' || selectedCategory === 'career' || selectedCategory === 'general' ? 'stroke-vermilion/55 stroke-[1.5px]' : 'stroke-parchment-dim/40 stroke-[0.8px]'}`} 
                              strokeDasharray={selectedCategory === 'love' || selectedCategory === 'career' || selectedCategory === 'general' ? 'none' : '4 2'}
                        />

                        {/* 5. Career ↔ Health (神形兼修) Center Crossing Edge */}
                        <path d="M 200 45 L 200 355" fill="none"
                              className={`transition-all duration-700 ${selectedCategory === 'career' || selectedCategory === 'health' || selectedCategory === 'general' ? 'stroke-indigo-500/30 stroke-[1px]' : 'stroke-parchment-dim/20 stroke-[0.5px]'}`}
                              strokeDasharray="5 5"
                        />

                        {/* 6. Love ↔ Wealth (琴瑟和鸣) Center Crossing Edge */}
                        <path d="M 45 200 L 355 200" fill="none"
                              className={`transition-all duration-700 ${selectedCategory === 'love' || selectedCategory === 'wealth' || selectedCategory === 'general' ? 'stroke-amber-600/30 stroke-[1px]' : 'stroke-parchment-dim/20 stroke-[0.5px]'}`}
                              strokeDasharray="5 5"
                        />

                        {/* --- Animated Energy Flow Particles --- */}
                        {(selectedCategory === 'career' || selectedCategory === 'wealth' || selectedCategory === 'general') && (
                           <circle r="3" fill="#d97706" filter="url(#glow-heavy)">
                              <animateMotion dur="5s" repeatCount="indefinite" path="M 200 45 L 278 122 L 355 200" />
                           </circle>
                        )}
                        {(selectedCategory === 'wealth' || selectedCategory === 'health' || selectedCategory === 'general') && (
                           <circle r="3" fill="#10b981" filter="url(#glow-heavy)">
                              <animateMotion dur="6s" repeatCount="indefinite" path="M 355 200 L 278 278 L 200 355" />
                           </circle>
                        )}
                        {(selectedCategory === 'health' || selectedCategory === 'love' || selectedCategory === 'general') && (
                           <circle r="3" fill="#ec4899" filter="url(#glow-heavy)">
                              <animateMotion dur="5.5s" repeatCount="indefinite" path="M 200 355 L 122 278 L 45 200" />
                           </circle>
                        )}
                        {(selectedCategory === 'love' || selectedCategory === 'career' || selectedCategory === 'general') && (
                           <circle r="3" fill="#ef4444" filter="url(#glow-heavy)">
                              <animateMotion dur="4.5s" repeatCount="indefinite" path="M 45 200 L 122 122 L 200 45" />
                           </circle>
                        )}
                        {(selectedCategory === 'career' || selectedCategory === 'health' || selectedCategory === 'general') && (
                           <circle r="2.5" fill="#6366f1" filter="url(#glow-light)">
                              <animateMotion dur="7s" repeatCount="indefinite" path="M 200 45 L 200 355" />
                           </circle>
                        )}
                        {(selectedCategory === 'love' || selectedCategory === 'wealth' || selectedCategory === 'general') && (
                           <circle r="2.5" fill="#f59e0b" filter="url(#glow-light)">
                              <animateMotion dur="8s" repeatCount="indefinite" path="M 45 200 L 355 200" />
                           </circle>
                        )}

                        {/* --- Relationship labels (Core mid-points) --- */}
                        <g className="opacity-80">
                           <rect x="229" y="73" width="20" height="11" rx="3" fill="#fcfaf2" className="stroke-parchment-dim/40 stroke-[0.5px]" />
                           <text x="239" y="81" fontSize="7" className="font-serif font-bold fill-deep-ink/70" textAnchor="middle">禄</text>
                        </g>
                        <g className="opacity-80">
                           <rect x="151" y="73" width="20" height="11" rx="3" fill="#fcfaf2" className="stroke-parchment-dim/40 stroke-[0.5px]" />
                           <text x="161" y="81" fontSize="7" className="font-serif font-bold fill-deep-ink/70" textAnchor="middle">德</text>
                        </g>
                        <g className="opacity-80">
                           <rect x="229" y="313" width="20" height="11" rx="3" fill="#fcfaf2" className="stroke-parchment-dim/40 stroke-[0.5px]" />
                           <text x="239" y="321" fontSize="7" className="font-serif font-bold fill-deep-ink/70" textAnchor="middle">喜</text>
                        </g>
                        <g className="opacity-80">
                           <rect x="151" y="313" width="20" height="11" rx="3" fill="#fcfaf2" className="stroke-parchment-dim/40 stroke-[0.5px]" />
                           <text x="161" y="321" fontSize="7" className="font-serif font-bold fill-deep-ink/70" textAnchor="middle">缘</text>
                        </g>
                        <g className="opacity-80">
                           <rect x="190" y="93" width="20" height="11" rx="3" fill="#fcfaf2" className="stroke-parchment-dim/40 stroke-[0.5px]" />
                           <text x="200" y="101" fontSize="7" className="font-serif font-bold fill-deep-ink/70" textAnchor="middle">修</text>
                        </g>
                        <g className="opacity-80">
                           <rect x="90" y="194" width="20" height="11" rx="3" fill="#fcfaf2" className="stroke-parchment-dim/40 stroke-[0.5px]" />
                           <text x="100" y="202" fontSize="7" className="font-serif font-bold fill-deep-ink/70" textAnchor="middle">盟</text>
                        </g>

                        {/* --- Combination Combo Nodes (Secondary Astrolabe Joints) --- */}
                        {/* 5. 名利双收 (Career + Wealth Combo Node) */}
                        <g className="cursor-pointer" onClick={() => { setSelectedCategory('career'); playRattleSound(); }}>
                           <circle cx="278" cy="122" r="7" 
                                   className={`transition-all duration-300 ${selectedCategory === 'career' || selectedCategory === 'wealth' ? 'fill-amber-400 stroke-amber-500 stroke-[1.5px]' : 'fill-parchment-dim stroke-parchment-dim stroke-[1px] hover:stroke-amber-400'}`} 
                           />
                           <text x="278" y="110" fontSize="8" className="font-serif fill-deep-ink/70 font-semibold text-center select-none" textAnchor="middle">名利双收</text>
                        </g>

                        {/* 6. 福寿安康 (Wealth + Health Combo Node) */}
                        <g className="cursor-pointer" onClick={() => { setSelectedCategory('wealth'); playRattleSound(); }}>
                           <circle cx="278" cy="278" r="7" 
                                   className={`transition-all duration-300 ${selectedCategory === 'wealth' || selectedCategory === 'health' ? 'fill-emerald-400 stroke-emerald-500 stroke-[1.5px]' : 'fill-parchment-dim stroke-parchment-dim stroke-[1px] hover:stroke-emerald-400'}`} 
                           />
                           <text x="278" y="295" fontSize="8" className="font-serif fill-deep-ink/70 font-semibold text-center select-none" textAnchor="middle">寿比南山</text>
                        </g>

                        {/* 7. 百年好合 (Love + Health Combo Node) */}
                        <g className="cursor-pointer" onClick={() => { setSelectedCategory('love'); playRattleSound(); }}>
                           <circle cx="122" cy="278" r="7" 
                                   className={`transition-all duration-300 ${selectedCategory === 'love' || selectedCategory === 'health' ? 'fill-rose-400 stroke-rose-500 stroke-[1.5px]' : 'fill-parchment-dim stroke-parchment-dim stroke-[1px] hover:stroke-rose-400'}`} 
                           />
                           <text x="122" y="295" fontSize="8" className="font-serif fill-deep-ink/70 font-semibold text-center select-none" textAnchor="middle">白头偕老</text>
                        </g>

                        {/* 8. 成家立业 (Career + Love Combo Node) */}
                        <g className="cursor-pointer" onClick={() => { setSelectedCategory('career'); playRattleSound(); }}>
                           <circle cx="122" cy="122" r="7" 
                                   className={`transition-all duration-300 ${selectedCategory === 'career' || selectedCategory === 'love' ? 'fill-vermilion/75 stroke-vermilion stroke-[1.5px]' : 'fill-parchment-dim stroke-parchment-dim stroke-[1px] hover:stroke-vermilion/50'}`} 
                           />
                           <text x="122" y="110" fontSize="8" className="font-serif fill-deep-ink/70 font-semibold text-center select-none" textAnchor="middle">成家立业</text>
                        </g>

                        {/* --- Primary Nodes (Constellation Stars) --- */}
                        {/* 1. Career Node */}
                        <g className="cursor-pointer" onClick={() => setSelectedCategory('career')}>
                           <circle cx="200" cy="45" r={selectedCategory === 'career' ? "14" : "11"} 
                                   className={`transition-all duration-300 ${selectedCategory === 'career' ? 'fill-vermilion/20 stroke-vermilion stroke-2' : 'fill-parchment-high stroke-vermilion/40 stroke-[1px] hover:stroke-vermilion/80'}`} 
                                   filter={selectedCategory === 'career' ? 'url(#glow-heavy)' : 'none'}
                           />
                           <circle cx="200" cy="45" r="4" className={selectedCategory === 'career' ? 'fill-vermilion animate-pulse' : 'fill-vermilion/70'} />
                           <text x="200" y="24" fontSize="11" fill="currentColor" textAnchor="middle" className="font-serif font-bold tracking-wide select-none">事业</text>
                        </g>

                        {/* 2. Wealth Node */}
                        <g className="cursor-pointer" onClick={() => setSelectedCategory('wealth')}>
                           <circle cx="355" cy="200" r={selectedCategory === 'wealth' ? "14" : "11"} 
                                   className={`transition-all duration-300 ${selectedCategory === 'wealth' ? 'fill-amber-500/20 stroke-amber-600 stroke-2' : 'fill-parchment-high stroke-amber-500/40 stroke-[1px] hover:stroke-amber-500/80'}`} 
                                   filter={selectedCategory === 'wealth' ? 'url(#glow-heavy)' : 'none'}
                           />
                           <circle cx="355" cy="200" r="4" className={selectedCategory === 'wealth' ? 'fill-amber-600 animate-pulse' : 'fill-amber-600/70'} />
                           <text x="355" y="181" fontSize="11" fill="currentColor" textAnchor="middle" className="font-serif font-bold tracking-wide select-none">财富</text>
                        </g>

                        {/* 3. Health Node */}
                        <g className="cursor-pointer" onClick={() => setSelectedCategory('health')}>
                           <circle cx="200" cy="355" r={selectedCategory === 'health' ? "14" : "11"} 
                                   className={`transition-all duration-300 ${selectedCategory === 'health' ? 'fill-emerald-500/20 stroke-emerald-600 stroke-2' : 'fill-parchment-high stroke-emerald-500/40 stroke-[1px] hover:stroke-emerald-500/80'}`} 
                                   filter={selectedCategory === 'health' ? 'url(#glow-heavy)' : 'none'}
                           />
                           <circle cx="200" cy="355" r="4" className={selectedCategory === 'health' ? 'fill-emerald-600 animate-pulse' : 'fill-emerald-600/70'} />
                           <text x="200" y="383" fontSize="11" fill="currentColor" textAnchor="middle" className="font-serif font-bold tracking-wide select-none">健康</text>
                        </g>

                        {/* 4. Love Node */}
                        <g className="cursor-pointer" onClick={() => setSelectedCategory('love')}>
                           <circle cx="45" cy="200" r={selectedCategory === 'love' ? "14" : "11"} 
                                   className={`transition-all duration-300 ${selectedCategory === 'love' ? 'fill-rose-500/20 stroke-rose-600 stroke-2' : 'fill-parchment-high stroke-rose-500/40 stroke-[1px] hover:stroke-rose-500/80'}`} 
                                   filter={selectedCategory === 'love' ? 'url(#glow-heavy)' : 'none'}
                           />
                           <circle cx="45" cy="200" r="4" className={selectedCategory === 'love' ? 'fill-rose-600 animate-pulse' : 'fill-rose-600/70'} />
                           <text x="45" y="181" fontSize="11" fill="currentColor" textAnchor="middle" className="font-serif font-bold tracking-wide select-none">爱情</text>
                        </g>
                     </svg>
                  </div>

                  {/* Central voice control; the full-screen ritual replaces it while shaking. */}
                  {!isShaking && (
                    <div className="absolute left-1/2 top-[50%] z-20 -translate-x-1/2 -translate-y-1/2">
                      <div
                        className={`relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border border-vermilion/30 bg-parchment-high/90 shadow-[0_0_20px_rgba(239,68,68,0.08)] transition-all duration-300 ${isRecording ? 'scale-105 border-vermilion/50 bg-vermilion/5 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'hover:scale-[1.03]'}`}
                        onClick={handleVoiceToggle}
                      >
                        <div className={`pointer-events-none absolute left-1/2 top-1/2 inset-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-parchment-dim transition-all duration-1000 ${isRecording ? 'rotate-180 scale-105' : 'animate-[spin_20s_linear_infinite]'}`} />
                        <div className={`pointer-events-none absolute left-1/2 top-1/2 inset-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-gold/20 transition-all duration-1000 ${isRecording ? '-rotate-180 scale-95' : 'animate-[spin_15s_linear_infinite_reverse]'}`} />
                        <div className="relative z-10 flex flex-col items-center">
                          {isRecording ? (
                            <>
                              <Radio className="absolute w-8 h-8 text-vermilion opacity-20 animate-ping" />
                              <Mic className="w-8 h-8 text-vermilion" />
                              <span className="mt-2 text-[10px] font-bold tracking-widest text-vermilion uppercase">倾听凡音...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-7 h-7 text-deep-ink/50" />
                              <span className="mt-2 rounded-full border border-parchment-dim/40 bg-parchment-dim/20 px-2 py-0.5 text-center text-[9px] font-bold leading-none tracking-widest text-deep-ink/60 uppercase">
                                点击倾诉<br/><span className="text-[7px] opacity-70">卜问天机</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Voice Transcript Output / Progress Display */}
                  <div className="text-center min-h-[60px] w-full mt-auto z-20 relative px-4 text-deep-ink">
                     {isRecording || isShaking ? (
                        <p className="text-body-sm font-semibold tracking-wider animate-pulse min-h-[40px] flex items-center justify-center text-vermilion">
                          {isRecording ? (voiceTranscript || "倾注真意，万法自然...") : retrievingText}
                        </p>
                     ) : (
                        <p className="text-body-sm text-deep-ink/60 italic min-h-[40px] flex items-center justify-center">
                           "点击法阵中央，倾注灵意诉说心愿"
                        </p>
                     )}
                     
                     {isShaking && (
                        <div className="max-w-[180px] mx-auto mt-2">
                           <div className="relative h-1 w-full bg-parchment-highest rounded-full overflow-hidden border border-parchment-dim">
                              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-vermilion via-orange-400 to-amber-200 transition-all duration-300" style={{ width: `${shakeProgress}%` }} />
                           </div>
                        </div>
                     )}
                  </div>
                </div>

                <div className="text-center text-[11px] text-deep-ink/40 leading-relaxed px-6">
                  {question.trim() ? (
                    <p>心中求：<span className="text-deep-ink/80">“{question}”</span></p>
                  ) : (
                    <p>“虚心澄净，吉神相随。”</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PAST RECORDS TIMELINE (Screens 5 Layout representing list database) */}
            {activeTab === "history" && (
              <div id="past-timeline" className="space-y-6">
                <div className="flex justify-between items-center border-b border-parchment-dim pb-3">
                  <div className="flex items-center gap-2">
                    <h2 id="past-records-heading" className="font-serif text-lg font-bold tracking-wide text-deep-ink">过往占卜</h2>
                    <span className="text-xs text-deep-ink/40 font-mono">|</span>
                    <span className="text-xs text-deep-ink/50 leading-none">您的灵力宿命探寻记录</span>
                  </div>
                  <span className="text-xs bg-parchment-highest/70 px-2.5 py-0.5 text-deep-ink/60 border border-parchment-dim rounded-full font-medium">
                    累计: {historyRecords.length} 签
                  </span>
                </div>

                {/* Records Listing cards timeline */}
                {historyRecords.length === 0 ? (
                  <div id="past-records-empty" className="text-center py-20 bg-parchment-low/30 border border-dashed border-parchment-dim rounded-2xl space-y-4">
                    <div className="w-16 h-16 mx-auto text-parchment-dim mb-2 flex items-center justify-center">
                      <BookOpen className="w-10 h-10" />
                    </div>
                    <p className="font-serif text-lg text-deep-ink/60">档案中未找到任何占卜记录</p>
                    <p className="text-xs text-deep-ink/40">灵台高挂，一尘不染。可以往主页点击开启占卜。</p>
                    <button 
                      onClick={() => setActiveTab("home")}
                      className="px-5 py-2.5 bg-vermilion text-white text-xs font-semibold tracking-wider rounded-lg shadow-sm hover:scale-105 transition"
                    >
                      去求第一张签诗
                    </button>
                  </div>
                ) : (
                  <div className="relative space-y-6 pl-4 border-l-2 border-parchment-dim ml-2">
                    {historyRecords.map((rec, index) => (
                      <div 
                        key={index} 
                        id={`past-receipt-${index}`}
                        className="bg-parchment hover:bg-[#fffdf9] border border-parchment-dim rounded-xl p-5 shadow-sm space-y-4 relative transition hover:shadow-md duration-300 transform hover:-translate-y-0.5"
                      >
                        {/* Timeline node icon */}
                        <div className="absolute -left-[27px] top-5 bg-parchment border-2 border-vermilion w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-vermilion rounded-full"></div>
                        </div>

                        {/* Top banner */}
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-xs text-deep-ink/40 tracking-wider bg-parchment-low px-2 py-0.5 rounded font-mono">
                            {new Date(rec.timestamp).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] bg-emerald-500/10 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                              {rec.categoryLabel || "气运"}
                            </span>
                            <span className="zen-stamp text-xs scale-90 -mr-1">
                              {rec.stamp}
                            </span>
                          </div>
                        </div>

                        {/* Slip Title & text */}
                        <div className="space-y-2">
                          <h3 className="font-serif text-lg font-bold text-deep-ink flex items-center gap-1.5 gray-dark">
                            {rec.title}
                          </h3>
                          {rec.question && (
                            <p className="text-xs text-deep-ink/70 italic bg-parchment-low/50 px-2 py-1.5 rounded leading-relaxed border-l-2 border-accent-gold/40">
                              心中所疑：{rec.question}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {rec.mentalState && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-900 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                                <span>当前心境:</span>
                                <span className="font-semibold">{rec.mentalState}</span>
                              </span>
                            )}
                            {rec.recentEvents && (
                              <span className="text-[10px] bg-red-500/10 text-red-950 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                                <span>近期经历:</span>
                                <span className="font-semibold">{rec.recentEvents}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-body-sm text-vermilion font-serif leading-relaxed pt-1 tracking-wider text-center bg-vermilion/5 py-2 rounded-lg">
                            『 {rec.poetry} 』
                          </p>
                        </div>

                        {/* Brief explanation */}
                        <p className="text-xs text-deep-ink/75 leading-relaxed bg-parchment-high/25 p-3 rounded-lg border border-parchment-dim/40 line-clamp-3">
                          {rec.explanation}
                        </p>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-parchment-dim/60">
                          <button
                            onClick={() => {
                              setCurrentResult(rec);
                              setShowResultModal(true);
                              // Use cached generated image if available, otherwise regenerate.
                              if (rec.imageUrl && !isPlaceholderImage(rec.imageUrl)) {
                                setSlipImage(rec.imageUrl);
                              } else {
                                retrieveSlipImage(rec);
                              }
                            }}
                            className="text-xs text-vermilion font-bold tracking-wider hover:underline inline-flex items-center gap-1 group focus:outline-none"
                          >
                            <span>查看完整解读</span>
                            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyResultToClipboard(rec)}
                              title="分享"
                              className="p-1.5 hover:bg-parchment-high rounded-md text-deep-ink/50 transition duration-150 focus:outline-none"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(index)}
                              title="清除"
                              className="p-1.5 hover:bg-vermilion/10 rounded-md text-vermilion/50 hover:text-vermilion transition duration-150 focus:outline-none"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MY CENTER (User profile and ritual details) */}
            {activeTab === "profile" && (
              <div id="user-center" className="space-y-6">
                {!currentUser ? (
                  <LoginRegister 
                    onSuccess={(user, message) => {
                      setCurrentUser(user);
                      notify(message || "已成功归入修持之坛！");
                    }}
                    onSkip={() => {
                      notify("✨ 已以无名尊者游客身，继续体察天机...");
                      setActiveTab("divine");
                    }}
                  />
                ) : (
                  <>
                    {/* Visual Avatar Frame resembling Screens */}
                    <div className="bg-gradient-to-br from-parchment-low to-parchment-dim/40 border border-parchment-dim rounded-2xl p-6 relative overflow-hidden text-center space-y-4">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-vermilion/5 rounded-bl-full flex items-center justify-end p-4">
                        <UserCheck className="w-5 h-5 text-vermilion" />
                      </div>
                      
                      <div className="w-20 h-20 bg-white border-2 border-accent-gold rounded-full mx-auto flex items-center justify-center shadow-lg transform hover:rotate-12 transition duration-300">
                        <span className="font-serif text-3xl text-vermilion">禅</span>
                      </div>

                      <div>
                        <h3 className="font-serif text-xl font-bold tracking-wide">{currentUser.username}</h3>
                        <p className="text-xs text-deep-ink/50 mt-1">虔诚修行者 • 功德名册已录</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-parchment-dim/60">
                        <div className="bg-white/50 p-2.5 rounded-lg border border-parchment-dim/30">
                          <span className="text-xs text-deep-ink/40 block">累计祈度</span>
                          <strong className="text-lg font-serif text-vermilion">{historyRecords.length} 遍</strong>
                        </div>
                        <div className="bg-white/50 p-2.5 rounded-lg border border-parchment-dim/30">
                          <span className="text-xs text-deep-ink/40 block">当前命灯</span>
                          <strong className="text-lg font-serif text-emerald-700">常明长照</strong>
                        </div>
                      </div>
                    </div>

                    {/* Zen fortune context block */}
                    <div className="bg-white/80 border border-parchment-dim rounded-2xl p-5 space-y-4">
                      <h4 className="font-serif text-base font-bold text-deep-ink flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-vermilion" />
                        <span>禅运(ZenFortune) 功德源流</span>
                      </h4>
                      <p className="text-xs text-deep-ink/75 leading-relaxed space-y-2">
                        禅门占卜不同于俗常算命，不仅在于前程趋吉、消解灾殃，更注重“反身修德”。每一纸签文皆是由 Gemini 自然天机引擎汲取华夏大智度经、道德经、及千七百则禅宗公案精髓，并与现代疗愈人本心理学相契，所生发之清凉法露。
                      </p>
                      <p className="text-xs text-deep-ink/75 leading-relaxed pt-1 border-t border-parchment-dim/30">
                        <b>规谏：</b>今日得吉，亦不可骄狂放纵，傲物则德尽；今日得平或下，亦不能哀戚萎靡，心若坚，魔煞皆成道行。顺应无常，方始获得般若大解脱。
                      </p>
                    </div>

                    {/* App utility features credit block */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold tracking-wider text-deep-ink/40 uppercase">
                        系统功德与反馈
                      </h4>
                      
                      <div className="bg-parchment-low/40 border border-parchment-dim rounded-xl overflow-hidden divide-y divide-parchment-dim">
                        <div 
                          onClick={() => notify("🙏 感谢恩养。愿您福慧俱足，法喜充满。")}
                          className="px-4 py-3 text-xs flex justify-between items-center cursor-pointer hover:bg-parchment-dim/30 transition text-deep-ink/80"
                        >
                          <span>祈愿加持回向</span>
                          <ChevronRight className="w-4 h-4 text-deep-ink/40" />
                        </div>
                        <div 
                          onClick={async () => {
                            if (historyRecords.length > 0) {
                              if (currentUser?.token) {
                                try {
                                  await fetch("/api/fortune/history/clear", {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${currentUser.token}` },
                                  });
                                } catch (err) {
                                  console.error("Error clearing records:", err);
                                }
                              }
                              saveRecords([]);
                              notify("🕯️ 清净无垢，一切尘缘皆已回归宇宙大空。");
                            } else {
                              notify("🕯️ 乾坤本净，无尘可拂。");
                            }
                          }}
                          className="px-4 py-3 text-xs flex justify-between items-center cursor-pointer hover:bg-vermilion/5 text-vermilion/80 transition"
                        >
                          <span>清空宿世功德求证记录</span>
                          <X className="w-4 h-4" />
                        </div>
                        <div 
                          onClick={async () => {
                            await supabase.auth.signOut();
                            setCurrentUser(null);
                            setHistoryRecords([]);
                            notify("🕯️ 虔修圆满，已退登坛口，复归常静。");
                          }}
                          className="px-4 py-3 text-xs flex justify-between items-center cursor-pointer hover:bg-vermilion/5 text-vermilion/80 transition"
                        >
                          <span>退出登固坛口 (登出斋号)</span>
                          <ArrowRight className="w-4 h-4 text-deep-ink/40" />
                        </div>
                      </div>
                    </div>

                    {/* Footer and version */}
                    <div className="text-center opacity-40 text-[11px] pt-4">
                      <span>EST. MMXXIV • ZENFORTUNE FORWARD PATH</span>
                    </div>
                  </>
                )}
              </div>
            )}
            
          </main>

          {/* SCREEN 4 overlay modal details window containing result scroll */}
          {showResultModal && currentResult && (
            <div id="result-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Dim backdrop blur */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowResultModal(false)}
              />

              {/* Scroll design card content (Screenshot 4) */}
              <div id="scroll-wrapper" className="relative z-10 w-full max-w-lg bg-parchment border border-accent-gold shadow-2xl rounded-2xl overflow-y-auto max-h-[90vh] flex flex-col justify-between">
                
                {/* Scroll upper roller detail */}
                <div className="h-4 bg-gradient-to-b from-parchment-dim to-parchment rounded-t-2xl border-b border-accent-gold/25" />
                
                {/* Scroll internal paper wrapper */}
                <div className="p-6 md:p-8 space-y-6">
                  
                  {/* Title Bar with close toggle */}
                  <div className="flex items-center justify-between border-b border-parchment-dim pb-4">
                    <span className="text-xs bg-vermilion/5 text-vermilion border border-vermilion/20 px-3 py-1 rounded font-bold font-serif">
                      悟 • {currentResult.categoryLabel || "神数"}
                    </span>
                    <button 
                      id="close-result"
                      onClick={() => setShowResultModal(false)} 
                      className="p-1 rounded-full hover:bg-parchment-dim transition"
                    >
                      <X className="w-6 h-6 text-deep-ink/60" />
                    </button>
                  </div>

                  {/* Divine Input Context Overlay */}
                  {(currentResult.question || currentResult.mentalState || currentResult.recentEvents) && (
                    <div className="bg-parchment-low/40 border border-parchment-dim/60 rounded-xl p-3 text-xs text-deep-ink/75 space-y-1.5 leading-relaxed">
                      {currentResult.question && (
                        <div>
                          <span className="font-bold text-deep-ink/40 font-serif">心中求问：</span>
                          <span className="italic">“{currentResult.question}”</span>
                        </div>
                      )}
                      {currentResult.mentalState && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-deep-ink/40 font-serif">当前心境：</span>
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded font-semibold text-[10px]">{currentResult.mentalState}</span>
                        </div>
                      )}
                      {currentResult.recentEvents && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-deep-ink/40 font-serif">近期遭遇：</span>
                          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-950 border border-red-500/20 rounded font-semibold text-[10px]">{currentResult.recentEvents}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Red Square Stamp (上吉 or similar outcome indicator) */}
                  <div className="relative flex flex-col items-center justify-center py-4 bg-parchment-low/30 rounded-xl border border-dashed border-parchment-dim">
                    
                    <div className="absolute top-4 right-4 z-20">
                      <div className="zen-stamp text-sm">
                        {currentResult.stamp}
                      </div>
                    </div>

                    {/* Stylized Poetry Display vertical orientation */}
                    <div className="text-center space-y-4">
                      <div className="text-xs tracking-[0.25em] font-bold text-deep-ink/40 uppercase">
                        一笔朱砂 卦兆洞明
                      </div>
                      <h3 className="font-serif text-2xl font-extrabold text-deep-ink tracking-widest mt-1">
                        第 {currentResult.title}
                      </h3>
                      <div className="w-12 h-[2px] bg-vermilion/30 mx-auto my-3" />
                      
                      {/* Vertical line styled poem block */}
                      <p className="font-serif text-xl md:text-2xl text-vermilion leading-loose tracking-[0.2em] font-bold py-1 text-center select-text selection:bg-vermilion/10">
                        {currentResult.poetry}
                      </p>
                    </div>
                  </div>

                  {/* Visual Scenes Section: AI Painting */}
                  <div className="space-y-3 bg-parchment-low/40 border border-parchment-dim rounded-2xl p-4 shadow-sm">
                    <h4 className="text-[11px] font-bold text-amber-950 tracking-widest flex items-center gap-1.5 uppercase font-serif">
                      <span className="w-2 h-2 rounded-full bg-vermilion animate-pulse"></span>
                      <span>意境生化</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-3.5">
                      {/* Left Block: Server-side Gemini/Qwen Ink painting of poetry essence */}
                      <div className="bg-white/70 border border-parchment-dim rounded-xl p-3 flex flex-col justify-between items-center relative overflow-hidden min-h-[200px]">
                        <div className="text-[10px] text-deep-ink/40 font-serif tracking-widest pb-1.5 self-start flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-vermilion animate-pulse" />
                          <span>一叶天笔 (AI Fine Painting)</span>
                        </div>
                        
                        {isGeneratingImage ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-1.5 text-center p-3">
                            <RefreshCw className="w-5 h-5 text-vermilion animate-spin" />
                            <p className="text-[10px] text-deep-ink/40 font-serif leading-relaxed animate-pulse">神笔着彩，绘写意蕴...</p>
                          </div>
                        ) : slipImage ? (
                          <div className="w-full flex-1 flex flex-col justify-center items-center">
                            <img 
                              src={slipImage} 
                              alt="Zen Poetry Artwork" 
                              referrerPolicy="no-referrer"
                              onClick={() => setShowImageModal(true)}
                              className="w-[124px] h-[124px] object-cover rounded-lg border border-parchment-dim/80 shadow hover:scale-105 transition-transform duration-300 cursor-pointer"
                            />
                            <p className="text-[9px] text-deep-ink/40 font-serif pt-1.5 text-center leading-normal">
                              描摹《{currentResult.title}》古典水墨画
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[11px] text-deep-ink/30 italic font-serif">未开卷</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Core Interpretation Module */}
                  <div className="space-y-6 text-left">
                    
                    {/* Item 1: Dynamic Commentary, styled as Frosted Parchment with multiply overlay */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-vermilion tracking-widest flex items-center gap-1.5 uppercase">
                        <span className="w-2 h-2 rounded-full bg-vermilion"></span>
                        <span>局势推演</span>
                      </h4>
                      <p className="text-body-sm leading-relaxed text-deep-ink/85 select-text selection:bg-vermilion/10 bg-white/40 p-4 rounded-lg border border-parchment-dim/60 shadow-inner">
                        {currentResult.explanation}
                      </p>
                    </div>

                    {/* Item 2: Pragmatic Suggestions/Advice */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-emerald-800 tracking-widest flex items-center gap-1.5 uppercase">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>行动建议及功课</span>
                      </h4>
                      <ul className="space-y-3 text-body-sm text-deep-ink/80 pl-1">
                        {currentResult.advice.map((item, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="p-1 rounded bg-[#7ed99e]/20 text-emerald-950 font-bold text-[10px] mt-0.5 border border-emerald-500/10">
                              功课{idx+1}
                            </span>
                            <span className="flex-1 leading-normal text-xs md:text-body-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Quick share action triggers inside scroll */}
                  <div className="pt-4 border-t border-parchment-dim/60 flex gap-3">
                    <button
                      id="share-action"
                      onClick={() => copyResultToClipboard(currentResult)}
                      className="flex-1 py-3.5 bg-vermilion text-white rounded-lg text-body-sm font-bold tracking-widest hover:bg-vermilion/95 transition shadow hover:shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-accent-gold" />
                      <span>分享洞察天机</span>
                    </button>
                    
                    <button
                      id="save-history-action"
                      onClick={() => {
                        setShowResultModal(false);
                        setActiveTab("history");
                      }}
                      className="px-6 py-3.5 bg-parchment-high hover:bg-parchment-highest border border-parchment-dim rounded-lg text-body-sm font-semibold tracking-wider text-deep-ink/80 transition active:scale-95"
                    >
                      查看功德簿
                    </button>
                  </div>
                </div>

                {/* Scroll lower roller detail */}
                <div className="h-4 bg-gradient-to-t from-parchment-dim to-parchment rounded-b-2xl border-t border-accent-gold/25" />
              </div>
            </div>
          )}

          {/* SCREEN 5 overlay modal details window containing result scroll */}
          {showResultModal && currentResult && (
            <div id="result-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Dim backdrop blur */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowResultModal(false)}
              />

              {/* Scroll design card content (Screenshot 4) */}
              <div id="scroll-wrapper" className="relative z-10 w-full max-w-lg bg-parchment border border-accent-gold shadow-2xl rounded-2xl overflow-y-auto max-h-[90vh] flex flex-col justify-between animate-fadeIn">
                
                {/* Scroll upper roller detail */}
                <div className="h-4 bg-gradient-to-b from-parchment-dim to-parchment rounded-t-2xl border-b border-accent-gold/25" />
                
                {/* Scroll internal paper wrapper */}
                <div className="p-6 md:p-8 space-y-6">
                  
                  {/* Title Bar with close toggle */}
                  <div className="flex items-center justify-between border-b border-parchment-dim pb-4">
                    <span className="text-xs bg-vermilion/5 text-vermilion border border-vermilion/20 px-3 py-1 rounded font-bold font-serif">
                      悟 • {currentResult.categoryLabel || "神数"}
                    </span>
                    <button 
                      id="close-result"
                      onClick={() => setShowResultModal(false)} 
                      className="p-1 rounded-full hover:bg-parchment-dim transition"
                    >
                      <X className="w-6 h-6 text-deep-ink/60" />
                    </button>
                  </div>

                  {/* Divine Input Context Overlay */}
                  {(currentResult.question || currentResult.mentalState || currentResult.recentEvents) && (
                    <div className="bg-parchment-low/40 border border-parchment-dim/60 rounded-xl p-3 text-xs text-deep-ink/75 space-y-1.5 leading-relaxed">
                      {currentResult.question && (
                        <div>
                          <span className="font-bold text-deep-ink/40 font-serif">心中求问：</span>
                          <span className="italic">“{currentResult.question}”</span>
                        </div>
                      )}
                      {currentResult.mentalState && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-deep-ink/40 font-serif">当前心境：</span>
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded font-semibold text-[10px]">{currentResult.mentalState}</span>
                        </div>
                      )}
                      {currentResult.recentEvents && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-deep-ink/40 font-serif">近期遭遇：</span>
                          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-950 border border-red-500/20 rounded font-semibold text-[10px]">{currentResult.recentEvents}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Red Square Stamp (上吉 or similar outcome indicator) */}
                  <div className="relative flex flex-col items-center justify-center py-4 bg-parchment-low/30 rounded-xl border border-dashed border-parchment-dim">
                    
                    <div className="absolute top-4 right-4 z-20">
                      <div className="zen-stamp text-sm">
                        {currentResult.stamp}
                      </div>
                    </div>

                    {/* Stylized Poetry Display vertical orientation */}
                    <div className="text-center space-y-4">
                      <div className="text-xs tracking-[0.25em] font-bold text-deep-ink/40 uppercase">
                        一笔朱砂 卦兆洞明
                      </div>
                      <h3 className="font-serif text-2xl font-extrabold text-deep-ink tracking-widest mt-1">
                        第 {currentResult.title}
                      </h3>
                      <div className="w-12 h-[2px] bg-vermilion/30 mx-auto my-3" />
                      
                      {/* Vertical line styled poem block */}
                      <p className="font-serif text-xl md:text-2xl text-vermilion leading-loose tracking-[0.2em] font-bold py-1 text-center select-text selection:bg-vermilion/10">
                        {currentResult.poetry}
                      </p>
                    </div>
                  </div>

                  {/* Visual Scenes Section: AI Painting */}
                  <div className="space-y-3 bg-parchment-low/40 border border-parchment-dim rounded-2xl p-4 shadow-sm">
                    <h4 className="text-[11px] font-bold text-amber-950 tracking-widest flex items-center gap-1.5 uppercase font-serif">
                      <span className="w-2 h-2 rounded-full bg-vermilion animate-pulse"></span>
                      <span>意境生化</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-3.5">
                      {/* Left Block: Server-side Gemini/Qwen Ink painting of poetry essence */}
                      <div className="bg-white/70 border border-parchment-dim rounded-xl p-3 flex flex-col justify-between items-center relative overflow-hidden min-h-[200px]">
                        <div className="text-[10px] text-deep-ink/40 font-serif tracking-widest pb-1.5 self-start flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-vermilion animate-pulse" />
                          <span>一叶天笔 (AI Fine Painting)</span>
                        </div>
                        
                        {isGeneratingImage ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-1.5 text-center p-3">
                            <RefreshCw className="w-5 h-5 text-vermilion animate-spin" />
                            <p className="text-[10px] text-deep-ink/40 font-serif leading-relaxed animate-pulse">神笔着彩，绘写意蕴...</p>
                          </div>
                        ) : slipImage ? (
                          <div className="w-full flex-1 flex flex-col justify-center items-center">
                            <img 
                              src={slipImage} 
                              alt="Zen Poetry Artwork" 
                              referrerPolicy="no-referrer"
                              onClick={() => setShowImageModal(true)}
                              className="w-[124px] h-[124px] object-cover rounded-lg border border-parchment-dim/80 shadow hover:scale-105 transition-transform duration-300 cursor-pointer"
                            />
                            <p className="text-[9px] text-deep-ink/40 font-serif pt-1.5 text-center leading-normal">
                              描摹《{currentResult.title}》古典水墨画
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[11px] text-deep-ink/30 italic font-serif">未开卷</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Core Interpretation Module */}
                  <div className="space-y-6 text-left">
                    
                    {/* Item 1: Dynamic Commentary, styled as Frosted Parchment with multiply overlay */}
                    <div className="space-y-2">
                       <h4 className="text-xs font-bold text-vermilion tracking-widest flex items-center gap-1.5 uppercase">
                        <span className="w-2 h-2 rounded-full bg-vermilion"></span>
                        <span>局势推演</span>
                      </h4>
                      <p className="text-body-sm leading-relaxed text-deep-ink/85 select-text selection:bg-vermilion/10 bg-white/40 p-4 rounded-lg border border-parchment-dim/60 shadow-inner">
                        {currentResult.explanation}
                      </p>
                    </div>

                    {/* Item 2: Pragmatic Suggestions/Advice */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-emerald-800 tracking-widest flex items-center gap-1.5 uppercase">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>行动建议及功课</span>
                      </h4>
                      <ul className="space-y-3 text-body-sm text-deep-ink/80 pl-1">
                        {currentResult.advice.map((item, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="p-1 rounded bg-[#7ed99e]/20 text-emerald-950 font-bold text-[10px] mt-0.5 border border-emerald-500/10">
                              功课{idx+1}
                            </span>
                            <span className="flex-1 leading-normal text-xs md:text-body-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Quick share action triggers inside scroll */}
                  <div className="pt-4 border-t border-parchment-dim/60 flex gap-3">
                    <button
                      id="share-action"
                      onClick={() => copyResultToClipboard(currentResult)}
                      className="flex-1 py-3.5 bg-vermilion text-white rounded-lg text-body-sm font-bold tracking-widest hover:bg-vermilion/95 transition shadow hover:shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 animate-bounce-short"
                    >
                      <Share2 className="w-4 h-4 text-accent-gold" />
                      <span>分享洞察天机</span>
                    </button>
                    
                    <button
                      id="save-history-action"
                      onClick={() => {
                        setShowResultModal(false);
                        setActiveTab("history");
                      }}
                      className="px-6 py-3.5 bg-parchment-high hover:bg-parchment-highest border border-parchment-dim rounded-lg text-body-sm font-semibold tracking-wider text-deep-ink/80 transition active:scale-95"
                    >
                      查看功德簿
                    </button>
                  </div>
                </div>

                {/* Scroll lower roller detail */}
                <div className="h-4 bg-gradient-to-t from-parchment-dim to-parchment rounded-b-2xl border-t border-accent-gold/25" />
              </div>
            </div>
          )}



          {/* Persistent Fixed Bottom Menu-Bar (Screens 3 / 4 Base buttons) */}
          <footer id="nav-tabbar" className="fixed bottom-0 left-0 w-full bg-parchment border-t border-parchment-dim py-2.5 px-6 z-40 shadow-lg flex items-center justify-around">
            
            {/* Tab 1 button */}
            <button
              id="tab-home"
              onClick={() => {
                setActiveTab("home");
                playRattleSound();
              }}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "home" ? "text-vermilion scale-105" : "text-deep-ink/40 hover:text-deep-ink/85"}`}
            >
              <Compass className="w-5 h-5 font-bold" />
              <span className="text-[10px] font-bold tracking-wider">首页</span>
            </button>

            {/* Tab 2 button */}
            <button
              id="tab-divination"
              onClick={() => {
                setActiveTab("divine");
                playRattleSound();
              }}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "divine" ? "text-vermilion scale-105" : "text-deep-ink/40 hover:text-deep-ink/85"}`}
            >
              <Sparkles className="w-5 h-5 font-bold animate-pulse" />
              <span className="text-[10px] font-bold tracking-wider">占卜</span>
            </button>

            {/* Tab 3 button */}
            <button
              id="tab-records"
              onClick={() => {
                setActiveTab("history");
                playRattleSound();
              }}
              className={`flex flex-col items-center gap-1 transition relative ${activeTab === "history" ? "text-vermilion scale-105" : "text-deep-ink/40 hover:text-deep-ink/85"}`}
            >
              <History className="w-5 h-5 font-bold" />
              <span className="text-[10px] font-bold tracking-wider">历史记录</span>
              {/* Optional red dot showing custom record alerts */}
              {historyRecords.length > 0 && (
                <span className="absolute top-0 right-3.5 w-1.5 h-1.5 bg-vermilion rounded-full"></span>
              )}
            </button>

            {/* Tab 4 button */}
            <button
              id="tab-user-profile"
              onClick={() => {
                setActiveTab("profile");
                playRattleSound();
              }}
              className={`flex flex-col items-center gap-1 transition ${activeTab === "profile" ? "text-vermilion scale-105" : "text-deep-ink/40 hover:text-deep-ink/85"}`}
            >
              <User className="w-5 h-5 font-bold" />
              <span className="text-[10px] font-bold tracking-wider">我的</span>
            </button>
          </footer>
        </div>
      )}

      {isShaking && (
        <DivinationRitualOverlay
          progress={shakeProgress}
          message={retrievingText}
          videoSrc={FORTUNE_TUBE_RITUAL_VIDEO}
          posterSrc={FORTUNE_TUBE_IMAGE}
        />
      )}

      {/* 1:1 Image Fullscreen Modal */}
      {showImageModal && slipImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setShowImageModal(false)}
        >
          {/* Modal Container */}
          <div 
            className="relative w-full max-w-2xl aspect-square bg-parchment rounded-xl shadow-2xl overflow-hidden border-2 border-accent-gold/50 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowImageModal(false)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Image */}
            <img 
              src={slipImage} 
              alt="Generated Fortune Visual" 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 cursor-zoom-in"
            />
          </div>
        </div>
      )}

      {/* Atmospheric micro overlay grain texture */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.035] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" type="fractalNoise" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

    </div>
  );
}
