import { Resend } from 'resend';

// Initialize Resend with the API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

// The official sending address (make sure this domain is verified in Resend)
const FROM_EMAIL = 'support@glowbook.se'; 

/**
 * Premium HTML Wrapper for all Glowbook emails
 */
export const getHtmlWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="sv" style="background:#000000;" bgcolor="#000000">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700;900&family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      :root {
        color-scheme: dark;
        supported-color-schemes: dark;
      }
      body, table, td, div, p, a {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        background-color: #000000 !important;
      }
      @media (prefers-color-scheme: light) {
        body, table, td {
          background-color: #000000 !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="background-color:#000000;width:100%;">
      <!-- Forced background color wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background-color:#000000;">
        <tr>
          <td align="center" style="padding:48px 20px;background-color:#000000;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="max-width:600px;width:100%;background-color:#000000;">
              
              <!-- LOGO HEADER -->
              <tr>
                <td align="center" style="padding:0 0 40px 0;background-color:#000000;">
                  <a href="https://www.glowbook.se" style="text-decoration:none;">
                    <span style="font-family:'Comfortaa', 'Outfit', sans-serif;font-size:36px;font-weight:900;color:#fdfdfd;letter-spacing:-2px;">Glow</span><span style="font-family:'Comfortaa', 'Outfit', sans-serif;font-size:36px;font-weight:400;color:#C5B358;letter-spacing:-2px;">book</span>
                  </a>
                </td>
              </tr>

              <!-- CONTENT CARD -->
              <tr>
                <td style="padding:0;background-color:#000000;">
                  <div style="color:#d4d4d4;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
                    ${content}
                  </div>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:48px 20px 0 20px;color:#666666;font-size:12px;font-family:Arial,Helvetica,sans-serif;line-height:1.6;background-color:#000000;">
                  &copy; ${new Date().getFullYear()} Glowbook AB<br>
                  <a href="https://www.glowbook.se" style="color:#C1B363;text-decoration:none;">www.glowbook.se</a>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
`;


/**
 * 1. Welcome Email for New Providers
 */
export const sendProviderWelcomeEmail = async (email: string, firstName: string) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 24px 0;letter-spacing:-0.5px;">Välkommen till Glowbook</h1>
        <p style="color:#d4d4d4;margin:0 0 16px 0;">Bästa ${firstName},</p>
        <p style="color:#d4d4d4;margin:0 0 16px 0;">Det gläder oss oerhört att ni har valt att ansluta er till Glowbook – Sveriges ledande bokningsplattform för exklusiv skönhet och hälsa.</p>
        <p style="color:#d4d4d4;margin:0 0 40px 0;">Er profil är nu skapad. Ni kan omgående konfigurera er kalender, lägga till behandlingar samt anpassa er presentation för att återspegla er salongs unika karaktär.</p>
        
        <div style="margin:40px 0;">
            <a href="https://glowbook.se/admin" style="display:inline-block;background-color:#C1B363;color:#000000;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Gå till er Dashboard</a>
        </div>
        
        <p style="color:#aaaaaa;margin:0 0 12px 0;">Om ni har några frågor eller önskar vägledning under uppstarten står vår dedikerade support alltid till er tjänst.</p>
        <p style="color:#cccccc;margin:0;">Med vänliga hälsningar,<br/><strong style="color:#ffffff;">Team Glowbook</strong></p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: 'Välkommen till Glowbook',
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
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 24px 0;letter-spacing:-0.5px;">Välkommen till Glowbook</h1>
        <p style="color:#d4d4d4;margin:0 0 16px 0;">Hej ${firstName},</p>
        <p style="color:#d4d4d4;margin:0 0 32px 0;">Vi är mycket glada över att välkomna dig till Glowbook. Hos oss får du direkt tillgång till Sveriges mest framstående salonger och skönhetsutförare.</p>
        
        <div style="margin-bottom:32px;">
            <h3 style="margin:0 0 8px 0;color:#C1B363;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Din lojalitetsbonus: Glowpoints</h3>
            <p style="font-size:14px;line-height:1.6;margin:0;color:#a3a3a3;">
                Du tjänar poäng automatiskt vid varje slutförd behandling bokad via Glowbook. 
                För varje 10 SEK du spenderar erhåller du 5 poäng. Samla poäng för att erhålla exklusiva förmåner och avancera i våra medlemsnivåer.
            </p>
        </div>

        <div style="margin-bottom:40px;">
            <h3 style="margin:0 0 8px 0;color:#ffffff;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Digitala presentkort</h3>
            <p style="font-size:14px;line-height:1.6;margin:0;color:#a3a3a3;">
                Ge bort en stund av lyx. Du kan enkelt köpa digitala presentkort på Glowbook för direkt leverans till mottagarens e-post.
            </p>
        </div>
        
        <div style="margin:40px 0;">
            <a href="https://glowbook.se/explore" style="display:inline-block;background-color:#C1B363;color:#000000;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Upptäck Salonger</a>
        </div>
        
        <p style="color:#aaaaaa;margin:24px 0 12px 0;">Vi ser fram emot att hjälpa dig att stråla.</p>
        <p style="color:#cccccc;margin:0;">Bästa hälsningar,<br/><strong style="color:#ffffff;">Team Glowbook</strong></p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: 'Välkommen till Glowbook',
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
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 24px 0;letter-spacing:-0.5px;">Bokningsbekräftelse</h1>
        <p style="color:#d4d4d4;margin:0 0 16px 0;font-size:16px;font-family:Arial,Helvetica,sans-serif;">Hej ${customerName} !</p>
        <p style="color:#d4d4d4;margin:0 0 32px 0;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Tack för att du bokar din tid hos oss. Vi ser fram emot att ta hand om dig!</p>
        
        <div style="background:#111111;border:1px solid #222222;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C1B363;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #222222;padding-bottom:12px;">Din bokning</h3>
            
            <p style="color:#ffffff;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">📅</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Datum:</strong> ${dateStr}</p>
            <p style="color:#ffffff;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">🕒</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Tid:</strong> ${timeStr}</p>
            <p style="color:#ffffff;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">📍</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Plats:</strong> ${salonName}</p>
            <p style="color:#ffffff;font-size:15px;margin:0 0 0 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">💅</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Behandling:</strong> ${serviceName}</p>
        </div>
        
        <p style="color:#d4d4d4;margin:0 0 24px 0;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Vi ser fram emot att välkomna dig ✨</p>
        
        <p style="color:#cccccc;margin:0;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Med vänliga hälsningar,<br/><strong style="color:#ffffff;">${salonName}</strong></p>

        ${appointmentId ? `
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #222222; text-align: center;">
            <a href="https://glowbook.se/booking/manage/${appointmentId}" style="display:inline-block;background-color:#C1B363;color:#000000;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Hantera eller Avboka din tid</a>
        </div>
        ` : ''}
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
        <h1 style="color: #111111;">Bokning avbokad</h1>
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
        <h1 style="color: #111111;">Avbokad tid</h1>
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
        <h1>Ny Bokning</h1>
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
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 24px 0;letter-spacing:-0.5px;">Ett presentkort från Glowbook</h1>
        <p style="font-family:Arial,Helvetica,sans-serif;color:#d4d4d4;margin:0 0 16px 0;">Hej ${recipientName},</p>
        <p style="font-family:Arial,Helvetica,sans-serif;color:#d4d4d4;margin:0 0 32px 0;">${senderName} har skickat ett digitalt presentkort till dig!</p>
        
        <div style="background: #000000; color: #ffffff; padding: 40px 0; text-align: left; margin: 32px 0;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C1B363; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">Presentkort</p>
            <h1 style="font-size: 48px; margin: 12px 0; color: #ffffff; letter-spacing: -1px; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">${amount} SEK</h1>
            <p style="color: #C1B363; font-size: 24px; letter-spacing: 2px; margin: 0; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">KOD: ${code}</p>
        </div>
        
        ${message ? `
        <div style="margin: 24px 0;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size: 15px; font-style: italic; line-height: 1.6; margin: 0; color: #d4d4d4;">
                "${message}"
            </p>
        </div>
        ` : ''}
        
        <div style="margin: 40px 0;">
            <a href="https://www.glowbook.se/giftcards" style="display:inline-block;background-color:#C1B363;color:#000000;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Lös in Presentkort</a>
        </div>
        
        <p style="font-family:Arial,Helvetica,sans-serif;margin-top: 32px; font-size: 12px; color: #888888;">
            Giltigt till ${expiresAtStr} hos alla Glowbook-anslutna salonger.
        </p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: `Du har fått ett digitalt presentkort!`,
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
        <h1>Ditt presentkort har använts</h1>
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
            subject: `Ditt presentkort har använts hos ${salonName}`,
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

/**
 * 6. Provider Cancellation / Farewell Email
 */
export const sendCancellationEmail = async (
    email: string,
    firstName: string,
    salonName: string
) => {
    const htmlContent = `
        <p style="font-size:16px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;margin:0 0 24px;">Bästa ${firstName},</p>

        <p style="font-size:15px;color:#aaaaaa;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 20px;">
            Vi har mottagit din uppsägning av <strong style="color:#ffffff;">${salonName}</strong>s Glowbook-medlemskap. 
            Ditt konto är aktivt fram till periodens slut — du behåller full tillgång tills dess.
        </p>

        <p style="font-size:15px;color:#aaaaaa;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 32px;">
            Vi är ledsna att se dig gå och hoppas att vi ses igen. 💛
        </p>

        <div style="background:#111111;border:1px solid #222222;border-radius:16px;padding:28px;margin:0 0 32px;">
            <p style="font-size:13px;color:#888888;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Hjälp oss bli bättre</p>
            <p style="font-size:15px;color:#dddddd;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 16px;">
                Vad kunde vi gjort annorlunda? Ditt svar betyder mycket för oss — svara direkt på det här mejlet så läser vi varje ord.
            </p>
            <p style="font-size:13px;color:#666666;font-family:Arial,Helvetica,sans-serif;margin:0;">
                Alla svar går direkt till teamet bakom Glowbook.
            </p>
        </div>

        <p style="font-size:15px;color:#aaaaaa;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 8px;">
            Om du någonsin vill komma tillbaka är du alltid välkommen — det tar bara några sekunder att aktivera ditt konto igen.
        </p>

        <p style="font-size:15px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;margin:32px 0 0;">
            Varmt,<br/>
            <strong style="color:#C1B363;">Team Glowbook</strong>
        </p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            replyTo: 'hej@glowbook.se',
            subject: `Vi ses snart igen, ${firstName} 💛`,
            html: getHtmlWrapper(htmlContent),
        });

        if (error) {
            console.error('Resend API Error (Cancellation):', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending cancellation email:', error);
        return { success: false, error };
    }
};

