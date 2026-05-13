'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { versionLocalImagePath } from '@/lib/staticAsset'

type SliderSuffix =
  | 'mobile-xs'
  | 'mobile'
  | 'mobile-wide'
  | 'tablet'
  | 'laptop'
  | 'desktop-1440'
  | 'desktop'
  | 'fhd'
  | 'qhd'
  | 'uhd'

type LegacySuffix = '243' | '720' | '1080' | '1920' | '2k' | '4k'
type SlideId = 1 | 2 | 3

type SlideContent = {
  id: SlideId
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}

const AUTOPLAY_DELAY_MS = 7000

const slides: SlideContent[] = [
  {
    id: 1,
    title: 'ParaMascotasEC: tienda de mascotas online en Ecuador',
    subtitle:
      'Alimento para perros y gatos, accesorios, ropa, snacks y cuidado para comprar online con atención cercana.',
    ctaLabel: 'Descubrir ahora',
    ctaHref: '/tienda',
  },
  {
    id: 2,
    title: '¡Un hincha más en casa!',
    subtitle:
      'Comparte la pasión con tu peludito y celebren juntos cada gol con la camiseta de la Tri.',
    ctaLabel: 'Consíguela aquí',
    ctaHref: '/tienda/ropa?query=camiseta',
  },
  {
    id: 3,
    title: 'Todo lo que ama, en un solo lugar',
    subtitle:
      'Pequeños detalles que lo hacen feliz, con la calidad y cuidado que se merece.',
    ctaLabel: 'Explorar tienda',
    ctaHref: '/tienda/alimento',
  },
]

const legacyFallbackBySuffix: Record<SliderSuffix, LegacySuffix[]> = {
  'mobile-xs': ['243', '720'],
  mobile: ['243', '720'],
  'mobile-wide': ['720', '243'],
  tablet: ['720', '1080'],
  laptop: ['1080', '720'],
  'desktop-1440': ['1080', '1920'],
  desktop: ['1080', '1920'],
  fhd: ['1920', '1080'],
  qhd: ['2k', '1920'],
  uhd: ['4k', '2k'],
}

const sourceOrder: Array<{ media?: string; suffix: SliderSuffix }> = [
  { media: '(min-width: 3840px)', suffix: 'uhd' },
  { media: '(min-width: 2560px)', suffix: 'qhd' },
  { media: '(min-width: 1920px)', suffix: 'fhd' },
  { media: '(min-width: 1536px)', suffix: 'desktop' },
  { media: '(min-width: 1280px)', suffix: 'desktop-1440' },
  { media: '(min-width: 1024px)', suffix: 'laptop' },
  { media: '(min-width: 768px)', suffix: 'tablet' },
  { media: '(min-width: 640px)', suffix: 'mobile-wide' },
  { media: '(min-width: 480px)', suffix: 'mobile' },
  { suffix: 'mobile-xs' },
]

const sliderDimensions: Record<SliderSuffix, { width: number; height: number }> = {
  'mobile-xs': { width: 960, height: 480 },
  mobile: { width: 1200, height: 600 },
  'mobile-wide': { width: 1440, height: 550 },
  tablet: { width: 1920, height: 800 },
  laptop: { width: 2560, height: 533 },
  'desktop-1440': { width: 1440, height: 281 },
  desktop: { width: 2560, height: 500 },
  fhd: { width: 3840, height: 720 },
  qhd: { width: 5120, height: 1300 },
  uhd: { width: 6400, height: 2200 },
}

const buildCandidateSources = (slide: SlideId, suffix: SliderSuffix) =>
  Array.from(
    new Set([
      `/images/slider/slade${slide}-${suffix}.webp`,
      ...legacyFallbackBySuffix[suffix].map((legacy) => `/images/slider/slade${slide}-${legacy}.webp`),
    ]),
  )

const getHeroImageProps = ({
  alt,
  priority,
  slide,
  suffix,
}: {
  alt: string
  priority?: boolean
  slide: SlideId
  suffix: SliderSuffix
}) => {
  const dimensions = sliderDimensions[suffix]
  const generatedName = suffix === 'desktop-1440'
    ? `/images/slider/generated/slade${slide}-desktop-1440.webp`
    : `/images/slider/generated/slade${slide}-${suffix}.webp`
  const fallbackName = suffix === 'desktop-1440'
    ? `/images/slider/slade${slide}-desktop.webp`
    : `/images/slider/slade${slide}-${suffix}.webp`

  return {
    alt,
    decoding: 'async' as const,
    fetchPriority: priority ? 'high' as const : 'auto' as const,
    height: dimensions.height,
    loading: priority ? 'eager' as const : 'lazy' as const,
    src: versionLocalImagePath(fallbackName),
    webpSrc: versionLocalImagePath(generatedName),
    width: dimensions.width,
  }
}

