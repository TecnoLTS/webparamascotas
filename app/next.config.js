/** @type {import('next').NextConfig} */
const imageOptimizationDisabled = process.env.NEXT_IMAGE_UNOPTIMIZED === '1'
const allowedDevOrigins = process.env.NODE_ENV === 'production'
    ? ['paramascotasec.com', 'www.paramascotasec.com']
    : [
        'paramascotasec.com',
        'www.paramascotasec.com',
        '192.168.100.229',
        '80.241.213.31',
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
]

const nextConfig = {
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
            {
                protocol: 'https',
                hostname: 'api.paramascotasec.com',
            },
            {
                protocol: 'https',
                hostname: 'paramascotasec.com',
            },
            {
                protocol: 'https',
                hostname: 'www.paramascotasec.com',
            },
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
