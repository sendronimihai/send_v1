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
index.html          → aplicația (toate ecranele + flux + porți + remindere)
Code.gs             → backend Apps Script
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
- **Porți (gates):** tura nu pornește până nu e bifat checklist-ul de dimineață. Închiderea (de la 22:00) trece obligatoriu prin: Inventar → Consum & pierderi → Casă (Z+sold) → Checklist final.
- **Checklist final:** „cine a verificat" trebuie să fie altă persoană decât „cine a făcut" (impus).
- **Email:** la „Închide tura" pleacă pe loc; altfel reminder din 2 în 2 min 23:50–23:56; trimitere automată la 23:58.
- **Casă:** Total Z = cash + card + ia loc; Valoare cash = sold precedent + Z cash; Sold final = valoare cash − plăți cash. Soldul NU se preia automat a doua zi.
- **Poze:** structură Drive `Poze/[Categorie]/[Data]/[Fereastra]/`.
- Lista de produse vine din Sheet (col A = Categorie, col B = Produs); editarea Sheet-ului actualizează aplicația.

## Stare actuală (implementat)
Toate ecranele, fluxul complet, porțile, motorul de remindere (în-app, cu sunet), reconcilierea casei, checklist-ul final, backend-ul (date/poze/email), PWA instalabilă.

## De făcut / deschise (pot fi cerute pe rând)
- Pornire muzică (reminder zilnic la deschidere)
- Încărcare POS + telefon ca task separat de seară
- Etichetare/FIFO la bar (zilnic)
- Buton „Recepție marfă"
- Itemizarea pregătirii de bar de dimineață (în loc de o singură întrebare „Procedura 1")
- Verificare Total Z calculat vs Z printat
- Diferență casă (numărat fizic vs sold final) + observații pentru mâine
- Mutarea PIN-ului de manager în backend (securitate)
- Editarea reminderelor din interfață, protejată cu PIN
- Notificări când aplicația e închisă (necesită mecanism suplimentar)

## Cum se testează rapid
Deschide `index.html` într-un browser. Merge standalone (local). Pentru poze/email, completează `CONFIG.BACKEND_URL` cu URL-ul Web App din Apps Script.
