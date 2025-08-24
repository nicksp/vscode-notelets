import type { WorkspaceFolder } from 'vscode'

import { sep } from 'node:path'

import { commands, Uri, ViewColumn, window, workspace } from 'vscode'

import { getConfig } from './configuration'
import { logger } from './debugger'

export function normalizePath(path: string): string {
  let normalized = path.replace(/\\/g, '/')
  if (normalized.endsWith('/') || normalized.endsWith('\\')) {
    normalized = normalized.slice(0, -1)
  }
  return `${normalized}${sep}`
}

export function normalizePathForGlob(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

export function isNoteFile(uri: Uri): boolean {
  const folder = getConfig('notesFolder')
  const workspaceFolders = workspace.workspaceFolders ?? []

  const uriPath = uri.path.replace(/\\/g, '/')
  const posixFolder = folder.replace(/\\/g, '/')
  const posixFolderWithSlash = posixFolder.endsWith('/') ? posixFolder : `${posixFolder}/`

  for (const wf of workspaceFolders) {
    const wfPath = wf.uri.path.replace(/\\/g, '/').replace(/\/+$/, '')
    const rootPath = `${wfPath}/${posixFolderWithSlash}`
    if (uriPath.startsWith(rootPath)) {
      return true
    }
  }

  return false
}

export function isMarkdownFile(uri: Uri): boolean {
  return uri.path.endsWith('.md')
}

export function getNotesRoot(wf: WorkspaceFolder): Uri {
  const folder = getConfig('notesFolder')
  return Uri.joinPath(wf.uri, normalizePath(folder))
}

export function getNoteUri(docUri: Uri): Uri | undefined {
  if (isNoteFile(docUri) || isMarkdownFile(docUri)) {
    return
  }

  const wf = workspace.getWorkspaceFolder(docUri)
  if (!wf) {
    return
  }

  const rel = workspace.asRelativePath(docUri, false)
  if (!rel || docUri.scheme !== 'file') {
    return
  }

  return Uri.joinPath(getNotesRoot(wf), `${rel}.md`)
}

export async function openOrCreateNote(docUri: Uri) {
  const noteUri = getNoteUri(docUri)
  if (!noteUri) {
    return
  }

  try {
    await workspace.fs.stat(noteUri)
  } catch {
    try {
      await workspace.fs.createDirectory(Uri.joinPath(noteUri, '..'))
      const tpl = new TextEncoder().encode()
      await workspace.fs.writeFile(noteUri, tpl)
    } catch (err) {
      logger.error('Failed to create note file', err)
      window.showErrorMessage(`Failed to create a note: ${err instanceof Error ? err.message : 'Unknown error'}`)
      return
    }
  }

  const behavior = getConfig('openBehavior')
  if (behavior === 'markdownPreview') {
    await commands.executeCommand('markdown.showPreviewToSide', noteUri)
  } else {
    await window.showTextDocument(noteUri, { viewColumn: ViewColumn.Beside, preview: false })
  }
}
