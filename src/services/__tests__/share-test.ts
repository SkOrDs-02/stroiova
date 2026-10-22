// 007 FR-29: системне меню й тимчасовий PNG - файл переноситься в теку кешу `share` і видаляється після меню за будь-якого результату.
import { Platform, Share } from 'react-native';

const mockFiles: { uri: string; deleted: boolean }[] = [];
const mockDirs: { deleted: boolean }[] = [];

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(() => Promise.resolve('file:///cache/ReactNative-snapshot.png')) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(() => Promise.resolve(true)), shareAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-file-system', () => {
  class Directory {
    uri = 'file:///cache/share/';
    deleted = false;
    constructor() {
      mockDirs.push(this);
    }
    get exists() {
      return !this.deleted;
    }
    create() {}
    delete() {
      this.deleted = true;
    }
  }
  class File {
    deleted = false;
    uri: string;
    constructor(u: string) {
      this.uri = u;
      mockFiles.push(this);
    }
    get exists() {
      return !mockFiles.some((f) => f.uri === this.uri && f.deleted);
    }
    move(d: { uri: string }) {
      this.uri = `${d.uri}snapshot.png`;
    }
    delete() {
      this.deleted = true;
    }
  }
  return { Directory, File, Paths: { cache: {} } };
});

// eslint-disable-next-line import/first
import { clearShareCache, deviceShare } from '../share';

const Sharing = jest.requireMock('expo-sharing');
const shot = jest.requireMock('react-native-view-shot');

beforeEach(() => {
  mockFiles.length = 0;
  mockDirs.length = 0;
});

const deletedShare = () => mockFiles.some((f) => f.uri === 'file:///cache/share/snapshot.png' && f.deleted);

test('iOS: меню RN Share з файлом і рядком, activityType; файл видалено', async () => {
  Platform.OS = 'ios';
  const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: 'com.apple.UIKit.activity.Message' });
  const r = await deviceShare.share({ current: null }, 'msg');
  expect(spy).toHaveBeenCalledWith({ url: 'file:///cache/share/snapshot.png', message: 'msg' });
  expect(r).toEqual({ kind: 'shared', activityType: 'com.apple.UIKit.activity.Message' });
  expect(deletedShare()).toBe(true);
});

test('iOS: меню закрито - dismissed, файл теж видалено', async () => {
  Platform.OS = 'ios';
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
  expect(await deviceShare.share({ current: null }, 'msg')).toEqual({ kind: 'dismissed' });
  expect(deletedShare()).toBe(true);
});

test('Android: expo-sharing з PNG, результат shared; помилка меню - error, файл видалено', async () => {
  Platform.OS = 'android';
  expect(await deviceShare.share({ current: null }, 'msg')).toEqual({ kind: 'shared' });
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/share/snapshot.png', expect.objectContaining({ mimeType: 'image/png' }));
  Sharing.shareAsync.mockRejectedValueOnce(new Error('boom'));
  expect(await deviceShare.share({ current: null }, 'msg')).toEqual({ kind: 'error', code: 'boom' });
  expect(deletedShare()).toBe(true);
});

test('знімок не вдався - error, меню не відкривається', async () => {
  shot.captureRef.mockRejectedValueOnce(new Error('oom'));
  Sharing.shareAsync.mockClear();
  expect(await deviceShare.share({ current: null }, 'msg')).toEqual({ kind: 'error', code: 'oom' });
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test('на запуску тека картинок прибирається', () => {
  clearShareCache();
  expect(mockDirs.at(-1)!.deleted).toBe(true);
});
