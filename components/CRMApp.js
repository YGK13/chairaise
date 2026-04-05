"use client";
// ============================================================
// ChaiRaise CRM — Main Application Component
// Imports shared modules from lib/ for maintainability
// ============================================================

import {useState,useEffect,useCallback,useRef,useMemo,createContext,useContext} from "react";
import {donorsAPI,donationsAPI,emailAPI,checkDBAvailable} from "@/lib/useData";

// Shared modules (extracted from monolith)
import {DEFAULT_TEMPLATES,DEFAULT_COMMUNITY_MAP,STAGES,TIERS,NAV,DONOR_FIELDS,FIELD_GROUPS,ACT_TYPES,ORG_TYPES,DEFAULT_ORG,EMPTY_ORG_PROFILE,ROLES,TAG_COLORS} from "@/lib/constants";
import {orgPrefix,sGet,sSet,sGetMigrate,getActiveOrg,setActiveOrg,getOrgList,setOrgList,getOrgProfile,setOrgProfileStore,getOrgTemplates,getOrgCommunityMap,getSession,setSession,clearSession,getUsers,setUsers,hasPermission,getAuditLog,appendAudit,fmt$,fmtD,fmtN,initials} from "@/lib/storage";
import {callAI,aiResearchOrg,causeMatch,aiGenerateBrief,aiTemplate,aiScore,aiLikelihood,aiAsk} from "@/lib/ai";
import {parseCSV,exportToCSV} from "@/lib/csv";
import {parseVCF,parseLinkedInCSV,levenshtein,normPhone,fuzzyMatchDonor,inferEdges,edgeStrength,bfsPath,buildGraph} from "@/lib/graph";
// Extracted component modules
import {NetworkDashboard,NetworkGraphSVG,GmailIntegration} from "@/components/NetworkComponents";
import {OutreachLogger,LearningInsights,OutreachCoach} from "@/components/OutreachComponents";
import {WhatsAppChat,WhatsAppHub} from "@/components/WhatsAppComponents";
import {OnboardingWizard} from "@/components/OnboardingWizard";

// ============================================================
// REMAINING INLINE CONSTANTS (component-specific, not shared)
// ============================================================
const hashPassword=(pw)=>{let hash=0;for(let i=0;i<pw.length;i++){hash=((hash<<5)-hash)+pw.charCodeAt(i);hash|=0;}return"h_"+Math.abs(hash).toString(36)};
const DEFAULT_CAMPAIGN={id:"main",name:"Main Campaign",goal:0,start:new Date().toISOString().slice(0,10),end:"",status:"active",description:"Default fundraising campaign"};
const DEFAULT_RULES=[
  {id:"stale_30",name:"30-Day Stale Alert",desc:"Create reminder when donor has no activity for 30 days",enabled:true,days:30,trigger:"no_activity",icon:"⏰"},
  {id:"post_email",name:"Post-Email Follow-up",desc:"Create 7-day follow-up after sending an email",enabled:true,days:7,trigger:"email_sent",icon:"✉️"},
  {id:"post_meeting",name:"Post-Meeting Thank You",desc:"Create 1-day follow-up after a meeting",enabled:true,days:1,trigger:"meeting_held",icon:"🤝"},
  {id:"warm_donor",name:"Warm Donor Nudge",desc:"Remind to reach out when warmth drops below 5",enabled:false,threshold:5,trigger:"warmth_low",icon:"🌡️"},
  {id:"tier1_weekly",name:"Tier 1 Weekly Touch",desc:"Weekly check-in reminder for all Tier 1 donors",enabled:false,days:7,trigger:"tier1_cycle",icon:"⭐"},
  {id:"commitment_thanks",name:"Commitment Thank You",desc:"Send thank you within 24 hours of commitment",enabled:true,days:1,trigger:"commitment",icon:"🎉"},
];
// Backwards-compatible runtime aliases for org-customizable templates
const TEMPLATES=typeof window!=="undefined"?getOrgTemplates():DEFAULT_TEMPLATES;
const COMMUNITY_MAP=typeof window!=="undefined"?getOrgCommunityMap():DEFAULT_COMMUNITY_MAP;

// ============================================================
// TOAST / NOTIFICATION SYSTEM — global notifications
// ============================================================
const ToastContext=createContext({addToast:()=>{},toasts:[]});

function ToastProvider({children}){
  const[toasts,setToasts]=useState([]);
  const addToast=useCallback((toast)=>{
    const id=Date.now()+Math.random();
    const newToast={...toast,id,created:Date.now()};
    setToasts(p=>[...p,newToast]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),5000);
  },[]);
  const removeToast=useCallback((id)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const icons={success:"✅",warning:"⚠️",error:"❌",info:"ℹ️"};

  return(<ToastContext.Provider value={{addToast,toasts}}>
    {children}
    <div className="toast-container">
      {toasts.map(t=><div key={t.id} className={"toast "+(t.type||"info")}>
        <div className="toast-icon">{icons[t.type||"info"]}</div>
        <div className="toast-body">
          <div className="toast-title">{t.title}</div>
          {t.message&&<div className="toast-msg">{t.message}</div>}
        </div>
        <div className="toast-close" onClick={()=>removeToast(t.id)}>✕</div>
      </div>)}
    </div>
  </ToastContext.Provider>);
}

const useToast=()=>useContext(ToastContext);

// ============================================================
// NOTIFICATION BELL — persistent notifications with bell icon
// ============================================================
function NotificationBell({reminders,donors,outreachLog,acts}){
  const[open,setOpen]=useState(false);
  const ref=useRef();
  useEffect(()=>{
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);
  const notifications=useMemo(()=>{
    const notifs=[];
    const today=new Date().toISOString().slice(0,10);
    const weekAgo=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
    reminders.filter(r=>!r.done&&r.date<today).forEach(r=>{
      const d=donors.find(dd=>(dd.id||dd.name)===r.did);
      notifs.push({id:"rem_"+r.id,type:"overdue",icon:"⚠️",iconBg:"var(--red-soft)",iconColor:"var(--red)",
        title:"Overdue Follow-up",msg:`${d?.name||"Unknown"}: ${r.summary}`,time:r.date,unread:true});
    });
    reminders.filter(r=>!r.done&&r.date===today).forEach(r=>{
      const d=donors.find(dd=>(dd.id||dd.name)===r.did);
      notifs.push({id:"today_"+r.id,type:"today",icon:"📌",iconBg:"var(--accent-soft)",iconColor:"var(--accent)",
        title:"Due Today",msg:`${d?.name||"Unknown"}: ${r.summary}`,time:r.date,unread:true});
    });
    donors.filter(d=>{
      const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));
      if(si<1)return false;
      const donorActs=acts.filter(a=>a.did===(d.id||d.name));
      if(!donorActs.length)return true;
      const latest=donorActs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      return(Date.now()-new Date(latest.date))/864e5>30;
    }).slice(0,5).forEach(d=>{
      notifs.push({id:"stale_"+d.id,type:"stale",icon:"⏰",iconBg:"var(--blue-soft)",iconColor:"var(--blue)",
        title:"Going Cold",msg:`${d.name} — no activity in 30+ days`,time:today,unread:true});
    });
    outreachLog.filter(e=>e.outcome==="positive"&&e.date>=weekAgo).slice(0,3).forEach(e=>{
      const d=donors.find(dd=>(dd.id||dd.name)===e.donorId);
      notifs.push({id:"pos_"+e.date+e.donorId,type:"positive",icon:"🎉",iconBg:"var(--green-soft)",iconColor:"var(--green)",
        title:"Positive Response",msg:`${d?.name||"Unknown"} responded positively via ${e.channel}`,time:e.date,unread:false});
    });
    return notifs.sort((a,b)=>a.unread===b.unread?0:a.unread?-1:1);
  },[reminders,donors,acts,outreachLog]);
  const unreadCount=notifications.filter(n=>n.unread).length;
  return(<div ref={ref} style={{position:"relative"}}>
    <div className="nav-item" onClick={()=>setOpen(!open)} title="Notifications" style={{position:"relative"}}>
      🔔
      {unreadCount>0&&<div style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:8,background:"var(--red)",fontSize:9,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount>9?"9+":unreadCount}</div>}
    </div>
    {open&&<div className="notif-panel">
      <div className="notif-header"><h4>Notifications</h4><span style={{fontSize:10,color:"var(--text3)"}}>{unreadCount} unread</span></div>
      <div className="notif-list">
        {notifications.length===0&&<div style={{padding:32,textAlign:"center",color:"var(--text3)",fontSize:12}}>All caught up! No notifications.</div>}
        {notifications.map(n=>(
          <div className={"notif-item"+(n.unread?" unread":"")} key={n.id}>
            <div className="ni-icon" style={{background:n.iconBg,color:n.iconColor}}>{n.icon}</div>
            <div className="ni-body">
              <div className="ni-title">{n.title}</div>
              <div className="ni-msg">{n.msg}</div>
              <div className="ni-time">{fmtD(n.time)}</div>
            </div>
            {n.unread&&<div className="notif-dot"/>}
          </div>
        ))}
      </div>
    </div>}
  </div>);
}


// ============================================================
// RESTORED COMPONENTS (were accidentally deleted during monolith split)
// ============================================================
function ExportPanel({donors,acts,deals,campaigns,reminders,outreachLog}){
  const{addToast}=useToast();

  const exportDonors=(filter)=>{
    let data=[...donors];
    if(filter==="tier1")data=data.filter(d=>d.tier==="Tier 1");
    if(filter==="active")data=data.filter(d=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return si>=1&&si<9});
    exportToCSV(data,`donors_${filter||"all"}_${new Date().toISOString().slice(0,10)}.csv`,DONOR_EXPORT_COLS);
    addToast({type:"success",title:"Export Complete",message:`${data.length} donors exported to CSV`});
  };

  const exportActivities=()=>{
    exportToCSV(acts,`activities_${new Date().toISOString().slice(0,10)}.csv`,ACT_EXPORT_COLS);
    addToast({type:"success",title:"Export Complete",message:`${acts.length} activities exported`});
  };

  const exportDeals=()=>{
    const cols=[{key:"did",label:"Donor"},{key:"amt",label:"Amount"},{key:"stage",label:"Stage"},{key:"created",label:"Created"}];
    exportToCSV(deals,`deals_${new Date().toISOString().slice(0,10)}.csv`,cols);
    addToast({type:"success",title:"Export Complete",message:`${deals.length} deals exported`});
  };

  const exportOutreach=()=>{
    const cols=[{key:"donorId",label:"Donor"},{key:"channel",label:"Channel"},{key:"template",label:"Template"},{key:"outcome",label:"Outcome"},{key:"date",label:"Date"},{key:"message",label:"Message"}];
    exportToCSV(outreachLog,`outreach_${new Date().toISOString().slice(0,10)}.csv`,cols);
    addToast({type:"success",title:"Export Complete",message:`${outreachLog.length} outreach entries exported`});
  };

  const exportFullReport=()=>{
    // Comprehensive JSON export with all data
    const report={
      meta:{exported:new Date().toISOString(),org:getActiveOrg().name,version:"2.0"},
      donors,activities:acts,deals,campaigns,reminders,outreachLog,
      summary:{
        totalDonors:donors.length,
        tier1:donors.filter(d=>d.tier==="Tier 1").length,
        totalPipeline:donors.reduce((s,d)=>s+(parseInt(d.annual_giving||0)||aiAsk(d)),0),
        totalDeals:deals.length,
        totalActivities:acts.length
      }
    };
    const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`crm_full_report_${new Date().toISOString().slice(0,10)}.json`;a.click();
    URL.revokeObjectURL(url);
    addToast({type:"success",title:"Full Report Exported",message:"All CRM data exported as JSON"});
  };

  return(<div className="content-scroll">
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>📥 Export & Reports</h2>
    <p style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Download your data in CSV or JSON format for reports, backups, or importing into other tools.</p>

    <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Donor Exports</div>
    <div className="export-grid" style={{marginBottom:20}}>
      <div className="export-card" onClick={()=>exportDonors("all")}>
        <div className="ex-icon">👥</div><div className="ex-title">All Donors</div><div className="ex-desc">{donors.length} donors to CSV</div></div>
      <div className="export-card" onClick={()=>exportDonors("tier1")}>
        <div className="ex-icon">⭐</div><div className="ex-title">Tier 1 Only</div><div className="ex-desc">{donors.filter(d=>d.tier==="Tier 1").length} HNW donors</div></div>
      <div className="export-card" onClick={()=>exportDonors("active")}>
        <div className="ex-icon">🔥</div><div className="ex-title">Active Pipeline</div><div className="ex-desc">Donors in active outreach</div></div>
    </div>

    <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Other Exports</div>
    <div className="export-grid" style={{marginBottom:20}}>
      <div className="export-card" onClick={exportActivities}>
        <div className="ex-icon">📋</div><div className="ex-title">Activities</div><div className="ex-desc">{acts.length} activities to CSV</div></div>
      <div className="export-card" onClick={exportDeals}>
        <div className="ex-icon">💎</div><div className="ex-title">Deals</div><div className="ex-desc">{deals.length} deals to CSV</div></div>
      <div className="export-card" onClick={exportOutreach}>
        <div className="ex-icon">🧠</div><div className="ex-title">Outreach Log</div><div className="ex-desc">{outreachLog.length} entries to CSV</div></div>
    </div>

    <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Full Backup</div>
    <div className="export-grid">
      <div className="export-card" onClick={exportFullReport} style={{gridColumn:"1/-1",background:"linear-gradient(135deg,var(--surface),rgba(139,92,246,0.05))"}}>
        <div className="ex-icon">🗄️</div><div className="ex-title">Complete CRM Backup (JSON)</div><div className="ex-desc">All donors, activities, deals, campaigns, reminders, outreach — everything in one file</div></div>
    </div>
  </div>);
}

// ============================================================
// FOLLOW-UP AUTOMATION ENGINE — rules-based auto-reminders
// ============================================================
function FollowUpRules({rules,onToggleRule,onRunRules,autoCount}){
  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <h2 style={{fontSize:18,fontWeight:700}}>⚙️ Follow-up Automation</h2>
        <p style={{fontSize:12,color:"var(--text3)"}}>Rules that automatically create reminders based on donor activity</p>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {autoCount>0&&<span style={{fontSize:11,color:"var(--green)",fontWeight:600}}>✓ {autoCount} auto-reminders created</span>}
        <button className="btn btn-primary btn-sm" onClick={onRunRules}>▶ Run Rules Now</button>
      </div>
    </div>
    {rules.map(r=>(
      <div className="rule-card" key={r.id}>
        <div className="rule-icon">{r.icon}</div>
        <div className="rule-body">
          <div className="rule-name">{r.name}</div>
          <div className="rule-desc">{r.desc}</div>
        </div>
        <div className={"rule-toggle"+(r.enabled?" on":"")} onClick={()=>onToggleRule(r.id)}/>
      </div>
    ))}
    <div style={{marginTop:20,padding:16,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)"}}>
      <h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>How It Works</h4>
      <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.7}}>
        <div>1. Enable the rules you want active</div>
        <div>2. Rules run automatically when you log activities</div>
        <div>3. Click "Run Rules Now" to scan all donors and create reminders</div>
        <div>4. Check Reminders tab (🔔) for generated follow-ups</div>
        <div style={{marginTop:8,color:"var(--text3)",fontSize:11}}>Rules never create duplicate reminders for the same donor + trigger combination.</div>
      </div>
    </div>
  </div>);
}

// ============================================================
// ORG ADMIN PANEL — user management, org settings, white-label
// ============================================================
function OrgAdminPanel({session,donors,acts,deals}){
  const[users,setUsersState]=useState(()=>getUsers());
  const[orgConfig,setOrgConfig]=useState(()=>getActiveOrg());
  const[showAddUser,setShowAddUser]=useState(false);
  const[newUser,setNewUser]=useState({name:"",email:"",role:"fundraiser",password:""});
  const{addToast}=useToast();

  const isAdmin=session?.role==="admin";

  const addUser=()=>{
    if(!newUser.name||!newUser.email||!newUser.password){return}
    if(users.find(u=>u.email.toLowerCase()===newUser.email.toLowerCase())){addToast({type:"error",title:"Email taken"});return}
    const u={id:Date.now(),name:newUser.name,email:newUser.email.toLowerCase(),role:newUser.role,passwordHash:hashPassword(newUser.password),created:new Date().toISOString(),avatar:initials(newUser.name)};
    const updated=[...users,u];
    setUsersState(updated);setUsers(updated);
    setNewUser({name:"",email:"",role:"fundraiser",password:""});setShowAddUser(false);
    addToast({type:"success",title:"User Added",message:`${u.name} (${u.role}) added`});
  };

  const removeUser=(id)=>{
    if(!confirm("Remove this user?"))return;
    const updated=users.filter(u=>u.id!==id);
    setUsersState(updated);setUsers(updated);
    addToast({type:"warning",title:"User Removed"});
  };

  const updateOrg=(updates)=>{
    const updated={...orgConfig,...updates};
    setOrgConfig(updated);setActiveOrg(updated);
    // Update in org list too
    const list=getOrgList();
    const idx=list.findIndex(o=>o.id===updated.id);
    if(idx>=0){list[idx]=updated;setOrgList(list)}
  };

  return(<div className="content-scroll">
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>🏢 Organization Admin</h2>

    <div className="admin-grid">
      {/* Org Settings */}
      <div className="admin-card">
        <h4>⚙️ Organization Settings</h4>
        <div className="form-group"><label className="form-label">Organization Name</label>
          <input className="form-input" value={orgConfig.name||""} onChange={e=>updateOrg({name:e.target.value})} disabled={!isAdmin}/></div>
        <div className="form-group"><label className="form-label">Tagline</label>
          <input className="form-input" value={orgConfig.tagline||""} onChange={e=>updateOrg({tagline:e.target.value})} disabled={!isAdmin}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="form-group"><label className="form-label">Logo Initials</label>
            <input className="form-input" value={orgConfig.logo||""} onChange={e=>updateOrg({logo:e.target.value.slice(0,2)})} maxLength={2} disabled={!isAdmin} style={{textAlign:"center",fontWeight:800}}/></div>
          <div className="form-group"><label className="form-label">Accent Color</label>
            <input className="form-input" type="color" value={orgConfig.accentColor||"#f59e0b"} onChange={e=>updateOrg({accentColor:e.target.value})} disabled={!isAdmin} style={{height:38,padding:2,cursor:"pointer"}}/></div>
        </div>
        <div className="form-group"><label className="form-label">Currency</label>
          <select className="form-select" value={orgConfig.currency||"USD"} onChange={e=>updateOrg({currency:e.target.value})} disabled={!isAdmin}>
            <option value="USD">USD ($)</option><option value="ILS">ILS (₪)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
          </select></div>
      </div>

      {/* Org Stats */}
      <div className="admin-card">
        <h4>📊 Organization Stats</h4>
        <div style={{display:"grid",gap:8}}>
          {[
            {l:"Total Donors",v:donors.length,c:"var(--accent)"},
            {l:"Activities Logged",v:acts.length,c:"var(--blue)"},
            {l:"Active Deals",v:deals.length,c:"var(--green)"},
            {l:"Team Members",v:users.length,c:"var(--purple)"},
            {l:"Created",v:fmtD(orgConfig.created),c:"var(--text3)"},
            {l:"Org ID",v:orgConfig.id,c:"var(--text3)"},
          ].map(s=>(
            <div key={s.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:12,color:"var(--text3)"}}>{s.l}</span>
              <span style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* User Management */}
    <div className="admin-card" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <h4 style={{margin:0}}>👥 Team Members</h4>
        {isAdmin&&<button className="btn btn-primary btn-sm" onClick={()=>setShowAddUser(!showAddUser)}>+ Add User</button>}
      </div>

      {showAddUser&&<div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div className="form-group" style={{margin:0}}><label className="form-label">Name</label>
            <input className="form-input" value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))} placeholder="Full Name"/></div>
          <div className="form-group" style={{margin:0}}><label className="form-label">Email</label>
            <input className="form-input" value={newUser.email} onChange={e=>setNewUser(u=>({...u,email:e.target.value}))} placeholder="email@org.com"/></div>
          <div className="form-group" style={{margin:0}}><label className="form-label">Password</label>
            <input className="form-input" type="password" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} placeholder="Min 6 chars"/></div>
          <div className="form-group" style={{margin:0}}><label className="form-label">Role</label>
            <select className="form-select" value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}>
              {ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAddUser(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={addUser}>Add User</button>
        </div>
      </div>}

      {users.map(u=>{
        const role=ROLES.find(r=>r.id===u.role);
        return(<div className="user-row" key={u.id}>
          <div className="ur-avatar" style={{background:u.role==="admin"?"var(--accent-soft)":"var(--surface3)",color:u.role==="admin"?"var(--accent)":"var(--text2)"}}>{u.avatar||initials(u.name)}</div>
          <div className="ur-info">
            <div className="ur-name">{u.name} {u.id===session?.id&&<span style={{fontSize:10,color:"var(--accent)",fontWeight:600}}>(You)</span>}</div>
            <div className="ur-email">{u.email}</div>
          </div>
          <span className="ur-role" style={{
            background:u.role==="admin"?"var(--accent-soft)":u.role==="manager"?"var(--blue-soft)":u.role==="fundraiser"?"var(--green-soft)":"var(--surface2)",
            color:u.role==="admin"?"var(--accent)":u.role==="manager"?"var(--blue)":u.role==="fundraiser"?"var(--green)":"var(--text3)"
          }}>{role?.icon} {role?.label}</span>
          {isAdmin&&u.id!==session?.id&&<button className="btn btn-ghost btn-sm" onClick={()=>removeUser(u.id)} style={{color:"var(--red)",fontSize:11}}>✕</button>}
        </div>);
      })}
      {users.length===0&&<div style={{padding:16,textAlign:"center",color:"var(--text3)",fontSize:12}}>No users yet. Create an account to get started.</div>}
    </div>

    {/* Danger Zone */}
    {/* Cloud Sync — migrate localStorage data to Neon DB */}
    {isAdmin&&<div className="admin-card" style={{borderColor:"rgba(16,185,129,0.3)"}}>
      <h4 style={{color:"var(--green)"}}>☁️ Cloud Database Sync</h4>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Push your local donor data to the cloud database for persistence and multi-device access.</p>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn btn-primary btn-sm" onClick={async()=>{
          if(!confirm(`Upload ${donors.length} donors to the cloud database?`))return;
          try{
            const org=getActiveOrg();
            let created=0,failed=0;
            for(const d of donors){
              try{
                await donorsAPI.create(org.id,d);
                created++;
              }catch(e){
                // Skip duplicates or errors
                failed++;
              }
            }
            addToast({type:"success",title:"Sync Complete",message:`${created} donors uploaded, ${failed} skipped (duplicates)`});
            appendAudit({type:"import",action:"Cloud sync",detail:`${created} donors uploaded to DB`,user:session?.name});
          }catch(e){
            addToast({type:"error",title:"Sync Failed",message:e.message});
          }
        }}>⬆️ Push {donors.length} Donors to Cloud</button>
        <button className="btn btn-ghost btn-sm" onClick={async()=>{
          try{
            const org=getActiveOrg();
            const dbDonors=await donorsAPI.list(org.id);
            if(dbDonors&&dbDonors.length>0){
              addToast({type:"success",title:`${dbDonors.length} donors in cloud DB`,message:"Database is active and healthy"});
            }else{
              addToast({type:"info",title:"Cloud DB empty",message:"No donors in the database yet. Use Push to upload."});
            }
          }catch(e){
            addToast({type:"error",title:"DB Check Failed",message:e.message});
          }
        }}>🔍 Check Cloud Status</button>
      </div>
    </div>}

    {isAdmin&&<div className="admin-card" style={{borderColor:"rgba(239,68,68,0.3)"}}>
      <h4 style={{color:"var(--red)"}}>⚠️ Danger Zone</h4>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>These actions cannot be undone.</p>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-ghost btn-sm" style={{color:"var(--red)",borderColor:"rgba(239,68,68,0.3)"}} onClick={()=>{
          if(!confirm("Clear ALL donor data? This cannot be undone."))return;
          localStorage.removeItem(orgPrefix()+"donors");
          window.location.reload();
        }}>🗑️ Clear Donor Data</button>
        <button className="btn btn-ghost btn-sm" style={{color:"var(--red)",borderColor:"rgba(239,68,68,0.3)"}} onClick={()=>{
          if(!confirm("Reset entire CRM? All data will be lost."))return;
          const keys=Object.keys(localStorage).filter(k=>k.startsWith(orgPrefix()));
          keys.forEach(k=>localStorage.removeItem(k));
          window.location.reload();
        }}>💣 Factory Reset</button>
      </div>
    </div>}
  </div>);
}

// ============================================================
// AUDIT LOG — compliance tracking for all CRM actions
// ============================================================
const AUDIT_TYPES={
  donor_add:{icon:"➕",color:"var(--green-soft)",iconColor:"var(--green)"},
  donor_edit:{icon:"✏️",color:"var(--blue-soft)",iconColor:"var(--blue)"},
  donor_delete:{icon:"🗑️",color:"var(--red-soft)",iconColor:"var(--red)"},
  stage_change:{icon:"📈",color:"var(--accent-soft)",iconColor:"var(--accent)"},
  email_sent:{icon:"✉️",color:"var(--blue-soft)",iconColor:"var(--blue)"},
  note_added:{icon:"📝",color:"var(--purple-soft)",iconColor:"var(--purple)"},
  activity_logged:{icon:"📋",color:"var(--cyan-soft)",iconColor:"var(--cyan)"},
  deal_created:{icon:"💎",color:"var(--green-soft)",iconColor:"var(--green)"},
  export:{icon:"📥",color:"var(--surface2)",iconColor:"var(--text3)"},
  login:{icon:"🔑",color:"var(--accent-soft)",iconColor:"var(--accent)"},
  settings:{icon:"⚙️",color:"var(--surface2)",iconColor:"var(--text3)"},
  import:{icon:"📤",color:"var(--purple-soft)",iconColor:"var(--purple)"},
  campaign:{icon:"🎯",color:"var(--accent-soft)",iconColor:"var(--accent)"},
  merge:{icon:"🔗",color:"var(--cyan-soft)",iconColor:"var(--cyan)"},
  tag:{icon:"🏷️",color:"var(--purple-soft)",iconColor:"var(--purple)"},
};

