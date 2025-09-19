import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "elements-resized.envatousercontent.com",
      },
    ],
  },
  // Permite requisitar recursos _next/* a partir de outro dispositivo na rede (durante o desenvolvimento)
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: [
    "http://192.168.1.9:3000",
    "http://192.168.0.103:3000",
    "http://192.168.0.103",
    "http://localhost:3000",
  ],
};

export default nextConfig;
