<template>
	<div class="triggeractioncustomchatentry triggerActionForm">
		<ParamItem :paramData="param_icon" v-model="action.customMessage.icon" class="iconField" />

		<ParamItem :paramData="param_col" v-model="action.customMessage.col" class="colField" />

		<ParamItem :paramData="param_style" v-model="action.customMessage.style">
			<ParamItem :paramData="param_highlight" v-model="action.customMessage.highlightColor" v-if="action.customMessage.style == 'highlight'" noBackground />
		</ParamItem>

		<ParamItem :paramData="param_user" v-if="action.customMessage.user" v-model="action.customMessage.user.name">
			<ParamItem :paramData="param_userColor" v-model="action.customMessage.user!.color" noBackground />
		</ParamItem>

		<ParamItem :paramData="param_message" v-if="action.customMessage.user" v-model="action.customMessage.message" />
		
		<div class="actions">
			<div v-for="(cta, index) in action.customMessage.actions" :key="index" class="card-item action">
				<ParamItem :paramData="actionParams[index].icon" v-model="cta.icon" noBackground />
				<ParamItem :paramData="actionParams[index].theme" v-model="cta.theme" noBackground />
				<ParamItem :paramData="actionParams[index].actionType" v-model="cta.actionType" noBackground>
					<ParamItem :paramData="actionParams[index].url" v-model="cta.url" v-if="cta.actionType == 'url'" noBackground />
					<SimpleTriggerList class="child list" v-else-if="!cta.triggerId" @select="(id:string) => cta.triggerId = id" />
					<SimpleTriggerList class="child" v-else :filteredItemId="cta.triggerId" @click="cta.triggerId = ''" />
				</ParamItem>
				<ParamItem :paramData="actionParams[index].label" v-model="cta.label" noBackground />
				<Button class="deleteBt" icon="trash" @click="delAction(index)" alert>{{ $t("global.delete") }}</Button>
			</div>
			<Button class="addBt" icon="add" @click="addAction()">{{ $t("triggers.actions.customChat.add_actionBt") }}</Button>
		</div>

		<div class="message">
			<ChatCustomMessage :messageData="messageData" tabindex="-1" demo />
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ChatCustomMessage from '@/components/messages/ChatCustomMessage.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionCustomMessageData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { reactive } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import SimpleTriggerList from '../SimpleTriggerList.vue';

@Component({
	components:{
		Button,
		ParamItem,
		SimpleTriggerList,
		ChatCustomMessage,
	},
	emits:[],
})
export default class TriggerActionCustomChatEntry extends Vue {
	
	@Prop
	public action!:TriggerActionCustomMessageData;
	@Prop
	public triggerData!:TriggerData;

	public actionParams:Key2ParamMap[] = [];
	
