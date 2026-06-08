/*****************************************************************
 * SEND — Backend (Google Apps Script)
 * Rol: primește datele de la aplicație (PWA), le scrie în Google
 * Sheets, urcă pozele în Drive pe structura de foldere și trimite
 * raportul pe email la final de tură.
 *
 * DEPLOY: vezi README.md (Extensions → Apps Script → Deploy → Web app).
 *****************************************************************/

const CONFIG = {
  ROOT_FOLDER_NAME: "SEND",            // folderul rădăcină în Drive
  REPORT_EMAIL: "EMAIL@EXEMPLU.COM",   // <-- pune aici destinatarul raportului
  PRODUCTS_SHEET_ID: "1kz0Yy-vcJ6MYTqJgt9D3zMHNg84AQppFVTk6do-5Hj8"
};

/* ---------- Router ---------- */
function doGet() { return json({ ok: true, service: "SEND backend" }); }

function doPost(e) {
  var out = { ok: true };
  try {
    var req = JSON.parse(e.postData.contents);
    switch (req.action) {
      case "getProducts": out.products = getProducts(req.sheetId || CONFIG.PRODUCTS_SHEET_ID); break;
      case "uploadPhoto": out.url = savePhoto(req.photo, req.categorie, req.fereastra, req.date); break;
      case "sendEmail":   sendShiftEmail(req.state); break;
      case "autosave":    saveState(req.date, req.state); break;
      default:            logRow(req.action, req);   // saveShift / saveMorning / saveInventory / ...
    }
  } catch (err) {
    out.ok = false; out.error = String(err);
  }
  return json(out);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Drive: foldere ---------- */
function root() { return getFolder(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME); }
function getFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ---------- Drive: poze ----------
 * Structură: SEND/Poze/[Categorie]/[Data]/[Fereastra]/fișier.jpg
 */
function savePhoto(dataUrl, categorie, fereastra, date) {
  var parts = dataUrl.split(",");
  var meta = parts[0];                       // ex: data:image/jpeg;base64
  var b64 = parts[1];
  var mime = (meta.match(/data:(.*?);/) || [, "image/jpeg"])[1];
  var ext = mime.split("/")[1] || "jpg";
  var bytes = Utilities.base64Decode(b64);
  var name = (categorie || "poza").replace(/[^\w]+/g, "_") + "_" + new Date().getTime() + "." + ext;
  var blob = Utilities.newBlob(bytes, mime, name);

  var poze = getFolder(root(), "Poze");
  var fCat = getFolder(poze, categorie || "Diverse");
  var fDate = getFolder(fCat, date || todayStr());
  var fWin = getFolder(fDate, fereastra || "General");
  var file = fWin.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/* ---------- Sheets: registru de date ---------- */
function masterSheet() {
  var r = root();
  var it = r.getFilesByName("SEND – Date");
  var ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create("SEND – Date");
    DriveApp.getFileById(ss.getId()).moveTo(r);
  }
  return ss;
}
function tab(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (headers) sh.appendRow(headers); }
  return sh;
}
function logRow(action, req) {
  var ss = masterSheet();
  var sh = tab(ss, "Log", ["Moment", "Data", "Acțiune", "Detalii"]);
  sh.appendRow([new Date(), req.date || todayStr(), action, JSON.stringify(stripBig(req))]);
}
function stripBig(req) { var c = Object.assign({}, req); delete c.action; return c; }

function saveState(date, state) {
  // arhivă JSON a stării zilei (util pentru emailul automat de la 23:58)
  var f = getFolder(root(), "Stare zilnică");
  var name = (date || todayStr()) + ".json";
  var it = f.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(JSON.stringify(state));
  else f.createFile(name, JSON.stringify(state), "application/json");
}

/* ---------- Produse din Sheet ----------
 * Format așteptat în Sheet (foaia 1): col A = Categorie, col B = Produs.
 * (Categoria se poate repeta pe fiecare rând al produsului.)
 */
function getProducts(sheetId) {
  var sh = SpreadsheetApp.openById(sheetId).getSheets()[0];
  var rows = sh.getDataRange().getValues();
  var out = {}, lastCat = "Diverse";
  for (var i = 1; i < rows.length; i++) {       // i=1: sare peste antet
    var cat = String(rows[i][0] || "").trim();
    var prod = String(rows[i][1] || "").trim();
    if (cat) lastCat = cat;
    if (!prod) continue;
    if (!out[lastCat]) out[lastCat] = [];
    out[lastCat].push(prod);
  }
  return out;
}

