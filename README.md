# MCP SSH Server

A **Model Context Protocol (MCP)** server that bridges VS Code on Windows with remote Linux servers via SSH. This enables AI assistants like GitHub Copilot to seamlessly interact with remote development environments.

## Features

- 🔐 **Password-to-Key Bootstrap**: Connect once with a password, then automatically use SSH keys for all future connections
- 📁 **Remote File System Access**: Expose remote directories through MCP Resources
- 🛠️ **Remote Command Execution**: Run shell commands on remote servers with full stdout/stderr capture
- 📝 **Direct File Operations**: Read and write files directly to remote servers via SFTP
- 🔄 **Connection Management**: Automatic reconnection and connection pooling
- 🔑 **Secure Key Storage**: ED25519 keys stored locally in `~/.mcp-ssh/`

## Architecture

```
┌─────────────────────┐
│  VS Code + Copilot  │
└──────────┬──────────┘
           │ stdio (MCP Protocol)
           ▼
┌─────────────────────┐
│   MCP SSH Server    │
│  ┌───────────────┐  │
│  │ Resource      │  │  Exposes remote file system
│  │ Handler       │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ Tool Handler  │  │  Provides remote operations
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ SSH Manager   │  │  Password-to-key bootstrap
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ SFTP Client   │  │  File operations
│  └───────────────┘  │
└──────────┬──────────┘
           │ SSH/SFTP
           ▼
┌─────────────────────┐
│  Remote Linux       │
│  Server             │
└─────────────────────┘
```

## Installation

1. **Clone the repository**:

   ```bash
   cd %USERPROFILE%\Dev
   git clone <repository-url> mcp-ssh-server
   cd mcp-ssh-server
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure VS Code MCP Settings**:

   Add the server to your MCP settings file. The location depends on your VS Code configuration:

   - Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - Or check VS Code's MCP settings location

   Add this configuration:

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

## Password-to-Key Bootstrap Flow

The MCP SSH Server implements an intelligent authentication flow:

### First Connection

1. User provides SSH password
2. Server connects using password authentication
3. Server automatically generates an ED25519 key pair
4. Public key is deployed to `~/.ssh/authorized_keys` on the remote server
5. Private key is stored in `~/.mcp-ssh/keys/id_ed25519_<host>`
6. Connection is re-established using the new key

### Subsequent Connections

1. Server detects existing key for the host
2. Connects directly using key-based authentication
3. **No password required!**

### Security Notes

- Keys are stored with `0600` permissions (owner read/write only)
- Each host gets a unique key pair
- Keys are never transmitted after initial deployment
- Password is only used once and not stored

## Available Tools

The MCP server provides the following tools that can be invoked by AI assistants:

### 1. `connect_ssh`

Connect to a remote SSH server.

**Parameters**:

- `host` (required): Remote host address or IP
- `username` (required): SSH username
- `password` (optional): SSH password (only needed for first connection)
- `port` (optional): SSH port (default: 22)

**Example**:

```javascript
{
  "host": "example.com",
  "username": "developer",
  "password": "initial-password",
  "port": 22
}
```

### 2. `execute_command`

Execute a shell command on the remote server.

**Parameters**:

- `command` (required): Shell command to execute
- `workingDirectory` (optional): Working directory for the command

**Example**:

```javascript
{
  "command": "gcc main.c -o main && ./main",
  "workingDirectory": "/home/developer/project"
}
```

### 3. `read_file`

Read contents of a file from the remote server.

**Parameters**:

- `path` (required): Absolute or relative path to the file

**Example**:

```javascript
{
  "path": "/home/developer/config.json"
}
```

### 4. `write_file`

Write content to a file on the remote server.

**Parameters**:

- `path` (required): Absolute or relative path to the file
- `content` (required): Content to write

**Example**:

```javascript
{
  "path": "/home/developer/script.sh",
  "content": "#!/bin/bash\necho 'Hello World'"
}
```

### 5. `list_directory`

List contents of a directory on the remote server.

**Parameters**:

- `path` (optional): Directory path (defaults to home directory)

**Example**:

```javascript
{
  "path": "/home/developer/projects"
}
```

## VS Code Integration

### Using with GitHub Copilot Chat

Once configured, you can interact with your remote server through Copilot:

**Example prompts**:

- "Connect to my server at dev.example.com as user john"
- "List files in the /var/www directory"
- "Read the nginx configuration file"
- "Compile and run the C++ program in ~/projects/app"
- "Write this code to ~/app/server.js on the remote server"

### Chat Variables (Future Enhancement)

To create a custom chat variable like `@ssh-server`, you would need to:

1. Create a VS Code extension that registers the chat participant
2. Use the MCP client library to communicate with this server
3. Register slash commands like `/connect`, `/exec`, `/read`, `/write`

**Example extension.js** (conceptual):

```javascript
vscode.chat.createChatParticipant(
  "ssh-server",
  async (request, context, stream, token) => {
    // Connect to MCP server via stdio
    // Forward user's request to appropriate tool
    // Stream response back to chat
  }
);
```

## Configuration

### Environment Variables

- `LOG_LEVEL`: Set logging level (`debug`, `info`, `warn`, `error`) - default: `info`
- `LOG_TO_FILE`: Enable file logging - default: `false`

### Directory Structure

```
~/.mcp-ssh/
├── keys/                    # SSH private keys
│   ├── id_ed25519_user@host_22
│   └── id_ed25519_user@other_22
├── config/                  # Configuration files (future)
└── logs/                    # Log files (if enabled)
```

## Usage Examples

### Example 1: Connect and Compile Code

```
User: "Connect to dev.example.com as developer with password 'mypass'"
AI: Uses connect_ssh tool
Server: Connects, generates keys, deploys public key
AI: "Connected! Future connections will use keys."

