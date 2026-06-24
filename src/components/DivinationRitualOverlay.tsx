import { useState } from "react";

interface DivinationRitualOverlayProps {
  progress: number;
  message: string;
  videoSrc: string;
  posterSrc: string;
}

export default function DivinationRitualOverlay({ progress, message, videoSrc, posterSrc }: DivinationRitualOverlayProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <section
      className="fixed inset-0 z-[120] isolate overflow-hidden bg-[#171815] text-white"
      style={{ minHeight: "100vh", height: "100dvh" }}
      aria-label="求签仪式进行中"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_43%,#5d5a4e_0%,#282a25_52%,#11120f_100%)]" />
      <img src={posterSrc} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl" />

      <div aria-hidden="true" className="absolute -left-[22%] top-[25%] z-[1] h-[38%] w-[75%] rounded-[50%] bg-[#eee8da]/45 blur-3xl motion-safe:animate-[ritual-mist-drift_7s_ease-in-out_infinite_alternate] motion-reduce:animate-none" />
      <div aria-hidden="true" className="absolute -right-[26%] top-[43%] z-[1] h-[34%] w-[78%] rounded-[50%] bg-[#f4efe4]/35 blur-3xl motion-safe:animate-[ritual-mist-drift_9s_ease-in-out_infinite_alternate-reverse] motion-reduce:animate-none" />

      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[1] h-[24%] opacity-35">
        <div
          className="absolute -bottom-[18%] -left-[15%] h-full w-[72%] bg-[#161a17] blur-[1px]"
          style={{ clipPath: "polygon(0 100%, 0 70%, 18% 51%, 31% 60%, 48% 23%, 66% 53%, 82% 35%, 100% 70%, 100% 100%)" }}
        />
        <div
          className="absolute -bottom-[25%] -right-[18%] h-full w-[78%] bg-[#242824]/90 blur-[2px]"
          style={{ clipPath: "polygon(0 100%, 0 72%, 17% 45%, 34% 61%, 50% 28%, 65% 52%, 78% 37%, 100% 65%, 100% 100%)" }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 bottom-[clamp(7.5rem,18vh,10rem)] z-[2] flex items-center justify-center px-3 sm:px-8">
        <img src={posterSrc} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" />
        {!videoFailed && (
          <video
            data-ritual-foreground
            className="relative h-full w-full object-contain"
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            aria-label="求签过程中摇动签筒的动态画面"
          />
        )}
      </div>

      <div aria-hidden="true" className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_42%,rgba(237,229,211,0.08)_70%,rgba(232,224,207,0.52)_120%)] mix-blend-screen" />
      <div aria-hidden="true" className="absolute inset-0 z-[4] bg-gradient-to-b from-black/15 via-transparent to-black/75" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[4] h-[32%] bg-gradient-to-t from-[#0b0c0a]/95 via-[#11120f]/36 to-transparent" />

      <div className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] border border-vermilion/70 bg-[#efe6d6]/90 px-2 py-3 font-serif text-xs font-bold tracking-[0.35em] text-vermilion shadow-lg [writing-mode:vertical-rl] sm:right-8 sm:px-2.5">
        天机将启
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 text-center"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-base font-semibold tracking-[0.18em] text-[#fffaf0] drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] sm:text-lg">{message}</p>
        <p className="mt-2 text-[10px] font-medium tracking-[0.35em] text-[#efe0bd]/75 sm:text-xs">松风入怀 · 静候签意</p>
        <div className="mt-5 h-[2px] w-[58vw] max-w-xs overflow-hidden bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.12)]">
          <div
            className="h-full bg-gradient-to-r from-vermilion via-[#d5ad61] to-[#f0dfb4] transition-[width] duration-300 ease-out"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