/* ---------- Email raport de tură ---------- */
function sendShiftEmail(state) {
  if (!state) return;
  var s = state, html = [];
  html.push("<h2 style='font-family:Georgia,serif'>SEND — Raport tură " + (s.date || todayStr()) + "</h2>");

  html.push("<h3>Echipă</h3><p>" + (s.team || []).map(function (t) { return t.name + " (" + t.zone + ")"; }).join(", ") + "</p>");

  // remindere problematice
  var prob = (s.remLog || []).filter(function (r) {
    return (r.id === "tel" && r.resp === "Da") || (r.id === "prez" && r.resp === "Nu");
  });
  if (prob.length) {
    html.push("<h3 style='color:#b54'>Semnalări</h3><ul>");
    prob.forEach(function (r) { html.push("<li>" + r.time + " — " + r.t + " → " + r.resp + "</li>"); });
    html.push("</ul>");
  }

  // casă
  if (s.cash) {
    var c = s.cash;
    html.push("<h3>Casă (Raport Z)</h3><ul>" +
      "<li>Cash: " + ron(c.cash) + " · Card: " + ron(c.card) + " · Ia loc.: " + ron(c.ialoc) + "</li>" +
      "<li><b>Total Z: " + ron(c.ztot) + "</b></li>" +
      "<li>Sold ziua precedentă: " + ron(c.soldPrev) + "</li>" +
      "<li>Valoare cash: " + ron(c.valCash) + " · Plăți cash: " + ron(c.platiCash) + "</li>" +
      "<li><b>Sold final: " + ron(c.soldFinal) + "</b></li></ul>");
  }

  // consum & pierderi
  if (s.loss) {
    html.push("<h3>Consum &amp; pierderi</h3>");
    html.push(listBlock("Consum personal", (s.loss.consum || []).filter(r => r.p), r => r.p + " — " + r.c));
    html.push(listBlock("Pahare sparte", (s.loss.pahare || []).filter(r => r.t), r => r.t + " — " + r.n));
    html.push(listBlock("Alte pierderi", (s.loss.alte || []).filter(r => r.d), r => r.d + " — " + r.c));
  }

  // inventar (doar nr. produse numărate)
  if (s.inv) {
    var n = Object.keys(s.inv).filter(function (k) { return s.inv[k] !== "" && s.inv[k] != null; }).length;
    html.push("<h3>Inventar de seară</h3><p>" + n + " produse numărate (detalii în Sheet).</p>");
  }

  // checklist final
  if (s.final) {
    html.push("<h3>Checklist final</h3><ul>");
    Object.keys(s.final).forEach(function (i) {
      var f = s.final[i];
      html.push("<li>" + (f.facut ? "Făcut: " + f.facut + " · Verificat: " + f.verif : "—") + (f.photo ? " · 📷" : "") + "</li>");
    });
    html.push("</ul>");
  }

  // salvează datele în Sheet și arhivează starea
  logRow("CLOSE", { date: s.date, state: "vezi Stare zilnică" });
  saveState(s.date, s);

  MailApp.sendEmail({
    to: CONFIG.REPORT_EMAIL,
    subject: "SEND — Raport tură " + (s.date || todayStr()),
    htmlBody: html.join("")
  });
}
function listBlock(title, arr, fn) {
  if (!arr.length) return "";
  return "<p><b>" + title + ":</b></p><ul>" + arr.map(function (r) { return "<li>" + fn(r) + "</li>"; }).join("") + "</ul>";
}
function ron(n) { n = Number(n) || 0; return n.toLocaleString("ro-RO", { minimumFractionDigits: 2 }) + " RON"; }
function todayStr() {
  var d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function pad(n) { return String(n).padStart(2, "0"); }

/* ---------- Plasă de siguranță: email automat la final de zi ----------
 * Rulează o dată, manual: setupTriggers().
 * Notă: declanșatorul orar Apps Script nu e precis la minut; trimiterea
 * exactă de la 23:58 e condusă de aplicație (PWA). Acesta e doar backup.
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "autoCloseEmail") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("autoCloseEmail").timeBased().atHour(23).everyDays(1).create();
}
function autoCloseEmail() {
  // dacă există stare salvată azi și nu a fost închisă, trimite oricum
  var f = getFolder(root(), "Stare zilnică");
  var it = f.getFilesByName(todayStr() + ".json");
  if (!it.hasNext()) return;
  var state = JSON.parse(it.next().getBlob().getDataAsString());
  if (state && !state._emailSent) {
    sendShiftEmail(state);
    state._emailSent = true;
    saveState(todayStr(), state);
  }
}
