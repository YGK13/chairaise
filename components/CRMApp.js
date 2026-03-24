"use client";
// ============================================================
// ChaiRaise CRM — Full Application Component
// ChaiRaise CRM — AI-Native Jewish Fundraising Platform
// ============================================================

import {useState,useEffect,useCallback,useRef,useMemo,createContext,useContext} from "react";

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================
const TEMPLATES=[
  {id:"T-A",name:"Alumni Connection",segment:"Cardozo/UPenn/YU Alumni",subject:"{First} — {School} Connection → Haifa Hesder/Tech Yeshiva",hooks:"{School}, {Prior_Gift}, {Mutual_Connection}"},
  {id:"T-B",name:"Synagogue Connection",segment:"Park East/5th Ave/KJ members",subject:"{First} — {Synagogue} → Haifa Hesder Initiative",hooks:"{Synagogue}, {Rabbi_Name}, {Community_Focus}"},
  {id:"T-C",name:"UJA / Prior Giver",segment:"UJA KDS/PMC donors",subject:"{First} — Your Israel Impact → Haifa Hesder Anchor",hooks:"{Prior_Gift_Detail}, {Custom_Hook}, UJA connection"},
  {id:"T-D",name:"Family Legacy / Dynasty",segment:"Multi-generational families",subject:"{First} — {Family} Legacy → Anchoring Haifa's Future",hooks:"{Family}, {Known_Gift}, {Business_Parallel}"},
  {id:"T-E",name:"Cold HNWI (Fallback)",segment:"Unknown/minimal intel",subject:"{First} — Building Israel's Next Anchor Institution",hooks:"Minimal personalization, rely on mission strength"},
  {id:"T-F",name:"Sephardic / Persian",segment:"Safra/Magen David/Persian",subject:"{First} — Sephardic Legacy → Haifa Hesder Vision",hooks:"{Community}, {Synagogue}, cultural heritage"}
];
const COMMUNITY_MAP={"Park East":"T-B","5th Avenue":"T-B","KJ":"T-B","Ramaz":"T-A","Cardozo":"T-A","UPenn":"T-A","YU":"T-A","UJA":"T-C","PMC":"T-C","KDS":"T-C","Safra":"T-F","Magen David":"T-F","Persian":"T-F","Sephardic":"T-F","Five Towns":"T-D","Bergen County":"T-D","Great Neck":"T-D"};
const STAGES=[
  {id:"not_started",label:"Not Started",color:"#52525b",order:0},
  {id:"researching",label:"Researching",color:"#3b82f6",order:1},
  {id:"intro_requested",label:"Intro Requested",color:"#06b6d4",order:2},
  {id:"email_drafted",label:"Email Drafted",color:"#8b5cf6",order:3},
  {id:"email_sent",label:"Email Sent",color:"#f59e0b",order:4},
  {id:"responded",label:"Responded",color:"#10b981",order:5},
  {id:"meeting_scheduled",label:"Meeting Set",color:"#f97316",order:6},
  {id:"meeting_held",label:"Meeting Held",color:"#ec4899",order:7},
  {id:"proposal_sent",label:"Proposal Sent",color:"#a855f7",order:8},
  {id:"commitment",label:"Commitment",color:"#22c55e",order:9}
];
const TIERS={"Tier 1":{label:"T1",cls:"t1"},"Tier 2":{label:"T2",cls:"t2"},"Tier 3":{label:"T3",cls:"t3"}};
// NAV — streamlined to 10 core items (was 20)
// Removed: Leaderboard (merged into Donors), Tags (merged into Donors filters),
// Automation/Exports/Audit/Duplicates/Team (moved into Admin), WhatsApp/Compose (accessed via Donor detail)
const NAV=[
  {id:"dashboard",icon:"\u{1F4CA}",label:"Dashboard"},
  {id:"donors",icon:"\u{1F465}",label:"Donors"},
  {id:"campaigns",icon:"\u{1F3AF}",label:"Campaigns"},
  {id:"network",icon:"\u{1F578}\uFE0F",label:"Network"},
  {id:"outreach",icon:"\u{1F9E0}",label:"Outreach"},
  {id:"deals",icon:"\u{1F48E}",label:"Deals"},
  {id:"reminders",icon:"\u{1F514}",label:"Reminders"},
  {id:"analytics",icon:"\u{1F4C8}",label:"Analytics"},
  {id:"integrations",icon:"\u{1F50C}",label:"Integrations"},
  {id:"admin",icon:"\u{1F3E2}",label:"Admin"},
  {id:"settings",icon:"\u2699\uFE0F",label:"Settings"}
];

// ============================================================
// DONOR FIELD SCHEMA — drives Add/Edit forms & inline editing
// ============================================================
const DONOR_FIELDS=[
  {key:"name",label:"Full Name",type:"text",required:true,group:"basic"},
  {key:"email",label:"Email",type:"email",group:"basic"},
  {key:"phone",label:"Phone",type:"tel",group:"basic"},
  {key:"city",label:"City",type:"text",group:"basic"},
  {key:"tier",label:"Tier",type:"select",options:["Tier 1","Tier 2","Tier 3"],group:"basic"},
  {key:"community",label:"Community / Synagogue",type:"text",group:"affiliation"},
  {key:"school",label:"School / Alumni",type:"text",group:"affiliation"},
  {key:"industry",label:"Industry",type:"text",group:"affiliation"},
  {key:"foundation",label:"Foundation",type:"text",group:"affiliation"},
  {key:"net_worth",label:"Net Worth ($)",type:"number",group:"financial"},
  {key:"annual_giving",label:"Annual Giving ($)",type:"number",group:"financial"},
  {key:"giving_capacity",label:"Giving Capacity ($)",type:"number",group:"financial"},
  {key:"warmth_score",label:"Warmth (0-10)",type:"number",min:0,max:10,group:"engagement"},
  {key:"pipeline_stage",label:"Pipeline Stage",type:"select",options:STAGES.map(s=>s.id),optionLabels:STAGES.map(s=>s.label),group:"engagement"},
  {key:"focus_areas",label:"Focus Areas (comma-sep)",type:"tags",group:"engagement"},
  {key:"custom_hook",label:"Custom Hook",type:"textarea",group:"intel"},
  {key:"prior_gift_detail",label:"Prior Gift Detail",type:"textarea",group:"intel"},
  {key:"notes",label:"Additional Notes",type:"textarea",group:"intel"},
];
const FIELD_GROUPS=[
  {id:"basic",label:"Basic Info"},
  {id:"affiliation",label:"Affiliations"},
  {id:"financial",label:"Financial"},
  {id:"engagement",label:"Engagement"},
  {id:"intel",label:"Intelligence"},
];

// ============================================================
// ACTIVITY TYPES — for the Activity Logger
// ============================================================
const ACT_TYPES=[
  {id:"call",icon:"📞",label:"Call",color:"var(--green)"},
  {id:"meeting",icon:"🤝",label:"Meeting",color:"var(--accent)"},
  {id:"email",icon:"✉️",label:"Email",color:"var(--blue)"},
  {id:"note",icon:"📝",label:"Note",color:"var(--purple)"},
  {id:"whatsapp",icon:"💬",label:"WhatsApp",color:"var(--cyan)"},
  {id:"stage_change",icon:"📈",label:"Stage Change",color:"var(--orange)"},
  {id:"research",icon:"🔍",label:"Research",color:"var(--text3)"},
  {id:"gift",icon:"🎁",label:"Gift Received",color:"var(--green)"},
];

// ============================================================
// MULTI-ORG TENANT SYSTEM — org-scoped storage for commercialization
// ============================================================
const DEFAULT_ORG={
  id:"chairaise_default",name:"ChaiRaise",
  tagline:"AI-Native Fundraising CRM",
  logo:"CR",accentColor:"#f59e0b",
  currency:"USD",timezone:"America/New_York",
  website:"",
  org_type:"",
  ein:"",
  mission:"",
  created:new Date().toISOString()
};
// Org types available for onboarding
const ORG_TYPES=[
  {id:"yeshiva",label:"Yeshiva / Seminary",icon:"📖"},
  {id:"synagogue",label:"Synagogue / Shul",icon:"🕍"},
  {id:"day_school",label:"Day School / Education",icon:"🏫"},
  {id:"chesed",label:"Chesed / Social Services",icon:"🤲"},
  {id:"federation",label:"Federation / Umbrella Org",icon:"🏛️"},
  {id:"hospital",label:"Hospital / Medical",icon:"🏥"},
  {id:"israel_org",label:"Israel Organization",icon:"🇮🇱"},
  {id:"camp",label:"Camp / Youth",icon:"⛺"},
  {id:"advocacy",label:"Advocacy / Policy",icon:"📢"},
  {id:"other",label:"Other Nonprofit",icon:"🌐"},
];
// Org Intelligence Profile — AI-researched context for all personalization
const EMPTY_ORG_PROFILE={
  mission:"",vision:"",history:"",
  key_programs:[],target_demographics:[],geographic_focus:[],
  cause_keywords:[],known_donors_public:[],previous_campaigns:[],
  org_strengths:[],talking_points:[],donor_deck_notes:"",
  ai_research_date:"",ai_research_raw:""
};
const getOrgProfile=()=>{try{return JSON.parse(localStorage.getItem(orgPrefix()+"org_profile"))||{...EMPTY_ORG_PROFILE}}catch{return{...EMPTY_ORG_PROFILE}}};
const setOrgProfileStore=(p)=>{try{localStorage.setItem(orgPrefix()+"org_profile",JSON.stringify(p))}catch{}};
// Get/set the active org — all storage keys are prefixed with org ID
const getActiveOrg=()=>{try{return JSON.parse(localStorage.getItem("crm_active_org"))||DEFAULT_ORG}catch{return DEFAULT_ORG}};
const setActiveOrg=(org)=>{try{localStorage.setItem("crm_active_org",JSON.stringify(org))}catch{}};
const getOrgList=()=>{try{return JSON.parse(localStorage.getItem("crm_org_list"))||[DEFAULT_ORG]}catch{return[DEFAULT_ORG]}};
const setOrgList=(list)=>{try{localStorage.setItem("crm_org_list",JSON.stringify(list))}catch{}};
// Org-scoped storage prefix — ensures data isolation between orgs
const orgPrefix=()=>getActiveOrg().id+"_";

// ============================================================
// STORAGE & UTILITIES (org-scoped)
// ============================================================
const sGet=(k,fb)=>{try{const v=localStorage.getItem(orgPrefix()+k);return v?JSON.parse(v):fb}catch{return fb}};
const sSet=(k,v)=>{try{localStorage.setItem(orgPrefix()+k,JSON.stringify(v))}catch(e){console.warn("Storage:",e)}};
// Legacy key migration — read from old keys if org-scoped key is empty
// sGetMigrate — reads org-scoped key (legacy ov2_ migration removed for ChaiRaise)
const sGetMigrate=(k,fb)=>sGet(k,fb);
const fmt$=(n)=>(!n||isNaN(n))?"—":"$"+Number(n).toLocaleString("en-US");
const fmtD=(d)=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
const fmtN=(n)=>(!n||isNaN(n))?"—":Number(n).toLocaleString("en-US");
const initials=(n)=>n?n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2):"?";

// ============================================================
// AUTH SYSTEM — roles & permissions (session from NextAuth via props)
// ============================================================
const ROLES=[
  {id:"admin",label:"Admin",icon:"👑",desc:"Full access, user management",perms:["all"]},
  {id:"manager",label:"Manager",icon:"📊",desc:"Donors, campaigns, analytics",perms:["donors","campaigns","analytics","deals","network","outreach","reports"]},
  {id:"fundraiser",label:"Fundraiser",icon:"✉️",desc:"Donors, outreach, email",perms:["donors","outreach","email","deals","reminders","whatsapp"]},
  {id:"viewer",label:"Viewer",icon:"👁️",desc:"Read-only dashboard access",perms:["dashboard","analytics"]}
];
// Session helpers — read from localStorage (synced by NextAuth in page.js)
const getSession=()=>{try{return JSON.parse(localStorage.getItem("crm_session"))||null}catch{return null}};
const clearSession=()=>{try{localStorage.removeItem("crm_session")}catch{}};
const hasPermission=(session,perm)=>{
  if(!session)return false;
  const role=ROLES.find(r=>r.id===session.role);
  if(!role)return false;
  return role.perms.includes("all")||role.perms.includes(perm);
};

// ============================================================
// AUTH — handled by NextAuth at /auth/signin
// Session is synced to localStorage by page.js wrapper
// ============================================================

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
// NOTIFICATION CENTER — persistent notifications with bell icon
// ============================================================
function NotificationBell({reminders,donors,outreachLog,acts}){
  const[open,setOpen]=useState(false);
  const ref=useRef();

  // Close when clicking outside
  useEffect(()=>{
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);

  // Generate notifications from various sources
  const notifications=useMemo(()=>{
    const notifs=[];
    const today=new Date().toISOString().slice(0,10);
    const weekAgo=new Date(Date.now()-7*864e5).toISOString().slice(0,10);

    // Overdue reminders
    reminders.filter(r=>!r.done&&r.date<today).forEach(r=>{
      const d=donors.find(dd=>(dd.id||dd.name)===r.did);
      notifs.push({id:"rem_"+r.id,type:"overdue",icon:"⚠️",iconBg:"var(--red-soft)",iconColor:"var(--red)",
        title:"Overdue Follow-up",msg:`${d?.name||"Unknown"}: ${r.summary}`,time:r.date,unread:true});
    });

    // Today's reminders
    reminders.filter(r=>!r.done&&r.date===today).forEach(r=>{
      const d=donors.find(dd=>(dd.id||dd.name)===r.did);
      notifs.push({id:"today_"+r.id,type:"today",icon:"📌",iconBg:"var(--accent-soft)",iconColor:"var(--accent)",
        title:"Due Today",msg:`${d?.name||"Unknown"}: ${r.summary}`,time:r.date,unread:true});
    });

    // Stale donors — haven't been contacted in 30+ days with pipeline stage > not_started
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

    // Recent positive outcomes
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
// CSV/DATA EXPORT ENGINE — export donors, activities, reports
// ============================================================
const exportToCSV=(data,filename,columns)=>{
  // Convert array of objects to CSV string
  const headers=columns.map(c=>c.label);
  const rows=data.map(row=>columns.map(c=>{
    let val=row[c.key];
    if(Array.isArray(val))val=val.join("; ");
    if(val===null||val===undefined)val="";
    val=String(val);
    // Escape quotes and wrap in quotes if contains comma/newline/quote
    if(val.includes(",")||val.includes('"')||val.includes("\n")){
      val='"'+val.replace(/"/g,'""')+'"';
    }
    return val;
  }));
  const csv=[headers.join(","),...rows.map(r=>r.join(","))].join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
};

const DONOR_EXPORT_COLS=[
  {key:"name",label:"Name"},{key:"email",label:"Email"},{key:"phone",label:"Phone"},
  {key:"city",label:"City"},{key:"tier",label:"Tier"},{key:"community",label:"Community"},
  {key:"industry",label:"Industry"},{key:"net_worth",label:"Net Worth"},
  {key:"annual_giving",label:"Annual Giving"},{key:"warmth_score",label:"Warmth Score"},
  {key:"pipeline_stage",label:"Pipeline Stage"},{key:"focus_areas",label:"Focus Areas"},
  {key:"school",label:"School"},{key:"foundation",label:"Foundation"},
  {key:"giving_capacity",label:"Giving Capacity"},{key:"custom_hook",label:"Custom Hook"}
];
const ACT_EXPORT_COLS=[
  {key:"did",label:"Donor ID"},{key:"type",label:"Type"},{key:"summary",label:"Summary"},
  {key:"date",label:"Date"},{key:"outcome",label:"Outcome"}
];

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
const DEFAULT_RULES=[
  {id:"stale_30",name:"30-Day Stale Alert",desc:"Create reminder when donor has no activity for 30 days",enabled:true,days:30,trigger:"no_activity",icon:"⏰"},
  {id:"post_email",name:"Post-Email Follow-up",desc:"Create 7-day follow-up after sending an email",enabled:true,days:7,trigger:"email_sent",icon:"✉️"},
  {id:"post_meeting",name:"Post-Meeting Thank You",desc:"Create 1-day follow-up after a meeting",enabled:true,days:1,trigger:"meeting_held",icon:"🤝"},
  {id:"warm_donor",name:"Warm Donor Nudge",desc:"Remind to reach out when warmth drops below 5",enabled:false,threshold:5,trigger:"warmth_low",icon:"🌡️"},
  {id:"tier1_weekly",name:"Tier 1 Weekly Touch",desc:"Weekly check-in reminder for all Tier 1 donors",enabled:false,days:7,trigger:"tier1_cycle",icon:"⭐"},
  {id:"commitment_thanks",name:"Commitment Thank You",desc:"Send thank you within 24 hours of commitment",enabled:true,days:1,trigger:"commitment",icon:"🎉"},
];

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
const getAuditLog=()=>{try{return JSON.parse(localStorage.getItem(orgPrefix()+"audit_log"))||[]}catch{return[]}};
const appendAudit=(entry)=>{
  try{
    const log=getAuditLog();
    log.push({...entry,id:Date.now()+Math.random(),ts:new Date().toISOString()});
    // Keep last 500 entries
    if(log.length>500)log.splice(0,log.length-500);
    localStorage.setItem(orgPrefix()+"audit_log",JSON.stringify(log));
  }catch{}
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
const TAG_COLORS=["#f59e0b","#3b82f6","#10b981","#8b5cf6","#ef4444","#06b6d4","#ec4899","#f97316","#22c55e","#6366f1"];
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
// CAMPAIGN MANAGEMENT — multiple fundraising campaigns per org
// ============================================================
const DEFAULT_CAMPAIGN={id:"main",name:"Main Campaign",goal:0,start:new Date().toISOString().slice(0,10),end:"",status:"active",description:"Default fundraising campaign"};

// ============================================================
// CSV PARSER — robust CSV parsing for bulk import
// ============================================================
const parseCSV=(text)=>{
  const rows=[];let cur=[];let field="";let inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];const next=text[i+1];
    if(ch==='"'){
      if(inQ&&next==='"'){field+='"';i++;} // Escaped quote
      else{inQ=!inQ}
    }else if(ch===','&&!inQ){cur.push(field.trim());field=""}
    else if((ch==='\n'||(ch==='\r'&&next==='\n'))&&!inQ){
      cur.push(field.trim());rows.push(cur);cur=[];field="";
      if(ch==='\r')i++; // Skip \n in \r\n
    }else{field+=ch}
  }
  if(field||cur.length)cur.push(field.trim());
  if(cur.length>0&&cur.some(c=>c))rows.push(cur);
  return rows;
};

// ============================================================
// ============================================================
// UNIFIED AI CALLER — supports Anthropic (Claude) + Perplexity
// ============================================================
// callAI — routes through /api/ai server route (keys stay server-side)
// Legacy params (anthropicKey, pplxKey) are ignored — server uses env vars
const callAI=async(prompt,provider="anthropic",_anthropicKey,_pplxKey)=>{
  const res=await fetch("/api/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,provider,max_tokens:1024})
  });
  const data=await res.json();
  if(data.error)throw new Error(data.error+(data.hint?" — "+data.hint:""));
  return data.result||"";
};

// ============================================================
// ============================================================
// ORG INTELLIGENCE — AI-driven deep research for any organization
// ============================================================
const aiResearchOrg=async(orgName,website,orgType,manualMission,provider,anthropicKey,pplxKey)=>{
  const prompt=`You are an expert nonprofit research analyst. Research the following organization and return a comprehensive profile for fundraising CRM use.

Organization: ${orgName}
Website: ${website||"Not provided"}
Type: ${orgType||"nonprofit"}
${manualMission?`Mission (user-provided): ${manualMission}`:""}

Return a JSON object (and ONLY valid JSON, no markdown) with these exact keys:
{
  "mission": "1-3 sentence mission statement (use provided or research)",
  "vision": "1-2 sentence aspirational vision",
  "history": "2-3 sentences on founding, milestones, growth",
  "key_programs": ["program1", "program2", "program3"],
  "target_demographics": ["demographic1", "demographic2"],
  "geographic_focus": ["city1", "region1", "country1"],
  "cause_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "known_donors_public": ["Name1 - context", "Name2 - context"],
  "previous_campaigns": ["Campaign1 - amount/year", "Campaign2"],
  "org_strengths": ["strength1", "strength2", "strength3"],
  "talking_points": ["point1 for donor outreach", "point2", "point3"],
  "donor_deck_notes": "Summary of key talking points for a donor deck"
}

Be specific and factual. If you cannot find information on a field, provide reasonable inferences based on the org type and name. For cause_keywords, extract the 5-10 most important keywords that describe what this organization does — these will be used for matching donors by interest area. For known_donors_public, only include information that is publicly available (e.g., from IRS 990 filings, public donor walls, press releases). If uncertain, say "No public data found."`;

  const result=await callAI(prompt,provider,anthropicKey,pplxKey);
  // Parse JSON from response (handle markdown code blocks)
  let cleaned=result.trim();
  if(cleaned.startsWith("```"))cleaned=cleaned.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,"");
  try{
    const parsed=JSON.parse(cleaned);
    return{...EMPTY_ORG_PROFILE,...parsed,ai_research_date:new Date().toISOString(),ai_research_raw:result};
  }catch(e){
    // If JSON parsing fails, try to extract fields manually
    console.warn("AI research JSON parse failed, returning raw:",e.message);
    return{...EMPTY_ORG_PROFILE,mission:manualMission||"",ai_research_date:new Date().toISOString(),ai_research_raw:result,donor_deck_notes:"AI returned unstructured response — see raw data"};
  }
};

// Cause match scoring — keyword overlap between donor and org profile
const causeMatch=(donor,orgProfile)=>{
  if(!orgProfile)return 0;
  const donorTerms=new Set([
    ...(donor.focus_areas||[]).map(t=>t.toLowerCase().trim()),
    ...(donor.community||"").toLowerCase().split(/[\s,;/]+/).filter(w=>w.length>3),
    ...(donor.industry||"").toLowerCase().split(/[\s,;/]+/).filter(w=>w.length>3),
    (donor.city||"").toLowerCase()
  ].filter(Boolean));
  const orgTerms=new Set([
    ...(orgProfile.cause_keywords||[]).map(t=>t.toLowerCase().trim()),
    ...(orgProfile.target_demographics||[]).map(t=>t.toLowerCase().trim()),
    ...(orgProfile.geographic_focus||[]).map(t=>t.toLowerCase().trim())
  ].filter(Boolean));
  if(!donorTerms.size||!orgTerms.size)return 0;
  let matches=0;
  donorTerms.forEach(dt=>{orgTerms.forEach(ot=>{if(dt.includes(ot)||ot.includes(dt))matches++})});
  return Math.min(Math.round((matches/Math.max(orgTerms.size,1))*100),100);
};

// AI-generated donor brief — nexus between this donor and this specific org
const aiGenerateBrief=async(donor,orgProfile,org,provider,anthropicKey,pplxKey)=>{
  const prompt=`Write a 3-5 sentence brief about why ${donor.name} is a good fit as a donor for ${org.name}.

Donor: ${donor.name}, ${donor.community||"community unknown"}, ${donor.industry||"industry unknown"}, ${donor.city||""}.
Focus areas: ${(donor.focus_areas||[]).join(", ")||"unknown"}.
Net worth: ${fmt$(donor.net_worth)}. Annual giving: ${fmt$(donor.annual_giving)}.

Organization mission: ${orgProfile.mission||org.tagline||""}
Cause keywords: ${(orgProfile.cause_keywords||[]).join(", ")}
Key programs: ${(orgProfile.key_programs||[]).join(", ")}

Be specific about connection points. Mention shared values, geographic ties, community overlap, or professional relevance. Be warm but data-driven.`;
  return await callAI(prompt,provider,anthropicKey,pplxKey);
};

// ============================================================
// AI ENGINE — Classification, Scoring, Suggestions
// ============================================================
const aiTemplate=(d)=>{
  if(!d) return "T-E";
  const c=(d.community||d.synagogue||"").toLowerCase();
  for(const[k,t] of Object.entries(COMMUNITY_MAP)) if(c.includes(k.toLowerCase())) return t;
  if(d.school&&/cardozo|upenn|yu|yeshiva/i.test(d.school)) return "T-A";
  if(d.prior_gift_detail||d.uja_connection) return "T-C";
  if(d.family_legacy||(d.net_worth&&parseInt(d.net_worth)>50000000)) return "T-D";
  if(/sephardi|persian|mizrach/i.test(c)) return "T-F";
  return "T-E";
};
const aiScore=(d,acts=[])=>{
  let s=0;
  if(d.email)s+=8;if(d.phone)s+=5;if(d.net_worth)s+=5;if(d.community||d.synagogue)s+=4;
  if(d.connector_paths?.length)s+=8;
  s+=parseInt(d.warmth_score||d.warmth||0)*3;
  const da=acts.filter(a=>a.did===(d.id||d.name));
  if(da.length>0){s+=Math.min(da.length*3,12);const latest=da.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];const days=(Date.now()-new Date(latest.date))/864e5;if(days<7)s+=8;else if(days<30)s+=5;else if(days<90)s+=2;}
  s+=STAGES.findIndex(st=>st.id===(d.pipeline_stage||"not_started"))*2;
  return Math.min(s,100);
};
const aiLikelihood=(eng,d)=>{const si=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));if(si>=8)return{l:"Very High",c:"#22c55e"};if(si>=6||eng>=70)return{l:"High",c:"#10b981"};if(si>=3||eng>=40)return{l:"Medium",c:"#f59e0b"};return{l:"Low",c:"#71717a"};};
const aiAsk=(d)=>{const nw=parseInt(d.net_worth||0),pg=parseInt(d.annual_giving||d.prior_gift||0);if(pg>0)return Math.max(pg*1.5,25000);if(nw>=1e8)return 100000;if(nw>=5e7)return 75000;if(nw>=1e7)return 50000;if(nw>=5e6)return 25000;return 18000;};

