// Сопоставление игровых семян (backend seed_type) с глиняными иллюстрациями
// овощей из дизайн-системы оГород, плюс палитра редкости.
import type { CSSProperties } from 'react';

import type { Rarity } from '../types';

// Каждому типу семени из каталога бэкенда подобрана ближайшая по виду/цвету
// глиняная иллюстрация из assets/seeds. Фолбэк — морковь.
const SEED_IMAGE: Record<string, string> = {
  wheat: 'seed-corn.png', // злак → кукуруза
  potato: 'seed-potato.png',
  tomato: 'seed-tomato.png',
  cucumber: 'seed-cucumber.png',
  strawberry: 'seed-radish.png', // красная круглая ягода → редис
  apple: 'seed-bell-pepper-green.png', // антоновка (зелёное яблоко)
  grape: 'seed-eggplant.png', // фиолетовый
  white_night_lily: 'seed-garlic.png', // белая → чеснок
};

export function seedImage(seedType: string): string {
  return `/assets/seeds/${SEED_IMAGE[seedType] ?? 'seed-carrot.png'}`;
}

// Цвета редкости — реальные hex (нужны Leaflet/Recharts, где CSS-переменные не работают).
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#A89684', // soil-400
  uncommon: '#3E9B4F', // green-500
  rare: '#6FBEDD', // sky-500
  epic: '#9B6FD6',
  legendary: '#F7931E', // carrot-500
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Обычное',
  uncommon: 'Необычное',
  rare: 'Редкое',
  epic: 'Эпическое',
  legendary: 'Легендарное',
};

// Кладёт цвет редкости в CSS-переменную --rarity (для рамки .seed-thumb).
export function rarityStyle(rarity: Rarity): CSSProperties {
  return { '--rarity': RARITY_COLOR[rarity] } as CSSProperties;
}
