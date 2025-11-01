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
  console.log('\n🔧 FPP Control Center - Setup Wizard\n');
  console.log('This wizard will help you configure your installation.\n');
  console.log('Press Enter to accept default values shown in [brackets].\n');

  const config = {};

  // Timezone
  console.log('📍 Timezone Configuration');
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

  // FPP Configuration
  console.log('🎄 FPP Controller Configuration');
  console.log('Enter the IP address of your FPP controller');
  console.log('Example: 192.168.1.100 or 192.168.0.50\n');
  const fppUrl = await question('FPP Controller IP address: ');
  
  if (!fppUrl || fppUrl.trim() === '') {
    console.log('❌ FPP IP address is required');
    process.exit(1);
  }
  
  // Add http:// if not present
  config.FPP_URL = fppUrl.startsWith('http') ? fppUrl : `http://${fppUrl}`;
  console.log(`✅ FPP URL: ${config.FPP_URL}\n`);

  // Ollama Configuration
  console.log('🤖 Ollama AI Configuration (for Santa Letters)');
  const useOllama = await question('Enable Ollama AI? (y/n) [y]: ');
  
  if (useOllama.toLowerCase() !== 'n') {
    const ollamaUrl = await question('Ollama URL [http://localhost:11434]: ');
    config.NEXT_PUBLIC_OLLAMA_URL = ollamaUrl || 'http://localhost:11434';
    
    const ollamaModel = await question('Ollama Model [llama3.2]: ');
    config.OLLAMA_MODEL = ollamaModel || 'llama3.2';
    
    console.log(`✅ Ollama enabled: ${config.NEXT_PUBLIC_OLLAMA_URL} (${config.OLLAMA_MODEL})\n`);
  } else {
    config.NEXT_PUBLIC_OLLAMA_URL = '';
    config.OLLAMA_MODEL = '';
    console.log('⚠️  Ollama disabled - Santa letters will not work\n');
  }

  // Email Configuration
  console.log('📧 Email Configuration (for Santa Letters & Alerts)');
  const useEmail = await question('Configure email? (y/n) [y]: ');
  
  if (useEmail.toLowerCase() !== 'n') {
    console.log('\nFor Gmail users:');
    console.log('  1. Enable 2-Factor Authentication');
    console.log('  2. Generate App Password: https://myaccount.google.com/apppasswords');
    console.log('  3. Use the App Password below (not your regular password)\n');
    console.log('For other email providers, use their SMTP settings\n');
    
    const smtpHost = await question('SMTP Host [smtp.gmail.com]: ');
    config.SMTP_HOST = smtpHost || 'smtp.gmail.com';
    
    const smtpPort = await question('SMTP Port [587]: ');
    config.SMTP_PORT = smtpPort || '587';
    
    config.SMTP_USER = await question('SMTP Email: ');
    config.SMTP_PASS = await question('SMTP App Password: ');
    
    console.log(`✅ Email configured: ${config.SMTP_HOST}:${config.SMTP_PORT}\n`);
  } else {
    config.SMTP_HOST = '';
    config.SMTP_PORT = '587';
    config.SMTP_USER = '';
    config.SMTP_PASS = '';
    console.log('⚠️  Email disabled - Santa letters and alerts will not be sent\n');
  }

  // Device Monitoring
  console.log('📡 Device Monitoring Configuration');
  const alertEmail = await question('Alert Email Address [same as SMTP user]: ');
  config.ALERT_EMAIL = alertEmail || config.SMTP_USER || '';
  
  const monitoringHours = await question('Configure monitoring schedule? (y/n) [y]: ');
  if (monitoringHours.toLowerCase() !== 'n') {
    const startTime = await question('Show start time (24h format) [16:00]: ');
    config.MONITORING_START_TIME = startTime || '16:00';
    
    const endTime = await question('Show end time (24h format) [22:00]: ');
    config.MONITORING_END_TIME = endTime || '22:00';
    
    console.log(`✅ Monitoring: ${config.MONITORING_START_TIME} - ${config.MONITORING_END_TIME}\n`);
  } else {
    config.MONITORING_START_TIME = '16:00';
    config.MONITORING_END_TIME = '22:00';
  }

  // NextAuth Secret
  console.log('🔐 Authentication Configuration');
  const crypto = require('crypto');
  config.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex');
  config.NEXTAUTH_URL = 'http://localhost:3000';
  console.log('✅ Generated secure authentication secret\n');

  // Generate .env.local in new clean format
  const envContent = `# NextAuth Configuration
NEXTAUTH_URL=${config.NEXTAUTH_URL}
NEXTAUTH_SECRET=${config.NEXTAUTH_SECRET}

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Admin Emails (comma-separated)
ADMIN_EMAILS=your-email@example.com

# FPP Server Configuration
FPP_URL=${config.FPP_URL}

# Spotify API
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Ollama LLM Configuration
OLLAMA_URL=${config.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'}
NEXT_PUBLIC_OLLAMA_URL=${config.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'}

# Email Configuration (SMTP)
SMTP_HOST=${config.SMTP_HOST || 'smtp.gmail.com'}
SMTP_PORT=${config.SMTP_PORT || '587'}
SMTP_SECURE=false
SMTP_USER=${config.SMTP_USER || ''}
SMTP_PASS=${config.SMTP_PASS || ''}

# Timezone Configuration
NEXT_PUBLIC_TIMEZONE=${config.NEXT_PUBLIC_TIMEZONE}
`;

  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('\n⚠️  .env.local already exists. Overwrite? (y/n) [n]: ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('ℹ️  Keeping existing .env.local');
      console.log('\n⚠️  WARNING: Using old .env.local format. Consider running setup.sh for new format.\n');
      rl.close();
      return;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Configuration saved to .env.local');
  console.log('\n📋 Summary:');
  console.log(`   Timezone: ${config.NEXT_PUBLIC_TIMEZONE}`);
  console.log(`   FPP URL: ${config.FPP_URL}`);
  console.log(`   Ollama: ${config.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'}`);
  console.log(`   Email: ${config.SMTP_USER || 'Not configured'}`);
  console.log('\n⚠️  IMPORTANT: You still need to configure:');
  console.log('   • Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
  console.log('   • Admin Emails (ADMIN_EMAILS)');
  console.log('   • Spotify API (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)');
  console.log('\n💡 TIP: Run ./setup.sh for guided setup of all credentials\n');
  console.log('You can also edit .env.local manually.\n');

  rl.close();
}

setupWizard().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
