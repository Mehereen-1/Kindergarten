/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep onnxruntime-node (native .node binaries) out of webpack bundling
  experimental: {
    serverComponentsExternalPackages: ['onnxruntime-node'],
  },
  webpack(config, { isServer }) {
    // Prevent webpack from trying to process native .node binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

export default nextConfig;
