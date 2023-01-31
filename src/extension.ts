import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { parse, join, ParsedPath } from 'path';
//let buildCommand: vscode.Disposable;
//let runCommand: vscode.Disposable;
//let buildAndRunCommand: vscode.Disposable;
import find = require("find-process");
import { lookpath } from "lookpath";
import * as fs from 'fs';


let outputChannel=vscode.window.createOutputChannel("Massey Build");
let terminal=vscode.window.createTerminal("Massey Build");

export async function isProccessRunning(proccess: string): Promise<boolean> {
    const list = await find("name", proccess, true);
    return list.length > 0;
}
export function activate(context: vscode.ExtensionContext) {
    // Register the "Build" command
    let buildCommand = vscode.commands.registerCommand('masseybuild.build', build);
    context.subscriptions.push(buildCommand);

    // Register the "Run" command
    let runCommand = vscode.commands.registerCommand('masseybuild.run', run);
    context.subscriptions.push(runCommand);

//    // Register the "Build and Run" command
//    let buildAndRunCommand = vscode.commands.registerCommand('masseybuild.buildAndRun', buildAndRun);
//    context.subscriptions.push(buildAndRunCommand);

    // Create "Build" item in the status bar
    let buildItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildItem.text = '$(check)';
    buildItem.command = 'masseybuild.build';
    buildItem.tooltip = 'Build';
    buildItem.show();

    // Create "Run" item in the status bar
    let runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
    runItem.text = '$(arrow-right)';
    runItem.command = 'masseybuild.run';
    runItem.tooltip = 'Run';
    runItem.show();

    // Create "Build and Run" item in the status bar
    /*
    let buildAndRunItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 80);
    buildAndRunItem.text = 'Build and Run';
    buildAndRunItem.command = 'masseybuild.buildAndRun';
    buildAndRunItem.show();
    */

    context.subscriptions.push(buildItem);
    context.subscriptions.push(runItem);
   // context.subscriptions.push(buildAndRunItem);
	
}

function escdq(s: string) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function compileSingleFile(fileName: string, run: boolean) {
    let info=parse(fileName);
    // Get Compiler
    let config = vscode.workspace.getConfiguration("masseybuild");
    let compiler = config.get<string>("compiler");

    let lang=vscode.window.activeTextEditor?.document.languageId;
    // Get Extension
    let ext = config.get<string>("ext");

    // Get Target
    let executable = info.name;
    if(ext!=="") {
        executable=executable+"."+ext;
    }
    vscode.window.showInformationMessage("Compiling:"+executable+" in "+info.dir);

    // Get Flags
    let cflags = config.get<string>("cflags");
    let ldlibs = config.get<string>("ldlibs");

    // Get Args
    let args = config.get<string>("args");

    // Generate Compile Command
    let buildcmd = `\"${compiler}\" ${cflags} \"${info.base}\" -o \"${executable}\" ${ldlibs}`;

    if(lang==="makefile") {
        buildcmd = "make";
    }

    // Notify that compiling is starting
   // atom.notifications.addInfo('Compiling...', { detail: buildcmd })
    
 //   try {
      // Execute Compile Command
   //   outputChannel.appendLine(buildcmd);
   //   outputChannel.show();
   //   let compilerArgs=[`\"${info.base}\"`,"-o",`\"${executable}\"`];

    //  if (cflags!=="" && cflags!==undefined) {
    //    compilerArgs.concat(cflags.split(" "));
    //  }
    //  const output = child_process.spawnSync(`"${compiler}"`, compilerArgs, { cwd: info.dir, shell: true, encoding: "utf-8" });
    const output = child_process.spawnSync(buildcmd, { cwd: info.dir, shell: true, encoding: "utf-8" });
 //     let output = child_process.execSync(buildcmd, { cwd: info.dir });

        if(output.output.length>0) {
            outputChannel.appendLine(output.output.toString());
            outputChannel.show();
        }
       // vscode.window.showInformationMessage(output.toString());

       // if (output.output.length>0) {
       //     
       //     op.appendLine(output.toString());
       //     op.show();
       // }

      // Notify Build Success
      //atom.notifications.addSuccess("Build Success");
      /*
    } catch(error) {
      // Notify Build Error
      vscode.window.showInformationMessage("Error Compiling:"+buildcmd);
      
      // Build Failed
      return false;
    }
    */
    if(run && !output.status) {
        if(lang==="makefile") {
            executable=getMakeTarget(fileName);
        }
        // Check Platform
        let cmd = `${info.dir}/${executable}`;
        if(process.platform === "win32") {
            // Windows - Run Command
            let cmd = `start \"${executable}\" cmd /c \"\"${executable}\" ${args} & pause\"`;
        } else if(process.platform === "linux") {
  
        } else if(process.platform === "darwin") {
        // Mac OS X - Run Command
            let cmd = "osascript -e \'tell application \"Terminal\" to activate do script \"" +
              escdq(`clear && cd \"${info.dir}\"; \"./${executable}\" ${args}; ` +
              'read -n1 -p "" && osascript -e "tell application \\"Atom\\" to activate" && osascript -e "do shell script ' +
              escdq(`\"osascript -e ${escdq('"tell application \\"Terminal\\" to close windows 0"')} + &> /dev/null &\"`) +
              '"; exit') + '"\'';
        }
    //  outputChannel.appendLine("running "+cmd+" "+info.dir); 
    //  outputChannel.show();
   //   const output = child_process.spawnSync(cmd, [], { cwd: info.dir, shell: true, encoding: "utf-8" });
   //   output_channel.appendLine(output.output.toString());
   //   output_channel.show();
      terminal.show();
      terminal.sendText(cmd);
      terminal.show();
/*
        child_process.exec(cmd, {cwd: info.dir}, (error, stdout, stderr) => {
            // Do Nothing?
          });
          */
    }
    // Build Succeeded
    return true;
  }

function getMakeTarget(filename:string) {
    // Get Make Command
    let content=fs.readFileSync(filename,'utf8');
    // Get Makefile goals
    let matches = [...content.matchAll(/([A-Za-z0-9]+)([ \t]*):([ \t]*)([A-Za-z0-9_]*)/g)];
    // Return first goal
    return matches[0][matches[0].length-1];
}
function saveAndCompile(run:boolean) {
    // Compile the C++ source file using g++
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No file open.");
      return;
    }

    let fileName = editor.document.fileName;
    
    if (editor.document.languageId==="cpp" || editor.document.languageId==="makefile") {// fileName.endsWith('.cpp')) {
        Promise.resolve(editor.document.isDirty?editor.document.save():null)
        .then(() => {
            compileSingleFile(fileName,run);
        });
    } else {
      vscode.window.showErrorMessage("Not a C++ file.");
    }
}

function build() {
    saveAndCompile(false);
}

function run() {
    saveAndCompile(true);
}

export function deactivate() {
   
}