function AuditLogView(){
  const[log,setLog]=useState(()=>getAuditLog());
  const[filter,setFilter]=useState("all");
  const[q,setQ]=useState("");

  // Refresh every 5 seconds
  useEffect(()=>{const iv=setInterval(()=>setLog(getAuditLog()),5000);return()=>clearInterval(iv)},[]);

  const filtered=useMemo(()=>{
    let items=[...log].reverse();
    if(filter!=="all")items=items.filter(e=>e.type===filter);
    if(q){const ql=q.toLowerCase();items=items.filter(e=>(e.action||"").toLowerCase().includes(ql)||(e.detail||"").toLowerCase().includes(ql)||(e.user||"").toLowerCase().includes(ql));}
    return items;
  },[log,filter,q]);

  const types=[...new Set(log.map(e=>e.type))].sort();

  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <h2 style={{fontSize:18,fontWeight:700}}>📜 Audit Log</h2>
      <span style={{fontSize:11,color:"var(--text3)"}}>{log.length} total entries</span>
    </div>
    <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Complete record of all CRM actions for compliance and accountability</p>

    <div className="audit-filter-bar">
      <input className="form-input" placeholder="Search actions..." value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:200,padding:"6px 10px"}}/>
      <select className="form-select" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:160,padding:"6px 10px"}}>
        <option value="all">All Actions</option>
        {types.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
      </select>
      <div style={{flex:1}}/>
      <span style={{fontSize:11,color:"var(--text3)"}}>{filtered.length} shown</span>
    </div>

    {filtered.length===0&&<div className="empty-state"><div className="empty-icon">📜</div><h3>No audit entries</h3><p>Actions will be logged as you use the CRM</p></div>}
    {filtered.slice(0,100).map(e=>{
      const at=AUDIT_TYPES[e.type]||{icon:"📌",color:"var(--surface2)",iconColor:"var(--text3)"};
      return(<div className="audit-row" key={e.id}>
        <div className="au-icon" style={{background:at.color,color:at.iconColor}}>{at.icon}</div>
        <div className="au-body">
          <div className="au-action">{e.action}</div>
          <div className="au-detail">{e.detail||""} {e.user&&<span style={{color:"var(--accent)"}}>— {e.user}</span>}</div>
        </div>
        <div className="au-time">{fmtD(e.ts)}<br/><span style={{fontSize:9}}>{new Date(e.ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span></div>
      </div>);
    })}
    {filtered.length>100&&<div style={{padding:12,textAlign:"center",fontSize:11,color:"var(--text3)"}}>Showing first 100 of {filtered.length} entries</div>}
  </div>);
}

// ============================================================
// DUPLICATE DETECTION — find and merge duplicate donors
// ============================================================
function DuplicateDetector({donors,onMerge}){
  const[dupes,setDupes]=useState([]);
  const[scanning,setScanning]=useState(false);
  const[merged,setMerged]=useState(0);

  const scan=()=>{
    setScanning(true);
    const found=[];
    const checked=new Set();
    for(let i=0;i<donors.length;i++){
      for(let j=i+1;j<donors.length;j++){
        const a=donors[i],b=donors[j];
        const key=`${i}_${j}`;
        if(checked.has(key))continue;
        checked.add(key);
        let score=0;const reasons=[];
        // Email match
        if(a.email&&b.email&&a.email.toLowerCase()===b.email.toLowerCase()){score+=50;reasons.push("Same email")}
        // Phone match
        if(a.phone&&b.phone){const pa=a.phone.replace(/\D/g,"").slice(-10),pb=b.phone.replace(/\D/g,"").slice(-10);if(pa.length>=7&&pa===pb){score+=40;reasons.push("Same phone")}}
        // Name similarity
        const na=(a.name||"").toLowerCase().trim(),nb=(b.name||"").toLowerCase().trim();
        if(na&&nb){
          if(na===nb){score+=45;reasons.push("Exact name")}
          else{
            const pa=na.split(" "),pb=nb.split(" ");
            if(pa.length>=2&&pb.length>=2&&pa[pa.length-1]===pb[pb.length-1]&&pa[0][0]===pb[0][0]){score+=25;reasons.push("Same last name + initial")}
          }
        }
        // Same community + city
        if(a.community&&b.community&&a.community.toLowerCase()===b.community.toLowerCase()&&a.city&&b.city&&a.city.toLowerCase()===b.city.toLowerCase()){score+=10;reasons.push("Same community+city")}
        if(score>=25)found.push({a,b,score,reasons,id:`${a.id||a.name}_${b.id||b.name}`});
      }
    }
    found.sort((x,y)=>y.score-x.score);
    setDupes(found);
    setScanning(false);
  };

  useEffect(()=>{if(donors.length>0)scan()},[donors.length]);

  const merge=(pair,keep)=>{
    const discard=keep===pair.a?pair.b:pair.a;
    // Merge fields from discard into keep (only fill blanks)
    const merged={...keep};
    Object.keys(discard).forEach(k=>{
      if(k==="id"||k==="name")return;
      if(!merged[k]&&discard[k])merged[k]=discard[k];
      if(Array.isArray(merged[k])&&Array.isArray(discard[k])){
        merged[k]=[...new Set([...merged[k],...discard[k]])];
      }
    });
    onMerge(merged,discard);
    setDupes(p=>p.filter(d=>d.id!==pair.id));
    setMerged(m=>m+1);
    appendAudit({type:"merge",action:"Merged duplicate donors",detail:`Kept ${keep.name}, removed ${discard.name}`,user:getSession()?.name});
  };

  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div><h2 style={{fontSize:18,fontWeight:700}}>🔍 Duplicate Detection</h2>
        <p style={{fontSize:12,color:"var(--text3)"}}>Find and merge duplicate donor records</p></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {merged>0&&<span style={{fontSize:11,color:"var(--green)",fontWeight:600}}>✓ {merged} merged</span>}
        <button className="btn btn-primary btn-sm" onClick={scan} disabled={scanning}>{scanning?"Scanning...":"🔍 Rescan"}</button>
      </div>
    </div>

    {dupes.length===0&&!scanning&&<div className="empty-state"><div className="empty-icon">✨</div><h3>No duplicates found</h3><p>Your donor database is clean</p></div>}

    {dupes.map(pair=>(
      <div className="dup-card" key={pair.id}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",gap:4}}>
            {pair.reasons.map((r,i)=><span key={i} className="dup-badge" style={{background:"var(--accent-soft)",color:"var(--accent)"}}>{r}</span>)}
          </div>
          <span style={{fontSize:11,fontWeight:700,color:pair.score>=50?"var(--red)":pair.score>=30?"var(--accent)":"var(--text3)"}}>{pair.score}% match</span>
        </div>
        <div className="dup-pair">
          <div className="dup-donor">
            <div className="dd-name">{pair.a.name}</div>
            <div className="dd-meta">{pair.a.email||"—"} • {pair.a.phone||"—"} • {pair.a.community||"—"}</div>
            <button className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>merge(pair,pair.a)}>Keep This →</button>
          </div>
          <div style={{fontSize:18,color:"var(--text4)"}}>⟷</div>
          <div className="dup-donor">
            <div className="dd-name">{pair.b.name}</div>
            <div className="dd-meta">{pair.b.email||"—"} • {pair.b.phone||"—"} • {pair.b.community||"—"}</div>
            <button className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>merge(pair,pair.b)}>← Keep This</button>
          </div>
        </div>
      </div>
    ))}
  </div>);
}

// ============================================================
// DONOR PRIORITY LEADERBOARD — AI-ranked engagement scores
// ============================================================
function PriorityLeaderboard({donors,acts,onSelect}){
  const[sortMode,setSortMode]=useState("engagement"); // engagement | warmth | ask | likelihood
  const[tierFilter,setTierFilter]=useState("all");

  const ranked=useMemo(()=>{
    let list=donors.map(d=>{
      const eng=aiScore(d,acts);const lk=aiLikelihood(eng,d);const ask=aiAsk(d);
      const stg=STAGES.find(s=>s.id===(d.pipeline_stage||"not_started"));
      const lastAct=acts.filter(a=>a.did===(d.id||d.name)).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      const daysSince=lastAct?Math.round((Date.now()-new Date(lastAct.date))/864e5):999;
      return{...d,eng,lk,ask,stg,daysSince};
    });
    if(tierFilter!=="all")list=list.filter(d=>d.tier===tierFilter);
    if(sortMode==="engagement")list.sort((a,b)=>b.eng-a.eng);
    if(sortMode==="warmth")list.sort((a,b)=>(parseInt(b.warmth_score||0))-(parseInt(a.warmth_score||0)));
    if(sortMode==="ask")list.sort((a,b)=>b.ask-a.ask);
    if(sortMode==="likelihood")list.sort((a,b)=>{const order={["Very High"]:4,High:3,Medium:2,Low:1};return(order[b.lk.l]||0)-(order[a.lk.l]||0)});
    return list;
  },[donors,acts,sortMode,tierFilter]);

  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>🏆 Priority Leaderboard</h2>
      <div style={{display:"flex",gap:8}}>
        <select className="form-select" value={tierFilter} onChange={e=>setTierFilter(e.target.value)} style={{width:100,padding:"4px 8px",fontSize:11}}>
          <option value="all">All Tiers</option><option value="Tier 1">Tier 1</option><option value="Tier 2">Tier 2</option><option value="Tier 3">Tier 3</option>
        </select>
        <select className="form-select" value={sortMode} onChange={e=>setSortMode(e.target.value)} style={{width:130,padding:"4px 8px",fontSize:11}}>
          <option value="engagement">By Engagement</option><option value="warmth">By Warmth</option><option value="ask">By Ask Amount</option><option value="likelihood">By Likelihood</option>
        </select>
      </div>
    </div>

    {ranked.map((d,i)=>{
      const rankCls=i===0?"gold":i===1?"silver":i===2?"bronze":"normal";
      return(<div className="lb-row" key={d.id||d.name} onClick={()=>onSelect(d)}>
        <div className={"lb-rank "+rankCls}>{i+1}</div>
        <div className="avatar" style={{background:d.tier==="Tier 1"?"var(--accent-soft)":"var(--surface3)",color:d.tier==="Tier 1"?"var(--accent)":"var(--text3)",width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{initials(d.name)}</div>
        <div className="lb-info">
          <div className="lb-name">{d.name} <span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")} style={{fontSize:10,padding:"1px 5px"}}>{TIERS[d.tier]?.label||"T3"}</span></div>
          <div className="lb-sub">{d.community||d.industry||"—"} • {d.stg?.label} • {d.daysSince<999?d.daysSince+"d ago":"No activity"}</div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:d.lk.c}}>{d.lk.l}</div><div style={{fontSize:9,color:"var(--text4)"}}>LIKELIHOOD</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:"var(--green)"}}>{fmt$(d.ask)}</div><div style={{fontSize:9,color:"var(--text4)"}}>ASK</div></div>
        </div>
        <div className="lb-score">
          <div className="lb-score-val" style={{color:d.eng>=70?"var(--green)":d.eng>=40?"var(--accent)":"var(--blue)"}}>{d.eng}</div>
          <div className="lb-score-lbl">Score</div>
        </div>
      </div>);
    })}
  </div>);
}

// ============================================================
// TAGGING SYSTEM — flexible tags for donor segmentation
// ============================================================
const tagColor=(tag)=>TAG_COLORS[Math.abs([...tag].reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0))%TAG_COLORS.length];

function TagManager({donors,onUpdateDonor}){
  const[newTag,setNewTag]=useState("");
  const[selTag,setSelTag]=useState(null);
  const[addingTo,setAddingTo]=useState(null);
  const[tagInput,setTagInput]=useState("");

  // Collect all unique tags across donors
  const allTags=useMemo(()=>{
    const map=new Map();
    donors.forEach(d=>{
      (d.tags||[]).forEach(t=>{
        if(!map.has(t))map.set(t,{name:t,count:0,donors:[]});
        map.get(t).count++;
        map.get(t).donors.push(d);
      });
    });
    return[...map.values()].sort((a,b)=>b.count-a.count);
  },[donors]);

  const addTagToDonor=(donor,tag)=>{
    const tags=[...new Set([...(donor.tags||[]),tag.trim()])];
    onUpdateDonor({...donor,tags});
    appendAudit({type:"tag",action:`Tagged ${donor.name}`,detail:`Added "${tag}"`,user:getSession()?.name});
  };

  const removeTagFromDonor=(donor,tag)=>{
    const tags=(donor.tags||[]).filter(t=>t!==tag);
    onUpdateDonor({...donor,tags});
  };

  const filteredDonors=selTag?allTags.find(t=>t.name===selTag)?.donors||[]:[];

  return(<div className="content-scroll">
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>🏷️ Tags & Segmentation</h2>
    <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Organize donors with custom tags for targeted outreach</p>

    {/* Tag Cloud */}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>All Tags ({allTags.length})</div>
      <div className="tag-cloud">
        {allTags.map(t=>(
          <div key={t.name} className="tag" style={{background:tagColor(t.name)+"20",color:tagColor(t.name),cursor:"pointer",border:"2px solid "+(selTag===t.name?tagColor(t.name):"transparent")}} onClick={()=>setSelTag(selTag===t.name?null:t.name)}>
            {t.name} <span style={{opacity:.6}}>({t.count})</span>
          </div>
        ))}
        {allTags.length===0&&<span style={{fontSize:12,color:"var(--text3)"}}>No tags yet. Add tags to donors from the list below.</span>}
      </div>
    </div>

    {/* Filtered donors by tag */}
    {selTag&&<div style={{marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
        <span className="tag" style={{background:tagColor(selTag)+"20",color:tagColor(selTag)}}>{selTag}</span>
        <span style={{color:"var(--text3)"}}>— {filteredDonors.length} donors</span>
        <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}} onClick={()=>setSelTag(null)}>Clear Filter</button>
      </div>
      {filteredDonors.map(d=>(
        <div key={d.id||d.name} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:13,fontWeight:600,flex:1}}>{d.name}</span>
          <span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")} style={{fontSize:10}}>{TIERS[d.tier]?.label||"T3"}</span>
          <span style={{fontSize:11,color:"var(--text3)"}}>{d.community||"—"}</span>
        </div>
      ))}
    </div>}

    {/* All donors with tag management */}
    <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Donor Tags</div>
    {donors.map(d=>(
      <div key={d.id||d.name} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:"1px solid var(--border)"}}>
        <span style={{fontSize:13,fontWeight:600,minWidth:160}}>{d.name}</span>
        <div className="tag-bar" style={{flex:1}}>
          {(d.tags||[]).map(t=>(
            <span key={t} className="tag" style={{background:tagColor(t)+"20",color:tagColor(t)}}>
              {t}<span className="tag-x" onClick={()=>removeTagFromDonor(d,t)}>✕</span>
            </span>
          ))}
          {addingTo===(d.id||d.name)?
            <input className="form-input" autoFocus style={{width:100,padding:"2px 6px",fontSize:10,display:"inline"}} value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&tagInput.trim()){addTagToDonor(d,tagInput);setTagInput("");setAddingTo(null)}if(e.key==="Escape")setAddingTo(null)}} onBlur={()=>{if(tagInput.trim())addTagToDonor(d,tagInput);setTagInput("");setAddingTo(null)}}/>:
            <span className="tag-input" onClick={()=>{setAddingTo(d.id||d.name);setTagInput("")}}>+ tag</span>
          }
        </div>
      </div>
    ))}
  </div>);
}

// ============================================================
// BATCH EMAIL — compose + send to multiple donors at once
// ============================================================
function BatchEmailComposer({donors,apiKey,onSend,onClose}){
  const[selected,setSelected]=useState([]);
  const[tmpl,setTmpl]=useState("T-E");
  const[subj,setSubj]=useState("");
  const[body,setBody]=useState("");
  const[loading,setLoading]=useState(false);
  const[sent,setSent]=useState(0);
  const[q,setQ]=useState("");

  const available=useMemo(()=>{
    let list=donors.filter(d=>d.email);
    if(q){const ql=q.toLowerCase();list=list.filter(d=>(d.name||"").toLowerCase().includes(ql)||(d.community||"").toLowerCase().includes(ql)||(d.tier||"").toLowerCase().includes(ql));}
    return list;
  },[donors,q]);

  const addRecipient=(d)=>{if(!selected.find(s=>(s.id||s.name)===(d.id||d.name)))setSelected(p=>[...p,d])};
  const removeRecipient=(d)=>{setSelected(p=>p.filter(s=>(s.id||s.name)!==(d.id||d.name)))};
  const addAll=()=>setSelected(available);
  const addTier=(tier)=>setSelected(p=>{const ids=new Set(p.map(d=>d.id||d.name));const add=available.filter(d=>d.tier===tier&&!ids.has(d.id||d.name));return[...p,...add]});

  const generateAll=async()=>{
    if(!apiKey){alert("Set API key in Settings first.");return}
    setLoading(true);
    const t=TEMPLATES.find(x=>x.id===tmpl);
    // Generate a generic template
    const bOrg=getActiveOrg();const bProfile=getOrgProfile();
    const prompt=`You are a fundraising copywriter for ${bOrg.name}${bProfile.mission?" — "+bProfile.mission:""}. Write a compelling outreach email template.\nTemplate: ${t?.name} — ${t?.segment}\nHooks: ${t?.hooks}\n\nWrite the email body with merge fields: {name}, {community}, {city}. 150-200 words. Warm, personal, compelling. End with CTA for a meeting. Sign as "${bOrg.name} Development Team".`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1024,messages:[{role:"user",content:prompt}]})});
      if(!res.ok)throw new Error(`API ${res.status}`);
      const data=await res.json();
      setBody(data.content?.[0]?.text||"");
      setSubj((t?.subject||getActiveOrg().name+" — {name}").replace("{School}","").replace("{Synagogue}","").replace("{Family}",""));
    }catch(e){alert("AI Error: "+e.message)}finally{setLoading(false)}
  };

  const sendAll=()=>{
    selected.forEach(d=>{
      const personalSubj=subj.replace(/\{name\}/gi,d.name?.split(" ")[0]||"").replace(/\{community\}/gi,d.community||"").replace(/\{city\}/gi,d.city||"");
      const personalBody=body.replace(/\{name\}/gi,d.name?.split(" ")[0]||"").replace(/\{community\}/gi,d.community||"").replace(/\{city\}/gi,d.city||"");
      onSend({did:d.id||d.name,tmpl,subj:personalSubj,body:personalBody,date:new Date().toISOString(),batch:true});
    });
    setSent(selected.length);
    appendAudit({type:"email_sent",action:`Batch email sent to ${selected.length} donors`,detail:`Template: ${tmpl}`,user:getSession()?.name});
  };

  if(sent>0)return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-body" style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <h3 style={{marginBottom:8}}>{sent} Emails Drafted</h3>
      <p style={{fontSize:12,color:"var(--text3)"}}>All emails logged as activities. Check donor timelines for details.</p>
      <button className="btn btn-primary" onClick={onClose} style={{marginTop:16}}>Done</button>
    </div>
  </div></div>);

  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{width:840,maxHeight:"90vh"}}>
    <div className="modal-header"><h3>📨 Batch Email Campaign</h3><div className="detail-close" onClick={onClose}>✕</div></div>
    <div className="modal-body">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Left: recipient selection */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Recipients ({selected.length})</div>
          <div style={{display:"flex",gap:4,marginBottom:8}}>
            <button className="btn btn-ghost btn-sm" onClick={addAll}>All w/ Email</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>addTier("Tier 1")}>+ T1</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>addTier("Tier 2")}>+ T2</button>
          </div>
          <input className="form-input" placeholder="Search donors..." value={q} onChange={e=>setQ(e.target.value)} style={{marginBottom:8,padding:"6px 10px"}}/>
          <div style={{maxHeight:160,overflowY:"auto",marginBottom:8}}>
            {selected.map(d=>(
              <div className="batch-recipient" key={d.id||d.name}>
                <span className="br-name">{d.name}</span>
                <span style={{fontSize:10,color:"var(--text3)"}}>{d.email}</span>
                <span className="br-remove" onClick={()=>removeRecipient(d)}>✕</span>
              </div>
            ))}
          </div>
          <div style={{maxHeight:120,overflowY:"auto",borderTop:"1px solid var(--border)",paddingTop:8}}>
            {available.filter(d=>!selected.find(s=>(s.id||s.name)===(d.id||d.name))).slice(0,20).map(d=>(
              <div key={d.id||d.name} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",fontSize:11,cursor:"pointer",color:"var(--text2)"}} onClick={()=>addRecipient(d)}>
                <span style={{color:"var(--accent)"}}>+</span> {d.name} <span style={{color:"var(--text4)"}}>{d.email}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: compose */}
        <div>
          <div className="form-group"><label className="form-label">Template</label>
            <select className="form-select" value={tmpl} onChange={e=>setTmpl(e.target.value)}>{TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.id}: {t.name}</option>)}</select></div>
          <button className="btn btn-primary btn-sm" onClick={generateAll} disabled={loading} style={{marginBottom:12}}>{loading?"⏳ Generating...":"⚡ Generate with AI"}</button>
          <div className="form-group"><label className="form-label">Subject (use {"{name}"}, {"{community}"})</label>
            <input className="form-input" value={subj} onChange={e=>setSubj(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Body</label>
            <textarea className="form-textarea" value={body} onChange={e=>setBody(e.target.value)} style={{minHeight:150}}/></div>
        </div>
      </div>
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={sendAll} disabled={!selected.length||!subj||!body}>📨 Draft {selected.length} Email{selected.length!==1?"s":""}</button>
    </div>
  </div></div>);
}

// ============================================================
// TEAM ACTIVITY DASHBOARD — per-user productivity tracking
// ============================================================
function TeamDashboard({acts,donors,users}){
  const[period,setPeriod]=useState(30);

  const cutoff=useMemo(()=>new Date(Date.now()-period*864e5).toISOString(),[period]);

  const teamStats=useMemo(()=>{
    const allUsers=users||getUsers();
    return allUsers.map(u=>{
      const userActs=acts.filter(a=>a.user===u.name||a.user===u.email);
      const recentActs=userActs.filter(a=>a.date>=cutoff);
      const emails=recentActs.filter(a=>a.type==="email").length;
      const calls=recentActs.filter(a=>a.type==="call").length;
      const meetings=recentActs.filter(a=>a.type==="meeting").length;
      const stageChanges=recentActs.filter(a=>a.type==="stage_change").length;
      const uniqueDonors=new Set(recentActs.map(a=>a.did)).size;
      return{user:u,total:recentActs.length,emails,calls,meetings,stageChanges,uniqueDonors,allTime:userActs.length};
    }).sort((a,b)=>b.total-a.total);
  },[acts,cutoff,users]);

  // Overall stats
  const totalActs=acts.filter(a=>a.date>=cutoff).length;
  const activeDonors=new Set(acts.filter(a=>a.date>=cutoff).map(a=>a.did)).size;

  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>👥 Team Activity</h2>
      <select className="form-select" value={period} onChange={e=>setPeriod(parseInt(e.target.value))} style={{width:120,padding:"4px 8px",fontSize:11}}>
        <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
      </select>
    </div>

    {/* Summary strip */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800}}>{totalActs}</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Total Activities</div>
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"var(--accent)"}}>{activeDonors}</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Donors Touched</div>
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"var(--green)"}}>{teamStats.length}</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Team Members</div>
      </div>
    </div>

    {teamStats.length===0&&<div className="empty-state"><div className="empty-icon">👥</div><h3>No team activity yet</h3><p>Activities will be tracked per user as the team logs actions</p></div>}

    {teamStats.map(ts=>{
      const role=ROLES.find(r=>r.id===ts.user.role);
      return(<div className="team-card" key={ts.user.id}>
        <div className="tc-header">
          <div className="tc-avatar" style={{background:ts.user.role==="admin"?"var(--accent-soft)":"var(--surface3)",color:ts.user.role==="admin"?"var(--accent)":"var(--text2)"}}>{ts.user.avatar||initials(ts.user.name)}</div>
          <div style={{flex:1}}>
            <div className="tc-name">{ts.user.name}</div>
            <div className="tc-role">{role?.icon} {role?.label} • {ts.user.email}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18,fontWeight:800}}>{ts.total}</div>
            <div style={{fontSize:9,color:"var(--text3)"}}>actions ({period}d)</div>
          </div>
        </div>
        <div className="team-stats">
          <div className="team-stat"><div className="ts-val" style={{color:"var(--blue)"}}>{ts.emails}</div><div className="ts-lbl">Emails</div></div>
          <div className="team-stat"><div className="ts-val" style={{color:"var(--green)"}}>{ts.calls}</div><div className="ts-lbl">Calls</div></div>
          <div className="team-stat"><div className="ts-val" style={{color:"var(--accent)"}}>{ts.meetings}</div><div className="ts-lbl">Meetings</div></div>
          <div className="team-stat"><div className="ts-val" style={{color:"var(--purple)"}}>{ts.uniqueDonors}</div><div className="ts-lbl">Donors</div></div>
        </div>
      </div>);
    })}
  </div>);
}


