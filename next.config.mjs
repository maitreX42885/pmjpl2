/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack(config) {
    config.output.globalObject = 'self';
    return config;
  },
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