	public param_col:TwitchatDataTypes.ParameterData<number> = {type:"list", value:-1, labelKey:"triggers.actions.customChat.param_col"};
	public param_icon:TwitchatDataTypes.ParameterData<string> = {type:"imagelist", value:"", labelKey:"triggers.actions.customChat.param_icon"};
	public param_style:TwitchatDataTypes.ParameterData<TwitchatDataTypes.MessageCustomData["style"] | "",TwitchatDataTypes.MessageCustomData["style"] | ""> = {type:"list", value:"", labelKey:"triggers.actions.customChat.param_style"};
	public param_highlight:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"", labelKey:"triggers.actions.customChat.param_highlight_color"};
	public param_userColor:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"", labelKey:"triggers.actions.customChat.param_user_color"};
	public param_user:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:25, labelKey:"triggers.actions.customChat.param_user"};
	public param_message:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, maxLength:1000, labelKey:"triggers.actions.customChat.param_message"};
		
	private iconList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
	private buttonThemes:TwitchatDataTypes.ParameterDataListValue<NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]["theme"]>[] = [];
	private actionTypes:TwitchatDataTypes.ParameterDataListValue<NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]["actionType"]>[] = [];

	public get messageData():TwitchatDataTypes.MessageCustomData {
		const chunks = TwitchUtils.parseMessageToChunks(this.action.customMessage.message || "", undefined, true);
		return  {
			id:"",
			col:-1,
			date:Date.now(),
			platform:"twitchat",
			type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
			highlightColor:this.action.customMessage.highlightColor,
			style:this.action.customMessage.style,
			user:this.action.customMessage.user,
			icon:this.action.customMessage.icon,
			actions:this.action.customMessage.actions,
			message: this.action.customMessage.message,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
		}
	}

	public makeReactive<U>(data:any):U {
		return reactive(data);
	}

	public beforeMount():void {
		if(!this.action.customMessage) {
			this.action.customMessage = {
				user:{
					name:"",
					color:"#e04e00"
				},
				highlightColor:"#000000",
				actions:[],
			}
		}
		if(!this.action.customMessage.actions) {
			this.action.customMessage.actions = [];
		}
		
		let iconList = import.meta.glob("@/assets/icons/*.svg");
		const validKeys = Object.keys(iconList).map(v=>v.replace(/.*\/(.*?).svg/, "$1"));
		const keys = ["ad","add","alert","animate","announcement","anon","api","automod","badge","ban","bingo","bits","block","boost","bot","broadcast","broadcaster","change","channelPoints","chatCommand","chatPoll","checkmark","clearChat","click","clip","coffee","coin","color","commands","conversation","copy","count","countdown","credits","cross","date","debug","delete","dice","discord","donor","download","dragZone","easing","edit","elevated","elgato","emergency","emote","enter","filters","firstTime","fix","follow","follow_outline","font","fontSize","fullscreen","gift","github","goxlr","goxlr_bleep","goxlr_fx","hand","heat","help","hide","highlight","history","hypeChat","idea","info","internet","kofi","leave","list","live","loader","lock","loop","magnet","markRead","max","merge","microphone","microphone_mute","microphone_recording","min","minus","mod","move","music","mute","newtab","next","noMusic","notification","number","obs","offline","online","orderable","overlay","params","partner","patreon","pause","paypal","pin","pipette","placeholder","play","poll","polygon","prediction","premium","presentation","press","prev","prime","pros","raid","read","refresh","reply","returning","reward_highlight","rightClick","rotate","save","scale","scroll","scrollDown","scrollUp","search","shadow","shield","shieldMode","shoutout","show","skip","slow","spotify","stars","stop","sub","test","thickness","ticket","timeout","timer","train","train_boost","translate","trash","tts","twitch","twitchat","twitter","ulule","unban","unblock","unfollow","unlock","unmod","unmute","unpin","unvip","update","upload","url","user","vibrate","vip","voice","voicemod","volume","watchStreak","whispers","youtube"]
					.filter(v=> validKeys.includes(v));
		keys.unshift("");
		this.iconList = keys.map(v=> {return {value:v, icon:v, label:v}});
		this.param_icon.listValues = this.iconList.concat();

		const cols = this.$store("params").chatColumnsConfig.length;
		const params:TwitchatDataTypes.ParameterDataListValue<number>[] = [];
		params.push({value:-1, labelKey:"triggers.actions.customChat.param_col_all"})
		for (let i = 0; i < cols; i++) params.push({value:i, label:(i+1).toString()});
		this.param_col.listValues = params;

		this.param_style.listValues = [
			{value:"message", labelKey:"triggers.actions.customChat.param_style_message"},
			{value:"highlight", labelKey:"triggers.actions.customChat.param_style_highlight"},
			{value:"error", labelKey:"triggers.actions.customChat.param_style_error"},
		]

		this.buttonThemes = [
			{value:"default", label:"default"},
			{value:"primary", label:"primary"},
			{value:"secondary", label:"secondary"},
			{value:"alert", label:"alert"},
		];

		this.actionTypes = [
			{value:"url", labelKey:"triggers.actions.customChat.param_action_type_url"},
			{value:"trigger", labelKey:"triggers.actions.customChat.param_action_type_trigger"},
		];
		for (let i = 0; i < this.action.customMessage.actions.length; i++) {
			const a = this.action.customMessage.actions[i];
			this.addAction(a);
		}
	}

	public addAction(source?:NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]):void {
		if(!source) {
			source = {
				label:"",
				icon:"",
				theme:"",
				actionType:"url",
				url:"",
				triggerId:"",
			}
			if(!this.action.customMessage.actions) this.action.customMessage.actions = [];
			this.action.customMessage.actions.push(source);
		}

		const params:Key2ParamMap = {
			icon:{type:'imagelist', value:'', listValues:this.iconList.concat(), labelKey:'triggers.actions.customChat.param_action_icon'},
			actionType:{type:'list', value:'', listValues:this.actionTypes, labelKey:'triggers.actions.customChat.param_action_type'},
			url:{type:"string", value:"", maxLength: 1000, labelKey:"triggers.actions.customChat.param_action_url"},
			triggerId:{type:"string", value:""},
			label:{type:"string", value:"", maxLength:40, labelKey:"triggers.actions.customChat.param_action_label"},
			theme:{type:"list", value:'', listValues:this.buttonThemes, labelKey:"triggers.actions.customChat.param_action_theme"},
		}
		this.actionParams.push(params);
	}

	public delAction(index:number):void {
		this.action.customMessage.actions!.splice(index, 1);
	}

}

type keys = keyof NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number];
type Key2ParamMap = {
  [K in keys]: TwitchatDataTypes.ParameterData<unknown>;
};
</script>

<style scoped lang="less">
.triggeractioncustomchatentry{
	.message {
		.bevel();
		padding: .5em;
		border-radius: var(--border-radius);
		* > {
			flex-grow: 1;
			position: relative;
		}
	}
	.iconField {
		:deep(.listField) {
			max-width: 100px;
		}
	}
	.colField {
		:deep(select) {
			max-width: 100px;
		}
	}

	.actions {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.addBt {
			align-self: center;
		}
		.action {
			gap: .5em;
			display: flex;
			flex-direction: column;

			.child::before {
				position: absolute;
				left: -1em;
				top: 0.1em;
				font-size: 1rem;
				content: "⤷";
				display: block;
			}
			.deleteBt {
				align-self: center;
			}
		}
	}
}
</style>