// ============================================================
//  ソロキャンプ・車中泊 旅程しおり — GAS バックエンド (Code.gs)
//  Google Sheets → JSON → GitHub repository_dispatch
// ============================================================

// ---- カスタムメニュー ----------------------------------------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏕️ 旅しおり')
    .addItem('✨ GitHubに旅程を送信してデプロイ', 'sendToGitHub')
    .addItem('📋 JSONプレビュー（ログ確認）', 'previewJson')
    .addSeparator()
    .addItem('⚙️ 設定確認', 'checkProperties')
    .addToUi();
}

// ---- メイン: シートデータ → GitHub Webhook -----------------
function sendToGitHub() {
  const ui = SpreadsheetApp.getUi();
  try {
    const payload = buildItineraryJson();
    const result  = dispatchToGitHub(payload);

    if (result.code === 204) {
      ui.alert('✅ 送信完了', 'GitHub Actionsが起動しました！\n数分後にサイトが更新されます。', ui.ButtonSet.OK);
    } else {
      ui.alert('⚠️ エラー', `HTTPステータス: ${result.code}\n${result.body}`, ui.ButtonSet.OK);
    }
  } catch (e) {
    ui.alert('❌ 例外エラー', e.message, ui.ButtonSet.OK);
  }
}

function previewJson() {
  const payload = buildItineraryJson();
  Logger.log(JSON.stringify(payload, null, 2));
  SpreadsheetApp.getUi().alert('ログを確認してください（表示 > ログ）');
}

// ---- スクリプトプロパティの確認 --------------------------------
function checkProperties() {
  const props = PropertiesService.getScriptProperties();
  const keys  = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  const missing = keys.filter(k => !props.getProperty(k));

  if (missing.length === 0) {
    SpreadsheetApp.getUi().alert('✅ プロパティ設定済み', 'GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO — すべて設定されています。', SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('❌ 未設定のプロパティ', `以下のキーが未設定です:\n${missing.join('\n')}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ---- JSONビルド --------------------------------------------
function buildItineraryJson() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const tripTitle = ss.getName(); // スプレッドシート名をタイトルに流用

  return {
    generated_at : new Date().toISOString(),
    trip_title   : tripTitle,
    schedule     : parseSchedule(ss),
    spots        : parseSpots(ss),
    checklist    : parseChecklist(ss),
  };
}

// ---- スケジュールシート解析 ------------------------------------
// 列順: 日時 | スポット名 | 地図URL | メモ | 滞在ステータス
function parseSchedule(ss) {
  const sheet = ss.getSheetByName('スケジュール');
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  rows.shift(); // ヘッダー除去

  return rows
    .filter(r => r[0] || r[1])
    .map(r => ({
      datetime  : formatDate(r[0]),
      spot_name : String(r[1] || '').trim(),
      map_url   : String(r[2] || '').trim(),
      memo      : String(r[3] || '').trim(),
      status    : String(r[4] || '').trim(),
    }));
}

// ---- スポット詳細シート解析 ------------------------------------
// 列順: スポット名 | 住所/座標 | 料金 | チェックイン | チェックアウト | 設備 | 予約状況
function parseSpots(ss) {
  const sheet = ss.getSheetByName('スポット詳細');
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  rows.shift();

  return rows
    .filter(r => r[0])
    .map(r => ({
      spot_name    : String(r[0] || '').trim(),
      address      : String(r[1] || '').trim(),
      fee          : String(r[2] || '').trim(),
      check_in     : String(r[3] || '').trim(),
      check_out    : String(r[4] || '').trim(),
      facilities   : String(r[5] || '').trim(),
      reservation  : String(r[6] || '').trim(),
    }));
}

// ---- 持ち物リストシート解析 ------------------------------------
// 列順: カテゴリ | アイテム名 | 準備ステータス
function parseChecklist(ss) {
  const sheet = ss.getSheetByName('持ち物リスト');
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  rows.shift();

  // カテゴリ別にグルーピング
  const groups = {};
  rows
    .filter(r => r[1])
    .forEach(r => {
      const cat    = String(r[0] || 'その他').trim();
      const item   = String(r[1] || '').trim();
      const status = String(r[2] || '').trim();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ item, status });
    });

  return Object.entries(groups).map(([category, items]) => ({ category, items }));
}

// ---- GitHub repository_dispatch 送信 -----------------------
function dispatchToGitHub(itineraryData) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER');
  const repo  = props.getProperty('GITHUB_REPO');

  if (!token || !owner || !repo) {
    throw new Error('スクリプトプロパティが未設定です。GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO を設定してください。');
  }

  const url  = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
  const body = JSON.stringify({
    event_type    : 'update-itinerary',
    client_payload: { itinerary: itineraryData },
  });

  const options = {
    method      : 'post',
    contentType : 'application/json',
    headers     : {
      Authorization        : `Bearer ${token}`,
      Accept               : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    payload     : body,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  return {
    code: response.getResponseCode(),
    body: response.getContentText(),
  };
}

// ---- ユーティリティ ------------------------------------------
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
  }
  return String(val).trim();
}
