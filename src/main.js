// Paradise under pressure — explorer mode (data lives in data.js, loaded before this file)

const ISLANDS = [
 ["Guam","Guam",13.4,144.8],["Northern Mariana Islands","N. Mariana Is.",15.2,145.7],
 ["Palau","Palau",7.5,134.6],["Micronesia, Federated State of","Micronesia",6.9,158.2],
 ["Marshall Islands","Marshall Is.",7.1,171.4],["Kiribati","Kiribati",1.4,173.0],
 ["Nauru","Nauru",-0.52,166.93],["Papua New Guinea","PNG",-6.3,145.0],
 ["Solomon Islands","Solomon Is.",-9.6,160.2],["Tuvalu","Tuvalu",-8.5,179.2],
 ["Vanuatu","Vanuatu",-15.4,166.9],["New Caledonia","New Caledonia",-21.3,165.5],
 ["Fiji","Fiji",-17.7,178.0],["Wallis and Futuna","Wallis & Futuna",-13.3,183.8],
 ["Tokelau","Tokelau",-9.2,188.2],["Tonga","Tonga",-21.2,184.8],
 ["Samoa","Samoa",-13.8,188.2],["American Samoa","Am. Samoa",-14.3,189.3],
 ["Niue","Niue",-19.1,190.1],["Cook Islands","Cook Is.",-21.2,200.2],
 ["French Polynesia","Fr. Polynesia",-17.6,210.4],
];

// ── helpers ──
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function valueAt(s,yr){ if(!s)return null; const ys=Object.keys(s).map(Number).sort((a,b)=>a-b); if(!ys.length)return null;
  if(yr<=ys[0])return s[ys[0]]; if(yr>=ys[ys.length-1])return s[ys[ys.length-1]];
  for(let i=0;i<ys.length-1;i++){ if(yr>=ys[i]&&yr<=ys[i+1]){const t=(yr-ys[i])/(ys[i+1]-ys[i]);return lerp(s[ys[i]],s[ys[i+1]],t);} } return null; }
// forward/back fill sst arrays
const SST0=DATA.sstStart;
for(const c in DATA.sst){ const a=DATA.sst[c]; let last=null;
  for(let i=0;i<a.length;i++){ if(a[i]==null)a[i]=last; else last=a[i]; }
  let nxt=null; for(let i=a.length-1;i>=0;i--){ if(a[i]==null)a[i]=nxt; else nxt=a[i]; } }
function sstAt(c,yr){ const a=DATA.sst[c]; if(!a)return null; const i=clamp(Math.round(yr)-SST0,0,a.length-1); return a[i]; }

function grad(stops,v){ if(v<=stops[0][0])v=stops[0][0]; const n=stops.length;
  if(v>=stops[n-1][0])return stops[n-1][1];
  for(let i=0;i<n-1;i++){ if(v>=stops[i][0]&&v<=stops[i+1][0]){ const t=(v-stops[i][0])/(stops[i+1][0]-stops[i][0]);
    const a=stops[i][1],b=stops[i+1][1]; return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)]; } } return stops[n-1][1]; }
const col=rgb=>new THREE.Color(rgb[0]/255,rgb[1]/255,rgb[2]/255);

const max=(obj)=>Math.max(...Object.values(obj).map(v=>Math.max(...Object.values(v))));
const MAX={tour:max(DATA.tourism), ghg:max(DATA.ghg), aff:max(DATA.affected), gen:max(DATA.gentotal)};
const MAX_PEAK={}; for(const k in DATA.tourism) MAX_PEAK[k]=Math.max(...Object.values(DATA.tourism[k]));

