import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Optimalizácie pre rýchlejšie načítanie
  reactStrictMode: true,
  poweredByHeader: false,

  // Webpack optimalizácie
  experimental: {
    optimizePackageImports: ['next-intl', 'react-leaflet'],
  },
};

export default withNextIntl(nextConfig);
