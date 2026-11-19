const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(__dirname, 'public', 'presentations', 'linnea');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const slides = [
    {
        num: '01',
        tag: 'PARTNERSKAPSFÖRSLAG',
        title: 'Glowbook x Linnéa',
        subtitle: 'Hur vi kopplar ihop professionell eftervård med framtidens skönhetssalonger och slutkunder',
        type: 'cover'
    },
    {
        num: '02',
        tag: 'VISIONEN & MÖJLIGHETEN',
        title: 'En ny distributionskanal för eftervård',
        subtitle: 'Behandlarens rekommendation är skönhetsbranschens mest kraftfulla säljkanal',
        type: 'three-boxes',
        boxes: [
            {
                badge: 'UTMANINGEN IDAG',
                heading: 'Kunden lämnar salongen tomhänt',
                desc: 'Slutkunder missar ofta rätt eftervårdsprodukter. Salongerna har fullt upp med själva behandlingen och hinner sällan sälja i kassan.'
            },
            {
                badge: 'GLOWBOOKS LÖSNING',
                heading: 'Automatiserad merförsäljning',
                desc: 'Produkten rekommenderas naturligt vid tidsbokningen och i salongens egna digitala Click & Collect-butik.'
            },
            {
                badge: 'VINSTEN FÖR LINNÉA',
                heading: 'Självklart förstahandsval',
                desc: 'Dina produkter etableras som standarden för professionell eftervård hos både salonger och slutkonsumenter.'
            }
        ]
    },
    {
        num: '03',
        tag: 'AFFÄRSMODELLEN',
        title: 'Hur du som varumärkesägare tjänar på samarbetet',
        subtitle: 'Skalbar B2B-volymförsäljning som drivs automatiskt av salongernas slutkundsförsäljning',
        type: 'three-pillars',
        boxes: [
            {
                number: '01',
                heading: 'Löpande grossistordrar (B2B)',
                desc: 'Salongerna köper in dina produkter i bulk direkt från dig till grossistpris för att sälja vidare på plattformen. Du säljer kartonger, inte enstaka flaskor.'
            },
            {
                number: '02',
                heading: 'Automatisk återbeställning',
                desc: 'Lagersaldot räknas automatiskt ner i systemet vid varje kundköp. När lagret når en låg nivå beställer salongen nya batcher direkt från din shop.'
            },
            {
                number: '03',
                heading: 'Högkonverterande exponering',
                desc: 'Produkten presenteras i exakt rätt ögonblick som expertrekommendation till en bokad behandling. Noll extra annonskostnad för dig.'
            }
        ]
    },
    {
        num: '04',
        tag: 'B2B-KANALEN',
        title: 'Så driver vi salongerna till din butik',
        subtitle: 'Vi integrerar ditt varumärke direkt i utförarnas dagliga administrativa arbetsverktyg',
        type: 'three-boxes',
        boxes: [
            {
                badge: 'OFFICIELL PARTNER',
                heading: 'Exponering i portalen',
                desc: 'Under fliken Produkter i utförarportalen exponeras ditt varumärke som rekommenderad och certifierad leverantör av eftervårdsprodukter.'
            },
            {
                badge: 'DIREKTLÄNK VID LÅGT LAGER',
                heading: 'Ett klick till återköp',
                desc: 'När en salongs lagersaldo sjunker under en förvald nivå visas en direktknapp: "Beställ mer från [Ditt Varumärke]", som leder direkt till din B2B-butik.'
            },
            {
                badge: 'STARTKIT FÖR NYA SALONGER',
                heading: 'Introduktionspaket',
                desc: 'Nya salonger som ansluter och godkänns på Glowbook erbjuds ett rekommenderat startpaket med dina mest populära eftervårdsprodukter.'
            }
        ]
    },
    {
        num: '05',
        tag: 'B2C-KANALEN',
        title: 'Så möter slutkunden dina produkter',
        subtitle: 'Friktionsfri försäljning både i bokningsögonblicket och mellan besöken',
        type: 'four-grid',
        boxes: [
            {
                step: 'A',
                heading: 'Vid tidsbokning (Upsell)',
                desc: 'Kunden bokar t.ex. naglar och får förslaget: "Köp till nagelolja för bästa hållbarhet". Läggs enkelt till i bokningen.'
            },
            {
                step: 'B',
                heading: 'Click & Collect i salong',
                desc: 'Kunder som bara vill fylla på sin favoritprodukt beställer direkt på salongens profilsida och hämtar på plats.'
            },
            {
                step: 'C',
                heading: 'Länk till din hemsida',
                desc: 'På varje produktkort finns länken "Officiell produktinformation" som slussar kunden till din webbshop för att se hela sortimentet.'
            },
            {
                step: 'D',
                heading: 'Digital orderbekräftelse',
                desc: 'Kunden får ett snyggt digitalt kvitto med varumärkets namn, instruktioner, salongens adress och bekräftat betalsätt.'
            }
        ]
    },
    {
        num: '06',
        tag: 'NÄSTA STEG',
        title: 'Hur vi rullar igång partnerskapet',
        subtitle: 'Enkel och snabb implementering med omedelbart värde för båda parter',
        type: 'three-pillars',
        boxes: [
            {
                number: 'STEG 1',
                heading: 'Välj ut sortimentet',
                desc: 'Vi fastställer 3–5 nyckelprodukter (t.ex. nagelolja, handkräm, eftervårdsserum) som blir standardval i Glowbooks sortiment.'
            },
            {
                number: 'STEG 2',
                heading: 'Sätt ihop ett salongspaket',
                desc: 'Ett förmånligt startkit med färdiga priser och marginaler som vi presenterar för alla anslutna salonger.'
            },
            {
                number: 'STEG 3',
                heading: 'Integrera partnerlänkar',
                desc: 'Vi lägger upp ditt varumärke och din beställningslänk i utförarportalen så att salongerna kan börja köpa in direkt.'
            }
        ],
        footerQuote: 'Tillsammans skapar vi framtidens standard för professionell eftervård.'
    }
];

