"use strict";
const path = require('path');
const express = require('express');
const app = express(); 
const server = require('http').Server(app);
const io = require('socket.io')(server);
const SerialPort = require('serialport');
const ip = require('ip');
const browserify = require('browserify-middleware');
const server_config = require('./server_config');
const package_json = require('./package.json');

const INCLUDE_TTYS = false;


class SerialPortBridge {

  constructor() {

    this.serialPort = null;
    this.serialPortInfo = {};

    this.portsListCur = [];
    this.portsListErr = '';
      
    this.dataTag = null;
    this.busy = false;
    this.clients = {};


    io.on('connection', (socket) => {
      this.clients[socket.id] = this.getClientInfo(socket);
      this.setupSocketOnListPortsCb(socket);
      this.setupSocketOnOpenCb(socket);
      this.setupSocketOnCloseCb(socket);
      this.setupSocketOnWriteReadLineCb(socket);
      this.setupSocketOnWriteLineCb(socket);
      this.setupSocketClearBusyCb(socket);
      this.setupSocketDisconnectCb(socket);
      io.emit('clients', this.clients); 
      io.emit('serverInfo', {
        address: ip.address(),
        port: server_config.port,
        version: package_json.version,
      }); 
      if (this.serialPort) {
        io.emit('openRsp', {
          success: true, 
          serialPortInfo: this.serialPortInfo, 
          ports: this.getSimplifiedPortsList()
        });
      }
    });
  }

  run() {
    app.use(express.static('views'));
    app.use(express.static(path.join(__dirname, 'node_modules', 'vuetify', 'dist')));
    app.use(express.static(path.join(__dirname, 'node_modules', 'roboto-fontface')));
    app.get('/clientbundle.js', browserify(path.join(__dirname,'client_app.js')));
    app.get('/', function(req,res) {
      res.sendFile(path.join(__dirname, 'views/index_app.html'));
    });
    server.listen(server_config.port, function() {
      console.log('serialport_bridge running');
      console.log('listening on port = ' + server_config.port);
    });
  }

  setupSocketOnListPortsCb(socket) {
    socket.on('listPorts', async (msg) => {
      //console.log('on listPorts');
      try {
        this.portsListCur = await this.listSerialPorts();
        this.portsListErr = '';
      } catch (e) {
        this.portsListCur = [];
        this.portsListErr = e;
      }
      this.sendPortsListCur(socket);
    });
  }

  sendPortsListCur(socket) {
    let rsp = [];
    if (this.portsListErr) {
      rsp = {success: false, error: this.portsListErr};
    } else {
      rsp = {success: true, ports: this.getSimplifiedPortsList()};
    }
    socket.emit('listPortsRsp', rsp);
  }

  setupSocketOnOpenCb(socket) {
    socket.on('open', (msg) => {
      //console.log('on open');
      let options = { 
        parser: SerialPort.parsers.readline('\n'), 
        baudRate: msg.options.baudrate,
      }

      this.serialPortInfo = {portName: msg.port};
      Object.assign(this.serialPortInfo, options);

      this.serialPort = new SerialPort(msg.port, options, (err) => {
        let rsp = {
          success: !err, 
          serialPortInfo: this.serialPortInfo,
          ports: this.getSimplifiedPortsList()
        };
        io.emit('openRsp', rsp);
        io.emit('info', {open: {msg: msg, rsp: rsp}});
      });

      this.serialPort.on('data', (data) =>  {
        let line = data.trim();
        let rsp = {tag: this.dataTag, line: line};
        io.emit('readLineRsp', rsp);
        io.emit('info', {readLineRsp: rsp});
        this.dataTag = null;
        this.busy = false;
      });
    });
  }

  setupSocketOnCloseCb(socket) {
    socket.on('close', (msg) => {
      //console.log('on close');
      this.serialPort.close( (err) => {
        let rsp = err ? {success: false} :{success: true};
        io.emit('closeRsp',rsp);
        io.emit('info', {close: {rsp: rsp}});
        this.serialPort = null;
      });
    });
  }

  setupSocketOnWriteReadLineCb(socket) {
    socket.on('writeReadLine', (msg) => {
      //console.log('on writeReadLine');
      let rsp = {};
      if (!this.serialPort.isOpen()) {
        rsp = {success: false, error: 'port is not open'};
      } else if (this.busy) {
        rsp = {success: false, error: 'port is busy'};
      } else {
        this.dataTag = msg.tag;
        this.busy = true;
        this.serialPort.write(msg.line + '\n');
        rsp = {success: true};
      }
      io.emit('readLineRsp', rsp);
      io.emit('info', {writeReadLine: {msg: msg, rsp: rsp}});
    });
  }

  setupSocketOnWriteLineCb(socket) {
    socket.on('writeLine', (msg) => {
      //console.log('on writeLine');
      let rsp = {};
      if (!this.serialPort.isOpen()) {
        rsp = {success: false, error: 'port is not open'};
      } else if (this.busy) {
        rsp = {success: false, error: 'port is busy'};
      } else {
        this.serialPort.write(msg.line + '\n');
        rsp = {success: true};
      }
      io.emit('readLineRsp', rsp);
      io.emit('info', {writeLine: {msg: msg, rsp: rsp}});
    });
  }

  setupSocketClearBusyCb(socket) {
    socket.on('clearBusy', (msg) => {
      //console.log('on clearBusy');
      this.dataTag = null;
      this.busy = false;
    });
  }

  setupSocketDisconnectCb(socket) {
    socket.on('disconnect', () => {
      //console.log('disconnect');
      delete this.clients[socket.id];
      io.emit('clients', this.clients); 
    });
  }

  listSerialPorts() {
    let promise = new Promise(function(resolve,reject) {
      SerialPort.list( (err,ports) => {
        if (err) {
          reject(err);
        } else {
          resolve(ports);
        }
      });
    });
    return promise;
  }

  getSimplifiedPortsList() { 
    let modPorts = [];
    let ttySCnt = 0;
    for (let i=0; i<this.portsListCur.length; i++) { 
      if (this.portsListCur[i].comName.indexOf('ttyS') == -1) { 

        let mixedNumber  = this.portsListCur[i].serialNumber;
        let manufacturer = this.portsListCur[i].manufacturer;
        let serialNumber = this.portsListCur[i].serialNumber.split('_').pop();
        let product = mixedNumber.replace(manufacturer + '_', '').replace('_' + serialNumber, '');

        let item = { 
          device: this.portsListCur[i].comName, 
          name: path.basename(this.portsListCur[i].comName),
          vid: this.portsListCur[i].vendorId,
          pid: this.portsListCur[i].productId,
          manufacturer: manufacturer, 
          serialNumber: serialNumber, 
          product: product,
        };
        modPorts.push(item);
      } else {
        ttySCnt++;
      }
    }
    if (INCLUDE_TTYS) {
      let ttySItem = {
        device: '/dev/ttyS0-S' + ttySCnt,
        name: 'ttyS0-S' + ttySCnt,
      };
      modPorts.push(ttySItem);
    }
    return modPorts;
  }

  getClientInfo(socket) {
    let address = socket.handshake.address;
    if (address === '::1') {
      address = 'localhost';
    }
    if (address.indexOf('::ffff:') !== -1) {
      address = address.substring(7);
    }
    let info = {
      address: address,
      time: socket.handshake.time,
    };
    return info; 
  }

} // class SerialPortBridge

module.exports = SerialPortBridge;