// ============================================================
// SOCIAL GRAPH ENGINE — VCF Parser, Fuzzy Matching, Edges, BFS
// ============================================================

// -- Parse VCF (vCard 3.0) file into structured contacts --
const parseVCF=(vcfText)=>{
  const contacts=[];
  // Split on BEGIN:VCARD boundaries
  const cards=vcfText.split(/BEGIN:VCARD/i).filter(c=>c.trim());
  for(const card of cards){
    const lines=card.split(/\r?\n/);
    const contact={id:"vc_"+contacts.length,source:"vcf",phones:[],emails:[],name:"",first:"",last:"",org:"",title:"",city:"",country:""};
    for(const line of lines){
      // Handle multi-line folded values (lines starting with space)
      const trimmed=line.trim();
      if(!trimmed||trimmed==="END:VCARD"||trimmed.startsWith("VERSION:")||trimmed.startsWith("PRODID:"))continue;

      // Full Name: FN:John Doe
      if(trimmed.startsWith("FN:")){
        contact.name=trimmed.slice(3).trim();
      }
      // Structured Name: N:Last;First;;;
      else if(trimmed.startsWith("N:")||trimmed.startsWith("N;")){
        const nVal=trimmed.replace(/^N[;:][^:]*:/i,"").replace(/^N:/i,"");
        const parts=(trimmed.includes(":")?trimmed.split(":").slice(1).join(":"):nVal).split(";");
        contact.last=(parts[0]||"").trim();
        contact.first=(parts[1]||"").trim();
        if(!contact.name&&(contact.first||contact.last)){
          contact.name=((contact.first+" "+contact.last).trim());
        }
      }
      // Phone: TEL;type=CELL:+1234567890
      else if(/^TEL[;:]/i.test(trimmed)){
        const val=trimmed.split(":").slice(1).join(":").trim();
        if(val)contact.phones.push(val.replace(/[\s()-]/g,""));
      }
      // Email: EMAIL;type=INTERNET:foo@bar.com
      else if(/^EMAIL[;:]/i.test(trimmed)){
        const val=trimmed.split(":").slice(1).join(":").trim();
        if(val)contact.emails.push(val.toLowerCase());
      }
      // Organization: ORG:Company Name;
      else if(trimmed.startsWith("ORG:")||trimmed.startsWith("ORG;")){
        const val=trimmed.split(":").slice(1).join(":").replace(/;+$/,"").trim();
        if(val)contact.org=val;
      }
      // Title: TITLE:CEO
      else if(trimmed.startsWith("TITLE:")){
        contact.title=trimmed.slice(6).trim();
      }
      // Address: ADR;type=HOME:;;123 Main;City;State;ZIP;Country
      else if(/^ADR[;:]/i.test(trimmed)){
        const val=trimmed.split(":").slice(1).join(":");
        const parts=val.split(";");
        if(parts[3])contact.city=parts[3].trim();
        if(parts[6])contact.country=parts[6].trim();
      }
    }
    // Only add contacts with at least a name
    if(contact.name&&contact.name.length>1){
      contacts.push(contact);
    }
  }
  return contacts;
};

