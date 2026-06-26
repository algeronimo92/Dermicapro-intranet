// backend/src/__tests__/platform/email.test.ts
import { sendWelcomeEmail } from '../../platform/email';

const mockSendMail = jest.fn().mockResolvedValue({});
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({ createTransport: (...args: any[]) => mockCreateTransport(...args) }));

const opts = {
  to: 'admin@clinic.com',
  clinicName: 'Clínica Test',
  adminFirstName: 'Ana',
  slug: 'clinica_test',
  tempPassword: 'abc123xyz456def7',
  loginUrl: 'http://clinica_test.localhost:5173/login',
};

describe('sendWelcomeEmail', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
    jest.clearAllMocks();
  });

  it('sends email when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'pass';
    await sendWelcomeEmail(opts);
    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@clinic.com',
        subject: expect.stringContaining('DermicaPro'),
      }),
    );
  });

  it('includes temp password in email html', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'pass';
    await sendWelcomeEmail(opts);
    const [mailOpts] = mockSendMail.mock.calls[0];
    expect(mailOpts.html).toContain(opts.tempPassword);
    expect(mailOpts.html).toContain(opts.loginUrl);
  });

  it('skips sending when SMTP is not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    await sendWelcomeEmail(opts);
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
