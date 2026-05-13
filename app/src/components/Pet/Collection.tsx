'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PetCategoryCard, getCategoryCards, getCategoryUrl } from '@/data/petCategoryCards'
import { versionLocalImagePath } from '@/lib/staticAsset'

interface CollectionProps {
  categories?: PetCategoryCard[]
}

const Collection: React.FC<CollectionProps> = ({ categories }) => {
  const resolvedCategories = categories ?? getCategoryCards()
  const shouldCenterDesktopTrack = resolvedCategories.length <= 5
  const router = useRouter()
  const mobileTrackRef = React.useRef<HTMLDivElement | null>(null)
  const dragStartXRef = React.useRef(0)
  const dragStartScrollLeftRef = React.useRef(0)
  const isMouseDraggingRef = React.useRef(false)
  const dragMovedRef = React.useRef(false)
  const [isDragging, setIsDragging] = React.useState(false)

  const handleCategoryClick = (category: string) => {
    router.push(getCategoryUrl(category))
  }

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    if (!isMouseDraggingRef.current) return
    const track = mobileTrackRef.current
    if (!track) return

    const deltaX = event.clientX - dragStartXRef.current
    if (Math.abs(deltaX) > 4) {
      dragMovedRef.current = true
    }
    track.scrollLeft = dragStartScrollLeftRef.current - deltaX
  }, [])

  const stopMouseDrag = React.useCallback(() => {
    if (!isMouseDraggingRef.current) return
    isMouseDraggingRef.current = false
    setIsDragging(false)
    window.setTimeout(() => {
      dragMovedRef.current = false
    }, 0)
  }, [])

  React.useEffect(() => {
    if (!isDragging) return

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopMouseDrag)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopMouseDrag)
    }
  }, [handleMouseMove, isDragging, stopMouseDrag])

  const startMouseDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    const track = mobileTrackRef.current
    if (!track) return

    isMouseDraggingRef.current = true
    dragMovedRef.current = false
    dragStartXRef.current = event.clientX
    dragStartScrollLeftRef.current = track.scrollLeft
    setIsDragging(true)
  }

  const preventDraggedClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!dragMovedRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }

  const getCategoryImageBasePath = (src: string) => {
    const [pathname] = src.split('?')
    if (!pathname.startsWith('/images/collection/home-top/') || !pathname.endsWith('.webp')) {
      return null
    }

    const fileName = pathname.split('/').pop()
    return fileName ? fileName.replace(/\.webp$/, '') : null
  }

  const getCategorySourceSet = (src: string) => {
    const baseName = getCategoryImageBasePath(src)
    if (!baseName) return ''

    return [240, 320, 432, 640, 768]
      .map((width) => {
        const optimizedSrc = versionLocalImagePath(
          `/images/collection/home-top/generated/${baseName}-${width}.webp`
        )
        return `${optimizedSrc} ${width}w`
      })
      .join(', ')
  }

  const renderCategoryCard = (category: PetCategoryCard, wrapperClassName: string) => {
    return (
      <button
        key={category.id}
        type="button"
        className={`trending-item relative cursor-pointer flex flex-col items-center group text-left ${wrapperClassName}`}
        draggable={false}
        onClickCapture={preventDraggedClick}
        onClick={() => handleCategoryClick(category.id)}
      >
        <div className="bg-img mx-auto w-full rounded-[18px] sm:rounded-[22px] lg:rounded-[24px] overflow-hidden relative aspect-[4/5] bg-[#f6f7f9]">
          <picture>
            <source
              type="image/webp"
              srcSet={getCategorySourceSet(category.image)}
              sizes="(min-width: 1280px) 216px, (min-width: 1024px) calc((100vw - 80px) / 3), (min-width: 768px) calc((100vw - 68px) / 3), calc((100vw - 48px) / 3)"
            />
            <img
              src={category.image}
              alt={category.alt || category.label}
              className="category-card-image absolute inset-0 h-full w-full object-contain"
              style={{ transform: 'none' }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>
        <div className="trending-name text-center mt-3 sm:mt-4 duration-500 w-full">
          <span className="font-semibold text-[13px] leading-[18px] sm:text-[14px] sm:leading-[20px] lg:text-[15px] lg:leading-[22px] text-[var(--blue)]">
            {category.label}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="trending-block style-six md:py-10 py-5">
      <div className="container">
        <div className="heading3 text-center">Categorías</div>
        <div className="list-trending md:mt-10 mt-6">
          <div className="overflow-hidden">
            <div
              ref={mobileTrackRef}
              onMouseDown={startMouseDrag}
              onMouseLeave={stopMouseDrag}
              className={`mx-auto flex max-w-[1160px] justify-start gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth overscroll-x-contain md:gap-4 lg:gap-5 ${shouldCenterDesktopTrack ? 'xl:justify-center' : ''} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {resolvedCategories.map((category) =>
                renderCategoryCard(
                  category,
                  'min-w-0 flex-none basis-[calc((100%_-_24px)/3)] snap-start md:basis-[calc((100%_-_32px)/3)] lg:basis-[calc((100%_-_40px)/3)] xl:basis-[216px]'
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Collection