// diverging sea-temp scale: three vivid anchors, interpolated in two stages
// (cold→neutral, neutral→warm). Gamma-boosted + clamped so the common small
// anomalies (±0.3–0.5 °C) already separate visibly instead of only the extremes.
const SST_COLD=[24,138,228], SST_COOL=[42,168,168], SST_MID=[205,150,48], SST_WARM=[242,56,24];
const SST_CLAMP=1.2, SST_GAMMA=0.55;
function sstT(v){ const t=clamp(v/SST_CLAMP,-1,1); return Math.sign(t)*Math.pow(Math.abs(t),SST_GAMMA); }
const mix=(a,b,f)=>col([lerp(a[0],b[0],f),lerp(a[1],b[1],f),lerp(a[2],b[2],f)]);
function sstColor(v){ const w=sstT(v);
  if(w>=0) return mix(SST_MID,SST_WARM,w);
  // cold flank runs through a saturated teal so it never turns muddy grey-green
  const f=-w;
  return f<0.5 ? mix(SST_MID,SST_COOL,f*2) : mix(SST_COOL,SST_COLD,(f-0.5)*2); }
const VIT =[[0,[46,75,87]],[1,[255,178,96]]];
// renewables scale: fixed anchors, two-stage (grey-beige → yellow-green → vivid green)
const REN_LOW=[158,150,128], REN_MIDC=[150,192,74], REN_HIGH=[34,208,106];
function renColor(share){ const t=Math.pow(clamp(share/100,0,1),0.8);
  return t<0.5 ? mix(REN_LOW,REN_MIDC,t*2) : mix(REN_MIDC,REN_HIGH,(t-0.5)*2); }

// ── LAYERS ──
const LAYERS=[
 { id:"tourism", label:"Tourism", yearRange:[1995,2024],
   yearLabel:"Overnight visitors", legend:["Height = annual arrivals · warmth = vitality vs. each island's peak",[[46,75,87],[255,178,96]]],
   value:(k,y)=>valueAt(DATA.tourism[k],y),
   color:(v,k)=>col(grad(VIT,clamp(v/(MAX_PEAK[k]||1),0,1))),
   height:(v)=> v==null?0 : 0.02+Math.sqrt(v/MAX.tour)*0.55,
   tip:(v)=>v==null?"—":Math.round(v).toLocaleString("en-US")+" visitors" },

 { id:"sst", label:"Sea temp", yearRange:[1900,2025], render:"glow",
   yearLabel:"Sea-surface temperature anomaly", legend:["Colour of the ocean glow = °C above / below the 20th-century normal · size = magnitude",[SST_COLD,SST_COOL,SST_MID,SST_WARM]],
   value:(k,y)=>sstAt(k,y),
   color:(v)=> v==null?col([40,60,70]) : sstColor(v),
   height:()=>0, // renders as an ocean glow, not a bar
   tip:(v)=>v==null?"—":(v>0?"+":"")+v.toFixed(1)+" °C" },

 { id:"ghg", label:"Emissions", yearRange:[1990,2024], render:"arcs",
   yearLabel:"Emissions per person · tonnes",
   legend:["Arcs flow in from symbolic world regions (illustrative — not bilateral emission data) · brightness = the island's per-capita emissions",[[130,90,30],[255,196,64]]],
   value:(k,y)=>valueAt(DATA.ghg[k],y),
   color:()=>col([255,196,64]),
   height:()=>0, // renders as flow arcs, not a bar
   tip:(v)=>v==null?"—":v.toFixed(1)+" t / person" },

 { id:"disasters", label:"Disasters", yearRange:[2005,2023], render:"rings",
   yearLabel:"Disaster shockwaves",
   legend:["Shockwave rings · pulse rate = people affected that year · ring reach = direct economic loss (US$)",[[120,25,18],[255,52,38]]],
   value:(k,y)=>{ const s=DATA.affected[k]; if(!s)return null; const yr=Math.round(y); return s[yr]!=null?s[yr]:null; },
   loss:(k,y)=>{ const s=DATA.econloss[k]; if(!s)return null; const yr=Math.round(y); return s[yr]!=null?s[yr]:null; },
   color:()=>col([255,52,38]),
   height:()=>0, // renders as expanding rings, not a bar
   tip:(v)=>(v==null)?"—":Math.round(v).toLocaleString("en-US")+" affected" },

 { id:"renewables", label:"Renewables", yearRange:[2000,2023], render:"wreath",
   yearLabel:"Renewable share of electricity",
   legend:["Slowly rotating dot-ring · colour = renewable share (grey → green) · ring size = total power generation",[REN_LOW,REN_MIDC,REN_HIGH]],
   value:(k,y)=>valueAt(DATA.renewshare[k],y),
   gen:(k,y)=>valueAt(DATA.gentotal[k],y),
   color:(v)=> v==null?col([60,70,75]) : renColor(v),
   height:()=>0, // renders as a rotating wreath, not a bar
   tip:(v)=>v==null?"—":v.toFixed(0)+" % renewable" },
];

