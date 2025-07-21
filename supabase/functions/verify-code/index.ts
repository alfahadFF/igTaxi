import { serve } from 'https://deno.land/std/http/server.ts';
import { Twilio } from 'https://esm.sh/twilio@4.15.0';

const client = Twilio(Deno.env.get('TWILIO_SID')!, Deno.env.get('TWILIO_AUTH')!);
const SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE')!;

serve(async (req) => {
  const { phone, code } = await req.json();

  if (!phone || !code) {
    return new Response(
      JSON.stringify({ error: 'otp.verify.missingData' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await client.verify.v2.services(SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    if (result.status === 'approved') {
      return new Response(
        JSON.stringify({
          status: result.status,
          messageKey: 'otp.verify.success'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        status: result.status,
        error: 'otp.verify.invalidCode'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: 'otp.verify.failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
