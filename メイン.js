/**
 * LINE/LIFFからのPOSTリクエスト処理
 */
function parsePostJson(e) {
  return JSON.parse(e.postData.contents);
}

function handleLiffAction(json) {
  const actionHandlers = {
    liff_shipping: processLiffShipping,
    liff_order: processLiffOrder
  };

  const handler = actionHandlers[json.action];
  if (!handler) {
    return null;
  }

  return handler(json.data);
}

function handleLineMessage(event) {
  if (event && event.type === "message" && event.message.text === "ID") {
    replyLine(event.replyToken, `あなたのID：\n${event.source.userId}`);
  }
}

function doPost(e) {
  let json;
  try {
    json = parsePostJson(e);
  } catch (err) {
    return createJsonResponse({ status: "error", message: "JSON parse error" });
  }

  try {
    const liffResult = handleLiffAction(json);
    if (liffResult !== null) {
      return createJsonResponse({ status: "success", message: liffResult });
    }
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.message });
  }

  // LINEメッセージ（IDチェック）処理
  const event = json.events ? json.events[0] : null;
  handleLineMessage(event);

  return createJsonResponse({ status: "ok" });
}

// JSONレスポンス用補助関数
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function renderPage(templateName, title) {
  return HtmlService.createTemplateFromFile(templateName).evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle(title);
}

function doGet(e) {
  const page = e && e.parameter ? e.parameter.page : "";
  if (page === "shipping") {
    return renderPage("index", "送り依頼フォーム");
  }
  return renderPage("order_form", "備品発注フォーム");
}
