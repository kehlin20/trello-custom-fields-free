/**
 * Test script to check if your Trello account can create native custom fields via API.
 *
 * Usage:
 *   TRELLO_KEY=your_key TRELLO_TOKEN=your_token BOARD_ID=your_board_id node tests/test-native-custom-fields.js
 *
 * Get your key/token from: https://trello.com/app-key
 * Board ID is the part after /b/ in your board URL.
 */

const https = require('https');

const KEY = process.env.TRELLO_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BOARD_ID = process.env.BOARD_ID;

if (!KEY || !TOKEN || !BOARD_ID) {
  console.error('Missing required environment variables: TRELLO_KEY, TRELLO_TOKEN, BOARD_ID');
  process.exit(1);
}

function apiRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({ key: KEY, token: TOKEN }).toString();
    const url = `https://api.trello.com/1${path}?${query}`;
    const options = {
      method: method,
      headers: {}
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTest() {
  console.log('Testing native custom fields API...\n');

  // Step 1: Create a text custom field
  console.log('1. Creating test custom field...');
  const createResult = await apiRequest('POST', '/customFields', {
    idModel: BOARD_ID,
    modelType: 'board',
    name: 'API Test Field',
    type: 'text',
    pos: 'bottom'
  });

  console.log('Status:', createResult.status);
  console.log('Response:', JSON.stringify(createResult.data, null, 2));

  if (createResult.status !== 200) {
    console.log('\n❌ RESULT: Native custom fields API is NOT available on your account/plan.');
    console.log('Mobile support via native fields will NOT work.');
    return;
  }

  const fieldId = createResult.data.id;
  console.log('\n✅ Custom field created with ID:', fieldId);

  // Step 2: Clean up - delete the test field
  console.log('\n2. Deleting test custom field...');
  const deleteResult = await apiRequest('DELETE', `/customFields/${fieldId}`);
  console.log('Status:', deleteResult.status);

  if (deleteResult.status === 200) {
    console.log('\n✅ RESULT: Native custom fields API works on your account!');
    console.log('We can rebuild the Power-Up to use native fields for mobile support.');
  } else {
    console.log('\n⚠️ Field was created but could not be deleted. You may want to remove it manually.');
  }
}

runTest().catch((err) => {
  console.error('Test failed with error:', err.message);
  process.exit(1);
});
