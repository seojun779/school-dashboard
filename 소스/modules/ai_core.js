  /* ===== 내 PC AI (Ollama) 연결 · 공용 도구 ===== */
  var AISET='ai_설정';
  var AI={host:'http://127.0.0.1:11434',model:'',vision:'',ready:false,models:[],pending:{},seq:0};
  (function(){var s=ls(AISET,{});if(s&&s.host)AI.host=s.host;if(s&&s.model)AI.model=s.model;if(s&&s.vision)AI.vision=s.vision;})();
  function aiSave(){lsSet(AISET,{host:AI.host,model:AI.model,vision:AI.vision});}

  /* 확장 프로그램을 거치면 브라우저 보안(CORS) 걱정 없이 내 PC AI에 닿아요 */
  window.addEventListener('message',function(e){
    var m=e.data;if(e.source!==window||!m||!m.__shExt||!m.id)return;
    var p=AI.pending[m.id];if(!p)return;
    if(m.type==='ai-chunk')p.onChunk(m.data);
    else if(m.type==='ai-done'){delete AI.pending[m.id];p.resolve();}
    else if(m.type==='ai-error'){delete AI.pending[m.id];p.reject(new Error(m.data||'AI 연결 오류'));}
    else if(m.type==='ai-tags'){delete AI.pending[m.id];p.resolve(m.data);}
  });
  function aiExtPost(cmd,payload,handlers){
    var id='a'+(++AI.seq)+'_'+Date.now();
    return {id:id,promise:new Promise(function(resolve,reject){
      AI.pending[id]={resolve:resolve,reject:reject,onChunk:handlers&&handlers.onChunk||function(){}};
      window.postMessage({__shDash:true,cmd:cmd,payload:Object.assign({id:id,host:AI.host},payload||{})},'*');
      if(cmd==='ai-tags')setTimeout(function(){if(AI.pending[id]){delete AI.pending[id];reject(new Error('확장 프로그램이 응답하지 않아요'));}},4000);
    })};
  }
  function aiTags(){
    function direct(){return fetch(AI.host+'/api/tags').then(function(r){return r.json();});}
    if(window.__EXT){
      return aiExtPost('ai-tags',{}).promise.then(function(r){if(r&&r.error)throw new Error(r.error);return r;}).catch(function(){return direct();});
    }
    return direct();
  }
  /* 대화 요청: 글자가 만들어지는 대로 onToken(전체글, 새로운글) 호출, 끝나면 전체 글을 돌려줘요 */
  function aiChat(o){
    var model=o.model||AI.model;
    if(!model)return Promise.reject(new Error('모델이 선택되지 않았어요. 위에서 모델을 골라 주세요.'));
    var body={model:model,messages:o.messages,stream:true,options:Object.assign({temperature:0.3,num_ctx:8192},o.options||{})};
    if(o.json)body.format='json';
    var text='',t0=Date.now(),tokens=0,handle={abort:function(){}};
    function onObj(j){
      if(j&&j.error)throw new Error(j.error);
      var d=j&&j.message&&j.message.content||'';
      if(d){text+=d;tokens++;if(o.onToken)o.onToken(text,d,tokens/Math.max(0.5,(Date.now()-t0)/1000));}
    }
    var promise;
    if(window.__EXT&&!o.direct){
      var h=aiExtPost('ai-chat',{body:body},{onChunk:function(j){try{onObj(j);}catch(e){}}});
      handle.abort=function(){window.postMessage({__shDash:true,cmd:'ai-abort',payload:{id:h.id}},'*');delete AI.pending[h.id];};
      promise=h.promise.then(function(){return text;});
    }else{
      var ctl=new AbortController();handle.abort=function(){ctl.abort();};
      promise=fetch(AI.host+'/api/chat',{method:'POST',body:JSON.stringify(body),signal:ctl.signal}).then(function(r){
        if(!r.ok||!r.body)throw new Error('AI 응답 오류 ('+r.status+')');
        var rd=r.body.getReader(),dec=new TextDecoder(),buf='';
        return (function pump(){return rd.read().then(function(x){
          if(x.done){if(buf.trim()){try{onObj(JSON.parse(buf));}catch(e){}}return text;}
          buf+=dec.decode(x.value,{stream:true});var lines=buf.split('\n');buf=lines.pop();
          lines.forEach(function(l){if(l.trim()){try{onObj(JSON.parse(l));}catch(e){if(e.message&&!/JSON/.test(e.message))throw e;}}});
          return pump();});})();
      });
    }
    var p=promise.catch(function(e){if(e&&e.name==='AbortError')return text;throw e;});
    p.abort=handle.abort;
    return p;
  }

  /* ---- 상태 표시 ---- */
  function aiConnect(){
    $('aiStat').textContent='확인 중…';$('aiDot').className='dot';
    return aiTags().then(function(r){
      var names=((r&&r.models)||[]).map(function(m){return m.name||m.model;}).filter(Boolean);
      AI.models=names;AI.ready=names.length>0;
      var vis=names.filter(function(n){return /llava|vision|gemma3|minicpm-v|qwen2\.?5?-?vl|moondream|llama3\.2-vision|bakllava/i.test(n);});
      var chat=names.filter(function(n){return !/embed|nomic|bge|minilm/i.test(n);});
      if(!AI.model||names.indexOf(AI.model)<0)AI.model=(chat.filter(function(n){return /qwen2\.?5|exaone|gemma|llama|mistral|phi/i.test(n);})[0])||chat[0]||'';
      if(!AI.vision||names.indexOf(AI.vision)<0)AI.vision=vis[0]||'';
      $('aiModel').innerHTML=chat.length?chat.map(function(n){return '<option'+(n===AI.model?' selected':'')+'>'+esc(n)+'</option>';}).join(''):'<option value="">(없음)</option>';
      $('aiVision').innerHTML='<option value="">(없음 · 글 모델 사용)</option>'+vis.map(function(n){return '<option'+(n===AI.vision?' selected':'')+'>'+esc(n)+'</option>';}).join('');
      aiSave();
      $('aiDot').className='dot '+(AI.ready?'ok':'no');
      $('aiStat').textContent=AI.ready?'내 PC AI 연결됨 ('+names.length+'개 모델)':'연결됐지만 모델이 없어요 — 설치 안내를 따라 모델을 받아 주세요';
      if(!AI.ready)$('aiHelp').hidden=false;
      return AI.ready;
    }).catch(function(e){
      AI.ready=false;$('aiDot').className='dot no';
      $('aiStat').textContent='내 PC AI에 연결하지 못했어요';
      $('aiModel').innerHTML='<option value="">(없음)</option>';$('aiVision').innerHTML='<option value="">(없음)</option>';
      $('aiHelp').hidden=false;return false;
    });
  }

  /* ---- 공용 도구 ---- */
  var scriptCache={};
  function loadScript(url){
    if(scriptCache[url])return scriptCache[url];
    scriptCache[url]=new Promise(function(ok,no){var s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=function(){delete scriptCache[url];no(new Error('라이브러리를 내려받지 못했어요 (인터넷 연결 확인)'));};document.head.appendChild(s);});
    return scriptCache[url];
  }
  function fmtOut(t){
    var h=esc(t);
    h=h.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g,function(m,l,c){return '<pre>'+c+'</pre>';});
    h=h.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>');
    return h;
  }
  function dlBlob(name,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);}
  function parseJsonLoose(t){
    var s=String(t||'').trim();
    var f=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)s=f[1];
    var a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>=0&&b>a)s=s.slice(a,b+1);
    try{return JSON.parse(s);}catch(e){}
    try{return JSON.parse(s.replace(/,\s*([}\]])/g,'$1').replace(/[“”]/g,'"'));}catch(e2){}
    return null;
  }
  function cleanSvg(code){
    var m=String(code||'').match(/<svg[\s\S]*<\/svg>/i);if(!m)return null;
    var doc=new DOMParser().parseFromString(m[0],'image/svg+xml');
    if(doc.querySelector('parsererror'))return null;
    var root=doc.documentElement;
    root.querySelectorAll('script,foreignObject,iframe,object,embed,style[src]').forEach(function(n){n.remove();});
    [root].concat([].slice.call(root.querySelectorAll('*'))).forEach(function(n){
      [].slice.call(n.attributes).forEach(function(a){
        var nm=a.name.toLowerCase(),v=a.value||'';
        if(/^on/.test(nm))n.removeAttribute(a.name);
        else if((nm==='href'||nm==='xlink:href')&&!/^#|^data:image\//i.test(v))n.removeAttribute(a.name);
        else if(/url\(\s*['"]?\s*https?:/i.test(v))n.removeAttribute(a.name);
      });
    });
    if(!root.getAttribute('xmlns'))root.setAttribute('xmlns','http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(root);
  }
  function svgToPng(svgText,w,h,name){
    return new Promise(function(ok,no){
      var img=new Image(),url=URL.createObjectURL(new Blob([svgText],{type:'image/svg+xml;charset=utf-8'}));
      img.onload=function(){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);c.toBlob(function(b){if(b){dlBlob(name,b);ok();}else no(new Error('PNG 변환 실패'));},'image/png');};
      img.onerror=function(){URL.revokeObjectURL(url);no(new Error('이미지를 만들지 못했어요'));};img.src=url;
    });
  }
  function fileToB64(f){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(String(r.result).split(',')[1]);};r.onerror=no;r.readAsDataURL(f);});}
  function courseOptions(sel,withAll){
    var names=[];if(has)D.courses.forEach(function(c){if(names.indexOf(c.folder)<0)names.push(c.folder);});
    (window.LOCAL_MATS||[]).forEach(function(x){if(names.indexOf(x.folder)<0)names.push(x.folder);});
    sel.innerHTML='<option value="">전체 과목</option>'+names.map(function(n){return '<option>'+esc(n)+'</option>';}).join('');
  }

  /* ---- 강의자료 근거(RAG) 만들기: 질문과 가까운 자료 조각을 모아 AI에게 줘요 ---- */
  function ragBlock(q,course,fileIds,maxChars){
    var parts=[],srcs=[],used=0;maxChars=maxChars||3600;
    (fileIds||[]).forEach(function(id){
      var f=(driveFileById(id))||null;if(!f||!f.t)return;
      var t=f.t.slice(0,2800);parts.push('[첨부 자료: '+f.n+']\n'+t);srcs.push(f.n);used+=t.length;
    });
    if(window.__rag&&q){
      var list=window.__rag(q,course||null,6)||[];
      list.forEach(function(x,i){
        if(used>=maxChars)return;
        var t=String(x.text).slice(0,Math.min(900,maxChars-used));
        parts.push('[자료 '+(i+1)+'] '+x.title+' ('+x.src+')\n'+t);srcs.push(x.src+' · '+x.title);used+=t.length;
      });
    }
    return {text:parts.join('\n\n'),sources:srcs};
  }
  var POLICY='규칙: ① [자료]로 표시된 강의자료 내용을 우선 사용하고 사용한 자료 번호를 적는다. ② 자료에 없는 일반 지식이나 네가 추론한 부분은 문장 앞에 반드시 "추론:" 또는 "일반 지식:"이라고 표시한다. ③ 모르거나 확실하지 않으면 모른다고 말하고 지어내지 않는다. ④ 한국어 존댓말로 쓴다.';
  function setBusy(prefix,busy){
    var run=$(prefix+'Run'),stop=$(prefix+'Stop');
    if(run)run.disabled=busy;if(stop)stop.hidden=!busy;
  }
  function needAi(metaId){
    if(AI.ready&&AI.model)return false;
    var el=$(metaId);if(el)el.textContent='내 PC AI가 연결되지 않았어요. 위의 "설치 안내"를 확인해 주세요.';
    $('aiHelp').hidden=false;return true;
  }
