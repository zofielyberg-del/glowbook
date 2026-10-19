import { Resend } from 'resend';

// Initialize Resend with the API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

// The official sending address (make sure this domain is verified in Resend)
const FROM_EMAIL = 'support@glowbook.se'; 

/**
 * Safe email sender that attempts the official verified domain first,
 * and if Resend returns a validation/domain error (e.g., domain not verified, SPF/DKIM pending, or sandbox mode),
 * automatically falls back to onboarding@resend.dev so the email is safely delivered without failure.
 */
async function sendWithFallback({
    fromName = 'Glowbook',
    to,
    replyTo,
    subject,
    html
}: {
    fromName?: string;
    to: string;
    replyTo?: string;
    subject: string;
    html: string;
}): Promise<{ success: boolean; data?: any; error?: any }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.startsWith('re_mock')) {
        console.warn(`[Email] RESEND_API_KEY is not configured or is a mock key. Email '${subject}' to <${to}> was suppressed.`);
        return { success: false, error: 'RESEND_API_KEY is missing or invalid' };
    }

    try {
        const payload: any = {
            from: `${fromName} <${FROM_EMAIL}>`,
            to,
            subject,
            html
        };
        if (replyTo) payload.replyTo = replyTo;

        const primaryRes = await resend.emails.send(payload);

        if (!primaryRes.error) {
            console.log(`[Email] Successfully delivered '${subject}' to <${to}> via ${FROM_EMAIL}`);
            return { success: true, data: primaryRes.data };
        }

        console.warn(`[Email] Primary send from ${FROM_EMAIL} failed (${primaryRes.error.message || JSON.stringify(primaryRes.error)}). Retrying with onboarding@resend.dev fallback...`);

        const fallbackPayload: any = {
            from: `${fromName} <onboarding@resend.dev>`,
            to,
            subject,
            html
        };
        if (replyTo) fallbackPayload.replyTo = replyTo;

        const fallbackRes = await resend.emails.send(fallbackPayload);

        if (fallbackRes.error) {
            console.error('[Email] Fallback send failed:', fallbackRes.error);
            return { success: false, error: fallbackRes.error };
        }

        console.log(`[Email] Successfully delivered '${subject}' via fallback onboarding@resend.dev to <${to}>`);
        return { success: true, data: fallbackRes.data };
    } catch (err: any) {
        console.error('[Email] Exception during sendWithFallback:', err);
        return { success: false, error: err };
    }
}

/**
 * Premium HTML Wrapper for all Glowbook emails with a fixed natural cream background
 */
