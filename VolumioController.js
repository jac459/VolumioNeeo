//'use strict';
/*cd ///media/pi/USB-MUSIC/
find -name "*&*" -print0 | sort -rz | \
  while read -d $'\0' f; do mv -v "$f" "$(dirname "$f")/$(basename "${f//&/_}")"; done |
find -name "*'*" -print0 | sort -rz | \
  while read -d $'\0' f; do mv -v "$f" "$(dirname "$f")/$(basename "${f//\'/_}")"; done |
find -name "* *" -print0 | sort -rz | \
  while read -d $'\0' f; do mv -v "$f" "$(dirname "$f")/$(basename "${f// /_}")"; done
  

  */
const http = require('http.min');
const neeoapi = require('neeo-sdk');
const { exec } = require("child_process");
const volumioBaseUrl = 'http://volumio.local';
const MediaPlayer = require('./ChromeCastService.js')
const VolumioPlayer = require('./VolumioService.js')
const NAVIGATION_CHOICES = '**CHOICES**';
const NAVIGATION_ARTISTS = '**ARTISTS**';
const NAVIGATION_ARTIST_ALBUMS = '**ARTISTS_ALBUMS**';;
const NAVIGATION_TRACKS = '**TRACKS**';;
const NAVIGATION_PLAYLIST_TRACKS = '**PLAYLIST_TRACKS**';;
const NAVIGATION_ALBUMS = '**ALBUMS**';
const NAVIGATION_RADIOS_LIST = '**RADIOS_LIST**';
const NAVIGATION_SPOTIFY_LIST = '**SPOTIFY_LIST**';
const NAVIGATION_RADIO = '**RADIO**';
const NAVIGATION_PLAYLISTS = '**PLAYLISTS**';
const yamahaBaseURL = 'http://192.168.1.11:3000/store/';




function getURI (SourceURI) {
  return (musicServerBase + SourceURI.substring(23))
} 

function getTinyImage (Artist, Album) {
  if (Album != undefined) {
    console.log(encodeURI('http://volumio.local/tinyart/' + Artist.replace(/ /g, "_") + '/' + Album.replace(/ /g, "_") + '/large'))
    return (encodeURI('http://volumio.local/tinyart/' + Artist.replace(/ /g, "_") + '/' + Album.replace(/ /g, "_") + '/large'))}
  else {
    return (encodeURI('http://volumio.local/tinyart/' + Artist.replace(/ /g, "_") + '/large'))}
}

function formatLabel (trackTable) {

  return (trackTable.title + ' - ' 
    + trackTable.album + ' - ' 
    + trackTable.artist)
}

