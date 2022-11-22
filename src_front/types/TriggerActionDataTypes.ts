import Config from "../utils/Config";
import { TwitchatDataTypes } from "./TwitchatDataTypes";


export type TriggerActionTypes =  TriggerActionEmptyData
								| TriggerActionObsData
								| TriggerActionChatData
								| TriggerActionTTSData
								| TriggerActionMusicEntryData
								| TriggerActionRaffleData
								| TriggerActionBingoData
								| TriggerActionVoicemodData
								| TriggerActionHighlightData
								| TriggerActionTriggerData
;
export type TriggerActionStringTypes = "obs"|"chat"|"music"|"tts"|"raffle"|"bingo"|"voicemod"|"highlight"|"trigger"|null;

export interface TriggerData {
	enabled:boolean;
	actions:TriggerActionTypes[];
	name?:string;
	prevKey?:string;
	permissions?:TwitchatDataTypes.PermissionsData;
	cooldown?:{global:number, user:number};
	scheduleParams?:TriggerScheduleData;
	/**
	 * @deprecated Only here for typings on data migration. Use "name" property
	 */
	chatCommand?:string
}

//Main trigger categories displayed on the parameter "Triggers" section
export const TriggerEventTypeCategories = {
	GLOBAL: 1,
	TIMER: 2,
	TWITCHAT: 3,
	USER: 4,
	SUBITS: 5,
	MOD: 6,
	HYPETRAIN: 7,
	GAMES: 8,
	MUSIC: 9,
} as const;
export type TriggerEventTypeCategoryValue = typeof TriggerEventTypeCategories[keyof typeof TriggerEventTypeCategories];
export interface TriggerEventTypes extends TwitchatDataTypes.ParameterDataListValue {
	category:TriggerEventTypeCategoryValue;
	label:string;
	value:TriggerTypesValue|"0";
	icon:string;
	description?:string;
	isCategory?:boolean;
	testMessageType?:TwitchatDataTypes.TwitchatMessageStringType;
	testNoticeType?:TwitchatDataTypes.TwitchatNoticeStringType;
}

export interface TriggerActionData {
	id:string;
	delay:number;
}

//Used for temporary trigger data before user selects the trigger type
export interface TriggerActionEmptyData extends TriggerActionData{
	type:null;
}

export interface TriggerActionObsData extends TriggerActionData{
	type:"obs";
	sourceName:string;
	filterName?:string;
	show:boolean;
	text?:string;
	url?:string;
	mediaPath?:string;
}

export interface TriggerActionChatData extends TriggerActionData{
	type:"chat";
	text:string;
}

export interface TriggerActionTTSData extends TriggerActionData{
	type:"tts";
	text:string;
}

export interface TriggerActionRaffleData extends TriggerActionData{
	type:"raffle";
	raffleData:TwitchatDataTypes.RaffleData;
}

export interface TriggerActionBingoData extends TriggerActionData{
	type:"bingo";
	bingoData:TwitchatDataTypes.BingoConfig;
}

export interface TriggerActionVoicemodData extends TriggerActionData{
	type:"voicemod";
	voiceID:string;
}

export interface TriggerActionMusicEntryData extends TriggerActionData{
	type:"music";
	musicAction:string;
	track:string;
	confirmMessage:string;
	playlist:string;
}

export interface TriggerActionHighlightData extends TriggerActionData{
	type:"highlight";
	show:boolean;
	text:string;
}

export interface TriggerActionTriggerData extends TriggerActionData{
	type:"trigger";
	triggerKey:string;
}

export type TriggerScheduleTypesValue = typeof TriggerScheduleTypes[keyof typeof TriggerScheduleTypes];
export interface TriggerScheduleData {
	type:TriggerScheduleTypesValue|"0";
	repeatDuration:number;
	repeatMinMessages:number;
	dates:{daily:boolean, yearly:boolean, value:string}[];
}

