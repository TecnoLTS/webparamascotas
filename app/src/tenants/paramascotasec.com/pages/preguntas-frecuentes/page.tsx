'use client'

import React, { useState, useEffect } from 'react'
import Image from '@/components/Common/AppImage'
import Link from 'next/link'
import { Plus, Minus, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import MenuPet from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'

const getSuffixByWidth = (w: number) => {
    if (w < 768) return 'mobile';
    return '1920';
}

const FaqPage = () => {
    const [openIndex, setOpenIndex] = useState<string | null>(null);
    const [headerHeight, setHeaderHeight] = useState(140);
    const [suffix, setSuffix] = useState('1920');

    const toggleAccordion = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    useEffect(() => {
        const handleResize = () => {
            // 1. Altura Header
            const header = document.getElementById('header');
            if (header) setHeaderHeight(header.offsetHeight + 40);
            
            // 2. Sufijo Imagen
            setSuffix(getSuffixByWidth(window.innerWidth));
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const faqData = [
        { 
            category: "Compras y pedidos", 
            items: [
                { q: "¿Cómo puedo realizar una compra?", a: "Puedes comprar en nuestra tienda física o contactarnos a través de WhatsApp y nuestras redes sociales oficiales." },
                { q: "¿Debo pagar antes de retirar o recibir mi pedido?", a: "Sí. Todos los pedidos se confirman únicamente con pago previo." },
                { q: "¿Puedo reservar productos?", a: "Las reservas están sujetas a disponibilidad y solo se mantienen con pago confirmado." }
            ] 
        },
        { 
            category: "Pagos", 
            items: [
                { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos pagos en efectivo y transferencias bancarias." },
                { q: "¿Puedo pagar contra entrega?", a: "No. Actualmente no contamos con la opción de pago contra entrega." }
            ] 
        },
        { 
            category: "Envíos y entregas", 
            items: [
                { q: "¿Realizan envíos?", a: "Sí, realizamos envíos dentro de la ciudad y a nivel nacional, según zonas habilitadas." },
                { q: "¿Cuánto tiempo tarda el envío?", a: "El tiempo de entrega depende de la ciudad, la disponibilidad del producto y el operador logístico. Esta información se confirma antes del despacho." },
                { q: "¿El costo de envío está incluido?", a: "No. El valor del envío se calcula según la ubicación del cliente y se informa antes de confirmar el pedido." },
                { q: "¿Puedo retirar mi pedido en tienda?", a: "Sí. Ofrecemos la opción de retiro en tienda sin costo, previa coordinación." }
            ] 
        },
        { 
            category: "Cambios y devoluciones", 
            items: [
                { q: "¿Puedo cambiar un producto?", a: "Sí. Se aceptan cambios dentro de los 5 días hábiles posteriores a la entrega, siempre que el producto esté sin uso, en perfecto estado y con su empaque original." },
                { q: "¿Se aceptan cambios o devoluciones de alimentos o productos de higiene?", a: "No. Por motivos de higiene y seguridad, no se aceptan cambios ni devoluciones de alimentos, medicamentos o productos de higiene, salvo defectos de fabricación comprobables." },
                { q: "¿Realizan devoluciones de dinero?", a: "No realizamos devoluciones de dinero de forma general. Las devoluciones aprobadas se gestionan mediante cambio de producto o crédito en tienda." }
            ] 
        },
        { 
            category: "Productos y atención", 
            items: [
                { q: "¿Los productos son originales?", a: "Sí. Trabajamos únicamente con marcas y proveedores confiables." },
                { q: "¿Brindan asesoría para elegir productos?", a: "Sí. Te ayudamos a elegir el producto más adecuado según las necesidades de tu mascota." },
                { q: "¿Cómo puedo contactarlos?", a: "Puedes escribirnos por WhatsApp, redes sociales o visitarnos en nuestra tienda física." }
            ] 
        }
    ];

    return (
        <>
            <div id="header" className='relative w-full style-pet'>
                <MenuPet />
            </div>

            <main className='bg-[#FAFAFA] min-h-screen'>
                
                {/* Banner Header */}
                <section className="relative w-full overflow-hidden">
                    <div className="relative h-[300px] md:h-[500px] w-full">
                        <Image
                            src={`/images/banner/35.webp`}
                            //src={`/images/banner/about-banner-${suffix}.webp`}
                            fill
                            priority
                            alt='Preguntas Frecuentes'
                            className='object-cover opacity-60' 
                        />
                        <div className="absolute inset-0 bg-black/40"></div>
                        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 z-10">
                            <span className="text-orange-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-2 block">
                                Centro de Ayuda
                            </span>
                            <h1 className="heading2 text-white font-bold">Preguntas Frecuentes</h1>
                        </div>
                    </div>
                </section>

                <div className="container py-10 md:py-14">
                    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
                        
                        {/* Sidebar */}
                        <div className="lg:w-1/3 order-2 lg:order-1">
                            <div className="sticky space-y-6" style={{ top: `${headerHeight}px` }}>
                                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xl shadow-gray-200/50">
                                    <h4 className="heading4 font-bold mb-4 text-[#0a7b8f]">¿Necesitas ayuda extra?</h4>
                                    <p className="text-secondary text-sm mb-6 leading-relaxed">
                                        Si no encuentras la respuesta que buscas, nuestro equipo está listo para atenderte.
                                    </p>
                                    <div className="space-y-4">
                                        <a href="https://wa.me/593999999999" target="_blank" className="flex items-center justify-center gap-3 w-full bg-[#F5F5F5] hover:bg-[#1f3b3b] hover:text-white text-black p-4 rounded-xl transition-colors font-bold group">
                                            <WhatsappLogo size={24} weight="fill" className="text-[#1f3b3b] group-hover:text-white"/> <span>WhatsApp</span>
                                        </a>
                                        <Link href="/pages/contact" className="flex items-center justify-center gap-3 w-full bg-white border-2 border-black hover:bg-black hover:text-white text-black p-4 rounded-xl transition-colors font-bold">
                                            <EnvelopeSimple size={24} /> <span>Contacto</span>
                                        </Link>
                                    </div>
                                </div>

                                {/* Imagen Lateral Responsiva */}
                                <div className="relative w-full aspect-[3/4] rounded-[24px] overflow-hidden hidden lg:block shadow-lg">
                                    <Image 
                                        //src={`/images/banner/about-1-${suffix}.webp`}
                                        src={`/images/banner/36.webp`}
                                        fill
                                        alt="Atención al cliente"
                                        className="object-cover hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                                        <p className="text-white font-medium text-lg">Estamos contigo en cada paso.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preguntas */}
                        <div className="lg:w-2/3 order-1 lg:order-2">
                            <div className="space-y-8">
                                {faqData.map((section, sIndex) => (
                                    <div key={sIndex}>
                                        <div className="flex items-center gap-4 mb-4 pb-2 border-b border-gray-200/60">
                                            <h3 className="text-xl md:text-2xl font-bold text-[#0a7b8f]">{section.category}</h3>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {section.items.map((item, iIndex) => {
                                                const uniqueId = `${sIndex}-${iIndex}`;
                                                const isOpen = openIndex === uniqueId;
                                                return (
                                                    <div key={iIndex} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden group ${isOpen ? 'border-orange-500 shadow-lg' : 'border-gray-100 hover:shadow-md'}`}>
                                                        <button onClick={() => toggleAccordion(uniqueId)} className="w-full px-4 py-3 md:px-5 md:py-4 flex items-center justify-between gap-4 text-left focus:outline-none">
                                                            <span className={`text-base md:text-lg font-bold transition-colors ${isOpen ? 'text-orange-600' : 'text-gray-800'}`}>{item.q}</span>
                                                            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-orange-500 text-white rotate-180' : 'bg-gray-100 text-gray-500'}`}>
                                                                {isOpen ? <Minus size={18} weight="bold"/> : <Plus size={18} weight="bold"/>}
                                                            </div>
                                                        </button>
                                                        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                            <div className="overflow-hidden">
                                                                <div className="px-4 md:px-5 pb-4 pt-0 border-t border-gray-100 text-gray-600 text-sm md:text-base leading-relaxed pt-3">{item.a}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Nota Importante al final */}
                                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 text-sm text-gray-600">
                                    <p><strong className="text-orange-800">Nota importante:</strong> Esta sección de Preguntas Frecuentes es únicamente informativa. Para más detalles, revisa nuestros Términos y Condiciones y Política de Privacidad.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </main>
        </>
    )
}

export default FaqPage
