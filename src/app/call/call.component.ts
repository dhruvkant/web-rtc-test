import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.css'],
})
export class CallComponent implements OnInit, OnDestroy {
  peerConnection = new RTCPeerConnection(this.getRTCConfiguration());
  audioContext = new AudioContext();
  peerType: string;
  localStream: MediaStream;
  signalingChannel = new WebSocket(
    'wss://socketsbay.com/wss/v2/100/f9b5066412b5d042266ff9a20e60a0ae/'
  );

  constructor() {}

  ngOnInit() {
    this.listenSignalChannel(this.peerConnection);
  }

  async onConnect() {
    this.localStream = await this.getUserMedia();
    this.peerConnection.addTrack(
      this.localStream.getAudioTracks()[0],
      this.localStream
    );
    this.connect();
  }

  private getUserMedia(): Promise<MediaStream> {
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
    connection.createOffer().then((offer) => {
      connection
        .setLocalDescription(offer)
        .then(() => this.signalingChannel.send(JSON.stringify({ offer })));
    });
  }

  private connectAsCallee(connection: RTCPeerConnection) {
    // connection.onicecandidate = console.log;
    connection.addEventListener('track', (event: RTCTrackEvent) => {
      console.log('received event', event);
      const [remoteStream] = event.streams;
      const source = this.audioContext.createMediaStreamSource(remoteStream);
      source.connect(this.audioContext.destination);
      // const remoteVideo: HTMLVideoElement =
      //   document.querySelector('#videoElement');
      // remoteVideo.srcObject = remoteStream;
    });
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
      const data = JSON.parse(message.data);
      if (data?.offer) {
        connection.setRemoteDescription(data.offer);
        this.generateAnswer(connection);
      }
      if (data?.answer) {
        connection.setRemoteDescription(data.answer);
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
