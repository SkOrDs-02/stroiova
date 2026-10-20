// Меню й усе, що з нього відкривається (010): menu → profile / settings / about → fund-reports / licenses; reset-confirm і push-preprompt поверх.
import { useState } from 'react';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';

import { AboutScreen } from './AboutScreen';
import { FundReportsScreen } from './FundReportsScreen';
import { LicensesScreen } from './LicensesScreen';
import { MenuSheet } from './MenuSheet';
import { DiaryScreen } from '@/features/story/DiaryScreen';
import { Credits } from '@/features/finale/Credits';
import { ProfileScreen } from './ProfileScreen';
import { PushPreprompt } from './PushPreprompt';
import { ResetConfirm } from './ResetConfirm';
import { SettingsScreen } from './SettingsScreen';

type Page = 'menu' | 'profile' | 'diary' | 'settings' | 'about' | 'funds' | 'licenses' | 'credits';

export function MenuHost({ store, insetTop, onClose, onCurios, onAwards }: { store: ConveyorStore; insetTop: number; onClose: () => void; onCurios: () => void; onAwards: () => void }) {
  const [page, setPage] = useState<Page>('menu');
  const [reset, setReset] = useState(false);
  const [pre, setPre] = useState(false);
  // FR-10: «Пізніше» в тій самій сесії не перепитує - прапор у сторі, тож переживає закриття меню
  const declined = useStore(store, (s) => s.pushDeclined);
  const toMenu = () => setPage('menu');
  return (
    <>
      {page === 'menu' ? <MenuSheet store={store} onClose={onClose} onProfile={() => setPage('profile')} onCurios={onCurios} onSettings={() => setPage('settings')} onAbout={() => setPage('about')} /> : null}
      {page === 'profile' ? <ProfileScreen store={store} insetTop={insetTop} onBack={toMenu} onDiary={() => setPage('diary')} onAwards={onAwards} /> : null}
      {page === 'diary' ? <DiaryScreen store={store} insetTop={insetTop} onBack={() => setPage('profile')} /> : null}
      {page === 'settings' ? (
        <SettingsScreen
          store={store}
          insetTop={insetTop}
          onBack={toMenu}
          onReset={() => setReset(true)}
          onAskPush={() => {
            if (!declined) setPre(true);
          }}
        />
      ) : null}
      {page === 'about' ? <AboutScreen store={store} installId={store.getState().installId} insetTop={insetTop} onBack={toMenu} onReports={() => setPage('funds')} onLicenses={() => setPage('licenses')} onCredits={() => setPage('credits')} /> : null}
      {page === 'credits' ? <Credits store={store} final={false} onClose={() => setPage('about')} /> : null}
      {page === 'funds' ? <FundReportsScreen store={store} insetTop={insetTop} onBack={() => setPage('about')} /> : null}
      {page === 'licenses' ? <LicensesScreen insetTop={insetTop} onBack={() => setPage('about')} /> : null}
      {reset ? <ResetConfirm store={store} onCancel={() => setReset(false)} onDone={onClose} /> : null}
      {pre ? (
        <PushPreprompt
          store={store}
          trigger="settings"
          onClose={() => setPre(false)}
        />
      ) : null}
    </>
  );
}
