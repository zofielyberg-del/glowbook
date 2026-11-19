const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

async function createPresentation() {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Glowbook';
    pptx.company = 'Glowbook AB';
    pptx.title = 'Glowbook x Partner - Partnerskapsförslag 2026';

    const slidesDir = path.join(__dirname, '..', 'public', 'presentations', 'partner');
    const outPptxGlowbook = path.join(slidesDir, 'Glowbook_Partnerskap_Presentation.pptx');
    const outPptxLinnea = path.join(__dirname, '..', 'public', 'presentations', 'linnea', 'Glowbook_Partnerskap_Presentation.pptx');
    const outPptxArtifact = 'C:\\Users\\zofie\\.gemini\\antigravity\\brain\\1b400a2b-a557-4901-9b40-19da90add987\\Glowbook_Partnerskap_Presentation.pptx';

    const slideNumbers = ['01', '02', '03', '04', '05', '06'];

    for (const num of slideNumbers) {
        const imgPath = path.join(slidesDir, `slide_${num}.png`);
        if (!fs.existsSync(imgPath)) {
            console.error(`Missing image: ${imgPath}`);
            continue;
        }

        const slide = pptx.addSlide();
        // Background full-bleed image 16:9
        slide.addImage({
            path: imgPath,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%'
        });
    }

    await pptx.writeFile({ fileName: outPptxGlowbook });
    console.log(`Saved PPTX: ${outPptxGlowbook}`);

    fs.copyFileSync(outPptxGlowbook, outPptxLinnea);
    console.log(`Copied PPTX to: ${outPptxLinnea}`);

    fs.copyFileSync(outPptxGlowbook, outPptxArtifact);
    console.log(`Copied PPTX to artifact: ${outPptxArtifact}`);

    // Also mirror to sofiesrepository
    const mirrorDir = 'C:\\Users\\zofie\\Projects\\sofiesrepository\\public\\presentations';
    const mirrorPptx1 = path.join(mirrorDir, 'partner', 'Glowbook_Partnerskap_Presentation.pptx');
    const mirrorPptx2 = path.join(mirrorDir, 'linnea', 'Glowbook_Partnerskap_Presentation.pptx');
    fs.copyFileSync(outPptxGlowbook, mirrorPptx1);
    fs.copyFileSync(outPptxGlowbook, mirrorPptx2);
    console.log(`Mirrored PPTX to sofiesrepository`);
}

createPresentation().catch(err => {
    console.error('Error generating PPTX:', err);
    process.exit(1);
});
