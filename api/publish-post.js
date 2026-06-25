const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

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

    // 1. Fetch request details from Supabase
    const { data: requestData, error: fetchError } = await supabase
      .from('post_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !requestData) {
      console.error('Fetch Error:', fetchError);
      return res.status(404).json({ error: 'Post request not found.' });
    }

    if (requestData.status === 'posted') {
      return res.status(400).json({ error: 'This post is already published.' });
    }

    const { headline, image_url } = requestData;

    // 2. Publish to Facebook Page via Graph API
    const fbPageId = process.env.FB_PAGE_ID;
    const fbAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!fbPageId || !fbAccessToken) {
      return res.status(500).json({ error: 'Facebook credentials are not configured in backend.' });
    }

    // Use global fetch
    const fbApiUrl = `https://graph.facebook.com/v20.0/${fbPageId}/photos`;
    const fbResponse = await fetch(fbApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: image_url,
        caption: `${headline}\n\n#FatakestoTV`,
        access_token: fbAccessToken
      })
    });

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok || fbResult.error) {
      console.error('Facebook Graph API Error:', fbResult.error);
      return res.status(500).json({ 
        error: 'Failed to publish to Facebook.', 
        details: fbResult.error ? fbResult.error.message : 'Unknown Facebook API error' 
      });
    }

    // 3. Update status in Database
    const { data: updateData, error: updateError } = await supabase
      .from('post_requests')
      .update({ status: 'posted' })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('Database Update Error:', updateError);
      // We don't fail the response here since it was successfully posted to FB,
      // but warn the client or handle it.
    }

    return res.status(200).json({ 
      success: true, 
      fb_post_id: fbResult.post_id || fbResult.id,
      request: updateData ? updateData[0] : null
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
