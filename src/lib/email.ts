import { Resend } from 'resend';

// Initialize Resend with the API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

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
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); overflow: hidden; }
      .header { text-align: center; padding: 40px 20px; background-color: #111; }
      .logo { font-size: 28px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; color: #fff; text-decoration: none; margin: 0; }
      .content { color: #333; font-size: 16px; line-height: 1.6; padding: 40px; }
      .footer { text-align: center; padding: 30px; color: #999; font-size: 12px; background-color: #f9f9f9; border-top: 1px solid #eee; }
      h1 { font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 24px; color: #111; letter-spacing: -0.5px; }
      .btn { display: inline-block; background-color: #111; color: #fff; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
      .btn:hover { background-color: #333; }
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
        <p class="logo">GLOWBOOK<span style="color: #C5A059;">.</span></p>
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
