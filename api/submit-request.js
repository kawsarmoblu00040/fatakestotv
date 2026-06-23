const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Decode base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate a unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('news-images')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image to storage' });
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('news-images')
      .getPublicUrl(filename);

    // Insert into Database
    const { data: dbData, error: dbError } = await supabase
      .from('post_requests')
      .insert([
        {
          headline,
          date: date || 'আজকের তারিখ',
          image_url: publicUrl,
          status: 'pending'
        }
      ])
      .select();

    if (dbError) {
      console.error('Database Insert Error:', dbError);
      return res.status(500).json({ error: 'Failed to save request to database' });
    }

    return res.status(200).json({ success: true, request: dbData[0] });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