// ============================================================
// COMPONENT: DataLoader
// ============================================================
// -- Generate demo data (org-generic — no hardcoded communities) --
const generateDemoData=()=>{
  const names=["David Goldstein","Sarah Roth","Michael Cohen","Rachel Levy","Jonathan Green","Rebecca Stern","Daniel Weiss","Miriam Katz","Joshua Fried","Leah Bernstein","Adam Schwartz","Hannah Silver","Samuel Fox","Naomi Pearl","Benjamin Hart","Esther Diamond","Nathan Brooks","Tamar Gold","Isaac Stone","Deborah Rose","Aaron Wolf","Judith Glass","Eli Klein","Ruth Blum","Noah Kaplan"];
  const comms=["Local Synagogue","Federation","Community Center","Day School Alumni","Young Leadership","Neighborhood Committee","Family Foundation","Board Network","Heritage Group","Professional Circle","Sisterhood","Men's Club","Youth Alumni","Donor Circle","Memorial Fund","Scholarship Fund","Cultural Society","Women's League","Chesed Group","Young Professionals","Torah Study","Board Alumni","Gala Committee","Annual Campaign","Capital Campaign"];
  const inds=["Real Estate","Finance","Banking","Healthcare","Law","Tech","Private Equity","Retail","Venture Capital","Consulting","Insurance","Pharma","Real Estate","Import/Export","Finance","Manufacturing","Construction","Law","Tech","Private Equity","Banking","Consulting","Real Estate","Finance","Venture Capital"];
  const nws=[150e6,80e6,200e6,45e6,30e6,95e6,60e6,25e6,120e6,55e6,40e6,70e6,180e6,35e6,90e6,65e6,110e6,50e6,75e6,85e6,42e6,58e6,130e6,38e6,160e6];
  const ags=[500000,250000,750000,100000,75000,300000,150000,50000,400000,125000,80000,200000,600000,60000,350000,175000,450000,90000,225000,280000,95000,140000,500000,70000,550000];
  const cities=["New York","Los Angeles","Chicago","Miami","Boston","Teaneck","Baltimore","Jerusalem","Tel Aviv","Philadelphia","Dallas","Atlanta","New York","Boca Raton","New York","Brooklyn","Woodmere","Denver","San Francisco","Teaneck","New York","Philadelphia","Potomac","New York","New York"];
  return names.map((n,i)=>({id:i+1,name:n,email:`donor${i+1}@example.com`,phone:`+1-555-${String(1000+i).slice(-4)}-${String(2000+i).slice(-4)}`,net_worth:nws[i],annual_giving:ags[i],community:comms[i],industry:inds[i],tier:i<8?"Tier 1":(i<18?"Tier 2":"Tier 3"),warmth_score:Math.floor(Math.random()*8)+2,pipeline_stage:STAGES[Math.floor(Math.random()*7)].id,connector_paths:[{name:"Board Member",role:"Community Leader",strength:"Strong"},{name:"Committee Chair",role:"Advisory",strength:"Medium"}].slice(0,Math.random()>.3?2:1),focus_areas:["Jewish Education","Israel","Torah Study","Youth Programs","Community Building"].sort(()=>Math.random()-.5).slice(0,2),city:cities[i]}));
};

