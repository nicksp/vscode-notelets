import type { ExtensionContext } from 'vscode'

import { commands, languages, Uri, window, workspace } from 'vscode'

import packageJson from '../package.json'
import { createNotesWatcher, initStatusBar } from './features'
import NoteLensProvider from './note-lens-provider'
import NotesProvider from './notes-provider'
import { logger } from './utils/debugger'
import { getNoteUri, openOrCreateNote } from './utils/notes'

export function activate(context: ExtensionContext) {
  logger.info('🗒 Notelets extension starting...')
  logger.info(`Extension Name: ${packageJson.publisher}.${packageJson.name}`)
  logger.info(`Extension Version: ${packageJson.version}`)
  logger.info(`Workspace Configuration: ${JSON.stringify(workspace.getConfiguration(packageJson.name), null, 2)}`)

  const lensProvider = new NoteLensProvider()
  context.subscriptions.push(languages.registerCodeLensProvider({ scheme: 'file' }, lensProvider))

  context.subscriptions.push(commands.registerCommand('notelets.openNote', async (uri?: Uri) => {
    const docUri = uri ?? window.activeTextEditor?.document.uri
    if (docUri) {
      await openOrCreateNote(docUri)
    }
  }))

  const notesProvider = new NotesProvider()
  const notesTree = window.createTreeView('notelets.views.notes', { treeDataProvider: notesProvider })
  context.subscriptions.push(notesTree)

  context.subscriptions.push(window.onDidChangeActiveTextEditor(() => lensProvider.refresh()))

  const watchers = createNotesWatcher(() => {
    notesProvider.refresh()
    lensProvider.refresh()
  })
  context.subscriptions.push(...watchers)

  context.subscriptions.push(workspace.onDidRenameFiles(async e => {
    for (const f of e.files) {
      const oldNote = getNoteUri(f.oldUri)
      const newNote = getNoteUri(f.newUri)

      if (oldNote && newNote) {
        try {
          await workspace.fs.stat(oldNote)
          await workspace.fs.createDirectory(Uri.joinPath(newNote, '..'))
          await workspace.fs.rename(oldNote, newNote, { overwrite: true })
        } catch (err) {
          logger.error('Failed to move note on rename', err)
        }
      }
    }

    notesProvider.refresh()
    lensProvider.refresh()
  }))

  context.subscriptions.push(workspace.onDidDeleteFiles(async e => {
    for (const uri of e.files) {
      const note = getNoteUri(uri)
      if (!note) {
        continue
      }

      try {
        await workspace.fs.delete(note)
      } catch (err) {
        logger.error('Failed to delete note on source delete', err)
      }
    }

    notesProvider.refresh()
    lensProvider.refresh()
  }))

  initStatusBar(context)
}

export function deactivate() {
  logger.info('🗒 Notelets extension deactivated')
}
