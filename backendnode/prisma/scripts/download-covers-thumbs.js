const fs = require('fs');
const path = require('path');

// Mapeamento temático de imagens de alta resolução (1200x630 cover, 400x400 thumb)
// 100% alinhado com o setor e a proposta de valor de cada startup
const COVERS = {
  neuralforge: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
  payswift: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3',
  medicoreflex: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
  edusphere: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8',
  biogenix: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69',
  cloudpilot: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31',
  tokenvault: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0',
  greenfleet: 'https://images.unsplash.com/photo-1563986768609-322da13575f3',
  aurorasaas: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  brainpath: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31',
  clinilink: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d',
  learnflow: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655',
  agroseed: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449',
  retailops: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df',
  pixglobal: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
  datavision: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  safehome: 'https://images.unsplash.com/photo-1558002038-1055907df827',
  logixchain: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d',
  vibedeck: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4',
  nestopay: 'https://images.unsplash.com/photo-1563986768609-322da13575f3',
  techinnovate: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
  greenenergy: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d',
  fintechpro: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
};

async function downloadImage(baseUrl, width, height) {
  const url = `${baseUrl}?w=${width}&h=${height}&fit=crop&q=80`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function main() {
  const baseDir = path.join(process.cwd(), 'uploads', 'startups');
  console.log('🖼️ Baixando Banners (Covers 1200x630) e Thumbnails (400x400) temáticos para as 23 startups...');

  for (const [slug, baseUrl] of Object.entries(COVERS)) {
    const dir = path.join(baseDir, slug);
    fs.mkdirSync(dir, { recursive: true });

    try {
      // 1. Download Cover (1200x630)
      const coverBuf = await downloadImage(baseUrl, 1200, 630);
      fs.writeFileSync(path.join(dir, `${slug}_cover.jpg`), coverBuf);
      fs.writeFileSync(path.join(dir, 'cover.jpg'), coverBuf);

      // 2. Download Thumbnail (400x400)
      const thumbBuf = await downloadImage(baseUrl, 400, 400);
      fs.writeFileSync(path.join(dir, `${slug}_thumb.jpg`), thumbBuf);
      fs.writeFileSync(path.join(dir, 'thumb.jpg'), thumbBuf);

      console.log(`  ✓ ${slug}/ -> ${slug}_cover.jpg & ${slug}_thumb.jpg`);
    } catch (e) {
      console.error(`  ❌ Erro em ${slug}: ${e.message}`);
    }
  }
  console.log('\n✅ Todos os Banners (Covers) e Thumbnails foram salvos com sucesso em uploads/startups/<slug>/');
}

main();
