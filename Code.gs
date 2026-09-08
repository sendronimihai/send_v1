/*****************************************************************
 * SEND — Backend (Google Apps Script)
 * Rol: primește datele de la aplicație (PWA), le scrie în Google
 * Sheets, urcă pozele în Drive pe structura de foldere și trimite
 * raportul pe email la final de tură.
 *
 * ▼ Conține și modulul MANAGER (secțiunea de la finalul fișierului):
 *   - aplicația de manager se deschide la:  URL_WEB_APP?page=app
 *   - datele de manager stau în „SEND – Manager" (sheet-uri lunare)
 *   - pozele merg în SEND/Bonusuri/[data] și SEND/Penalizari/[data]
 *   - rulează O DATĂ setupManagerTriggers() ca să activezi crearea
 *     automată a sheet-ului lunii următoare (cu o zi înainte de 1).
 *
 * DEPLOY: vezi README.md (Extensions → Apps Script → Deploy → Web app).
 *****************************************************************/

const CONFIG = {
  ROOT_FOLDER_NAME: "SEND",            // folderul rădăcină în Drive
  REPORT_EMAIL: "sendroni.mihai@gmail.com",   // destinatarul raportului
  PRODUCTS_SHEET_ID: "1kz0Yy-vcJ6MYTqJgt9D3zMHNg84AQppFVTk6do-5Hj8",
  // ▼ Manager — numele scrise exact ca în aplicația angajaților
  MANAGER_SPREADSHEET_NAME: "SEND – Manager",
  TEAM_DEFAULT: ["Cipri", "Samir", "Bishma", "Asmita", "Ranjana", "Sushma", "Sujata"]
};

