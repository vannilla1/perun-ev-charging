import WebSocket from 'ws';

// Rôzne varianty URL
const urls = [
  'ws://www.ecarup.com/api/Ocpp16/61242188CDF335B2',
  'ws://www.ecarup.com/api/Ocpp16/61242188CDF335B2/5593',
  'wss://www.ecarup.com/api/Ocpp16/61242188CDF335B2',
  'wss://www.ecarup.com/api/Ocpp16/61242188CDF335B2/5593',
  'ws://ecarup.com/api/Ocpp16/61242188CDF335B2',
  'wss://ecarup.com/api/Ocpp16/61242188CDF335B2',
];

async function testConnection(url) {
  return new Promise((resolve) => {
    console.log(`\nTrying: ${url}`);
    
    const ws = new WebSocket(url, ['ocpp1.6']);
    
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve({ url, status: 'timeout' });
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('  ✓ Connected!');
      ws.close();
      resolve({ url, status: 'connected' });
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.log('  ✗ Error:', err.message);
      resolve({ url, status: 'error', error: err.message });
    });
    
    ws.on('close', (code, reason) => {
      if (code !== 1000) {
        console.log('  ✗ Closed:', code, reason.toString());
      }
    });
  });
}

async function main() {
  console.log('Testing OCPP connection variants...');
  console.log('='.repeat(60));
  
  for (const url of urls) {
    await testConnection(url);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Done');
  process.exit(0);
}

main();
