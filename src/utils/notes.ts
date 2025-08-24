import type { WorkspaceFolder } from 'vscode'

import { normalize, sep } from 'node:path'

import { commands, Uri, ViewColumn, window, workspace } from 'vscode'

import { getConfig } from './configuration'
import { logger } from './debugger'

export function normalizePath(path: string): string {
  const normalized = normalize(path)
  return normalized.endsWith(sep) ? normalized : `${normalized}${sep}`
}

export function isNoteFile(uri: Uri): boolean {
  const folder = getConfig('notesFolder')
  const workspaceFolders = workspace.workspaceFolders ?? []

  for (const wf of workspaceFolders) {
    const notesRoot = Uri.joinPath(wf.uri, normalizePath(folder))
    const rootPath = notesRoot.path.endsWith('/') ? notesRoot.path : `${notesRoot.path}/`
    if (uri.path.startsWith(rootPath)) {
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
