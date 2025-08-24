import { sep } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Uri } from 'vscode'

import { getNotesRoot, isMarkdownFile, isNoteFile, normalizePath } from '../../src/utils/notes'

vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((base, path) => ({
      scheme: 'file',
      path: `${base.path}/${path}`,
      fsPath: `${base.fsPath}/${path}`,
    })),
  },
  workspace: {
    workspaceFolders: [{ uri: { path: '/project', fsPath: '/project' } }],
  },
  window: {
    createOutputChannel: vi.fn(() => ({
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      appendLine: vi.fn(),
    })),
    showErrorMessage: vi.fn(),
  },
}))

vi.mock('../../src/utils/configuration', () => ({
  getConfig: vi.fn(),
}))

const { getConfig } = await import('../../src/utils/configuration')

describe('notes utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizePath', () => {
    it('adds trailing separator when missing', () => {
      const result = normalizePath('.vscode/notelets')

      expect(result).toBe(`.vscode/notelets${sep}`)
    })

    it('keeps trailing separator when present', () => {
      const result = normalizePath(`.vscode/notelets${sep}`)

      expect(result).toBe(`.vscode/notelets${sep}`)
    })

    it('normalizes path separators', () => {
      const result = normalizePath('.vscode\\notelets')

      expect(result).toMatch(/\.vscode[/\\]notelets[/\\]$/)
    })
  })

  describe('isMarkdownFile', () => {
    it('returns true for .md files', () => {
      const uri = { path: '/path/to/file.md' } as Uri

      expect(isMarkdownFile(uri)).toBe(true)
    })

    it('returns false for non-.md files', () => {
      const uri = { path: '/path/to/file.ts' } as Uri

      expect(isMarkdownFile(uri)).toBe(false)
    })
  })

  describe('isNoteFile', () => {
    it('returns true when uri path includes normalized notes folder', () => {
      vi.mocked(getConfig).mockReturnValue('.vscode/notelets/')
      const uri = { path: `/project/.vscode/notelets${sep}some/note.md` } as Uri

      expect(isNoteFile(uri)).toBe(true)
    })

    it('returns false when uri path does not include notes folder', () => {
      vi.mocked(getConfig).mockReturnValue('.vscode/notelets')
      const uri = { path: '/project/src/file.ts' } as Uri

      expect(isNoteFile(uri)).toBe(false)
    })
  })

  describe('getNotesRoot', () => {
    it('joins workspace folder with normalized notes folder', () => {
      vi.mocked(getConfig).mockReturnValue('.vscode/notelets')
      const wf = {
        uri: {
          path: '/workspace',
          fsPath: '/workspace',
        },
      } as any

      const result = getNotesRoot(wf)

      expect(Uri.joinPath).toHaveBeenCalledWith(wf.uri, `.vscode/notelets${sep}`)
      expect(result.path).toBe(`/workspace/.vscode/notelets${sep}`)
    })
  })
})
