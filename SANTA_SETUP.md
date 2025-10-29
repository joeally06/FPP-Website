# Letter to Santa - Quick Setup Checklist

## ✅ Completed Steps

- [x] Database schema created with `santa_letters` table
- [x] Ollama LLM client integration (`lib/ollama-client.ts`)
- [x] Email service with festive HTML template (`lib/email-service.ts`)
- [x] API routes for letter submission and admin management
- [x] User-facing modal component (`LetterToSantaModal`)
- [x] Admin dashboard (`app/santa-letters/page.tsx`)
- [x] Integration into jukebox page (Christmas theme only)
- [x] Admin navigation link added
- [x] nodemailer package installed
- [x] Documentation created (SANTA_FEATURE.md)
- [x] Project successfully compiled

## ⏳ Next Steps (Required Before Use)

### 1. Install and Configure Ollama

```bash
# Download from https://ollama.ai
# Then pull a model:
ollama pull llama3.2

# Verify it's running:
ollama list
```

### 2. Set Up Environment Variables

Create or update `.env.local` with:

```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

### 3. Gmail App Password Setup (if using Gmail)

1. Go to your Google Account: https://myaccount.google.com
2. Security → 2-Step Verification (enable if not already)
3. App passwords: https://myaccount.google.com/apppasswords
4. Generate app password for "Mail"
5. Copy the 16-character password to `SMTP_PASS`

### 4. Test the Feature

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Switch to Christmas theme:**
   - Go to `/theme-settings` as admin
   - Select "Christmas" theme

3. **Test letter submission:**
   - Go to `/jukebox`
   - Click "✉️ Write to Santa!"
   - Fill out form and submit
   - Check terminal for LLM generation logs
   - Check parent email for Santa's reply

4. **Test admin dashboard:**
   - Go to `/santa-letters`
   - Verify letter appears in table
   - Try editing reply, changing status
   - Test resend email function

## 🎯 Feature Highlights

- **Automatic LLM Generation**: Santa's replies are personalized based on child's letter
- **Rate Limiting**: 1 letter per IP per day (configurable)
- **Status Workflow**: pending → approved → sent
- **Fallback Reply**: If Ollama fails, uses generic but warm response
- **Beautiful Email Template**: Festive HTML with North Pole branding
- **Admin Controls**: Full CRUD, edit replies, resend emails

## 🔧 Optional Customizations

### Change LLM Model
Edit `lib/ollama-client.ts` line 54:
```typescript
model: 'llama3.2', // Change to: mistral, llama2, phi, etc.
```

### Adjust Rate Limiting
Edit `app/api/santa/send-letter/route.ts` lines 23-24:
```typescript
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // Hours in ms
const MAX_LETTERS_PER_DAY = 1; // Letters allowed
```

### Modify Email Template
Edit `lib/email-service.ts` function `createSantaEmailHTML()`

### Change Santa's Personality
Edit the `systemPrompt` in `lib/ollama-client.ts` lines 23-24

## 🐛 Troubleshooting

**Email not sending?**
- Check SMTP credentials in `.env.local`
- Verify Gmail App Password
- Check server logs for SMTP errors
- Test with: `await testEmailConnection()`

**Ollama not working?**
- Verify Ollama is running: `ollama list`
- Check OLLAMA_URL matches your setup
- Test: `curl http://localhost:11434/api/tags`

**Letters not in dashboard?**
- Check database: `votes.db` should have `santa_letters` table
- Verify admin authentication
- Check browser console for errors

## 📊 Database Queries (for debugging)

```sql
-- View all letters
SELECT * FROM santa_letters ORDER BY created_at DESC;

-- Check status distribution
SELECT status, COUNT(*) FROM santa_letters GROUP BY status;

-- Find recent letters
SELECT child_name, created_at, status FROM santa_letters 
WHERE created_at > datetime('now', '-1 day');
```

## 🎄 All Done!

The Letter to Santa feature is ready to bring joy to children this Christmas season! 

Just complete the environment setup and test it out. 🎅✨
