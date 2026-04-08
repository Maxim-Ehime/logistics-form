/**
 * 指定シートの2行目にデータを挿入
 */
function writeToSheet(sheetName, dataArray) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`エラー: シート「${sheetName}」が見つかりません`);
    return;
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    sheet.insertRowBefore(2); // 見出し直下に挿入
    sheet.getRange(2, 1, 1, dataArray.length).setValues([dataArray]);
    
    // 最終列にチェックボックスを設置
    sheet.getRange(2, dataArray.length + 1).insertCheckboxes();
    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log(`エラー: ${e.message}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 送り依頼処理
 */
function processLiffShipping(payload) {
  // スプレッドシートへ書き込む形式に整える [cite: 2, 3]
  // [タイムスタンプ, 氏名, 配送業者, 希望着日, 送り先, 最低Ct, 最高Ct, 備品, 残から]
  const recordData = [
    new Date(),
    payload.userName,
    payload.carrier,
    payload.arrivalDate,
    payload.destination,
    payload.minCt,
    payload.maxCt,
    payload.hasSupplies,
    payload.hasRemaining
  ];

  // 「送り依頼」シートに書き込み
  writeToSheet(CONFIG.MASTER_SHEET_NAME, recordData);

  // 管理者へ通知
    const message = "🚚 新しい送り依頼が届きました！\n" +
                    "氏名: " + (recordData[1] || "") + "\n" +
                    "配送業者: " + (recordData[2] || "") + "\n" +
                    "希望着日: " + (recordData[3] || "") + "\n" +
                    "送り先: " + (recordData[4] || "") + "\n" +
                    "最低カートン: " + (recordData[5] || "") + "\n" +
                    "最高カートン: " + (recordData[6] || "") + "\n" +
                    "備品: " + (recordData[7] || "") + "\n" +
                    "残から: " + (recordData[8] || "");

  sendPush(CONFIG.TARGET_USER_ID, message);
  return "送り依頼完了";
}

/**
 * 備品注文処理
 */
function processLiffOrder(payload) {
  const { userName, items } = payload;
  
  // 注文内容の整形
  const itemSummary = items.map(item => `${item.name} x ${item.qty}`).join(", ");

  // 備品シート用データ [A:日時, B:氏名, C:内容]
  const recordData = [new Date(), userName, itemSummary];

  // シート書き込み 
  writeToSheet(CONFIG.SUPPLY_SHEET_NAME, recordData);

  // 管理者通知
  const notifyMessage = "📦 備品注文が届きました！\n" +
                        "氏名: " + (recordData[1] || "") + "\n" +
                        "内容: " + (recordData[2] || "");
  
  sendPush(CONFIG.TARGET_USER_ID, notifyMessage);

  return "注文を記録しました";
}

function sendPush(to, text) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${CONFIG.LINE_TOKEN}` 
    },
    payload: JSON.stringify({ to, messages: [{ type: "text", text }] })
  });
}

function replyLine(replyToken, text) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${CONFIG.LINE_TOKEN}` 
    },
    payload: JSON.stringify({ replyToken, messages: [{ type: "text", text }] })
  });
}