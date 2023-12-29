import * as fs from 'fs';
import { App, Editor, FileSystemAdapter, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';



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

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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
			.setDesc('The location to create the symlink')
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
