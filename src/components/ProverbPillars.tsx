import React from 'react';
import { Crown, Shield, MessageSquareQuote, Compass, Flame, ArrowRight } from 'lucide-react';
import { SOLOMON_PILLARS } from '../data/solomonPillars';
import { ProverbPillar } from '../types';

interface ProverbPillarsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const ProverbPillars: React.FC<ProverbPillarsProps> = ({ onSelectPrompt }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crown':
        return <Crown className="h-5 w-5 text-[#d4af37]" />;
      case 'Shield':
        return <Shield className="h-5 w-5 text-[#d4af37]" />;
      case 'MessageSquareQuote':
        return <MessageSquareQuote className="h-5 w-5 text-[#d4af37]" />;
      case 'Compass':
        return <Compass className="h-5 w-5 text-[#d4af37]" />;
      case 'Flame':
        return <Flame className="h-5 w-5 text-[#d4af37]" />;
      default:
        return <Crown className="h-5 w-5 text-[#d4af37]" />;
    }
  };

  return (
    <div className="w-full py-6">
      <div className="text-center mb-6">
        <h2 className="font-cinzel text-xl font-bold tracking-wider text-[#d4af37]">
          სიბრძნის ხუთი საყრდენი
        </h2>
        <p className="mt-1 font-georgian-serif text-xs text-[#a39686] max-w-md mx-auto">
          აირჩიე სულიერი დარიგების თემა ან შეკითხვა მეფე სოლომონთან საუბრის დასაწყებად
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-4xl mx-auto">
        {SOLOMON_PILLARS.map((pillar: ProverbPillar) => (
          <div
            key={pillar.id}
            id={`pillar-${pillar.id}`}
            onClick={() => onSelectPrompt(pillar.samplePrompt)}
            className="group cursor-pointer rounded-xl border border-[#382f25] bg-[#171512] p-4 transition-all hover:border-[#b8860b]/60 hover:bg-[#1e1a14] hover:shadow-lg hover:shadow-[#996515]/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="rounded-lg bg-[#241f18] p-2 border border-[#3e3428] group-hover:border-[#b8860b]/40">
                  {getIcon(pillar.iconName)}
                </div>
                <h3 className="font-cinzel text-sm font-semibold text-[#f5ede0] group-hover:text-[#ffd97d] transition-colors">
                  {pillar.title}
                </h3>
              </div>

              <blockquote className="font-georgian-serif text-xs italic text-[#d0c2b2] border-l-2 border-[#b8860b]/40 pl-2.5 my-2">
                {pillar.georgianVerse}
              </blockquote>

              <p className="font-georgian-sans text-xs text-[#8c7f73] line-clamp-2 mt-2">
                {pillar.description}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[#b8860b] pt-2 border-t border-[#262019] group-hover:text-[#ffd97d]">
              <span className="font-georgian-sans text-[11px]">დარიგების მიღება</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