export const TriggerTypes = {
	FIRST_ALL_TIME:"1",//OK
	FIRST_TODAY:"2",//OK
	POLL_RESULT:"3",
	PREDICTION_RESULT:"4",
	RAFFLE_RESULT:"5",
	BINGO_RESULT:"6",
	CHAT_COMMAND:"7",//OK
	SUB:"8",//OK
	SUBGIFT:"9",//OK
	CHEER:"10",//OK
	FOLLOW:"11",
	RAID:"12",//OK
	REWARD_REDEEM:"13",//OK
	STREAM_INFO_UPDATE:"19",
	TRACK_ADDED_TO_QUEUE:"14",
	MUSIC_START:"24",
	MUSIC_STOP:"25",
	TIMER_START:"15",//OK
	TIMER_STOP:"16",//OK
	COUNTDOWN_START:"17",//OK
	COUNTDOWN_STOP:"18",//OK
	EMERGENCY_MODE_START:"20",//OK
	EMERGENCY_MODE_STOP:"21",//OK
	HIGHLIGHT_CHAT_MESSAGE:"22",//OK
	CHAT_ALERT:"23",//OK
	HYPE_TRAIN_COOLDOWN:"45",//OK
	HYPE_TRAIN_APPROACHING:"26",//OK
	HYPE_TRAIN_START:"27",//OK
	HYPE_TRAIN_PROGRESS:"28",//OK
	HYPE_TRAIN_END:"29",//OK
	HYPE_TRAIN_CANCELED:"32",//OK
	RETURNING_USER:"30",//OK
	VOICEMOD:"31",//OK
	SHOUTOUT:"33",//OK
	TIMEOUT:"34",
	BAN:"35",
	UNBAN:"36",
	VIP:"37",
	UNVIP:"38",
	MOD:"39",
	UNMOD:"40",
	SCHEDULE:"41",
	ANY_MESSAGE:"42",//OK
	COMMUNITY_CHALLENGE_PROGRESS:"43",
	COMMUNITY_CHALLENGE_COMPLETE:"44",
	PRESENTATION:"46",//OK

	TWITCHAT_AD:"ad",
} as const;
export type TriggerTypesValue = typeof TriggerTypes[keyof typeof TriggerTypes];

export interface ITriggerActionHelper {
	tag:string;
	desc:string;
	pointer:string;
}

