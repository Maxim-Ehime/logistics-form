/**
 * 指定シートの2行目にデータを挿入
 */
function normalizeCellValue(value) {
  return value === undefined || value === null ? "" : value;
}

function buildHeaderValueMap(fieldDefinitions) {
  const headerValueMap = {};
  fieldDefinitions.forEach(({ headers, value }) => {
    headers.forEach(header => {
      headerValueMap[header] = value;
    });
  });
  return headerValueMap;
}

function findHeaderColumn(headers, headerName) {
  const column = headers.findIndex(header => header === headerName) + 1;
  if (column <= 0) {
    throw new Error(`ヘッダー「${headerName}」が見つかりません`);
  }
  return column;
}

function buildMessage(title, fields) {
  const lines = fields.map(({ label, value }) => `${label}: ${normalizeCellValue(value)}`);
  return [title].concat(lines).join("\n");
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

function buildShippingRowData(payload) {
  const { userName, carrier, arrivalDate, destination, minCt, maxCt, hasSupplies, hasRemaining } = payload;
  const submittedAt = new Date();
  return buildHeaderValueMap([
    { headers: ["タイムスタンプ", "日時"], value: submittedAt },
    { headers: ["氏名", "依頼者"], value: userName },
    { headers: ["運送会社"], value: carrier },
    { headers: ["希望着日"], value: arrivalDate },
    { headers: ["送り先", "納品先"], value: destination },
    { headers: ["最低Ct", "最低カートン"], value: minCt },
    { headers: ["最高Ct", "最高カートン"], value: maxCt },
    { headers: ["備品注文", "備品", "備品注文の有無"], value: hasSupplies },
    { headers: ["残から"], value: hasRemaining }
  ]);
}

function buildOrderRowData(payload) {
  const { userName, items } = payload;
  const submittedAt = new Date();
  const itemSummary = (items || []).map(item => `${item.name} x ${item.qty}`).join(", ");
  return buildHeaderValueMap([
    { headers: ["タイムスタンプ", "日時"], value: submittedAt },
    { headers: ["氏名", "依頼者"], value: userName },
    { headers: ["注文内容", "内容"], value: itemSummary }
  ]);
}

/**
 * 送り依頼処理
 */
function processLiffShipping(payload) {
  const rowData = buildShippingRowData(payload);

  // 「送り依頼」シートに書き込み
  writeToSheet(CONFIG.MASTER_SHEET_NAME, rowData, "済");

  // 管理者へ通知
  const message = buildMessage("🚚 新しい送り依頼が届きました！", [
    { label: "依頼者", value: rowData["氏名"] },
    { label: "運送会社", value: rowData["運送会社"] },
    { label: "希望着日", value: rowData["希望着日"] },
    { label: "送り先", value: rowData["送り先"] },
    { label: "最低カートン", value: rowData["最低Ct"] },
    { label: "最高カートン", value: rowData["最高Ct"] },
    { label: "備品注文", value: rowData["備品注文"] },
    { label: "残から", value: rowData["残から"] }
  ]);

  sendPush(CONFIG.TARGET_USER_ID, message);
  return "送り依頼完了";
}

/**
 * 備品注文処理
 */
function processLiffOrder(payload) {
  const rowData = buildOrderRowData(payload);

  // 「済」列にチェックボックスを配置
  writeToSheet(CONFIG.SUPPLY_SHEET_NAME, rowData, "済");

  // 管理者通知
  const notifyMessage = buildMessage("📦 備品注文が届きました！", [
    { label: "依頼者", value: rowData["氏名"] },
    { label: "注文内容", value: rowData["注文内容"] }
  ]);
  
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
