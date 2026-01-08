# VS Code Integration Guide

This guide explains how to integrate the MCP SSH Server with VS Code and GitHub Copilot.

## Quick Setup

1. **Install the MCP SSH Server**:

   ```bash
   npm install
   ```

2. **Configure MCP Settings**:

   Locate your VS Code MCP settings file. Common locations:

   - `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - Or check your VS Code extension's MCP settings location

3. **Add Server Configuration**:

   Copy the contents from `mcp-settings-example.json` or add:

   ```json
   {
     "mcpServers": {
       "ssh-server": {
         "command": "node",
         "args": ["%USERPROFILE%\\Dev\\mcp-ssh-server\\src\\index.js"],
         "env": {
           "LOG_LEVEL": "info"
         }
       }
     }
   }
   ```

4. **Restart VS Code**

## Using with AI Assistants

### GitHub Copilot Chat

Once configured, you can use natural language to interact with your remote server:

**Connect to a server**:

```
"Connect to my development server at dev.example.com as user john with password 'mypassword'"
```

**Execute commands**:

```
"Run 'npm install' in the /var/www/app directory on the remote server"
```

**Read files**:

```
"Show me the contents of /etc/nginx/nginx.conf from the server"
```

**Write files**:

```
"Create a new file called deploy.sh in ~/scripts with this bash script: [paste script]"
```

**List directories**:

```
"What files are in the /var/log directory?"
```

## Chat Variables (Advanced)

To create a custom chat variable like `@ssh-server`, you would need to develop a VS Code extension. Here's a conceptual overview:

### Extension Structure

```
ssh-chat-extension/
├── package.json
├── extension.js
└── mcp-client.js
```

### package.json

```json
{
  "name": "ssh-chat-extension",
  "contributes": {
    "chatParticipants": [
      {
        "id": "ssh-server",
        "name": "SSH Server",
        "description": "Interact with remote SSH servers",
        "commands": [
          {
            "name": "connect",
            "description": "Connect to SSH server"
          },
          {
            "name": "exec",
            "description": "Execute command"
          }
        ]
      }
    ]
  }
}
```

### extension.js (Conceptual)

```javascript
const vscode = require("vscode");
const { MCPClient } = require("./mcp-client");

function activate(context) {
  const mcpClient = new MCPClient("node", [
    "%USERPROFILE%\\Dev\\mcp-ssh-server\\src\\index.js",
  ]);

  const participant = vscode.chat.createChatParticipant(
    "ssh-server",
    async (request, context, stream, token) => {
      const { prompt, command } = request;

      if (command === "connect") {
        // Parse connection details from prompt
        // Call connect_ssh tool via MCP
        const result = await mcpClient.callTool("connect_ssh", {
          host: "example.com",
          username: "user",
          password: "pass",
        });
        stream.markdown(result.content[0].text);
      } else if (command === "exec") {
        // Execute command
        const result = await mcpClient.callTool("execute_command", {
          command: prompt,
        });
        stream.markdown(`\`\`\`\n${result.content[0].text}\n\`\`\``);
      } else {
        // Default: interpret natural language
        // Use AI to determine which tool to call
        // This would integrate with your AI model
      }
    }
  );

  context.subscriptions.push(participant);
}
```

## Slash Commands

With a custom extension, you could use slash commands:

- `/connect host user password` - Connect to SSH server
- `/exec command` - Execute a command
- `/read path` - Read a file
- `/write path content` - Write a file
- `/ls path` - List directory

## Troubleshooting

### Server Not Appearing in Chat

1. Check MCP settings file location
2. Verify the path to `index.js` is correct
3. Restart VS Code completely
4. Check VS Code's Output panel for MCP logs

### Connection Issues

1. Ensure the MCP server is running (check Task Manager for node.exe)
2. Check stderr output in VS Code's Output panel
3. Verify SSH credentials are correct
4. Test SSH connection manually: `ssh user@host`

### Tool Calls Failing

1. Make sure you've connected first using `connect_ssh`
2. Check the active connection is still valid
3. Verify file paths are correct (absolute or relative to home)
4. Check remote server permissions

## Environment Variables

You can customize the server behavior via environment variables in the MCP settings:

```json
{
  "mcpServers": {
    "ssh-server": {
      "command": "node",
      "args": ["%USERPROFILE%\\Dev\\mcp-ssh-server\\src\\index.js"],
      "env": {
        "LOG_LEVEL": "debug",
        "LOG_TO_FILE": "true"
      }
    }
  }
}
```

Available variables:

- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` (default: `info`)
- `LOG_TO_FILE`: `true` or `false` (default: `false`)

## Next Steps

1. Test the basic connection with your remote server
2. Try each tool individually to ensure they work
3. Experiment with natural language prompts in Copilot Chat
4. Consider building a custom VS Code extension for enhanced integration
5. Set up multiple server profiles for different environments

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [GitHub Copilot Chat API](https://code.visualstudio.com/api/extension-guides/chat)

## VS Code Extension

We provide a dedicated VS Code extension for a seamless experience.

1.  Navigate to `vscode-extension/` directory.
2.  Install dependencies: `npm install`.
3.  Package: `npx vsce package`.
4.  Install the generated `.vsix` file in VS Code.

Access the extension via:

- **Chat**: `@ssh-server`
- **Commands**: `pelssh: ...`