export function TriggerActionHelpers(key:string):ITriggerActionHelper[] {
	const map:{[key:string]:ITriggerActionHelper[]} = {}
	map[TriggerTypes.ANY_MESSAGE] = 
	map[TriggerTypes.FIRST_TODAY] = 
	map[TriggerTypes.FIRST_ALL_TIME] = 
	map[TriggerTypes.RETURNING_USER] = 
	map[TriggerTypes.PRESENTATION] =
	map[TriggerTypes.CHAT_COMMAND] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"MESSAGE", desc:"Chat message content", pointer:"message"},
	];
	
	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", desc:"Poll title", pointer:"data.title"},
		{tag:"WIN", desc:"Winning choice title", pointer:"winner"},
		// {tag:"PERCENT", desc:"Votes percent of the winning choice", pointer:""},
	];
	
	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", desc:"Prediction title", pointer:"data.title"},
		{tag:"WIN", desc:"Winning choice title", pointer:"winner"},
	];
	
	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", desc:"Winner name", pointer:"winner"},
	];
	
	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", desc:"Winner name", pointer:"winner.label"},
	];
	
	map[TriggerTypes.SUB] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"tier"},
		{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
	];
	
	map[TriggerTypes.SUBGIFT] = [
		{tag:"USER", desc:"User name of the sub gifter", pointer:"user.displayName"},
		{tag:"RECIPIENT", desc:"Recipient user name", pointer:"gift_recipients[].displayName"},
		{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"tier"},
	];
	
	map[TriggerTypes.CHEER] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"BITS", desc:"Number of bits", pointer:"bits"},
		{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
	];
	
	map[TriggerTypes.FOLLOW] = [
		{tag:"USER", desc:"User name of the new follower", pointer:"tags.username"},
	];
	
	map[TriggerTypes.RAID] = [
		{tag:"USER", desc:"User name of the new follower", pointer:"user.displayName"},
		{tag:"VIEWERS", desc:"Number of viewers", pointer:"viewers"},
	];
	
	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"TITLE", desc:"Reward title", pointer:"reward.title"},
		{tag:"DESCRIPTION", desc:"Reward description", pointer:"reward.description"},
		{tag:"COST", desc:"Reward cost", pointer:"reward.cost"},
		{tag:"MESSAGE", desc:"User message if any", pointer:"message"},
	];
	
	map[TriggerTypes.MUSIC_START] = 
	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:"CURRENT_TRACK_ARTIST", desc:"Current track artist name", pointer:"artist"},
		{tag:"CURRENT_TRACK_TITLE", desc:"Current track's title", pointer:"title"},
		{tag:"CURRENT_TRACK_ALBUM", desc:"Current track's album name", pointer:"album"},
		{tag:"CURRENT_TRACK_COVER", desc:"Current track's cover", pointer:"cover"},
		{tag:"CURRENT_TRACK_URL", desc:"Current track URL", pointer:"url"},
	];
	
	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", desc:"Stream title", pointer:"title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"category"},
	];
	
	// map[TriggerTypes.TIMER_START] = 
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"DURATION", desc:"Timer's final duration formated", pointer:"duration"},
		{tag:"DURATION_MS", desc:"Timer's final duration in milliseconds", pointer:"duration_ms"},
	];

	map[TriggerTypes.COUNTDOWN_START] = [
		{tag:"START_AT", desc:"Start date fromated", pointer:"countdown.startAt"},
		{tag:"START_AT_MS", desc:"Start date in milliseconds", pointer:"countdown.startAt_ms"},
		{tag:"DURATION", desc:"Countdown's duration formated", pointer:"countdown.duration"},
		{tag:"DURATION_MS", desc:"Countdown's duration in milliseconds", pointer:"countdown.duration_ms"},
	]; 
	map[TriggerTypes.COUNTDOWN_STOP] = JSON.parse(JSON.stringify(map[TriggerTypes.COUNTDOWN_START]));
	map[TriggerTypes.COUNTDOWN_STOP].push(
		{tag:"END_AT", desc:"End date fromated", pointer:"countdown.endAt"},
		{tag:"END_AT_MS", desc:"End date in milliseconds", pointer:"countdown.endAt_ms"},
	)
	
	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:"AVATAR", desc:"User's avatar", pointer:"info.user.avatarPath"},
		{tag:"USER", desc:"User's name", pointer:"info.user.displayName"},
		{tag:"MESSAGE", desc:"Message without emotes", pointer:"info.message"},
	];
	
	map[TriggerTypes.CHAT_ALERT] = [
		{tag:"USER", desc:"User's name", pointer:"message.user.displayName"},
		{tag:"ALERT", desc:"User's message without emotes", pointer:"message.message"},
	];
	
	map[TriggerTypes.HYPE_TRAIN_START] = 
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] = [
		{tag:"LEVEL", desc:"Current level", pointer:"level"},
		{tag:"PERCENT", desc:"Current level progression (0 -> 100)", pointer:"percent"},
	];

	map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", desc:"Level reached", pointer:"level"},
		{tag:"PERCENT", desc:"Percent reached", pointer:"percent"},
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", desc:"Contains the voice's ID", pointer:"voiceID"},
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"DURATION", desc:"Timeout duration in seconds", pointer:"duration_s"},
	];

	map[TriggerTypes.VIP] = 
	map[TriggerTypes.UNVIP] = 
	map[TriggerTypes.MOD] = 
	map[TriggerTypes.UNMOD] = 
	map[TriggerTypes.UNBAN] = 
	map[TriggerTypes.BAN] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
	];

	map[TriggerTypes.SHOUTOUT] = [
		{tag:"USER", desc:"User's name", pointer:"user.displayName"},
		{tag:"AVATAR", desc:"User's avatar", pointer:"user.avatarPath"},
		{tag:"TITLE", desc:"Stream title", pointer:"stream.title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"stream.category"},
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = [
		{tag:"USER", desc:"User's name", pointer:"contribution.user.display_name"},
		{tag:"CONTRIBUTION", desc:"User's contribution", pointer:"contribution.amount"},
		{tag:"CONTRIBUTION_TOTAL", desc:"User's total contribution", pointer:"contribution.total_contribution"},
		{tag:"TITLE", desc:"Challenge title", pointer:"contribution.goal.title"},
		{tag:"DESCRIPTION", desc:"Challenge description", pointer:"contribution.goal.description"},
		{tag:"GOAL", desc:"Challenge goal", pointer:"contribution.goal.goal_amount"},
		{tag:"CURRENT", desc:"Challenge current progress", pointer:"contribution.goal.points_contributed"},
	];
	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", desc:"Challenge title", pointer:"contribution.goal.title"},
		{tag:"DESCRIPTION", desc:"Challenge description", pointer:"contribution.goal.description"},
		{tag:"GOAL", desc:"Challenge goal", pointer:"contribution.goal.goal_amount"},
		{tag:"CURRENT", desc:"Challenge current progress", pointer:"contribution.goal.points_contributed"},
	];

	//If requesting chat command helpers and there is a music
	//service available, concat the music service helpers
	if(key == TriggerTypes.CHAT_COMMAND
	&& Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
		map[key] = map[key].concat(map[TriggerTypes.TRACK_ADDED_TO_QUEUE]);
	}

	return map[key];
}

