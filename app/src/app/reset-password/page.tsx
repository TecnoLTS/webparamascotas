'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopNavOne from '@/components/Header/TopNav/TopNavOne'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb'
import Footer from '@/components/Footer/Footer'
import { confirmPasswordReset } from '@/lib/api/auth'

const PASSWORD_MIN_LENGTH = 12

const ResetPassword = () => {
    const router = useRouter()
    const [token, setToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const query = new URLSearchParams(window.location.search)
        setToken(query.get('token') || '')
    }, [])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        if (!token) {
            setError('El enlace de recuperación es inválido o expiró.')
            return
        }

        if (password.length < PASSWORD_MIN_LENGTH) {
            setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
            return
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.')
            return
        }

        setLoading(true)
        try {
            const response = await confirmPasswordReset({ token, password })
            setSuccess(response.message || 'Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña.')
            setTimeout(() => {
                router.push('/login?reset=true')
            }, 900)
        } catch (err: any) {
            setError(err.message || 'No se pudo restablecer la contraseña.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="Nuevos clientes ahorran 10% con el código GET10" />
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
                <Breadcrumb heading='Nueva contraseña' subHeading='Nueva contraseña' />
            </div>
            <div className="forgot-pass md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
                            <div className="heading4">Crea una nueva contraseña</div>
                            <div className="body1 mt-2">
                                Usa una contraseña segura de al menos {PASSWORD_MIN_LENGTH} caracteres. Al finalizar deberás iniciar sesión nuevamente.
                            </div>
                            {success && <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}
                            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                            <form className="md:mt-7 mt-4" onSubmit={handleSubmit}>
                                <div className="pass">
                                    <input
                                        className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                                        id="new-password"
                                        type="password"
                                        placeholder="Nueva contraseña *"
                                        autoComplete="new-password"
                                        minLength={PASSWORD_MIN_LENGTH}
                                        required
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                    />
                                </div>
                                <div className="pass mt-5">
                                    <input
                                        className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Confirmar contraseña *"
                                        autoComplete="new-password"
                                        minLength={PASSWORD_MIN_LENGTH}
                                        required
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                    />
                                </div>
                                <div className="block-button md:mt-7 mt-4">
                                    <button className="button-main" disabled={loading || !token}>
                                        {loading ? 'Actualizando...' : 'Restablecer contraseña'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
                            <div className="text-content">
                                <div className="heading4">¿Necesitas otro enlace?</div>
                                <div className="mt-2 text-secondary">
                                    Si el enlace expiró, solicita uno nuevo desde la pantalla de recuperación.
                                </div>
                                <div className="block-button md:mt-7 mt-4">
                                    <Link href={'/forgot-password'} className="button-main">Solicitar enlace</Link>
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

export default ResetPassword
