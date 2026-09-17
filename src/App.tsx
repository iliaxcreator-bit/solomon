import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ProverbPillars } from './components/ProverbPillars';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { DailyParableModal } from './components/DailyParableModal';
import { ChatMessage as ChatMessageType, ChatMode, AudioPlaybackState } from './types';
import { playPcmAudio, stopCurrentAudioPlayback } from './utils/audio';
import { Crown, Sparkles } from 'lucide-react';

const INITIAL_GREETING: ChatMessageType = {
  id: 'greeting',
  role: 'assistant',
  content: `მშვიდობა შენდა, ჩემო შვილო.

რა საწუხარი ან კითხვა აფორიაქებს შენს გულს დღეს? გახსოვდეს: უფლის შიში ცოდნის სათავეა, ხოლო საკუთარი პირისა და ენის დამცველი თავს ყოველგვარი განსაცდელისგან იცავს.

მითხარი, რა გაქვს საფიქრალი, და ერთად ჩავუღრმავდეთ მას მარადიული სიბრძნის შუქზე.`,
  timestamp: new Date().toISOString(),
  modelUsed: 'gemini-3.5-flash',
};

export default function App() {
  const [messages, setMessages] = useState<ChatMessageType[]>([INITIAL_GREETING]);
  const [mode, setMode] = useState<ChatMode>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [audioState, setAudioState] = useState<AudioPlaybackState>({
    isPlaying: false,
    messageId: null,
    isLoading: false,
  });
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isDailyParableOpen, setIsDailyParableOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Audio Playback Handling
  const handlePlayAudio = async (msg: ChatMessageType) => {
    if (audioState.isPlaying && audioState.messageId === msg.id) {
      stopCurrentAudioPlayback();
      setAudioState({ isPlaying: false, messageId: null, isLoading: false });
      return;
    }

    stopCurrentAudioPlayback();

    // If audio is already cached on the message
    if (msg.audioBase64) {
      setAudioState({ isPlaying: true, messageId: msg.id, isLoading: false });
      await playPcmAudio(msg.audioBase64, 24000, () => {
        setAudioState({ isPlaying: false, messageId: null, isLoading: false });
      });
      return;
    }

    // Otherwise fetch TTS from server
    setAudioState({ isPlaying: false, messageId: msg.id, isLoading: true });
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content }),
      });

      if (!res.ok) {
        throw new Error('TTS მოთხოვნა ვერ შესრულდა');
      }

      const data = await res.json();
      if (data.audioBase64) {
        // Cache audio on message
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, audioBase64: data.audioBase64 } : m))
        );

        setAudioState({ isPlaying: true, messageId: msg.id, isLoading: false });
        await playPcmAudio(data.audioBase64, 24000, () => {
          setAudioState({ isPlaying: false, messageId: null, isLoading: false });
        });
      }
    } catch (err: any) {
      console.error('Audio playback error:', err);
      alert('ხმის დაკვრა ვერ მოხერხდა.');
      setAudioState({ isPlaying: false, messageId: null, isLoading: false });
    }
  };

  const handleStopAudio = () => {
    stopCurrentAudioPlayback();
    setAudioState({ isPlaying: false, messageId: null, isLoading: false });
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: mode === 'deep' ? 'gemini-3.1-pro-preview' : mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      // Stream response using SSE
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          mode,
        }),
      });

      if (!res.ok || !res.body) {
        // Fallback to non-streaming endpoint if streaming fails
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            mode,
          }),
        });
        const fallbackData = await fallbackRes.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: fallbackData.text || '',
                  modelUsed: fallbackData.modelUsed,
                  isStreaming: false,
                }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                  )
                );
              }
            } catch (e) {
              // ignore parse errors on partial chunks
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: 'შვილობილო, შეცდომა მოხდა. გთხოვ, სცადო ხელახლა.',
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    stopCurrentAudioPlayback();
    setMessages([INITIAL_GREETING]);
  };

  const handleToggleDeepThinking = () => {
    setMode((prev) => (prev === 'deep' ? 'general' : 'deep'));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0e0d] text-[#eae0d5]">
      {/* Top Header */}
      <Header
        mode={mode}
        onModeChange={setMode}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenDailyParable={() => setIsDailyParableOpen(true)}
        onClearChat={handleClearChat}
        hasMessages={messages.length > 1}
      />

      {/* Main Conversation Container */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Welcome Banner / Solomon Seal */}
          <div className="flex flex-col items-center justify-center pt-2 pb-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1a14] border border-[#d4af37]/30 shadow-md shadow-[#b8860b]/10 mb-2">
              <Crown className="h-6 w-6 text-[#d4af37]" />
            </div>
            <p className="font-cinzel text-xs tracking-widest text-[#d4af37] uppercase">
              იგავნი და ეკლესიასტე
            </p>
            <p className="mt-0.5 font-georgian-serif text-xs text-[#8c7e72]">
              „შეინახე გული ყოველ შესანახავზე მეტად, რადგან მასშია სიცოცხლის წყარო.“
            </p>
          </div>

          {/* Chat Messages */}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              audioState={audioState}
              onPlayAudio={handlePlayAudio}
              onStopAudio={handleStopAudio}
            />
          ))}

          {/* Proverb Pillars (shown when user has not exchanged many messages yet) */}
          {messages.length <= 2 && (
            <div className="pt-4 border-t border-[#262019]">
              <ProverbPillars onSelectPrompt={handleSendMessage} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Sticky Input Bar */}
      <footer className="sticky bottom-0 z-20">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isDeepThinking={mode === 'deep'}
          onToggleDeepThinking={handleToggleDeepThinking}
        />
      </footer>

      {/* Gemini 3.8 Live Voice Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      {/* Daily Parable & Reflection Modal */}
      <DailyParableModal
        isOpen={isDailyParableOpen}
        onClose={() => setIsDailyParableOpen(false)}
        onContinueChatWithTopic={handleSendMessage}
      />
    </div>
  );
}