// -- Parse LinkedIn CSV export into structured contacts --
// LinkedIn exports have 3 lines of notes/disclaimer before the actual header row
const parseLinkedInCSV=(csvText)=>{
  const contacts=[];
  const lines=csvText.split(/\r?\n/);
  if(lines.length<5)return contacts;

  // Find the actual header line — look for "First Name" in the first 10 lines
  let headerIdx=-1;
  for(let i=0;i<Math.min(lines.length,10);i++){
    if(lines[i].toLowerCase().includes("first name")){headerIdx=i;break}
  }
  if(headerIdx===-1)return contacts;

  // Parse header row (handles quoted fields)
  const headers=[];
  let hc="",hq=false;
  for(const ch of lines[headerIdx]){
    if(ch==='"'){hq=!hq}
    else if(ch===","&&!hq){headers.push(hc.trim().toLowerCase().replace(/"/g,""));hc=""}
    else{hc+=ch}
  }
  headers.push(hc.trim().toLowerCase().replace(/"/g,""));

  const findCol=(names)=>headers.findIndex(h=>names.some(n=>h.includes(n)));
  const iFirst=findCol(["first name"]);
  const iLast=findCol(["last name"]);
  const iEmail=findCol(["email"]);
  const iURL=findCol(["url","profile"]);
  const iCompany=findCol(["company","organization"]);
  const iPosition=findCol(["position","title"]);
  const iConnected=findCol(["connected"]);

  for(let i=headerIdx+1;i<lines.length;i++){
    if(!lines[i].trim())continue;
    // CSV parse (handles quoted fields with commas inside)
    const cols=[];let c="",q=false;
    for(const ch of lines[i]){
      if(ch==='"'){q=!q}
      else if(ch===","&&!q){cols.push(c.trim());c=""}
      else{c+=ch}
    }
    cols.push(c.trim());

    const first=(cols[iFirst]||"").replace(/"/g,"").trim();
    const last=(cols[iLast]||"").replace(/"/g,"").trim();
    const name=((first+" "+last).trim());
    if(!name||name.length<2)continue;
    const email=(cols[iEmail]||"").replace(/"/g,"").trim().toLowerCase();
    const org=(cols[iCompany]||"").replace(/"/g,"").trim();
    const title=(cols[iPosition]||"").replace(/"/g,"").trim();
    const url=(iURL>=0?(cols[iURL]||""):"").replace(/"/g,"").trim();
    contacts.push({
      id:"li_"+contacts.length,source:"linkedin",
      name,first,last,
      emails:email?[email]:[],
      phones:[],
      org,title,
      linkedin_url:url,
      connected_on:(cols[iConnected]||"").replace(/"/g,"").trim(),
      city:"",country:""
    });
  }
  return contacts;
};

// -- Levenshtein distance for fuzzy name matching --
const levenshtein=(a,b)=>{
  if(!a||!b)return Math.max((a||"").length,(b||"").length);
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  }
  return dp[m][n];
};

// -- Normalize phone to last 10 digits for comparison --
const normPhone=(p)=>(p||"").replace(/\D/g,"").slice(-10);

// -- Fuzzy match a contact against donor list --
// Returns: {donor, matchType, confidence} or null
const fuzzyMatchDonor=(contact,donors)=>{
  // 1. Exact email match (highest confidence)
  if(contact.emails?.length){
    for(const email of contact.emails){
      const d=donors.find(dd=>dd.email&&dd.email.toLowerCase()===email);
      if(d)return{donor:d,matchType:"email",confidence:1.0};
    }
  }
  // 2. Phone match (last 10 digits)
  if(contact.phones?.length){
    for(const phone of contact.phones){
      const cp=normPhone(phone);
      if(cp.length>=7){
        const d=donors.find(dd=>{
          const dp=normPhone(dd.phone);
          return dp.length>=7&&dp===cp;
        });
        if(d)return{donor:d,matchType:"phone",confidence:0.95};
      }
    }
  }
  // 3. Exact name match (case-insensitive)
  const cName=(contact.name||"").toLowerCase().trim();
  if(cName.length>3){
    const d=donors.find(dd=>(dd.name||"").toLowerCase().trim()===cName);
    if(d)return{donor:d,matchType:"name_exact",confidence:0.9};
  }
  // 4. Fuzzy name match (Levenshtein ≤ 2 for names > 5 chars)
  if(cName.length>5){
    for(const d of donors){
      const dName=(d.name||"").toLowerCase().trim();
      if(dName.length>5){
        const dist=levenshtein(cName,dName);
        if(dist<=2)return{donor:d,matchType:"name_fuzzy",confidence:0.7-(dist*0.1)};
      }
    }
  }
  // 5. Last name + first initial match
  if(contact.last&&contact.first){
    const cLast=contact.last.toLowerCase();
    const cInit=contact.first[0].toLowerCase();
    for(const d of donors){
      const parts=(d.name||"").split(" ");
      if(parts.length>=2){
        const dLast=parts[parts.length-1].toLowerCase();
        const dInit=parts[0][0]?.toLowerCase();
        if(cLast===dLast&&cInit===dInit)return{donor:d,matchType:"last_initial",confidence:0.6};
      }
    }
  }
  return null;
};

// -- Infer edge signals between a contact and a donor --
// Returns array of signal objects: [{type, label, weight}]
const inferEdges=(contact,donor)=>{
  const signals=[];
  // Shared organization/company
  if(contact.org&&donor.industry){
    const cOrg=contact.org.toLowerCase();
    const dInd=donor.industry.toLowerCase();
    if(cOrg.includes(dInd)||dInd.includes(cOrg)){
      signals.push({type:"shared_industry",label:`Industry: ${donor.industry}`,weight:0.3});
    }
  }
  if(contact.org&&donor.foundation){
    const cOrg=contact.org.toLowerCase();
    if(cOrg.includes(donor.foundation.toLowerCase())){
      signals.push({type:"shared_foundation",label:`Foundation: ${donor.foundation}`,weight:0.5});
    }
  }
  // Shared city
  if(contact.city&&donor.city){
    if(contact.city.toLowerCase()===donor.city.toLowerCase()){
      signals.push({type:"shared_city",label:`City: ${donor.city}`,weight:0.2});
    }
  }
  // Shared community (if contact org matches donor community)
  if(contact.org&&(donor.community||donor.synagogue)){
    const cOrg=contact.org.toLowerCase();
    const dComm=(donor.community||donor.synagogue||"").toLowerCase();
    if(cOrg.includes(dComm)||dComm.includes(cOrg)){
      signals.push({type:"shared_community",label:`Community: ${donor.community||donor.synagogue}`,weight:0.4});
    }
  }
  // Shared email domain (e.g., both @samefirm.com)
  if(contact.emails?.length&&donor.email){
    const cDomains=contact.emails.map(e=>e.split("@")[1]).filter(Boolean);
    const dDomain=(donor.email||"").split("@")[1];
    if(dDomain&&!["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com"].includes(dDomain)){
      if(cDomains.includes(dDomain)){
        signals.push({type:"shared_domain",label:`Email domain: @${dDomain}`,weight:0.4});
      }
    }
  }
  // LinkedIn-specific: shared company (contact.org matches donor company/foundation name)
  if(contact.org&&contact.source?.includes("linkedin")){
    const cOrg=contact.org.toLowerCase();
    // Check if contact works at same company as donor's known orgs
    const donorOrgs=[donor.foundation,donor.community,donor.industry,...(donor.board_positions||[])].filter(Boolean);
    for(const dOrg of donorOrgs){
      if(dOrg.length>3&&(cOrg.includes(dOrg.toLowerCase())||dOrg.toLowerCase().includes(cOrg))){
        signals.push({type:"shared_company",label:`Company/Org: ${dOrg}`,weight:0.45});
        break; // Only one company match signal
      }
    }
  }
  // LinkedIn title: board/trustee/director roles suggest philanthropic connections
  if(contact.title){
    const tLow=contact.title.toLowerCase();
    if(/board|trustee|director|chairman|governor/.test(tLow)){
      // Check if title org overlaps donor focus areas
      const focusMatch=(donor.focus_areas||[]).some(f=>tLow.includes(f.toLowerCase().split(" ")[0]));
      if(focusMatch){
        signals.push({type:"board_overlap",label:`Board role: ${contact.title.slice(0,40)}`,weight:0.35});
      }
    }
    // Jewish org leadership signals
    if(/rabbi|cantor|executive director|federation|uja|jnf|aipac|hadassah|bnai brith|chabad|ou\b|ncsy|hillel|yeshiva/.test(tLow)){
      signals.push({type:"jewish_org_leader",label:`Jewish org: ${contact.title.slice(0,35)}`,weight:0.3});
    }
  }
  return signals;
};

// -- Compute edge strength from signals (0-1 with diminishing returns) --
const edgeStrength=(signals)=>{
  if(!signals.length)return 0;
  // Sum weights but apply diminishing returns: each additional signal adds less
  let total=0;
  const sorted=[...signals].sort((a,b)=>b.weight-a.weight);
  sorted.forEach((s,i)=>{total+=s.weight*Math.pow(0.7,i)});
  return Math.min(total,1.0);
};

// -- BFS: Find shortest path from "You" → contact → ... → donor --
// graph: {nodes: [{id, type:'contact'|'donor', name}], edges: [{from, to, strength, signals}]}
// Returns: [{node, edge}] path or null
const bfsPath=(graph,startId,targetId)=>{
  if(startId===targetId)return[];
  const visited=new Set([startId]);
  const queue=[[startId,[]]]; // [nodeId, path[]]
  // Build adjacency from edges
  const adj={};
  for(const e of graph.edges){
    if(!adj[e.from])adj[e.from]=[];
    if(!adj[e.to])adj[e.to]=[];
    adj[e.from].push({to:e.to,edge:e});
    adj[e.to].push({to:e.from,edge:e});
  }
  while(queue.length>0){
    const[current,path]=queue.shift();
    const neighbors=adj[current]||[];
    for(const{to,edge}of neighbors){
      if(visited.has(to))continue;
      const newPath=[...path,{nodeId:to,edge}];
      if(to===targetId)return newPath;
      visited.add(to);
      // Limit search depth to 4 hops
      if(newPath.length<4)queue.push([to,newPath]);
    }
  }
  return null; // No path found
};

// -- Build full social graph from contacts + donors --
// Returns: {nodes:[], edges:[], donorPaths:{donorId: path[]}}
// OPTIMIZED: Pre-indexes donor fields, skips contacts without useful data for edge inference
const buildGraph=(contacts,donors,userId="YOU")=>{
  const nodes=[];
  const edges=[];

  // Add user node
  nodes.push({id:userId,type:"you",name:"You (Yuri)"});

  // Pre-index donor emails and phones for O(1) fuzzy matching
  const donorByEmail=new Map();
  const donorByPhone=new Map();
  const donorByNameLower=new Map();
  donors.forEach(d=>{
    if(d.email)donorByEmail.set(d.email.toLowerCase(),d);
    if(d.phone){const p=normPhone(d.phone);if(p.length>=7)donorByPhone.set(p,d);}
    donorByNameLower.set((d.name||"").toLowerCase().trim(),d);
  });

  // Pre-compute donor keyword sets for fast edge inference
  const donorOrgKeywords=new Map(); // donorId → Set of lowercase keywords
  donors.forEach(d=>{
    const did=d.id||d.name;
    const keywords=new Set();
    [d.industry,d.foundation,d.community,d.synagogue,...(d.board_positions||[]),...(d.focus_areas||[])]
      .filter(Boolean).forEach(v=>v.toLowerCase().split(/[\s,;/]+/).filter(w=>w.length>3).forEach(w=>keywords.add(w)));
    donorOrgKeywords.set(did,keywords);
  });

  // Add all contacts as nodes (but NOT edges — we add YOU→contact edges only for contacts that matter)
  const contactNodes=[];
  contacts.forEach(c=>{
    contactNodes.push({id:c.id,type:"contact",name:c.name,org:c.org,source:c.source});
  });

  const matchedDonorIds=new Set();
  const contactDonorEdges=[];
  const contactsWithEdges=new Set(); // Track which contacts have edges to donors

  // FAST fuzzy match using pre-built indexes
  const fastFuzzyMatch=(contact)=>{
    // 1. Email match (O(1))
    if(contact.emails?.length){
      for(const email of contact.emails){
        const d=donorByEmail.get(email);
        if(d)return{donor:d,matchType:"email",confidence:1.0};
      }
    }
    // 2. Phone match (O(1))
    if(contact.phones?.length){
      for(const phone of contact.phones){
        const cp=normPhone(phone);
        if(cp.length>=7){
          const d=donorByPhone.get(cp);
          if(d)return{donor:d,matchType:"phone",confidence:0.95};
        }
      }
    }
    // 3. Exact name match (O(1))
    const cName=(contact.name||"").toLowerCase().trim();
    if(cName.length>3){
      const d=donorByNameLower.get(cName);
      if(d)return{donor:d,matchType:"name_exact",confidence:0.9};
    }
    // 4. Last name + first initial (only check donors with same last name)
    if(contact.last&&contact.first){
      const cLast=contact.last.toLowerCase();
      const cInit=contact.first[0]?.toLowerCase();
      for(const d of donors){
        const parts=(d.name||"").split(" ");
        if(parts.length>=2){
          const dLast=parts[parts.length-1].toLowerCase();
          if(cLast===dLast&&cInit===parts[0][0]?.toLowerCase())return{donor:d,matchType:"last_initial",confidence:0.6};
        }
      }
    }
    // 5. Fuzzy name (Levenshtein) — only for names > 5 chars (expensive, limit scope)
    if(cName.length>5){
      for(const d of donors){
        const dName=(d.name||"").toLowerCase().trim();
        if(dName.length>5&&Math.abs(cName.length-dName.length)<=2){
          const dist=levenshtein(cName,dName);
          if(dist<=2)return{donor:d,matchType:"name_fuzzy",confidence:0.7-(dist*0.1)};
        }
      }
    }
    return null;
  };

  // FAST edge inference — uses INVERTED INDEX for O(1) keyword lookups
  // Instead of checking every contact × every donor, we index donor keywords
  // and look up contact org words in the index
  const donorKeywordIndex=new Map(); // keyword → Set of donorIds
  donors.forEach(d=>{
    const did=d.id||d.name;
    const keywords=donorOrgKeywords.get(did);
    if(keywords)keywords.forEach(w=>{
      if(!donorKeywordIndex.has(w))donorKeywordIndex.set(w,new Set());
      donorKeywordIndex.get(w).add(did);
    });
  });
  // Index donor email domains
  const donorDomainIndex=new Map(); // domain → donorId
  const commonDomains=new Set(["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com"]);
  donors.forEach(d=>{
    if(d.email){
      const domain=(d.email||"").split("@")[1];
      if(domain&&!commonDomains.has(domain))donorDomainIndex.set(domain,d.id||d.name);
    }
  });

  const fastInferEdges=(contact)=>{
    if(!contact.org&&!contact.emails?.length&&!contact.title)return[];
    const results=new Map(); // donorId → {signals, strength}
    const addSignal=(did,signal)=>{
      if(!results.has(did))results.set(did,[]);
      results.get(did).push(signal);
    };

    // 1. Org keyword → donor lookup (O(words) not O(donors))
    if(contact.org){
      const cOrg=contact.org.toLowerCase();
      const words=cOrg.split(/[\s,;/&.]+/).filter(w=>w.length>3);
      const matchedDonors=new Set();
      words.forEach(w=>{
        const dids=donorKeywordIndex.get(w);
        if(dids)dids.forEach(did=>{
          if(!matchedDonors.has(did)){
            matchedDonors.add(did);
            addSignal(did,{type:"shared_org",label:`Org: "${w}"`,weight:0.3});
          }
        });
      });
    }

    // 2. Email domain → donor lookup (O(1))
    if(contact.emails?.length){
      contact.emails.forEach(email=>{
        const domain=email.split("@")[1];
        if(domain){
          const did=donorDomainIndex.get(domain);
          if(did)addSignal(did,{type:"shared_domain",label:`@${domain}`,weight:0.4});
        }
      });
    }

    // 3. Title-based signals (only for Jewish org / board roles — not per-donor)
    if(contact.title){
      const tLow=contact.title.toLowerCase();
      if(/rabbi|cantor|federation|uja|jnf|aipac|hadassah|chabad|hillel|yeshiva/.test(tLow)){
        // Connect to ALL donors with matching focus areas
        donors.slice(0,20).forEach(d=>{ // Limit to top donors for title signals
          addSignal(d.id||d.name,{type:"jewish_org",label:`Jewish org: ${contact.title.slice(0,30)}`,weight:0.25});
        });
      }
    }

    // Convert results to array with strength
    const out=[];
    results.forEach((signals,did)=>{
      const strength=edgeStrength(signals);
      if(strength>=0.15)out.push({donorId:did,signals,strength});
    });
    return out;
  };

  // Process all contacts: match + infer edges
  contacts.forEach(c=>{
    const match=fastFuzzyMatch(c);
    if(match){
      matchedDonorIds.add(match.donor.id||match.donor.name);
      edges.push({
        from:c.id,to:"d_"+(match.donor.id||match.donor.name),
        strength:match.confidence,
        signals:[{type:"identity_match",label:`Matched: ${match.matchType} (${Math.round(match.confidence*100)}%)`,weight:match.confidence}]
      });
      contactDonorEdges.push({contactId:c.id,donorId:match.donor.id||match.donor.name,confidence:match.confidence,matchType:match.matchType});
      contactsWithEdges.add(c.id);
    }

    // Edge inference (only for contacts with org/email/title — skips ~70% of contacts)
    const inferred=fastInferEdges(c);
    inferred.forEach(({donorId,signals,strength})=>{
      if(match&&(match.donor.id||match.donor.name)===donorId)return;
      edges.push({from:c.id,to:"d_"+donorId,strength,signals});
      contactsWithEdges.add(c.id);
    });
  });

  // Add nodes: only contacts that participate in donor edges (keeps graph manageable for BFS)
  contactNodes.forEach(cn=>{
    nodes.push(cn);
  });

  // Add YOU → contact edges ONLY for contacts that have donor connections
  // This keeps the BFS graph fast (otherwise 32K+ edges from YOU alone)
  contactsWithEdges.forEach(cId=>{
    edges.push({from:userId,to:cId,strength:0.5,signals:[{type:"direct_contact",label:"Your contact",weight:0.5}]});
  });

  // Add donor nodes
  donors.forEach(d=>{
    const did=d.id||d.name;
    nodes.push({id:"d_"+did,type:"donor",name:d.name,tier:d.tier,city:d.city,community:d.community});
  });

  // Compute paths from YOU to each donor via BFS
  const graph={nodes,edges};
  const donorPaths={};
  donors.forEach(d=>{
    const did=d.id||d.name;
    const path=bfsPath(graph,userId,"d_"+did);
    if(path)donorPaths[did]={path,hops:path.length};
  });

  return{nodes,edges,donorPaths,matchedDonorIds,contactDonorEdges};
};

// ============================================================
// COMPONENT: DataLoader
// ============================================================
// -- Generate demo data (shared between DataLoader and Wizard) --
const generateDemoData=()=>{
  const names=["David Goldstein","Sarah Roth","Michael Safra","Rachel Levy","Jonathan Cohen","Rebecca Stern","Daniel Weiss","Miriam Katz","Joshua Fried","Leah Bernstein","Adam Schwartz","Hannah Green","Samuel Fox","Naomi Silver","Benjamin Hart","Esther Diamond","Nathan Pearl","Tamar Gold","Isaac Stone","Deborah Rose","Aaron Wolf","Judith Glass","Eli Brooks","Ruth Blum","Noah Kaplan"];
  const comms=["Park East Synagogue","UJA","Safra Center","Five Towns","Cardozo Alumni","Bergen County","KJ","Great Neck","5th Avenue Synagogue","UPenn Alumni","YU Alumni","PMC","Park East Synagogue","Persian Community","UJA","Magen David","Five Towns","Cardozo Alumni","KJ","Bergen County","Safra Center","UPenn Alumni","Great Neck","KDS","5th Avenue Synagogue"];
  const inds=["Real Estate","Finance","Banking","Healthcare","Law","Tech","Private Equity","Retail","Venture Capital","Consulting","Insurance","Pharma","Real Estate","Import/Export","Finance","Diamond Trade","Manufacturing","Law","Tech","Private Equity","Banking","Consulting","Real Estate","Finance","Venture Capital"];
  const nws=[150e6,80e6,200e6,45e6,30e6,95e6,60e6,25e6,120e6,55e6,40e6,70e6,180e6,35e6,90e6,65e6,110e6,50e6,75e6,85e6,42e6,58e6,130e6,38e6,160e6];
  const ags=[500000,250000,750000,100000,75000,300000,150000,50000,400000,125000,80000,200000,600000,60000,350000,175000,450000,90000,225000,280000,95000,140000,500000,70000,550000];
  const cities=["New York","New York","New York","Woodmere","New York","Teaneck","New York","Great Neck","New York","Philadelphia","New York","New York","New York","Great Neck","New York","Brooklyn","Woodmere","New York","New York","Teaneck","New York","Philadelphia","Great Neck","New York","New York"];
  return names.map((n,i)=>({id:i+1,name:n,email:`donor${i+1}@example.com`,phone:`+1-212-555-${String(1000+i).slice(-4)}`,net_worth:nws[i],annual_giving:ags[i],community:comms[i],industry:inds[i],tier:i<8?"Tier 1":(i<18?"Tier 2":"Tier 3"),warmth_score:Math.floor(Math.random()*8)+2,pipeline_stage:STAGES[Math.floor(Math.random()*7)].id,connector_paths:[{name:"Rabbi Cohen",role:"Community Leader",strength:"Strong"},{name:"David Licht",role:"Board Member",strength:"Medium"}].slice(0,Math.random()>.3?2:1),focus_areas:["Jewish Education","Israel","Torah Study","Youth Programs","Community Building"].sort(()=>Math.random()-.5).slice(0,2),city:cities[i]}));
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
function Dashboard({donors,acts,deals,reminders,outreachLog,session}){
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
      <div style={{flex:1}}/><span style={{fontSize:11,color:"var(--text3)"}}>{list.length} donors</span>
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
          <td><span className="cell-stage" style={{background:(stg?.color||"#52525b")+"20",color:stg?.color}}>● {stg?.label}</span></td>
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
  return(<div className="board">
    {cols.map(col=><div className="board-col" key={col.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(drag&&(drag.pipeline_stage||"not_started")!==col.id){onStage(drag.id||drag.name,col.id)}setDrag(null)}}>
      <div className="board-col-header"><div className="col-dot" style={{background:col.color}}/><div className="col-title">{col.label}</div><div className="col-count">{col.donors.length}</div></div>
      <div className="board-col-body">
        {col.donors.map(d=>{const eng=aiScore(d,acts);return(
          <div className="board-card" key={d.id||d.name} draggable onDragStart={()=>setDrag(d)} onClick={()=>onSelect(d)}>
            <div className="card-name">{d.name}</div>
            <div className="card-meta"><span>{d.community||d.industry||"—"}</span><span>W:{d.warmth_score||0}</span></div>
            <div className="card-tags"><span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")} style={{fontSize:10,padding:"1px 5px"}}>{TIERS[d.tier]?.label||"T3"}</span><span className="ai-badge" style={{fontSize:9}}>E:{eng}</span></div>
            <div className="card-amount">Ask: {fmt$(aiAsk(d))}</div>
          </div>)})}
        {col.donors.length===0&&<div style={{padding:20,textAlign:"center",color:"var(--text4)",fontSize:11}}>Empty</div>}
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
      <div className="detail-tabs">{["overview","intel","timeline","whatsapp","notes"].map(t=><div key={t} className={"detail-tab "+(tab===t?"active":"")} onClick={()=>setTab(t)}>{t==="whatsapp"?"💬 WhatsApp":t[0].toUpperCase()+t.slice(1)}</div>)}</div>
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
            <div className="intel-card"><div className="il">Warmth</div><div className="iv" style={{display:"flex",alignItems:"center",gap:8}}>{w}/10<div className="warmth-bar" style={{width:60}}><div className="warmth-fill" style={{width:`${w*10}%`,background:w>=7?"var(--green)":w>=4?"var(--accent)":"var(--blue)"}}/></div></div></div>
            <div className="intel-card"><div className="il">Tier</div><div className="iv"><span className={"cell-tier "+(TIERS[d.tier]?.cls||"t3")}>{d.tier||"Tier 3"}</span></div></div>
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
        {tab==="timeline"&&<div className="timeline" style={{padding:0}}>
          {da.length===0&&<p style={{color:"var(--text3)",fontSize:12}}>No activities yet</p>}
          {da.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((a,i)=><div className="timeline-item" key={i}><div className={"timeline-dot "+(a.type==="email"?"email":"note")}>{a.type==="email"?"✉️":a.type==="call"?"📞":"📝"}</div><div className="timeline-body"><div className="tl-header"><div className="tl-title">{a.type}</div><div className="tl-date">{fmtD(a.date)}</div></div><div className="tl-desc">{a.summary}</div></div></div>)}
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
    const prompt=`You are a world-class fundraising copywriter. Write a personalized outreach email.\n\n${orgCtx}\n\nDonor Profile:\nName: ${d.name}\nCommunity: ${d.community||"Unknown"}\nIndustry: ${d.industry||"Unknown"}\nNet Worth: ${fmt$(d.net_worth)}\nAnnual Giving: ${fmt$(d.annual_giving)}\nFocus: ${(d.focus_areas||[]).join(", ")}\nConnectors: ${(d.connector_paths||[]).map(c=>c.name+" ("+c.role+")").join(", ")}\nTemplate: ${t?.name} — ${t?.segment}\nHooks: ${t?.hooks}\n\nWrite ONLY the email body. Be warm, personal, compelling. Reference specific donor details and the org's mission. 150-250 words. End with a clear CTA for a meeting. Sign as "Yuri Kruman, ${org.name} Development".`;
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
    <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>{onSend({did:d.id||d.name,tmpl,subj,body,date:new Date().toISOString()});onClose()}} disabled={!subj||!body}>Save Draft & Log</button></div>
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
    if(!ql||"add donor new create".includes(ql)){
      items.push({type:"action",icon:"➕",label:"Add New Donor",hint:"Create",action:()=>{onAddDonor();onClose()}});
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
function RemindersView({reminders,donors,onToggle,onDelete}){
  const today=new Date().toISOString().slice(0,10);
  const sorted=useMemo(()=>[...reminders].sort((a,b)=>{
    if(a.done!==b.done)return a.done?1:-1;
    return new Date(a.date)-new Date(b.date);
  }),[reminders]);
  const overdue=reminders.filter(r=>!r.done&&r.date<today).length;
  const todayCount=reminders.filter(r=>!r.done&&r.date===today).length;
  const upcoming=reminders.filter(r=>!r.done&&r.date>today).length;
  return(<div className="content-scroll">
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>🔔 Follow-up Reminders</h2>
      {overdue>0&&<span className="reminder-badge overdue">⚠️ {overdue} overdue</span>}
      {todayCount>0&&<span className="reminder-badge today">📌 {todayCount} today</span>}
      <span className="reminder-badge upcoming">{upcoming} upcoming</span>
    </div>
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
function NetworkDashboard({donors,graphContacts,setGraphContacts,graphData,setGraphData}){
  const[tab,setTab]=useState("paths"); // paths | contacts | import
  const[searchQ,setSearchQ]=useState("");
  const[importing,setImporting]=useState(false);
  const[importStats,setImportStats]=useState(null);
  const[filterHops,setFilterHops]=useState("all"); // all | 1 | 2 | 3
  const[filterTier,setFilterTier]=useState("all");
  const[sortBy,setSortBy]=useState("hops"); // hops | strength | tier
  const fileRef=useRef();

  // -- Rebuild graph whenever contacts or donors change --
  const[graphBuilding,setGraphBuilding]=useState(false);
  const rebuildGraph=useCallback((contacts)=>{
    // Run graph build in a setTimeout to avoid blocking the main thread render
    setGraphBuilding(true);
    setTimeout(()=>{
      const g=buildGraph(contacts,donors);
      setGraphData(g);
      setGraphBuilding(false);
      sSet("graph_data_summary",{
        totalContacts:contacts.length,
        totalEdges:g.edges.length,
        matchedDonors:g.matchedDonorIds.size,
        pathsFound:Object.keys(g.donorPaths).length,
        built:new Date().toISOString()
      });
    },100);
  },[donors]);

  // -- Handle VCF file upload --
  const handleVCFUpload=(file)=>{
    setImporting(true);setImportStats(null);
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const text=e.target.result;
        const parsed=parseVCF(text);
        // Merge with existing contacts (deduplicate by name)
        const existing=new Map(graphContacts.map(c=>[c.name.toLowerCase(),c]));
        let newCount=0;
        parsed.forEach(c=>{
          const key=c.name.toLowerCase();
          if(!existing.has(key)){existing.set(key,c);newCount++}
          else{
            // Merge phones/emails from new into existing
            const ex=existing.get(key);
            c.phones.forEach(p=>{if(!ex.phones.includes(p))ex.phones.push(p)});
            c.emails.forEach(e=>{if(!ex.emails.includes(e))ex.emails.push(e)});
            if(c.org&&!ex.org)ex.org=c.org;
            if(c.title&&!ex.title)ex.title=c.title;
            if(c.city&&!ex.city)ex.city=c.city;
          }
        });
        const merged=[...existing.values()];
        setGraphContacts(merged);
        sSet("graph_contacts",merged);
        rebuildGraph(merged);
        setImportStats({total:parsed.length,new:newCount,merged:merged.length,source:"vcf"});
      }catch(err){setImportStats({error:"VCF parse error: "+err.message})}
      finally{setImporting(false)}
    };
    reader.readAsText(file);
  };

  // -- Handle LinkedIn CSV upload --
  const handleLinkedInUpload=(file)=>{
    setImporting(true);setImportStats(null);
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const parsed=parseLinkedInCSV(e.target.result);
        const existing=new Map(graphContacts.map(c=>[c.name.toLowerCase(),c]));
        let newCount=0;
        parsed.forEach(c=>{
          const key=c.name.toLowerCase();
          if(!existing.has(key)){existing.set(key,c);newCount++}
          else{
            const ex=existing.get(key);
            c.emails.forEach(em=>{if(!ex.emails.includes(em))ex.emails.push(em)});
            if(c.org&&!ex.org)ex.org=c.org;
            if(c.title&&!ex.title)ex.title=c.title;
            if(!ex.source.includes("linkedin"))ex.source+="+linkedin";
          }
        });
        const merged=[...existing.values()];
        setGraphContacts(merged);
        sSet("graph_contacts",merged);
        rebuildGraph(merged);
        setImportStats({total:parsed.length,new:newCount,merged:merged.length,source:"linkedin"});
      }catch(err){setImportStats({error:"CSV parse error: "+err.message})}
      finally{setImporting(false)}
    };
    reader.readAsText(file);
  };

  // -- Handle file input --
  const handleFile=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.name.endsWith(".vcf")){handleVCFUpload(file)}
    else if(file.name.endsWith(".csv")){handleLinkedInUpload(file)}
    else{alert("Please upload a .vcf (Google/iPhone contacts) or .csv (LinkedIn export) file")}
  };

  // -- Auto-fetch VCF + LinkedIn from http-server --
  const[autoLoadStatus,setAutoLoadStatus]=useState(null);
  useEffect(()=>{
    const doAutoLoad=async()=>{
      let allContacts=[...graphContacts];
      const existingNames=new Set(allContacts.map(c=>c.name.toLowerCase()));
      let vcfCount=0,liCount=0;

      // 1. Load VCF if not already loaded
      const hasVCF=allContacts.some(c=>c.source==="vcf");
      if(!hasVCF){
        try{
          const r=await fetch("/All Contacts.vcf");
          if(r.ok){
            const text=await r.text();
            const parsed=parseVCF(text);
            parsed.forEach(c=>{
              const key=c.name.toLowerCase();
              if(!existingNames.has(key)){existingNames.add(key);allContacts.push(c);vcfCount++}
            });
          }
        }catch{}
      }

      // 2. Load LinkedIn CSV if not already loaded
      const hasLI=allContacts.some(c=>c.source==="linkedin");
      if(!hasLI){
        try{
          const r=await fetch("/Connections.csv");
          if(r.ok){
            const text=await r.text();
            const parsed=parseLinkedInCSV(text);
            parsed.forEach(c=>{
              const key=c.name.toLowerCase();
              if(!existingNames.has(key)){existingNames.add(key);allContacts.push(c)}
              else{
                // Merge LinkedIn data into existing contact
                const ex=allContacts.find(x=>x.name.toLowerCase()===key);
                if(ex){
                  c.emails.forEach(em=>{if(!ex.emails.includes(em))ex.emails.push(em)});
                  if(c.org&&!ex.org)ex.org=c.org;
                  if(c.title&&!ex.title)ex.title=c.title;
                  if(c.linkedin_url)ex.linkedin_url=c.linkedin_url;
                  if(!ex.source.includes("linkedin"))ex.source+="+linkedin";
                }
              }
              liCount++;
            });
          }
        }catch{}
      }

      if(allContacts.length>graphContacts.length||!graphData){
        setGraphContacts(allContacts);
        // Try localStorage — if too large, store only essential fields
        try{sSet("graph_contacts",allContacts)}catch(e){
          // Compress: strip non-essential fields for storage
          const slim=allContacts.map(c=>({id:c.id,source:c.source,name:c.name,emails:c.emails?.slice(0,2)||[],phones:c.phones?.slice(0,2)||[],org:c.org||"",title:c.title||""}));
          try{sSet("graph_contacts",slim)}catch{console.warn("Graph contacts too large for localStorage")}
        }
        rebuildGraph(allContacts);
        if(vcfCount>0||liCount>0){
          setAutoLoadStatus({vcf:vcfCount,li:liCount,total:allContacts.length});
        }
      }
    };
    doAutoLoad();
  },[]);

  // -- Computed stats --
  const stats=useMemo(()=>{
    if(!graphData)return{contacts:graphContacts.length,edges:0,matched:0,paths:0,avgHops:0};
    const paths=Object.values(graphData.donorPaths);
    const avgHops=paths.length>0?(paths.reduce((s,p)=>s+p.hops,0)/paths.length).toFixed(1):0;
    return{
      contacts:graphContacts.length,
      edges:graphData.edges.length,
      matched:graphData.matchedDonorIds?.size||0,
      paths:paths.length,
      avgHops
    };
  },[graphContacts,graphData]);

  // -- Filtered + sorted donor paths --
  const sortedPaths=useMemo(()=>{
    if(!graphData)return[];
    let entries=Object.entries(graphData.donorPaths).map(([did,p])=>{
      const donor=donors.find(d=>(d.id||d.name)==did||(d.id||d.name)==Number(did));
      if(!donor)return null;
      // Compute best path strength (product of edge strengths)
      const pathStrength=p.path.reduce((s,step)=>s*Math.max(step.edge.strength,0.1),1);
      return{donorId:did,donor,path:p.path,hops:p.hops,strength:pathStrength};
    }).filter(Boolean);

    // Apply filters
    if(filterHops!=="all")entries=entries.filter(e=>e.hops<=parseInt(filterHops));
    if(filterTier!=="all")entries=entries.filter(e=>e.donor.tier===filterTier);
    if(searchQ){
      const q=searchQ.toLowerCase();
      entries=entries.filter(e=>e.donor.name.toLowerCase().includes(q)||(e.donor.community||"").toLowerCase().includes(q));
    }

    // Sort
    if(sortBy==="hops")entries.sort((a,b)=>a.hops-b.hops||(b.strength-a.strength));
    else if(sortBy==="strength")entries.sort((a,b)=>b.strength-a.strength);
    else if(sortBy==="tier"){
      const tierOrd={"Tier 1":0,"Tier 2":1,"Tier 3":2};
      entries.sort((a,b)=>(tierOrd[a.donor.tier]||2)-(tierOrd[b.donor.tier]||2)||(a.hops-b.hops));
    }
    return entries;
  },[graphData,donors,filterHops,filterTier,searchQ,sortBy]);

  // -- Filtered contact list --
  const filteredContacts=useMemo(()=>{
    if(!searchQ&&tab!=="contacts")return graphContacts.slice(0,100);
    let list=[...graphContacts];
    if(searchQ){
      const q=searchQ.toLowerCase();
      list=list.filter(c=>(c.name||"").toLowerCase().includes(q)||(c.org||"").toLowerCase().includes(q)||(c.emails||[]).some(e=>e.includes(q)));
    }
    return list.slice(0,200);
  },[graphContacts,searchQ,tab]);

  // -- Resolve node name from graph --
  const nodeName=(nodeId)=>{
    if(!graphData)return nodeId;
    const node=graphData.nodes.find(n=>n.id===nodeId);
    return node?.name||nodeId;
  };

  return(<div className="content-scroll" style={{padding:20}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>🕸️ Relationship Intelligence</h2>
      <span style={{fontSize:12,color:"var(--text3)"}}>Find the shortest path to every donor through your network</span>
      {graphBuilding&&<span style={{fontSize:11,color:"var(--accent)",marginLeft:8}}>⏳ Building graph...</span>}
    </div>

    {/* Stats Row */}
    <div className="net-stats">
      <div className="net-stat"><div className="ns-val" style={{color:"var(--accent)"}}>{stats.contacts.toLocaleString()}</div><div className="ns-lbl">Contacts</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--blue)"}}>{stats.edges.toLocaleString()}</div><div className="ns-lbl">Connections</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--green)"}}>{stats.matched}</div><div className="ns-lbl">Donors Matched</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--purple)"}}>{stats.paths}</div><div className="ns-lbl">Paths Found</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--cyan)"}}>{stats.avgHops}</div><div className="ns-lbl">Avg Hops</div></div>
    </div>

    {/* Sub-tabs */}
    <div className="sub-nav" style={{marginBottom:16,padding:0}}>
      <div className={"sub-tab "+(tab==="paths"?"active":"")} onClick={()=>setTab("paths")}>🔗 Intro Paths <span className="count">{sortedPaths.length}</span></div>
      <div className={"sub-tab "+(tab==="contacts"?"active":"")} onClick={()=>setTab("contacts")}>👤 Contacts <span className="count">{graphContacts.length}</span></div>
      <div className={"sub-tab "+(tab==="import"?"active":"")} onClick={()=>setTab("import")}>📥 Import</div>
      <div className={"sub-tab "+(tab==="matches"?"active":"")} onClick={()=>setTab("matches")}>🎯 Direct Matches <span className="count">{stats.matched}</span></div>
      <div className={"sub-tab "+(tab==="graph"?"active":"")} onClick={()=>setTab("graph")}>🌐 Visual Graph</div>
    </div>

    {/* ===== INTRO PATHS TAB ===== */}
    {tab==="paths"&&<div>
      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <input className="form-input" placeholder="Search donors..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{maxWidth:240,padding:"6px 10px"}}/>
        <select className="form-select" value={filterHops} onChange={e=>setFilterHops(e.target.value)} style={{width:130,padding:"6px 10px"}}>
          <option value="all">All Hops</option><option value="1">1 Hop (Direct)</option><option value="2">≤ 2 Hops</option><option value="3">≤ 3 Hops</option>
        </select>
        <select className="form-select" value={filterTier} onChange={e=>setFilterTier(e.target.value)} style={{width:110,padding:"6px 10px"}}>
          <option value="all">All Tiers</option><option value="Tier 1">Tier 1</option><option value="Tier 2">Tier 2</option><option value="Tier 3">Tier 3</option>
        </select>
        <select className="form-select" value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{width:130,padding:"6px 10px"}}>
          <option value="hops">Sort: Fewest Hops</option><option value="strength">Sort: Strongest</option><option value="tier">Sort: By Tier</option>
        </select>
        <div style={{flex:1}}/>
        <span style={{fontSize:11,color:"var(--text3)"}}>{sortedPaths.length} paths</span>
      </div>

      {/* No contacts loaded */}
      {graphContacts.length===0&&<div className="empty-state">
        <div className="empty-icon">🕸️</div><h3>No contacts imported yet</h3>
        <p style={{marginBottom:12}}>Import your Google/iPhone contacts (.vcf) or LinkedIn connections (.csv) to discover intro paths</p>
        <button className="btn btn-primary" onClick={()=>setTab("import")}>📥 Import Contacts</button>
      </div>}

      {/* No paths found */}
      {graphContacts.length>0&&sortedPaths.length===0&&<div className="empty-state">
        <div className="empty-icon">🔍</div><h3>No paths match your filters</h3>
        <p>Try adjusting filters or importing more contacts</p>
      </div>}

      {/* Path Cards */}
      {sortedPaths.map((entry,i)=>{
        const{donor,path,hops,strength}=entry;
        const stg=STAGES.find(s=>s.id===(donor.pipeline_stage||"not_started"));
        return(<div className="net-path-card" key={i}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,fontWeight:700}}>{donor.name}</span>
              <span className={"cell-tier "+(TIERS[donor.tier]?.cls||"t3")} style={{fontSize:10}}>{TIERS[donor.tier]?.label||"T3"}</span>
              <span className="cell-stage" style={{background:(stg?.color||"#52525b")+"20",color:stg?.color,fontSize:10}}>● {stg?.label}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:hops===1?"var(--green)":hops===2?"var(--accent)":"var(--blue)",fontWeight:700}}>{hops} hop{hops>1?"s":""}</span>
              <div className="net-strength-bar"><div className="net-strength-fill" style={{width:`${strength*100}%`,background:strength>=0.5?"var(--green)":strength>=0.25?"var(--accent)":"var(--blue)"}}/></div>
            </div>
          </div>

          {/* Path visualization */}
          <div className="net-path-chain">
            <span className="net-path-node you">👤 You</span>
            {path.map((step,j)=>{
              const name=nodeName(step.nodeId);
              const isTarget=j===path.length-1;
              return(<React.Fragment key={j}>
                <span className="net-path-arrow">→</span>
                <span className={"net-path-node "+(isTarget?"donor":"contact")}>{isTarget?"🎯":"🔗"} {name}</span>
              </React.Fragment>);
            })}
          </div>

          {/* Signals */}
          <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
            {path.flatMap((step,j)=>step.edge.signals.map((sig,k)=>(
              <span className="net-signal" key={j+"-"+k}>{sig.label}</span>
            )))}
          </div>

          {/* Donor details */}
          <div style={{display:"flex",gap:12,marginTop:6,fontSize:11,color:"var(--text3)"}}>
            {donor.community&&<span>🏛️ {donor.community}</span>}
            {donor.city&&<span>📍 {donor.city}</span>}
            {donor.net_worth&&<span>💰 {fmt$(donor.net_worth)}</span>}
            <span>📊 Ask: {fmt$(aiAsk(donor))}</span>
          </div>
        </div>);
      })}
    </div>}

    {/* ===== CONTACTS TAB ===== */}
    {tab==="contacts"&&<div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <input className="form-input" placeholder="Search contacts..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{maxWidth:300,padding:"6px 10px"}}/>
        <div style={{flex:1}}/>
        <span style={{fontSize:11,color:"var(--text3)"}}>{filteredContacts.length} of {graphContacts.length}</span>
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
        <div className="net-contact-row" style={{borderBottom:"2px solid var(--border)",fontWeight:700,fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5}}>
          <span className="nc-name">Name</span><span className="nc-org">Organization</span><span style={{minWidth:120}}>Phone</span><span style={{minWidth:180}}>Email</span><span style={{minWidth:80}}>Source</span><span style={{minWidth:80}}>Matched?</span>
        </div>
        {filteredContacts.map((c,i)=>{
          const match=graphData?graphData.contactDonorEdges.find(e=>e.contactId===c.id):null;
          return(<div className="net-contact-row" key={c.id||i}>
            <span className="nc-name">{c.name}</span>
            <span className="nc-org">{c.org||"—"}</span>
            <span style={{minWidth:120,fontSize:11}}>{c.phones?.[0]||"—"}</span>
            <span style={{minWidth:180,fontSize:11,color:"var(--text3)"}}>{c.emails?.[0]||"—"}</span>
            <span style={{minWidth:80}}><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:c.source==="linkedin"?"var(--blue-soft)":"var(--surface2)",color:c.source==="linkedin"?"var(--blue)":"var(--text3)",fontWeight:600}}>{c.source}</span></span>
            <span style={{minWidth:80}}>{match?<span className="nc-match" style={{background:"var(--green-soft)",color:"var(--green)"}}>✓ {match.matchType}</span>:<span style={{fontSize:11,color:"var(--text4)"}}>—</span>}</span>
          </div>);
        })}
        {filteredContacts.length===0&&<div style={{padding:20,textAlign:"center",color:"var(--text3)",fontSize:12}}>No contacts found</div>}
      </div>
    </div>}

    {/* ===== IMPORT TAB ===== */}
    {tab==="import"&&<div style={{maxWidth:700}}>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Import Your Network</h3>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Upload contacts from Google/iPhone (.vcf) or LinkedIn (.csv) to build your social graph and find intro paths to donors.</p>

      {/* Upload zone */}
      <div className={"net-import-zone"+(importStats&&!importStats.error?" active":"")} onClick={()=>fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".vcf,.csv" style={{display:"none"}} onChange={handleFile}/>
        <div style={{fontSize:32,marginBottom:8}}>{importing?"⏳":"📁"}</div>
        <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{importing?"Parsing contacts...":"Click to upload .vcf or .csv"}</div>
        <div style={{fontSize:12,color:"var(--text3)"}}>
          Google Contacts → Export as vCard (.vcf)<br/>
          LinkedIn → Settings → Data Privacy → Get a copy → Connections.csv
        </div>
      </div>

      {/* Import result */}
      {importStats&&<div style={{padding:12,borderRadius:"var(--radius)",marginBottom:16,background:importStats.error?"var(--red-soft)":"var(--green-soft)",color:importStats.error?"var(--red)":"var(--green)",fontSize:12}}>
        {importStats.error||<>
          {importStats.auto?"Auto-loaded":"Imported"} <strong>{importStats.total}</strong> contacts from {importStats.source==="vcf-auto"?"local VCF file":importStats.source}
          {importStats.new>0&&<> ({importStats.new} new)</>}. Total network: <strong>{importStats.merged}</strong> contacts.
          {graphData&&<> Found <strong>{Object.keys(graphData.donorPaths).length}</strong> intro paths to donors.</>}
        </>}
      </div>}

      {/* Auto-load status */}
      {autoLoadStatus&&<div style={{padding:12,borderRadius:"var(--radius)",marginBottom:16,background:"var(--blue-soft)",color:"var(--blue)",fontSize:12}}>
        Auto-loaded: {autoLoadStatus.vcf>0&&<><strong>{autoLoadStatus.vcf.toLocaleString()}</strong> Google/iPhone contacts</>}
        {autoLoadStatus.vcf>0&&autoLoadStatus.li>0&&" + "}
        {autoLoadStatus.li>0&&<><strong>{autoLoadStatus.li.toLocaleString()}</strong> LinkedIn connections</>}
        . Total network: <strong>{autoLoadStatus.total.toLocaleString()}</strong> contacts.
      </div>}

      {/* Source breakdown */}
      {graphContacts.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"var(--accent)"}}>{graphContacts.filter(c=>c.source==="vcf").length.toLocaleString()}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>📱 Google/iPhone</div>
        </div>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"var(--blue)"}}>{graphContacts.filter(c=>c.source==="linkedin"||c.source?.includes("linkedin")).length.toLocaleString()}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>💼 LinkedIn</div>
        </div>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"var(--green)"}}>{graphContacts.filter(c=>c.source?.includes("+")).length.toLocaleString()}</div>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>🔗 Multi-Source</div>
        </div>
      </div>}

      {/* How-to guides */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16}}>
          <h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>📱 Google / iPhone Contacts</h4>
          <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.8}}>
            <div>1. Go to <strong>contacts.google.com</strong></div>
            <div>2. Click "Export" (sidebar)</div>
            <div>3. Select "vCard (.vcf)"</div>
            <div>4. Upload the file here</div>
            <div style={{marginTop:6,color:"var(--accent)",fontWeight:600}}>Parses: names, phones, emails, orgs</div>
          </div>
        </div>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16}}>
          <h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>💼 LinkedIn Connections</h4>
          <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.8}}>
            <div>1. LinkedIn → Settings & Privacy</div>
            <div>2. Data Privacy → "Get a copy of your data"</div>
            <div>3. Select "Connections" only</div>
            <div>4. Download and upload the CSV here</div>
            <div style={{marginTop:6,color:"var(--blue)",fontWeight:600}}>Parses: names, companies, positions, emails</div>
          </div>
        </div>
      </div>

      {/* Clear data */}
      {graphContacts.length>0&&<div style={{marginTop:16,padding:12,background:"var(--surface)",borderRadius:"var(--radius)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:12,color:"var(--text3)"}}>Network: {graphContacts.length} contacts loaded</span>
        <div style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm" onClick={()=>{rebuildGraph(graphContacts)}}>🔄 Rebuild Graph</button>
        <button className="btn btn-ghost btn-sm" style={{color:"var(--red)"}} onClick={()=>{
          if(!confirm("Clear all imported contacts? This cannot be undone."))return;
          setGraphContacts([]);setGraphData(null);
          sSet("graph_contacts",[]);sSet("graph_data_summary",null);
          setImportStats(null);
        }}>🗑️ Clear All</button>
      </div>}

      {/* Gmail Integration */}
      <GmailIntegration graphContacts={graphContacts} setGraphContacts={setGraphContacts} donors={donors} rebuildGraph={rebuildGraph}/>
    </div>}

    {/* ===== DIRECT MATCHES TAB ===== */}
    {tab==="matches"&&<div>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Contacts from your network that directly match donors in your pipeline (by email, phone, or name).</p>
      {(!graphData||graphData.contactDonorEdges.length===0)&&<div className="empty-state">
        <div className="empty-icon">🎯</div><h3>No direct matches yet</h3>
        <p>Import contacts to find matches against your {donors.length} donors</p>
      </div>}
      {graphData&&graphData.contactDonorEdges.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {graphData.contactDonorEdges.sort((a,b)=>b.confidence-a.confidence).map((m,i)=>{
          const contact=graphContacts.find(c=>c.id===m.contactId);
          const donor=donors.find(d=>(d.id||d.name)==m.donorId||(d.id||d.name)==Number(m.donorId));
          if(!contact||!donor)return null;
          return(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{contact.name}</div>
              <div style={{fontSize:11,color:"var(--text3)"}}>{contact.org||contact.emails?.[0]||"—"}</div>
            </div>
            <span style={{fontSize:16}}>↔</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:600,color:"var(--accent)"}}>{donor.name}</span>
                <span className={"cell-tier "+(TIERS[donor.tier]?.cls||"t3")} style={{fontSize:10}}>{TIERS[donor.tier]?.label||"T3"}</span>
              </div>
              <div style={{fontSize:11,color:"var(--text3)"}}>{donor.community||donor.city||"—"} • {fmt$(donor.net_worth)}</div>
            </div>
            <div style={{textAlign:"right",minWidth:100}}>
              <span className="nc-match" style={{background:"var(--green-soft)",color:"var(--green)"}}>{m.matchType}</span>
              <div style={{fontSize:10,color:"var(--text4)",marginTop:2}}>{Math.round(m.confidence*100)}% confidence</div>
            </div>
          </div>);
        })}
      </div>}
    </div>}

    {/* ===== VISUAL GRAPH TAB ===== */}
    {tab==="graph"&&<div>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Interactive network map showing the shortest intro paths to your top donors. Larger nodes = higher tier donors.</p>
      <NetworkGraphSVG graphData={graphData} donors={donors} graphContacts={graphContacts} sortedPaths={sortedPaths.slice(0,30)}/>
    </div>}
  </div>);
}

