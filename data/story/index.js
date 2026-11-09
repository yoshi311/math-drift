// ストーリー（学年ごと）をまとめる
import * as g1 from './g1.js';
import * as g2 from './g2.js';

export const CHARS = { ...g1.CHARS, ...g2.CHARS };
export const SCENES = { ...g1.SCENES, ...g2.SCENES };
