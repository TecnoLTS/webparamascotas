'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MenuOne from '@/components/Header/Menu/MenuPet'
import Footer from '@/components/Footer/Footer'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { login } from '@/lib/api/auth'
import { setCookieSessionMarker, setStoredSessionUser } from '@/lib/authSession'

const Login = () => {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [mfaRequired, setMfaRequired] = useState(false)
    const [mfaCode, setMfaCode] = useState('')
    const [mfaMethod, setMfaMethod] = useState<'email_otp' | 'recovery_code'>('email_otp')

    React.useEffect(() => {
        const query = new URLSearchParams(window.location.search)
        if (query.get('registered') === 'true') {
            setSuccess('¡Cuenta creada exitosamente! Por favor, inicia sesión.')
        } else if (query.get('reset') === 'true') {
            setSuccess('Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña.')
        }
    }, [])

    const getNextPath = React.useCallback(() => {
        if (typeof window === 'undefined') return '/my-account'
        const query = new URLSearchParams(window.location.search)
        const next = query.get('next') || '/my-account'
        if (!next.startsWith('/')) {
            return '/my-account'
        }
        return next
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            const res = await login({ email, password, mfaCode: mfaRequired ? mfaCode : undefined })
            if (res.mfaRequired) {
                setMfaRequired(true)
                setMfaMethod(res.mfaMethod || 'email_otp')
                setSuccess(res.message || 'Te enviamos un código MFA al correo del administrador.')
                return
            }
            if (!res.user) {
                throw new Error('No se pudo iniciar la sesión.')
            }
            setCookieSessionMarker()
            setStoredSessionUser(res.user)
            router.push(getNextPath())
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
            </div>
            <div className="login-block md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
                            <div className="heading4">Inicia Sesión</div>
                            {success && <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}
                            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                            <form className="md:mt-7 mt-4" onSubmit={handleSubmit}>
                                <div className="email ">
                                    <input
                                        className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                                        id="username"
                                        type="email"
                                        placeholder="Correo electrónico *"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="pass mt-5">
                                    <input
                                        className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                                        id="password"
                                        type="password"
                                        placeholder="Contraseña *"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                {mfaRequired && (
                                    <div className="pass mt-5">
                                        <div className="mb-2 text-sm text-secondary">
                                            {mfaMethod === 'recovery_code'
                                                ? 'Ingresa el código de recuperación del administrador.'
                                                : 'Ingresa el código MFA de 6 dígitos enviado por correo.'}
                                        </div>
                                        <input
                                            className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                                            id="mfaCode"
                                            type="text"
                                            inputMode={mfaMethod === 'recovery_code' ? 'text' : 'numeric'}
                                            maxLength={mfaMethod === 'recovery_code' ? 32 : 6}
                                            placeholder={mfaMethod === 'recovery_code' ? 'Código de recuperación *' : 'Código MFA de 6 dígitos *'}
                                            required
                                            value={mfaCode}
                                            onChange={(e) => {
                                                const nextValue = mfaMethod === 'recovery_code'
                                                    ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32)
                                                    : e.target.value.replace(/\D/g, '').slice(0, 6)
                                                setMfaCode(nextValue)
                                            }}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-5">
                                    <div className='flex items-center'>
                                        <div className="block-input">
                                            <input
                                                type="checkbox"
                                                name='remember'
                                                id='remember'
                                            />
                                            <Icon.CheckSquare size={20} weight='fill' className='icon-checkbox' />
                                        </div>
                                        <label htmlFor='remember' className="pl-2 cursor-pointer">Recuérdame</label>
                                    </div>
                                    <Link href={'/forgot-password'} className='font-semibold hover:underline'>¿Olvidaste tu contraseña?</Link>
                                </div>
                                <div className="block-button md:mt-7 mt-4">
                                    <button className="button-main" disabled={loading}>
                                        {loading ? 'Cargando...' : (mfaRequired ? 'Validar código' : 'Ingresar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
                            <div className="text-content">
                                <div className="heading4">Nuevo Cliente</div>
                                <div className="mt-2 text-secondary">¡Sé parte de nuestra familia! Únete hoy y desbloquea un mundo de beneficios exclusivos, ofertas y experiencias personalizadas.</div>
                                <div className="block-button md:mt-7 mt-4">
                                    <Link href={'/register'} className="button-main">Regístrate</Link>
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

export default Login
