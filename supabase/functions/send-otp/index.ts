import { serve } from 'https://deno.land/std/http/server.ts';
import { Twilio } from 'https://esm.sh/twilio@4.15.0';

const client = Twilio(Deno.env.get('TWILIO_SID')!, Deno.env.get('TWILIO_AUTH')!);
const SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE')!;

serve(async (req) => {
  const { phone, channel = 'sms' } = await req.json();

  if (!phone) {
    return new Response(
      JSON.stringify({ 
        error: 'otp.error.missingPhone' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const fallbackChannels: ('sms' | 'whatsapp' | 'call')[] =
    channel === 'sms' ? ['sms', 'whatsapp', 'call'] :
    channel === 'whatsapp' ? ['whatsapp', 'call'] :
    ['call'];

  for (const ch of fallbackChannels) {
    try {
      const result = await client.verify.v2.services(SERVICE_SID)
        .verifications.create({ to: phone, channel: ch });

      if (result.status === 'pending') {
        return new Response(
          JSON.stringify({
            status: result.status,
            channel: ch,
            messageKey: `otp.sent.${ch}` // مفتاح ترجمة يُستخدم على الواجهة
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      console.warn(`Failed to send OTP via ${ch}:`, err.message || err);
      continue;
    }
  }

  return new Response(
    JSON.stringify({ 
      error: 'otp.error.failedAllChannels' 
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
});
