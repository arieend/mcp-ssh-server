# MCP SSH Assistant

This VS Code extension allows you to interact with remote SSH servers using the Model Context Protocol (MCP). It provides a Chat Participant `@ssh-server` and Command Palette commands to connect, execute commands, and manage files on remote servers.

## Features

- **Chat Interface**: Talk to your server using `@ssh-server` in Copilot Chat.
- **Commands**:
  - `pelssh: Connect`: Connect to a server.
  - `pelssh: Execute Command`: Run a shell command.
  - `pelssh: Read File`: Read a file's content.
  - `pelssh: Write File`: Write content to a file.

## Setup

1.  Ensure you have the `mcp-ssh-server` installed on your machine (or bundled with this extension).
2.  Install this extension (`.vsix`).
3.  Use the Command Palette (`Ctrl+Shift+P`) and type `pelssh: Connect`.

## Requirements

- VS Code ^1.85.0
- Node.js installed

## Extension Settings

No specific settings yet. It uses the `mcp-ssh-server` implementation.

## Known Issues

- Initial release.

## Release Notes

### 0.0.1

- Initial release with Basic SSH connectivity and MCP tools.
