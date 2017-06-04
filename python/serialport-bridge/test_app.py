from __future__ import print_function
import serial
import serial.tools.list_ports
import eventlet
#eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO
from flask_socketio import emit, send
from flask import request
from flask import g

import json
import math

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)


class SerialBridge(serial.Serial):

    def __init__(self,*arg,**kwargs):
        super(SerialBridge,self).__init__(*arg,**kwargs)


serial_bridge = None


@app.route('/')
def info():
    return render_template('index.html')


@socketio.on('connect')
def on_connect():
    print('connected')


@socketio.on('listPorts')
def on_list_ports(): 
    print('on_list_ports')
    list_of_ports = serial.tools.list_ports.comports() 
    rsp = [] 
    for port in list_of_ports:
        port_dict = {
                'device': port.device,
                'name': port.name,
                'vid': port.vid,
                'pid': port.pid,
                'product': port.product,
                'manufacturer': port.manufacturer,
                'description': port.description,
                'success' : True,
                }
        rsp.append(port_dict)
    print(rsp)
    emit('listPortsRsp', rsp)
    emit('info',{'listPorts': {'rsp': rsp}},broadcast=True)


@socketio.on('open')
def on_open(msg):
    global serial_bridge
    print('on_open')
    port = msg['port']
    options = msg['options']
    serial_bridge = SerialBridge(port,**options)
    rsp = {'success': serial_bridge.isOpen()}
    emit('openRsp', rsp);
    emit('info', {'openRsp': {'msg': msg, 'rsp': rsp}}, broadcast=True)


@socketio.on('close')
def on_close(): 
    global serial_bridge
    serial_bridge = None
    is_open = False
    rsp = {'success': True}
    emit('closeRsp', rsp);
    emit('info', {'closeRsp': {'rsp': rsp}},broadcast=True)


@socketio.on('writeReadLine')
def on_write_read_line(msg):
    global serial_bridge
    print('on_write_read_line')
    line_ascii = msg['line'].encode('ascii','ignore')
    serial_bridge.write(line_ascii+'\n')
    rsp_line = serial_bridge.readline()
    rsp_line = rsp_line.strip()
    rsp = {'tag': msg['tag'], 'line': rsp_line}
    emit('readLineRsp', rsp);
    emit('info', {'writeReadLineRsp': {'msg': msg, 'rsp': rsp}},broadcast=True)


if __name__ == '__main__':

    socketio.run(app)
