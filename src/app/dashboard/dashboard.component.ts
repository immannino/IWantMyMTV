import { Component, OnDestroy, OnInit } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

import { AuthenticationService } from '../../lib/service/authentication/authentication.service';
import { AuthData } from '../../lib/service/authentication/authentication.model';
import { YoutubeService } from '../../lib/service/youtube/youtube.service';
import { YoutubeSearch } from '../../lib/service/youtube/youtube.model';
import { SpotifySong, SpotifyPlaylist, SpotifyUserProfile, UserSpotifyPlaylists, SpotifyPlaylistTracks, SpotifyPlaylistTrack, SimpleSpotifyTrack } from '../../lib/service/spotify/spotify.model';
import { DashboardPlaylist, PlaylistItem } from './dashboard.model';
import { SafeUrlPipe } from '../../lib/utils/safeurl.pipe';

import * as data from '../testdata.json';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';
import { SpotifyService } from '../../lib/service/spotify/spotify.service';
import { Router, NavigationStart, NavigationEnd, NavigationError, NavigationCancel } from '@angular/router';
import { EventListener } from '@angular/core/src/debug/debug_node';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  constructor(private authService: AuthenticationService, private youtubeService: YoutubeService, private spotifyService: SpotifyService, private sanitizer: DomSanitizer, private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
      } else if (event instanceof NavigationEnd) {
        if (!this.spotifyPlaylists) { this.getUserProfileInformation(); }
      } else if (event instanceof NavigationError) {
      } else if (event instanceof NavigationCancel) {
      }
    });
  }
  /**
   * Current data elements.
   */
  clientId: string = '';
  spotifyPlaylists: UserSpotifyPlaylists = null;
  currentSpotifyPlaylistSongs: SpotifyPlaylistTracks = null;
  currentPlayingSpotifySong: SimpleSpotifyTrack = null;
  userProfile: SpotifyUserProfile = null;
  selectedPlaylistIndex: number = -1;
  selectedTrackIndex: number = 0;
  player: YT.Player;
  private id: string = 'qDuKsiwS5xw';
  displayYoutubePlayer: boolean = false;
  isRandom: boolean = false;
  isRepeat: boolean = false;
  shuffleImgSrc: string = "./assets/shuffle.svg";
  repeatImgSrc: string = "./assets/repeat.svg";

  ngOnInit() {
    if (!localStorage.getItem('userAccessToken')) {
      this.router.navigate(['/login']);
    }
  }

  getUserProfileInformation() {
    this.spotifyService.getSpotifyUserProfile().subscribe((value) => {
      this.userProfile = value;
      /**
       * Prep the playlist variables.
       */
      this.spotifyPlaylists = new UserSpotifyPlaylists();
      this.spotifyPlaylists.items = new Array<SpotifyPlaylist>();

      // Get the users playlists.
      this.getUserPlaylists();

      // Get the users songs and make it the first 'playlist' in the list.
      this.getUserLibraryTracks();

    }, (error) => this.handleApiError(error), () => {});
  }

  /**
   * Initial request for user playlists.
   */
  getUserPlaylists() {
    this.spotifyService.getUserPlaylists(this.userProfile.id).subscribe((playlistData) => {
      this.spotifyPlaylists = playlistData;

      if (playlistData.next) this.userPlaylistPaginate(playlistData.next);
    }, (error) => this.handleApiError(error), () => {});
  }

  /**
   * Recursively make pagination calls to the spotify playlist api
   * while the user still has playlists to snag.
   * 
   * @param paginateUrl Url for the next set of playlists.
   */
  userPlaylistPaginate(paginateUrl: string) {
    this.spotifyService.getUserPlaylistPaginate(paginateUrl).subscribe((playlistData) => {
      for (let playlist of playlistData.items) {
        this.spotifyPlaylists.items.push(playlist);
      }
      if (playlistData.next) this.userPlaylistPaginate(playlistData.next);
    }, (error) => this.handleApiError(error), () => {})
  }

  getSpotifyPlaylistTracks(index: number) {
    this.spotifyService.getUserPlaylistTracks(this.spotifyPlaylists.items[index].id, this.spotifyPlaylists.items[index].owner.id).subscribe((playlistTracks) => {

      // Cache local tracks
      this.spotifyPlaylists.items[index].tracks_local = playlistTracks;

      // Set current list of songs in sidebar 
      this.currentSpotifyPlaylistSongs = playlistTracks;

      if (playlistTracks.next) this.getSpotifyPlaylistTracksPaginate(index, playlistTracks.next);
    }, (error) => this.handleApiError(error), () => {});
  }

  getSpotifyPlaylistTracksPaginate(index: number, paginateUrl: string) {
    this.spotifyService.getUserPlaylistTracksPaginate(paginateUrl).subscribe((playlistTracks) => {
      for (let playlistTrack of playlistTracks.items) {

        /**asdasd
         * Try and remember the logic for caching
         * 
         * Need to spend more time on this, but this has seemed to fix the doubling up of list paginated items. /shrug.
         */
        this.spotifyPlaylists.items[index].tracks_local.items.push(playlistTrack);
        // this.currentSpotifyPlaylistSongs.items.push(playlistTrack);
      }

      if (playlistTracks.next) this.getSpotifyPlaylistTracksPaginate(index, playlistTracks.next);
    }, (error) => this.handleApiError(error), () => {})
  }

  getUserLibraryTracks() {
    this.spotifyService.getUserLibrarySongs().subscribe((libraryTracks) => {
      let tempLocalPlaylists: SpotifyPlaylist = new SpotifyPlaylist();
      tempLocalPlaylists.name = "User Library Songs";
      let index: number = 0;
      // tempLocalPlaylists.tracks = libraryTracks; 
      tempLocalPlaylists.tracks_local = libraryTracks;

      // Cache local tracks && Make user lib songs first element.
      this.spotifyPlaylists.items.unshift(tempLocalPlaylists);

      if (libraryTracks.next) this.getUserLibraryTracksPaginate(index, libraryTracks.next);
    }, (error) => this.handleApiError(error), () => {});
  }

  getUserLibraryTracksPaginate(index: number, paginateUrl: string) {
    this.spotifyService.getUserLibrarySongsPaginate(paginateUrl).subscribe((libraryTracks) => {
      for (let libraryTrack of libraryTracks.items) {
        this.spotifyPlaylists.items[index].tracks_local.items.push(libraryTrack);
      }

      if (libraryTracks.next) this.getUserLibraryTracksPaginate(index, libraryTracks.next);
    }, (error) => this.handleApiError(error), () => {})
  }

  expandPlaylist(index: number) {
    // check whether tracks have been loaded or not for this playlist
    if (this.spotifyPlaylists.items[index].tracks_local) {
      this.currentSpotifyPlaylistSongs = this.spotifyPlaylists.items[index].tracks_local;
    } else {
      this.getSpotifyPlaylistTracks(index);
    }

    // If the user wants to collapse the same playlist they just opened.
    if (this.selectedPlaylistIndex === index) {
      this.selectedPlaylistIndex = -1;
    } else {
      this.selectedPlaylistIndex = index;
    }
  }

  playCurrentSong(index: number) {
    let cachedVideoId = this.getCachedVideoId(index);

    this.selectedTrackIndex = index;

    if (cachedVideoId) {
      this.setCurrentVideoPlayer(index);
      this.setVideoPlayerSong(cachedVideoId);
    } else {
      this.getYoutubeVideoForSong(index);
    }
  }

  getYoutubeVideoForSong(index: number) {
    let tempSong: SpotifySong = new SpotifySong(this.currentSpotifyPlaylistSongs.items[index].track.artists[0].name,
      this.currentSpotifyPlaylistSongs.items[index].track.name);

    return this.youtubeService.searchYoutube(tempSong).subscribe((response) => {
      let videoId = response.items[0].id.videoId;
      let youtubeUrl = this.getSingleSongYoutubeVideoUrl(videoId);

      this.spotifyPlaylists.items[this.selectedPlaylistIndex].tracks_local.items[index].youtubeVideoId = videoId;
      this.setCurrentVideoPlayer(index);

      if (this.displayYoutubePlayer) {
        this.setVideoPlayerSong(videoId);
      } else {
        this.id = videoId;
        this.displayYoutubePlayer = true;
      }
    }, (error) => this.handleApiError(error), () => {});
  }

  /**
   * Confusing name need to refactor BUT
   * This method sets the "Current playing song" info below the playlists. 
   * 
   * @param index Index of selected song from a playlist
   */
  setCurrentVideoPlayer(index: number) {
    if (!this.currentPlayingSpotifySong) this.currentPlayingSpotifySong = new SimpleSpotifyTrack();

    this.currentPlayingSpotifySong = this.spotifyPlaylists.items[this.selectedPlaylistIndex].tracks_local.items[index].track;
  }

  /**
   * Depricated: 
   * Used to build the iframe url to be pased into an iframe. All functionality since has been replaced by youtube-player lib.
   * 
   * @param youtubeVideoId 
   */
  getSingleSongYoutubeVideoUrl(youtubeVideoId: string): string {
    return "https://www.youtube.com/embed/" + youtubeVideoId + '?autoplay=1';
  }

  /**
   * Checks local cache if songs exist for that playlist.
   *  
   * @param index index of song to be checked.
   */
  getCachedVideoId(index: number): string {
    return this.spotifyPlaylists.items[this.selectedPlaylistIndex].tracks_local.items[index].youtubeVideoId;
  }

  /**
   * Used by the previous and next buttons to change what song to play. 
   * 
   * @param changeValue 1 or -1
   */
  changeCurrentSong(changeValue: number) {
    if ((this.selectedTrackIndex + changeValue) >= 0 && (this.selectedTrackIndex <= this.currentSpotifyPlaylistSongs.items.length - 1)) {
      // if last song in playlist, make sure that it can't try and exceed playlist length.
      if (((this.selectedTrackIndex === this.currentSpotifyPlaylistSongs.items.length - 1) && changeValue == 1 && (this.isRepeat))) {
        this.playCurrentSong(0);
      } else {
        if (this.isRandom) {
          changeValue = Math.round(Math.random() * (this.currentSpotifyPlaylistSongs.items.length - 1));
        } else {
          changeValue = this.selectedTrackIndex + changeValue;
        }

        this.playCurrentSong(changeValue);
      }
    } else {
      if (this.isRepeat && this.selectedTrackIndex == 0) {
        this.playCurrentSong(this.currentSpotifyPlaylistSongs.items.length - 1);
      }
    }
  }

  /**
   * Sets what video is playing in the YT player. 
   * 
   * @param videoId Video to play. 
   */
  setVideoPlayerSong(videoId: string) {
    this.id = videoId;
    this.player.loadVideoById(videoId);
    this.player.playVideo();
  }

  /** 
   * Strictly used for testing. Will delete at some point.
   * Takes in some json test data.
  */
  getTestData(): Array<SpotifySong> {
    let testData: Array<SpotifySong> = new Array<SpotifySong>();
    let tempSong: SpotifySong = null;

    for (let song of (<any>data)) {
      tempSong = new SpotifySong();
      tempSong.artist = song['artist'];
      tempSong.song = song['song'];
      testData.push(tempSong);
    }

    return testData;
  }

  /**
   * Handles setting the Youtube Player as a callback from the lib factory.
   * 
   * @param player The YoutubePlayer singleton. 
   */
  savePlayer(player) {
    this.player = player;
    this.displayYoutubePlayer = true;
    this.player.playVideo();
  }

  /**
   * Handles events that change from the YT Player. 
   * 
   * @param event Youtube Player event status codes.
   */
  onStateChange(event) {
    switch(event.data) {
      case 0: // Status: ended
        this.changeCurrentSong(1);
        break;
      case 1: // Status: playing
      case 2: // Status: paused
      case 3: // Status: buffering
      case 5: // Status: video cued
      default:

    }
  }

  handleApiError(error: any) {
    if (error) {
      switch (error.status) {
        case 401:
          this.router.navigate(['/login']);
          break;
        default:
          //someting
      }
    }
  }

  setShuffleFlag() {
    if (this.isRandom) {
      this.shuffleImgSrc = "./assets/shuffle.svg";
    } else {
      this.shuffleImgSrc = "./assets/shuffle-green.svg"
    }

    this.isRandom = !this.isRandom;
  }

  setRepeatFlag() {
    if (this.isRepeat) {
      this.repeatImgSrc = "./assets/repeat.svg";
    } else {
      this.repeatImgSrc = "./assets/repeat-green.svg"
    }

    this.isRepeat = !this.isRepeat;
  }
  /** 
   * Cleans up user app cache.
   */
  ngOnDestroy() {
    localStorage.clear();
    localStorage.setItem("auth_error", "true");
  }
}
