import StoreProxy from '@/store/StoreProxy';
import OBSWebSocket from 'obs-websocket-js';
import type { JsonArray, JsonObject } from 'type-fest';
import { reactive } from 'vue';
import { EventDispatcher } from '../events/EventDispatcher';
import type { TwitchatActionType, TwitchatEventType } from '../events/TwitchatEvent';
import TwitchatEvent from '../events/TwitchatEvent';
import Utils from './Utils';

/**
* Created : 29/03/2022 
*/
export default class OBSWebsocket extends EventDispatcher {

	private static _instance:OBSWebsocket;

	public connected:boolean = false;
	
	private obs!:OBSWebSocket;
	private reconnectTimeout!:number;
	private autoReconnect:boolean = false;
	private connectInfo:{port:string, ip:string, pass:string} = {port:"",ip:"",pass:""};
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():OBSWebsocket {
		if(!OBSWebsocket._instance) {
			OBSWebsocket._instance = reactive(new OBSWebsocket()) as OBSWebsocket;
			OBSWebsocket._instance.initialize();
		}
		return OBSWebsocket._instance;
	}

	public get socket():OBSWebSocket { return this.obs; }
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Disconnect from OBS Websocket
	 */
	public async disconnect():Promise<void> {
		this.autoReconnect = false;
		if(this.connected) {
			this.obs.disconnect();
		}
		this.connected = false;
	}

