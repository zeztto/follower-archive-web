export type OptionalCategory='pendingFollowRequests'|'recentFollowRequests'|'blockedProfiles'|'recentlyUnfollowed'|'removedSuggestions';
export interface AnalysisData {
 followers:string[];following:string[];mutual:string[];notFollowingBack:string[];notFollowedBack:string[];
 pendingFollowRequests?:string[];recentFollowRequests?:string[];blockedProfiles?:string[];recentlyUnfollowed?:string[];removedSuggestions?:string[];
 provided?:OptionalCategory[];
}
