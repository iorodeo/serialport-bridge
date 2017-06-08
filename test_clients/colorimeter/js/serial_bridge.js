"use strict";

class SerialBridge {

  constructor(url) {
    this.url = url;
    this.socket = null;
  }

  connect() {
    this.socket = io.connect(this.url);
  }

  disconnect() {
    this.socket.close();
    this.socket = null;
  }


  listPorts() {
    console.log('listPorts');
    this.socket.emit('listPorts');
  }

  open(port,options) {
    this.socket.emit('open', {port: port, options: options});
  }

  close() {
    this.socket.emit('close');
  }

  readLine() {
    this.socket.emit('readLine');
  }

  writeLine(tag,line) {
    this.socket.emit('writeLine',{tag: tag, line: line});
  }

  writeReadLine(tag,line) {
    this.socket.emit('writeReadLine', {tag: tag, line: line});
  }

  on(eventName, callback) {
    this.socket.on(eventName,callback);
  }
}

module.exports = SerialBridge;
