"use strict"; 
const io = require('socket.io-client');
const ip = require('ip');
const Vue = require('vue/dist/vue.common');
const Vuetify = require('vuetify').default;
const _ = require('lodash');
const server_config = require('./server_config');

const STATUS_UNCONNECTED = {connected: false, portName: '---', baudRate: '---'};

Vue.use(Vuetify);

var app = new Vue({

  el: '#app',

  data: {
    socket: null, 
    ports: [],
    listPortsDt: 2000,
    messages: [],
    maxMessages: 25,
    clients: [],
    connectionStatus: STATUS_UNCONNECTED, 
    serverInfo: null,
    activeTab: 'Bridge Server',
    tabs: ['Bridge Server', 'Serial Ports', 'Messages'],
    vuetifyLocation: '../node_modules/vuetify/dist/vuetify.min.css' 
  },

  methods: {

    setupListPortsTimer: function() {
      setInterval( () => {
        //console.log('listPorts');
        this.socket.emit('listPorts');
      }, this.listPortsDt);
    },

    setupSocket: function() {

      let promise = new Promise( (resolve,reject) => {

        let socket = io.connect('http://' + '127.0.0.1' + ':' + server_config.port);

        socket.on('error', (error) => {
          console.log('socket error: ' + error);
        });

        socket.on('info', (data) => {
          this.messages.unshift(data);
          //console.log(this.messages.length);
          //console.log(this.maxMessages)
          if (this.messages.length > this.maxMessages) {
            this.messages.pop();
          }
          //console.log(data);
        });

        socket.on('openRsp', (data) => {
          this.connectionStatus = {connected: true};
          Object.assign(this.connectionStatus,data.serialPortInfo);
        });

        socket.on('closeRsp', (data) => {
          this.connectionStatus = STATUS_UNCONNECTED;

        });

        socket.on('clients', (data) => {
          this.clients = data;
        });

        socket.on('serverInfo', (data) => {
          this.serverInfo = data;
        });

        socket.on('listPortsRsp', (data) => {
          //console.log('listPortsRsp');
          //console.log(data);
          if (data.success) {
            this.ports = data.ports;
          } else {
            this.ports = [];
          }
        });

        resolve(socket);

      });

      return promise;
    }, 

    capitalize: function(value) {
      return _.capitalize(value);
    },

    filterLocalhost: function(value) {
      if (value === '127.0.0.1') {
        return 'localhost';
      } else {
        return value;
      }
    },

    portAvailableHeaders: function() {
      let headers = [
        {text: '#', value: 'number', sortable: false, align: 'left' },
        {text: 'Device', value: 'device', sortable: false, align: 'right'},
        {text: 'Manufacturer', value: 'manufacturer', sortable: false, align: 'right'},
        {text: 'VID', value: 'vid', sortable: false, align: 'right'},
        {text: 'PID', value: 'pid', sortable: false, align: 'right'},
        {text: 'Serial #', value: 'serialNumber', sortable: false, align: 'right'},
      ];
      return headers;
    },

    portAvailableItems: function() {
      let itemArray = [];
      for (let index=0; index<this.ports.length; index++) {
        let info = this.ports[index];
        let portItem = {
          number: index,
          device: info.device,
          name: info.name,
          manufacturer: info.manufacturer,
          vid: info.vid,
          pid: info.pid,
          serialNumber: info.serialNumber,
        };
        itemArray.push(portItem)
      }
      return itemArray;
    },

    portAvailableSpanClass: function(item) {
      if (item.device === this.connectionStatus.portName) {
        return 'pink--text';
      } else {
        return '';
      }
    },

    portStatusHeaders: function() {
      let headers = [
        {text: 'Connected', value: 'connected', sortable: false, align: 'left',},
        {text: 'Device', value: 'device', sortable: false, align: 'right'},
        {text: 'Baudrate', value: 'baudrate', sortable: false, align: 'right'},
      ];
      return headers;

    },

    portStatusItems: function() {
      let itemArray = [
        {
          connected: this.connectionStatus.connected,
          device: this.connectionStatus.portName,
          baudrate: this.connectionStatus.baudRate,
        }
      ];
      return itemArray;
    },

    portStatusSpanClass: function() {
      if (this.connectionStatus.connected) {
        return 'pink--text';
      } else {
        return '';
      }
    },

    messageItems: function() {
      let items = [];
      for (let i=0; i<this.messages.length; i++) {
        items.push({index: i, value: this.messages[i]});
      }
      return items;
    },


  },

  mounted: function() {
    console.log('mounted');
    this.setupSocket().then((socket) => {
      //console.log('socket setup');
      this.socket = socket;
      this.setupListPortsTimer();
    });
  },

});
