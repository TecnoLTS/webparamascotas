'use client'

import dynamic from 'next/dynamic'

const AccountLoadingShell = () => (
  <div className="container py-16" aria-busy="true" aria-label="Cargando cuenta">
    <div className="mx-auto max-w-5xl animate-pulse space-y-6">
      <div className="h-10 w-56 rounded-full bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <div className="h-80 rounded-3xl bg-slate-200" />
        <div className="h-[32rem] rounded-3xl bg-slate-200" />
      </div>
    </div>
  </div>
)

const MyAccountController = dynamic(
  () => import('./MyAccountController'),
  { ssr: false, loading: AccountLoadingShell },
)

export default function MyAccountClient() {
  return <MyAccountController />
}
