const axios = require('axios');
const https = require('https');
const jwt = require('jsonwebtoken');
const LinkedInAccount = require('../models/LinkedInAccount');

// Force IPv4 to avoid ETIMEDOUT when Node tries IPv6 first
const httpsAgent = new https.Agent({ family: 4 });

// Redirects the browser to LinkedIn's OAuth consent screen
exports.startOAuth = (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const scope = 'openid profile email w_member_social';

  // Decode the JWT token passed as query param to get the userId
  let userId = '';
  const token = req.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      console.error('Invalid token in LinkedIn OAuth start:', err.message);
    }
  }

  // Optional returnTo path so we can redirect back to the right page
  const returnTo = req.query.returnTo || '/workflows';

  console.log('LinkedIn OAuth start — userId:', userId, 'returnTo:', returnTo);

  // Encode userId and returnTo in the state parameter as base64 JSON
  const statePayload = JSON.stringify({ userId, returnTo });
  const stateEncoded = Buffer.from(statePayload).toString('base64url');

  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(stateEncoded)}`;

  res.redirect(authUrl);
};

// LinkedIn redirects here after user consents
exports.handleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Decode state — supports both new base64-JSON format and legacy plain userId
  let appUserId = '';
  let returnTo = '/workflows';
  const stateParam = req.query.state;
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      appUserId = decoded.userId || '';
      returnTo = decoded.returnTo || '/workflows';
    } catch {
      appUserId = stateParam;
    }
  }

  try {
    console.log('🔗 LinkedIn callback query params:', req.query);

    const { code, error, error_description } = req.query;

    if (error) {
      console.error('❌ LinkedIn OAuth error:', error, error_description);
      return res.redirect(`${frontendUrl}${returnTo}?linkedin=error&reason=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Missing authorization code' });
    }

    // 1. Exchange code for access_token
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    console.log('📋 LinkedIn token response keys:', Object.keys(tokenRes.data));

    const { access_token, expires_in, id_token } = tokenRes.data;

    // 2. Extract the user's LinkedIn id
    //    With `openid` scope LinkedIn returns an id_token JWT — decode its
    //    payload to get the `sub` claim, no extra API call needed.
    let linkedInId;

    if (id_token) {
      // Decode the JWT payload (base64url) — no verification needed, we trust LinkedIn here
      const payloadB64 = id_token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      linkedInId = payload.sub;
      console.log('📋 Decoded id_token sub:', linkedInId);
    } else {
      // Fallback: call /v2/userinfo if anything goes wrong.
      const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
        timeout: 10000,
      });
      linkedInId = profileRes.data.sub;
      console.log('📋 Fetched userinfo sub:', linkedInId);
    }

    const memberUrn = `urn:li:person:${linkedInId}`;

    // 3. Upsert into our database
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await LinkedInAccount.findOneAndUpdate(
      { appUserId },
      { accessToken: access_token, memberUrn, expiresAt },
      { upsert: true, new: true }
    );

    console.log(`LinkedIn connected for user ${appUserId}  urn=${memberUrn}`);

    // 4. Redirect back to the frontend page
    res.redirect(`${frontendUrl}${returnTo}?linkedin=connected`);
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err.response?.data || err.message || err);
    res.redirect(`${frontendUrl}${returnTo}?linkedin=error`);
  }
};

// Check if the current user has a linked LinkedIn account
exports.getStatus = async (req, res) => {
  try {
    const account = await LinkedInAccount.findOne({ appUserId: req.user.userId });
    if (!account) {
      return res.json({ success: true, connected: false });
    }
    res.json({
      success: true,
      connected: true,
      memberUrn: account.memberUrn,
      expiresAt: account.expiresAt,
    });
  } catch (err) {
    console.error('LinkedIn status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a simple text post for user
exports.testPost = async (req, res) => {
  try {
    const account = await LinkedInAccount.findOne({ appUserId: req.user.userId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'LinkedIn account not connected' });
    }

    const text = req.body.text || 'Hello from FlowPilot automation platform! 🚀';

    const payload = {
      author: account.memberUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const postRes = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      payload,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        httpsAgent,
        timeout: 15000,
      }
    );

    console.log('✅ LinkedIn post created:', postRes.data.id);

    res.json({
      success: true,
      message: 'Posted to LinkedIn successfully',
      postId: postRes.data.id,
    });
  } catch (err) {
    console.error('LinkedIn test-post error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to post to LinkedIn',
      error: err.response?.data || err.message,
    });
  }
};

// Remove the stored LinkedIn account
exports.disconnect = async (req, res) => {
  try {
    await LinkedInAccount.findOneAndDelete({ appUserId: req.user.userId });
    res.json({ success: true, message: 'LinkedIn disconnected' });
  } catch (err) {
    console.error('LinkedIn disconnect error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
