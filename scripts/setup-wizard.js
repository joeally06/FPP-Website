const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupWizard() {
  console.log('\n🔧 FPP Control Center - Database Initialization\n');
  console.log('This will create your database and basic configuration.\n');
  console.log('💡 TIP: Run ./setup.sh for the complete interactive setup wizard\n');

  const config = {};

  // Only ask for essential database setup items
  console.log('📍 Timezone Configuration (for database timestamps)');
  console.log('Common timezones:');
  console.log('  1. America/New_York (Eastern)');
  console.log('  2. America/Chicago (Central)');
  console.log('  3. America/Denver (Mountain)');
  console.log('  4. America/Phoenix (Arizona - no DST)');
  console.log('  5. America/Los_Angeles (Pacific)');
  console.log('  6. Custom timezone\n');
  
  const tzChoice = await question('Select timezone (1-6) [2]: ');
  const timezones = {
    '1': 'America/New_York',
    '2': 'America/Chicago',
    '3': 'America/Denver',
    '4': 'America/Phoenix',
    '5': 'America/Los_Angeles',
    '': 'America/Chicago' // Default
  };
  
  if (tzChoice === '6') {
    config.NEXT_PUBLIC_TIMEZONE = await question('Enter timezone (e.g., Europe/London): ');
  } else {
    config.NEXT_PUBLIC_TIMEZONE = timezones[tzChoice] || 'America/Chicago';
  }

  console.log(`✅ Timezone set to: ${config.NEXT_PUBLIC_TIMEZONE}\n`);

  // NextAuth Secret
  console.log('� Generating Authentication Secret');
  const crypto = require('crypto');
  config.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex');
  config.NEXTAUTH_URL = 'http://localhost:3000';
  console.log('✅ Generated secure authentication secret\n');

  // Generate .env.local with placeholders for setup.sh to fill
  const envContent = `# NextAuth Configuration
NEXTAUTH_URL=${config.NEXTAUTH_URL}
NEXTAUTH_SECRET=${config.NEXTAUTH_SECRET}

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin Emails (comma-separated)
ADMIN_EMAILS=your-email@example.com

# FPP Server Configuration
FPP_URL=http://your-fpp-ip

# Spotify API
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Ollama LLM Configuration
OLLAMA_URL=http://localhost:11434
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Timezone Configuration
NEXT_PUBLIC_TIMEZONE=${config.NEXT_PUBLIC_TIMEZONE}
`;

  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('\n⚠️  .env.local already exists. Overwrite? (y/n) [n]: ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('ℹ️  Keeping existing .env.local');
      rl.close();
      return;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Basic configuration saved to .env.local');
  console.log('\n⚠️  IMPORTANT: Run ./setup.sh to complete configuration');
  console.log('   The setup wizard will guide you through:');
  console.log('   • Google OAuth setup');
  console.log('   • Admin email configuration');
  console.log('   • Spotify API credentials');
  console.log('   • FPP controller IP address');
  console.log('   • Ollama and email settings\n');

  rl.close();
}

setupWizard().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
