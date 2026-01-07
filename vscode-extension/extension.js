const vscode = require("vscode");
const { MCPClient } = require("./mcp-client");
const path = require("path");

let mcpClient;

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  console.log("MCP SSH Assistant is now active!");

  // Initialize MCP Client
  // We assume the server is available. For dev, we point to the local src.
  // For production, we'll need to bundle it.
  // Strategy: Look for server in ./server/src/index.js (bundled) first, then relative.

    // 1. Check Configuration
    const config = vscode.workspace.getConfiguration('mcpSsh');
    let serverScriptPath = config.get('serverPath');

    if (!serverScriptPath) {
        // 2. Fallback: Check local bundles (dev mode or bundled)
        const bundledPath = context.asAbsolutePath(path.join('server', 'src', 'index.js'));
        const fs = require('fs');
        if (fs.existsSync(bundledPath)) {
            serverScriptPath = bundledPath;
        } else {
             // 3. Fallback: Dev mode relative path
             const devPath = path.resolve(__dirname, '..', 'src', 'index.js');
             if (fs.existsSync(devPath)) {
                 serverScriptPath = devPath;
             }
        }
    }

    if (!serverScriptPath) {
        // 4. Prompt User
        const selection = await vscode.window.showErrorMessage(
            'MCP SSH Server path not configured. Please locate src/index.js',
            'Locate File'
        );
        if (selection === 'Locate File') {
             const uris = await vscode.window.showOpenDialog({
                 canSelectFiles: true,
                 canSelectFolders: false,
                 filters: { 'JavaScript': ['js'] },
                 openLabel: 'Select index.js'
             });
             if (uris && uris.length > 0) {
                 serverScriptPath = uris[0].fsPath;
                 await config.update('serverPath', serverScriptPath, vscode.ConfigurationTarget.Global);
             }
        }
    }

    if (!serverScriptPath) {
        vscode.window.showErrorMessage('MCP SSH Assistant cannot start: Server path not found.');
        return;
    }

  console.log(`Using MCP Server at: ${serverScriptPath}`);

  mcpClient = new MCPClient(serverScriptPath);
  try {
    await mcpClient.connect();
    vscode.window.showInformationMessage("MCP SSH Server Connected");
  } catch (error) {
    console.error("Failed to connect to MCP SSH Server:", error);
    vscode.window.showErrorMessage(
      `Failed to connect to MCP SSH Server: ${error.message}`
    );
  }

  // Register Chat Participant
  const handler = async (request, context, stream, token) => {
    stream.progress("Processing request...");
    try {
      const command = request.command;
      const prompt = request.prompt;

      let result;
      if (command === "connect") {
        // Heuristic parsing for "connect to <host> as <user> with <password>"
        // This is a naive implementation; ideally we use an LLM or structured input.
        // For the chat participant, we'll pass the whole prompt to the model/tool via the client if possible
        // BUT the ChatParticipant API delegates intent understanding to us or the model.
        // Since we are coding the logic, we act as the "agent".

        // For simplicity in this iteration: direct tool usage isn't fully automatic without an LLM loop.
        // BUT the request comes FROM Copilot (or user).
        // Actual Copilot integration with MCP usually allows Copilot to see the tools.
        // VS Code Chat Participant API allows US to provide response.

        // If we want to support "natural language" we need an LLM.
        // WE ARE THE EXTENSION. We don't have an embedded LLM (unless we use `vscode.lm`).
        // So we'll implement slash commands strictly for now, or pass-through.

        stream.markdown(
          "Please use the slash tools or specific commands for now."
        );
      } else if (command === "exec") {
        result = await mcpClient.callTool("execute_command", {
          command: prompt,
        });
        if (result) {
          stream.markdown("```\n" + JSON.stringify(result, null, 2) + "\n```");
        }
      } else {
        // Default handler
        stream.markdown(
          "I am the SSH Assistant. Please use /connect or /exec."
        );
      }
    } catch (err) {
      stream.markdown(`Error: ${err.message}`);
    }
  };

  const participant = vscode.chat.createChatParticipant("ssh-server", handler);
  participant.iconPath = vscode.Uri.file(
    path.join(context.extensionPath, "icon.png")
  ); // TODO: Add icon
  context.subscriptions.push(participant);

  // Register Command Palette Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("pelssh.connect", async () => {
      const host = await vscode.window.showInputBox({ prompt: "Host" });
      if (!host) return;
      const username = await vscode.window.showInputBox({ prompt: "Username" });
      if (!username) return;
      const password = await vscode.window.showInputBox({
        prompt: "Password",
        password: true,
      });

      try {
        const result = await mcpClient.callTool("connect_ssh", {
          host,
          username,
          password,
        });
        vscode.window.showInformationMessage(
          "Connected: " + JSON.stringify(result)
        );
      } catch (e) {
        vscode.window.showErrorMessage("Connection failed: " + e.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pelssh.execute", async () => {
      const cmd = await vscode.window.showInputBox({
        prompt: "Command to execute",
      });
      if (!cmd) return;
      try {
        const result = await mcpClient.callTool("execute_command", {
          command: cmd,
        });
        // Show result in a new document or output channel
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(result, null, 2),
          language: "json",
        });
        await vscode.window.showTextDocument(doc);
      } catch (e) {
        vscode.window.showErrorMessage("Execution failed: " + e.message);
      }
    })
  );

  // Add logging
  context.subscriptions.push({ dispose: () => mcpClient.disconnect() });
}

function deactivate() {
  if (mcpClient) {
    mcpClient.disconnect();
  }
}

module.exports = {
  activate,
  deactivate,
};
