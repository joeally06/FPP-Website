import { sendMailWithRetries } from '../lib/email-service';

(async () => {
  // Create a mock transporter factory
  const mockCreateTransport = (() => {
    let callCount = 0;
    return () => ({
      verify: async () => true,
      sendMail: async (opts: any) => {
        callCount += 1;
        if (callCount < 3) {
          const err: any = new Error('Mock connection error');
          err.code = 'ECONNREFUSED';
          throw err;
        }
        return { messageId: `mock-${Date.now()}` };
      }
    });
  })();

  const config = { host: 'mock', port: 587, secure: false, auth: { user: 'a', pass: 'b' } };
  const mailOptions = { from: 'noreply@example.com', to: 'user@example.com', subject: 'Test', text: 'Hello' };

  try {
    const info = await sendMailWithRetries(config, mailOptions, { attempts: 4, initialDelayMs: 200, factor: 2, verify: true, createTransport: mockCreateTransport });
    console.log('[test-email-retries] success, info:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('[test-email-retries] failed:', err);
    process.exit(1);
  }
})();
