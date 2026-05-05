import WebSocket from 'ws';

const OCPP_URL = 'wss://www.ecarup.com/api/Ocpp16/61242188CDF335B2/5593';

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
    
    console.log(`→ Sending ${action}:`, JSON.stringify(payload));
    
    pendingMessages.set(id, { resolve, reject, action });
    
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error(`Timeout waiting for ${action} response`));
      }
    }, 15000);
    
    ws.send(JSON.stringify(message));
  });
}

async function main() {
  console.log('Connecting to OCPP:', OCPP_URL);
  console.log('='.repeat(70));
  
  const ws = new WebSocket(OCPP_URL, ['ocpp1.6']);
  
  ws.on('open', async () => {
    console.log('✓ Connected!\n');
    
    try {
      // 1. BootNotification - identify ourselves as Central System
      console.log('1. BootNotification...');
      try {
        const boot = await sendCall(ws, 'BootNotification', {
          chargePointVendor: 'ePerun',
          chargePointModel: 'App',
          chargePointSerialNumber: '5593'
        });
        console.log('   Response:', JSON.stringify(boot));
      } catch (e) {
        console.log('   Error:', e.message);
      }
      
      // 2. StatusNotification
      console.log('\n2. StatusNotification...');
      try {
        const status = await sendCall(ws, 'StatusNotification', {
          connectorId: 1,
          errorCode: 'NoError',
          status: 'Available'
        });
        console.log('   Response:', JSON.stringify(status));
      } catch (e) {
        console.log('   Error:', e.message);
      }
      
      // 3. RemoteStartTransaction - THIS IS WHAT WE NEED!
      console.log('\n3. RemoteStartTransaction (test with dummy idTag)...');
      try {
        const start = await sendCall(ws, 'RemoteStartTransaction', {
          connectorId: 1,
          idTag: 'TESTCARD001'
        });
        console.log('   Response:', JSON.stringify(start));
      } catch (e) {
        console.log('   Error:', e.message);
      }
      
      // 4. Heartbeat
      console.log('\n4. Heartbeat...');
      try {
        const hb = await sendCall(ws, 'Heartbeat', {});
        console.log('   Response:', JSON.stringify(hb));
      } catch (e) {
        console.log('   Error:', e.message);
      }
      
    } catch (err) {
      console.error('General error:', err.message);
    }
    
    setTimeout(() => {
      console.log('\n' + '='.repeat(70));
      console.log('Test complete.');
      ws.close();
      process.exit(0);
    }, 2000);
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    const [type, id, ...rest] = message;
    
    console.log('← Received:', JSON.stringify(message));
    
    if (type === CALLRESULT && pendingMessages.has(id)) {
      pendingMessages.get(id).resolve(rest[0]);
      pendingMessages.delete(id);
    } else if (type === CALLERROR && pendingMessages.has(id)) {
      pendingMessages.get(id).reject(new Error(`${rest[0]}: ${rest[1]}`));
      pendingMessages.delete(id);
    } else if (type === CALL) {
      // Incoming command from server - respond
      console.log('   Server command:', rest[0]);
      ws.send(JSON.stringify([CALLRESULT, id, {}]));
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    process.exit(1);
  });
  
  ws.on('close', (code, reason) => {
    if (code !== 1000) {
      console.log('Connection closed unexpectedly:', code, reason.toString());
    }
  });
}

main();
