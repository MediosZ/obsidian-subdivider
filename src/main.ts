import {
  type App, Modal, Plugin, PluginSettingTab, Setting, type MenuItem, TFile, normalizePath,
} from 'obsidian'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { type Root, type PhrasingContent, List } from 'mdast'
import { Heading, Strong } from 'mdast-util-from-markdown/lib'
import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'
interface SubdividerSettings {
  recursive: boolean
  recursionDepth: number
  delete: boolean
  index: boolean
}

const DEFAULT_SETTINGS: SubdividerSettings = {
  recursive: true,
  recursionDepth: 1,
  delete: false,
  index: true
}

const FromMarkdownExt = {
  extensions: [frontmatter(['yaml', 'toml']), gfm()],
  mdastExtensions: [frontmatterFromMarkdown(['yaml', 'toml']), gfmFromMarkdown()]
}

const ToMarkdownExt = { extensions: [frontmatterToMarkdown(['yaml', 'toml']), gfmToMarkdown()] }

interface Document {
  title: string
  root: Root
}

function getTitleOfDocument(nodes: PhrasingContent[]): string {
  let subStrings: string[] = []
  function getStr(node: PhrasingContent, acc: string[]) {
    if (node.type === 'text') {
      acc.push(node.value)
    }
    else {
      if (node.hasOwnProperty('children')) {
        for (const child of (node as Strong).children) {
          getStr(child, acc)
        }
      }
      return
    }
  }
  for (const node of nodes) {
    getStr(node, subStrings)
  }
  return subStrings.join('')

}

async function processContentFromSelection(content: string): Promise<Document> {
  const tree = fromMarkdown(content, FromMarkdownExt)
  const doc: Document = {
    title: "",
    root: {
      type: "root",
      children: []
    }
  }
  if (tree.children.at(0)?.type !== "heading" || (tree.children.at(0) as Heading)?.depth !== 1) {
    // ask for a filename
    doc.title = await new FilenameModal(this.app).myOpen() as string
    for (const obj of tree.children) {
      if (obj.type === 'heading') {
        obj.depth -= 1
      }
      doc.root.children.push(obj)
    }
  }
  else {
    doc.title = getTitleOfDocument((tree.children.at(0) as Heading)?.children)
    for (const obj of tree.children.slice(1)) {
      if (obj.type === 'heading') {
        obj.depth -= 1
      }
      doc.root.children.push(obj)
    }
  }

  return doc
}

async function createOrModifyFile(app: App, rootPath: string | undefined, doc: Document, autoOverride: boolean): Promise<void> {
  const file = app.vault.getAbstractFileByPath(normalizePath(`${rootPath}/${doc.title}.md`))
  console.log(file, rootPath, doc.title, normalizePath(`${rootPath}/${doc.title}.md`))
  if (file) {
    if (autoOverride || await new OverrideModal(this.app, `${rootPath}/${doc.title}.md`, false).myOpen()) {
      if (file instanceof TFile) {
        await app.vault.modify(file, toMarkdown(doc.root, ToMarkdownExt))
      }
    }
  }
  else {
    await app.vault.create(normalizePath(`${rootPath}/${doc.title}.md`), toMarkdown(doc.root, ToMarkdownExt))
  }
}

function processContent(content: string, rootName: string, index: boolean): Document[] {
  const tree = fromMarkdown(content, FromMarkdownExt)
  const documents: Document[] = []
  // Empty
  if (tree.children.length === 0) {
    return documents
  }

  const firstHeading = tree.children.findIndex((value) => value.type === "heading" && value.depth === 1)
  const hasHeadings = tree.children.filter((value) => value.type === "heading").length > 0
  if (index || firstHeading !== 0) {
    const node: Document = {
      title: rootName,
      root: {
        type: 'root',
        children: [
          ...tree.children.slice(0, firstHeading),
        ]
      }
    };
    if (index && hasHeadings) {
      node.root.children.push(
        { type: "heading", depth: 1, children: [{ type: "text", value: "TOC" }] },
        { type: "list", ordered: true, start: 1, spread: false, children: [] }
      )
    }
    documents.push(node)
  }

  for (const obj of tree.children.slice(firstHeading)) {
    if (obj.type === 'heading' && obj.depth === 1) {
      const title = getTitleOfDocument(obj.children)
      const doc: Document = {
        title: title,
        root: {
          type: 'root',
          children: []
        }
      }
      documents.push(doc)
      if (index && hasHeadings) {
        (documents.at(0)?.root.children.last() as List).children.push({
          type: "listItem",
          spread: false,
          children: [{
            type: "paragraph",
            children: [{
              type: "link",
              children: [
                { type: "text", value: title }
              ],
              url: normalizePath(title)
            }]
          }]
        })
      }
    } else {
      if (obj.type === 'heading') {
        obj.depth -= 1
      }
      documents.at(-1)?.root.children.push(obj)
    }
  }
  return documents
}

async function subdivide(app: App, rootPath: string, documents: Document[], autoOverride: boolean): Promise<void> {
  if (app.vault.getAbstractFileByPath(normalizePath(rootPath))) {
    if (autoOverride || await new OverrideModal(this.app, rootPath, true).myOpen()) {
      for (const doc of documents) {
        const file = app.vault.getAbstractFileByPath(normalizePath(`${rootPath}/${doc.title}.md`))
        if (file) {
          if (file instanceof TFile) {
            await app.vault.modify(file, toMarkdown(doc.root, ToMarkdownExt))
          }
        }
        else {
          await app.vault.create(normalizePath(`${rootPath}/${doc.title}.md`), toMarkdown(doc.root, ToMarkdownExt))
        }
      }
    }
  }
  else {
    await app.vault.createFolder(normalizePath(rootPath))
    for (const doc of documents) {
      await app.vault.create(normalizePath(`${rootPath}/${doc.title}.md`), toMarkdown(doc.root, ToMarkdownExt))
    }
  }
}

