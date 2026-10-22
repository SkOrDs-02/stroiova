// 010 FR-25, AC-18: посилання - у зовнішньому застосунку (Linking), не у вбудованому браузері; ID - у буфер обміну.
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { deviceLinks } from '../device';

test('посилання відкривається через Linking, копія йде в буфер', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const copy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValue(true);
  deviceLinks.open('https://example.org/privacy');
  deviceLinks.open('mailto:dev@example.org');
  deviceLinks.copy('8f3c1d52-0000-4000-8000-000000000001');
  expect(open.mock.calls.map((c) => c[0])).toEqual(['https://example.org/privacy', 'mailto:dev@example.org']);
  expect(copy).toHaveBeenCalledWith('8f3c1d52-0000-4000-8000-000000000001');
});