function generateHtml(slide) {
    let contentHtml = '';

    if (slide.type === 'cover') {
        contentHtml = `
            <div class="cover-container">
                <div class="cover-badge">${slide.tag}</div>
                <h1 class="cover-title">${slide.title}</h1>
                <p class="cover-subtitle">${slide.subtitle}</p>
                <div class="cover-footer">
                    <div class="glowbook-brand">GLOWBOOK</div>
                    <div class="divider"></div>
                    <div class="partner-brand">PARTNER SAMARBETE 2026</div>
                </div>
            </div>
        `;
    } else if (slide.type === 'three-boxes') {
        contentHtml = `
            <div class="header-section">
                <div class="slide-tag">${slide.tag}</div>
                <h2 class="slide-title">${slide.title}</h2>
                <p class="slide-subtitle">${slide.subtitle}</p>
            </div>
            <div class="cards-grid three-cards">
                ${slide.boxes.map(b => `
                    <div class="luxury-card">
                        <div class="card-badge">${b.badge}</div>
                        <h3 class="card-heading">${b.heading}</h3>
                        <p class="card-desc">${b.desc}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (slide.type === 'three-pillars') {
        contentHtml = `
            <div class="header-section">
                <div class="slide-tag">${slide.tag}</div>
                <h2 class="slide-title">${slide.title}</h2>
                <p class="slide-subtitle">${slide.subtitle}</p>
            </div>
            <div class="cards-grid three-pillars">
                ${slide.boxes.map(b => `
                    <div class="luxury-card pillar-card">
                        <div class="pillar-number">${b.number}</div>
                        <h3 class="card-heading">${b.heading}</h3>
                        <p class="card-desc">${b.desc}</p>
                    </div>
                `).join('')}
            </div>
            ${slide.footerQuote ? `<div class="footer-quote">${slide.footerQuote}</div>` : ''}
        `;
    } else if (slide.type === 'four-grid') {
        contentHtml = `
            <div class="header-section">
                <div class="slide-tag">${slide.tag}</div>
                <h2 class="slide-title">${slide.title}</h2>
                <p class="slide-subtitle">${slide.subtitle}</p>
            </div>
            <div class="cards-grid four-cards">
                ${slide.boxes.map(b => `
                    <div class="luxury-card four-card">
                        <div class="step-indicator">${b.step}</div>
                        <h3 class="card-heading">${b.heading}</h3>
                        <p class="card-desc">${b.desc}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <title>Slide ${slide.num}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 1920px;
            height: 1080px;
            background-color: #0B0B0C;
            color: #FFFFFF;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 90px 110px;
        }

        /* Subtle luxury glow effects */
        body::before {
            content: '';
            position: absolute;
            top: -200px;
            right: -200px;
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(194, 162, 106, 0.08) 0%, transparent 70%);
            pointer-events: none;
        }

        body::after {
            content: '';
            position: absolute;
            bottom: -200px;
            left: -200px;
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(194, 162, 106, 0.05) 0%, transparent 70%);
            pointer-events: none;
        }

        /* Header section */
        .slide-tag {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #C2A26A;
            margin-bottom: 16px;
        }

        .slide-title {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 58px;
            font-weight: 400;
            line-height: 1.1;
            color: #FFFFFF;
            letter-spacing: -0.02em;
            margin-bottom: 16px;
            max-width: 1500px;
        }

        .slide-subtitle {
            font-size: 20px;
            font-weight: 400;
            color: #9E9EA4;
            max-width: 1300px;
            line-height: 1.5;
        }

        /* Slide Number Top Right */
        .slide-counter {
            position: absolute;
            top: 90px;
            right: 110px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.2em;
            color: rgba(255, 255, 255, 0.25);
        }

        /* Cards Layout */
        .cards-grid {
            display: grid;
            gap: 28px;
            margin-top: 50px;
            margin-bottom: 30px;
        }

        .three-cards {
            grid-template-columns: repeat(3, 1fr);
        }

        .three-pillars {
            grid-template-columns: repeat(3, 1fr);
        }

        .four-cards {
            grid-template-columns: repeat(4, 1fr);
        }

        .luxury-card {
            background-color: #121215;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 28px;
            padding: 44px 38px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .card-badge {
            display: inline-block;
            align-self: flex-start;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: #DFCA9B;
            background-color: rgba(194, 162, 106, 0.12);
            border: 1px solid rgba(194, 162, 106, 0.25);
            padding: 6px 14px;
            border-radius: 100px;
            margin-bottom: 24px;
        }

        .pillar-number {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 42px;
            font-weight: 600;
            color: #C2A26A;
            margin-bottom: 20px;
            letter-spacing: -0.02em;
        }

        .step-indicator {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(194, 162, 106, 0.15);
            border: 1px solid rgba(194, 162, 106, 0.35);
            color: #DFCA9B;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 24px;
        }

        .card-heading {
            font-size: 24px;
            font-weight: 600;
            color: #FFFFFF;
            margin-bottom: 16px;
            line-height: 1.25;
            letter-spacing: -0.01em;
        }

        .card-desc {
            font-size: 16px;
            line-height: 1.65;
            color: #9E9EA4;
            font-weight: 400;
        }

        /* Cover Slide */
        .cover-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: 100%;
            padding: 40px 0;
        }

        .cover-badge {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #C2A26A;
            background: rgba(194, 162, 106, 0.1);
            border: 1px solid rgba(194, 162, 106, 0.25);
            padding: 8px 24px;
            border-radius: 100px;
            margin-bottom: 36px;
        }

        .cover-title {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 88px;
            font-weight: 400;
            color: #FFFFFF;
            letter-spacing: -0.03em;
            margin-bottom: 28px;
        }

        .cover-subtitle {
            font-size: 24px;
            color: #A0A0A7;
            max-width: 950px;
            line-height: 1.6;
            margin-bottom: 60px;
            font-weight: 300;
        }

        .cover-footer {
            display: flex;
            align-items: center;
            gap: 20px;
            font-size: 13px;
            letter-spacing: 0.25em;
            font-weight: 600;
            color: #C2A26A;
        }

        .cover-footer .divider {
            width: 40px;
            height: 1px;
            background: rgba(255, 255, 255, 0.2);
        }

        .cover-footer .partner-brand {
            color: rgba(255, 255, 255, 0.4);
        }

        /* Footer Quote */
        .footer-quote {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 24px;
            font-style: italic;
            color: #C2A26A;
            text-align: center;
            margin-top: 15px;
        }

        /* Slide bottom bar */
        .slide-footer-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 12px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="slide-counter">${slide.num} / 06</div>
    <div class="main-content">
        ${contentHtml}
    </div>
    <div class="slide-footer-bar">
        <span>GLOWBOOK · PARTNERSKAP</span>
        <span>GLOWBOOK.SE</span>
    </div>
</body>
</html>
    `;
}

// Generate HTML files
slides.forEach(slide => {
    const htmlContent = generateHtml(slide);
    const htmlPath = path.join(outDir, `slide_${slide.num}.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`Generated HTML: ${htmlPath}`);
});

// Use Chrome headless to screenshot each slide
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

slides.forEach(slide => {
    const htmlPath = path.join(outDir, `slide_${slide.num}.html`);
    const pngPath = path.join(outDir, `slide_${slide.num}.png`);
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    const cmd = `"${chromePath}" --headless --disable-gpu --screenshot="${pngPath}" --window-size=1920,1080 --default-background-color=000000 "${fileUrl}"`;
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`Successfully rendered PNG: ${pngPath}`);
    } catch (err) {
        console.error(`Error rendering ${slide.num}:`, err.message);
    }
});

console.log('ALL SLIDES GENERATED SUCCESSFULLY!');