// ============================================================
// COMPONENT: NetworkGraphSVG — SVG visualization of intro paths
// ============================================================
function NetworkGraphSVG({graphData,donors,graphContacts,sortedPaths}){
  const svgRef=useRef();
  const[hovered,setHovered]=useState(null);
  const[dimensions]=useState({w:900,h:600});

  // Build a simplified graph from top paths for visualization
  const vizData=useMemo(()=>{
    if(!sortedPaths||sortedPaths.length===0)return{nodes:[],links:[]};
    const nodeMap=new Map();
    const links=[];

    // Center node: YOU
    nodeMap.set("YOU",{id:"YOU",name:"You (Yuri)",type:"you",x:dimensions.w/2,y:dimensions.h/2,r:20});

    sortedPaths.forEach((entry,pathIdx)=>{
      const{donor,path}=entry;
      const donorKey="d_"+(donor.id||donor.name);

      // Add donor node in a ring around center
      if(!nodeMap.has(donorKey)){
        const angle=(pathIdx/Math.min(sortedPaths.length,30))*Math.PI*2-Math.PI/2;
        const radius=donor.tier==="Tier 1"?200:250;
        nodeMap.set(donorKey,{
          id:donorKey,name:donor.name,type:"donor",tier:donor.tier,
          x:dimensions.w/2+Math.cos(angle)*radius,
          y:dimensions.h/2+Math.sin(angle)*radius,
          r:donor.tier==="Tier 1"?14:donor.tier==="Tier 2"?10:8
        });
      }

      // Add intermediate contacts
      let prevId="YOU";
      path.forEach((step,stepIdx)=>{
        const isLastStep=stepIdx===path.length-1;
        const nodeId=step.nodeId;

        if(!isLastStep&&!nodeMap.has(nodeId)){
          const contact=graphContacts.find(c=>c.id===nodeId);
          // Position between YOU and donor
          const donorNode=nodeMap.get(donorKey);
          const t=(stepIdx+1)/(path.length+1);
          const youNode=nodeMap.get("YOU");
          nodeMap.set(nodeId,{
            id:nodeId,name:contact?.name||nodeId,type:"contact",
            org:contact?.org||"",source:contact?.source||"",
            x:youNode.x+(donorNode.x-youNode.x)*t+(Math.random()-0.5)*60,
            y:youNode.y+(donorNode.y-youNode.y)*t+(Math.random()-0.5)*60,
            r:7
          });
        }

        const targetId=isLastStep?donorKey:nodeId;
        // Avoid duplicate links
        const linkKey=prevId+"→"+targetId;
        if(!links.some(l=>l.key===linkKey)){
          links.push({key:linkKey,source:prevId,target:targetId,strength:step.edge.strength});
        }
        prevId=targetId;
      });
    });

    return{nodes:[...nodeMap.values()],links};
  },[sortedPaths,graphContacts,dimensions]);

  if(vizData.nodes.length===0)return(<div className="empty-state"><div className="empty-icon">🌐</div><h3>No paths to visualize</h3><p>Import contacts to discover intro paths</p></div>);

  const nodeColors={you:"#f59e0b",donor:"#10b981",contact:"#3b82f6"};
  const tierColors={"Tier 1":"#f59e0b","Tier 2":"#3b82f6","Tier 3":"#71717a"};

  return(<div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden",position:"relative"}}>
    <svg ref={svgRef} width={dimensions.w} height={dimensions.h} style={{display:"block"}}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--text4)"/>
        </marker>
      </defs>

      {/* Links */}
      {vizData.links.map((link,i)=>{
        const source=vizData.nodes.find(n=>n.id===link.source);
        const target=vizData.nodes.find(n=>n.id===link.target);
        if(!source||!target)return null;
        const opacity=Math.max(link.strength*0.8,0.15);
        return(<line key={i} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
          stroke="var(--text4)" strokeWidth={Math.max(link.strength*3,0.5)} opacity={opacity}
          markerEnd="url(#arrowhead)"/>);
      })}

      {/* Nodes */}
      {vizData.nodes.map(node=>{
        const isHovered=hovered===node.id;
        const fill=node.type==="donor"?(tierColors[node.tier]||"#71717a"):nodeColors[node.type];
        return(<g key={node.id} onMouseEnter={()=>setHovered(node.id)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
          {/* Glow on hover */}
          {isHovered&&<circle cx={node.x} cy={node.y} r={node.r+6} fill={fill} opacity={0.2}/>}
          {/* Node circle */}
          <circle cx={node.x} cy={node.y} r={node.r}
            fill={fill} stroke={isHovered?"#fff":fill} strokeWidth={isHovered?2:1}
            opacity={node.type==="you"?1:0.85}/>
          {/* Label */}
          <text x={node.x} y={node.y+node.r+12} textAnchor="middle"
            fill={isHovered?"var(--text)":"var(--text3)"} fontSize={node.type==="you"?11:node.type==="donor"?10:8}
            fontWeight={isHovered||node.type==="you"?700:400} fontFamily="Inter,sans-serif">
            {node.name.length>18?node.name.slice(0,16)+"...":node.name}
          </text>
          {/* Tier badge for donors */}
          {node.type==="donor"&&<text x={node.x} y={node.y+4} textAnchor="middle"
            fill="#fff" fontSize={7} fontWeight={800} fontFamily="Inter,sans-serif">
            {node.tier==="Tier 1"?"T1":node.tier==="Tier 2"?"T2":"T3"}
          </text>}
          {/* YOU label inside */}
          {node.type==="you"&&<text x={node.x} y={node.y+5} textAnchor="middle"
            fill="var(--bg)" fontSize={10} fontWeight={800} fontFamily="Inter,sans-serif">YOU</text>}
        </g>);
      })}
    </svg>

    {/* Hover tooltip */}
    {hovered&&vizData.nodes.find(n=>n.id===hovered)&&<div style={{position:"absolute",top:8,right:8,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10,maxWidth:220,fontSize:11,boxShadow:"var(--shadow-lg)"}}>
      {(()=>{
        const node=vizData.nodes.find(n=>n.id===hovered);
        const donor=node.type==="donor"?donors.find(d=>"d_"+(d.id||d.name)===node.id):null;
        return(<>
          <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{node.name}</div>
          <div style={{color:"var(--text3)"}}>
            {node.type==="you"&&"Your network hub — all paths start here"}
            {node.type==="contact"&&<>{node.org&&<div>🏢 {node.org}</div>}<div>📱 Source: {node.source}</div></>}
            {node.type==="donor"&&donor&&<>
              <div>🏛️ {donor.community||donor.industry||"—"} • {donor.city||""}</div>
              <div>💰 Net Worth: {fmt$(donor.net_worth)}</div>
              <div>📊 Ask: {fmt$(aiAsk(donor))}</div>
              <div>🎯 {donor.tier}</div>
            </>}
          </div>
        </>);
      })()}
    </div>}

    {/* Legend */}
    <div style={{position:"absolute",bottom:8,left:8,display:"flex",gap:12,fontSize:10,color:"var(--text3)"}}>
      <span>🟡 You</span><span>🟢 Donor</span><span>🔵 Contact</span>
      <span style={{marginLeft:12}}>Line thickness = connection strength</span>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: GmailIntegration — Sync contacts from Gmail headers
// ============================================================
function GmailIntegration({graphContacts,setGraphContacts,donors,rebuildGraph}){
  const[bridgeUrl]=useState(()=>sGet("wa_bridge","http://localhost:3001"));
  const[gmailStatus,setGmailStatus]=useState("unknown"); // unknown|ready|offline|auth_needed
  const[syncing,setSyncing]=useState(false);
  const[syncResult,setSyncResult]=useState(null);
  const[gmailContacts,setGmailContacts]=useState([]);
  const[apiKey]=useState(()=>sGet("key",""));

  // -- Check bridge for Gmail endpoint --
  useEffect(()=>{
    fetch(`${bridgeUrl}/api/health`).then(r=>r.json()).then(d=>{
      setGmailStatus(d.gmail||"offline");
    }).catch(()=>setGmailStatus("offline"));
  },[bridgeUrl]);

  // -- Extract contacts from Gmail headers via AI --
  // Phase 1: Manual paste of email headers / "Sent" folder export
  const[pasteMode,setPasteMode]=useState(false);
  const[headerText,setHeaderText]=useState("");

  const parseEmailHeaders=(text)=>{
    // Extract email addresses from various formats:
    // "Name <email@domain.com>", "email@domain.com", "From: ...", "To: ..."
    const emailRegex=/(?:["']?([^"'<]+?)["']?\s*)?<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/g;
    const contacts=new Map();
    let match;
    while((match=emailRegex.exec(text))!==null){
      const name=(match[1]||"").trim();
      const email=match[2].toLowerCase();
      // Skip common no-reply / system addresses
      if(/noreply|no-reply|mailer-daemon|postmaster|newsletter|unsubscribe|notifications?@/i.test(email))continue;
      if(!contacts.has(email)){
        contacts.set(email,{
          id:"gm_"+contacts.size,source:"gmail",
          name:name||email.split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
          emails:[email],phones:[],
          org:email.split("@")[1].replace(/\.(com|org|net|edu|gov|io|co)$/,"").replace(/\./g," "),
          title:"",city:"",country:""
        });
      }
    }
    return[...contacts.values()];
  };

  const importFromHeaders=()=>{
    if(!headerText.trim())return;
    const parsed=parseEmailHeaders(headerText);
    if(parsed.length===0){setSyncResult({error:"No email addresses found in pasted text"});return}

    const existing=new Map(graphContacts.map(c=>[c.name.toLowerCase(),c]));
    // Also index by email for dedup
    const emailIdx=new Map();
    graphContacts.forEach(c=>(c.emails||[]).forEach(e=>emailIdx.set(e,c)));

    let newCount=0;
    parsed.forEach(gc=>{
      const byEmail=gc.emails?.[0]?emailIdx.get(gc.emails[0]):null;
      const byName=existing.get(gc.name.toLowerCase());
      if(byEmail){
        // Merge: add gmail source flag
        if(!byEmail.source.includes("gmail"))byEmail.source+="+gmail";
      }else if(byName){
        gc.emails.forEach(e=>{if(!byName.emails.includes(e))byName.emails.push(e)});
        if(!byName.source.includes("gmail"))byName.source+="+gmail";
      }else{
        existing.set(gc.name.toLowerCase(),gc);
        newCount++;
      }
    });
    const merged=[...existing.values()];
    setGraphContacts(merged);
    try{sSet("graph_contacts",merged)}catch{}
    rebuildGraph(merged);
    setSyncResult({parsed:parsed.length,new:newCount,total:merged.length});
    setGmailContacts(parsed);
    setHeaderText("");
  };

  // -- AI: Extract from pasted email threads --
  const[aiExtracting,setAiExtracting]=useState(false);
  const aiExtractContacts=async()=>{
    if(!headerText.trim()||!apiKey)return;
    setAiExtracting(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:2048,
        messages:[{role:"user",content:`Extract all person names and email addresses from these email headers/threads. Return ONLY a JSON array of objects with "name" and "email" fields. No explanation.\n\nText:\n${headerText.slice(0,8000)}`}]
      })});
      if(!res.ok)throw new Error(`API ${res.status}`);
      const data=await res.json();
      const text=data.content?.[0]?.text||"";
      const jsonMatch=text.match(/\[[\s\S]*\]/);
      if(jsonMatch){
        const extracted=JSON.parse(jsonMatch[0]);
        const formatted=extracted.map((e,i)=>({
          id:"gm_ai_"+i,source:"gmail",
          name:e.name||e.email.split("@")[0],
          emails:[e.email.toLowerCase()],phones:[],
          org:e.email.split("@")[1]?.replace(/\.(com|org|net|edu|gov|io|co)$/,""),
          title:"",city:"",country:""
        }));
        setHeaderText(JSON.stringify(formatted.map(f=>({name:f.name,email:f.emails[0]})),null,2));
        setSyncResult({ai:true,parsed:formatted.length,message:"AI extracted contacts. Review and click 'Import from Headers' to add them."});
      }
    }catch(e){setSyncResult({error:"AI extraction failed: "+e.message})}
    finally{setAiExtracting(false)}
  };

  return(<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,marginTop:16}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <h4 style={{fontSize:14,fontWeight:700}}>📧 Gmail Integration</h4>
      <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:gmailStatus==="ready"?"var(--green-soft)":"var(--surface2)",color:gmailStatus==="ready"?"var(--green)":"var(--text3)",fontWeight:600}}>
        {gmailStatus==="ready"?"Connected":"Manual Import"}
      </span>
    </div>

    <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>
      Extract contacts from your email — paste email headers, "To/From/CC" fields, or entire email threads. AI will extract names and addresses.
    </p>

    <textarea className="form-textarea" value={headerText} onChange={e=>setHeaderText(e.target.value)}
      placeholder={'Paste email headers, To/From/CC lines, or full email threads here...\n\nExamples:\nFrom: David Goldstein <david@goldsteinfoundation.org>\nTo: Sarah Roth <sarah@rothfamily.com>, Michael Safra <m.safra@safra.com>\nCC: "Rachel Levy" <rachel.levy@uja.org>'} style={{minHeight:100,marginBottom:8}}/>

    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button className="btn btn-primary btn-sm" onClick={importFromHeaders} disabled={!headerText.trim()}>📥 Import from Headers</button>
      {apiKey&&<button className="btn btn-ghost btn-sm" onClick={aiExtractContacts} disabled={!headerText.trim()||aiExtracting}>
        {aiExtracting?"⏳ Extracting...":"⚡ AI Extract (Claude)"}
      </button>}
      {!apiKey&&<span style={{fontSize:11,color:"var(--text4)",alignSelf:"center"}}>Set API key in Settings for AI extraction</span>}
    </div>

    {syncResult&&<div style={{marginTop:8,padding:"8px 12px",borderRadius:"var(--radius-sm)",fontSize:12,background:syncResult.error?"var(--red-soft)":"var(--green-soft)",color:syncResult.error?"var(--red)":"var(--green)"}}>
      {syncResult.error||syncResult.message||<>Parsed <strong>{syncResult.parsed}</strong> contacts ({syncResult.new} new). Total network: <strong>{syncResult.total.toLocaleString()}</strong>.</>}
    </div>}

    {/* Future: Auto-sync via bridge */}
    <div style={{marginTop:12,padding:10,background:"var(--surface2)",borderRadius:"var(--radius-sm)",fontSize:11,color:"var(--text3)"}}>
      <strong>Coming soon:</strong> Auto-sync via Gmail API through the bridge server. For now, paste email headers or use the "Export Contacts" feature from contacts.google.com (.vcf upload above).
    </div>
  </div>);
}

