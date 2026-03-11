#!/usr/bin/env python3
"""
Time Ticker Service for RisingWave

Sends a heartbeat timestamp to Redpanda every second.
This provides a deterministic "NOW()" for RisingWave materialized views
to filter out WAL burst data from live dashboards.
"""

import json
import time
import os
from datetime import datetime, timezone
from confluent_kafka import Producer
from confluent_kafka import KafkaException

# Configuration
REDPANDA_BROKER = os.getenv('REDPANDA_BROKER', 'localhost:9092')
TICKER_TOPIC = 'time-heartbeat'
TICKER_INTERVAL = 1.0  # seconds

def create_producer():
    """Create Kafka producer with retry logic"""
    max_retries = 10
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            producer = Producer({
                'bootstrap.servers': REDPANDA_BROKER,
                'acks': 'all',
                'retries': 3,
                'socket.timeout.ms': 10000,
                'api.version.request': True
            })
            print(f"✓ Connected to Redpanda at {REDPANDA_BROKER}")
            return producer
        except KafkaException as e:
            if attempt < max_retries - 1:
                print(f"⚠ Failed to connect to Redpanda (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"  Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                raise

def delivery_callback(err, msg):
    """Callback for message delivery reports"""
    if err:
        print(f"✗ Failed to deliver message: {err}")
    else:
        print(f"✓ Heartbeat sent to {msg.topic()} [partition {msg.partition()}] @ offset {msg.offset()}")

def main():
    print(f"🕐 Starting Time Ticker Service")
    print(f"   Broker: {REDPANDA_BROKER}")
    print(f"   Topic: {TICKER_TOPIC}")
    print(f"   Interval: {TICKER_INTERVAL}s")
    print()
    
    producer = create_producer()
    
    try:
        while True:
            # Create heartbeat with current UTC timestamp
            # Format as ISO 8601 with timezone for RisingWave TIMESTAMPTZ
            current_time = datetime.now(timezone.utc)
            heartbeat = {
                "ticker_id": 1,
                "current_ts": current_time.isoformat()  # ISO 8601: 2026-03-04T19:25:55.123456+00:00
            }
            
            # Send to Kafka
            try:
                producer.produce(
                    TICKER_TOPIC,
                    value=json.dumps(heartbeat).encode('utf-8'),
                    callback=delivery_callback
                )
                # Trigger delivery report callbacks
                producer.poll(0)
            except BufferError:
                print(f"⚠ Local producer queue is full ({len(producer)} messages awaiting delivery)")
                producer.poll(1)
            except Exception as e:
                print(f"✗ Failed to send heartbeat: {e}")
            
            # Sleep until next interval
            time.sleep(TICKER_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n⏹ Shutting down Time Ticker Service...")
    finally:
        # Wait for any outstanding messages to be delivered
        print("⏳ Flushing remaining messages...")
        producer.flush(timeout=10)
        print("✓ Producer closed")

if __name__ == '__main__':
    main()
