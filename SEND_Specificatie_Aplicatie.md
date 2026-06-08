# SEND — Specificația aplicației
### Document de pornire pentru build

---

## 1. Scop și principii

Aplicație internă pentru cafeneaua **SEND**, care:
- ghidează personalul de la deschidere până la închidere,
- reamintește sarcinile prin pop-up și alarme,
- urmărește stocul, consumul și pierderile,
- reconciliază casa la final de tură,
- trimite automat un raport pe email la finalul zilei,
- scrie toate datele în Google Drive în timp real.

**Cerințe de bază:** gratuită, fără costuri de mentenanță, ușor de actualizat, rulează pe Android (tabletă), iOS și Windows.

---

## 2. Arhitectură tehnică

| Componentă | Soluție | De ce |
|---|---|---|
| Interfață | PWA (aplicație web instalabilă) | Un singur cod pentru Android / iOS / Windows; update instant, fără magazine de aplicații |
| Dispozitiv principal | Tabletă Samsung Android, partajată, în locație | Pop-up + alarme funcționează curat pe Android |
| Backend | Google Apps Script (gratuit) | Trimite email, rulează declanșatoare programate, scrie în Sheets/Drive |
| Date | Google Sheets + Google Drive (folder `SEND`) | Vizibile oricând de pe telefon/PC, ușor de editat |
| Email | Apps Script (Gmail / MailApp) | Trimitere automată gratuită |
| Notificări | Pop-up + sunet pe tabletă | Apar peste orice ecran |

- **Cost:** zero. **Mentenanță:** zero.
- **Actualizare conținut** (produse, echipă): se editează direct în Sheet-urile de configurare, fără cod.
- **Actualizare funcțională:** se editează codul (în Claude Code).
- **Build:** se realizează în Claude Code (proiect cu fișiere multiple, menținut în timp).

---

## 3. Echipă și zone

**Echipa fixă:** Cipri, Samir, Bishma, Asmita, Ranjana, Sushma, Sujata.
**Persoană nouă:** câmp liber, completat manual — **temporar, doar pentru ziua respectivă, nu se salvează**.

**Zone de lucru:** Bar · Sală · Bucătărie.

---

## 4. Fluxul aplicației (cronologic)

```
DESCHIDERE APP
   │
   ▼
1. Pagina 1 — Selecție echipă + zonă   → scrie în Drive în timp real → „Continuă"
   │
   ▼
2. Pagina 2 — Checklist de dimineață    [POARTĂ: tura nu pornește până nu e bifat tot]
   │                                      → „Începe tura"
   ▼
3. Dashboard (toată ziua)
   │   ├─ Remindere pop-up/alarmă (pe parcursul zilei)
   │   └─ Pagina zilei (apare automat în ziua ei; nu blochează)
   ▼
DE LA 22:00 — zona de închidere se deschide
   │
   ├─ POARTĂ A: Inventar de seară (numărat tot)
   ├─ POARTĂ B: Consum & pierderi (completat)
   ├─ POARTĂ C: Reconciliere casă — Raport Z + sold   [alarmă 23:45–23:55, sunet maxim]
   └─ POARTĂ D: Checklist final (verificare în doi + poze)
   │
   ▼
EMAIL FINAL DE TURĂ
   • „Închide tura" → email pleacă pe loc
   • dacă nu s-a apăsat → reminder din 2 în 2 min (23:50, 23:52, 23:54, 23:56)
   • 23:58 → trimitere automată, oricum
```

---

## 5. Ecrane

### 5.1 Pagina 1 — Selecție echipă + zonă
- Se selectează cine lucrează azi (selecție multiplă din echipă).
- Câmp „persoană nouă" — temporar, nu se salvează.
- Fiecare persoană selectată își alege zona: Bar / Sală / Bucătărie.
- La „Continuă" se scrie instant în Drive: data, ora, persoană, zonă, tură.
- Datele curg mai departe în dashboard și în email.

### 5.2 Pagina 2 — Checklist de dimineață **[POARTĂ]**
- Apare automat după selecția echipei.
- **Tura pornește doar când tot checklist-ul e bifat.**
- Secțiunile apar doar pentru zonele care au pe cineva azi (zonă fără personal → secțiunea nu apare, nu se cere).

