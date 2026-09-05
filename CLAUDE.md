# CLAUDE.md — context proiect SEND

> Fișier citit automat de Claude Code. Rezumă proiectul ca să poți continua build-ul fără re-explicații.
> Specificația completă: `SEND_Specificatie_Aplicatie.md`.

## Despre proiect
Aplicație operațională internă pentru cafeneaua **SEND** (Deva). Ghidează personalul de la deschidere la închidere: checklist-uri, remindere, inventar, consum/pierderi, reconciliere casă, raport pe email. Rulează pe o **tabletă Samsung Android partajată**, în locație.

## Stack & arhitectură
- **Frontend:** PWA, un singur fișier `index.html` (HTML + CSS + JS vanilla, fără framework, fără pas de build). Stare în `localStorage`, pe zi.
- **Backend:** Google Apps Script (`Code.gs`), publicat ca Web App. Scrie în Google Sheets, urcă poze în Drive, trimite emailul.
- **Date:** Google Sheets + Google Drive (folder `SEND`).
- **Cost:** zero. **Hosting:** GitHub Pages.

## Structura fișierelor
```
index.html          → aplicația angajaților, pe tabletă (ecrane + flux + porți + remindere)
manager.html        → aplicația de manager (bonusuri/penalizări/vânzări); se lipește în
                      Apps Script ca fișier HTML numit „manager", NU se servește din GitHub Pages
Code.gs             → backend Apps Script (comun ambelor aplicații; modulul manager la final)
manifest.json       → config PWA
icon.svg            → icon aplicație
service-worker.js   → offline + cache
README.md           → instrucțiuni de instalare/deploy
SEND_Specificatie_Aplicatie.md → specificația completă
```

## Convenții de cod
- Vanilla JS, fără dependențe, fără build. Tot frontend-ul stă în `index.html`.
- Interfața e în **română**. Păstrează tonul și etichetele existente.
- Culori/spațieri din variabilele CSS în `:root` (temă espresso/chihlimbar). Nu introduce framework-uri CSS.
- Configurarea editabilă e în obiectul `CONFIG` din `index.html` și în `CONFIG` din `Code.gs`.
- Backend-ul răspunde JSON; frontend-ul tolerează lipsa lui (merge și local).

## Reguli importante (nu le strica)
- **Porți (gates):** tura nu pornește până nu e bifat checklist-ul de dimineață. Închiderea (accesibilă oricând) trece obligatoriu prin: Inventar → Consum & pierderi → Casă (Z+sold) → Checklist final.
- **Închiderea nu se poate sări înainte:** etapa curentă se ține în `S.phase` (`inv`/`loss`/`cash`/`final`), deci un refresh readuce exact același ecran. Se poate merge **înapoi** un pas (butonul „← Înapoi" din bara de jos, `gateBack()`) — până la stoc; datele completate rămân salvate. Ieșirea din flux e doar butonul „Renunță la închidere", vizibil în prima etapă (inventar), ca o apăsare din greșeală să nu blocheze tura. Sumele din Casă se refac după refresh/întoarcere din `S.cashRaw`.
- **Inventar:** se completează și liber, oricând, din dashboard (poarta devine „← Înapoi"). La închidere poarta lasă să treci chiar cu produse necompletate, dar avertizează; produsele goale intră în raport cu **stoc 0** și marcate `nc:true` (afișat „(necompletat)" în email). Toate paginile rămân accesibile la orice oră (fără restricție după 22:00).
- **Checklist final:** „cine a verificat" trebuie să fie altă persoană decât „cine a făcut" (impus).
- **Email:** pleacă DOAR la apăsarea butonului „Închide tura", indiferent de oră. Fără trimitere automată. Reminder de avertizare din 2 în 2 min 23:50–23:56 dacă tura nu e închisă.
- **Ziua săptămânii** (inventar, pagina zilei, curățenia săptămânală, progres) se ia din `shiftDow()` = ziua din `S.date`, NU din ceasul de perete. O tură închisă după miezul nopții trebuie să raporteze categoriile zilei ei — altfel ce s-a numărat dispare din email.
- **Ziua aplicației:** NU trece automat pe ziua nouă la miezul nopții. Tura deschisă continuă (cheia `send_active_day` în localStorage) până se apasă „Închide tura"; ziua nouă începe abia după închidere.
- **Casă:** Total Z = cash + card + ia loc; Valoare cash = sold precedent + Z cash; Sold final = valoare cash − plăți cash. Soldul NU se preia automat a doua zi.
- **Poze:** structură Drive `Poze/[Categorie]/[Data]/[Fereastra]/`.
- Lista de produse vine din Sheet (col A = Categorie, col B = Produs); editarea Sheet-ului actualizează aplicația. Valorile din inventar se salvează pe **poziția** produsului în listă (`ci_ii`), deci lista trebuie să rămână stabilă în timpul turei: `loadProducts()` cache-uiește ultima listă descărcată (`send_products_v1`) și o folosește dacă backend-ul nu răspunde. **Nu edita Sheet-ul în timpul unei ture deschise** — pozițiile se schimbă și cifrele deja numărate s-ar lipi de alte produse.
- **Raportul de inventar din email** conține: toate categoriile zilei (golurile cu stoc 0) **+** orice altă categorie în care s-a numărat efectiv ceva (doar produsele completate, fără zerouri inventate). Nimic numărat nu trebuie să dispară din email.
- **Două aplicații, un singur backend:** `index.html` (tabletă, GitHub Pages) și `manager.html` (servită de Apps Script la `URL_WEB_APP?page=app`). Împart același `Code.gs`, același folder Drive `SEND` și același PIN, dar **datele sunt separate**: turele în `SEND – Date`/`Stare zilnică`, managerul în `SEND – Manager` (tab pe lună + Echipă + Catalog). Modificările la una nu o afectează pe cealaltă.
- **PIN manager:** 2026 (Script Property `MANAGER_PIN`; fallback-ul din cod e tot 2026).

## Stare actuală (implementat)
Toate ecranele, fluxul complet, porțile, motorul de remindere (în-app, cu sunet, editabile din interfață cu PIN de manager), reconcilierea casei (incl. Z printat vs calculat, sold numărat fizic), checklist-ul final, recepție marfă, backend-ul (date/poze/email/PIN), PWA instalabilă.

## De făcut / deschise (pot fi cerute pe rând)
- Notificări când aplicația e închisă (necesită mecanism suplimentar; utilizatorul instalează separat o aplicație kiosk)

## Cum se testează rapid
Deschide `index.html` într-un browser. Merge standalone (local). Pentru poze/email, completează `CONFIG.BACKEND_URL` cu URL-ul Web App din Apps Script.
