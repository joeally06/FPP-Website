import { sendMailWithRetries } from '../lib/email-service';

(async () => {
  // Create a mock transporter factory that fails with a permanent error (EAUTH)
  const mockCreateTransport = (() => {
    return () => ({
      verify: async () => true,
      sendMail: async (opts: any) => {
        const err: any = new Error('Auth failed');
        err.code = 'EAUTH';
        throw err;
      }
    });
  })();

  const config = { host: 'mock', port: 587, secure: false, auth: { user: 'a', pass: 'b' } };
  const mailOptions = { from: 'noreply@example.com', to: 'user@example.com', subject: 'Test', text: 'Hello' };

  try {
    await sendMailWithRetries(config, mailOptions, { attempts: 3, initialDelayMs: 200, factor: 2, verify: true, createTransport: mockCreateTransport });
    console.error('[test-email-retries-auth-fail] ❌ Expected auth failure to throw');
    process.exit(2);
  } catch (err: any) {
    if (err.code === 'EAUTH') {
      console.log('[test-email-retries-auth-fail] ✅ Auth error not retried and thrown as expected');
      process.exit(0);
    }
    console.error('[test-email-retries-auth-fail] ❌ Unexpected error:', err);
    process.exit(3);
  }
})();
