import { TFolder, App, Modal, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, ViewStateResult } from 'obsidian';
import * as path from 'path'
import { Kanbn } from '@basementuniverse/kanbn/src/main'
import { Root, createRoot  } from 'react-dom/client'
import { StrictMode } from 'react'
import Board from './src/Board'
// import { KanbnBoardPanel } from './ext-src/KanbnBoardPanel'


class KanbnTuple {
  kanbn: Kanbn
  // kanbnBoardPanel: KanbnBoardPanel
  // kanbnBurnDownPanel: KanbnBurndownPanel
  constructor (boardLocation: string) {
    // if (vscode.workspace.workspaceFolders == null) {
    //   throw new Error('A workspace folder should be open when creating Kanbn board panels')
    // }
    this.kanbn = new Kanbn(boardLocation)
    // this.kanbnBurnDownPanel = KanbnBurndownPanel.create(
    //   context.extensionPath,
    //   vscode.workspace.workspaceFolders[0].uri.fsPath,
    //   this.kanbn,
    //   boardLocation)
    // this.kanbnBoardPanel = new KanbnBoardPanel(
    //   context.extensionPath,
    //   vscode.workspace.workspaceFolders[0].uri.fsPath,
    //   this.kanbn,
    //   boardLocation,
    //   this.kanbnBurnDownPanel)
  }
}

interface KanbnPluginSettings {
  customBoardLocations: string[];
}

const DEFAULT_SETTINGS: KanbnPluginSettings = {
  customBoardLocations: []
}

export default class KanbnPlugin extends Plugin {
  settings: KanbnPluginSettings;
  boardCache: Map<string, KanbnTuple> = new Map<string, KanbnTuple>()
  directoryExists(directoryPath: string) {
    // Get the file or directory at the specified path
    const fileOrDirectory = this.app.vault.getAbstractFileByPath(directoryPath);
    console.log(`fileOrDirectory: ${fileOrDirectory}`)
    // Check if the item exists and is a directory
    return fileOrDirectory !== null && fileOrDirectory instanceof TFolder
  }

  async getSubdirectories(directoryPath: string): Promise<string[]> {
    try {
      // Read the contents of the directory
      const items = await this.app.vault.adapter.list(directoryPath);

      // Filter out files, keeping only directories
      const subdirectories = items.folders
      console.log(`here are the subdirectories: ${subdirectories}`)
      return subdirectories;
    } catch (error) {
      console.error("Error retrieving subdirectories:", error);
      return [];
    }
  }

  async populateBoardCache (): Promise<void> {
    const boardLocations = new Set<string>()
    // const rootVaultPath = (this.app.vault.adapter as any).basePath
    // Get globally accessible board locations.
    this.settings.customBoardLocations.forEach(boardLocation => {
      boardLocations.add(path.resolve(boardLocation))
    });
    // console.log(`checking for directory /.kanbn_boards`)
    // if (this.directoryExists(`/.kanbn_boards`)) {
    //   (await this.getSubdirectories('/.kanbn_boards')).forEach(boardLocation => {
    //     if (this.directoryExists(`/.kanbn_boards/${boardLocation}/.kanbn`)) {
    //       console.log(`Found board location /.kanbn_boards/${boardLocation}/.kanbn 2`)
    //       console.log(`resolved: ${path.resolve(`${rootVaultPath}/.kanbn_boards/${boardLocation}/.kanbn`)}`)
    //       boardLocations.add(path.resolve(`${rootVaultPath}/.kanbn_boards/${boardLocation}/.kanbn`))
    //     }
    //   })
    // }
    // console.log(`checking for directory /.kanbn`)
    // if (this.directoryExists(`/.kanbn`)) {
    //   console.log(`Found board location /.kanbn 3`)
    //   console.log(`resolved: ${path.resolve(`/.kanbn`)}`)
    //   boardLocations.add(path.resolve(`${rootVaultPath}/.kanbn`))
    // }
    for (const boardLocation of boardLocations) {
      console.log(`Adding board location ${boardLocation}`)
      const kanbnTuple = new KanbnTuple(boardLocation)
      this.boardCache.set(boardLocation, kanbnTuple)

      // Initialise file watcher
      // const fileWatcher = vscode.workspace.createFileSystemWatcher(
      //   new vscode.RelativePattern(vscode.Uri.file(`${boardLocation}/.kanbn`), '**')
      // )

      // fileWatcher.onDidChange(() => {
      // void kanbnStatusBarItem.update(kanbnTuple.kanbn)
      // void kanbnTuple.kanbnBoardPanel.update()
      // void kanbnTuple.kanbnBurnDownPanel.update()
      // })
    }
  }

