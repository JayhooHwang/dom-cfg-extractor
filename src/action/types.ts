export type ApplyFor = 'single'|'group'
export type ActionData = string | string[];
export type ActionHandle = SingleActionHandle|GroupActionHandle;
export type SingleActionHandle = (data: string, ...params: string[]) => string;
export type GroupActionHandle = (data: string[], ...params: string[]) => string[];
export type ActionCaller = string | { name:string, params:string[] }