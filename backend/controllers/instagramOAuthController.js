const axios = require('axios');
const Connection = require('../models/Connection');

const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com';
const INSTAGRAM_OAUTH_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';

/**
 * GET /api/instagram-oauth/auth
 * Redirects user to Instagram OAuth authorization page.
 * Query params: ?token=<JWT> (so we know who to save the connection for)
 */
exports.initiateOAuth = (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: 'JWT token is required' });
  }

  const clientId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      success: false,
      message: 'Instagram App ID or Redirect URI not configured on server',
    });
  }

  // Pass the JWT token in the `state` param so the callback knows which user initiated the flow
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');

  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights',
  ].join(',');

  const authUrl =
    `https://www.instagram.com/oauth/authorize` +
    `?force_reauth=true` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log('🔗 Redirecting to Instagram OAuth:', authUrl);
  return res.redirect(authUrl);
};

/**
 * GET /api/instagram-oauth/callback
 * Instagram redirects the user here after they approve/deny.
 * Exchanges the code for an access token, fetches IG user info,
 * saves a Connection doc, then redirects to the frontend.
 */
exports.handleCallback = async (req, res) => {
  const { code, state, error, error_reason } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // User denied access
  if (error) {
    console.warn('❌ Instagram OAuth denied:', error, error_reason);
    return res.redirect(`${frontendUrl}/connections?ig_error=${encodeURIComponent(error_reason || error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/connections?ig_error=missing_code`);
  }

  // Decode state to get the JWT
  let userToken;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    userToken = decoded.token;
  } catch {
    return res.redirect(`${frontendUrl}/connections?ig_error=invalid_state`);
  }

  // Verify the JWT to get user info
  const jwt = require('jsonwebtoken');
  let user;
  try {
    user = jwt.verify(userToken, process.env.JWT_SECRET);
  } catch {
    return res.redirect(`${frontendUrl}/connections?ig_error=invalid_token`);
  }

  try {
    // ── Step 1: Exchange code for short-lived token ───────────────────
    const tokenRes = await axios.post(
      INSTAGRAM_OAUTH_TOKEN_URL,
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const shortLivedToken = tokenRes.data.access_token;
    const igUserId = String(tokenRes.data.user_id);
    console.log('✅ Got short-lived token for IG user:', igUserId);

    // ── Step 2: Exchange for long-lived token (60 days) ──────────────
    let longLivedToken = shortLivedToken;
    let expiresIn = 3600; // short-lived default ~1hr
    try {
      const longRes = await axios.get(`${INSTAGRAM_GRAPH_URL}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          access_token: shortLivedToken,
        },
      });
      longLivedToken = longRes.data.access_token;
      expiresIn = Number(longRes.data.expires_in) || 5184000;
      console.log('✅ Exchanged for long-lived token, expires in', expiresIn, 'seconds');
    } catch (err) {
      console.warn('⚠️ Long-lived token exchange failed, using short-lived:', err.response?.data || err.message);
    }

    // ── Step 3: Fetch IG user profile ────────────────────────────────
    let igUsername = '';
    try {
      const profileRes = await axios.get(`${INSTAGRAM_GRAPH_URL}/me`, {
        params: {
          fields: 'user_id,username',
          access_token: longLivedToken,
        },
      });
      igUsername = profileRes.data.username || '';
      console.log('📸 Instagram username:', igUsername);
    } catch (err) {
      console.warn('⚠️ Could not fetch IG profile:', err.response?.data || err.message);
    }

    // ── Step 4: Save / update Connection in DB ───────────────────────
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await Connection.findOneAndUpdate(
      { organizationId: user.organizationId, type: 'instagram' },
      {
        name: igUsername ? `@${igUsername}` : 'Instagram',
        organizationId: user.organizationId,
        type: 'instagram',
        credentials: {
          accessToken: longLivedToken,
          userId: igUserId,
          username: igUsername,
          expiresAt,
        },
        isActive: true,
        lastVerified: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Instagram connected for org ${user.organizationId} — @${igUsername} (${igUserId})`);

    // Redirect back to connections page with success flag
    return res.redirect(`${frontendUrl}/connections?ig_connected=true&ig_username=${encodeURIComponent(igUsername)}`);
  } catch (err) {
    console.error('❌ Instagram OAuth callback error:', err.response?.data || err.message);
    const msg = err.response?.data?.error_message || err.response?.data?.error?.message || 'oauth_failed';
    return res.redirect(`${frontendUrl}/connections?ig_error=${encodeURIComponent(msg)}`);
  }
};

/**
 * GET /api/instagram/status
 * Check whether the current user's org has an active Instagram connection.
 */
exports.getConnectionStatus = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      organizationId: req.user.organizationId,
      type: 'instagram',
      isActive: true,
    });

    if (!connection) {
      return res.json({ success: true, connected: false });
    }

    res.json({
      success: true,
      connected: true,
      data: {
        username: connection.credentials?.username || '',
        userId: connection.credentials?.userId || '',
        pageName: connection.credentials?.pageName || '',
        connectedAt: connection.updatedAt,
      },
    });
  } catch (err) {
    console.error('Error checking IG connection status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/instagram/disconnect
 * Remove the Instagram connection for the current org.
 */
exports.disconnect = async (req, res) => {
  try {
    await Connection.findOneAndUpdate(
      { organizationId: req.user.organizationId, type: 'instagram' },
      { isActive: false }
    );
    res.json({ success: true, message: 'Instagram disconnected' });
  } catch (err) {
    console.error('Error disconnecting Instagram:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
