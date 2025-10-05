/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ❌ Remove the top-level turbopack key
  experimental: {
    // ✅ Optional: Define project root properly for clarity
    turbopack: {
      root: "C:/Users/Lenovo/Desktop/codes/medicin-app",
    },
  },
};

export default nextConfig;
