# Letter to Santa - Debugging Guide

## 🔍 Enhanced Logging Added

I've added detailed logging to help diagnose the issue. When you submit a letter, you'll now see these logs in the terminal:

### Expected Log Flow:

```
📬 Received letter from: [Child Name]
✅ Letter saved to database with ID: [number]
🤖 Calling Ollama at: http://192.168.2.186:11434
🎅 Generating Santa reply for: [Child Name]
📍 Ollama URL: http://192.168.2.186:11434
📤 Sending request to Ollama...
📥 Ollama response status: 200
✅ Reply generated successfully
✅ LLM generated reply, length: [number]
✅ Reply saved to database
📧 Attempting to send email to: [email]
📧 Email service: Starting to send email to [email]
📧 SMTP Config: { host: 'smtp.gmail.com', port: 587, user: 'joeally5@gmail.com' }
📧 Creating transporter...
📧 Verifying connection...
✅ SMTP connection verified
📧 Sending email...
✅ Santa email sent: [messageId]
📧 Email sent: true
✅ Status updated to sent
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Ollama Model Name Error

**Symptom:** `❌ Ollama error response: model 'deepseek-r1:latest' not found`

**Check:**
```powershell
ollama list
```

**Solution:** The model might be named differently. Update `lib/ollama-client.ts`:
```typescript
model: 'deepseek-r1', // Try without :latest
// OR
model: 'deepseek-r1:8b', // Try specific size
```

---

### Issue 2: Email Authentication Failed

**Symptom:** 
```
❌ Error sending Santa email: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution:** Gmail App Password might be incorrect
1. Go to https://myaccount.google.com/apppasswords
2. Generate new App Password
3. Update `.env.local`:
```env
SMTP_PASS=newapppasswordhere
```
4. Restart dev server

---

### Issue 3: SMTP Connection Timeout

**Symptom:**
```
❌ Error sending Santa email: Connection timeout
```

**Solutions:**
1. Check if port 587 is blocked
2. Try alternative port (465 with SSL):
```env
SMTP_PORT=465
SMTP_SECURE=true
```

---

### Issue 4: Database Error

**Symptom:**
```
Error: no such table: santa_letters
```

**Solution:** Delete and recreate database:
```powershell
rm votes.db
npm run dev
```
The database will be recreated with all tables.

---

## 🧪 Testing Steps

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Watch Terminal Logs
Keep the terminal visible to see the detailed logs

### Step 3: Submit Test Letter
1. Go to http://localhost:3000/jukebox
2. Click "Write to Santa"
3. Fill form:
   - Name: "Test Child"
   - Age: 7
   - Email: Your email
   - Letter: "Dear Santa, I would like a bike!"
4. Click Submit
5. **Watch the terminal logs**

### Step 4: Identify the Error
The logs will show exactly where it fails:
- If it stops after "📬 Received letter" → Database issue
- If it stops after "🤖 Calling Ollama" → Ollama connection issue
- If it stops after "📧 Attempting to send email" → Email issue

---

## 📋 Quick Fixes

### Fix 1: Verify Ollama Model Name
```powershell
# Check exact model name
ollama list

# If it shows "deepseek-r1" without ":latest"
# Update lib/ollama-client.ts line 64:
model: 'deepseek-r1'
```

### Fix 2: Test Email Manually
```powershell
# Test SMTP connection
node -e "const nm = require('nodemailer'); const t = nm.createTransport({host:'smtp.gmail.com',port:587,auth:{user:'joeally5@gmail.com',pass:'jchcyvawtqihqlvw'}}); t.verify().then(() => console.log('✅ Email OK')).catch(e => console.log('❌', e.message));"
```

### Fix 3: Test Ollama Directly
```powershell
# Test Ollama chat endpoint
Invoke-WebRequest -Uri "http://192.168.2.186:11434/api/chat" -Method POST -ContentType "application/json" -Body '{"model":"deepseek-r1:latest","messages":[{"role":"user","content":"Say hi"}],"stream":false}' | Select-Object -ExpandProperty Content
```

---

## 📊 Debugging Checklist

Run through this checklist:

- [ ] Dev server is running (`npm run dev`)
- [ ] Christmas theme is active
- [ ] Ollama is running (`ollama ps` shows deepseek-r1)
- [ ] Model name matches exactly (check with `ollama list`)
- [ ] `.env.local` has all SMTP settings
- [ ] Gmail App Password is correct
- [ ] Terminal shows detailed logs when submitting

---

## 🎯 Next Steps

1. **Start dev server** and keep terminal visible
2. **Submit a test letter**
3. **Copy the full error log** from the terminal
4. **Share the logs** so we can see exactly where it fails

The enhanced logging will show us exactly what's happening! 🔍
