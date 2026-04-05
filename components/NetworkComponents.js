"use client";
import {useState,useEffect,useCallback,useRef,useMemo} from "react";
import {STAGES,TIERS,ACT_TYPES} from "@/lib/constants";
import {orgPrefix,sGet,sSet,getActiveOrg,fmt$,fmtD,fmtN,initials,appendAudit,getSession} from "@/lib/storage";
import {parseVCF,parseLinkedInCSV,fuzzyMatchDonor,inferEdges,edgeStrength,bfsPath,buildGraph} from "@/lib/graph";
import {aiScore} from "@/lib/ai";

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
    nodeMap.set("YOU",{id:"YOU",name:"You",type:"you",x:dimensions.w/2,y:dimensions.h/2,r:20});

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
      placeholder={'Paste email headers, To/From/CC lines, or full email threads here...\n\nExamples:\nFrom: David Goldstein <david@goldsteinfoundation.org>\nTo: Sarah Roth <sarah@rothfamily.com>, Michael Sherman <m.sherman@shermanfoundation.org>\nCC: "Rachel Levy" <rachel.levy@uja.org>'} style={{minHeight:100,marginBottom:8}}/>

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

export {NetworkDashboard, NetworkGraphSVG, GmailIntegration};
