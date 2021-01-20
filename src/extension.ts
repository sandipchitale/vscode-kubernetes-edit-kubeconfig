import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.vscode-kubernetes.edit-kubeconfig",
      () => {
        // Load configuration
        const config = vscode.workspace.getConfiguration("vs-kubernetes");
        let kubeconfigs = [
          config["vs-kubernetes.kubeconfig"],
          ...config["vs-kubernetes.knownKubeconfigs"],
        ];
        const defaultKubeconfig = path.join(os.homedir(), '.kube', 'config');
        if (fs.lstatSync(defaultKubeconfig).isFile()) {
          kubeconfigs.unshift(defaultKubeconfig);
        }
        if (process.platform === "win32") {
          kubeconfigs = kubeconfigs.map((kp) => kp.toLowerCase());
        }
        kubeconfigs = [...new Set(kubeconfigs)].filter((k) => k !== '');
        if (kubeconfigs.length > 0) {
          if (kubeconfigs.length == 1) {
            if (fs.lstatSync(kubeconfigs[0]).isFile()) {
              open(kubeconfigs[0]);
            }
          } else {
            vscode.window.showQuickPick(kubeconfigs, {
              placeHolder: "Select kubeconfig to open",
            })
            .then((selectedKubeconfig) => {
              if (selectedKubeconfig) {
                if (fs.lstatSync(selectedKubeconfig).isFile()) {
                  open(selectedKubeconfig);
                }
              }
            });
          }
        }
      }
    )
  );
}

function open(kubeconfig: string) {
  const openPath = vscode.Uri.file(kubeconfig);
  vscode.workspace.openTextDocument(openPath).then((doc) => {
    vscode.window.showTextDocument(doc);
  });
}
