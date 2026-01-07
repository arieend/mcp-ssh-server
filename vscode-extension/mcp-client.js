const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

class MCPClient {
    constructor(serverScriptPath) {
        this.serverScriptPath = serverScriptPath;
        this.client = null;
        this.transport = null;
    }

    async connect() {
        console.log(`Connecting to MCP Server at ${this.serverScriptPath}...`);
        
        this.transport = new StdioClientTransport({
            command: "node",
            args: [this.serverScriptPath]
        });

        this.client = new Client({
            name: "vscode-ssh-client",
            version: "1.0.0",
        }, {
            capabilities: {
                // Capabilities this client supports
                sampling: {}
            }
        });

        await this.client.connect(this.transport);
        console.log("Connected to MCP Server.");
    }

    async listTools() {
        if (!this.client) throw new Error("Not connected");
        return await this.client.listTools();
    }

    async callTool(name, args) {
        if (!this.client) throw new Error("Not connected");
        return await this.client.callTool({
            name,
            arguments: args
        });
    }

    disconnect() {
        if (this.transport) {
            // this.transport.close(); // Method might vary depending on SDK version
        }
    }
}

module.exports = { MCPClient };
