module.exports = {
  images: {
    unoptimized: true, // Para evitar otimizações que causem erros 404 em produção
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
