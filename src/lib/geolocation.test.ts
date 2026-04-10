import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCurrentPosition } from './geolocation';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCurrentPosition', () => {
  it('成功時に座標を返す', async () => {
    const mockPosition = {
      coords: {
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
      },
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((successCb) => {
          successCb(mockPosition);
        }),
      },
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({ lat: 35.6762, lng: 139.6503, accuracy: 10 });
  });

  it('パーミッション拒否時に "位置情報の取得が許可されていません" をスローする', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_successCb, errorCb) => {
          errorCb(mockError);
        }),
      },
    });

    await expect(getCurrentPosition()).rejects.toThrow('位置情報の取得が許可されていません');
  });

  it('位置情報が取得できない場合に "位置情報を取得できません" をスローする', async () => {
    const mockError = {
      code: 2, // POSITION_UNAVAILABLE
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_successCb, errorCb) => {
          errorCb(mockError);
        }),
      },
    });

    await expect(getCurrentPosition()).rejects.toThrow('位置情報を取得できません');
  });

  it('タイムアウト時に "位置情報の取得がタイムアウトしました" をスローする', async () => {
    const mockError = {
      code: 3, // TIMEOUT
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_successCb, errorCb) => {
          errorCb(mockError);
        }),
      },
    });

    await expect(getCurrentPosition()).rejects.toThrow('位置情報の取得がタイムアウトしました');
  });

  it('Geolocation APIが未サポートの場合に "位置情報がサポートされていません" をスローする', async () => {
    vi.stubGlobal('navigator', {
      geolocation: undefined,
    });

    await expect(getCurrentPosition()).rejects.toThrow('位置情報がサポートされていません');
  });
});
