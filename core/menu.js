import { parsePairs, swapPairs, validateSet } from "./vocabulary.js";
import { getSupportedLanguages } from "./languages.js";
import { buildStudentUrl, readStudentSetId } from "./sharing.js";
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const add=(parent,...children)=>{parent.append(...children);return parent;};
const button=(text,cls="")=>{const b=el("button",cls,text);b.type="button";return b;};
function details(help){const d=el("details","teacherHowTo"),s=el("summary","", "▶ HOW TO PLAY");add(d,s,el("div","",help));return d;}
const APPROVED_MENU = "\n<div id=\"studentIntro\">\n  <div class=\"studentTitle\" id=\"studentSetTitle\">VOCABULARY SET</div>\n  <div class=\"studentMeta\" id=\"studentSetMeta\">READY TO PLAY</div>\n  <button id=\"studentPlay\" class=\"primary\" type=\"button\">PLAY</button>\n  <details class=\"howTo\">\n    <summary>▶ HOW TO PLAY</summary>\n    <div>← → STEER &nbsp; · &nbsp; ↑ ACCELERATE &nbsp; · &nbsp; SPACE SHOOT<br>Shoot the correct translation. Missed words return for extra practice.</div>\n  </details>\n</div>\n<div class=\"teacherMenu\">\n  <div class=\"card settingsCard\">\n    <h2>GAME SETTINGS</h2>\n    <div class=\"help\">Choose the language and vocabulary you want to practise.</div>\n    <div class=\"settingsFields\">\n      <div><div class=\"fieldLabel\">Language</div><select id=\"language\"><option value=\"de-DE\">German</option><option value=\"es-ES\">Spanish</option><option value=\"da-DK\">Danish</option><option value=\"en-US\">English</option></select></div>\n      <div><div class=\"fieldLabel\">Vocabulary</div><select id=\"category\"></select></div>\n    </div>\n    <div id=\"voiceCheck\" class=\"preview\"><b>VOICE:</b> checking…</div>\n    <button id=\"testVoice\" class=\"yellow menuButton\" type=\"button\">🔊 TEST VOICE</button>\n    <details class=\"teacherHowTo\">\n      <summary>▶ HOW TO PLAY</summary>\n      <div>← / A = left · → / D = right · SPACE = fire · ↑ / W = accelerate · P = pause<br>Shoot the correct translation. Missed words return for extra practice.</div>\n    </details>\n  </div>\n  <div class=\"card vocabCard\">\n    <h2>YOUR VOCABULARY</h2>\n    <div class=\"help\">Use a ready-made list above, or paste/edit your own Quizlet-style term and definition pairs.</div>\n    <textarea id=\"words\">gucken\tto watch, to look at\nfahren\tto drive\nessen\tto eat\ntrinken\tto drink\nschlafen\tto sleep\nlesen\tto read\nschreiben\tto write\nsprechen\tto speak\ngehen\tto go\nkommen\tto come\nspielen\tto play\nlernen\tto learn</textarea>\n    <button id=\"swap\" type=\"button\" class=\"menuButton\">⇄ SWAP SIDES</button>\n    <div id=\"preview\" class=\"preview\"></div><div id=\"error\" class=\"error\"></div>\n    <div class=\"shareBlock\">\n      <button id=\"shareStudentLink\" class=\"pink menuButton\" type=\"button\">🔗 SHARE WITH STUDENTS</button>\n      <div class=\"stepHint\" id=\"shareStatus\">Creates a permanent student link for exactly the vocabulary shown above.</div>\n    </div>\n    <button id=\"play\" class=\"primary wide finalPlay teacherOnly\" type=\"button\">PLAY</button>\n  </div>\n</div>";
function shell(root,title){root.replaceChildren();root.classList.add("bt-core");const logo=el("div","bt-logo",title);root.append(logo);return()=>{root.replaceChildren();root.classList.remove("bt-core");};}
export function mountTeacherMenu(root,services,options={}){
  const clean=shell(root,options.title??"BORING TEACHER");
  const abort=new AbortController(),signal=abort.signal;
  // Preserve the complete approved Word Racer menu markup and IDs; bind Core services below.
  const menuSection=el("section");menuSection.id="menu";menuSection.className="screen active";menuSection.innerHTML=APPROVED_MENU;
  root.append(menuSection);
  const byId=id=>menuSection.querySelector("#"+id);
  const lang=byId("language"),category=byId("category"),words=byId("words"),preview=byId("preview"),error=byId("error"),voiceStatus=byId("voiceCheck");
  const testVoice=byId("testVoice"),swap=byId("swap"),share=byId("shareStudentLink"),play=byId("play"),shareStatus=byId("shareStatus");
  const title={value:options.defaultSetTitle??"My vocabulary"};
  menuSection.querySelector(".teacherHowTo div").textContent=options.instructions??"Select the correct translation.";
  const cats=options.categories??{};
  for(const l of getSupportedLanguages()){const opt=el("option","",l.label);opt.value=l.locale;lang.append(opt);}
  lang.value=options.defaultLanguage??"es-ES";
  function setCategories(){category.replaceChildren();const custom=el("option","","Custom vocabulary");custom.value="";category.append(custom);for(const key of Object.keys(cats[lang.value]??{})){const opt=el("option","",key);opt.value=key;category.append(opt);}}
  function current(){const parsed=parsePairs(words.value);const checked=validateSet({title:title.value,language:lang.value,pairs:parsed.pairs},{minPairs:options.minPairs??5});return {parsed,checked};}
  function refresh(){const {parsed}=current();preview.textContent=parsed.pairs.length+" vocabulary pairs"+(parsed.rejectedLines.length?" · Invalid lines: "+parsed.rejectedLines.join(", "):"");}
  function loadCategory(){const pairs=cats[lang.value]?.[category.value];if(pairs){words.value=pairs.map(p=>p.join("\t")).join("\n");refresh();}}
  setCategories();words.value=options.defaultText??words.value;refresh();
  lang.addEventListener("change",()=>{setCategories();refresh();},{signal});
  category.addEventListener("change",loadCategory,{signal});
  words.addEventListener("input",refresh,{signal});
  swap.addEventListener("click",()=>{const {parsed}=current();if(parsed.rejectedLines.length){error.textContent="Correct invalid lines before swapping.";return;}words.value=swapPairs(parsed.pairs).map(p=>p.join("\t")).join("\n");error.textContent="";refresh();},{signal});
  testVoice.addEventListener("click",async()=>{const {parsed}=current();const phrase=parsed.pairs[0]?.[0]??"Hola";voiceStatus.textContent="VOICE: testing…";try{const result=await services.voice.speak(phrase,lang.value);if(!signal.aborted)voiceStatus.textContent="VOICE: "+result.status;}catch{if(!signal.aborted)voiceStatus.textContent="VOICE: unavailable";}},{signal});
  play.addEventListener("click",async()=>{const {parsed,checked}=current();if(parsed.rejectedLines.length||!checked.ok){error.textContent=parsed.rejectedLines.length?"Correct invalid vocabulary lines.":checked.error.message;return;}error.textContent="";await options.onPlay?.(checked.value);},{signal});
  share.addEventListener("click",async()=>{
    const {parsed,checked}=current();
    if(parsed.rejectedLines.length||!checked.ok){error.textContent=parsed.rejectedLines.length?"Correct invalid vocabulary lines.":checked.error.message;return;}
    error.textContent="";share.disabled=true;shareStatus.textContent="Saving vocabulary…";
    try{
      const {id}=await services.sharing.saveSet(checked.value);
      if(signal.aborted)return;
      const url=buildStudentUrl(options.previewGameUrl??location.href,id);
      const link=el("a","",url);link.href=url;link.target="_blank";link.rel="noopener";
      const copy=button("COPY LINK","yellow");
      copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(url);copy.textContent="COPIED";}catch{copy.textContent="Select the link above to copy."; }},{signal});
      shareStatus.replaceChildren(link,el("div","", " "),copy,el("div","", "Preview link: do not distribute as a permanent classroom URL."));
    }catch(e){if(!signal.aborted)shareStatus.textContent=e.message??"Could not share vocabulary.";}
    finally{if(!signal.aborted)share.disabled=false;}
  },{signal});
  return{destroy(){abort.abort();clean();},getCurrentSet(){const {parsed,checked}=current();return parsed.rejectedLines.length||!checked.ok?null:checked.value;}};
}
export function mountStudentMenu(root,services,options={}){
  const clean=shell(root,options.title??"BORING TEACHER"),abort=new AbortController(),signal=abort.signal;
  const card=el("div","studentIntro"),heading=el("div","studentTitle","LOADING VOCABULARY"),meta=el("div","studentMeta","Please wait…"),play=button("PLAY","primary");
  play.disabled=true;add(card,heading,meta,play,details(options.instructions??"Select the correct translation."));root.append(card);
  let set=null;
  play.addEventListener("click",()=>{if(set)options.onPlay?.(set);},{signal});
  const id=readStudentSetId(options.studentUrl??location.href);
  if(!id){heading.textContent="INVALID LINK";meta.textContent="This student link has no valid set ID.";}
  else services.sharing.loadSet(id).then(value=>{if(signal.aborted)return;set=value;heading.textContent=value.title;meta.textContent=value.language+" · "+value.pairs.length+" words";play.disabled=false;}).catch(e=>{if(signal.aborted)return;heading.textContent="UNABLE TO LOAD";meta.textContent=e.message??"Could not load vocabulary.";});
  return{destroy(){abort.abort();clean();}};
}
