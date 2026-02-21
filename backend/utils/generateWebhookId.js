const { v4: uuidv4 } = require('uuid');

const generateWebhookId = () => {
  return `webhook_${uuidv4()}`;
};

module.exports = generateWebhookId;
