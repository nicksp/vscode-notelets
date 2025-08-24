import packageJson from '../../package.json'
import { useLogger } from './use-logger'

export const logger = useLogger(packageJson.displayName)
