import { getEnvs } from '@pzero/shared/constants'

const Config: ImportMetaEnv = import.meta.env

export const envs = getEnvs(Config, 'VITE')
