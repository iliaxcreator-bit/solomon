import React from 'react';
import { Crown, Sparkles, Mic, BookOpen, RefreshCw } from 'lucide-react';
import { ChatMode } from '../types';

interface HeaderProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onOpenLiveVoice: () => void;
  onOpenDailyParable: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  onOpenLiveVoice,
  onOpenDailyParable,
  onClearChat,
  hasMessages,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#382f25] bg-[#141210]/90 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] via-[#996515] to-[#4a3614] shadow-md shadow-[#996515]/20 ring-1 ring-[#e5c158]/50">
            <Crown className="h-5 w-5 text-[#fff8e7]" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4af37] opacity-60"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#d4af37]"></span>
            </span>
          </div>

          <div>
            <h1 className="font-cinzel text-lg font-bold tracking-wide text-[#f5ede0] sm:text-xl">
              მეფე სოლომონი
            </h1>
            <p className="font-georgian-sans text-xs text-[#b8a898]">
              იგავთა და ეკლესიასტეს მარადიული სიბრძნე
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="hidden sm:flex items-center rounded-lg bg-[#1e1b17] p-1 border border-[#382f25]">
            <button
              id="mode-deep-btn"
              type="button"
              onClick={() => onModeChange('deep')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                mode === 'deep'
                  ? 'bg-gradient-to-r from-[#996515] to-[#b8860b] text-[#fff8e7] shadow-sm'
                  : 'text-[#a39686] hover:text-[#eae0d5]'
              }`}
              title="გამოიყენებს Gemini 3.1 Pro-ს მაღალი განსჯის რეჟიმით"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ღრმა განსჯა</span>
            </button>
            <button
              id="mode-general-btn"
              type="button"
              onClick={() => onModeChange('general')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                mode === 'general'
                  ? 'bg-[#382f25] text-[#f5ede0]'
                  : 'text-[#a39686] hover:text-[#eae0d5]'
              }`}
            >
              საერთო
            </button>
            <button
              id="mode-fast-btn"
              type="button"
              onClick={() => onModeChange('fast')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                mode === 'fast'
                  ? 'bg-[#382f25] text-[#f5ede0]'
                  : 'text-[#a39686] hover:text-[#eae0d5]'
              }`}
            >
              სწრაფი
            </button>
          </div>

          {/* Daily Parable Button */}
          <button
            id="daily-parable-btn"
            type="button"
            onClick={onOpenDailyParable}
            className="flex items-center gap-1.5 rounded-lg border border-[#382f25] bg-[#1e1b17] px-3 py-1.5 text-xs font-medium text-[#eae0d5] transition hover:border-[#b8860b]/50 hover:bg-[#28241e]"
            title="დღის იგავი და განსჯა"
          >
            <BookOpen className="h-4 w-4 text-[#d4af37]" />
            <span className="hidden md:inline">დღის იგავი</span>
          </button>

          {/* Live Voice Dialogue Button */}
          <button
            id="live-voice-btn"
            type="button"
            onClick={onOpenLiveVoice}
            className="flex items-center gap-1.5 rounded-lg border border-[#b8860b]/40 bg-gradient-to-r from-[#2a2217] to-[#1c1813] px-3 py-1.5 text-xs font-medium text-[#ffd97d] transition hover:border-[#d4af37] hover:shadow-md hover:shadow-[#b8860b]/20"
            title="ცოცხალი ხმოვანი საუბარი Gemini 3.8 Live-ით"
          >
            <Mic className="h-4 w-4 text-[#d4af37] animate-pulse" />
            <span className="font-medium">ცოცხალი ხმა</span>
          </button>

          {/* Clear chat */}
          {hasMessages && (
            <button
              id="clear-chat-btn"
              type="button"
              onClick={onClearChat}
              className="rounded-lg p-2 text-[#8c7f73] hover:bg-[#1e1b17] hover:text-[#eae0d5] transition"
              title="საუბრის გასუფთავება"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
