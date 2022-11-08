import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.css'],
})
export class CallComponent implements OnInit, OnDestroy {
  peerConnection: RTCPeerConnection;
  peerType: string;
  localStream: MediaStream;
  signalingChannel = new WebSocket(
    'wss://socketsbay.com/wss/v2/100/f9b5066412b5d042266ff9a20e60a0ae/'
  );
  private trackEventListener;

  @ViewChild('audioElement', { read: ElementRef })
  private audioElement: ElementRef;

  constructor() {}

  ngOnInit() {}

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
    this.getOffer(connection).then((offer) =>
      this.signalingChannel.send(
        JSON.stringify({
          type: 'SDP_OFFER',
          value: offer,
        })
      )
    );
  }

  private connectAsCallee(connection: RTCPeerConnection) {
    this.getAnswer(connection)
      .then(
        (answer) =>
          this.signalingChannel.send(
            JSON.stringify({
              type: 'SDP_ANSWER',
              value: answer,
            })
          ),
        (error) => {}
      )
      .catch(() => {
        this.signalingChannel.send(JSON.stringify({ type: 'REQUEST_OFFER' }));
      });
  }

  private async getOffer(
    connection: RTCPeerConnection
  ): Promise<RTCSessionDescriptionInit> {
    if (connection.pendingLocalDescription) {
      const offer = await connection.createOffer();
      connection.setLocalDescription(offer);
      return offer;
    } else {
      return connection.localDescription;
    }
  }

  private async getAnswer(
    connection: RTCPeerConnection
  ): Promise<RTCSessionDescriptionInit> {
    if (connection.pendingLocalDescription) {
      const answer = await connection.createAnswer();
      connection.setLocalDescription(answer);
      return answer;
    } else {
      return connection.localDescription;
    }
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
      const messageResponse = JSON.parse(message.data);
      console.log('signal received => ', messageResponse?.type);
      switch (messageResponse?.type) {
        case 'SDP_OFFER':
          connection.setRemoteDescription(messageResponse?.value);
          this.getAnswer(connection);
          break;
        case 'SDP_ANSWER':
          connection.setRemoteDescription(messageResponse?.value);
          break;
        case 'REQUEST_OFFER':
          this.getOffer(connection).then((offer) =>
            this.signalingChannel.send(
              JSON.stringify({
                type: 'SDP_OFFER',
                value: offer,
              })
            )
          );
          break;
        case 'REQUEST_ANSWER':
          this.getAnswer(connection).then((answer) =>
            this.signalingChannel.send(
              JSON.stringify({
                type: 'SDP_ANSWER',
                value: answer,
              })
            )
          );
          break;
      }
    });
  }

  close() {
    this.peerConnection?.removeEventListener('track', this.trackEventListener);
    this.peerConnection?.close();
    this.peerConnection = null;
  }

  onStart() {
    this.peerConnection = new RTCPeerConnection(this.getRTCConfiguration());
    this.listenSignalChannel(this.peerConnection);
    this.listenToTrackEvent(this.peerConnection);
    this.connect();
  }

  async onCall() {
    this.localStream = await this.getUserMedia();
    this.localStream
      .getTracks()
      .forEach((track) =>
        this.peerConnection.addTrack(track, this.localStream)
      );
  }

  private listenToTrackEvent(connection: RTCPeerConnection) {
    this.trackEventListener = connection.addEventListener(
      'track',
      (event: RTCTrackEvent) => {
        const [remoteStream] = event.streams;
        const remoteAudio: HTMLAudioElement = this.audioElement.nativeElement;
        remoteAudio.srcObject = remoteStream;
      }
    );
  }

  onEnd() {
    this.close();
  }

  ngOnDestroy() {
    this.close();
    this.signalingChannel?.close();
  }
}
