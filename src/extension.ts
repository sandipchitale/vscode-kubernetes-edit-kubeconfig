import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";


const CREATE_NEW_BACKUP_FILE = '+ Create new backup file';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.vscode-kubernetes.edit-kubeconfig", editKubeConfig)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.vscode-kubernetes.swap-kubeconfig", swapKubeConfig)
  );
}

async function editKubeConfig() {
  const selectedKubeconfig = await selectKubeConfig('Select KUBECONFIG to open.');
  if (selectedKubeconfig) {
    if (fs.lstatSync(selectedKubeconfig).isFile()) {
      open(selectedKubeconfig);
    }
  }
}

async function swapKubeConfig() {
  const defaultKubeconfig = path.join(os.homedir(), '.kube', 'config');
  const swapInKubeConfig = await selectKubeConfig(`Select KUBECOFIG to copy to ${defaultKubeconfig}:`, false);
  if (swapInKubeConfig) {
    if (fs.lstatSync(swapInKubeConfig).isFile()) {
      let backupToKubeConfig = await selectKubeConfig(`Select KUBECOFIG to backup ${defaultKubeconfig} to:`, false, [CREATE_NEW_BACKUP_FILE]);
      if (backupToKubeConfig) {
        if (backupToKubeConfig === CREATE_NEW_BACKUP_FILE) {
          const backupToKubeConfigUri =   await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(os.homedir(), '.kube', 'config.backup')),
            title: `Specify new filename to backup ${defaultKubeconfig} to`
          });
          if (backupToKubeConfigUri) {
            backupToKubeConfig = backupToKubeConfigUri.fsPath;
            if (backupToKubeConfig) {
              // if (fs.existsSync(path.join(backupToKubeConfig))) {
              //   vscode.window.showErrorMessage(`${backupToKubeConfig} exists. Cannot overwrite.`);
              //   return;
              // }
              swap(swapInKubeConfig, defaultKubeconfig, backupToKubeConfig);
            }
          }
        } else if (fs.lstatSync(backupToKubeConfig).isFile()) {
          if (swapInKubeConfig === backupToKubeConfig) {
            vscode.window.showErrorMessage(`Swap in ${swapInKubeConfig} === Back up ${backupToKubeConfig}. Not allowed.`);
            return;
          }
          swap(swapInKubeConfig, defaultKubeconfig, backupToKubeConfig);
        }
      }
    }
  }
}

async function swap(swapInKubeConfig: string, defaultKubeconfig: string, backupToKubeConfig: string) {
  const answer = await vscode.window.showInformationMessage(
    `${defaultKubeconfig} will be backed up to: \n${backupToKubeConfig}.\n\n${swapInKubeConfig} will be copied to:\n${defaultKubeconfig}`,
    {
      modal: true
    },
    'Yes'
  );
  if (answer === 'Yes') {
    fs.copyFileSync(defaultKubeconfig, backupToKubeConfig);
    fs.copyFileSync(swapInKubeConfig,   defaultKubeconfig);
  }
}

async function selectKubeConfig(placeholder: string, includeDefaultKubeConfig = true, addtionalEntries: string[] = []): Promise<string | undefined> {
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
  if (os.platform() === "win32") {
    kubeconfigs = kubeconfigs.map((kp) => kp.toLowerCase());
  }
  const kubeconfigsSet = new Set(kubeconfigs);

  if (!includeDefaultKubeConfig) {
    kubeconfigsSet.delete(defaultKubeconfig.toLowerCase());
  }
  kubeconfigs = [];
  if (addtionalEntries && addtionalEntries.length > 0) {
    kubeconfigs = [
      ...addtionalEntries,
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      }
    ];
  }

  kubeconfigs = [
    ...kubeconfigs,
    ...kubeconfigsSet,
    ].filter((k) => k !== '');

  if (kubeconfigs.length > 0) {
    const selectedKubeconfig = await vscode.window.showQuickPick(kubeconfigs, {
      placeHolder: placeholder,
    });
    if (selectedKubeconfig) {
      if (selectedKubeconfig === CREATE_NEW_BACKUP_FILE || fs.lstatSync(selectedKubeconfig).isFile()) {
        return selectedKubeconfig;
      }
    }
  }
  return undefined;
}

function open(kubeconfig: string) {
  const openPath = vscode.Uri.file(kubeconfig);
  vscode.workspace.openTextDocument(openPath).then((doc) => {
    vscode.window.showTextDocument(doc);
  });
}
