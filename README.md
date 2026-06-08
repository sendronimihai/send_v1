# SEND — aplicația. Instrucțiuni de instalare

Ai aici aplicația completă, gata de pus în funcțiune. Conține:

| Fișier | Ce e |
|---|---|
| `index.html` | Aplicația în sine (toate ecranele, fluxul, porțile, reminderele) |
| `manifest.json` + `icon.svg` + `service-worker.js` | Fac aplicația instalabilă pe tabletă, ca o aplicație normală |
| `Code.gs` | Backend-ul (scrie în Drive/Sheets, urcă pozele, trimite emailul) |

Aplicația **merge și fără backend** — salvează totul local pe tabletă. Backend-ul adaugă: scriere în Drive/Sheets, poze în foldere și email automat. Recomand să o pornești întâi local (Pașii 4–5), apoi să conectezi backend-ul (Pașii 1–3).

---

## Pasul 1 — Sheet-ul de produse

Aplicația citește lista de produse din Google Sheet-ul tău (cel din specificație). Pune-l în formatul:

- **Coloana A:** Categorie (ex. „Bere")
- **Coloana B:** Produs (ex. „Corona")

Categoria se poate repeta pe fiecare rând. Primul rând e antet. Atât — când adaugi un produs nou în Sheet, apare automat în aplicație.

> Dacă nu setezi backend-ul, aplicația folosește lista încorporată (toate produsele din specificație).

---

## Pasul 2 — Backend-ul (Google Apps Script)

1. Mergi pe [script.google.com](https://script.google.com) → **New project**.
2. Șterge tot și lipește conținutul din `Code.gs`.
3. Sus în `CONFIG`, completează **`REPORT_EMAIL`** cu adresa unde vrei raportul. Verifică și `PRODUCTS_SHEET_ID`.
4. **Deploy → New deployment** → tip **Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - **Deploy** → autorizezi accesul la Google (Drive, Gmail) când îți cere.
5. Copiază **Web app URL** (se termină în `/exec`).
6. (O singură dată) Rulează funcția **`setupTriggers`** din editor — adaugă plasa de siguranță pentru emailul de seară.

---

## Pasul 3 — Conectează aplicația la backend

În `index.html`, sus în blocul `CONFIG`, pune URL-ul copiat:

```js
const CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/XXXXX/exec",
  ...
};
```

Tot acolo poți schimba `MANAGER_PIN` (PIN-ul de manager).

---

## Pasul 4 — Pune aplicația online (gratuit, GitHub Pages)

1. Creează un repository pe GitHub (ex. `send-app`).
2. Urcă toate fișierele din acest folder.
3. În repo: **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. După ~1 minut primești un link de forma `https://utilizatorul-tau.github.io/send-app/`.

---

## Pasul 5 — Instalează pe tabletă

1. Deschide linkul de mai sus în **Chrome** pe tabletă.
2. Meniul Chrome (⋮) → **Adaugă la ecranul principal** / **Install app**.
3. Apare ca aplicație normală, pe tot ecranul. Gata.

> Ține tableta deschisă pe aplicație în timpul programului — reminderele și sunetul funcționează cât aplicația e activă.

---

## Cum curge o zi în aplicație

1. **Deschizi app** → alegi cine lucrează + zona fiecăruia → *Continuă*.
2. **Checklist de dimineață** → tura nu pornește până nu e bifat tot → *Începe tura*.
3. **Dashboard** toată ziua; reminderele apar singure ca pop-up; *Pagina zilei* are taskurile zilei.
4. **De la 22:00** apeși *Închide tura* → trece prin porți: **Inventar → Consum & pierderi → Casă (Z + sold) → Checklist final** → trimite raportul.
5. Dacă nu s-a apăsat, între **23:50 și 23:56** sună din 2 în 2 min, iar la **23:58** raportul pleacă automat.

---

## Note și limitări (de știut)

- **Remindere & sunet:** funcționează cât aplicația e deschisă pe tabletă (cazul tău — tableta stă în locație). Notificări când app-ul e complet închis ar necesita un pas în plus.
- **PIN-ul de manager** e momentan în cod (client). Pentru securitate reală, mutarea lui în backend e un pas ușor de făcut ulterior.
- **Pozele** se urcă în Drive doar cu backend-ul setat; structura `Poze/[Categorie]/[Data]/[Fereastra]/` se creează automat.

---

## Ce poți extinde în Claude Code (deciziile rămase deschise din specificație)

- Pornire muzică, încărcare POS+telefon, FIFO la bar, buton „Recepție marfă"
- Itemizarea pregătirii de bar de dimineață
- Verificare Total Z vs Z printat
- Diferență casă (numărat fizic vs sold), observații pentru mâine
- Editarea reminderelor din interfață, protejată cu PIN

Dă acest folder + `SEND_Specificatie_Aplicatie.md` lui Claude Code și poți construi mai departe oricare dintre ele.
