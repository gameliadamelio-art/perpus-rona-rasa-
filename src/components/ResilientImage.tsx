import { useState } from 'react';
import { BookOpen, Film, Music, Feather } from 'lucide-react';
import type { CollectionType } from '../types';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  type?: CollectionType;
}

export function ResilientImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
  type = 'book',
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  const Icon =
    type === 'poem'
      ? Feather
      : type === 'film'
      ? Film
      : type === 'album'
      ? Music
      : BookOpen;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#E8F0E3] via-[#F3F7EF] to-[#DCE8D5] text-[#405344] ${className}`}
      >
        <Icon className="w-8 h-8 mb-3 opacity-60" aria-hidden="true" />
        {fallbackTitle && (
          <span className="font-serif-display text-sm font-medium leading-snug line-clamp-3 max-w-[14ch]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
