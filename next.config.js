/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@monaco-editor/react'],
  experimental: {
    serverComponentsExternalPackages: ['@monaco-editor/react']
  }
}

module.exports = nextConfig
