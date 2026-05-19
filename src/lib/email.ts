import { Resend } from 'resend';

// Initialize Resend with the API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

// The official sending address (make sure this domain is verified in Resend)
const FROM_EMAIL = 'support@glowbook.se'; 

/**
 * Premium HTML Wrapper for all Glowbook emails
 */
const getHtmlWrapper = (content: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; margin-top: 40px; margin-bottom: 40px; border: 1px solid #f0f0f0; box-shadow: 0 8px 30px rgba(0,0,0,0.03); overflow: hidden; }
      .header { text-align: center; padding: 40px 20px; background-color: #ffffff; border-bottom: 1px solid #f5f5f5; }
      .logo { font-size: 28px; font-weight: 800; text-decoration: none; margin: 0; line-height: 1; letter-spacing: -0.04em; }
      .content { color: #333; font-size: 16px; line-height: 1.6; padding: 40px; }
      .footer { text-align: center; padding: 30px; color: #999; font-size: 12px; background-color: #ffffff; border-top: 1px solid #f5f5f5; }
      h1 { font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 24px; color: #111; letter-spacing: -0.5px; }
      .btn { display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
      .btn:hover { background-color: #C5A059; }
      .card { background-color: #fafafa; border-radius: 16px; padding: 24px; margin: 32px 0; border: 1px solid #eee; }
      .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 4px; }
      .value { font-size: 16px; color: #111; font-weight: 600; margin-bottom: 16px; }
      .value:last-child { margin-bottom: 0; }
      .highlight { color: #C5A059; } /* Champagne Gold */
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <p class="logo">
          <span style="color: #000000; font-weight: 900;">Glow</span><span style="color: #C5A059; font-weight: 400;">book</span>
        </p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Glowbook AB. Alla rättigheter förbehållna.<br/>
        Denna mailadress kan inte ta emot svar.
      </div>
    </div>
  </body>
</html>
`;

/**
 * 1. Welcome Email for New Providers
 */
export const sendProviderWelcomeEmail = async (email: string, salonName: string) => {
    const htmlContent = `
        <h1>Välkommen till Glowbook! ✨</h1>
        <p>Hej ${salonName},</p>
        <p>Vad roligt att du har valt att ansluta dig till Sveriges mest exklusiva bokningsplattform för skönhet och hälsa.</p>
        <p>Ditt konto är nu skapat och du kan börja ställa in din kalender, lägga till behandlingar och designa din profil så att den speglar ditt varumärke perfekt.</p>
        
        <div style="text-align: center;">
            <a href="https://glowbook.se/admin" class="btn">Gå till din Dashboard</a>
        </div>
        
        <p style="margin-top: 32px;">Har du några frågor eller behöver hjälp med att komma igång? Vårt supportteam finns här för dig.</p>
        <p>Bästa hälsningar,<br/><strong>Team Glowbook</strong></p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: 'Välkommen till Glowbook! ✨',
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Resend API Error (Welcome):', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error };
    }
};

/**
 * 1b. Welcome Email for New Customers
 */
export const sendCustomerWelcomeEmail = async (email: string, firstName: string) => {
    const htmlContent = `
        <h1>Välkommen till Glowbook! ✨</h1>
        <p>Hej ${firstName},</p>
        <p>Vad roligt att du har skapat ett konto hos oss! Med Glowbook har du tillgång till Sveriges mest exklusiva salonger och skönhetsutförare direkt i din ficka.</p>
        
        <div class="card" style="background-color: #FAF6EE; border: 1px solid #EAD8B1; border-radius: 20px; padding: 24px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #C5A059; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px;">⭐ Din Lojalitetsbonus: Glowpoints</h3>
            <p style="font-size: 13px; line-height: 1.6; margin: 0; color: #444;">
                Visste du att du tjänar poäng automatiskt varje gång du bokar och slutför en behandling via Glowbook? 
                För varje <strong>10 kr</strong> du spenderar får du <strong>5 poäng</strong>. Samla poäng för att låsa upp exklusiva rabatter och klättra i medlemsnivåer från Bronze till legendarisk Diamond!
            </p>
        </div>

        <div class="card" style="background-color: #F8F9FA; border: 1px solid #E9ECEF; border-radius: 20px; padding: 24px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #111; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px;">🎁 Visste du?</h3>
            <p style="font-size: 13px; line-height: 1.6; margin: 0; color: #444;">
                Du kan köpa digitala <strong>presentkort</strong> på Glowbook och ge bort till någon du tycker om! Presentkortet levereras direkt till mottagarens mail med en unik kod som enkelt kan lösas in vid bokning.
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
            <a href="https://glowbook.se/explore" class="btn" style="background-color: #111; color: #fff; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Upptäck Salonger</a>
        </div>
        
        <p style="margin-top: 32px; font-size: 13px; color: #666;">Vi ser fram emot att hjälpa dig att stråla!</p>
        <p>Bästa hälsningar,<br/><strong>Team Glowbook</strong></p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: 'Välkommen till Glowbook! ✨',
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Resend API Error (Customer Welcome):', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error sending customer welcome email:', error);
        return { success: false, error };
    }
};

/**
 * 2. Booking Confirmation for Customers
 */
export const sendCustomerBookingConfirmation = async (
    email: string, 
    customerName: string, 
    salonName: string, 
    serviceName: string, 
    dateStr: string, 
    timeStr: string,
    priceStr: string,
    appointmentId?: string
) => {
    const htmlContent = `
        <h1>Bokning bekräftad! ✅</h1>
        <p>Hej ${customerName},</p>
        <p>Din behandling hos <strong>${salonName}</strong> är nu bokad och bekräftad. Vi ser fram emot att ta hand om dig!</p>
        
        <div class="card">
            <div class="label">Behandling</div>
            <div class="value">${serviceName}</div>
            
            <div class="label">Datum & Tid</div>
            <div class="value">${dateStr} kl ${timeStr}</div>
            
            <div class="label">Salong</div>
            <div class="value">${salonName}</div>
            
            <div class="label">Pris</div>
            <div class="value">${priceStr}</div>
        </div>
        
        ${appointmentId ? `
        <div style="text-align: center; margin: 32px 0 16px 0;">
            <a href="https://glowbook.se/booking/manage/${appointmentId}" class="btn" style="background-color: #C5A059; color: #fff;">Om- / Avboka tid</a>
            <p style="font-size: 11px; color: #999; margin-top: 10px;">Ändra eller avboka din tid säkert och smidigt utan inloggning.</p>
        </div>
        ` : `
        <p>För att avboka eller ändra din tid, vänligen kontakta salongen direkt eller logga in på din profil.</p>
        `}
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook Bokning <${FROM_EMAIL}>`,
            to: email,
            subject: `Din bokning hos ${salonName} är bekräftad`,
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Resend API Error (Customer):', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error sending customer confirmation:', error);
        return { success: false, error };
    }
};

/**
 * 2b. Booking Cancellation for Customers
 */
export const sendCustomerCancellationEmail = async (
    email: string, 
    customerName: string, 
    salonName: string, 
    serviceName: string, 
    dateStr: string, 
    timeStr: string
) => {
    const htmlContent = `
        <h1 style="color: #d32f2f;">Bokning avbokad ❌</h1>
        <p>Hej ${customerName},</p>
        <p>Din bokade behandling hos <strong>${salonName}</strong> har avbokats enligt dina önskemål.</p>
        
        <div class="card">
            <div class="label">Avbokad Behandling</div>
            <div class="value">${serviceName}</div>
            
            <div class="label">Ursprunglig Tid</div>
            <div class="value">${dateStr} kl ${timeStr}</div>
            
            <div class="label">Salong</div>
            <div class="value">${salonName}</div>
        </div>
        
        <p>Du är alltid varmt välkommen att boka en ny tid hos oss på Glowbook när det passar dig!</p>
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://glowbook.se/explore" class="btn">Hitta ny tid</a>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook Bokning <${FROM_EMAIL}>`,
            to: email,
            subject: `Avbokningsbekräftelse: ${serviceName} hos ${salonName}`,
            html: getHtmlWrapper(htmlContent),
        });
        return { success: !error, error };
    } catch (error) {
        console.error('Error sending customer cancellation email:', error);
        return { success: false, error };
    }
};

/**
 * 2c. Booking Cancellation for Providers
 */
export const sendProviderCancellationEmail = async (
    providerEmail: string, 
    salonName: string,
    customerName: string, 
    serviceName: string, 
    dateStr: string, 
    timeStr: string
) => {
    const htmlContent = `
        <h1 style="color: #d32f2f;">Avbokad tid ❌</h1>
        <p>Hej ${salonName},</p>
        <p>Kunden <strong>${customerName}</strong> har avbokat sin tid.</p>
        
        <div class="card">
            <div class="label">Kund</div>
            <div class="value">${customerName}</div>
            
            <div class="label">Avbokad Behandling</div>
            <div class="value">${serviceName}</div>
            
            <div class="label">Avbokad Tid</div>
            <div class="value">${dateStr} kl ${timeStr}</div>
        </div>
        
        <p>Denna tid har nu öppnats upp i din kalender så att andra kunder kan boka den.</p>
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://glowbook.se/admin/calendar" class="btn">Gå till din Kalender</a>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook System <${FROM_EMAIL}>`,
            to: providerEmail,
            subject: `Avbokning: ${serviceName} - ${customerName}`,
            html: getHtmlWrapper(htmlContent),
        });
        return { success: !error, error };
    } catch (error) {
        console.error('Error sending provider cancellation email:', error);
        return { success: false, error };
    }
};

/**
 * 3. Booking Notification for Providers
 */
export const sendProviderBookingNotification = async (
    providerEmail: string, 
    salonName: string,
    customerName: string, 
    customerEmail: string,
    serviceName: string, 
    dateStr: string, 
    timeStr: string
) => {
    const htmlContent = `
        <h1>Ny Bokning! 🎉</h1>
        <p>Hej ${salonName},</p>
        <p>Du har precis fått en ny bokning via Glowbook.</p>
        
        <div class="card">
            <div class="label">Kund</div>
            <div class="value">${customerName} <span style="font-weight: normal; color: #666; font-size: 14px;">(${customerEmail})</span></div>
            
            <div class="label">Behandling</div>
            <div class="value highlight">${serviceName}</div>
            
            <div class="label">Tid</div>
            <div class="value">${dateStr} kl ${timeStr}</div>
        </div>
        
        <div style="text-align: center;">
            <a href="https://glowbook.se/admin/calendar" class="btn">Visa i Kalendern</a>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook System <${FROM_EMAIL}>`,
            to: providerEmail,
            subject: `Ny bokning: ${serviceName} med ${customerName}`,
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Resend API Error (Provider):', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error sending provider notification:', error);
        return { success: false, error };
    }
};

