const fs = require('fs');
const path = require('path');

// Logos de tecnologia, saúde, finanças, energia, agronegócio e IA de alta qualidade
const LOGOS = {
  neuralforge: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&q=80',
  payswift: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=400&fit=crop&q=80',
  medicoreflex: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop&q=80',
  edusphere: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop&q=80',
  biogenix: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=400&fit=crop&q=80',
  cloudpilot: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop&q=80',
  tokenvault: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400&h=400&fit=crop&q=80',
  greenfleet: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&h=400&fit=crop&q=80',
  aurorasaas: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&q=80',
  brainpath: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&h=400&fit=crop&q=80',
  clinilink: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=400&fit=crop&q=80',
  learnflow: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=400&fit=crop&q=80',
  agroseed: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&h=400&fit=crop&q=80',
  retailops: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=400&h=400&fit=crop&q=80',
  pixglobal: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=400&fit=crop&q=80',
  datavision: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop&q=80',
  safehome: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop&q=80',
  logixchain: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=400&fit=crop&q=80',
  vibedeck: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop&q=80',
  nestopay: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=400&fit=crop&q=80',
  techinnovate: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&q=80',
  greenenergy: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=400&h=400&fit=crop&q=80',
  fintechpro: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=400&fit=crop&q=80',
};

async function main() {
  const baseDir = path.join(process.cwd(), 'uploads', 'startups');
  console.log('🎨 Baixando logos com cara de empresa real para as 23 startups...');

  for (const [slug, url] of Object.entries(LOGOS)) {
    const dir = path.join(baseDir, slug);
    fs.mkdirSync(dir, { recursive: true });

    const logoSlugFile = path.join(dir, `${slug}_logo.jpg`);
    const logoFile = path.join(dir, 'logo.jpg');

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!res.ok) throw new Error('HTTP status ' + res.status);
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);

      fs.writeFileSync(logoSlugFile, buf);
      fs.writeFileSync(logoFile, buf);
      console.log(`  ✓ ${slug}/ -> ${slug}_logo.jpg & logo.jpg`);
    } catch (e) {
      console.error(`  ❌ Erro em ${slug}: ${e.message}`);
    }
  }
  console.log('✅ Todas as logos foram salvas com sucesso em uploads/startups/<slug>/');
}

main();
