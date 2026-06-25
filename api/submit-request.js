const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase credentials are not configured.' });
  }

  try {
    const { headline, date, image } = req.body;

    if (!image || !headline) {
      return res.status(400).json({ error: 'Missing image or headline' });
    }

    // Store base64 image directly in database (no storage needed)
    // Limit image size
    const maxSize = 4 * 1024 * 1024; // 4MB limit
    const imageSizeBytes = Buffer.byteLength(image, 'utf8');
    if (imageSizeBytes > maxSize) {
      return res.status(400).json({ error: 'Image is too large. Please try again.' });
    }

    // Insert into Database with base64 image stored directly
    const { data: dbData, error: dbError } = await supabase
      .from('post_requests')
      .insert([
        {
          headline,
          date: date || 'আজকের তারিখ',
          image_url: image, // Store base64 data URL directly
          status: 'pending'
        }
      ])
      .select();

    if (dbError) {
      console.error('Database Insert Error:', JSON.stringify(dbError));
      return res.status(500).json({ error: 'DB Error: ' + dbError.message + ' | Code: ' + dbError.code + ' | Details: ' + dbError.details });
    }

    return res.status(200).json({ success: true, request: dbData[0] });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
