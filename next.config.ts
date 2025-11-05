import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.2.180'],
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "connect-src 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
