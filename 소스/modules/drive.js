  /* ===== 드라이브: 사이버캠퍼스 자료 + 내가 올린 자료 ===== */
  var UP_KEY='강의지식_업로드',DRV={course:'all',q:'',sort:'course',pvId:null};
  var OTHER='내 업로드(기타)';
  function upStore(){var m=ls(UP_KEY,{});return (m&&typeof m==='object')?m:{};}
  function driveFileById(id){var m=upStore()[id];return m||null;}
  function dbDrive(){return new Promise(function(res,rej){var r=indexedDB.open('sh-drive',1);r.onupgradeneeded=function(){r.result.createObjectStore('blob');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
  function blobPut(id,blob){return dbDrive().then(function(db){return new Promise(function(res){var tx=db.transaction('blob','readwrite');tx.objectStore('blob').put(blob,id);tx.oncomplete=function(){res(true);};tx.onerror=tx.onabort=function(){res(false);};});}).catch(function(){return false;});}
  function blobGet(id){return dbDrive().then(function(db){return new Promise(function(res){var g=db.transaction('blob','readonly').objectStore('blob').get(id);g.onsuccess=function(){res(g.result||null);};g.onerror=function(){res(null);};});}).catch(function(){return null;});}
  function blobDel(id){return dbDrive().then(function(db){return new Promise(function(res){var tx=db.transaction('blob','readwrite');tx.objectStore('blob').delete(id);tx.oncomplete=function(){res();};tx.onerror=function(){res();};});}).catch(function(){});}

  /* ---- 글자 꺼내기 (모두 내 브라우저 안에서) ---- */
  function inflateRaw(u8){var ds=new DecompressionStream('deflate-raw'),w=ds.writable.getWriter();w.write(u8);w.close();return new Response(ds.readable).arrayBuffer().then(function(b){return new Uint8Array(b);});}
  function unzipPick(buf,pick){
    var dv=new DataView(buf),u8=new Uint8Array(buf),n=u8.length,e=-1,out={},jobs=[];
    for(var i=n-22;i>=Math.max(0,n-70000);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break;}}
    if(e<0)return Promise.resolve(out);
    var cnt=dv.getUint16(e+10,true),off=dv.getUint32(e+16,true);
    for(var k=0;k<cnt;k++){
      if(dv.getUint32(off,true)!==0x02014b50)break;
      var meth=dv.getUint16(off+10,true),csz=dv.getUint32(off+20,true),nl=dv.getUint16(off+28,true),el=dv.getUint16(off+30,true),cl=dv.getUint16(off+32,true),lo=dv.getUint32(off+42,true);
      var name=new TextDecoder().decode(u8.subarray(off+46,off+46+nl));off+=46+nl+el+cl;
      if(!pick(name))continue;
      (function(name,meth,csz,lo){
        var lnl=dv.getUint16(lo+26,true),lel=dv.getUint16(lo+28,true),st=lo+30+lnl+lel,raw=u8.subarray(st,st+csz);
        jobs.push((meth===0?Promise.resolve(raw):(meth===8?inflateRaw(raw):Promise.resolve(null))).then(function(d){out[name]=d;}).catch(function(){}));
      })(name,meth,csz,lo);
    }
    return Promise.all(jobs).then(function(){return out;});
  }
  function unxml(s){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
  function numSort(a,b){return parseInt(a.replace(/\D/g,''),10)-parseInt(b.replace(/\D/g,''),10);}
  function pptxText(buf){return unzipPick(buf,function(n){return /^ppt\/slides\/slide\d+\.xml$/.test(n);}).then(function(z){
    return Object.keys(z).sort(numSort).map(function(n,i){var xml=new TextDecoder().decode(z[n]||new Uint8Array()),t=(xml.match(/<a:t(?:\s[^>]*)?>[^<]*<\/a:t>/g)||[]).map(function(x){return unxml(x.replace(/<[^>]+>/g,''));}).filter(function(x){return x.trim();});return t.length?'[슬라이드 '+(i+1)+'] '+t.join(' / '):'';}).filter(Boolean).join('\n');});}
  function docxText(buf){return unzipPick(buf,function(n){return n==='word/document.xml';}).then(function(z){var u=z['word/document.xml'];return u?unxml(new TextDecoder().decode(u).replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'')).trim():'';});}
  function hwpxText(buf){return unzipPick(buf,function(n){return /^Contents\/section\d+\.xml$/.test(n);}).then(function(z){return Object.keys(z).sort(numSort).map(function(n){var xml=new TextDecoder().decode(z[n]||new Uint8Array());return unxml(xml.replace(/<\/hp:p>/g,'\n').replace(/<[^>]+>/g,'')).replace(/\n{2,}/g,'\n').trim();}).join('\n');});}
  var pdfLibP=null;
  function pdfLib(){
    if(pdfLibP)return pdfLibP;
    pdfLibP=loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(function(){window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return window.pdfjsLib;});
    pdfLibP.catch(function(){pdfLibP=null;});return pdfLibP;
  }
  function pdfText(buf){
    return pdfLib().then(function(lib){return lib.getDocument({data:buf}).promise;}).then(function(doc){
      var out=[],p=1;
      return (function next(){if(p>Math.min(doc.numPages,150))return out.join('\n');
        return doc.getPage(p).then(function(pg){return pg.getTextContent();}).then(function(tc){out.push('['+p+'쪽] '+tc.items.map(function(x){return x.str;}).join(' '));p++;return next();});})();
    });
  }
  var TEXTEXT=/^(txt|md|csv|json|xml|html?|css|js|ts|py|java|jsp|c|cpp|h|sql|ipynb|log|yml|yaml|ini|sh|bat)$/;
  function extractFile(file){
    var ext=(file.name.match(/\.([A-Za-z0-9]+)$/)||['',''])[1].toLowerCase();
    var cap=function(t){return String(t||'').replace(/\u0000/g,'').slice(0,400000);};
    if(TEXTEXT.test(ext))return file.text().then(function(t){return {text:cap(t),note:''};});
    if(ext==='pptx')return file.arrayBuffer().then(pptxText).then(function(t){return {text:cap(t),note:''};});
    if(ext==='docx')return file.arrayBuffer().then(docxText).then(function(t){return {text:cap(t),note:''};});
    if(ext==='hwpx')return file.arrayBuffer().then(hwpxText).then(function(t){return {text:cap(t),note:''};});
    if(ext==='pdf')return file.arrayBuffer().then(pdfText).then(function(t){return {text:cap(t),note:(t.replace(/\[\d+쪽\]/g,'').trim().length<40?'글자를 거의 못 읽었어요 (스캔한 PDF일 수 있어요)':'')};});
    if(/^(png|jpe?g|gif|webp|bmp)$/.test(ext))return Promise.resolve({text:'',note:'이미지예요. 글자 인식은 하지 않아요 (문제 풀이에서 직접 첨부하면 AI가 그림을 볼 수 있어요)'});
    if(ext==='hwp')return Promise.resolve({text:'',note:'.hwp는 읽지 못해요. 한글에서 PDF나 .hwpx로 저장해서 올려 주세요'});
    return Promise.resolve({text:'',note:'이 형식('+(ext||'알 수 없음')+')은 글자를 읽지 못해요'});
  }
  function kindOfExt(ext){ext=String(ext||'').toLowerCase();return /pdf/.test(ext)?'pdf':/^pptx?$/.test(ext)?'ppt':/^(docx?|hwpx?)$/.test(ext)?'doc':/^(png|jpe?g|gif|webp|bmp)$/.test(ext)?'img':'';}
  function sizeTxt(n){return !n?'':(n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB');}

  /* ---- 올리기 ---- */
  var upBusy=false;
  function uploadFiles(files){
    var list=[].slice.call(files||[]);if(!list.length||upBusy)return;
    upBusy=true;var course=$('drCourse').value||OTHER,done=0,ok=0,notes=[];
    $('drMsg').textContent='읽는 중… 0/'+list.length;
    return list.reduce(function(chain,f){
      return chain.then(function(){
        if(f.size>80*1048576){notes.push(f.name+': 80MB보다 커서 건너뛰었어요');return;}
        return extractFile(f).then(function(r){
          var id='u'+Date.now().toString(36)+Math.floor(Math.random()*1e5).toString(36),m=upStore();
          m[id]={id:id,c:course,n:f.name,w:0,ext:(f.name.match(/\.([A-Za-z0-9]+)$/)||['',''])[1].toLowerCase(),size:f.size,at:Date.now(),t:r.text||'',note:r.note||''};
          lsSet(UP_KEY,m);return blobPut(id,f).then(function(){ok++;if(r.note)notes.push(f.name+': '+r.note);});
        }).catch(function(e){notes.push(f.name+': 읽지 못했어요 ('+(e&&e.message||'오류')+')');}).then(function(){done++;$('drMsg').textContent='읽는 중… '+done+'/'+list.length;});
      });
    },Promise.resolve()).then(function(){
      upBusy=false;$('drMsg').innerHTML='✅ '+ok+'개를 올렸어요. 공부 도우미가 내용을 학습했어요.'+(notes.length?'<br>'+notes.map(esc).join('<br>'):'');
      if(window.__kbRefresh)window.__kbRefresh();driveDraw();
    });
  }

  /* ---- 목록 ---- */
  function driveItems(){
    var out=[];
    if(has)D.courses.forEach(function(c){(c.mat||[]).forEach(function(m,i){
      var nm=m.n||m.f||'자료',ext=(String(m.f||'').match(/\.([A-Za-z0-9]+)$/)||['',''])[1];
      out.push({src:'cy',id:'c:'+c.id+':'+i,course:c.folder,name:nm,ext:ext,week:(function(){var w=String(m.wk||'').match(/(\d+)/);return w?+w[1]:0;})(),h:m.h,loc:m.loc&&m.f?'첨부파일/'+encodeURIComponent(c.folder)+'/'+encodeURIComponent(m.f):'',at:0,text:''});
    });});
    (window.LOCAL_MATS||[]).forEach(function(x,i){out.push({src:'pc',id:'l:'+i,course:x.folder,name:x.n,ext:(String(x.f||'').match(/\.([A-Za-z0-9]+)$/)||['',''])[1],week:x.ord||0,h:'',loc:'첨부파일/'+encodeURIComponent(x.folder)+'/'+encodeURIComponent(x.f),at:0,text:''});});
    var up=upStore();Object.keys(up).forEach(function(k){var u=up[k];out.push({src:'up',id:u.id,course:u.c,name:u.n,ext:u.ext,week:0,size:u.size,at:u.at,text:u.t||'',note:u.note||''});});
    return out;
  }
  function driveDraw(){
    if(!$('drList'))return;
    var items=driveItems(),courses=[];items.forEach(function(x){if(courses.indexOf(x.course)<0)courses.push(x.course);});
    var cnt=function(c){return items.filter(function(x){return c==='all'||x.course===c;}).length;};
    $('drSide').innerHTML='<button class="fold" data-c="all" aria-current="'+(DRV.course==='all')+'">📁 전체 <small>'+items.length+'</small></button>'+courses.map(function(c){return '<button class="fold" data-c="'+esc(c)+'" aria-current="'+(DRV.course===c)+'">📂 '+esc(c)+' <small>'+cnt(c)+'</small></button>';}).join('');
    var q=DRV.q.toLowerCase().trim(),list=items.filter(function(x){
      if(DRV.course!=='all'&&x.course!==DRV.course)return false;
      if(!q)return true;
      return x.name.toLowerCase().indexOf(q)>=0||x.course.toLowerCase().indexOf(q)>=0||(x.text&&x.text.toLowerCase().indexOf(q)>=0);
    });
    list.sort(function(a,b){
      if(DRV.sort==='new')return (b.at||0)-(a.at||0);
      if(DRV.sort==='name')return a.name.localeCompare(b.name,'ko');
      return a.course.localeCompare(b.course,'ko')||(a.week-b.week)||a.name.localeCompare(b.name,'ko');
    });
    $('drList').innerHTML=list.length?list.map(function(x){
      var k=kindOfExt(x.ext),ic=(x.ext||'file').slice(0,4).toUpperCase(),badge=x.src==='up'?'<span class="badge up">올린 자료</span>':(x.src==='pc'?'<span class="badge">내 PC</span>':'<span class="badge cy">사이버캠퍼스</span>');
      var snip='';if(q&&x.text){var p=x.text.toLowerCase().indexOf(q);if(p>=0)snip='<br><span>…'+esc(x.text.slice(Math.max(0,p-30),p+60).replace(/\s+/g,' '))+'…</span>';}
      var acts=x.src==='up'?'<button class="btn sm ghost" data-pv="'+x.id+'">미리보기</button><button class="btn sm ghost" data-ask="'+x.id+'">AI에게 묻기</button><button class="btn sm red" data-del="'+x.id+'">삭제</button>'
        :(x.src==='pc'?'<a class="btn sm ghost" target="_blank" rel="noopener noreferrer" href="'+esc(x.loc)+'">열기</a>':'<a class="btn sm ghost" target="_blank" rel="noopener noreferrer" href="'+esc(x.loc||x.h||'#')+'">열기</a>');
      return '<div class="fl"><div class="ic '+k+'">'+esc(ic)+'</div><div class="t"><b>'+esc(x.name)+'</b><span>'+esc(x.course)+(x.week?' · '+x.week+(x.src==='pc'?'장':'주차'):'')+(x.size?' · '+sizeTxt(x.size):'')+(x.at?' · '+iso(new Date(x.at)):'')+(x.note?' · ⚠ '+esc(x.note):'')+'</span>'+snip+'</div>'+badge+'<span style="display:flex;gap:4px;flex-wrap:wrap">'+acts+'</span></div>';
    }).join(''):'<div class="empty">'+(items.length?'조건에 맞는 자료가 없어요':'자료가 아직 없어요. 위에서 파일을 올리거나 사이버캠퍼스를 업데이트해 주세요')+'</div>';
    // 올릴 과목 목록
    var cur=$('drCourse').value;$('drCourse').innerHTML=(has?D.courses.map(function(c){return c.folder;}):[]).filter(function(v,i,a){return a.indexOf(v)===i;}).concat([OTHER]).map(function(n){return '<option>'+esc(n)+'</option>';}).join('');
    if(cur)$('drCourse').value=cur;
  }
  function pvOpen(id){
    var f=driveFileById(id);if(!f)return;DRV.pvId=id;
    $('drPvT').textContent=f.n;$('drPvM').textContent=f.c+' · '+sizeTxt(f.size)+' · 글자 '+(f.t||'').length+'자'+(f.note?' · ⚠ '+f.note:'');
    $('drPvB').textContent=f.t?f.t.slice(0,8000)+(f.t.length>8000?'\n\n… (이하 생략, 전체는 AI가 읽어요)':''):'(읽은 글자가 없어요)';
    $('drPv').hidden=false;
  }
  $('drSide').addEventListener('click',function(e){var b=e.target.closest('.fold');if(b){DRV.course=b.getAttribute('data-c');driveDraw();}});
  $('drQ').oninput=function(){DRV.q=this.value;driveDraw();};
  $('drSort').onchange=function(){DRV.sort=this.value;driveDraw();};
  $('drDrop').onclick=function(){$('drFile').click();};
  $('drFile').onchange=function(){uploadFiles(this.files);this.value='';};
  ['dragenter','dragover'].forEach(function(ev){$('drDrop').addEventListener(ev,function(e){e.preventDefault();$('drDrop').classList.add('on');});});
  ['dragleave','drop'].forEach(function(ev){$('drDrop').addEventListener(ev,function(e){e.preventDefault();$('drDrop').classList.remove('on');});});
  $('drDrop').addEventListener('drop',function(e){uploadFiles(e.dataTransfer&&e.dataTransfer.files);});
  $('drList').addEventListener('click',function(e){
    var p=e.target.closest('[data-pv]'),d=e.target.closest('[data-del]'),a=e.target.closest('[data-ask]');
    if(p)pvOpen(p.getAttribute('data-pv'));
    if(a){show('ai');var f=driveFileById(a.getAttribute('data-ask'));if(f){svAttach([f.id]);}}
    if(d){var id=d.getAttribute('data-del'),f=driveFileById(id);if(f&&confirm('"'+f.n+'" 파일을 삭제할까요? (내 브라우저에서만 지워져요)')){var m=upStore();delete m[id];lsSet(UP_KEY,m);blobDel(id).then(function(){if(window.__kbRefresh)window.__kbRefresh();driveDraw();});}}
  });
  $('drPvX').onclick=function(){$('drPv').hidden=true;};
  $('drPv').addEventListener('click',function(e){if(e.target===$('drPv'))$('drPv').hidden=true;});
  $('drPvOpen').onclick=function(){blobGet(DRV.pvId).then(function(b){if(b)window.open(URL.createObjectURL(b),'_blank');else alert('원본 파일이 저장돼 있지 않아요');});};
  $('drPvAsk').onclick=function(){$('drPv').hidden=true;show('ai');svAttach([DRV.pvId]);};
  window.__driveDraw=driveDraw;
  window.__driveFiles=function(){var m=upStore();return Object.keys(m).map(function(k){return m[k];});};

  /* ---- 자료 첨부 고르기 (문제 풀이 · PPT) ---- */
  var ATT={sv:[],pp:[]},attTarget='sv';
  function attDraw(t){var box=$(t==='sv'?'svFiles':'ppFiles');box.innerHTML=ATT[t].map(function(id){var f=driveFileById(id);return f?'<span class="chip">📎 '+esc(f.n)+'<button type="button" data-rm="'+id+'">×</button></span>':'';}).join('');}
  function svAttach(ids){ATT.sv=ATT.sv.concat(ids.filter(function(i){return ATT.sv.indexOf(i)<0;}));attDraw('sv');}
  function openPick(t){
    attTarget=t;var fs=window.__driveFiles().filter(function(f){return f.t;});
    $('filePickList').innerHTML=fs.length?fs.map(function(f){return '<label style="display:flex;gap:8px;padding:5px 0;font-size:.86rem"><input type="checkbox" value="'+f.id+'"'+(ATT[t].indexOf(f.id)>=0?' checked':'')+'> '+esc(f.n)+' <span class="mini">'+esc(f.c)+'</span></label>';}).join(''):'<div class="empty">글자를 읽은 올린 자료가 없어요. 드라이브에서 먼저 올려 주세요.</div>';
    $('filePick').hidden=false;
  }
  $('filePickOk').onclick=function(){ATT[attTarget]=[].map.call($('filePickList').querySelectorAll('input:checked'),function(i){return i.value;});attDraw(attTarget);$('filePick').hidden=true;};
  $('filePickX').onclick=function(){$('filePick').hidden=true;};
  $('svAtt').onclick=function(){openPick('sv');};$('ppAtt').onclick=function(){openPick('pp');};
  $('svFiles').addEventListener('click',function(e){var b=e.target.closest('[data-rm]');if(b){ATT.sv=ATT.sv.filter(function(i){return i!==b.getAttribute('data-rm');});attDraw('sv');}});
  $('ppFiles').addEventListener('click',function(e){var b=e.target.closest('[data-rm]');if(b){ATT.pp=ATT.pp.filter(function(i){return i!==b.getAttribute('data-rm');});attDraw('pp');}});