export const getHtmlWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Outfit:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      :root {
        color-scheme: light;
        supported-color-schemes: light;
        --gold-solid: #C2A26A;
      }
      body, table, td, div, p, a {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        background-color: #F9F9F8 !important;
      }
      
      /* Monogram-matched styles */
      h1, h2, h3, h4, h5, h6, strong, b, span, p, td, div {
        color: #111112;
      }
      h1, h2, h3, h4 {
        color: #111112;
        font-family: 'Didot', 'Bodoni MT', 'Playfair Display', Georgia, serif;
        font-weight: 300;
        letter-spacing: -0.01em;
      }
      
      /* Core gold color */
      [style*="color:#C2A26A"],
      [style*="color: #C2A26A"],
      [style*="color:#C2A26A"],
      [style*="color: #C2A26A"],
      [style*="color:#C1B363"],
      [style*="color: #C1B363"],
      [style*="color:#b45309"],
      [style*="color: #b45309"] {
        color: #C2A26A !important;
      }
      
      /* Card layout styling for emails */
      .card {
        background-color: #FFFFFF !important;
        border: 1px solid #EAE8E2 !important;
        border-radius: 20px !important;
        padding: 24px !important;
        margin: 20px 0 !important;
      }
      .label {
        font-size: 11px !important;
        color: #6C6A72 !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
        margin-top: 12px !important;
        margin-bottom: 2px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-weight: bold !important;
      }
      .value {
        font-size: 15px !important;
        color: #111112 !important;
        font-weight: bold !important;
        margin-bottom: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .btn {
        display: inline-block !important;
        background-color: #C2A26A !important;
        color: #0B0B0C !important;
        padding: 14px 36px !important;
        border-radius: 100px !important;
        text-decoration: none !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
        margin: 16px 0 !important;
      }
      
      /* Logo colors */
      .logo-glow {
        color: #111112 !important;
        font-weight: 300 !important;
      }
      .logo-book {
        color: #C2A26A !important;
        font-weight: 400 !important;
        font-style: normal !important;
      }

      /* Force natural light theme in email clients */
      @media (prefers-color-scheme: dark) {
        body { background-color: #F9F9F8 !important; }
        .email-container { background-color: #FFFFFF !important; }
        h1, h2, h3, h4, h5, h6, strong, b, span, p, td, div { color: #111112 !important; }
        .card { background-color: #FFFFFF !important; border-color: #EAE8E2 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;background-color:#F9F9F8;">
    <div style="width:100%; padding: 36px 0; background-color:#F9F9F8;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <!-- EMAIL CONTAINER WITH BORDER (FRAME) -->
            <table class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #EAE8E2; border-radius: 28px; overflow: hidden; background-color:#FFFFFF; box-shadow: 0 15px 40px rgba(148, 120, 71, 0.08);">
              <tr>
                <td style="padding: 48px 32px; background-color:#FFFFFF;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    
                    <!-- LOGO HEADER -->
                    <tr>
                      <td align="center" style="padding:0 0 36px 0;">
                        <a href="https://www.glowbook.se" style="text-decoration:none;">
                          <span class="logo-glow" style="font-family:'Cormorant Garamond', 'Didot', 'Bodoni MT', Georgia, serif;font-size:36px;font-weight:400;letter-spacing:0.02em;color:#111112;">Glow</span><span class="logo-book" style="font-family:'Cormorant Garamond', 'Didot', 'Bodoni MT', Georgia, serif;font-size:36px;font-weight:500;font-style:normal;letter-spacing:0.02em;color:#C2A26A;">book</span>
                        </a>
                      </td>
                    </tr>

                    <!-- CONTENT CARD -->
                    <tr>
                      <td>
                        <div style="font-size:15px;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111112;">
                          ${content}
                        </div>
                      </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                      <td align="center" style="padding:40px 20px 0 20px;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;border-top:1px solid #EAE8E2;margin-top:32px;color:#6C6A72;">
                        &copy; ${new Date().getFullYear()} Glowbook AB<br>
                        <a href="https://www.glowbook.se" style="color:#C2A26A;text-decoration:none;font-weight:bold;">www.glowbook.se</a>
                      </td>
                    </tr>

                  </table>
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
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Välkommen till Glowbook</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;">Bästa ${firstName},</p>
        <p style="color:#2D2B2A;margin:0 0 16px 0;">Det gläder oss oerhört att ni har valt att ansluta er till Glowbook – Sveriges ledande bokningsplattform för exklusiv skönhet och hälsa.</p>
        <p style="color:#2D2B2A;margin:0 0 40px 0;">Er profil är nu skapad. Ni kan omgående konfigurera er kalender, lägga till behandlingar samt anpassa er presentation för att återspegla er salongs unika karaktär.</p>
        
        <div style="margin:40px 0;">
            <a href="https://glowbook.se/admin" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Gå till er Dashboard</a>
        </div>
        
        <p style="color:#6B6965;margin:0 0 12px 0;">Om ni har några frågor eller önskar vägledning under uppstarten står vår dedikerade support alltid till er tjänst.</p>
        <p style="color:#2D2B2A;margin:0;">Med vänliga hälsningar,<br/><strong style="color:#1A1918;">Team Glowbook</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        subject: 'Välkommen till Glowbook',
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 1b. Welcome Email for New Customers
 */
export const sendCustomerWelcomeEmail = async (email: string, firstName: string) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Välkommen till Glowbook</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;">Hej ${firstName},</p>
        <p style="color:#2D2B2A;margin:0 0 32px 0;">Vi är mycket glada över att välkomna dig till Glowbook. Hos oss får du direkt tillgång till Sveriges mest framstående salonger och skönhetsutförare.</p>
        
        <div style="margin-bottom:32px;">
            <h3 style="margin:0 0 8px 0;color:#C2A26A;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Din lojalitetsbonus: Glowpoints</h3>
            <p style="font-size:14px;line-height:1.6;margin:0;color:#2D2B2A;">
                Du tjänar poäng automatiskt vid varje slutförd behandling bokad via Glowbook. 
                För varje 10 SEK du spenderar erhåller du 5 poäng. Samla poäng för att erhålla exklusiva förmåner och avancera i våra medlemsnivåer.
            </p>
        </div>

        <div style="margin-bottom:40px;">
            <h3 style="margin:0 0 8px 0;color:#1A1918;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Digitala presentkort</h3>
            <p style="font-size:14px;line-height:1.6;margin:0;color:#2D2B2A;">
                Ge bort en stund av lyx. Du kan enkelt köpa digitala presentkort på Glowbook för direkt leverans till mottagarens e-post.
            </p>
        </div>
        
        <div style="margin:40px 0;">
            <a href="https://glowbook.se/explore" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Upptäck Salonger</a>
        </div>
        
        <p style="color:#6B6965;margin:24px 0 12px 0;">Vi ser fram emot att hjälpa dig att stråla.</p>
        <p style="color:#2D2B2A;margin:0;">Bästa hälsningar,<br/><strong style="color:#1A1918;">Team Glowbook</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        subject: 'Välkommen till Glowbook',
        html: getHtmlWrapper(htmlContent),
    });
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
    appointmentId?: string,
    messageTemplates?: { directions?: string; policy?: string; preparation?: string },
    loyaltyInfo?: { pointsEarned: number; isRegistered: boolean; salonHasRewards: boolean }
) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Bokningsbekräftelse</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:16px;font-family:Arial,Helvetica,sans-serif;">Hej ${customerName}!</p>
        <p style="color:#2D2B2A;margin:0 0 32px 0;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Tack för att du bokar din tid hos oss. Vi ser fram emot att ta hand om dig!</p>
        
        <div style="background:#F3F1ED;border:1px solid #E5E4DE;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C2A26A;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #E5E4DE;padding-bottom:12px;">Din bokning</h3>
            
            <p style="color:#1A1918;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">📅</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Datum:</strong> ${dateStr}</p>
            <p style="color:#1A1918;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">🕒</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Tid:</strong> ${timeStr}</p>
            <p style="color:#1A1918;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">📍</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Plats:</strong> ${salonName}</p>
            <p style="color:#1A1918;font-size:15px;margin:0 0 0 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">💅</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Behandling:</strong> ${serviceName}</p>
        </div>

        ${messageTemplates?.directions || messageTemplates?.preparation || messageTemplates?.policy ? `
        <div style="background:#F3F1ED;border:1px solid #E5E4DE;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C2A26A;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #E5E4DE;padding-bottom:12px;">Viktig information</h3>
            
            ${messageTemplates.preparation ? `
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #1A1918; margin: 0 0 6px 0; font-family:Arial,Helvetica,sans-serif;">Inför besöket</h4>
                <p style="color: #2D2B2A; font-size: 14px; margin: 0; line-height: 1.5; font-family:Arial,Helvetica,sans-serif;">${messageTemplates.preparation}</p>
            </div>
            ` : ''}
            
            ${messageTemplates.directions ? `
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #1A1918; margin: 0 0 6px 0; font-family:Arial,Helvetica,sans-serif;">Vägbeskrivning</h4>
                <p style="color: #2D2B2A; font-size: 14px; margin: 0; line-height: 1.5; font-family:Arial,Helvetica,sans-serif;">${messageTemplates.directions}</p>
            </div>
            ` : ''}
            
            ${messageTemplates.policy ? `
            <div style="margin-bottom: 0;">
                <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #1A1918; margin: 0 0 6px 0; font-family:Arial,Helvetica,sans-serif;">Bokningspolicy</h4>
                <p style="color: #2D2B2A; font-size: 14px; margin: 0; line-height: 1.5; font-family:Arial,Helvetica,sans-serif;">${messageTemplates.policy}</p>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        ${loyaltyInfo?.salonHasRewards && loyaltyInfo?.pointsEarned > 0 ? (
            !loyaltyInfo.isRegistered ? `
            <div style="background: linear-gradient(135deg, #1C1B1A 0%, #111112 100%); border: 1px solid #C2A26A; border-radius: 16px; padding: 26px 24px; margin: 0 0 32px 0; text-align: center; color: #FFFFFF;">
                <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #C2A26A; margin: 0 0 8px 0;">🎉 Lojalitetsbelöning</p>
                <h4 style="font-size: 20px; font-weight: 700; margin: 0 0 8px 0; color: #FFFFFF;">Du tjänade just ${loyaltyInfo.pointsEarned} poäng på denna bokning!</h4>
                <p style="font-size: 14px; color: rgba(255,255,255,0.85); margin: 0 0 20px 0; line-height: 1.5;">Skapa ett gratis konto med denna e-postadress för att låsa upp dina poäng och använda dem som rabatt vid nästa besök hos ${salonName}.</p>
                <a href="https://glowbook.se/auth/register?email=${encodeURIComponent(email)}" style="display: inline-block; background-color: #C2A26A; color: #111112; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 28px; border-radius: 9999px; text-decoration: none;">Skapa konto & lås upp mina poäng</a>
            </div>
            ` : `
            <div style="background: linear-gradient(135deg, #1C1B1A 0%, #111112 100%); border: 1px solid #C2A26A; border-radius: 16px; padding: 22px 24px; margin: 0 0 32px 0; color: #FFFFFF;">
                <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #C2A26A; margin: 0 0 6px 0;">✨ Glowpoints Intjänade</p>
                <h4 style="font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: #FFFFFF;">+${loyaltyInfo.pointsEarned} poäng har registrerats på ditt konto!</h4>
                <p style="font-size: 13px; color: rgba(255,255,255,0.8); margin: 0; line-height: 1.5;">Poängen har sparats på ditt Glowbook-konto och är giltiga i 24 månader för exklusiva rabatter hos <strong>${salonName}</strong>.</p>
            </div>
            `
        ) : ''}
        
        <p style="color:#2D2B2A;margin:0 0 24px 0;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Vi ser fram emot att välkomna dig ✨</p>
        
        <p style="color:#6B6965;margin:0;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Med vänliga hälsningar,<br/><strong style="color:#1A1918;">${salonName}</strong></p>

        ${appointmentId ? `
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E4DE; text-align: center;">
            <a href="https://glowbook.se/booking/manage/${appointmentId}" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Hantera eller Avboka din tid</a>
        </div>
        ` : ''}
    `;

    const subject = loyaltyInfo?.salonHasRewards && loyaltyInfo?.pointsEarned > 0
        ? `Din bokning hos ${salonName} är bekräftad (+${loyaltyInfo.pointsEarned} Glowpoints ✨)`
        : `Din bokning hos ${salonName} är bekräftad`;

    return await sendWithFallback({
        fromName: 'Glowbook Bokning',
        to: email,
        subject,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 2b. Booking Cancellation for Customers (Customer Cancelled)
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
        <h1 style="color: #1A1918;">Bokning avbokad</h1>
        <p>Hej ${customerName},</p>
        <p>Vi har nu registrerat din avbokning för <strong>${serviceName}</strong> den ${dateStr} kl. ${timeStr}.</p>
        <p>Vi hoppas få välkomna dig tillbaka snart och du är alltid varmt välkommen att boka en ny tid när det passar dig.</p>
        <p>Har du några frågor är du självklart välkommen att höra av dig.</p>
        <p>Vänliga hälsningar,<br/><strong>${salonName}</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook Bokning',
        to: email,
        subject: `Avbokningsbekräftelse: ${serviceName} hos ${salonName}`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 2c. Booking Cancellation for Customers (Salon Cancelled)
 */
export const sendCustomerCancellationByProviderEmail = async (
    email: string, 
    customerName: string, 
    salonName: string, 
    serviceName: string, 
    dateStr: string, 
    timeStr: string
) => {
    const htmlContent = `
        <h1 style="color: #1A1918;">Bokning avbokad</h1>
        <p>Hej ${customerName},</p>
        <p>Vi behöver tyvärr meddela att din bokning för <strong>${serviceName}</strong> den ${dateStr} kl. ${timeStr} har behövt avbokas från salongens sida.</p>
        <p>Detta kan bero på sjukdom, schemaändringar eller andra oförutsedda omständigheter. Vi ber om ursäkt för besväret och hjälper dig gärna att hitta en ny tid som passar.</p>
        <p>Tack för din förståelse.</p>
        <p>Vänliga hälsningar,<br/><strong>${salonName}</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook Bokning',
        to: email,
        subject: `Din bokning hos ${salonName} är avbokad`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 2d. Booking Rescheduled for Customers
 */
export const sendCustomerRescheduleEmail = async (
    email: string, 
    customerName: string, 
    salonName: string, 
    serviceName: string, 
    dateStr: string, 
    timeStr: string
) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Bokning ombokad</h1>
        <p>Hej ${customerName},</p>
        <p>Din bokning har nu blivit ombokad enligt önskemål.</p>
        <p><strong>Ny tid:</strong></p>
        <p>${serviceName}<br/>${dateStr} kl. ${timeStr}</p>
        <p>Om du har några frågor eller behöver göra ytterligare ändringar är du varmt välkommen att kontakta oss.</p>
        <p>Vi ser fram emot att träffa dig.</p>
        <p>Vänliga hälsningar,<br/><strong>${salonName}</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook Bokning',
        to: email,
        subject: `Ombokningsbekräftelse: ${serviceName} hos ${salonName}`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 3. Booking Cancellation for Providers
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
        <h1 style="color: #1A1918;">Avbokad tid</h1>
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

    return await sendWithFallback({
        fromName: 'Glowbook System',
        to: providerEmail,
        subject: `Avbokning: ${serviceName} - ${customerName}`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 3b. Booking Notification for Providers
 */
export const sendProviderBookingNotification = async (
    providerEmail: string, 
    salonName: string,
    customerName: string, 
    customerEmail: string,
    serviceName: string, 
    dateStr: string, 
    timeStr: string,
    paymentMethod?: string
) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Ny Bokning</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:16px;font-family:Arial,Helvetica,sans-serif;">Hej ${salonName},</p>
        <p style="color:#2D2B2A;margin:0 0 32px 0;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Du har precis fått en ny bokning via Glowbook.</p>
        
        <div style="background:#F3F1ED;border:1px solid #E5E4DE;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C2A26A;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #E5E4DE;padding-bottom:12px;">Bokningsdetaljer</h3>
            
            <p style="color:#1A1918;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">👤</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Kund:</strong> ${customerName} <span style="font-weight: normal; color: #666; font-size: 13px;">(${customerEmail})</span></p>
            <p style="color:#1A1918;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">💅</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Behandling:</strong> ${serviceName}</p>
            <p style="color:#1A1918;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">🕒</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Tid:</strong> ${dateStr} kl ${timeStr}</p>
            <p style="color:#1A1918;font-size:15px;margin:0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">💳</span> <strong style="color:#6B6965;font-weight:normal;margin-right:8px;">Betalsätt:</strong> ${
                paymentMethod === 'klarna' ? 'Betald online (Klarna)' :
                paymentMethod === 'card' ? 'Betald online (Kort)' :
                (paymentMethod === 'stripe' || paymentMethod === 'paid') ? 'Betald online (Kort/Klarna)' :
                paymentMethod === 'giftcard' ? 'Betald med presentkort' :
                paymentMethod === 'onsite' ? 'Betalas på plats i salongen' :
                'Betalas på plats i salongen'
            }</p>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
            <a href="https://glowbook.se/admin/calendar" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Visa i Kalendern</a>
        </div>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook System',
        to: providerEmail,
        subject: `Ny bokning: ${serviceName} med ${customerName}`,
        html: getHtmlWrapper(htmlContent),
    });
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
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Ett presentkort från Glowbook</h1>
        <p style="font-family:Arial,Helvetica,sans-serif;color:#2D2B2A;margin:0 0 16px 0;">Hej ${recipientName},</p>
        <p style="font-family:Arial,Helvetica,sans-serif;color:#2D2B2A;margin:0 0 32px 0;">${senderName} har skickat ett digitalt presentkort till dig!</p>
        
        <div style="background: #F3F1ED; border: 1px solid #E5E4DE; color: #1A1918; padding: 40px 24px; text-align: center; border-radius: 16px; margin: 32px 0;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C2A26A; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">Presentkort</p>
            <h1 style="font-size: 48px; margin: 12px 0; color: #1A1918; letter-spacing: -1px; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">${amount} SEK</h1>
            <p style="color: #C2A26A; font-size: 24px; letter-spacing: 2px; margin: 0; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">KOD: ${code}</p>
        </div>
        
        ${message ? `
        <div style="margin: 24px 0;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size: 15px; font-style: italic; line-height: 1.6; margin: 0; color: #2D2B2A;">
                "${message}"
            </p>
        </div>
        ` : ''}
        
        <div style="margin: 40px 0; text-align: center;">
            <a href="https://www.glowbook.se/giftcards" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Lös in Presentkort</a>
        </div>
        
        <p style="font-family:Arial,Helvetica,sans-serif;margin-top: 32px; font-size: 12px; color: #6B6965;">
            Giltigt till ${expiresAtStr} hos alla Glowbook-anslutna salonger.
        </p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        subject: `Du har fått ett digitalt presentkort!`,
        html: getHtmlWrapper(htmlContent),
    });
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
        <h1 style="color: #1A1918;">Ditt presentkort har använts</h1>
        <p>Hej ${recipientName},</p>
        <p>Ditt presentkort har precis använts för en bokning hos <strong>${salonName}</strong>.</p>
        
        <div class="card">
            <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #1A1918; border-bottom: 1px solid #E5E4DE; padding-bottom: 10px;">Transaktionsdetaljer</h3>
            
            <div class="label">Salong</div>
            <div class="value">${salonName}</div>
            
            <div class="label">Använt belopp</div>
            <div class="value" style="color: #d32f2f;">-${amount} SEK</div>
            
            <div class="label">Kvarvarande saldo</div>
            <div class="value" style="font-size: 18px; font-weight: 800; color: #C2A26A;">${newBalance} SEK</div>
            
            <div class="label">Kod</div>
            <div class="value" style="font-family: monospace; letter-spacing: 1px;">${code}</div>
        </div>
        
        <p>Hoppas du blir nöjd med din behandling! Om du har några frågor om transaktionen kan du alltid kontakta oss.</p>
        <p>Bästa hälsningar,<br/><strong>Team Glowbook</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        subject: `Ditt presentkort har använts hos ${salonName}`,
        html: getHtmlWrapper(htmlContent),
    });
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
        <p style="font-size:16px;color:#1A1918;font-family:Arial,Helvetica,sans-serif;margin:0 0 24px;">Bästa ${firstName},</p>

        <p style="font-size:15px;color:#2D2B2A;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 20px;">
            Vi har mottagit din uppsägning av <strong style="color:#1A1918;">${salonName}</strong>s Glowbook-medlemskap. 
            Ditt konto är aktivt fram till periodens slut — du behåller full tillgång tills dess.
        </p>

        <p style="font-size:15px;color:#2D2B2A;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 32px;">
            Vi är ledsna att se dig gå och hoppas att vi ses igen. 💛
        </p>

        <div style="background:#F3F1ED;border:1px solid #E5E4DE;border-radius:16px;padding:28px;margin:0 0 32px;">
            <p style="font-size:13px;color:#C2A26A;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-weight:bold;">Hjälp oss bli bättre</p>
            <p style="font-size:15px;color:#2D2B2A;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 16px;">
                Vad kunde vi gjort annorlunda? Ditt svar betyder mycket för oss — svara direkt på det här mejlet så läser vi varje ord.
            </p>
            <p style="font-size:13px;color:#6B6965;font-family:Arial,Helvetica,sans-serif;margin:0;">
                Alla svar går direkt till teamet bakom Glowbook.
            </p>
        </div>

        <p style="font-size:15px;color:#2D2B2A;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 8px;">
            Om du någonsin vill komma tillbaka är du alltid välkommen — det tar bara några sekunder att aktivera ditt konto igen.
        </p>

        <p style="font-size:15px;color:#1A1918;font-family:Arial,Helvetica,sans-serif;margin:32px 0 0;">
            Varmt,<br/>
            <strong style="color:#C2A26A;">Team Glowbook</strong>
        </p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        replyTo: 'hej@glowbook.se',
        subject: `Vi ses snart igen, ${firstName} 💛`,
        html: getHtmlWrapper(htmlContent),
    });
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
        <p style="font-size:16px;color:#1A1918;font-family:Arial,Helvetica,sans-serif;margin:0 0 24px;">Hej ${firstName},</p>

        <p style="font-size:15px;color:#2D2B2A;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 24px;">
            Här kommer din betalningsbekräftelse för din prenumeration av <strong style="color:#1A1918;">Glowbook ${tierName.toUpperCase()}</strong> för salongen <strong style="color:#1A1918;">${salonName}</strong>.
        </p>

        <div style="background:#F3F1ED;border:1px solid #E5E4DE;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C2A26A;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #E5E4DE;padding-bottom:12px;">Kvitto / Specifikation</h3>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="font-size:14px;color:#6B6965;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Produkt:</td>
                    <td style="font-size:14px;color:#1A1918;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">Glowbook ${tierName.toUpperCase()}</td>
                </tr>
                <tr>
                    <td style="font-size:14px;color:#6B6965;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Salong:</td>
                    <td style="font-size:14px;color:#1A1918;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;">${salonName}</td>
                </tr>
                <tr>
                    <td style="font-size:14px;color:#6B6965;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Provperiod (Trial):</td>
                    <td style="font-size:14px;color:#2e7d32;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">3 månader gratis ingår</td>
                </tr>
                <tr>
                    <td style="font-size:14px;color:#6B6965;padding:8px 0;font-family:Arial,Helvetica,sans-serif;">Status:</td>
                    <td style="font-size:14px;color:#C2A26A;padding:8px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">Betald</td>
                </tr>
                <tr style="border-top:1px solid #E5E4DE;">
                    <td style="font-size:16px;color:#1A1918;padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">Totalt:</td>
                    <td style="font-size:20px;color:#C2A26A;padding:16px 0 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">${price} ${currencySymbol}</td>
                </tr>
            </table>
        </div>

        <p style="font-size:15px;color:#2D2B2A;font-family:Arial,Helvetica,sans-serif;line-height:1.7;margin:0 0 24px;">
            Transaktionen är nu slutförd och registrerad. Du kan hantera ditt medlemskap och ladda ner kvitton direkt under inställningar i din dashboard.
        </p>

        <p style="font-size:15px;color:#1A1918;font-family:Arial,Helvetica,sans-serif;margin:32px 0 0;">
            Vänliga hälsningar,<br/>
            <strong style="color:#C2A26A;">Team Glowbook</strong>
        </p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        subject: `Betalningsbekräftelse: Glowbook ${tierName.toUpperCase()} ✨`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 8. Feedback & Rating Request Email for Customers after completed booking
 */
