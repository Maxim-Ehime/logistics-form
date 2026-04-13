/**
 * 指定シートの2行目にデータを挿入
 */
function normalizeCellValue(value) {
  return value === undefined || value === null ? "" : value;
}

function findHeaderColumn(headers, headerName) {
  const column = headers.findIndex(header => header === headerName) + 1;
  if (column <= 0) {
    throw new Error(`ヘッダー「${headerName}」が見つかりません`);
  }
  return column;
}

function writeToSheet(sheetName, rowDataByHeader, checkboxHeaderName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`エラー: シート「${sheetName}」が見つかりません`);
    return;
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(header => String(header).trim());
    const rowValues = headers.map(header => normalizeCellValue(rowDataByHeader[header]));

    sheet.insertRowBefore(2); // 見出し直下に挿入
    sheet.getRange(2, 1, 1, rowValues.length).setValues([rowValues]);

    if (checkboxHeaderName) {
      const checkboxColumn = findHeaderColumn(headers, checkboxHeaderName);
      sheet.getRange(2, checkboxColumn).insertCheckboxes();
      sheet.getRange(2, checkboxColumn).setValue(false); // 新規行は未チェック
    }

    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log(`エラー: ${e.message}`);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 送り依頼処理
 */
function processLiffShipping(payload) {
  const submittedAt = new Date();
  const rowData = {
    "タイムスタンプ": submittedAt,
    "日時": submittedAt,
    "氏名": payload.userName,
    "依頼者": payload.userName,
    "運送会社": payload.carrier,
    "希望着日": payload.arrivalDate,
    "送り先": payload.destination,
    "納品先": payload.destination,
    "最低Ct": payload.minCt,
    "最低カートン": payload.minCt,
    "最高Ct": payload.maxCt,
    "最高カートン": payload.maxCt,
    "備品": payload.hasSupplies,
    "備品注文の有無": payload.hasSupplies,
    "残から": payload.hasRemaining
  };

  // 「送り依頼」シートに書き込み
  writeToSheet(CONFIG.MASTER_SHEET_NAME, rowData, "済");

  // 管理者へ通知
    const message = "🚚 新しい送り依頼が届きました！\n" +
                    "依頼者: " + normalizeCellValue(rowData["氏名"]) + "\n" +
                    "運送会社: " + normalizeCellValue(rowData["運送会社"]) + "\n" +
                    "希望着日: " + normalizeCellValue(rowData["希望着日"]) + "\n" +
                    "送り先: " + normalizeCellValue(rowData["送り先"]) + "\n" +
                    "最低カートン: " + normalizeCellValue(rowData["最低Ct"]) + "\n" +
                    "最高カートン: " + normalizeCellValue(rowData["最高Ct"]) + "\n" +
                    "備品: " + normalizeCellValue(rowData["備品"]) + "\n" +
                    "残から: " + normalizeCellValue(rowData["残から"]);

  sendPush(CONFIG.TARGET_USER_ID, message);
  return "送り依頼完了";
}

/**
 * 備品注文処理
 */
function processLiffOrder(payload) {
  const { userName, items } = payload;
  
  // 注文内容の整形
  const itemSummary = (items || []).map(item => `${item.name} x ${item.qty}`).join(", ");
  const submittedAt = new Date();
  const rowData = {
    "タイムスタンプ": submittedAt,
    "日時": submittedAt,
    "氏名": userName,
    "依頼者": userName,
    "内容": itemSummary
  };

  // 「済」列にチェックボックスを配置
  writeToSheet(CONFIG.SUPPLY_SHEET_NAME, rowData, "済");

  // 管理者通知
  const notifyMessage = "📦 備品注文が届きました！\n" +
                        "依頼者: " + normalizeCellValue(rowData["氏名"]) + "\n" +
                        "内容: " + normalizeCellValue(rowData["内容"]);
  
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
