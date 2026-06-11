import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'

export default function NotFound() {
  return (
    <>
      <div id="header" className="relative w-full">
        <MenuOne props="bg-white" />
      </div>
      <main className="page-not-found bg-linear md:mt-[74px] mt-14 md:py-20 py-10">
        <div className="container">
          <div className="flex items-center justify-between max-sm:flex-col gap-y-8">
            <Image
              src="/images/other/404-img.png"
              width={2000}
              height={2000}
              alt="Página no encontrada"
              priority
              className="sm:w-1/2 w-3/4"
            />
            <div className="text-content sm:w-1/2 w-full flex items-center justify-center sm:pl-10">
              <div>
                <div className="lg:text-[140px] md:text-[80px] text-[42px] lg:leading-[152px] md:leading-[92px] leading-[52px] font-semibold">404</div>
                <h1 className="heading2 mt-4">Página no encontrada</h1>
                <p className="body1 text-secondary mt-4 pb-4">
                  La página que buscas no existe o ya no está disponible.
                </p>
                <Link className="button-main inline-flex" href="/">
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
