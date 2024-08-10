
import {
    type App, Modal, Setting
} from 'obsidian'

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
