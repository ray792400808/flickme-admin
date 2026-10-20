import type { Row } from '../types/content';
import { make } from '../domain/content';
export const dramaSeeds: Row[] = [
  make('D1001', 'The CEO’s Trap', '上架', ['Romance', 'CEO'], {
    episodes: 75,
    ready: 75,
    badge: 'HOT',
    views: '12.4M',
    description: 'A quiet merger turns into a war of secrets.',
  }),
  make('D1002', 'The Other Woman’s Secret', '上架', ['Drama', 'Thriller'], {
    episodes: 68,
    ready: 68,
    badge: 'NEW',
    views: '8.9M',
  }),
  make('D1003', 'Court of Vultures', '上架', ['Historical', 'Drama'], {
    episodes: 52,
    ready: 52,
    views: '6.1M',
  }),
  make('D1004', 'Rise from the Ashes', '上架', ['Revenge', 'Drama'], {
    episodes: 60,
    ready: 60,
    badge: 'HOT',
    views: '9.7M',
  }),
  make('D1005', 'Moonlit Sword', '上架', ['Historical', 'Fantasy'], {
    episodes: 48,
    ready: 48,
    views: '3.8M',
  }),
  make('D1006', 'Midnight Kiss with the Devil', '上架', ['Fantasy', 'Romance'], {
    episodes: 44,
    ready: 44,
    badge: 'EXCLUSIVE',
    views: '5.2M',
  }),
  make('D1007', 'The Lycan King’s Forbidden Mate', '上架', ['Werewolf', 'Fantasy'], {
    episodes: 56,
    ready: 56,
    badge: 'NEW',
    views: '4.6M',
  }),
  make('D1008', 'Forbidden Heir', '下架', ['Romance', 'Mystery'], {
    episodes: 40,
    ready: 40,
    free: 4,
    views: '2.2M',
  }),
  make('D1009', 'Sworn to the Mafia Boss', '上架', ['Mafia', 'Romance'], {
    episodes: 62,
    ready: 62,
    badge: 'HOT',
    views: '7.3M',
  }),
  make('D1010', 'Whispers in the Manor', '草稿', ['Mystery', 'Thriller'], {
    episodes: 36,
    ready: 3,
    views: '1.9M',
  }),
];
export const characterSeeds: Row[] = [
  make('C2001', 'Lucas', '上架', ['Romance', 'CEO'], {
    author: '@mintfox',
    chats: '268.7K',
    opening: 'Lucas leans on the doorframe, tie loosened. “Have dinner with me and tell me why.”',
    q1: 'Accept',
    q2: 'Tease him',
  }),
  make('C2002', 'Midnight Kiss with the Devil', '上架', ['Mafia', 'Fantasy'], {
    author: '@ember',
    chats: '88.6K',
    opening: 'The clock strikes twelve and the candles go out together.',
    q1: 'Make a wish',
    q2: 'Ask the price',
  }),
  make('C2003', 'The Lycan King’s Forbidden Mate', '上架', ['Werewolf', 'Fantasy'], {
    author: '@lotus',
    chats: '64.1K',
  }),
  make('C2004', 'Court of Vultures', '上架', ['Historical', 'Drama'], {
    author: '@prince',
    chats: '41.0K',
  }),
  make('C2005', 'Emma', '上架', ['Romance'], {
    chats: '152.3K',
    opening: 'Where were you last night? I waited.',
  }),
  make('C2006', 'Viktor', '待审核', ['Mafia', 'Revenge'], {
    author: '@nightowl',
    chats: '30.2K',
    opening: 'You are late. Sit.',
    q1: 'Sit',
    q2: 'Leave',
  }),
  make('C2007', 'Selene', '下架', ['Fantasy'], { chats: '12.8K' }),
  make('C2008', 'Rowan', '驳回', ['Romance'], { reason: '开场白含不适宜内容，需修改' }),
  make('C2009', 'Mira', '草稿', ['Mystery']),
];
