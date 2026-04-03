/**
 * LINE/LIFFからのPOSTリクエスト処理
 */
function doPost(e) {
  let json;
  try {
    json = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({ status: "error", message: "JSON parse error" });
  }

  // LIFFからの送り依頼の処理
  if (json.action === "liff_shipping") {
    try {
      const res = processLiffShipping(json.data);
      return createJsonResponse({ status: "success", message: res });
    } catch (err) {
      return createJsonResponse({ status: "error", message: err.message });
    }
  }

  // LIFFからの備品注文処理
  if (json.action === "liff_order") {
    try {
      const res = processLiffOrder(json.data);
      return createJsonResponse({ status: "success", message: res });
    } catch (err) {
      return createJsonResponse({ status: "error", message: err.message });
    }
  }

  // LINEメッセージ（IDチェック）処理
  const event = json.events ? json.events[0] : null;
  if (event && event.type === "message") {
    if (event.message.text === "ID") {
      replyLine(event.replyToken, `あなたのID：\n${event.source.userId}`);
    }
  }

  return createJsonResponse({ status: "ok" });
}

// JSONレスポンス用補助関数
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('備品発注フォーム');
}