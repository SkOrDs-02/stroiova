// Дані «Про гру» і ліцензій (010 FR-27, FR-29): content/about.json, content/licenses.json, production-залежності з package.json.
import Constants from 'expo-constants';

import about from '../../../content/about.json';
import licenses from '../../../content/licenses.json';
import pkg from '../../../package.json';

export interface FundReport {
  no: number;
  month: string;
  sumUah: number;
  transferDate: string;
  receiptUrl: string;
}

export const aboutCfg = about as unknown as Omit<typeof about, 'reports'> & { reports: FundReport[] };

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
const build = Constants.expoConfig?.ios?.buildNumber ?? (Constants.expoConfig?.android?.versionCode != null ? String(Constants.expoConfig.android.versionCode) : null);
export const versionLine = (v = APP_VERSION, b = build) => (b ? `${v} (${b})` : v);

/** Підставити назву машинописного шрифту з конфігу. */
export const fontRows = () => licenses.fonts.map((f) => ({ name: f.name === '{typewriter}' ? aboutCfg.typewriterName : f.name, copyright: f.copyright }));
export const oflText: readonly string[] = licenses.ofl;

/** Бібліотеки = production-залежності збірки; ліцензія з реєстру `content/licenses.json` (AC-19). */
export const libraryRows = () =>
  Object.keys(pkg.dependencies)
    .sort()
    .map((name) => ({ name, version: (pkg.dependencies as Record<string, string>)[name]!.replace(/^[~^]/, ''), license: (licenses.libraries as Record<string, string>)[name] ?? '' }));

/** Усі поля про фонд заповнено - реліз-ворота (рішення 87). */
export const unresolvedPlaceholders = (cfg: Record<string, unknown> = aboutCfg): string[] =>
  Object.entries(cfg)
    .filter(([k, v]) => k !== 'schema' && k !== 'reports' && typeof v === 'string' && /\[[^\]]*\]/.test(v))
    .map(([k]) => k);
