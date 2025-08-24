import type { ExtensionContext } from 'vscode'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commands, languages, window, workspace } from 'vscode'

import { activate } from '../src/extension'

vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
  },
  languages: {
    registerCodeLensProvider: vi.fn(),
  },
  window: {
    createTreeView: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
  },
  workspace: {
    onDidRenameFiles: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDeleteFiles: vi.fn(() => ({ dispose: vi.fn() })),
    getConfiguration: vi.fn(() => ({ get: vi.fn() })),
  },
}))

vi.mock('../src/features', () => ({
  createNotesWatcher: vi.fn(() => []),
  initStatusBar: vi.fn(),
}))

vi.mock('../src/note-lens-provider', () => ({
  default: vi.fn(() => ({ refresh: vi.fn() })),
}))

vi.mock('../src/notes-provider', () => ({
  default: vi.fn(() => ({ refresh: vi.fn() })),
}))

vi.mock('../src/utils/debugger', () => ({
  logger: {
    info: vi.fn(),
  },
}))

const { createNotesWatcher, initStatusBar } = await import('../src/features')

describe('extension', () => {
  let mockContext: ExtensionContext

  beforeEach(() => {
    vi.clearAllMocks()
    mockContext = {
      subscriptions: [],
    } as any
  })

  describe('activate', () => {
    it('registers command and providers', () => {
      activate(mockContext)

      expect(commands.registerCommand).toHaveBeenCalledWith('notelets.openNote', expect.any(Function))
      expect(languages.registerCodeLensProvider).toHaveBeenCalledWith({ scheme: 'file' }, expect.any(Object))
      expect(window.createTreeView).toHaveBeenCalledWith('notelets.views.notes', { treeDataProvider: expect.any(Object) })
    })

    it('sets up event listeners', () => {
      activate(mockContext)

      expect(window.onDidChangeActiveTextEditor).toHaveBeenCalled()
      expect(workspace.onDidRenameFiles).toHaveBeenCalled()
      expect(workspace.onDidDeleteFiles).toHaveBeenCalled()
    })

    it('initializes features', () => {
      activate(mockContext)

      expect(createNotesWatcher).toHaveBeenCalledWith(expect.any(Function))
      expect(initStatusBar).toHaveBeenCalledWith(mockContext)
    })

    it('adds subscriptions to context', () => {
      activate(mockContext)

      expect(mockContext.subscriptions.length).toBeGreaterThan(0)
    })
  })
})
