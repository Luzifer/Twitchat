import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { TrackedUser } from '@/utils/CommonDataTypes';
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { ChatUserstate } from 'tmi.js';
import type { UnwrapRef } from 'vue';
import { storeChat } from '../chat/storeChat';
import type { IUsersActions, IUsersGetters, IUsersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

let unbanFlagTimeouts:{[key:string]:number} = {};

export const storeUsers = defineStore('users', {
	state: () => ({
		users: [],
		userCard: null,
		onlineUsers: [],
		trackedUsers: [],
		blockedUsers: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
		},
		followingStates: {},
		followingStatesByNames: {},
		myFollowings: {},
	} as IUsersState),



	getters: {
	} as IUsersGetters
	& ThisType<UnwrapRef<IUsersState> & _StoreWithGetters<IUsersGetters> & PiniaCustomProperties>
	& _GettersTree<IUsersState>,



	actions: {
		/**
		 * Gets a user by their source from their ID nor login.
		 * It registers the user on the local DB "this.users" to get them back later.
		 * If only the login is given, the user's data are loaded asynchronously from
		 * remote API then added to the local DB while returning a temporary user object.
		 * 
		 * @param source 
		 * @param id 
		 * @param login 
		 * @param displayName 
		 * @returns 
		 */
		getUserFrom(source:TwitchatDataTypes.ChatSource, id?:string, login?:string, displayName?:string, isMod?:boolean, isVIP?:boolean, isBoradcaster?:boolean, isSub?:boolean):TwitchatDataTypes.TwitchatUser {
			let user:TwitchatDataTypes.TwitchatUser|undefined;
			//Search for the requested user
			//Don't use "users.find(...)", perfs are much lower than good old for() loop
			//find() takes ~10-15ms for 1M users VS ~3-4ms for the for() loop
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.source != source) continue;
				if(u.id === id) { user = u; break; }
				if(u.login === login) { user = u; break; }
			}
			//Create user if enough given info
			if(!user && id && login) {
				if(!displayName) displayName = login;
				user = { source, id, login, displayName, greeted:false, online:true };
				if(this.blockedUsers[source][id] === true) {
					user.is_blocked = true;
				}
				this.users.push(user);
			}
			//If we don't have enough info, create a temp user object and load
			//its details from the API then register it if found.
			if(!user && (login || id)) {
				user = { source, id:id??"", login:login??"", displayName:login??"", temporary:true, greeted:false, online:true};
				if(source == "twitch") {
					TwitchUtils.loadUserInfo(id? [id] : undefined, login ? [login] : undefined).then(res => {
						//This just makes the rest of the code know that the user
						//actually exists as it cannot be undefined anymore once
						//we're here.
						user = user!;

						if(res.length > 0) {
							user.id = res[0].id;
							user.login = res[0].login;
							user.displayName = res[0].display_name;
							if(this.blockedUsers[source][user.id] === true) {
								user.is_blocked = true;
							}
							delete user.temporary;
							this.users.push(user);
							this.checkFollowerState(user);
							this.checkPronouns(user);
						}
					});
				}
			}
			
			//This just makes the rest of the code know that the user
			//actually exists as it cannot be undefined anymore once
			//we're here.
			user = user!;

			this.checkFollowerState(user);
			this.checkPronouns(user);
			if(isMod) user.is_moderator = true;
			if(isVIP) user.is_vip = true;
			if(isSub) user.is_subscriber = true;
			if(isBoradcaster) user.is_broadcaster = true;
			return user;
		},

		async initBlockedUsers():Promise<void> {
			//Get list of all blocked users and build a hashmap out of it
			try {
				const blockedUsers = await TwitchUtils.getBlockedUsers();
				for (let i = 0; i < blockedUsers.length; i++) {
					this.blockedUsers["twitch"][ blockedUsers[i].user_id ] = true;
				}
			}catch(error) {/*ignore*/}
		},

		flagMod(source:TwitchatDataTypes.ChatSource, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && source == u.source) {
					this.users[i].is_moderator = true;
					break;
				}
			}
		},
		
		flagUnmod(source:TwitchatDataTypes.ChatSource, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && source == u.source) {
					this.users[i].is_moderator = false;
					break;
				}
			}
		},

		flagBlocked(source:TwitchatDataTypes.ChatSource, uid:string):void {
			this.blockedUsers[source][uid] = true;
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && source == u.source) {
					this.users[i].is_blocked = true;
					break;
				}
			}
		},
		
		flagUnblocked(source:TwitchatDataTypes.ChatSource, uid:string):void {
			delete this.blockedUsers[source][uid];
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && source == u.source) {
					this.users[i].is_blocked = false;
					break;
				}
			}
		},

		flagBanned(source:TwitchatDataTypes.ChatSource, uid:string, duration_s?:number):void {
			this.blockedUsers[source][uid] = true;
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && source == u.source) {
					this.users[i].is_banned = true;
					break;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}
			if(duration_s != undefined) {
				//Auto unflag the user once timeout expires
				unbanFlagTimeouts[uid] = setTimeout(()=> {
					StoreProxy.users.flagUnbanned("twitch", uid);
				}, duration_s*1000)
			}
		},
		
		flagUnbanned(source:TwitchatDataTypes.ChatSource, uid:string):void {
			delete this.blockedUsers[source][uid];
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && source == u.source) {
					this.users[i].is_banned = false;
					break;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}
		},

		//Check if user is following
		checkFollowerState(user:TwitchatDataTypes.TwitchatUser):void {
			if(user.id && StoreProxy.params.appearance.highlightNonFollowers.value === true) {
				if(this.followingStates[user.id] == undefined) {
					TwitchUtils.getFollowState(user.id, UserSession.instance.twitchUser!.id).then((res:boolean) => {
						this.followingStates[user.id!] = res;
						this.followingStatesByNames[user.login.toLowerCase()] = res;
					}).catch(()=>{/*ignore*/})
				}
			}
		},

		//Check for user's pronouns
		checkPronouns(user:TwitchatDataTypes.TwitchatUser):void {
			if(!user.id || user.pronouns != undefined || StoreProxy.params.features.showUserPronouns.value === false) return;
			TwitchUtils.getPronouns(user.id, user.login).then((res: TwitchatDataTypes.Pronoun | null) => {
				if (res !== null) {
					user.pronouns = res.pronoun_id;
				}else{
					user.pronouns = false;
				}
					
			}).catch(()=>{/*ignore*/})
			
		},

		flagAsFollower(user:TwitchatDataTypes.TwitchatUser):void {
			if(user.id && user.login) {
				this.followingStates[user.id!] = true;
				this.followingStatesByNames[user.login.toLowerCase()] = true;
			}
		},

		addUser(user:TwitchatDataTypes.TwitchatUser):void {
			const exists = this.getUserFrom(user.source, user.id, user.login);
			if(!exists) {
				this.users.push(user);
			}
		},

		openUserCard(payload:string|null) { this.userCard = payload; },

		async loadMyFollowings():Promise<void> {
			const followings = await TwitchUtils.getFollowings(UserSession.instance.twitchUser?.id);
			let hashmap:{[key:string]:boolean} = {};
			followings.forEach(v => {
				hashmap[v.to_id] = true;
			});
			this.myFollowings = hashmap;
		},

		setViewersList(users:string[]) {
			//Dedupe users
			const list:string[] = [];
			const done:{[key:string]:boolean} = {};
			for (let i = 0; i < users.length; i++) {
				const user = users[i];
				if(!done[user]) {
					list.push(user);
					done[user] = true;
				}
			}
			this.onlineUsers.splice(0, this.onlineUsers.length);//cleanup prev users
			this.onlineUsers = this.onlineUsers.concat(list);//Add new users
			//Don't just do "this.onlineUsers = users" or the arrays's reference/reactivity
			//accross the app would be broken
		},

		flagLowTrustMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number) {
			const sChat = storeChat();
			//Ignore message if user is "restricted"
			if(data.low_trust_user.treatment == 'RESTRICTED') return;

			const list = sChat.messages;
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.id == data.message_id && m.type == "message") {
					m.twitch_isLowTrust = true;
					return;
				}
			}

			//If reaching this point, it's most probably because pubsub sent us the
			//event before receiving message on IRC. Wait a little and try again
			if(retryCount != 20) {
				retryCount = retryCount? retryCount++ : 1;
				setTimeout(()=>{
					this.flagLowTrustMessage(data, retryCount);
				}, 100);
			}
		},

		trackUser(user:TwitchatDataTypes.TwitchatUser):{user:TwitchatDataTypes.TwitchatUser, messages:TwitchatDataTypes.MessageChatData[]}|null {
			const index = this.trackedUsers.findIndex(v=>v.user.id == user.id);
			if(index == -1) {
				//Was not tracked, track the user
				const data = {user, messages:[]};
				this.trackedUsers.push(data);
				return data;
			}else{
				//User was already tracked, untrack her/him
				this.trackedUsers.splice(index,1);
			}
			return null;
		},

		untrackUser(payload:ChatUserstate) {
			const list = this.trackedUsers as TrackedUser[];
			const index = list.findIndex(v=>v.user['user-id'] == payload['user-id']);
			if(index != -1) {
				this.trackedUsers.splice(index, 1);
			}
		},
	} as IUsersActions
	& ThisType<IUsersActions
		& UnwrapRef<IUsersState>
		& _StoreWithState<"users", IUsersState, IUsersGetters, IUsersActions>
		& _StoreWithGetters<IUsersGetters>
		& PiniaCustomProperties
	>,
})