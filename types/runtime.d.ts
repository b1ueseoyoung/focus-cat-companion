declare module 'claude-code' { interface PluginState { 'focus-cat-companion': {
timerRuntime: StateFamily<{version:number;phase:string;remaining:number;completed:number;status:string;motion:number;visible:boolean;last:number}>;
companionRuntime: StateFamily<{version:number;owner:string;turnId:string|null;active:boolean;reason:string;waiting:string[];tools:[string,string][];approvals?:{token:string;tool:string;ids:string[]}[];x:number;direction:number;frame:number;reduced:boolean;character?:'a'|'b';turnHold?:number;danceActive?:boolean;danceHeld?:boolean;danceFrame?:number;completionEligible?:boolean;lastCompletedTurnId?:string|null}>;
} } }
