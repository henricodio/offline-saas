import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimizaciones para Vercel
  swcMinify: true,
  productionBrowserSourceMaps: false,
  
  // Configuración de imágenes
  images: {
    unoptimized: process.env.VERCEL === "1",
  },
  
  // Configuración de headers
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