// ── three.js ──
const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.1,100);
const globe=new THREE.Group(); scene.add(globe);

function llv(lat,lon,r){const phi=(90-lat)*Math.PI/180,th=lon*Math.PI/180;
  return new THREE.Vector3(r*Math.sin(phi)*Math.cos(th),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(th));}

// earth: real coastlines from a water mask (water=white, land=black), duotoned into the
// project palette (teal ocean, warm beige land); topology map adds relief on land.
// Until the CDN textures arrive (or if they fail) the fallbacks yield a plain teal ball.
const whiteTex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1,THREE.RGBAFormat); whiteTex.needsUpdate=true;
const blackTex=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1,THREE.RGBAFormat); blackTex.needsUpdate=true;
const earthMat=new THREE.ShaderMaterial({
  uniforms:{
    water:{value:whiteTex},
    topo:{value:blackTex},
    oceanCol:{value:new THREE.Color(0x0a2c37)},
    landCol:{value:new THREE.Color(0xcfc4a6)},
    lightDir:{value:new THREE.Vector3(-0.45,0.35,1).normalize(),}
  },
  vertexShader:`varying vec2 vUv;varying vec3 vN;
    void main(){vUv=uv;vN=normalize(normalMatrix*normal);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D water;uniform sampler2D topo;
    uniform vec3 oceanCol;uniform vec3 landCol;uniform vec3 lightDir;
    varying vec2 vUv;varying vec3 vN;
    void main(){
      float w=texture2D(water,vUv).r;
      float t=texture2D(topo,vUv).r;
      vec3 land=landCol*(0.8+1.3*t);
      vec3 base=mix(land,oceanCol,smoothstep(0.35,0.65,w));
      float diff=clamp(dot(normalize(vN),normalize(lightDir)),0.0,1.0);
      gl_FragColor=vec4(base*(0.72+0.45*diff),1.0);
    }`});
const earth=new THREE.Mesh(new THREE.SphereGeometry(1,64,64),earthMat);
globe.add(earth);
const texLoader=new THREE.TextureLoader(); texLoader.crossOrigin='anonymous';
texLoader.load('https://cdn.jsdelivr.net/npm/three-globe@2.24.10/example/img/earth-water.png',
  tex=>{earthMat.uniforms.water.value=tex;},undefined,()=>{/* keep teal fallback */});
texLoader.load('https://cdn.jsdelivr.net/npm/three-globe@2.24.10/example/img/earth-topology.png',
  tex=>{earthMat.uniforms.topo.value=tex;},undefined,()=>{/* flat land fallback */});

// atmosphere (fresnel) + stars — kept from the original scene
const atmo=new THREE.Mesh(new THREE.SphereGeometry(1.18,64,64),new THREE.ShaderMaterial({
  transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,
  vertexShader:`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 vN;void main(){float i=pow(0.62-dot(vN,vec3(0.0,0.0,1.0)),2.2);gl_FragColor=vec4(0.30,0.78,0.82,1.0)*i;}`}));
scene.add(atmo);
const stG=new THREE.BufferGeometry(),sp=[]; for(let i=0;i<700;i++){const r=18+Math.random()*22,th=Math.random()*6.283,ph=Math.acos(2*Math.random()-1);sp.push(r*Math.sin(ph)*Math.cos(th),r*Math.cos(ph),r*Math.sin(ph)*Math.sin(th));}
stG.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
scene.add(new THREE.Points(stG,new THREE.PointsMaterial({color:0x9fc6cf,size:0.06,transparent:true,opacity:0.5})));

