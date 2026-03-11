/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack cache in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  
  // Disable static optimization
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // Existing config
  transpilePackages: ['@purplesector/db-prisma', '@purplesector/web-charts'],
};

module.exports = nextConfig;