	/**
	 * Connect to OBS websocket
	 * 
	 * @param port 
	 * @param pass 
	 * @param autoReconnect 
	 * @returns 
	 */
	public async connect(port:string, pass:string = "", autoReconnect = true, ip = "127.0.0.1", forceConnect:boolean = false):Promise<boolean> {
		if(this.connected) return true;
		
		clearTimeout(this.reconnectTimeout);
		this.autoReconnect = autoReconnect;
		if(!forceConnect && StoreProxy.obs.connectionEnabled !== true) return false;
		
		try {
			this.connectInfo.ip = ip;
			this.connectInfo.port = port;
			this.connectInfo.pass = pass;
			const protocol = (ip == "127.0.0.1" || ip == "localhost") ? "ws://" : "wss://";
			const portValue = port && port?.length > 0 && port != "0"? ":"+port : "";
			await this.obs.connect(protocol + ip + portValue, pass, {rpcVersion: 1});
			this.connected = true;
			this.dispatchEvent(new TwitchatEvent("OBS_WEBSOCKET_CONNECTED"));
		}catch(error) {
			console.log(error);
			if(this.autoReconnect) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(port, pass, autoReconnect, ip);
				}, 5000);
			}
			return false;
		}

		// console.log(await this.obs.call("GetInputList"));

		/* LIST ALL INPUT KINDS
		const sources = await this.getSources();
		const inputKinds:{[key:string]:boolean} = {}
		const sourceKinds:{[key:string]:boolean} = {}
		for (let i = 0; i < sources.length; i++) {
			const e = sources[i];
			if(inputKinds[e.inputKind] !== true) {
				inputKinds[e.inputKind] = true;
			}
			if(sourceKinds[e.sourceType] !== true) {
				sourceKinds[e.sourceType] = true;
			}
		}
		console.log(inputKinds);
		console.log(sourceKinds);
		//*/

		/* GET A SOURCE SETTINGS
		const settings = await this.obs.call("GetInputSettings", {inputName: "TTBrowerSourceTest"});
		console.log(settings);
		//*/

		/* GET ALL SOURCES OF A SCENE
		const itemsCall = await this.obs.call("GetSceneItemList", {sceneName:"👦 Face (FS)"});
		const items = (itemsCall.sceneItems as unknown) as OBSSourceItem[];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			console.log(item);
		}
		//*/

		// const res = await this.getSourceOnCurrentScene("TTImage");
		// console.log(res);

		//@ts-ignore
		window.test = this.obs;
		return true;
	}

	public async stopStreaming():Promise<void> {
		if(!this.connected) return;
		const status = await this.obs.call("GetStreamStatus");
		if(status.outputActive) {
			await this.obs.call("StopStream");
		}
	}

	/**
	 * Broadcast a message to all the connected clients
	 * @param data
	 */
	public async broadcast(type:TwitchatEventType|TwitchatActionType, data?:JsonObject, retryCount:number = 0):Promise<void> {
		if(!this.connected) {
			//Try again
			if(retryCount == 30) return;
			setTimeout(()=> this.broadcast(type, data, ++retryCount), 1000);
			return;
		}

		const eventData = { origin:"twitchat", type, data }
		this.obs.call("BroadcastCustomEvent", {eventData});
	}
	
	/**
	 * Get all the scenes references
	 * 
	 * @returns 
	 */
	public async getScenes():Promise<{
		currentProgramSceneName: string;
		currentPreviewSceneName: string;
		scenes: {sceneIndex:number, sceneName:string}[];
	}> {
		if(!this.connected) return {currentProgramSceneName:"", currentPreviewSceneName:"", scenes:[]};
		
		let res = await this.obs.call("GetSceneList");
		return res as {
			currentProgramSceneName: string;
			currentPreviewSceneName: string;
			scenes: {sceneIndex:number, sceneName:string}[];
		};
	}
	
	/**
	 * Get all the sources references
	 * 
	 * @returns 
	 */
	public async getSources(currentSceneOnly:boolean = false):Promise<OBSSourceItem[]> {
		if(!this.connected) return [];
		const scenesResult = await this.getScenes();
		let sceneList:OBSSceneItemParented[] = scenesResult.scenes;
		if(currentSceneOnly) {
			let currentScene  = await this.getCurrentScene();
			sceneList = sceneList.filter(v=>v.sceneName == currentScene);
		}
		let sources:OBSSourceItem[] = [];
		const sourceDone:{[key:string]:boolean} = {};
		const scenesDone:{[key:string]:boolean} = {};
		
		//Parse all scene items
		for (const scene of sceneList) {
			if(scenesDone[scene.sceneName] == true) continue;
			scenesDone[scene.sceneName] = true;

			let list = await this.obs.call("GetSceneItemList", {sceneName:scene.sceneName});
			let items = (list.sceneItems as unknown) as OBSSourceItem[];

			//Parse all scene sources
			for (const source of items) {
				if(sourceDone[source.sourceName] == true) continue;

				sourceDone[source.sourceName] = true;
				
				//Get group children
				if(source.isGroup) {
					const res = await this.obs.call("GetGroupSceneItemList", {sceneName:source.sourceName});
					const groupItems = (res.sceneItems as unknown) as OBSSourceItem[];
					items = items.concat( groupItems );
				}

				//Check recursively on child scene if we requested the sources only from the current scene
				if(source.sourceType == "OBS_SOURCE_TYPE_SCENE" && currentSceneOnly) {
					sceneList.push({sceneIndex:-1, sceneName:source.sourceName, parentScene:scene});
				}
			}
			sources = sources.concat(items);
		}

		//Dedupe results
		let itemsDone:{[key:string]:boolean} = {};
		for (let i = 0; i < sources.length; i++) {
			if(itemsDone[sources[i].sourceName] === true) {
				sources.splice(i, 1)!
				i--;
			}
			itemsDone[sources[i].sourceName] = true;
		}

		return sources;
	}
	
	/**
	 * Get all the sources references
	 * 
	 * @returns 
	 */
	public async getSourceDisplayRects(sourceName:string):Promise<SourceTransform[]> {
		if(!this.connected) return [];
		const currentScene  = await this.getCurrentScene();
		let sceneList:{name:string, parentScene?:string, parentItemId?:number, parentTransform?:SourceTransform}[] = [{name:currentScene}];
		const transforms:SourceTransform[] = [];
		const sourceDone:{[key:string]:boolean} = {};
		const scenesDone:{[key:string]:boolean} = {};
		const itemNameToTransform:{[key:string]:SourceTransform} = {};
		
		//Parse all scene items
		for (const scene of sceneList) {
			
			if(scenesDone[scene.name] == true) continue;
			scenesDone[scene.name] = true;

			let list = await this.obs.call("GetSceneItemList", {sceneName:scene.name});
			let items = (list.sceneItems as unknown) as OBSSourceItem[];

			//Parse all scene sources
			for (const source of items) {
				sourceDone[source.sourceName] = true;
				
				if(source.isGroup) {
					const res = await this.obs.call("GetGroupSceneItemList", {sceneName:source.sourceName});
					const groupItems = (res.sceneItems as unknown) as OBSSourceItem[];
					items = items.concat( groupItems );
				}

				if(source.sourceType == "OBS_SOURCE_TYPE_SCENE") {
					let sourceTransform = await this.getSceneItemTransform(scene.name, source.sceneItemId);
					if(scene.parentTransform) {
						const pt = scene.parentTransform;
						sourceTransform.positionX += pt.positionX;
						sourceTransform.positionY += pt.positionY;
						sourceTransform.cropLeft += pt.cropLeft;
						sourceTransform.cropTop += pt.cropTop;
						sourceTransform.cropRight += pt.cropRight;
						sourceTransform.cropBottom += pt.cropBottom;
						sourceTransform.scaleX *= pt.scaleX;
						sourceTransform.scaleY *= pt.scaleY;
						sourceTransform.rotation += pt.rotation;
					}
					itemNameToTransform[source.sourceName+"_"+source.sceneItemId] = sourceTransform;
					sceneList.push( {
									name:source.sourceName,
									parentScene:scene.name,
									parentItemId:source.sceneItemId,
									parentTransform:sourceTransform,
								} );
				}

				if(source.sourceName == sourceName) {
					let sourceTransform = await this.getSceneItemTransform(scene.name, source.sceneItemId);
					if(scene.parentTransform) {
						const pt = scene.parentTransform;
						sourceTransform.positionX += pt.positionX;
						sourceTransform.positionY += pt.positionY;
						sourceTransform.cropLeft += pt.cropLeft;
						sourceTransform.cropTop += pt.cropTop;
						sourceTransform.cropRight += pt.cropRight;
						sourceTransform.cropBottom += pt.cropBottom;
						sourceTransform.scaleX *= pt.scaleX;
						sourceTransform.scaleY *= pt.scaleY;
						sourceTransform.rotation += pt.rotation;
					}
					itemNameToTransform[source.sourceName+"_"+source.sceneItemId] = sourceTransform;
					transforms.push(sourceTransform)
				}
			}
		}
		return transforms;
	}
	
	/**
	 * Get all the available inputs
	 * 
	 * @returns 
	 */
	public async getInputs():Promise<OBSInputItem[]> {
		if(!this.connected) return [];
		return ((await this.obs.call("GetInputList")).inputs as unknown) as OBSInputItem[];
	}
	
	/**
	 * Get all the available audio sources
	 * 
	 * @returns 
	 */
	public async getAudioSources():Promise<{
		inputs: JsonArray;
	}> {
		if(!this.connected) return {inputs:[]};
		
		const kinds = await this.getInputKindList();
		const audioKind = kinds.inputKinds.find(kind=>kind.indexOf("input_capture") > -1);
		return await this.obs.call("GetInputList", {inputKind:audioKind});
	}
	
	/**
	 * Get all the available kinds of sources
	 * @returns 
	 */
	public async getInputKindList():Promise<{
		inputKinds: string[];
	}> {
		if(!this.connected) return {inputKinds:[]};
		
		return await this.obs.call("GetInputKindList");
	}

	/**
	 * Gets all the available filters of a specific source
	 * 
	 * @param sourceName 
	 * @returns 
	 */
	public async getSourceFilters(sourceName:string):Promise<OBSFilter[]> {
		if(!this.connected) return [];
		
		const res = await this.obs.call("GetSourceFilterList", {sourceName});
		return (res.filters as unknown) as OBSFilter[];
	}

	/**
	 * Set the current scene by its name
	 * 
	 * @param name 
	 * @returns 
	 */
	public async setCurrentScene(name:string):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetCurrentProgramScene", {sceneName:name});
	}

	/**
	 * Get the current scene
	 * 
	 * @returns 
	 */
	public async getCurrentScene():Promise<string> {
		if(!this.connected) return "";
		let scene = "";
		try {
			const res = await this.obs.call("GetCurrentProgramScene");
			scene = res.currentProgramSceneName;
		}catch(error) {}
		return scene;
	}

	/**
	 * Change the content of a text source
	 * 
	 * @param sourceName 
	 * @param text 
	 */
	public async setTextSourceContent(sourceName:string, text:string):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{text}});
	}

	/**
	 * Change a filter's visibility
	 * 
	 * @param sourceName 
	 * @param filterName 
	 * @param visible 
	 */
	public async setFilterState(sourceName:string, filterName:string, visible:boolean):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetSourceFilterEnabled", {sourceName, filterName, filterEnabled:visible});
		await Utils.promisedTimeout(50);
	}

	/**
	 * Set a sources's visibility on the current scene
	 * 
	 * @param sourceName 
	 * @param visible 
	 */
	public async setSourceState(sourceName:string, visible:boolean):Promise<void> {
		if(!this.connected) return;
		
		//FIXME if the requested source is on multiple scenes, this will only toggle one of them
		const item = await this.getSourceOnCurrentScene(sourceName);
		if(item) {
			await this.obs.call("SetSceneItemEnabled", {
				sceneName:item.scene,
				sceneItemId:item.source.sceneItemId,
				sceneItemEnabled:visible
			});
			await Utils.promisedTimeout(50);
		}
	}

	/**
	 * Get a source by its name on the current scene.
	 * Searches recursively on sub scenes
	 * 
	 * @param sourceName 
	 * @param sceneName 
	 * @returns 
	 */
	public async getSourceOnCurrentScene(sourceName:string, sceneName = "", isGroup:boolean = false):Promise<{scene:string, source:OBSSourceItem}|null> {
		if(!sceneName) {
			const scene = await this.obs.call("GetCurrentProgramScene");
			sceneName = scene.currentProgramSceneName;
		}
		let items:OBSSourceItem[] = [];
		if(isGroup) {
			//Search grouped item
			const res = await this.obs.call("GetGroupSceneItemList", {sceneName:sceneName});
			items = (res.sceneItems as unknown) as OBSSourceItem[];
		}else{
			//Search scene item
			const res = await this.obs.call("GetSceneItemList", {sceneName});
			items = (res.sceneItems as unknown) as OBSSourceItem[];
		}
		const item = items.find(v=> v.sourceName == sourceName);
		if(item) {
			return {scene:sceneName, source:item};
		}else{
			//Item not found check on sub scenes and groups
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if(item.isGroup) {
					//Search on sub group
					const res = await this.getSourceOnCurrentScene(sourceName, item.sourceName, true);
					if(res) return res;
				}else
				//Search on sub scene
				if(item.sourceType == "OBS_SOURCE_TYPE_SCENE") {
					const res = await this.getSourceOnCurrentScene(sourceName, item.sourceName);
					if(res) return res;
				}
			}
		}
		return null;
	}

	/**
	 * Mute/unmute an audio source by its name
	 * 
	 * @param sourceName 
	 * @param mute 
	 * @returns 
	 */
	public async setMuteState(sourceName:string, mute:boolean):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetInputMute", {inputName:sourceName, inputMuted:mute});
	}

	/**
	 * Change the URL of a browser source
	 * 
	 * @param sourceName 
	 * @param url 
	 */
	public async setBrowserSourceURL(sourceName:string, url:string):Promise<void> {
		if(!this.connected) return;
		
		// const settings = await this.obs.call("GetInputSettings", {inputName: sourceName});
		const newSettings:BrowserSourceSettings = {shutdown:true, is_local_file:false, url}
		if(!/https?:\/\.*/i?.test(url)) {
			//If using a local file, do not use "local_file" param is it does not
			//supports query parameters. 
			newSettings.url = "file:///"+url;
		}
		
		await this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:newSettings as JsonObject});
	}

	/**
	 * Gets the settings of a source
	 * 
	 * @param sourceName 
	 */
	public async getSourceSettings(sourceName:string):Promise<{
		inputSettings: JsonObject;
		inputKind: string;
	}> {
		if(!this.connected) return {
			inputSettings: {},
			inputKind: "",
		};

		const settings = await this.obs.call("GetInputSettings", {inputName: sourceName});
		return settings;
	}

	/**
	 * Gets the settings of a source
	 * 
	 * @param sourceName 
	 */
	public async getSceneItemTransform(sceneName:string, sceneItemId:number):Promise<SourceTransform> {
		if(!this.connected) return {
			alignment: 0,
			boundsAlignment: 0,
			boundsHeight: 0,
			boundsType: "OBS_BOUNDS_NONE",
			boundsWidth: 0,
			cropBottom: 0,
			cropLeft: 0,
			cropRight: 0,
			cropTop: 0,
			height: 0,
			positionX: 0,
			positionY: 0,
			rotation: 0,
			scaleX: 0,
			scaleY: 0,
			sourceHeight: 0,
			sourceWidth: 0,
			width: 0,
		};

		const settings = await this.obs.call("GetSceneItemTransform", {sceneName, sceneItemId});
		return (settings as unknown) as SourceTransform;
	}

	/**
	 * Change the URL of an media (ffmpeg) source
	 * 
	 * @param sourceName 
	 * @param url 
	 */
	public async setMediaSourceURL(sourceName:string, url:string):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{local_file:url, file:url}});
	}

	/**
	 * Restart playing of a media source
	 * 
	 * @param sourceName 
	 */
	public async replayMedia(sourceName:string):Promise<void> {
		if(!this.connected) return;
		await this.obs.call('TriggerMediaInputAction',{'inputName':sourceName,'mediaAction':'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this.obs = new OBSWebSocket();

		this.obs.addListener("ConnectionClosed", ()=> {
			this.connected = false;
			if(this.autoReconnect) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(this.connectInfo.port, this.connectInfo.pass, this.autoReconnect, this.connectInfo.ip);
				}, 5000);
			}
		});

		//@ts-ignore "CustomEvent" not yet defined on OBS-ws signatures
		this.obs.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			this.dispatchEvent(new TwitchatEvent(e.type, e.data));
			this.dispatchEvent(new TwitchatEvent("CustomEvent", e));
		});

		this.obs.on("CurrentProgramSceneChanged", (e:{sceneName:string}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_SCENE_CHANGE, e));
		});

		this.obs.on("InputMuteStateChanged", (e:{inputName:string, inputMuted:boolean}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_MUTE_TOGGLE, e));
		});

		//This event is disabled as its very specific to media sources with playback control
		//which are probably not much used
		/*
		this.obs.on("MediaInputActionTriggered", (e:{inputName:string, mediaAction:string}) => {
			const action:OBSMediaAction = e.mediaAction as OBSMediaAction;
			let event:string = "";
			switch(action) {
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE": return;//Ignore
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY": event = TwitchatEvent.OBS_PLAYBACK_STARTED; break;
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE": event = TwitchatEvent.OBS_PLAYBACK_PAUSED; break;
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP": event = TwitchatEvent.OBS_PLAYBACK_ENDED; break;
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART": event = TwitchatEvent.OBS_PLAYBACK_RESTARTED; break;
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT": event = TwitchatEvent.OBS_PLAYBACK_NEXT; break;
				case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS": event = TwitchatEvent.OBS_PLAYBACK_PREVIOUS; break;
			}
			this.dispatchEvent(new TwitchatEvent(event, e));
		});
		//*/

		this.obs.on("MediaInputPlaybackStarted", async (e:{inputName:string}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_PLAYBACK_STARTED, e));
		});
		
		this.obs.on("MediaInputPlaybackEnded", async (e:{inputName:string}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_PLAYBACK_ENDED, e));
		});

		this.obs.on("SceneItemEnableStateChanged", async (e:{sceneName:string, sceneItemId:number, sceneItemEnabled:boolean}) => {
			let res:{sceneItems: JsonObject[]} = {sceneItems:[]};
			try {
				res = await this.obs.call("GetSceneItemList", {sceneName:e.sceneName});
			}catch(error) {
				console.log("Failed loading scene item, try loading it as a group");
				//If reaching this point it's most probably because the scene is
				//actually a group.
				//Let's try to load its content as a group.
				try {
					res = await this.obs.call("GetGroupSceneItemList", {sceneName:e.sceneName});
				}catch(error){
					//dunno what could have failed :/
					console.log("Failed loading it a group as well :/");
					console.log(error);
				}
			}
			const items = (res.sceneItems as unknown) as OBSSourceItem[];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if(item.sceneItemId == e.sceneItemId) {
					this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_SOURCE_TOGGLE, {item, event:e} as unknown as JsonObject));
					break;
				}
			}
		});
		
		this.obs.on("InputNameChanged", async (e:{oldInputName:string, inputName:string}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_INPUT_NAME_CHANGED, e));
		});
		
		this.obs.on("SceneNameChanged", async (e:{oldSceneName:string, sceneName:string}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_SCENE_NAME_CHANGED, e));
		});

		this.obs.on("SourceFilterNameChanged", async (e:{sourceName: string, oldFilterName: string, filterName: string}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_FILTER_NAME_CHANGED, e));
		});

		this.obs.on("SourceFilterEnableStateChanged", async (e:{sourceName: string, filterName: string, filterEnabled: boolean}) => {
			this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_FILTER_TOGGLE, e));
		});

		this.obs.on("StreamStateChanged", async (e:{outputActive: boolean, outputState: string}) => {
			if(e.outputState == "OBS_WEBSOCKET_OUTPUT_STARTED" || e.outputState == "OBS_WEBSOCKET_OUTPUT_STOPPED") {
				this.dispatchEvent(new TwitchatEvent(TwitchatEvent.OBS_STREAM_STATE, e));
			}
		});
	}
}