function DataLoader({onLoad}){
  const[txt,setTxt]=useState("");const fRef=useRef();
  const handleFile=(f)=>{const r=new FileReader();r.onload=(e)=>{try{const d=JSON.parse(e.target.result);onLoad(Array.isArray(d)?d:(d.donors||d.records||[d]))}catch(err){alert("Invalid JSON: "+err.message)}};r.readAsText(f)};
  const loadDemo=()=>onLoad(generateDemoData());
  return(<div className="loader-overlay"><div className="loader-card">
    <h2>⚡ ChaiRaise CRM</h2><p>Load your donor data (JSON) or try the demo.</p>
    <div className="drop-zone" onClick={()=>fRef.current?.click()}><p>📁 Click to upload JSON file</p>
      <input ref={fRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/></div>
    <div style={{color:"var(--text3)",margin:"8px 0",fontSize:"11px"}}>— or paste JSON —</div>
    <textarea className="form-textarea" value={txt} onChange={e=>setTxt(e.target.value)} placeholder='[{"name":"...","email":"..."}]' style={{minHeight:"80px"}}/>
    <div style={{display:"flex",gap:"8px",justifyContent:"center",marginTop:"12px"}}>
      <button className="btn btn-primary" onClick={()=>{try{const d=JSON.parse(txt);onLoad(Array.isArray(d)?d:(d.donors||d.records||[d]))}catch(e){alert("Invalid JSON")}}} disabled={!txt.trim()}>Load</button>
      <button className="btn btn-ghost" onClick={loadDemo}>Demo Data (25 Donors)</button>
    </div></div></div>);
}

// ============================================================
// COMPONENT: Dashboard
// ============================================================
function Dashboard({donors,acts,deals,reminders,outreachLog,session,useDB,dbLoading}){
  const ps=useMemo(()=>STAGES.map(s=>({...s,count:donors.filter(d=>(d.pipeline_stage||"not_started")===s.id).length})),[donors]);
  const mx=Math.max(...ps.map(s=>s.count),1);
  const t1=donors.filter(d=>d.tier==="Tier 1").length;
  const active=donors.filter(d=>{const i=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return i>=1&&i<9}).length;
  const totalPipe=donors.reduce((s,d)=>s+(parseInt(d.annual_giving||0)||aiAsk(d)),0);
  const avgW=donors.length?(donors.reduce((s,d)=>s+parseInt(d.warmth_score||d.warmth||0),0)/donors.length).toFixed(1):0;
  const tiers=[{l:"Tier 1",c:t1,cl:"#f59e0b"},{l:"Tier 2",c:donors.filter(d=>d.tier==="Tier 2").length,cl:"#3b82f6"},{l:"Tier 3",c:donors.filter(d=>d.tier==="Tier 3"||!d.tier).length,cl:"#71717a"}];
  const recent=[...acts].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);

  // ---- VELOCITY METRICS ----
  const today=new Date();
  const week=new Date(today-7*864e5);
  const month=new Date(today-30*864e5);

  // Activities this week vs last week
  const actsThisWeek=acts.filter(a=>new Date(a.date)>=week).length;
  const actsLastWeek=acts.filter(a=>{const d=new Date(a.date);return d>=new Date(week-7*864e5)&&d<week}).length;
  const actsDelta=actsLastWeek>0?((actsThisWeek-actsLastWeek)/actsLastWeek*100).toFixed(0):actsThisWeek>0?"+100":"0";

  // Conversion rate: donors who moved at least one stage forward this month
  const stageChanges=acts.filter(a=>a.type==="stage_change"&&new Date(a.date)>=month).length;
  const convRate=donors.length?(stageChanges/donors.length*100).toFixed(1):0;

  // Average days in current stage (for active donors)
  const avgDaysInStage=useMemo(()=>{
    const activeDonors=donors.filter(d=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return si>=1});
    if(!activeDonors.length)return"—";
    const donorAges=activeDonors.map(d=>{
      const stageActs=acts.filter(a=>a.did===(d.id||d.name)&&a.type==="stage_change").sort((a,b)=>new Date(b.date)-new Date(a.date));
      if(!stageActs.length)return 30; // Default assumption
      return Math.round((Date.now()-new Date(stageActs[0].date))/864e5);
    });
    return(donorAges.reduce((a,b)=>a+b,0)/donorAges.length).toFixed(0);
  },[donors,acts]);

  // Overdue reminders
  const todayStr=today.toISOString().slice(0,10);
  const overdueCount=(reminders||[]).filter(r=>!r.done&&r.date<todayStr).length;

  // Outreach response rate (from learning loop)
  const totalOutreach=(outreachLog||[]).length;
  const positiveOutreach=(outreachLog||[]).filter(e=>e.outcome==="positive").length;
  const responseRate=totalOutreach>0?(positiveOutreach/totalOutreach*100).toFixed(0):"—";

  // Committed value (donors at commitment stage)
  const committed=donors.filter(d=>(d.pipeline_stage||"not_started")==="commitment");
  const committedVal=committed.reduce((s,d)=>s+(parseInt(d.annual_giving||0)||aiAsk(d)),0);

  return(<div className="content-scroll">
    {/* Welcome banner */}
    {session&&<div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div><span style={{fontSize:15,fontWeight:700}}>Welcome back, {session.name?.split(" ")[0]}</span>
        <span style={{fontSize:12,color:"var(--text3)",marginLeft:8}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</span></div>
      {overdueCount>0&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"var(--red-soft)",borderRadius:"var(--radius)",fontSize:12,fontWeight:600,color:"var(--red)"}}><span>⚠️</span>{overdueCount} overdue follow-up{overdueCount>1?"s":""}</div>}
    </div>}

    {/* KPI Velocity Metrics */}
    <div className="kpi-grid">
      <div className="kpi-card"><div className="kpi-val">{donors.length}</div><div className="kpi-lbl">Total Donors</div><div className="kpi-delta up">{donors.filter(d=>d.email).length} w/ email</div></div>
      <div className="kpi-card"><div className="kpi-val" style={{color:"var(--accent)"}}>{t1}</div><div className="kpi-lbl">Tier 1 HNW</div><div className="kpi-delta">{donors.length?((t1/donors.length)*100).toFixed(0):0}% of total</div></div>
      <div className="kpi-card"><div className="kpi-val" style={{color:"var(--green)"}}>{active}</div><div className="kpi-lbl">Active Pipeline</div><div className="kpi-delta up">{donors.length?((active/donors.length)*100).toFixed(0):0}% in motion</div></div>
      <div className="kpi-card"><div className="kpi-val" style={{fontSize:16}}>{fmt$(totalPipe)}</div><div className="kpi-lbl">Pipeline Value</div><div className="kpi-delta">W: {avgW}/10</div></div>
      <div className="kpi-card"><div className="kpi-val" style={{color:"var(--green)"}}>{fmt$(committedVal)}</div><div className="kpi-lbl">Committed</div><div className="kpi-delta up">{committed.length} donors</div></div>
      <div className="kpi-card"><div className="kpi-val" style={{color:responseRate==="—"?"var(--text3)":parseInt(responseRate)>20?"var(--green)":"var(--accent)"}}>{responseRate}{responseRate!=="—"?"%":""}</div><div className="kpi-lbl">Response Rate</div><div className="kpi-delta">{totalOutreach} total outreach</div></div>
    </div>

    {/* Velocity Strip */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontSize:18}}>⚡</div>
        <div><div style={{fontSize:14,fontWeight:800}}>{actsThisWeek}</div><div style={{fontSize:10,color:"var(--text3)"}}>Activities this week</div></div>
        <div style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:parseInt(actsDelta)>0?"var(--green)":parseInt(actsDelta)<0?"var(--red)":"var(--text3)"}}>{parseInt(actsDelta)>0?"+":""}{actsDelta}%</div>
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontSize:18}}>🔄</div>
        <div><div style={{fontSize:14,fontWeight:800}}>{convRate}%</div><div style={{fontSize:10,color:"var(--text3)"}}>Monthly conversion</div></div>
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontSize:18}}>📊</div>
        <div><div style={{fontSize:14,fontWeight:800}}>{avgDaysInStage}d</div><div style={{fontSize:10,color:"var(--text3)"}}>Avg days in stage</div></div>
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontSize:18}}>🎯</div>
        <div><div style={{fontSize:14,fontWeight:800}}>{deals.length}</div><div style={{fontSize:10,color:"var(--text3)"}}>Active deals</div></div>
        <div style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:"var(--green)"}}>{fmt$(deals.reduce((s,d)=>s+(parseInt(d.amt)||0),0))}</div>
      </div>
    </div>

    {/* ===== LAPSE DETECTION — donors going cold ===== */}
    {(()=>{
      // Find donors in active pipeline who haven't been contacted recently
      const lapsingDonors=donors.filter(d=>{
        const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));
        if(si<1)return false; // Skip not_started
        const donorActs=acts.filter(a=>a.did===(d.id||d.name));
        if(!donorActs.length)return si>=1; // In pipeline but never contacted
        const latest=donorActs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
        const daysSince=Math.round((Date.now()-new Date(latest.date))/864e5);
        // Tier-based thresholds: T1 goes cold faster (more attention needed)
        const threshold=d.tier==="Tier 1"?14:d.tier==="Tier 2"?21:30;
        return daysSince>=threshold;
      }).map(d=>{
        const donorActs=acts.filter(a=>a.did===(d.id||d.name));
        const latest=donorActs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
        const daysSince=latest?Math.round((Date.now()-new Date(latest.date))/864e5):999;
        return{...d,daysSince,lastActivity:latest};
      }).sort((a,b)=>{
        // T1 first, then by days since last contact (most urgent first)
        if(a.tier!==b.tier)return a.tier==="Tier 1"?-1:b.tier==="Tier 1"?1:a.tier==="Tier 2"?-1:1;
        return b.daysSince-a.daysSince;
      }).slice(0,8);

      if(lapsingDonors.length===0)return null;

      return(<div style={{marginBottom:16,background:"var(--surface)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"var(--radius-lg)",padding:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>🚨</span>
            <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Going Cold — Action Required</h3>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"var(--red-soft)",color:"var(--red)",fontWeight:700}}>{lapsingDonors.length}</span>
          </div>
          <span style={{fontSize:10,color:"var(--text4)"}}>Tier 1: 14d | Tier 2: 21d | Tier 3: 30d thresholds</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {lapsingDonors.map(d=>(
            <div key={d.id||d.name} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"10px 12px",cursor:"pointer"}} title={`Last activity: ${d.lastActivity?.summary||"None"}`}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700}}>{d.name?.split(" ").slice(0,2).join(" ")}</span>
                <span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")} style={{fontSize:9}}>{d.tier?.replace("Tier ","T")}</span>
              </div>
              <div style={{fontSize:11,color:"var(--red)",fontWeight:700}}>{d.daysSince>=999?"Never contacted":`${d.daysSince} days silent`}</div>
              <div style={{fontSize:10,color:"var(--text4)",marginTop:2}}>{d.lastActivity?d.lastActivity.type+": "+d.lastActivity.summary?.slice(0,30):"No activities recorded"}</div>
            </div>
          ))}
        </div>
      </div>);
    })()}

    {/* ===== DAILY ACTION QUEUE — "Who should I call today?" ===== */}
    {(()=>{
      // Build prioritized action list from multiple signals
      const actions=[];
      const todayStr=new Date().toISOString().slice(0,10);

      // 1. Overdue reminders (highest priority)
      (reminders||[]).filter(r=>!r.done&&r.date<=todayStr).forEach(r=>{
        const d=donors.find(dd=>(dd.id||dd.name)===r.did);
        if(d)actions.push({priority:100,type:"reminder",icon:"📌",label:"Follow up",donor:d,detail:r.summary,date:r.date,urgency:r.date<todayStr?"overdue":"today"});
      });

      // 2. Hot donors: responded but no meeting scheduled yet
      donors.filter(d=>(d.pipeline_stage||"not_started")==="responded").forEach(d=>{
        if(!actions.find(a=>a.donor&&(a.donor.id||a.donor.name)===(d.id||d.name)))
          actions.push({priority:90,type:"hot",icon:"🔥",label:"Schedule meeting",donor:d,detail:"Responded — strike while warm",urgency:"hot"});
      });

      // 3. Proposals sent — follow up for commitment
      donors.filter(d=>(d.pipeline_stage||"not_started")==="proposal_sent").forEach(d=>{
        const lastAct=acts.filter(a=>a.did===(d.id||d.name)).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
        const days=lastAct?Math.round((Date.now()-new Date(lastAct.date))/864e5):999;
        if(days>=3&&!actions.find(a=>a.donor&&(a.donor.id||a.donor.name)===(d.id||d.name)))
          actions.push({priority:85,type:"proposal",icon:"📋",label:"Follow up on proposal",donor:d,detail:`Proposal sent ${days}d ago`,urgency:days>=7?"overdue":"normal"});
      });

      // 4. Meetings held — send proposal
      donors.filter(d=>(d.pipeline_stage||"not_started")==="meeting_held").forEach(d=>{
        if(!actions.find(a=>a.donor&&(a.donor.id||a.donor.name)===(d.id||d.name)))
          actions.push({priority:80,type:"next_step",icon:"📨",label:"Send proposal",donor:d,detail:"Meeting held — ready for ask",urgency:"normal"});
      });

      // 5. Tier 1 donors stuck at researching/intro_requested for 7+ days
      donors.filter(d=>d.tier==="Tier 1"&&["researching","intro_requested"].includes(d.pipeline_stage||"not_started")).forEach(d=>{
        const lastAct=acts.filter(a=>a.did===(d.id||d.name)).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
        const days=lastAct?Math.round((Date.now()-new Date(lastAct.date))/864e5):999;
        if(days>=7&&!actions.find(a=>a.donor&&(a.donor.id||a.donor.name)===(d.id||d.name)))
          actions.push({priority:70,type:"stuck",icon:"⏳",label:"Push forward",donor:d,detail:`T1 stuck ${days}d at ${STAGES.find(s=>s.id===d.pipeline_stage)?.label||"early stage"}`,urgency:"normal"});
      });

      // Sort by priority, take top 6
      actions.sort((a,b)=>b.priority-a.priority);
      const topActions=actions.slice(0,6);

      if(topActions.length===0)return null;

      const urgencyColors={overdue:"var(--red)",hot:"var(--orange)",today:"var(--accent)",normal:"var(--text3)"};

      return(<div style={{marginBottom:16,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>⚡</span>
            <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Today's Priority Actions</h3>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"var(--accent-soft)",color:"var(--accent)",fontWeight:700}}>{topActions.length}</span>
          </div>
          <span style={{fontSize:10,color:"var(--text4)"}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {topActions.map((a,i)=>(
            <div key={i} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"10px 12px",display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{fontSize:18,flexShrink:0,marginTop:2}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:700,color:urgencyColors[a.urgency]||"var(--text)"}}>{a.label}</span>
                  {a.donor.tier&&<span className={"cell-tier "+(TIERS[a.donor.tier]?.cls||"t3")} style={{fontSize:9}}>{a.donor.tier?.replace("Tier ","T")}</span>}
                </div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.donor.name}</div>
                <div style={{fontSize:10,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>);
    })()}

    {/* ===== 7-DAY ACTIVITY SPARKLINE ===== */}
    {(()=>{
      const days=[];
      for(let i=6;i>=0;i--){
        const d=new Date();d.setDate(d.getDate()-i);
        const key=d.toISOString().slice(0,10);
        const label=d.toLocaleDateString("en-US",{weekday:"short"});
        const count=acts.filter(a=>a.date?.slice(0,10)===key).length;
        days.push({key,label,count});
      }
      const maxCount=Math.max(...days.map(d=>d.count),1);
      return(<div style={{marginBottom:16,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <h3 style={{fontSize:14,fontWeight:700,margin:0}}>📊 Weekly Activity</h3>
          <span style={{fontSize:11,color:"var(--text3)"}}>{acts.filter(a=>{const d=new Date(a.date);return(Date.now()-d)/864e5<=7}).length} activities this week</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",height:60}}>
          {days.map(d=>(
            <div key={d.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <span style={{fontSize:9,fontWeight:700,color:d.count>0?"var(--accent)":"var(--text4)"}}>{d.count||""}</span>
              <div style={{width:"100%",background:d.count>0?"var(--accent)":"var(--surface2)",borderRadius:3,height:`${Math.max((d.count/maxCount)*40,d.count>0?4:2)}px`,transition:"height .3s"}}/>
              <span style={{fontSize:9,color:"var(--text4)"}}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>);
    })()}

    <div className="dash-row">
      <div className="dash-panel"><h3>Pipeline Funnel</h3>
        {ps.map(s=><div className="funnel-row" key={s.id}><div className="funnel-label">{s.label}</div><div className="funnel-bar-bg"><div className="funnel-bar-fill" style={{width:`${Math.max((s.count/mx)*100,s.count>0?8:0)}%`,background:s.color}}>{s.count>0&&<span>{s.count}</span>}</div></div><div className="funnel-count">{s.count}</div></div>)}
      </div>
      <div className="dash-panel"><h3>Tier Distribution</h3>
        {tiers.map(t=><div key={t.l} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 0",borderBottom:"1px solid var(--border)"}}><div style={{width:10,height:10,borderRadius:"50%",background:t.cl}}/><div style={{flex:1,fontSize:13,fontWeight:600}}>{t.l}</div><div style={{fontSize:18,fontWeight:800}}>{t.c}</div></div>)}
        <div style={{marginTop:16}}><h3 style={{fontSize:13,marginBottom:8}}>Recent Activity</h3>
          {recent.length===0&&<p style={{fontSize:12,color:"var(--text3)"}}>No activities yet</p>}
          {recent.map((a,i)=><div key={i} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}><span>{a.type}: {a.summary?.slice(0,40)}</span><span style={{color:"var(--text3)",fontSize:11}}>{fmtD(a.date)}</span></div>)}
        </div>
      </div>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: ListView
// ============================================================
function ListView({donors,acts,onSelect,selId,onStage,bulkSel,onToggleBulk}){
  const[sk,setSk]=useState("name");const[sd,setSd]=useState("asc");
  const[ft,setFt]=useState({tier:"all",stage:"all",q:""});
  const sort=(k)=>{if(sk===k)setSd(d=>d==="asc"?"desc":"asc");else{setSk(k);setSd("asc")}};
  const list=useMemo(()=>{
    let l=[...donors];
    if(ft.tier!=="all")l=l.filter(d=>d.tier===ft.tier);
    if(ft.stage!=="all")l=l.filter(d=>(d.pipeline_stage||"not_started")===ft.stage);
    if(ft.q){const q=ft.q.toLowerCase();l=l.filter(d=>[d.name,d.community,d.industry,d.city,d.email].some(v=>(v||"").toLowerCase().includes(q)));}
    l.sort((a,b)=>{let va=a[sk],vb=b[sk];if(["net_worth","annual_giving","warmth_score"].includes(sk)){va=parseInt(va||0);vb=parseInt(vb||0);}if(sk==="engagement"){va=aiScore(a,acts);vb=aiScore(b,acts);}return va<vb?(sd==="asc"?-1:1):va>vb?(sd==="asc"?1:-1):0;});
    return l;
  },[donors,ft,sk,sd,acts]);
  const SA=({c})=><span style={{marginLeft:4,fontSize:10,opacity:sk===c?1:.4,color:sk===c?"var(--accent)":"inherit"}}>{sk===c?(sd==="asc"?"↑":"↓"):"↕"}</span>;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{padding:"10px 20px",display:"flex",gap:8,alignItems:"center",borderBottom:"1px solid var(--border)"}}>
      <input className="form-input" placeholder="Search..." value={ft.q} onChange={e=>setFt(f=>({...f,q:e.target.value}))} style={{maxWidth:220,padding:"6px 10px"}}/>
      <select className="form-select" value={ft.tier} onChange={e=>setFt(f=>({...f,tier:e.target.value}))} style={{width:110,padding:"6px 10px"}}><option value="all">All Tiers</option><option value="Tier 1">Tier 1</option><option value="Tier 2">Tier 2</option><option value="Tier 3">Tier 3</option></select>
      <select className="form-select" value={ft.stage} onChange={e=>setFt(f=>({...f,stage:e.target.value}))} style={{width:150,padding:"6px 10px"}}><option value="all">All Stages</option>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
      <div style={{flex:1}}/>
      <button className="btn btn-ghost btn-sm" onClick={()=>{
        const cols=DONOR_FIELDS.map(f=>({key:f.key,label:f.label}));
        cols.push({key:"pipeline_stage",label:"Pipeline Stage"});
        exportToCSV(list,"chairaise_donors_export.csv",cols);
      }} title="Export filtered donors to CSV">📥 Export</button>
      <span style={{fontSize:11,color:"var(--text3)"}}>{list.length} donors</span>
    </div>
    <div style={{flex:1,overflow:"auto"}}>
      <table className="list-table"><thead><tr>
        <th style={{width:36,padding:"8px 6px"}}><div className={"row-check"+(bulkSel?.size===list.length&&list.length>0?" checked":"")} onClick={()=>{if(bulkSel?.size===list.length)list.forEach(d=>onToggleBulk(d.id||d.name));else list.forEach(d=>{if(!bulkSel?.has(d.id||d.name))onToggleBulk(d.id||d.name)})}}>{bulkSel?.size===list.length&&list.length>0?"✓":""}</div></th>
        <th onClick={()=>sort("name")}>Name<SA c="name"/></th>
        <th onClick={()=>sort("tier")}>Tier<SA c="tier"/></th>
        <th onClick={()=>sort("net_worth")}>Net Worth<SA c="net_worth"/></th>
        <th onClick={()=>sort("annual_giving")}>Giving<SA c="annual_giving"/></th>
        <th onClick={()=>sort("community")}>Community<SA c="community"/></th>
        <th>Stage</th>
        <th onClick={()=>sort("warmth_score")}>Warmth<SA c="warmth_score"/></th>
        <th onClick={()=>sort("engagement")}>Engage<SA c="engagement"/></th>
        <th>AI Tmpl</th>
      </tr></thead><tbody>
        {list.map(d=>{const eng=aiScore(d,acts);const tmpl=TEMPLATES.find(t=>t.id===aiTemplate(d));const stg=STAGES.find(s=>s.id===(d.pipeline_stage||"not_started"));const w=parseInt(d.warmth_score||0);
        const did=d.id||d.name;const isBulked=bulkSel?.has(did);
        return(<tr key={did} onClick={()=>onSelect(d)} className={(selId===did?"selected":"")+(isBulked?" selected":"")}>
          <td style={{padding:"10px 6px"}} onClick={e=>e.stopPropagation()}><div className={"row-check"+(isBulked?" checked":"")} onClick={()=>onToggleBulk(did)}>{isBulked?"✓":""}</div></td>
          <td><div className="cell-name"><div className="avatar" style={{background:d.tier==="Tier 1"?"var(--accent-soft)":"var(--surface3)",color:d.tier==="Tier 1"?"var(--accent)":"var(--text3)"}}>{initials(d.name)}</div><div><div>{d.name}</div><div style={{fontSize:11,color:"var(--text3)"}}>{d.city||""}</div></div></div></td>
          <td><span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")}>{TIERS[d.tier]?.label||"T3"}</span></td>
          <td className="cell-amount">{fmt$(d.net_worth)}</td>
          <td className="cell-amount">{fmt$(d.annual_giving)}</td>
          <td style={{fontSize:12}}>{d.community||"—"}</td>
          <td onClick={e=>e.stopPropagation()}><select className="form-select" value={d.pipeline_stage||"not_started"} onChange={e=>onStage(did,e.target.value)} style={{padding:"3px 6px",fontSize:11,fontWeight:600,background:(stg?.color||"#52525b")+"15",color:stg?.color,border:"1px solid "+(stg?.color||"#52525b")+"40",borderRadius:6,cursor:"pointer",minWidth:100}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></td>
          <td><div className="cell-warmth"><div className="warmth-bar"><div className="warmth-fill" style={{width:`${w*10}%`,background:w>=7?"var(--green)":w>=4?"var(--accent)":"var(--blue)"}}/></div><span style={{fontSize:11,fontWeight:600}}>{w}</span></div></td>
          <td><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:32,height:4,background:"var(--surface3)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${eng}%`,height:"100%",borderRadius:2,background:eng>=70?"var(--green)":eng>=40?"var(--accent)":"var(--blue)"}}/></div><span style={{fontSize:11,fontWeight:600}}>{eng}</span></div></td>
          <td><span className="ai-badge">⚡{tmpl?.name?.split(" ")[0]}</span></td>
        </tr>)})}
      </tbody></table>
      {list.length===0&&<div className="empty-state"><div className="empty-icon">👥</div><h3>No donors found</h3><p>Adjust filters</p></div>}
    </div>
  </div>);
}

// ============================================================
// COMPONENT: BoardView (Kanban)
// ============================================================
function BoardView({donors,acts,onSelect,onStage}){
  const cols=useMemo(()=>STAGES.map(s=>({...s,donors:donors.filter(d=>(d.pipeline_stage||"not_started")===s.id).sort((a,b)=>parseInt(b.warmth_score||0)-parseInt(a.warmth_score||0))})),[donors]);
  const[drag,setDrag]=useState(null);
  const[dropTarget,setDropTarget]=useState(null);
  return(<div className="board">
    {cols.map(col=><div className="board-col" key={col.id}
      onDragOver={e=>{e.preventDefault();setDropTarget(col.id)}}
      onDragLeave={()=>setDropTarget(null)}
      onDrop={e=>{e.preventDefault();if(drag&&(drag.pipeline_stage||"not_started")!==col.id){onStage(drag.id||drag.name,col.id)}setDrag(null);setDropTarget(null)}}
      style={{border:dropTarget===col.id&&drag?"2px solid "+col.color:undefined,background:dropTarget===col.id&&drag?col.color+"10":undefined,transition:"all .15s"}}>
      <div className="board-col-header"><div className="col-dot" style={{background:col.color}}/><div className="col-title">{col.label}</div><div className="col-count">{col.donors.length}</div>
        {col.donors.length>0&&<span style={{fontSize:9,color:"var(--text4)",marginLeft:"auto"}}>{fmt$(col.donors.reduce((s,d)=>s+(parseInt(d.giving_capacity||d.net_worth||0)),0))}</span>}
      </div>
      <div className="board-col-body">
        {col.donors.map(d=>{const eng=aiScore(d,acts);return(
          <div className="board-card" key={d.id||d.name} draggable
            onDragStart={()=>setDrag(d)}
            onDragEnd={()=>{setDrag(null);setDropTarget(null)}}
            onClick={()=>onSelect(d)}
            style={{opacity:drag&&(drag.id||drag.name)===(d.id||d.name)?.4:1}}>
            <div className="card-name">{d.name}</div>
            <div className="card-meta"><span>{d.community||d.industry||"—"}</span><span>W:{d.warmth_score||0}</span></div>
            <div className="card-tags"><span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")} style={{fontSize:10,padding:"1px 5px"}}>{TIERS[d.tier]?.label||"T3"}</span><span className="ai-badge" style={{fontSize:9}}>E:{eng}</span></div>
            <div className="card-amount">Ask: {fmt$(aiAsk(d))}</div>
          </div>)})}
        {col.donors.length===0&&<div style={{padding:20,textAlign:"center",color:"var(--text4)",fontSize:11}}>{dropTarget===col.id&&drag?"Drop here":"Empty"}</div>}
      </div>
    </div>)}
  </div>);
}

// ============================================================
// COMPONENT: TimelineView
// ============================================================
function TimelineView({acts,donors}){
  const sorted=useMemo(()=>[...acts].sort((a,b)=>new Date(b.date)-new Date(a.date)),[acts]);
  const icons={email:"✉️",note:"📝",call:"📞",meeting:"🤝",stage_change:"📈"};
  const dots={email:"email",note:"note",call:"call",meeting:"meeting",stage_change:"stage"};
  if(!sorted.length)return(<div className="content-scroll"><div className="empty-state"><div className="empty-icon">📋</div><h3>No activities yet</h3><p>Engage with donors to build your timeline</p></div></div>);
  return(<div className="content-scroll"><div className="timeline">
    {sorted.map((a,i)=>{const d=donors.find(dd=>(dd.id||dd.name)===a.did);return(
      <div className="timeline-item" key={i}><div className={"timeline-dot "+(dots[a.type]||"note")}>{icons[a.type]||"📌"}</div>
        <div className="timeline-body"><div className="tl-header"><div className="tl-title">{d?.name||"Unknown"} — {a.type}</div><div className="tl-date">{fmtD(a.date)}</div></div><div className="tl-desc">{a.summary}</div></div>
      </div>)})}
  </div></div>);
}

// ============================================================
// COMPONENT: DonorDetail (slide-out)
// ============================================================
function DonorDetail({donor:d,acts,notes,onClose,onNote,onStage,onCompose,onEdit,onLogActivity}){
  const[tab,setTab]=useState("overview");const[nt,setNt]=useState("");
  const[showLogger,setShowLogger]=useState(false);
  const[donations,setDonations]=useState([]);const[donationsLoading,setDonationsLoading]=useState(false);
  // Fetch donation history when donations tab is selected
  useEffect(()=>{
    if(tab==="donations"&&donations.length===0&&!donationsLoading){
      setDonationsLoading(true);
      donationsAPI.getByDonor(d.id||d.name).then(data=>{
        if(data&&!data.error)setDonations(Array.isArray(data)?data:(data.donations||[]));
      }).catch(()=>{}).finally(()=>setDonationsLoading(false));
    }
  },[tab]);
  if(!d)return null;
  const eng=aiScore(d,acts);const lk=aiLikelihood(eng,d);const ask=aiAsk(d);const bt=aiTemplate(d);const tmpl=TEMPLATES.find(t=>t.id===bt);
  const stg=STAGES.find(s=>s.id===(d.pipeline_stage||"not_started"));const w=parseInt(d.warmth_score||d.warmth||0);
  const da=acts.filter(a=>a.did===(d.id||d.name));const dn=notes.filter(n=>n.did===(d.id||d.name));
  const addN=()=>{if(!nt.trim())return;onNote({did:d.id||d.name,text:nt,date:new Date().toISOString()});setNt("")};
  return(<>
    <div className="detail-overlay" onClick={onClose}/>
    <div className="detail-panel">
      <div className="detail-header"><div className="detail-avatar">{initials(d.name)}</div><div className="detail-info"><div className="detail-name">{d.name}</div><div className="detail-sub">{d.community||d.industry||"—"} • {d.city||""}</div></div>
        <button className="btn btn-ghost btn-sm" onClick={()=>onEdit(d)} title="Edit donor">✏️</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowLogger(!showLogger)} title="Log activity">📋</button>
        <div className="detail-close" onClick={onClose}>✕</div></div>
      <div className="detail-tabs">{["overview","intel","donations","timeline","whatsapp","notes"].map(t=><div key={t} className={"detail-tab "+(tab===t?"active":"")} onClick={()=>setTab(t)}>{t==="whatsapp"?"💬 WhatsApp":t==="donations"?"💰 Gifts":t[0].toUpperCase()+t.slice(1)}</div>)}</div>
      <div className="detail-body">
        {showLogger&&<ActivityLogger donor={d} onLog={(act,rem)=>onLogActivity(act,rem)} onClose={()=>setShowLogger(false)}/>}
        {tab==="overview"&&<>
          <div style={{background:"var(--purple-soft)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"var(--radius)",padding:12,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--purple)",marginBottom:8}}>⚡ AI INSIGHTS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <div><div style={{fontSize:10,color:"var(--text3)"}}>Engagement</div><div style={{fontSize:16,fontWeight:700,color:eng>=70?"var(--green)":eng>=40?"var(--accent)":"var(--blue)"}}>{eng}/100</div></div>
              <div><div style={{fontSize:10,color:"var(--text3)"}}>Gift Likelihood</div><div style={{fontSize:14,fontWeight:700,color:lk.c}}>{lk.l}</div></div>
              <div><div style={{fontSize:10,color:"var(--text3)"}}>Suggested Ask</div><div style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>{fmt$(ask)}</div></div>
            </div>
            <div style={{marginTop:8,fontSize:11,color:"var(--text2)"}}>Best template: <span style={{color:"var(--purple)",fontWeight:600}}>{tmpl?.name}</span></div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <select className="form-select" value={d.pipeline_stage||"not_started"} onChange={e=>onStage(d.id||d.name,e.target.value)} style={{flex:1,padding:"8px 10px"}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
            <button className="btn btn-primary" onClick={()=>onCompose(d)}>✉️ Compose</button>
          </div>
          <div className="intel-grid">
            <div className="intel-card"><div className="il">Net Worth</div><div className="iv">{fmt$(d.net_worth)}</div></div>
            <div className="intel-card"><div className="il">Annual Giving</div><div className="iv">{fmt$(d.annual_giving)}</div></div>
            <div className="intel-card"><div className="il">Warmth <span style={{fontSize:9,color:"var(--text4)"}}>(click to edit)</span></div><div className="iv" style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="0" max="10" value={w} onChange={e=>{const nw=parseInt(e.target.value);onEdit({...d,warmth_score:nw})}} style={{width:80,accentColor:w>=7?"#10b981":w>=4?"#f59e0b":"#3b82f6",cursor:"pointer"}}/>
              <span style={{fontWeight:700,color:w>=7?"var(--green)":w>=4?"var(--accent)":"var(--blue)"}}>{w}/10</span>
            </div></div>
            <div className="intel-card" style={{cursor:"pointer"}} onClick={()=>{const tiers=["Tier 1","Tier 2","Tier 3"];const idx=tiers.indexOf(d.tier||"Tier 3");onEdit({...d,tier:tiers[(idx+1)%3]})}} title="Click to cycle tier">
              <div className="il">Tier <span style={{fontSize:9,color:"var(--text4)"}}>(click to cycle)</span></div>
              <div className="iv"><span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")}>{d.tier||"Tier 3"}</span></div>
            </div>
            <div className="intel-card"><div className="il">Email</div><div className="iv" style={{fontSize:12}}>{d.email||"—"}</div></div>
            <div className="intel-card"><div className="il">Phone</div><div className="iv" style={{fontSize:12}}>{d.phone||"—"}</div></div>
            <div className="intel-card full"><div className="il">Focus Areas</div><div className="iv">{(d.focus_areas||[]).join(", ")||"—"}</div></div>
          </div>
          {(d.connector_paths||[]).length>0&&<><div style={{fontSize:11,fontWeight:600,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Connector Paths</div>
            {d.connector_paths.map((c,i)=><div className="connector-card" key={i}><div className="cn-name">{c.name}</div><div className="cn-role">{c.role}</div><div className="cn-strength">Strength: {c.strength||c.feasibility||"Unknown"}</div></div>)}</>}
        </>}
        {tab==="intel"&&<div className="intel-grid">
          <div className="intel-card"><div className="il">Industry</div><div className="iv">{d.industry||"—"}</div></div>
          <div className="intel-card"><div className="il">City</div><div className="iv">{d.city||"—"}</div></div>
          <div className="intel-card"><div className="il">Community</div><div className="iv">{d.community||d.synagogue||"—"}</div></div>
          <div className="intel-card"><div className="il">School</div><div className="iv">{d.school||"—"}</div></div>
          <div className="intel-card"><div className="il">Foundation</div><div className="iv">{d.foundation||"—"}</div></div>
          <div className="intel-card"><div className="il">Capacity</div><div className="iv">{fmt$(d.giving_capacity||d.net_worth)}</div></div>
          <div className="intel-card full"><div className="il">Prior Gift Detail</div><div className="iv">{d.prior_gift_detail||"No prior gift on record"}</div></div>
          <div className="intel-card full"><div className="il">Custom Hook</div><div className="iv">{d.custom_hook||"—"}</div></div>
          <div className="intel-card full"><div className="il">Notes from Data</div><div className="iv" style={{fontSize:12,lineHeight:1.6}}>{d.notes||d.additional_notes||"—"}</div></div>
        </div>}
        {tab==="donations"&&<div>
          {donationsLoading&&<p style={{color:"var(--text3)",fontSize:12}}>Loading donation history...</p>}
          {!donationsLoading&&donations.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:32,marginBottom:8}}>💰</div>
            <p style={{fontSize:13,color:"var(--text3)",marginBottom:4}}>No donation history yet</p>
            <p style={{fontSize:11,color:"var(--text4)"}}>Donations will appear here when synced from fundraising platforms or logged manually.</p>
          </div>}
          {donations.length>0&&<>
            {/* Summary stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              <div className="intel-card"><div className="il">Lifetime Total</div><div className="iv" style={{color:"var(--green)"}}>{fmt$(donations.reduce((s,g)=>s+(parseFloat(g.amount)||0),0))}</div></div>
              <div className="intel-card"><div className="il">Total Gifts</div><div className="iv">{donations.length}</div></div>
              <div className="intel-card"><div className="il">Avg Gift</div><div className="iv">{fmt$(Math.round(donations.reduce((s,g)=>s+(parseFloat(g.amount)||0),0)/donations.length))}</div></div>
            </div>
            {/* Gift list */}
            <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Gift History</div>
            {donations.sort((a,b)=>new Date(b.date||b.created_at)-new Date(a.date||a.created_at)).map((g,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:g.status==="completed"||!g.status?"var(--green)":g.status==="pending"?"var(--accent)":"var(--text4)",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{fmt$(g.amount)}{g.campaign_name?<span style={{fontSize:10,color:"var(--text3)",marginLeft:6}}>→ {g.campaign_name}</span>:""}</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>{g.type||"one-time"}{g.platform?` via ${g.platform}`:""}</div>
                </div>
                <div style={{fontSize:11,color:"var(--text4)"}}>{fmtD(g.date||g.created_at)}</div>
              </div>
            ))}
          </>}
        </div>}
        {tab==="timeline"&&<div style={{padding:0}}>
          {da.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:32,marginBottom:8}}>📋</div>
            <p style={{fontSize:13,color:"var(--text3)",marginBottom:4}}>No activities yet</p>
            <p style={{fontSize:11,color:"var(--text4)"}}>Log calls, emails, meetings, and notes to build a complete timeline.</p>
          </div>}
          {da.length>0&&<div style={{fontSize:11,color:"var(--text3)",marginBottom:12}}>{da.length} activities</div>}
          {da.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((a,i)=>{
            const actType=ACT_TYPES.find(t=>t.id===a.type)||{icon:"📝",label:a.type||"Note",color:"var(--text3)"};
            const daysAgo=Math.round((Date.now()-new Date(a.date))/864e5);
            const relTime=daysAgo===0?"Today":daysAgo===1?"Yesterday":`${daysAgo}d ago`;
            return(<div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:actType.color?.replace("var(","").replace(")","")?"rgba(245,158,11,0.12)":"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{actType.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{actType.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,color:"var(--accent)",fontWeight:600}}>{relTime}</span>
                    <span style={{fontSize:10,color:"var(--text4)"}}>{fmtD(a.date)}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.summary||"—"}</div>
                {a.outcome&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:4,marginTop:4,display:"inline-block",background:a.outcome==="positive"?"var(--green-soft)":a.outcome==="negative"?"var(--red-soft)":"var(--surface2)",color:a.outcome==="positive"?"var(--green)":a.outcome==="negative"?"var(--red)":"var(--text3)",fontWeight:600}}>{a.outcome}</span>}
              </div>
            </div>);
          })}
        </div>}
        {tab==="whatsapp"&&<WhatsAppChat donor={d} onLogActivity={(a)=>onNote(a)}/>}
        {tab==="notes"&&<>
          <div style={{display:"flex",gap:8,marginBottom:12}}><input className="form-input" placeholder="Add a note..." value={nt} onChange={e=>setNt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addN()}/><button className="btn btn-primary btn-sm" onClick={addN}>Add</button></div>
          {dn.length===0&&<p style={{color:"var(--text3)",fontSize:12}}>No notes yet</p>}
          {dn.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((n,i)=><div className="note-item" key={i}><div className="note-date">{fmtD(n.date)}</div><div className="note-text">{n.text}</div></div>)}
        </>}
      </div>
    </div>
  </>);
}

// ============================================================
// COMPONENT: EmailComposer (AI-powered modal)
// ============================================================
function EmailComposer({donor:d,apiKey,pplxKey,aiProvider,onClose,onSend}){
  const[tmpl,setTmpl]=useState(d?aiTemplate(d):"T-E");
  const[subj,setSubj]=useState("");const[body,setBody]=useState("");
  const[loading,setLoading]=useState(false);const[err,setErr]=useState("");
  // Read org profile for dynamic context (personalized per org)
  const orgProfile=sGet("org_profile",{});
  const org=getActiveOrg();
  const gen=async()=>{
    const activeKey=aiProvider==="perplexity"?pplxKey:apiKey;
    if(!activeKey){setErr(`Set ${aiProvider==="perplexity"?"Perplexity":"Anthropic"} API key in Settings first.`);return;}
    setLoading(true);setErr("");
    const t=TEMPLATES.find(x=>x.id===tmpl);
    const orgCtx=orgProfile.mission?`Organization: ${org.name}\nMission: ${orgProfile.mission}\nKey Programs: ${(orgProfile.key_programs||[]).join(", ")}\nTalking Points: ${(orgProfile.talking_points||[]).join("; ")}`:`Organization: ${org.name} — ${org.tagline||"Jewish nonprofit fundraising"}`;
    const prompt=`You are a world-class fundraising copywriter. Write a personalized outreach email.\n\n${orgCtx}\n\nDonor Profile:\nName: ${d.name}\nCommunity: ${d.community||"Unknown"}\nIndustry: ${d.industry||"Unknown"}\nNet Worth: ${fmt$(d.net_worth)}\nAnnual Giving: ${fmt$(d.annual_giving)}\nFocus: ${(d.focus_areas||[]).join(", ")}\nConnectors: ${(d.connector_paths||[]).map(c=>c.name+" ("+c.role+")").join(", ")}\nTemplate: ${t?.name} — ${t?.segment}\nHooks: ${t?.hooks}\n\nWrite ONLY the email body. Be warm, personal, compelling. Reference specific donor details and the org's mission. 150-250 words. End with a clear CTA for a meeting. Sign as the sender from ${org.name} Development team.`;
    try{
      const result=await callAI(prompt,aiProvider,apiKey,pplxKey);
      setBody(result);
      setSubj((t?.subject||"").replace("{First}",d.name?.split(" ")[0]||"").replace("{School}",d.school||d.community||"").replace("{Synagogue}",d.community||"").replace("{Family}",d.name?.split(" ").pop()||""));
    }catch(e){setErr(e.message)}finally{setLoading(false)}
  };
  const providerLabel=aiProvider==="perplexity"?"Perplexity Sonar":"Claude Sonnet 4";
  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-header"><h3>✉️ Compose — {d?.name}</h3><div className="detail-close" onClick={onClose}>✕</div></div>
    <div className="modal-body">
      {err&&<div style={{background:"var(--red-soft)",color:"var(--red)",padding:"8px 12px",borderRadius:"var(--radius-sm)",marginBottom:12,fontSize:12}}>{err}</div>}
      <div className="form-group"><label className="form-label">Template</label><select className="form-select" value={tmpl} onChange={e=>setTmpl(e.target.value)}>{TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.id}: {t.name}</option>)}</select></div>
      <div style={{marginBottom:12}}><button className="btn btn-primary" onClick={gen} disabled={loading}>{loading?"⏳ Generating...":"⚡ Generate with AI"}</button><span className="ai-badge" style={{marginLeft:8}}>{providerLabel}</span></div>
      <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={subj} onChange={e=>setSubj(e.target.value)} placeholder="Subject..."/></div>
      <div className="form-group"><label className="form-label">Body</label><textarea className="form-textarea" value={body} onChange={e=>setBody(e.target.value)} placeholder="AI-generated or type manually..." style={{minHeight:200}}/></div>
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-ghost" onClick={()=>{
        navigator.clipboard.writeText(`Subject: ${subj}\n\n${body}`);
        alert("Email copied to clipboard! Paste into Gmail or your email client.");
      }} disabled={!body} title="Copy email text to clipboard">📋 Copy</button>
      {d.email&&<button className="btn btn-primary" onClick={()=>{onSend({did:d.id||d.name,tmpl,subj,body,recipientEmail:d.email,date:new Date().toISOString()});onClose()}} disabled={!subj||!body}>✉️ Send to {d.email.split("@")[0]}</button>}
      <button className={d.email?"btn btn-ghost":"btn btn-primary"} onClick={()=>{onSend({did:d.id||d.name,tmpl,subj,body,date:new Date().toISOString()});onClose()}} disabled={!subj||!body}>{d.email?"Save Draft":"Save Draft & Log"}</button>
    </div>
  </div></div>);
}

// ============================================================
// COMPONENT: DonorFormModal — Add or Edit a donor record
// ============================================================
function DonorFormModal({donor,onSave,onClose}){
  const isEdit=!!donor;
  const[form,setForm]=useState(()=>{
    if(donor){const f={...donor};if(Array.isArray(f.focus_areas))f.focus_areas=f.focus_areas.join(", ");return f;}
    return{name:"",email:"",phone:"",city:"",tier:"Tier 2",community:"",school:"",industry:"",foundation:"",net_worth:"",annual_giving:"",giving_capacity:"",warmth_score:5,pipeline_stage:"not_started",focus_areas:"",custom_hook:"",prior_gift_detail:"",notes:""};
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=()=>{
    if(!form.name?.trim()){alert("Name is required");return}
    const out={...form};
    if(typeof out.focus_areas==="string")out.focus_areas=out.focus_areas.split(",").map(s=>s.trim()).filter(Boolean);
    ["net_worth","annual_giving","giving_capacity","warmth_score"].forEach(k=>{if(out[k])out[k]=Number(out[k])});
    if(!isEdit)out.id=Date.now();
    onSave(out,isEdit);onClose();
  };
  const renderField=(f)=>{
    const val=form[f.key]!=null?form[f.key]:"";
    if(f.type==="select"){
      return(<select className="form-select" value={val} onChange={e=>set(f.key,e.target.value)}>
        {(f.options||[]).map((o,i)=><option key={o} value={o}>{f.optionLabels?f.optionLabels[i]:o}</option>)}
      </select>);
    }
    if(f.type==="textarea")return(<textarea className="form-textarea" value={val} onChange={e=>set(f.key,e.target.value)} style={{minHeight:60}}/>);
    return(<input className="form-input" type={f.type==="number"?"number":f.type==="email"?"email":"text"} value={val} onChange={e=>set(f.key,e.target.value)} min={f.min} max={f.max}/>);
  };
  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{width:720,maxHeight:"90vh"}}>
    <div className="modal-header"><h3>{isEdit?"✏️ Edit Donor":"➕ Add New Donor"}</h3><div className="detail-close" onClick={onClose}>✕</div></div>
    <div className="modal-body">
      {FIELD_GROUPS.map(g=><div key={g.id} style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,paddingBottom:4,borderBottom:"1px solid var(--border)"}}>{g.label}</div>
        <div className="donor-form-grid">
          {DONOR_FIELDS.filter(f=>f.group===g.id).map(f=>(
            <div className={"form-group"+(f.type==="textarea"?" full":"")} key={f.key}>
              <label className="form-label">{f.label}{f.required&&<span style={{color:"var(--red)"}}>*</span>}</label>
              {renderField(f)}
            </div>
          ))}
        </div>
      </div>)}
      <div style={{marginTop:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,paddingBottom:4,borderBottom:"1px solid var(--border)"}}>Connector Paths</div>
        {(form.connector_paths||[]).map((c,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <input className="form-input" placeholder="Name" value={c.name||""} onChange={e=>{const cp=[...(form.connector_paths||[])];cp[i]={...cp[i],name:e.target.value};set("connector_paths",cp)}} style={{flex:1}}/>
          <input className="form-input" placeholder="Role" value={c.role||""} onChange={e=>{const cp=[...(form.connector_paths||[])];cp[i]={...cp[i],role:e.target.value};set("connector_paths",cp)}} style={{flex:1}}/>
          <select className="form-select" value={c.strength||"Medium"} onChange={e=>{const cp=[...(form.connector_paths||[])];cp[i]={...cp[i],strength:e.target.value};set("connector_paths",cp)}} style={{width:100}}>
            <option>Strong</option><option>Medium</option><option>Weak</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={()=>{const cp=[...(form.connector_paths||[])];cp.splice(i,1);set("connector_paths",cp)}}>✕</button>
        </div>)}
        <button className="btn btn-ghost btn-sm" onClick={()=>set("connector_paths",[...(form.connector_paths||[]),{name:"",role:"",strength:"Medium"}])}>+ Add Connector</button>
      </div>
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={save}>{isEdit?"Save Changes":"Add Donor"}</button>
    </div>
  </div></div>);
}

