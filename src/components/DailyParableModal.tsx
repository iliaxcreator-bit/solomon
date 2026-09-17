import React, { useState, useEffect } from 'react';
import { BookOpen, X, RefreshCw, Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react';
import { playPcmAudio, stopCurrentAudioPlayback } from '../utils/audio';

interface DailyParableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueChatWithTopic: (topicText: string) => void;
}

export const DailyParableModal: React.FC<DailyParableModalProps> = ({
  isOpen,
  onClose,
  onContinueChatWithTopic,
}) => {
  const [reflection, setReflection] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('გულის შენახვა');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const topics = [
    'გულის შენახვა',
    'ენის თავშეკავება',
    'სიმდაბლე და სიამაყე',
    'შრომა და ჭიანჭველა',
    'ამაოებათა ამაოება',
    'მეგობრობა და ერთგულება',
  ];

  const fetchParable = async (topic = selectedTopic) => {
    stopAudio();
    setIsLoading(true);
    try {
      const res = await fetch('/api/wisdom/parable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error('ვერ ჩაიტვირთა იგავი');
      const data = await res.json();
      setReflection(data.text);
    } catch (e: any) {
      console.error(e);
      setReflection('„შეინახე გული ყოველ შესანახავზე მეტად, რადგან მასშია სიცოცხლის წყარო.“');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !reflection) {
      fetchParable(selectedTopic);
    }
  }, [isOpen]);

  const stopAudio = () => {
    stopCurrentAudioPlayback();
    setIsPlayingAudio(false);
  };

  const playTTS = async () => {
    if (!reflection) return;
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    setIsLoadingAudio(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reflection }),
      });
      if (!res.ok) throw new Error('ხმის გენერირება ვერ მოხერხდა');
      const data = await res.json();
      if (data.audioBase64) {
        setIsPlayingAudio(true);
        await playPcmAudio(data.audioBase64, 24000, () => {
          setIsPlayingAudio(false);
        });
      }
    } catch (e) {
      console.error('TTS error:', e);
      alert('ხმის დაკვრა ვერ მოხერხდა.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl rounded-3xl border border-[#4a3a28] bg-gradient-to-b from-[#1c1813] to-[#100e0b] p-6 sm:p-8 text-[#f5ede0] shadow-2xl shadow-black/80">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopAudio();
            onClose();
          }}
          className="absolute right-4 top-4 rounded-full p-2 text-[#8c7f73] hover:bg-[#28221a] hover:text-[#eae0d5] transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] via-[#996515] to-[#4a3614]">
            <BookOpen className="h-5 w-5 text-[#fff8e7]" />
          </div>
          <div>
            <h3 className="font-cinzel text-lg font-bold text-[#f5ede0]">
              დღის იგავი და განსჯა
            </h3>
            <p className="font-georgian-sans text-xs text-[#a39686]">
              მეფე სოლომონის სიტყვა შენი სულის სიმშვიდისთვის
            </p>
          </div>
        </div>

        {/* Topics Chips */}
        <div className="my-3 flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedTopic(t);
                fetchParable(t);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedTopic === t
                  ? 'bg-[#b8860b] text-[#121110] font-semibold'
                  : 'bg-[#221c15] text-[#b8a898] border border-[#3e3428] hover:border-[#b8860b]/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Reflection Card */}
        <div className="my-5 min-h-[140px] rounded-2xl border border-[#3a3024] bg-[#161310] p-5 shadow-inner flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6 text-[#a39686]">
              <Loader2 className="h-7 w-7 animate-spin text-[#d4af37] mb-2" />
              <p className="font-georgian-sans text-xs">სოლომონის სიბრძნე იკრიბება...</p>
            </div>
          ) : (
            <p className="font-georgian-serif text-base sm:text-lg leading-relaxed text-[#f7efe4] whitespace-pre-wrap">
              {reflection}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playTTS}
              disabled={isLoading || isLoadingAudio || !reflection}
              className="flex items-center gap-1.5 rounded-lg border border-[#3e3428] bg-[#221c15] px-3.5 py-2 text-xs font-medium text-[#eae0d5] hover:border-[#b8860b]/50 hover:bg-[#2b241c] transition disabled:opacity-40"
            >
              {isLoadingAudio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                  <span>მზადდება...</span>
                </>
              ) : isPlayingAudio ? (
                <>
                  <VolumeX className="h-4 w-4 text-[#ffd97d]" />
                  <span>შეჩერება</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 text-[#d4af37]" />
                  <span>მოსმენა (TTS)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => fetchParable()}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#3e3428] bg-[#221c15] px-3.5 py-2 text-xs font-medium text-[#eae0d5] hover:bg-[#2b241c] transition disabled:opacity-40"
              title="სხვა იგავი"
            >
              <RefreshCw className={`h-4 w-4 text-[#d4af37] ${isLoading ? 'animate-spin' : ''}`} />
              <span>განახლება</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose();
              onContinueChatWithTopic(
                `მეფეო სოლომონ, ვისაუბროთ ამ დარიგებაზე: „${reflection}“`
              );
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#996515] to-[#b8860b] px-4 py-2 text-xs font-semibold text-[#fff8e7] shadow-sm hover:from-[#b8860b] hover:to-[#d4af37] transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>ჩაღრმავება საუბარში</span>
          </button>
        </div>
      </div>
    </div>
  );
};
