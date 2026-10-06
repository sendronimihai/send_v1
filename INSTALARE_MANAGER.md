# SEND · Manager — Instalare și utilizare

Aplicația de manager se adaugă **în același proiect Apps Script** ca aplicația angajaților. Nu strică nimic din ce există — doar adaugă.

## Instalare (o singură dată, ~5 minute)

1. **Deschide proiectul Apps Script** existent (cel cu backend-ul SEND).
2. **Înlocuiește conținutul `Code.gs`** cu `Code.gs` din acest repo (conține backend-ul angajaților neatins + modulul Manager la final).
3. **Adaugă fișierul HTML:** în editor, `+` → `HTML` → numește-l exact **`manager`** (fără `.html`) → lipește conținutul din `manager.html` din acest repo.
4. **Rulează o dată `setupManagerTriggers`** (selectezi funcția din bara de sus → Run → acceptă permisiunile). Asta activează crearea automată a sheet-ului lunii următoare, cu o zi înainte de data de 1, între orele 5–6 dimineața.
5. **Redeployează:** Deploy → Manage deployments → ✏️ → New version → Deploy. *(Important: versiune nouă pe deployment-ul existent, ca URL-ul să rămână același pentru angajați.)*

## Accesare

- Aplicația se deschide la: **`URL_WEB_APP?page=app`** (URL-ul web app existent, cu `?page=app` la final).
- Salveaz-o pe ecranul telefonului: deschide linkul în Chrome/Safari → meniu → „Adaugă la ecranul principal".
- **Angajații** deschid același link: văd rapoartele, graficele, jurnalul și pozele — ale tuturor (transparență totală). Nu pot adăuga sau șterge nimic.
- **Tu:** apasă 🔒 din dreapta sus → introdu PIN-ul de manager: **2026** (același `MANAGER_PIN` din Script Properties, folosit și de aplicația tabletei). Apare butonul **+** și opțiunile de ștergere.

## Utilizare zilnică (mod manager)

- **+** → alegi tipul: **Sarcină / Bonus / Penalizare / Vânzări**.
- **Persoane:** bifezi una, mai multe sau „Toată echipa" — se creează câte o înregistrare pentru fiecare, cu aceeași valoare, comentariu și poze. La Vânzări se alege o singură persoană (cine nu vinde: notezi 0).
- **Sarcină neîndeplinită:** aplicația îți propune penalizarea din catalog; o poți modifica sau lăsa 0 (doar sarcină ratată, fără bani).
- **Poze:** până la 5 per înregistrare; alegi folderul (Bonusuri/Penalizări); în Drive ajung în `SEND/Bonusuri/AAAA-LL-ZZ/` respectiv `SEND/Penalizari/AAAA-LL-ZZ/` — folderul cu data zilei se creează singur.
- **Bilanț în timp real:** când selectezi persoanele în formular, vezi imediat bilanțul zilei (bonusuri − penalizări) al fiecăreia; cardurile din raport se actualizează la fiecare salvare.
- **Catalog:** ține apăsat pe **+** (sau click-dreapta pe desktop) → editezi bonusurile/penalizările predefinite și valorile lor.

## Rapoarte

- Filtre: persoană (sau „Toți") × perioadă (**Zi / Săptămână / Lună**, săptămâna = luni–duminică) × orice dată din calendar, inclusiv luni trecute.
- Carduri: **Eficiență** (ceașca se umple), **Bilanț**, **Vânzări**, **Medie/tranzacție**, **Sarcini**.
- Grafice: eficiență pe zile, vânzări + medie/tranzacție, bonusuri vs. penalizări, comparație pe toată echipa.
- **Formula de eficiență** (afișată transparent): (sarcini îndeplinite + bonusuri) ÷ (total sarcini + bonusuri + penalizări) × 100.

## Datele

- Totul stă în Drive: `SEND/SEND – Manager` — un tab pe lună (`2026-08`, `2026-09`…), plus taburile **Echipă** (lista de nume — o editezi direct acolo dacă se schimbă echipa) și **Catalog**.
- Lista inițială de nume: Cipri, Samir, Bishma, Asmita, Ranjana, Sushma, Sujata — scrise exact ca în aplicația tabletei. Dacă cineva nu trebuie urmărit aici (ex. managerul), șterge-i rândul din tabul **Echipă**.
- Datele de manager sunt **complet separate** de cele ale turelor (`SEND – Date` / `Stare zilnică`). Emailul de seară nu se schimbă.
- Tabul lunii următoare se creează automat cu o zi înainte de 1; există și o plasă de siguranță: dacă lipsește, se creează la prima înregistrare.

## Actualizări viitoare

Orice modificare = editezi `Code.gs` sau `manager` în editor → Deploy → New version. Gratuit, fără hosting, fără altceva.
