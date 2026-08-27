/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  env: { WEB_UI_API_URL: process.env.WEB_UI_API_URL },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/search',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
