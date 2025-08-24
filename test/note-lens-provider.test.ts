import type { TextDocument, Uri } from 'vscode'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeLens, Range, workspace } from 'vscode'

import NoteLensProvider from '../src/note-lens-provider'

vi.mock('vscode', () => ({
  CodeLens: vi.fn(),
  EventEmitter: vi.fn(() => {}),
  Range: vi.fn(),
  workspace: {
    fs: {
      stat: vi.fn(),
    },
  },
  window: {
    createOutputChannel: vi.fn(() => ({
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      appendLine: vi.fn(),
    })),
  },
}))

vi.mock('../src/utils/notes', () => ({
  isNoteFile: vi.fn(),
  isMarkdownFile: vi.fn(),
  getNoteUri: vi.fn(),
}))

const { isNoteFile, isMarkdownFile, getNoteUri } = await import('../src/utils/notes')

describe('NoteLensProvider', () => {
  let provider: NoteLensProvider
  let mockDocument: TextDocument

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new NoteLensProvider()
    mockDocument = {
      uri: { path: '/workspace/src/file.ts' },
    } as TextDocument
  })

  describe('refresh', () => {
    it('fires the onDidChangeCodeLenses event', () => {
      const mockFire = vi.fn()
      ;(provider as any)._onDidChangeCodeLenses = { fire: mockFire }

      provider.refresh()

      expect(mockFire).toHaveBeenCalledOnce()
    })
  })

  describe('provideCodeLenses', () => {
    it('returns empty array for note files', async () => {
      vi.mocked(isNoteFile).mockReturnValue(true)
      vi.mocked(isMarkdownFile).mockReturnValue(false)

      const result = await provider.provideCodeLenses(mockDocument)

      expect(result).toEqual([])
      expect(isNoteFile).toHaveBeenCalledWith(mockDocument.uri)
    })

    it('returns empty array for markdown files', async () => {
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(true)

      const result = await provider.provideCodeLenses(mockDocument)

      expect(result).toEqual([])
      expect(isMarkdownFile).toHaveBeenCalledWith(mockDocument.uri)
    })

    it('returns empty array when getNoteUri returns undefined', async () => {
      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(undefined)

      const result = await provider.provideCodeLenses(mockDocument)

      expect(result).toEqual([])
      expect(getNoteUri).toHaveBeenCalledWith(mockDocument.uri)
    })

    it('returns "Add Note" code lens when note does not exist', async () => {
      const mockNoteUri = { path: '/workspace/.vscode/notelets/src/file.ts.md' } as Uri

      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(mockNoteUri)
      vi.mocked(workspace.fs.stat).mockRejectedValue(new Error('File not found'))

      const result = await provider.provideCodeLenses(mockDocument)

      expect(result).toHaveLength(1)
      expect(CodeLens).toHaveBeenCalledWith(
        expect.any(Object), // Range
        {
          title: 'Add Note',
          command: 'notelets.openNote',
          arguments: [mockDocument.uri],
        },
      )
      expect(Range).toHaveBeenCalledWith(0, 0, 0, 0)
    })

    it('returns "Open Note" code lens when note exists', async () => {
      const mockNoteUri = { path: '/workspace/.vscode/notelets/src/file.ts.md' } as Uri

      vi.mocked(isNoteFile).mockReturnValue(false)
      vi.mocked(isMarkdownFile).mockReturnValue(false)
      vi.mocked(getNoteUri).mockReturnValue(mockNoteUri)
      vi.mocked(workspace.fs.stat).mockResolvedValue({} as any)

      const result = await provider.provideCodeLenses(mockDocument)

      expect(result).toHaveLength(1)
      expect(CodeLens).toHaveBeenCalledWith(
        expect.any(Object), // Range
        {
          title: 'Open Note',
          command: 'notelets.openNote',
          arguments: [mockDocument.uri],
        },
      )
      expect(workspace.fs.stat).toHaveBeenCalledWith(mockNoteUri)
    })
  })
})
