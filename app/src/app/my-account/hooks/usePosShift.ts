'use client'

import React from 'react'

import { requestApi } from '@/lib/apiClient'
import type { PosMovement, PosShift } from '../types'

type UsePosShiftParams = {
  showNotification: (text: string, type?: 'success' | 'error') => void
  parseDecimalInput: (value: string) => number
}

export const usePosShift = ({ showNotification, parseDecimalInput }: UsePosShiftParams) => {
  const [posActiveShift, setPosActiveShift] = React.useState<PosShift | null>(null)
  const [posShiftHistory, setPosShiftHistory] = React.useState<PosShift[]>([])
  const [posMovements, setPosMovements] = React.useState<PosMovement[]>([])
  const [posLoading, setPosLoading] = React.useState(false)
  const [posActionLoading, setPosActionLoading] = React.useState(false)
  const [posOpeningCash, setPosOpeningCash] = React.useState('')
  const [posOpenNotes, setPosOpenNotes] = React.useState('')
  const [posClosingCash, setPosClosingCash] = React.useState('')
  const [posCloseNotes, setPosCloseNotes] = React.useState('')
  const [posMovementType, setPosMovementType] = React.useState<PosMovement['type']>('expense')
  const [posMovementAmount, setPosMovementAmount] = React.useState('')
  const [posMovementDescription, setPosMovementDescription] = React.useState('')
  const [posMovementCreateExpense, setPosMovementCreateExpense] = React.useState(false)
  const [posMovementExpenseCategory, setPosMovementExpenseCategory] = React.useState('Otros')

  const syncPosState = React.useCallback((payload: any) => {
    const shift = payload?.shift ? payload.shift as PosShift : null
    const movements = Array.isArray(payload?.movements) ? payload.movements as PosMovement[] : []
    const history = Array.isArray(payload?.history) ? payload.history as PosShift[] : []
    setPosActiveShift(shift)
    setPosMovements(movements)
    setPosShiftHistory(history)
    if (shift?.status === 'open') {
      setPosClosingCash(String(Number(shift.summary?.expected_cash ?? 0).toFixed(2)))
    } else {
      setPosClosingCash('')
    }
  }, [])

  const loadPosSnapshot = React.useCallback(async (_token?: string) => {
    const res = await requestApi<any>('/api/admin/pos/shift/active')
    syncPosState(res.body)
  }, [syncPosState])

  const handleOpenPosShift = React.useCallback(async () => {
    const openingCash = parseDecimalInput(posOpeningCash)
    if (openingCash < 0) {
      showNotification('El monto inicial de caja no puede ser negativo.', 'error')
      return
    }
    try {
      setPosActionLoading(true)
      const res = await requestApi<any>('/api/admin/pos/shift/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_cash: openingCash,
          notes: posOpenNotes.trim() || null,
        }),
      })
      syncPosState(res.body)
      setPosOpeningCash('')
      setPosOpenNotes('')
      showNotification('Caja abierta correctamente.')
    } catch (error: any) {
      console.error(error)
      showNotification(String(error?.message || 'No se pudo abrir la caja.'), 'error')
    } finally {
      setPosActionLoading(false)
    }
  }, [parseDecimalInput, posOpenNotes, posOpeningCash, showNotification, syncPosState])

  const handleClosePosShift = React.useCallback(async () => {
    if (!posActiveShift || posActiveShift.status !== 'open') {
      showNotification('No hay una caja abierta para cerrar.', 'error')
      return
    }
    const closingCash = parseDecimalInput(posClosingCash)
    if (closingCash < 0) {
      showNotification('El monto de cierre no puede ser negativo.', 'error')
      return
    }
    try {
      setPosActionLoading(true)
      const res = await requestApi<any>('/api/admin/pos/shift/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closing_cash: closingCash,
          notes: posCloseNotes.trim() || null,
        }),
      })
      syncPosState(res.body)
      setPosCloseNotes('')
      showNotification('Caja cerrada correctamente.')
    } catch (error: any) {
      console.error(error)
      showNotification(String(error?.message || 'No se pudo cerrar la caja.'), 'error')
    } finally {
      setPosActionLoading(false)
    }
  }, [parseDecimalInput, posActiveShift, posCloseNotes, posClosingCash, showNotification, syncPosState])

  const handleAddPosMovement = React.useCallback(async () => {
    const amount = parseDecimalInput(posMovementAmount)
    if (posMovementType !== 'adjustment' && amount <= 0) {
      showNotification('El monto debe ser mayor a cero.', 'error')
      return
    }
    if (posMovementType === 'adjustment' && Math.abs(amount) < 0.01) {
      showNotification('El ajuste no puede ser cero.', 'error')
      return
    }
    try {
      setPosActionLoading(true)
      const res = await requestApi<any>('/api/admin/pos/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: posMovementType,
          amount,
          description: posMovementDescription.trim() || null,
          create_business_expense: ['expense', 'withdrawal'].includes(posMovementType) ? posMovementCreateExpense : false,
          business_expense_category: posMovementExpenseCategory,
        }),
      })
      syncPosState(res.body)
      setPosMovementAmount('')
      setPosMovementDescription('')
      setPosMovementCreateExpense(false)
      showNotification('Movimiento de caja registrado.')
    } catch (error: any) {
      console.error(error)
      showNotification(String(error?.message || 'No se pudo registrar el movimiento.'), 'error')
    } finally {
      setPosActionLoading(false)
    }
  }, [parseDecimalInput, posMovementAmount, posMovementCreateExpense, posMovementDescription, posMovementExpenseCategory, posMovementType, showNotification, syncPosState])

  return {
    posActiveShift,
    posShiftHistory,
    posMovements,
    posLoading,
    setPosLoading,
    posActionLoading,
    posOpeningCash,
    setPosOpeningCash,
    posOpenNotes,
    setPosOpenNotes,
    posClosingCash,
    setPosClosingCash,
    posCloseNotes,
    setPosCloseNotes,
    posMovementType,
    setPosMovementType,
    posMovementAmount,
    setPosMovementAmount,
    posMovementDescription,
    setPosMovementDescription,
    posMovementCreateExpense,
    setPosMovementCreateExpense,
    posMovementExpenseCategory,
    setPosMovementExpenseCategory,
    syncPosState,
    loadPosSnapshot,
    handleOpenPosShift,
    handleClosePosShift,
    handleAddPosMovement,
  }
}
