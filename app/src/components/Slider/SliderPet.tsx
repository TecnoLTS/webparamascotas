'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  Bone,
  BowlFood,
  Cat,
  Dog,
  Heart,
  PawPrint,
  ShieldCheck,
  ShoppingBagOpen,
  Truck,
  TShirt,
} from '@phosphor-icons/react/dist/ssr'
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
  mobileTitle: string
  mobileSubtitle: string
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
    mobileTitle: 'ParaMascotasEC: tienda online para mascotas',
    mobileSubtitle: 'Alimento, accesorios y cuidado para tus peluditos en Ecuador.',
    ctaLabel: 'Descubrir ahora',
    ctaHref: '/tienda',
  },
  {
    id: 2,
    title: 'La Tri también se vive en cuatro patas',
    subtitle:
      'Viste a tu peludito con la camiseta de Ecuador y celebren juntos cada partido.',
    mobileTitle: 'La Tri tambien se vive en cuatro patas',
    mobileSubtitle: 'Camisetas de Ecuador para tu peludito.',
    ctaLabel: 'Ver camisetas',
    ctaHref: '/tienda/ropa?query=camiseta',
  },
  {
    id: 3,
    title: 'Todo para su día a día, en un solo lugar',
    subtitle:
      'Alimento, snacks, juguetes y cuidado diario con calidad que sí se nota.',
    mobileTitle: 'Todo para su dia a dia en un solo lugar',
    mobileSubtitle: 'Alimento, snacks y accesorios para cada etapa.',
    ctaLabel: 'Ver productos',
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
  qhd: { width: 5120, height: 1000 },
  uhd: { width: 6400, height: 1200 },
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
        className={`pet-hero-image pet-hero-image--slide-${slide} block h-full w-full object-cover object-center`}
      />
    </picture>
  )
}

const SlideOneShowcase = ({ active, slide }: { active: boolean; slide: SlideContent }) => {
  return (
    <div className="pet-hero-showcase pet-hero-showcase--slide-1">
      <div className="pet-hero-showcase__copy pet-hero-showcase__copy--slide-1">
        <div className="pet-hero-showcase__badge" aria-label="Tienda online en Ecuador">
          <span>TIENDA ONLINE EN ECUADOR</span>
          <span className="pet-hero-showcase__flag" aria-hidden="true" />
        </div>

        <h1 className="pet-hero-showcase__title" aria-label="Todo para tu mascota en un solo lugar">
          <span className="pet-hero-showcase__burst pet-hero-showcase__burst--left" aria-hidden="true">
            <span />
          </span>
          <span className="pet-hero-showcase__title-top">Todo para tu</span>
          <span className="pet-hero-showcase__pet-word">
            mascota
            <PawPrint aria-hidden="true" weight="fill" />
          </span>
          <span className="pet-hero-showcase__tagline">en un solo lugar</span>
          <span className="pet-hero-showcase__burst pet-hero-showcase__burst--right" aria-hidden="true">
            <span />
          </span>
        </h1>

        <p className="pet-hero-showcase__subtitle">
          Alimento, accesorios, snacks y cuidado para perros y gatos, con{' '}
          <strong>atencion cercana y entrega a domicilio.</strong>
        </p>

        <div className="pet-hero-showcase__actions">
          {active ? (
            <Link className="pet-hero-showcase__cta" href={slide.ctaHref}>
              <span className="pet-hero-showcase__cta-icon" aria-hidden="true">
                <ShoppingBagOpen weight="bold" />
              </span>
              <span>Comprar ahora</span>
            </Link>
          ) : (
            <span className="pet-hero-showcase__cta" aria-hidden="true">
              <span className="pet-hero-showcase__cta-icon" aria-hidden="true">
                <ShoppingBagOpen weight="bold" />
              </span>
              <span>Comprar ahora</span>
            </span>
          )}

          <div className="pet-hero-showcase__proof" aria-label="Beneficios de compra">
            <span className="pet-hero-showcase__proof-item">
              <Dog aria-hidden="true" weight="bold" />
              <span>Perros y gatos</span>
            </span>
            <span className="pet-hero-showcase__proof-item">
              <Truck aria-hidden="true" weight="bold" />
              <span>Entrega a domicilio</span>
            </span>
            <span className="pet-hero-showcase__proof-item">
              <Heart aria-hidden="true" weight="bold" />
              <span>Atencion cercana</span>
            </span>
          </div>
        </div>
      </div>

      <PawPrint className="pet-hero-showcase__paw pet-hero-showcase__paw--top-left" aria-hidden="true" weight="fill" />
      <PawPrint className="pet-hero-showcase__paw pet-hero-showcase__paw--right" aria-hidden="true" weight="fill" />
      <Heart className="pet-hero-showcase__heart pet-hero-showcase__heart--dog" aria-hidden="true" weight="bold" />
      <Cat className="pet-hero-showcase__cat-mark" aria-hidden="true" weight="duotone" />
      <span className="pet-hero-showcase__heart-bubble" aria-hidden="true">
        <Heart weight="fill" />
      </span>
      <span className="pet-hero-showcase__trail pet-hero-showcase__trail--left" aria-hidden="true" />
      <span className="pet-hero-showcase__trail pet-hero-showcase__trail--right" aria-hidden="true" />
    </div>
  )
}

