# 🎅 Letter to Santa - Quick Test Guide

## ✅ Dev Server is Running!

The server is now running at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.2.180:3000

---

## 📋 Testing Steps

### 1. Switch to Christmas Theme
1. Go to: **http://localhost:3000/theme-settings**
2. Log in as admin if needed
3. Click the **Christmas** theme card
4. Page should show red/green Christmas colors

### 2. Submit Test Letter
1. Go to: **http://localhost:3000/jukebox**
2. You should see a **"✉️ Write to Santa!"** button at the top
3. Click the button to open the modal
4. Fill out the form:
   - **Child Name**: "Test Child"
   - **Age**: "7"
   - **Parent Email**: `joeally5@gmail.com` (or your preferred email)
   - **Letter**: "Dear Santa, I would like a new bike for Christmas. I have been very good this year!"
5. Click **"🎁 Send to Santa! 🎁"**

### 3. Watch the Terminal Logs
**Keep your PowerShell terminal visible!** You should see logs like:

```
📬 Received letter from: Test Child
✅ Letter saved to database with ID: 1
🤖 Calling Ollama at: http://192.168.2.186:11434
🎅 Generating Santa reply for: Test Child
📍 Ollama URL: http://192.168.2.186:11434
📤 Sending request to Ollama...
📥 Ollama response status: 200
✅ Reply generated successfully
✅ LLM generated reply, length: 450
✅ Reply saved to database
📧 Attempting to send email to: joeally5@gmail.com
📧 Email service: Starting to send email
📧 SMTP Config: { host: 'smtp.gmail.com', port: 587, user: 'joeally5@gmail.com' }
📧 Creating transporter...
📧 Verifying connection...
✅ SMTP connection verified
📧 Sending email...
✅ Santa email sent: <message-id>
📧 Email sent: true
✅ Status updated to sent
```

### 4. Check Results

**If successful, you'll see:**
- ✅ Success message in the browser
- ✅ Email in your inbox from "Santa Claus 🎅"
- ✅ Letter appears in admin dashboard at http://localhost:3000/santa-letters

**If it fails:**
- ❌ Error message in browser: "Failed to send letter to Santa"
- 🔍 Terminal will show where it stopped (that's the problem!)

---

## 🐛 What to Look For in Logs

### Issue 1: Stops after "📬 Received letter"
**Problem**: Database error
**Check**: Make sure `votes.db` exists and is writable

### Issue 2: Stops after "🤖 Calling Ollama"
**Problem**: Ollama connection or model issue
**Check**: 
```powershell
ollama list  # Verify deepseek-r1:latest exists
Invoke-WebRequest -Uri "http://192.168.2.186:11434/api/tags"  # Test connection
```

### Issue 3: Shows "❌ Ollama error response"
**Problem**: Model name mismatch
**Fix**: Check the exact error message for the correct model name

### Issue 4: Stops after "📧 Attempting to send email"
**Problem**: SMTP authentication
**Check**: Gmail App Password in `.env.local`

### Issue 5: Shows "Invalid login" or "535 error"
**Problem**: Gmail App Password incorrect
**Fix**: Generate new app password at https://myaccount.google.com/apppasswords

---

## 📧 Expected Email

If everything works, you'll receive an email with:
- **From**: "Santa Claus 🎅 <joeally5@gmail.com>"
- **Subject**: "🎄 A Special Letter from Santa for Test Child! 🎅"
- **Content**: Beautiful festive HTML with personalized reply from DeepSeek-R1

---

## 🎯 Next Steps

1. ✅ Dev server is running (http://localhost:3000)
2. ⏳ Switch to Christmas theme
3. ⏳ Submit test letter
4. ⏳ Watch terminal for logs
5. ⏳ Share any error messages you see

**The logs will tell us exactly what's happening!** 🔍