**BAR / TERASĂ / SALĂ**
- A fost făcută verificarea conform procedurii nr. 1? (Da/Nu) — buton spre Procedura 1 din Drive, RO și EN
- Lipsește ceva? (text liber, opțional, nu blochează)

**BUCĂTĂRIE**
- Aprins cuptorul
- Verificare temperatură frigidere
- Verificare / completare etichete produse desfăcute
- Pregătire salam / mozzarella
- Curat înainte de a începe ziua

### 5.3 Dashboard
- Sus: echipa pe tură cu zone, ora/data, indicator de remindere active.
- Sarcini azi (zilnice / săptămânale).
- Alerte stoc.
- Buton „Închide tura".
- **Fără bandă de KPI** (eliminată).

### 5.4 Remindere zilnice (pop-up + alarmă)
- Nu au pagină dedicată; apar ca pop-up peste orice ecran, cu sunet dacă e activat.
- Pop-up cu „Am făcut" / „Amână 10 min", sau „Da/Nu", sau verificare cu poză.
- Răspunsurile problematice și reminderele neconfirmate → apar în email.
- **Doar managerul** poate adăuga / opri / modifica remindere (cu PIN).
- (Lista completă în secțiunea 6.)

### 5.5 Pagina zilei (taskuri săptămânale)
- Apare automat **doar în ziua ei** (ex. joia apare doar pagina de joi).
- **Doar apare, se face în timpul zilei — nu blochează pornirea turei.**
- Răspuns: bifă „Am făcut" + poză opțională (cameră).
- (Lista completă în secțiunea 7.)

### 5.6 Inventar de seară **[POARTĂ, activ de la 22:00]**
- Lista de produse vine din Sheet-ul de configurare (editezi Sheet → apare în app).
- Produse grupate pe categorii pliabile + căutare.
- Fiecare produs: − / cantitate / + (acceptă fracții, ex. 0.25 = sfert de sticlă).
- **Obligatoriu înainte de „Închide tura".**
- Fără praguri minime — doar se notează cantitatea.
- La salvare: inventar datat în Drive.
- (Lista completă de produse în secțiunea 8.)

