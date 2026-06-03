'use client'

import React, { useEffect, useState } from 'react'
import * as Icon from '@phosphor-icons/react/dist/ssr'
import { ProductType } from '@/type/ProductType'

type Props = {
  product: ProductType
}

const ShareMenu: React.FC<Props> = ({ product }) => {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [notice, setNotice] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(window.location.href)
    }
  }, [])

  const title = product?.name?.trim() || 'Producto'
  const text = product?.description?.trim() || 'Mira este producto'
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(`${title} - ${text}`)

  const handleCopy = async () => {
    if (!url || !navigator?.clipboard?.writeText) {
      setNotice('No se pudo copiar el vínculo')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Vínculo copiado')
      setOpen(false)
    } catch {
      setNotice('No se pudo copiar el vínculo')
    }
  }

  const handleOpen = (shareUrl: string, copyFirst = false) => {
    if (copyFirst && url) {
      navigator.clipboard?.writeText?.(url)
      setNotice('Vínculo copiado')
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  return (
    <div className="relative">
      <div
        className="share flex items-center gap-3 cursor-pointer"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="share-btn md:w-12 md:h-12 w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white">
          <Icon.ShareNetwork weight="fill" className="heading6" />
        </div>
        <span>Compartir producto</span>
      </div>

      {open && (
        <div className="absolute z-20 mt-3 w-[260px] rounded-xl border border-line bg-white shadow-lg p-3">
          <div className="text-title mb-2">Compartir</div>
          {notice && (
            <div className="mb-2 rounded-lg bg-surface px-3 py-2 text-xs text-secondary">
              {notice}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={handleCopy}
            >
              <Icon.LinkSimple className="text-lg" />
              Copiar vínculo
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={() => handleOpen(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
            >
              <Icon.WhatsappLogo className="text-lg" />
              WhatsApp
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={() => handleOpen(`https://www.tiktok.com/`, true)}
            >
              <Icon.TiktokLogo className="text-lg" />
              TikTok
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={() => handleOpen(`https://www.instagram.com/paramascotas_ec/`, true)}
            >
              <Icon.InstagramLogo className="text-lg" />
              Instagram
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={() => handleOpen(`https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)}
            >
              <Icon.TwitterLogo className="text-lg" />
              X
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={() => handleOpen(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
            >
              <Icon.FacebookLogo className="text-lg" />
              Facebook
            </button>
            <button
              type="button"
              className="col-span-2 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface"
              onClick={() => handleOpen(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)}
            >
              <Icon.LinkedinLogo className="text-lg" />
              LinkedIn
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareMenu
