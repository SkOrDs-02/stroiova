// 011 AC-11, AC-12, AC-15 на екрані: рядок пачки в «Нових», tg-pack, зведена відповідь, tg-result, один запис курйозів.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { T0 } from '@/economy/test-fixtures';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';
import { packDef } from '@/telegrams/content';
import { tgWith } from '@/telegrams/test-utils';
import type { InboxItem } from '@/telegrams/types';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const has = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

function storeWithPack(packId: string, paper = 30) {
  const store = createConveyorStore(T0, bundledConfig);
  const d = packDef(packId)!;
  const inbox: InboxItem[] = d.telegrams.map((id, i) => ({ uid: `${id}#${i + 1}`, id, kind: 'telegram', receivedAt: T0, status: 'new', pack: { id: packId, no: 1, index: i + 1 } }));
  const tg = { ...tgWith([]), inbox, deliveries: 3, firstInspectionPassed: true, packs: { day: '2025-10-09', seq: 1 } };
  store.setState({ onboarding: onboardingDone(), telegrams: tg, state: { ...store.getState().state, level: 3, paper, prestigePoints: 5 } });
  return store;
}

async function openPack(store: ReturnType<typeof storeWithPack>) {
  await render(<MainScreen store={store} />);
  await fireEvent.press(screen.getByTestId('tab-telegrams'));
  await fireEvent.press(screen.getByTestId('tg-pack-1'));
}

describe('пачка Р3 на екрані', () => {
  test('AC-11: у «Нових» один рядок «Зведення № 1 · 0 з 3», бейдж вкладки = 1', async () => {
    const store = storeWithPack('pack_01');
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('tab-telegrams-badge')).toHaveTextContent('1');
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    expect(screen.getByTestId('tg-pack-1')).toHaveTextContent(has('Зведення № 1 · 0 з 3 відповідей'));
    expect(screen.queryAllByTestId(/^tg-row-/)).toHaveLength(0);
  });

  test('tg-pack: обкладинка, три картки, прогноз «Зведено» поруч з «Окремо», перехід до телеграми й назад', async () => {
    const store = storeWithPack('pack_01');
    await openPack(store);
    expect(screen.getByTestId('pk-cover')).toHaveTextContent(has('Зведення № 1 · 0 з 3'));
    expect(screen.getByTestId('pk-card-1')).toHaveTextContent(has('нова'));
    expect(screen.getByTestId('pk-merged-diligent')).toHaveTextContent(has('Зведено:'));
    expect(screen.getByTestId('pk-sep-diligent')).toHaveTextContent(has('Окремо:'));
    await fireEvent.press(screen.getByTestId('pk-card-2'));
    expect(screen.getByTestId('tg-detail')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tg-back'));
    expect(screen.getByTestId('tg-pack')).toBeTruthy();
  });

  test('AC-12: вид без варіанта в одній телеграмі неактивний з «Не в усіх телеграмах пачки є такий варіант»', async () => {
    const store = storeWithPack('pack_05');
    await openPack(store);
    expect(screen.getByTestId('pk-why-drawer')).toHaveTextContent(has('Не в усіх телеграмах пачки є такий варіант'));
    expect(screen.getByTestId('pk-kind-drawer')).toBeDisabled();
    expect(screen.getByTestId('pk-kind-diligent')).not.toBeDisabled();
  });

  test('AC-15: «Звести в одну відповідь» → один документ з трьома номерами; у курйозах один запис на пачку', async () => {
    const store = storeWithPack('pack_01');
    await openPack(store);
    await fireEvent.press(screen.getByTestId('pk-kind-formal_reply'));
    await fireEvent.press(screen.getByTestId('pk-summary'));
    expect(screen.getByTestId('tg-result-pack')).toHaveTextContent(has('Відповідь пачкою на Зведення № 1'));
    expect(screen.getByTestId('pk-result-nos')).toHaveTextContent(has('5101, 5102, 5103'));
    expect(screen.getByTestId('pk-result-reply')).toHaveTextContent(has(packDef('pack_01')!.summary.formal_reply!.reply!));
    const curios = store.getState().museum.curios;
    expect(curios.filter((c) => c.kind === 'pack')).toHaveLength(1);
    expect(curios.filter((c) => c.kind === 'telegram')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('tg-result-cta'));
    // зведена пачка йде в «На виконанні» одним рядком, доки триває виконання
    expect(screen.getByTestId('tg-list')).toHaveTextContent(has('На виконанні · 1'));
    expect(screen.getByTestId('tg-pack-1')).toHaveTextContent(has('3 з 3'));
  });

  test('після окремої відповіді зведення недоступне', async () => {
    const store = storeWithPack('pack_01');
    await openPack(store);
    await fireEvent.press(screen.getByTestId('pk-card-1'));
    await fireEvent.press(screen.getByTestId('tg-choice-formal_reply'));
    await fireEvent.press(screen.getByTestId('tg-result-cta'));
    expect(screen.getByTestId('tg-pack')).toBeTruthy();
    expect(screen.getByTestId('pk-partial')).toBeTruthy();
    expect(screen.queryByTestId('pk-summary')).toBeNull();
    expect(screen.getByTestId('pk-cover')).toHaveTextContent(has('1 з 3'));
    await act(async () => {});
  });
});

describe('подія закриття пачки', () => {
  test('packResolve йде один раз: відповідь на запис із шухляди пачку вдруге не закриває', async () => {
    const store = storeWithPack('pack_01');
    const { uid } = store.getState().telegrams.inbox[0]!;
    await act(async () => {
      store.getState().answerTelegram(uid, 'drawer');
      store.getState().answerTelegram(store.getState().telegrams.inbox[1]!.uid, 'diligent');
      store.getState().answerTelegram(store.getState().telegrams.inbox[2]!.uid, 'diligent');
    });
    const count = () => store.getState().events.filter((e) => e.type === 'packResolve').length;
    expect(count()).toBe(1);
    await act(async () => {
      store.getState().answerTelegram(uid, 'diligent');
    });
    expect(count()).toBe(1);
  });
});