### 5.7 Consum & pierderi **[POARTĂ]**
- **Ce a consumat personalul:** rânduri cu produs + cantitate (text liber, fără „cine"). Adaugă câte rânduri vrei.
- **Ce pahare s-au spart azi:** butoane rapide pe tipuri (150ml / 300ml / 400ml / limonadă / sticlă) + număr; rând liber pentru alte tipuri.
- **Ce alte pierderi avem:** descriere liberă + cantitate.
- **Obligatoriu înainte de închidere.**
- Salvare datată în Drive; intră în email.

### 5.8 Reconciliere casă — Raport Z **[POARTĂ, fereastră cu alarmă 23:45–23:55]**
- Accesibilă după 22:00; pop-up + sunet maxim între 23:45 și 23:55.

**Operatorul scrie (Raport Z):**
- Cash
- Card
- Ia loc. *(mijloc de plată modern — a treia categorie de pe Z)*

**Aplicația calculează și afișează:**
- **Total Raport Z** = Cash + Card + Ia loc.

**Operatorul mai scrie:**
- Sold ziua precedentă *(manual, în fiecare seară — nu se preia automat)*
- Plăți cash (ieșiri)

**Aplicația calculează și afișează:**
- **Valoare cash** = Sold ziua precedentă + Raport Z cash
- **Sold final** = Valoare cash − Plăți cash *(afișat doar pentru verificare, nu se preia automat a doua zi)*

### 5.9 Checklist final — verificare în doi **[POARTĂ, fereastra finală]**
- Pentru fiecare punct: **cine a făcut**, **cine a verificat** (din echipa zilei) și **poză**.
- **Verificatorul trebuie să fie altă persoană decât cine a făcut** — impus de aplicație (avertisment + blocare dacă e aceeași persoană).
- Butonul „Trimite & închide" se aprinde doar când toate sunt complete și verificate corect.

Puncte:
1. Este curat în baie?
2. Este bucătăria curată?
3. Este curat în bar și în cafenea?
4. Mesele de pe terasă aranjate? Umbrele strânse?
5. Z + sold final verificate; telefoane, POS, tabletă puse la încărcat?

### 5.10 Email final de tură
- **Regulă de trimitere:** „Închide tura" → pleacă pe loc; altfel reminder din 2 în 2 min (23:50–23:56); trimitere automată la **23:58**.
- **Conținut:** echipa + zone, cine a închis, checklist dimineață, remindere problematice/neconfirmate, taskurile zilei, inventarul de seară, consum & pierderi, Raport Z (cash / card / ia loc / total) + sold final, checklist final (cine a făcut / verificat), linkuri către poze.

---

## 6. Remindere zilnice — listă completă

| # | Reminder | Program | Zonă | Răspuns |
|---|---|---|---|---|
| 1 | Verifică toaletele | La 2 ore (10–22) | Sală | Am făcut |
| 2 | Verifică frigiderele | 11:00 și 17:00 | Bar + Bucătărie | Am făcut |
| 3 | Cross-check bar | 09:45 | Bar | Am făcut |
| 4 | Verificare stoc prânz *(suc lămâie, felii lămâie + mentă, cafea ice coffee, lime, matcha, ceai Galaxy)* | 15:00 | Bar | Am făcut |
| 5 | Pregătire karaoke | Vineri 11:00 | Toți | Am făcut |
| 6 | Pune microfoanele la încărcat | Vineri 10:00 | Bar | Am făcut |
| 7 | Începe curățenia de seară | 23:00 | Toți | Am făcut |
| 8 | Avem personal unde sunt clienții? | Din oră în oră (deschidere–închidere) | Toți | Da/Nu („Nu" = problemă) |
| 9 | A stat cineva pe telefon cât au fost mese ocupate? | Din oră în oră (deschidere–închidere) | Toți | Da/Nu („Da" = problemă) |
| 10 | Verificare curățenie (bar / bucătărie / terasă / interior / baie) | De 3 ori pe zi | Toți | Da/Nu; la „Da" → poză per întrebare, urcată în Drive |

**Tipuri de recurență suportate:** la interval între ore · ore fixe multiple · o dată pe zi · săptămânal pe zi.

---

## 7. Taskuri săptămânale — pagina zilei

| Zi | Taskuri |
|---|---|
| Luni | Pompițe sirop · Frigidere · Măturat + spălat cafenea · Sub canapele · Baie |
| Marți | Rafturi alcool · Pahare alcool · Geamuri · Stoc arome + piure · Apă plante |
| Miercuri | Curat în vestiar + magazie |
| Joi | Oglinzi cafenea · Curățenie generală baie · Praf cafenea |
| Vineri | Băi |
| Sâmbătă | Băi · Apă plante · Curățenie generală bucătărie |
| Duminică | Băi |

Răspuns la fiecare: bifă „Am făcut" + poză opțională.

---

## 8. Stoc — produse (sursă: Google Sheet)

Lista trăiește în Sheet-ul de configurare. Editarea Sheet-ului actualizează automat aplicația.

- **Fructe + Verdeață:** Lămâi, Lime, Portocale, Mentă, Banane
- **Consumabile Bar:** Paie, Zahăr, Paletine, Pahare 150ml + capace, Pahare 300ml + capace, Pahare 400ml + capace, Pahare Limonadă + capace
- **Consumabile Băi + Cleaning:** Saci 60L, Saci 30L, Mănuși M/S, Săpun mâini, Săpun de vase, Hârtie mâini baie/bar, Soluție mop, Soluție spray, Clor, Dezinfectant, Microfibre + lavete, Cap de mop, Bureți vase, Parfumate WC
- **Bucătărie:** Caputo roșu, Caputo albastru, Semola, Sos roșii, Busuioc mic, Busuioc mare, Salam dolce, Salam picant, Drojdie, Ulei, Sos picant, Mozzarella, Sare, Paline
- **Bere:** Corona, Ursus, Ursus 0%, Ursus nefiltrată, Peroni, Ursus Cooler, Peroni KEG (tap)
- **Sucuri Limonade:** Portocale, Piersici, Ananas, Măr, Cranberry, Sprite, Schweppes, Aloe Vera, Sclipici, Ceai fasolea fluturilor, Matcha
- **Sucuri (mixere):** Cola 0,5L, Apă tonică 0,5L, Apă tonică roz 0,5L, Apă minerală 0,5L
- **Spirtoase:** Finlandia (Vodka), Jameson (Whiskey), Wild Turkey (Whiskey), Jose Cuervo (Tequila), Martell VS (Cognac), Aperol
- **Ginuri:** Beefeater Dry, Tanqueray Classic, Tanqueray 0%, Beefeater Pink, Bombay
- **Sucuri Gama Cola:** Cola, Cola 0%, Fanta, Sprite, Schweppes, Schweppes Pink, Dorna plată, Dorna minerală
- **Lichior:** Disaronno, Kahlua, Triple Sec Curacao, Jägermeister
- **Prosecco & Vinuri:** LaSalute, Caloian Alb, Caloian Rose, Caloian Roșu, Purcari Nocturne Alb, Purcari Nocturne Rose, Purcari Nocturne Roșu, Rose demidulce
- **Siropuri / Piureuri:** Caramel, Caramel sărat, Ciocolată, Vanilie, Hazelnut, Tiramisu, Coconut, Mint, Soc, Grenadine, Le Blue, piure Passion, piure Wildberry, piure Raspberry, piure Strawberry
- **Consumabile Cafea:** Cafea, Cafea Deco, Lapte, Lapte vegan, Frișcă, Ciocolată, Ceaiuri (Fructe / Ginger / Apple&C / Mint), Zahăr KG, Piscoturi, Patroane frișcă, Plicuri scorțișoară/chili/cacao, Miere, Zahăr plic

---

## 9. Porți și timing

**Poartă de dimineață:** Checklist dimineață → tura nu pornește până nu e bifat tot.

**Porți de seară (toate obligatorii înainte de „Închide tura"):**
1. Inventar de seară (numărat complet)
2. Consum & pierderi (completat)
3. Reconciliere casă (Z + sold)
4. Checklist final (verificare în doi + poze)

**Timing:**
- Zona de închidere accesibilă **de la 22:00**.
- Fereastra de casă: alarmă + **sunet maxim între 23:45 și 23:55**.
- Email: reminder din 2 în 2 min de la **23:50**; **trimitere automată la 23:58**.

---

## 10. Drive — structura de foldere (toată aplicația)

```
SEND/                          ← folder rădăcină
├── Configurare/
│   ├── Produse          (Sheet sursă — editezi aici, apare în app)
│   ├── Echipă & PIN
│   └── Remindere
│
├── Rapoarte/
│   ├── Raport zilnic    (Sheet — un rând pe zi, totalurile cheie)
│   └── Emailuri trimise (arhivă)
│
├── Operațional/         (Sheet-uri care adună rânduri, etichetate cu data)
│   ├── Ture (echipă + zone)
│   ├── Checklist dimineață
│   ├── Remindere – răspunsuri
│   ├── Inventar de seară
│   ├── Consum & pierderi
│   └── Casă (Z + sold)
│
└── Poze/
    └── [Categorie]/      (Baie · Bucătărie · Bar+Cafenea · Terasă · Casă/Tehnic)
        └── [Data]/       (ex. 2026-06-04)
            └── [Fereastra]/   (Checklist final · Verificare curățenie 14:00 · Pagina zilei)
                └── fișiere    (ex. baie_facut.jpg)
```

În Sheet-urile de raport rămâne și linkul către fiecare poză.

---

## 11. Acces și securitate

- **PIN de manager** pentru: adăugare / oprire / modificare remindere și editarea configurării.
- Restul aplicației: accesibil oricui de pe tabletă.

---

## 12. Decizii rămase deschise (de stabilit înainte sau în timpul build-ului)

- **Adăugiri din proceduri** (nedecise): pornire muzică (zilnic), încărcare POS + telefon ca task separat, etichetare/FIFO la bar, buton „Recepție marfă".
- **Itemizarea pregătirii de bar de dimineață** (sirop, suc lămâie, matcha, ceai Galaxy, fructe deshidratate, coji SEND) — momentan ascunsă sub „Procedura 1"; poate fi desfăcută în bife separate.
- **Verificare Total Z calculat vs Z printat** — propusă, nedecisă.
- **KPI** — eliminate; pot fi reintroduse ulterior.
- **Diferență casă** și **Observații pentru mâine** — lăsate afară; pot fi adăugate ulterior.

---

## 13. Următorul pas

Construirea aplicației în **Claude Code**, o singură dată, complet — pornind de la acest document.
```
1. Creare structură Drive + Sheet-uri de configurare
2. Backend Apps Script (scriere date, email, declanșatoare programate)
3. Interfață PWA (ecranele de mai sus)
4. Legare PWA ↔ Apps Script
5. Instalare pe tabletă + testare flux complet
```
