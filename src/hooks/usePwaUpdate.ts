import { useCallback, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePwaUpdate() {
  const [isUpdating, setIsUpdating] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  })

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true)
    try {
      await updateServiceWorker(true)
    } finally {
      setIsUpdating(false)
    }
  }, [updateServiceWorker])

  /** 新しい Service Worker を探し、なければ再読み込みで静的資産を更新 */
  const refreshAssets = useCallback(async () => {
    if (needRefresh) {
      await applyUpdate()
      return
    }

    setIsUpdating(true)
    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      await registration?.update()
      window.location.reload()
    } finally {
      setIsUpdating(false)
    }
  }, [applyUpdate, needRefresh])

  return {
    needRefresh,
    isUpdating,
    applyUpdate,
    refreshAssets,
  }
}