module.exports = function controller(IPChromecast, SnapCastID) {
  this.IPCast = IPChromecast;
  this.SnapCastID = SnapCastID;
  this.artistsList;
  this.currentArtist = 'artists://';
  this.currentAlbum = 'albums://';
  this.listNavigationPosition = NAVIGATION_CHOICES;
  this.albumsList;
  this.choicesList;
  this.radiosList;
  this.playlistsList;
  this.artistsCache = '';
  this.albumsCache = new Array();
  this.spotifyPlaylistCache = '';
  this.trackList;
  this.queue = new Array();
  this.queuePosition;
  this.currentPlayerState;
  this.actionDisplayTimeOut = null;
  this.currentTrackIterator;
  this.deviceId = 'default';
  this.progress = 0;
  var self = this;

  this.registerStateUpdateCallback = function(updateFunction) {
    self.sendComponentUpdate = updateFunction;
  };

  this.pause = function() {
    if (self.currentPlayerState == 2) {
      self.play();
    }
    else {
      self.currentPlayerState = 2;
      self.MyPlayer.Pause();
    }
  }

  this.stop = function() {
    self.currentPlayerState = 0;
    self.displayState(self.currentPlayerState, self.deviceId);
    self.MyPlayer.Stop();
  }

  this.resume = function() {
    self.currentPlayerState = 1;
    self.MyPlayer.Resume();
  }
  
  this.play = function() {
    self.currentPlayerState = 0;
     if (self.queue) {
      console.log('Play',self.queuePosition, self.queue[self.queuePosition])
      self.MyPlayer.Play(self.queue[self.queuePosition]);
      self.currentPlayerState = 1;
    } else {console.log('queue empty.')}
    self.displayState(self.currentPlayerState, self.deviceId);
  }
  // Initiating the actual Player
  console.log('chromecast : ' +IPChromecast);
  if (IPChromecast == null) {
    this.MyPlayer = new VolumioPlayer(self.SnapCastID);
  } else {
      this.MyPlayer = new MediaPlayer(IPChromecast);
  }
  this.browse = {
      getter: (deviceId, params) => this.fetchCollectionList(deviceId, params),
      action: (deviceId, params) => this.handleAction(deviceId, params),
  }
  this.browseQueue = {
    getter: (deviceId, params) => this.fetchQueueList(deviceId, params),
    action: (deviceId, params) => this.handleQueueAction(deviceId, params),
}
  this.browseAlbums = {
      getter: (deviceId, params) => this.fetchAlbumsList(deviceId, params),
      action: (deviceId, params) => this.handleSpotifyAction(deviceId, params),
  }
  this.browseRadios = {
    getter: (deviceId, params) => this.fetchRadiosList(deviceId, params),
    action: (deviceId, params) => this.handleAction(deviceId, params),
  }

this.MyPlayer.eventEmitter.on('stop', () => {console.log('player stopped')})
this.MyPlayer.eventEmitter.on('playEnd', () => {
      self.onButtonPressed('NEXT', self.deviceId);
})
this.MyPlayer.eventEmitter.on('playTime', (data) => {
  if (data) {
    //console.log('play :'+ data.percent );
    if (self.progress != data.percent) {
      self.sendComponentUpdate({uniqueDeviceId: self.deviceId,component: 'SeekSlider',value: data.percent})
      .catch( (err) => {console.log(err)}) 
      self.progress = data.percent;
      this.displayAction(1);
    }
  }
})

this.SeekSliderSet = function (deviceId, value) {
  self.MyPlayer.Seek(value);
}

this.SeekSliderGet = function (deviceId) {
 return self.progress;
}

this.getStatus = function () {}

this.returnSpotifyPlaylist = function (uri) {
  return new Promise(function (resolve, reject) {
    let myUri = 'spotify/playlists';
    if (uri) {myUri = uri}
    console.log(volumioBaseUrl + '/api/v1/browse?uri=' +myUri)
        http(volumioBaseUrl + '/api/v1/browse?uri=' + myUri)
          .then(function (result) {  //get all albums
            console.log(result.data)
            self.spotifyPlaylistCache = JSON.parse(result.data).navigation.lists[0].items;
              resolve(self.spotifyPlaylistCache);
           })
          .catch(function (err) {
              console.log(reject(err));
          })
  }) 
}

this.handleSpotifyAction = function(deviceId, params) {

  if (params.actionIdentifier != '|||') {
    self.queue = [self.spotifyPlaylistCache[Number(params.actionIdentifier)]];
   }
  else { //play all tracks
    self.queue = self.spotifyPlaylistCache;
  }
  self.queuePosition = 0;
  self.play();
  
}

this.returnAlbums = function () {
   return new Promise(function (resolve, reject) {
    if (self.albumsCache == '') {
      console.log('reloading list cache')
      http(volumioBaseUrl + '/api/v1/browse?uri=albums://')
      .then(function(result) {  //get all albums
        self.albumsCache = JSON.parse(result.data).navigation.lists[0].items;
      })
      .then (function () {
        resolve(self.albumsCache)})
      .catch(function(err) {
        console.log(reject(err));
      })
    }
    else {resolve(self.albumsCache)}
  })
}

this.returnArtistAlbums = function (theArtist) {
    return new Promise(function (resolve, reject) {
        
        if (self.albumsCache[theArtist] == undefined){
          http(volumioBaseUrl + '/api/v1/browse?uri=' + theArtist)
            .then(function (result) {  //get all albums
                self.albumsCache[theArtist] = JSON.parse(result.data).navigation.lists[0].items;
                resolve(self.albumsCache[theArtist]);
             })
            .catch(function (err) {
                reject(err);
            })
          }
        else {
          resolve(self.albumsCache[theArtist]);
        }
    }) 
}

this.fetchArtistAlbumsList = function (theArtist, offset) {
    return new Promise(function (resolve, reject) {
        let artistAlbums;
        self.returnArtistAlbums(theArtist)
            .then(function (result) { //create the list
                artistAlbums = result;
                self.albumsList = neeoapi.buildBrowseList({
                     title: 'theArtist',
                     totalMatchingItems: artistAlbums.length,
                     limit: 64,
                     offset: (offset || 0),
                     //browseIdentifier : ""
             })
            })
            .then(function () // populate the list
            {
              let albumsCorrectedUri = '';
                for (let i = (offset || 0); (i < ((offset || 0) + 64) && i < artistAlbums.length); i++) {
                    if (artistAlbums[i].uri.split('///')[1]) {//correct Volumio bug
                        albumsCorrectedUri = theArtist + '/' + artistAlbums[i].uri.split('///')[1]
                    }
                    else {
                      albumsCorrectedUri = artistAlbums[i].uri; 
                    }
                    console.log(artistAlbums[i].title + ' ' + artistAlbums[i].artist)
                   self.albumsList.addListItem({
                       title: artistAlbums[i].title,
                       label: artistAlbums[i].artist,
                       thumbnailUri: (volumioBaseUrl + artistAlbums[i].albumart),
                       //thumbnailUri: getTinyImage(artistAlbums[i].artist,artistAlbums[i].title),
                       browseIdentifier: NAVIGATION_TRACKS + '|||' + albumsCorrectedUri + '|||' + artistAlbums[i].albumart,
                        uiAction: 'reload'
                    })
                }
            })
            .then(function () {
                self.currentArtist = theArtist;
               resolve(self.albumsList)
             })
             .catch(function (err) {
                reject(err);
             })
    })
}

this.returnArtists = function () {
   return new Promise(function (resolve, reject) {
    if (self.artistsCache == '') {
      console.log('populating cache with volumio')
         http(volumioBaseUrl + '/api/v1/browse?uri=artists://')
            .then(function (result) {  //get all artists
                self.artistsCache = JSON.parse(result.data).navigation.lists[0].items;
            })
            .then(function () {
                resolve(self.artistsCache)
            })
            .catch(function (err) {
                console.log('Error while getting Artist' + err);
                reject(err);
            })
    }
      else { 
        console.log('cache populated')
     
        resolve(self.artistsCache) }
    })
}

this.fetchSpotifyList = function(deviceId, params) {
  return new Promise(function (resolve, reject) {
   console.log('try Spotify')
   if (!params.browseIdentifier) {
    self.returnSpotifyPlaylist()
        .then(function() {  //get the list]
          console.log(self.spotifyPlaylistCache.length)
  
          self.albumsList = neeoapi.buildBrowseList({
            title: 'Spotify Playlist',
            totalMatchingItems: self.spotifyPlaylistCache.length,
            limit: 64,
            offset: (params.offset||0),
            //browseIdentifier : ""
          })
        })
        .then (function () // populate the list
        {
          for (let i = (params.offset||0); (i<((params.offset||0)+64) && i<self.spotifyPlaylistCache.length); i++) 
          {
            console.log(self.spotifyPlaylistCache[i]);
              self.albumsList.addListItem({
                title : self.spotifyPlaylistCache[i].title, 
                label: self.spotifyPlaylistCache[i].artist, 
                thumbnailUri: self.spotifyPlaylistCache[i].albumart,
                browseIdentifier : self.spotifyPlaylistCache[i].uri,
                uiAction : 'reload'
              })
          }
        }) 
        .then (function () {
          resolve(self.albumsList)})
        .catch(function(err) {
          console.log(reject(err));
        })
      }
      else {
          console.log(params.browseIdentifier);
          self.returnSpotifyPlaylist(params.browseIdentifier)
        .then(function() {  //get the list]
          console.log(self.spotifyPlaylistCache.length)
  
          self.albumsList = neeoapi.buildBrowseList({
            title: 'Spotify Playlist',
            totalMatchingItems: self.spotifyPlaylistCache.length,
            limit: 64,
            offset: (params.offset||0),
            //browseIdentifier : ""
          })
        })
        .then (function () // populate the list
        {
          self.albumsList.addListItem({
          title : 'Play All Tracks', 
          actionIdentifier : '|||',
          uiAction : 'close' 
        })
          for (let i = (params.offset||0); (i<((params.offset||0)+64) && i<self.spotifyPlaylistCache.length); i++) 
          {
            console.log(self.spotifyPlaylistCache[i].albumart)
               self.albumsList.addListItem({
                title : self.spotifyPlaylistCache[i].title, 
                label: self.spotifyPlaylistCache[i].artist, 
                thumbnailUri: self.spotifyPlaylistCache[i].albumart,
                actionIdentifier : String(i),
                uiAction : 'close'
              })
          }
        }) 
        .then (function () {
          resolve(self.albumsList)})
        .catch(function(err) {
          console.log(err);
        })
      }

  })
}

this.fetchPlaylistsList = function(offset) {
  return new Promise(function (resolve, reject) {
    let thePlaylists;
     http(volumioBaseUrl + '/api/v1/browse?uri=playlists')
      .then(function (result) {  //get all playlists
        thePlaylists = JSON.parse(result.data).navigation.lists[0].items;
      })
      .then(function () { //create the list
       self.playlistsList = neeoapi.buildBrowseList({
             title: 'Playlists',
             totalMatchingItems: thePlaylists.length,
             limit: 64,
             offset: (offset || 0),
             //browseIdentifier : ""
     })
    })
    .then(function () // populate the list
    {
        for (let i = (offset || 0); (i < ((offset || 0) + 64) && i < thePlaylists.length); i++) {
           self.playlistsList.addListItem({
               title: thePlaylists[i].title,
               label: thePlaylists[i].service,
               thumbnailUri: yamahaBaseURL + 'ifavorites.jpg',
               browseIdentifier: NAVIGATION_PLAYLIST_TRACKS + '|||' + thePlaylists[i].uri,
               uiAction: 'reload'
             })
        }
    })
    .then(function () {
       resolve(self.playlistsList)
     })
     .catch(function (err) {
        reject(err);
     })
  })
}

this.fetchRadiosList = function(deviceId, params) {
  self.deviceId = deviceId;
  return new Promise(function (resolve, reject) {
    let theRadios;
     http(volumioBaseUrl + '/api/v1/browse?uri=radio/favourites')
      .then(function (result) {  //get all Radio
          theRadios = JSON.parse(result.data).navigation.lists[0].items;
      })
      .then(function () { //create the list
       self.radiosList = neeoapi.buildBrowseList({
             title: 'Radios',
             totalMatchingItems: theRadios.length,
             limit: 64,
             offset: (params.offset || 0),
             //browseIdentifier : ""
     })
    })
    .then(function () // populate the list
    {
        for (let i = (params.offset || 0); (i < ((params.offset || 0) + 64) && i < theRadios.length); i++) {
           self.radiosList.addListItem({
               title: theRadios[i].title,
               label: theRadios[i].service,
               thumbnailUri: yamahaBaseURL + 'iradio.jpg',
               actionIdentifier: NAVIGATION_RADIO + '|||' + theRadios[i].title + '|||' + theRadios[i].uri,
             })
        }
    })
    .then(function () {
       resolve(self.radiosList)
     })
     .catch(function (err) {
        reject(err);
     })
  })
}

this.fetchPlaylistTracksList = function (playListUri, offset) {
  return new Promise(function (resolve, reject) {
    let vTracks;
    http(volumioBaseUrl + '/api/v1/browse?uri=' + playListUri)
        .then(function (result) {
             vTracks = JSON.parse(result.data).navigation.lists[0].items;
        })
        .then(function () {
            self.trackList = neeoapi.buildBrowseList({
                title: 'Tracks',
                totalMatchingItems: vTracks.length,
                limit: 64,
                offset: offset || 0,
                //browseIdentifier : ""
            })
        })
        .then(function () {
            self.trackList.addListItem({
                title: 'Play All Tracks',
               // thumbnailUri: yamahaBaseURL + 'favorites.jpg',
                actionIdentifier: '**All**' + playListUri,
                //uiAction: 'close'
            })
            var iterator = 1;
            vTracks.forEach(element => {
                if (iterator < 64) {
                  self.trackList.addListItem({
                        title: element.title,
                        label: element.album + ' - ' + element.artist + ' - ' + element.trackType,
                        thumbnailUri: (volumioBaseUrl + element.albumart),
                        //hack to manage different URI encoding system in Volumio
                        actionIdentifier: element.uri.replace("mnt/NAS/MusicShareExt","music-library/NAS/MusicShareExt") + '|||' + (volumioBaseUrl + element.albumart),
                        //uiAction: 'reload'
                    })
                    iterator++;
                }
            })
        })
        .then(function () {
            resolve(self.trackList)
        })
        .catch(function (err) {
            console.log('Error while getting tracks: ' + err);
              reject(err);
        })
  })
}

this.fetchTracksList = function (deviceId, albumURI, albumArtUri) {
  return new Promise(function (resolve, reject) {
    let vTracks;
    http(volumioBaseUrl + '/api/v1/browse?uri=' + albumURI)
        .then(function (result) {
             vTracks = JSON.parse(result.data).navigation.lists[0].items;
        })
        .then(function () {
            self.trackList = neeoapi.buildBrowseList({
                title: 'Tracks',
                totalMatchingItems: vTracks.length,
                limit: 64,
                offset: 0,
                //browseIdentifier : ""
            })
        })
        .then(function () {
            self.trackList.addListItem({
                title: 'Play All Tracks',
                //thumbnailUri: yamahaBaseURL + 'albums.jpg',
                actionIdentifier: '**All**' + albumURI + '|||' + (volumioBaseUrl + albumArtUri), //mark the item and gives the album uri
                //uiAction: 'close'
            })
            var iterator = 1;
            vTracks.forEach(element => {
                 if (iterator < 64) {
                     self.trackList.addListItem({
                        title: element.title,
                        label: element.album + ' - ' + element.artist + ' - ' + element.trackType,
                        thumbnailUri: (volumioBaseUrl + albumArtUri),
                        actionIdentifier: element.uri + '|||' + (volumioBaseUrl + albumArtUri),
                        //uiAction: 'close'
                    })
                    iterator++;
                }
            })
        })
        .then(function () {
            resolve(self.trackList)
        })
        .catch(function (err) {
            console.log('Error while getting tracks: ' + err);
              reject(err);
        })
  })
}

this.fetchArtistsList = function (deviceId, offset) {
  return new Promise(function (resolve, reject) {
    self.returnArtists()
    .then(function () {
        self.artistsList = neeoapi.buildBrowseList({
          title: '',
          totalMatchingItems: self.artistsCache.length,
          limit: 64,
          offset: (offset || 0)
            //browseIdentifier : ""
        })
    })
    .then(function () // populate the list
    {
         for (let i = (offset || 0); (i < ((offset || 0) + 64) && i < self.artistsCache.length); i++) {
            self.artistsList.addListItem({
                title: self.artistsCache[i].title,
                label: 'Music Collection',
                //thumbnailUri: (volumioBaseUrl + self.artistsCache[i].albumart),
                thumbnailUri: getTinyImage(self.artistsCache[i].title),
                browseIdentifier: NAVIGATION_ARTIST_ALBUMS + '|||' + self.artistsCache[i].uri,
                uiAction: 'reload'
            })
        }
    })
    .then(function () {
        resolve(self.artistsList)
    })
    .catch(function (err) {
        reject(err);
    })
  })
}

this.fetchQueueList = function (deviceId, params) {
  return new Promise(function (resolve, reject) {
    let queueList = neeoapi.buildBrowseList({
      title: '',
      totalMatchingItems: self.queue.length,
      limit: 64,
      offset: (params.offset || 0)
        //browseIdentifier : ""
    })
    if (self.queue.length>0) {
      queueList.addListItem({
        title: 'clear current queue',
        actionIdentifier: 'CLEAR',
        uiAction: 'reload'
      })
    }
    for (let i = (params.offset || 0); (i < ((params.offset || 0) + 64) && i < self.queue.length); i++) {
      queueList.addListItem({
          title: self.queue[i].title,
          label: self.queue[i].album + ' - ' + self.queue[i].artists,
          thumbnailUri: self.queue[i].albumart,
          actionIdentifier: String(i),
          uiAction: 'close'
      })
    }
    resolve (queueList)
  })
} 

this.handleQueueAction = function(deviceId, params) {
  if (params.actionIdentifier == 'CLEAR') {
    self.queue = new Array();
    self.queuePosition = 0;
    self.stop();
  }
  else {
    self.queuePosition = Number(params.actionIdentifier);
    self.play();
  }
}

this.fetchChoicesList = function(deviceId, params) {
  self.deviceId = deviceId;
  return new Promise(function (resolve, reject) {
    self.choicesList = neeoapi.buildBrowseList({
      title: '',
      totalMatchingItems: 5,
      limit: 5,
      offset: 0
     })
    .addListItem({
        title: 'Artists',
        label: 'Private Collection FLAC 24-96 - MP3 320k',
        thumbnailUri: yamahaBaseURL + 'iartists.jpg',
        browseIdentifier: NAVIGATION_ARTISTS,
        uiAction: 'reload'
    })
    .addListItem({
      title: 'Albums',
      label: 'Private Collection FLAC 24-96 - MP3 320k',
      thumbnailUri: yamahaBaseURL + 'ialbums.jpg',
      browseIdentifier: NAVIGATION_ALBUMS,
      uiAction: 'reload'
      })
      .addListItem({
        title: 'Playlist',
        label: 'Private Collection FLAC 24-96 - MP3 320k',
        thumbnailUri: yamahaBaseURL + 'ifavorites.jpg',
        browseIdentifier: NAVIGATION_PLAYLISTS,
        uiAction: 'reload'
    })
    .addListItem({
          title: 'Radio',
          label: 'Web Radio Selection',
          thumbnailUri: yamahaBaseURL + 'iradio.jpg',
          browseIdentifier: NAVIGATION_RADIOS_LIST,
          uiAction: 'reload'
      })
      .addListItem({
        title: 'Spotify',
        label: 'Family playlists',
        thumbnailUri: yamahaBaseURL + 'ispotify.jpg',
        browseIdentifier: NAVIGATION_SPOTIFY_LIST,
        uiAction: 'reload'
      })
      .addListItem({
        title: 'Settings',
        label: 'Reset Volumio - Add tracks',
        thumbnailUri: yamahaBaseURL + 'settings.jpg',
        //browseIdentifier: NAVIGATION_ARTIST_ALBUMS + '|||' + self.artistsCache[i].uri,
        uiAction: 'reload'
      })
    resolve(self.choicesList);
  })
}

this.fetchCollectionList = function(deviceId, params) {
    self.deviceId = deviceId;
    console.log(params.browseIdentifier)
    return new Promise(function (resolve, reject) {
          if (params.browseIdentifier == '') { 
            if (self.listNavigationPosition == NAVIGATION_CHOICES) {
              self.fetchChoicesList(deviceId, params)
                .then (function () {
                  resolve(self.choicesList)
                })
                .catch(function(err) {console.log(err)});
            }
            else if ((self.listNavigationPosition == NAVIGATION_ARTISTS) 
              || (self.listNavigationPosition == NAVIGATION_ALBUMS)
              || (self.listNavigationPosition == NAVIGATION_PLAYLISTS)
              || (self.listNavigationPosition == NAVIGATION_RADIOS_LIST)
              || (self.listNavigationPosition == NAVIGATION_SPOTIFY_LIST)
              ) {
              self.listNavigationPosition = NAVIGATION_CHOICES;
              resolve(self.choicesList);
            }
            else if (self.listNavigationPosition == NAVIGATION_ARTIST_ALBUMS) {
              self.listNavigationPosition = NAVIGATION_ARTISTS;
              resolve(self.artistsList);
            }
            else if (self.listNavigationPosition == NAVIGATION_TRACKS) {
              self.listNavigationPosition = NAVIGATION_ARTIST_ALBUMS;
              resolve(self.albumsList);
            }
            else if (self.listNavigationPosition == NAVIGATION_PLAYLIST_TRACKS) {
              self.listNavigationPosition = NAVIGATION_PLAYLISTS;
              resolve(self.playlistsList);
            }
            else if (self.listNavigationPosition == NAVIGATION_RADIO) {
              self.listNavigationPosition = NAVIGATION_RADIOS_LIST;
              resolve(self.radiosList);
            } 
            else if (self.listNavigationPosition == NAVIGATION_ALBUMS) {
              if (params.offset>0) {
                self.fetchArtistAlbumsList('albums://', params.offset)
                .then(function () {
                  self.listNavigationPosition = NAVIGATION_ALBUMS;
                  resolve(self.albumsList)
                })
                .catch(function (err) {
                    reject(err);
                })
              }
              else {
                self.listNavigationPosition = NAVIGATION_CHOICES;
                resolve(self.choicesList);
              }
            }
          }
          else if (params.browseIdentifier == NAVIGATION_RADIOS_LIST) {
            self.fetchRadiosList(deviceId, params.offset)
              .then(function () {
                self.listNavigationPosition = params.browseIdentifier;
                resolve(self.radiosList);
              })
              .catch(function (err) {
                  reject(err);
              })
          }
          else if (params.browseIdentifier == NAVIGATION_SPOTIFY_LIST) {
            self.fetchSpotifyList(deviceId, params.offset)
              .then(function (data) {
                self.listNavigationPosition = params.browseIdentifier;
                resolve(data);
              })
              .catch(function (err) {
                  reject(err);
              })
          }
          else if (params.browseIdentifier == NAVIGATION_ARTISTS) {
            self.fetchArtistsList(deviceId, params.offset)
              .then(function () {
                self.listNavigationPosition = params.browseIdentifier;
                resolve(self.artistsList);
              })
              .catch(function (err) {
                  reject(err);
              })
          }
          else if (params.browseIdentifier == NAVIGATION_ALBUMS) {
            self.fetchArtistAlbumsList('albums://', params.offset)
            .then(function () {
              self.listNavigationPosition = params.browseIdentifier;
              resolve(self.albumsList)
            })
            .catch(function (err) {
                reject(err);
            })
          }
          else if (params.browseIdentifier == NAVIGATION_PLAYLISTS) {
            self.fetchPlaylistsList(params.offset)
            .then(function () {
              self.listNavigationPosition = params.browseIdentifier;
              resolve(self.playlistsList)
            })
            .catch(function (err) {
                reject(err);
            })
          }
          else if (params.browseIdentifier.split('|||')[0] == NAVIGATION_PLAYLIST_TRACKS) { //get playlists tracks
            self.fetchPlaylistTracksList(params.browseIdentifier.split('|||')[1], params.offset)
               .then(function (trackslist) {
                self.listNavigationPosition = NAVIGATION_PLAYLIST_TRACKS;
                resolve(trackslist);
              })
              .catch(function (err) {
                  reject(err);
              })
          }
          else if (params.browseIdentifier.split('|||')[0] == NAVIGATION_ARTIST_ALBUMS) { //get albums
             self.fetchArtistAlbumsList(params.browseIdentifier.split('|||')[1], params.offset)
                .then(function () {
                  self.listNavigationPosition = NAVIGATION_ARTIST_ALBUMS;
                  resolve(self.albumsList)
                })
                .catch(function (err) {
                    reject(err);
                })
          }
          else if (params.browseIdentifier.split('|||')[0] == NAVIGATION_TRACKS){ // get tracks
              
            self.fetchTracksList(deviceId, params.browseIdentifier.split('|||')[1], params.browseIdentifier.split('|||')[2])
              .then(function (tracksList) {
                self.listNavigationPosition = NAVIGATION_TRACKS;
                resolve(tracksList)
              })
              .catch(function (err) {
                  reject(err);
              })
          }  
    })
};

this.handleAction = function(deviceId, params) {
  let browseURL;
  let albumArtUri = '';
  if (params.actionIdentifier.split(NAVIGATION_RADIO)[1] != undefined) { //radio
    self.listNavigationPosition = NAVIGATION_RADIO;
    self.queuePosition = 0;
    self.queue = new Array();
     self.queue.push({
      uri: params.actionIdentifier.split('|||')[2],
      title: params.actionIdentifier.split('|||')[1],
      artists: 'Radio',
      album: 'Digital',
      service: 'webradio',
      type: 'webradio',
      albumart: yamahaBaseURL + 'iradio.jpg'
    })
    self.displayAction(1);//inform intent to play.
    self.play();
    self.currentPlayerState = 1;
  } 
  else {
    if (params.actionIdentifier.includes('**All**')) { //alltracks
     // self.listNavigationPosition = NAVIGATION_TRACKS;
     let uriTable = params.actionIdentifier.split('**All**')[1].split('|||');
      browseURL = volumioBaseUrl + '/api/v1/browse?uri=' + uriTable[0];
      if (uriTable.length>1) {albumArtUri = uriTable[1];}
    }
    else { // track
     // self.listNavigationPosition = NAVIGATION_TRACKS;
      //browseURL = volumioBaseUrl + '/api/v1/browse?uri=music-library/NAS/MusicShareExt' + params.actionIdentifier.split('|||')[0].split('MusicShareExt')[1];//UGLY to refactor,correction inconsistency uri between playlist and albums
      browseURL = volumioBaseUrl + '/api/v1/browse?uri=' + params.actionIdentifier.split('|||')[0]
      albumArtUri = params.actionIdentifier.split('|||')[1];
      console.log(browseURL);
    }
    http(encodeURI(browseURL))
      .then(function(result) {
        let queueTemp = JSON.parse(result.data).navigation.lists[0].items;
          queueTemp.forEach(element => {
            console.log(element.title);
            self.queue.push({
            uri: element.uri,
            title: element.title,
            artists: element.artist,
            album: element.album,
            type: element.type,
            tracknumber: element.tracknumber,
            duration: element.duration,
            trackType: element.trackType,
            albumart: albumArtUri
            })
         })
        if (self.currentPlayerState != 1){ // not already playing
          self.queuePosition = 0;
          self.displayAction(1);//inform intent to play.
          self.play();
        }
      }) 
    .catch((err) => {console.log('Error while trying to send play ' + browseURL+ ' Action :' + err)})  
  }
};

this.displayState = function (state) {
  let message = '';
  if (state == 0) { message = 'Player Stopped'}
  else if (self.queue[self.queuePosition]) { 
    message = 
    self.queue[self.queuePosition].title + ' - ' +
    self.queue[self.queuePosition].artists + ' - ' +
    self.queue[self.queuePosition].album + ' - ' +
    self.progress + '%'
  }
  else {message = 'Queue is empty, please choose a song'}
  
  self.sendComponentUpdate({uniqueDeviceId: self.deviceId,component: '.',value: message})
  .catch( (err) => {console.log(err)}) 
}
this.displayAction = function (action, value) {
  let message = '';
  if (action == 0) {// volume change
    for (let i = 0; i<100; i++) {
      if (i<value) { message = message + '||';} 
      else {if (i%3 == 0) {message = message + '--';}}
    }
    self.sendComponentUpdate({uniqueDeviceId: self.deviceId,component: '.',value: message})
    .catch( (err) => {console.log(err)}) 
  }
  //else if (action == 1) {
  //  message = 'Contacting playing device...'
  //}
  clearTimeout(self.actionDisplayTimeOut);
  self.actionDisplayTimeOut = setTimeout(() => {
    self.displayState(1);
  },2000)
}

this.onButtonPressed  = function(name, deviceId) {
    console.log(`[CONTROLLER] ${name} button pressed for device ${deviceId}`);
    self.deviceId = deviceId; //to initialise the device Id for the refresh function;
    if (name == "VOLUME UP") {
      self.MyPlayer.VolumeUp().then(function(result) { 
        console.log('result' + result)
        self.displayAction(0, result);
      })
      .catch( (err) => {console.log(err)}) 
    }
    if (name == "VOLUME DOWN") {
      self.MyPlayer.VolumeDown().then(function(result) { 
        console.log('result' + result)
        self.displayAction(0, result);
      })
      .catch( (err) => {console.log(err)}) 
    }
    else if (name == "STOP") {
      self.stop();
     }
     else if (name == "CURSOR ENTER") {
       /*if (self.currentPlayerState == 1) {self.pause();}
       else if (self.currentPlayerState == 2)  {self.resume()}
       else if (self.currentPlayerState == 0)  {self.play()}*/
       
      
     }
    else if (name == "MUTE TOGGLE") {
      self.MyPlayer.Mute()
    }
    else if (name == "PLAY") {
      self.displayAction(1);
      self.play();
    }
    else if (name == "NEXT") {
      if (self.queuePosition<self.queue.length) { self.queuePosition++; self.play();}
      else {self.onButtonPressed('STOP', deviceId);}
    }
    else if (name == "CURSOR LEFT") {
      self.onButtonPressed('PREVIOUS', deviceId);
    }
    else if (name == "PREVIOUS") {
      if (self.queuePosition>0) { self.queuePosition--; }
      self.play();
    }
    else if (name == "CURSOR RIGHT") {
      self.onButtonPressed('NEXT',deviceId);
    }
    

 

  }
}