async function subdivideFile(plugin: SubdividerPlugin, file: TFile, depth: number, deleteOrigFile: boolean, autoOverride: boolean) {
  const fileContent = await plugin.app.vault.cachedRead(file)
  const documents = processContent(fileContent, file.basename, plugin.settings.index)
  const rootPath = `${file.parent?.path}/${file.basename}`
  await subdivide(plugin.app, rootPath, documents, autoOverride)
  if (deleteOrigFile) {
    await plugin.app.vault.delete(file)
  }
  if (plugin.settings.recursive && depth < plugin.settings.recursionDepth) {
    const folder = plugin.app.vault.getFolderByPath(normalizePath(rootPath));
    let children = [];
    for (let f of folder?.children ?? []) {
      if (f instanceof TFile && f.basename !== file.basename) {
        children.push(f);
      }
    }
    for (let f of children) {
      await subdivideFile(plugin, f, depth + 1, true, true)
    }
  }
}

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
                const doc = await processContentFromSelection(selectedText)
                const rootPath = this.app.workspace.activeEditor?.file?.parent?.path
                await createOrModifyFile(this.app, rootPath, doc, false)
                if (this.settings.delete) {
                  this.app.workspace.activeEditor?.editor?.replaceSelection("")
                }
                if (this.settings.recursive && this.settings.recursionDepth > 1) {
                  const targetFile = this.app.vault.getAbstractFileByPath(normalizePath(`${rootPath}/${doc.title}.md`))
                  if (targetFile && targetFile instanceof TFile) {
                    await subdivideFile(this, targetFile, 2, true, false)
                  }
                }
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
            await subdivideFile(this, file, 1, this.settings.delete, false)
          })
        }
        menu.addItem(addIconMenuItem)
      }
      ))

    this.addSettingTab(new SubdividerSettingTab(this.app, this))

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
    //   console.log('click', evt)
    // })

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    // this.registerInterval(window.setInterval(() => { console.log('setInterval') }, 5 * 60 * 1000))
  }

  async onunload(): Promise<void> { }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
  }
}

export class FilenameModal extends Modal {

  constructor(app: App,) {
    super(app)
  }
  private filename: string
  resolve: ((value: string | PromiseLike<string>) => void) | null = null
  myOpen() {
    this.open()
    return new Promise((resolve) => {
      this.resolve = resolve
    })
  }

  onOpen() {
    const { contentEl, titleEl } = this
    titleEl.setText("Pick a name:")
    new Setting(contentEl)
      .setName("Name")
      .addText((text) =>
        text.onChange((value) => {
          this.filename = value
        }))

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Confirm")
          .setCta()
          .onClick(() => {
            if (this.resolve) this.resolve(this.filename)
            this.close()
          }))
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}

export class OverrideModal extends Modal {
  constructor(
    app: App,
    private readonly name: string,
    private readonly isFolder: boolean
  ) {
    super(app)
  }
  resolve: ((value: boolean | PromiseLike<boolean>) => void) | null = null
  myOpen() {
    this.open()
    return new Promise((resolve) => {
      this.resolve = resolve
    })
  }
  onOpen() {
    const { contentEl, titleEl } = this
    if (this.isFolder) {
      titleEl.setText("Override folder")
      contentEl
        .createEl("p")
        .setText(
          `The folder ${this.name} already exists. Do you want to override it?`
        )
    }
    else {
      titleEl.setText("Override file")
      contentEl
        .createEl("p")
        .setText(
          `The file ${this.name} already exists. Do you want to override it?`
        )

    }

    const div = contentEl.createDiv({ cls: "modal-button-container" })
    const discard = div.createEl("button", {
      cls: "mod-warning",
      text: "Override",
    })
    discard.addEventListener("click", async () => {
      if (this.resolve) this.resolve(true)
      this.close()
    })
    discard.addEventListener("keypress", async () => {
      if (this.resolve) this.resolve(true)
      this.close()
    })

    const close = div.createEl("button", {
      text: "Cancel",
    })
    close.addEventListener("click", () => {
      if (this.resolve) this.resolve(false)
      return this.close()
    })
    close.addEventListener("keypress", () => {
      if (this.resolve) this.resolve(false)
      return this.close()
    })
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}

class SubdividerSettingTab extends PluginSettingTab {
  plugin: SubdividerPlugin

  constructor(app: App, plugin: SubdividerPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    new Setting(containerEl)
      .setName('Recursive')
      .setDesc('Turn all subheadings to folders recursively.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.recursive)
        .onChange(async value => {
          this.plugin.settings.recursive = value
          await this.plugin.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName("Recursion Depth")
      .setDesc("XXX")
      .addText(text => text
        .setValue(this.plugin.settings.recursionDepth.toString())
        .onChange(async value => {
          this.plugin.settings.recursionDepth = Number(value)
          await this.plugin.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName('Delete original file or selection')
      .setDesc('Delete original file or selection after subdivision.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.delete)
        .onChange(async value => {
          this.plugin.settings.delete = value
          await this.plugin.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName('Create index file for folders')
      .setDesc('Create index file for folders after subdivision.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.index)
        .onChange(async value => {
          this.plugin.settings.index = value
          await this.plugin.saveSettings()
        })
      )
  }
}
