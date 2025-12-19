import type { Tile } from './mahjong';

const HONOR_FILE_MAP: Record<string, string> = {
  '東': 'ton',
  '南': 'nan',
  '西': 'sha',
  '北': 'pei',
  '白': 'haku',
  '發': 'hatsu',
  '中': 'chun'
};

export const TILE_IMAGE_BASE_PATH = '/tiles/ac-ibitsu';

export const tileToImagePath = (tile: Tile): string => {
  const fileKey = HONOR_FILE_MAP[tile] ?? tile;
  return `${TILE_IMAGE_BASE_PATH}/${fileKey}.png`;
};
