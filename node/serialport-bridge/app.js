"use strict";
let SerialPortBridge = require('./lib/server/serialport-bridge');
let bridge = new SerialPortBridge();
bridge.run();

