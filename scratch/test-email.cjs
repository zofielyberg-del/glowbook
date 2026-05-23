require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'support@glowbook.se';

const getHtmlWrapper = (content) => `
<!DOCTYPE html>
<html lang="sv" style="background:#000000;" bgcolor="#000000">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800;900&display=swap" rel="stylesheet">
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      body, table, td, div, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #000000 !important; }
      @media (prefers-color-scheme: light) { body, table, td { background-color: #000000 !important; } }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="background-color:#000000;width:100%;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background-color:#000000;">
        <tr>
          <td align="center" style="padding:48px 20px;background-color:#000000;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="max-width:600px;width:100%;background-color:#000000;">
              <tr>
                <td align="center" style="padding:0 0 40px 0;background-color:#000000;">
                  <a href="https://www.glowbook.se" style="text-decoration:none;">
                    <span style="font-family:'Outfit',sans-serif;font-size:42px;font-weight:800;color:#fdfdfd;letter-spacing:-1px;">Glow</span><span style="font-family:'Outfit',sans-serif;font-size:42px;font-weight:400;color:#C1B363;letter-spacing:-1px;">book</span>
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0;background-color:#000000;">
                  <div style="color:#d4d4d4;font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
                    ${content}
                  </div>
                </td>
              </tr>
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

const htmlContent = `
        <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 24px 0;letter-spacing:-0.5px;">Bokningsbekräftelse</h1>
        <p style="color:#d4d4d4;margin:0 0 16px 0;font-size:16px;font-family:Arial,Helvetica,sans-serif;">Hej Zofie !</p>
        <p style="color:#d4d4d4;margin:0 0 32px 0;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Tack för att du bokar din tid hos oss. Vi ser fram emot att ta hand om dig!</p>
        
        <div style="background:#111111;border:1px solid #222222;border-radius:16px;padding:28px;margin:0 0 32px;">
            <h3 style="font-size:12px;color:#C1B363;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;border-bottom:1px solid #222222;padding-bottom:12px;">Din bokning</h3>
            
            <p style="color:#ffffff;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">📅</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Datum:</strong> 25 Maj 2026</p>
            <p style="color:#ffffff;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">🕒</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Tid:</strong> 14:00</p>
            <p style="color:#ffffff;font-size:15px;margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">📍</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Plats:</strong> Premium Skin Clinic</p>
            <p style="color:#ffffff;font-size:15px;margin:0 0 0 0;font-family:Arial,Helvetica,sans-serif;"><span style="display:inline-block;width:24px;">💅</span> <strong style="color:#888888;font-weight:normal;margin-right:8px;">Behandling:</strong> Avancerad Microneedling</p>
        </div>
        
        <p style="color:#d4d4d4;margin:0 0 24px 0;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Vi ser fram emot att välkomna dig ✨</p>
        
        <p style="color:#cccccc;margin:0;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Med vänliga hälsningar,<br/><strong style="color:#ffffff;">Premium Skin Clinic</strong></p>

        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #222222; text-align: center;">
            <a href="https://glowbook.se/booking/manage/123" style="display:inline-block;background-color:#C1B363;color:#000000;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Hantera eller Avboka din tid</a>
        </div>
`;

async function testEmail() {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Glowbook <support@glowbook.se>',
            to: 'zofielyberg@gmail.com',
            subject: 'Din bokning är bekräftad (TEST MED NY LOGGA)',
            html: getHtmlWrapper(htmlContent),
        });
        
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success:', data);
        }
    } catch (e) {
        console.error('Catch error:', e);
    }
}

testEmail();
