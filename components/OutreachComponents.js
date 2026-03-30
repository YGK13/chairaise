"use client";
import {useState,useEffect,useCallback,useRef,useMemo} from "react";
import {STAGES,TIERS,DEFAULT_TEMPLATES,ACT_TYPES} from "@/lib/constants";
import {orgPrefix,sGet,sSet,getActiveOrg,getOrgProfile,getOrgTemplates,fmt$,fmtD,fmtN,initials} from "@/lib/storage";
import {callAI,aiScore,aiTemplate,aiLikelihood,aiAsk,causeMatch} from "@/lib/ai";

// Runtime template alias — loads org-customized templates if available
const TEMPLATES = typeof window !== "undefined" ? getOrgTemplates() : DEFAULT_TEMPLATES;

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
        <input className="form-input" value={form.message} onChange={e=>set("message",e.target.value)} placeholder="e.g., Sent personalized email about our mission..."/>
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

export {OutreachLogger, LearningInsights, OutreachCoach};
