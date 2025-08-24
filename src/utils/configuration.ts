import type { ConfigurationProps } from '../types'

import { workspace } from 'vscode'

import packageJson from '../../package.json'

export function getConfig<K extends keyof ConfigurationProps>(key: K): ConfigurationProps[K] {
  const config = workspace.getConfiguration(packageJson.name)
  return config.get<ConfigurationProps[K]>(key)!
}
