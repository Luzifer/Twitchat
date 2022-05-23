import store from "@/store";
import { reactive } from "vue";
import Config from "./Config";
import PublicAPI from "./PublicAPI";
import TwitchatEvent from "./TwitchatEvent";

/**
* Created : 23/05/2022 
*/
export default class SpotifyHelper {
	
	public isPlaying:boolean = false;
	public currentTrack!:SpotifyTrack;

	private static _instance:SpotifyHelper;
	private _token!:SpotifyAuthToken;
	private _refreshTimeout!:number;
	private _getTrackTimeout!:number;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SpotifyHelper {
		if(!SpotifyHelper._instance) {
			SpotifyHelper._instance = reactive(new SpotifyHelper()) as SpotifyHelper;
			SpotifyHelper._instance.initialize();
		}
		return SpotifyHelper._instance;
	}
	
	public set token(value:SpotifyAuthToken | null) {
		if(value == null) {
			clearTimeout(this._refreshTimeout);
			clearTimeout(this._getTrackTimeout);
			return;
		}
		this._token = value;
		if(Date.now() > value.expires_at - 10 * 60 * 1000) {
			this.refreshToken();
		}else{
			this.getCurrentTrack();
		}
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Starts the aut flow
	 */
	public async startAuthFlow():Promise<void> {
		const res = await fetch(Config.API_PATH+"/CSRFToken", {method:"GET"});
		const json = await res.json();
		const scope = ["streaming","user-read-private","user-read-playback-state","app-remote-control","user-modify-playback-state"].join("%20");

		let url = "https://accounts.spotify.com/authorize";
		url += "?client_id="+Config.SPOTIFY_CLIENT_ID;
		url += "&response_type=code";
		url += "&redirect_uri="+encodeURIComponent( document.location.origin+"/spotify/auth" );
		url += "&scope=+"+scope;
		url += "&state="+json.token;
		url += "&show_dialog=true";

		document.location.href = url;
	}

	/**
	 * Authenticate the user after receiving the auth_code once
	 * oauth flow completes.
	 * 
	 * @param authCode 
	 */
	public async authenticate(authCode:string):Promise<void> {
		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		const res = await fetch(Config.API_PATH+"/spotify/auth?code="+authCode, {method:"GET"});
		json = await res.json();
		if(json.access_token) {
			store.dispatch("setSpotifyToken", json);
		}else{
			throw(json);
		}
	}

	/**
	 * Refresh the current token
	 */
	public async refreshToken():Promise<void> {
		clearTimeout(this._getTrackTimeout);
		clearTimeout(this._refreshTimeout);

		let json:SpotifyAuthToken = {} as SpotifyAuthToken;
		const res = await fetch(Config.API_PATH+"/spotify/refresh_token?token="+this._token.refresh_token, {method:"GET"});
		json = await res.json();
		if(json.access_token) {
			json.refresh_token = this._token.refresh_token;//Keep refresh token
			store.dispatch("setSpotifyToken", json);//This computes the expires_at value
	
			//Refresh token 10min before it actually expires
			const delay = (this._token.expires_at - Date.now()) - 10 * 60 * 1000;
			if(!isNaN(delay) && delay > 0) {
				this._refreshTimeout = setTimeout(()=>this.refreshToken(), delay);
			}
		}else{
			store.state.alert = "[SPOTIFY] token refresh failed"
		}
	}

	/**
	 * Load current track's data
	 */
	private async getCurrentTrack():Promise<void> {
		clearTimeout(this._getTrackTimeout);

		const options = {
			headers:{
				"Accept":"application/json",
				"Content-Type":"application/json",
				"Authorization":"Bearer "+this._token.access_token,
			}
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", options);
		if(res.status == 401) {
			await this.refreshToken();
			return;
		}
		if(res.status == 204) {
			//No content, nothing is playing
			return;
		}
		
		let json:SpotifyTrack|null = await res.json();
		if(json != null) {
			if(json.currently_playing_type == "episode") {
				const episode = await this.getEpisodeInfos();
				if(episode) json = episode;
			}

			this.currentTrack = json;
			this.isPlaying = json.is_playing && json.item != null;
	
			if(this.isPlaying) {
				let delay = json.item.duration_ms - json.progress_ms;
				if(isNaN(delay)) delay = 5000;
				this._getTrackTimeout = setTimeout(()=> {
					this.getCurrentTrack();
				}, Math.min(5000, delay + 1000));

				//Broadcast to the overlays
				PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK, {
					trackName: json.item.name,
					artistName: json.item.show? json.item.show.name : json.item.artists[0].name,
					trackDuration: json.item.duration_ms,
					trackPlaybackPos: json.progress_ms,
					cover: json.item.album.images[0].url,
				})

			}else{
				//Broadcast to the overlays
				PublicAPI.instance.broadcast(TwitchatEvent.CURRENT_TRACK);
			}
		}
	}

	/**
	 * Gets a podcast infos
	 */
	private async getEpisodeInfos():Promise<SpotifyTrack|null> {
		const options = {
			headers:{
				"Accept":"application/json",
				"Content-Type":"application/json",
				"Authorization":"Bearer "+this._token.access_token,
			}
		}
		const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode", options);
		if(res.status == 401) {
			await this.refreshToken();
			return null;
		}
		return await res.json();
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TRACK, ()=>this.getCurrentTrack());
	}
}

export interface SpotifyAuthResult {
	code:string;
	csrf:string;
}

export interface SpotifyAuthToken {
	access_token:string;
	token_type:string;//Bearer
	scope:string;
	expires_at:number;//In seconds
	expires_in:number;//In seconds
	refresh_token:string;
}

export interface SpotifyTrack {
	timestamp: number;
	context?: {
		external_urls:ExternalUrls[];
	};
	progress_ms: number;
	item: Item;
	currently_playing_type: "track"|"episode";
	actions: Actions;
	is_playing: boolean;

}

interface ExternalUrls {
	spotify: string;
}

interface Artist {
	external_urls: ExternalUrls;
	href: string;
	id: string;
	name: string;
	type: string;
	uri: string;
}

interface Image {
	height: number;
	url: string;
	width: number;
}

interface Album {
	album_type: string;
	artists: Artist[];
	available_markets: string[];
	external_urls: ExternalUrls;
	href: string;
	id: string;
	images: Image[];
	name: string;
	release_date: string;
	release_date_precision: string;
	total_tracks: number;
	type: string;
	uri: string;
}

interface ExternalIds {
	isrc: string;
}

interface Item {
	album: Album;
	artists: Artist[];
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	external_ids: ExternalIds;
	external_urls: ExternalUrls;
	href: string;
	id: string;
	is_local: boolean;
	name: string;
	popularity: number;
	preview_url: string;
	track_number: number;
	type: string;
	uri: string;
	show: Show;
	audio_preview_url: string;
	description: string;
	html_description: string;
	images: Image[];
	is_externally_hosted: boolean;
	is_playable: boolean;
	language: string;
	languages: string[];
	release_date: string;
	release_date_precision: string;
}

interface Disallows {
	resuming: boolean;
	skipping_prev: boolean;
	toggling_repeat_context: boolean;
	toggling_repeat_track: boolean;
	toggling_shuffle: boolean;
}

interface Actions {
	disallows: Disallows;
}

interface Show {
	available_markets: string[];
	copyrights: string[];
	description: string;
	explicit: boolean;
	external_urls: ExternalUrls;
	href: string;
	html_description: string;
	id: string;
	images: Image[];
	is_externally_hosted: boolean;
	languages: string[];
	media_type: string;
	name: string;
	publisher: string;
	total_episodes: number;
	type: string;
	uri: string;
}