export const sendCustomerFeedbackRequestEmail = async (
    email: string,
    customerFirstName: string,
    salonName: string,
    reviewUrl: string
) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Tack för ditt besök! ✨</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:16px;font-family:Arial,Helvetica,sans-serif;">Hej ${customerFirstName},</p>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
            Tack för din bokning hos <strong>${salonName}</strong>. Vi hoppas att du trivdes och älskade resultatet.
        </p>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
            Din feedback betyder mycket och hjälper både salongen och andra kunder att känna sig trygga när de bokar.
        </p>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
            Lämna gärna ett snabbt betyg här:
        </p>
        
        <div style="margin:28px 0 36px;text-align:left;">
            <a href="${reviewUrl}" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Lämna betyg</a>
        </div>
        
        <p style="color:#6B6965;margin:24px 0 16px 0;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Tack för att du använder Glowbook.</p>
        <p style="color:#2D2B2A;margin:0;font-size:15px;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
            Vänliga hälsningar,<br/>
            <strong style="color:#1A1918;">Glowbook & ${salonName}</strong>
        </p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook Bokning',
        to: email,
        subject: `Tack för ditt besök hos ${salonName} ✨`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 9. Anonymous Salon Contact Email
 */
export const sendSalonContactEmail = async (
    salonEmail: string,
    salonName: string,
    customerEmail: string,
    subject: string,
    message: string
) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#1A1918;margin:0 0 20px 0;">Nytt meddelande från kund via Glowbook</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;">Hej ${salonName},</p>
        <p style="color:#2D2B2A;margin:0 0 24px 0;">Du har fått ett meddelande via din "Kontakta salongen"-knapp på Glowbook.</p>
        
        <div style="background:#F3F1ED;border:1px solid #E5E4DE;border-radius:16px;padding:24px;margin:0 0 24px;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#6B6965;"><strong>Kundens e-post:</strong> <a href="mailto:${customerEmail}" style="color:#C2A26A;text-decoration:none;">${customerEmail}</a></p>
            <p style="margin:0 0 12px 0;font-size:14px;color:#6B6965;"><strong>Ämne:</strong> ${subject}</p>
            <p style="margin:0;font-size:14px;color:#6B6965;"><strong>Meddelande:</strong></p>
            <p style="margin:8px 0 0 0;font-size:15px;color:#2D2B2A;line-height:1.6;white-space:pre-wrap;">${message}</p>
        </div>
        
        <p style="color:#2D2B2A;margin:0 0 8px 0;">Du svarar kunden direkt genom att skicka ett mejl till <a href="mailto:${customerEmail}" style="color:#C2A26A;text-decoration:none;">${customerEmail}</a> (eller genom att svara på detta mejl då Reply-To är satt till kundens adress).</p>
        <p style="color:#6B6965;margin:0;">Vänliga hälsningar,<br/><strong style="color:#1A1918;">Glowbook Support</strong></p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook Kontakt',
        to: salonEmail,
        replyTo: customerEmail,
        subject: `Kundkontakt: ${subject}`,
        html: getHtmlWrapper(htmlContent),
    });
};

