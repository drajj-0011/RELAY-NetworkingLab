/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mongoose is a Node-only driver and must never be bundled by the compiler.
  serverExternalPackages: ["mongoose"],
};

module.exports = nextConfig;