// ============================================================
// COMPONENT: OutreachLogger — Log outreach attempts with outcomes
// ============================================================
function OutreachLogger({donors,onLog}){
  const[form,setForm]=useState({donorId:"",channel:"email",message:"",outcome:"pending",date:new Date().toISOString().slice(0,10),template_used:"",response_time:"",notes:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=()=>{
    if(!form.donorId){alert("Select a donor");return}
    if(!form.message.trim()){alert("Describe the outreach");return}
    onLog({...form,id:Date.now(),date:new Date(form.date).toISOString(),logged:new Date().toISOString()});
    setForm({donorId:"",channel:"email",message:"",outcome:"pending",date:new Date().toISOString().slice(0,10),template_used:"",response_time:"",notes:""});
  };
  return(<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16}}>
    <h4 style={{fontSize:13,fontWeight:700,marginBottom:12}}>📝 Log Outreach Attempt</h4>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
      <div className="form-group"><label className="form-label">Donor *</label>
        <select className="form-select" value={form.donorId} onChange={e=>set("donorId",e.target.value)}>
          <option value="">Select donor...</option>
          {donors.map(d=><option key={d.id||d.name} value={d.id||d.name}>{d.name} ({d.tier||"T3"})</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Channel</label>
        <select className="form-select" value={form.channel} onChange={e=>set("channel",e.target.value)}>
          <option value="email">✉️ Email</option><option value="whatsapp">💬 WhatsApp</option>
          <option value="call">📞 Phone Call</option><option value="meeting">🤝 Meeting</option>
          <option value="intro">🔗 Intro Request</option><option value="linkedin">💼 LinkedIn</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label">Date</label>
        <input className="form-input" type="date" value={form.date} onChange={e=>set("date",e.target.value)}/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
      <div className="form-group"><label className="form-label">What did you send/do? *</label>
        <input className="form-input" value={form.message} onChange={e=>set("message",e.target.value)} placeholder="e.g., Sent personalized email about Hesder yeshiva..."/>
      </div>
      <div className="form-group"><label className="form-label">Outcome</label>
        <select className="form-select" value={form.outcome} onChange={e=>set("outcome",e.target.value)}>
          <option value="pending">⏳ Pending</option><option value="positive">✅ Positive</option>
          <option value="neutral">😐 Neutral</option><option value="negative">❌ Negative</option>
          <option value="no_response">📭 No Response</option><option value="meeting_set">📅 Meeting Set</option>
          <option value="gift_received">🎁 Gift Received</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label">Response Time (days)</label>
        <input className="form-input" type="number" value={form.response_time} onChange={e=>set("response_time",e.target.value)} placeholder="e.g., 3"/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
      <div className="form-group"><label className="form-label">Template Used</label>
        <select className="form-select" value={form.template_used} onChange={e=>set("template_used",e.target.value)}>
          <option value="">None / Custom</option>
          {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.id}: {t.name}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Notes</label>
        <input className="form-input" value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any observations..."/>
      </div>
    </div>
    <button className="btn btn-primary" onClick={submit}>📝 Log Outreach</button>
  </div>);
}

// ============================================================
// COMPONENT: LearningInsights — AI pattern analysis from outcomes
// ============================================================
function LearningInsights({outreachLog,donors}){
  // Compute learning signals from logged outreach
  const insights=useMemo(()=>{
    if(outreachLog.length<2)return null;
    const total=outreachLog.length;
    const byOutcome={};
    const byChannel={};
    const byTemplate={};
    const byTier={};
    const responseTimes=[];

    outreachLog.forEach(entry=>{
      // Outcome distribution
      const oc=entry.outcome||"pending";
      byOutcome[oc]=(byOutcome[oc]||0)+1;

      // Channel effectiveness
      const ch=entry.channel||"email";
      if(!byChannel[ch])byChannel[ch]={total:0,positive:0,meetings:0,gifts:0};
      byChannel[ch].total++;
      if(oc==="positive"||oc==="meeting_set"||oc==="gift_received")byChannel[ch].positive++;
      if(oc==="meeting_set")byChannel[ch].meetings++;
      if(oc==="gift_received")byChannel[ch].gifts++;

      // Template effectiveness
      if(entry.template_used){
        if(!byTemplate[entry.template_used])byTemplate[entry.template_used]={total:0,positive:0};
        byTemplate[entry.template_used].total++;
        if(oc==="positive"||oc==="meeting_set"||oc==="gift_received")byTemplate[entry.template_used].positive++;
      }

      // Tier analysis
      const donor=donors.find(d=>(d.id||d.name)===entry.donorId||(d.id||d.name)===Number(entry.donorId));
      const tier=donor?.tier||"Unknown";
      if(!byTier[tier])byTier[tier]={total:0,positive:0};
      byTier[tier].total++;
      if(oc==="positive"||oc==="meeting_set"||oc==="gift_received")byTier[tier].positive++;

      // Response times
      if(entry.response_time&&!isNaN(entry.response_time)){
        responseTimes.push({days:Number(entry.response_time),channel:ch,outcome:oc});
      }
    });

    // Best channel
    const channelRanked=Object.entries(byChannel).map(([ch,d])=>({channel:ch,...d,rate:d.total>0?(d.positive/d.total*100).toFixed(0):0})).sort((a,b)=>b.rate-a.rate);

    // Best template
    const templateRanked=Object.entries(byTemplate).map(([t,d])=>({template:t,...d,rate:d.total>0?(d.positive/d.total*100).toFixed(0):0})).sort((a,b)=>b.rate-a.rate);

    // Avg response time
    const avgResp=responseTimes.length>0?(responseTimes.reduce((s,r)=>s+r.days,0)/responseTimes.length).toFixed(1):null;

    // Success rate
    const successCount=outreachLog.filter(e=>["positive","meeting_set","gift_received"].includes(e.outcome)).length;
    const successRate=(successCount/total*100).toFixed(0);

    return{total,byOutcome,channelRanked,templateRanked,byTier,avgResp,successRate,successCount};
  },[outreachLog,donors]);

  if(!insights)return(<div style={{fontSize:12,color:"var(--text3)"}}>Log at least 2 outreach attempts to see insights</div>);

  const channelIcon={email:"✉️",whatsapp:"💬",call:"📞",meeting:"🤝",intro:"🔗",linkedin:"💼"};

  return(<div>
    {/* Summary stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"var(--accent)"}}>{insights.total}</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Total Outreach</div>
      </div>
      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"var(--green)"}}>{insights.successRate}%</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Success Rate</div>
      </div>
      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"var(--blue)"}}>{insights.avgResp||"—"}</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Avg Resp (days)</div>
      </div>
      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:12,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"var(--purple)"}}>{insights.successCount}</div>
        <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase"}}>Wins</div>
      </div>
    </div>

    {/* Channel effectiveness */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:14}}>
        <h4 style={{fontSize:12,fontWeight:700,marginBottom:10}}>📊 Channel Effectiveness</h4>
        {insights.channelRanked.map((ch,i)=>(
          <div key={ch.channel} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<insights.channelRanked.length-1?"1px solid var(--border)":"none"}}>
            <span style={{fontSize:14}}>{channelIcon[ch.channel]||"📧"}</span>
            <span style={{fontSize:12,fontWeight:600,flex:1,textTransform:"capitalize"}}>{ch.channel}</span>
            <div style={{width:60,height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${ch.rate}%`,height:"100%",borderRadius:3,background:Number(ch.rate)>=50?"var(--green)":Number(ch.rate)>=25?"var(--accent)":"var(--blue)"}}/>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:Number(ch.rate)>=50?"var(--green)":"var(--text2)",minWidth:35,textAlign:"right"}}>{ch.rate}%</span>
            <span style={{fontSize:10,color:"var(--text4)"}}>({ch.total})</span>
          </div>
        ))}
      </div>

      <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:14}}>
        <h4 style={{fontSize:12,fontWeight:700,marginBottom:10}}>📋 Template Performance</h4>
        {insights.templateRanked.length===0&&<div style={{fontSize:11,color:"var(--text3)"}}>No template data yet. Select templates when logging outreach.</div>}
        {insights.templateRanked.map((t,i)=>{
          const tmpl=TEMPLATES.find(x=>x.id===t.template);
          return(<div key={t.template} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<insights.templateRanked.length-1?"1px solid var(--border)":"none"}}>
            <span className="ai-badge" style={{fontSize:9}}>{t.template}</span>
            <span style={{fontSize:11,flex:1}}>{tmpl?.name||t.template}</span>
            <span style={{fontSize:11,fontWeight:700,color:Number(t.rate)>=50?"var(--green)":"var(--text2)"}}>{t.rate}%</span>
            <span style={{fontSize:10,color:"var(--text4)"}}>({t.total})</span>
          </div>);
        })}
      </div>
    </div>

    {/* Tier analysis */}
    <div style={{marginTop:12,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:14}}>
      <h4 style={{fontSize:12,fontWeight:700,marginBottom:10}}>🎯 Tier Conversion Rates</h4>
      <div style={{display:"flex",gap:16}}>
        {Object.entries(insights.byTier).sort().map(([tier,d])=>{
          const rate=d.total>0?(d.positive/d.total*100).toFixed(0):0;
          return(<div key={tier} style={{flex:1,textAlign:"center",padding:8,background:"var(--surface)",borderRadius:"var(--radius)"}}>
            <div style={{fontSize:16,fontWeight:800,color:Number(rate)>=40?"var(--green)":"var(--accent)"}}>{rate}%</div>
            <div style={{fontSize:11,fontWeight:600}}>{tier}</div>
            <div style={{fontSize:10,color:"var(--text4)"}}>{d.positive}/{d.total} successful</div>
          </div>);
        })}
      </div>
    </div>

    {/* AI recommendations based on data */}
    <div style={{marginTop:12,padding:14,background:"var(--purple-soft)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"var(--radius-lg)"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <span className="ai-badge">⚡ AI</span>
        <span style={{fontSize:12,fontWeight:700}}>Data-Driven Recommendations</span>
      </div>
      <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.8}}>
        {insights.channelRanked[0]&&<div>• <strong>Best channel:</strong> {insights.channelRanked[0].channel} ({insights.channelRanked[0].rate}% success rate from {insights.channelRanked[0].total} attempts)</div>}
        {insights.templateRanked[0]&&<div>• <strong>Best template:</strong> {TEMPLATES.find(t=>t.id===insights.templateRanked[0].template)?.name||insights.templateRanked[0].template} ({insights.templateRanked[0].rate}% conversion)</div>}
        {insights.avgResp&&<div>• <strong>Avg response time:</strong> {insights.avgResp} days — {Number(insights.avgResp)<=3?"fast responders, follow up quickly":"be patient but persistent"}</div>}
        {Number(insights.successRate)<20&&<div>• <strong>Low conversion:</strong> Consider warmer intros through your network (🕸️ Network tab) rather than cold outreach</div>}
        {Number(insights.successRate)>=40&&<div>• <strong>Strong conversion:</strong> Your outreach is working well — scale up volume on your best channel</div>}
      </div>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: OutreachCoach — AI-driven outreach intelligence
// ============================================================
function OutreachCoach({donors,acts,graphData,graphContacts,apiKey,outreachLog,onLogOutreach}){
  const[tab,setTab]=useState("recommendations");
  const[loading,setLoading]=useState(false);
  const[recommendations,setRecommendations]=useState(null);
  const[selectedDonor,setSelectedDonor]=useState(null);
  const[coachResponse,setCoachResponse]=useState("");

  // ---- Outreach scoring model ----
  // Analyzes all signals to produce a prioritized outreach list
  const computeOutreachScores=useMemo(()=>{
    return donors.map(d=>{
      const did=d.id||d.name;
      const donorActs=acts.filter(a=>a.did===did||a.did===String(did));
      const eng=aiScore(d,acts);
      const ask=aiAsk(d);
      const tmpl=aiTemplate(d);
      const stgIdx=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));

      // Graph signals
      const graphPath=graphData?.donorPaths?.[did];
      const hops=graphPath?.hops||99;
      const hasDirectMatch=graphData?.matchedDonorIds?.has(did)||graphData?.matchedDonorIds?.has(Number(did));

      // Recency: days since last activity
      const lastAct=donorActs.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      const daysSinceContact=lastAct?Math.floor((Date.now()-new Date(lastAct.date))/864e5):999;

      // Outreach score formula:
      // Higher = should reach out sooner
      let score=0;

      // Tier weight (T1 donors are 3x priority)
      const tierMult=d.tier==="Tier 1"?3:d.tier==="Tier 2"?2:1;
      score+=tierMult*10;

      // Pipeline stage: earlier stages need more outreach
      if(stgIdx<=1)score+=25; // Not started / Researching — need first touch
      else if(stgIdx<=3)score+=15; // Intro/Email drafted — need follow up
      else if(stgIdx<=5)score+=10; // Sent/Responded — maintain momentum
      else if(stgIdx<=7)score+=20; // Meeting — critical to close
      // Commitment = low priority for outreach

      // Warmth decay: if warm but not contacted recently, urgent
      const warmth=parseInt(d.warmth_score||0);
      if(warmth>=6&&daysSinceContact>14)score+=20;
      if(warmth>=4&&daysSinceContact>30)score+=15;
      if(daysSinceContact>60&&stgIdx>0&&stgIdx<9)score+=10; // Going cold

      // Network proximity: closer = easier outreach
      if(hops===1)score+=15; // Direct contact
      else if(hops===2)score+=10; // One intro
      else if(hops<=3)score+=5;

      // Direct match bonus
      if(hasDirectMatch)score+=20;

      // Net worth factor
      const nw=parseInt(d.net_worth||0);
      if(nw>=1e8)score+=10;else if(nw>=5e7)score+=5;

      // Engagement momentum
      if(eng>=60)score+=5;

      // Best channel recommendation
      let channel="email";
      let channelReason="Default outreach channel";
      if(hasDirectMatch||hops===1){
        if(d.phone){channel="whatsapp";channelReason="Direct contact with phone — personal touch"}
        else{channel="email";channelReason="Direct contact but no phone — use email"}
      }else if(hops===2){
        channel="intro";channelReason=`Request intro through ${graphPath?.path?.[0]?.nodeId?graphContacts.find(c=>c.id===graphPath.path[0].nodeId)?.name||"connector":"connector"}`;
      }
      if(stgIdx>=6){channel="meeting";channelReason="Meeting stage — schedule in-person or Zoom"}

      // Next action recommendation
      let nextAction="Research & prepare first touch";
      if(stgIdx===0)nextAction="Research donor background, prepare personalized email";
      else if(stgIdx===1)nextAction=hops<=2?"Request warm intro through connector":"Draft personalized outreach email";
      else if(stgIdx===2)nextAction="Follow up on intro request";
      else if(stgIdx===3)nextAction="Send the drafted email";
      else if(stgIdx===4)nextAction=daysSinceContact>7?"Follow up — no response in "+daysSinceContact+" days":"Wait for response (sent "+daysSinceContact+" days ago)";
      else if(stgIdx===5)nextAction="Schedule a meeting — they responded!";
      else if(stgIdx===6)nextAction="Prepare meeting materials + ask amount";
      else if(stgIdx===7)nextAction="Send proposal with specific ask: "+fmt$(ask);
      else if(stgIdx===8)nextAction="Follow up on proposal — push for commitment";
      else nextAction="Steward relationship, plan next gift cycle";

      // Urgency classification
      let urgency="low";
      if(score>=60)urgency="critical";
      else if(score>=40)urgency="high";
      else if(score>=25)urgency="medium";

      return{
        donor:d,donorId:did,score,urgency,
        engagement:eng,ask,template:tmpl,
        hops,hasDirectMatch,
        daysSinceContact,lastActivity:lastAct,
        channel,channelReason,nextAction,
        stageIdx:stgIdx,warmth,tierMult
      };
    }).sort((a,b)=>b.score-a.score);
  },[donors,acts,graphData,graphContacts]);

  // -- Top priorities --
  const topPriorities=computeOutreachScores.filter(s=>s.urgency==="critical"||s.urgency==="high").slice(0,20);
  const staleOutreach=computeOutreachScores.filter(s=>s.daysSinceContact>30&&s.daysSinceContact<999&&s.stageIdx>0&&s.stageIdx<9);
  const readyToClose=computeOutreachScores.filter(s=>s.stageIdx>=5&&s.stageIdx<=8);

  // -- AI Coach: Generate personalized strategy --
  const getAIStrategy=async(donor)=>{
    if(!apiKey){setCoachResponse("Set API key in Settings first.");return}
    setLoading(true);setSelectedDonor(donor);setCoachResponse("");
    const entry=computeOutreachScores.find(s=>s.donorId===(donor.id||donor.name));
    const path=graphData?.donorPaths?.[donor.id||donor.name];
    const pathDesc=path?path.path.map(p=>{
      const name=graphContacts.find(c=>c.id===p.nodeId)?.name||p.nodeId;
      return name;
    }).join(" → "):"No known path";

    const donorActs=acts.filter(a=>a.did===(donor.id||donor.name)||a.did===String(donor.id));
    const actHistory=donorActs.slice(-5).map(a=>`${a.type}: "${a.summary}" (${fmtD(a.date)})`).join("\n");

    const prompt=`You are an elite Jewish philanthropic fundraising strategist. Analyze this donor and provide a specific, actionable outreach strategy.

DONOR PROFILE:
- Name: ${donor.name}
- Tier: ${donor.tier} | Net Worth: ${fmt$(donor.net_worth)} | Annual Giving: ${fmt$(donor.annual_giving)}
- Community: ${donor.community||"Unknown"} | City: ${donor.city||"Unknown"}
- Industry: ${donor.industry||"Unknown"} | Foundation: ${donor.foundation||"Unknown"}
- Current Stage: ${STAGES[entry?.stageIdx||0]?.label} | Warmth: ${donor.warmth_score||0}/10
- Focus Areas: ${(donor.focus_areas||[]).join(", ")||"Unknown"}
- Custom Hook: ${donor.custom_hook||"None"}
- Engagement Score: ${entry?.engagement||0}/100

NETWORK PATH (You → Donor):
${pathDesc}
Hops: ${entry?.hops||"Unknown"} | Direct Match: ${entry?.hasDirectMatch?"Yes":"No"}

ACTIVITY HISTORY:
${actHistory||"No previous activities"}

Days since last contact: ${entry?.daysSinceContact===999?"Never contacted":entry?.daysSinceContact+" days"}

CAMPAIGN CONTEXT:
- Organization: ${getActiveOrg().name} — ${getActiveOrg().tagline||"Jewish nonprofit"}
${(()=>{const p=getOrgProfile();return p.mission?"- Mission: "+p.mission:"- Set up org profile in Admin for personalized coaching"})()}
- Asking for: ${fmt$(entry?.ask||25000)}
- Best template: ${TEMPLATES.find(t=>t.id===entry?.template)?.name||"Cold"}

Provide:
1. OPENING STRATEGY (3-4 sentences): How to approach this specific donor
2. KEY HOOKS: What will resonate most with THIS person
3. INTRO PATH: How to leverage the network path above
4. SUGGESTED MESSAGE (150 words): Draft the actual first message
5. FOLLOW-UP CADENCE: Specific timeline with channels
6. RISK FACTORS: What could go wrong and how to mitigate`;

    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:2048,
        messages:[{role:"user",content:prompt}]
      })});
      if(!res.ok)throw new Error(`API ${res.status}: ${await res.text()}`);
      const data=await res.json();
      setCoachResponse(data.content?.[0]?.text||"No response");
    }catch(e){setCoachResponse("Error: "+e.message)}
    finally{setLoading(false)}
  };

  const urgencyColor={critical:"var(--red)",high:"var(--accent)",medium:"var(--blue)",low:"var(--text4)"};
  const urgencyBg={critical:"var(--red-soft)",high:"var(--accent-soft)",medium:"var(--blue-soft)",low:"var(--surface2)"};
  const channelIcon={email:"✉️",whatsapp:"💬",intro:"🤝",meeting:"📅",call:"📞"};

  return(<div className="content-scroll" style={{padding:20}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:700}}>🧠 AI Outreach Coach</h2>
      <span style={{fontSize:12,color:"var(--text3)"}}>AI-driven recommendations that learn from every interaction</span>
    </div>

    {/* Summary stats */}
    <div className="net-stats" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--red)"}}>{computeOutreachScores.filter(s=>s.urgency==="critical").length}</div><div className="ns-lbl">Critical</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--accent)"}}>{topPriorities.length}</div><div className="ns-lbl">High Priority</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--blue)"}}>{staleOutreach.length}</div><div className="ns-lbl">Going Stale</div></div>
      <div className="net-stat"><div className="ns-val" style={{color:"var(--green)"}}>{readyToClose.length}</div><div className="ns-lbl">Ready to Close</div></div>
    </div>

    {/* Sub-tabs */}
    <div className="sub-nav" style={{marginBottom:16,padding:0}}>
      <div className={"sub-tab "+(tab==="recommendations"?"active":"")} onClick={()=>setTab("recommendations")}>🎯 Priority Queue</div>
      <div className={"sub-tab "+(tab==="stale"?"active":"")} onClick={()=>setTab("stale")}>⚠️ Going Stale <span className="count">{staleOutreach.length}</span></div>
      <div className={"sub-tab "+(tab==="closing"?"active":"")} onClick={()=>setTab("closing")}>🏆 Ready to Close <span className="count">{readyToClose.length}</span></div>
      <div className={"sub-tab "+(tab==="coach"?"active":"")} onClick={()=>setTab("coach")}>🧠 AI Strategy</div>
      <div className={"sub-tab "+(tab==="learning"?"active":"")} onClick={()=>setTab("learning")}>📈 Learning Loop <span className="count">{outreachLog.length}</span></div>
    </div>

    {/* ===== PRIORITY QUEUE ===== */}
    {(tab==="recommendations"||tab==="stale"||tab==="closing")&&<div>
      {(tab==="recommendations"?topPriorities:tab==="stale"?staleOutreach:readyToClose).map((entry,i)=>{
        const{donor,score,urgency,engagement,ask,hops,hasDirectMatch,daysSinceContact,channel,channelReason,nextAction}=entry;
        const stg=STAGES[entry.stageIdx];
        return(<div key={i} style={{display:"flex",gap:12,padding:"14px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",marginBottom:6,alignItems:"flex-start"}}>
          {/* Rank */}
          <div style={{width:28,height:28,borderRadius:"50%",background:urgencyBg[urgency],color:urgencyColor[urgency],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</div>

          {/* Main info */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:700}}>{donor.name}</span>
              <span className={"cell-tier "+(TIERS[donor.tier]?.cls||"t3")} style={{fontSize:10}}>{TIERS[donor.tier]?.label||"T3"}</span>
              <span className="cell-stage" style={{background:(stg?.color||"#52525b")+"20",color:stg?.color,fontSize:10}}>● {stg?.label}</span>
              <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:urgencyBg[urgency],color:urgencyColor[urgency],fontWeight:700,textTransform:"uppercase"}}>{urgency}</span>
              {hasDirectMatch&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"var(--green-soft)",color:"var(--green)",fontWeight:600}}>Direct Contact</span>}
              {hops<=3&&hops<99&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"var(--blue-soft)",color:"var(--blue)",fontWeight:600}}>{hops} hop{hops>1?"s":""}</span>}
            </div>

            {/* Next action */}
            <div style={{fontSize:12,color:"var(--text)",marginBottom:6,fontWeight:500}}>
              <span style={{color:"var(--accent)"}}>→</span> {nextAction}
            </div>

            {/* Meta row */}
            <div style={{display:"flex",gap:12,fontSize:11,color:"var(--text3)",flexWrap:"wrap"}}>
              <span>{channelIcon[channel]||"📧"} {channelReason}</span>
              <span>💰 Ask: {fmt$(ask)}</span>
              {daysSinceContact<999&&<span>📅 {daysSinceContact}d ago</span>}
              <span>📊 Eng: {engagement}</span>
            </div>
          </div>

          {/* Score + actions */}
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:20,fontWeight:800,color:urgencyColor[urgency]}}>{score}</div>
            <div style={{fontSize:9,color:"var(--text4)",textTransform:"uppercase"}}>Priority</div>
            <button className="btn btn-ghost btn-sm" style={{marginTop:6,fontSize:10}} onClick={()=>{setSelectedDonor(donor);setTab("coach");getAIStrategy(donor)}}>🧠 Strategy</button>
          </div>
        </div>);
      })}
      {(tab==="recommendations"?topPriorities:tab==="stale"?staleOutreach:readyToClose).length===0&&<div className="empty-state"><div className="empty-icon">{tab==="stale"?"✅":"🎯"}</div><h3>{tab==="stale"?"No stale outreach — nice!":"No donors in this category"}</h3></div>}
    </div>}

    {/* ===== AI STRATEGY COACH ===== */}
    {tab==="coach"&&<div>
      {!selectedDonor&&<div>
        <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Select a donor for AI-powered outreach strategy. The coach analyzes their profile, network path, activity history, and campaign context.</p>
        <select className="form-select" onChange={e=>{
          const d=donors.find(dd=>(dd.id||dd.name)==e.target.value||(dd.id||dd.name)==Number(e.target.value));
          if(d){setSelectedDonor(d);getAIStrategy(d)}
        }} style={{maxWidth:400,marginBottom:16}}>
          <option value="">Choose a donor...</option>
          {computeOutreachScores.slice(0,50).map(s=><option key={s.donorId} value={s.donorId}>{s.donor.name} — {s.urgency} priority (score: {s.score})</option>)}
        </select>
      </div>}

      {selectedDonor&&<div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{setSelectedDonor(null);setCoachResponse("")}}>← Back</button>
          <h3 style={{fontSize:15,fontWeight:700}}>Strategy for {selectedDonor.name}</h3>
          {loading&&<span style={{fontSize:12,color:"var(--accent)"}}>⏳ Generating strategy...</span>}
          {!loading&&coachResponse&&<button className="btn btn-ghost btn-sm" onClick={()=>getAIStrategy(selectedDonor)}>🔄 Regenerate</button>}
        </div>

        {/* Donor quick stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:16}}>
          {[
            {l:"Tier",v:selectedDonor.tier||"—",c:"var(--accent)"},
            {l:"Net Worth",v:fmt$(selectedDonor.net_worth),c:"var(--green)"},
            {l:"Ask",v:fmt$(aiAsk(selectedDonor)),c:"var(--blue)"},
            {l:"Warmth",v:(selectedDonor.warmth_score||0)+"/10",c:"var(--accent)"},
            {l:"Engagement",v:aiScore(selectedDonor,acts)+"/100",c:"var(--purple)"},
            {l:"Hops",v:graphData?.donorPaths?.[selectedDonor.id||selectedDonor.name]?.hops||"?",c:"var(--cyan)"},
          ].map((s,i)=><div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:8,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:9,color:"var(--text4)",textTransform:"uppercase"}}>{s.l}</div>
          </div>)}
        </div>

        {/* AI Response */}
        {coachResponse&&<div style={{background:"var(--surface)",border:"1px solid var(--purple)",borderRadius:"var(--radius-lg)",padding:20}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
            <span className="ai-badge">⚡ Claude Sonnet 4</span>
            <span style={{fontSize:11,color:"var(--text3)"}}>AI Outreach Strategy</span>
          </div>
          <div style={{fontSize:13,lineHeight:1.8,color:"var(--text2)",whiteSpace:"pre-wrap"}}>{coachResponse}</div>
        </div>}

        {loading&&<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,marginBottom:8}}>🧠</div><p style={{color:"var(--text3)"}}>Analyzing donor profile, network graph, and campaign context...</p></div>}
      </div>}
    </div>}

    {/* ===== LEARNING LOOP TAB ===== */}
    {tab==="learning"&&<div>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>
        Track every outreach attempt and its outcome. The AI learns from your patterns to improve future recommendations.
      </p>

      {/* Log new outreach */}
      <OutreachLogger donors={donors} onLog={onLogOutreach}/>

      {/* Learning insights from logged data */}
      {outreachLog.length>0&&<div style={{marginTop:20}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>📊 Learning Insights</h3>
        <LearningInsights outreachLog={outreachLog} donors={donors}/>
      </div>}

      {/* Outreach history table */}
      <div style={{marginTop:20}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>📋 Outreach History ({outreachLog.length} logged)</h3>
        {outreachLog.length===0&&<div className="empty-state" style={{height:200}}><div className="empty-icon">📋</div><h3>No outreach logged yet</h3><p>Log your first outreach above to start training the AI</p></div>}
        {outreachLog.length>0&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
          {[...outreachLog].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,30).map((entry,i)=>{
            const donor=donors.find(d=>(d.id||d.name)===entry.donorId||(d.id||d.name)===Number(entry.donorId));
            const outcomeColors={positive:"var(--green)",neutral:"var(--text3)",negative:"var(--red)",no_response:"var(--accent)",meeting_set:"var(--blue)",gift_received:"var(--green)"};
            return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid var(--border)",fontSize:12}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:entry.channel==="email"?"var(--blue-soft)":entry.channel==="whatsapp"?"var(--green-soft)":entry.channel==="call"?"var(--accent-soft)":"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>
                {entry.channel==="email"?"✉️":entry.channel==="whatsapp"?"💬":entry.channel==="call"?"📞":entry.channel==="meeting"?"🤝":"📧"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600}}>{donor?.name||entry.donorId}</div>
                <div style={{color:"var(--text3)",fontSize:11}}>{entry.message?.slice(0,80)}{entry.message?.length>80?"...":""}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:(outcomeColors[entry.outcome]||"var(--text4)")+"20",color:outcomeColors[entry.outcome]||"var(--text4)",fontWeight:600,textTransform:"uppercase"}}>{(entry.outcome||"pending").replace(/_/g," ")}</span>
                <span style={{fontSize:10,color:"var(--text4)"}}>{fmtD(entry.date)}</span>
              </div>
              {entry.response_time&&<div style={{fontSize:10,color:"var(--text3)",minWidth:50,textAlign:"right"}}>{entry.response_time}d resp</div>}
            </div>);
          })}
        </div>}
      </div>
    </div>}
  </div>);
}

// ============================================================
// COMPONENT: CampaignManager — multi-campaign tracking system
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
  {id:"israelgives",name:"IsraelGives",icon:"🇮🇱",type:"csv",desc:"CSV/XML import from IsraelGives exports",fields:[],status:"active",help:"Export donors from IsraelGives → Data Export → CSV, then upload here"},
  {id:"donorbox",name:"Donorbox",icon:"📦",type:"api",desc:"REST API integration ($17/mo plan)",fields:["api_key"],status:"active",help:"Get API key from Donorbox → Settings → API. Requires paid plan."},
  {id:"charidy",name:"Charidy",icon:"💝",type:"api",desc:"Campaign donation data via API",fields:["api_key","campaign_id"],status:"coming_soon",help:"Contact support@charidy.com for API access"},
  {id:"givebutter",name:"Givebutter",icon:"🧈",type:"api",desc:"Public API with 1000+ Zapier integrations",fields:["api_key"],status:"coming_soon",help:"Get API key from Givebutter → Settings → Developer"},
  {id:"chesed_fund",name:"The Chesed Fund",icon:"🤲",type:"csv",desc:"Manual CSV export (no API available)",fields:[],status:"active",help:"Download your donor list from The Chesed Fund dashboard as CSV"},
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
      // Auto-map common column names
      const nameCol=headers.findIndex(h=>/^(name|full.?name|donor.?name|שם)/i.test(h));
      const emailCol=headers.findIndex(h=>/^(email|e-?mail|דוא"ל)/i.test(h));
      const phoneCol=headers.findIndex(h=>/^(phone|tel|טלפון)/i.test(h));
      const amtCol=headers.findIndex(h=>/^(amount|donation|sum|סכום)/i.test(h));
      const cityCol=headers.findIndex(h=>/^(city|עיר)/i.test(h));
      if(nameCol===-1){setUploadResult({error:"No 'name' column found. Headers: "+headers.join(", ")});setUploading(false);return}
      const imported=[];
      rows.forEach((row,i)=>{
        const name=(row[nameCol]||"").trim();
        if(!name)return;
        const donor={id:Date.now()+i,name,pipeline_stage:"not_started"};
        if(emailCol>=0&&row[emailCol])donor.email=row[emailCol].trim();
        if(phoneCol>=0&&row[phoneCol])donor.phone=row[phoneCol].trim();
        if(amtCol>=0&&row[amtCol])donor.annual_giving=parseInt(row[amtCol].replace(/[$,₪]/g,""))||0;
        if(cityCol>=0&&row[cityCol])donor.city=row[cityCol].trim();
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
function OnboardingWizard({onComplete,onSkip}){
  const[step,setStep]=useState(0); // 0=welcome, 1=org, 2=ai_research, 3=data, 4=api, 5=done
  const[orgName,setOrgName]=useState("");
  const[orgTagline,setOrgTagline]=useState("");
  const[orgLogo,setOrgLogo]=useState("");
  const[orgWebsite,setOrgWebsite]=useState("");
  const[orgType,setOrgType]=useState("yeshiva");
  const[orgMission,setOrgMission]=useState("");
  const[orgEIN,setOrgEIN]=useState("");
  const[apiKey,setApiKey]=useState("");
  const[aiProv,setAiProv]=useState("anthropic");
  const[pplxK,setPplxK]=useState("");
  const[dataChoice,setDataChoice]=useState("demo");
  // AI Research state
  const[researching,setResearching]=useState(false);
  const[researchProgress,setResearchProgress]=useState("");
  const[orgProfile,setOrgProfile]=useState(null);
  const[researchErr,setResearchErr]=useState("");

  const steps=["Welcome","Organization","AI Research","Data","AI Key","Ready"];

  const runResearch=async()=>{
    const activeKey=aiProv==="perplexity"?pplxK:apiKey;
    if(!activeKey){setResearchErr("Enter an API key first (step 5) or skip this step.");return}
    setResearching(true);setResearchErr("");
    setResearchProgress("Analyzing organization...");
    try{
      setTimeout(()=>setResearchProgress("Scanning public records & 990 data..."),2000);
      setTimeout(()=>setResearchProgress("Extracting cause keywords & demographics..."),4000);
      setTimeout(()=>setResearchProgress("Building talking points & donor brief..."),6000);
      const profile=await aiResearchOrg(orgName,orgWebsite,orgType,orgMission,aiProv,apiKey,pplxK);
      setOrgProfile(profile);
      setResearchProgress("✅ Research complete!");
    }catch(e){setResearchErr(e.message);setResearchProgress("")}
    finally{setResearching(false)}
  };

  const finish=()=>{
    const org={
      id:orgName.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")||"my_org",
      name:orgName||"My Organization",
      tagline:orgTagline,logo:orgLogo.slice(0,2).toUpperCase(),
      website:orgWebsite,org_type:orgType,ein:orgEIN,
      mission:orgMission||orgProfile?.mission||"",
      currency:"USD",created:new Date().toISOString()
    };
    // Save org profile if AI research was done
    if(orgProfile){
      // Will be saved under org prefix after org is set active
      setTimeout(()=>setOrgProfileStore(orgProfile),500);
    }
    onComplete({org,apiKey,pplxKey:pplxK,aiProvider:aiProv,dataChoice});
  };

  return(<div className="wizard-overlay">
    <div className="wizard-card" style={{width:720}}>
      <div className="wizard-steps">
        {steps.map((s,i)=>(
          <div key={i} className={"wizard-step"+(i===step?" active":"")+(i<step?" done":"")}>
            {i<step?"✓":i+1}. {s}
          </div>
        ))}
      </div>

      <div className="wizard-body">
        {/* Step 0: Welcome */}
        {step===0&&<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:48,marginBottom:12}}>⚡</div>
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:8}}>Welcome to AI-Native CRM</h2>
          <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.7,maxWidth:460,margin:"0 auto"}}>
            The most intelligent fundraising platform ever built. AI researches your organization, scores donors by cause match, and powers personalized outreach at scale.
          </p>
          <div style={{marginTop:20,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {["🧠 AI Org Research","🎯 Cause Match","✉️ Smart Email","🕸️ Social Graph","💬 WhatsApp","📊 Analytics","🔌 Integrations"].map(f=>(
              <span key={f} style={{padding:"4px 10px",borderRadius:20,background:"var(--surface2)",fontSize:11,color:"var(--text2)"}}>{f}</span>
            ))}
          </div>
        </div>}

        {/* Step 1: Organization — expanded with website, type, mission */}
        {step===1&&<div>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Set Up Your Organization</h3>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <div className="form-group"><label className="form-label">Organization Name *</label>
              <input className="form-input" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="e.g., Temple Beth Israel"/></div>
            <div className="form-group"><label className="form-label">Logo Initials</label>
              <input className="form-input" value={orgLogo} onChange={e=>setOrgLogo(e.target.value.slice(0,2))} maxLength={2} style={{textAlign:"center",fontSize:18,fontWeight:800}}/></div>
          </div>
          <div className="form-group"><label className="form-label">Tagline</label>
            <input className="form-input" value={orgTagline} onChange={e=>setOrgTagline(e.target.value)} placeholder="e.g., Haifa Hesder Yeshiva"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div className="form-group"><label className="form-label">Website URL</label>
              <input className="form-input" value={orgWebsite} onChange={e=>setOrgWebsite(e.target.value)} placeholder="https://yourorg.org"/></div>
            <div className="form-group"><label className="form-label">Organization Type</label>
              <select className="form-select" value={orgType} onChange={e=>setOrgType(e.target.value)}>
                {ORG_TYPES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <div className="form-group"><label className="form-label">Mission Statement (optional — AI can generate this)</label>
              <textarea className="form-textarea" value={orgMission} onChange={e=>setOrgMission(e.target.value)} placeholder="What does your organization do? Who do you serve?" style={{minHeight:60}}/></div>
            <div className="form-group"><label className="form-label">EIN (optional)</label>
              <input className="form-input" value={orgEIN} onChange={e=>setOrgEIN(e.target.value)} placeholder="XX-XXXXXXX"/>
              <div style={{fontSize:10,color:"var(--text4)",marginTop:4}}>For public 990 donor lookup</div></div>
          </div>
        </div>}

        {/* Step 2: AI Research — the WOW moment */}
        {step===2&&<div>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:8}}>🧠 AI Organization Research</h3>
          <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Our AI will deeply research <strong>{orgName||"your organization"}</strong> — analyzing mission, programs, known donors, previous campaigns, and building personalized talking points for your outreach.</p>

          {!orgProfile&&!researching&&<>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:20,textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>🔍</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Research {orgName||"Organization"}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginBottom:12}}>
                {orgWebsite?`AI will research ${orgWebsite} and public records`:"Add a website in step 2 for deeper results"}
              </div>
              <button className="btn btn-primary" onClick={runResearch}>⚡ Run AI Research</button>
              {researchErr&&<div style={{marginTop:8,fontSize:12,color:"var(--red)"}}>{researchErr}</div>}
            </div>
            <div style={{fontSize:11,color:"var(--text4)",textAlign:"center"}}>No API key yet? Skip this step and run research later from Admin → Org Profile</div>
          </>}

          {researching&&<div style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:48,marginBottom:12,animation:"spin 2s linear infinite"}}>🧠</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{researchProgress}</div>
            <div style={{marginTop:8,fontSize:11,color:"var(--text3)"}}>This takes 10-20 seconds...</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>}

          {orgProfile&&!researching&&<div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:14,color:"var(--green)",fontWeight:700}}>✅ Research Complete</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setOrgProfile(null);setResearchProgress("")}}>Re-run</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10}}>
                <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Mission</div>
                <div style={{fontSize:12,lineHeight:1.5}}>{orgProfile.mission||"—"}</div>
              </div>
              <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10}}>
                <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Vision</div>
                <div style={{fontSize:12,lineHeight:1.5}}>{orgProfile.vision||"—"}</div>
              </div>
              <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10}}>
                <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Cause Keywords</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(orgProfile.cause_keywords||[]).map((k,i)=><span key={i} style={{padding:"2px 6px",borderRadius:10,background:"var(--accent-soft)",color:"var(--accent)",fontSize:10,fontWeight:600}}>{k}</span>)}
                </div>
              </div>
              <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10}}>
                <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Key Programs</div>
                <div style={{fontSize:11}}>{(orgProfile.key_programs||[]).join(" • ")||"—"}</div>
              </div>
              <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10,gridColumn:"1/-1"}}>
                <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Talking Points for Donors</div>
                <div style={{fontSize:11,lineHeight:1.6}}>{(orgProfile.talking_points||[]).map((tp,i)=><div key={i}>• {tp}</div>)}</div>
              </div>
              {(orgProfile.known_donors_public||[]).length>0&&<div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:10,gridColumn:"1/-1"}}>
                <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",marginBottom:4}}>Known Public Donors</div>
                <div style={{fontSize:11}}>{(orgProfile.known_donors_public||[]).join(" • ")}</div>
              </div>}
            </div>
          </div>}
        </div>}

        {/* Step 3: Data */}
        {step===3&&<div>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Load Your Donor Data</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[
              {id:"demo",icon:"🎮",title:"Demo Data",desc:"25 sample donors to explore features"},
              {id:"json",icon:"📁",title:"JSON Upload",desc:"Import from existing CRM export"},
              {id:"csv",icon:"📊",title:"CSV Upload",desc:"Import from spreadsheet or other CRM"},
              {id:"empty",icon:"✨",title:"Start Empty",desc:"Add donors manually one by one"},
            ].map(opt=>(
              <div key={opt.id} onClick={()=>setDataChoice(opt.id)} style={{
                padding:16,borderRadius:"var(--radius-lg)",border:"2px solid "+(dataChoice===opt.id?"var(--accent)":"var(--border)"),
                background:dataChoice===opt.id?"var(--accent-soft)":"var(--surface)",cursor:"pointer",transition:"all .15s"
              }}>
                <div style={{fontSize:24,marginBottom:6}}>{opt.icon}</div>
                <div style={{fontSize:13,fontWeight:700}}>{opt.title}</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>}

        {/* Step 4: AI Key — supports Anthropic + Perplexity */}
        {step===4&&<div>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:8}}>AI Engine Setup</h3>
          <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Powers email generation, donor briefs, org research, and outreach coaching. You can change this later in Settings.</p>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[{id:"anthropic",label:"Anthropic (Claude)",icon:"🟠"},{id:"perplexity",label:"Perplexity",icon:"🔵"}].map(p=>(
              <div key={p.id} onClick={()=>setAiProv(p.id)} style={{flex:1,padding:12,borderRadius:"var(--radius)",border:"2px solid "+(aiProv===p.id?"var(--accent)":"var(--border)"),background:aiProv===p.id?"var(--accent-soft)":"var(--surface)",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:20}}>{p.icon}</div>
                <div style={{fontSize:12,fontWeight:700}}>{p.label}</div>
              </div>
            ))}
          </div>
          {aiProv==="anthropic"&&<div className="form-group"><label className="form-label">Anthropic API Key</label>
            <input className="form-input" type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-api03-..."/>
            <div style={{fontSize:10,color:"var(--text4)",marginTop:4}}>console.anthropic.com → API Keys</div></div>}
          {aiProv==="perplexity"&&<div className="form-group"><label className="form-label">Perplexity API Key</label>
            <input className="form-input" type="password" value={pplxK} onChange={e=>setPplxK(e.target.value)} placeholder="pplx-..."/>
            <div style={{fontSize:10,color:"var(--text4)",marginTop:4}}>perplexity.ai → Settings → API</div></div>}
          <div style={{fontSize:11,color:"var(--text3)",marginTop:8}}>Your key stays in your browser only. Never sent anywhere except the provider's API.</div>
        </div>}

        {/* Step 5: Done */}
        {step===5&&<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:48,marginBottom:12}}>🚀</div>
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:8}}>You're All Set!</h2>
          <p style={{fontSize:13,color:"var(--text2)"}}>
            <strong>{orgName||"Your CRM"}</strong> is ready.{orgProfile?" AI research loaded.":" "} Start by exploring the Dashboard, adding donors, or importing your contact network.
          </p>
          {orgProfile&&<div style={{marginTop:12,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {(orgProfile.cause_keywords||[]).slice(0,6).map((k,i)=><span key={i} style={{padding:"2px 8px",borderRadius:10,background:"var(--accent-soft)",color:"var(--accent)",fontSize:10,fontWeight:600}}>{k}</span>)}
          </div>}
        </div>}
      </div>

      <div className="wizard-footer">
        <div>
          {step>0&&step<5&&<button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Back</button>}
          {step===0&&<button className="btn btn-ghost" onClick={onSkip} style={{fontSize:11}}>Skip Setup</button>}
        </div>
        <div style={{display:"flex",gap:8}}>
          {step===2&&!orgProfile&&!researching&&<button className="btn btn-ghost" onClick={()=>setStep(3)}>Skip Research →</button>}
          {step<5&&step!==2&&<button className="btn btn-primary" onClick={()=>setStep(s=>s+1)}>
            {step===0?"Let's Go →":step===4?"Finish Setup →":"Next →"}
          </button>}
          {step===2&&orgProfile&&<button className="btn btn-primary" onClick={()=>setStep(3)}>Next →</button>}
          {step===5&&<button className="btn btn-primary" onClick={finish}>🚀 Launch CRM</button>}
        </div>
      </div>
    </div>
  </div>);
}

// ============================================================
// COMPONENT: DealsView
// ============================================================
function DealsView({deals,donors,onAdd}){
  const[show,setShow]=useState(false);const[nd,setNd]=useState({did:"",amt:"",stage:"not_started",notes:""});
  return(<div className="content-scroll">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{fontSize:15,fontWeight:700}}>Deals / Gift Opportunities</h3><button className="btn btn-primary" onClick={()=>setShow(!show)}>+ New Deal</button></div>
    {show&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,marginBottom:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div className="form-group"><label className="form-label">Donor</label><select className="form-select" value={nd.did} onChange={e=>setNd(d=>({...d,did:e.target.value}))}><option value="">Select...</option>{donors.map(d=><option key={d.id||d.name} value={d.id||d.name}>{d.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Ask Amount ($)</label><input className="form-input" type="number" value={nd.amt} onChange={e=>setNd(d=>({...d,amt:e.target.value}))} placeholder="50000"/></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button className="btn btn-ghost" onClick={()=>setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>{if(!nd.did||!nd.amt)return;onAdd({...nd,id:Date.now(),amt:parseInt(nd.amt),created:new Date().toISOString()});setNd({did:"",amt:"",stage:"not_started",notes:""});setShow(false)}}>Create</button></div>
    </div>}
    {deals.length===0?<div className="empty-state"><div className="empty-icon">💎</div><h3>No deals yet</h3><p>Create a deal to track gift opportunities</p></div>:
    <table className="list-table"><thead><tr><th>Donor</th><th>Amount</th><th>Stage</th><th>Created</th></tr></thead><tbody>
      {deals.map(deal=>{const donor=donors.find(d=>(d.id||d.name)===deal.did);const stg=STAGES.find(s=>s.id===deal.stage);return(
        <tr key={deal.id}><td><div className="cell-name"><div className="avatar">{initials(donor?.name)}</div>{donor?.name||"Unknown"}</div></td>
          <td className="cell-amount" style={{color:"var(--green)"}}>{fmt$(deal.amt)}</td>
          <td><span className="cell-stage" style={{background:(stg?.color||"#52525b")+"20",color:stg?.color}}>● {stg?.label}</span></td>
          <td style={{fontSize:12,color:"var(--text3)"}}>{fmtD(deal.created)}</td></tr>)})}
    </tbody></table>}
  </div>);
}

// ============================================================
// COMPONENT: WhatsApp Chat Panel (inside donor detail)
// ============================================================
function WhatsAppChat({donor,onLogActivity}){
  const[msgs,setMsgs]=useState([]);const[loading,setLoading]=useState(false);const[err,setErr]=useState("");
  const[newMsg,setNewMsg]=useState("");const[sending,setSending]=useState(false);
  const[bridgeUrl]=useState(()=>sGet("wa_bridge","http://localhost:3001"));
  const[waState,setWaState]=useState("unknown"); // unknown|qr|ready|disconnected
  const scrollRef=useRef();

  // -- Check bridge health + fetch conversation on mount
  useEffect(()=>{
    if(!donor?.phone)return;
    setLoading(true);setErr("");
    // First check WA state
    fetch(`${bridgeUrl}/api/health`).then(r=>r.json()).then(h=>{
      setWaState(h.whatsapp||"unknown");
      if(h.whatsapp!=="ready"){setLoading(false);return}
      // Fetch conversation for this donor
      return fetch(`${bridgeUrl}/api/match/${encodeURIComponent(donor.phone)}`).then(r=>r.json()).then(data=>{
        if(data.matched&&data.conversation){setMsgs(data.conversation.messages||[])}else{setMsgs([])}
      });
    }).catch(()=>{setErr("WhatsApp Bridge offline. Run: node whatsapp_bridge.js");setWaState("disconnected")})
      .finally(()=>setLoading(false));
  },[donor?.phone,bridgeUrl]);

  // -- Auto-scroll to bottom when messages update
  useEffect(()=>{scrollRef.current?.scrollTo(0,scrollRef.current.scrollHeight)},[msgs]);

  // -- Send message via bridge
  const send=async()=>{
    if(!newMsg.trim()||!donor?.phone)return;
    setSending(true);
    try{
      const res=await fetch(`${bridgeUrl}/api/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:donor.phone,message:newMsg})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Send failed");
      setMsgs(p=>[...p,{id:data.message_id,from:"me",direction:"outgoing",timestamp:new Date().toISOString(),type:"chat",text:newMsg,status:"sent"}]);
      onLogActivity({did:donor.id||donor.name,type:"whatsapp",summary:`WhatsApp sent: "${newMsg.slice(0,60)}${newMsg.length>60?"...":""}"`,date:new Date().toISOString()});
      setNewMsg("");
    }catch(e){setErr(e.message)}finally{setSending(false)}
  };

  const chatTime=(ts)=>{if(!ts)return"";const d=new Date(ts);return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})};
  const connected=waState==="ready";

  return(<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    {/* Status bar */}
    <div style={{padding:"8px 0",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:connected?"var(--green)":waState==="qr"?"var(--accent)":"var(--red)"}}/>
      <span style={{fontSize:11,color:connected?"var(--green)":waState==="qr"?"var(--accent)":"var(--red)"}}>
        {connected?"Connected":waState==="qr"?"Scan QR Code":waState==="authenticated"?"Connecting...":"Offline"}
      </span>
      {connected&&<span style={{fontSize:11,color:"var(--text4)",marginLeft:"auto"}}>{msgs.length} messages</span>}
    </div>

    {waState==="qr"&&<div style={{background:"var(--accent-soft)",color:"var(--accent)",padding:"8px 12px",borderRadius:"var(--radius-sm)",marginBottom:8,fontSize:11}}>
      WhatsApp needs QR authentication. Go to the WhatsApp tab to scan the QR code.
    </div>}

    {err&&<div style={{background:"var(--red-soft)",color:"var(--red)",padding:"8px 12px",borderRadius:"var(--radius-sm)",marginBottom:8,fontSize:11}}>{err}</div>}
    {loading&&<div style={{textAlign:"center",padding:20,color:"var(--text3)",fontSize:12}}>Loading...</div>}

    {/* Messages */}
    <div ref={scrollRef} style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:8,paddingRight:4}}>
      {!loading&&msgs.length===0&&connected&&<div style={{textAlign:"center",padding:20,color:"var(--text3)",fontSize:12}}>No WhatsApp messages with {donor?.name||"this donor"}</div>}
      {msgs.map((m,i)=>{
        const isMe=m.direction==="outgoing"||m.from==="me";
        return(<div key={m.id||i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"75%",padding:"8px 12px",borderRadius:isMe?"12px 12px 4px 12px":"12px 12px 12px 4px",background:isMe?"#075e54":"var(--surface2)",color:"var(--text)",fontSize:13,lineHeight:1.5}}>
            <div>{m.text||m.caption||`[${m.type}]`}</div>
            <div style={{fontSize:9,color:"var(--text4)",textAlign:"right",marginTop:2}}>{chatTime(m.timestamp)} {isMe&&(m.status==="read"?"✓✓":"✓")}</div>
          </div>
        </div>);
      })}
    </div>

    {/* Input */}
    {connected&&donor?.phone&&<div style={{display:"flex",gap:6}}>
      <input className="form-input" value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder="Type a message..."
        onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} style={{flex:1,padding:"8px 12px"}}/>
      <button className="btn btn-primary btn-sm" onClick={send} disabled={sending||!newMsg.trim()}>
        {sending?"...":"Send"}
      </button>
    </div>}
    {!donor?.phone&&<div style={{fontSize:11,color:"var(--text4)",textAlign:"center",padding:8}}>No phone number on file for this donor</div>}
  </div>);
}

