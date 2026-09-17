import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Loader2, Sparkles } from 'lucide-react';
import { AudioRecorder } from '../utils/audio';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isDeepThinking: boolean;
  onToggleDeepThinking: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  isDeepThinking,
  onToggleDeepThinking,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading || isTranscribing) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Microphone recording & Transcription
  const startRecording = async () => {
    try {
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('მიკროფონთან წვდომა ვერ მოხერხდა. გთხოვთ, შეამოწმოთ ბრაუზერის ნებართვა.');
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recorderRef.current) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const { base64, mimeType } = await recorderRef.current.stop();
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'ტრანსკრიბირება ვერ მოხერხდა');
      }

      const data = await res.json();
      if (data.text) {
        setText((prev) => (prev ? `${prev} ${data.text}` : data.text));
      }
    } catch (err: any) {
      console.error('Audio transcription error:', err);
      alert(`ხმის ტექსტად გარდაქმნა ვერ მოხერხდა: ${err.message || ''}`);
    } finally {
      setIsTranscribing(false);
      setRecordingSeconds(0);
      recorderRef.current = null;
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) {
      try {
        await recorderRef.current.stop();
      } catch (e) {
        // ignore
      }
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="border-t border-[#2d251d] bg-[#141210]/95 px-4 py-3 sm:px-6 backdrop-blur-md">
      <div className="mx-auto max-w-4xl">
        {/* Controls row above input */}
        <div className="mb-2 flex items-center justify-between text-xs text-[#a39686]">
          {/* Deep thinking toggle */}
          <button
            type="button"
            onClick={onToggleDeepThinking}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all border ${
              isDeepThinking
                ? 'border-[#b8860b] bg-[#2a2215] text-[#ffd97d] shadow-sm shadow-[#996515]/30 font-medium'
                : 'border-[#382f25] bg-[#1b1814] text-[#8c7e72] hover:text-[#eae0d5]'
            }`}
            title="ჩართე მაღალი განსჯის რეჟიმი (Gemini 3.1 Pro High Thinking)"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isDeepThinking ? 'text-[#ffd97d]' : ''}`} />
            <span>ღრმა განსჯა {isDeepThinking ? '(ჩართულია)' : '(გამორთულია)'}</span>
          </button>

          <span className="hidden sm:inline text-[11px] text-[#73675c]">
            Enter — გაგზავნა | Shift+Enter — ახალი ხაზი
          </span>
        </div>

        {/* Input box */}
        <div className="relative flex items-end gap-2 rounded-xl border border-[#3e3428] bg-[#1a1713] p-2 focus-within:border-[#b8860b] focus-within:ring-1 focus-within:ring-[#b8860b]/40 transition-all shadow-inner">
          {/* Recording indicator overlay */}
          {isRecording ? (
            <div className="flex flex-1 items-center justify-between px-3 py-2 text-sm text-[#f5ede0]">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                </span>
                <span className="font-medium text-[#ffd97d]">
                  მიმდინარეობს ჩაწერა... ({recordingSeconds}წმ)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="rounded px-2 py-1 text-xs text-[#a39686] hover:bg-[#28221a] hover:text-[#eae0d5]"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAndTranscribe}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 transition"
                >
                  <Square className="h-3 w-3 fill-current" />
                  <span>დასრულება & ტრანსკრიფცია</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="გაუზიარე მეფეს შენი გულის საწუხარი, კითხვა ან ყოველდღიური ბრძოლა..."
                rows={1}
                disabled={isLoading || isTranscribing}
                className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 font-georgian-sans text-sm text-[#eae0d5] placeholder-[#6e6357] focus:outline-none disabled:opacity-50"
              />

              {/* Action buttons inside the right side */}
              <div className="flex items-center gap-1 pb-1">
                {/* Microphone Transcribe Button */}
                <button
                  id="mic-transcribe-btn"
                  type="button"
                  onClick={startRecording}
                  disabled={isLoading || isTranscribing}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b8a898] hover:bg-[#28221a] hover:text-[#ffd97d] transition disabled:opacity-40"
                  title="ჩაწერე ხმა (Gemini 3.5 Transcribe)"
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                {/* Send Button */}
                <button
                  id="send-message-btn"
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!text.trim() || isLoading || isTranscribing}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#996515] to-[#b8860b] text-[#fff8e7] shadow-sm transition hover:from-[#b8860b] hover:to-[#d4af37] disabled:opacity-40 disabled:cursor-not-allowed"
                  title="გაგზავნა"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