/**
 * 4. Premium Gift Card Email
 */
export const sendGiftCardEmail = async (
    email: string,
    recipientName: string,
    senderName: string,
    amount: number,
    code: string,
    message?: string,
    expiresAt?: Date
) => {
    const expiresAtStr = expiresAt ? expiresAt.toLocaleDateString('sv-SE') : new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE');
    
    const htmlContent = `
        <h1>Ett presentkort från Glowbook! ✨</h1>
        <p>Hej ${recipientName},</p>
        <p>${senderName} har skickat ett digitalt presentkort till dig!</p>
        
        <div style="background: #000000; color: #ffffff; padding: 40px; text-align: center; border-radius: 20px; margin: 32px 0; border: 1px solid #111;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C5A059; font-weight: 800;">Presentkort</p>
            <h1 style="font-size: 48px; margin: 12px 0; color: #ffffff; letter-spacing: -1px; font-weight: 900;">${amount} SEK</h1>
            <p style="color: #C5A059; font-family: monospace; font-size: 24px; letter-spacing: 3px; margin: 0; font-weight: bold;">${code}</p>
        </div>
        
        ${message ? `
        <div class="card" style="background-color: #FAF6EE; border: 1px solid #EAD8B1; border-radius: 20px; padding: 24px; margin: 24px 0;">
            <p style="font-size: 14px; font-style: italic; line-height: 1.6; margin: 0; color: #444; text-align: center;">
                "${message}"
            </p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 32px;">
            <a href="https://www.glowbook.se/giftcards" class="btn" style="background-color: #C5A059; color: #ffffff;">Lös in Presentkort</a>
        </div>
        
        <p style="margin-top: 32px; font-size: 11px; color: #999; text-align: center;">
            Giltigt till ${expiresAtStr} hos alla Glowbook-anslutna salonger.
        </p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: `Du har fått ett digitalt presentkort! ✨`,
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Resend API Error (Gift Card):', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error sending gift card email:', error);
        return { success: false, error };
    }
};

