"use client";
import { useActionState,useState } from "react";
import { saveLesson,removeLesson } from "@/app/dashboard/timetable/actions";
import { weekdays,minuteLabel,type LessonRow,type LessonAssignment } from "@/lib/timetable-validation";
function RemoveLesson({id}:{id:string}){
  const [state,action,pending]=useActionState(removeLesson,{error:"",saved:false});
  return <details className="record-editor"><summary>Remove recurring lesson</summary><form action={action} className="access-form"><input type="hidden" name="id" value={id}/><label><span><input type="checkbox" name="confirm" value="yes" required disabled={pending}/> Remove this lesson for its entire date range</span></label>{state.error&&<p role="alert" className="error-message">{state.error}</p>}<button className="button secondary" disabled={pending}>{pending?"Removing…":"Remove lesson"}</button></form></details>;
}
export function Timetable({assignments,lessons,timezone}:{assignments:LessonAssignment[];lessons:LessonRow[];timezone:string}){
  const [selected,setSelected]=useState("");const [filter,setFilter]=useState("");
  const [state,action,pending]=useActionState(saveLesson,{error:"",saved:false});
  const assignment=assignments.find(a=>a.id===selected);
  const filtered=lessons.filter(l=>!filter||l.assignment_id===filter);
  return <><div className="quiet-note"><p>Weekly lessons in {timezone}. This is an administrator planning view. Holidays, rotating weeks, rooms and shared co-teaching lessons are not included yet.</p></div><div className="academic-grid">
    <section className="content-panel"><h2>Weekly timetable</h2><div className="access-form"><label>Filter by teaching assignment<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All assignments</option>{assignments.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label></div>
    {weekdays.map((day,i)=><section key={day} style={{marginTop:20}}><h3>{day}</h3><ul className="academic-list">{filtered.filter(l=>l.weekday===i+1).map(l=><li key={l.id}><strong>{minuteLabel(l.start_minute)}–{minuteLabel(l.end_minute)}</strong><span>{assignments.find(a=>a.id===l.assignment_id)?.label??"Assignment unavailable"}</span><span>{l.starts_on} – {l.ends_on}</span><RemoveLesson id={l.id}/></li>)}</ul>{!filtered.some(l=>l.weekday===i+1)&&<p className="small muted">No lessons scheduled.</p>}</section>)}
    </section><section className="content-panel"><h2>Add a weekly lesson</h2><form action={action} className="access-form">
      <label>Teaching assignment<select name="assignment_id" value={selected} onChange={e=>setSelected(e.target.value)} required disabled={pending||!assignments.length}><option value="" disabled>Select teacher, subject and class</option>{assignments.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
      <label>Weekday<select name="weekday" defaultValue="1" disabled={pending}>{weekdays.map((day,i)=><option key={day} value={i+1}>{day}</option>)}</select></label>
      <label>Lesson start time<input type="time" name="start_time" required disabled={pending}/></label><label>Lesson end time<input type="time" name="end_time" required disabled={pending}/></label>
      <label>Schedule from<input key={`start-${selected}`} type="date" name="starts_on" defaultValue={assignment?.starts_on} min={assignment?.starts_on} max={assignment?.ends_on} required disabled={pending||!assignment}/></label>
      <label>Schedule until<input key={`end-${selected}`} type="date" name="ends_on" defaultValue={assignment?.ends_on} min={assignment?.starts_on} max={assignment?.ends_on} required disabled={pending||!assignment}/></label>
      {!assignments.length&&<p className="muted">Create a teaching assignment first.</p>}
      <p className="small muted">Repeats each selected weekday within this inclusive date range. Adjacent lessons may share an end/start time.</p>
      {state.error&&<p role="alert" className="error-message">{state.error}</p>}{state.saved&&<p role="status" className="success-message">Weekly lesson saved.</p>}
      <button className="button primary" disabled={pending||!assignment}>{pending?"Saving…":"Add weekly lesson"}</button>
    </form></section></div></>;
}
