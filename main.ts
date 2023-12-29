import * as fs from 'fs';
import { App, FileSystemAdapter, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';



interface SymlinkToggleSettings {
	symlinkTarget: string;
	symlinkPath: string;
}

const DEFAULT_SETTINGS: SymlinkToggleSettings = {
	symlinkTarget: '',
	symlinkPath: ''
}

export default class SymlinkToggle extends Plugin {
	settings: SymlinkToggleSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			this.toggleSymlink(
				this.settings.symlinkTarget,
				this.settings.symlinkPath
			);

		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async toggleSymlink(target: string, pathForSymlink: string) {
		let adapter = this.app.vault.adapter;
		let absPathForSymlink = '';
		if (adapter instanceof FileSystemAdapter) {
			absPathForSymlink = adapter.getBasePath() + '/' + pathForSymlink;
		} else {
			new Notice('Symlink toggle error: adapter not FileSystemAdapter');
			return;
		}

		try {
			const result = await checkFile(absPathForSymlink);
			if (result) {
				// delete the symlink
				fs.unlink(absPathForSymlink, (err) => {
					if (err) {
						throw err;
					}
					new Notice('Symlink deleted');
				});
			} else {
				// create the symlink
				fs.symlink(target, absPathForSymlink, (err) => {
					if (err) {
						throw err;
					}
					new Notice('Symlink created: ' + absPathForSymlink + ' -> ' + target);
				});
			}
		} catch (err) {
			new Notice('Symlink toggle error: ' + err);
		}
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: SymlinkToggle;

	constructor(app: App, plugin: SymlinkToggle) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Symlink target')
			.setDesc('The path (directory) to be symlinked')
			.addText(text => text
				.setPlaceholder('...')
				.setValue(this.plugin.settings.symlinkTarget)
				.onChange(async (value) => {
					this.plugin.settings.symlinkTarget = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Symlink path')
			.setDesc('The location to create the symlink within the vault')
			.addText(text => text
				.setPlaceholder('...')
				.setValue(this.plugin.settings.symlinkPath)
				.onChange(async (value) => {
					this.plugin.settings.symlinkPath = value;
					await this.plugin.saveSettings();
				}));
	}
}


function checkFile(path: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		fs.lstat(path, (err, stats) => {
			if (err) {
				if (err.code === 'ENOENT') {
					resolve(false);
				} else {
					reject('Error: ' + err.message);
				}
				return;
			}

			resolve(true)
		});
	});
}
