import type { ExtensionContext, TextEditor, Uri } from 'vscode'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RelativePattern, StatusBarAlignment, window, workspace } from 'vscode'

import { createNotesWatcher, initStatusBar } from '../src/features'

vi.mock('vscode', () => ({
  RelativePattern: vi.fn(),
  StatusBarAlignment: {
    Right: 2,
  },
  window: {
    createStatusBarItem: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(),
    createOutputChannel: vi.fn(() => ({
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      appendLine: vi.fn(),
    })),
  },
  workspace: {
    workspaceFolders: null,
    createFileSystemWatcher: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    asRelativePath: vi.fn(uri => (uri as any).path?.replace('/workspace/', '') ?? ''),
    fs: {
      stat: vi.fn(),
    },
  },
}))

vi.mock('../src/utils/configuration', () => ({
  getConfig: vi.fn(),
}))

vi.mock('../src/utils/notes', () => ({
  getNoteUri: vi.fn(),
  isMarkdownFile: vi.fn(),
  isNoteFile: vi.fn(),
  normalizePath: vi.fn((path: string) => `${path}/`),
}))

const { getConfig } = await import('../src/utils/configuration')
const { getNoteUri, isMarkdownFile, isNoteFile } = await import('../src/utils/notes')

describe('extras', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set default config values
    vi.mocked(getConfig).mockImplementation(key => {
      if (key === 'notesFolder') {
        return '.vscode/notelets'
      }
      if (key === 'showStatusBar') {
        return true
      }
      if (key === 'openBehavior') {
        return 'editor'
      }
      return undefined as any
    })
  })

  describe('createNotesWatcher', () => {
    it('returns empty array when no workspace folders', () => {
      vi.mocked(workspace).workspaceFolders = undefined
      const onChange = vi.fn()

      const result = createNotesWatcher(onChange)

      expect(result).toEqual([])
    })

    it('creates watchers for each workspace folder', () => {
      const mockWatcher = {
        onDidChange: vi.fn(),
        onDidCreate: vi.fn(),
        onDidDelete: vi.fn(),
      }
      const workspaceFolders = [
        { uri: { path: '/workspace1' } },
        { uri: { path: '/workspace2' } },
      ]

      vi.mocked(workspace).workspaceFolders = workspaceFolders as any
      vi.mocked(workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any)
      const onChange = vi.fn()

      const result = createNotesWatcher(onChange)

      expect(result).toHaveLength(2)
      expect(RelativePattern).toHaveBeenCalledTimes(2)
      expect(RelativePattern).toHaveBeenCalledWith(workspaceFolders[0], '**/.vscode/notelets/**/*.md')
      expect(RelativePattern).toHaveBeenCalledWith(workspaceFolders[1], '**/.vscode/notelets/**/*.md')
      expect(workspace.createFileSystemWatcher).toHaveBeenCalledTimes(2)
      expect(mockWatcher.onDidChange).toHaveBeenCalledWith(onChange)
      expect(mockWatcher.onDidCreate).toHaveBeenCalledWith(onChange)
      expect(mockWatcher.onDidDelete).toHaveBeenCalledWith(onChange)
    })
  })

  describe('initStatusBar', () => {
    let mockContext: ExtensionContext
    let mockStatusBar: any
    let mockUpdate: () => Promise<void>

    beforeEach(() => {
      mockContext = {
        subscriptions: [],
      } as any

      mockStatusBar = {
        hide: vi.fn(),
        show: vi.fn(),
        text: '',
        command: '',
      }

      vi.mocked(window.createStatusBarItem).mockReturnValue(mockStatusBar)
      vi.mocked(window.onDidChangeActiveTextEditor).mockImplementation(callback => {
        mockUpdate = callback as () => Promise<void>
        return { dispose: vi.fn() } as any
      })
      vi.mocked(workspace.onDidChangeConfiguration).mockReturnValue({ dispose: vi.fn() } as any)
    })

    it('creates status bar item and sets up subscriptions', () => {
      initStatusBar(mockContext)

      expect(window.createStatusBarItem).toHaveBeenCalledWith(StatusBarAlignment.Right, 100)
      // statusBar, onDidChangeActiveTextEditor, onDidChangeConfiguration
      expect(mockContext.subscriptions).toHaveLength(3)
      expect(window.onDidChangeActiveTextEditor).toHaveBeenCalled()
      expect(workspace.onDidChangeConfiguration).toHaveBeenCalled()
    })

    it('hides status bar when showStatusBar config is false', async () => {
      // Setup an editor that would normally show the status bar
      const mockEditor = {
        document: { uri: { path: '/workspace/src/file.ts' } },
      } as TextEditor
      const mockNoteUri = { path: '/workspace/.vscode/notelets/src/file.ts.md' } as Uri

      vi.mocked(window).activeTextEditor = mockEditor
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(mockNoteUri)
      vi.mocked(workspace.fs.stat).mockResolvedValue({} as any)

      vi.mocked(getConfig).mockImplementation(key => {
        if (key === 'showStatusBar') {
          return false
        }
        return undefined as any
      })

      initStatusBar(mockContext)
      await mockUpdate()

      expect(mockStatusBar.hide).toHaveBeenCalled()
      expect(mockStatusBar.show).not.toHaveBeenCalled()
    })

    it('hides status bar when no active editor', async () => {
      vi.mocked(window).activeTextEditor = undefined

      initStatusBar(mockContext)
      await mockUpdate()

      expect(mockStatusBar.hide).toHaveBeenCalled()
    })

    it('hides status bar for note files', async () => {
      const mockEditor = {
        document: { uri: { path: '/workspace/.vscode/notelets/note.md' } },
      } as TextEditor

      vi.mocked(window).activeTextEditor = mockEditor
      vi.mocked(isNoteFile).mockReturnValue(true)
      vi.mocked(isMarkdownFile).mockReturnValue(false)

      initStatusBar(mockContext)
      await mockUpdate()

      expect(mockStatusBar.hide).toHaveBeenCalled()
      expect(isNoteFile).toHaveBeenCalledWith(mockEditor.document.uri)
    })

    it('hides status bar for markdown files', async () => {
      const mockEditor = {
        document: { uri: { path: '/workspace/README.md' } },
      } as TextEditor

      vi.mocked(window).activeTextEditor = mockEditor
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(true)

      initStatusBar(mockContext)
      await mockUpdate()

      expect(mockStatusBar.hide).toHaveBeenCalled()
      expect(isMarkdownFile).toHaveBeenCalledWith(mockEditor.document.uri)
    })

    it('hides status bar when getNoteUri returns undefined', async () => {
      const mockEditor = {
        document: { uri: { path: '/workspace/src/file.ts' } },
      } as TextEditor

      vi.mocked(window).activeTextEditor = mockEditor
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(undefined)

      initStatusBar(mockContext)
      await mockUpdate()

      expect(mockStatusBar.hide).toHaveBeenCalled()
      expect(getNoteUri).toHaveBeenCalledWith(mockEditor.document.uri)
    })

    it('shows status bar when note exists', async () => {
      const mockEditor = {
        document: { uri: { path: '/workspace/src/file.ts' } },
      } as TextEditor
      const mockNoteUri = { path: '/workspace/.vscode/notelets/src/file.ts.md' } as Uri

      vi.mocked(window).activeTextEditor = mockEditor
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(mockNoteUri)
      vi.mocked(workspace.fs.stat).mockResolvedValue({} as any)

      initStatusBar(mockContext)
      await mockUpdate()

      expect(workspace.fs.stat).toHaveBeenCalledWith(mockNoteUri)
      expect(mockStatusBar.text).toBe('$(note) Notelet')
      expect(mockStatusBar.command).toBe('notelets.openNote')
      expect(mockStatusBar.show).toHaveBeenCalled()
    })

    it('hides status bar when note does not exist', async () => {
      const mockEditor = {
        document: { uri: { path: '/workspace/src/file.ts' } },
      } as TextEditor
      const mockNoteUri = { path: '/workspace/.vscode/notelets/src/file.ts.md' } as Uri

      vi.mocked(window).activeTextEditor = mockEditor
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(mockNoteUri)
      vi.mocked(workspace.fs.stat).mockRejectedValue(new Error('File not found'))

      initStatusBar(mockContext)
      await mockUpdate()

      expect(workspace.fs.stat).toHaveBeenCalledWith(mockNoteUri)
      expect(mockStatusBar.hide).toHaveBeenCalled()
    })
  })
})
