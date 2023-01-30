import * as vscode from 'vscode';
import * as child_process from 'child_process';

//let buildCommand: vscode.Disposable;
//let runCommand: vscode.Disposable;
//let buildAndRunCommand: vscode.Disposable;

export function activate(context: vscode.ExtensionContext) {
    // Register the "Build" command
    let buildCommand = vscode.commands.registerCommand('masseybuild.build', build);
    context.subscriptions.push(buildCommand);

    // Register the "Run" command
    let runCommand = vscode.commands.registerCommand('masseybuild.run', run);
    context.subscriptions.push(runCommand);

    // Register the "Build and Run" command
    let buildAndRunCommand = vscode.commands.registerCommand('masseybuild.buildAndRun', buildAndRun);
    context.subscriptions.push(buildAndRunCommand);

    // Create "Build" item in the status bar
    let buildItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    buildItem.text = 'Build';
    buildItem.command = 'masseybuild.build';
    buildItem.show();

    // Create "Run" item in the status bar
    let runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    runItem.text = 'Run';
    runItem.command = 'masseybuild.run';
    runItem.show();

    // Create "Build and Run" item in the status bar
    let buildAndRunItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
    buildAndRunItem.text = 'Build and Run';
    buildAndRunItem.command = 'masseybuild.buildAndRun';
    buildAndRunItem.show();

    context.subscriptions.push(buildItem);
    context.subscriptions.push(runItem);
    context.subscriptions.push(buildAndRunItem);
	
}

function build() {
    // Compile the C++ source file using g++
    child_process.exec('g++ main.cpp -o main.out');
    vscode.window.showInformationMessage('Build Successful!');
}

function run() {
    // Run the compiled binary file
    child_process.exec('./main.out');
    vscode.window.showInformationMessage('Program Running!');
}

function buildAndRun() {
    build();
    run();
}

export function deactivate() {
   // buildCommand.dispose();
   // runCommand.dispose();
   // buildAndRunCommand.dispose();
}
