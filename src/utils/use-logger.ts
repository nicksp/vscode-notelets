import type { OutputChannel } from 'vscode'

import { window } from 'vscode'

export type UseLoggerOptions = {
  outputChannel?: OutputChannel
  getPrefix?: ((type: string) => string) | null
}

/**
 * Creates a logger that writes to the output channel.
 *
 * @category view
 */
export function useLogger(name: string, options: UseLoggerOptions = {}) {
  const outputChannel = options.outputChannel ?? window.createOutputChannel(name, { log: true })

  const createLoggerFn = (type: string) => (...message: unknown[]) => {
    outputChannel.appendLine((options.getPrefix?.(type) ?? '') + message.join(' '))
  }

  return {
    outputChannel,
    createLoggerFn,
    info: createLoggerFn('INFO'),
    warn: createLoggerFn('WARN'),
    error: createLoggerFn('ERROR'),
    clear: outputChannel.clear.bind(outputChannel),
    show: outputChannel.show.bind(outputChannel),
    hide: outputChannel.hide.bind(outputChannel),
  }
}
