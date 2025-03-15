/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  experimental: {
    ppr: true,
  },
  // This is the correct way to specify external packages in Next.js 15+
  serverExternalPackages: [],
};

module.exports = nextConfig;