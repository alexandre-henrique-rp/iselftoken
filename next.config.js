module.exports = {
  images: {
    unoptimized: true, // Para evitar otimizações que causem erros 404 em produção
  },
  // Permite carregar recursos _next/* quando acessando o dev server a partir de outro dispositivo na rede (LAN)
  // Leia mais: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: [
    "http://192.168.1.9:3000",
    "http://192.168.0.103:3000",
    "http://localhost:3000",
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
    config.module.rules.push({
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
}
