import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://backend:8000/api/v1/auth/:path*/",
      },
      {
        source: "/api/attendance",
        destination: "http://backend:8000/api/v1/attendance/",
      },
      {
        source: "/api/settings",
        destination: "http://backend:8000/api/v1/settings/",
      },
      {
        source: "/api/finance",
        destination: "http://backend:8000/api/v1/finance/",
      },
      {
        source: "/api/library",
        destination: "http://backend:8000/api/v1/library/",
      },
      {
        source: "/api/examinations",
        destination: "http://backend:8000/api/v1/examinations/",
      },
      {
        source: "/api/planning",
        destination: "http://backend:8000/api/v1/planning/",
      },
      {
        source: "/api/dashboard",
        destination: "http://backend:8000/api/v1/dashboard/",
      },
      {
        source: "/api/workspace",
        destination: "http://backend:8000/api/v1/workspace/",
      },
    ];
  },
};
export default config;
