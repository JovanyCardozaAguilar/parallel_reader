(function(){
'use strict';
var LANGS=['en','es','de'],LABEL={en:'English',es:'Español',de:'Deutsch'};
var $=function(i){return document.getElementById(i)};
var analysis=get0('analysis')==='1',man,cache={},cur={book:'GEN',ch:'1'},ui=localStorage.getItem('ui')||'en';
function get0(k){try{return localStorage.getItem(k)}catch(e){return null}}
function store(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
var active=(get('langs')||'en,es,de').split(',').filter(function(l){return LANGS.indexOf(l)>=0});
if(!active.length)active=['en'];

function bookData(l,code){
  var k=l+'/'+code;
  if(!cache[k])cache[k]=fetch('data/'+k+'.json').then(function(r){if(!r.ok)throw new Error(r.status);return r.json()});
  return cache[k];
}
function name(code){return man.names[ui==='es'||ui==='de'?ui:'en'][code]}
function fillBooks(){
  var s=$('book'),h='',sec='';
  man.order.forEach(function(c){
    var g=c===man.ntStart?'New Testament':c===man.appStart?'Further books':'';
    if(g||!sec){if(sec)h+='</optgroup>';sec=g||'Old Testament (with deuterocanon)';h+='<optgroup label="'+sec+'">'}
    h+='<option value="'+c+'">'+esc(name(c))+'</option>';
  });
  s.innerHTML=h+'</optgroup>';
}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fillChapters(){
  $('chapter').innerHTML=man.books[cur.book].map(function(c){return'<option>'+c+'</option>'}).join('');
  $('chapter').value=cur.ch;
}
function parseHash(){
  var m=/^#([0-9A-Z]{3})\.(\d+)(?:\.(\w+))?$/.exec(location.hash);
  if(m&&man.books[m[1]]&&man.books[m[1]].indexOf(m[2])>=0)return{book:m[1],ch:m[2],v:m[3]};
}
function go(book,ch,v,noPush){
  cur.book=book;cur.ch=ch;$('book').value=book;fillChapters();
  var h='#'+book+'.'+ch+(v?'.'+v:'');
  if(!noPush&&location.hash!==h)history.pushState(null,'',h);
  render(v);
}
function render(vsel){
  var R=$('reader'),book=cur.book,ch=cur.ch,want=active.slice();
  R.innerHTML='<p class="msg">Loading…</p>';
  Promise.all(want.map(function(l){return bookData(l,book)})).then(function(res){
    if(book!==cur.book||ch!==cur.ch)return;
    var data={};want.forEach(function(l,i){data[l]=res[i].c[ch]});
    // union of verse keys, in grid order
    var keys=[],seen={};
    want.forEach(function(l){data[l].v.forEach(function(p){if(!seen[p[0]]){seen[p[0]]=1;keys.push(p[0])}})});
    keys.sort(cmp);
    var maps={};want.forEach(function(l){maps[l]={};data[l].v.forEach(function(p){maps[l][p[0]]=p})});
    var bridgeCover={};
    want.forEach(function(l){bridgeCover[l]={};var b=data[l].b||{};for(var a in b){for(var n=+a+1;n<=+b[a];n++)bridgeCover[l][n]=a}});
    var h='<h1>'+esc(name(book))+' '+esc(ch)+'</h1><div class="grid" style="--n:'+want.length+'">';
    want.forEach(function(l){h+='<div class="hd">'+LABEL[l]+'</div>'});
    var any=false;want.forEach(function(l){if(data[l].t)any=true});
    if(any)want.forEach(function(l){h+='<div class="c ti" data-l="'+l+'">'+esc(data[l].t||'')+'</div>'});
    keys.forEach(function(k){
      var isNum=/^\d+$/.test(k);
      want.forEach(function(l,i){
        var it=maps[l][k],t=it&&it[1],cls='c v'+(i===0?' v-row-start':''),inner='',sc='';
        var b=data[l].b||{};
        if(t===undefined){cls+=' empty'}
        else if(!t.trim()){
          var cov=isNum&&bridgeCover[l][k];
          if(cov){cls+=' ref';inner='<sup>'+k+'</sup>↑ '+cov+'–'+b[cov]}
          else cls+=' empty';
        }else{
          var lab=b[k]?k+'–'+b[k]:k;
          inner='<sup'+(isNum?'':' class="x"')+'>'+esc(lab)+'</sup>'+body(data[l],k,t,it);
        }
        if(it){sc=l==='de'?it[2]:l;if(!t.trim()&&l==='de')sc='N'}
        if(analysis&&it)inner+=tag(l,k,t,sc,data[l]);
        h+='<div class="'+cls+'" data-v="'+k+'" data-l="'+l+'"'+(analysis&&sc?' data-s="'+sc+'"':'')+'>'+inner+'</div>';
      });
    });
    R.innerHTML=h+'</div>';R.className=analysis?'an':'';
    document.title=name(book)+' '+ch+' · Parallel Bible';
    if(vsel){var el=R.querySelector('.c[data-v="'+vsel+'"]');if(el){el.scrollIntoView({block:'center'});hlRow(vsel)}}
    else window.scrollTo(0,0);
  }).catch(function(e){R.innerHTML='<p class="msg">Could not load this book ('+esc(e.message)+').</p>'});
}
function body(d,k,t,it){
  var x=analysis&&d.x&&d.x[k];
  if(!x)return esc(t.trim());
  var o='';x.forEach(function(s){var seg=t.slice(s[0],s[1]);if(k&&s[0]===0)seg=seg.replace(/^\s+/,'');o+='<mark class="m'+s[2].charAt(0)+'">'+esc(seg)+'</mark>'});
  return o;
}
function tag(l,k,t,sc,d){
  var S=man.sources[l],h='<span class="tag">';
  if(l!=='de'){
    h+=t.trim()?'<b>'+(l==='en'?'WEB':'spabll')+'</b> · '+esc(S):'Empty: this verse is omitted in WEB';
  }else{
    var x=d.x&&d.x[k];
    if(x){var seen={};h+=x.filter(function(s){return!seen[s[2]]&&(seen[s[2]]=1)}).map(function(s){return'<b style="--sc:var(--s'+s[2].charAt(0)+')">'+esc(S[s[2]])+'</b>'}).join(' + ')}
    else h+='<b>'+esc(S[sc])+'</b>';
    var n=d.n&&d.n[k];if(n)h+='<i>'+esc(n)+'</i>';
  }
  return h+'</span>';
}
function cmp(a,b){
  var x=/^(\d+)(E\d*)?$/.exec(a),y=/^(\d+)(E\d*)?$/.exec(b);
  if(!x||!y)return a<b?-1:1;
  if(+x[1]!==+y[1])return+x[1]-+y[1];
  var s=x[2]||'',t=y[2]||'';return s===t?0:!s?-1:!t?1:s<t?-1:1;
}
function hlRow(v){
  Array.prototype.forEach.call(document.querySelectorAll('.hl'),function(e){e.classList.remove('hl')});
  Array.prototype.forEach.call(document.querySelectorAll('.c[data-v="'+v+'"]'),function(e){e.classList.add('hl')});
}
function step(d){
  var i=man.order.indexOf(cur.book),chs=man.books[cur.book],j=chs.indexOf(cur.ch)+d;
  if(j>=0&&j<chs.length)return go(cur.book,chs[j]);
  var n=i+d;if(n<0||n>=man.order.length)return;
  var b=man.order[n],c=man.books[b];go(b,d>0?c[0]:c[c.length-1]);
}
function legend(){
  var L=$('legend');L.hidden=!analysis;if(!analysis)return;
  var S=man.sources.de,e=function(c,n){return'<span><i class="sw" style="background:var(--s'+c+')"></i>'+n+'</span>'};
  L.innerHTML=e('en','English: WEB')+e('es','Español: spabll')+e('L','Deutsch: Luther 1912')+e('M','Menge 1939')+e('y','AI synthesis')+e('N','no source text')+'<span>Highlighted parts inside one verse come from different sources. Click a verse for its link.</span>';
}
function applyTheme(t){if(t)document.documentElement.setAttribute('data-theme',t)}
fetch('data/manifest.json').then(function(r){return r.json()}).then(function(m){
  man=m;fillBooks();
  Array.prototype.forEach.call(document.querySelectorAll('#langs input'),function(i){
    i.checked=active.indexOf(i.value)>=0;
    i.addEventListener('change',function(){
      var a=LANGS.filter(function(l){return document.querySelector('#langs input[value='+l+']').checked});
      if(!a.length){i.checked=true;return}
      active=a;store('langs',a.join(','));render();
    });
  });
  $('analysis').checked=analysis;legend();
  $('analysis').addEventListener('change',function(){analysis=this.checked;store('analysis',analysis?'1':'0');legend();render()});
  $('book').addEventListener('change',function(){go(this.value,man.books[this.value][0])});
  $('chapter').addEventListener('change',function(){go(cur.book,this.value)});
  $('prev').addEventListener('click',function(){step(-1)});
  $('next').addEventListener('click',function(){step(1)});
  $('theme').addEventListener('click',function(){
    var d=document.documentElement,now=d.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
    var n=now==='dark'?'light':'dark';d.setAttribute('data-theme',n);store('theme',n);
  });
  $('reader').addEventListener('click',function(e){
    var c=e.target.closest&&e.target.closest('.c[data-v]');if(!c)return;
    var v=c.getAttribute('data-v');hlRow(v);
    history.replaceState(null,'','#'+cur.book+'.'+cur.ch+'.'+v);
  });
  document.addEventListener('keydown',function(e){
    if(/SELECT|INPUT/.test(e.target.tagName))return;
    if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);
  });
  window.addEventListener('hashchange',function(){var p=parseHash();if(p)go(p.book,p.ch,p.v,true)});
  applyTheme(get('theme'));
  var p=parseHash()||{book:'JHN',ch:'1'};
  go(p.book,p.ch,p.v,true);
}).catch(function(){$('reader').innerHTML='<p class="msg">Could not load data/manifest.json. Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>) or via GitHub Pages.</p>'});
})();