/**
 * 7. Provider Subscription Payment Receipt Email
 */
export const sendProviderReceiptEmail = async (
    email: string,
    firstName: string,
    salonName: string,
    tierName: string,
    price: number,
    currencySymbol: string = 'SEK'
) => {
    const htmlContent = `
        <p style="font-size:16px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;margin:0 0 24px;">Hej ${firstName},</p>

        <p style="font-size:15px;color:#aaaaaa;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 24px;">
            Här kommer din betalningsbekräftelse för din prenumeration av <strong style="color:#ffffff;">Glowbook ${tierName.toUpperCase()}</strong> för salongen <strong style="color:#ffffff;">${salonName}</strong>.
        </p>

        <div style="background:#111111;border:1px solid #222222;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C1B363;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #222222;padding-bottom:12px;">Kvitto / Specifikation</h3>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="font-size:14px;color:#888888;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Produkt:</td>
                    <td style="font-size:14px;color:#ffffff;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">Glowbook ${tierName.toUpperCase()}</td>
                </tr>
                <tr>
                    <td style="font-size:14px;color:#888888;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Salong:</td>
                    <td style="font-size:14px;color:#ffffff;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;">${salonName}</td>
                </tr>
                <tr>
                    <td style="font-size:14px;color:#888888;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Provperiod (Trial):</td>
                    <td style="font-size:14px;color:#ffffff;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;color:#55cc55;">30 dagar gratis ingår</td>
                </tr>
                <tr>
                    <td style="font-size:14px;color:#888888;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Status:</td>
                    <td style="font-size:14px;color:#ffffff;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:bold;color:#C1B363;">Betald</td>
                </tr>
                <tr style="border-top:1px solid #222222;">
                    <td style="font-size:16px;color:#ffffff;padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">Totalt:</td>
                    <td style="font-size:20px;color:#ffffff;padding:16px 0 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:black;color:#C1B363;">${price} ${currencySymbol}</td>
                </tr>
            </table>
        </div>

        <p style="font-size:15px;color:#aaaaaa;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 24px;">
            Transaktionen är nu slutförd och registrerad. Du kan hantera ditt medlemskap och ladda ner kvitton direkt under inställningar i din dashboard.
        </p>

        <p style="font-size:15px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;margin:32px 0 0;">
            Vänliga hälsningar,<br/>
            <strong style="color:#C1B363;">Team Glowbook</strong>
        </p>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: `Glowbook <${FROM_EMAIL}>`,
            to: email,
            subject: `Betalningsbekräftelse: Glowbook ${tierName.toUpperCase()} ✨`,
            html: getHtmlWrapper(htmlContent),
        });

        if (error) {
            console.error('Resend API Error (Receipt):', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending receipt email:', error);
        return { success: false, error };
    }
};