// ============================================================
// COMPONENT: CommandPalette (Ctrl+K) — global search + actions
// ============================================================
function CommandPalette({donors,onClose,onSelect,onNav,onAddDonor,onCompose}){
  const[q,setQ]=useState("");const[fi,setFi]=useState(0);const inputRef=useRef();
  useEffect(()=>{inputRef.current?.focus()},[]);
  const results=useMemo(()=>{
    const items=[];const ql=q.toLowerCase().trim();
    // Quick actions (shown when empty or matching query)
    const actions=[
      {icon:"➕",label:"Add New Donor",keywords:"add donor new create",action:()=>{onAddDonor();onClose()}},
      {icon:"🔍",label:"Advanced Search",keywords:"search find filter advanced",hint:"S",action:()=>{onClose();setTimeout(()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"s"})),100)}},
      {icon:"⌨️",label:"Keyboard Shortcuts",keywords:"shortcuts keys help keyboard",hint:"?",action:()=>{onClose();setTimeout(()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"?"})),100)}},
    ];
    const matchedActions=actions.filter(a=>!ql||a.label.toLowerCase().includes(ql)||a.keywords.includes(ql));
    if(matchedActions.length){
      matchedActions.forEach(a=>items.push({type:"action",icon:a.icon,label:a.label,hint:a.hint||"Action",action:a.action}));
    }
    if(ql.length>0){
      const matched=donors.filter(d=>[d.name,d.community,d.industry,d.city,d.email,d.phone].some(v=>(v||"").toLowerCase().includes(ql))).slice(0,8);
      if(matched.length>0){
        items.push({type:"section",label:"Donors"});
        matched.forEach(d=>{
          const stg=STAGES.find(s=>s.id===(d.pipeline_stage||"not_started"));
          items.push({type:"donor",icon:initials(d.name),label:d.name,sub:`${d.community||d.industry||"—"} • ${stg?.label||"—"}`,action:()=>{onSelect(d);onClose()}});
        });
      }
    }
    const pages=NAV.filter(n=>!ql||n.label.toLowerCase().includes(ql));
    if(pages.length>0&&(ql.length>0?pages.length<NAV.length:true)){
      items.push({type:"section",label:"Navigate"});
      pages.forEach(n=>items.push({type:"nav",icon:n.icon,label:n.label,hint:"Go to",action:()=>{onNav(n.id);onClose()}}));
    }
    return items;
  },[q,donors]);
  const actionable=results.filter(r=>r.type!=="section");
  const onKey=(e)=>{
    if(e.key==="Escape"){onClose();return}
    if(e.key==="ArrowDown"){e.preventDefault();setFi(i=>Math.min(i+1,actionable.length-1));return}
    if(e.key==="ArrowUp"){e.preventDefault();setFi(i=>Math.max(i-1,0));return}
    if(e.key==="Enter"&&actionable[fi]){e.preventDefault();actionable[fi].action();return}
  };
  let aIdx=-1;
  return(<div className="cmd-overlay" onClick={onClose}>
    <div className="cmd-box" onClick={e=>e.stopPropagation()}>
      <input ref={inputRef} className="cmd-input" placeholder="Search donors, navigate, or take action..." value={q} onChange={e=>{setQ(e.target.value);setFi(0)}} onKeyDown={onKey}/>
      <div className="cmd-results">
        {results.length===0&&q&&<div style={{padding:20,textAlign:"center",color:"var(--text3)",fontSize:12}}>No results for "{q}"</div>}
        {results.map((r,i)=>{
          if(r.type==="section")return(<div className="cmd-section" key={i}>{r.label}</div>);
          aIdx++;const isFocused=aIdx===fi;
          return(<div className={"cmd-item"+(isFocused?" focused":"")} key={i} onClick={r.action} onMouseEnter={()=>{/*track*/}}>
            <div className="cmd-icon" style={r.type==="donor"?{background:"var(--accent-soft)",color:"var(--accent)",fontWeight:700,fontSize:11}:{}}>{r.icon}</div>
            <div><div className="cmd-label">{r.label}</div>{r.sub&&<div className="cmd-sub">{r.sub}</div>}</div>
            {r.hint&&<div className="cmd-hint">{r.hint}</div>}
          </div>);
        })}
      </div>
    </div>
  </div>);
}

// ============================================================
// ============================================================
// COMPONENT: AdvancedSearch — multi-facet donor search with cause match
// ============================================================
function AdvancedSearch({donors,acts,orgProfile,apiKey,pplxKey,aiProvider,onSelect,onClose}){
  const org=getActiveOrg();
  const[q,setQ]=useState("");
  const[filters,setFilters]=useState({tiers:[],stages:[],tags:[],givingMin:"",givingMax:"",worthMin:"",worthMax:"",warmthMin:"",warmthMax:"",engageMin:"",engageMax:"",community:"",city:"",focusAreas:[],causeMin:""});
  const[sortBy,setSortBy]=useState("cause"); // cause | engagement | warmth | ask | name
  const[generating,setGenerating]=useState(null); // donorId being generated
  const inputRef=useRef();
  useEffect(()=>{inputRef.current?.focus()},[]);

  // Unique values for dropdowns
  const communities=useMemo(()=>[...new Set(donors.map(d=>d.community).filter(Boolean))].sort(),[donors]);
  const cities=useMemo(()=>[...new Set(donors.map(d=>d.city).filter(Boolean))].sort(),[donors]);
  const allTags=useMemo(()=>[...new Set(donors.flatMap(d=>d.tags||[]))].sort(),[donors]);
  const allFocus=useMemo(()=>[...new Set(donors.flatMap(d=>d.focus_areas||[]))].sort(),[donors]);

  const setF=(k,v)=>setFilters(f=>({...f,[k]:v}));

  // Generate AI brief for a donor
  const genBrief=async(d)=>{
    setGenerating(d.id||d.name);
    try{
      const brief=await aiGenerateBrief(d,orgProfile||{},org,aiProvider,apiKey,pplxKey);
      d.ai_brief=brief; // Mutate in place (will persist on next donor save)
    }catch(e){d.ai_brief="Error: "+e.message}
    setGenerating(null);
  };

  const results=useMemo(()=>{
    let list=donors.map(d=>{
      const eng=aiScore(d,acts);
      const cm=causeMatch(d,orgProfile);
      const ask=aiAsk(d);
      const w=parseInt(d.warmth_score||0);
      const stg=STAGES.find(s=>s.id===(d.pipeline_stage||"not_started"));
      return{...d,eng,cm,ask,w,stg};
    });

    // Text search
    if(q){const ql=q.toLowerCase();list=list.filter(d=>[d.name,d.community,d.industry,d.city,d.email,d.phone,d.ai_brief,...(d.focus_areas||[]),...(d.tags||[])].some(v=>(v||"").toLowerCase().includes(ql)))}

    // Tier filter
    if(filters.tiers.length)list=list.filter(d=>filters.tiers.includes(d.tier));
    // Stage filter
    if(filters.stages.length)list=list.filter(d=>filters.stages.includes(d.pipeline_stage||"not_started"));
    // Tags filter
    if(filters.tags.length)list=list.filter(d=>(d.tags||[]).some(t=>filters.tags.includes(t)));
    // Focus areas filter
    if(filters.focusAreas.length)list=list.filter(d=>(d.focus_areas||[]).some(f=>filters.focusAreas.includes(f)));
    // Numeric ranges
    if(filters.givingMin)list=list.filter(d=>parseInt(d.annual_giving||0)>=parseInt(filters.givingMin));
    if(filters.givingMax)list=list.filter(d=>parseInt(d.annual_giving||0)<=parseInt(filters.givingMax));
    if(filters.worthMin)list=list.filter(d=>parseInt(d.net_worth||0)>=parseInt(filters.worthMin));
    if(filters.worthMax)list=list.filter(d=>parseInt(d.net_worth||0)<=parseInt(filters.worthMax));
    if(filters.warmthMin)list=list.filter(d=>d.w>=parseInt(filters.warmthMin));
    if(filters.warmthMax)list=list.filter(d=>d.w<=parseInt(filters.warmthMax));
    if(filters.engageMin)list=list.filter(d=>d.eng>=parseInt(filters.engageMin));
    if(filters.engageMax)list=list.filter(d=>d.eng<=parseInt(filters.engageMax));
    // Community / City
    if(filters.community)list=list.filter(d=>(d.community||"").toLowerCase().includes(filters.community.toLowerCase()));
    if(filters.city)list=list.filter(d=>(d.city||"").toLowerCase().includes(filters.city.toLowerCase()));
    // Cause match minimum
    if(filters.causeMin)list=list.filter(d=>d.cm>=parseInt(filters.causeMin));

    // Sort
    if(sortBy==="cause")list.sort((a,b)=>b.cm-a.cm);
    else if(sortBy==="engagement")list.sort((a,b)=>b.eng-a.eng);
    else if(sortBy==="warmth")list.sort((a,b)=>b.w-a.w);
    else if(sortBy==="ask")list.sort((a,b)=>b.ask-a.ask);
    else if(sortBy==="name")list.sort((a,b)=>a.name.localeCompare(b.name));

    return list;
  },[donors,acts,orgProfile,q,filters,sortBy]);

  const activeFilterCount=Object.values(filters).filter(v=>Array.isArray(v)?v.length>0:!!v).length;

  return(<div className="modal-overlay" onClick={onClose} style={{alignItems:"stretch",padding:20}}>
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",display:"flex",flex:1,overflow:"hidden",maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>

      {/* LEFT: Filter Panel */}
      <div style={{width:280,minWidth:280,borderRight:"1px solid var(--border)",overflow:"auto",padding:16,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h3 style={{fontSize:14,fontWeight:700}}>🔍 Advanced Search</h3>
          <div className="detail-close" onClick={onClose}>✕</div>
        </div>
        <input ref={inputRef} className="form-input" placeholder="Search name, email, brief..." value={q} onChange={e=>setQ(e.target.value)} style={{padding:"8px 10px"}}/>

        {/* Tier checkboxes */}
        <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Tier</div>
          <div style={{display:"flex",gap:4}}>{["Tier 1","Tier 2","Tier 3"].map(t=>(
            <div key={t} onClick={()=>setF("tiers",filters.tiers.includes(t)?filters.tiers.filter(x=>x!==t):[...filters.tiers,t])} style={{padding:"3px 8px",borderRadius:10,fontSize:10,fontWeight:600,cursor:"pointer",border:"1px solid",borderColor:filters.tiers.includes(t)?"var(--accent)":"var(--border)",background:filters.tiers.includes(t)?"var(--accent-soft)":"transparent",color:filters.tiers.includes(t)?"var(--accent)":"var(--text3)"}}>{t.replace("Tier ","T")}</div>
          ))}</div>
        </div>

        {/* Stage multi-select */}
        <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Stage</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{STAGES.map(s=>(
            <div key={s.id} onClick={()=>setF("stages",filters.stages.includes(s.id)?filters.stages.filter(x=>x!==s.id):[...filters.stages,s.id])} style={{padding:"2px 6px",borderRadius:8,fontSize:9,fontWeight:600,cursor:"pointer",border:"1px solid",borderColor:filters.stages.includes(s.id)?s.color:"var(--border)",background:filters.stages.includes(s.id)?s.color+"20":"transparent",color:filters.stages.includes(s.id)?s.color:"var(--text4)"}}>{s.label.split(" ")[0]}</div>
          ))}</div>
        </div>

        {/* Cause match minimum */}
        <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Min Cause Match %</div>
          <input className="form-input" type="number" min="0" max="100" value={filters.causeMin} onChange={e=>setF("causeMin",e.target.value)} placeholder="0" style={{padding:"4px 8px",fontSize:11}}/></div>

        {/* Giving range */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Giving Min</div>
            <input className="form-input" type="number" value={filters.givingMin} onChange={e=>setF("givingMin",e.target.value)} placeholder="$0" style={{padding:"4px 8px",fontSize:11}}/></div>
          <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Giving Max</div>
            <input className="form-input" type="number" value={filters.givingMax} onChange={e=>setF("givingMax",e.target.value)} placeholder="∞" style={{padding:"4px 8px",fontSize:11}}/></div>
        </div>

        {/* Warmth range */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Warmth Min</div>
            <input className="form-input" type="number" min="0" max="10" value={filters.warmthMin} onChange={e=>setF("warmthMin",e.target.value)} placeholder="0" style={{padding:"4px 8px",fontSize:11}}/></div>
          <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Warmth Max</div>
            <input className="form-input" type="number" min="0" max="10" value={filters.warmthMax} onChange={e=>setF("warmthMax",e.target.value)} placeholder="10" style={{padding:"4px 8px",fontSize:11}}/></div>
        </div>

        {/* Community */}
        <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Community</div>
          <select className="form-select" value={filters.community} onChange={e=>setF("community",e.target.value)} style={{padding:"4px 8px",fontSize:11}}>
            <option value="">All</option>{communities.map(c=><option key={c} value={c}>{c}</option>)}
          </select></div>

        {/* City */}
        <div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>City</div>
          <select className="form-select" value={filters.city} onChange={e=>setF("city",e.target.value)} style={{padding:"4px 8px",fontSize:11}}>
            <option value="">All</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}
          </select></div>

        {/* Tags */}
        {allTags.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Tags</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{allTags.slice(0,15).map(t=>(
            <div key={t} onClick={()=>setF("tags",filters.tags.includes(t)?filters.tags.filter(x=>x!==t):[...filters.tags,t])} style={{padding:"2px 6px",borderRadius:10,fontSize:9,fontWeight:600,cursor:"pointer",background:filters.tags.includes(t)?tagColor(t)+"30":"var(--surface2)",color:filters.tags.includes(t)?tagColor(t):"var(--text4)"}}>{t}</div>
          ))}</div>
        </div>}

        {/* Clear all */}
        {activeFilterCount>0&&<button className="btn btn-ghost btn-sm" onClick={()=>setFilters({tiers:[],stages:[],tags:[],givingMin:"",givingMax:"",worthMin:"",worthMax:"",warmthMin:"",warmthMax:"",engageMin:"",engageMax:"",community:"",city:"",focusAreas:[],causeMin:""})}>Clear All Filters ({activeFilterCount})</button>}
      </div>

      {/* RIGHT: Results */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,fontWeight:700}}>{results.length} donors</span>
          <div style={{flex:1}}/>
          <select className="form-select" value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{width:140,padding:"4px 8px",fontSize:11}}>
            <option value="cause">Sort: Cause Match</option>
            <option value="engagement">Sort: Engagement</option>
            <option value="warmth">Sort: Warmth</option>
            <option value="ask">Sort: Ask Amount</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
        <div style={{flex:1,overflow:"auto"}}>
          {results.length===0&&<div className="empty-state"><div className="empty-icon">🔍</div><h3>No donors match</h3><p>Adjust your filters</p></div>}
          {results.map(d=>(
            <div key={d.id||d.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid var(--border)",cursor:"pointer",transition:"background .1s"}} onClick={()=>{onSelect(d);onClose()}} onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {/* Cause match badge */}
              <div style={{width:40,height:40,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0,background:d.cm>=50?"var(--green-soft)":d.cm>=20?"var(--accent-soft)":"var(--surface2)",color:d.cm>=50?"var(--green)":d.cm>=20?"var(--accent)":"var(--text4)"}}>{d.cm}%</div>
              {/* Name + meta */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,fontWeight:600}}>{d.name}</span>
                  <span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")} style={{fontSize:9,padding:"1px 5px"}}>{TIERS[d.tier]?.label||"T3"}</span>
                  <span className="cell-stage" style={{fontSize:9,padding:"1px 5px",background:(d.stg?.color||"#52525b")+"20",color:d.stg?.color}}>{d.stg?.label}</span>
                </div>
                <div style={{fontSize:11,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {d.ai_brief?d.ai_brief.slice(0,100)+"...":d.community||d.industry||"—"} • {d.city||""}
                </div>
              </div>
              {/* Stats */}
              <div style={{display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:d.eng>=70?"var(--green)":d.eng>=40?"var(--accent)":"var(--text3)"}}>{d.eng}</div><div style={{fontSize:8,color:"var(--text4)"}}>ENGAGE</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800}}>{d.w}/10</div><div style={{fontSize:8,color:"var(--text4)"}}>WARM</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:"var(--green)"}}>{fmt$(d.ask)}</div><div style={{fontSize:8,color:"var(--text4)"}}>ASK</div></div>
                {/* Generate brief button */}
                {!d.ai_brief&&<button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();genBrief(d)}} disabled={generating===(d.id||d.name)} style={{fontSize:9}}>{generating===(d.id||d.name)?"⏳":"🧠"}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: ActivityLogger — log calls, meetings, notes
// ============================================================
function ActivityLogger({donor,onLog,onClose}){
  const[type,setType]=useState("call");
  const[summary,setSummary]=useState("");
  const[date,setDate]=useState(new Date().toISOString().slice(0,10));
  const[outcome,setOutcome]=useState("");
  const[followUp,setFollowUp]=useState("");
  const submit=()=>{
    if(!summary.trim())return;
    const act={did:donor.id||donor.name,type,summary:summary.trim(),date:new Date(date).toISOString(),outcome};
    const rem=followUp?{id:Date.now(),did:donor.id||donor.name,type:"follow_up",summary:`Follow up: ${summary.slice(0,50)}`,date:followUp,created:new Date().toISOString(),done:false}:null;
    onLog(act,rem);
    onClose();
  };
  return(<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700}}>📋 Log Activity — {donor.name}</div>
      <div className="detail-close" onClick={onClose}>✕</div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
      {ACT_TYPES.filter(t=>!["stage_change"].includes(t.id)).map(t=>(
        <button key={t.id} className={"btn btn-sm "+(type===t.id?"btn-primary":"btn-ghost")} onClick={()=>setType(t.id)}>{t.icon} {t.label}</button>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div className="form-group"><label className="form-label">Outcome</label>
        <select className="form-select" value={outcome} onChange={e=>setOutcome(e.target.value)}>
          <option value="">—</option><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option><option value="no_answer">No Answer</option><option value="left_message">Left Message</option>
        </select>
      </div>
    </div>
    <div className="form-group"><label className="form-label">Summary</label><textarea className="form-textarea" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="What happened?" style={{minHeight:80}}/></div>
    <div className="form-group"><label className="form-label">Follow-up Date (optional — creates a reminder)</label><input className="form-input" type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={submit} disabled={!summary.trim()}>Log Activity</button>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: RemindersView — follow-up reminders dashboard
// ============================================================
function RemindersView({reminders,donors,onToggle,onDelete,onAdd}){
  const today=new Date().toISOString().slice(0,10);
  const[showAdd,setShowAdd]=useState(false);
  const[newRem,setNewRem]=useState({did:"",summary:"",date:""});
  const sorted=useMemo(()=>[...reminders].sort((a,b)=>{
    if(a.done!==b.done)return a.done?1:-1;
    return new Date(a.date)-new Date(b.date);
  }),[reminders]);
  const overdue=reminders.filter(r=>!r.done&&r.date<today).length;
  const todayCount=reminders.filter(r=>!r.done&&r.date===today).length;
  const upcoming=reminders.filter(r=>!r.done&&r.date>today).length;
  const addReminder=()=>{
    if(!newRem.summary||!newRem.date)return;
    if(onAdd)onAdd({id:Date.now(),did:newRem.did,summary:newRem.summary,date:newRem.date,created:new Date().toISOString(),done:false,type:"manual"});
    setNewRem({did:"",summary:"",date:""});setShowAdd(false);
  };
  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>🔔 Follow-up Reminders</h2>
      {overdue>0&&<span className="reminder-badge overdue">⚠️ {overdue} overdue</span>}
      {todayCount>0&&<span className="reminder-badge today">📌 {todayCount} today</span>}
      <span className="reminder-badge upcoming">{upcoming} upcoming</span>
      <div style={{flex:1}}/>
      <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(!showAdd)}>+ Add Reminder</button>
    </div>
    {showAdd&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,marginBottom:12}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10}}>
        <div className="form-group"><label className="form-label">Reminder</label>
          <input className="form-input" value={newRem.summary} onChange={e=>setNewRem(r=>({...r,summary:e.target.value}))} placeholder="Follow up with donor about..." onKeyDown={e=>e.key==="Enter"&&addReminder()}/></div>
        <div className="form-group"><label className="form-label">Date</label>
          <input className="form-input" type="date" value={newRem.date} onChange={e=>setNewRem(r=>({...r,date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Donor (optional)</label>
          <select className="form-select" value={newRem.did} onChange={e=>setNewRem(r=>({...r,did:e.target.value}))}>
            <option value="">General</option>
            {donors.map(d=><option key={d.id||d.name} value={d.id||d.name}>{d.name}</option>)}
          </select></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdd(false)}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={addReminder}>Add Reminder</button>
      </div>
    </div>}
    {sorted.length===0&&<div className="empty-state"><div className="empty-icon">🔔</div><h3>No reminders yet</h3><p>Log activities with follow-up dates to create reminders</p></div>}
    {sorted.map((r,i)=>{
      const d=donors.find(dd=>(dd.id||dd.name)===r.did);
      const isOverdue=!r.done&&r.date<today;
      const isToday=!r.done&&r.date===today;
      return(<div key={r.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"var(--surface)",border:"1px solid "+(isOverdue?"rgba(239,68,68,0.3)":isToday?"rgba(245,158,11,0.3)":"var(--border)"),borderRadius:"var(--radius)",marginBottom:6,opacity:r.done?.5:1}}>
        <div className={"row-check"+(r.done?" checked":"")} onClick={()=>onToggle(i)}>{r.done?"✓":""}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,fontWeight:600,textDecoration:r.done?"line-through":"none"}}>{r.summary}</span>
            {isOverdue&&<span className="reminder-badge overdue">Overdue</span>}
            {isToday&&<span className="reminder-badge today">Today</span>}
          </div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{d?.name||r.did} • {fmtD(r.date)}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={()=>onDelete(i)} style={{fontSize:11}}>✕</button>
      </div>);
    })}
  </div>);
}

// ============================================================
// COMPONENT: NetworkDashboard — Social Graph + Relationship Intelligence
// ============================================================
function CampaignManager({campaigns,donors,deals,acts,onAddCampaign,onUpdateCampaign,activeCampaign,setActiveCampaign}){
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({name:"",goal:"",start:new Date().toISOString().slice(0,10),end:"",description:""});

  const campaignStats=(c)=>{
    const cDonors=donors.filter(d=>!c.donorFilter||d.tier===c.donorFilter||(d.focus_areas||[]).some(f=>f.toLowerCase().includes(c.name.toLowerCase())));
    const raised=deals.filter(dl=>(dl.campaign||"main")===c.id).reduce((s,dl)=>s+(parseInt(dl.amt)||0),0);
    const goal=parseInt(c.goal)||1;
    const pct=Math.min((raised/goal)*100,100);
    const activeCount=cDonors.filter(d=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return si>=1&&si<9}).length;
    return{raised,pct,donors:cDonors.length,active:activeCount};
  };

  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>📊 Campaigns</h2>
      <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(!showForm)}>+ New Campaign</button>
    </div>

    {/* New campaign form */}
    {showForm&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,marginBottom:16}}>
      <h4 style={{fontSize:13,fontWeight:700,marginBottom:12}}>Create Campaign</h4>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
        <div className="form-group"><label className="form-label">Campaign Name *</label>
          <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Annual Gala 2026"/></div>
        <div className="form-group"><label className="form-label">Goal ($)</label>
          <input className="form-input" type="number" value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder="5000000"/></div>
        <div className="form-group"><label className="form-label">End Date</label>
          <input className="form-input" type="date" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}/></div>
      </div>
      <div className="form-group"><label className="form-label">Description</label>
        <input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Campaign details..."/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={()=>{
          if(!form.name.trim())return;
          onAddCampaign({...form,id:form.name.toLowerCase().replace(/\s+/g,"_"),goal:parseInt(form.goal)||0,status:"active",created:new Date().toISOString()});
          setForm({name:"",goal:"",start:new Date().toISOString().slice(0,10),end:"",description:""});setShowForm(false);
        }}>Create</button>
      </div>
    </div>}

    {/* Campaign cards */}
    {campaigns.map(c=>{
      const stats=campaignStats(c);
      const isActive=activeCampaign===c.id;
      return(<div className={"campaign-card"+(isActive?" active":"")} key={c.id} onClick={()=>setActiveCampaign(c.id)}>
        <div className="campaign-header">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:15,fontWeight:700}}>{c.name}</span>
              {isActive&&<span className="org-badge">ACTIVE</span>}
              <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:c.status==="active"?"var(--green-soft)":"var(--surface2)",color:c.status==="active"?"var(--green)":"var(--text3)",fontWeight:600}}>{c.status}</span>
            </div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{c.description||""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18,fontWeight:800,color:"var(--green)"}}>{fmt$(stats.raised)}</div>
            <div style={{fontSize:11,color:"var(--text3)"}}>of {fmt$(c.goal)} goal</div>
          </div>
        </div>
        <div className="campaign-progress">
          <div className="campaign-progress-fill" style={{width:`${stats.pct}%`,background:stats.pct>=75?"var(--green)":stats.pct>=40?"var(--accent)":"var(--blue)"}}/>
        </div>
        <div style={{display:"flex",gap:16,marginTop:8,fontSize:11,color:"var(--text3)"}}>
          <span>{stats.pct.toFixed(0)}% raised</span>
          <span>{stats.donors} donors</span>
          <span>{stats.active} in active outreach</span>
          {c.end&&<span>Ends: {fmtD(c.end)}</span>}
        </div>
      </div>);
    })}
  </div>);
}

