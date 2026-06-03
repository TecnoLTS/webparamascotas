"use client"

import React, { useEffect, useState, useRef } from 'react'

const Instagram: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)
  
  const instagramEmbeds = [
    'https://www.instagram.com/reel/DRcLHtlEZJ4/',
    'https://www.instagram.com/reel/DRh5OZzEZ7o/',
    'https://www.instagram.com/reel/DRcLHtlEZJ4/',
    'https://www.instagram.com/reel/DRh5OZzEZ7o/',
    'https://www.instagram.com/reel/DRcLHtlEZJ4/',
  ]

  useEffect(() => {
    // Inject custom CSS to remove black bars and style Instagram embeds
    if (!document.getElementById('instagram-custom-style')) {
      const style = document.createElement('style')
      style.id = 'instagram-custom-style'
      style.innerHTML = `
        .instagram-wrapper {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          position: relative;
          background: transparent;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .instagram-wrapper::before {
          content: '';
          display: block;
          padding-top: 177.78%;
        }
        
        .instagram-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .instagram-media {
          margin: 0 !important;
          background: white !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          min-width: 100% !important;
          max-width: 100% !important;
          width: 100% !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
        }
        
        .instagram-media iframe {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 100% !important;
          min-width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        @media (max-width: 640px) {
          .instagram-wrapper {
            max-width: 320px;
          }
        }
      `
      document.head.appendChild(style)
    }

    // Load Instagram embed script
    const loadInstagram = () => {
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process()
        setIsLoaded(true)
      } else {
        const script = document.createElement('script')
        script.src = 'https://www.instagram.com/embed.js'
        script.async = true
        script.onload = () => {
          if ((window as any).instgrm) {
            (window as any).instgrm.Embeds.process()
            setIsLoaded(true)
          }
        }
        document.body.appendChild(script)
      }
    }

    const timer = setTimeout(loadInstagram, 100)
    return () => clearTimeout(timer)
  }, [])



  return (
    <div className="instagram-block md:pt-20 pt-10">
      <div className="container">
        <div className="heading">
          <div className="heading3 text-center">Siguenos en Instagram</div>
          <div className="text-center mt-3">
            <a
              href="https://www.instagram.com/paramascotas_ec/"
              target="_blank"
              rel="noreferrer"
              className="text-button-uppercase"
            >
              @paramascotas_ec
            </a>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-10">
        {/* Static grid: 5 posts */}
        <div className="flex flex-wrap justify-center gap-6">
          {instagramEmbeds.map((url, idx) => (
            <div key={idx} className="w-full sm:w-80 md:w-80">
              <div className="instagram-wrapper">
                <div className="instagram-content">
                  {!isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
                    </div>
                  )}
                  <blockquote
                    className="instagram-media"
                    data-instgrm-permalink={url}
                    data-instgrm-version="14"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-10">
        <a
          href="https://www.instagram.com/paramascotas_ec/"
          target="_blank"
          rel="noreferrer"
          className="button-main"
        >
          Ver más en Instagram
        </a>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

export default Instagram
