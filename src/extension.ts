import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let outputChannel=vscode.window.createOutputChannel("Massey Build");
let terminal=vscode.window.createTerminal("Massey Build");
let compileprocess:child_process.ChildProcessWithoutNullStreams;

export function activate(context: vscode.ExtensionContext) {
    // Register the "Build" command
    let buildCommand = vscode.commands.registerCommand('masseybuild.build', build);
    context.subscriptions.push(buildCommand);

    // Register the "Run" command
    let runCommand = vscode.commands.registerCommand('masseybuild.run', run);
    context.subscriptions.push(runCommand);

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

    context.subscriptions.push(buildItem);
    context.subscriptions.push(runItem);	
}

function escdq(s: string) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
// Get extention of target executable
function getExtension() {
    // Get Extension
    let ext = vscode.workspace.getConfiguration("masseybuild").get<string>("ext");
    // Default Windows Extension
    if((ext !== undefined) && ext !== "") {
      return "." + ext;
    } else if(process.platform === "win32") {
      return ".exe";
    }
    return "";
  }

// Get single-file target
function getCompileTarget(lang: string | undefined, info: path.ParsedPath) {
    //console.log("getCompileTarget");
    if(lang==="c" || lang==="cpp") {
      // Get Target Name
      return info.name + getExtension();
    }
}
function getMakeTarget(info: path.ParsedPath) {
    // Get Make Command
    let content=fs.readFileSync(path.join(info.dir, info.base),'utf8');
    // Get Makefile goals
    let matches = [...content.matchAll(/([A-Za-z0-9]+)([ \t]*):([ \t]*)([A-Za-z0-9_]*)/g)];
    // Return first goal
    return matches[0][matches[0].length-1];
}
function getBuildType(lang: string | undefined, info: path.ParsedPath) {
    if(fs.existsSync(path.join(info.dir, "makefile")) ||
      fs.existsSync(path.join(info.dir, "Makefile")) ||
      (lang==="makefile") ) {
        return "Makefile";
    }
    return "Single";
}
// Get build target (single-file or Makefile)
function getBuildTarget(lang: string | undefined, info: path.ParsedPath) {
    //console.log("getBuildTarget");

    // Check Grammar
    if(lang==="cpp" || lang==="c") {
      // Check if a Makefile exists in the directory
      if(fs.existsSync(path.join(info.dir, "makefile"))) {
        // Use Makefile
        info.base = "makefile";
        // Get Make Target
        return getMakeTarget(info);
      } else if(fs.existsSync(path.join(info.dir, "Makefile"))) {
        // Use Makefile
        info.base = "Makefile";
        // Get Make Target
        return getMakeTarget(info);
      } else {
        // Get Compile Target
        return getCompileTarget(lang, info);
      }
    } else if(lang==="makefile") {
      // Get Make Target
      return getMakeTarget(info);
    }
  }

function buildAndRun(fileName: string, run: boolean) {
    let info=path.parse(fileName);
    // Get Compiler
    let config = vscode.workspace.getConfiguration("masseybuild");
    let compiler = config.get<string>("compiler");

    let editor=vscode.window.activeTextEditor;
    let lang=editor?.document.languageId;
    let buildtype = getBuildType(lang,info);

    // Get Target
    let executable = getBuildTarget(lang,info);

    vscode.window.showInformationMessage("Compiling:"+executable);

    // Get Flags
    let cflags = config.get<string>("cflags");

    // Get library flags
    let ldlibs = config.get<string>("ldlibs");

    // Generate Compile Command
    let buildcmd = `\"${compiler}\" ${cflags} \"${fileName}\" -o \"${executable}\" ${ldlibs}`;

    if(buildtype==="Makefile") {
        let make=config.get<string>("make");
        if(make===undefined) {
            make="make";
        }
        buildcmd = make;
    }
    outputChannel.clear();
    outputChannel.appendLine(buildcmd);
    compileprocess = child_process.spawn(buildcmd,[], { cwd: info.dir, shell: true });

    compileprocess.stdout.on('data', (data) => {
        outputChannel.append(data.toString());
        outputChannel.show(true);
    });
    
    compileprocess.stderr.on('data', (data) => {
        outputChannel.append(data.toString());
        outputChannel.show(true);
    });
    
    compileprocess.on('close', (code) => {
        if(code) {
            outputChannel.appendLine("Build Failed");
        } else {
            outputChannel.appendLine("Success");
        }
        outputChannel.show(true);
        if(run && !code) {
            // Get Args
            let args = config.get<string>("args");
            if(args===undefined) {
                args="";
            }
            let cmd = `\"${info.dir}${path.sep}${executable}\" ${args}`;
			terminal.show(false);
            terminal.sendText(cmd);
        }
    });


    
    return true;
  }


function saveAndCompile(run:boolean) {
    // Compile the C++ source file using g++
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No file open.");
      return;
    }

    let fileName = editor.document.fileName;
    
    if (editor.document.languageId==="cpp" || editor.document.languageId==="c" || 
		editor.document.languageId==="makefile") {
        Promise.resolve(editor.document.isDirty?editor.document.save():null)
        .then(() => {
            buildAndRun(fileName,run);
        });
    } else {
      vscode.window.showErrorMessage("Not a C/C++ file.");
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
