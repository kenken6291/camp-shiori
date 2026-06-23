# 🏕️ ソロキャンプ・車中泊 旅程しおりサイト — 導入手順マニュアル

## システム全体像

```
Google Sheets（データ入力）
    ↓ GAS が JSON化 + repository_dispatch 送信
GitHub（リポジトリ）
    ↓ Actions が HTML をビルド
GitHub Pages（公開URL）
    ↓ スマホでアクセス
旅しおりサイト（PWA対応）
```

---

## STEP 1: GitHubリポジトリを作成する

1. GitHub にログインし、「New repository」で新しいリポジトリを作成
   - 名前例: `camp-shiori`
   - **Public** にする（GitHub Pages の無料利用のため）
   - README は作成しなくてよい

2. 以下のファイルをリポジトリにアップロード（または `git push`）

```
camp-shiori/
├── .github/
│   └── workflows/
│       └── deploy.yml        ← GitHub Actions ワークフロー
├── src/
│   ├── template.html         ← フロントエンドテンプレート
│   └── manifest.json         ← PWA設定
└── data.json                 ← 手動テスト用サンプルデータ
```

---

## STEP 2: GitHub Pages を有効にする

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を **「GitHub Actions」** に設定する
   （`gh-pages` ブランチではなく Actions を選ぶ）

---

## STEP 3: GitHub Personal Access Token（PAT）を発行する

GAS からリポジトリに Webhook を送信するために必要です。

### 発行手順

1. GitHub右上アバター → **Settings**
2. 左メニュー最下部 **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)** をクリック
5. 以下を設定:

| 項目 | 値 |
|------|-----|
| Note | `camp-shiori-gas` など分かりやすい名前 |
| Expiration | `90 days` または `No expiration`（お好みで） |
| **Scopes** | ✅ `repo`（Full control of private repositories） |

> ⚠️ `repo` スコープにチェックを入れれば `repository_dispatch` の送信が可能です。

6. **Generate token** をクリック
7. 表示されたトークン（`ghp_xxxx...`）を**必ずコピーして安全な場所に保存**
   （ページを離れると二度と表示されません）

---

## STEP 4: Google スプレッドシートを準備する

### スプレッドシートの構成

スプレッドシートに以下の **3つのシート** を作成してください。
シート名は **完全一致** が必要です。

---

### シート1: `スケジュール`

| A列: 日時 | B列: スポット名 | C列: 地図URL | D列: メモ | E列: 滞在ステータス |
|-----------|----------------|-------------|-----------|-------------------|
| 2024/07/15 08:00 | 自宅 出発 | （空欄可） | 早めに出発 | 予定 |
| 2024/07/15 13:00 | 奥多摩キャンプ場 | https://maps.google.com/... | チェックイン | 予約済 |

**1行目は必ずヘッダー行**にしてください（GASが自動で読み飛ばします）

---

### シート2: `スポット詳細`

| A: スポット名 | B: 住所/座標 | C: 料金 | D: チェックイン | E: チェックアウト | F: 設備 | G: 予約状況 |
|-------------|------------|--------|----------------|-----------------|--------|-----------|
| 奥多摩キャンプ場 | 東京都... | 1,500円/泊 | 13:00 | 11:00 | 温泉,薪,シャワー | 予約番号: ABC-123 |

**F列（設備）は「,」「、」またはスペースで区切ると**サイト上でタグ表示されます

---

### シート3: `持ち物リスト`

| A列: カテゴリ | B列: アイテム名 | C列: 準備ステータス |
|------------|--------------|-----------------|
| 🏕️ シェルター・寝具 | テント | 済 |
| 🏕️ シェルター・寝具 | シュラフ | （空欄可） |
| 🔥 焚き火・調理 | 焚き火台 | |

---

## STEP 5: GASを設定する

1. スプレッドシートを開き **拡張機能 → Apps Script**
2. `コード.gs` の中身をすべて削除し、提供された `Code.gs` の内容を貼り付け
3. **保存**（Ctrl+S）

---

## STEP 6: スクリプトプロパティを設定する

GASエディタで **プロジェクトの設定** → **スクリプト プロパティ** を開き、
以下の3つを追加してください：

| プロパティキー | 値（例） |
|-------------|---------|
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（STEP 3で発行したPAT） |
| `GITHUB_OWNER` | `your-github-username`（GitHubのユーザー名） |
| `GITHUB_REPO` | `camp-shiori`（リポジトリ名） |

> ⚠️ トークンをスクリプト本文に直接書かないこと！必ずスクリプトプロパティを使用してください。

---

## STEP 7: 初回実行・認証

1. スプレッドシートをリロードすると **「🏕️ 旅しおり」メニュー** が表示される
2. **「⚙️ 設定確認」** をクリックしてプロパティが正しく設定されているか確認
3. **「✨ GitHubに旅程を送信してデプロイ」** をクリック
4. 初回はGASの権限承認ダイアログが表示されるので「許可」する

---

## STEP 8: GitHub Actionsの動作確認

1. GitHubリポジトリの **Actions** タブを開く
2. `旅しおり ビルド & デプロイ` ワークフローが実行中になっているか確認
3. 緑のチェックマークが付いたら完了！

---

## STEP 9: 公開URLにアクセス

```
https://[GITHUB_OWNER].github.io/[GITHUB_REPO]/
```

例: `https://yourname.github.io/camp-shiori/`

このURLをスマホのホーム画面に追加するとPWA（アプリ風）として使えます！

---

## よくある質問

### Q: デプロイ後にサイトが更新されない
- Actions タブでエラーが出ていないか確認
- Settings → Pages の Source が「GitHub Actions」になっているか確認

### Q: GASから「HTTPステータス: 404」が返ってくる
- `GITHUB_OWNER` と `GITHUB_REPO` のスペルを確認
- リポジトリが Public になっているか確認

### Q: GASから「HTTPステータス: 401」が返ってくる
- `GITHUB_TOKEN` が正しく設定されているか確認
- トークンの有効期限が切れていないか GitHub で確認

### Q: スポット名の地図URLを正しく設定したい
Google マップで場所を検索し、**「共有」→「リンクをコピー」** で取得した
`https://maps.google.com/maps?...` または `https://goo.gl/maps/...` 形式のURLをそのまま貼り付けてください。
