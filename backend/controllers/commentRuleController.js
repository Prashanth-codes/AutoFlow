const CommentRule = require('../models/CommentRule');

// ─── List all rules for the user's organisation ──────────────────────────────
exports.getRules = async (req, res) => {
  try {
    const rules = await CommentRule.find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    console.error('Error fetching comment rules:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Get a single rule ───────────────────────────────────────────────────────
exports.getRule = async (req, res) => {
  try {
    const rule = await CommentRule.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) {
    console.error('Error fetching comment rule:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Create a new rule ───────────────────────────────────────────────────────
exports.createRule = async (req, res) => {
  try {
    const { keyword, targetReelUrl, targetMediaId, dmMessage, dmLink, dmButtonText } = req.body;

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ success: false, message: 'Keyword is required' });
    }

    if (!dmMessage?.trim() && !dmLink?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a DM message or a link to send',
      });
    }

    const rule = await CommentRule.create({
      organizationId: req.user.organizationId,
      createdBy: req.user.userId,
      keyword: keyword.trim(),
      targetReelUrl: targetReelUrl || '',
      targetMediaId: targetMediaId || '',
      dmMessage: dmMessage || '',
      dmLink: dmLink || '',
      dmButtonText: dmButtonText || 'Open Link',
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    console.error('Error creating comment rule:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Update a rule ───────────────────────────────────────────────────────────
exports.updateRule = async (req, res) => {
  try {
    const { keyword, targetReelUrl, targetMediaId, dmMessage, dmLink, dmButtonText, enabled } =
      req.body;

    const rule = await CommentRule.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    if (keyword !== undefined) rule.keyword = keyword.trim();
    if (targetReelUrl !== undefined) rule.targetReelUrl = targetReelUrl;
    if (targetMediaId !== undefined) rule.targetMediaId = targetMediaId;
    if (dmMessage !== undefined) rule.dmMessage = dmMessage;
    if (dmLink !== undefined) rule.dmLink = dmLink;
    if (dmButtonText !== undefined) rule.dmButtonText = dmButtonText;
    if (enabled !== undefined) rule.enabled = enabled;

    await rule.save();
    res.json({ success: true, data: rule });
  } catch (err) {
    console.error('Error updating comment rule:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Delete a rule ───────────────────────────────────────────────────────────
exports.deleteRule = async (req, res) => {
  try {
    const rule = await CommentRule.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    console.error('Error deleting comment rule:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Toggle enabled/disabled ─────────────────────────────────────────────────
exports.toggleRule = async (req, res) => {
  try {
    const rule = await CommentRule.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    rule.enabled = !rule.enabled;
    await rule.save();
    res.json({ success: true, data: rule });
  } catch (err) {
    console.error('Error toggling comment rule:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
