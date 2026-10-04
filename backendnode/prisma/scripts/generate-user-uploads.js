const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Lista completa dos 30 usuários da plataforma (PF)
const USERS = [
  { email: 'admin@iselftoken.com', name: 'Alexandre Admin', role: 'ADMIN', gender: 'male' },
  { email: 'financeiro@iselftoken.com', name: 'Roberto Financeiro', role: 'FINANCEIRO', gender: 'male' },
  { email: 'compliance@iselftoken.com', name: 'Mariana Compliance', role: 'COMPLIANCE', gender: 'female' },
  { email: 'founder@iselftoken.com', name: 'Lucas Founder', role: 'FOUNDER', gender: 'male' },
  { email: 'investidor1@email.com', name: 'Carlos Investidor', role: 'INVESTOR', gender: 'male' },
  { email: 'investidor2@email.com', name: 'Beatriz Costa', role: 'INVESTOR', gender: 'female' },
  { email: 'investidor3@email.com', name: 'Fernando Alves', role: 'INVESTOR', gender: 'male' },
  { email: 'investidor4@email.com', name: 'Patricia Lima', role: 'INVESTOR', gender: 'female' },
  { email: 'afiliado@iselftoken.com', name: 'Marcelo Afiliado', role: 'AFFILIATE', gender: 'male' },
  { email: 'afiliado2@iselftoken.com', name: 'Juliana Parceira', role: 'AFFILIATE', gender: 'female' },

  // Founders das 20 Startups Blueprint
  { email: 'fundador@neuralforge.com.br', name: 'Gabriel Neural', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@payswift.com.br', name: 'Renata Pay', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@medicoreflex.com.br', name: 'Dr. Andre Medi', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@edusphere.com.br', name: 'Prof. Sofia Edu', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@biogenix.com.br', name: 'Dra. Helena Bio', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@cloudpilot.com.br', name: 'Rodrigo Cloud', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@tokenvault.com.br', name: 'Thiago Token', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@greenfleet.com.br', name: 'Eduardo Fleet', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@aurorasaas.com.br', name: 'Camila Aurora', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@brainpath.com.br', name: 'Dr. Lucas Brain', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@clinilink.com.br', name: 'Dra. Paula Clini', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@learnflow.com.br', name: 'Marcus Learn', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@agroseed.com.br', name: 'Joao Agro', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@retailops.com.br', name: 'Vanessa Retail', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@pixglobal.com.br', name: 'Felipe Pix', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@datavision.com.br', name: 'Daniel Data', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@safehome.com.br', name: 'Bruno Safe', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@logixchain.com.br', name: 'Mauricio Logix', role: 'FOUNDER', gender: 'male' },
  { email: 'fundador@vibedeck.com.br', name: 'Jessica Vibe', role: 'FOUNDER', gender: 'female' },
  { email: 'fundador@nestopay.com.br', name: 'Rafael Nesto', role: 'FOUNDER', gender: 'male' },
];

const COMPROVANTE_SRC = '/home/kingdev/Downloads/comprovante_endereco.pdf';
const DOC_FRENTE_SRC = '/home/kingdev/Downloads/certidao_cnpj_modelo.pdf'; // Modelo PDF genérico para doc
const DOC_VERSO_SRC = '/home/kingdev/Downloads/declaracao_veracidade.pdf'; // Modelo PDF genérico para verso

function getSlugFromEmail(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Gera foto de avatar de alta definição com iniciais elegantes para Pessoa Física
function generateAvatarSvg(user) {
  const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const colors = user.gender === 'female'
    ? ['#831843', '#be185d', '#f472b6']
    : ['#0f172a', '#1e3a8a', '#3b82f6'];

  return `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}"/>
        <stop offset="100%" stop-color="${colors[1]}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" rx="200" fill="url(#avatarGrad)"/>
    <circle cx="200" cy="200" r="190" fill="none" stroke="${colors[2]}" stroke-width="4" opacity="0.3"/>
    
    <!-- Ícone de perfil e iniciais -->
    <text x="200" y="215" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="110" font-weight="800" fill="#ffffff" text-anchor="middle">
      ${initials}
    </text>
    
    <!-- Badge de Perfil PF -->
    <rect x="120" y="310" width="160" height="28" rx="14" fill="${colors[2]}" opacity="0.9"/>
    <text x="200" y="328" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff" letter-spacing="2" text-anchor="middle">
      PESSOA FÍSICA
    </text>
  </svg>`;
}

async function main() {
  const baseDir = path.join(process.cwd(), 'uploads', 'users');
  const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');

  fs.mkdirSync(baseDir, { recursive: true });
  fs.mkdirSync(avatarsDir, { recursive: true });

  console.log('👤 Criando pastas e arquivos de KYC exclusivamente de PESSOA FÍSICA para os 30 usuários...');

  for (const user of USERS) {
    const slug = getSlugFromEmail(user.email);
    const userDir = path.join(baseDir, slug);
    fs.mkdirSync(userDir, { recursive: true });

    // 1. Renderizar Avatar PF em JPEG 400x400
    const svg = generateAvatarSvg(user);
    const avatarBuf = await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();

    fs.writeFileSync(path.join(userDir, 'avatar.jpg'), avatarBuf);
    fs.writeFileSync(path.join(userDir, 'selfie_kyc.jpg'), avatarBuf); // Selfie de validação facial KYC
    fs.writeFileSync(path.join(avatarsDir, `${slug}.jpg`), avatarBuf); // Cópia central na pasta avatars

    // 2. Copiar documentos KYC PF (RG/CNH + Comprovante de Residência)
    if (fs.existsSync(COMPROVANTE_SRC)) {
      fs.copyFileSync(COMPROVANTE_SRC, path.join(userDir, 'comprovante_residencia.pdf'));
    }
    if (fs.existsSync(DOC_FRENTE_SRC)) {
      fs.copyFileSync(DOC_FRENTE_SRC, path.join(userDir, 'documento_frente.pdf'));
    }
    if (fs.existsSync(DOC_VERSO_SRC)) {
      fs.copyFileSync(DOC_VERSO_SRC, path.join(userDir, 'documento_verso.pdf'));
    }

    console.log(`  ✓ ${slug}/ (avatar.jpg, selfie_kyc.jpg, documento_frente.pdf, documento_verso.pdf, comprovante_residencia.pdf)`);
  }

  console.log('\n✅ Todos os 30 usuários PF tiveram suas pastas e documentos de KYC organizados em uploads/users/<email_slug>/');
}

main().catch(console.error);
