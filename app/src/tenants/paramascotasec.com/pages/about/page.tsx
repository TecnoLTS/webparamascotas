'use client'

import React from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import { Package, Storefront } from '@phosphor-icons/react/dist/ssr'
import MenuPet from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'

const AboutUs = () => {
    return (
        <>
            <div id="header" className="relative w-full style-pet">
                <MenuPet />
            </div>

            <main className="overflow-x-hidden bg-[#F8F8F8]">
                <section className="about-banner relative w-full overflow-hidden">
                    <div className="relative h-56 sm:h-72 md:h-[420px] lg:h-[500px] w-full">
                        <Image
                            src="/images/banner/27.webp"
                            fill
                            priority
                            alt="About Us Banner"
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="container relative z-10 h-full flex flex-col justify-center items-center text-center">
                            <h1 className="heading2 text-white font-bold mb-2 md:mb-4 max-md:text-[38px] max-md:leading-[42px]">
                                Conoce nuestra historia
                            </h1>
                            <p className="body1 text-white text-base sm:text-lg md:text-xl">
                                Amor incondicional en cada detalle
                            </p>
                        </div>
                    </div>
                </section>

                <section className="about-who-we-are py-10 md:py-16 bg-white">
                    <div className="container">
                        <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-start">
                            <div className="hidden md:block">
                                <div className="relative w-full h-[420px] lg:h-[520px] rounded-[32px] overflow-hidden shadow-xl">
                                    <Image
                                        src="/images/banner/28.webp"
                                        fill
                                        alt="Quiénes somos"
                                        className="object-cover hover:scale-105 duration-700"
                                    />
                                </div>
                            </div>

                            <div className="overflow-hidden">
                                <div className="md:hidden float-right ml-4 mb-3 relative w-36 h-24 rounded-xl overflow-hidden shadow-md">
                                    <Image
                                        src="/images/banner/28.webp"
                                        fill
                                        alt="Quiénes somos móvil"
                                        className="object-cover"
                                    />
                                </div>

                                <h2 className="heading3 font-bold mb-4 md:mb-7 max-sm:text-[34px] max-sm:leading-[40px]">¿Quiénes somos?</h2>
                                <div className="body1 text-secondary leading-relaxed space-y-4 md:space-y-6 max-sm:text-base max-sm:leading-7 md:text-lg">
                                    <p>
                                        Somos una familia pet friendly que ama profundamente a los animales y cree que las mascotas son parte esencial del hogar y de la familia. Este proyecto nace del cariño por ellos y del deseo de crear un espacio donde las personas puedan encontrar productos confiables, atención cercana y un trato hecho con amor.
                                    </p>
                                    <p>
                                        Para nosotros, cuidar a una mascota va más allá de alimentarla: se trata de entenderla, acompañarla y brindarle lo mejor en cada etapa de su vida.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="about-what-we-offer py-10 md:py-16 bg-[#F8F8F8]">
                    <div className="container">
                        <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-start">
                            <div className="overflow-hidden">
                                <div className="md:hidden float-left mr-4 mb-3 relative w-36 h-24 rounded-xl overflow-hidden shadow-md">
                                    <Image
                                        src="/images/banner/30.webp"
                                        fill
                                        alt="Lo que ofrecemos móvil"
                                        className="object-cover"
                                    />
                                </div>

                                <h2 className="heading3 font-bold mb-4 md:mb-7 max-sm:text-[34px] max-sm:leading-[40px]">Lo que ofrecemos</h2>
                                <div className="space-y-6 md:space-y-8">
                                    <div className="flex gap-3 md:gap-4">
                                        <div className="bg-blue-100 p-2.5 md:p-3 rounded-full h-fit flex-shrink-0">
                                            <Package size={24} className="text-blue-600 md:w-7 md:h-7" />
                                        </div>
                                        <div>
                                            <h4 className="mb-1 text-[20px] font-semibold leading-[28px] text-[#1F3B3B] md:mb-2 md:text-[18px]">
                                                Productos Cuidadosos
                                            </h4>
                                            <p className="body1 text-secondary text-[16px] leading-7 max-sm:text-base">
                                                Ofrecemos productos pensados para el cuidado diario, trabajando con marcas responsables y opciones de calidad.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 md:gap-4">
                                        <div className="bg-green-100 p-2.5 md:p-3 rounded-full h-fit flex-shrink-0">
                                            <Storefront size={24} className="text-green-600 md:w-7 md:h-7" />
                                        </div>
                                        <div>
                                            <h4 className="mb-1 text-[20px] font-semibold leading-[28px] text-[#1F3B3B] md:mb-2 md:text-[18px]">
                                                Experiencia Cercana
                                            </h4>
                                            <p className="body1 text-secondary text-[16px] leading-7 max-sm:text-base">
                                                Nos enfocamos en brindar una experiencia simple, honesta y cercana, tanto en nuestra tienda como en nuestros canales digitales. Queremos que cada persona que nos visite se sienta acompañada y segura.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-7 md:mt-10">
                                    <Link href="/tienda" className="button-main rounded-full bg-[var(--blue)] px-6 py-3 text-white transition-all hover:bg-[var(--bluesecondary)] hover:text-white md:px-8">
                                        Explorar Productos
                                    </Link>
                                </div>
                            </div>

                            <div className="hidden md:block">
                                <div className="relative w-full h-[420px] lg:h-[520px] rounded-[32px] overflow-hidden shadow-xl">
                                    <Image
                                        src="/images/banner/30.webp"
                                        fill
                                        alt="Lo que ofrecemos"
                                        className="object-cover hover:scale-105 duration-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="about-how-we-do py-10 md:py-16 bg-white">
                    <div className="container">
                        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-14">
                            <h2 className="heading3 font-bold mb-4 md:mb-6 max-sm:text-[34px] max-sm:leading-[40px]">Nuestra forma de hacer las cosas</h2>
                            <p className="body1 text-secondary max-sm:text-base max-sm:leading-7 md:text-lg">
                                Más que vender, nos gusta aconsejar y construir relaciones de confianza con quienes, como nosotros, aman a sus compañeros de cuatro patas.
                            </p>
                        </div>
                        <div className="relative w-full h-52 sm:h-64 md:h-[420px] lg:h-[500px] rounded-[20px] sm:rounded-[24px] md:rounded-[32px] overflow-hidden shadow-xl">
                            <Image
                                src="/images/banner/31.webp"
                                fill
                                alt="Nuestra filosofía"
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 sm:p-6">
                                <blockquote className="text-white text-sm sm:text-lg md:text-3xl font-medium text-center max-w-3xl italic leading-relaxed">
                                    &quot;Cuidamos cada detalle porque entendemos que detrás de cada compra hay una historia, una familia y una mascota que importa.&quot;
                                </blockquote>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}

export default AboutUs
