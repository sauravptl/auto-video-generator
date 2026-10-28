/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use static export for production packaging with Electron
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: process.env.NODE_ENV === 'production' ? 'dist/renderer' : '.next',
  images: {
    unoptimized: true,
  },
  // Allow cross-origin asset loading inside Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
};

export default nextConfig;
