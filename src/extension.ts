// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AuthService } from './services/AuthService';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Callsign extension activated');

    let disposable = vscode.commands.registerCommand('callsign.openPanel', () => {
        const panel = vscode.window.createWebviewPanel('callsignDocs', 'Callsign', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
        // listen for button clicks from the webview
        panel.webview.onDidReceiveMessage(
            message => handleMessage(message, panel, context),
            undefined,
            context.subscriptions,
        );
    });

    context.subscriptions.push(disposable);
}

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const isDev = process.env.NODE_ENV === 'development';

    console.log('IS DEV: ', isDev);
    if (isDev) {
        return getDevServerHtml();
    }

    // --- Production: Load from built files in ui-dist ---
    const distPath = vscode.Uri.joinPath(extensionUri, 'ui-dist');
    const indexPath = vscode.Uri.joinPath(distPath, 'index.html');

    // Read raw index.html
    let html = fs.readFileSync(indexPath.fsPath, 'utf8');

    // Convert file:/// paths to webview-safe URIs
    const assetUri = (file: string) => webview.asWebviewUri(vscode.Uri.joinPath(distPath, file)).toString();

    // Rewrite ./assets/... and ./vite.svg
    html = html.replace(/"\.\/(.*?)"/g, (_match, p1) => `"${assetUri(p1)}"`);

    return html;
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function handleMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    const authService = new AuthService(context);
    switch (message.command) {
        case 'loadJson':
            handleLoadJson(message, panel, context);
            break;
        case 'storeAuth':
            const { type, name, value } = message.payload;

            await authService.storeCredential({ name, type }, value);
            break;
        case 'getAllCredentials':
            const all = await authService.getAllCredentials();
            try {
                panel.webview.postMessage({ command: 'allCreds', data: all });
            } catch (error) {
                console.log('error posting message', error);
            }
            break;

        case 'clearAllCreds':
            await authService.clearAllCredentials();

            panel.webview.postMessage({ command: 'credsCleared' });
            break;
        case 'getCredentialById':
            const stored = await authService.getCredential(message.id);

            if (stored) {
                panel.webview.postMessage({
                    command: 'credentialValue',
                    data: stored,
                });
            }
            break;
        default:
            panel.webview.postMessage({ command: 'error', error: 'Unknown command' });
    }
}

function handleLoadJson(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    if (message.type === 'file' && message.content) {
        try {
            const jsonData = JSON.parse(message.content);
            panel.webview.postMessage({ command: 'showJson', json: jsonData });
        } catch (err) {
            panel.webview.postMessage({ command: 'error', error: 'Invalid JSON file content' });
        }
    } else if (message.type === 'url' && message.url) {
        fetch(message.url)
            .then(res => res.json())
            .then(jsonData => {
                panel.webview.postMessage({ command: 'showJson', json: jsonData });
            })
            .catch(() => {
                panel.webview.postMessage({ command: 'error', error: 'Failed to fetch JSON from URL' });
            });
    } else {
        const defaultPath = path.join(context.extensionPath, 'src', 'swagger-test.json');
        try {
            const jsonData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
            panel.webview.postMessage({ command: 'showJson', json: jsonData });
        } catch (err) {
            panel.webview.postMessage({ command: 'error', error: 'Failed to read default JSON file' });
        }
    }
}

function getDevServerHtml() {
    // Just load dev server
    return /* html */ `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Callsign (Dev)</title>
            </head>
            <body>
            <div id="app"></div>
            <script>

            </script>
            <script type="module" src="http://localhost:5173/src/main.ts"></script>
            </body>
            </html>
            `;
}
