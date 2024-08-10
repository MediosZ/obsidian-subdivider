
import {
    type App, TFile, normalizePath
} from 'obsidian'
import { type Root, type PhrasingContent, List } from 'mdast'
import SubdividerPlugin from './main'
import { fromMd, toMd } from "./parser"
import { FilenameModal, OverrideModal } from "./modal"


interface Document {
    title: string
    root: Root
}

function getTitleOfDocument(nodes: PhrasingContent[]): string {
    return toMd({
        type: 'root',
        children: [
            {
                type: 'heading',
                depth: 1,
                children: nodes
            }
        ]
    }).slice(2).trim()
}

function processContent(content: string, rootName: string, index: boolean): Document[] {
    const tree = fromMd(content)
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

async function createOrModifyFile(app: App, rootPath: string | undefined, title: string, content: string, autoOverride: boolean): Promise<void> {
    const file = app.vault.getAbstractFileByPath(normalizePath(`${rootPath}/${title}.md`))
    if (file) {
        if (autoOverride || await new OverrideModal(app, `${rootPath}/${title}.md`, false).myOpen()) {
            if (file instanceof TFile) {
                await app.vault.modify(file, content)
            }
        }
    }
    else {
        await app.vault.create(normalizePath(`${rootPath}/${title}.md`), content)
    }
}

async function subdivide(app: App, rootPath: string, documents: Document[], autoOverride: boolean): Promise<void> {
    if (app.vault.getAbstractFileByPath(normalizePath(rootPath))) {
        if (autoOverride || await new OverrideModal(app, rootPath, true).myOpen()) {
            for (const doc of documents) {
                const file = app.vault.getAbstractFileByPath(normalizePath(`${rootPath}/${doc.title}.md`))
                if (file) {
                    if (file instanceof TFile) {
                        await app.vault.modify(file, toMd(doc.root))
                    }
                }
                else {
                    await app.vault.create(normalizePath(`${rootPath}/${doc.title}.md`), toMd(doc.root))
                }
            }
        }
    }
    else {
        await app.vault.createFolder(normalizePath(rootPath))
        for (const doc of documents) {
            await app.vault.create(normalizePath(`${rootPath}/${doc.title}.md`), toMd(doc.root))
        }
    }
}

async function handle_file(plugin: SubdividerPlugin, file: TFile, depth: number, deleteOrigFile: boolean, autoOverride: boolean) {
    const fileContent = await plugin.app.vault.cachedRead(file)
    const documents = processContent(fileContent, file.basename, plugin.settings.index)
    const rootPath = `${file.parent?.path}/${file.basename}`
    await subdivide(plugin.app, rootPath, documents, autoOverride)
    if (deleteOrigFile) {
        await plugin.app.vault.delete(file)
    }
    if (plugin.settings.recursive && depth < plugin.settings.recursionDepth) {
        const folder = plugin.app.vault.getFolderByPath(normalizePath(rootPath));
        const children = [];
        for (const f of folder?.children ?? []) {
            if (f instanceof TFile && f.basename !== file.basename) {
                children.push(f);
            }
        }
        for (const f of children) {
            await handle_file(plugin, f, depth + 1, true, true)
        }
    }
}


async function handle_selection(plugin: SubdividerPlugin, selectedText: string) {
    const title = await new FilenameModal(plugin.app).myOpen() as string
    const rootPath = plugin.app.workspace.activeEditor?.file?.parent?.path
    await createOrModifyFile(plugin.app, rootPath, title, selectedText, false)
    if (plugin.settings.delete) {
        plugin.app.workspace.activeEditor?.editor?.replaceSelection("")
    }
    handle_file(plugin, plugin.app.vault.getAbstractFileByPath(normalizePath(`${rootPath}/${title}.md`)) as TFile, 1, true, false)
}

export { handle_selection, handle_file }