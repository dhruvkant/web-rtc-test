import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.css'],
})
export class CallComponent implements OnInit, OnDestroy {
  private peerConnection: RTCPeerConnection;

  peerType: string;
  signalingChannel = new WebSocket(
    'wss://socketsbay.com/wss/v2/100/f9b5066412b5d042266ff9a20e60a0ae/'
  );

  constructor() {}

  ngOnInit() {}

  onConnect() {
    this.checkPermissions().then(() => this.createConnection());
  }

  private checkPermissions(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  }

  private createConnection() {
    this.peerConnection = new RTCPeerConnection(this.getRTCConfiguration());
    this.listenSignalChannel(this.peerConnection);
    if (this.peerType === 'caller') {
      this.connectAsCaller(this.peerConnection);
    } else {
      this.connectAsCallee(this.peerConnection);
    }
  }

  private connectAsCaller(connection: RTCPeerConnection) {
    connection.onicecandidate = console.log;
    connection.createOffer().then((callerOffer) => {
      connection
        .setLocalDescription(callerOffer)
        .then((description) =>
          this.signalingChannel.send(JSON.stringify({ offer: description }))
        );
    });
  }

  private connectAsCallee(connection: RTCPeerConnection) {
    connection.onicecandidate = console.log;
    connection.createAnswer().then((answer) => {
      connection
        .setLocalDescription(answer)
        .then((description) =>
          this.signalingChannel.send(JSON.stringify({ answer: description }))
        );
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
      console.log(message);
      if (message?.offer) {
        connection.setRemoteDescription(message.answer);
      }
      if (message?.answer) {
        connection.setRemoteDescription(message.answer);
      }
    });
  }

  ngOnDestroy() {
    this.peerConnection?.close();
    this.signalingChannel?.close();
  }
}
