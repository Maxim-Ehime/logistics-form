# GitHub Copilot 指示書 (プロジェクト専用ルール)

## 応答ガイドライン

- **言語**: ユーザーへの回答、コードの解説、提案されるコメントはすべて**日本語**で行ってください。
- **トーン**: 初心者にもわかりやすく、丁寧な技術解説を心がけてください。

## プロジェクト概要

Google Apps Script (GAS) 上で動作する LINE LIFF アプリケーションです。

- **order_form.html**: 備品注文フォーム
- **shipping_request.html**: 送り依頼フォーム
- **動作環境**: LINEアプリ内のブラウザ (LIFF)
- **バックエンド**: スプレッドシートへの書き込み、および管理者へのLINE Push通知。

## アーキテクチャ

- **メイン.js**: `doGet` (画面表示) と `doPost` (データ受信) のエントリポイント。
- **機能.js**: スプレッドシート操作、LINE API連携、ビジネスロジック。
- **設定.js**: `ScriptProperties` から読み込んだ設定オブジェクト (`CONFIG`)。

## 運用コマンド (clasp)

開発時に頻繁に使用するコマンドです。

- コードの反映: `clasp push`
- 新バージョンのデプロイ: `clasp deploy -description "変更内容"`
- エディタをブラウザで開く: `clasp open`
- 変更の取り込み: `clasp pull`

## 開発上の重要な約束事

### 設定 (Script Properties)

`LINE_TOKEN` や `LIFF_ID` などの機密情報はコードに直書きせず、GASのスクリプトプロパティから取得します。

### フロントエンド (HTML/JS)

- `fetch` は `mode: "no-cors"` で実行するため、レスポンスの詳細は取得できません。
- `GAS_URL` と `LIFF_ID` は各HTML内の `<script>` ブロックに定数として定義します。

### GAS実行環境

- ランタイムは **V8** を使用します。
- 排他制御のため、書き込み時には `LockService` を使用し、最新データが上にくるよう2行目に挿入します。