export const TriggerEvents:TriggerEventTypes[] = [
	{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:"Chat command", value:TriggerTypes.CHAT_COMMAND, isCategory:true, description:"Execute actions when sending a command on your chat", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, noToggle:true},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:"Any message", value:TriggerTypes.ANY_MESSAGE, isCategory:false, description:"Execute actions everytime a message is received on chat", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Channel point reward", value:TriggerTypes.REWARD_REDEEM, isCategory:true, description:"Execute an action when the following channel point reward is redeemed<br><mark>{SUB_ITEM_NAME}</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.REWARD, noToggle:true},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Community challenge progress", value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, isCategory:false, description:"Execute an action when a user contributes to a community challenge", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Community challenge complete", value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, isCategory:false, description:"Execute an action when a community challenge completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"info", label:"Stream info update", value:TriggerTypes.STREAM_INFO_UPDATE, description:"Execute an action when the stream info are updated", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE},
	{category:TriggerEventTypeCategories.USER, icon:"firstTime", label:"First message of a user all time", value:TriggerTypes.FIRST_ALL_TIME, description:"Execute an action when a user sends a message for the first time on your channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"firstTime", label:"First message of a user today", value:TriggerTypes.FIRST_TODAY, description:"Execute an action when a user sends a message for the first time today", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"returning", label:"Returning user", value:TriggerTypes.RETURNING_USER, description:"Execute an action when a user comes back after chatting at least twice in the last 30 days.", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"presentation", label:"User presentation", value:TriggerTypes.PRESENTATION, description:"Execute an action when a user sends a presentation message.", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"follow", label:"Follow", value:TriggerTypes.FOLLOW, description:"Execute an action when someone follows the channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.FOLLOWING},
	{category:TriggerEventTypeCategories.USER, icon:"raid", label:"Raid", value:TriggerTypes.RAID, description:"Execute an action when someone raids the channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID},
	{category:TriggerEventTypeCategories.GAMES, icon:"poll", label:"Poll result", value:TriggerTypes.POLL_RESULT, description:"Execute an action when a poll completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.POLL},
	{category:TriggerEventTypeCategories.GAMES, icon:"prediction", label:"Prediction result", value:TriggerTypes.PREDICTION_RESULT, description:"Execute an action when a prediction completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.PREDICTION},
	{category:TriggerEventTypeCategories.GAMES, icon:"ticket", label:"Raffle result", value:TriggerTypes.RAFFLE_RESULT, description:"Execute an action when a raffle completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAFFLE},
	{category:TriggerEventTypeCategories.GAMES, icon:"bingo", label:"Bingo result", value:TriggerTypes.BINGO_RESULT, description:"Execute an action when a bingo completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO},
	{category:TriggerEventTypeCategories.SUBITS, icon:"sub", label:"Sub", value:TriggerTypes.SUB, description:"Execute an action when someone subscribes to the channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
	{category:TriggerEventTypeCategories.SUBITS, icon:"gift", label:"Subgift", value:TriggerTypes.SUBGIFT, description:"Execute an action when someones subgifts someone else", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
	{category:TriggerEventTypeCategories.SUBITS, icon:"bits", label:"Bits", value:TriggerTypes.CHEER, description:"Execute an action when someone sends bits", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHEER},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train approach", value:TriggerTypes.HYPE_TRAIN_APPROACHING, description:"Execute an action when a hype train approaches", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train start", value:TriggerTypes.HYPE_TRAIN_START, description:"Execute an action when a hype train starts", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train progress", value:TriggerTypes.HYPE_TRAIN_PROGRESS, description:"Execute an action when a hype train progresses", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train end", value:TriggerTypes.HYPE_TRAIN_END, description:"Execute an action when a hype train ends", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train canceled", value:TriggerTypes.HYPE_TRAIN_CANCELED, description:"Execute an action when a hype train fails", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train cooldown", value:TriggerTypes.HYPE_TRAIN_COOLDOWN, description:"Execute an action when a hype train can, be started again", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN},
	{category:TriggerEventTypeCategories.MOD, icon:"timeout", label:"User timed out", value:TriggerTypes.TIMEOUT, description:"Execute an action when a user is <mark>/timeout</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.TIMEOUT},
	{category:TriggerEventTypeCategories.MOD, icon:"ban", label:"User banned", value:TriggerTypes.BAN, description:"Execute an action when a user is <mark>/ban</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.BAN},
	{category:TriggerEventTypeCategories.MOD, icon:"unban", label:"User unbanned", value:TriggerTypes.UNBAN, description:"Execute an action when a user is <mark>/unban</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNBAN},
	{category:TriggerEventTypeCategories.MOD, icon:"vip", label:"User /vip", value:TriggerTypes.VIP, description:"Execute an action when a user is added to your VIPs", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.VIP},
	{category:TriggerEventTypeCategories.MOD, icon:"unvip", label:"User /unvip", value:TriggerTypes.UNVIP, description:"Execute an action when a user is removed from your VIPs <i>(only works when using <mark>/unvip</mark> command from twitchat</i>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNVIP},
	{category:TriggerEventTypeCategories.MOD, icon:"mod", label:"User /mod", value:TriggerTypes.MOD, description:"Execute an action when a user is added to your mods", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.MOD},
	{category:TriggerEventTypeCategories.MOD, icon:"unmod", label:"User /unmod", value:TriggerTypes.UNMOD, description:"Execute an action when a user is removed from your mods <i>(only works when using <mark>/unmod</mark> command from twitchat</i>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNMOD},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Track added to queue", value:TriggerTypes.TRACK_ADDED_TO_QUEUE, description:"Execute an action when a music is added to the queue", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Music starts playing", value:TriggerTypes.MUSIC_START, description:"Execute an action when a music starts playing", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_START},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Music stops playing", value:TriggerTypes.MUSIC_STOP, description:"Execute an action when a music stops playing", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP},
	{category:TriggerEventTypeCategories.TIMER, icon:"date", label:"Scheduled actions", value:TriggerTypes.SCHEDULE, isCategory:true, description:"Execute actions regularly or at specific date/time", noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.GENERIC},
	{category:TriggerEventTypeCategories.TIMER, icon:"timer", label:"Timer start", value:TriggerTypes.TIMER_START, description:"Execute an action when a timer is started with the command <mark>/timerStart</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
	{category:TriggerEventTypeCategories.TIMER, icon:"timer", label:"Timer stop", value:TriggerTypes.TIMER_STOP, description:"Execute an action when a timer is stoped with the command <mark>/timerStop</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
	{category:TriggerEventTypeCategories.TIMER, icon:"countdown", label:"Countdown start", value:TriggerTypes.COUNTDOWN_START, description:"Execute an action when a countdown is started with the command <mark>/countdown</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
	{category:TriggerEventTypeCategories.TIMER, icon:"countdown", label:"Countdown stop", value:TriggerTypes.COUNTDOWN_STOP, description:"Execute an action when a countdown completes or is stoped", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"shoutout", label:"Shoutout", value:TriggerTypes.SHOUTOUT, description:"Execute an action when doing a shoutout via <mark>/so</mark> command or shoutout button", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:"Emergency start", value:TriggerTypes.EMERGENCY_MODE_START, description:"Execute an action when enabling the emergency mode", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:"Emergency stop", value:TriggerTypes.EMERGENCY_MODE_STOP, description:"Execute an action when stopping the emergency mode", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"highlight", label:"Highlighted message", value:TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, description:"Execute an action when requesting to highlight a message", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"alert", label:"Chat alert", value:TriggerTypes.CHAT_ALERT, description:"Execute an action when the Chat Alert feature is triggered <i>(Parameters => Features => Enable chat alert)</i>", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"voicemod", label:"Voicemod - voice changed", value:TriggerTypes.VOICEMOD, description:"Execute an action when changing the voice effect on voicemod", testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
]

export const TriggerMusicTypes = {
	ADD_TRACK_TO_QUEUE:"1",
	NEXT_TRACK:"2",
	PAUSE_PLAYBACK:"3",
	RESUME_PLAYBACK:"4",
	GET_CURRENT_TRACK:"5",
	START_PLAYLIST:"6",
} as const;
export type TriggerMusicTypesValue = typeof TriggerMusicTypes[keyof typeof TriggerMusicTypes];

export const MusicTriggerEvents:TriggerEventTypes[] = [
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Add a track to the queue", value:TriggerMusicTypes.ADD_TRACK_TO_QUEUE},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Play next track", value:TriggerMusicTypes.NEXT_TRACK},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Pause playback", value:TriggerMusicTypes.PAUSE_PLAYBACK},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Resume playback", value:TriggerMusicTypes.RESUME_PLAYBACK},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Start playlist", value:TriggerMusicTypes.START_PLAYLIST},
]

export const TriggerScheduleTypes = {
	REGULAR_REPEAT:"1",
	SPECIFIC_DATES:"2",
} as const;

export const ScheduleTriggerEvents:TriggerEventTypes[] = [
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", label:"Regular repeat", value:TriggerScheduleTypes.REGULAR_REPEAT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", label:"Specific dates", value:TriggerScheduleTypes.SPECIFIC_DATES},
]