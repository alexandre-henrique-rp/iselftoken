import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Adicione esta linha
  output: 'standalone',

  /* O resto das suas configurações continua igual */
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'elements-resized.envatousercontent.com',
      },
    ],
  },
  allowedDevOrigins: [
    'http://192.168.1.9:3000',
    'http://192.168.0.103:3000',
    'http://192.168.0.103',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.module?.rules?.push?.({
      test: /\.(png|jpe?g|gif|svg)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            publicPath: `/_next/static/media`,
            outputPath: 'static/media',
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;