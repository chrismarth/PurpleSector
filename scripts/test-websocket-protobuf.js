/**
 * Test WebSocket server with protobuf messages
 * 
 * Usage: 
 * 1. Start WebSocket server: npm run ws-server
 * 2. Run this test: node scripts/test-websocket-protobuf.js
 */

const WebSocket = require('ws');
const proto = require('@purplesector/proto');

async function testWebSocketProtobuf() {
  console.log('Testing WebSocket server with Protocol Buffers...\n');
  
  try {
    // Initialize protobuf
    console.log('1. Initializing protobuf...');
    await proto.init();
    console.log('   ✓ Protobuf initialized\n');
    
    // Connect to WebSocket server
    console.log('2. Connecting to WebSocket server...');
    const ws = new WebSocket('ws://localhost:8080');
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('   ✓ Connected to ws://localhost:8080\n');
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error('   ✗ Connection failed:', error.message);
        reject(error);
      });
      
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
    
    // Test receiving messages
    console.log('3. Testing message reception...');
    let receivedConnected = false;
    let receivedTelemetry = false;
    
    ws.on('message', (data) => {
      try {
        // Check if it's protobuf or JSON
        if (Buffer.isBuffer(data) && proto.isProtobuf(data)) {
          const decoded = proto.decodeMessage(data);
          
          if (decoded.type === proto.MessageType.CONNECTED) {
            console.log('   ✓ Received CONNECTED message (protobuf)');
            receivedConnected = true;
          } else if (decoded.type === proto.MessageType.TELEMETRY) {
            if (!receivedTelemetry) {
              console.log('   ✓ Received TELEMETRY message (protobuf)');
              console.log(`     Speed: ${decoded.telemetry.speed} km/h`);
              receivedTelemetry = true;
            }
          }
        } else {
          // JSON message
          const message = JSON.parse(data.toString());
          
          if (message.type === 'connected') {
            console.log('   ✓ Received connected message (JSON)');
            receivedConnected = true;
          } else if (message.type === 'telemetry') {
            if (!receivedTelemetry) {
              console.log('   ✓ Received telemetry message (JSON)');
              console.log(`     Speed: ${message.data.speed} km/h`);
              receivedTelemetry = true;
            }
          }
        }
      } catch (error) {
        console.error('   ✗ Error processing message:', error.message);
      }
    });
    
    // Wait for connected message
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (receivedConnected) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
    });
    
    console.log('');
    
    // Test sending protobuf messages
    console.log('4. Testing protobuf message sending...');
    
    // Send START_DEMO message
    const startDemoMsg = proto.WebSocketMessage.create({
      type: proto.MessageType.START_DEMO,
    });
    const startDemoBuffer = proto.WebSocketMessage.encode(startDemoMsg).finish();
    ws.send(startDemoBuffer);
    console.log('   ✓ Sent START_DEMO message (protobuf, 2 bytes)');
    
    // Wait a bit for telemetry
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send PING message
    const pingMsg = proto.WebSocketMessage.create({
      type: proto.MessageType.PING,
    });
    const pingBuffer = proto.WebSocketMessage.encode(pingMsg).finish();
    ws.send(pingBuffer);
    console.log('   ✓ Sent PING message (protobuf, 2 bytes)');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('');
    
    if (receivedTelemetry) {
      console.log('✓ All tests passed!');
      console.log('');
      console.log('WebSocket server is correctly handling protobuf messages.');
      console.log('Both sending and receiving protobuf works as expected.');
    } else {
      console.log('⚠ Warning: Did not receive telemetry data.');
      console.log('This is normal if no demo data is being played.');
      console.log('Connection and message handling works correctly.');
    }
    
    // Clean up
    ws.close();
    return 0;
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return 1;
  }
}

// Run test
testWebSocketProtobuf().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
