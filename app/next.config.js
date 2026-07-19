/** @type {import('next').NextConfig} */
const imageOptimizationDisabled = process.env.NEXT_IMAGE_UNOPTIMIZED === '1'
const splitCsv = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean)
const primarySiteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || process.env.SITE_DOMAIN || 'paramascotasec.com'
const publicSiteHosts = Array.from(new Set([
    primarySiteDomain,
    ...splitCsv(process.env.NEXT_PUBLIC_SITE_ALIASES || process.env.SITE_ALIASES || `www.${primarySiteDomain}`),
]))
const localSiteHosts = splitCsv(process.env.NEXT_PUBLIC_SITE_LOCAL_IPS || process.env.PRIMARY_SITE_LOCAL_IPS)
const uploadsPublicBaseUrl = (() => {
    const raw = (process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || '').trim()
    if (!raw) return null
    try {
        const url = new URL(raw)
        return url.protocol === 'https:' ? url : null
    } catch {
        return null
    }
})()
const allowedDevOrigins = process.env.NODE_ENV === 'production'
    ? publicSiteHosts
    : [
        ...publicSiteHosts,
        ...localSiteHosts,
        'localhost',
        '127.0.0.1',
    ]

const securityHeaders = [
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=()',
    },
    {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
    },
    {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
    },
    {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin',
    },
    {
        key: 'Origin-Agent-Cluster',
        value: '?1',
    },
    {
        key: 'X-Frontend-Channel',
        value: 'ecommerce',
    },
]

const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    poweredByHeader: false,
    allowedDevOrigins,
    images: {
        minimumCacheTTL: 0,
        unoptimized: imageOptimizationDisabled,
        qualities: [75, 85, 90, 92],
        formats: ['image/avif', 'image/webp'],
        localPatterns: [
            {
                pathname: '/**',
            },
        ],
        deviceSizes: [360, 420, 576, 640, 750, 768, 828, 992, 1080, 1200, 1320, 1536, 1920, 2048, 2560, 3840],
        imageSizes: [96, 128, 150, 180, 202, 220, 256, 300, 360, 420, 472, 496, 520, 630, 750, 960, 1200, 1600, 2000],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
            ...(process.env.NODE_ENV === 'production'
                ? []
                : [{
                    protocol: 'http',
                    hostname: 'localhost',
                    port: '8080',
                }]),
            ...publicSiteHosts.map((hostname) => ({
                protocol: 'https',
                hostname,
            })),
            ...(uploadsPublicBaseUrl
                ? [{
                    protocol: 'https',
                    hostname: uploadsPublicBaseUrl.hostname,
                    port: uploadsPublicBaseUrl.port,
                    pathname: `${uploadsPublicBaseUrl.pathname.replace(/\/$/, '')}/**`,
                }]
                : []),
        ],
    },
    async headers() {
        if (process.env.NODE_ENV !== 'production') {
            return []
        }

        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
            {
                source: '/images/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/uploads/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ]
    },
    async rewrites() {
        return [
            {
                source: '/images/:path*.jpg',
                destination: '/images/:path*.webp',
            },
            {
                source: '/images/:path*.jpeg',
                destination: '/images/:path*.webp',
            },
            {
                source: '/uploads/:path*.jpg',
                destination: '/uploads/:path*.webp',
            },
            {
                source: '/uploads/:path*.jpeg',
                destination: '/uploads/:path*.webp',
            },
        ]
    },
}

module.exports = nextConfig
