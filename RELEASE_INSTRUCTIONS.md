# Release Instructions

## 1. Installation

To install the MCP SSH Assistant VS Code extension:

1.  **Download Release**:

    - Go to the [Releases](https://github.com/arieend/mcp-ssh-server/releases) page.
    - Download `mcp-ssh-assistant-x.x.x.vsix` and `mcp-ssh-server.zip`.

2.  **Setup Server**:

    - Extract `mcp-ssh-server.zip` to a location (e.g., `~/Dev/mcp-ssh-server`).
    - Open terminal in that folder and run `npm install`.

3.  **Install Extension**:
    - Build/Download the `.vsix` file.
    - Run `code --install-extension mcp-ssh-assistant-x.x.x.vsix`
    - Or drag and drop into VS Code Extensions view.

## 2. Configuration (Important)

Since this extension communicates with the `mcp-ssh-server`, it needs to know where the server code resides on your machine.

**If you are running from the source repository:**

1.  When you first run a command, the extension will attempt to locate `../src/index.js`.
2.  If it cannot find it (which is likely when installed as an extension), it will prompt you to **Locate File**.
3.  Select the `src/index.js` file from your `mcp-ssh-server` repository.
4.  Alternatively, set this manually in VS Code Settings (`Ctrl+,`):
    - Search for `mcpSsh`
    - Set `Mcp Ssh: Server Path` to the absolute path of `src/index.js`.

## 3. Usage

### Command Palette

Open the Command Palette (`Ctrl+Shift+P`) and type `pelssh`:

- `pelssh: Connect`: Connect to a server.
- `pelssh: Execute Command`
- `pelssh: Read File`
- `pelssh: Write File`

### Chat

Open GitHub Copilot Chat and use the `@ssh-server` participant:

- "Connect to host..."
- "List files in /var/log"

## 4. Dependencies

- Node.js must be installed and available in your PATH.
- `mcp-ssh-server` repository must be present locally.