// ── per-island, per-layer visuals: bars (arms-globe style) for most layers,
// a soft additive ocean glow hugging the water surface for "glow" layers ──
const barGeo=new THREE.BoxGeometry(1,1,1); barGeo.translate(0,0,0.5); // grows outward along +z
const BAR_W=0.016;
const glowTex=(()=>{ // radial falloff sprite texture
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  const rg=g.createRadialGradient(64,64,0,64,64,64);
  rg.addColorStop(0,'rgba(255,255,255,1)');
  rg.addColorStop(0.35,'rgba(255,255,255,0.5)');
  rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=rg; g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
})();
const glowGeo=new THREE.PlaneGeometry(1,1);
// symbolic origin points for emission-flow arcs — a visual metaphor for
// "caused elsewhere", NOT real bilateral emission sources
const ARC_SOURCES=[["North America",40,-100],["Europe",50,10],["East Asia",33,118]];
const ARC_N=64, ARC_COL=0xffc440, ARC_PART_COL=0xffe2a6;
function arcPoints(a,b){ // great-circle path lifted above the surface, flight-route style
  const pts=[]; const h=0.12+0.22*(a.angleTo(b)/Math.PI);
  for(let i=0;i<=ARC_N;i++){ const t=i/ARC_N;
    pts.push(a.clone().lerp(b,t).normalize().multiplyScalar(1+Math.sin(Math.PI*t)*h)); }
  return pts;
}
// one shared thin annulus, scaled per island per frame (no per-frame geometry)
const ringGeo=new THREE.RingGeometry(0.93,1,48);
const nodes=ISLANDS.map(([key,label,lat,lon],ni)=>{
  const base=llv(lat,lon,1);
  const bars={};
  LAYERS.forEach(L=>{
    if(L.render==='wreath'){ // renewables: dot-ring hovering at the island, spins in place
      const N=10, pos=new Float32Array(N*3);
      for(let i=0;i<N;i++){const a=i/N*Math.PI*2; pos[i*3]=Math.cos(a); pos[i*3+1]=Math.sin(a);}
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(pos,3));
      const mat=new THREE.PointsMaterial({color:0x9a9480,size:0.015,map:glowTex,
        transparent:true,opacity:0,depthWrite:false});
      const wreath=new THREE.Points(g,mat);
      wreath.position.copy(base).multiplyScalar(1.006);
      wreath.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),base.clone().normalize());
      wreath.scale.set(0.001,0.001,1); wreath.visible=false;
      globe.add(wreath);
      bars[L.id]={bar:wreath,mat,cur:{r:0.001,opacity:0,color:new THREE.Color(0.5,0.48,0.42)}};
      return;
    }
    if(L.render==='rings'){ // disaster shockwave: two flat rings tangent to the surface, half a pulse apart
      const mkRing=()=>{
        const mat=new THREE.MeshBasicMaterial({color:0xff3426,transparent:true,opacity:0,
          side:THREE.DoubleSide,depthWrite:false});
        const ring=new THREE.Mesh(ringGeo,mat);
        ring.position.copy(base).multiplyScalar(1.0035);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),base.clone().normalize());
        ring.scale.set(0.001,0.001,1); ring.visible=false;
        globe.add(ring);
        return {ring,mat};
      };
      const r1=mkRing(), r2=mkRing();
      bars[L.id]={bar:r1.ring,mat:r1.mat,bar2:r2.ring,mat2:r2.mat,cur:{opacity:0}};
      return;
    }
    if(L.render==='arcs'){ // thin additive arcs from each source + one particle per arc
      const arcs=ARC_SOURCES.map(([,sLat,sLon])=>{
        const pts=arcPoints(llv(sLat,sLon,1),base);
        const geo=new THREE.BufferGeometry().setFromPoints(pts);
        // brightness ramps toward the island, so the flow direction reads at a glance
        const cols=new Float32Array((ARC_N+1)*3);
        for(let i=0;i<=ARC_N;i++){const b=0.10+0.90*Math.pow(i/ARC_N,1.6);cols.set([b,b,b],i*3);}
        geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
        const mat=new THREE.LineBasicMaterial({color:ARC_COL,vertexColors:true,transparent:true,opacity:0,
          blending:THREE.AdditiveBlending,depthWrite:false});
        const line=new THREE.Line(geo,mat);
        line.visible=false; globe.add(line);
        return {line,mat,pts};
      });
      const TRAIL=3; // comet: bright head + two fading tail points per arc
      const pGeo=new THREE.BufferGeometry();
      pGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(arcs.length*TRAIL*3),3));
      const pcols=new Float32Array(arcs.length*TRAIL*3);
      for(let ai=0;ai<arcs.length;ai++)for(let k=0;k<TRAIL;k++){
        const b=[1,0.5,0.24][k]; pcols.set([b,b,b],(ai*TRAIL+k)*3); }
      pGeo.setAttribute('color',new THREE.BufferAttribute(pcols,3));
      const pMat=new THREE.PointsMaterial({color:ARC_PART_COL,size:0.035,map:glowTex,vertexColors:true,
        transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
      const particles=new THREE.Points(pGeo,pMat);
      particles.visible=false; globe.add(particles);
      bars[L.id]={arcs,particles,pMat,cur:{opacity:0}};
      return;
    }
    let mesh,mat;
    if(L.render==='glow'){ // flat disc tangent to the sphere, just above the water
      mat=new THREE.MeshBasicMaterial({map:glowTex,color:0x2e4b57,transparent:true,opacity:0,
        blending:THREE.AdditiveBlending,depthWrite:false});
      mesh=new THREE.Mesh(glowGeo,mat);
      mesh.position.copy(base).multiplyScalar(1.004);
      mesh.scale.set(0.001,0.001,1);
    }else{
      mat=new THREE.MeshBasicMaterial({color:0x2e4b57,transparent:true,opacity:0});
      mesh=new THREE.Mesh(barGeo,mat);
      mesh.position.copy(base);
      mesh.scale.set(BAR_W,BAR_W,0.001);
    }
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),base.clone().normalize());
    globe.add(mesh);
    bars[L.id]={bar:mesh,mat,cur:{h:0,opacity:0,color:new THREE.Color(0.2,0.3,0.35)}};
  });
  const el=document.createElement('div'); el.className='lbl'; el.textContent=label; document.getElementById('labels').appendChild(el);
  return {key,label,lat,lon,base,bars,el,seed:ni*0.137};
});

