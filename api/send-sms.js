// ============================================================
//  /api/send-sms.js  — Vercel Serverless Function
//  Termii SMS gateway — key never exposed to the browser.
//  Deploy: add TERMII_API_KEY to Vercel environment variables.
// ============================================================

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, name, destination } = req.body;

  // Basic validation
  if (!phone || !name) {
    return res.status(400).json({ error: 'phone and name are required' });
  }

  // Sanitise phone: strip spaces/dashes, ensure it starts with country code
  // Nigerian numbers: 08012345678 → 2348012345678
  let sanitised = phone.replace(/[\s\-\(\)]/g, '');
  if (sanitised.startsWith('0')) {
    sanitised = '234' + sanitised.slice(1);   // Nigeria default
  }
  if (sanitised.startsWith('+')) {
    sanitised = sanitised.slice(1);
  }

  // Build the personalised SMS message
  const dest = destination && destination !== 'Other' ? destination : 'your chosen destination';
  const message =
    `Hello ${name}, thank you for reaching out to MHU Travel & Tour!`;

  // Termii API payload
  const payload = {
    to: sanitised,
    from: 'MHU',        //  Termii sender ID 
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: process.env.TERMII_API_KEY,
  };

  try {
    const termiiRes = await fetch('https://v3.api.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const termiiData = await termiiRes.json();

    // Termii returns { message_id, message, balance, user } on success
    if (termiiRes.ok && termiiData.message_id) {
      return res.status(200).json({ success: true, message_id: termiiData.message_id });
    } else {
      console.error('Termii error:', termiiData);
      return res.status(502).json({ error: 'SMS gateway error', detail: termiiData });
    }
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
