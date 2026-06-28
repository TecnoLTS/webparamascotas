"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  ClockCountdown,
  EnvelopeSimple,
  Package,
  PaperPlaneTilt,
  Receipt,
  WarningCircle,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr"

import Footer from "@/components/Footer/Footer"
import MenuPet from "@/components/Header/Menu/MenuPet"
import { useSite } from "@/context/SiteContext"
import { sendContactMessage } from "@/lib/api/contact"

type ContactFormState = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  website: string
}

const INITIAL_FORM: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
}

function getFieldError(form: ContactFormState) {
  if (form.name.trim().length < 3) return "Ingresa un nombre válido."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Ingresa un correo electrónico válido."
  if (form.subject.trim().length < 5) return "El asunto debe tener al menos 5 caracteres."
  if (form.message.trim().length < 10) return "Cuéntanos un poco más. El mensaje debe tener al menos 10 caracteres."
  return null
}

export default function ContactPage() {
  const site = useSite()

  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle")
  const [feedback, setFeedback] = useState("")

  const whatsappLink = useMemo(() => {
    return `https://wa.me/${site.contact.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
      "Hola, tengo una consulta sobre sus productos"
    )}`
  }, [site.contact.whatsappNumber])

  const validationError = useMemo(() => getFieldError(form), [form])
  const canSubmit = !submitting

  const handleChange =
    (field: keyof ContactFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      if (submitState !== "idle") {
        setSubmitState("idle")
        setFeedback("")
      }
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const error = getFieldError(form)
    if (error) {
      setSubmitState("error")
      setFeedback(error)
      return
    }

    setSubmitting(true)
    setSubmitState("idle")
    setFeedback("")

    try {
      const result = await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
        website: form.website.trim() || undefined,
      })

      setSubmitState("success")
      setFeedback(
        result.delivered
          ? "Recibimos tu mensaje y ya fue enviado al equipo. Te responderemos pronto."
          : "Recibimos tu mensaje correctamente. Lo revisaremos y te responderemos pronto."
      )
      setForm(INITIAL_FORM)
    } catch (error) {
      setSubmitState("error")
      setFeedback(error instanceof Error ? error.message : "No pudimos enviar tu mensaje.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <MenuPet />

      <main className="pm-contact-page bg-[#f3f7fa] text-slate-900 pb-16">
        {/* CABECERA (HERO) */}
        <section className="pm-contact-hero border-b border-[#d9e7ee] bg-white">
          <div className="pm-contact-hero__inner mx-auto max-w-4xl px-4 py-12 text-center md:px-6 lg:py-16">
            <div className="pm-contact-hero__eyebrow mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#cfeaf2] bg-[#eefafe] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0a7d99]">
              Centro de Ayuda Paramascotas
            </div>
            <h1 className="pm-contact-hero__title mb-4 text-4xl font-black leading-[1.05] tracking-[-0.03em] text-[#0a7b8f] sm:text-5xl md:text-6xl">
              ¿En qué podemos ayudarte?
            </h1>
            <p className="pm-contact-hero__intro mx-auto max-w-2xl text-lg leading-8 text-slate-600">
              Estamos aquí para resolver tus dudas sobre compras, pedidos y soporte. Escríbenos con contexto y te responderemos pronto.
            </p>
          </div>
        </section>

        {/* CONTENIDO PRINCIPAL */}
        <section className="pm-contact-content mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14">
          <div className="pm-contact-layout grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
            
            {/* COLUMNA IZQUIERDA: Formulario */}
            <div className="pm-contact-card rounded-[34px] border border-[#d9e7ee] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] md:p-10">
              <div className="pm-contact-card__header mb-8 max-w-3xl space-y-3">
                <h2 className="pm-contact-card__title text-3xl font-black tracking-[-0.03em] text-[#0a7b8f]">Envíanos un mensaje</h2>
                <p className="pm-contact-card__copy text-base leading-7 text-slate-600">
                  Déjanos nombre, correo y el mayor contexto posible para que la respuesta sea concreta desde el primer mensaje.
                </p>
              </div>

              <form className="pm-contact-form grid gap-6" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={handleChange("website")}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <div className="pm-contact-form__row grid gap-6 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Nombre completo</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={handleChange("name")}
                      placeholder="Ej: Edwin Vásquez"
                      className="h-14 rounded-2xl border border-[#d9e7ee] px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0a7d99]"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Correo electrónico</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={handleChange("email")}
                      placeholder="tu@correo.com"
                      className="h-14 rounded-2xl border border-[#d9e7ee] px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0a7d99]"
                    />
                  </label>
                </div>

                <div className="pm-contact-form__row grid gap-6 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Teléfono (Opcional)</span>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={handleChange("phone")}
                      placeholder="Ej: 0991234567"
                      className="h-14 rounded-2xl border border-[#d9e7ee] px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0a7d99]"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Asunto</span>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={handleChange("subject")}
                      placeholder="Ej: Duda sobre mi pedido"
                      className="h-14 rounded-2xl border border-[#d9e7ee] px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0a7d99]"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Mensaje</span>
                  <textarea
                    value={form.message}
                    onChange={handleChange("message")}
                    placeholder="Explícanos qué pasó, qué necesitas o qué producto/pedido está involucrado."
                    rows={7}
                    className="rounded-[28px] border border-[#d9e7ee] px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0a7d99] resize-none"
                  />
                  <div className="pm-contact-form__meta flex items-center justify-between gap-4 text-xs text-slate-500">
                    <span>Escribe al menos 10 caracteres para poder enviar el mensaje.</span>
                    <span>{form.message.trim().length}/10 mínimo</span>
                  </div>
                </label>

                {/* Feedback */}
                {feedback ? (
                  <div
                    className={`rounded-[24px] border px-5 py-4 text-sm leading-6 ${
                      submitState === "success"
                        ? "border-[#b7efc8] bg-[#effbf2] text-[#166534]"
                        : "border-[#f5c2c7] bg-[#fff4f4] text-[#b42318]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {submitState === "success" ? (
                        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0" />
                      ) : (
                        <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" />
                      )}
                      <span>{feedback}</span>
                    </div>
                  </div>
                ) : null}

                {/* Área del botón enviar */}
                <div className="pm-contact-submit mt-2 grid gap-5 rounded-[28px] border border-[#e7edf2] bg-[#f9fbfc] p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <p className="text-sm leading-7 text-slate-600">
                    Si tu consulta está ligada a una compra, incluye tu <strong>número de pedido</strong> para acelerar la respuesta.
                  </p>
                  <div className="pm-contact-submit__actions grid gap-2">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex min-w-[220px] items-center justify-center gap-3 rounded-full bg-black px-8 py-4 text-sm font-bold text-white transition hover:bg-[#0a7d99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <PaperPlaneTilt size={18} weight="duotone" />
                      {submitting ? "Enviando..." : "Enviar mensaje"}
                    </button>
                    {validationError ? (
                      <div className="text-right text-xs text-[#b42318]">{validationError}</div>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>

            {/* COLUMNA DERECHA: Info lateral */}
            <aside className="pm-contact-aside flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
              
              {/* Tarjeta WhatsApp */}
              <div className="pm-contact-whatsapp rounded-[32px] bg-[linear-gradient(180deg,#1c8da3_0%,#166b80_100%)] p-7 text-white shadow-[0_28px_80px_rgba(22,107,128,0.22)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d9f7fb]">Canal Inmediato</div>
                <h3 className="mt-4 text-2xl font-black leading-[1.1] tracking-[-0.03em] text-white">
                  ¿Respuesta urgente?
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/90">
                  Usa WhatsApp para consultas sobre compras activas, cambios de última hora o seguimiento de entregas.
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#1fbe5d]"
                >
                  <WhatsappLogo size={20} weight="fill" />
                  Abrir WhatsApp
                </a>
              </div>

              {/* Tarjeta Info de Contacto */}
              <div className="pm-contact-info rounded-[32px] border border-[#d9e7ee] bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-6">Información de contacto</div>
                <div className="grid gap-6">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex rounded-full bg-[#eefafe] p-3 text-[#0a7d99]">
                      <EnvelopeSimple size={20} weight="duotone" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-950">Correo Electrónico</div>
                      <div className="mt-1 text-sm text-slate-600 break-all">{site.contact.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="inline-flex rounded-full bg-[#eefafe] p-3 text-[#0a7d99]">
                      <ClockCountdown size={20} weight="duotone" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-950">Horario de atención</div>
                      <div className="mt-1 text-sm text-slate-600">Prioridad en horario laboral</div>
                    </div>
                  </div>
                </div>
              </div>

            </aside>
          </div>

          {/* ENLACES RÁPIDOS INFERIORES */}
          <div className="pm-contact-quicklinks mt-8 grid gap-5 md:grid-cols-3">
            <Link
              href="/tienda"
              className="pm-contact-quicklink rounded-[28px] border border-[#d9e7ee] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition hover:border-[#0a7d99]"
            >
              <Package size={28} weight="duotone" className="text-[#0a7d99] mb-4" />
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Compra</div>
              <div className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Ir a la tienda</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">Explora el catálogo y los productos disponibles.</div>
            </Link>

            <Link
              href="/dashboard/"
              prefetch={false}
              className="pm-contact-quicklink rounded-[28px] border border-[#d9e7ee] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition hover:border-[#0a7d99]"
            >
              <Receipt size={28} weight="duotone" className="text-[#0a7d99] mb-4" />
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Pedido</div>
              <div className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Ver mi cuenta</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">Revisa el estado de tus pedidos y direcciones.</div>
            </Link>

            <Link
              href="/pages/preguntas-frecuentes"
              className="pm-contact-quicklink relative rounded-[28px] border border-[#d9e7ee] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition hover:border-[#0a7d99]"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">Ayuda rápida</div>
              <div className="text-xl font-black tracking-[-0.03em] text-slate-950">Preguntas Frecuentes</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">Consulta respuestas inmediatas antes de escribir.</div>
              <ArrowRight size={20} weight="bold" className="absolute bottom-6 right-6 text-[#0a7d99]" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
