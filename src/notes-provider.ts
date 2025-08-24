import type { TreeDataProvider, Uri } from 'vscode'

import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState, workspace } from 'vscode'

import { getConfig } from './utils/configuration'
import { normalizePathForGlob } from './utils/notes'

class NoteItem extends TreeItem {
  constructor(public readonly uri: Uri) {
    super(workspace.asRelativePath(uri, false))

    this.command = { command: 'vscode.open', title: 'Open Note', arguments: [uri] }
    this.resourceUri = uri
    this.iconPath = new ThemeIcon('note')
    this.collapsibleState = TreeItemCollapsibleState.None
  }
}

export default class NotesProvider implements TreeDataProvider<TreeItem> {
  private readonly _onDidChangeTreeData = new EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event
  refresh() {
    this._onDidChangeTreeData.fire()
  }

  async getChildren(): Promise<TreeItem[]> {
    if (!workspace.workspaceFolders) {
      return []
    }

    const folder = getConfig('notesFolder')
    const normalizedFolder = normalizePathForGlob(folder)
    const notes = await workspace.findFiles(`**/${normalizedFolder}**/*.md`)
    notes.sort((a, b) => a.fsPath.localeCompare(b.fsPath))
    return notes.map(u => new NoteItem(u))
  }

  getTreeItem(el: TreeItem) {
    return el
  }
}
