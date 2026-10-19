import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/workspace",
        destination: "http://backend:8000/api/v1/workspace/",
      },
    ];
  },
};
export default config;
