import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {};

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // En desarrollo no registramos el SW (evita cachear mientras se trabaja).
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
