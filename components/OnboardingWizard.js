"use client";
import {useState,useEffect} from "react";
import {ORG_TYPES} from "@/lib/constants";
import {getActiveOrg,setActiveOrg,setOrgProfileStore,orgPrefix} from "@/lib/storage";
import {aiResearchOrg} from "@/lib/ai";

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
            <input className="form-input" value={orgTagline} onChange={e=>setOrgTagline(e.target.value)} placeholder="e.g., Building tomorrow's Jewish leaders"/></div>
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

export {OnboardingWizard};
