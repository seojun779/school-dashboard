  /* ========== 시간표 일정 추가 · 편집 (시간표 화면 안에서) ========== */
  (function(){
    var TKEY='내시간표_일정_v1',editing=null;
    function evs(){var v=ls(TKEY,[]);return Array.isArray(v)?v:[];}
    function modeOf(){return document.querySelector('input[name=tkMode]:checked').value;}
    function modeUI(){var m=modeOf();$('tkDays').hidden=m!=='rep';$('tkDateBox').hidden=m!=='once';}
    function fill(e){
      $('tkTitle').textContent=e?'일정 고치기':'일정 추가';
      $('tkT').value=e?e.title:'';
      $('tkType').value=e&&e.type&&e.type!=='work'?e.type:'etc';
      document.querySelector('input[name=tkMode][value='+(e&&e.date?'once':'rep')+']').checked=true;
      [].forEach.call($('tkDays').querySelectorAll('input'),function(c){c.checked=!!(e&&(e.days||[]).indexOf(+c.value)>=0);});
      $('tkDate').value=e&&e.date?e.date:iso(new Date());
      $('tkS').value=e?e.start||'':'';$('tkE').value=e?e.end||'':'';
      $('tkP').value=e?e.place||'':'';$('tkM').value=e?e.memo||'':'';
      $('tkErr').textContent='';$('tkDel').hidden=!e;modeUI();
    }
    function open(id){
      editing=id||null;
      var e=id?evs().filter(function(x){return x.id===id;})[0]:null;
      if(id&&!e)return;
      fill(e);$('tkPv').hidden=false;$('tkT').focus();
    }
    function close(){$('tkPv').hidden=true;editing=null;}
    function refresh(){if(typeof drawGrid==='function')drawGrid();if(typeof home==='function')home();if(typeof calDraw==='function')calDraw();}
    [].forEach.call(document.querySelectorAll('input[name=tkMode]'),function(r){r.addEventListener('change',modeUI);});
    if($('ttAdd'))$('ttAdd').onclick=function(){open(null);};
    $('tkX').onclick=close;
    $('tkSave').onclick=function(){
      var title=$('tkT').value.trim(),m=modeOf(),days=[],date='',s=$('tkS').value,en=$('tkE').value;
      if(!title){$('tkErr').textContent='제목을 적어 주세요.';return;}
      if(m==='rep'){[].forEach.call($('tkDays').querySelectorAll('input:checked'),function(c){days.push(+c.value);});if(!days.length){$('tkErr').textContent='요일을 하나 이상 골라 주세요.';return;}}
      else{date=$('tkDate').value;if(!date){$('tkErr').textContent='날짜를 골라 주세요.';return;}}
      if(s&&en&&en<=s){$('tkErr').textContent='끝나는 시간이 시작보다 늦어야 해요.';return;}
      var o={id:editing||('u'+Date.now().toString(36)),title:title,type:$('tkType').value,days:days,date:date,start:s,end:en,place:$('tkP').value.trim(),memo:$('tkM').value.trim()};
      var l=evs(),i=-1;l.forEach(function(x,k){if(x.id===o.id)i=k;});
      if(i>=0)l[i]=o;else l.push(o);
      lsSet(TKEY,l);close();refresh();
    };
    $('tkDel').onclick=function(){
      if(!editing||!confirm('이 일정을 지울까요?'))return;
      lsSet(TKEY,evs().filter(function(x){return x.id!==editing;}));close();refresh();
    };
    /* 시간표의 일정 칸을 누르면 고치기 */
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-eid]');
      if(b&&$('s-time')&&$('s-time').contains(b))open(b.getAttribute('data-eid'));
    });
  })();
