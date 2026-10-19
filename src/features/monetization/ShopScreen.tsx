// shop (008 FR-15…FR-29): буст, три товари, «Відновити покупки»; без мережі чи білінгу - банер з причиною.
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { localDate, type ConveyorStore } from '@/features/conveyor/store';
import { boostView } from '@/monetization/monetization';
import type { ProductId } from '@/monetization/types';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { AdButton } from './AdButton';
import { shopT } from './texts';

const ORDER: ProductId[] = ['no_ads', 'starter_pack', 'storage_24h'];

export function ShopScreen({ store, insetTop }: { store: ConveyorStore; insetTop: number }) {
  const s = useStore(store);
  const svc = s.services.purchases;
  const status = svc.status();
  const prices = svc.prices();
  const android = Platform.OS === 'android';
  const down = status === 'no_net' || status === 'no_billing';
  const busy = s.busy === 'purchase';
  const view = boostView(s.monetization, s.effects, s.lastMs, localDate(s.lastMs), s.cfg, s.state.hasNoAds);
  return (
    <View style={styles.root} testID="shop">
      <View style={[styles.head, { paddingTop: insetTop }]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{shopT.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {down ? (
          <View style={styles.banner} testID="shop-banner">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{status === 'no_net' ? shopT.bannerNet : android ? shopT.bannerBillAndroid : shopT.bannerBillIos}</Text>
            <Button testID="shop-retry" variant="secondary" label={shopT.retry} onPress={() => void store.getState().syncPurchases()} />
          </View>
        ) : null}
        <View style={styles.card} testID="shop-boost">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{`×2 ${shopT.boostTitle}`}</Text>
          <AdButton store={store} placement="income_boost" view={view} label={shopT.watch} takeLabel={shopT.take} note={shopT.boostMeta} takeNote={shopT.boostMetaTake} testID="shop-boost-ad" />
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{shopT.purchases}</Text>
        {ORDER.map((id) => {
          const owned = s.monetization.rights[id];
          if (id === 'starter_pack' && owned) return null;
          const pending = s.monetization.pending.includes(id);
          const price = prices[id];
          const p = shopT.products[id];
          const lock = busy && !owned;
          return (
            <View key={id} style={[styles.card, owned && styles.cardOwned]} testID={`product-${id}`}>
              <View style={styles.titleRow}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{p.name}</Text>
                {owned ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.owned}>{shopT.owned}</Text> : null}
              </View>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>
                {owned && id !== 'starter_pack' ? shopT.ownedDesc[id] : 'mult' in p && p.mult ? `${p.mult} ${p.desc}` : p.desc}
              </Text>
              {pending ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.pending} testID={`pending-${id}`}>{shopT.pendingLabel}</Text> : null}
              {!owned ? (
                <>
                  <Button
                    testID={`buy-${id}`}
                    label={down ? shopT.unavailable : price ? shopT.buy(price) : status === 'loading' ? shopT.priceLoading : shopT.unavailable}
                    disabled={down || !price || lock || pending}
                    onPress={() => void store.getState().purchase(id)}
                  />
                  {lock ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{android ? shopT.busyAndroid : shopT.busyIos}</Text> : null}
                </>
              ) : null}
            </View>
          );
        })}
        <Pressable
          testID="shop-restore"
          accessibilityRole="button"
          disabled={down || busy}
          onPress={() => void store.getState().restore('shop_button')}
          style={[styles.restore, (down || busy) && styles.off]}
        >
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.restoreText}>{shopT.restore}</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="shop-restore-note">
          {busy ? shopT.restoreNoteBusy : status === 'no_net' ? shopT.restoreNoteNet : status === 'no_billing' ? (android ? shopT.restoreNoteBillAndroid : shopT.restoreNoteBillIos) : shopT.restoreNote}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { paddingHorizontal: space[16], paddingBottom: space[8], backgroundColor: color.bgDeep },
  h2: { ...type('h2'), color: color.text },
  scroll: { padding: space[16], gap: space[12], paddingBottom: space[24] },
  h4: { ...type('h4'), color: color.muted },
  banner: { backgroundColor: color.alertBg, borderWidth: 1, borderColor: color.alertLine, borderRadius: radius[6], padding: space[12], gap: space[8] },
  card: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[8], borderWidth: 1.5, borderColor: color.accent },
  cardOwned: { borderColor: color.border },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  title: { ...type('h4'), color: color.text, flexShrink: 1 },
  owned: { ...type('label'), color: color.accent },
  body: { ...type('body'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  pending: { ...type('label'), color: color.accent },
  restore: { minHeight: size.touchMin, justifyContent: 'center', alignItems: 'center' },
  restoreText: { ...type('body'), color: color.accent, textDecorationLine: 'underline' },
  off: { opacity: 0.4 },
});
