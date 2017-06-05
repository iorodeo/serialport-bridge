"use strict"; 

var app = new Vue({

  el: '#app',
  delimiters: ['[[', ']]'],
  data: {
    socket: null, 
    ports: [],
    listPortsDt: 2000,
    messages: [],
    maxMessages: 25,
    clients: [],
    connectionStatus: {
      connected: false,
      port: '--',
      baudRate: '--',
      writeCount: 0,
      readCount: 0,
    },
  },

  methods: {

    setupListPortsTimer: function() {
      setInterval( () => {
        console.log('listPorts');
        //this.socket.emit('listPorts',{noInfo: true});
        this.socket.emit('listPorts');
      }, this.listPortsDt);
    },

    setupSocket: function() {

      let promise = new Promise( (resolve,reject) => {

        let socket = io.connect('http://' + document.domain + ':' + location.port);

        socket.on('info', (data) => {
          this.messages.unshift(data);
          console.log(this.messages.length);
          console.log(this.maxMessages)
          if (this.messages.length > this.maxMessages) {
            this.messages.pop();
          }
          console.log(data);
        });

        socket.on('clients', (data) => {
          this.clients = data;
        });

        socket.on('listPortsRsp', (data) => {
          console.log('listPortsRsp');
          console.log(data);
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


  },

  mounted: function() {
    this.setupSocket().then((socket) => {
      console.log('socket setup');
      this.socket = socket;
      this.setupListPortsTimer();
    });
  },

});