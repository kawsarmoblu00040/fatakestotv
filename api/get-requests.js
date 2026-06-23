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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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
    const { data, error } = await supabase
      .from('post_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch requests.' });
    }

    return res.status(200).json({ success: true, requests: data });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
