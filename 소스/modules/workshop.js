  /* ===== AI 작업실: 문제 풀이 · PPT · 시각화 · 캔버스 ===== */
  var runs={};
  function startRun(key,p){runs[key]=p;}
  function stopRun(key){if(runs[key]&&runs[key].abort)runs[key].abort();}

  /* 탭 */
  $('aiTabs').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;var t=b.getAttribute('data-t');
    [].forEach.call($('aiTabs').children,function(x){x.setAttribute('aria-pressed',String(x===b));});
    ['solve','ppt','viz','canvas'].forEach(function(k){$('p-'+k).hidden=(k!==t);});
  });
  $('aiHelpBtn').onclick=function(){$('aiHelp').hidden=!$('aiHelp').hidden;};
  $('aiRefresh').onclick=function(){aiConnect();};
  $('aiModel').onchange=function(){AI.model=this.value;aiSave();};
  $('aiVision').onchange=function(){AI.vision=this.value;aiSave();};
  ['svCourse','ppCourse','vzCourse'].forEach(function(id){courseOptions($(id));});

  /* ---------------- 문제 풀이 ---------------- */
  var svImgs=[];
  $('svImgBtn').onclick=function(){$('svImg').click();};
  $('svImg').onchange=function(){svAddImages(this.files);this.value='';};
  $('svQ').addEventListener('paste',function(e){var fs=[].filter.call((e.clipboardData&&e.clipboardData.files)||[],function(f){return /^image\//.test(f.type);});if(fs.length){e.preventDefault();svAddImages(fs);}});
  function svAddImages(fs){[].forEach.call(fs,function(f){if(/^image\//.test(f.type)&&svImgs.length<4)svImgs.push(f);});$('svImgN').textContent=svImgs.length?'이미지 '+svImgs.length+'장 (눌러서 모두 지우기)':'';}
  $('svImgN').style.cursor='pointer';$('svImgN').onclick=function(){svImgs=[];svAddImages([]);};
  var svLast='';
  $('svRun').onclick=function(){
    var q=$('svQ').value.trim();if(!q&&!svImgs.length){$('svMeta').textContent='문제를 입력하거나 이미지를 첨부해 주세요';return;}
    if(needAi('svMeta'))return;
    var mode=$('svMode').value,course=$('svCourse').value||null;
    var rag=$('svRag').checked?ragBlock(q||'문제',course,ATT.sv,3600):{text:'',sources:[]};
    var modeTxt={step:'문제를 이해한 뒤 단계별로 자세히 풀고, 마지막 줄에 "정답:"으로 결론을 쓴다.',short:'핵심만 간단히 풀고, 마지막 줄에 "정답:"으로 결론을 쓴다.',check:'답을 먼저 구하고, 다른 방법으로 한 번 검산한 뒤, 마지막 줄에 "정답:"으로 결론을 쓴다.'}[mode];
    var sys='너는 대학 소프트웨어융합학과 학생의 문제 풀이를 돕는 조교다. '+POLICY+' '+modeTxt+' 코드나 수식은 코드블록으로 쓴다.';
    var user=(rag.text?'[강의자료]\n'+rag.text+'\n\n':'')+'[문제]\n'+(q||'(첨부한 이미지의 문제를 풀어 주세요)');
    svLast=sys+'\n\n'+user;
    var go=function(images){
      var model=images.length?(AI.vision||AI.model):AI.model,msg={role:'user',content:user};if(images.length)msg.images=images;
      setBusy('sv',true);$('svOut').textContent='생각하는 중…';$('svMeta').textContent=model+' 로 풀이 중';
      var p=aiChat({model:model,messages:[{role:'system',content:sys},msg],onToken:function(t,d,tps){$('svOut').innerHTML=fmtOut(t);$('svMeta').textContent=model+' · '+tps.toFixed(1)+' 토큰/초';}});
      startRun('sv',p);
      p.then(function(t){$('svOut').innerHTML=fmtOut(t||'(응답이 비었어요)')+(rag.sources.length?'<div class="mini" style="margin-top:8px">참고한 자료: '+esc(rag.sources.slice(0,6).join(' / '))+'</div>':'<div class="mini" style="margin-top:8px">참고한 강의자료가 없어서 일반 지식으로 풀었어요.</div>');$('svMeta').textContent=model;})
       .catch(function(e){$('svOut').textContent='⚠ '+e.message;}).then(function(){setBusy('sv',false);});
    };
    if(svImgs.length&&!AI.vision)$('svMeta').textContent='그림을 볼 수 있는 모델이 없어요. 글 모델이 이미지를 못 읽을 수 있어요 (설치 안내 참고)';
    Promise.all(svImgs.map(fileToB64)).then(go);
  };
  $('svStop').onclick=function(){stopRun('sv');};
  $('svCopy').onclick=function(){try{navigator.clipboard.writeText($('svOut').innerText);}catch(e){}};
  $('svClaude').onclick=function(){try{navigator.clipboard.writeText(svLast||$('svQ').value);}catch(e){}window.open('__CLAUDE_URL__','_blank');$('svMeta').textContent='문제와 자료를 복사했어요. Claude에 붙여넣어 주세요';};

  /* ---------------- PPT 제작 ---------------- */
  var deck=null;
  function ppRender(){
    if(!deck){$('ppPrev').innerHTML='';$('ppAct').hidden=true;return;}
    $('ppPrev').innerHTML='<div class="sl" style="margin-bottom:10px"><div class="n">표지</div><input class="ta" id="dkTitle" value="'+esc(deck.title)+'"><input class="ta" id="dkSub" value="'+esc(deck.subtitle||'')+'" placeholder="부제목"></div><div class="slides">'+deck.slides.map(function(s,i){
      return '<div class="sl" data-i="'+i+'"><div class="n">슬라이드 '+(i+1)+' <button class="btn sm red" type="button" data-rm="'+i+'" style="float:right;padding:1px 8px">삭제</button></div><input class="ta" data-f="title" value="'+esc(s.title)+'"><textarea class="ta" data-f="bullets" placeholder="한 줄에 하나씩">'+esc((s.bullets||[]).join('\n'))+'</textarea></div>';}).join('')+'</div>';
    $('ppAct').hidden=false;
  }
  $('ppPrev').addEventListener('input',function(e){
    var el=e.target;if(el.id==='dkTitle')deck.title=el.value;else if(el.id==='dkSub')deck.subtitle=el.value;
    else{var box=el.closest('.sl');if(!box||box.getAttribute('data-i')==null)return;var s=deck.slides[+box.getAttribute('data-i')],f=el.getAttribute('data-f');if(f==='title')s.title=el.value;else s.bullets=el.value.split('\n').map(function(x){return x.trim();}).filter(Boolean);}
  });
  $('ppPrev').addEventListener('click',function(e){var b=e.target.closest('[data-rm]');if(b&&deck){deck.slides.splice(+b.getAttribute('data-rm'),1);ppRender();}});
  $('ppAdd').onclick=function(){if(deck){deck.slides.push({title:'새 슬라이드',bullets:['내용을 입력하세요']});ppRender();}};
  $('ppRun').onclick=function(){
    var q=$('ppQ').value.trim();if(!q){$('ppMeta').textContent='발표 주제를 입력해 주세요';return;}
    if(needAi('ppMeta'))return;
    var n=Math.max(3,Math.min(15,parseInt($('ppN').value,10)||8)),course=$('ppCourse').value||null;
    var rag=$('ppRag').checked?ragBlock(q,course,ATT.pp,4200):{text:'',sources:[]};
    var sys='너는 발표 자료를 구성하는 조교다. '+POLICY+' 반드시 JSON 하나만 출력한다. 형식: {"title":"발표 제목","subtitle":"부제목","slides":[{"title":"슬라이드 제목","bullets":["핵심 문장","핵심 문장"],"notes":"발표할 때 할 말"}]}. 슬라이드는 정확히 '+n+'개, 슬라이드마다 bullets는 '+($('ppTone').value==='short'?'3~4개의 짧은 문장':'4~6개의 문장')+'으로 쓴다. 자료에 없는 내용을 추가할 때는 bullets 문장 끝에 " (추론)" 또는 " (일반 지식)"을 붙인다.';
    var user=(rag.text?'[강의자료]\n'+rag.text+'\n\n':'')+'[발표 주제]\n'+q;
    setBusy('pp',true);$('ppMeta').textContent=AI.model+' 로 구성 중…';$('ppPrev').innerHTML='<div class="out">구성하는 중…</div>';
    var p=aiChat({messages:[{role:'system',content:sys},{role:'user',content:user}],json:true,options:{num_ctx:8192,temperature:0.4},onToken:function(t,d,tps){$('ppMeta').textContent=AI.model+' · '+tps.toFixed(1)+' 토큰/초 · '+t.length+'자';}});
    startRun('pp',p);
    p.then(function(t){
      var j=parseJsonLoose(t);
      if(!j||!Array.isArray(j.slides)||!j.slides.length)throw new Error('AI가 구성을 올바른 형식으로 만들지 못했어요. 다시 시도하거나 더 큰 모델을 써 보세요.');
      j.slides=j.slides.slice(0,n+2).map(function(s){return {title:String(s.title||'제목 없음').slice(0,80),bullets:(Array.isArray(s.bullets)?s.bullets:String(s.bullets||'').split('\n')).map(function(x){return String(x).trim();}).filter(Boolean).slice(0,8),notes:String(s.notes||'')};});
      if(rag.sources.length)j.slides.push({title:'참고 자료',bullets:rag.sources.slice(0,8),notes:'이 발표는 위 자료를 바탕으로 AI가 구성했어요.'});
      deck={title:String(j.title||q.slice(0,40)),subtitle:String(j.subtitle||''),slides:j.slides};ppRender();$('ppMeta').textContent='완료 · 내용을 고친 뒤 내려받으세요';
    }).catch(function(e){$('ppPrev').innerHTML='<div class="out">⚠ '+esc(e.message)+'</div>';}).then(function(){setBusy('pp',false);});
  };
  $('ppStop').onclick=function(){stopRun('pp');};
  $('ppDl').onclick=function(){
    if(!deck)return;$('ppMeta').textContent='파일 만드는 중…';
    loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js').then(function(){
      var C=$('ppTheme').value,pres=new window.PptxGenJS();pres.layout='LAYOUT_WIDE';pres.title=deck.title;
      var s0=pres.addSlide();s0.background={color:C};
      s0.addText(deck.title,{x:0.8,y:2.2,w:11.7,h:1.6,fontSize:40,bold:true,color:'FFFFFF',fontFace:'Malgun Gothic',valign:'middle'});
      if(deck.subtitle)s0.addText(deck.subtitle,{x:0.8,y:3.9,w:11.7,h:0.8,fontSize:20,color:'FFFFFF',fontFace:'Malgun Gothic'});
      deck.slides.forEach(function(s,i){
        var sl=pres.addSlide();sl.background={color:'FFFFFF'};
        sl.addShape(pres.ShapeType.rect,{x:0,y:0,w:13.33,h:1.2,fill:{color:C}});
        sl.addText(s.title,{x:0.6,y:0.15,w:12.1,h:0.9,fontSize:28,bold:true,color:'FFFFFF',fontFace:'Malgun Gothic',valign:'middle'});
        var bl=(s.bullets||[]).map(function(b,k){return {text:b,options:{bullet:true,breakLine:k<s.bullets.length-1}};});
        if(bl.length)sl.addText(bl,{x:0.8,y:1.6,w:11.8,h:5.2,fontSize:bl.length>6?18:22,color:'1D2433',fontFace:'Malgun Gothic',valign:'top',paraSpaceAfter:10});
        sl.addText(String(i+1),{x:12.3,y:7.0,w:0.7,h:0.3,fontSize:11,color:'667085',align:'right'});
        if(s.notes)sl.addNotes(s.notes);
      });
      return pres.writeFile({fileName:(deck.title.replace(/[\\/:*?"<>|]/g,'').slice(0,40)||'발표자료')+'.pptx'});
    }).then(function(){$('ppMeta').textContent='✅ 내려받았어요';}).catch(function(e){$('ppMeta').textContent='⚠ '+e.message;});
  };

  /* ---------------- 시각화 ---------------- */
  var vz={kind:'flowchart',svg:''};
  function vzShowMermaid(code){
    $('vzStage').textContent='그리는 중…';
    return loadScript('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js').then(function(){
      window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'default',flowchart:{htmlLabels:false},fontFamily:'Malgun Gothic, sans-serif'});
      return window.mermaid.render('mm'+Date.now(),code);
    }).then(function(r){vz.svg=r.svg;$('vzStage').innerHTML=r.svg;}).catch(function(e){$('vzStage').innerHTML='<div class="out">⚠ 그림 문법이 올바르지 않아요. 코드를 고치거나 "수정 요청"을 눌러 보세요.<br><span class="mini">'+esc((e&&e.message||'').slice(0,160))+'</span></div>';vz.svg='';});
  }
  function vzShowChart(spec){
    $('vzStage').innerHTML='<canvas id="vzCv" style="max-width:640px"></canvas>';
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js').then(function(){
      if(vz.chart){vz.chart.destroy();}
      var type=/^(bar|line|pie|doughnut)$/.test(spec.type)?spec.type:'bar';
      vz.chart=new window.Chart($('vzCv'),{type:type,data:{labels:spec.labels||[],datasets:(spec.datasets||[]).map(function(d,i){return {label:d.label||('데이터'+(i+1)),data:d.data||[],backgroundColor:['#0f766e','#175cd3','#b54708','#7a3db8','#d92d20','#067647'][i%6]+(type==='pie'||type==='doughnut'?'':'cc')};})},options:{responsive:true,plugins:{title:{display:!!spec.title,text:spec.title||''}},animation:false}});
      vz.svg='';
    }).catch(function(e){$('vzStage').innerHTML='<div class="out">⚠ '+esc(e.message)+'</div>';});
  }
  function vzApply(code){
    code=String(code||'').trim();
    if(vz.kind==='chart'){var j=parseJsonLoose(code);if(!j){$('vzStage').innerHTML='<div class="out">⚠ 차트 정보를 읽지 못했어요</div>';return Promise.resolve();}$('vzCode').value=JSON.stringify(j,null,1);return vzShowChart(j);}
    $('vzCode').value=code;return vzShowMermaid(code);
  }
  function mermaidFrom(t){var m=String(t||'').match(/```(?:mermaid)?\s*([\s\S]*?)```/);var c=(m?m[1]:String(t||'')).trim();return c.replace(/^mermaid\s*\n/i,'');}
  function vzGen(extra){
    var q=$('vzQ').value.trim();if(!q){$('vzMeta').textContent='무엇을 그릴지 적어 주세요';return;}
    if(needAi('vzMeta'))return;
    vz.kind=$('vzKind').value;var course=$('vzCourse').value||null,rag=$('vzRag').checked&&vz.kind!=='chart'?ragBlock(q,course,[],2400):{text:'',sources:[]};
    var sys,user,json=false;
    if(vz.kind==='chart'){
      json=true;sys='너는 데이터 차트를 설계하는 조교다. 반드시 JSON 하나만 출력한다. 형식: {"type":"bar|line|pie|doughnut","title":"제목","labels":["라벨"],"datasets":[{"label":"이름","data":[숫자]}]}. 사용자가 적어 준 수치만 사용하고 없는 수치를 만들어 내지 않는다.';
      user='[요청]\n'+q+(extra?'\n\n[현재 차트]\n'+$('vzCode').value+'\n[수정 요청]\n'+extra:'');
    }else{
      var kindName={flowchart:'flowchart TD(위에서 아래로 흐르는 흐름도)',sequence:'sequenceDiagram',state:'stateDiagram-v2',class:'classDiagram',er:'erDiagram',mindmap:'mindmap'}[vz.kind];
      sys='너는 개념을 그림으로 설명하는 조교다. Mermaid 문법의 '+kindName+' 코드만 출력한다. 설명 문장 없이 ```mermaid 코드블록 하나만 쓴다. 노드 글자는 한국어로 짧게 쓰고, 특수문자(괄호·따옴표·콜론)는 피하거나 큰따옴표로 감싼다. '+POLICY.replace('한국어 존댓말로 쓴다.','');
      user=(rag.text?'[강의자료]\n'+rag.text+'\n\n':'')+'[그릴 내용]\n'+q+(extra?'\n\n[현재 코드]\n'+$('vzCode').value+'\n[수정 요청]\n'+extra:'');
    }
    setBusy('vz',true);$('vzStage').textContent='AI가 구성하는 중…';
    var p=aiChat({messages:[{role:'system',content:sys},{role:'user',content:user}],json:json,options:{temperature:0.2},onToken:function(t,d,tps){$('vzMeta').textContent=AI.model+' · '+tps.toFixed(1)+' 토큰/초';}});
    startRun('vz',p);
    p.then(function(t){return vzApply(vz.kind==='chart'?t:mermaidFrom(t));}).catch(function(e){$('vzStage').innerHTML='<div class="out">⚠ '+esc(e.message)+'</div>';}).then(function(){setBusy('vz',false);});
  }
  $('vzRun').onclick=function(){vzGen('');};
  $('vzFixBtn').onclick=function(){var f=$('vzFix').value.trim();if(!f)return;if(!$('vzCode').value.trim()){$('vzMeta').textContent='먼저 그림을 만들어 주세요';return;}vzGen(f);};
  $('vzStop').onclick=function(){stopRun('vz');};
  $('vzRedraw').onclick=function(){vzApply($('vzCode').value);};
  $('vzSvg').onclick=function(){if(vz.svg)dlBlob('그림.svg',new Blob([vz.svg],{type:'image/svg+xml'}));else if(vz.chart){vz.chart.canvas.toBlob(function(b){dlBlob('차트.png',b);});}};
  $('vzPng').onclick=function(){
    if(vz.chart){vz.chart.canvas.toBlob(function(b){dlBlob('차트.png',b);});return;}
    if(!vz.svg)return;var svg=$('vzStage').querySelector('svg');if(!svg)return;var bb=svg.getBoundingClientRect();
    svgToPng(vz.svg.indexOf('xmlns=')>=0?vz.svg:vz.svg.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'),Math.max(600,Math.round(bb.width*2)),Math.max(300,Math.round(bb.height*2)),'그림.png').catch(function(e){$('vzMeta').textContent='⚠ '+e.message;});
  };

  /* ---------------- 캔버스 ---------------- */
  var cv={svg:'',w:1080,h:1080};
  function cvShow(code){
    var s=cleanSvg(code);
    if(!s){$('cvStage').innerHTML='<div class="out">⚠ 이미지(SVG)를 읽지 못했어요. 코드를 고치거나 다시 만들어 보세요.</div>';cv.svg='';return;}
    var wh=($('cvFmt').value||'1080x1080').split('x');cv.w=+wh[0];cv.h=+wh[1];
    if(!/viewBox=/i.test(s))s=s.replace('<svg','<svg viewBox="0 0 '+cv.w+' '+cv.h+'"');
    cv.svg=s;$('cvCode').value=s;$('cvStage').innerHTML=s;
  }
  function cvGen(extra){
    var q=$('cvQ').value.trim();if(!q){$('cvMeta').textContent='무엇을 만들지 적어 주세요';return;}
    if(needAi('cvMeta'))return;
    var wh=$('cvFmt').value.split('x'),style=$('cvStyle').value;
    var sys='너는 SVG로 카드뉴스·포스터를 디자인하는 조교다. SVG 코드 하나만 출력한다(```svg 코드블록 가능). 규칙: viewBox="0 0 '+wh[0]+' '+wh[1]+'", 글꼴은 font-family="Malgun Gothic, sans-serif", 배경 사각형으로 전체를 채우고, 글자는 한국어로 짧게, 글자가 영역 밖으로 나가지 않게 줄을 나눠 <text>/<tspan>으로 쓴다. 스타일: '+style+'. 외부 이미지·스크립트·링크는 쓰지 않는다. 사용자가 준 내용만 쓰고 없는 사실을 만들지 않는다.';
    var user='[만들 내용]\n'+q+(extra?'\n\n[현재 SVG]\n'+cv.svg+'\n[수정 요청]\n'+extra:'');
    setBusy('cv',true);$('cvStage').textContent='AI가 디자인하는 중…';
    var p=aiChat({messages:[{role:'system',content:sys},{role:'user',content:user}],options:{temperature:0.5,num_ctx:8192},onToken:function(t,d,tps){$('cvMeta').textContent=AI.model+' · '+tps.toFixed(1)+' 토큰/초 · '+t.length+'자';}});
    startRun('cv',p);
    p.then(function(t){cvShow(t);}).catch(function(e){$('cvStage').innerHTML='<div class="out">⚠ '+esc(e.message)+'</div>';}).then(function(){setBusy('cv',false);});
  }
  $('cvRun').onclick=function(){cvGen('');};
  $('cvFixBtn').onclick=function(){var f=$('cvFix').value.trim();if(!f)return;if(!cv.svg){$('cvMeta').textContent='먼저 이미지를 만들어 주세요';return;}cvGen(f);};
  $('cvStop').onclick=function(){stopRun('cv');};
  $('cvRedraw').onclick=function(){cvShow($('cvCode').value);};
  $('cvSvg').onclick=function(){if(cv.svg)dlBlob('캔버스.svg',new Blob([cv.svg],{type:'image/svg+xml'}));};
  $('cvPng').onclick=function(){if(cv.svg)svgToPng(cv.svg,cv.w,cv.h,'캔버스.png').catch(function(e){$('cvMeta').textContent='⚠ '+e.message;});};

  window.__aiDraw=function(){if(!AI._tried){AI._tried=1;aiConnect();}courseOptions($('svCourse'));courseOptions($('ppCourse'));courseOptions($('vzCourse'));};
  window.__aiTest={aiChat:aiChat,AI:AI,cleanSvg:cleanSvg,parseJsonLoose:parseJsonLoose};
  window.__aiExplain=function(q,ctx,el,done){
    function go(){
      if(!AI.ready||!AI.model){el.innerHTML='내 PC AI가 연결되지 않았어요. <b>AI 작업실</b> 메뉴에서 연결 상태와 설치 안내를 확인해 주세요.';if(done)done();return;}
      var sys='너는 대학생에게 개념을 쉽게 풀어 설명하는 조교다. '+POLICY+' 아래 [자료]에 있는 내용만 바탕으로 설명하고, 자료에 없는 내용을 덧붙이면 "추론:"이라고 표시한다. 5문장 이내로 쓴다.';
      aiChat({messages:[{role:'system',content:sys},{role:'user',content:'[자료]\n'+ctx+'\n\n[질문]\n'+q}],onToken:function(t){el.innerHTML='🖥️ <b>내 PC AI 설명</b> <span class="mini">(AI가 위 자료를 바탕으로 쓴 글이라 틀릴 수 있어요)</span><div style="margin-top:6px">'+fmtOut(t)+'</div>';if(done)done();}}).catch(function(e){el.innerHTML='⚠ '+esc(e.message);});
    }
    if(!AI._tried){AI._tried=1;aiConnect().then(go);}else go();
  };
