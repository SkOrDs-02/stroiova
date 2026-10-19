// Ядро економіки: спільне для гри й симулятора (balance/economy.js, принцип II).
export * from './big';
export * from './types';
export { DEFAULTS, SCENARIOS, LEGACY, copyInto, withDefaults, reachableLevels, levelItems } from './defaults';
export { capAt, priceAt, packPrice, milestoneTarget, prestigeMult, points, zpzShare } from './formulas';
export { flow } from './flow';
export type { FlowStream, FlowStage, FlowResult } from './flow';
export { integrate } from './integrate';