/* ---------- Router ---------- */
function doGet(e) {
  // Aplicația de manager (HTML) se servește la ?page=app
  if (e && e.parameter && e.parameter.page === "app") {
    return HtmlService.createHtmlOutputFromFile("manager")
      .setTitle("SEND · Manager")
      .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return json({ ok: true, service: "SEND backend" });
}

function doPost(e) {
  var out = { ok: true };
  try {
    var req = JSON.parse(e.postData.contents);
    switch (req.action) {
      case "getProducts": var gp = getProducts(req.sheetId || CONFIG.PRODUCTS_SHEET_ID); out.products = gp.products; out.mins = gp.mins; break;
      case "uploadPhoto": out.url = savePhoto(req.photo, req.categorie, req.fereastra, req.date); break;
      case "verifyPin":   out.valid = (String(req.pin || "") === getManagerPin()); break;
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

/* ---------- PIN manager ----------
 * Setare: Apps Script editor → Setări proiect → Script Properties →
 * adaugă cheia MANAGER_PIN. Dacă lipsește, se folosește valoarea implicită.
 */
function getManagerPin() {
  var p = PropertiesService.getScriptProperties().getProperty("MANAGER_PIN");
  return p || "2026";
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
 * Format așteptat în Sheet (foaia 1): col A = Categorie, col B = Produs,
 * col C = stoc minim (opțional — sub minim produsul intră pe lista de comandat).
 * (Categoria se poate repeta pe fiecare rând al produsului.)
 */
function getProducts(sheetId) {
  var sh = SpreadsheetApp.openById(sheetId).getSheets()[0];
  var rows = sh.getDataRange().getValues();
  var out = {}, mins = {}, lastCat = "Diverse";
  for (var i = 1; i < rows.length; i++) {       // i=1: sare peste antet
    var cat = String(rows[i][0] || "").trim();
    var prod = String(rows[i][1] || "").trim();
    var min = rows[i][2];
    if (cat) lastCat = cat;
    if (!prod) continue;
    if (!out[lastCat]) out[lastCat] = [];
    out[lastCat].push(prod);
    if (min !== "" && min != null && !isNaN(min)) {
      if (!mins[lastCat]) mins[lastCat] = {};
      mins[lastCat][prod] = Number(min);
    }
  }
  return { products: out, mins: mins };
}

/* ---------- Email raport de tură ---------- */
function sendShiftEmail(state) {
  if (!state) return;
  var s = state, html = [];
  html.push("<h2 style='font-family:Georgia,serif'>SEND — Raport tură " + (s.date || todayStr()) + "</h2>");

  html.push("<h3>Echipă</h3><p>" + (s.team || []).map(function (t) { return t.name + " (" + t.zone + ")"; }).join(", ") + "</p>");

  // progres sarcini zilnice — complete = bifate + cel puțin o poză
  if (s.progress && s.progress.total) {
    var pc = s.progress.pct;
    var col = pc >= 100 ? "#2e7d32" : (pc >= 50 ? "#c98a00" : "#b54");
    html.push("<h3>Progres sarcini zilnice</h3><p style='color:" + col + ";font-size:16px'><b>" + pc + "%</b> — " +
      s.progress.done + "/" + s.progress.total + " sarcini complete (bifate + poză)</p>");
  }

  // pregătire dimineață — cine a făcut / cine a verificat
  if (s.morning) {
    var secName = { barsala: "Bar/Terasă/Sală", bucatarie: "Bucătărie" };
    var morn = [];
    Object.keys(secName).forEach(function (k) {
      if (s.morning[k + "_facut"] || s.morning[k + "_verif"])
        morn.push(secName[k] + ": făcut de " + (s.morning[k + "_facut"] || "—") + ", verificat de " + (s.morning[k + "_verif"] || "—"));
    });
    if (morn.length) html.push("<h3>Pregătire dimineață</h3><p>" + morn.join("<br>") + "</p>");
  }

  // curățenie săptămânală — confirmările „făcut + verificat"
  var wk = (s.remLog || []).filter(function (r) { return r.facut && r.verif; });
  if (wk.length) {
    html.push("<h3>Curățenie săptămânală</h3><ul>");
    wk.forEach(function (r) { html.push("<li>" + r.t + " — făcut de " + r.facut + ", verificat de " + r.verif + " (" + r.time + ")</li>"); });
    html.push("</ul>");
  } else if (s.weeklyTask) {
    html.push("<h3 style='color:#b54'>Curățenie săptămânală</h3><p>⚠ Neconfirmată azi: " + s.weeklyTask + "</p>");
  }

  // remindere problematice
  var prob = (s.remLog || []).filter(function (r) {
    return (r.id === "tel" && r.resp === "Da") || (r.id === "prez" && r.resp === "Nu");
  });
  if (prob.length) {
    html.push("<h3 style='color:#b54'>Semnalări</h3><ul>");
    prob.forEach(function (r) { html.push("<li>" + r.time + " — " + r.t + " → " + r.resp + "</li>"); });
    html.push("</ul>");
  }

  // pop-up-uri fără răspuns — apărute pe tabletă, dar la care nu s-a apăsat niciun buton
  var pend = [];
  if (s.remPending) Object.keys(s.remPending).forEach(function (k) { pend.push(s.remPending[k]); });
  if (pend.length) {
    pend.sort(function (a, b) { return String(a.time || "").localeCompare(String(b.time || "")); });
    html.push("<h3 style='color:#b54'>Pop-up-uri fără răspuns: " + pend.length + "</h3><ul>");
    pend.forEach(function (p) { html.push("<li>" + (p.time || "—") + " — " + (p.t || p.id) + "</li>"); });
    html.push("</ul>");
  } else {
    html.push("<h3>Pop-up-uri fără răspuns: 0</h3><p>Toate reminderele au primit răspuns. ✓</p>");
  }

  // mod „cafenea aglomerată" — remindere oprite manual de operator
  if (s.busyLog && s.busyLog.length) {
    html.push("<h3 style='color:#c98a00'>Cafenea aglomerată (remindere oprite): " + s.busyLog.length +
      (s.busyLog.length === 1 ? " activare" : " activări") + "</h3><ul>");
    s.busyLog.forEach(function (b) {
      html.push("<li>" + (b.from || "—") + " – " + (b.to || "până la închiderea turei") + "</li>");
    });
    html.push("</ul>");
  }

  // casă
  if (s.cash) {
    var c = s.cash;
    var diffTxt = function (given, calc) {
      var d = given - calc;
      return Math.abs(d) < 0.01 ? " — corespunde ✓" : " — diferență " + (d > 0 ? "+" : "") + ron(d) + " ⚠";
    };
    var rows = [
      "Cash: " + ron(c.cash) + " · Card: " + ron(c.card) + " · Ia loc.: " + ron(c.ialoc),
      "<b>Total Z (calculat): " + ron(c.ztot) + "</b>"
    ];
    if (c.zPrinted != null) rows.push("Z printat: " + ron(c.zPrinted) + diffTxt(c.zPrinted, c.ztot));
    rows.push("Sold ziua precedentă: " + ron(c.soldPrev));
    rows.push("Valoare cash: " + ron(c.valCash) + " · Plăți cash: " + ron(c.platiCash));
    rows.push("<b>Sold final: " + ron(c.soldFinal) + "</b>");
    if (c.cashCounted != null) rows.push("Numărat fizic în casă: " + ron(c.cashCounted) + diffTxt(c.cashCounted, c.soldFinal));
    if (c.notes) rows.push("Observații pentru mâine: " + c.notes);
    html.push("<h3>Casă (Raport Z)</h3><ul><li>" + rows.join("</li><li>") + "</li></ul>");
  }

  // consum & pierderi
  if (s.loss) {
    html.push("<h3>Consum &amp; pierderi</h3>");
    html.push(listBlock("Consum personal", (s.loss.consum || []).filter(r => r.p), r => r.p + " — " + r.c));
    html.push(listBlock("Pahare sparte", (s.loss.pahare || []).filter(r => r.t), r => r.t + " — " + r.n));
    html.push(listBlock("Alte pierderi", (s.loss.alte || []).filter(r => r.d), r => r.d + " — " + r.c));
  }

  // recepție marfă
  if (s.receptii && s.receptii.length) {
    html.push("<h3>Recepție marfă</h3><ul>");
    s.receptii.forEach(function (r) {
      var flag = (r.cantitate === "Nu" || r.stare === "Nu") ? " — ⚠ de verificat" : " — ✓ ok";
      html.push("<li>" + r.time + " — " + (r.furnizor || "—") + " · recepționat de " + r.cine +
        " · cantitate corespunde: " + r.cantitate + " · stare bună: " + r.stare + flag +
        (r.obs ? " · Obs: " + r.obs : "") + "</li>");
    });
    html.push("</ul>");
  }

  // urgent / necesar azi
  if (s.urgent && s.urgent.trim()) {
    html.push("<h3 style='color:#b54'>⚠ Urgent / Necesar azi</h3><p style='white-space:pre-wrap'>" + s.urgent + "</p>");
  }

  // inventar de seară — stocuri complete
  if (s.inv_named && Object.keys(s.inv_named).length) {
    html.push("<h3>Inventar de seară</h3>");
    Object.keys(s.inv_named).forEach(function (cat) {
      html.push("<p style='margin:8px 0 2px'><b>" + cat + "</b></p><ul style='margin:0'>");
      s.inv_named[cat].forEach(function (o) {
        var subMin = s.order && s.order.some(function (ord) { return ord.p === o.p && ord.cat === cat; });
        html.push("<li>" + o.p + ": <b>" + o.qty + "</b>" +
          (o.nc ? " <i style='color:#b54'>(necompletat)</i>" : "") + (subMin ? " ⚠" : "") + "</li>");
      });
      html.push("</ul>");
    });
  } else if (s.inv) {
    var n = Object.keys(s.inv).filter(function (k) { return s.inv[k] !== "" && s.inv[k] != null; }).length;
    html.push("<h3>Inventar de seară</h3><p>" + n + " produse numărate.</p>");
  }

  // necesar de comandat (sub minim) — marcat cu ⚠ și în inventar
  if (s.order && s.order.length) {
    html.push("<h3 style='color:#b54'>Necesar de comandat (sub minim)</h3><ul>");
    s.order.forEach(function (o) {
      html.push("<li>" + o.p + " (" + o.cat + ") — stoc <b>" + o.have + "</b>, minim " + o.min + "</li>");
    });
    html.push("</ul>");
  }

  // checklist final
  if (s.final) {
    html.push("<h3>Checklist final</h3><ul>");
    Object.keys(s.final).forEach(function (i) {
      var f = s.final[i];
      html.push("<li>" + (f.facut ? "Făcut: " + f.facut + " · Verificat: " + f.verif : "—") + (f.photos ? " · 📷×" + f.photos : (f.photo ? " · 📷" : "")) + "</li>");
    });
    html.push("</ul>");
  }

  // salvează datele în Sheet și arhivează starea
  logRow("CLOSE", { date: s.date, state: "vezi Stare zilnică" });
  saveState(s.date, s);

  MailApp.sendEmail({
    to: CONFIG.REPORT_EMAIL,
    cc: CONFIG.REPORT_EMAIL,   // CC către sine — altfel Gmail nu arată emailul în Inbox
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

/* ---------- Fără trimitere automată ----------
 * Emailul pleacă DOAR la apăsarea butonului „Închide tura" din aplicație.
 * Dacă în trecut ai rulat setupTriggers() (vechea plasă de siguranță de la
 * ora 23), rulează O DATĂ funcția removeAutoEmailTriggers() din editor
 * (selecteaz-o sus și apasă Run) ca să ștergi declanșatorul vechi.
 */
function removeAutoEmailTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "autoCloseEmail") ScriptApp.deleteTrigger(t);
  });
}

/*****************************************************************
 *****************************************************************
 **                                                             **
 **                       MODUL MANAGER                         **
 **                                                             **
 **  Aplicație separată pentru manager + echipă, servită de      **
 **  același backend. Nu atinge nimic din aplicația tabletei.    **
 **  Se deschide la:  URL_WEB_APP?page=app                       **
 **                                                             **
 *****************************************************************
 *****************************************************************/

var MGR_HEADERS = ["ID", "Moment", "Data", "Persoana", "Tip", "Detaliu", "Status", "Valoare", "Tranzactii", "Comentariu", "Poze"];

/* Spreadsheet-ul managerului: SEND/„SEND – Manager" */
function mgrSS() {
  var r = root();
  var it = r.getFilesByName(CONFIG.MANAGER_SPREADSHEET_NAME);
  var ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create(CONFIG.MANAGER_SPREADSHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(r);
  }
  return ss;
}

/* Tab lunar „YYYY-MM" — se creează automat dacă lipsește */
function mgrMonthTab(ym) {
  var ss = mgrSS();
  var sh = ss.getSheetByName(ym);
  if (!sh) {
    sh = ss.insertSheet(ym);
    sh.appendRow(MGR_HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Tab „Echipă" — lista de nume (editabilă direct în Sheet sau din aplicație) */
function mgrTeamTab() {
  var ss = mgrSS();
  var sh = ss.getSheetByName("Echipă");
  if (!sh) {
    sh = ss.insertSheet("Echipă");
    sh.appendRow(["Nume"]);
    CONFIG.TEAM_DEFAULT.forEach(function (n) { sh.appendRow([n]); });
  }
  return sh;
}

/* Tab „Catalog" — bonusuri și penalități predefinite: Tip | Denumire | Valoare */
function mgrCatalogTab() {
  var ss = mgrSS();
  var sh = ss.getSheetByName("Catalog");
  if (!sh) {
    sh = ss.insertSheet("Catalog");
    sh.appendRow(["Tip", "Denumire", "Valoare"]);
    // câteva exemple de pornire — le poți edita/șterge din aplicație
    sh.appendRow(["Penalizare", "Sarcină neîndeplinită", 20]);
    sh.appendRow(["Penalizare", "Întârziere la program", 25]);
    sh.appendRow(["Penalizare", "Telefon în timpul serviciului", 15]);
    sh.appendRow(["Bonus", "Inițiativă / efort suplimentar", 25]);
    sh.appendRow(["Bonus", "Vânzări peste target", 50]);
  }
  return sh;
}

/* ---------- API unic pentru aplicația de manager (google.script.run) ---------- */
function mgrApi(req) {
  try {
    req = req || {};
    var a = req.action;

    // Acțiuni de CITIRE — deschise pentru toată echipa (transparență totală)
    if (a === "init") {
      return ok({
        team: mgrGetTeam(),
        catalog: mgrGetCatalog(),
        today: todayStr()
      });
    }
    if (a === "getRange") return ok({ rows: mgrGetRange(req.fromYm, req.toYm) });
    if (a === "verifyPin") return ok({ valid: String(req.pin || "") === getManagerPin() });

    // Acțiuni de SCRIERE — doar cu PIN de manager
    if (String(req.pin || "") !== getManagerPin()) return fail("PIN invalid");

    if (a === "addEntry")    return ok({ ids: mgrAddEntry(req.entry) });
    if (a === "deleteEntry") return ok({ deleted: mgrDeleteEntry(req.ym, req.id) });
    if (a === "saveCatalog") { mgrSaveCatalog(req.catalog); return ok({ catalog: mgrGetCatalog() }); }
    if (a === "saveTeam")    { mgrSaveTeam(req.team); return ok({ team: mgrGetTeam() }); }
    if (a === "uploadPhoto") return ok({ url: mgrSavePhoto(req.photo, req.folder, req.date) });

    return fail("Acțiune necunoscută: " + a);
  } catch (err) {
    return fail(String(err));
  }
}
function ok(o) { o = o || {}; o.ok = true; return o; }
function fail(msg) { return { ok: false, error: msg }; }

function mgrGetTeam() {
  var v = mgrTeamTab().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    var n = String(v[i][0] || "").trim();
    if (n) out.push(n);
  }
  return out;
}
function mgrSaveTeam(team) {
  var sh = mgrTeamTab();
  sh.clearContents();
  sh.appendRow(["Nume"]);
  (team || []).forEach(function (n) { if (String(n).trim()) sh.appendRow([String(n).trim()]); });
}

function mgrGetCatalog() {
  var v = mgrCatalogTab().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    var tip = String(v[i][0] || "").trim();
    var den = String(v[i][1] || "").trim();
    if (!tip || !den) continue;
    out.push({ tip: tip, denumire: den, valoare: Number(v[i][2]) || 0 });
  }
  return out;
}
function mgrSaveCatalog(catalog) {
  var sh = mgrCatalogTab();
  sh.clearContents();
  sh.appendRow(["Tip", "Denumire", "Valoare"]);
  (catalog || []).forEach(function (c) {
    if (c && c.denumire) sh.appendRow([c.tip || "Penalizare", c.denumire, Number(c.valoare) || 0]);
  });
}

/* O înregistrare = un rând în tabul lunii respective.
 * entry: { data:"YYYY-MM-DD",
 *          persoane: ["Nume1","Nume2",...]  (sau persoana:"Nume" — un singur om),
 *          tip: "Sarcina"|"Bonus"|"Penalizare"|"Vanzari",
 *          detaliu, status ("Îndeplinită"/"Neîndeplinită" — doar la Sarcina),
 *          valoare (RON — la Bonus/Penalizare = suma; la Vanzari = total vânzări),
 *          tranzactii (doar la Vanzari), comentariu, poze: [url, ...] }
 * Dacă sunt mai multe persoane, se scrie CÂTE UN RÂND PENTRU FIECARE —
 * aceeași sarcină/valoare/comentariu/poze — ca statisticile individuale
 * să rămână corecte. Returnează lista de ID-uri create.
 */
function mgrAddEntry(entry) {
  if (!entry || !entry.tip) throw "Înregistrare incompletă (tip).";
  var persoane = entry.persoane && entry.persoane.length ? entry.persoane
               : (entry.persoana ? [entry.persoana] : []);
  if (!persoane.length) throw "Selectează cel puțin o persoană.";
  var data = entry.data || todayStr();
  var ym = data.substring(0, 7);
  var sh = mgrMonthTab(ym);
  var now = new Date();
  var ids = [];
  persoane.forEach(function (p) {
    var id = Utilities.getUuid();
    ids.push(id);
    sh.appendRow([
      id, now, data, p, entry.tip,
      entry.detaliu || "", entry.status || "",
      Number(entry.valoare) || 0, Number(entry.tranzactii) || 0,
      entry.comentariu || "", (entry.poze || []).join(" | ")
    ]);
  });
  return ids;
}

function mgrDeleteEntry(ym, id) {
  var sh = mgrSS().getSheetByName(ym);
  if (!sh) return false;
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]) === String(id)) { sh.deleteRow(i + 1); return true; }
  }
  return false;
}

/* Citește toate rândurile din intervalul de luni [fromYm, toYm] (ex: "2026-08".."2026-09") */
function mgrGetRange(fromYm, toYm) {
  fromYm = fromYm || todayStr().substring(0, 7);
  toYm = toYm || fromYm;
  var ss = mgrSS();
  var out = [];
  ss.getSheets().forEach(function (sh) {
    var name = sh.getName();
    if (!/^\d{4}-\d{2}$/.test(name)) return;
    if (name < fromYm || name > toYm) return;
    var v = sh.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (!v[i][0]) continue;
      out.push({
        id: String(v[i][0]), ym: name,
        data: v[i][2] instanceof Date ? Utilities.formatDate(v[i][2], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(v[i][2]),
        persoana: String(v[i][3]), tip: String(v[i][4]),
        detaliu: String(v[i][5] || ""), status: String(v[i][6] || ""),
        valoare: Number(v[i][7]) || 0, tranzactii: Number(v[i][8]) || 0,
        comentariu: String(v[i][9] || ""),
        poze: String(v[i][10] || "").split(" | ").filter(function (x) { return x; })
      });
    }
  });
  return out;
}

/* Poze manager: SEND/Bonusuri/[data]/ sau SEND/Penalizari/[data]/ (max 5 per înregistrare — limitat în aplicație) */
function mgrSavePhoto(dataUrl, folder, date) {
  folder = (folder === "Bonusuri") ? "Bonusuri" : "Penalizari";
  var parts = dataUrl.split(",");
  var meta = parts[0];
  var mime = (meta.match(/data:(.*?);/) || [, "image/jpeg"])[1];
  var ext = mime.split("/")[1] || "jpg";
  var bytes = Utilities.base64Decode(parts[1]);
  var name = folder + "_" + new Date().getTime() + "." + ext;
  var blob = Utilities.newBlob(bytes, mime, name);

  var fTop = getFolder(root(), folder);              // SEND/Bonusuri sau SEND/Penalizari
  var fDate = getFolder(fTop, date || todayStr());   // subfolder cu data zilei
  var file = fDate.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/* ---------- Sheet-ul lunii următoare, creat automat cu o zi înainte de 1 ----------
 * Rulează O DATĂ setupManagerTriggers() din editor (selectează funcția sus → Run).
 * Declanșatorul rulează zilnic între 5-6 dimineața; când „mâine" este ziua 1,
 * creează tabul lunii următoare. Verifică și existența tabului lunii curente.
 */
function setupManagerTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "mgrDailyTick") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("mgrDailyTick").timeBased().everyDays(1).atHour(5).create();
}
function mgrDailyTick() {
  var now = new Date();
  mgrMonthTab(Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM")); // plasă de siguranță
  var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (tomorrow.getDate() === 1) {
    mgrMonthTab(Utilities.formatDate(tomorrow, Session.getScriptTimeZone(), "yyyy-MM"));
  }
}
