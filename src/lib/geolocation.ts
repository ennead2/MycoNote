export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('位置情報がサポートされていません'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('位置情報の取得が許可されていません'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('位置情報を取得できません'));
            break;
          case error.TIMEOUT:
            reject(new Error('位置情報の取得がタイムアウトしました'));
            break;
          default:
            reject(new Error('位置情報の取得に失敗しました'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
