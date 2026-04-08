// スクリプトプロパティから設定値を読み込む
const props = PropertiesService.getScriptProperties();

const CONFIG = {
  LINE_TOKEN: props.getProperty('LINE_TOKEN'),
  LIFF_ID: props.getProperty('LIFF_ID'),
  MASTER_SHEET_NAME: props.getProperty('MASTER_SHEET_NAME') || "依頼一覧",
  SUPPLY_SHEET_NAME: props.getProperty('SUPPLY_SHEET_NAME') || "備品注文",
  TARGET_USER_ID: props.getProperty('TARGET_USER_ID')
};