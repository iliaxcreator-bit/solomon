import React, { useState } from 'react';
import { Crown, Volume2, VolumeX, Copy, Check, Loader2, Sparkles, User } from 'lucide-react';
import { ChatMessage as ChatMessageType, AudioPlaybackState } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  audioState: AudioPlaybackState;
  onPlayAudio: (message: ChatMessageType) => void;
  onStopAudio: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  audioState,
  onPlayAudio,
  onStopAudio,
}) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';
  const isThisAudioPlaying = audioState.isPlaying && audioState.messageId === message.id;
  const isThisAudioLoading = audioState.isLoading && audioState.messageId === message.id;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex w-full gap-3 transition-opacity ${
        isAssistant ? 'justify-start' : 'justify-end'
      }`}
    >
      {/* Solomon Avatar */}
      {isAssistant && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#b8860b] to-[#4a3614] shadow-sm shadow-[#996515]/30 ring-1 ring-[#e5c158]/40">
          <Crown className="h-4 w-4 text-[#fff8e7]" />
        </div>
      )}

      {/* Message Container */}
      <div
        className={`relative max-w-2xl rounded-2xl p-4 sm:p-5 ${
          isAssistant
            ? 'border border-[#382f25] bg-gradient-to-b from-[#181613] to-[#12110f] text-[#f2ebe1] shadow-lg shadow-black/40'
            : 'border border-[#44382c] bg-[#241f19] text-[#f5ede0]'
        }`}
      >
        {/* Header inside assistant message */}
        {isAssistant && (
          <div className="mb-2.5 flex items-center justify-between border-b border-[#2d251d] pb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-semibold tracking-wider text-[#d4af37]">
                მეფე სოლომონი
              </span>
              {message.modelUsed && (
                <span className="inline-flex items-center gap-1 rounded bg-[#28221a] px-2 py-0.5 text-[10px] text-[#bcaaa4] border border-[#3e3428]">
                  <Sparkles className="h-2.5 w-2.5 text-[#d4af37]" />
                  {message.modelUsed.includes('pro')
                    ? 'Gemini 3.1 Pro (ღრმა განსჯა)'
                    : message.modelUsed.includes('lite')
                    ? 'Gemini Flash-Lite'
                    : 'Gemini 3.5 Flash'}
                </span>
              )}
            </div>

            <span className="text-[11px] text-[#8c7e72]">
              {new Date(message.timestamp).toLocaleTimeString('ka-GE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Message Content */}
        <div className="font-georgian-serif text-[15px] leading-relaxed tracking-wide sm:text-[16px] whitespace-pre-wrap selection:bg-[#b8860b]/40">
          {message.content}
          {message.isStreaming && (
            <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-[#d4af37]" />
          )}
        </div>

        {/* Assistant Footer Controls: Audio TTS & Copy */}
        {isAssistant && !message.isStreaming && (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#2d251d] pt-2.5">
            <div className="flex items-center gap-2">
              {/* TTS Listen button */}
              {isThisAudioPlaying ? (
                <button
                  type="button"
                  onClick={onStopAudio}
                  className="flex items-center gap-1.5 rounded-md bg-[#38281a] px-2.5 py-1 text-xs font-medium text-[#ffd97d] transition hover:bg-[#483321]"
                  title="შეაჩერე ხმა"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>შეჩერება</span>
                  <span className="flex items-center gap-0.5 ml-1">
                    <span className="h-2 w-0.5 animate-bounce bg-[#d4af37]"></span>
                    <span className="h-3 w-0.5 animate-bounce [animation-delay:0.15s] bg-[#d4af37]"></span>
                    <span className="h-2 w-0.5 animate-bounce [animation-delay:0.3s] bg-[#d4af37]"></span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onPlayAudio(message)}
                  disabled={isThisAudioLoading}
                  className="flex items-center gap-1.5 rounded-md bg-[#221c15] px-2.5 py-1 text-xs font-medium text-[#eae0d5] border border-[#3e3428] transition hover:border-[#b8860b]/50 hover:bg-[#2b241c] hover:text-[#fff8e7] disabled:opacity-50"
                  title="მოისმინე დარიგება (Gemini TTS)"
                >
                  {isThisAudioLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d4af37]" />
                      <span>მზადდება...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>მოისმინე დარიგება</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-[#8c7e72]">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded p-1 text-[#9e9082] hover:bg-[#221c15] hover:text-[#eae0d5] transition"
                title="დააკოპირე პასუხი"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* User message header / time */}
        {!isAssistant && (
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-[#9c8e80]">
            <span>
              {new Date(message.timestamp).toLocaleTimeString('ka-GE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <User className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
};