const SlideTwoShowcase = ({ active, slide }: { active: boolean; slide: SlideContent }) => {
  const ctaContent = (
    <>
      <span>{slide.ctaLabel}</span>
      <span className="pet-hero-showcase__cta-icon pet-hero-showcase__cta-icon--arrow" aria-hidden="true">
        <ArrowRight weight="bold" />
      </span>
    </>
  )

  return (
    <div className="pet-hero-showcase pet-hero-showcase--slide-2">
      <div className="pet-hero-showcase__copy pet-hero-showcase__copy--slide-2">
        <div className="pet-hero-showcase__badge pet-hero-showcase__badge--solid" aria-label="Edición Ecuador">
          <span>EDICIÓN ECUADOR</span>
          <span className="pet-hero-showcase__flag" aria-hidden="true" />
        </div>

        <h2 className="pet-hero-showcase__tri-title" aria-label={slide.title}>
          <span className="pet-hero-showcase__tri-row">
            <span className="pet-hero-showcase__tri-script">La Tri</span>
            <span className="pet-hero-showcase__tri-white">también</span>
          </span>
          <span className="pet-hero-showcase__tri-line">
            se vive en
            <span className="pet-hero-showcase__tri-band">
              cuatro patas
              <PawPrint aria-hidden="true" weight="fill" />
            </span>
          </span>
          <span className="pet-hero-showcase__tri-underline" aria-hidden="true" />
          <span className="pet-hero-showcase__burst pet-hero-showcase__burst--tri" aria-hidden="true">
            <span />
          </span>
        </h2>

        <p className="pet-hero-showcase__subtitle pet-hero-showcase__subtitle--slide-2">
          {slide.subtitle}
        </p>

        <div className="pet-hero-showcase__actions pet-hero-showcase__actions--slide-2">
          {active ? (
            <Link className="pet-hero-showcase__cta pet-hero-showcase__cta--yellow-arrow" href={slide.ctaHref}>
              {ctaContent}
            </Link>
          ) : (
            <span className="pet-hero-showcase__cta pet-hero-showcase__cta--yellow-arrow" aria-hidden="true">
              {ctaContent}
            </span>
          )}

          <div className="pet-hero-showcase__proof pet-hero-showcase__proof--slide-2" aria-label="Beneficios de camisetas">
            <span className="pet-hero-showcase__proof-item">
              <ShieldCheck aria-hidden="true" weight="bold" />
              <span>Calidad premium</span>
            </span>
            <span className="pet-hero-showcase__proof-item">
              <TShirt aria-hidden="true" weight="bold" />
              <span>Diseño oficial de Ecuador</span>
            </span>
            <span className="pet-hero-showcase__proof-item">
              <Heart aria-hidden="true" weight="bold" />
              <span>Hechos para los fanáticos</span>
            </span>
          </div>
        </div>
      </div>

      <PawPrint className="pet-hero-showcase__paw pet-hero-showcase__paw--top-left" aria-hidden="true" weight="fill" />
      <PawPrint className="pet-hero-showcase__paw pet-hero-showcase__paw--tri-right" aria-hidden="true" weight="fill" />
      <Heart className="pet-hero-showcase__heart pet-hero-showcase__heart--tri" aria-hidden="true" weight="bold" />
      <span className="pet-hero-showcase__trail pet-hero-showcase__trail--left" aria-hidden="true" />
      <span className="pet-hero-showcase__trail pet-hero-showcase__trail--tri-right" aria-hidden="true" />
    </div>
  )
}

