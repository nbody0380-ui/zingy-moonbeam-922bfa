
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const storeKey="mbcc_ai_v1";
let state={mode:"offline",speak:true,voiceName:"",accessCode:"",recognition:null,listening:false,library:[],voiceSample:null};
try{state={...state,...JSON.parse(localStorage.getItem(storeKey)||"{}")}}catch(e){}
const saveState=()=>{const safe={mode:state.mode,speak:state.speak,voiceName:state.voiceName,accessCode:state.accessCode};localStorage.setItem(storeKey,JSON.stringify(safe))};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const addMessage=(text,who="assistant")=>{const el=document.createElement("div");el.className="ai-msg "+who;el.textContent=text;$("aiChat").append(el);$("aiChat").scrollTop=$("aiChat").scrollHeight};
const speak=text=>{if(!state.speak||!("speechSynthesis"in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const v=window.speechSynthesis.getVoices().find(x=>x.name===state.voiceName);if(v)u.voice=v;u.rate=1;window.speechSynthesis.speak(u)};
const answer=(t)=>{addMessage(t);speak(t)};
function openTab(name){const b=document.querySelector('[data-tab="'+name+'"]');if(b){b.click();return}const more=document.querySelector('[data-tab="more"]');const tile=document.querySelector('[data-open-tab="'+name+'"]');if(more&&tile){more.click();tile.click();return}answer("I couldn't find that section.") }
function setTheme(name){openTab("settings");setTimeout(()=>{const s=$("sTheme");if(!s)return;const opt=[...s.options].find(o=>o.value.toLowerCase()===name.toLowerCase()||o.text.toLowerCase().includes(name.toLowerCase()));if(opt){s.value=opt.value;s.dispatchEvent(new Event("change"));answer("Theme changed to "+opt.text+".")}else answer("I couldn't find that theme. Available themes are Ocean, Midnight, Forest, Rose and Light.")},80)}
function command(raw){const q=raw.trim(),s=q.toLowerCase();if(!q)return;
if(/^(hi|hello|hey|namaste)\b/.test(s)){answer("Hello! I'm your Command Center assistant. Tell me what you'd like to do.");return}
const routes=[["home",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?(home|dashboard)\b/],["planner",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?(planner|schedule)\b/],["subjects",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?subjects?\b/],["pomodoro",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?(focus|pomodoro)\b/],["stopwatch",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?stopwatch\b/],["topics",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?topics?\b/],["gallery",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?gallery\b/],["settings",/\b(open|go to|show)\s+(?:(?:my|the)\s+)?settings\b/]];
for(const [name,re] of routes){if(re.test(s)){openTab(name);answer("Opening "+name+".");return}}
if(/\b(start|begin)\s+(the\s+)?(pomodoro|focus timer)\b/.test(s)){$("pomoStart")?.click();openTab("pomodoro");answer("Your focus timer has started.");return}
if(/\b(pause|stop)\s+(the\s+)?(pomodoro|focus timer)\b/.test(s)){$("pomoPause")?.click();answer("Your focus timer is paused.");return}
if(/\b(reset)\s+(the\s+)?(pomodoro|focus timer)\b/.test(s)){$("pomoReset")?.click();answer("Your focus timer has been reset.");return}
if(/\b(start|begin)\s+(the\s+)?stopwatch\b/.test(s)){$("swStart")?.click();openTab("stopwatch");answer("Stopwatch started.");return}
if(/\b(pause|stop)\s+(the\s+)?stopwatch\b/.test(s)){$("swPause")?.click();answer("Stopwatch paused.");return}
if(/\b(reset)\s+(the\s+)?stopwatch\b/.test(s)){$("swReset")?.click();answer("Stopwatch reset.");return}
let m=q.match(/^(?:add|create)\s+(?:a\s+)?topic\s+(.+)$/i);if(m){openTab("topics");$("topicInput").value=m[1];$("topicAdd").click();answer("Added topic: "+m[1]);return}
m=q.match(/^(?:add|create)\s+(?:a\s+)?subject\s+(.+)$/i);if(m){openTab("subjects");$("addSubject").click();setTimeout(()=>{const n=$("subName");if(n){n.value=m[1];$("saveModal").click();answer("Added subject: "+m[1]);}},100);return}
m=q.match(/^(?:change|set)\s+(?:the\s+)?theme\s+(?:to\s+)?(.+)$/i);if(m){setTheme(m[1]);return}
if(/\b(what|show|check).*(today.?s|today).*(task|schedule)|\btoday.?s tasks\b/.test(s)){openTab("home");const n=document.querySelectorAll("#todayTasks .task").length;answer("You have "+n+" task(s) scheduled for today. Your schedule is on the Home page.");return}
if(/\b(help|what can you do)\b/.test(s)){answer("I can navigate every app section, start or pause Pomodoro, control the stopwatch, add topics and subjects, and change themes. Try: “Open planner”, “Start focus timer”, “Add topic renal physiology”, or “Change theme to forest”. Online textbook and research answers will be connected after a secure AI service is configured.");return}
if(state.mode==="offline"){answer("I can control the app offline. Switch to Online mode for medical AI and PubMed.");return}
const requestMode=$("aiRequestMode")?.value||"chat";
if(requestMode==="chat"&&!state.accessCode){answer("Enter the private app access code first. Never enter your OpenAI API key here.");return}
addMessage("Connecting securely…");
(async()=>{
 try{
  const headers={"content-type":"application/json"};
  if(requestMode==="chat")headers["x-app-access-code"]=state.accessCode;
  const response=await fetch("/api/medical-ai",{method:"POST",headers,body:JSON.stringify(requestMode==="pubmed"?{mode:"pubmed",query:q}:{mode:"chat",message:q})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||"Request failed.");
  if(requestMode==="pubmed"){
   addMessage(result.answer||"PubMed results:");
   (result.papers||[]).forEach(p=>{
    const wrap=document.createElement("div");wrap.className="ai-msg assistant";
    const title=document.createElement("div");title.textContent=p.title;
    const meta=document.createElement("div");meta.className="ai-muted";meta.textContent=[p.authors,p.journal,p.year,"PMID: "+p.pmid].filter(Boolean).join(" · ");
    const link=document.createElement("a");link.href=p.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Open PubMed record";link.style.color="var(--teal2)";
    wrap.append(title,meta,link);$("aiChat").append(wrap);
   });$("aiChat").scrollTop=$("aiChat").scrollHeight;
  }else answer(result.answer);
 }catch(error){answer("Unable to complete request: "+error.message)}
})();
}
$("aiSend").onclick=()=>{const v=$("aiInput").value.trim();if(!v)return;$("aiInput").value="";addMessage(v,"user");command(v)};
$("aiInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("aiSend").click()}});
document.querySelectorAll("[data-ai-mode]").forEach(b=>b.onclick=()=>{state.mode=b.dataset.aiMode;document.querySelectorAll("[data-ai-mode]").forEach(x=>x.classList.toggle("active",x===b));$("aiStatus").textContent=state.mode==="offline"?"Offline: app commands and local tools":"Online: ready for secure AI connection";saveState()});
document.querySelector('[data-ai-mode="'+state.mode+'"]')?.classList.add("active");
$("aiAccessCode").value=state.accessCode||""; $("aiAccessCode").onchange=e=>{state.accessCode=e.target.value.trim();saveState()};
$("aiSpeakToggle").checked=state.speak;$("aiSpeakToggle").onchange=e=>{state.speak=e.target.checked;saveState()};
function loadVoices(){const list=$("aiVoiceSelect");if(!list)return;const voices=window.speechSynthesis?.getVoices?.()||[];list.innerHTML='<option value="">System default voice</option>'+voices.map(v=>'<option value="'+esc(v.name)+'">'+esc(v.name)+' · '+esc(v.lang)+'</option>').join("");list.value=state.voiceName}
if("speechSynthesis"in window){loadVoices();window.speechSynthesis.onvoiceschanged=loadVoices}
$("aiVoiceSelect").onchange=e=>{state.voiceName=e.target.value;saveState()};
$("aiTestVoice").onclick=()=>speak("Hello. I am your MBBS Command Center assistant.");
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){state.recognition=new SpeechRecognition();state.recognition.lang="en-IN";state.recognition.interimResults=false;state.recognition.maxAlternatives=1;state.recognition.onresult=e=>{$("aiInput").value=e.results[0][0].transcript;$("aiSend").click()};state.recognition.onerror=()=>{answer("Voice recognition stopped. You can type your command instead.")};state.recognition.onend=()=>{state.listening=false;$("aiMic").textContent="🎙 Speak";$("aiWave").classList.remove("listening")}}
$("aiMic").onclick=()=>{if(!state.recognition){answer("Speech recognition is not supported in this browser. Please use Chrome or type your command.");return}if(state.listening){state.recognition.stop();return}try{state.listening=true;$("aiMic").textContent="Stop listening";$("aiWave").classList.add("listening");state.recognition.start()}catch(e){state.listening=false;answer("Microphone is busy or permission was denied.")}};
const DB="mbcc_ai_library_v1";
function dbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("files"))r.result.createObjectStore("files",{keyPath:"id"})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbAction(mode,fn){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction("files",mode),req=fn(tx.objectStore("files"));req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>rej(tx.error)})}
async function renderLibrary(){try{const files=await dbAction("readonly",s=>s.getAll());$("aiLibraryList").innerHTML="";if(!files.length){$("aiLibraryList").innerHTML='<div class="ai-muted">No books or notes uploaded yet.</div>';return}files.forEach(f=>{const row=document.createElement("div");row.className="ai-library-item";const name=document.createElement("span");name.textContent=f.name+" · "+Math.round(f.size/1024)+" KB";const del=document.createElement("button");del.className="btn";del.textContent="Remove";del.onclick=async()=>{if(confirm("Remove "+f.name+" from this device?")){await dbAction("readwrite",s=>s.delete(f.id));renderLibrary()}};row.append(name,del);$("aiLibraryList").append(row)})}catch(e){$("aiLibraryList").textContent="Local library storage is unavailable."}}
$("aiBookUpload").onchange=async e=>{const files=[...e.target.files];for(const f of files){if(f.size>50*1024*1024){alert(f.name+" is over the 50 MB limit.");continue}await dbAction("readwrite",s=>s.put({id:Date.now().toString(36)+Math.random().toString(36).slice(2),name:f.name,type:f.type,size:f.size,blob:f,addedAt:Date.now()}))}await renderLibrary();e.target.value=""};
$("aiVoiceUpload").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith("audio/")){alert("Please choose an audio recording.");return}if(f.size>25*1024*1024){alert("Please choose an audio file under 25 MB.");return}await dbAction("readwrite",s=>s.put({id:"voice-sample",name:f.name,type:f.type,size:f.size,blob:f,addedAt:Date.now()}));$("aiVoiceSampleStatus").textContent="Voice sample saved on this device. It is not cloned or uploaded.";e.target.value=""};
renderLibrary();addMessage("Hello! I can control several parts of your Command Center offline. Say “help” to see what I can do. Online textbook and PubMed answers, and cloned voices, will be enabled after their secure services are connected.");
})();