// ── picking via greyscale lookup texture (each island = unique grey value) ──
const PICK_W=2048,PICK_H=1024,PICK_STEP=10,PICK_R=12;
const pickCanvas=document.createElement('canvas'); pickCanvas.width=PICK_W; pickCanvas.height=PICK_H;
{ const g=pickCanvas.getContext('2d');
  g.fillStyle='rgb(0,0,0)'; g.fillRect(0,0,PICK_W,PICK_H);
  ISLANDS.forEach(([,, lat,lon],i)=>{
    const gv=(i+1)*PICK_STEP;
    const x=(((lon+180)%360+360)%360)/360*PICK_W, y=(90-lat)/180*PICK_H;
    g.fillStyle=`rgb(${gv},${gv},${gv})`;
    g.beginPath(); g.arc(x,y,PICK_R,0,Math.PI*2); g.fill();
  }); }
const pickData=pickCanvas.getContext('2d').getImageData(0,0,PICK_W,PICK_H).data;
const rc=new THREE.Raycaster(),m2=new THREE.Vector2();
function pickIsland(cx,cy){
  m2.x=(cx/innerWidth)*2-1; m2.y=-(cy/innerHeight)*2+1;
  rc.setFromCamera(m2,camera);
  const hit=rc.intersectObject(earth);
  if(!hit.length)return null;
  const p=hit[0].point; // globe group is untransformed → world == local
  const lat=90-Math.acos(clamp(p.y/p.length(),-1,1))*180/Math.PI;
  const lon=Math.atan2(p.z,p.x)*180/Math.PI;
  const x=clamp(Math.round((((lon+180)%360+360)%360)/360*PICK_W),0,PICK_W-1);
  const y=clamp(Math.round((90-lat)/180*PICK_H),0,PICK_H-1);
  const gv=pickData[(y*PICK_W+x)*4];
  const idx=Math.round(gv/PICK_STEP)-1;
  return (idx>=0&&idx<nodes.length)?nodes[idx]:null;
}

