const sessions=[
 {name:'Sydney',tz:'Australia/Sydney',hours:'22:00–07:00'},
 {name:'Tokyo',tz:'Asia/Tokyo',hours:'00:00–09:00'},
 {name:'London',tz:'Europe/London',hours:'08:00–17:00'},
 {name:'New York',tz:'America/New_York',hours:'13:00–22:00'}
];

const demoNews=[
 {time:'14:30',impact:'HIGH',title:'USD — Major economic release',meta:'Demo calendar event'},
 {time:'16:00',impact:'MEDIUM',title:'USD — Economic data',meta:'Demo calendar event'},
 {time:'18:30',impact:'LOW',title:'EUR — Scheduled release',meta:'Demo calendar event'}
];

function nowIn(tz){return new Date(new Date().toLocaleString('en-US',{timeZone:tz}))}
function isOpen(s){
 const d=nowIn(s.tz), mins=d.getHours()*60+d.getMinutes();
 const [a,b]=s.hours.split('–').map(x=>{const [h,m]=x.split(':').map(Number);return h*60+m});
 return a<b ? mins>=a&&mins<b : mins>=a||mins<b;
}
function updateClock(){
 const d=new Date();
 document.getElementById('clock').textContent=d.toLocaleTimeString('en-GB',{timeZone:'Asia/Colombo'});
 document.getElementById('date').textContent=d.toLocaleDateString('en-GB',{timeZone:'Asia/Colombo',weekday:'long',day:'2-digit',month:'long',year:'numeric'});
 const open=sessions.filter(isOpen);
 const overlap=open.length>1;
 document.getElementById('session').textContent=overlap?'SESSION OVERLAP':(open[0]?.name.toUpperCase()||'MARKET CLOSED');
 document.getElementById('sessionDetail').textContent=open.length?open.map(x=>x.name).join(' + '):'No major session currently open';
 renderSessions();
}
function renderSessions(){
 const el=document.getElementById('sessionGrid');
 el.innerHTML=sessions.map(s=>`<div class="session ${isOpen(s)?'active':''}">
 <div class="session-name">${s.name}</div><div class="session-time">${s.hours}</div>
 <div class="session-state ${isOpen(s)?'ok':''}">${isOpen(s)?'● OPEN':'○ CLOSED'}</div></div>`).join('');
}
function renderNews(){
 document.getElementById('newsList').innerHTML=demoNews.map(n=>`<div class="news">
 <div class="impact ${n.impact==='HIGH'?'high':n.impact==='MEDIUM'?'medium':'low'}">${n.impact}</div>
 <div><div class="news-title">${n.title}</div><div class="news-meta">${n.meta}</div></div><b>${n.time}</b></div>`).join('');
 const high=demoNews.some(n=>n.impact==='HIGH');
 document.getElementById('newsRisk').textContent=high?'HIGH IMPACT':'LOW RISK';
 document.getElementById('newsRisk').className='badge '+(high?'warn':'ok');
}
function renderDemoRegime(){
 // UI placeholder only. Replace this function with live Lumora/API values.
 const regime={score:72,name:'TRENDING / MODERATE',text:'Demo state — live ADX, ATR, EMA and price data required.',trend:'BUY',adx:'28.4',atr:'NORMAL',volatility:'MEDIUM',ema:'BULLISH'};
 for(const [id,val] of Object.entries({regimeScore:regime.score,regimeName:regime.name,regimeText:regime.text,trend:regime.trend,adx:regime.adx,atr:regime.atr,volatility:regime.volatility,ema:regime.ema})) document.getElementById(id).textContent=val;
 document.getElementById('regimeBadge').textContent='DEMO';
 document.getElementById('marketStatus').textContent='TRADEABLE';
 document.getElementById('marketStatusDetail').textContent='Demo regime only — not a live signal';
 document.getElementById('decision').textContent='CONDITIONAL';
 document.getElementById('dSession').textContent=sessions.some(isOpen)?'OPEN':'CLOSED';
 document.getElementById('dNews').textContent='HIGH RISK';
 document.getElementById('dRegime').textContent='72/100';
 document.getElementById('entryQuality').textContent='—';
 document.getElementById('decisionReason').textContent='Connect live market + economic calendar data before using the dashboard for entry decisions.';
}
updateClock();renderNews();renderDemoRegime();setInterval(updateClock,1000);
