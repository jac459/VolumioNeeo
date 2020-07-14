//'use strict';
const http = require('http.min');
const yamahaService = require('../yamahaAV/yamahaService');
const yamahaAV = yamahaService.build();
var io = require('socket.io-client');
const volumioBaseUrl = 'http://volumio.local';
var events = require('events');
var currentVolume = 0;
var currentMute = true;
const SnapCastService = require('../snapcast-api-client-master/index.js');
//ID Focal-Zidoo: 59a6730f-a49f-4680-8a25-621796fe42b6
//ID TabS: 7a9ecb23-7efc-49b5-aa91-9648ae382935
//ID Mate 20: 69cead03-99c3-49bc-9905-d4664e2c4cd5
//ID: Volumio b8:27:eb:96:93:8d

////SNAPCAST
function emitConnection(conn) {
  console.log('EmitConnection: STUB'); 
} 

function getServerStatus(conn) {
  return conn.call('Server.GetStatus', [], function (err, result){
    let clients = [];
    if (conn) clients = result['server']['groups'];
    clients[0].clients.forEach(element => {
      console.log(element.id)
    })
      
     // Do a pubsub thing here to emit the groups
  })
}

function getVolume(conn, ID) {
  return new Promise(function (resolve, reject) {
    conn.call('Server.GetStatus', [], function (err, result){
      let clients = [];
      if (conn) clients = result['server']['groups'];
      clients[0].clients.forEach(element => {
        if (element.id == ID)
        {
             resolve(element.config.volume);
        }
      })
        
      // Do a pubsub thing here to emit the groups
    })
  })
}

function setClientVolume(conn, clientId, volume) {
  console.log('volume change')
  conn.call('Client.SetVolume', {id: clientId, volume: {percent: volume}}, function(err, result){
    console.log(err, result);
  });
}

function setClientMute(conn, clientId, muted) {
  conn.call('Client.SetVolume', {id: clientId, volume: {muted: muted}}, function(err, result){
    console.log(err, result);
  });
}
//////SNAPCAST END



