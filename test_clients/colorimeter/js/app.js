"use strict";

var SerialBridge = require('./serial_bridge');

var app = new Vue({

  el: '#app',
  delimiters: ['[[', ']]'],

  data: {
    serialBridge: new SerialBridge('http://localhost:5000'),
    listPortsTimer: null,
    listPortsTimerDt: 2000,
    message: "",
    portArray: [],
    portName: null,
    portOpen: false,
    zeroed: false,
    portParam: {
      baudrate: 9600,
      timeout: 10.0,
    },
    result: {
      error: false,
      errorMsg: '',
      data: {},
    },
  },

  methods: {
    onOpenCloseButton: function() {
      console.log('onOpenCloseButton');
      if (this.portOpen) {
        this.serialBridge.close();
      }
      else {
        this.stopListPortsTimer();
        this.serialBridge.open(this.portName,this.portParam);
      }
    },

    onZeroButton: function() {
      console.log('onZeroButton');
      this.serialBridge.writeReadLine('zero','[0]');
    },

    onMeasureAllButton: function() {
      console.log('onMeasureAllButton');
      this.serialBridge.writeReadLine('measureAll', '[1]');
    },

    onMeasureRedButton: function() {
      console.log('onMeasureRedButton');
      this.serialBridge.writeReadLine('measureRed', '[9]');
    },

    onMeasureGreenButton: function() {
      console.log('onMeasureGreenButton');
      this.serialBridge.writeReadLine('measureGreen', '[10]');
    },

    onMeasureBlueButton: function() {
      console.log('onMeasureBlueButton');
      this.serialBridge.writeReadLine('measureBlue', '[11]');
    },

    onMeasureWhiteButton: function() {
      console.log('onMeasureWhiteButton');
      this.serialBridge.writeReadLine('measureWhite', '[12]');
    },

    startListPortsTimer: function() {
      this.listPortsTimer = setInterval(() => { 
        this.serialBridge.listPorts();
      }, this.listPortsTimerDt);
    },

    resetResult: function() {
      this.result.error = false;
      this.result.errorMsg = '';
      this.result.data = {};
    },

    stopListPortsTimer: function() {
      clearInterval(this.listPortsTimer);
    },

    onSerialBridgeListPortsRsp: function(rsp) { 
      console.log(JSON.stringify(rsp)); 
      this.portArray = rsp.ports;
    },

    onSerialBridgeOpenRsp: function(rsp) {
      console.log(JSON.stringify(rsp));
      setTimeout(() => { 
        this.portOpen = rsp.success;
      }, 2000);
    },

    onSerialBridgeCloseRsp: function(rsp) {
      console.log(JSON.stringify(rsp));
      // Maybe error message based on response?, but should 
      // always release port
      this.portOpen = false; 
      this.zeroed = false;
      this.startListPortsTimer();
    },

    onReadLineZero: function(rsp) {
      console.log('zero response');
      let lineArray = JSON.parse(rsp.line);
      if (lineArray.length > 0) {
        this.zeroed = !!+lineArray[0];
      }
      else {
        this.zeroed = false;
      }
    },

    onReadLineMeasureAll: function(rsp) {
      let lineArray = JSON.parse(rsp.line);
      if (lineArray.length == 13) {
        let success = !!+lineArray[0];
        if (success) {
          let colors = ['red', 'green', 'blue', 'white'];
          this.result.data = {};
          for (let i=0; i<colors.length; i++) {
            this.result.data[colors[i]] = {
              freq: lineArray[1+i],
              tran: lineArray[5+i],
              abso: lineArray[9+i],
            };
          }
        } else
        {
          this.result.error = true;
          this.result.errorMsg = 'serial command error';

        }
      } else {
        this.result.error = true;
        this.result.errorMsg = 'response array size incorrect';
      }
    },

    onReadLineMeasureColor: function(color,rsp) {
      let lineArray = JSON.parse(rsp.line);
      if (lineArray.length == 4) {
        let success = !!+lineArray[0];
        if (success) {
          this.result.data = {};
          this.result.data[color] = {
              freq: lineArray[1],
              tran: lineArray[2],
              abso: lineArray[3],
          };
        } else {
          this.result.error = true;
          this.result.errorMsg = 'serial commmand error';
        }
      } else {
        this.result.error = true;
        this.result.errorMsg = 'response array size incorrect';
      }
    },

    onSerialBridgeReadLineRsp: function(rsp) {
      console.log(JSON.stringify(rsp));
      switch (rsp.tag) {
        case 'zero':
          this.onReadLineZero(rsp);
          break;

        case 'measureAll':
          this.onReadLineMeasureAll(rsp);
          break;

        case 'measureRed':
          this.onReadLineMeasureColor('red', rsp);
          break;

        case 'measureGreen':
          this.onReadLineMeasureColor('green', rsp);
          break;

        case 'measureBlue':
          this.onReadLineMeasureColor('blue', rsp);
          break;

        case 'measureWhite':
          this.onReadLineMeasureColor('white', rsp);
          break;

        default:
      }
    },

    setupSerialBridge: function() {
      this.serialBridge.on('listPortsRsp', this.onSerialBridgeListPortsRsp); 
      this.serialBridge.on('openRsp', this.onSerialBridgeOpenRsp); 
      this.serialBridge.on('closeRsp', this.onSerialBridgeCloseRsp);
      this.serialBridge.on('readLineRsp', this.onSerialBridgeReadLineRsp);
    },

  },

  mounted: function() {
    this.setupSerialBridge();
    this.startListPortsTimer();
  },

});