// ── controls: free rotate + zoom, damped ──
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enablePan=false;
controls.enableDamping=true; controls.dampingFactor=0.06;
controls.minDistance=1.4; controls.maxDistance=6;
controls.autoRotate=true; controls.autoRotateSpeed=0.25;
camera.position.copy(llv(-10,187,3.15)); controls.update();
let focusTarget=null;
controls.addEventListener('start',()=>{controls.autoRotate=false; focusTarget=null;});

// ── pointer: hover tooltip + click-to-focus ──
const tip=document.getElementById('tip');
let downX=0,downY=0;
const dom=renderer.domElement;
dom.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});
dom.addEventListener('pointerup',e=>{
  if(Math.abs(e.clientX-downX)>6||Math.abs(e.clientY-downY)>6)return;
  const n=pickIsland(e.clientX,e.clientY);
  if(n){focusTarget=n.base.clone().normalize(); controls.autoRotate=false;}
});
dom.addEventListener('pointermove',e=>{
  const n=pickIsland(e.clientX,e.clientY);
  const act=LAYERS.filter(L=>activeLayers.has(L.id));
  if(n&&act.length){
    const rows=act.map(L=>`<span>${L.label}: ${L.tip(L.value(n.key,curYear))}</span>`).join('<br>');
    tip.innerHTML=`<b>${n.label}</b><br>${rows}`;
    tip.style.left=e.clientX+'px'; tip.style.top=e.clientY+'px'; tip.style.opacity=1;}
  else tip.style.opacity=0;
});
dom.addEventListener('pointerleave',()=>{tip.style.opacity=0;});

// ── UI: layer toggle-chips (multi-select) + one global year slider ──
const activeLayers=new Set(["tourism"]); // Set<layerId>; empty set is valid
let curYear=2019;
const layersEl=document.getElementById('layers'),
      slider=document.getElementById('yearSlider'),
      elYear=document.querySelector('#year .big'),
      elYLab=document.querySelector('#year .lab'),
      elLeg=document.getElementById('legend');
LAYERS.forEach(L=>{const b=document.createElement('button');b.className='layer';b.textContent=L.label;
  b.setAttribute('role','checkbox');
  b.onclick=()=>toggleLayer(L.id);layersEl.appendChild(b);});
function toggleLayer(id){
  if(activeLayers.has(id))activeLayers.delete(id); else activeLayers.add(id);
  syncUI();
}
function syncUI(){
  const act=LAYERS.filter(L=>activeLayers.has(L.id));
  if(act.length){ // slider spans the union of all active year ranges
    const lo=Math.min(...act.map(L=>L.yearRange[0])), hi=Math.max(...act.map(L=>L.yearRange[1]));
    slider.min=lo; slider.max=hi; slider.disabled=false;
    curYear=clamp(curYear,lo,hi); slider.value=curYear;
  } else { slider.disabled=true; if(typeof setPlaying==='function'&&playing)setPlaying(false); }
  playBtn&&(playBtn.disabled=slider.disabled);
  elYear.textContent=Math.round(curYear);
  // with many layers the joined label runs across the globe — the legend already
  // names every active layer, so cap the subtitle at two
  elYLab.textContent=act.length<=2 ? act.map(L=>L.yearLabel).join('  ·  ') : '';
  elLeg.innerHTML=act.map(L=>{
    const stops=L.legend[1].map(c=>`rgb(${c.join(',')})`).join(',');
    return `<div class="row"><span class="sw" style="background:linear-gradient(90deg,${stops})"></span><b>${L.label}</b>&nbsp;— ${L.legend[0]}</div>`;}).join('');
  [...layersEl.children].forEach((b,j)=>{
    const on=activeLayers.has(LAYERS[j].id);
    b.classList.toggle('on',on); b.setAttribute('aria-checked',on);
  });
}
slider.oninput=()=>{curYear=+slider.value; elYear.textContent=Math.round(curYear);};
// play button: sweeps the year through the active range, looping
const playBtn=document.getElementById('playBtn');
let playing=false;
function setPlaying(v){ playing=v;
  playBtn.classList.toggle('on',v); playBtn.innerHTML=v?'&#10073;&#10073;':'&#9654;'; }