export type OBSInputKind = "window_capture" | "streamfx-source-mirror" | "browser_source" | "color_source_v3" | "dshow_input" | "image_source" | "null" | "monitor_capture" | "ffmpeg_source" | "wasapi_input_capture" | "text_gdiplus_v2" | "vlc_source";
export type OBSSourceType = "OBS_SOURCE_TYPE_INPUT" | "OBS_SOURCE_TYPE_SCENE";

export interface OBSAudioSource {inputKind:OBSInputKind, inputName:string, unversionedInputKind:string}
export interface OBSSourceItem {
	inputKind:OBSInputKind;
	isGroup:boolean|null;
	sceneItemId:number;
	sceneItemIndex:number;
	sourceName:string;
	sourceType:OBSSourceType;
}

export interface OBSSceneItem {
	sceneIndex:number;
	sceneName:string;
}

export interface OBSSceneItemParented {
	sceneIndex:number;
	sceneName:string;
	parentScene?:OBSSceneItem;
}

export interface OBSInputItem {
	inputKind:OBSInputKind;
	inputName:string;
	unversionedInputKind:string;
}

export interface OBSFilter {
	filterEnabled: boolean;
	filterIndex: number;
	filterKind: string;
	filterName: string;
	filterSettings: unknown;
}

export interface BrowserSourceSettings {
	fps?: number;
	fps_custom?: boolean;
	height?: number;
	is_local_file?: boolean;
	local_file?: string;
	shutdown?: boolean;
	url?: string;
	width?: number;
}

export interface SourceTransform {
	alignment: number
	boundsAlignment: number
	boundsHeight: number
	boundsType: string
	boundsWidth: number
	cropBottom: number
	cropLeft: number
	cropRight: number
	cropTop: number
	height: number
	positionX: number
	positionY: number
	rotation: number
	scaleX: number
	scaleY: number
	sourceHeight: number
	sourceWidth: number
	width: number
}
  

export type OBSMediaAction = "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE" |
							"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" |
							"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE" |
							"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP" |
							"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART" |
							"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT" |
							"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS";