function doPost(event) {
  const token = PropertiesService.getScriptProperties().getProperty('GZN_MAIL_TOKEN');
  if (!token) return jsonResponse(503, { ok: false });

  let payload;
  try {
    payload = JSON.parse(event && event.postData && event.postData.contents || '');
  } catch (_error) {
    return jsonResponse(400, { ok: false });
  }

  if (!constantTimeEqual(payload && payload.token, token)) {
    return jsonResponse(403, { ok: false });
  }

  const validEmail = value => typeof value === 'string' &&
    value.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/.test(value) &&
    !/[\r\n]/.test(value);

  const to = payload.to;
  const replyTo = payload.replyTo || '';
  const subject = payload.subject;
  const body = payload.text;
  const htmlBody = payload.html;

  if (!validEmail(to) || (replyTo && !validEmail(replyTo)) ||
      typeof subject !== 'string' || subject.length > 180 || /[\r\n]/.test(subject) ||
      typeof body !== 'string' || body.length > 12000 ||
      typeof htmlBody !== 'string' || htmlBody.length > 35000) {
    return jsonResponse(400, { ok: false });
  }

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      replyTo: replyTo || undefined,
      name: 'GZN Streetwear'
    });
    return jsonResponse(200, { ok: true });
  } catch (_error) {
    return jsonResponse(503, { ok: false });
  }
}

function constantTimeEqual(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' ||
      candidate.length > 256 || expected.length > 256) return false;
  let diff = candidate.length ^ expected.length;
  const maxLength = Math.max(candidate.length, expected.length);
  for (let index = 0; index < maxLength; index++) {
    diff |= (candidate.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return diff === 0;
}

function jsonResponse(status, data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