playBtn.onclick=()=>{ if(!slider.disabled)setPlaying(!playing); };
syncUI();

// ── per-frame update: every layer animates its own visual; inactive layers fade out ──
const tmp=new THREE.Vector3(),camDir=new THREE.Vector3();
let tSec=0;
function update(dt){
  tSec+=dt;
  if(playing&&!slider.disabled){ // ~2.4 years per second, loops back to the start
    curYear+=dt*2.4;
    const lo=+slider.min,hi=+slider.max;
    if(curYear>hi)curYear=lo;
    slider.value=curYear; elYear.textContent=Math.round(curYear);
  }
  camDir.copy(camera.position).normalize();
  const camDist=camera.position.length();
  const e=clamp(dt*5,0,1);
  nodes.forEach(n=>{
    let topH=0, topOp=0, glowOn=false; // tallest visible bar drives the island label
    LAYERS.forEach(L=>{
      const s=n.bars[L.id], cur=s.cur;
      if(L.render==='wreath'){ // renewables: both indicators required, else no ring
        let target=0;
        if(activeLayers.has(L.id)){
          const share=L.value(n.key,curYear);
          const gen=L.gen(n.key,curYear);
          if(share!=null&&gen!=null){
            target=0.9;
            cur.r=lerp(cur.r,0.028+0.05*clamp(Math.sqrt(gen/3600),0,1),e); // size = generation
            cur.color.lerp(L.color(share,n.key),e);                        // colour = share
          }
        }
        cur.opacity=lerp(cur.opacity,target,e);
        s.bar.visible=cur.opacity>0.02;
        s.mat.opacity=cur.opacity;
        s.mat.color.copy(cur.color);
        s.bar.scale.set(Math.max(cur.r,0.001),Math.max(cur.r,0.001),1);
        s.bar.rotateZ(dt*0.9); // decorative constant spin around the island's vertical axis
        if(cur.opacity>0.3)glowOn=true;
        return;
      }
      if(L.render==='rings'){ // disaster shockwave: no data (or zero impact) → no ring
        let master=0, aff=null, loss=null;
        if(activeLayers.has(L.id)){
          aff=L.value(n.key,curYear);
          loss=L.loss(n.key,curYear);
          if((aff!=null&&aff>0)||(loss!=null&&loss>0))master=1;
        }
        cur.opacity=lerp(cur.opacity,master,e);
        const vis=cur.opacity>0.02;
        s.bar.visible=vis; s.bar2.visible=vis;
        if(vis){
          const am=aff!=null&&aff>0?clamp(Math.log10(1+aff)/5.8,0,1):0.4;  // → pulse rate
          const lm=loss!=null&&loss>0?clamp(Math.log10(1+loss)/9,0,1):0.45; // → max reach
          const period=lerp(3.2,0.9,am);
          const maxR=0.05+0.13*lm;
          const p=(tSec/period+n.seed*7.3)%1;          // repeating pulse phase 0→1
          const setRing=(mesh,mat,ph,dim)=>{           // expands fast, fades as it spreads
            const r=Math.max(maxR*Math.pow(ph,0.55),0.004);
            mesh.scale.set(r,r,1);
            mat.opacity=cur.opacity*0.95*Math.pow(1-ph,1.4)*dim;
          };
          setRing(s.bar,s.mat,p,1);
          setRing(s.bar2,s.mat2,(p+0.5)%1,0.55);
          if(cur.opacity>0.3)glowOn=true;
        }
        return;
      }
      if(L.render==='arcs'){ // emission flow: no data → no arc at all
        let target=0;
        if(activeLayers.has(L.id)){
          const v=L.value(n.key,curYear);
          if(v!=null){ // log scale: 0.1 t…200 t per capita share one readable range
            const m=clamp(Math.log10(1+v)/1.5,0,1);
            target=0.16+0.64*m;
          }
        }
        cur.opacity=lerp(cur.opacity,target,e);
        const vis=cur.opacity>0.02;
        s.arcs.forEach(a=>{a.mat.opacity=cur.opacity*0.5;a.line.visible=vis;});
        s.pMat.opacity=Math.min(cur.opacity*1.7,1);
        s.particles.visible=vis;
        if(vis){ // comet trail per arc drifting source → island
          const pos=s.particles.geometry.attributes.position;
          s.arcs.forEach((a,ai)=>{
            const head=(tSec*0.16+n.seed+ai*0.37)%1;
            for(let k=0;k<3;k++){
              const ph=Math.max(head-k*0.022,0);
              const f=ph*(a.pts.length-1), i0=Math.floor(f), ft=f-i0;
              const p0=a.pts[i0], p1=a.pts[Math.min(i0+1,a.pts.length-1)];
              pos.setXYZ(ai*3+k,lerp(p0.x,p1.x,ft),lerp(p0.y,p1.y,ft),lerp(p0.z,p1.z,ft));
            }
          });
          pos.needsUpdate=true;
          if(cur.opacity>0.3)glowOn=true; // arcs alone may carry the island label
        }
        return;
      }
      if(L.render==='glow'){ // ocean glow: size + intensity follow |anomaly|
        let size=0, opacity=0;
        if(activeLayers.has(L.id)){
          const v=L.value(n.key,curYear);
          if(v!=null){
            const m=Math.abs(sstT(v)); // gamma-boosted, so small anomalies already glow
            size=0.045+0.035*m;        // stays small so neighbouring islands don't merge
            opacity=0.6+0.4*m;
            cur.color.lerp(L.color(v,n.key),e);
          }
        }
        cur.h=lerp(cur.h,size,e);
        cur.opacity=lerp(cur.opacity,opacity,e);
        const sc=Math.max(cur.h,0.001);
        s.bar.scale.set(sc,sc,1);
        // subtle breathing keeps the ocean feeling alive without changing the reading
        s.mat.opacity=cur.opacity*(0.9+0.1*Math.sin(tSec*1.6+n.seed*40));
        s.mat.color.copy(cur.color);
        s.bar.visible=cur.opacity>0.02;
        if(cur.opacity>0.3)glowOn=true; // glow alone may carry the label
        return; // does not raise the label anchor
      }
      let h=0, opacity=0;
      if(activeLayers.has(L.id)){
        const v=L.value(n.key,curYear);
        h=L.height(v,n.key,curYear)||0;
        opacity=(v==null||h<=0)?0:0.95;
        if(v!=null)cur.color.lerp(L.color(v,n.key),e);
      }
      cur.h=lerp(cur.h,h,e);
      cur.opacity=lerp(cur.opacity,opacity,e);
      s.bar.scale.set(BAR_W,BAR_W,Math.max(cur.h,0.001));
      s.mat.opacity=cur.opacity;
      s.mat.color.copy(cur.color);
      s.bar.visible=cur.opacity>0.02;
      if(cur.h>topH){topH=cur.h;topOp=cur.opacity;}
    });
    // label at the tip of the tallest bar (or on the surface if only a glow is visible)
    const facing=n.base.dot(camDir);
    tmp.copy(n.base).multiplyScalar(1+topH+0.03);
    const pr=tmp.project(camera);
    const show=((topH>0.12&&topOp>0.3)||glowOn) && facing>0.25 && pr.z<1;
    if(show){n.el.style.display='block';
      n.el.style.left=((pr.x*.5+.5)*innerWidth)+'px';
      n.el.style.top=((-pr.y*.5+.5)*innerHeight-10)+'px';
      n.el.style.opacity=clamp((facing-0.25)*3,0,1)*clamp((camDist-1.45)*2,0,1);}
    else n.el.style.display='none';
  });
}

let prev=performance.now();
function animate(){requestAnimationFrame(animate);
  const now=performance.now(),dt=Math.min((now-prev)/1000,0.05);prev=now;
  if(focusTarget){
    const dist=camera.position.length();
    const cur=camera.position.clone().normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(cur,focusTarget);
    const step=new THREE.Quaternion().slerp(q,clamp(dt*3,0,1));
    camera.position.copy(cur.applyQuaternion(step).multiplyScalar(dist));
    if(camera.position.clone().normalize().angleTo(focusTarget)<0.01)focusTarget=null;
  }
  controls.update();
  update(dt);
  renderer.render(scene,camera);}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);resize();
animate();
