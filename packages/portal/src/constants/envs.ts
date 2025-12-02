import { getEnvs } from '@pzero/shared/constants'

const Config = import.meta.env

export const envs = getEnvs(Config)