const SlideThreeShowcase = ({ active, slide }: { active: boolean; slide: SlideContent }) => {
  const ctaContent = (
    <>
      <span>{slide.ctaLabel}</span>
      <span className="pet-hero-showcase__cta-icon pet-hero-showcase__cta-icon--arrow" aria-hidden="true">
        <ArrowRight weight="bold" />
      </span>
    </>
  )

  return (
    <div className="pet-hero-showcase pet-hero-showcase--slide-3">
      <div className="pet-hero-showcase__copy pet-hero-showcase__copy--slide-3">
        <div className="pet-hero-showcase__badge pet-hero-showcase__badge--daily" aria-label="Para su día a día">
          <span>PARA SU DÍA A DÍA</span>
          <PawPrint aria-hidden="true" weight="fill" />
        </div>

        <h2 className="pet-hero-showcase__daily-title" aria-label={slide.title}>
          <span className="pet-hero-showcase__daily-top">Todo para su</span>
          <span className="pet-hero-showcase__daily-main">día a día,</span>
          <span className="pet-hero-showcase__daily-tag">
            en un solo lugar
            <Heart aria-hidden="true" weight="bold" />
          </span>
        </h2>

        <p className="pet-hero-showcase__subtitle pet-hero-showcase__subtitle--slide-3">
          {slide.subtitle}
        </p>

        <div className="pet-hero-showcase__actions pet-hero-showcase__actions--slide-3">
          {active ? (
            <Link className="pet-hero-showcase__cta pet-hero-showcase__cta--teal-arrow" href={slide.ctaHref}>
              {ctaContent}
            </Link>
          ) : (
            <span className="pet-hero-showcase__cta pet-hero-showcase__cta--teal-arrow" aria-hidden="true">
              {ctaContent}
            </span>
          )}

          <div className="pet-hero-showcase__proof pet-hero-showcase__proof--slide-3" aria-label="Beneficios para su dia a dia">
            <span className="pet-hero-showcase__proof-item">
              <span className="pet-hero-showcase__proof-icon" aria-hidden="true">
                <BowlFood weight="bold" />
              </span>
              <span>Alimentos de alta calidad</span>
            </span>
            <span className="pet-hero-showcase__proof-item">
              <span className="pet-hero-showcase__proof-icon" aria-hidden="true">
                <Bone weight="bold" />
              </span>
              <span>Snacks y juguetes que los hacen felices</span>
            </span>
            <span className="pet-hero-showcase__proof-item">
              <span className="pet-hero-showcase__proof-icon" aria-hidden="true">
                <ShieldCheck weight="bold" />
              </span>
              <span>Cuidado diario con amor</span>
            </span>
          </div>
        </div>
      </div>

      <PawPrint className="pet-hero-showcase__paw pet-hero-showcase__paw--top-left" aria-hidden="true" weight="fill" />
      <PawPrint className="pet-hero-showcase__paw pet-hero-showcase__paw--daily-right" aria-hidden="true" weight="fill" />
      <Heart className="pet-hero-showcase__heart pet-hero-showcase__heart--daily-left" aria-hidden="true" weight="bold" />
      <span className="pet-hero-showcase__trail pet-hero-showcase__trail--daily-left" aria-hidden="true" />
      <span className="pet-hero-showcase__trail pet-hero-showcase__trail--daily-right" aria-hidden="true" />
    </div>
  )
}

const SlideShowcase = ({ active, slide }: { active: boolean; slide: SlideContent }) => {
  if (slide.id === 1) return <SlideOneShowcase active={active} slide={slide} />
  if (slide.id === 2) return <SlideTwoShowcase active={active} slide={slide} />

  return <SlideThreeShowcase active={active} slide={slide} />
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
    <div className={`slider-item pet-hero-slide pet-hero-slide--${slide.id} relative h-full w-full overflow-hidden bg-[#46bcd3]`}>
      {shouldRenderImage ? (
        <HeroPicture
          alt={`Slide principal ${slide.id} de ParaMascotasEC`}
          slide={slide.id}
          priority={priority}
        />
      ) : null}
      {active ? <SlideShowcase active={active} slide={slide} /> : null}
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
      className={`slider-block style-one pet-hero-frame pet-hero-frame--slide-${slides[selectedIndex].id} mt-2 w-full overflow-hidden md:mt-3`}
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

        <div className="pet-hero-dots pointer-events-none absolute inset-x-0 bottom-1.5 z-10 flex items-center justify-center px-3 sm:bottom-4 md:bottom-5 md:px-4">
          <div className="pet-hero-dots__track pointer-events-auto mx-auto flex items-center justify-center gap-1 rounded-full border border-black/10 bg-white/70 px-1.5 py-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.14)] backdrop-blur-sm sm:gap-1.5 sm:px-2 sm:py-0.5 md:px-2.5 xl:gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Ir al slide ${index + 1}`}
                aria-pressed={selectedIndex === index}
                onClick={() => goToSlide(index)}
                className="pet-hero-dots__btn flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:h-8 sm:w-8 md:h-8 md:w-8"
              >
                <span
                  className={`pet-hero-dots__dot block h-2 w-2 rounded-full border transition-all duration-300 sm:h-2 sm:w-2 ${
                  selectedIndex === index
                    ? 'scale-110 border-[var(--blue)] bg-[var(--blue)] shadow-[0_0_0_2px_rgba(10,123,143,0.18)] sm:shadow-[0_0_0_3px_rgba(10,123,143,0.18)]'
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
