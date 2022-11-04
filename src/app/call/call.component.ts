import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.css'],
})
export class CallComponent implements OnInit, OnDestroy {
  peerConnection = new RTCPeerConnection(this.getRTCConfiguration());
  peerType: string;
  signalingChannel = new WebSocket(
    'wss://socketsbay.com/wss/v2/100/f9b5066412b5d042266ff9a20e60a0ae/'
  );

  constructor() {}

  ngOnInit() {
    this.listenSignalChannel(this.peerConnection);
  }

  onConnect() {
    this.checkPermissions().then(() => this.connect());
  }

  private checkPermissions(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  }

  private connect() {
    if (this.peerType === 'caller') {
      this.connectAsCaller(this.peerConnection);
    } else {
      this.connectAsCallee(this.peerConnection);
    }
  }

  private connectAsCaller(connection: RTCPeerConnection) {
    connection.oniceconnectionstatechange = console.log;
    connection.onsignalingstatechange = (event) => {
      console.log(event);
      connection.close();
    };
    connection.createOffer().then((offer) => {
      connection
        .setLocalDescription(offer)
        .then(() => this.signalingChannel.send(JSON.stringify({ offer })));
    });
  }

  private connectAsCallee(connection: RTCPeerConnection) {
    // connection.onicecandidate = console.log;
  }

  private generateAnswer(connection: RTCPeerConnection) {
    connection.createAnswer().then((answer) => {
      connection
        .setLocalDescription(answer)
        .then(() => this.signalingChannel.send(JSON.stringify({ answer })));
    });
  }

  private getRTCConfiguration(): RTCConfiguration {
    return {
      iceServers: this.getIceServers(),
    };
  }

  private getIceServers(): RTCIceServer[] {
    return [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ];
  }

  private listenSignalChannel(connection: RTCPeerConnection) {
    this.signalingChannel.addEventListener('message', (message: any) => {
      console.log('test', JSON.parse(message));
      if (message?.offer) {
        connection.setRemoteDescription(message.answer);
        this.generateAnswer(connection);
      }
      if (message?.answer) {
        connection.setRemoteDescription(message.answer);
      }
    });
  }

  sendOffer() {
    const connection = this.peerConnection;
    connection.createOffer().then((callerOffer) => {
      connection
        .setLocalDescription(callerOffer)
        .then(() =>
          this.signalingChannel.send(JSON.stringify({ offer: callerOffer }))
        );
    });
  }

  close() {
    this.peerConnection?.close();
  }

  ngOnDestroy() {
    this.close();
    this.signalingChannel?.close();
  }
}
