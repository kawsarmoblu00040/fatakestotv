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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const adminPassword = req.headers['x-admin-password'];
  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase credentials are not configured.' });
  }

  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Missing request ID.' });
    }

    // 1. Get request to find image filename for deletion
    const { data: requestData, error: fetchError } = await supabase
      .from('post_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !requestData) {
      console.error('Fetch Error:', fetchError);
      return res.status(404).json({ error: 'Post request not found.' });
    }

    // Try to delete image from Supabase Storage
    try {
      const imageUrl = requestData.image_url;
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      if (filename) {
        const { error: storageError } = await supabase
          .storage
          .from('news-cards')
          .remove([filename]);
        
        if (storageError) {
          console.warn('Storage deletion warning:', storageError);
        }
      }
    } catch (err) {
      console.warn('Failed to delete image from storage:', err);
    }

    // 2. Delete from database
    const { error: deleteError } = await supabase
      .from('post_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database Delete Error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete request from database.' });
    }

    return res.status(200).json({ success: true, message: 'Request deleted successfully.' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
