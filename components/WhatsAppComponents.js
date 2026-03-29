"use client";
import {useState,useEffect,useCallback,useRef,useMemo} from "react";
import {STAGES} from "@/lib/constants";
import {sGet,sSet,orgPrefix,fmt$,fmtD,initials} from "@/lib/storage";

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

export {WhatsAppChat, WhatsAppHub};
