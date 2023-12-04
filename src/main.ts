import {
  type App, Modal, Plugin, PluginSettingTab, Setting, type MenuItem, TFile, normalizePath,
} from 'obsidian'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { type Root, type PhrasingContent, List } from 'mdast'
import { Heading } from 'mdast-util-from-markdown/lib';

interface SubdividerSettings {
  recursive: boolean;
  deleteFile: boolean
}

const DEFAULT_SETTINGS: SubdividerSettings = {
  recursive: false,
  deleteFile: false
}

interface Document {
  title: string
  root: Root
}

function getTitleOfDocument(nodes: PhrasingContent[]): string {
  return toMarkdown({
    type: 'root',
    children: [
      {
        type: 'heading',
        depth: 1,
        children: nodes
      }
    ]
  })
    .slice(2)
    .trim()
}

async function processContentFromSelection(content: string): Promise<Document> {
  const tree = fromMarkdown(content)
  const doc: Document = {
    title: "",
    root: {
      type: "root",
      children: []
    }
  }
  if (tree.children.at(0)?.type !== "heading" || (tree.children.at(0) as Heading)?.depth !== 1) {
    // ask for a filename
    doc.title = await new FilenameModal(this.app).myOpen();
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

async function subdivideFile(app: App, doc: Document, recursive: boolean): Promise<void> {
  const file = app.vault.getAbstractFileByPath(normalizePath(`${doc.title}.md`))
  if (file && await new OverrideModal(this.app, `${doc.title}.md`).myOpen()) {
    await app.vault.modify(file as TFile, toMarkdown(doc.root))
  }
  else {
    await app.vault.create(normalizePath(`${doc.title}.md`), toMarkdown(doc.root))
  }
}

function processContent(content: string, rootName: string,): Document[] {
  const tree = fromMarkdown(content)
  const documents: Document[] = [
    {
      title: rootName,
      root: {
        type: 'root',
        children: [
          { type: "heading", depth: 1, children: [{ type: "text", value: "TOC" }] },
          { type: "list", ordered: true, start: 1, spread: false, children: [] }
        ]
      }
    }
  ]
  for (const obj of tree.children) {
    if (obj.type === 'heading' && obj.depth === 1) {
      const title = getTitleOfDocument(obj.children)
      const doc: Document = {
        title: title,
        root: {
          type: 'root',
          children: []
        }
      }
      documents.push(doc);
      (documents.at(0)?.root.children[1] as List).children.push({
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
    } else {
      if (obj.type === 'heading') {
        obj.depth -= 1
      }
      documents.at(-1)?.root.children.push(obj)
    }
  }
  return documents
}

async function subdivide(app: App, rootName: string, documents: Document[], recursive: boolean): Promise<void> {
  if (app.vault.getAbstractFileByPath(normalizePath(rootName))
    && await new OverrideModal(this.app, rootName).myOpen()) {
    for (const doc of documents) {
      const file = app.vault.getAbstractFileByPath(normalizePath(`${rootName}/${doc.title}.md`))
      if (file) {
        await app.vault.modify(file as TFile, toMarkdown(doc.root))
      }
      else {
        await app.vault.create(normalizePath(`${rootName}/${doc.title}.md`), toMarkdown(doc.root))
      }
    }
  }
  else {
    await app.vault.createFolder(normalizePath(rootName))
    for (const doc of documents) {
      await app.vault.create(normalizePath(`${rootName}/${doc.title}.md`), toMarkdown(doc.root))
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
                await subdivideFile(this.app, doc, this.settings.recursive)
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
            const fileContent = await this.app.vault.cachedRead(file)
            const documents = processContent(fileContent, file.basename)
            await subdivide(this.app, file.basename, documents, this.settings.recursive)
          })
        }
        menu.addItem(addIconMenuItem)
      }
      ))

    this.addSettingTab(new SubdividerSettingTab(this.app, this))

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
      console.log('click', evt)
    })

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => { console.log('setInterval') }, 5 * 60 * 1000))
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
    super(app);
  }
  private filename: string
  resolve: ((value: string | PromiseLike<string>) => void) | null = null;
  myOpen() {
    this.open();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText("Pick a name:");
    new Setting(contentEl)
      .setName("Name")
      .addText((text) =>
        text.onChange((value) => {
          this.filename = value
        }));

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Confirm")
          .setCta()
          .onClick(() => {
            if (this.resolve) this.resolve(this.filename);
            this.close();
          }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export class OverrideModal extends Modal {
  constructor(
    app: App,
    private readonly name: string
  ) {
    super(app);
  }
  resolve: ((value: boolean | PromiseLike<boolean>) => void) | null = null;
  myOpen() {
    this.open();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
  onOpen() {
    const { contentEl, titleEl } = this;
    titleEl.setText("Override folder");
    contentEl
      .createEl("p")
      .setText(
        `The ${this.name} already exists. Do you want to override it?`
      );

    const div = contentEl.createDiv({ cls: "modal-button-container" });
    const discard = div.createEl("button", {
      cls: "mod-warning",
      text: "Override",
    });
    discard.addEventListener("click", async () => {
      if (this.resolve) this.resolve(true);
      this.close();
    });
    discard.addEventListener("keypress", async () => {
      if (this.resolve) this.resolve(true);
      this.close();
    });

    const close = div.createEl("button", {
      text: "Cancel",
    });
    close.addEventListener("click", () => {
      if (this.resolve) this.resolve(false);
      return this.close();
    });
    close.addEventListener("keypress", () => {
      if (this.resolve) this.resolve(false);
      return this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
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
      .addToggle(toggle => toggle.onChange(value =>
        this.plugin.settings.recursive = value
      ))

    new Setting(containerEl)
      .setName('Delete original file')
      .setDesc('Delete original file after subdivision.')
      .addToggle(toggle => toggle.onChange(value =>
        this.plugin.settings.recursive = value
      ))
  }
}
