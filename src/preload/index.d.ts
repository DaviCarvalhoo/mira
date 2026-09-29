import type { MiraApi } from '../shared/api'

declare global {
  interface Window {
    mira: MiraApi
  }
}

export {}