const HeroPicture = ({
  alt,
  slide,
  priority,
}: {
  alt: string
  slide: SlideId
  priority?: boolean
}) => {
  const fallbackCandidates = buildCandidateSources(slide, 'desktop')
  const [fallbackIndex, setFallbackIndex] = useState(0)

  useEffect(() => {
    setFallbackIndex(0)
  }, [slide])

  const fallbackSrc = fallbackCandidates[Math.min(fallbackIndex, fallbackCandidates.length - 1)]
  const fallbackProps = getHeroImageProps({
    alt,
    priority,
    slide,
    suffix: 'desktop',
  })
  const { webpSrc: _fallbackWebpSrc, ...fallbackImageProps } = fallbackProps

  return (
    <picture className="block h-full w-full">
      {sourceOrder.map(({ media, suffix }) => {
        const sourceProps = getHeroImageProps({ alt, priority, slide, suffix })

        return (
          <source
            key={`${slide}-${suffix}`}
            media={media}
            srcSet={sourceProps.webpSrc}
            type="image/webp"
          />
        )
      })}
      <img
        {...fallbackImageProps}
        alt={alt}
        onError={() => {
          setFallbackIndex((prev) => (prev >= fallbackCandidates.length - 1 ? prev : prev + 1))
        }}
        src={versionLocalImagePath(fallbackSrc)}
        className="block h-full w-full object-cover object-center"
      />
    </picture>
  )
}

const SliderSlideContent = ({
  active,
  slide,
  priority,
}: {
  active: boolean
  slide: SlideContent
  priority?: boolean
}) => {
  const shouldRenderImage = active || priority

  return (
    <div className="slider-item relative h-full w-full overflow-hidden bg-[#46bcd3]">
      {shouldRenderImage ? (
        <HeroPicture
          alt={`Slide principal ${slide.id} de ParaMascotasEC`}
          slide={slide.id}
          priority={priority}
        />
      ) : null}
      <div className={`pet-hero-copy pet-hero-copy--slide-${slide.id}`}>
        {slide.id === 1 ? (
          <h1 className="pet-hero-title">{slide.title}</h1>
        ) : (
          <h2 className="pet-hero-title">{slide.title}</h2>
        )}
        <p className="pet-hero-subtitle">{slide.subtitle}</p>
        {active ? (
          <Link className="pet-hero-cta" href={slide.ctaHref}>
            {slide.ctaLabel}
          </Link>
        ) : (
          <span className="pet-hero-cta" aria-hidden="true">
            {slide.ctaLabel}
          </span>
        )}
      </div>
    </div>
  )
}

const SliderPet = () => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches)

    syncPreference()
    mediaQuery.addEventListener('change', syncPreference)

    return () => mediaQuery.removeEventListener('change', syncPreference)
  }, [])

  const goToSlide = (index: number) => {
    const normalizedIndex = (index + slides.length) % slides.length
    setSelectedIndex(normalizedIndex)
  }

  const goToPrev = () => goToSlide(selectedIndex - 1)
  const goToNext = () => goToSlide(selectedIndex + 1)

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return

    const autoplay = window.setInterval(() => {
      if (document.hidden) return
      setSelectedIndex((prev) => (prev + 1) % slides.length)
    }, AUTOPLAY_DELAY_MS)

    return () => window.clearInterval(autoplay)
  }, [isPaused, prefersReducedMotion])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const point = event.touches[0]
    setTouchStartX(point.clientX)
    setTouchCurrentX(point.clientX)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return
    setTouchCurrentX(event.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null)
      setTouchCurrentX(null)
      return
    }

    const deltaX = touchStartX - touchCurrentX
    const swipeThreshold = 48

    if (deltaX > swipeThreshold) goToNext()
    if (deltaX < -swipeThreshold) goToPrev()

    setTouchStartX(null)
    setTouchCurrentX(null)
  }

  return (
    <section
      className="slider-block style-one pet-hero-frame mt-2 w-full overflow-hidden md:mt-3"
      aria-roledescription="carousel"
      aria-label="Promociones principales"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="slider-main relative h-full w-full">
        <div
          className="h-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-out will-change-transform touch-pan-y"
            style={{ transform: `translate3d(-${selectedIndex * 100}%, 0, 0)` }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="relative min-w-0 h-full flex-[0_0_100%]"
                aria-hidden={selectedIndex !== index}
                inert={selectedIndex !== index ? true : undefined}
              >
                <SliderSlideContent active={selectedIndex === index} slide={slide} priority={index === 0} />
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex items-center justify-center px-4 sm:bottom-8 md:bottom-10 md:px-6">
          <div className="pointer-events-auto mx-auto flex items-center justify-center gap-1 rounded-full border border-black/10 bg-white/70 px-1.5 py-1 shadow-[0_6px_20px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:gap-2 sm:px-3 sm:py-2 xl:gap-3">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Ir al slide ${index + 1}`}
                aria-pressed={selectedIndex === index}
                onClick={() => goToSlide(index)}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
              >
                <span
                  className={`block h-2.5 w-2.5 rounded-full border transition-all duration-300 sm:h-3 sm:w-3 ${
                  selectedIndex === index
                    ? 'scale-110 border-[var(--blue)] bg-[var(--blue)] shadow-[0_0_0_3px_rgba(10,123,143,0.18)] sm:shadow-[0_0_0_4px_rgba(10,123,143,0.18)]'
                    : 'border-[var(--blue)]/45 bg-white hover:bg-[var(--blue)]/12'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default SliderPet