  async onload() {
    await this.loadSettings();
    await this.populateBoardCache();
    // I need to iterate over .kanbn, .kanbn_boards, and custom locations that will be stored in settings

    // This creates an icon in the left ribbon.
    // const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
    //   // Called when the user clicks the icon.
    //   new Notice('This is a notice!');
    //   });
    // Perform additional things with the ribbon
    // ribbonIconEl.addClass('my-plugin-ribbon-class');

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    // const statusBarItemEl = this.addStatusBarItem();
    // statusBarItemEl.setText('Status Bar Text');

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-board',
      name: 'Open Kanbn Board',
      callback: () => {
        new OpenBoardModal(this.app, this.boardCache).open();
      }
    });
    this.registerView('kanbn-board-view', (leaf: WorkspaceLeaf) => new KanbnBoardView(leaf));
    // // This adds an editor command that can perform some operation on the current editor instance
    // this.addCommand({
    //   id: 'sample-editor-command',
    //   name: 'Sample editor command',
    //   editorCallback: (editor: Editor, view: MarkdownView) => {
    //     console.log(editor.getSelection());
    //     editor.replaceSelection('Sample Editor Command');
    //   }
    // });
    // // This adds a complex command that can check whether the current state of the app allows execution of the command
    // this.addCommand({
    //   id: 'open-sample-modal-complex',
    //   name: 'Open sample modal (complex)',
    //   checkCallback: (checking: boolean) => {
    //     // Conditions to check
    //     const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    //     if (markdownView) {
    //       // If checking is true, we're simply "checking" if the command can be run.
    //       // If checking is false, then we want to actually perform the operation.
    //       if (!checking) {
    //         new SampleModal(this.app).open();
    //       }

    //       // This command will only show up in Command Palette when the check function returns true
    //       return true;
    //     }
    //   }
    // });

    // // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new KanbnSettingTab(this.app, this));

    // // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // // Using this function will automatically remove the event listener when this plugin is disabled.
    // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
    //   console.log('click', evt);
    // });

    // // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
  }

  onunload() {
    console.log('unloading Kanbn plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class KanbnBoardView extends ItemView {
	root: Root | null = null;
  kanbn: Kanbn

	constructor(leaf: WorkspaceLeaf) {
		super(leaf)
    // this.kanbn = kanbn
	}

  public override async setState(state: Kanbn, result: ViewStateResult): Promise<void> {
    await super.setState(state, result)
    console.log("here is the state: ", state)
    this.kanbn = state
    // This uncommented causes an infinite setState loop.
    if (this.root)
      this.root.render(
        <StrictMode>
          {this.kanbn && <Board kanbn={this.kanbn} />}
        </StrictMode>
      );
  }
  public override getState(): Kanbn {
    return Object.assign(super.getState(), this.kanbn)
  }

	getViewType() {
		return "kanbn board view type";
	}

	getDisplayText() {
		return "kanbn board view display text";
	}

  // onLoad(state) {
  //   console.log("here is the state: ", state)
  //   this.kanbn = state.kanbn
  // }

	async onOpen() {
    if (!this.kanbn) {
      console.log('Kanbn instance not found')
    }
    const targetElement = this.containerEl.children[1];
    targetElement.classList.add('kanbn-root');
		this.root = createRoot(targetElement);
		this.root.render(
			<StrictMode>
				{this.kanbn && <Board kanbn={this.kanbn} />}
			</StrictMode>
		);
	}

	async onClose() {
		this.root?.unmount();
	}
}

class OpenBoardModal extends Modal {
  public boardLocation: Map<string, KanbnTuple>

  constructor(app: App, private boardLocations: Map<string, KanbnTuple>) {
    super(app);
    this.boardLocation = boardLocations
  }

  onOpen() {
    const {contentEl} = this
    contentEl.setText('Choose board to open:')
    // List all boards in this.boardLocations
    Array.from(this.boardLocations.keys()).forEach(boardLocation => {
      const btn = contentEl.createEl('button', { text: boardLocation });
      btn.onclick = () => {
        console.log("printing a bunch of stuff here", this.boardLocations, boardLocation)
        const kanbn = this.boardLocations.get(boardLocation)?.kanbn
        if (kanbn === undefined) {
          throw new Error(`Kanbn instance not found for board location ${boardLocation}`)
        }
        const leaf = this.app.workspace.getLeaf('tab')
        leaf.setViewState({
          type: 'kanbn-board-view',
          state: kanbn
        })

      }
    })
  }

  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }
}

class KanbnSettingTab extends PluginSettingTab {
  plugin: KanbnPlugin

  constructor(app: App, plugin: KanbnPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Custom Board Locations')
      .setDesc('Add custom board locations to the list of board locations. These will be checked for .kanbn folders. One location per line.')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.customBoardLocations.join('\n'))
        .onChange(async (value) => {
          this.plugin.settings.customBoardLocations = value.split('\n')
            .map(boardLocation => boardLocation.trim())
          await this.plugin.saveSettings();
        }));
  }
}
