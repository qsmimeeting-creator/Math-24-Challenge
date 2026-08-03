/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  username: string;
  avatar: string;
  bestScore: number;
  bestTime: number;
  createdAt: number;
}

export interface ScoreEntry {
  id?: string;
  userId: string;
  username: string;
  score: number;
  time: number;
  mode: 'classic' | 'time' | 'untimed' | string;
  timestamp: number;
}

export interface GamePuzzle {
  numbers: number[];
  solutions: string[];
}

export interface Player {
  uid: string;
  username: string;
  score: number;
  isReady: boolean;
  isFinished: boolean;
  time?: number;
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentPuzzle: GamePuzzle | null;
  createdAt: number;
}