/**
 * 10. Punch Card Welcome Email for Customers after buying a punch card
 */
export const sendPunchCardWelcomeEmail = async (
    email: string,
    customerName: string,
    salonName: string,
    packageName: string,
    code: string,
    punchesCount: number,
    price: number
) => {
    const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#1A1918;margin:0 0 24px 0;letter-spacing:-0.5px;">Ditt klippkort är här! 🎟️</h1>
        <p style="color:#2D2B2A;margin:0 0 16px 0;font-size:16px;font-family:Arial,Helvetica,sans-serif;">Hej ${customerName},</p>
        <p style="color:#2D2B2A;margin:0 0 32px 0;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
            Tack för ditt köp! Ditt klippkort för <strong>${packageName}</strong> hos <strong>${salonName}</strong> är nu laddat och redo att användas.
        </p>
        
        <div style="background: #F3F1ED; border: 1px solid #E5E4DE; color: #1A1918; padding: 40px 24px; text-align: center; border-radius: 16px; margin: 32px 0;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C2A26A; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">Klippkort (${punchesCount} klipp)</p>
            <h1 style="font-size: 36px; margin: 12px 0; color: #1A1918; letter-spacing: -1px; font-weight: 700; font-family:Arial,Helvetica,sans-serif;">KOD: ${code}</h1>
            <p style="color: #6B6965; font-size: 14px; margin: 0; font-family:Arial,Helvetica,sans-serif;">Spara denna kod för att betala dina framtida bokningar.</p>
        </div>
        
        <div style="margin: 40px 0; text-align: center;">
            <a href="https://www.glowbook.se" style="display:inline-block;background-color:#C2A26A;color:#FFFFFF;padding:16px 40px;border-radius:100px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Boka din första tid</a>
        </div>
        
        <p style="font-family:Arial,Helvetica,sans-serif;margin-top: 32px; font-size: 12px; color: #6B6965;">
            Detta klippkort köptes för ${price} SEK hos ${salonName} via Glowbook.
        </p>
    `;

    return await sendWithFallback({
        fromName: 'Glowbook',
        to: email,
        subject: `Ditt klippkort hos ${salonName} ✨`,
        html: getHtmlWrapper(htmlContent),
    });
};

