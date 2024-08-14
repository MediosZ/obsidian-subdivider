import {
    type App, PluginSettingTab, Setting
} from 'obsidian'
import SubdividerPlugin from './main'


interface SubdividerSettings {
    recursive: boolean
    recursionDepth: number
    delete: boolean
    index: boolean
    compact: boolean
}

const DEFAULT_SETTINGS: SubdividerSettings = {
    recursive: true,
    recursionDepth: 1,
    delete: false,
    index: true,
    compact: false
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
            .setDesc("The maximum depth of recursion.")
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

        new Setting(containerEl)
            .setName('Maintain original line breaks')
            .setDesc('If enabled, no new line breaks will be added between blocks.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.compact)
                .onChange(async value => {
                    this.plugin.settings.compact = value
                    await this.plugin.saveSettings()
                })
            )
    }
}


export { SubdividerSettingTab, DEFAULT_SETTINGS, type SubdividerSettings }