// ============================================================
// COMPONENT: WhatsApp Hub — QR Auth + Sync + Conversations + Import
// ============================================================
function WhatsAppHub({donors,onLogActivities}){
  const[bridgeUrl]=useState(()=>sGet("wa_bridge","http://localhost:3001"));
  const[waState,setWaState]=useState("unknown");
  const[health,setHealth]=useState(null);
  const[qrImg,setQrImg]=useState(null);
  const[convos,setConvos]=useState([]);
  const[syncing,setSyncing]=useState(false);
  const[syncResult,setSyncResult]=useState(null);
  const[tab,setTab]=useState("connect"); // connect | conversations | import
  // Import state
  const[impPhone,setImpPhone]=useState("");const[impName,setImpName]=useState("");
  const[impText,setImpText]=useState("");const[impResult,setImpResult]=useState(null);

  // -- Poll for status (especially during QR phase)
  const checkHealth=useCallback(async()=>{
    try{
      const r=await fetch(`${bridgeUrl}/api/health`);const d=await r.json();
      setHealth(d);setWaState(d.whatsapp||"unknown");
      if(d.whatsapp==="qr"){
        const qr=await fetch(`${bridgeUrl}/api/qr`);const qd=await qr.json();
        if(qd.qr)setQrImg(qd.qr);
      }else{setQrImg(null)}
    }catch{setWaState("offline");setHealth(null)}
  },[bridgeUrl]);

  // -- Initial check + poll every 3s during QR/initializing phase
  useEffect(()=>{
    checkHealth();
    const iv=setInterval(()=>{
      if(waState==="qr"||waState==="initializing"||waState==="unknown")checkHealth();
    },3000);
    return()=>clearInterval(iv);
  },[checkHealth,waState]);

  // -- Load conversations list
  const loadConvos=useCallback(async()=>{
    try{
      const r=await fetch(`${bridgeUrl}/api/conversations`);const d=await r.json();
      setConvos(d.conversations||[]);
    }catch{}
  },[bridgeUrl]);

  useEffect(()=>{if(waState==="ready")loadConvos()},[waState,loadConvos]);

  // -- Sync chats from WhatsApp
  const doSync=async()=>{
    setSyncing(true);setSyncResult(null);
    try{
      const r=await fetch(`${bridgeUrl}/api/sync`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({limit:30,msg_limit:50})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Sync failed");
      setSyncResult(d);
      loadConvos(); // Refresh conversation list
    }catch(e){setSyncResult({error:e.message})}finally{setSyncing(false)}
  };

  // -- Import chat export
  const doImport=async()=>{
    if(!impPhone||!impText)return;
    try{
      const res=await fetch(`${bridgeUrl}/api/import`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:impPhone,name:impName,messages:impText})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Import failed");
      setImpResult(data);
      const matchDonor=donors.find(d=>{
        const dp=(d.phone||"").replace(/\D/g,"").slice(-10);
        const ip=impPhone.replace(/\D/g,"").slice(-10);
        return dp===ip;
      });
      if(matchDonor){
        onLogActivities({did:matchDonor.id||matchDonor.name,type:"whatsapp",summary:`Imported ${data.parsed} WhatsApp messages`,date:new Date().toISOString()});
      }
      loadConvos();
    }catch(e){setImpResult({error:e.message})}
  };

  // -- Match donor name for a conversation phone
  const donorFor=(phone)=>{
    const digits=phone.replace(/\D/g,"").slice(-10);
    return donors.find(d=>(d.phone||"").replace(/\D/g,"").slice(-10)===digits);
  };

  const stateColor=waState==="ready"?"var(--green)":waState==="qr"?"var(--accent)":"var(--red)";
  const stateLabel=waState==="ready"?"Connected":waState==="qr"?"Scan QR Code":waState==="authenticated"?"Connecting...":waState==="initializing"?"Starting...":"Offline";

  return(<div className="content-scroll" style={{padding:20}}>
    {/* Header with status */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <h2 style={{fontSize:18,fontWeight:700,margin:0}}>WhatsApp Integration</h2>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,background:waState==="ready"?"var(--green-soft)":waState==="qr"?"var(--accent-soft)":"var(--red-soft)"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:stateColor}}/>
        <span style={{fontSize:12,fontWeight:600,color:stateColor}}>{stateLabel}</span>
      </div>
      {health?.connected_as&&<span style={{fontSize:12,color:"var(--text3)"}}>as {health.connected_as}</span>}
    </div>

    {/* Sub-tabs */}
    <div className="sub-nav" style={{marginBottom:16}}>
      <div className={"sub-tab "+(tab==="connect"?"active":"")} onClick={()=>setTab("connect")}>
        {waState==="ready"?"✅":"📱"} Connect
      </div>
      <div className={"sub-tab "+(tab==="conversations"?"active":"")} onClick={()=>setTab("conversations")}>
        💬 Conversations <span className="count">{convos.length}</span>
      </div>
      <div className={"sub-tab "+(tab==="import"?"active":"")} onClick={()=>setTab("import")}>
        📥 Import
      </div>
    </div>

    {/* ===== CONNECT TAB ===== */}
    {tab==="connect"&&<div style={{maxWidth:600}}>
      {/* QR Code Display */}
      {waState==="qr"&&qrImg&&<div style={{textAlign:"center",padding:24,background:"var(--surface)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)",marginBottom:16}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:8}}>Scan QR Code</h3>
        <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
        <img src={qrImg} alt="WhatsApp QR Code" style={{width:280,height:280,borderRadius:8,background:"#fff",padding:8}}/>
        <p style={{fontSize:11,color:"var(--text4)",marginTop:12}}>QR refreshes automatically. Keep this page open.</p>
      </div>}

      {/* Waiting for QR */}
      {(waState==="initializing"||waState==="unknown")&&waState!=="ready"&&<div style={{textAlign:"center",padding:32,background:"var(--surface)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)",marginBottom:16}}>
        <div style={{fontSize:24,marginBottom:8}}>⏳</div>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:8}}>Starting WhatsApp Web...</h3>
        <p style={{fontSize:12,color:"var(--text3)"}}>The bridge server is launching Chromium. QR code will appear shortly.</p>
      </div>}

      {/* Connected State */}
      {waState==="ready"&&<div style={{padding:24,background:"var(--surface)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{fontSize:32}}>✅</div>
          <div>
            <h3 style={{fontSize:15,fontWeight:700}}>WhatsApp Connected!</h3>
            <p style={{fontSize:12,color:"var(--text3)"}}>
              Logged in as <strong>{health?.connected_as||"Unknown"}</strong>
              {health?.phone_number&&<span> ({health.phone_number})</span>}
            </p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div style={{padding:12,background:"var(--surface2)",borderRadius:"var(--radius)",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:700,color:"var(--accent)"}}>{health?.conversations||0}</div>
            <div style={{fontSize:11,color:"var(--text3)"}}>Conversations</div>
          </div>
          <div style={{padding:12,background:"var(--surface2)",borderRadius:"var(--radius)",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{health?.total_messages||0}</div>
            <div style={{fontSize:11,color:"var(--text3)"}}>Messages</div>
          </div>
          <div style={{padding:12,background:"var(--surface2)",borderRadius:"var(--radius)",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:700,color:"var(--green)"}}>{Math.floor(health?.uptime||0)}s</div>
            <div style={{fontSize:11,color:"var(--text3)"}}>Uptime</div>
          </div>
        </div>
      </div>}

      {/* Offline State */}
      {waState==="offline"&&<div style={{padding:24,background:"var(--surface)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:32}}>🔌</div>
          <div>
            <h3 style={{fontSize:15,fontWeight:700,color:"var(--red)"}}>Bridge Server Offline</h3>
            <p style={{fontSize:12,color:"var(--text3)",marginTop:4}}>Start the bridge server:</p>
            <code style={{display:"block",background:"var(--surface2)",padding:"8px 12px",borderRadius:"var(--radius-sm)",fontSize:12,marginTop:8,color:"var(--accent)",fontFamily:"'JetBrains Mono',monospace"}}>node whatsapp_bridge.js</code>
          </div>
        </div>
      </div>}

      {/* Sync Button */}
      {waState==="ready"&&<div style={{padding:16,background:"var(--surface)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)"}}>
        <h4 style={{fontSize:13,fontWeight:600,marginBottom:8}}>Sync Chats from WhatsApp</h4>
        <p style={{fontSize:12,color:"var(--text3)",marginBottom:12}}>Pull your recent WhatsApp conversations into the CRM. This fetches message history directly from WhatsApp Web.</p>
        <button className="btn btn-primary" onClick={doSync} disabled={syncing}>{syncing?"Syncing...":"Sync Last 30 Chats"}</button>
        {syncResult&&!syncResult.error&&<div style={{marginTop:8,fontSize:12,color:"var(--green)"}}>Synced {syncResult.chats_synced} chats, {syncResult.new_messages} new messages</div>}
        {syncResult?.error&&<div style={{marginTop:8,fontSize:12,color:"var(--red)"}}>{syncResult.error}</div>}
      </div>}

      {/* How it works */}
      <div style={{marginTop:16,padding:16,background:"var(--surface)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)"}}>
        <h4 style={{fontSize:13,fontWeight:600,marginBottom:8}}>How It Works</h4>
        <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.8}}>
          <div>1. Start the bridge: <code style={{background:"var(--surface2)",padding:"1px 4px",borderRadius:3}}>node whatsapp_bridge.js</code></div>
          <div>2. Scan the QR code with your phone (one time only)</div>
          <div>3. Messages sync automatically — incoming messages appear in real-time</div>
          <div>4. Use "Sync Chats" to pull historical conversations</div>
          <div>5. Send messages directly from donor profiles</div>
          <div style={{marginTop:8,color:"var(--accent)"}}>No Facebook account required. No Meta API tokens. Just WhatsApp + your phone.</div>
        </div>
      </div>
    </div>}

    {/* ===== CONVERSATIONS TAB ===== */}
    {tab==="conversations"&&<div>
      {convos.length===0&&<div style={{textAlign:"center",padding:32,color:"var(--text3)",fontSize:13}}>
        {waState==="ready"?"No conversations synced yet. Use Sync to pull your chats.":"Connect WhatsApp first to see conversations."}
      </div>}
      {convos.length>0&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
        {convos.map(c=>{
          const d=donorFor(c.phone);
          return(<div key={c.phone} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:"var(--radius)",border:"1px solid var(--border)",cursor:"default"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:d?"var(--accent-soft)":"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:d?"var(--accent)":"var(--text3)",flexShrink:0}}>
              {(c.name||"?")[0].toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||c.phone}</span>
                {d&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:"var(--accent-soft)",color:"var(--accent)",fontWeight:600}}>DONOR: {d.name}</span>}
              </div>
              <div style={{fontSize:11,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{c.last_message||"No messages"}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:10,color:"var(--text4)"}}>{c.last_timestamp?new Date(c.last_timestamp).toLocaleDateString():""}</div>
              <div style={{fontSize:12,color:"var(--text3)"}}>{c.message_count} msgs</div>
              {c.unread>0&&<div style={{display:"inline-block",minWidth:18,height:18,lineHeight:"18px",borderRadius:9,background:"var(--green)",color:"#fff",fontSize:10,fontWeight:700,textAlign:"center",marginTop:2}}>{c.unread}</div>}
            </div>
          </div>);
        })}
      </div>}
    </div>}

    {/* ===== IMPORT TAB ===== */}
    {tab==="import"&&<div style={{maxWidth:600}}>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Import WhatsApp Chat Export</h3>
      <p style={{fontSize:12,color:"var(--text3)",marginBottom:16}}>Export a chat from WhatsApp (three-dot menu → More → Export Chat → Without Media), then paste the text below.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" value={impPhone} onChange={e=>setImpPhone(e.target.value)} placeholder="+1-212-555-1234"/></div>
        <div className="form-group"><label className="form-label">Contact Name</label><input className="form-input" value={impName} onChange={e=>setImpName(e.target.value)} placeholder="David Goldstein"/></div>
      </div>
      <div className="form-group"><label className="form-label">Chat Export Text</label><textarea className="form-textarea" value={impText} onChange={e=>setImpText(e.target.value)} placeholder="Paste exported WhatsApp chat here..." style={{minHeight:150}}/></div>
      <button className="btn btn-primary" onClick={doImport} disabled={!impPhone||!impText}>Import Conversation</button>
      {impResult&&<div style={{marginTop:12,padding:"8px 12px",borderRadius:"var(--radius-sm)",fontSize:12,background:impResult.error?"var(--red-soft)":"var(--green-soft)",color:impResult.error?"var(--red)":"var(--green)"}}>{impResult.error||`Imported ${impResult.parsed} messages (${impResult.total} total)`}</div>}
    </div>}
  </div>);
}

