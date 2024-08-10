import { Plugin, type MenuItem, TFile } from 'obsidian'
import { SubdividerSettingTab, DEFAULT_SETTINGS, SubdividerSettings } from './settings'
import { handle_selection, handle_file } from './handles'

export default class SubdividerPlugin extends Plugin {
  settings: SubdividerSettings

  async onload(): Promise<void> {
    await this.loadSettings()

    // register text event
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu) => {
        menu.addSeparator()
        menu.addItem(item => {
          item
            .setTitle("Subdivide the selection")
            .setIcon("blocks")
            .onClick(async () => {
              const selectedText = this.app.workspace.activeEditor?.editor?.getSelection()
              if (selectedText) {
                await handle_selection(this, selectedText)
              }
            })
        })
      }))

    // register file event
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file: TFile) => {
        const addIconMenuItem = (item: MenuItem): void => {
          item.setTitle('Subdivide the file')
          item.onClick(async () => {
            await handle_file(this, file, 1, this.settings.delete, false)
          })
        }
        menu.addItem(addIconMenuItem)
      }
      ))

    this.addSettingTab(new SubdividerSettingTab(this.app, this))
  }

  async onunload(): Promise<void> { }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
  }
}

