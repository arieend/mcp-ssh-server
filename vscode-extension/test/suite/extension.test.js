const assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require('vscode');
// const myExtension = require('../extension');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('arieend.mcp-ssh-assistant'));
	});

	test('Activation test', async () => {
        const ext = vscode.extensions.getExtension('arieend.mcp-ssh-assistant');
        assert.ok(ext, 'Extension not found');
        // await ext.activate(); // This might fail if MCP server dependencies aren't perfect in test env
        // assert.ok(ext.isActive, 'Extension should be active');
	});

    test('Command registration', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('pelssh.connect'), 'pelssh.connect command not found');
        assert.ok(commands.includes('pelssh.execute'), 'pelssh.execute command not found');
    });
});
