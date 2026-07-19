'use client'

import { CaretDown } from '@phosphor-icons/react/dist/ssr'

type CustomerSettingsPanelProps = Record<string, any>

export default function CustomerSettingsPanel({
  handleSaveSettings,
  passwordForm,
  profile,
  profileLoading,
  profileSaving,
  setPasswordForm,
  setProfile,
  user,
}: CustomerSettingsPanelProps) {
  return (
    <div className="tab text-content w-full p-7 border border-line rounded-xl">
      <form className="form-password" onSubmit={handleSaveSettings}>
        <div className="heading5 pb-2">Información personal</div>
        <p className="text-secondary text-sm">Datos usados para identificarte y completar tus pedidos.</p>
        <div className="grid sm:grid-cols-2 gap-4 gap-y-5 mt-6">
          <div className="first-name">
            <label htmlFor="firstName" className="caption1 capitalize">Nombre <span className="text-red">*</span></label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="firstName" type="text" placeholder="Nombre" required value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} disabled={profileLoading} />
          </div>
          <div className="last-name">
            <label htmlFor="lastName" className="caption1 capitalize">Apellido <span className="text-red">*</span></label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="lastName" type="text" placeholder="Apellido" required value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} disabled={profileLoading} />
          </div>
          <div className="phone-number">
            <label htmlFor="phoneNumber" className="caption1 capitalize">Número de Teléfono <span className="text-red">*</span></label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="phoneNumber" type="text" placeholder="Número de teléfono" required value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={profileLoading} />
          </div>
          <div className="email">
            <label htmlFor="email" className="caption1 capitalize">Correo Electrónico <span className="text-red">*</span></label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="email" type="email" defaultValue={user.email} placeholder="Correo electrónico" required disabled />
          </div>
          <div className="document-type">
            <label htmlFor="documentType" className="caption1 capitalize">Tipo de identificación <span className="text-red">*</span></label>
            <div className="select-block mt-2">
              <select
                className="border border-line px-4 py-3 w-full rounded-lg"
                id="documentType"
                name="documentType"
                value={profile.documentType || 'default'}
                onChange={(e) => setProfile({ ...profile, documentType: e.target.value })}
                disabled={profileLoading}
                required
              >
                <option value="default" disabled>Seleccionar</option>
                <option value="Cédula">Cédula</option>
                <option value="RUC">RUC</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="Otro">Otro</option>
              </select>
              <CaretDown className="arrow-down text-lg" />
            </div>
          </div>
          <div className="document-number">
            <label htmlFor="documentNumber" className="caption1 capitalize">Número de identificación <span className="text-red">*</span></label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="documentNumber" type="text" placeholder="Número de identificación" required value={profile.documentNumber} onChange={(e) => setProfile({ ...profile, documentNumber: e.target.value })} disabled={profileLoading} />
          </div>
          <div className="business-name sm:col-span-2">
            <label htmlFor="businessName" className="caption1 capitalize">Razón social (opcional)</label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="businessName" type="text" placeholder="Razón social" value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} disabled={profileLoading} />
          </div>
          <div className="gender">
            <label htmlFor="gender" className="caption1 capitalize">Género <span className="text-red">*</span></label>
            <div className="select-block mt-2">
              <select
                className="border border-line px-4 py-3 w-full rounded-lg"
                id="gender"
                name="gender"
                value={profile.gender || 'default'}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                disabled={profileLoading}
                required
              >
                <option value="default" disabled>Elegir Género</option>
                <option value="Male">Masculino</option>
                <option value="Female">Femenino</option>
                <option value="Other">Otro</option>
              </select>
              <CaretDown className="arrow-down text-lg" />
            </div>
          </div>
          <div className="birth">
            <label htmlFor="birth" className="caption1">Fecha de Nacimiento <span className="text-red">*</span></label>
            <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="birth" type="date" placeholder="Fecha de Nacimiento" required value={profile.birth} onChange={(e) => setProfile({ ...profile, birth: e.target.value })} disabled={profileLoading} />
          </div>
        </div>
        <div className="heading5 border-t border-line pb-2 pt-7 lg:mt-8 mt-6">Cambiar contraseña</div>
        <p className="text-secondary text-sm mb-4">Opcional. Si cambias tu contraseña, se cerrará la sesión por seguridad.</p>
        <div className="pass">
          <label htmlFor="password-setting" className="caption1">Contraseña actual</label>
          <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="password-setting" type="password" placeholder="Contraseña actual" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} disabled={profileSaving || profileLoading} />
        </div>
        <div className="new-pass mt-5">
          <label htmlFor="newPassword" className="caption1">Nueva contraseña</label>
          <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="newPassword" type="password" placeholder="Mínimo 12 caracteres" autoComplete="new-password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} disabled={profileSaving || profileLoading} />
        </div>
        <div className="confirm-pass mt-5">
          <label htmlFor="confirmPassword" className="caption1">Confirmar nueva contraseña</label>
          <input className="border-line mt-2 px-4 py-3 w-full rounded-lg" id="confirmPassword" type="password" placeholder="Confirmar nueva contraseña" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} disabled={profileSaving || profileLoading} />
        </div>
        <div className="block-button lg:mt-10 mt-6 flex justify-end">
          <button className="button-main py-3 px-10 rounded-full font-bold bg-black text-white hover:bg-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed" disabled={profileSaving || profileLoading}>
            {profileSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
