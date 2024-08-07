const path = require('path')
const url = require('url')
const electron = require('electron')
const cp = require('child_process');

const app = electron.app
const Menu = electron.Menu
const BrowserWindow = electron.BrowserWindow

//const SerialPortBridge = require('./serialport_bridge')

let mainWindow
let serverProc

function setupOnReady() {
  //createServer()
  //serverProc = cp.fork(path.join(__dirname, 'run_serialport_bridge'));
  serverProc = electron.utilityProcess.fork(path.join(__dirname, 'run_serialport_bridge.js'));
  createWindow()
}


function createWindow () {
  mainWindow = new BrowserWindow({
      width: 800, 
      height: 600, 
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
    },
  })
  //mainWindow.openDevTools()


  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'views/index_app.html'),
    protocol: 'file:',
    slashes: true
  }))

  const template = [
    {
      label: 'File',
      submenu: [
        {role: 'quit'}
      ]
    },
    //{
    //  label: 'Debug',
    //  submenu: [
    //    {role: 'toggledevtools'}
    //  ]
    //}
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })

}

//function createServer() {
//  console.log('creating serialport_bridge server')
//  let bridge = new SerialPortBridge();
//  bridge.run();
//}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', setupOnReady)


app.on('quit', function() {
  console.log('serialport_bridge quitting');
  serverProc.kill('SIGINT');
})


// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
