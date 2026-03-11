import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
}

export async function GET() {
  const services: ServiceHealth[] = [];

  // Check WebSocket server
  try {
    const wsResponse = await fetch('http://localhost:8080/health', {
      signal: AbortSignal.timeout(2000),
    });
    services.push({
      name: 'WebSocket Server',
      status: wsResponse.ok ? 'healthy' : 'unhealthy',
      message: wsResponse.ok ? 'Connected' : `HTTP ${wsResponse.status}`,
    });
  } catch (error) {
    services.push({
      name: 'WebSocket Server',
      status: 'unhealthy',
      message: 'Connection failed',
    });
  }

  // Check Redis
  try {
    const redisResponse = await fetch('http://localhost:6379', {
      signal: AbortSignal.timeout(2000),
    });
    // Redis doesn't have HTTP endpoint, but we can check if port is open
    services.push({
      name: 'Redis',
      status: 'unknown',
      message: 'Port reachable',
    });
  } catch (error) {
    // Expected to fail since Redis doesn't speak HTTP
    // In production, we'd use a proper Redis client
    services.push({
      name: 'Redis',
      status: 'unknown',
      message: 'Check via Docker',
    });
  }

  // Check RisingWave (PostgreSQL protocol on port 4566)
  try {
    const risingwaveResponse = await fetch('http://localhost:4566', {
      signal: AbortSignal.timeout(2000),
    });
    services.push({
      name: 'RisingWave',
      status: 'unknown',
      message: 'Port reachable',
    });
  } catch (error) {
    services.push({
      name: 'RisingWave',
      status: 'unknown',
      message: 'Check via Docker',
    });
  }

  // Check gRPC Gateway
  try {
    const grpcResponse = await fetch('http://localhost:50051', {
      signal: AbortSignal.timeout(2000),
    });
    services.push({
      name: 'gRPC Gateway',
      status: 'unknown',
      message: 'Port reachable',
    });
  } catch (error) {
    services.push({
      name: 'gRPC Gateway',
      status: 'unknown',
      message: 'Check via Docker',
    });
  }

  const allHealthy = services.every(s => s.status === 'healthy');
  const anyUnhealthy = services.some(s => s.status === 'unhealthy');

  return NextResponse.json({
    status: anyUnhealthy ? 'degraded' : allHealthy ? 'healthy' : 'unknown',
    services,
    timestamp: new Date().toISOString(),
  });
}
