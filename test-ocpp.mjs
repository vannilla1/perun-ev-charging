import WebSocket from 'ws';

const OCPP_URL = 'ws://www.ecarup.com/api/Ocpp16/61242188CDF335B2';

// OCPP 1.6 message types
const CALL = 2;
const CALLRESULT = 3;
const CALLERROR = 4;

let messageId = 1;
const pendingMessages = new Map();

function generateId() {
  return String(messageId++);
}

function sendCall(ws, action, payload) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const message = [CALL, id, action, payload];
    
    console.log(`\n→ Sending ${action}:`, JSON.stringify(payload));
    
    pendingMessages.set(id, { resolve, reject, action });
    
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error(`Timeout waiting for ${action} response`));
      }
    }, 10000);
    
    ws.send(JSON.stringify(message));
  });
}

async function main() {
  console.log('Connecting to OCPP endpoint:', OCPP_URL);
  console.log('='.repeat(60));
  
  const ws = new WebSocket(OCPP_URL, ['ocpp1.6']);
  
  ws.on('open', async () => {
    console.log('✓ Connected to eCarUp OCPP!');
    
    try {
      // 1. Try BootNotification
      console.log('\n1. Sending BootNotification...');
      const bootResult = await sendCall(ws, 'BootNotification', {
        chargePointVendor: 'ePerun',
        chargePointModel: 'ChargingApp',
        chargePointSerialNumber: 'APP-001'
      });
      console.log('← BootNotification response:', JSON.stringify(bootResult));
      
    } catch (err) {
      console.error('Error:', err.message);
    }
    
    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log('Test complete. Closing connection.');
      ws.close();
      process.exit(0);
    }, 3000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const [type, id, ...rest] = message;
      
      console.log('← Received:', JSON.stringify(message));
      
      if (type === CALLRESULT && pendingMessages.has(id)) {
        const pending = pendingMessages.get(id);
        pendingMessages.delete(id);
        pending.resolve(rest[0]);
      } else if (type === CALLERROR && pendingMessages.has(id)) {
        const pending = pendingMessages.get(id);
        pendingMessages.delete(id);
        pending.reject(new Error(`${rest[0]}: ${rest[1]}`));
      } else if (type === CALL) {
        console.log('Server command:', rest[0], rest[1]);
        ws.send(JSON.stringify([CALLRESULT, id, {}]));
      }
    } catch (err) {
      console.error('Parse error:', err);
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
  
  ws.on('close', (code, reason) => {
    console.log('Connection closed:', code, reason.toString());
  });
}

main();
