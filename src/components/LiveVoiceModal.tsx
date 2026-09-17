import React, { useEffect, useRef, useState } from 'react';
import { Crown, Mic, MicOff, X, Volume2, AlertCircle, Loader2 } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      cleanupSession();
    }
    return () => {
      cleanupSession();
    };
  }, [isOpen]);

  const pcmToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return window.btoa(binary);
  };

  const playChunk = (outputCtx: AudioContext, base64Audio: string) => {
    try {
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = outputCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = outputCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputCtx.destination);

      const currentTime = outputCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.05;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setIsSpeaking(true);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };
    } catch (e) {
      console.error('Audio chunk playback error:', e);
    }
  };

  const stopAllAudio = () => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // ignore
      }
    }
    activeSourcesRef.current = [];
    setIsSpeaking(false);
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  const startLiveSession = async () => {
    setErrorMsg(null);
    setIsConnecting(true);

    try {
      // 1. Initialize Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 2. Request mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);

        // Setup microphone processor
        const sourceNode = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        sourceNode.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && !isMuted) {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64 = pcmToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setErrorMsg(msg.error);
            return;
          }
          if (msg.interrupted) {
            stopAllAudio();
          }
          if (msg.audio && outputAudioCtxRef.current) {
            playChunk(outputAudioCtxRef.current, msg.audio);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Live API error:', err);
        setErrorMsg('სერვერთან კავშირი გაწყდა.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err: any) {
      console.error('Failed to initiate live session:', err);
      setErrorMsg(err.message || 'მიკროფონის ან კავშირის შეცდომა');
      setIsConnecting(false);
    }
  };

  const cleanupSession = () => {
    stopAllAudio();
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#4a3a28] bg-gradient-to-b from-[#1c1813] to-[#100e0b] p-6 sm:p-8 text-[#f5ede0] shadow-2xl shadow-black/80">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#8c7f73] hover:bg-[#28221a] hover:text-[#eae0d5] transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#996515] to-[#4a3614] shadow-lg shadow-[#996515]/30 ring-2 ring-[#e5c158]/50">
            <Crown className="h-7 w-7 text-[#fff8e7]" />
          </div>
          <h3 className="font-cinzel text-xl font-bold tracking-wide text-[#f5ede0]">
            ცოცხალი საუბარი მეფესთან
          </h3>
          <p className="mt-1 font-georgian-serif text-xs text-[#b8a898]">
            Gemini 3.8 Live რეალურ დროში ხმოვანი დიალოგი
          </p>
        </div>

        {/* Status / Orb Visualizer */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center">
            {/* Concentric pulsing rings */}
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-[#b8860b] opacity-20 transition-all ${
                isSpeaking ? 'animate-ping scale-125' : isConnected ? 'animate-pulse' : ''
              }`}
            ></span>
            <span
              className={`absolute inline-flex h-28 w-28 rounded-full border border-[#d4af37]/40 transition-all ${
                isSpeaking ? 'scale-110 border-[#ffd97d]' : ''
              }`}
            ></span>

            {/* Center Sphere */}
            <div
              className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br transition-all duration-300 shadow-xl ${
                isSpeaking
                  ? 'from-[#e5c158] to-[#996515] shadow-[#e5c158]/40 scale-105'
                  : isConnected
                  ? 'from-[#996515] to-[#3a2810] shadow-[#996515]/30'
                  : 'from-[#2e261e] to-[#181410]'
              }`}
            >
              {isConnecting ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
              ) : isSpeaking ? (
                <Volume2 className="h-8 w-8 animate-bounce text-[#fff8e7]" />
              ) : (
                <Mic className="h-8 w-8 text-[#f5ede0]" />
              )}
            </div>
          </div>

          <p className="mt-4 font-georgian-sans text-xs font-medium text-[#d0c2b2]">
            {isConnecting
              ? 'მეფესთან კავშირი მყარდება...'
              : isSpeaking
              ? 'მეფე სოლომონი საუბრობს...'
              : isConnected
              ? isMuted
                ? 'მიკროფონი გათიშულია'
                : 'მეფე გისმენთ... ისაუბრეთ მშვიდად'
              : 'კავშირი არ არის დამყარებული'}
          </p>

          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-800/50 px-3 py-2 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            disabled={!isConnected}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
              isMuted
                ? 'border-red-500/60 bg-red-950/40 text-red-300'
                : 'border-[#4a3a28] bg-[#221c16] text-[#eae0d5] hover:bg-[#2e261e]'
            } disabled:opacity-40`}
            title={isMuted ? 'ჩართე მიკროფონი' : 'გათიშე მიკროფონი'}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#38281a] px-6 py-3 font-georgian-sans text-xs font-semibold text-[#ffd97d] transition hover:bg-[#4a3623] hover:text-white"
          >
            საუბრის დასრულება
          </button>
        </div>
      </div>
    </div>
  );
};
