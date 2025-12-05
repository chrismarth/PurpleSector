/**
 * Test script to verify Protocol Buffer implementation
 * 
 * Usage: node scripts/test-protobuf.js
 */

const proto = require('@purplesector/proto');

async function testProtobuf() {
  console.log('Testing Protocol Buffer implementation...\n');
  
  try {
    // Initialize protobuf
    console.log('1. Initializing protobuf...');
    await proto.init();
    console.log('   ✓ Protobuf initialized\n');
    
    // Create sample telemetry data
    const sampleTelemetry = {
      timestamp: Date.now(),
      speed: 245.5,
      throttle: 0.95,
      brake: 0.0,
      steering: -0.3,
      gear: 6,
      rpm: 8500,
      normalized_position: 0.42,
      lap_number: 3,
      lap_time: 92450,
      session_time: 1200.5,
      session_type: 2,
      track_position: 5,
      delta: -150,
    };
    
    console.log('2. Sample telemetry data:');
    console.log('   ', JSON.stringify(sampleTelemetry, null, 2).split('\n').join('\n    '));
    console.log('');
    
    // Encode to protobuf
    console.log('3. Encoding to protobuf...');
    const protobufBuffer = proto.createTelemetryMessage(sampleTelemetry);
    console.log(`   ✓ Encoded to ${protobufBuffer.length} bytes\n`);
    
    // Encode to JSON for comparison
    const jsonString = JSON.stringify({
      type: 'telemetry',
      data: sampleTelemetry,
    });
    const jsonBuffer = Buffer.from(jsonString);
    console.log(`4. JSON encoding: ${jsonBuffer.length} bytes\n`);
    
    // Calculate savings
    const savings = ((jsonBuffer.length - protobufBuffer.length) / jsonBuffer.length * 100).toFixed(1);
    console.log(`5. Size comparison:`);
    console.log(`   JSON:     ${jsonBuffer.length} bytes`);
    console.log(`   Protobuf: ${protobufBuffer.length} bytes`);
    console.log(`   Savings:  ${savings}% reduction\n`);
    
    // Decode protobuf
    console.log('6. Decoding protobuf...');
    const decoded = proto.decodeMessage(protobufBuffer);
    console.log('   ✓ Decoded successfully');
    console.log('   Type:', decoded.type);
    console.log('   Data:', decoded.telemetry ? 'present' : 'missing');
    console.log('');
    
    // Verify data integrity
    console.log('7. Verifying data integrity...');
    const telemetryData = decoded.telemetry;
    
    const checks = [
      ['timestamp', sampleTelemetry.timestamp, Number(telemetryData.timestamp)],
      ['speed', sampleTelemetry.speed, telemetryData.speed],
      ['throttle', sampleTelemetry.throttle, telemetryData.throttle],
      ['brake', sampleTelemetry.brake, telemetryData.brake],
      ['steering', sampleTelemetry.steering, telemetryData.steering],
      ['gear', sampleTelemetry.gear, telemetryData.gear],
      ['rpm', sampleTelemetry.rpm, telemetryData.rpm],
      ['lap_number', sampleTelemetry.lap_number, telemetryData.lapNumber],
      ['lap_time', sampleTelemetry.lap_time, telemetryData.lapTime],
    ];
    
    let allPassed = true;
    for (const [field, expected, actual] of checks) {
      const passed = Math.abs(expected - actual) < 0.001;
      console.log(`   ${passed ? '✓' : '✗'} ${field}: ${expected} === ${actual}`);
      if (!passed) allPassed = false;
    }
    
    console.log('');
    
    if (!allPassed) {
      console.log('✗ Some tests failed!');
      return 1;
    }
    
    console.log('');
    
    // Test control messages (START_DEMO, PING, etc.)
    console.log('8. Testing control messages...');
    
    // Create a START_DEMO message (type only, no payload)
    const startDemoMsg = proto.WebSocketMessage.create({
      type: proto.MessageType.START_DEMO,
    });
    const startDemoBuffer = proto.WebSocketMessage.encode(startDemoMsg).finish();
    console.log(`   ✓ START_DEMO encoded: ${startDemoBuffer.length} bytes`);
    
    // Decode it
    const decodedStartDemo = proto.decodeMessage(startDemoBuffer);
    const startDemoOk = decodedStartDemo.type === proto.MessageType.START_DEMO;
    console.log(`   ${startDemoOk ? '✓' : '✗'} START_DEMO decoded correctly`);
    
    // Create a PING message
    const pingMsg = proto.WebSocketMessage.create({
      type: proto.MessageType.PING,
    });
    const pingBuffer = proto.WebSocketMessage.encode(pingMsg).finish();
    console.log(`   ✓ PING encoded: ${pingBuffer.length} bytes`);
    
    const decodedPing = proto.decodeMessage(pingBuffer);
    const pingOk = decodedPing.type === proto.MessageType.PING;
    console.log(`   ${pingOk ? '✓' : '✗'} PING decoded correctly`);
    
    console.log('');
    
    if (startDemoOk && pingOk) {
      console.log('✓ All tests passed!');
      console.log('');
      console.log('Protocol Buffer implementation is working correctly.');
      console.log(`Message size reduced by ${savings}% compared to JSON.`);
      return 0;
    } else {
      console.log('✗ Control message tests failed!');
      return 1;
    }
    
  } catch (error) {
    console.error('✗ Test failed:', error);
    return 1;
  }
}

// Run tests
testProtobuf().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
