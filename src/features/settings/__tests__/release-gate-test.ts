// Реліз-ворота (010, рішення 87): із STROIOVA_RELEASE=1 у content/about.json не лишається плейсхолдерів [N], [ФОНД], посилань.
import appJson from '../../../../app.json';
import rootPkg from '../../../../package.json';
import { aboutCfg, unresolvedPlaceholders } from '../data';

describe('плейсхолдери «Про гру»', () => {
  test('виявляє незаповнені поля у квадратних дужках і не чіпає заповнені', () => {
    expect(unresolvedPlaceholders({ schema: 1, percent: '10', fund: '[ФОНД]', email: 'a@b.ua', reports: [], privacyUrl: 'https://x.ua' })).toEqual(['fund']);
    expect(unresolvedPlaceholders({ percent: '10', fund: 'Назва фонду' })).toEqual([]);
  });

  test('поточний конфіг має щонайменше поля про фонд, відсоток і посилання', () => {
    for (const k of ['percent', 'fund', 'receiptsUrl', 'privacyUrl', 'email', 'illustrator', 'typewriterName']) expect(typeof (aboutCfg as unknown as Record<string, unknown>)[k]).toBe('string');
  });

  (process.env.STROIOVA_RELEASE === '1' ? test : test.skip)('реліз: content/about.json без плейсхолдерів', () => {
    expect(unresolvedPlaceholders()).toEqual([]);
  });
});

describe('AC-15: без відстеження (рішення 18)', () => {
  test('у залежностях немає expo-tracking-transparency, у app.json немає NSUserTrackingUsageDescription і user_tracking_usage_description', () => {
    const pkg = rootPkg as { dependencies: Record<string, string>; devDependencies?: Record<string, string> };
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain('expo-tracking-transparency');
    const app = JSON.stringify(appJson);
    expect(app).not.toContain('NSUserTrackingUsageDescription');
    expect(app).not.toContain('user_tracking_usage_description');
  });
});