User: "Compile the C program in ~/project"
AI: Uses execute_command tool
Server: Executes "cd ~/project && gcc main.c -o main"
AI: Returns stdout/stderr and exit code
```

### Example 2: Edit Remote Configuration

```
User: "Read the nginx config"
AI: Uses read_file tool with path "/etc/nginx/nginx.conf"
Server: Returns file contents
AI: Displays configuration

User: "Add this server block to the config..."
AI: Uses write_file tool
Server: Writes updated configuration
AI: "Configuration updated successfully"
```

## Troubleshooting

### Connection Issues

**Problem**: "Connection timeout"

- Check firewall rules on both Windows and Linux
- Verify SSH service is running: `systemctl status sshd`
- Test connection manually: `ssh user@host`

**Problem**: "Key authentication failed"

- Check `~/.ssh/authorized_keys` permissions on remote server (should be 600)
- Verify `~/.ssh` directory permissions (should be 700)
- Check server logs: `sudo tail -f /var/log/auth.log`

### Key Bootstrap Issues

**Problem**: "Failed to deploy public key"

- Ensure user has write access to `~/.ssh/authorized_keys`
- Check if `~/.ssh` directory exists on remote server
- Verify password authentication is enabled in `/etc/ssh/sshd_config`

### File Operation Issues

**Problem**: "Failed to write file"

- Check file path permissions
- Verify user has write access to the directory
- Ensure parent directories exist

## Development

### Project Structure

```
mcp-ssh-server/
├── src/
│   ├── index.js              # Entry point
│   ├── config.js             # Configuration
│   ├── mcp/
│   │   ├── MCPServer.js      # Main MCP server
│   │   ├── ResourceHandler.js # MCP Resources implementation
│   │   └── ToolHandler.js    # MCP Tools implementation
│   ├── ssh/
│   │   ├── SSHConnectionManager.js  # SSH connection management
│   │   └── KeyManager.js     # Key generation and deployment
│   ├── sftp/
│   │   └── SFTPClient.js     # SFTP operations wrapper
│   └── utils/
│       └── logger.js         # Logging utility
├── package.json
└── README.md
```

### Running in Development Mode

```bash
npm run dev
```

This starts the server with Node.js inspector enabled for debugging.

## Security Considerations

1. **Key Storage**: Private keys are stored in `~/.mcp-ssh/keys/` with restrictive permissions
2. **Password Handling**: Passwords are only used once and never stored
3. **Connection Security**: Uses modern SSH algorithms (ED25519, Curve25519)
4. **File Operations**: All file writes are atomic to prevent corruption
5. **Logging**: Passwords are redacted from logs

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses [ssh2](https://github.com/mscdex/ssh2) for SSH connectivity
- Uses [ssh2-sftp-client](https://github.com/theophilusx/ssh2-sftp-client) for SFTP operations
