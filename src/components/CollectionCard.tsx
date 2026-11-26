import type { CollectionItem } from '../types';
import { ResilientImage } from './ResilientImage';

interface CollectionCardProps {
  item: CollectionItem;
  onSelect: (id: number) => void;
  actionLabel?: string;
}

const TYPE_LABELS: Record<CollectionItem['type'], string> = {
  book: 'Buku Sastra',
  poem: 'Puisi',
  film: 'Sastra Film',
  album: 'Musik',
};

export function CollectionCard({ item, onSelect, actionLabel }: CollectionCardProps) {
  const isSquare = item.type === 'album';
  const defaultAction =
    item.type === 'book' || item.type === 'poem'
      ? 'Baca Sekarang'
      : item.type === 'film'
      ? 'Lihat Arsip Film'
      : 'Dengarkan Album';

  return (
    <article className="group flex flex-col bg-[#F3F7EF] border border-[#405344]/15 rounded-xl overflow-hidden transition-colors duration-200 hover:border-[#405344]/35">
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="text-left flex flex-col flex-1 focus-visible:outline-none"
        aria-label={`Buka detail ${item.title} oleh ${item.creator}`}
      >
        <div
          className={`w-full overflow-hidden bg-[#E8F0E3] border-b border-[#405344]/10 ${
            isSquare ? 'aspect-square' : 'aspect-[3/4]'
          }`}
        >
          <ResilientImage
            src={item.coverUrl}
            alt={`Sampul ${item.title} karya ${item.creator}`}
            fallbackTitle={item.title}
            type={item.type}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>

        <div className="p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            <p className="text-xs text-[#556358] tracking-wide mb-1.5">
              <span>{item.subCategory || TYPE_LABELS[item.type]}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span className="tabular-nums">{item.year}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{item.genre}</span>
            </p>
            <h3 className="font-serif-display text-lg font-semibold text-[#222B24] leading-snug group-hover:text-[#405344] transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-[#556358] mt-1">{item.creator}</p>
            <p className="text-xs text-[#556358]/90 mt-2.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          <div className="pt-3 border-t border-[#405344]/10 flex items-center justify-between text-xs font-medium text-[#405344]">
            <span>{actionLabel || defaultAction}</span>
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
