'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import TopNavOne from '@/components/Header/TopNav/TopNavOne'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb'
import Footer from '@/components/Footer/Footer'
import { requestPasswordReset } from '@/lib/api/auth'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [submittedEmail, setSubmittedEmail] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) {
            setError('Ingresa tu correo electrónico.')
            return
        }

        setLoading(true)
        try {
            const response = await requestPasswordReset({ email: normalizedEmail })
            setSubmittedEmail(normalizedEmail)
            setSuccess(response.message || 'Solicitud recibida. Revisa tu correo para continuar con el restablecimiento.')
            setEmail('')
        } catch (err: any) {
            setError(err.message || 'No se pudo solicitar la recuperación. Intenta nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="Nuevos clientes ahorran 10% con el código GET10" />
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
                <Breadcrumb heading='Recuperar contraseña' subHeading='Recuperar contraseña' />
            </div>
            <div className="forgot-pass md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
                            {success ? (
                                <div>
                                    <div className="heading4">Solicitud recibida</div>
                                    <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">
                                        {success}
                                    </div>
                                    <div className="body1 mt-4">
                                        Si <span className="font-semibold">{submittedEmail}</span> está registrado, recibirás un enlace de un solo uso para crear una nueva contraseña.
                                    </div>
                                    <div className="mt-4 text-secondary">
                                        Revisa también spam o promociones. El enlace expira pronto; si no llega en unos minutos, puedes solicitar otro.
                                    </div>
                                    <div className="block-button md:mt-7 mt-4 flex flex-wrap gap-3">
                                        <Link href="/login" className="button-main">Volver al login</Link>
                                        <button
                                            type="button"
                                            className="button-main bg-white text-black border border-line"
                                            onClick={() => {
                                                setSuccess('')
                                                setSubmittedEmail('')
                                            }}
                                        >
                                            Solicitar otro enlace
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="heading4">Restablece tu contraseña</div>
                                    <div className="body1 mt-2">
                                        Ingresa tu correo y te enviaremos un enlace de un solo uso. Por seguridad, no confirmamos si existe una cuenta asociada.
                                    </div>
                                    {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                                    <form className="md:mt-7 mt-4" onSubmit={handleSubmit}>
                                        <div className="email">
                                            <input
                                                className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                                                id="email"
                                                type="email"
                                                placeholder="Correo electrónico *"
                                                autoComplete="email"
                                                required
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                            />
                                        </div>
                                        <div className="block-button md:mt-7 mt-4">
                                            <button className="button-main" disabled={loading}>
                                                {loading ? 'Enviando...' : 'Enviar enlace'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                        <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
                            <div className="text-content">
                                <div className="heading4">¿Ya recordaste tu contraseña?</div>
                                <div className="mt-2 text-secondary">
                                    Vuelve al inicio de sesión y accede con tus credenciales actuales.
                                </div>
                                <div className="block-button md:mt-7 mt-4">
                                    <Link href={'/login'} className="button-main">Iniciar sesión</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ForgotPassword
