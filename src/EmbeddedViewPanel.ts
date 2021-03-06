import * as vscode from 'vscode';
import Puppeteer from './Puppeteer';
import treeView from './treeViewPanel';
import htmlView from './htmlViewPanel';

export default class EmbeddedViewPanel {

	public static currentPanel: EmbeddedViewPanel | undefined;
	public static readonly viewType = 'ReactION';
	private readonly _htmlPanel: vscode.WebviewPanel;
	private readonly _treePanel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
	public readonly _page: any;

	public static createOrShow(extensionPath: string) {
		const treeColumn = vscode.ViewColumn.Three;
		const htmlColumn = vscode.ViewColumn.Two;
		if (EmbeddedViewPanel.currentPanel) {
			EmbeddedViewPanel.currentPanel._htmlPanel.reveal(htmlColumn);
			EmbeddedViewPanel.currentPanel._treePanel.reveal(treeColumn);
			return;
		}

		// Show HTML Preview in VS Code
		const htmlPanel = vscode.window.createWebviewPanel(EmbeddedViewPanel.viewType, "HTML Preview", htmlColumn, {

			// Enable javascript in the webview
			enableScripts: true,
			retainContextWhenHidden: true,
			enableCommandUris: true
		});

		// Show Virtual DOM Tree in VS Code
		const treePanel = vscode.window.createWebviewPanel(EmbeddedViewPanel.viewType, "Virtual DOM Tree", treeColumn, {

			// Enable javascript in the webview
			enableScripts: true,
			retainContextWhenHidden: true,
			enableCommandUris: true
		});

		EmbeddedViewPanel.currentPanel = new EmbeddedViewPanel(htmlPanel, treePanel, extensionPath);
	}

	// Constructor for tree view and html panel
	private constructor(
		htmlPanel: vscode.WebviewPanel,
		treePanel: vscode.WebviewPanel,
		extensionPath: string,
	) {
		this._htmlPanel = htmlPanel;
		this._treePanel = treePanel;

		// Running Puppeteer to access React page context
		this._page = new Puppeteer();
		this._page._headless = true;
		this._page.start();

		// ******* fix this set interval... doesn't need it ******
		setInterval(() => {
			this._update();
		}, 1000);
		this._treePanel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._treePanel.onDidChangeViewState(e => {
			if (this._treePanel.visible) {
				/************************************
					***Are we using this if statement?***
					*************************************/
			}
		}, null, this._disposables);

		// Handle messages from the webview
		this._treePanel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'alert':
					vscode.window.showErrorMessage(message.text);
					return;
			}
		}, null, this._disposables);

		this._treePanel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'notice':
					vscode.window.showErrorMessage(message.text);
					return;
			}
		}, null, this._disposables);

	}

	public dispose() {
		EmbeddedViewPanel.currentPanel = undefined;

		// Clean up our resources
		this._htmlPanel.dispose();
		this._treePanel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private async _update() {
		this._htmlPanel.webview.html = this._getPreviewHtmlForWebview();
		let rawReactData = await this._page.scrape();
		this._treePanel.webview.html = this._getHtmlForWebview(rawReactData);
	}

	// Putting scraped meta-data to D3 tree diagram
	private _getHtmlForWebview(rawReactData: Array<object>) {

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		const stringifiedFlatData = JSON.stringify(rawReactData);

		return treeView.generateD3(stringifiedFlatData);
	}

	private _getPreviewHtmlForWebview() {
		return htmlView.html;
	}
}
// For security purposes, we added getNonce function
function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}