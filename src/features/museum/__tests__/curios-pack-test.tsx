// 011 FR-24, AC-15: зведена відповідь пачки - один запис у журналі курйозів, рядок і документ запису.
import { fireEvent, render, screen } from '@testing-library/react-native';

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

test('пачка зведена «сумлінно»: у курйозах один запис «ЗВЕДЕННЯ № 1», підсумок з пачкою, документ запису', async () => {
  const store = createConveyorStore(T0, bundledConfig);
  const d = packDef('pack_01')!;
  const inbox: InboxItem[] = d.telegrams.map((id, i) => ({ uid: `${id}#${i + 1}`, id, kind: 'telegram', receivedAt: T0, status: 'new', pack: { id: 'pack_01', no: 1, index: i + 1 } }));
  store.setState({
    onboarding: onboardingDone(),
    telegrams: { ...tgWith([]), inbox, deliveries: 3, firstInspectionPassed: true, packs: { day: '2025-10-09', seq: 1 } },
    state: { ...store.getState().state, level: 3, paper: 30, prestigePoints: 5 },
  });
  expect(store.getState().answerPack(1, 'diligent')).toEqual({ ok: true });
  await render(<MainScreen store={store} />);
  await fireEvent.press(screen.getByTestId('tab-museum'));
  await fireEvent.press(screen.getByTestId('mu-seg-curios'));
  expect(screen.getByTestId('curios-summary')).toHaveTextContent('1 запис · 0 телеграм · 0 списаних подарунків · 1 пачка');
  expect(screen.getByTestId('curio-1')).toHaveTextContent(/ЗВЕДЕННЯ № 1.*сумлінно.*Відповідь пачкою на Зведення № 1/);
  await fireEvent.press(screen.getByTestId('curio-1'));
  expect(screen.getByTestId('curio-pack')).toHaveTextContent(/5101, 5102, 5103/);
  expect(screen.getByTestId('curio-pack')).toHaveTextContent(/СЛУХАЛИ: три телеграми про наради/);
});