/**
 * 5. Premium Gift Card Usage Email (Receipt)
 */
export const sendGiftCardUsageEmail = async (
    email: string,
    recipientName: string,
    salonName: string,
    amount: number,
    code: string,
    newBalance: number
) => {
    const htmlContent = `
        <h1>Ditt presentkort har använts ✨</h1>
        <p>Hej ${recipientName},</p>
        <p>Ditt presentkort har precis använts för en bokning hos <strong>${salonName}</strong>.</p>
        
        <div class="card">
            <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #111; border-bottom: 1px solid #eee; padding-bottom: 10px;">Transaktionsdetaljer</h3>
            
            <div class="label">Salong</div>
            <div class="value">${salonName}</div>
            
            <div class="label">Använt belopp</div>
            <div class="value" style="color: #d32f2f;">-${amount} SEK</div>
            
            <div class="label">Kvarvarande saldo</div>
            <div class="value highlight" style="font-size: 18px; font-weight: 800;">${newBalance} SEK</div>
            
            <div class="label">Kod</div>
            <div class="value" style="font-family: monospace; letter-spacing: 1px;">${code}</div>
        </div>
        
        <p>Hoppas du blir nöjd med din behandling! Om du har några frågor om transaktionen kan du alltid kontakta oss.</p>
        <p>Bästa hälsningar,<br/><strong>Team Glowbook</strong></p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: `Ditt presentkort har använts hos ${salonName} ✨`,
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Resend API Error (Gift Card Usage):', error);
            return { success: false, error };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error sending gift card usage email:', error);
        return { success: false, error };
    }
};