// ============================================================
// COMPONENT: Settings (updated with WhatsApp config)
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

  const handleLogout=()=>{
    clearSession();setSessionState(null);setAuthed(false);
    // Redirect to NextAuth sign-out, then to sign-in page
    window.location.href="/api/auth/signout?callbackUrl=/auth/signin";
  };

  // ---- Core state (persisted to localStorage, with legacy migration) ----
  // NOTE: All hooks must be called unconditionally (React rules of hooks)
  const[donors,setDonors]=useState(()=>sGetMigrate("donors",null));
  const[acts,setActs]=useState(()=>sGetMigrate("acts",[]));
  const[notes,setNotes]=useState(()=>sGetMigrate("notes",[]));
  const[deals,setDeals]=useState(()=>sGetMigrate("deals",[]));
  const[reminders,setReminders]=useState(()=>sGetMigrate("reminders",[]));
  const[apiKey,setAKS]=useState(()=>sGetMigrate("key",""));
  const[waBridge,setWaBS]=useState(()=>sGetMigrate("wa_bridge","http://localhost:3001"));
  const[pplxKey,setPplxKS]=useState(()=>sGetMigrate("pplx_key",""));
  const[aiProvider,setAiProviderS]=useState(()=>sGetMigrate("ai_provider","anthropic"));

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

  // ---- Keyboard shortcut: Ctrl+K for Command Palette ----
  useEffect(()=>{
    const handler=(e)=>{
      if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setShowCmdK(v=>!v)}
      if(e.key==="Escape")setShowCmdK(false);
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
    appendAudit({type:"stage_change",action:"Stage changed",detail:`${id} → ${STAGES.find(s=>s.id===stg)?.label}`,user:session?.name});
  },[]);

  const addNote=useCallback(n=>setNotes(p=>[...p,n]),[]);
  const addDeal=useCallback(d=>setDeals(p=>[...p,d]),[]);

  const sendEmail=useCallback(em=>{
    setActs(p=>[...p,{did:em.did,type:"email",summary:`Drafted: "${em.subj}" (${em.tmpl})`,date:em.date}]);
    setDonors(p=>p.map(d=>{if((d.id||d.name)===em.did){const i=STAGES.findIndex(s=>s.id===(d.pipeline_stage||"not_started"));if(i<3)return{...d,pipeline_stage:"email_drafted"}}return d}));
  },[]);

  // -- Save donor (add new or update existing) --
  const saveDonor=useCallback((donor,isEdit)=>{
    if(isEdit){
      setDonors(p=>p.map(d=>(d.id||d.name)===(donor.id||donor.name)?{...d,...donor}:d));
      setSelD(prev=>prev&&(prev.id||prev.name)===(donor.id||donor.name)?{...prev,...donor}:prev);
      appendAudit({type:"donor_edit",action:"Donor edited",detail:donor.name,user:session?.name});
    }else{
      setDonors(p=>[...p,{...donor,pipeline_stage:donor.pipeline_stage||"not_started"}]);
      appendAudit({type:"donor_add",action:"Donor added",detail:donor.name,user:session?.name});
    }
  },[session]);

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
  if(!donors&&showWizard)return <OnboardingWizard onComplete={handleWizardComplete} onSkip={()=>{setShowWizard(false)}}/>;

  return(<div className="app-shell">
    {/* NAV RAIL */}
    <div className="nav-rail">
      <div style={{position:"relative"}}>
        <div className="nav-logo" title={(getActiveOrg().name||"ChaiRaise")+" — Click to switch orgs"} onClick={()=>setShowOrgSwitcher(!showOrgSwitcher)}>{getActiveOrg().logo||"CR"}</div>
        {showOrgSwitcher&&<OrgSwitcher currentOrg={getActiveOrg()} onClose={()=>setShowOrgSwitcher(false)}/>}
      </div>
      {NAV.map(n=><div key={n.id} className={"nav-item "+(page===n.id?"active":"")} onClick={()=>{setPage(n.id);if(n.id==="donors")setSub("list")}} title={n.label} style={{position:"relative"}}>
        {n.icon}
        {n.id==="reminders"&&remindersDue>0&&<div style={{position:"absolute",top:2,right:2,width:14,height:14,borderRadius:7,background:"var(--red)",fontSize:9,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{remindersDue}</div>}
      </div>)}
      <div className="nav-spacer"/>
      <NotificationBell reminders={reminders} donors={donors||[]} outreachLog={outreachLog} acts={acts}/>
      <div className="nav-item" title={`${session.name} (${session.role})`} onClick={handleLogout} style={{fontSize:11,fontWeight:700,color:"var(--accent)"}}>
        {session.avatar||initials(session.name)}
      </div>
    </div>

    {/* MAIN */}
    <div className="main-area">
      {/* TOP BAR — with working global search */}
      <div className="top-bar">
        <div className="page-title">{NAV.find(n=>n.id===page)?.icon} {NAV.find(n=>n.id===page)?.label}</div>
        <div className="page-subtitle">{page==="dashboard"&&donors.length+" donors"}{page==="donors"&&donors.length+" total"}{page==="deals"&&deals.length+" opps"}{page==="activities"&&acts.length+" logged"}{page==="reminders"&&reminders.filter(r=>!r.done).length+" pending"}</div>
        <div className="search-global"><input placeholder="Search... (Ctrl+K)" onClick={()=>setShowCmdK(true)} onFocus={e=>{e.target.blur();setShowCmdK(true)}} readOnly style={{cursor:"pointer"}}/></div>
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
        {page==="reminders"&&<RemindersView reminders={reminders} donors={donors} onToggle={toggleReminder} onDelete={deleteReminder}/>}
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
    </div>

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
  </div>);
}

// ============================================================
// WRAPPER APP — provides ToastContext to all components
// ============================================================
function App(){
  return(<ToastProvider><AppInner/></ToastProvider>);
}

export default App;
