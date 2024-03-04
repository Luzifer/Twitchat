import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IPredictionActions, type IPredictionGetters, type IPredictionState } from '../StoreProxy';
import DataStore from '../DataStore';

export const storePrediction = defineStore('prediction', {
	state: () => ({
		data: null,
		overlayParams: {
			showTitle:true,
			listMode:true,
			listModeOnlyMore2:true,
			showLabels:true,
			showVotes:false,
			showVoters:false,
			showPercent:false,
			showProgress:true,
		},
	} as IPredictionState),



	getters: {
	} as IPredictionGetters
	& ThisType<UnwrapRef<IPredictionState> & _StoreWithGetters<IPredictionGetters> & PiniaCustomProperties>
	& _GettersTree<IPredictionState>,



	actions: {
		setPrediction(data:TwitchatDataTypes.MessagePredictionData|null, postOnChat?:boolean) {
			if(data != null) {
				if(postOnChat) {
					StoreProxy.chat.addMessage(data);
				}

				PublicAPI.instance.broadcast(TwitchatEvent.PREDICTION_PROGRESS, {prediction: (data as unknown) as JsonObject});
			}else if(this.data){
				PublicAPI.instance.broadcast(TwitchatEvent.PREDICTION_PROGRESS, {});
			}

			this.data = data;
		},

		populateData(params:PredictionOverlayParamStoreData):void {
			this.overlayParams.showTitle =			params.showTitle !== false;
			this.overlayParams.listMode =			params.listMode !== false;
			this.overlayParams.listModeOnlyMore2 =	params.listModeOnlyMore2 !== false;
			this.overlayParams.showLabels =			params.showLabels !== false;
			this.overlayParams.showVotes =			params.showVotes !== false;
			this.overlayParams.showVoters =			params.showVoters !== false;
			this.overlayParams.showPercent =		params.showPercent !== false;
			this.overlayParams.showProgress =		params.showProgress !== false;
		},

		setOverlayParams(params:PredictionOverlayParamStoreData):void {
			this.populateData(params);
			DataStore.set(DataStore.PREDICTION_OVERLAY_PARAMS, this.overlayParams);
			PublicAPI.instance.broadcast(TwitchatEvent.PREDICTIONS_OVERLAY_PARAMETERS, {parameters: (this.overlayParams as unknown) as JsonObject});
		}
	} as IPredictionActions
	& ThisType<IPredictionActions
		& UnwrapRef<IPredictionState>
		& _StoreWithState<"prediction", IPredictionState, IPredictionGetters, IPredictionActions>
		& _StoreWithGetters<IPredictionGetters>
		& PiniaCustomProperties
	>,
});

export interface PredictionOverlayParamStoreData {
	listMode:boolean;
	listModeOnlyMore2:boolean;
	showTitle:boolean;
	showLabels:boolean;
	showVotes:boolean;
	showVoters:boolean;
	showPercent:boolean;
	showProgress:boolean;
}