//'use strict';
const { exec } = require("child_process");
const musicServerBase1 = '//media/pi/USB-MUSIC/';
const musicServerBase2 = '//media/pi/ESD-USB/';
var events = require('events');

function redirectURI (SourceURI) {
  let cleanedString = SourceURI.split(" ").join(" ");
//  return (musicServerBase + cleanedString.substring(31))
  if (cleanedString.includes('MusicShareExt')) {
    return (musicServerBase1 + cleanedString.split("MusicShareExt")[1])
  }
  else if (cleanedString.includes('MusicShare')) {
    return (musicServerBase2  + cleanedString.split("MusicShare")[1])
  }
}

module.exports = function Player(IPPlayer) {
  this.IPChromeCast = IPPlayer;
  this.PlayerStateInterval = null;
  this.currentTrackDuration = 0;
  this.eventEmitter = new events.EventEmitter(); 
  var self = this; 
   
  this.Play = function(playUrl) {
      clearInterval(self.PlayerStateInterval);
      if (playUrl.service != undefined) { //radio
        exec('catt -d '+ self.IPChromeCast+ ' cast_site ' + decodeURIComponent(playUrl.uri), (err, data) => {
          console.log('Play Info : ' + data + 'Error : ' + err)
        })
      }
      else { //collection
        self.currentTrackDuration = playUrl.duration;
        self.eventEmitter.emit('playTime', 0);
        exec('catt -d '+ self.IPChromeCast+ ' cast \"' + redirectURI(playUrl.uri) + '\"', (err, data) => {
          console.log('Play Info : ' + err + data)
        })
        setTimeout(() => {   
          self.PlayerStateInterval = setInterval(() => {
            exec('catt -d '+ self.IPChromeCast+ ' status', (err, data) => {
               if (data == '') {
                console.log('connecting')
              } 
              else 
              {
                if (!data.includes('State: PLAYING'))
                {
                  self.eventEmitter.emit('playEnd')
                  clearInterval(self.PlayerStateInterval);
                } 
                else {
                  if (data.includes('Time: ')) {
                    let timingSpotString = data.split('Time: ')[1].split(' / ')[0];
                    let timingSpot = 3600*Number(timingSpotString.split(':')[0])
                      + 60*Number(timingSpotString.split(':')[1])
                      + Number(timingSpotString.split(':')[2]);
                    
                    // self.eventEmitter.emit('playEnd')
                    let timingFullString = data.split('Time: ')[1].split(' / ')[1].split(' (')[0];
                    self.currentTrackDuration = 3600*Number(timingFullString.split(':')[0])
                      + 60*Number(timingFullString.split(':')[1])
                      + Number(timingFullString.split(':')[2]);
                    self.eventEmitter.emit('playTime', {
                        percent:Math.round(timingSpot*100/self.currentTrackDuration),
                      });
                  }
                }
              }
              
            });
          }, 3000);
      }, 3000);
    }
  }

  this.Seek = function (progress) {
    console.log(progress)
    console.log(progress/100*self.currentTrackDuration)
    exec('catt -d '+ self.IPChromeCast+ ' seek ' + Math.round(progress/100*self.currentTrackDuration), (err, data) => {console.log(err + data)});
  }

  this.Stop = function () {
    clearInterval(self.PlayerStateInterval);
    exec('catt -d '+ self.IPChromeCast+ ' stop', (err, data) => {console.log('stopping: ' + err + data)});
  }

  this.VolumeUp = function () {
    return self.Volume('volumeStepUp');
   }
  this.VolumeDown = function () {
    return self.Volume('volumeStepDown');
  }

  this.Volume = function (command) {
    return new Promise(function (resolve, reject) {
      
      exec('chromecast -H '+ self.IPChromeCast + ' ' + command + ' 0.03', function (error, stdout, stderr) {
        if (!stderr && !error) {
          resolve(Math.round(stdout.split('level: ')[1].split(',')[0]*100));
        }
        else {reject ('error : ' + stderr + error)}
    })
  })  
}}