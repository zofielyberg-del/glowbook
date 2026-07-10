# 💳 Guide: Koppla Klarna via Stripe (15 enkla steg)

Denna guide är skriven för att pappa (eller administratören för Glowbook) enkelt ska kunna aktivera Klarna som betalningsmetod via Stripe-kontot. 

Följ stegen nedan i ordning:

---

### 🛠 Steg-för-steg-instruktioner

1. **Logga in på Stripe**  
   Gå till [dashboard.stripe.com](https://dashboard.stripe.com) i din webbläsare och logga in med dina Glowbook-uppgifter.

2. **Hitta Testläge / Live-läge**  
   Uppe i det högra hörnet finns ett reglage för **Test mode** (Testläge). Börja med att ha detta aktiverat så att du kan göra en test-aktivering först.  
   *(Obs: Du måste göra dessa steg en gång i Testläge och en gång i Live-läge).*

3. **Öppna Inställningar**  
   Klicka på kugghjuls-ikonen ⚙️ uppe i det högra hörnet för att öppna Stripes inställningar.

4. **Klicka på Betalningsmetoder**  
   Under rubriken **Payments** (Betalningar), klicka på länken **Payment methods** (Betalningsmetoder).

5. **Välj rätt konfiguration (Stripe Connect)**  
   Om du använder Stripe Connect (för salongernas underkonton), kontrollera om du behöver ställa in betalningsmetoder för din plattform eller för anslutna konton. Välj din standardkonfiguration (oftast kallad *Default* eller *Glowbook*).

6. **Hitta "Köp nu, betala senare"**  
   Scrolla ner på sidan tills du ser sektionen **Buy now, pay later** (Köp nu, betala senare). Där ligger Klarna.

7. **Aktivera Klarna**  
   Hitta **Klarna** i listan och klicka på knappen **Turn on** (Aktivera) eller **Request** (Begär).

8. **Godkänn Klarnas villkor**  
   Ett popup-fönster kommer att visas där du behöver läsa och godkänna Klarnas villkor. Klicka på **Confirm** (Bekräfta) eller **Accept**.

9. **Ange företagsinformation (vid behov)**  
   Stripe/Klarna kan be dig att fylla i några uppgifter om företaget, till exempel Glowbooks webbadress (URL), samt länkar till köpvillkor och integritetspolicy. Fyll i dessa om de efterfrågas.

10. **Vänta på godkännande (Test)**  
    Klarna gör en automatisk granskning. I testläget blir det oftast aktivt direkt. Statusen bredvid Klarna ska ändras till en grön bock och texten **Active** (Aktiv).

11. **Upprepa i Live-läge (Viktigt!)**  
    Slå av reglaget för **Test mode** i det övre högra hörnet så att du är i ditt riktiga live-läge. **Upprepa steg 3 till 10** så att Klarna även aktiveras för riktiga betalningar från riktiga kunder.  
    *(Obs: Granskningen i Live-läge kan ibland ta allt från några minuter upp till 1–2 bankdagar beroende på Klarnas köer).*

12. **Kontrollera kod-integrationen (Utvecklarsteg)**  
    Utvecklaren ser till att Glowbooks kod använder *Automatic Payment Methods* (automatiska betalningsmetoder). Då läser Stripe av inställningarna vi just gjorde och visar automatiskt Klarna för kunder i länder där Klarna stöds (t.ex. Sverige, Norge, Tyskland).

13. **Gör ett testköp**  
    Gå till Glowbooks testsida, välj en tjänst och gå till betalningen. Klarna ska nu dyka upp som ett val bredvid kortbetalning. Välj Klarna och genomför köpet med Stripes test-personnummer (t.ex. 19900101-0000).

14. **Verifiera i Stripe**  
    Gå tillbaka till Stripe Dashboard, klicka på fliken **Payments** (Betalningar) och kontrollera att din testbetalning har gått igenom och att det står *Klarna* som betalmetod.

15. **Klart! Lansera Live**  
    När Klarna är markerat som **Active** i Live-läge och testet har fungerat, kommer riktiga kunder automatiskt att kunna betala med Klarna på din hemsida!

---

> [!TIP]
> **Varför ser jag inte Klarna i kassan?**  
> Om Klarna inte syns beror det oftast på att:
> 1. Klarna inte har blivit godkänt ännu i Live-läge (steg 11).
> 2. Kundens valda valuta eller land inte stöds av Klarna (Klarna kräver t.ex. SEK för svenska kunder).
> 3. Hemsidan inte använder HTTPS (kryptering), vilket är ett krav från Klarna.
