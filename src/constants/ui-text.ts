export const UI_TEXT = {
  nav: { zukan: '図鑑', identify: '識別', plan: '計画', records: '記録', settings: '設定' },
  zukan: {
    title: 'キノコ図鑑', searchPlaceholder: '名前で検索...', filterToxicity: '毒性',
    filterSeason: '季節', filterHabitat: '生育地', noResults: '該当するキノコが見つかりません',
    season: 'シーズン', habitat: '生育地', regions: '分布地域', features: '形態的特徴',
    description: '概要', similarSpecies: '似ている種', caution: '注意事項',
    treeAssociation: '関連する樹種', seasonCalendarTitle: 'シーズンカレンダー',
    myRecords: '自分の採取記録', noRecords: 'この種の採取記録はありません',
  },
  identify: { title: '識別', comingSoon: 'この機能はPhase 3以降で実装予定です' },
  plan: { title: '採取計画', comingSoon: 'この機能はPhase 3以降で実装予定です' },
  records: { title: '採取記録', comingSoon: 'この機能はPhase 2以降で実装予定です' },
  settings: {
    title: '設定', appInfo: 'アプリ情報', appName: 'MycoNote',
    appDescription: 'キノコ採取・観察ハンドブック', version: 'v0.1.0',
  },
  common: {
    loading: '読み込み中...', error: 'エラーが発生しました',
    offline: 'オフラインモード — 一部機能が制限されています',
    onlineRestored: 'オンラインに復帰しました', back: '戻る',
  },
  months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
} as const;
