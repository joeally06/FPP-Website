import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Read allowed origins from environment variable, fallback to localhost
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS.split(',')
    : ['localhost', '127.0.0.1'],
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://*.youtube.com",
              "script-src-elem 'self' 'unsafe-inline' https://www.youtube.com https://*.youtube.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: https://img.youtube.com https://*.youtube.com https://*.googlevideo.com",
              "connect-src 'self' https://www.youtube.com https://*.youtube.com https://*.googlevideo.com https://www.googleapis.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com",
              "media-src 'self' https://*.googlevideo.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