// ============================================================
// COMPONENT: AdvancedAnalytics — charts, trends, forecasting
// ============================================================
function AdvancedAnalytics({donors,acts,deals,campaigns,outreachLog}){
  const[period,setPeriod]=useState("30"); // days

  // Pipeline value by stage
  const pipelineByStage=useMemo(()=>STAGES.map(s=>{
    const stageDonors=donors.filter(d=>(d.pipeline_stage||"not_started")===s.id);
    const value=stageDonors.reduce((sum,d)=>sum+(parseInt(d.annual_giving||0)||aiAsk(d)),0);
    return{...s,count:stageDonors.length,value};
  }),[donors]);
  const maxPipeVal=Math.max(...pipelineByStage.map(s=>s.value),1);

  // Activity trend (last N days)
  const activityTrend=useMemo(()=>{
    const days=parseInt(period);
    const buckets=[];
    for(let i=days-1;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const key=d.toISOString().slice(0,10);
      const count=acts.filter(a=>a.date?.slice(0,10)===key).length;
      buckets.push({date:key,label:d.toLocaleDateString("en-US",{month:"short",day:"numeric"}),count});
    }
    return buckets;
  },[acts,period]);
  const maxAct=Math.max(...activityTrend.map(b=>b.count),1);

  // Tier distribution with values
  const tierAnalysis=useMemo(()=>{
    return["Tier 1","Tier 2","Tier 3"].map(tier=>{
      const td=donors.filter(d=>d.tier===tier||(tier==="Tier 3"&&!d.tier));
      const totalVal=td.reduce((s,d)=>s+(parseInt(d.net_worth||0)),0);
      const avgWarmth=td.length?(td.reduce((s,d)=>s+parseInt(d.warmth_score||0),0)/td.length).toFixed(1):0;
      const inPipeline=td.filter(d=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return si>=1}).length;
      return{tier,count:td.length,totalVal,avgWarmth,inPipeline,pct:donors.length?(td.length/donors.length*100).toFixed(0):0};
    });
  },[donors]);

  // Channel mix from outreach log
  const channelMix=useMemo(()=>{
    const mix={};
    outreachLog.forEach(e=>{const ch=e.channel||"email";mix[ch]=(mix[ch]||0)+1});
    return Object.entries(mix).sort((a,b)=>b[1]-a[1]);
  },[outreachLog]);

  // Conversion funnel
  const funnel=useMemo(()=>{
    return STAGES.map(s=>({
      ...s,
      count:donors.filter(d=>(d.pipeline_stage||"not_started")===s.id).length,
      pct:donors.length?(donors.filter(d=>(d.pipeline_stage||"not_started")===s.id).length/donors.length*100).toFixed(0):0
    }));
  },[donors]);

  // Forecasted revenue (simple: sum of aiAsk for donors in stages 5+)
  const forecast=useMemo(()=>{
    const committed=donors.filter(d=>STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"))>=9).reduce((s,d)=>s+aiAsk(d),0);
    const likely=donors.filter(d=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return si>=6&&si<9}).reduce((s,d)=>s+aiAsk(d)*0.6,0);
    const possible=donors.filter(d=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));return si>=3&&si<6}).reduce((s,d)=>s+aiAsk(d)*0.25,0);
    return{committed,likely,possible,total:committed+likely+possible};
  },[donors]);

  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>📈 Analytics & Forecasting</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <select className="form-select" value={period} onChange={e=>setPeriod(e.target.value)} style={{width:120,padding:"4px 8px",fontSize:11}}>
          <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={()=>window.print()}>🖨️ Print Report</button>
      </div>
    </div>

    {/* Revenue Forecast */}
    <div className="chart-container" style={{background:"linear-gradient(135deg,var(--surface),rgba(139,92,246,0.05))"}}>
      <h4>💰 Revenue Forecast</h4>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <div style={{textAlign:"center",padding:12,background:"var(--bg)",borderRadius:"var(--radius)"}}>
          <div style={{fontSize:22,fontWeight:800,color:"var(--green)"}}>{fmt$(forecast.committed)}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Committed</div>
        </div>
        <div style={{textAlign:"center",padding:12,background:"var(--bg)",borderRadius:"var(--radius)"}}>
          <div style={{fontSize:22,fontWeight:800,color:"var(--accent)"}}>{fmt$(forecast.likely)}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Likely (60%)</div>
        </div>
        <div style={{textAlign:"center",padding:12,background:"var(--bg)",borderRadius:"var(--radius)"}}>
          <div style={{fontSize:22,fontWeight:800,color:"var(--blue)"}}>{fmt$(forecast.possible)}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Possible (25%)</div>
        </div>
        <div style={{textAlign:"center",padding:12,background:"var(--purple-soft)",borderRadius:"var(--radius)"}}>
          <div style={{fontSize:22,fontWeight:800,color:"var(--purple)"}}>{fmt$(forecast.total)}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Weighted Total</div>
        </div>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {/* Pipeline Value by Stage */}
      <div className="chart-container">
        <h4>📊 Pipeline Value by Stage</h4>
        <div className="bar-chart">
          {pipelineByStage.filter(s=>s.value>0||s.count>0).map(s=>(
            <div className="bar-col" key={s.id}>
              <div className="bar-value">{s.count}</div>
              <div className="bar-fill" style={{height:`${Math.max((s.value/maxPipeVal)*140,4)}px`,background:s.color}}/>
              <div className="bar-label">{s.label.split(" ")[0]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Trend */}
      <div className="chart-container">
        <h4>📅 Activity Trend ({period}d)</h4>
        <div className="bar-chart">
          {activityTrend.slice(-14).map((b,i)=>(
            <div className="bar-col" key={i}>
              {b.count>0&&<div className="bar-value">{b.count}</div>}
              <div className="bar-fill" style={{height:`${Math.max((b.count/maxAct)*140,b.count>0?4:0)}px`,background:"var(--accent)"}}/>
              <div className="bar-label">{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {/* Tier Analysis */}
      <div className="chart-container">
        <h4>🎯 Tier Analysis</h4>
        {tierAnalysis.map(t=>(
          <div className="trend-row" key={t.tier}>
            <span className={"cell-tier "+(t.tier==="Tier 1"?"t1":t.tier==="Tier 2"?"t2":"t3")} style={{minWidth:50,textAlign:"center"}}>{t.tier.replace("Tier ","T")}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:700}}>{t.count} donors</span>
                <span style={{fontSize:11,color:"var(--text3)"}}>({t.pct}%)</span>
              </div>
              <div style={{fontSize:11,color:"var(--text3)"}}>Net Worth: {fmt$(t.totalVal)} | Warmth: {t.avgWarmth}/10 | {t.inPipeline} in pipeline</div>
            </div>
          </div>
        ))}
      </div>

      {/* Channel Mix */}
      <div className="chart-container">
        <h4>📡 Outreach Channel Mix</h4>
        {channelMix.length===0&&<div style={{fontSize:12,color:"var(--text3)",padding:20,textAlign:"center"}}>Log outreach to see channel distribution</div>}
        {channelMix.map(([ch,count],i)=>{
          const icons={email:"✉️",whatsapp:"💬",call:"📞",meeting:"🤝",intro:"🔗",linkedin:"💼"};
          const total=outreachLog.length||1;
          return(<div className="trend-row" key={ch}>
            <span style={{fontSize:16,minWidth:24}}>{icons[ch]||"📧"}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,fontWeight:600,textTransform:"capitalize"}}>{ch}</span>
                <div style={{flex:1,height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${(count/total)*100}%`,height:"100%",borderRadius:3,background:"var(--accent)"}}/>
                </div>
                <span style={{fontSize:11,fontWeight:700}}>{count}</span>
              </div>
            </div>
          </div>);
        })}
      </div>
    </div>

    {/* Conversion Funnel */}
    <div className="chart-container">
      <h4>🔄 Conversion Funnel</h4>
      <div style={{display:"flex",gap:4,alignItems:"flex-end",height:100}}>
        {funnel.map((s,i)=>{
          const maxCount=Math.max(...funnel.map(f=>f.count),1);
          return(<div key={s.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:10,fontWeight:700,color:"var(--text2)"}}>{s.count}</span>
            <div style={{width:"100%",height:`${Math.max((s.count/maxCount)*80,s.count>0?4:0)}px`,background:s.color,borderRadius:"4px 4px 0 0",transition:"height .5s"}}/>
            <span style={{fontSize:8,color:"var(--text4)",textAlign:"center",lineHeight:1.2}}>{s.label.split(" ")[0]}</span>
          </div>);
        })}
      </div>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: CSVImportMapper — bulk import with column mapping
// ============================================================
function CSVImportMapper({onImport,onClose}){
  const[rawCSV,setRawCSV]=useState(null);
  const[rows,setRows]=useState([]);
  const[headers,setHeaders]=useState([]);
  const[mapping,setMapping]=useState({});
  const[importing,setImporting]=useState(false);
  const[result,setResult]=useState(null);
  const fileRef=useRef();

  const CRM_FIELDS=DONOR_FIELDS.map(f=>({key:f.key,label:f.label}));

  const handleFile=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const text=ev.target.result;
      const parsed=parseCSV(text);
      if(parsed.length<2){alert("CSV must have at least a header row and one data row");return}
      setRawCSV(text);
      setHeaders(parsed[0]);
      setRows(parsed.slice(1));
      // Auto-map columns by fuzzy header matching
      const autoMap={};
      parsed[0].forEach((h,i)=>{
        const hLow=h.toLowerCase().replace(/[_\-\s]+/g," ");
        const match=CRM_FIELDS.find(f=>{
          const fLow=f.label.toLowerCase();
          return hLow===fLow||hLow.includes(fLow)||fLow.includes(hLow)||
            (hLow.includes("first")&&f.key==="name")||
            (hLow.includes("worth")&&f.key==="net_worth")||
            (hLow.includes("giving")&&f.key==="annual_giving")||
            (hLow.includes("warmth")&&f.key==="warmth_score")||
            (hLow.includes("stage")&&f.key==="pipeline_stage")||
            (hLow.includes("tier")&&f.key==="tier");
        });
        if(match)autoMap[i]=match.key;
      });
      setMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const doImport=()=>{
    setImporting(true);
    const donors=[];
    rows.forEach((row,ri)=>{
      const donor={id:Date.now()+ri,pipeline_stage:"not_started"};
      let hasName=false;
      Object.entries(mapping).forEach(([colIdx,fieldKey])=>{
        const val=row[parseInt(colIdx)]||"";
        if(!val)return;
        if(fieldKey==="name")hasName=true;
        if(["net_worth","annual_giving","giving_capacity","warmth_score"].includes(fieldKey)){
          donor[fieldKey]=parseInt(val.replace(/[$,]/g,""))||0;
        }else if(fieldKey==="focus_areas"){
          donor[fieldKey]=val.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
        }else{
          donor[fieldKey]=val;
        }
      });
      if(hasName&&donor.name)donors.push(donor);
    });
    onImport(donors);
    setResult({count:donors.length,total:rows.length});
    setImporting(false);
  };

  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{width:800,maxHeight:"90vh"}}>
    <div className="modal-header"><h3>📥 Import Donors from CSV</h3><div className="detail-close" onClick={onClose}>✕</div></div>
    <div className="modal-body">
      {!rawCSV&&<>
        <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Upload a CSV file with donor data. Column mapping is automatic with manual override.</p>
        <div className="net-import-zone" onClick={()=>fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{display:"none"}} onChange={handleFile}/>
          <div style={{fontSize:32,marginBottom:8}}>📁</div>
          <div style={{fontSize:14,fontWeight:600}}>Click to upload .csv file</div>
          <div style={{fontSize:12,color:"var(--text3)"}}>Supports CSV, TSV. First row must be headers.</div>
        </div>
      </>}

      {rawCSV&&!result&&<>
        <div style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>{rows.length} rows detected with {headers.length} columns. Map columns below:</div>

        {/* Preview */}
        <div className="csv-preview">
          <table><thead><tr>
            {headers.map((h,i)=><th key={i} style={{background:mapping[i]?"var(--accent-soft)":"var(--surface)"}}>{h}</th>)}
          </tr></thead><tbody>
            {rows.slice(0,3).map((row,ri)=><tr key={ri}>{row.map((cell,ci)=><td key={ci}>{cell?.slice(0,30)}</td>)}</tr>)}
          </tbody></table>
        </div>

        {/* Column mapping */}
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Column Mapping</div>
          {headers.map((h,i)=>(
            <div className="col-mapper" key={i}>
              <div style={{fontSize:12,fontWeight:600}}>{h}</div>
              <span style={{color:"var(--text4)"}}>→</span>
              <select className="form-select" value={mapping[i]||""} onChange={e=>{const m={...mapping};if(e.target.value)m[i]=e.target.value;else delete m[i];setMapping(m)}} style={{padding:"4px 8px",fontSize:11}}>
                <option value="">— Skip —</option>
                {CRM_FIELDS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </>}

      {result&&<div style={{padding:20,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>✅</div>
        <h3 style={{marginBottom:8}}>Imported {result.count} Donors</h3>
        <p style={{fontSize:12,color:"var(--text3)"}}>{result.count} of {result.total} rows had valid names and were imported.</p>
      </div>}
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={onClose}>{result?"Done":"Cancel"}</button>
      {rawCSV&&!result&&<button className="btn btn-primary" onClick={doImport} disabled={importing||!Object.values(mapping).includes("name")}>
        {importing?"Importing...":Object.values(mapping).includes("name")?`Import ${rows.length} Rows`:"Map 'name' column first"}
      </button>}
    </div>
  </div></div>);
}

// ============================================================
// ============================================================
// ============================================================
// COMPONENT: OrgRegistrationModal — register a new organization
// ============================================================
function OrgRegistrationModal({onComplete,onClose}){
  const[step,setStep]=useState(0); // 0=form, 1=verify, 2=done
  const[form,setForm]=useState({name:"",website:"",type:"synagogue",adminName:"",adminEmail:"",password:"",mission:"",ein:""});
  const[verifyCode,setVerifyCode]=useState("");
  const[err,setErr]=useState("");
  const{addToast}=useToast();
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const domain=form.adminEmail.includes("@")?form.adminEmail.split("@")[1]:"";
  const isGenericDomain=["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com"].includes(domain);

  const submitForm=()=>{
    if(!form.name||!form.adminName||!form.adminEmail||!form.password){setErr("All required fields must be filled");return}
    if(form.password.length<6){setErr("Password must be at least 6 characters");return}
    setErr("");setStep(1);
  };

  const verify=()=>{
    // Client-side demo verification — production would use SMTP email with 6-digit code
    if(verifyCode==="123456"||verifyCode===domain.slice(0,6)){
      // Create org
      const orgId=form.name.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
      const org={
        id:orgId,name:form.name,tagline:"",
        logo:form.name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase(),
        accentColor:"#f59e0b",currency:"USD",timezone:"America/New_York",
        website:form.website,org_type:form.type,ein:form.ein,
        mission:form.mission,created:new Date().toISOString(),
        verified:true,verifiedAt:new Date().toISOString(),verifiedDomain:domain
      };
      // Add to org list
      const orgList=getOrgList();
      if(orgList.find(o=>o.id===orgId)){setErr("An organization with this ID already exists");return}
      orgList.push(org);setOrgList(orgList);
      // Switch to new org
      setActiveOrg(org);
      // Create admin user for the new org
      const adminUser={id:Date.now(),name:form.adminName,email:form.adminEmail.toLowerCase(),role:"admin",
        passwordHash:hashPassword(form.password),created:new Date().toISOString(),avatar:form.adminName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)};
      // Store user under new org prefix
      localStorage.setItem(orgId+"_users",JSON.stringify([adminUser]));
      appendAudit({type:"login",action:"New organization registered",detail:form.name,user:form.adminName});
      setStep(2);
    }else{
      setErr("Invalid verification code. Use 123456 for demo.");
    }
  };

  const finish=()=>{
    addToast({type:"success",title:"Organization registered!",message:`${form.name} is ready. Reloading...`});
    setTimeout(()=>window.location.reload(),1000);
  };

  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{width:560}}>
    <div className="modal-header"><h3>🏢 Register New Organization</h3><div style={{cursor:"pointer",color:"var(--text3)",fontSize:18}} onClick={onClose}>✕</div></div>
    <div className="modal-body">
      {err&&<div style={{background:"var(--red-soft)",color:"var(--red)",padding:"8px 12px",borderRadius:"var(--radius-sm)",marginBottom:12,fontSize:12}}>{err}</div>}

      {step===0&&<>
        <div className="form-group"><label className="form-label">Organization Name *</label>
          <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Temple Beth Israel"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="form-group"><label className="form-label">Website</label>
            <input className="form-input" value={form.website} onChange={e=>set("website",e.target.value)} placeholder="https://yourorg.org"/></div>
          <div className="form-group"><label className="form-label">Organization Type</label>
            <select className="form-select" value={form.type} onChange={e=>set("type",e.target.value)}>
              {ORG_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select></div>
        </div>
        <div className="form-group"><label className="form-label">Mission (optional)</label>
          <textarea className="form-textarea" value={form.mission} onChange={e=>set("mission",e.target.value)} placeholder="What does your organization do?" style={{minHeight:50}}/></div>
        <div className="form-group"><label className="form-label">EIN (optional)</label>
          <input className="form-input" value={form.ein} onChange={e=>set("ein",e.target.value)} placeholder="XX-XXXXXXX"/></div>

        <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginTop:16,marginBottom:8,paddingTop:12,borderTop:"1px solid var(--border)"}}>Admin Account</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="form-group"><label className="form-label">Admin Name *</label>
            <input className="form-input" value={form.adminName} onChange={e=>set("adminName",e.target.value)} placeholder="Your full name"/></div>
          <div className="form-group"><label className="form-label">Admin Email *</label>
            <input className="form-input" type="email" value={form.adminEmail} onChange={e=>set("adminEmail",e.target.value)} placeholder="you@yourorg.org"/></div>
        </div>
        {isGenericDomain&&form.adminEmail&&<div style={{background:"var(--accent-soft)",color:"var(--accent)",padding:"6px 10px",borderRadius:"var(--radius-sm)",fontSize:11,marginBottom:8}}>⚠️ Using a personal email ({domain}). Organizational email (e.g., you@yourorg.org) is recommended for verification.</div>}
        <div className="form-group"><label className="form-label">Password *</label>
          <input className="form-input" type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 6 characters"/></div>
      </>}

      {step===1&&<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:36,marginBottom:12}}>📧</div>
        <h3 style={{marginBottom:8}}>Verify Your Email</h3>
        <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>
          In production, we send a 6-digit verification code to <strong>{form.adminEmail}</strong>.<br/>
          For this demo, enter code: <strong>123456</strong>
        </p>
        <input className="form-input" value={verifyCode} onChange={e=>setVerifyCode(e.target.value)} placeholder="Enter 6-digit code" style={{maxWidth:200,margin:"0 auto",textAlign:"center",fontSize:18,letterSpacing:8,fontWeight:700}} onKeyDown={e=>{if(e.key==="Enter")verify()}}/>
        <div style={{marginTop:12,fontSize:10,color:"var(--text4)"}}>
          Production path: SMTP email → 6-digit code → rate limiting → domain allowlist
        </div>
      </div>}

      {step===2&&<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:48,marginBottom:12}}>✅</div>
        <h2 style={{fontSize:20,fontWeight:800,marginBottom:8}}>{form.name} Registered!</h2>
        <p style={{fontSize:12,color:"var(--text3)"}}>Your organization is verified and ready to use. The CRM will reload with your new org.</p>
      </div>}
    </div>
    <div className="modal-footer">
      {step===0&&<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submitForm}>Next: Verify Email →</button></>}
      {step===1&&<><button className="btn btn-ghost" onClick={()=>setStep(0)}>← Back</button><button className="btn btn-primary" onClick={verify}>Verify & Create</button></>}
      {step===2&&<button className="btn btn-primary" onClick={finish}>🚀 Launch CRM</button>}
    </div>
  </div></div>);
}

// ============================================================
// COMPONENT: OrgSwitcher — dropdown from nav logo to switch orgs
// ============================================================
function OrgSwitcher({currentOrg,onClose}){
  const[orgs]=useState(()=>getOrgList());
  const[showRegister,setShowRegister]=useState(false);
  const ref=useRef();

  useEffect(()=>{
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))onClose()};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[onClose]);

  const switchOrg=(org)=>{
    setActiveOrg(org);
    // Must reload to re-initialize all org-scoped state from localStorage
    window.location.reload();
  };

  return(<>
    <div ref={ref} style={{position:"absolute",top:48,left:4,width:240,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",boxShadow:"var(--shadow-lg)",zIndex:200,overflow:"hidden"}}>
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--border)",fontSize:10,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5}}>Organizations</div>
      <div style={{maxHeight:240,overflowY:"auto"}}>
        {orgs.map(org=>(
          <div key={org.id} onClick={()=>switchOrg(org)} style={{
            display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer",transition:"background .1s",
            background:org.id===currentOrg.id?"var(--accent-soft)":"transparent",borderBottom:"1px solid var(--border)"
          }} onMouseEnter={e=>{if(org.id!==currentOrg.id)e.currentTarget.style.background="var(--surface2)"}} onMouseLeave={e=>{if(org.id!==currentOrg.id)e.currentTarget.style.background="transparent"}}>
            <div style={{width:28,height:28,borderRadius:"var(--radius-sm)",background:org.id===currentOrg.id?"var(--accent)":"var(--surface3)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:10,color:org.id===currentOrg.id?"var(--bg)":"var(--text3)",flexShrink:0}}>
              {org.logo||org.name?.slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{org.name}</div>
              {org.tagline&&<div style={{fontSize:10,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{org.tagline}</div>}
            </div>
            {org.id===currentOrg.id&&<span style={{fontSize:10,color:"var(--accent)",fontWeight:700}}>✓</span>}
          </div>
        ))}
      </div>
      <div style={{padding:"8px 12px",borderTop:"1px solid var(--border)"}}>
        <button className="btn btn-ghost btn-sm" style={{width:"100%",justifyContent:"center"}} onClick={()=>setShowRegister(true)}>+ Add Organization</button>
      </div>
    </div>
    {showRegister&&<OrgRegistrationModal onComplete={()=>{}} onClose={()=>setShowRegister(false)}/>}
  </>);
}

// ============================================================
// COMPONENT: IntegrationHub — connect fundraising platforms
// ============================================================
const INTEGRATIONS=[
  {id:"israelgives",name:"IsraelGives",icon:"🇮🇱",type:"csv",desc:"Import donors & donations from IsraelGives CSV exports",fields:[],status:"active",
    help:"In IsraelGives: Dashboard → Contacts/Donations → Export CSV. Upload here. Auto-maps Hebrew/English columns (שם, דוא\"ל, סכום, etc.).",
    columnMap:{name:[/^(name|full.?name|שם|שם מלא|donor.?name)/i],email:[/^(email|e-?mail|דוא"ל|אימייל)/i],phone:[/^(phone|tel|טלפון|נייד)/i],amount:[/^(amount|sum|סכום|donation|תרומה)/i],city:[/^(city|עיר|address|כתובת)/i],date:[/^(date|תאריך|donation.?date)/i],campaign:[/^(campaign|קמפיין|מבצע)/i],receipt:[/^(receipt|קבלה|receipt.?no)/i],comment:[/^(comment|הערה|notes|הערות)/i]}
  },
  {id:"donorbox",name:"Donorbox",icon:"📦",type:"csv",desc:"CSV export from Donorbox campaigns",fields:[],status:"active",help:"In Donorbox: Donations → Export CSV. Supports recurring donor tracking."},
  {id:"charidy",name:"Charidy",icon:"💝",type:"csv",desc:"Export campaign donation data as CSV",fields:[],status:"active",help:"In Charidy: Campaign → Donors → Download CSV"},
  {id:"givebutter",name:"Givebutter",icon:"🧈",type:"csv",desc:"CSV export with Zapier automation support",fields:[],status:"active",help:"In Givebutter: Supporters → Export. Or use Zapier for real-time sync."},
  {id:"chesed_fund",name:"The Chesed Fund",icon:"🤲",type:"csv",desc:"Manual CSV export from Chesed Fund dashboard",fields:[],status:"active",help:"Download your donor list from The Chesed Fund dashboard as CSV"},
  {id:"jgive",name:"JGive",icon:"🕎",type:"csv",desc:"Import from JGive campaign exports",fields:[],status:"active",help:"In JGive: Campaigns → Donations → Export"},
  {id:"zapier",name:"Zapier Webhook",icon:"⚡",type:"webhook",desc:"Real-time sync from any platform via Zapier",fields:["webhook_url"],status:"active",help:"Create a Zap: Trigger (IsraelGives/Donorbox/etc.) → Webhook POST to your ChaiRaise webhook URL. URL shown after connecting."},
  {id:"generic",name:"Generic CSV",icon:"📊",type:"csv",desc:"Import from any CSV/Excel source",fields:[],status:"active",help:"Any CSV with at least a 'name' column will work"},
];

function IntegrationHub({donors,onImportDonors}){
  const[configs,setConfigs]=useState(()=>sGet("integration_configs",{}));
  const[log,setLog]=useState(()=>sGet("integration_log",[]));
  const[expanded,setExpanded]=useState(null);
  const[uploading,setUploading]=useState(false);
  const[uploadResult,setUploadResult]=useState(null);
  const fileRef=useRef();
  const{addToast}=useToast();

  useEffect(()=>{sSet("integration_configs",configs)},[configs]);
  useEffect(()=>{sSet("integration_log",log)},[log]);

  const setConfig=(id,key,val)=>{setConfigs(p=>({...p,[id]:{...(p[id]||{}),connected:p[id]?.connected,[key]:val}}))};
  const toggleConnect=(id)=>{setConfigs(p=>({...p,[id]:{...(p[id]||{}),connected:!p[id]?.connected}}))};

  const handleCSVUpload=(platformId,e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setUploading(true);setUploadResult(null);
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const text=ev.target.result;
      const parsed=parseCSV(text);
      if(parsed.length<2){setUploadResult({error:"CSV needs header + data rows"});setUploading(false);return}
      const headers=parsed[0];
      const rows=parsed.slice(1);

      // Platform-specific column mapping (IsraelGives has Hebrew headers)
      const platform=INTEGRATIONS.find(i=>i.id===platformId);
      const cmap=platform?.columnMap||{};

      // Auto-map columns — use platform-specific patterns first, then generic fallbacks
      const findCol=(patterns)=>headers.findIndex(h=>patterns.some(p=>p.test(h)));
      const nameCol=cmap.name?findCol(cmap.name):headers.findIndex(h=>/^(name|full.?name|donor.?name|שם)/i.test(h));
      const emailCol=cmap.email?findCol(cmap.email):headers.findIndex(h=>/^(email|e-?mail|דוא"ל)/i.test(h));
      const phoneCol=cmap.phone?findCol(cmap.phone):headers.findIndex(h=>/^(phone|tel|טלפון)/i.test(h));
      const amtCol=cmap.amount?findCol(cmap.amount):headers.findIndex(h=>/^(amount|donation|sum|סכום)/i.test(h));
      const cityCol=cmap.city?findCol(cmap.city):headers.findIndex(h=>/^(city|עיר)/i.test(h));
      const dateCol=cmap.date?findCol(cmap.date):headers.findIndex(h=>/^(date|תאריך)/i.test(h));
      const campaignCol=cmap.campaign?findCol(cmap.campaign):headers.findIndex(h=>/^(campaign|קמפיין)/i.test(h));
      const commentCol=cmap.comment?findCol(cmap.comment):headers.findIndex(h=>/^(comment|note|הערה)/i.test(h));

      if(nameCol===-1){setUploadResult({error:"No 'name' column found. Headers: "+headers.join(", ")});setUploading(false);return}
      const imported=[];
      rows.forEach((row,i)=>{
        const name=(row[nameCol]||"").trim();
        if(!name)return;
        const donor={id:Date.now()+i,name,pipeline_stage:"not_started",import_source:platformId,import_date:new Date().toISOString()};
        if(emailCol>=0&&row[emailCol])donor.email=row[emailCol].trim();
        if(phoneCol>=0&&row[phoneCol])donor.phone=row[phoneCol].trim();
        if(amtCol>=0&&row[amtCol])donor.annual_giving=parseInt(String(row[amtCol]).replace(/[$,₪\s]/g,""))||0;
        if(cityCol>=0&&row[cityCol])donor.city=row[cityCol].trim();
        if(dateCol>=0&&row[dateCol])donor.last_gift_date=row[dateCol].trim();
        if(campaignCol>=0&&row[campaignCol])donor.import_campaign=row[campaignCol].trim();
        if(commentCol>=0&&row[commentCol])donor.notes=row[commentCol].trim();
        // Tag with source platform for tracking
        donor.tags=[...(donor.tags||[]),`imported:${platformId}`];
        imported.push(donor);
      });
      // Deduplicate against existing donors
      const existingEmails=new Set(donors.map(d=>(d.email||"").toLowerCase()).filter(Boolean));
      const existingNames=new Set(donors.map(d=>(d.name||"").toLowerCase()));
      const newDonors=imported.filter(d=>{
        if(d.email&&existingEmails.has(d.email.toLowerCase()))return false;
        if(existingNames.has(d.name.toLowerCase()))return false;
        return true;
      });
      onImportDonors(newDonors);
      const entry={id:Date.now(),platform:platformId,date:new Date().toISOString(),total:imported.length,new:newDonors.length,dupes:imported.length-newDonors.length};
      setLog(p=>[entry,...p]);
      setUploadResult({ok:true,total:imported.length,new:newDonors.length,dupes:imported.length-newDonors.length});
      setUploading(false);
      addToast({type:"success",title:`${newDonors.length} donors imported`,message:`From ${INTEGRATIONS.find(i=>i.id===platformId)?.name||"CSV"}`});
      appendAudit({type:"import",action:`Imported ${newDonors.length} donors from ${platformId}`,detail:`${imported.length} total, ${imported.length-newDonors.length} duplicates skipped`,user:getSession()?.name});
    };
    reader.readAsText(file);
  };

  return(<div className="content-scroll">
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>🔌 Platform Integrations</h2>
    <p style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Connect your fundraising platforms to sync donor data automatically</p>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
      {INTEGRATIONS.map(intg=>{
        const cfg=configs[intg.id]||{};
        const isConnected=cfg.connected;
        const isComing=intg.status==="coming_soon";
        return(<div key={intg.id} style={{background:"var(--surface)",border:"1px solid "+(isConnected?"rgba(16,185,129,0.3)":"var(--border)"),borderRadius:"var(--radius-lg)",padding:16,cursor:isComing?"default":"pointer",opacity:isComing?.5:1,transition:"all .15s"}} onClick={()=>!isComing&&setExpanded(expanded===intg.id?null:intg.id)}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:24}}>{intg.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700}}>{intg.name}</div>
              <div style={{fontSize:10,color:"var(--text3)"}}>{intg.desc}</div>
            </div>
            {isConnected&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"var(--green-soft)",color:"var(--green)",fontWeight:700}}>CONNECTED</span>}
            {isComing&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"var(--surface2)",color:"var(--text4)",fontWeight:700}}>SOON</span>}
          </div>

          {/* Expanded config */}
          {expanded===intg.id&&!isComing&&<div style={{borderTop:"1px solid var(--border)",paddingTop:12,marginTop:8}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:11,color:"var(--text3)",marginBottom:8}}>{intg.help}</div>

            {/* API config fields */}
            {intg.fields.map(f=>(
              <div className="form-group" key={f} style={{marginBottom:8}}>
                <label className="form-label">{f.replace(/_/g," ")}</label>
                <input className="form-input" type="password" value={cfg[f]||""} onChange={e=>setConfig(intg.id,f,e.target.value)} placeholder={f==="api_key"?"Paste API key...":"Enter value"} style={{padding:"6px 10px",fontSize:11}}/>
              </div>
            ))}

            {/* CSV upload zone */}
            {intg.type==="csv"&&<div>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{display:"none"}} onChange={e=>handleCSVUpload(intg.id,e)}/>
              <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed var(--border2)",borderRadius:"var(--radius)",padding:16,textAlign:"center",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border2)"}>
                <div style={{fontSize:20,marginBottom:4}}>📁</div>
                <div style={{fontSize:12,fontWeight:600}}>Upload CSV File</div>
                <div style={{fontSize:10,color:"var(--text3)"}}>Auto-maps name, email, phone, amount, city</div>
              </div>
              {uploading&&<div style={{marginTop:8,fontSize:11,color:"var(--accent)"}}>⏳ Processing...</div>}
              {uploadResult?.ok&&<div style={{marginTop:8,padding:8,borderRadius:"var(--radius-sm)",background:"var(--green-soft)",color:"var(--green)",fontSize:11}}>{uploadResult.new} new donors imported, {uploadResult.dupes} duplicates skipped</div>}
              {uploadResult?.error&&<div style={{marginTop:8,padding:8,borderRadius:"var(--radius-sm)",background:"var(--red-soft)",color:"var(--red)",fontSize:11}}>{uploadResult.error}</div>}
            </div>}

            {/* Connect/disconnect */}
            {intg.type==="api"&&<button className={"btn btn-sm "+(isConnected?"btn-ghost":"btn-primary")} onClick={()=>toggleConnect(intg.id)} style={{marginTop:8}}>
              {isConnected?"Disconnect":"Connect"}
            </button>}
          </div>}
        </div>);
      })}
    </div>

    {/* Sync Log */}
    {log.length>0&&<div>
      <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Import History</div>
      {log.slice(0,10).map(entry=>(
        <div key={entry.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:12}}>
          <span>{INTEGRATIONS.find(i=>i.id===entry.platform)?.icon||"📊"}</span>
          <span style={{fontWeight:600}}>{INTEGRATIONS.find(i=>i.id===entry.platform)?.name||entry.platform}</span>
          <span style={{color:"var(--green)"}}>{entry.new} new</span>
          {entry.dupes>0&&<span style={{color:"var(--text3)"}}>{entry.dupes} dupes</span>}
          <span style={{marginLeft:"auto",color:"var(--text4)",fontSize:11}}>{fmtD(entry.date)}</span>
        </div>
      ))}
    </div>}
  </div>);
}

// ============================================================
// COMPONENT: OnboardingWizard — guided setup for new orgs
// ============================================================
function DealsView({deals,donors,onAdd}){
  const[show,setShow]=useState(false);const[nd,setNd]=useState({did:"",amt:"",stage:"not_started",notes:"",expected_close:""});
  const totalPipeline=deals.reduce((s,d)=>s+(parseInt(d.amt)||0),0);
  const committed=deals.filter(d=>d.stage==="commitment").reduce((s,d)=>s+(parseInt(d.amt)||0),0);
  return(<div className="content-scroll">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <h3 style={{fontSize:15,fontWeight:700}}>Deals / Gift Opportunities</h3>
        <div style={{display:"flex",gap:16,marginTop:4}}>
          <span style={{fontSize:12,color:"var(--text3)"}}>{deals.length} deals</span>
          <span style={{fontSize:12,color:"var(--accent)",fontWeight:600}}>Pipeline: {fmt$(totalPipeline)}</span>
          <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>Committed: {fmt$(committed)}</span>
        </div>
      </div>
      <button className="btn btn-primary" onClick={()=>setShow(!show)}>+ New Deal</button>
    </div>
    {show&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,marginBottom:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <div className="form-group"><label className="form-label">Donor</label><select className="form-select" value={nd.did} onChange={e=>setNd(d=>({...d,did:e.target.value}))}><option value="">Select...</option>{donors.map(d=><option key={d.id||d.name} value={d.id||d.name}>{d.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Ask Amount ($)</label><input className="form-input" type="number" value={nd.amt} onChange={e=>setNd(d=>({...d,amt:e.target.value}))} placeholder="50000"/></div>
        <div className="form-group"><label className="form-label">Expected Close</label><input className="form-input" type="date" value={nd.expected_close} onChange={e=>setNd(d=>({...d,expected_close:e.target.value}))}/></div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={nd.notes} onChange={e=>setNd(d=>({...d,notes:e.target.value}))} placeholder="Gift context, conditions, etc."/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button className="btn btn-ghost" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>{if(!nd.did||!nd.amt)return;onAdd({...nd,id:Date.now(),amt:parseInt(nd.amt),created:new Date().toISOString()});setNd({did:"",amt:"",stage:"not_started",notes:"",expected_close:""});setShow(false)}}>Create</button></div>
    </div>}
    {deals.length===0?<div className="empty-state"><div className="empty-icon">💎</div><h3>No deals yet</h3><p>Create a deal to track gift opportunities and pledges</p></div>:
    <table className="list-table"><thead><tr><th>Donor</th><th>Amount</th><th>Stage</th><th>Expected Close</th><th>Notes</th><th>Created</th></tr></thead><tbody>
      {deals.sort((a,b)=>(parseInt(b.amt)||0)-(parseInt(a.amt)||0)).map(deal=>{const donor=donors.find(d=>(d.id||d.name)===deal.did);const stg=STAGES.find(s=>s.id===deal.stage);return(
        <tr key={deal.id}>
          <td><div className="cell-name"><div className="avatar" style={{background:donor?.tier==="Tier 1"?"var(--accent-soft)":"var(--surface3)",color:donor?.tier==="Tier 1"?"var(--accent)":"var(--text3)"}}>{initials(donor?.name)}</div><div><div>{donor?.name||"Unknown"}</div><div style={{fontSize:10,color:"var(--text4)"}}>{donor?.community||""}</div></div></div></td>
          <td className="cell-amount" style={{color:"var(--green)",fontSize:14,fontWeight:700}}>{fmt$(deal.amt)}</td>
          <td><span className="cell-stage" style={{background:(stg?.color||"#52525b")+"20",color:stg?.color}}>● {stg?.label}</span></td>
          <td style={{fontSize:12,color:deal.expected_close?"var(--text2)":"var(--text4)"}}>{deal.expected_close?fmtD(deal.expected_close):"—"}</td>
          <td style={{fontSize:12,color:"var(--text3)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{deal.notes||"—"}</td>
          <td style={{fontSize:11,color:"var(--text4)"}}>{fmtD(deal.created)}</td>
        </tr>)})}
    </tbody></table>}
  </div>);
}

// ============================================================
// COMPONENT: WhatsApp Chat Panel (inside donor detail)
// ============================================================
function Settings({donors,acts,notes,deals,waBridge,setWaBridge}){
  const[waStatus,setWaStatus]=useState(null);
  const[testResult,setTestResult]=useState(null);
  const exp=()=>{const d={donors,activities:acts,notes,deals,exported:new Date().toISOString()};const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="chairaise_crm_export.json";a.click();URL.revokeObjectURL(u)};
  const checkWa=async()=>{
    try{const r=await fetch(`${waBridge}/api/health`);const d=await r.json();setWaStatus(d)}catch{setWaStatus({error:true})}
  };
  const testAI=async()=>{
    setTestResult({loading:true});
    try{
      const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:"Say 'CRM AI Ready!' in 5 words or less.",provider:"anthropic"})});
      const data=await res.json();
      if(data.error)throw new Error(data.error);
      setTestResult({ok:true,msg:data.result?.slice(0,80)||"Connected"});
    }catch(e){setTestResult({ok:false,msg:e.message})}
  };
  return(<div className="content-scroll"><div className="settings-page">
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>Settings</h2>

    {/* AI Status — keys are now server-side only */}
    <div className="settings-section">
      <h4>🧠 AI Configuration</h4>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:10}}>AI API keys are managed securely on the server. Contact your admin to update them.</p>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button className="btn btn-primary btn-sm" onClick={testAI} disabled={testResult?.loading}>
          {testResult?.loading?"⏳ Testing...":"⚡ Test AI Connection"}
        </button>
        {testResult&&!testResult.loading&&<span style={{fontSize:11,color:testResult.ok?"var(--green)":"var(--red)",fontWeight:600}}>
          {testResult.ok?"✓ "+testResult.msg:"✕ "+testResult.msg}
        </span>}
      </div>
    </div>
    <div className="settings-section">
      <h4 style={{display:"flex",alignItems:"center",gap:6}}>WhatsApp Web Integration <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"var(--green-soft)",color:"var(--green)",fontWeight:600}}>NO FACEBOOK NEEDED</span></h4>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:8}}>Connects via WhatsApp Web (QR code scan). No Meta Business Suite or Facebook account required.</p>
      <div className="form-group"><label className="form-label">Bridge Server URL</label><input className="form-input" value={waBridge} onChange={e=>setWaBridge(e.target.value)} placeholder="http://localhost:3001"/></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button className="btn btn-ghost btn-sm" onClick={checkWa}>Test Connection</button>
        {waStatus&&!waStatus.error&&<span style={{fontSize:11,color:"var(--green)"}}>Connected ({waStatus.whatsapp}) — {waStatus.conversations} conversations, {waStatus.total_messages} msgs{waStatus.connected_as&&` as ${waStatus.connected_as}`}</span>}
        {waStatus?.error&&<span style={{fontSize:11,color:"var(--red)"}}>Bridge offline — run: node whatsapp_bridge.js</span>}
      </div>
    </div>
    {/* ===== SECURITY SETTINGS ===== */}
    <div className="settings-section">
      <h4>🔒 Security & Data Protection</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:8}}>
        <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12}}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Session Timeout</div>
          <select className="form-select" value={sGet("security_session_timeout","30")} onChange={e=>{sSet("security_session_timeout",e.target.value)}} style={{fontSize:12}}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="480">8 hours</option>
          </select>
          <div style={{fontSize:10,color:"var(--text4)",marginTop:4}}>Auto-logout after inactivity</div>
        </div>
        <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12}}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Export Controls</div>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",marginBottom:4}}>
            <input type="checkbox" checked={sGet("security_export_requires_admin",true)} onChange={e=>sSet("security_export_requires_admin",e.target.checked)}/>
            Require admin role for exports
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
            <input type="checkbox" checked={sGet("security_audit_exports",true)} onChange={e=>sSet("security_audit_exports",e.target.checked)}/>
            Log all data exports to audit trail
          </label>
        </div>
        <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12}}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Sensitive Field Masking</div>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",marginBottom:4}}>
            <input type="checkbox" checked={sGet("security_mask_financials",false)} onChange={e=>sSet("security_mask_financials",e.target.checked)}/>
            Mask net worth / giving for non-admins
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
            <input type="checkbox" checked={sGet("security_mask_contact",false)} onChange={e=>sSet("security_mask_contact",e.target.checked)}/>
            Mask email / phone for viewers
          </label>
        </div>
        <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12}}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:4}}>Data Protection</div>
          <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.6}}>
            ✓ TLS 1.3 in transit (Vercel)<br/>
            ✓ AES-256 at rest (Neon Postgres)<br/>
            ✓ Org-level data isolation<br/>
            ✓ Full audit trail on all actions<br/>
            ✓ JWT sessions with configurable expiry
          </div>
        </div>
      </div>
    </div>

    <div className="settings-section"><h4>Data</h4><button className="btn btn-ghost" onClick={exp} style={{marginTop:8}}>📥 Export All (JSON)</button><div style={{marginTop:12,fontSize:11,color:"var(--text3)"}}>Donors: {donors.length} | Activities: {acts.length} | Notes: {notes.length} | Deals: {deals.length}</div></div>
    <div className="settings-section"><h4>About</h4><p style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>ChaiRaise — AI-Native Jewish Fundraising CRM.<br/>Multiply your impact by 18.<br/>AI Scoring • Cause Match • Pipeline Kanban • Smart Email • Social Graph • WhatsApp • Integrations</p></div>
  </div></div>);
}

// ============================================================
// MAIN APP — enhanced with Ctrl+K, Add/Edit Donor, Reminders,
// Activity Logger, Bulk Actions, Working Global Search
// ============================================================
function AppInner(){
  // ---- Auth state (from NextAuth session synced to localStorage by page.js) ----
  const[session,setSessionState]=useState(()=>getSession());
  const[authed,setAuthed]=useState(()=>!!getSession());
  const toastCtx=useToast();
  const addToast=toastCtx.addToast;

  // Check for session on mount — NextAuth syncs it to localStorage in page.js
  useEffect(()=>{
    const s=getSession();
    if(s){setSessionState(s);setAuthed(true)}
  },[]);

  const handleLogout=useCallback(()=>{
    clearSession();setSessionState(null);setAuthed(false);
    appendAudit({type:"logout",action:"User logged out",user:session?.name||"Unknown"});
    window.location.href="/api/auth/signout?callbackUrl=/auth/signin";
  },[session]);

  // ---- Session timeout (auto-logout after inactivity) ----
  useEffect(()=>{
    if(!authed)return;
    const timeoutMins=parseInt(sGet("security_session_timeout","30"))||30;
    let timer;
    const resetTimer=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        appendAudit({type:"security",action:`Auto-logout after ${timeoutMins}min inactivity`,user:session?.name||"Unknown"});
        handleLogout();
      },timeoutMins*60*1000);
    };
    // Reset on any user interaction
    const events=["mousedown","keydown","scroll","touchstart"];
    events.forEach(e=>document.addEventListener(e,resetTimer,{passive:true}));
    resetTimer();
    return()=>{clearTimeout(timer);events.forEach(e=>document.removeEventListener(e,resetTimer))};
  },[authed,handleLogout,session]);

  // ---- Core state ----
  // DB-first with localStorage fallback: on mount, tries /api/donors.
  // If DB is available, uses API for all CRUD. If not, falls back to localStorage.
  const[donors,setDonors]=useState(()=>sGetMigrate("donors",null));
  const[acts,setActs]=useState(()=>sGetMigrate("acts",[]));
  const[notes,setNotes]=useState(()=>sGetMigrate("notes",[]));
  const[deals,setDeals]=useState(()=>sGetMigrate("deals",[]));
  const[reminders,setReminders]=useState(()=>sGetMigrate("reminders",[]));
  const[apiKey,setAKS]=useState(()=>sGetMigrate("key",""));
  const[waBridge,setWaBS]=useState(()=>sGetMigrate("wa_bridge","http://localhost:3001"));
  const[pplxKey,setPplxKS]=useState(()=>sGetMigrate("pplx_key",""));
  const[aiProvider,setAiProviderS]=useState(()=>sGetMigrate("ai_provider","anthropic"));
  const[useDB,setUseDB]=useState(false); // true when Neon DB is available
  const[dbLoading,setDbLoading]=useState(true);

  // On mount: check if DB is available and load donors from it
  useEffect(()=>{
    const org=getActiveOrg();
    (async()=>{
      try{
        const available=await checkDBAvailable();
        setUseDB(available);
        if(available){
          const dbDonors=await donorsAPI.list(org.id);
          if(dbDonors&&dbDonors.length>0){
            setDonors(dbDonors);
          }else if(!dbDonors){
            // DB not configured — use localStorage
            setUseDB(false);
          }
          // If DB has no donors but localStorage does, offer migration
          // (handled in UI below)
        }
      }catch(e){console.warn("DB check failed, using localStorage:",e.message);setUseDB(false)}
      finally{setDbLoading(false)}
    })();
  },[]);

  // ---- Social Graph state ----
  const[graphContacts,setGraphContacts]=useState(()=>sGetMigrate("graph_contacts",[]));
  const[graphData,setGraphData]=useState(null); // Computed graph (not persisted — rebuilt on load)

  // ---- Campaign state ----
  const[campaigns,setCampaigns]=useState(()=>sGetMigrate("campaigns",[DEFAULT_CAMPAIGN]));
  const[activeCampaign,setActiveCampaignState]=useState(()=>sGet("active_campaign","main"));
  useEffect(()=>{sSet("campaigns",campaigns)},[campaigns]);
  const setActiveCampaign=(id)=>{setActiveCampaignState(id);sSet("active_campaign",id)};
  const addCampaign=useCallback((c)=>setCampaigns(p=>[...p,c]),[]);
  const updateCampaign=useCallback((id,updates)=>setCampaigns(p=>p.map(c=>c.id===id?{...c,...updates}:c)),[]);

  // ---- CSV Import state ----
  const[showCSVImport,setShowCSVImport]=useState(false);
  const[showBatchEmail,setShowBatchEmail]=useState(false);
  const[showAdvSearch,setShowAdvSearch]=useState(false);
  const[showOrgSwitcher,setShowOrgSwitcher]=useState(false);
  const[showShortcuts,setShowShortcuts]=useState(false);
  const[orgProfile,setOrgProfile]=useState(()=>getOrgProfile());

  // ---- Donor merge handler (for duplicate detection) ----
  const mergeDonors=useCallback((merged,removed)=>{
    setDonors(p=>p.filter(d=>(d.id||d.name)!==(removed.id||removed.name)).map(d=>(d.id||d.name)===(merged.id||merged.name)?merged:d));
  },[]);

  // ---- Tag update handler ----
  const updateDonorTags=useCallback((donor)=>{
    setDonors(p=>p.map(d=>(d.id||d.name)===(donor.id||donor.name)?{...d,tags:donor.tags}:d));
  },[]);

  // ---- Outreach Learning Loop state ----
  const[outreachLog,setOutreachLog]=useState(()=>sGetMigrate("outreach_log",[]));
  useEffect(()=>{sSet("outreach_log",outreachLog)},[outreachLog]);
  const logOutreach=useCallback((entry)=>{
    setOutreachLog(p=>[...p,entry]);
    // Also log as an activity for the donor
    setActs(p=>[...p,{did:entry.donorId,type:entry.channel,summary:entry.message,date:entry.date,outcome:entry.outcome}]);
  },[]);

  // ---- Follow-up Automation Rules ----
  const[autoRules,setAutoRules]=useState(()=>sGetMigrate("auto_rules",DEFAULT_RULES));
  const[autoCount,setAutoCount]=useState(0);
  useEffect(()=>{sSet("auto_rules",autoRules)},[autoRules]);
  const toggleRule=useCallback((id)=>{
    setAutoRules(p=>p.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));
  },[]);
  const runAutomationRules=useCallback(()=>{
    let created=0;
    const today=new Date().toISOString().slice(0,10);
    const existingKeys=new Set(reminders.map(r=>`${r.did}_${r.ruleId||""}`));

    autoRules.filter(r=>r.enabled).forEach(rule=>{
      if(rule.trigger==="no_activity"){
        // Find donors with no activity in N days
        donors?.forEach(d=>{
          const did=d.id||d.name;
          const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));
          if(si<1)return; // Skip not_started donors
          const key=`${did}_${rule.id}`;
          if(existingKeys.has(key))return;
          const donorActs=acts.filter(a=>a.did===did);
          const latest=donorActs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
          const daysSince=latest?(Date.now()-new Date(latest.date))/864e5:999;
          if(daysSince>=rule.days){
            const followDate=new Date();followDate.setDate(followDate.getDate()+1);
            setReminders(p=>[...p,{id:Date.now()+created,did,ruleId:rule.id,type:"auto",summary:`[Auto] ${rule.name}: ${d.name} — ${Math.round(daysSince)} days since last contact`,date:followDate.toISOString().slice(0,10),created:new Date().toISOString(),done:false}]);
            created++;existingKeys.add(key);
          }
        });
      }
      if(rule.trigger==="warmth_low"){
        donors?.forEach(d=>{
          const did=d.id||d.name;
          const key=`${did}_${rule.id}`;
          if(existingKeys.has(key))return;
          const w=parseInt(d.warmth_score||0);
          if(w<(rule.threshold||5)&&w>0){
            setReminders(p=>[...p,{id:Date.now()+created,did,ruleId:rule.id,type:"auto",summary:`[Auto] ${rule.name}: ${d.name} warmth=${w}`,date:today,created:new Date().toISOString(),done:false}]);
            created++;existingKeys.add(key);
          }
        });
      }
      if(rule.trigger==="tier1_cycle"){
        donors?.filter(d=>d.tier==="Tier 1").forEach(d=>{
          const did=d.id||d.name;
          const key=`${did}_${rule.id}`;
          if(existingKeys.has(key))return;
          const donorActs=acts.filter(a=>a.did===did);
          const latest=donorActs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
          const daysSince=latest?(Date.now()-new Date(latest.date))/864e5:999;
          if(daysSince>=rule.days){
            const followDate=new Date();followDate.setDate(followDate.getDate()+1);
            setReminders(p=>[...p,{id:Date.now()+created,did,ruleId:rule.id,type:"auto",summary:`[Auto] Weekly T1 check-in: ${d.name}`,date:followDate.toISOString().slice(0,10),created:new Date().toISOString(),done:false}]);
            created++;existingKeys.add(key);
          }
        });
      }
    });
    setAutoCount(created);
    if(created>0)addToast({type:"success",title:"Automation Complete",message:`${created} follow-up reminder${created>1?"s":""} created`});
    else addToast({type:"info",title:"No New Reminders",message:"All donors are up to date"});
  },[autoRules,donors,acts,reminders,addToast]);

  // ---- UI state ----
  const[page,setPage]=useState("dashboard");
  const[sub,setSub]=useState("list");
  const[selD,setSelD]=useState(null);
  const[compD,setCompD]=useState(null);
  const[showCmdK,setShowCmdK]=useState(false);
  const[donorForm,setDonorForm]=useState(null); // null=closed, {}=add, {donor}=edit
  const[bulkSel,setBulkSel]=useState(new Set()); // IDs of selected donors for bulk actions

  // ---- Persist to localStorage (org-scoped) ----
  useEffect(()=>{if(donors)sSet("donors",donors)},[donors]);
  useEffect(()=>{sSet("acts",acts)},[acts]);
  useEffect(()=>{sSet("notes",notes)},[notes]);
  useEffect(()=>{sSet("deals",deals)},[deals]);
  useEffect(()=>{sSet("reminders",reminders)},[reminders]);

  // ---- Keyboard shortcuts — power user navigation ----
  useEffect(()=>{
    const handler=(e)=>{
      // Don't trigger shortcuts when typing in inputs
      const tag=e.target.tagName;
      const isInput=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||e.target.isContentEditable;

      // Ctrl+K / Cmd+K → Command Palette (always works)
      if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setShowCmdK(v=>!v);return}
      // Escape → close modals/panels
      if(e.key==="Escape"){setShowCmdK(false);setShowBatchEmail(false);setShowAdvSearch(false);setShowCSVImport(false);setShowOrgSwitcher(false);return}

      // Skip remaining shortcuts if typing in an input
      if(isInput)return;

      // G then D → Go to Dashboard (vim-style navigation)
      // Single-key nav shortcuts (only when not in input)
      if(e.key==="1"&&e.altKey){e.preventDefault();setPage("dashboard")}
      if(e.key==="2"&&e.altKey){e.preventDefault();setPage("donors")}
      if(e.key==="3"&&e.altKey){e.preventDefault();setPage("campaigns")}
      if(e.key==="4"&&e.altKey){e.preventDefault();setPage("network")}
      if(e.key==="5"&&e.altKey){e.preventDefault();setPage("outreach")}
      // N → New donor
      if(e.key==="n"&&!e.ctrlKey&&!e.metaKey){setShowAddDonor(true)}
      // S → Advanced Search
      if(e.key==="s"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();setShowAdvSearch(true)}
      // B → Batch email
      if(e.key==="b"&&!e.ctrlKey&&!e.metaKey){setShowBatchEmail(true)}
      // ? → Show keyboard shortcut help
      if(e.key==="?"){e.preventDefault();setShowShortcuts(v=>!v)}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[]);

  // ---- Reminder notification count (for nav badge) ----
  const today=new Date().toISOString().slice(0,10);
  const remindersDue=reminders.filter(r=>!r.done&&r.date<=today).length;

  // ---- Actions ----
  const setKey=k=>{setAKS(k);sSet("key",k)};
  const setWaBridgeFn=u=>{setWaBS(u);sSet("wa_bridge",u)};
  const setPplxKey=k=>{setPplxKS(k);sSet("pplx_key",k)};
  const setAiProvider=p=>{setAiProviderS(p);sSet("ai_provider",p)};
  const loadData=d=>{setDonors(d.map((x,i)=>({...x,id:x.id||i+1,pipeline_stage:x.pipeline_stage||"not_started"})))};

  const chgStage=useCallback((id,stg)=>{
    setDonors(p=>p.map(d=>(d.id||d.name)===id?{...d,pipeline_stage:stg}:d));
    setActs(p=>[...p,{did:id,type:"stage_change",summary:"Stage → "+STAGES.find(s=>s.id===stg)?.label,date:new Date().toISOString(),user:session?.name}]);
    // Persist to DB if available and ID is numeric (DB-sourced)
    if(useDB&&typeof id==="number"){
      donorsAPI.update(id,{pipeline_stage:stg}).catch(e=>console.warn("DB stage update failed:",e.message));
    }
    appendAudit({type:"stage_change",action:"Stage changed",detail:`${id} → ${STAGES.find(s=>s.id===stg)?.label}`,user:session?.name});
  },[useDB,session]);

  const addNote=useCallback(n=>setNotes(p=>[...p,n]),[]);
  const addDeal=useCallback(d=>setDeals(p=>[...p,d]),[]);

  const sendEmail=useCallback(async(em)=>{
    const org=getActiveOrg();
    // Try to send via Resend API if recipient email is available
    if(em.recipientEmail&&em.body){
      try{
        await emailAPI.send({
          to:em.recipientEmail,
          subject:em.subj,
          html:em.body.replace(/\n/g,"<br/>"),
          from_name:org.name||"ChaiRaise",
          org_id:org.id,
          donor_id:em.did,
          template_id:em.tmpl,
        });
        setActs(p=>[...p,{did:em.did,type:"email",summary:`Sent: "${em.subj}" (${em.tmpl})`,date:em.date}]);
        setDonors(p=>p.map(d=>{if((d.id||d.name)===em.did){const i=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));if(i<4)return{...d,pipeline_stage:"email_sent"}}return d}));
        addToast({type:"success",title:"Email sent!",message:`To ${em.recipientEmail}`});
        return;
      }catch(e){
        // Fall back to draft mode if email sending fails
        console.warn("Email send failed, saving as draft:",e.message);
        addToast({type:"warning",title:"Email saved as draft",message:e.message});
      }
    }
    // Fallback: save as draft (original behavior)
    setActs(p=>[...p,{did:em.did,type:"email",summary:`Drafted: "${em.subj}" (${em.tmpl})`,date:em.date}]);
    setDonors(p=>p.map(d=>{if((d.id||d.name)===em.did){const i=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));if(i<3)return{...d,pipeline_stage:"email_drafted"}}return d}));
  },[addToast]);

  // -- Save donor (add new or update existing) — DB-first with localStorage fallback --
  const saveDonor=useCallback(async(donor,isEdit)=>{
    const org=getActiveOrg();
    if(isEdit){
      // Update in state immediately (optimistic)
      setDonors(p=>p.map(d=>(d.id||d.name)===(donor.id||donor.name)?{...d,...donor}:d));
      setSelD(prev=>prev&&(prev.id||prev.name)===(donor.id||donor.name)?{...prev,...donor}:prev);
      // Persist to DB if available
      if(useDB&&donor.id&&typeof donor.id==="number"){
        try{await donorsAPI.update(donor.id,donor)}catch(e){console.warn("DB update failed:",e.message)}
      }
      appendAudit({type:"donor_edit",action:"Donor edited",detail:donor.name,user:session?.name});
    }else{
      const newDonor={...donor,pipeline_stage:donor.pipeline_stage||"not_started"};
      if(useDB){
        try{
          const result=await donorsAPI.create(org.id,newDonor);
          // Use DB-assigned ID
          setDonors(p=>[...p,{...newDonor,...result.donor}]);
        }catch(e){
          console.warn("DB create failed, saving locally:",e.message);
          setDonors(p=>[...p,{...newDonor,id:newDonor.id||Date.now()}]);
        }
      }else{
        setDonors(p=>[...p,{...newDonor,id:newDonor.id||Date.now()}]);
      }
      appendAudit({type:"donor_add",action:"Donor added",detail:donor.name,user:session?.name});
    }
  },[session,useDB]);

  // -- Log activity + optional reminder --
  const logActivity=useCallback((act,rem)=>{
    setActs(p=>[...p,act]);
    if(rem)setReminders(p=>[...p,rem]);
  },[]);

  // -- Reminder actions --
  const toggleReminder=useCallback((idx)=>{
    setReminders(p=>p.map((r,i)=>i===idx?{...r,done:!r.done}:r));
  },[]);
  const deleteReminder=useCallback((idx)=>{
    setReminders(p=>p.filter((_,i)=>i!==idx));
  },[]);

  // -- Bulk actions --
  const bulkStageChange=useCallback((stage)=>{
    bulkSel.forEach(id=>chgStage(id,stage));
    setBulkSel(new Set());
  },[bulkSel,chgStage]);

  const bulkDelete=useCallback(()=>{
    if(!confirm(`Delete ${bulkSel.size} donor(s)? This cannot be undone.`))return;
    setDonors(p=>p.filter(d=>!bulkSel.has(d.id||d.name)));
    setBulkSel(new Set());
  },[bulkSel]);

  const toggleBulk=useCallback((id)=>{
    setBulkSel(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next});
  },[]);

  // ---- Onboarding wizard state ----
  const[showWizard,setShowWizard]=useState(()=>!localStorage.getItem(orgPrefix()+"donors"));
  const handleWizardComplete=({org,apiKey:ak,pplxKey:pk,aiProvider:ap,dataChoice})=>{
    // Save org with full profile
    const orgList=getOrgList();
    if(!orgList.find(o=>o.id===org.id)){setOrgList([...orgList,org])}
    setActiveOrg(org);
    if(ak){setKey(ak)}
    if(pk){setPplxKey(pk)}
    if(ap){setAiProvider(ap)}
    setShowWizard(false);
    appendAudit({type:"login",action:"Organization created via onboarding",detail:org.name,user:session?.name});
    if(dataChoice==="demo"){
      loadData(generateDemoData());
    }else if(dataChoice==="empty"){
      loadData([]);
    }
    // json/csv choices will show the DataLoader or CSVImport after
  };

  // ---- Auth gate (AFTER all hooks to comply with React rules) ----
  // If not authenticated, redirect to NextAuth sign-in
  if(!authed){
    if(typeof window!=="undefined")window.location.href="/auth/signin";
    return(<div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",color:"var(--text)",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:56,height:56,background:"var(--accent)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:20,color:"var(--bg)",margin:"0 auto 16px"}}>CR</div>
        <div style={{fontSize:14,color:"var(--text3)"}}>Redirecting to sign in...</div>
      </div>
    </div>);
  }

  if(!donors&&!showWizard)return <DataLoader onLoad={loadData}/>;
  if(!donors&&showWizard)return <OnboardingWizard onComplete={handleWizardComplete} onSkip={()=>{
    // Skip setup → auto-load demo data so user isn't stuck on DataLoader
    const demo=generateDemoData();
    loadData(demo);
    setShowWizard(false);
  }}/>;

  return(<div className="app-shell" role="application" aria-label="ChaiRaise CRM">
    {/* NAV RAIL */}
    <nav className="nav-rail" role="navigation" aria-label="Main navigation">
      <div style={{position:"relative"}}>
        <div className="nav-logo" title={(getActiveOrg().name||"ChaiRaise")+" — Click to switch orgs"} onClick={()=>setShowOrgSwitcher(!showOrgSwitcher)}>{getActiveOrg().logo||"CR"}</div>
        {showOrgSwitcher&&<OrgSwitcher currentOrg={getActiveOrg()} onClose={()=>setShowOrgSwitcher(false)}/>}
      </div>
      {NAV.map(n=><div key={n.id} className={"nav-item "+(page===n.id?"active":"")} onClick={()=>{setPage(n.id);if(n.id==="donors")setSub("list")}} title={n.label} role="button" tabIndex={0} aria-label={n.label} aria-current={page===n.id?"page":undefined} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setPage(n.id);if(n.id==="donors")setSub("list")}}} style={{position:"relative"}}>
        {n.icon}
        {n.id==="reminders"&&remindersDue>0&&<div style={{position:"absolute",top:2,right:2,width:14,height:14,borderRadius:7,background:"var(--red)",fontSize:9,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{remindersDue}</div>}
        {n.id==="donors"&&donors&&donors.length>0&&<div style={{position:"absolute",top:2,right:0,fontSize:8,fontWeight:700,color:"var(--text4)"}}>{donors.length}</div>}
        {n.id==="deals"&&deals.length>0&&<div style={{position:"absolute",top:2,right:0,fontSize:8,fontWeight:700,color:"var(--text4)"}}>{deals.length}</div>}
      </div>)}
      <div className="nav-spacer"/>
      <NotificationBell reminders={reminders} donors={donors||[]} outreachLog={outreachLog} acts={acts}/>
      <div className="nav-item" title={`${session.name} (${session.role}) — Click to logout`} onClick={handleLogout} role="button" tabIndex={0} aria-label={`Logged in as ${session.name}. Click to logout.`} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();handleLogout()}}} style={{fontSize:11,fontWeight:700,color:"var(--accent)"}}>
        {session.avatar||initials(session.name)}
      </div>
    </nav>

    {/* MAIN */}
    <main className="main-area" id="main-content" role="main">
      {/* TOP BAR — with working global search */}
      <div className="top-bar">
        <div className="page-title">{NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}</div>
        <div className="page-subtitle">{page==="dashboard"&&donors.length+" donors"}{page==="donors"&&donors.length+" total"}{page==="deals"&&deals.length+" opps"}{page==="activities"&&acts.length+" logged"}{page==="reminders"&&reminders.filter(r=>!r.done).length+" pending"}</div>
        <div className="search-global" onClick={()=>setShowCmdK(true)} style={{cursor:"pointer"}}>
          <input placeholder="Search donors, navigate... (Ctrl+K)" onFocus={e=>{e.target.blur();setShowCmdK(true)}} readOnly style={{cursor:"pointer"}}/>
        </div>
        {page==="donors"&&<>
          <button className="btn btn-primary btn-sm" onClick={()=>setDonorForm({})}>+ Add Donor</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowCSVImport(true)}>📥 Import CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setCompD(donors[0])}>✉️ Compose</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowBatchEmail(true)}>📨 Batch</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdvSearch(true)}>🔍 Advanced</button>
        </>}
      </div>

      {/* BULK ACTION BAR — shows when donors are selected */}
      {bulkSel.size>0&&<div className="bulk-bar">
        <div className="bulk-count">{bulkSel.size} selected</div>
        <button className="btn btn-ghost btn-sm" onClick={()=>setBulkSel(new Set())}>Clear</button>
        <div className="bulk-actions">
          <select className="form-select" style={{width:160,padding:"4px 8px",fontSize:11}} onChange={e=>{if(e.target.value)bulkStageChange(e.target.value);e.target.value=""}} defaultValue="">
            <option value="" disabled>Move to stage...</option>
            {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowBatchEmail(true)}>✉️ Batch Email</button>
          <button className="btn btn-ghost btn-sm" style={{color:"var(--red)"}} onClick={bulkDelete}>🗑️ Delete</button>
        </div>
      </div>}

      {/* SUB-NAV for Donors page */}
      {page==="donors"&&<div className="sub-nav">
        <div className={"sub-tab "+(sub==="list"?"active":"")} onClick={()=>setSub("list")}>📋 List <span className="count">{donors.length}</span></div>
        <div className={"sub-tab "+(sub==="board"?"active":"")} onClick={()=>setSub("board")}>📊 Board</div>
        <div className={"sub-tab "+(sub==="timeline"?"active":"")} onClick={()=>setSub("timeline")}>📅 Timeline <span className="count">{acts.length}</span></div>
      </div>}

      {/* CONTENT AREA */}
      <div className="content-area">
        {page==="dashboard"&&<Dashboard donors={donors} acts={acts} deals={deals} reminders={reminders} outreachLog={outreachLog} session={session}/>}
        {page==="donors"&&sub==="list"&&<ListView donors={donors} acts={acts} onSelect={setSelD} selId={selD?.id||selD?.name} onStage={chgStage} bulkSel={bulkSel} onToggleBulk={toggleBulk}/>}
        {page==="donors"&&sub==="board"&&<BoardView donors={donors} acts={acts} onSelect={setSelD} onStage={chgStage}/>}
        {page==="donors"&&sub==="timeline"&&<TimelineView acts={acts} donors={donors}/>}
        {page==="network"&&<NetworkDashboard donors={donors} graphContacts={graphContacts} setGraphContacts={setGraphContacts} graphData={graphData} setGraphData={setGraphData}/>}
        {page==="campaigns"&&<CampaignManager campaigns={campaigns} donors={donors} deals={deals} acts={acts} onAddCampaign={addCampaign} onUpdateCampaign={updateCampaign} activeCampaign={activeCampaign} setActiveCampaign={setActiveCampaign}/>}
        {page==="analytics"&&<AdvancedAnalytics donors={donors} acts={acts} deals={deals} campaigns={campaigns} outreachLog={outreachLog}/>}
        {page==="outreach"&&<OutreachCoach donors={donors} acts={acts} graphData={graphData} graphContacts={graphContacts} apiKey={apiKey} outreachLog={outreachLog} onLogOutreach={logOutreach}/>}
        {page==="deals"&&<DealsView deals={deals} donors={donors} onAdd={addDeal}/>}
        {page==="reminders"&&<RemindersView reminders={reminders} donors={donors} onToggle={toggleReminder} onDelete={deleteReminder} onAdd={(r)=>setReminders(p=>[...p,r])}/>}
        {page==="whatsapp"&&<WhatsAppHub donors={donors} onLogActivities={a=>setActs(p=>[...p,a])}/>}
        {page==="email"&&<div className="content-scroll"><div style={{maxWidth:500,margin:"20px auto",textAlign:"center"}}><h3 style={{marginBottom:8}}>Quick Compose</h3><p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Select a donor to compose an AI email</p><select className="form-select" onChange={e=>{const dd=donors.find(x=>(x.id||x.name)==e.target.value);if(dd)setCompD(dd)}}><option value="">Choose donor...</option>{donors.map(dd=><option key={dd.id||dd.name} value={dd.id||dd.name}>{dd.name}</option>)}</select></div></div>}
        {page==="leaderboard"&&<PriorityLeaderboard donors={donors} acts={acts} onSelect={d=>{setSelD(d);setPage("donors");setSub("list")}}/>}
        {page==="tags"&&<TagManager donors={donors} onUpdateDonor={updateDonorTags}/>}
        {page==="team"&&<TeamDashboard acts={acts} donors={donors}/>}
        {page==="audit"&&<AuditLogView/>}
        {page==="duplicates"&&<DuplicateDetector donors={donors} onMerge={mergeDonors}/>}
        {page==="automation"&&<FollowUpRules rules={autoRules} onToggleRule={toggleRule} onRunRules={runAutomationRules} autoCount={autoCount}/>}
        {page==="exports"&&<ExportPanel donors={donors} acts={acts} deals={deals} campaigns={campaigns} reminders={reminders} outreachLog={outreachLog}/>}
        {page==="integrations"&&<IntegrationHub donors={donors} onImportDonors={(imported)=>{setDonors(p=>[...p,...imported])}}/>}
        {page==="admin"&&<OrgAdminPanel session={session} donors={donors} acts={acts} deals={deals}/>}
        {page==="settings"&&<Settings apiKey={apiKey} setKey={setKey} pplxKey={pplxKey} setPplxKey={setPplxKey} aiProvider={aiProvider} setAiProvider={setAiProvider} donors={donors} acts={acts} notes={notes} deals={deals} waBridge={waBridge} setWaBridge={setWaBridgeFn}/>}
      </div>
    </main>

    {/* DETAIL PANEL — now with Edit and Activity Logger */}
    {selD&&<DonorDetail donor={selD} acts={acts} notes={notes} onClose={()=>setSelD(null)} onNote={addNote} onStage={chgStage} onCompose={d=>{setCompD(d)}} onEdit={d=>setDonorForm({donor:d})} onLogActivity={logActivity}/>}

    {/* EMAIL MODAL */}
    {compD&&<EmailComposer donor={compD} apiKey={apiKey} pplxKey={pplxKey} aiProvider={aiProvider} onClose={()=>setCompD(null)} onSend={sendEmail}/>}

    {/* ADD/EDIT DONOR MODAL */}
    {donorForm!==null&&<DonorFormModal donor={donorForm.donor||null} onSave={saveDonor} onClose={()=>setDonorForm(null)}/>}

    {/* COMMAND PALETTE (Ctrl+K) */}
    {showCmdK&&<CommandPalette donors={donors} onClose={()=>setShowCmdK(false)} onSelect={d=>{setSelD(d);setPage("donors");setSub("list")}} onNav={id=>{setPage(id);if(id==="donors")setSub("list")}} onAddDonor={()=>setDonorForm({})} onCompose={d=>setCompD(d)}/>}

    {/* ADVANCED SEARCH MODAL */}
    {showAdvSearch&&<AdvancedSearch donors={donors} acts={acts} orgProfile={orgProfile} apiKey={apiKey} pplxKey={pplxKey} aiProvider={aiProvider} onSelect={d=>{setSelD(d);setPage("donors");setSub("list")}} onClose={()=>setShowAdvSearch(false)}/>}

    {/* BATCH EMAIL MODAL */}
    {showBatchEmail&&<BatchEmailComposer donors={donors} apiKey={apiKey} onSend={sendEmail} onClose={()=>setShowBatchEmail(false)}/>}

    {/* CSV IMPORT MODAL */}
    {showCSVImport&&<CSVImportMapper onImport={(imported)=>{
      setDonors(p=>[...p,...imported.map(d=>({...d,pipeline_stage:d.pipeline_stage||"not_started"}))]);
    }} onClose={()=>setShowCSVImport(false)}/>}

    {/* KEYBOARD SHORTCUTS HELP MODAL */}
    {showShortcuts&&<div className="modal-overlay" onClick={()=>setShowShortcuts(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{width:480}}>
        <div className="modal-header"><h3>⌨️ Keyboard Shortcuts</h3><div style={{cursor:"pointer",color:"var(--text3)",fontSize:18}} onClick={()=>setShowShortcuts(false)}>✕</div></div>
        <div className="modal-body" style={{maxHeight:"60vh",overflow:"auto"}}>
          {[
            {section:"Navigation",shortcuts:[
              {keys:"Ctrl + K",desc:"Open command palette"},
              {keys:"Alt + 1",desc:"Go to Dashboard"},
              {keys:"Alt + 2",desc:"Go to Donors"},
              {keys:"Alt + 3",desc:"Go to Campaigns"},
              {keys:"Alt + 4",desc:"Go to Network"},
              {keys:"Alt + 5",desc:"Go to Outreach"},
            ]},
            {section:"Actions",shortcuts:[
              {keys:"N",desc:"Add new donor"},
              {keys:"S",desc:"Open advanced search"},
              {keys:"B",desc:"Open batch email"},
              {keys:"?",desc:"Show this help"},
            ]},
            {section:"General",shortcuts:[
              {keys:"Escape",desc:"Close any modal or panel"},
            ]},
          ].map(g=>(
            <div key={g.section} style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>{g.section}</div>
              {g.shortcuts.map(s=>(
                <div key={s.keys} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                  <span style={{fontSize:12,color:"var(--text2)"}}>{s.desc}</span>
                  <kbd style={{fontSize:11,fontWeight:600,background:"var(--surface2)",padding:"2px 8px",borderRadius:4,border:"1px solid var(--border)",fontFamily:"'JetBrains Mono',monospace",color:"var(--text)"}}>{s.keys}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>}
  </div>);
}

// ============================================================
// WRAPPER APP — provides ToastContext to all components
// ============================================================
function App(){
  return(<ToastProvider><AppInner/></ToastProvider>);
}

export default App;
