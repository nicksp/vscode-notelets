import type { ExtensionContext, FileSystemWatcher } from 'vscode'

import { RelativePattern, StatusBarAlignment, window, workspace } from 'vscode'

import { getConfig } from './utils/configuration'
import { logger } from './utils/debugger'
import { getNoteUri, isMarkdownFile, isNoteFile, normalizePath } from './utils/notes'

export function createNotesWatcher(onChange: () => void): FileSystemWatcher[] {
  const watchers: FileSystemWatcher[] = []

  if (!workspace.workspaceFolders) {
    return watchers
  }

  const folder = getConfig('notesFolder')
  const normalizedFolder = normalizePath(folder)

  for (const wf of workspace.workspaceFolders) {
    const pattern = new RelativePattern(wf, `**/${normalizedFolder}**/*.md`)
    const w = workspace.createFileSystemWatcher(pattern)

    w.onDidChange(onChange)
    w.onDidCreate(onChange)
    w.onDidDelete(onChange)

    watchers.push(w)
  }

  return watchers
}

export function initStatusBar(context: ExtensionContext) {
  const statusBar = window.createStatusBarItem(StatusBarAlignment.Right, 100)
  context.subscriptions.push(statusBar)

  const update = async () => {
    if (!getConfig('showStatusBar')) {
      statusBar.hide()
      return
    }

    const editor = window.activeTextEditor
    if (!editor) {
      statusBar.hide()
      return
    }

    if (isNoteFile(editor.document.uri) || isMarkdownFile(editor.document.uri)) {
      statusBar.hide()
      return
    }

    const noteUri = getNoteUri(editor.document.uri)
    if (!noteUri) {
      statusBar.hide()
      return
    }

    try {
      await workspace.fs.stat(noteUri)
      const relativePath = workspace.asRelativePath(editor.document.uri, false)
      statusBar.text = '$(note) Notelet'
      statusBar.command = 'notelets.openNote'
      statusBar.tooltip = relativePath ? `Open Notelet: ${relativePath}` : 'Open Notelet'
      statusBar.show()
    } catch (err) {
      logger.error('Failed to verify note existence', err)
      statusBar.hide()
    }
  }

  context.subscriptions.push(window.onDidChangeActiveTextEditor(update))
  context.subscriptions.push(workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('notelets.showStatusBar')
      || e.affectsConfiguration('notelets.notesFolder')) {
      update()
    }
  }))

  update()
}
