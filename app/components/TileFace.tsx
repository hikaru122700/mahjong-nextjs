'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TILE_DISPLAY, type Tile } from '@/lib/mahjong';
import { tileToImagePath } from '@/lib/tileAssets';

type TileFaceProps = {
  tile: Tile;
  className?: string;
};

const TileFace = ({ tile, className }: TileFaceProps) => {
  const [imageError, setImageError] = useState(false);
  const label = TILE_DISPLAY[tile];

  if (imageError) {
    return <span className={`tile-text ${className ?? ''}`.trim()}>{label}</span>;
  }

  return (
    <Image
      src={tileToImagePath(tile)}
      alt={label}
      width={48}
      height={64}
      className={`tile-image ${className ?? ''}`.trim()}
      onError={() => setImageError(true)}
      draggable={false}
    />
  );
};

export default TileFace;
