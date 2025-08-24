import type { CodeLensProvider, TextDocument } from 'vscode'

import { CodeLens, EventEmitter, Range, workspace } from 'vscode'

import { logger } from './utils/debugger'
import { getNoteUri, isMarkdownFile, isNoteFile } from './utils/notes'

export default class NoteLensProvider implements CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new EventEmitter<void>()
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event
  refresh() {
    this._onDidChangeCodeLenses.fire()
  }

  async provideCodeLenses(doc: TextDocument): Promise<CodeLens[]> {
    if (isNoteFile(doc.uri) || isMarkdownFile(doc.uri)) {
      return []
    }

    const noteUri = getNoteUri(doc.uri)
    if (!noteUri) {
      return []
    }

    let noteExists = false
    try {
      await workspace.fs.stat(noteUri)
      noteExists = true
    } catch (err) {
      logger.error('Failed to verify note existence', err)
    }

    const title = noteExists ? 'Open Note' : 'Add Note'

    return [new CodeLens(new Range(0, 0, 0, 0), {
      title,
      command: 'notelets.openNote',
      arguments: [doc.uri],
    })]
  }
}
