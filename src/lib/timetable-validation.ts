import { z } from "zod";
export const weekdays=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).transform(v=>Number(v.slice(0,2))*60+Number(v.slice(3)));
export const lessonInput=z.object({
  assignment_id:z.uuid(),weekday:z.enum(["1","2","3","4","5","6","7"]).transform(Number),
  start_time:time,end_time:time,starts_on:z.iso.date(),ends_on:z.iso.date(),
}).refine(v=>v.end_time>v.start_time && v.ends_on>=v.starts_on);
export const lessonRemoval=z.object({id:z.uuid(),confirm:z.literal("yes")});
export function minuteLabel(minute:number){return `${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;}
export type LessonRow={id:string;assignment_id:string;class_id:string;weekday:number;start_minute:number;end_minute:number;starts_on:string;ends_on:string};
export type LessonAssignment={id:string;label:string;starts_on:string;ends_on:string;class_id:string};
