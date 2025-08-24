import type { Uri } from 'vscode'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workspace } from 'vscode'

import NotesProvider from '../src/notes-provider'

vi.mock('vscode', () => ({
  EventEmitter: vi.fn(() => {}),
  ThemeIcon: vi.fn(),
  TreeItemCollapsibleState: {
    None: 0,
  },
  workspace: {
    asRelativePath: vi.fn(),
    findFiles: vi.fn(),
    getConfiguration: vi.fn(() => ({
      get: vi.fn().mockReturnValue('.vscode/notelets'),
    })),
  },
  TreeItem: vi.fn(),
}))

vi.mock('../src/utils/debugger', () => ({
  logger: {
    info: vi.fn(),
  },
}))

describe('NotesProvider', () => {
  let provider: NotesProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new NotesProvider()
  })

  describe('refresh', () => {
    it('fires the onDidChangeTreeData event', () => {
      const mockFire = vi.fn()
      ;(provider as any)._onDidChangeTreeData = { fire: mockFire }

      provider.refresh()

      expect(mockFire).toHaveBeenCalledOnce()
    })
  })

  describe('getChildren', () => {
    it('returns empty array when no workspace folders', async () => {
      vi.mocked(workspace).workspaceFolders = undefined

      const result = await provider.getChildren()

      expect(result).toEqual([])
    })

    it('returns sorted note items when workspace folders exist', async () => {
      const mockUris = [
        { fsPath: '/workspace/.vscode/notelets/z-file.md' },
        { fsPath: '/workspace/.vscode/notelets/a-file.md' },
        { fsPath: '/workspace/.vscode/notelets/m-file.md' },
      ] as Uri[]

      vi.mocked(workspace).workspaceFolders = [{ uri: { fsPath: '/workspace' } }] as any
      vi.mocked(workspace.findFiles).mockResolvedValue(mockUris)
      vi.mocked(workspace.asRelativePath).mockImplementation(uri =>
        (uri as Uri).fsPath.replace('/workspace/', ''),
      )

      const result = await provider.getChildren()

      expect(workspace.findFiles).toHaveBeenCalledWith('**/.vscode/notelets/**/*.md')
      expect(result).toHaveLength(3)

      // Verify sorting by checking the order of fsPath values
      const sortedPaths = result.map((item: any) => item.uri.fsPath)

      expect(sortedPaths).toEqual([
        '/workspace/.vscode/notelets/a-file.md',
        '/workspace/.vscode/notelets/m-file.md',
        '/workspace/.vscode/notelets/z-file.md',
      ])
    })
  })

  describe('getTreeItem', () => {
    it('returns the same tree item passed to it', () => {
      const mockTreeItem = { label: 'test' }

      const result = provider.getTreeItem(mockTreeItem)

      expect(result).toBe(mockTreeItem)
    })
  })
})