module.exports = function Player(SnapCastID) {
  this.SnapCastID = SnapCastID
  this.PlayerStateInterval = null;
  this.socket = io.connect('http://volumio.local');
  this.eventEmitter = new events.EventEmitter(); 
  this.currentTrackDuration = 0;
  this.connection;
  var self = this;
  self.socket.removeAllListeners(); 
  this.Connect = function() {
    console.log('Initializing SnapCast Connection...')
    SnapCastService.socketClient.connectSocket(function (err, conn){
      console.log('Initiation fucntion returned...')
    
      if (err) {
        console.log('couldn\'t connect to SnapCast');
        console.log(err); 
      }
      if (conn) {self.connection = conn; console.log('connection to SnapCast successful')}
    })
  }
  self.Connect();
/*
  self.socket.on('pushState', function (data) {
     if (data.status == 'stop') {
      if (self.isPlaying) { 
          self.isPlaying = null;
          self.eventEmitter.emit('playEnd')
      }
    }
  })*/
 
  this.Play = function(playSong) { 
    console.log('play called with :' + playSong.uri)
    self.currentTrackDuration = playSong.duration;
    self.eventEmitter.emit('playTime', 0);
    clearInterval(self.PlayerStateInterval);
  //self.socket.emit('clearQueue', '');
    //self.socket.emit('addToQueue', {uri :playSong.uri});
        if (playSong)  {
          http.post(volumioBaseUrl + '/api/v1/replaceAndPlay', playSong)
            .then(function() {
              http(volumioBaseUrl + '/api/v1/commands/?cmd=play')
              .then(function () {
                setTimeout(() => { 
                  clearInterval(self.PlayerStateInterval);
                  self.PlayerStateInterval = setInterval(() => {
                    http(volumioBaseUrl + '/api/v1/getState').then(function (message) {
                      if (JSON.parse(message.data).status != 'play') {
                        clearInterval(self.PlayerStateInterval);
                        self.eventEmitter.emit('playEnd');
                      }
                      else {
                        self.currentTrackDuration = Number(JSON.parse(message.data).duration);
                        self.eventEmitter.emit('playTime', {
                          percent:Math.round(JSON.parse(message.data).seek/10/self.currentTrackDuration),
                        });
                      }
                    })
                   
                  }, 3000);
                }, 3000);
                
              })
              .catch(function(err) {
                console.log ('Error while trying to rest api play: ' + err)
              })
            })

          
        // self.socket.emit('play', '');
        } else {console.log('Nothing To Play')}
  }

  this.Seek = function (progress) {
    console.log(progress);
    console.log(self.currentTrackDuration);
    console.log(progress/100*self.currentTrackDuration);
    self.socket.emit('seek', Math.round(progress/100*self.currentTrackDuration))
  }

  this.Stop = function () {
   self.socket.emit('clearQueue', '');
   self.socket.emit('stop', '');
   clearInterval(self.PlayerStateInterval);
   /* http(volumioBaseUrl + '/api/v1/commands/?cmd=stop')
    .catch(function(result) {  
      console.log(result);
    })*/
  }
  this.Pause = function () {
    self.socket.emit('pause', '');
    /* http(volumioBaseUrl + '/api/v1/commands/?cmd=stop')
     .catch(function(result) {  
       console.log(result);
     })*/
   }
  this.Resume = function () {
    self.socket.emit('play', '');
    /* http(volumioBaseUrl + '/api/v1/commands/?cmd=stop')
     .catch(function(result) {  
       console.log(result);
     })*/
   }
  this.VolumeChange = function (valToChange) {
    /*let targetVolume = 0;
    return new Promise(function (resolve, reject) {
      yamahaAV.getVolume().then(function(currentVolume) {
        targetVolume = Number(currentVolume) + valToChange;
        yamahaAV.setVolume(targetVolume);
        console.log(Math.round(targetVolume/1.61));
        resolve(Math.round(targetVolume/1.61));
      })
    })*/
    return new Promise(function (resolve, reject) {
  
      currentVolume += valToChange;
      if (currentVolume>100) {currentVolume=100};
      if (currentVolume<0) {currentVolume=0};
        
          //emitConnection(conn);
          //getServerStatus(conn);
          if (self.connection == undefined) (self.Connect())
          setClientVolume(self.connection, self.SnapCastID, currentVolume);
          resolve(currentVolume);
          /*
          TODO: Handle change notifications
          TODO: When a connection is made, retrieve the state and 
                save it to an event store to be visualised
          TODO: Submit the state changes to an event store
          TODO: Move all the functions into modules
          TODO: migrate into a react native app
          TODO: Implement UI to control & view state
          */
          
          // Example group and client IDs - these would be detected
          // eventually.
          //const groupId = 'c2fb8e77-06f5-3f12-f458-50058378482a';
          //const clientId = '6c:40:08:ab:1d:5e';
    
          //setGroupMute(conn, groupId, true);
          //setClientVolume(conn, clientId, 50);
          //setClientMute(conn, clientId, true);
          //setClientName(conn, clientId, "Macbook Pro");
    /*
          setTimeout(function() {
            //setGroupMute(conn, groupId, false);
            //setClientVolume(conn, clientId, 100);
            //setClientMute(conn, clientId, false);
          }, 5000);*/
    })


  }

  this.Mute = function () {
    return new Promise(function (resolve, reject) {
      getVolume(self.connection, self.SnapCastID).then(function (volume) {
        setClientMute(self.connection, self.SnapCastID, !volume.muted);
          resolve(!volume.muted);
      })
    })
  
  }  


  this.VolumeUp = function () {
    return (self.VolumeChange(1));
  }  
  this.VolumeDown = function () {
    return (self.VolumeChange(-1));
  }  
}