// PBallConnect — app.js
// Generated from single-file build

// ── EmailJS Config ─────────────────────────────────
// ── PWA Manifest (injected inline for single-file deployment) ──
(function(){
  const manifest = {
    name: "PBallConnect",
    short_name: "PBallConnect",
    description: "Connect with pickleball players near you",
    start_url: "/",
    display: "standalone",
    background_color: "#0a120b",
    theme_color: "#0a120b",
    orientation: "portrait-primary",
    icons: [
      { src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='80' fill='%230a120b'/><text y='380' x='256' text-anchor='middle' font-size='380'>🏓</text></svg>", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
      { src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='30' fill='%230a120b'/><text y='148' x='96' text-anchor='middle' font-size='140'>🏓</text></svg>", sizes: "192x192", type: "image/svg+xml" }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = url;
  document.head.appendChild(link);
})();

const S={gender:'',skill:'',anytime:false,partner:false,
  waiver:false,photoSrc:null,state:'',stateFips:'',county:'',city:'',email:'',
  court:'',courtName:'',duprVal:null,venues:new Set(),driveDistance:'25 miles',
  playStyle:'',playFormat:'Both',matchGenderPref:'Both',handedness:'',avatarEmoji:'🎾',venuePref:'',playingSince:'',nickname:'',wantsToImprove:'',goalRating:null,hasHadLesson:'',wantsLesson:'',addrLat:null,addrLon:null,_tosConsent:false,_privacyConsent:false,_riskConsent:false,isCoach:'',coachCerts:new Set(),coachLessonTypes:new Set(),coachFormats:new Set(),isOrganizer:'',
  availWeekdayMorning:false,availWeekdayAfternoon:false,availWeekdayEvening:false,availWeekends:false};

const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const TIMES=['Early AM','Morning','Afternoon','Evening'];
const DUPR_VALS=['2.0','2.25','2.5','2.75','3.0','3.25','3.5','3.75','4.0','4.25','4.5','4.75',
  '5.0','5.25','5.5','5.75','6.0','6.25','6.5','6.75','7.0','7.0+'];


const STATE_INFO={
  "01":["AL","Alabama"],"02":["AK","Alaska"],"04":["AZ","Arizona"],"05":["AR","Arkansas"],
  "06":["CA","California"],"08":["CO","Colorado"],"09":["CT","Connecticut"],"10":["DE","Delaware"],
  "12":["FL","Florida"],"13":["GA","Georgia"],"15":["HI","Hawaii"],"16":["ID","Idaho"],
  "17":["IL","Illinois"],"18":["IN","Indiana"],"19":["IA","Iowa"],"20":["KS","Kansas"],
  "21":["KY","Kentucky"],"22":["LA","Louisiana"],"23":["ME","Maine"],"24":["MD","Maryland"],
  "25":["MA","Massachusetts"],"26":["MI","Michigan"],"27":["MN","Minnesota"],"28":["MS","Mississippi"],
  "29":["MO","Missouri"],"30":["MT","Montana"],"31":["NE","Nebraska"],"32":["NV","Nevada"],
  "33":["NH","New Hampshire"],"34":["NJ","New Jersey"],"35":["NM","New Mexico"],"36":["NY","New York"],
  "37":["NC","North Carolina"],"38":["ND","North Dakota"],"39":["OH","Ohio"],"40":["OK","Oklahoma"],
  "41":["OR","Oregon"],"42":["PA","Pennsylvania"],"44":["RI","Rhode Island"],"45":["SC","South Carolina"],
  "46":["SD","South Dakota"],"47":["TN","Tennessee"],"48":["TX","Texas"],"49":["UT","Utah"],
  "50":["VT","Vermont"],"51":["VA","Virginia"],"53":["WA","Washington"],"54":["WV","West Virginia"],
  "55":["WI","Wisconsin"],"56":["WY","Wyoming"]
};
const SMALL_STATES=new Set(["CT","DE","RI","NJ","MD","MA","VT","NH","DC"]);
let usTopoData=null;

// ── State Map ──────────────────────────────────────────
(async function buildMap(){
  try{
    const us=await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    usTopoData=us;
    document.getElementById('mapLoading')?.remove();
    const container=document.getElementById('mapContainer');
    const W=960,H=600;
    const svg=d3.select(container).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','xMidYMid meet');
    const proj=d3.geoAlbersUsa().scale(1280).translate([W/2,H/2]);
    const path=d3.geoPath().projection(proj);
    const states=topojson.feature(us,us.objects.states);
    svg.selectAll('.state').data(states.features).enter().append('path')
      .attr('class','state').attr('d',path).attr('data-fips',d=>d.id)
      .on('mouseenter',function(e,d){
        const fips=String(d.id).padStart(2,'0'),info=STATE_INFO[fips];
        if(info&&!this.classList.contains('sel')) document.getElementById('mapBadge').textContent=info[1];
      })
      .on('mouseleave',function(){
        document.getElementById('mapBadge').textContent=S.state?'📍 '+S.state+' selected':'Click your state to select it';
      })
      .on('click',function(e,d){
        const fips=String(d.id).padStart(2,'0'),info=STATE_INFO[fips];
        if(!info) return;
        svg.selectAll('.state').classed('sel',false);
        d3.select(this).classed('sel',true);
        S.state=info[1]; S.stateFips=fips; S.county=''; S.city=''; S.court=''; S.courtName='';
        document.getElementById('mapBadge').textContent='📍 '+info[1]+' selected';
        showCountyMap(fips,info[1]); chk1();
      });
    states.features.forEach(feat=>{
      const fips=String(feat.id).padStart(2,'0'),info=STATE_INFO[fips];
      if(!info) return;
      const abbr=info[0],c=path.centroid(feat);
      if(!c||isNaN(c[0])||isNaN(c[1])) return;
      if(!SMALL_STATES.has(abbr))
        svg.append('text').attr('class','lbl').attr('x',c[0]).attr('y',c[1]+2)
          .attr('text-anchor','middle').attr('dominant-baseline','middle').text(abbr);
    });
    svg.append('path').datum(topojson.mesh(us,us.objects.states,(a,b)=>a!==b))
      .attr('fill','none').attr('stroke','rgba(76,175,125,0.3)').attr('stroke-width','0.5px').attr('d',path);
  }catch(err){const ml=document.getElementById('mapLoading');if(ml)ml.textContent='⚠️ Map failed to load.';console.error(err);}
})();

// ── County Map ─────────────────────────────────────────
async function showCountyMap(stateFips,stateName){
  document.getElementById('stateMapSection').style.display='none';
  document.getElementById('countySection').style.display='block';
  document.getElementById('citySection').style.display='none';
  document.getElementById('countyStateName').textContent=stateName;
  const container=document.getElementById('countyMapContainer');
  container.innerHTML='<div id="countyLoading">🗺️ Loading counties…</div>';
  document.getElementById('countyBadge').textContent='Click your county to select it';
  try{
    const us=await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json");
    document.getElementById('countyLoading').remove();
    const W=960,H=600;
    const svg=d3.select(container).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','xMidYMid meet');
    const allC=topojson.feature(us,us.objects.counties);
    const stateC={type:'FeatureCollection',features:allC.features.filter(f=>String(f.id).padStart(5,'0').startsWith(stateFips))};
    const proj=d3.geoAlbersUsa().fitSize([W,H],stateC);
    const path=d3.geoPath().projection(proj);
    svg.selectAll('.county').data(stateC.features).enter().append('path')
      .attr('class','county').attr('d',path).attr('data-id',d=>d.id)
      .on('mouseenter',function(e,d){
        if(!this.classList.contains('sel')) document.getElementById('countyBadge').textContent=d.properties.name+' County';
      })
      .on('mouseleave',function(){
        document.getElementById('countyBadge').textContent=S.county?'📍 '+S.county+' selected':'Click your county to select it';
      })
      .on('click',function(e,d){
        svg.selectAll('.county').classed('sel',false);
        d3.select(this).classed('sel',true);
        S.county=d.properties.name; S.city=''; S.court=''; S.courtName='';
        // Compute geographic bbox from the county feature's actual coordinates
        const coords=[];
        function extractCoords(geom){
          if(geom.type==='Polygon') geom.coordinates[0].forEach(c=>coords.push(c));
          else if(geom.type==='MultiPolygon') geom.coordinates.forEach(p=>p[0].forEach(c=>coords.push(c)));
        }
        extractCoords(d.geometry);
        if(coords.length){
          const lons=coords.map(c=>c[0]), lats=coords.map(c=>c[1]);
          S.countyBbox={
            west:Math.min(...lons), east:Math.max(...lons),
            south:Math.min(...lats), north:Math.max(...lats)
          };
        }
        document.getElementById('countyBadge').textContent='📍 '+d.properties.name+' County selected';
        showCitySelector(stateName); chk1();
      });
    svg.append('path')
      .datum(topojson.mesh(us,us.objects.counties,(a,b)=>a!==b&&String(a.id).padStart(5,'0').startsWith(stateFips)&&String(b.id).padStart(5,'0').startsWith(stateFips)))
      .attr('fill','none').attr('stroke','rgba(76,175,125,0.25)').attr('stroke-width','0.4px').attr('d',path);
    if(usTopoData){
      const sf=topojson.feature(usTopoData,usTopoData.objects.states).features.find(f=>String(f.id).padStart(2,'0')===stateFips);
      if(sf) svg.append('path').datum(sf).attr('fill','none').attr('stroke','rgba(76,175,125,0.7)').attr('stroke-width','1.2px').attr('d',path);
    }
  }catch(err){document.getElementById('countyMapContainer').innerHTML='⚠️ County map failed to load.';console.error(err);}
}


function addManualCityInput(){
  if(document.getElementById('cityManual')) return;
  const inp=document.createElement('input');
  inp.type='text'; inp.id='cityManual'; inp.placeholder='Enter your city or town…';
  inp.style.cssText="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 16px;color:#fff;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;margin-top:10px;";
  inp.oninput=function(){
    S.city=this.value.trim(); S.court=''; S.courtName=''; chk1();
    if(S.city.length>=2){const cs=document.getElementById('courtsSection');if(cs)cs.style.display='block';}
  };
  document.getElementById('citySelect').parentNode.parentNode.appendChild(inp);
}

async function onCitySelected(){
  const val=document.getElementById('citySelect').value;
  S.court=''; S.courtName='';
  if(!val){S.city=''; chk1(); return;}
  const parsed=JSON.parse(val);
  S.city=parsed.name; chk1();
  // Show venue checklist immediately
  const csEl=document.getElementById('courtsSection');if(csEl)csEl.style.display='block';
}

// ── fetchNearbyCourts (retired — venues now use checklist) ──
async function fetchNearbyCourts(lat,lon,cityName){
  // No longer used — replaced by venue checklist
}

// ── Court entry ────────────────────────────────────────
function addCourt(){
  const inp=document.getElementById('courtEntryInput');
  const name=inp.value.trim();
  if(!name) return;
  S.venues.add(name);
  inp.value='';
  renderCourtChecklist();
}
function removeCourt(name){
  S.venues.delete(name);
  renderCourtChecklist();
}
function renderCourtChecklist(){
  const list=document.getElementById('courtChecklist');
  if(!list) return;
  if(S.venues.size===0){
    list.innerHTML='<div class="court-empty">No courts added yet — type a court name above and click Add</div>';
    return;
  }
  list.innerHTML='';
  S.venues.forEach(name=>{
    const item=document.createElement('div');
    item.className='court-check-item';
    const item2=item;
    item2.innerHTML=
      '<div class="court-check-left">'+
        '<input type="checkbox" checked onchange="if(!this.checked) removeCourt(this.dataset.court)" data-court="'+name.replace(/"/g,'&quot;')+'"/>'+
        '<span class="court-check-name">'+name+'</span>'+
      '</div>'+
      '<button class="court-remove" data-court="'+name.replace(/"/g,'&quot;')+'" onclick="removeCourt(this.dataset.court)">✕</button>';
    list.appendChild(item);
  });
}
function onVenueChange(){}
function onDriveChange(val){
  const miles=parseInt(val);
  const pct=((miles-5)/(50-5)*100).toFixed(1)+'%';
  document.getElementById('driveDistance').style.setProperty('--pct',pct);
  const label=miles>=50?'50+ miles':miles+' miles';
  document.getElementById('driveDisplay').textContent=label;
  S.driveDistance=label;
}


function haversine(la1,lo1,la2,lo2){
  const R=6371,dL=(la2-la1)*Math.PI/180,dLo=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}



// ── Map reset helpers ──────────────────────────────────
function clearStateSelection(){
  S.state=''; S.stateFips=''; S.county=''; S.city=''; S.court=''; S.courtName='';
  document.getElementById('stateMapSection').style.display='block';
  document.getElementById('countySection').style.display='none';
  document.getElementById('citySection').style.display='none';
  if(document.querySelector('#mapContainer svg'))
    document.querySelectorAll('#mapContainer svg .state').forEach(p=>p.classList.remove('sel'));
  document.getElementById('mapBadge').textContent='Click your state to select it';
  chk1();
}
function clearCountySelection(){
  S.county=''; S.city=''; S.court=''; S.courtName='';
  document.getElementById('countySection').style.display='block';
  document.getElementById('citySection').style.display='none';
  if(document.querySelector('#countyMapContainer svg'))
    document.querySelectorAll('#countyMapContainer svg .county').forEach(p=>p.classList.remove('sel'));
  document.getElementById('countyBadge').textContent='Click your county to select it';
  chk1();
}

// ── DUPR ──────────────────────────────────────────────
function updateDupr(idx){
  const pct=(idx/21*100).toFixed(1)+'%';
  document.getElementById('duprSlider').style.setProperty('--pct',pct);
  if(!parseInt(idx)){S.duprVal=null;document.getElementById('duprDisplay').innerHTML='-- <span>not set — slide to choose</span>';}
  else{S.duprVal=DUPR_VALS[parseInt(idx)];document.getElementById('duprDisplay').innerHTML=S.duprVal+(S.duprVal==='7.0+'?'':' <span>DUPR</span>');}
}

function buildGoalTicks(minIdx){
  console.log('[ticks] buildGoalTicks called', minIdx);
  const ticks=document.getElementById('goalTicks');
  if(!ticks) return;
  ticks.innerHTML='';
  ticks.style.cssText='position:relative;height:26px;margin-top:2px;';
  // Full-number indices: 2.0=0, 3.0=4, 4.0=8, 5.0=12, 6.0=16, 7.0=20
  const fullNumIdxs=[0,4,8,12,16,20];
  for(let i=0;i<=21;i++){
    const ratio=(i/21).toFixed(4);
    const isFull=fullNumIdxs.includes(i);
    const isPast=i<minIdx;
    const tickColor=isPast?'rgba(239,68,68,0.4)':'rgba(156,163,175,0.6)';
    const labelColor=isPast?'rgba(239,68,68,0.6)':'var(--dim)';
    const sp=document.createElement('span');
    sp.style.cssText='position:absolute;left:calc(11px + '+ratio+' * (100% - 22px));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;';
    if(isFull){
      sp.innerHTML=
        '<span style="display:block;width:2px;height:8px;background:'+tickColor+';"></span>'+
        '<span style="font-size:9px;color:'+labelColor+';margin-top:1px;white-space:nowrap;">'+
          (DUPR_VALS[i]==='7.0+'?'7.0':DUPR_VALS[i])+
        '</span>';
    } else {
      sp.innerHTML='<span style="display:block;width:1px;height:4px;background:'+tickColor+';margin-top:2px;"></span>';
    }
    ticks.appendChild(sp);
  }
}

function buildStaticSliderTicks(containerId){
  console.log('[ticks] buildStaticSliderTicks called:', containerId);
  const ticks=document.getElementById(containerId);
  if(!ticks) return;
  ticks.innerHTML='';
  ticks.style.cssText='position:relative;height:26px;margin-top:2px;';
  const fullNumIdxs=[0,4,8,12,16,20];
  const tickColor='rgba(156,163,175,0.6)';
  const labelColor='var(--dim)';
  for(let i=0;i<=21;i++){
    const ratio=(i/21).toFixed(4);
    const isFull=fullNumIdxs.includes(i);
    const sp=document.createElement('span');
    sp.style.cssText='position:absolute;left:calc(11px + '+ratio+' * (100% - 22px));transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;';
    if(isFull){
      sp.innerHTML=
        '<span style="display:block;width:2px;height:8px;background:'+tickColor+';"></span>'+
        '<span style="font-size:9px;color:'+labelColor+';margin-top:1px;white-space:nowrap;">'+
          (DUPR_VALS[i]==='7.0+'?'7.0':DUPR_VALS[i])+
        '</span>';
    } else {
      sp.innerHTML='<span style="display:block;width:1px;height:4px;background:'+tickColor+';margin-top:2px;"></span>';
    }
    ticks.appendChild(sp);
  }
}

function updateGoalRedBar(minIdx, goalIdx){
  const redBar   = document.getElementById('goalSliderRedBar');
  const greenBar = document.getElementById('goalSliderGreenBar');
  const xMarker  = document.getElementById('goalRedLabel');
  if(!redBar) return;

  const redPct  = (minIdx/21*100).toFixed(1);
  const goalPct = (goalIdx/21*100).toFixed(1);

  // Black bar: 0 → personal rating (represents the floor you can't go below)
  redBar.style.width        = redPct+'%';
  redBar.style.background   = '#dc2626';
  redBar.style.borderRadius = '3px 0 0 3px';

  // ✕ marker at personal rating position
  if(xMarker){
    if(minIdx>0){
      xMarker.style.display    = 'block';
      xMarker.style.left       = 'calc(11px + '+(minIdx/21).toFixed(4)+' * (100% - 22px))';
      xMarker.style.transform  = 'translateX(-50%)';
      xMarker.style.color      = '#991b1b';
      xMarker.style.fontWeight = '900';
      xMarker.style.fontSize   = '14px';
      xMarker.textContent      = '✕';
    } else {
      xMarker.style.display = 'none';
    }
  }

  // Green bar: personal rating → goal (only when goal > personal)
  if(greenBar){
    if(goalIdx>minIdx){
      greenBar.style.left        = redPct+'%';
      greenBar.style.width       = (goalPct-redPct)+'%';
      greenBar.style.background  = '#2563eb';
      greenBar.style.borderRadius= '0 3px 3px 0';
    } else {
      greenBar.style.width = '0%';
    }
  }
}

function toggleGoalRating(answer){
  // Legacy wrapper — old data stored 'Yes'/'No', new UI uses 'improve'/'fun'
  const val = (answer.trim()==='Yes'||answer.trim()==='improve') ? 'improve' : 'fun';
  selectImproveGoal(val);
}
function updateGoalRating(idx){
  const i=parseInt(idx);
  const personalSlider=document.getElementById('personalRatingSlider');
  const minIdx=personalSlider?parseInt(personalSlider.value):0;
  // If user drags into red zone, snap thumb back to personal rating
  const finalIdx=Math.max(i,minIdx);
  const sl=document.getElementById('goalRatingSlider');
  if(sl){
    sl.min=0; // keep at 0 so thumb renders across full track
    if(finalIdx!==i){
      // Snap back — user tried to go below personal rating
      sl.value=finalIdx;
    }
    const pct=(finalIdx/21*100).toFixed(1)+'%';
    sl.style.setProperty('--pct',pct);
  }
  updateGoalRedBar(minIdx, finalIdx);
  // Update floating thumb label above slider
  const thumbLabel = document.getElementById('goalThumbLabel');
  if(thumbLabel){
    if(!finalIdx){
      thumbLabel.style.display='none';
    } else {
      const ratio=(finalIdx/21).toFixed(4);
      thumbLabel.style.left='calc(11px + '+ratio+' * (100% - 22px))';
      thumbLabel.textContent = DUPR_VALS[finalIdx];
      thumbLabel.style.display='block';
    }
  }
  if(!finalIdx){
    S.goalRating=null;
    const gd=document.getElementById('goalRatingDisplay');
    if(gd) gd.innerHTML='-- <span>slide right to set your goal</span>';
  } else {
    S.goalRating=DUPR_VALS[finalIdx];
    const gd=document.getElementById('goalRatingDisplay');
    if(gd) gd.innerHTML=S.goalRating+' <span>Goal Rating</span>';
  }
  updateGoalGapViz();
}

// ── Photo ─────────────────────────────────────────────
function handlePhoto(e){
  const f=e.target.files[0]; if(!f) return;
  // Validate size (10MB max)
  if(f.size > 10*1024*1024){ showToast('⚠️ Photo must be under 10MB'); return; }
  const r=new FileReader();
  r.onload=ev=>{
    S.photoSrc=ev.target.result;
    const preview=document.getElementById('photoPreview');
    preview.innerHTML=`<img class="photo-upload-img" src="${ev.target.result}" alt="Profile photo"/>`;
    document.getElementById('photoRemoveRow').style.display='flex';
    document.getElementById('photoFileName').textContent=f.name+' ('+Math.round(f.size/1024)+'KB)';
  };
  r.readAsDataURL(f);
}
function removePhoto(){
  S.photoSrc=null;
  document.getElementById('photoPreview')?.remove();
  document.getElementById('photoRemoveRow')?.remove();
  document.getElementById('photoFileName')?.remove();
  const inp=document.getElementById('photoInput');if(inp)inp.value='';
}

// ── New photo upload with consent ────────────────────
function openPhotoConsentModal(){
  document.getElementById('photoConsentModal').style.display='flex';
}
function closePhotoConsentModal(){
  document.getElementById('photoConsentModal').style.display='none';
}

window.showSkillGuide = function(){
  document.getElementById('skillGuideModal').style.display='flex';
};
window.hideSkillGuide = function(){
  document.getElementById('skillGuideModal').style.display='none';
};

function acceptPhotoConsent(){
  closePhotoConsentModal();
  // Record consent timestamp
  document.getElementById('photoConsentGiven').value = new Date().toISOString();
  // Trigger file picker
  document.getElementById('photoFileInput').click();
}

function handlePhotoSelected(input){
  const file = input.files[0];
  if(!file) return;
  // Validate size (5MB max)
  if(file.size > 5 * 1024 * 1024){
    showToast('⚠️ Photo must be under 5MB','#f59e0b');
    input.value='';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e)=>{
    S.photoSrc = e.target.result;
    S.photoFile = file;
    // Show photo in the emoji circle
    const overlay = document.getElementById('photoPreviewOverlay');
    if(overlay){
      overlay.style.display='block';
      overlay.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;"/>`;
    }
    // Show remove button, hide add button
    const addBtn = document.getElementById('addPhotoBtn');
    const removeBtn = document.getElementById('removePhotoBtn');
    if(addBtn) addBtn.style.display='none';
    if(removeBtn) removeBtn.style.display='inline-block';
    showToast('✅ Photo added — it will upload when you save your profile','#4CAF7D');
  };
  reader.readAsDataURL(file);
}

function removeProfilePhoto(){
  S.photoSrc = null;
  S.photoFile = null;
  document.getElementById('photoConsentGiven').value = '';
  document.getElementById('photoFileInput').value = '';
  // Hide photo overlay, show emoji
  const overlay = document.getElementById('photoPreviewOverlay');
  if(overlay){ overlay.style.display='none'; overlay.innerHTML=''; }
  // Show add button, hide remove button
  const addBtn = document.getElementById('addPhotoBtn');
  const removeBtn = document.getElementById('removePhotoBtn');
  if(addBtn) addBtn.style.display='inline-block';
  if(removeBtn) removeBtn.style.display='none';
}

async function uploadProfilePhoto(email){
  if(!S.photoFile || !email) return null;
  try{
    // Upload to Supabase Storage bucket 'player-photos'
    const ext = S.photoFile.name.split('.').pop().toLowerCase() || 'jpg';
    const fileName = email.replace(/[^a-z0-9]/gi,'_') + '.' + ext;
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/player-photos/${fileName}`,
      {
        method: 'POST',
        headers:{
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ACCESS_TOKEN,
          'Content-Type': S.photoFile.type,
          'x-upsert': 'true'
        },
        body: S.photoFile
      }
    );
    if(!res.ok){
      console.warn('Photo upload failed:', await res.text());
      return null;
    }
    // Return public URL
    return `${SUPABASE_URL}/storage/v1/object/public/player-photos/${fileName}`;
  }catch(e){
    console.warn('Photo upload error:', e);
    return null;
  }
}

// ── Chips ─────────────────────────────────────────────
function selChip(gid,el,key){
  const allChips = document.querySelectorAll('#'+gid+' .chip,#'+gid+' .chip-rect');
  // Clear all on states and any Both-specific inline styles
  allChips.forEach(c=>{ c.classList.remove('on'); c.style.background=''; c.style.color=''; c.style.borderColor=''; });
  el.classList.add('on');
  // Strip ALL emoji and symbols — save only clean text to S state and DB
  const raw = el.textContent.trim();
  const clean = raw.replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  const val = clean || raw;
  S[key] = val;
  if(val === 'Both'){
    // Light up all sibling chips too, and style Both chip dark red
    allChips.forEach(c=>c.classList.add('on'));
    el.style.background='#991b1b'; el.style.color='#fff'; el.style.borderColor='#7f1d1d';
  }
  if(key==='gender') chk1();
  if(key==='skill')  chk2();
  if(key==='playStyle'){
    const goalField = document.getElementById('goalRatingField');
    if(goalField) goalField.style.display = (val==='Competitive'||val==='Both') ? 'block' : 'none';
    if(val!=='Competitive'&&val!=='Both'){ S.goalRating=null; }
  }
}

// ── Coach multi-select chips ─────────────────────────────
function toggleCoachChip(gid,el,key,value){
  el.classList.toggle('on');
  if(el.classList.contains('on')) S[key].add(value);
  else S[key].delete(value);
}
function toggleCoachSection(answer){
  S.isCoach=answer;
  const section=document.getElementById('coachSection');
  if(section) section.style.display=(answer==='Yes')?'block':'none';
}
function restoreCoachChips(chipGroupId,sKey,savedStr){
  if(!savedStr) return;
  const vals=savedStr.split(',').map(v=>v.trim()).filter(Boolean);
  vals.forEach(val=>{
    S[sKey].add(val);
    document.querySelectorAll('#'+chipGroupId+' .chip').forEach(ch=>{
      // Match by data-value attribute OR by chip text starting with the value
      const chipVal = ch.dataset.value || ch.textContent.trim();
      if(chipVal===val || ch.textContent.trim().startsWith(val)) ch.classList.add('on');
    });
  });
}
function toggleAnytime(){
  S.anytime=!S.anytime;
  const ab=document.getElementById('anytimeBtn');
  if(ab) ab.classList.toggle('on',S.anytime);
  document.querySelectorAll('.sched-cell').forEach(c=>{c.style.opacity=S.anytime?'0.35':'';c.style.cursor=S.anytime?'default':'';});
  chk2();
}

// ── Improve / fun selection ────────────────────────────────────
function selectImproveGoal(val){
  S.wantsToImprove = val;
  document.getElementById('improveYesBtn')?.classList.toggle('on', val==='improve');
  document.getElementById('improveFunBtn')?.classList.toggle('on', val==='fun');
  const goalField = document.getElementById('goalRatingField');
  const lessonSec = document.getElementById('lessonSection');
  if(val==='improve'){
    if(goalField){ goalField.style.display='block'; }
    if(lessonSec){ lessonSec.style.display = SESSION_PLAYER?.id ? 'block' : 'none'; }
    const _ps=document.getElementById('personalRatingSlider');
    const psIdx=_ps?parseInt(_ps.value):0;
    const goalSlider=document.getElementById('goalRatingSlider');
    if(goalSlider && parseInt(goalSlider.value)<psIdx){
      goalSlider.value=psIdx;
      updateGoalRating(psIdx);
    }
    buildGoalTicks(psIdx);
    updateGoalGapViz();
  } else {
    if(goalField) goalField.style.display='none';
    if(lessonSec) lessonSec.style.display='none';
    S.goalRating=null; S.hasHadLesson=''; S.wantsLesson='';
  }
  chk2();
}

function updateGoalGapViz(){
  const currentRaw = parseFloat(S.skill||0);
  const goalRaw    = parseFloat(S.goalRating||0);
  const max        = 7.0;
  const pctCurrent = Math.min(100, (currentRaw / max) * 100).toFixed(1);
  const pctGoal    = Math.min(100, (goalRaw    / max) * 100).toFixed(1);
  const curBar  = document.getElementById('vizCurrentBar');
  const tgtBar  = document.getElementById('vizTargetBar');
  const curVal  = document.getElementById('vizCurrentVal');
  const tgtVal  = document.getElementById('vizTargetVal');
  if(curBar)  curBar.style.width  = pctCurrent+'%';
  if(tgtBar)  tgtBar.style.width  = pctGoal+'%';
  if(curVal)  curVal.textContent  = currentRaw > 0 ? currentRaw.toFixed(2) : '—';
  if(tgtVal)  tgtVal.textContent  = goalRaw    > 0 ? goalRaw.toFixed(2)    : '—';
}
function togglePartner(){S.partner=!S.partner;const pt=document.getElementById('partnerTrack');if(pt)pt.classList.toggle('on',S.partner);}
function toggleConsent(type){
  if(type==='tos'){S._tosConsent=!S._tosConsent;document.getElementById('checkBoxTos')?.classList.toggle('on',S._tosConsent);}
  else if(type==='privacy'){S._privacyConsent=!S._privacyConsent;document.getElementById('checkBoxPrivacy')?.classList.toggle('on',S._privacyConsent);}
  else{S._riskConsent=!S._riskConsent;document.getElementById('checkBoxRisk')?.classList.toggle('on',S._riskConsent);}
  // Gate the submit button on BOTH checkboxes (ToS/Privacy + Waiver)
  const submitBtn=document.getElementById('btnSubmit');
  if(submitBtn) submitBtn.disabled=!(S._tosConsent&&S._riskConsent);
}
function toggleWaiver(){toggleConsent('risk');}

function v(id){const el=document.getElementById(id);return el?el.value.trim():'';}
function chk1(){
  const btn=document.getElementById('next1');if(!btn)return;
  const genderOk=['Man','Woman','Prefer not to say'].includes(S.gender);
  const hint=document.getElementById('genderHint');
  if(hint) hint.style.display=(!genderOk&&(v('firstName')||v('email')||v('phone')))?'block':'none';
  const ok=v('firstName')&&v('email')&&v('phone')&&genderOk;
  btn.disabled=!ok;
}
function chk2(){
  const ratingSlider = document.getElementById('personalRatingSlider');
  const hasRating = ratingSlider && parseInt(ratingSlider.value) > 0;
  const ok = v('playingSince') && hasRating;
  document.getElementById('next2').disabled = !ok;
}

function goTo(n){
  [1,2,3].forEach(i=>{
    document.getElementById('step'+i).style.display=i===n?'block':'none';
    const dot=document.getElementById('dot'+i),lbl=document.getElementById('lbl'+i);
    dot.className='step-dot'+(i<n?' done':i===n?' active':'');
    dot.textContent=i<n?'✓':i;
    lbl.className='step-label'+(i===n?' active':'');
    if(i<3) document.getElementById('line'+i).className='step-line'+(i<n?' done':'');
  });
  if(n===3){
    populateSummary();
    const submitBtn=document.getElementById('btnSubmit');
    if(submitBtn) submitBtn.disabled=!(S._tosConsent&&S._riskConsent);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

function populateSummary(){
  const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val||'—'; };
  const show = (id,val)=>{ const el=document.getElementById(id); if(el) el.style.display=val?'flex':'none'; };

  // — Read all values up front from DOM first, S-state as fallback —
  const firstName = document.getElementById('firstName')?.value?.trim() || '';
  const lastName  = document.getElementById('lastName')?.value?.trim()  || '';
  const email     = document.getElementById('email')?.value?.trim()     || S.email || getMyEmail() || '';
  const phone     = document.getElementById('phone')?.value?.trim()     || '';
  const ageRange  = document.getElementById('playerAge')?.value         || S.age_range   || '';
  const gender    = S.gender    || '';
  const city      = S.city  || '';
  const state     = S.state || '';
  const zip       = document.getElementById('addrZip')?.value?.trim()   || S.zip   || '';
  const since     = document.getElementById('playingSince')?.value?.trim() || S.playingSince || '';
  const hand      = S.handedness || '';
  const format    = S.playFormat || '';
  const style     = S.playStyle  || '';
  const venue     = S.venuePref  || '';
  const skill     = S.skill      || '';
  const dupr      = S.duprVal    || '';
  const goal      = S.goalRating || '';
  const improve   = S.wantsToImprove || '';
  const nick      = document.getElementById('nickname')?.value?.trim() || S.nickname || '';
  const emoji     = document.getElementById('avatarEmoji')?.value || S.avatarEmoji || '🎾';

  // — Name header —
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase()+'.' : '';
  const fullName = (firstName+' '+lastInitial).trim();

  const emojiEl = document.getElementById('sumEmojiDisplay');
  if(emojiEl){
    if(S.photoSrc){
      emojiEl.style.overflow='hidden'; emojiEl.style.padding='0';
      emojiEl.innerHTML=`<img src="${S.photoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    } else {
      emojiEl.style.overflow=''; emojiEl.style.padding='';
      emojiEl.textContent = emoji;
    }
  }
  const nameBig = document.getElementById('sumNameBig');
  if(nameBig) nameBig.textContent = fullName || '—';
  const nickSub = document.getElementById('sumNicknameSub');
  if(nickSub) nickSub.textContent = nick ? '"'+nick+'"' : '';
  set('sumName', fullName);
  set('sumNickname', nick || '—');

  // — Personal info rows —
  set('sumEmail', email || '—');
  const digits = phone.replace(/\D/g,'');
  // Masked phone: show only last 4 digits in summary view
  const phoneRow=document.getElementById('sumPhoneRow');
  const smsRow2=document.getElementById('sumSmsRow');
  if(digits.length===10){
    set('sumPhone','***-***-'+digits.substring(6));
    if(phoneRow) phoneRow.style.display='flex';
  } else {
    if(phoneRow) phoneRow.style.display='none';
  }
  const smsChecked=!!(document.getElementById('smsOptIn')?.checked);
  if(smsRow2) smsRow2.style.display=(digits.length===10&&smsChecked)?'flex':'none';
  set('sumDob',    ageRange || '—');
  set('sumGender', gender   || '—');
  set('sumCity',   city     || '—');
  set('sumState',  state    || '—');
  set('sumZip',    zip      || '—');

  // — Player info rows —
  set('sumSince',     since  || '—');
  set('sumHandedness',hand   || '—');
  set('sumFormat',    format || '—');
  set('sumStyle',     style  || '—');
  set('sumVenuePref', venue  || '—');
  const driveEl = document.getElementById('driveDistance');
  set('sumDrive', driveEl ? driveEl.value+' miles' : '—');

  // — Playing levels —
  set('sumSkill',  skill || '—');
  set('sumDupr',   dupr  || 'Not set');
  if(goal){ show('sumGoalRow',true); set('sumGoal', goal); }
  else show('sumGoalRow',false);
}



// ── Supabase ───────────────────────────────────────────
const SUPABASE_URL = 'https://dltiirdjfbjtydazrmvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdGlpcmRqZmJqdHlkYXpybXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDQxNzgsImV4cCI6MjA4OTA4MDE3OH0.oBDtS3RZlGxMkqon-r1wdfYR6jPTSPGWIa8cZh7fLWA';

// Supabase auth client — handles magic link sign-in and session persistence.
// Options are explicit so behavior is deterministic regardless of CDN version.
// detectSessionInUrl: required for magic link token exchange on mobile Safari
// (iOS Mail opens magic links in a new tab — without this, the token in the URL
// is never consumed and the user stays on the welcome screen).
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});

// Current user JWT — set to anon key until magic link auth completes.
// All REST fetch calls use this for the Authorization header so that
// authenticated requests satisfy RLS policies on the registrations table.
let SUPABASE_ACCESS_TOKEN = SUPABASE_ANON_KEY;

async function saveRegistration(payload){
  const url = `${SUPABASE_URL}/rest/v1/registrations`;
  
  try{
    // Check if player already exists — use PATCH if so, POST if new
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(payload.email)}&select=id&limit=1`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const existing = checkRes.ok ? await checkRes.json() : [];
    const isUpdate = existing.length > 0;

    const res = await fetch(
      isUpdate
        ? `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(payload.email)}`
        : url,
      {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ACCESS_TOKEN,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      }
    );
    if(res.ok) return true;
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }catch(e){
    throw e;
  }
}


// ── Phone encoding ─────────────────────────────────────
// Live phone formatting — called by oninput on phone fields
function formatPhone(input){
  // Strip all non-digits
  let digits = input.value.replace(/\D/g,'');
  // Limit to 10 digits
  if(digits.length > 10) digits = digits.substring(0,10);
  // Format as user types: (XXX) XXX-XXXX
  let formatted = '';
  if(digits.length === 0){
    formatted = '';
  } else if(digits.length <= 3){
    formatted = '(' + digits;
  } else if(digits.length <= 6){
    formatted = '(' + digits.substring(0,3) + ') ' + digits.substring(3);
  } else {
    formatted = '(' + digits.substring(0,3) + ') ' + digits.substring(3,6) + '-' + digits.substring(6);
  }
  input.value = formatted;
  chk1();
}

function encodePhone(phone){
  if(!phone)return null;
  const digits=String(phone).replace(/\D/g,'');
  if(!digits)return null;
  try{return btoa(digits);}catch(e){return digits;}
}
function decodePhone(encoded){
  if(!encoded)return '';
  if(/^\d+$/.test(encoded))return encoded;
  try{const d=atob(encoded);if(/^\d+$/.test(d))return d;return encoded;}catch(e){return encoded;}
}
function formatPhoneForDisplay(encoded){
  if(!encoded)return '';
  const digits=decodePhone(encoded).replace(/\D/g,'');
  if(digits.length===10)return '('+digits.substring(0,3)+') '+digits.substring(3,6)+'-'+digits.substring(6);
  return digits;
}
window.onPhoneChange=function(){
  const phoneEl=document.getElementById('phone');
  const smsRow=document.getElementById('smsOptInRow');
  const smsCb=document.getElementById('smsOptIn');
  const hasPhone=!!(phoneEl&&phoneEl.value.replace(/\D/g,'').length>=10);
  if(smsRow) smsRow.style.display=hasPhone?'block':'none';
  if(!hasPhone&&smsCb){
    smsCb.checked=false;
    window.onSmsOptInChange();
  }
};
window.onSmsOptInChange=function(){
  const cb=document.getElementById('smsOptIn');
  const lbl=document.getElementById('smsOptInLabel');
  if(!lbl) return;
  if(cb&&cb.checked){
    lbl.style.fontWeight='700';
    lbl.style.color='#1a7a3a';
  } else {
    lbl.style.fontWeight='400';
    lbl.style.color='#374151';
  }
};

function showToast(msg, color='#ef4444'){
  const t = document.createElement('div');
  t.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${color};color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:90vw;text-align:center;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 6000);
}
function closeNav(){
  const nav = document.getElementById('leftNav');
  const overlay = document.getElementById('navOverlay');
  if(nav) nav.classList.remove('open');
  if(overlay){
    overlay.classList.remove('visible');
    overlay.style.display = 'none';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }
}
function showBackToDashboard(){
  const existing = document.getElementById('backToDashBtn');
  if(existing) return;
  const btn = document.createElement('button');
  btn.id = 'backToDashBtn';
  btn.innerHTML = '← Dashboard';
  btn.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);'+
    'padding:10px 24px;border-radius:999px;border:none;'+
    'background:#1a7a3a;color:#fff;font-weight:700;font-size:13px;'+
    'cursor:pointer;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.2);'+
    'font-family:\'DM Sans\',sans-serif;white-space:nowrap;';
  btn.onclick = ()=>{ btn.remove(); showPage('dashboard'); };
  document.body.appendChild(btn);
}
// ── Secure email sender — Cloudflare Pages Function ──────────────────
async function sendEmail({ to_email, type, personal_note, invite_url, subject, inviter_name, invitee_name, match_date_str }){
  if(!to_email || !to_email.includes('@')) return;
  const lower = to_email.toLowerCase();
  if(lower.endsWith('@example.com')) return;
  if(lower.endsWith('@test.com')) return;
  try{
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email, type: type||'notification',
        personal_note: personal_note||'',
        invite_url: invite_url||window.location.origin,
        site_url: window.location.origin,
        subject: subject||null,
        inviter_name: inviter_name||null,
        invitee_name: invitee_name||null,
        match_date_str: match_date_str||null,
      })
    });
    if(!res.ok) console.warn('sendEmail failed:', res.status);
    return res;
  }catch(e){ console.warn('sendEmail error:', e.message); }
}

async function sendSms({ player_email, message, match_id, event_type }){
  if(!player_email || !player_email.includes('@')) return;
  try{
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_email, message, match_id: match_id||null, event_type: event_type||null })
    });
    if(!res.ok) console.warn('sendSms failed:', res.status);
    return res;
  }catch(e){ console.warn('sendSms error:', e.message); }
}

async function submitForm(){
  // If editing existing profile, show diff overlay first
  if(SESSION_PLAYER){
    showProfileDiff();
    return;
  }
  await doSaveProfile();
}

function showProfileDiff(){
  const player = SESSION_PLAYER;
  const diffList = document.getElementById('profileDiffList');
  if(!diffList) return;

  const stateAbbr=(st)=>{
    if(!st) return '';
    if(st.length===2) return st.toUpperCase();
    const found=Object.values(STATE_INFO||{}).find(v=>v[1]&&v[1].toLowerCase()===st.toLowerCase());
    return found?found[0]:st;
  };

  const currentEmoji = document.getElementById('avatarEmoji')?.value || S.avatarEmoji || '🎾';
  const fields=[
    {label:'Emoji',         old:player.avatar_emoji||'🎾',           nw:currentEmoji},
    {label:'First Name',    old:player.first_name||'',               nw:v('firstName')},
    {label:'Nickname',      old:player.nickname||'',                  nw:v('nickname')},
    {label:'Age Range',     old:player.age_range||'',                       nw:document.getElementById('playerAge')?.value||''},
    {label:'Zip',           old:player.zip_code||'',                  nw:v('addrZip')},
    {label:'Phone',         old:decodePhone(player.phone||''),         nw:(v('phone')||'').replace(/\D/g,'')},
    {label:'SMS Opt-In',   old:String(!!(player.sms_opt_in)),          nw:String(!!(document.getElementById('phone')?.value.replace(/\D/g,'').length>=10 && document.getElementById('smsOptIn')?.checked))},
    {label:'Gender',        old:player.gender||'',                    nw:S.gender||''},
    {label:'Handedness',    old:player.handedness||'',                nw:S.handedness||''},
    {label:'Play Format',   old:player.play_format||'Both',           nw:S.playFormat||player.play_format||'Both'},
    {label:'Play Style',    old:player.play_style||'',                nw:S.playStyle||''},
    {label:'Venues',        old:player.play_venues||'',               nw:S.venuePref||''},
    {label:'Skill Level',   old:String(player.skill_level||''),       nw:String(S.skill||player.skill_level||'')},
    {label:'DUPR Rating',   old:String(player.dupr_rating||''),       nw:String(S.duprVal||'')},
    {label:'Target Level',  old:String(player.goal_rating||''),       nw:String(S.goalRating||'')},

    {label:'Is Organizer',  old:String(player.is_organizer||false),    nw:String(S.isOrganizer==='Yes')},
    {label:'Is Coach',      old:String(player.is_coach||false),       nw:String(S.isCoach==='Yes')},
    {label:'Coach Certs',   old:player.coach_certifications||'',      nw:S.coachCerts&&S.coachCerts.size>0?[...S.coachCerts].join(', '):''},
    {label:'Lesson Types',  old:player.coach_lesson_types||'',        nw:S.coachLessonTypes&&S.coachLessonTypes.size>0?[...S.coachLessonTypes].join(', '):''},
    {label:'Lesson Format', old:player.coach_formats||'',             nw:S.coachFormats&&S.coachFormats.size>0?[...S.coachFormats].join(', '):''},
    {label:'Rate Min',      old:String(player.coach_rate_min||''),    nw:document.getElementById('coachRateMin')?.value||''},
    {label:'Rate Max',      old:String(player.coach_rate_max||''),    nw:document.getElementById('coachRateMax')?.value||''},
    {label:'Coach Bio',     old:player.coach_bio||'',                 nw:document.getElementById('coachBio')?.value?.trim()||''},
  ];

  const changed = fields.filter(f=>String(f.old).trim()!==String(f.nw).trim());

  diffList.innerHTML='';
  if(!changed.length){
    diffList.innerHTML='<div style="color:var(--dim);font-size:13px;text-align:center;padding:16px;">No changes detected.</div>';
  } else {
    // Header row
    const hdr=document.createElement('div');
    hdr.style.cssText='padding:4px 0 8px;display:grid;grid-template-columns:110px 1fr 1fr;gap:8px;';
    hdr.innerHTML=
      '<div></div>'+
      '<div style="font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;">Before</div>'+
      '<div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;">After</div>';
    diffList.appendChild(hdr);
    changed.forEach(f=>{
      const row=document.createElement('div');
      row.style.cssText='padding:10px 0;border-bottom:1px solid var(--border);display:grid;grid-template-columns:110px 1fr 1fr;gap:8px;align-items:center;';
      row.innerHTML=
        '<div style="font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;">'+f.label+'</div>'+
        '<div style="font-size:12px;color:#f87171;text-decoration:line-through;word-break:break-word;">'+(f.old||'—')+'</div>'+
        '<div style="font-size:12px;color:var(--green);font-weight:600;word-break:break-word;">'+(f.nw||'—')+'</div>';
      diffList.appendChild(row);
    });
  }

  const overlay=document.getElementById('profileDiffOverlay');
  overlay.style.display='flex';

  const confirmBtn=document.getElementById('profileDiffConfirm');
  confirmBtn.onclick=async()=>{
    overlay.style.display='none';
    await doSaveProfile();
  };
}

async function doSaveProfile(){
  // Disable button and show saving state
  const btn = document.getElementById('btnSubmit');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Saving…'; }

  // Upload photo if one was selected (do this first to get the URL)
  let uploadedPhotoUrl = null;
  const consentTimestamp = document.getElementById('photoConsentGiven')?.value || null;
  if(S.photoFile && consentTimestamp){
    if(btn) btn.textContent = '⏳ Uploading photo…';
    uploadedPhotoUrl = await uploadProfilePhoto(v('email') || getMyEmail());
  }

  // Geocode from zip code — derive city, state, lat/lon via Nominatim
  const zipVal = v('addrZip')?.trim();
  if(zipVal && (!S.addrLat || !S.addrLon || !S.city)){
    try{
      const statusEl = document.getElementById('zipGeoStatus');
      if(statusEl) statusEl.textContent = '🔍 Looking up location…';
      const gRes = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipVal)}&country=us&format=json&limit=1&addressdetails=1`,
        {headers:{'Accept-Language':'en','User-Agent':'PBallConnect/1.0'}}
      );
      if(gRes.ok){
        const gData = await gRes.json();
        if(gData.length){
          const addr = gData[0].address || {};
          S.city    = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
          S.state   = addr.state || '';
          S.addrLat = parseFloat(gData[0].lat);
          S.addrLon = parseFloat(gData[0].lon);
          // Also write to hidden fields so downstream reads work
          const cityEl = document.getElementById('addrCity');
          const stateEl = document.getElementById('addrState');
          if(cityEl) cityEl.value = S.city;
          if(stateEl) stateEl.value = S.state.length > 2
            ? (Object.values(STATE_INFO).find(([a,n])=>n&&n.toLowerCase()===S.state.toLowerCase())?.[0] || S.state)
            : S.state.toUpperCase();
          S.state = stateEl?.value || S.state;
          if(statusEl) statusEl.textContent = S.city ? `📍 ${S.city}, ${S.state}` : '';
        }
      }
    }catch(e){ console.warn('Zip geocode failed:',e); }
  }

  // Save to Supabase via direct REST call
  try{
    const _phoneDigits   = (v('phone')||'').replace(/\D/g,'');
    const _smsOptIn      = _phoneDigits.length === 10 && !!(document.getElementById('smsOptIn')?.checked);
    const _wasOptedIn    = !!(SESSION_PLAYER?.sms_opt_in);
    const _isOptingOut   = _wasOptedIn && !_smsOptIn;
    const _phoneRemoved  = _phoneDigits.length !== 10;
    const _inviteSource  = (()=>{
      const _org = sessionStorage.getItem('organic_source');
      if(_org === 'organic'){ sessionStorage.removeItem('organic_source'); return 'organic'; }
      if(PENDING_INVITE?.invite_type === 'qr') return 'qr';
      if(PENDING_INVITE?.invite_token) return 'token';
      return 'organic';
    })();
    await saveRegistration({
      first_name:          v('firstName'),
      last_name:           v('lastName'),
      nickname:            v('nickname')||null,
      email:               v('email'),
      phone:               _phoneDigits || null,
      sms_opt_in:          _smsOptIn,
      sms_opt_in_at:       _smsOptIn   ? new Date().toISOString() : undefined,
      sms_opt_out_at:      _isOptingOut ? new Date().toISOString() : undefined,
      sms_opt_out_method:  _isOptingOut ? (_phoneRemoved ? 'phone_removed' : 'profile') : undefined,
      age_range:                 document.getElementById('playerAge')?.value||S.age_range||'',
      gender:              S.gender,
      city:                S.city || '',
      state:               S.state || '',
      zip_code:            v('addrZip'),
      county:              S.county,
      court_name:          S.courtName || null,
      skill_level:         S.skill || SESSION_PLAYER?.skill_level || null,
      dupr_rating:         S.duprVal || null,
      anytime:             S.anytime,
      photo_url:           uploadedPhotoUrl || SESSION_PLAYER?.photo_url || null,
      photo_consent_at:    consentTimestamp || SESSION_PLAYER?.photo_consent_at || null,
      waiver_agreed:       S.waiver,
      play_venues:         S.venuePref || (S.venues&&S.venues.size>0 ? [...S.venues].join(', ') : null),
      drive_distance_miles: S.driveDistance || null,
      play_style:          S.playStyle || null,
      play_format:         S.playFormat || 'Both',
      handedness:          S.handedness || null,
      avatar_emoji:        S.avatarEmoji || '🎾',
      play_venues:         S.venuePref   || null,
      playing_since:       S.playingSince || null,
      goal_rating:         S.goalRating || null,
      avail_weekday_morning:   !!S.availWeekdayMorning,
      avail_weekday_afternoon: !!S.availWeekdayAfternoon,
      avail_weekday_evening:   !!S.availWeekdayEvening,
      avail_weekends:          !!S.availWeekends,
      lat:                 S.addrLat || SESSION_PLAYER?.lat || null,
      lon:                 S.addrLon || SESSION_PLAYER?.lon || null,
      is_coach:            S.isCoach==='Yes',
      is_organizer:        S.isOrganizer==='Yes',
      coach_certifications: S.coachCerts&&S.coachCerts.size>0 ? [...S.coachCerts].join(', ') : null,
      coach_lesson_types:  S.coachLessonTypes&&S.coachLessonTypes.size>0 ? [...S.coachLessonTypes].join(', ') : null,
      coach_formats:       S.coachFormats&&S.coachFormats.size>0 ? [...S.coachFormats].join(', ') : null,
      coach_rate_min:      (()=>{const el=document.getElementById('coachRateMin');return el?.value?parseInt(el.value)||null:null;})(),
      coach_rate_max:      (()=>{const el=document.getElementById('coachRateMax');return el?.value?parseInt(el.value)||null:null;})(),
      coach_bio:           document.getElementById('coachBio')?.value?.trim()||null,
      match_gender_pref:   S.matchGenderPref || 'Both',
      invite_source:       _inviteSource,
    });
    console.log('✅ Registration saved');
    if (!SESSION_PLAYER) {
      try {
        const _isOrganic  = _inviteSource === 'organic';
        const _alertName  = `${(v('firstName')||'').trim()} ${(v('lastName')||'').trim()}`;
        const _alertSubj  = _isOrganic
          ? `🚨 Organic Signup — ${_alertName}`
          : `🎾 New PBallConnect Registration — ${_alertName}`;
        await sendEmail({
          to_email: 'david@pballconnect.com',
          type:     'admin_registration_alert',
          subject:  _alertSubj,
          personal_note: `Name: ${_alertName}<br>Email: ${v('email')||''}<br>Path: Full Profile Registration<br>Invite Source: ${_inviteSource}<br>Skill Level: ${S.skill||'—'}<br>Age Range: ${document.getElementById('playerAge')?.value||'—'}<br>Zip: ${v('addrZip')||'—'}<br>Gender: ${S.gender||'—'}<br>SMS Opt-In: ${_smsOptIn ? 'Yes' : 'No'}<br>Registered At: ${new Date().toISOString()}`,
        });
      } catch (e) {
        console.warn('Admin alert failed:', e);
      }
    }
    // TCPA consent log
    if (_smsOptIn === true) {
      try {
        await fetch('/api/log-sms-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_email: S.email,
            event: 'opt_in',
            method: 'registration'
          })
        });
      } catch (e) {
        console.warn('Consent log failed (doSaveProfile):', e);
      }
    }
    document.getElementById('navLoginBtn')?.style.removeProperty('display');
    _newUserRegistrationStarted = false; // registration complete — allow normal profile restore
    showToast('✅ Profile saved!', '#4CAF7D');
    // Capture current values before any navigation
    const _savedNickname  = v('nickname') || S.nickname || '';
    const _savedEmoji     = document.getElementById('avatarEmoji')?.value || S.avatarEmoji || '🎾';
    const _savedFirstName = v('firstName') || '';
    // Read skill from slider display (most accurate source)
    const _sliderDisplay = document.getElementById('personalRatingDisplay')?.textContent?.match(/[\d\.]+/)?.[0];
    const _savedSkill    = _sliderDisplay || S.skill || SESSION_PLAYER?.skill_level || '';
    const _savedSince     = document.getElementById('playingSince')?.value || S.playingSince || '';
    // Update S state immediately
    S.nickname    = _savedNickname;
    S.avatarEmoji = _savedEmoji;
    S.skill       = _savedSkill || S.skill;
    // Persist to localStorage so values survive page reloads/deploys
    localStorage.setItem('pb_nickname', _savedNickname);
    localStorage.setItem('pb_emoji',    _savedEmoji);
    // Update top bar immediately
    updateTopBar({ first_name: _savedFirstName, nickname: _savedNickname,
                   skill_level: _savedSkill, playing_since: _savedSince,
                   avatar_emoji: _savedEmoji });
    // Also update SESSION_PLAYER so next Edit Profile shows correct values
    if(SESSION_PLAYER){
      SESSION_PLAYER.nickname     = _savedNickname;
      SESSION_PLAYER.avatar_emoji = _savedEmoji;
      SESSION_PLAYER.first_name   = _savedFirstName;
      SESSION_PLAYER.skill_level  = _savedSkill;
      SESSION_PLAYER.playing_since = _savedSince;
      // Explicitly update address fields so Edit Profile shows new values
      SESSION_PLAYER.city     = S.city              || SESSION_PLAYER.city;
      SESSION_PLAYER.state    = S.state             || SESSION_PLAYER.state;
      SESSION_PLAYER.zip_code = v('addrZip')        || SESSION_PLAYER.zip_code;
      SESSION_PLAYER.county   = S.county            || SESSION_PLAYER.county;
      if(S.addrLat) SESSION_PLAYER.lat = S.addrLat;
      if(S.addrLon) SESSION_PLAYER.lon = S.addrLon;
    }
    // Re-fetch the saved record and restore to ensure top bar is accurate
    const savedEmail = v('email') || getMyEmail();
    if(savedEmail){
      try{
        const fr = await fetch(
          `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(savedEmail)}&select=*&limit=1`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        if(fr.ok){
          const rows = await fr.json();
          if(rows.length){
            SESSION_PLAYER = rows[0];
            updateTopBar(rows[0]);
            updateOrganizerNav();
            updateNavForUserType();
          }
        }
      }catch(e){}
    }
  }catch(err){
    console.error('❌ Save failed:', err);
    showToast('⚠️ Could not save: ' + err.message);
  }

  if(btn){ btn.textContent = SESSION_PLAYER ? '✏️ Update Profile' : '🎉 Complete Registration';
  btn.disabled = false; }

  // Show confirmation screen elements — only exist for new registrations, guard all
  const _cn=document.getElementById('confirmName'); if(_cn) _cn.textContent=v('firstName')+' '+v('lastName');
  const _ce=document.getElementById('confirmEmailDisp'); if(_ce) _ce.textContent=v('email');
  const _cEmail=document.getElementById('cEmail'); if(_cEmail) _cEmail.textContent=v('email');
  const _cSkill=document.getElementById('cSkill'); if(_cSkill) _cSkill.textContent=S.skill;
  const _cState=document.getElementById('cState'); if(_cState) _cState.textContent=S.state||'—';
  const _cCity=document.getElementById('cCity'); if(_cCity) _cCity.textContent=S.city||'—';
  const _cDupr=document.getElementById('cDupr'); if(_cDupr) _cDupr.textContent=S.duprVal||'Not set';
  if(S.courtName){const cs=document.getElementById('cCourtStat');const cc=document.getElementById('cCourt');if(cs)cs.style.display='block';if(cc)cc.textContent=S.courtName;}
  const av=document.getElementById('confirmAvatar');
  if(av) av.innerHTML=S.photoSrc?`<img class="confirm-avatar" src="${S.photoSrc}"/>`:`<div class="confirm-avatar-ph">👤</div>`;
  // If editing existing profile, skip overlay — go straight to summary
  if(SESSION_PLAYER){
    // Clean up edit mode fully
    stopChangeDetection();
    _editModeActive = false;
    document.getElementById('editProfileBtnEl')?.classList.remove('active');
    document.getElementById('editModeBanner')?.remove();
    document.getElementById('readOnlyBanner')?.remove();
    // Ensure consent stays checked — once agreed, always agreed
    S._tosConsent = true;
    S._privacyConsent = true;
    S._riskConsent = true;
    SESSION_PLAYER.waiver_agreed = true;
    document.getElementById('checkBoxTos')?.classList.add('on');
    const cbr = document.getElementById('checkBoxRisk');
    if(cbr) cbr.classList.add('on');
    // Re-lock the form
    lockProfileForm();
    // Scroll to summary so user sees updated data pulse
    setTimeout(()=>{
      document.getElementById('sumSection1')?.scrollIntoView({behavior:'smooth',block:'start'});
    }, 150);
    // Pulse summary sections
    ['sumSection1','sumSection2','sumSection3'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){ el.classList.add('summary-section-pulse'); setTimeout(()=>el.classList.remove('summary-section-pulse'),4000); }
    });
    showToast('✅ Profile updated!','#4CAF7D');
  } else {
    document.getElementById('confirmOverlay').style.display='flex';
    const newEmail = v('email') || getMyEmail();
    const newName  = (v('firstName')+' '+v('lastName')).trim();
    showFoundingMemberOverlay(()=>{
      setTimeout(()=>handlePostRegistrationInvite(newEmail, newName), 2500);
    });
  }
}

function resetForm(){
  document.getElementById('confirmOverlay').style.display='none';
  Object.assign(S,{gender:'',skill:'',anytime:false,partner:false,waiver:false,photoSrc:null,state:'',stateFips:'',county:'',city:'',court:'',courtName:'',duprVal:null,venues:new Set(),driveDistance:'25 miles',playStyle:'',wantsToImprove:'',goalRating:null,hasHadLesson:'',wantsLesson:'',addrLat:null,addrLon:null});

  ['firstName','lastName','nickname','email','phone','age_range','addrZip','addrCity','addrState'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const zipStatus=document.getElementById('zipGeoStatus');if(zipStatus)zipStatus.textContent='';
  const sl=document.getElementById('duprSlider');if(sl){sl.value=0;sl.style.setProperty('--pct','0%');}
  const prs=document.getElementById('personalRatingSlider');if(prs){prs.value=0;prs.style.setProperty('--pct','0%');}
  const prd=document.getElementById('personalRatingDisplay');if(prd) prd.innerHTML='-- <span>not set — slide to choose</span>';
  const ddDisp=document.getElementById('duprDisplay');if(ddDisp) ddDisp.innerHTML='-- <span>not set — slide to choose</span>';
  document.querySelectorAll('.chip.on,.chip-rect.on').forEach(c=>c.classList.remove('on'));
  document.querySelectorAll('.sched-cell.on').forEach(c=>c.classList.remove('on'));
  document.querySelectorAll('.sched-cell').forEach(c=>{c.style.opacity='';c.style.cursor='';});
  document.getElementById('anytimeBtn').classList.remove('on');
  document.getElementById('stateMapSection').style.display='block';
  document.getElementById('countySection').style.display='none';
  document.getElementById('citySection').style.display='none';
  if(document.querySelector('#mapContainer svg'))
    document.querySelectorAll('#mapContainer svg .state').forEach(p=>p.classList.remove('sel'));
  document.getElementById('mapBadge').textContent='Click your state to select it';
    document.getElementById('checkBox').classList.remove('on');
  document.getElementById('btnSubmit').disabled=true;
  document.getElementById('next1').disabled=true;
  document.getElementById('next2').disabled=true;
  document.getElementById('sumDuprRow').style.display='none';
  document.getElementById('sumCourtRow').style.display='none';
  document.getElementById('cCourtStat').style.display='none';
  const grf=document.getElementById('goalRatingField');if(grf)grf.style.display='none';
  const gsl=document.getElementById('goalRatingSlider');
  if(gsl){gsl.value=0;gsl.style.setProperty('--pct','0%');}
  const gdisp=document.getElementById('goalRatingDisplay');
  if(gdisp) gdisp.innerHTML='-- <span>slide to set your goal</span>';
  const cl=document.getElementById('courtChecklist'); if(cl) cl.innerHTML='';
  const cei=document.getElementById('courtEntryInput'); if(cei) cei.value='';
  const ddDrive=document.getElementById('driveDistance');
  if(ddDrive){ddDrive.value=5;ddDrive.style.setProperty('--pct','0%');}
  const ddisp=document.getElementById('driveDisplay');
  if(ddisp) ddisp.textContent='Move the slider to set your distance';
  const manualInp=document.getElementById('cityManual');
  if(manualInp) manualInp.remove();
  removePhoto(); goTo(1);
}// ── City data (embedded fallback) ────────────────────
const CITIES_BY_STATE = {"AL":[["Birmingham",33.5186,-86.8104,"Jefferson"],["Montgomery",32.3668,-86.3],["Huntsville",34.7304,-86.5861],["Mobile",30.6944,-88.0431],["Tuscaloosa",33.2098,-87.5692],["Hoover",33.4057,-86.8114],["Dothan",31.2232,-85.3905],["Auburn",32.6099,-85.4808],["Decatur",34.6059,-86.9833],["Madison",34.6993,-86.7483]],"AK":[["Anchorage",61.2181,-149.9],["Fairbanks",64.8378,-147.7164],["Juneau",58.3005,-134.4197],["Sitka",57.0531,-135.33],["Ketchikan",55.3422,-131.6461],["Wasilla",61.5814,-149.4414],["Kenai",60.5544,-151.2583],["Kodiak",57.79,-152.4072]],"AZ":[["Phoenix",33.4484,-112.074],["Tucson",32.2226,-110.9747],["Mesa",33.4152,-111.8315],["Chandler",33.3062,-111.8413],["Scottsdale",33.4942,-111.9261],["Glendale",33.5387,-112.186],["Gilbert",33.3528,-111.789],["Tempe",33.4255,-111.94],["Peoria",33.5806,-112.2374],["Surprise",33.6292,-112.368],["Flagstaff",35.1983,-111.6513],["Yuma",32.6927,-114.6277],["Avondale",33.4356,-112.3496]],"AR":[["Little Rock",34.7465,-92.2896],["Fort Smith",35.3859,-94.3985],["Fayetteville",36.0626,-94.1574],["Springdale",36.1867,-94.1288],["Jonesboro",35.8423,-90.7043],["Conway",35.0887,-92.4421],["Rogers",36.332,-94.1188],["Bentonville",36.3729,-94.2088],["North Little Rock",34.7695,-92.2671]],"CA":[["Los Angeles",34.0522,-118.2437],["San Diego",32.7157,-117.1611],["San Jose",37.3382,-121.8863],["San Francisco",37.7749,-122.4194],["Fresno",36.7378,-119.7871],["Sacramento",38.5816,-121.4944],["Long Beach",33.77,-118.1937],["Oakland",37.8044,-122.2711],["Bakersfield",35.3733,-119.0187],["Anaheim",33.8366,-117.9143],["Santa Ana",33.7455,-117.8677],["Riverside",33.9806,-117.3755],["Stockton",37.9577,-121.2908],["Irvine",33.6845,-117.8265],["Chula Vista",32.6401,-117.0842],["San Bernardino",34.1083,-117.2898],["Modesto",37.6391,-120.9969],["Fontana",34.0922,-117.435],["Moreno Valley",33.9425,-117.2297],["Glendale",34.1425,-118.255],["Oxnard",34.1975,-119.1771],["Santa Clarita",34.3917,-118.5426],["Garden Grove",33.7743,-117.9379],["Oceanside",33.1959,-117.3795],["Rancho Cucamonga",34.1064,-117.5931],["Santa Rosa",38.4405,-122.7141],["Elk Grove",38.4088,-121.3716],["Lancaster",34.6868,-118.1542],["Corona",33.8753,-117.5664],["Palmdale",34.5794,-118.1165],["Hayward",37.6688,-122.0808],["Salinas",36.6777,-121.6555],["Pomona",34.0551,-117.7503],["Torrance",33.8358,-118.3406],["Escondido",33.1192,-117.0864],["Sunnyvale",37.3688,-122.0363],["Pasadena",34.1478,-118.1445],["Visalia",36.33,-119.2921]],"CO":[["Denver",39.7392,-104.9903],["Colorado Springs",38.8339,-104.8214],["Aurora",39.7294,-104.8319],["Fort Collins",40.5853,-105.0844],["Lakewood",39.7047,-105.0814],["Thornton",39.8681,-104.9722],["Arvada",39.7986,-105.0875],["Westminster",39.8367,-105.0372],["Pueblo",38.2544,-104.6091],["Centennial",39.5807,-104.8772],["Boulder",40.015,-105.2705],["Highlands Ranch",39.548,-104.9697]],"CT":[["Bridgeport",41.1865,-73.1952],["New Haven",41.3082,-72.9282],["Hartford",41.7637,-72.6851],["Stamford",41.0534,-73.5387],["Waterbury",41.555,-73.0366],["Norwalk",41.1177,-73.4082],["Danbury",41.3948,-73.454],["New Britain",41.6612,-72.7795],["West Hartford",41.762,-72.7412],["Greenwich",41.0262,-73.6282]],"DE":[["Wilmington",39.7459,-75.5466],["Dover",39.1582,-75.5244],["Newark",39.6837,-75.7497],["Middletown",39.4496,-75.7163],["Smyrna",39.2993,-75.6044],["Milford",38.9126,-75.4277],["Seaford",38.6415,-75.6113]],"FL":[["Jacksonville",30.3322,-81.6557],["Miami",25.7617,-80.1918],["Tampa",27.9506,-82.4572],["Orlando",28.5384,-81.3789],["St. Petersburg",27.7731,-82.64],["Hialeah",25.8576,-80.2781],["Port St. Lucie",27.2939,-80.3503],["Cape Coral",26.5629,-81.9495],["Fort Lauderdale",26.1224,-80.1373],["Pembroke Pines",26.0076,-86.0065],["Tallahassee",30.4518,-84.2807],["Hollywood",26.0112,-80.1495],["Gainesville",29.6516,-82.3248],["Miramar",25.9871,-80.232],["Coral Springs",26.2713,-80.2707],["Clearwater",27.9659,-82.8001],["Palm Bay",28.0345,-80.5887],["West Palm Beach",26.7153,-80.0534],["Lakeland",28.0395,-81.9498],["Pompano Beach",26.2379,-80.1248],["Daytona Beach",29.2108,-81.0228],["Boca Raton",26.3683,-80.1289],["Fort Myers",26.6406,-81.8723],["Deltona",28.9005,-81.2637]],"GA":[["Atlanta",33.749,-84.388],["Augusta",33.4735,-82.0105],["Columbus",32.461,-84.9877],["Macon",32.8407,-83.6324],["Savannah",32.0835,-81.0998],["Athens",33.9519,-83.3576],["Sandy Springs",33.9304,-84.3733],["South Fulton",33.6426,-84.5499],["Roswell",34.0232,-84.3616],["Johns Creek",34.029,-84.198],["Albany",31.5785,-84.155],["Warner Robins",32.613,-83.596],["Alpharetta",34.0754,-84.2941]],"HI":[["Honolulu",21.3069,-157.8583],["Pearl City",21.3972,-157.9753],["Hilo",19.7297,-155.09],["Kailua",21.4022,-157.7394],["Waipahu",21.3869,-158.0092],["Kaneohe",21.4181,-157.8025],["Mililani Town",21.45,-158.0147],["Kahului",20.8893,-156.4729],["Kihei",20.7645,-156.445]],"ID":[["Boise",43.615,-116.2023],["Meridian",43.6121,-116.3915],["Nampa",43.5407,-116.5635],["Idaho Falls",43.4917,-112.0339],["Pocatello",42.8713,-112.4455],["Caldwell",43.6629,-116.6874],["Coeur d'Alene",47.6777,-116.7805],["Twin Falls",42.5629,-114.4609],["Lewiston",46.4165,-117.0177]],"IL":[["Chicago",41.8781,-87.6298],["Aurora",41.7606,-88.3201],["Joliet",41.525,-88.0817],["Naperville",41.7508,-88.1535],["Rockford",42.2711,-89.094],["Springfield",39.7817,-89.6501],["Elgin",42.0354,-88.2826],["Peoria",40.6936,-89.589],["Champaign",40.1164,-88.2434],["Waukegan",42.3636,-87.8448],["Cicero",41.8456,-87.7539],["Bloomington",40.4842,-88.9937]],"IN":[["Indianapolis",39.7684,-86.1581],["Fort Wayne",41.0793,-85.1394],["Evansville",37.9748,-87.5558],["South Bend",41.6764,-86.252],["Carmel",39.9784,-86.118],["Fishers",39.9567,-85.968],["Bloomington",39.1653,-86.5264],["Hammond",41.5834,-87.5001],["Gary",41.5934,-87.3465],["Lafayette",40.4167,-86.8753],["Muncie",40.1934,-85.3864]],"IA":[["Des Moines",41.5868,-93.625],["Cedar Rapids",41.9779,-91.6656],["Davenport",41.5236,-90.5776],["Sioux City",42.4999,-96.4003],["Iowa City",41.6611,-91.5302],["Waterloo",42.4928,-92.3426],["Council Bluffs",41.2619,-95.8608],["Ames",42.0308,-93.6319],["West Des Moines",41.577,-93.7113],["Dubuque",42.5006,-90.6649]],"KS":[["Wichita",37.6872,-97.3301],["Overland Park",38.9822,-94.6708],["Kansas City",39.1155,-94.6268],["Olathe",38.8814,-94.8191],["Topeka",39.0473,-95.6752],["Lawrence",38.9717,-95.2353],["Shawnee",39.0228,-94.7155],["Manhattan",39.1836,-96.5717],["Lenexa",38.9536,-94.7336],["Salina",38.8403,-97.6114]],"KY":[["Louisville",38.2527,-85.7585],["Lexington",38.0406,-84.5037],["Bowling Green",36.9685,-86.4808],["Owensboro",37.7719,-87.1112],["Covington",39.0837,-84.5085],["Richmond",37.748,-84.2946],["Georgetown",38.2098,-84.5588],["Florence",38.9987,-84.6269],["Elizabethtown",37.694,-85.8591]],"LA":[["New Orleans",29.9511,-90.0715],["Baton Rouge",30.4515,-91.1871],["Shreveport",32.5252,-93.7502],["Metairie",30.0035,-90.1628],["Lafayette",30.2241,-92.0198],["Lake Charles",30.2266,-93.2174],["Bossier City",32.516,-93.7321],["Kenner",29.9941,-90.2417],["Monroe",32.5093,-92.1193]],"ME":[["Portland",43.6591,-70.2568],["Lewiston",44.1004,-70.2148],["Bangor",44.8012,-68.7778],["South Portland",43.6415,-70.2409],["Auburn",44.0978,-70.237],["Biddeford",43.4926,-70.4534],["Sanford",43.439,-70.7737],["Augusta",44.3106,-69.7795],["Saco",43.5009,-70.4428]],"MD":[["Baltimore",39.2904,-76.6122],["Columbia",39.2037,-76.861],["Germantown",39.1732,-77.2717],["Silver Spring",38.994,-77.026],["Waldorf",38.6243,-76.933],["Glen Burnie",39.1626,-76.6274],["Frederick",39.4143,-77.4105],["Ellicott City",39.2676,-76.7986],["Gaithersburg",39.1434,-77.2014],["Annapolis",38.9784,-76.4922],["Rockville",39.084,-77.1528]],"MA":[["Boston",42.3601,-71.0589],["Worcester",42.2626,-71.8023],["Springfield",42.1015,-72.5898],["Cambridge",42.3736,-71.1097],["Lowell",42.6334,-71.3162],["New Bedford",41.6362,-70.9342],["Brockton",42.0834,-71.0184],["Quincy",42.2529,-71.0023],["Lynn",42.4668,-70.9495],["Fall River",41.7015,-71.155],["Newton",42.337,-71.2092],["Lawrence",42.707,-71.1631],["Somerville",42.3876,-71.0995],["Framingham",42.2793,-71.4162],["Haverhill",42.7762,-71.0773],["Waltham",42.3765,-71.2356],["Medford",42.4184,-71.1062],["Taunton",41.9001,-71.0898],["Chicopee",42.1487,-72.6082],["Weymouth",42.2237,-70.9409],["Revere",42.4084,-71.012],["Peabody",42.5279,-70.9287],["Plymouth",41.9584,-70.6673]],"MI":[["Detroit",42.3314,-83.0458],["Grand Rapids",42.9634,-85.6681],["Warren",42.4775,-83.0277],["Sterling Heights",42.5803,-83.0302],["Ann Arbor",42.2808,-83.743],["Lansing",42.7325,-84.5555],["Flint",43.0125,-83.6875],["Dearborn",42.3223,-83.1763],["Livonia",42.3684,-83.3527],["Westland",42.3242,-83.4002],["Troy",42.6064,-83.1498],["Farmington Hills",42.499,-83.3677],["Kalamazoo",42.2917,-85.5872],["Wyoming",42.9134,-85.7053],["Saginaw",43.4195,-83.9508]],"MN":[["Minneapolis",44.9778,-93.265],["Saint Paul",44.9537,-93.09],["Rochester",44.0121,-92.4802],["Duluth",46.7867,-92.1005],["Brooklyn Park",45.0941,-93.3752],["Plymouth",45.0105,-93.4555],["Maple Grove",45.0724,-93.4558],["Woodbury",44.9239,-92.9594],["St. Cloud",45.5579,-94.1636],["Eagan",44.8041,-93.1669],["Eden Prairie",44.8547,-93.4708],["Coon Rapids",45.1197,-93.3113],["Burnsville",44.7677,-93.2777],["Blaine",45.1608,-93.2349]],"MS":[["Jackson",32.2988,-90.1848],["Gulfport",30.3674,-89.0928],["Southaven",34.9887,-90.0126],["Hattiesburg",31.3271,-89.2903],["Biloxi",30.396,-88.8853],["Meridian",32.3643,-88.7037],["Tupelo",34.2576,-88.7034],["Olive Branch",34.9618,-89.8298],["Pearl",32.2741,-90.124]],"MO":[["Kansas City",39.0997,-94.5786],["St. Louis",38.627,-90.1994],["Springfield",37.209,-93.2923],["Columbia",38.9517,-92.3341],["Independence",39.0911,-94.4155],["Lee's Summit",38.9108,-94.3824],["O'Fallon",38.8106,-90.6998],["St. Joseph",39.7675,-94.8467],["St. Charles",38.7881,-90.4974],["Blue Springs",39.017,-94.2816],["Joplin",37.0842,-94.5133]],"MT":[["Billings",45.7833,-108.5007],["Missoula",46.8721,-113.994],["Great Falls",47.5002,-111.3008],["Bozeman",45.677,-111.0429],["Butte",46.0038,-112.5348],["Helena",46.5958,-112.027],["Kalispell",48.192,-114.3168],["Havre",48.55,-109.6799],["Anaconda",46.1285,-112.943]],"NE":[["Omaha",41.2565,-95.9345],["Lincoln",40.8136,-96.7026],["Bellevue",41.1565,-95.9146],["Grand Island",40.925,-98.3426],["Kearney",40.6993,-99.0817],["Fremont",41.4334,-96.4981],["Hastings",40.5861,-98.3884],["Norfolk",42.028,-97.417],["Columbus",41.4298,-97.3683]],"NV":[["Las Vegas",36.1699,-115.1398],["Henderson",36.0395,-114.9817],["Reno",39.5296,-119.8138],["North Las Vegas",36.1989,-115.1175],["Sparks",39.5349,-119.7527],["Carson City",39.1638,-119.7674],["Fernley",39.6079,-119.2521],["Elko",40.8324,-115.763],["Mesquite",36.8057,-114.067]],"NH":[["Manchester",42.9956,-71.4548],["Nashua",42.7654,-71.4676],["Concord",43.2081,-71.5376],["Derry",42.8812,-71.327],["Dover",43.1979,-70.8737],["Rochester",43.3042,-70.9742],["Salem",42.7898,-71.2009],["Merrimack",42.8654,-71.502],["Hudson",42.7651,-71.434],["Londonderry",42.8651,-71.3737],["Hampton",42.9376,-70.8373],["Exeter",42.9815,-70.9478],["Keene",42.9337,-72.2776],["Portsmouth",43.0718,-70.7626],["Laconia",43.5279,-71.4703]],"NJ":[["Newark",40.7357,-74.1724],["Jersey City",40.7178,-74.0431],["Paterson",40.9168,-74.1718],["Elizabeth",40.664,-74.2107],["Lakewood",40.0976,-74.2177],["Edison",40.5188,-74.4121],["Woodbridge",40.5576,-74.2846],["Hamilton",40.2093,-74.6962],["Trenton",40.2171,-74.7429],["Clifton",40.8584,-74.1638],["Camden",39.9259,-75.1196],["Passaic",40.8568,-74.1285],["Union City",40.7668,-74.0327],["Bayonne",40.6688,-74.1143],["East Orange",40.7673,-74.2049]],"NM":[["Albuquerque",35.0844,-106.6504],["Las Cruces",32.3199,-106.7637],["Rio Rancho",35.2328,-106.663],["Santa Fe",35.687,-105.9378],["Roswell",33.3943,-104.523],["Farmington",36.7281,-108.2087],["Clovis",34.4048,-103.2052],["Hobbs",32.7026,-103.136],["Alamogordo",32.8995,-105.9603],["Carlsbad",32.4207,-104.2288]],"NY":[["New York City",40.7128,-74.006],["Buffalo",42.8864,-78.8784],["Rochester",43.1566,-77.6088],["Yonkers",40.9312,-73.8988],["Syracuse",43.0481,-76.1474],["Albany",42.6526,-73.7562],["New Rochelle",40.9115,-73.7826],["Mount Vernon",40.9126,-73.8371],["Schenectady",42.8142,-73.9396],["Utica",43.1009,-75.2327],["White Plains",41.034,-73.7629],["Binghamton",42.0987,-75.9179],["Niagara Falls",43.0962,-79.0377],["Troy",42.7284,-73.6918],["Hempstead",40.7062,-73.6187]],"NC":[["Charlotte",35.2271,-80.8431],["Raleigh",35.7796,-78.6382],["Greensboro",36.0726,-79.792],["Durham",35.994,-78.8986],["Winston-Salem",36.0999,-80.2442],["Fayetteville",35.0527,-78.8784],["Cary",35.7915,-78.7811],["Wilmington",34.2257,-77.9447],["High Point",35.9557,-79.9967],["Concord",35.4088,-80.5796],["Asheville",35.5951,-82.5515],["Gastonia",35.2621,-81.1873],["Jacksonville",34.754,-77.4302],["Chapel Hill",35.9132,-79.0558]],"ND":[["Fargo",46.8772,-96.7898],["Bismarck",46.8083,-100.7837],["Grand Forks",47.9253,-97.0329],["Minot",48.2325,-101.2963],["West Fargo",46.8747,-96.9003],["Dickinson",46.8792,-102.789],["Mandan",46.8267,-100.8896],["Jamestown",46.9058,-98.7084]],"OH":[["Columbus",39.9612,-82.9988],["Cleveland",41.4993,-81.6944],["Cincinnati",39.1031,-84.512],["Toledo",41.6639,-83.5552],["Akron",41.0814,-81.519],["Dayton",39.7589,-84.1916],["Parma",41.3845,-81.7229],["Canton",40.7989,-81.3784],["Lorain",41.4523,-82.1824],["Hamilton",39.3995,-84.5613],["Youngstown",41.0998,-80.6495],["Springfield",39.9245,-83.8088],["Kettering",39.6895,-84.1688]],"OK":[["Oklahoma City",35.4676,-97.5164],["Tulsa",36.154,-95.9928],["Norman",35.2226,-97.4395],["Broken Arrow",36.06,-95.7908],["Lawton",34.6036,-98.3959],["Edmond",35.6528,-97.4781],["Moore",35.3395,-97.4867],["Midwest City",35.4495,-97.3967],["Enid",36.3956,-97.8784],["Stillwater",36.1156,-97.0584]],"OR":[["Portland",45.5051,-122.675],["Salem",44.9429,-123.0351],["Eugene",44.0521,-123.0868],["Gresham",45.4984,-122.4306],["Hillsboro",45.5229,-122.9898],["Beaverton",45.4871,-122.8037],["Bend",44.0582,-121.3153],["Medford",42.3265,-122.8756],["Springfield",44.0462,-123.022],["Corvallis",44.5646,-123.262],["Albany",44.6368,-123.1059],["Tigard",45.4312,-122.7714]],"PA":[["Philadelphia",39.9526,-75.1652],["Pittsburgh",40.4406,-79.9959],["Allentown",40.6084,-75.4902],["Erie",42.1292,-80.0851],["Reading",40.3356,-75.9269],["Scranton",41.409,-75.6624],["Bethlehem",40.6259,-75.3705],["Lancaster",40.0379,-76.3055],["Harrisburg",40.2732,-76.8867],["Altoona",40.5187,-78.3947],["York",39.9626,-76.7277],["Wilkes-Barre",41.2459,-75.8813],["Chester",39.849,-75.3557]],"RI":[["Providence",41.824,-71.4128],["Cranston",41.7798,-71.4373],["Warwick",41.7001,-71.4162],["Pawtucket",41.8787,-71.3826],["East Providence",41.8137,-71.37],["Woonsocket",41.999,-71.5148],["Coventry",41.6984,-71.6487],["Cumberland",41.9668,-71.4301],["North Providence",41.854,-71.4637],["Westerly",41.3776,-71.8273]],"SC":[["Columbia",34.0007,-81.0348],["Charleston",32.7765,-79.9311],["North Charleston",32.8546,-79.9748],["Mount Pleasant",32.8323,-79.8284],["Rock Hill",34.9249,-81.0251],["Greenville",34.8526,-82.394],["Summerville",33.0185,-80.1756],["Goose Creek",32.981,-80.032],["Hilton Head Island",32.2163,-80.7526],["Spartanburg",34.9496,-81.9321],["Sumter",33.9204,-80.3412]],"SD":[["Sioux Falls",43.5446,-96.7311],["Rapid City",44.0805,-103.231],["Aberdeen",45.4647,-98.4865],["Brookings",44.3114,-96.7984],["Watertown",44.8997,-97.1148],["Mitchell",43.7097,-98.0298],["Yankton",42.8711,-97.3973],["Pierre",44.3683,-100.351]],"TN":[["Memphis",35.1495,-90.049],["Nashville",36.1627,-86.7816],["Knoxville",35.9606,-83.9207],["Chattanooga",35.0456,-85.3097],["Clarksville",36.5298,-87.3595],["Murfreesboro",35.8456,-86.3903],["Franklin",35.9251,-86.8689],["Jackson",35.6145,-88.8139],["Johnson City",36.3134,-82.3535],["Bartlett",35.2045,-89.8742],["Hendersonville",36.3048,-86.6199],["Kingsport",36.5484,-82.5618]],"TX":[["Houston",29.7604,-95.3698],["San Antonio",29.4241,-98.4936],["Dallas",32.7767,-96.797],["Austin",30.2672,-97.7431],["Fort Worth",32.7555,-97.3308],["El Paso",31.7619,-106.485],["Arlington",32.7357,-97.1081],["Corpus Christi",27.8006,-97.3964],["Plano",33.0198,-96.6989],["Laredo",27.5306,-99.4803],["Lubbock",33.5779,-101.8552],["Garland",32.9126,-96.6389],["Irving",32.814,-96.9489],["Amarillo",35.222,-101.8313],["Grand Prairie",32.746,-97.0203],["Brownsville",25.9017,-97.4975],["McKinney",33.1972,-96.6397],["Frisco",33.1507,-96.8236],["Pasadena",29.6911,-95.2091],["Mesquite",32.7668,-96.5992],["Killeen",31.1171,-97.7278],["McAllen",26.2034,-98.23],["Denton",33.2148,-97.1331],["Waco",31.5493,-97.1467],["Carrollton",32.9537,-96.8903],["Midland",31.9973,-102.0779],["Beaumont",30.0802,-94.1266],["Round Rock",30.5083,-97.6789],["Abilene",32.4487,-99.7331],["Odessa",31.8457,-102.3676],["Tyler",32.3513,-95.301],["Pearland",29.5636,-95.286],["College Station",30.628,-96.3344]],"UT":[["Salt Lake City",40.7608,-111.891],["West Valley City",40.6916,-112.0011],["Provo",40.2338,-111.6585],["West Jordan",40.6097,-111.9391],["Sandy",40.5649,-111.8389],["Ogden",41.223,-111.9738],["St. George",37.0965,-113.5684],["Layton",41.0602,-111.971],["South Jordan",40.5621,-111.9294],["Lehi",40.3916,-111.8508],["Millcreek",40.6869,-111.8763],["Taylorsville",40.6677,-111.9388],["Logan",41.737,-111.8338],["Murray",40.6669,-111.888]],"VT":[["Burlington",44.4759,-73.2121],["South Burlington",44.467,-73.171],["Rutland",43.6106,-72.9726],["Essex Junction",44.4895,-73.1154],["Barre",44.197,-72.5021],["Montpelier",44.2601,-72.5754],["Winooski",44.4917,-73.1859],["St. Albans",44.8112,-73.0832],["Newport",44.9368,-72.2048],["Vergennes",44.1681,-73.2596]],"VA":[["Virginia Beach",36.8529,-75.978],["Norfolk",36.8508,-76.2859],["Chesapeake",36.7682,-76.2875],["Richmond",37.5407,-77.436],["Newport News",37.0871,-76.473],["Alexandria",38.8048,-77.0469],["Hampton",37.0299,-76.3452],["Roanoke",37.271,-79.9414],["Suffolk",36.7282,-76.5836],["Portsmouth",36.8354,-76.2983],["Lynchburg",37.4138,-79.1422],["Harrisonburg",38.4496,-78.8689],["Leesburg",39.1154,-77.5636],["Charlottesville",38.0293,-78.4767]],"WA":[["Seattle",47.6062,-122.3321],["Spokane",47.6588,-117.426],["Tacoma",47.2529,-122.4443],["Vancouver",45.6387,-122.6615],["Bellevue",47.6101,-122.2015],["Kent",47.3809,-122.2348],["Everett",47.979,-122.2021],["Renton",47.4799,-122.2171],["Yakima",46.6021,-120.5059],["Kirkland",47.6815,-122.2087],["Bellingham",48.7519,-122.4787],["Kennewick",46.2113,-119.1372],["Federal Way",47.3223,-122.3126],["Spokane Valley",47.6732,-117.2394],["Marysville",48.0512,-122.177]],"WV":[["Charleston",38.3498,-81.6326],["Huntington",38.4193,-82.4452],["Parkersburg",39.2667,-81.5615],["Morgantown",39.6295,-79.9559],["Wheeling",40.064,-80.7209],["Weirton",40.4187,-80.5901],["Fairmont",39.4851,-80.1426],["Martinsburg",39.4562,-77.9639],["Beckley",37.7782,-81.1879]],"WI":[["Milwaukee",43.0389,-87.9065],["Madison",43.0731,-89.4012],["Green Bay",44.5133,-88.0133],["Kenosha",42.5847,-87.8212],["Racine",42.7261,-87.7829],["Appleton",44.2619,-88.4154],["Waukesha",43.0117,-88.2315],["Oshkosh",44.0247,-88.5426],["Eau Claire",44.8113,-91.4985],["Janesville",42.6828,-89.0187],["West Allis",43.0167,-88.007],["La Crosse",43.8014,-91.2396],["Sheboygan",43.7508,-87.7145],["Wauwatosa",43.0494,-88.0078]],"WY":[["Cheyenne",41.14,-104.8202],["Casper",42.8501,-106.3252],["Laramie",41.3114,-105.5911],["Gillette",44.2911,-105.502],["Rock Springs",41.5875,-109.2029],["Sheridan",44.7972,-106.9564],["Green River",41.5275,-109.4663],["Evanston",41.2683,-110.9633]]};

// showCitySelector: tries Overpass first (works on web server),
// falls back to embedded city data if network unavailable.
async function showCitySelector(stateName){
  document.getElementById('citySection').style.display='block';
  document.getElementById('cityCountyName').textContent=S.county+' County, '+stateName;
  const csEl2=document.getElementById('courtsSection');if(csEl2)csEl2.style.display='none';
  const sel=document.getElementById('citySelect');
  sel.innerHTML='<option value="">Loading cities…</option>';
  sel.disabled=true;
  document.getElementById('cityHint').textContent='Fetching places in '+S.county+' County…';

  const bbox=S.countyBbox;
  let cities=[];
  let loaded=false;

  // ── Primary: Overpass API (works from any web server) ──
  if(bbox){
    try{
      const pad=0.05;
      const s=bbox.south-pad,w=bbox.west-pad,n=bbox.north+pad,e=bbox.east+pad;
      const oq=`[out:json][timeout:20];(node["place"~"^(city|town|village|hamlet)$"]["name"](${s},${w},${n},${e}););out body;`;
      const ctrl=new AbortController();
      const tid=setTimeout(()=>ctrl.abort(),8000);
      const res=await fetch('https://overpass-api.de/api/interpreter',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:'data='+encodeURIComponent(oq),
        signal:ctrl.signal
      });
      clearTimeout(tid);
      const data=await res.json();
      if(data.elements&&data.elements.length>0){
        const seen=new Set();
        cities=data.elements
          .filter(e=>e.tags?.name&&!seen.has(e.tags.name)&&seen.add(e.tags.name))
          .map(e=>([e.tags.name,e.lat,e.lon]))
          .sort((a,b)=>a[0].localeCompare(b[0]));
        loaded=true;
      }
    }catch(err){ console.warn('Overpass city fetch unavailable, using embedded data.'); }
  }

  // ── Fallback: embedded city data ──────────────────────
  if(!loaded){
    const abbr=Object.entries(STATE_INFO).find(([k,v])=>v[1]===S.state)?.[1]?.[0]||'';
    const allCities=CITIES_BY_STATE[abbr]||[];
    if(bbox){
      const pad=0.3;
      cities=allCities
        .filter(c=>c[1]>=(bbox.south-pad)&&c[1]<=(bbox.north+pad)&&c[2]>=(bbox.west-pad)&&c[2]<=(bbox.east+pad));
    }
    if(!cities.length) cities=[...allCities];
  }

  sel.innerHTML='<option value="">Select your city or town…</option>';
  if(cities.length>0){
    cities.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=JSON.stringify({name:c[0],lat:c[1],lon:c[2]});
      opt.textContent=c[0];
      sel.appendChild(opt);
    });
    document.getElementById('cityHint').textContent=cities.length+' places found · Select yours'+(loaded?' (live)':' (offline)');
  } else {
    sel.innerHTML='<option value="">No places found — enter manually below</option>';
    document.getElementById('cityHint').textContent='Enter your city or town:';
    addManualCityInput();
  }
  sel.disabled=false;
}




// ── Navigation ─────────────────────────────────────────
function showPage(page){
  // Guard: intercept navigation away from Setup Match mid-wizard
  if(!_smAllowNavigation && page !== 'setupMatch'){
    const activePage = document.querySelector('.page-section.active')?.id?.replace('page-','');
    if(activePage === 'setupMatch' && isMatchWizardDirty()){
      _smShowLeaveDialog(page);
      return;
    }
  }
  // Auth gate — redirect unauthenticated users to welcome screen
  const UNPROTECTED_PAGES = ['welcome', 'tos', 'privacy'];
  if(!SESSION_PLAYER && !UNPROTECTED_PAGES.includes(page)){
    // Allow playerProfile during active new-user registration flow:
    // startNewRegistration() and _inviteChoiceFull() call showPage('playerProfile') before
    // SESSION_PLAYER is set. _newUserRegistrationStarted stays true until AFTER showPage() returns.
    if(page === 'playerProfile' && _newUserRegistrationStarted){ /* allowed */ }
    else { showPage('welcome'); return; }
  }
  if(page!=='playerProfile'){stopChangeDetection();_editModeActive=false;}
  closeNav();
  setTimeout(closeNav, 50); // catch any async re-opens
  window.scrollTo(0,0); // always open pages at the top
  // Remove existing back button, show on all pages except dashboard and welcome
  document.getElementById('backToDashBtn')?.remove();
  if(page !== 'dashboard' && page !== 'welcome' && !_newUserRegistrationStarted) showBackToDashboard();
  document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const navEl=document.getElementById('nav-'+page);
  if(navEl) navEl.classList.add('active');
  // Page-specific loaders
  if(page==='dashboard')    loadDashboard();
  if(page==='myCourts')    loadMyCourts();
  if(page==='lessons')     renderCoachingPage();
  if(page==='myLessons')   renderLessonsPage();
  if(page==='innerCircle'){ loadInnerCircle(); }
  if(page==='playerProfile'){
    if(SESSION_PLAYER){
      setTimeout(()=>restoreProfileForm(SESSION_PLAYER), 200);
    } else if(!_newUserRegistrationStarted){
      // Try to load from localStorage email (skip if new-user registration is in progress)
      const em = localStorage.getItem('pb_email');
      if(em) fetchAndRestoreProfile(em);
    }
  }
  if(page==='findPlayers')  initFindPlayers();
  if(page==='playerStats')   { loadCommunitySnapshot(); }
  if(page==='setupMatch')        { initSetupMatch(); loadMatchSquareCounts(); }
  if(page==='myGroups')          loadMyGroups();
  if(page==='recurringMatches')  loadRecurringMatches();
  if(page==='confirmedMatches') { loadConfirmedMatches(); }
  if(page==='recordScores')  { loadRecordScores(); }
  if(page==='myInvites')      { loadMyInvitesPage(); }
  if(page==='invitedByOthers'){ loadInvitedByOthersPage(); }
}

function unlockLessonsNav(){
  ['nav-lessons','nav-myLessons'].forEach(id=>{
    const n=document.getElementById(id);
    if(n){n.classList.remove('nav-lessons-dim');n.classList.add('unlocked','pulsing');}
  });
  const badge=document.getElementById('lessonsNavBadge');
  if(badge)badge.style.display='inline-block';
}
function dimLessonsNav(){
  ['nav-lessons','nav-myLessons'].forEach(id=>{
    const n=document.getElementById(id);
    if(n){n.classList.add('nav-lessons-dim');n.classList.remove('unlocked','pulsing');}
  });
  const badge=document.getElementById('lessonsNavBadge');
  if(badge)badge.style.display='none';
}

function renderCoachingPage(){
  const p=SESSION_PLAYER;
  // Restore coach status banner
  const statusEl=document.getElementById('coachStatusMsg');
  if(statusEl){
    if(p?.is_coach){
      statusEl.innerHTML='<div style="padding:10px 14px;border-radius:10px;background:rgba(76,175,125,0.1);border:1px solid rgba(76,175,125,0.3);color:var(--green);font-size:13px;font-weight:600;">✅ You are registered as a coach!</div>';
    } else {
      statusEl.innerHTML='';
    }
  }
  if(!p) return;
  // Restore form fields from saved profile
  S.coachCerts=new Set(); S.coachLessonTypes=new Set(); S.coachFormats=new Set();
  if(p.is_coach){
    S.isCoach='Yes';
    const chips=document.getElementById('isCoachChips');
    if(chips) chips.querySelectorAll('.chip').forEach(ch=>{ ch.classList.toggle('on', ch.textContent.includes('coach')); });
    toggleCoachSection('Yes');
    restoreCoachChips('coachCertChips','coachCerts',p.coach_certifications||'');
    restoreCoachChips('coachLessonChips','coachLessonTypes',p.coach_lesson_types||'');
    restoreCoachChips('coachFormatChips','coachFormats',p.coach_formats||'');
    const rMin=document.getElementById('coachRateMin'); if(rMin) rMin.value=p.coach_rate_min||'';
    const rMax=document.getElementById('coachRateMax'); if(rMax) rMax.value=p.coach_rate_max||'';
    const bio=document.getElementById('coachBio');     if(bio)  bio.value=p.coach_bio||'';
  } else {
    S.isCoach='Not currently';
    const chips=document.getElementById('isCoachChips');
    if(chips) chips.querySelectorAll('.chip').forEach(ch=>{ ch.classList.toggle('on', ch.textContent.includes('Not')); });
    toggleCoachSection('No');
  }
}
async function saveCoachProfile(){
  const myEmail=getMyEmail();
  if(!myEmail){ showToast('Sign in to save your coach profile','#f87171'); return; }
  const payload={
    is_coach: S.isCoach==='Yes',
    coach_certifications: S.coachCerts&&S.coachCerts.size>0 ? [...S.coachCerts].join(', ') : null,
    coach_lesson_types:  S.coachLessonTypes&&S.coachLessonTypes.size>0 ? [...S.coachLessonTypes].join(', ') : null,
    coach_formats:       S.coachFormats&&S.coachFormats.size>0 ? [...S.coachFormats].join(', ') : null,
    coach_rate_min:      parseInt(document.getElementById('coachRateMin')?.value)||null,
    coach_rate_max:      parseInt(document.getElementById('coachRateMax')?.value)||null,
    coach_bio:           document.getElementById('coachBio')?.value?.trim()||null,
  };
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(myEmail)}`,{
      method:'PATCH',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify(payload)
    });
    if(res.ok){
      if(SESSION_PLAYER) Object.assign(SESSION_PLAYER, payload);
      showToast('Coach profile saved! ✅','#4CAF7D');
      renderCoachingPage();
    } else {
      showToast('Save failed — please try again','#f87171');
    }
  }catch(e){ showToast('Save failed — please try again','#f87171'); }
}
function renderLessonsPage(){
  const myEmail=getMyEmail();
  const locked=document.getElementById('lessonsLockedMsg');
  const dir=document.getElementById('coachDirectory');
  if(!myEmail){if(locked)locked.style.display='block';if(dir)dir.style.display='none';return;}
  if(locked)locked.style.display='none';
  if(dir)dir.style.display='block';
  loadCoachDirectory();
}
async function loadCoachDirectory(){
  const list=document.getElementById('coachList');
  const meta=document.getElementById('coachDirectoryMeta');
  if(!list)return;
  list.innerHTML='<div style="color:var(--dim);font-size:13px;padding:20px 0;">🔍 Finding coaches near you…</div>';
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/public_profiles?is_coach=eq.true&select=first_name,last_name,nickname,avatar_emoji,photo_url,skill_level,city,state,coach_certifications,coach_lesson_types,coach_formats,coach_rate_min,coach_rate_max,coach_bio,email&order=skill_level.desc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const coaches=res.ok?await res.json():[];
    if(meta)meta.textContent=coaches.length+' coach'+(coaches.length!==1?'es':'')+' registered';
    if(!coaches.length){list.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--dim);font-size:14px;">No coaches registered yet. Be the first!</div>';return;}
    list.innerHTML='';
    coaches.forEach(coach=>{
      const name=(coach.first_name||'')+(coach.last_name?' '+coach.last_name:'');
      const loc=[coach.city,coach.state].filter(Boolean).join(', ');
      const rate=coach.coach_rate_min||coach.coach_rate_max?'$'+(coach.coach_rate_min||'?')+(coach.coach_rate_max?' – $'+coach.coach_rate_max:'')+'/hr':'Rate on request';
      const card=document.createElement('div');
      card.style.cssText='background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:14px;';
      card.innerHTML=
        '<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:12px;">'+
        (coach.photo_url ? '<div style="width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="'+coach.photo_url+'" style="width:100%;height:100%;object-fit:cover;"/></div>' : '<div style="width:52px;height:52px;border-radius:50%;background:rgba(76,175,125,0.12);border:2px solid rgba(76,175,125,0.25);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">'+(coach.avatar_emoji||'🎾')+'</div>')+
        '<div style="flex:1;">'+
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'+
            '<span style="color:#fff;font-size:15px;font-weight:700;">'+name+'</span>'+
            (coach.nickname?'<span style="color:var(--dim);font-size:13px;">"'+coach.nickname+'"</span>':'')+
            '<span style="padding:2px 8px;border-radius:999px;background:rgba(76,175,125,0.15);border:1px solid rgba(76,175,125,0.3);color:var(--green);font-size:10px;font-weight:700;">🎓 COACH</span>'+
          '</div>'+
          '<div style="color:var(--dim);font-size:12px;margin-top:3px;">'+(loc?'📍 '+loc+' · ':'')+' ⭐ '+coach.skill_level+' · 💰 '+rate+'</div>'+
        '</div></div>'+
        (coach.coach_certifications?'<div style="font-size:12px;color:var(--dim);margin-bottom:6px;"><strong style="color:#fff;">Certifications:</strong> '+coach.coach_certifications+'</div>':'')+
        (coach.coach_lesson_types?'<div style="font-size:12px;color:var(--dim);margin-bottom:6px;"><strong style="color:#fff;">Teaches:</strong> '+coach.coach_lesson_types+'</div>':'')+
        (coach.coach_bio?'<div style="font-size:12px;color:rgba(255,255,255,0.65);font-style:italic;border-top:1px solid var(--border);padding-top:10px;margin-top:10px;">'+coach.coach_bio+'</div>':'')+
        '<div style="margin-top:12px;"><a href="mailto:'+coach.email+'" style="display:inline-block;padding:8px 18px;border-radius:8px;border:1px solid rgba(76,175,125,0.4);color:var(--green);font-size:12px;font-weight:600;text-decoration:none;">✉️ Contact '+(coach.first_name||'Coach')+'</a></div>';
      list.appendChild(card);
    });
  }catch(e){list.innerHTML='<div style="color:#f87171;font-size:13px;">Error loading coaches.</div>';}
}
// ══════════════════════════════════════════════════════
// SCORE RECORDER
// ══════════════════════════════════════════════════════

const SR = {
  matchId: null,
  matchType: 'doubles',
  players: [],        // [{email, name, emoji}]
  teamA: [],          // indices into players[]
  teamB: [],          // indices into players[]
  scoreA: 0,
  scoreB: 0,
  gameNumber: 1,
  gamesPlayed: [],    // [{gameNumber, teamAScore, teamBScore}]
};

async function openRecordResults(matchId, matchType){
  SR.matchId = matchId;
  SR.matchType = matchType || 'doubles';
  SR.players = [];
  SR.teamA = [];
  SR.teamB = [];
  SR.scoreA = 0;
  SR.scoreB = 0;
  SR.gameNumber = 1;
  SR.gamesPlayed = [];

  // Fetch match details
  try{
    const [mRes, rRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=*`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email,player_name`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const matches = mRes.ok ? await mRes.json() : [];
    const responses = rRes.ok ? await rRes.json() : [];
    const match = matches[0];

    // Build info line
    const infoEl = document.getElementById('srMatchInfo');
    if(infoEl && match){
      const d = match.match_date ? new Date(match.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '';
      const t = match.time_start ? fmt12(match.time_start) : '';
      infoEl.textContent = (match.court_name||'Court TBD') + (d?' · '+d:'') + (t?' · '+t:'');
    }

    // Fetch player profiles for emojis
    const emails = responses.map(r=>r.player_email).filter(Boolean);
    let profiles = [];
    if(emails.length){
      const pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/registrations?email=in.(${emails.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name,last_name,avatar_emoji,photo_url`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      profiles = pRes.ok ? await pRes.json() : [];
    }

    // Build player list — confirmed "in" players, up to 4 for doubles
    const limit = SR.matchType === 'singles' ? 2 : 4;
    responses.slice(0, limit).forEach(r=>{
      const prof = profiles.find(p=>p.email===r.player_email);
      SR.players.push({
        email: r.player_email,
        name: r.player_name || (prof ? (prof.first_name||'')+(prof.last_name?' '+prof.last_name:'') : r.player_email),
        emoji: prof?.avatar_emoji || '🎾'
      });
    });

    // Default team assignment — first 2 vs last 2
    if(SR.matchType === 'doubles'){
      SR.teamA = SR.players.slice(0,2).map((_,i)=>i);
      SR.teamB = SR.players.slice(2,4).map((_,i)=>i+2);
    } else {
      SR.teamA = [0];
      SR.teamB = [1];
    }

    // If we have fewer than expected players, show a message
    if(SR.players.length < 2){
      showToast('⚠️ Need at least 2 confirmed players to record a score','#f59e0b');
      return;
    }

  }catch(e){
    showToast('⚠️ Could not load match details','#f59e0b');
    return;
  }

  srRenderTeams();
  srShowStep(1);
  document.getElementById('scoreRecorderModal').style.display='flex';
}

function closeScoreRecorder(){
  document.getElementById('scoreRecorderModal').style.display='none';
}

function srShowStep(n){
  document.getElementById('srStep1').style.display = n===1 ? 'block' : 'none';
  document.getElementById('srStep2').style.display = n===2 ? 'block' : 'none';
  document.getElementById('srStep3').style.display = n===3 ? 'block' : 'none';
}

function srPlayerPill(playerIdx, team){
  const p = SR.players[playerIdx];
  if(!p) return '';
  const otherTeam = team === 'A' ? 'B' : 'A';
  return `<div onclick="srMovePlayer(${playerIdx},'${otherTeam}')"
    style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;
      background:rgba(255,255,255,0.05);margin-bottom:6px;cursor:pointer;
      transition:background .15s;" title="Tap to move to Team ${otherTeam}">
    <span style="font-size:18px;">${p.emoji}</span>
    <span style="font-size:13px;color:#fff;font-weight:500;">${p.name}</span>
  </div>`;
}

function srRenderTeams(){
  const a = document.getElementById('srTeamA');
  const b = document.getElementById('srTeamB');
  if(a) a.innerHTML = SR.teamA.map(i=>srPlayerPill(i,'A')).join('') ||
    '<div style="color:var(--dim);font-size:12px;text-align:center;padding:12px;">Empty</div>';
  if(b) b.innerHTML = SR.teamB.map(i=>srPlayerPill(i,'B')).join('') ||
    '<div style="color:var(--dim);font-size:12px;text-align:center;padding:12px;">Empty</div>';

  // Update team labels in score step
  const aNames = SR.teamA.map(i=>SR.players[i]?.name.split(' ')[0]).filter(Boolean).join(' & ');
  const bNames = SR.teamB.map(i=>SR.players[i]?.name.split(' ')[0]).filter(Boolean).join(' & ');
  const elA = document.getElementById('srTeamALabel');
  const elB = document.getElementById('srTeamBLabel');
  if(elA) elA.textContent = aNames || 'Team A';
  if(elB) elB.textContent = bNames || 'Team B';
}

function srMovePlayer(playerIdx, toTeam){
  SR.teamA = SR.teamA.filter(i=>i!==playerIdx);
  SR.teamB = SR.teamB.filter(i=>i!==playerIdx);
  if(toTeam==='A') SR.teamA.push(playerIdx);
  else SR.teamB.push(playerIdx);
  srRenderTeams();
}

function swapTeams(){
  [SR.teamA, SR.teamB] = [SR.teamB, SR.teamA];
  srRenderTeams();
}

function srGoToScore(){
  if(SR.teamA.length===0 || SR.teamB.length===0){
    showToast('⚠️ Both teams need at least one player','#f59e0b');
    return;
  }
  SR.scoreA = 0;
  SR.scoreB = 0;
  document.getElementById('srScoreA').textContent = '0';
  document.getElementById('srScoreB').textContent = '0';
  document.getElementById('srGameLabel').textContent = 'Game '+SR.gameNumber;
  document.getElementById('srScoreMsg').textContent = '';
  srShowStep(2);
}

function adjustScore(team, delta){
  if(team==='A'){
    SR.scoreA = Math.max(0, SR.scoreA + delta);
    document.getElementById('srScoreA').textContent = SR.scoreA;
  } else {
    SR.scoreB = Math.max(0, SR.scoreB + delta);
    document.getElementById('srScoreB').textContent = SR.scoreB;
  }
  srValidateScore();
}

function srValidateScore(){
  const a = SR.scoreA, b = SR.scoreB;
  const msgEl = document.getElementById('srScoreMsg');
  const confirmBtn = document.getElementById('srConfirmBtn');

  // Must have a winner
  if(a === 0 && b === 0){
    if(msgEl) msgEl.textContent = '';
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  const winner = a > b ? a : b;
  const loser  = a > b ? b : a;

  // Pickleball scoring rules: win by 2, typically to 11 (or 15/21 in tiebreakers)
  let msg = '';
  let valid = true;

  if(winner < 11){
    msg = 'Games are usually played to 11'; valid = false;
  } else if(winner - loser < 2){
    msg = 'Must win by 2 points'; valid = false;
  } else if(winner > 21){
    msg = 'That score seems high — are you sure?';
  }

  if(msgEl){
    msgEl.textContent = msg;
    msgEl.style.color = valid ? '#f59e0b' : '#f87171';
  }
  if(confirmBtn) confirmBtn.disabled = !valid && winner >= 11;
}

async function srConfirmGame(){
  const a = SR.scoreA, b = SR.scoreB;
  if(a === b){ showToast('⚠️ Scores can\'t be tied','#f59e0b'); return; }

  // Save to Supabase
  try{
    const payload = {
      match_id: SR.matchId,
      game_number: SR.gameNumber,
      team_a_player1_email: SR.players[SR.teamA[0]]?.email || null,
      team_a_player2_email: SR.players[SR.teamA[1]]?.email || null,
      team_b_player1_email: SR.players[SR.teamB[0]]?.email || null,
      team_b_player2_email: SR.players[SR.teamB[1]]?.email || null,
      team_a_score: a,
      team_b_score: b,
      recorded_by: getMyEmail()
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/match_results`,{
      method: 'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Save failed');
  }catch(e){
    showToast('⚠️ Could not save score: '+e.message,'#f87171');
    return;
  }

  SR.gamesPlayed.push({gameNumber: SR.gameNumber, teamAScore: a, teamBScore: b});

  // Build result summary
  const aNames = SR.teamA.map(i=>SR.players[i]?.name.split(' ')[0]).filter(Boolean).join(' & ');
  const bNames = SR.teamB.map(i=>SR.players[i]?.name.split(' ')[0]).filter(Boolean).join(' & ');
  const winner = a > b ? aNames : bNames;
  const wScore = Math.max(a,b);
  const lScore = Math.min(a,b);

  const summaryEl = document.getElementById('srResultSummary');
  if(summaryEl){
    let html = `<strong style="color:var(--green);">🏆 ${winner}</strong> won Game ${SR.gameNumber}<br>`;
    html += `<span style="font-size:24px;font-weight:900;">${wScore} – ${lScore}</span><br>`;
    if(SR.gamesPlayed.length > 1){
      html += '<div style="font-size:12px;color:var(--dim);margin-top:8px;">Games recorded: ';
      html += SR.gamesPlayed.map(g=>`G${g.gameNumber}: ${g.teamAScore}-${g.teamBScore}`).join(' · ');
      html += '</div>';
    }
    summaryEl.innerHTML = html;
  }

  const savedEl = document.getElementById('srGamesSaved');
  if(savedEl) savedEl.textContent = SR.gamesPlayed.length + ' game'+(SR.gamesPlayed.length!==1?'s':'')+' saved ✓';

  srShowStep(3);
}

function srAddGame(){
  SR.gameNumber++;
  SR.scoreA = 0;
  SR.scoreB = 0;
  document.getElementById('srScoreA').textContent = '0';
  document.getElementById('srScoreB').textContent = '0';
  document.getElementById('srGameLabel').textContent = 'Game '+SR.gameNumber;
  document.getElementById('srScoreMsg').textContent = '';
  const confirmBtn = document.getElementById('srConfirmBtn');
  if(confirmBtn) confirmBtn.disabled = false;
  srShowStep(2);
}

function srBackToTeams(){
  srShowStep(1);
}

function srFinish(){
  const matchId = SR.matchId;
  closeScoreRecorder();
  showToast('✅ '+SR.gamesPlayed.length+' game'+(SR.gamesPlayed.length!==1?'s':'')+' recorded!','#4CAF7D');
  // Refresh the page the user was on
  if(document.getElementById('page-myInvites').classList.contains('active')) loadMyInvitesPage();
  if(document.getElementById('page-invitedByOthers').classList.contains('active')) loadInvitedByOthersPage();
  // Trigger post-match feedback prompt
  if(matchId) maybeShowPostMatchFeedback(matchId);
}

function refreshCurrentPage(){
  const btn = document.getElementById('refreshBtn');
  if(btn){ btn.style.transform='rotate(360deg)'; btn.style.transition='transform 0.5s'; 
    setTimeout(()=>{ btn.style.transform=''; btn.style.transition=''; }, 500); }
  // Find active page and reload it
  const active = document.querySelector('.page-section.active');
  if(!active) return;
  const page = active.id.replace('page-','');
  // Re-trigger the page load
  const loaders = {
    innerCircle: ()=>{ loadInnerCircle(); },
    myInvites: loadMyInvitesPage,
    invitedByOthers: loadInvitedByOthersPage,
    findPlayers: initFindPlayers,
    myCourts: loadMyCourts,
    lessons: renderLessonsPage,
    playerStats: loadCommunitySnapshot,
    setupMatch: loadMatchSquareCounts,
  };
  if(loaders[page]) loaders[page]();
  else showToast('↻ Refreshed','#4CAF7D');
}

// Show refresh button on mobile
if(window.innerWidth <= 768){
  const rb = document.getElementById('refreshBtn');
  if(rb) rb.style.display='flex';
}
window.addEventListener('resize', ()=>{
  const rb = document.getElementById('refreshBtn');
  if(rb) rb.style.display = window.innerWidth<=768 ? 'flex' : 'none';
});

// ── Walk-On Match Recording ────────────────────────────
let _walkOnType = 'doubles';

function openWalkOnMatchModal(){
  // Default date to today
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('walkOnDate');
  if(dateEl) dateEl.value = today;
  _walkOnType = 'doubles';
  // Pre-fill player 1 with current user
  const a1 = document.getElementById('walkOnA1');
  if(a1 && SESSION_PLAYER){
    a1.value = (SESSION_PLAYER.first_name||'') + (SESSION_PLAYER.last_name?' '+SESSION_PLAYER.last_name:'');
  }
  document.getElementById('walkOnModal').style.display = 'flex';
}

function walkOnSetType(type){
  _walkOnType = type;
  const doublesBtn = document.getElementById('walkOnDoubles');
  const singlesBtn = document.getElementById('walkOnSingles');
  const a2 = document.getElementById('walkOnA2');
  const b2 = document.getElementById('walkOnB2');
  if(type==='doubles'){
    if(doublesBtn){doublesBtn.style.background='rgba(76,175,125,0.15)';doublesBtn.style.color='var(--green)';doublesBtn.style.borderColor='rgba(76,175,125,0.4)';}
    if(singlesBtn){singlesBtn.style.background='transparent';singlesBtn.style.color='var(--dim)';singlesBtn.style.borderColor='var(--border)';}
    if(a2) a2.style.display='';
    if(b2) b2.style.display='';
  } else {
    if(singlesBtn){singlesBtn.style.background='rgba(96,165,250,0.15)';singlesBtn.style.color='#60a5fa';singlesBtn.style.borderColor='rgba(96,165,250,0.4)';}
    if(doublesBtn){doublesBtn.style.background='transparent';doublesBtn.style.color='var(--dim)';doublesBtn.style.borderColor='var(--border)';}
    if(a2){a2.style.display='none';a2.value='';}
    if(b2){b2.style.display='none';b2.value='';}
  }
}

async function saveWalkOnMatch(){
  const date   = document.getElementById('walkOnDate')?.value;
  const a1     = document.getElementById('walkOnA1')?.value?.trim();
  const b1     = document.getElementById('walkOnB1')?.value?.trim();
  const scoreA = parseInt(document.getElementById('walkOnScoreA')?.value||'0');
  const scoreB = parseInt(document.getElementById('walkOnScoreB')?.value||'0');

  if(!date){ showToast('⚠️ Please enter a date','#f59e0b'); return; }
  if(!a1||!b1){ showToast('⚠️ Please enter at least one player per team','#f59e0b'); return; }
  if(isNaN(scoreA)||isNaN(scoreB)||scoreA===scoreB){ showToast('⚠️ Please enter valid scores','#f59e0b'); return; }

  const myEmail = getMyEmail();
  try{
    // Create a walk-on match record
    const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/matches`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=representation'},
      body:JSON.stringify({
        organizer_email: myEmail,
        organizer_name: (SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:''),
        match_type: _walkOnType,
        match_date: date,
        status: 'full',
        is_walk_on: true,
        court_name: 'Walk-On Match'
      })
    });
    const matches = matchRes.ok ? await matchRes.json() : [];
    const matchId = matches[0]?.id;
    if(!matchId) throw new Error('Could not create match');

    // Save score
    await fetch(`${SUPABASE_URL}/rest/v1/match_results`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({
        match_id: matchId,
        game_number: 1,
        team_a_player1_email: myEmail,
        team_a_player2_email: null,
        team_b_player1_email: null,
        team_b_player2_email: null,
        team_a_score: scoreA,
        team_b_score: scoreB,
        recorded_by: myEmail,
        notes: `A:${a1}${document.getElementById('walkOnA2')?.value?' & '+document.getElementById('walkOnA2').value:''} vs B:${b1}${document.getElementById('walkOnB2')?.value?' & '+document.getElementById('walkOnB2').value:''}`
      })
    });

    document.getElementById('walkOnModal').style.display='none';
    showToast('✅ Walk-on match recorded!','#4CAF7D');
    loadRecordScores(); // Refresh the list
  }catch(e){
    showToast('⚠️ Could not save match: '+e.message,'#f87171');
  }
}

function toggleNav(){
  const nav = document.getElementById('leftNav');
  const overlay = document.getElementById('navOverlay');
  nav.classList.toggle('open');
  const opening = nav.classList.contains('open');
  if(opening){
    overlay.style.display = 'block';
    overlay.style.pointerEvents = 'auto';
    requestAnimationFrame(()=>{ overlay.style.opacity = '1'; });
  } else {
    closeNav();
  }
}

// ── My Courts ──────────────────────────────────────────
const myCourtsState = { private:[], public:[], selected:new Set(), members:new Set() };

function isGenericCourtName(name){
  if(!name) return true;
  // Filter out generic OSM auto-generated names
  const generic = /^Pickleball Courts? [\(\-]/i;
  const tooShort = name.trim().length < 5;
  return generic.test(name) || tooShort;
}

async function loadMyCourts(){
  // Need lat/lon from profile location — stored in S after zip geocode
  const addrCity  = (S.city  || SESSION_PLAYER?.city  || '').trim();
  const addrState = (S.state || SESSION_PLAYER?.state || '').trim();
  if(!addrCity && !addrState){
    document.getElementById('privateCourtsBody').innerHTML='<div class="courts-loading-msg">⚠️ Please enter your zip code in your Player Profile first, then come back here.</div>';
    document.getElementById('publicCourtsBody').innerHTML='<div class="courts-loading-msg"></div>';
    return;
  }
  const sl=document.getElementById('courtsPageDriveSlider'); const radiusMiles=sl?parseInt(sl.value):parseInt(S.driveDistance)||25;
  const radiusMeters = radiusMiles * 1609;
  // Get lat/lon from the city selected in profile
  const cityData = getCityLatLon();
  if(!cityData){
    document.getElementById('privateCourtsBody').innerHTML='<div class="courts-loading-msg">⚠️ Could not determine your location. Please re-select your city in the profile.</div>';
    document.getElementById('publicCourtsBody').innerHTML='<div class="courts-loading-msg"></div>';
    return;
  }
  document.getElementById('courtsPageSub').textContent=`Courts within ${radiusMiles} miles of ${addrCity}, ${addrState}`;
  const statusEl = document.getElementById('courtsLoadStatus');
  if(statusEl) statusEl.textContent='🔍 Loading courts…';
  document.getElementById('privateCourtsBody').innerHTML='<div class="courts-loading-msg">🔍 Searching for courts near you…</div>';
  document.getElementById('publicCourtsBody').innerHTML='<div class="courts-loading-msg">🔍 Searching for courts near you…</div>';

  // Load courts from Supabase — try PostGIS RPC first, then multiple fallbacks
  let dbCourts = [];
  if(cityData){
    let loaded = false;

    // ── Method 1: PostGIS RPC (fastest, most accurate) ──────────
    try{
      const rpcRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_courts_within_radius`,
        { method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN},
          body: JSON.stringify({t_lat:cityData.lat, t_long:cityData.lon, radius_miles:radiusMiles})
        }
      );
      if(rpcRes.ok){
        const data = await rpcRes.json();
        if(Array.isArray(data)){
          dbCourts = data.map(c=>({...c,source:'db'})).filter(c=>!isGenericCourtName(c.name));
          console.log(`✅ PostGIS RPC: ${dbCourts.length} courts within ${radiusMiles} miles`);
          loaded = true;
        }
      } else {
        const err = await rpcRes.text();
        console.warn('PostGIS RPC failed (run 06_courts_enhancements.sql):', err.substring(0,100));
      }
    }catch(e){ console.warn('PostGIS RPC error:',e.message); }

    // ── Method 2: State + haversine fallback ────────────────────
    if(!loaded){
      try{
        // Try state abbreviation first
        const stateAbbr = addrState.length===2 ? addrState.toUpperCase()
          : Object.values(STATE_INFO).find(v=>v[1].toLowerCase()===addrState.toLowerCase())?.[0]||addrState;
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/courts?select=*&state=eq.${encodeURIComponent(stateAbbr)}&limit=500`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        if(res.ok){
          const all = await res.json();
          if(all.length > 0){
            dbCourts = all.filter(c=>{
              if(!c.latitude||!c.longitude) return true;
              const dist = haversine(cityData.lat,cityData.lon,parseFloat(c.latitude),parseFloat(c.longitude));
              return dist <= radiusMiles * 1.60934;
            }).map(c=>({...c,source:'db'}));
            dbCourts = dbCourts.filter(c=> !isGenericCourtName(c.name));
          console.log(`✅ State fallback (${stateAbbr}): ${dbCourts.length}/${all.length} courts within radius`);
            loaded = true;
          }
        }
      }catch(e){ console.warn('State fallback error:',e.message); }
    }

    // ── Method 3: Load ALL courts and filter by distance ────────
    if(!loaded){
      try{
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/courts?select=*&limit=1000`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        if(res.ok){
          const all = await res.json();
          dbCourts = all.filter(c=>{
            if(!c.latitude||!c.longitude) return false;
            const dist = haversine(cityData.lat,cityData.lon,parseFloat(c.latitude),parseFloat(c.longitude));
            return dist <= radiusMiles * 1.60934;
          }).map(c=>({...c,source:'db'})).filter(c=>!isGenericCourtName(c.name));
          console.log(`✅ All courts fallback: ${dbCourts.length}/${all.length} within radius`);
          loaded = true;
        }
      }catch(e){ console.warn('All courts fallback error:',e.message); }
    }

    if(!loaded) console.warn('⚠️ All DB methods failed — check Supabase connection');
  }

  // Then fetch from Overpass
  let overpassCourts = [];
  try{
    const q=`[out:json][timeout:25];(node["sport"="pickleball"](around:${radiusMeters},${cityData.lat},${cityData.lon});way["sport"="pickleball"](around:${radiusMeters},${cityData.lat},${cityData.lon});node["leisure"="pitch"]["sport"="pickleball"](around:${radiusMeters},${cityData.lat},${cityData.lon});way["leisure"="pitch"]["sport"="pickleball"](around:${radiusMeters},${cityData.lat},${cityData.lon});node["leisure"="sports_centre"]["sport"="pickleball"](around:${radiusMeters},${cityData.lat},${cityData.lon});way["leisure"="sports_centre"]["sport"="pickleball"](around:${radiusMeters},${cityData.lat},${cityData.lon}););out center body;`;
    const ctrl=new AbortController();
    setTimeout(()=>ctrl.abort(),10000);
    const res=await fetch('https://overpass-api.de/api/interpreter',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'data='+encodeURIComponent(q),signal:ctrl.signal
    });
    const data=await res.json();
    if(data.elements) overpassCourts=data.elements.map(e=>({
      id:'osm_'+e.id,
      name:e.tags?.name||'Pickleball Court',
      address:[e.tags?.['addr:street'],e.tags?.['addr:city']].filter(Boolean).join(', ')||'',
      is_private:e.tags?.access==='private'||e.tags?.fee==='yes',
      is_indoor:e.tags?.indoor==='yes',
      source:'osm'
    }));
  }catch(e){ console.warn('Overpass courts failed:',e); }

  // Merge — deduplicate by name
  const seen=new Set();
  const allCourts=[...dbCourts.map(c=>({...c,source:'db'})),...overpassCourts]
    .filter(c=>!isGenericCourtName(c.name) && !seen.has(c.name) && seen.add(c.name));
  // legacy dedup removed
  const _x=[...[]].filter(c=>{ if(seen.has(c.name)) return false; seen.add(c.name); return true; });

  myCourtsState.private = allCourts.filter(c=>c.is_private);
  myCourtsState.public  = allCourts.filter(c=>!c.is_private);

  // If no courts found at all, show helpful message
  if(!allCourts.length){
    const msg='<div class="courts-loading-msg">No courts found in our database yet for this area.<br><span style="font-size:11px;color:var(--green);margin-top:6px;display:block;">Use the Add button below to add courts you play at!</span></div>';
    document.getElementById('privateCourtsBody').innerHTML=msg;
    document.getElementById('publicCourtsBody').innerHTML=msg;
    return;
  }
  renderCourtsContainers();
  const statusEl2 = document.getElementById('courtsLoadStatus');
  if(statusEl2){
    const total = myCourtsState.private.length + myCourtsState.public.length;
    const priv = myCourtsState.private.length;
    const pub = myCourtsState.public.length;
    statusEl2.textContent = total > 0
      ? `✅ Found ${total} courts — ${priv} private, ${pub} public`
      : '⚠️ No courts found in this area yet';
  }
  // Update nav court badges
  // Count only SELECTED courts for accurate badge
  const _selPub  = [...myCourtsState.selected].filter(id=>myCourtsState.public.find(ct=>(ct.id||ct.name)===id)).length;
  const _selPriv = [...myCourtsState.selected].filter(id=>myCourtsState.private.find(ct=>(ct.id||ct.name)===id)).length;
  updateNavCourtBadges(_selPub, _selPriv);
}

function getCityLatLon(){
  // Prefer geocoded lat/lon already in S (populated by onZipChange or restoreProfileForm)
  if(S.addrLat && S.addrLon) return {lat:S.addrLat, lon:S.addrLon};
  // Fall back to city lookup in embedded dataset
  const cityName  = (S.city  || '').trim();
  const stateInput= (S.state || '').trim();
  let abbr='';
  if(stateInput.length===2){
    abbr=Object.values(STATE_INFO).find(v=>v[0]===stateInput.toUpperCase())?.[0]||stateInput.toUpperCase();
  } else {
    abbr=Object.entries(STATE_INFO).find(([k,v])=>v[1].toLowerCase()===stateInput.toLowerCase())?.[1]?.[0]||'';
  }
  const cities=CITIES_BY_STATE[abbr]||[];
  let found=cities.find(c=>c[0].toLowerCase()===cityName.toLowerCase());
  if(!found) found=cities.find(c=>c[0].toLowerCase().includes(cityName.toLowerCase())||cityName.toLowerCase().includes(c[0].toLowerCase()));
  if(found) return {lat:found[1],lon:found[2]};
  // State center fallback
  const stateCenters={'NH':{lat:43.5,lon:-71.5},'MA':{lat:42.2,lon:-71.5},'ME':{lat:44.5,lon:-69.0},
    'VT':{lat:44.0,lon:-72.7},'CT':{lat:41.6,lon:-72.7},'RI':{lat:41.7,lon:-71.5},
    'NY':{lat:42.9,lon:-75.5},'NJ':{lat:40.1,lon:-74.5},'PA':{lat:40.9,lon:-77.8},
    'FL':{lat:27.8,lon:-81.5},'TX':{lat:31.0,lon:-100.0},'CA':{lat:36.7,lon:-119.4},
    'IL':{lat:40.0,lon:-89.0},'OH':{lat:40.4,lon:-82.9},'GA':{lat:32.2,lon:-83.4},
    'NC':{lat:35.5,lon:-79.4},'VA':{lat:37.9,lon:-79.4},'WA':{lat:47.4,lon:-120.5},
    'AZ':{lat:34.0,lon:-111.9},'CO':{lat:39.0,lon:-105.5},'TN':{lat:35.8,lon:-86.7}};
  if(stateCenters[abbr]) return stateCenters[abbr];
  return null;
}

async function renderCourtsContainers(){
  // Load player's previously saved courts and pre-check them including member status
  const myEmail = getMyEmail();
  if(myEmail){
    try{
      const savedRes = await fetch(
        `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id,is_member`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      if(savedRes.ok){
        const savedRows = await savedRes.json();
        savedRows.forEach(r=>{
          if(r.court_id){
            myCourtsState.selected.add(r.court_id);
            if(r.is_member) myCourtsState.members.add(r.court_id);
          }
        });
      }
    }catch(e){}
  }
  renderCourtsList('privateCourtsBody', myCourtsState.private, 'private');
  renderCourtsList('publicCourtsBody',  myCourtsState.public,  'public');
}

function renderCourtsList(containerId, courts, type){
  const el=document.getElementById(containerId);
  if(!courts.length){
    el.innerHTML='<div class="courts-loading-msg">No '+type+' courts found nearby. Add one below!</div>';
    return;
  }
  el.innerHTML='';
  courts.forEach(court=>{
    const id=court.id||court.name;
    const isSelected=myCourtsState.selected.has(id);
    const isMember=myCourtsState.members.has(id);
    const isPrivate=type==='private';
    const div=document.createElement('div');
    div.className='court-list-item'+(isSelected?(isPrivate?' selected private-court':' selected'):'');
    div.id='court-item-'+id;
    div.onclick=()=>toggleCourtSelection(id,isPrivate);
    const tags=[];
    if(court.is_indoor) tags.push({label:'Indoor',cls:'green'});
    else tags.push({label:'Outdoor',cls:'green'});
    if(court.source==='db') tags.push({label:'Verified',cls:'purple'});
    const checkClass='court-item-check'+(isSelected?' checked':'');
    const tagsHtml=tags.map(t=>'<span class="court-item-tag '+t.cls+'">'+t.label+'</span>').join('');
    const addrHtml=court.address?'<div class="court-item-addr">'+court.address+'</div>':'';
    const memberHtml=isPrivate&&isSelected?
      '<div class="member-check-row">'+
        '<input type="checkbox" id="member-'+id+'" '+(isMember?'checked':'')+
        ' onchange="toggleMember(this.dataset.mid,this.checked)" data-mid="'+id+'" onclick="event.stopPropagation()"/>'+
        '<label for="member-'+id+'" onclick="event.stopPropagation()">I am a member of this club</label>'+
      '</div>':'';
    div.innerHTML=
      '<div class="'+checkClass+'" id="check-'+id+'"></div>'+
      '<div class="court-item-info">'+
        '<div class="court-item-name">'+court.name+'</div>'+(court.distance_miles?'<div class="court-item-dist">📍 '+Math.round(court.distance_miles*10)/10+' mi away</div>':'')+
        addrHtml+
        '<div class="court-item-tags">'+tagsHtml+'</div>'+
        memberHtml+
      '</div>';
    el.appendChild(div);
  });
}
function toggleCourtSelection(id, isPrivate){
  if(myCourtsState.selected.has(id)){
    myCourtsState.selected.delete(id);
    myCourtsState.members.delete(id);
  } else {
    myCourtsState.selected.add(id);
  }
  renderCourtsContainers();
  const statusEl2 = document.getElementById('courtsLoadStatus');
  if(statusEl2){
    const total = myCourtsState.private.length + myCourtsState.public.length;
    const priv = myCourtsState.private.length;
    const pub = myCourtsState.public.length;
    statusEl2.textContent = total > 0
      ? `✅ Found ${total} courts — ${priv} private, ${pub} public`
      : '⚠️ No courts found in this area yet';
  }
}

function toggleMember(id, checked){
  if(checked) myCourtsState.members.add(id);
  else myCourtsState.members.delete(id);
}

async function addCustomCourt(type){
  const inputId = type==='private'?'addPrivateCourtInput':'addPublicCourtInput';
  const detailId = type==='private'?'addPrivateDetail':'addPublicDetail';
  const addrId   = type==='private'?'addPrivateAddr':'addPublicAddr';
  const indoorId = type==='private'?'addPrivateIndoor':'addPublicIndoor';
  const numId    = type==='private'?'addPrivateNumCourts':'addPublicNumCourts';
  const notesId  = type==='private'?'addPrivateNotes':'addPublicNotes';
  const inp=document.getElementById(inputId);
  const name=inp.value.trim();
  if(!name){ showToast('⚠️ Please enter a court name','#f59e0b'); return; }
  // Show detail fields on first click if not yet showing
  const detail=document.getElementById(detailId);
  if(detail && detail.style.display==='none'){
    detail.style.display='block';
    document.getElementById(addrId)?.focus();
    return; // Let user fill in details then click Add again
  }
  const address=(document.getElementById(addrId)?.value||'').trim()||S.city+', '+S.state;
  const is_indoor=document.getElementById(indoorId)?.checked||false;
  const num_courts=parseInt(document.getElementById(numId)?.value)||0;
  const notes=(document.getElementById(notesId)?.value||'').trim();
  const playerEmail=getMyEmail()||document.getElementById('email')?.value||'';
  const newCourt={
    id:'custom_'+Date.now(), name, address,
    is_private:type==='private', is_indoor, num_courts, source:'user'
  };
  // Save to Supabase courts table
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/courts`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({
        name, address, city:S.city||address.split(',')[1]?.trim()||'',
        state:S.state||'', is_private:type==='private',
        is_indoor, num_courts:num_courts||null, notes:notes||null,
        added_by_player:playerEmail
      })
    });
    showToast('✅ Court saved to database — thank you!','#4CAF7D');
  }catch(e){
    console.warn('Could not save court to DB:',e);
    showToast('✅ Court added locally!','#4CAF7D');
  }
  myCourtsState[type].push(newCourt);
  myCourtsState.selected.add(newCourt.id);
  // Reset fields
  inp.value='';
  if(detail) detail.style.display='none';
  ['addrId','numId','notesId'].forEach(fId=>{
    const el=document.getElementById(eval(fId)); if(el) el.value='';
  });
  const cb=document.getElementById(indoorId); if(cb) cb.checked=false;
  renderCourtsContainers();
  const statusEl2 = document.getElementById('courtsLoadStatus');
  if(statusEl2){
    const total = myCourtsState.private.length + myCourtsState.public.length;
    const priv = myCourtsState.private.length;
    const pub = myCourtsState.public.length;
    statusEl2.textContent = total > 0
      ? `✅ Found ${total} courts — ${priv} private, ${pub} public`
      : '⚠️ No courts found in this area yet';
  }
}

async function saveMyCourts(){
  if(myCourtsState.selected.size===0){showToast('⚠️ No courts selected yet.','#f59e0b');return;}
  const playerEmail=getMyEmail()||document.getElementById('email')?.value||'';
  if(!playerEmail){showToast('⚠️ Please sign in first','#f59e0b');return;}

  // First delete all existing saved courts for this player, then re-insert
  // This ensures deselected courts get removed and member status stays accurate
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(playerEmail)}`,{
      method:'DELETE',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}
    });
  }catch(e){}

  const allCourts = [...myCourtsState.private,...myCourtsState.public];
  const promises=[...myCourtsState.selected].map(id=>{
    const court=allCourts.find(c=>(c.id||c.name)===id);
    const courtId=court?.id&&!court.id.startsWith('osm_')&&!court.id.startsWith('custom_')?court.id:null;
    return fetch(`${SUPABASE_URL}/rest/v1/player_courts`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({
        player_email: playerEmail,
        court_id: courtId,
        is_member: myCourtsState.members.has(id),
        court_name: court?.name||id,
        is_private: court?.is_private||false
      })
    });
  });
  try{
    await Promise.all(promises);
    showToast('✅ Your courts saved!','#4CAF7D');
    // Count selected public vs private for accurate nav badge
    const selPub  = [...myCourtsState.selected].filter(id=>myCourtsState.public.find(c=>(c.id||c.name)===id)).length;
    const selPriv = [...myCourtsState.selected].filter(id=>myCourtsState.private.find(c=>(c.id||c.name)===id)).length;
    updateNavCourtBadges(selPub, selPriv);
  }catch(e){
    showToast('⚠️ Could not save courts: '+e.message);
  }
}


// ── Address Autocomplete (Nominatim) ──────────────────
let addrDebounce = null;
async function onAddressInput(val){
  clearTimeout(addrDebounce);
  const box = document.getElementById('addressSuggestions');
  if(val.length < 4){ box.innerHTML=''; box.style.display='none'; return; }
  addrDebounce = setTimeout(async()=>{
    const nominatimUrl=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&countrycodes=us&limit=6`;
    let data = null;
    // Try direct first, then proxy fallback
    const attempts = [
      ()=>fetch(nominatimUrl, {headers:{'Accept-Language':'en','User-Agent':'PickleballRegistry/1.0'}}),
      ()=>fetch('https://corsproxy.io/?'+encodeURIComponent(nominatimUrl)),
    ];
    for(const attempt of attempts){
      try{
        const res = await attempt();
        if(res.ok){ data = await res.json(); break; }
      }catch(e){ continue; }
    }
    if(!data || !data.length){ box.innerHTML=''; box.style.display='none'; return; }
    box.style.display='block';
    box.innerHTML = data.map((r,i)=>`<div class="addr-suggestion" onclick="selectAddress(${i})">${r.display_name}</div>`).join('');
    box._data = data;
  }, 400);
}

function selectAddress(idx){
  const box = document.getElementById('addressSuggestions');
  const r = box._data[idx];
  const a = r.address || {};
  // Fill in fields
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  S.city  = a.city || a.town || a.village || a.hamlet || '';
  const rawSt = a.state || '';
  S.state = Object.values(STATE_INFO).find(([ab,n])=>n&&n.toLowerCase()===rawSt.toLowerCase())?.[0] || rawSt;
  const cityEl=document.getElementById('addrCity'); if(cityEl) cityEl.value=S.city;
  const stateEl=document.getElementById('addrState'); if(stateEl) stateEl.value=S.state;
  const zipEl=document.getElementById('addrZip'); if(zipEl) zipEl.value=a.postcode||'';
  S.county = (a.county||'').replace(' County','');
  S.addrLat = parseFloat(r.lat);
  S.addrLon = parseFloat(r.lon);
  box.innerHTML=''; box.style.display='none';
  chk1();
}

// ── Personal Rating Slider ─────────────────────────────
function updatePersonalRating(idx){
  const i=parseInt(idx);
  const pct=(i/21*100).toFixed(1)+'%';
  document.getElementById('personalRatingSlider').style.setProperty('--pct',pct);
  if(!i){
    S.skill=null; S.duprVal=null;
    document.getElementById('personalRatingDisplay').innerHTML='-- <span>not set — slide to choose</span>';
  } else {
    S.skill=DUPR_VALS[i];
    S.duprVal=S.skill;
    document.getElementById('personalRatingDisplay').innerHTML=S.skill+' <span>Personal Rating</span>';
  }
  // If goal rating is showing, push it up to match and refresh red bar
  const grf=document.getElementById('goalRatingField');
  if(grf && grf.style.display!=='none'){
    const goalSlider=document.getElementById('goalRatingSlider');
    if(goalSlider){
      goalSlider.min=0; // keep min=0 for correct thumb rendering
      if(parseInt(goalSlider.value)<i){
        goalSlider.value=i;
        updateGoalRating(i);
      } else {
        updateGoalRedBar(i, parseInt(goalSlider.value));
      }
      buildGoalTicks(i);
    }
  }
  chk2();
}

// ── My Courts radius ───────────────────────────────────
function updateCourtsRadius(val){
  const miles=parseInt(val);
  const pct=((miles-5)/(50-5)*100).toFixed(1)+'%';
  document.getElementById('courtsPageDriveSlider').style.setProperty('--pct',pct);
  document.getElementById('courtsRadiusDisplay').textContent=miles>=50?'50+ miles':miles+' miles';
  S.driveDistance=(miles>=50?'50+':miles)+' miles';
}


// Override post-registration button
function afterRegistration(){
  document.getElementById('confirmOverlay').style.display='none';
  showPage('myCourts');
  // Pre-set courts radius from profile drive distance
  const miles=parseInt(S.driveDistance)||25;
  const sl=document.getElementById('courtsPageDriveSlider');
  if(sl){ sl.value=Math.min(miles,50); updateCourtsRadius(sl.value); }
  loadMyCourts();
}

// ── Photo drag & drop ─────────────────────────────────
document.addEventListener('DOMContentLoaded', ()=>{
  // Pre-select defaults for new users (no session yet)
  if(!SESSION_PLAYER){
    [{id:'venuePrefChips',key:'venuePref'},{id:'playFormatChips',key:'playFormat'},
     {id:'matchGenderPrefChips',key:'matchGenderPref'},{id:'playStyleChips',key:'playStyle'}]
    .forEach(({id,key})=>{
      const chips=document.querySelectorAll('#'+id+' .chip');
      chips.forEach(c=>c.classList.add('on'));
      chips.forEach(c=>{ if(c.textContent.trim()==='Both'){
        c.style.background='#991b1b'; c.style.color='#fff'; c.style.borderColor='#7f1d1d';
      }});
      S[key]='Both';
    });
  }
});

document.addEventListener('DOMContentLoaded', ()=>{
  const area = document.getElementById('photoUploadArea');
  if(!area) return;
  area.addEventListener('dragover', e=>{ e.preventDefault(); area.style.borderColor='var(--green)'; area.style.background='rgba(76,175,125,0.1)'; });
  area.addEventListener('dragleave', ()=>{ area.style.borderColor=''; area.style.background=''; });
  area.addEventListener('drop', e=>{
    e.preventDefault();
    area.style.borderColor=''; area.style.background='';
    const f = e.dataTransfer.files[0];
    if(f && f.type.startsWith('image/')){
      const fakeEvent = {target:{files:[f]}};
      handlePhoto(fakeEvent);
    }
  });
});

// ── Zip-code live geocode ──────────────────────────────
function onManualAddress(){ chk1(); } // kept for any legacy calls
function onZipChange(val){
  chk1();
  const zip = (val||'').trim();
  if(zip.length < 5) return;
  const statusEl = document.getElementById('zipGeoStatus');
  if(statusEl) statusEl.textContent = '🔍 Looking up…';
  fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1&addressdetails=1`,
    {headers:{'Accept-Language':'en','User-Agent':'PBallConnect/1.0'}})
  .then(r=>r.ok?r.json():[])
  .then(data=>{
    if(!data.length){ if(statusEl) statusEl.textContent='⚠️ Zip not found'; return; }
    const addr = data[0].address || {};
    S.city    = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
    const rawState = addr.state || '';
    S.state   = Object.values(STATE_INFO).find(([a,n])=>n&&n.toLowerCase()===rawState.toLowerCase())?.[0] || rawState;
    S.addrLat = parseFloat(data[0].lat);
    S.addrLon = parseFloat(data[0].lon);
    const cityEl = document.getElementById('addrCity');
    const stateEl = document.getElementById('addrState');
    if(cityEl) cityEl.value = S.city;
    if(stateEl) stateEl.value = S.state;
    if(statusEl) statusEl.textContent = S.city ? `📍 ${S.city}, ${S.state}` : '';
  })
  .catch(()=>{ if(statusEl) statusEl.textContent='⚠️ Location lookup failed'; });
}

// ── Lesson questions ───────────────────────────────────────────
function toggleLessonOffer(answer){
  const offerSection=document.getElementById('lessonOfferSection');
  const msgDiv=document.getElementById('lessonMessage');
  if(!offerSection) return;
  if(answer.trim()==='No'){
    // Never had a lesson + wants to improve → offer lesson
    offerSection.style.display='block';
    if(msgDiv) msgDiv.style.display='none';
  } else {
    // Has had lessons — no need to offer
    offerSection.style.display='none';
    if(msgDiv) msgDiv.style.display='none';
    S.wantsLesson='N/A — already had lessons';
  }
}

function onLessonOfferAnswer(answer){
  const msgDiv=document.getElementById('lessonMessage');
  if(!msgDiv) return;
  if(answer.trim()==='Yes'){
    S.wantsLesson='Yes';
    unlockLessonsNav();
    msgDiv.style.display='block';
    msgDiv.innerHTML=`
      <div style="background:rgba(76,175,125,0.1);border:1px solid rgba(76,175,125,0.3);border-radius:14px;padding:16px;margin-top:8px;">
        <div style="color:var(--green);font-size:13px;font-weight:700;margin-bottom:6px;">🎾 Great — we'll set that up!</div>
        <div style="color:#111;font-size:12px;line-height:1.7;">
          After completing registration, click <strong style="color:#111;">Get Lessons</strong> in the left menu
          to browse certified instructors near you and book within 30 days.
        </div>
      </div>`;
  } else {
    S.wantsLesson='No — check back in 3 months';
    dimLessonsNav();
    msgDiv.style.display='block';
    msgDiv.innerHTML=`
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:14px;padding:16px;margin-top:8px;">
        <div style="color:#fff;font-size:13px;font-weight:600;margin-bottom:4px;">👍 No problem!</div>
        <div style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.7;">
          We'll check back with you in 3 months to see how your game is progressing.
          You can always book a lesson anytime from the <strong style="color:#fff;">Get Lessons</strong> menu.
        </div>
      </div>`;
  }
}

// ══════════════════════════════════════════════════
// SET UP A MATCH// ══════════════════════════════════════════════════════
// SET UP A MATCH
// ══════════════════════════════════════════════════════

const MS = {
  format:             'doubles',
  numCourts:          1,
  selectedCourts:     new Map(),
  group:              null,
  extraGroups:        new Set(),
  selectedGroups:     new Set(['all']),
  specificPlayers:    new Set(),
  primaryPlayers:     new Set(),
  subPlayers:         new Set(),
  genderPref:         'either',
  isFeeler:           false,
  date:               null,
  timeStart:          null,
  timeEnd:            null,
  duration:           2.0,
  location:           'my_courts',
  courtId:            null,
  courtName:          null,
  courtAddress:       null,
  isPrivate:          false,
  note:               '',
  hasOverlapConflict: false,
  courtType:          'public',  // 'public' | 'private'
  inviteMode:         'all',     // 'all' | 'specific' | 'group'
};

// Total court slots for this match (all courts combined)
function matchTotalSlots(){ return (MS.numCourts||1)*(MS.format==='doubles'?4:2); }
// Players needed besides the organizer (organizer always plays)
function matchMaxNeeded(){ return matchTotalSlots()-1; }

// ── Step navigation (no-op stub — single-scroll redesign) ──────
function matchGoTo(step){ /* single-scroll page — no step navigation */ }

// ── Format selection ───────────────────────────────────
function selectMatchFormat(fmt, el){
  MS.format = fmt;
  const dbl = document.getElementById('smFmtDoubles');
  const sgl = document.getElementById('smFmtSingles');
  if(dbl){ dbl.style.border='1px solid #e5e7eb'; dbl.style.background='#fff'; }
  if(sgl){ sgl.style.border='1px solid #e5e7eb'; sgl.style.background='#fff'; }
  if(el){ el.style.border='2px solid #1a7a3a'; el.style.background='#f0fdf4'; }
  if(MS.inviteMode==='specific') buildSpecificPicker();
  smUpdateNeededBox();
  renderCourtCapacityWarning();
  smUpdateNeededGrid();
  smUpdateSummary();
  smUpdateProgress(2);
  // Rebuild invite grid so minimum-needed counter stays in sync
  const _igs = document.getElementById('smInviteGridSection');
  if(_igs && _igs.innerHTML && MS.genderPref !== 'group') buildSmInviteGrid();
}

// ── Match type preference (Profile) ───────────────────
function onMatchGenderPrefChange(val){
  S.matchGenderPref = val;
  const warn = document.getElementById('matchGenderPrefWarning');
  const warnType = document.getElementById('matchGenderPrefWarnType');
  if(!warn) return;
  if(val === 'Both'){
    warn.style.display = 'none';
  } else {
    if(warnType) warnType.textContent = val;
    warn.style.display = 'block';
  }
}

// ── Group mode exit (State 2 → State 1) ──────────────
function _smExitGroupMode(){
  // Restore all 4 Play Structure buttons to default (none highlighted)
  ['smGenderEither','smGenderMixed','smGenderSame','smGenderGroup'].forEach(id=>{
    const d=document.getElementById(id);
    if(!d) return;
    d.style.border='1px solid #e5e7eb'; d.style.background='#fff';
    d.classList.remove('sm-option-dimmed');
  });
  // Hide and clear the group picker
  const wrap=document.getElementById('smGenderGroupWrap');
  if(wrap){ wrap.style.display='none'; wrap.innerHTML=''; }
  // Reset group-related MS state
  MS.genderPref='either';
  MS.group=null; MS.selectedGroups=new Set(['all']); MS.inviteMode='all';
  MS.selectedGroupId=null; window._smGroupGridSelectedId=null; MS.allGroupsRoster=null;
  MS.namedGroupMemberEmails=new Set(); MS.namedGroupSubEmails=new Set();
  MS.namedGroupRoster={primary:[],subs:[]};
  // Restore Step 4 to interactive state
  smUnlockStep4();
  const igs=document.getElementById('smInviteGridSection');
  if(igs) igs.innerHTML='';
  // Unlock Steps 2 & 3
  smUnlockSteps2And3();
  smUpdateNeededGrid(); smUpdateSummary(); smUpdateSendBtn(); smUpdateProgress(1);
}

// ── Gender preference (Set Up A Match Container 3) ────
function selectMatchGender(pref, el){
  // Toggle behavior for "One of My Set Groups":
  // — State 2 (group mode shown, no specific group chosen) → tap again → State 1
  // — State 3 (specific group already locked in) → tap does nothing
  if(pref === 'group'){
    const wrap = document.getElementById('smGenderGroupWrap');
    const groupModeOpen = wrap && wrap.style.display !== 'none';
    if(groupModeOpen && !MS.selectedGroupId){ _smExitGroupMode(); return; }
    if(MS.selectedGroupId) return; // State 3: ignore taps on header
  }

  MS.genderPref = pref === 'group' ? 'either' : pref; // group uses 'either' for slot math
  ['smGenderEither','smGenderMixed','smGenderSame','smGenderGroup'].forEach(id=>{
    const d = document.getElementById(id);
    if(d){ d.style.border='1px solid #e5e7eb'; d.style.background='#fff'; }
  });
  if(el){ el.style.border='2px solid #1a7a3a'; el.style.background='#f0fdf4'; }

  // CHANGE 1: dim Open/Mixed/Same when Set Group selected; restore when switching away
  if(pref === 'group'){
    ['smGenderEither','smGenderMixed','smGenderSame'].forEach(id=>{
      const d=document.getElementById(id);
      if(d) d.classList.add('sm-option-dimmed');
    });
  } else {
    ['smGenderEither','smGenderMixed','smGenderSame'].forEach(id=>{
      const d=document.getElementById(id);
      if(d) d.classList.remove('sm-option-dimmed');
    });
    // Switching away from Set Group: unlock steps 2 & 3 and clear group state
    smUnlockSteps2And3();
    // Clear named group selection and reset Step 6 to normal invite-mode cards
    if(MS.group && MS.group.startsWith('named_')){
      MS.group=null; MS.selectedGroups=new Set(['all']); MS.inviteMode='all';
      MS.namedGroupMemberEmails=new Set(); MS.namedGroupSubEmails=new Set();
      MS.namedGroupRoster={primary:[],subs:[]}; MS.selectedGroupId=null; window._smGroupGridSelectedId=null;
      const display=document.getElementById('smGroupRosterDisplay');
      if(display){ display.style.display='none'; display.innerHTML=''; }
      ['smInviteSpecific','smInviteGroup'].forEach(id=>{
        const d=document.getElementById(id); if(d) d.style.display='';
      });
      ['smInviteSpecific','smInviteGroup'].forEach(id=>{
        const d=document.getElementById(id);
        if(d){ d.style.border='1px solid #e5e7eb'; d.style.background='#fff'; }
      });
    }
  }

  // Show/hide group picker
  const wrap = document.getElementById('smGenderGroupWrap');
  if(pref === 'group'){
    if(wrap){
      wrap.style.display = 'block';
      smRenderStep3GroupPicker(wrap);
    }
    // Set Group path: clear Step 4 grid — locked banner shown after a specific group is chosen
    smUnlockStep4();
    const _igs = document.getElementById('smInviteGridSection');
    if(_igs) _igs.innerHTML='';
  } else {
    if(wrap) wrap.style.display = 'none';
    // Non-Set-Group path: ensure Step 4 is in interactive (unlocked) state and build invite grid
    smUnlockStep4();
    // Clear previous selections — filter may have changed (e.g. Open→Same Gender)
    MS.specificPlayers = new Set();
    buildSmInviteGrid();
  }

  // Re-render specific picker if open
  if(MS.inviteMode==='specific') buildSpecificPicker();
  smUpdateNeededGrid();
  smUpdateSummary();
  smUpdateProgress(1); // Play Structure is now Step 1
}

async function smRenderStep3GroupPicker(wrap){
  // Fetch groups if not yet loaded
  if(!_groups || !_groups.length){
    const myEmail = getMyEmail();
    if(myEmail){
      try{
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/player_groups?organizer_email=eq.${encodeURIComponent(myEmail)}&order=created_at.asc`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        if(res.ok) _groups = await res.json();
      }catch(e){}
    }
  }

  if(!_groups || !_groups.length){
    wrap.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:#fef3c7;border:1px solid #fbbf24;font-size:13px;color:#92400e;line-height:1.5;">' +
      '⚠️ You don\'t have any saved groups yet. ' +
      '<span onclick="showPage(\'myGroups\')" style="color:#1a7a3a;font-weight:700;cursor:pointer;text-decoration:underline;">Go to My Groups to set one up.</span>' +
      '</div>';
    return;
  }

  // Show loading state while fetching all rosters
  wrap.innerHTML = '<div style="padding:10px;color:#6b7280;font-size:13px;">Loading rosters…</div>';

  // CHANGE 1: Batch-fetch all group member rows in one request
  const myEmail = (SESSION_PLAYER?.email || getMyEmail() || '').toLowerCase();
  const allGroupIds = _groups.map(g => g.id);
  let allMemberRows = [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/player_group_members?group_id=in.(${allGroupIds.map(encodeURIComponent).join(',')})&select=group_id,player_email,role`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(res.ok) allMemberRows = await res.json();
  } catch(e) {}

  // Collect unique member emails (excluding organizer) for a single profile fetch
  const uniqueEmails = [...new Set(
    allMemberRows.map(r=>(r.player_email||'').toLowerCase()).filter(e=>e && e!==myEmail)
  )];
  let profileMap = {};
  if(uniqueEmails.length){
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${uniqueEmails.map(encodeURIComponent).join(',')})&select=email,first_name,last_name`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      const profiles = res.ok ? await res.json() : [];
      profiles.forEach(p => {
        profileMap[(p.email||'').toLowerCase()] = ((p.first_name||'')+' '+(p.last_name||'')).trim() || p.email;
      });
    } catch(e) {}
  }

  // Build MS.allGroupsRoster keyed by group_id string
  MS.allGroupsRoster = {};
  _groups.forEach(g => {
    const gId = String(g.id);
    const rows = allMemberRows.filter(r => String(r.group_id) === gId);
    const primaries = [], subs = [];
    rows.forEach(r => {
      const e = (r.player_email||'').toLowerCase();
      if(!e || e === myEmail) return;
      const name = profileMap[e] || e;
      if((r.role||'').toLowerCase() === 'sub') subs.push({email:e,name});
      else primaries.push({email:e,name});
    });
    const fmt = g.match_type === 'singles' ? 'singles' : 'doubles';
    const primaryCount = primaries.length + 1; // +1 for organizer
    const courts = Math.min(4, Math.max(1, Math.ceil(primaryCount / (fmt==='singles' ? 2 : 4))));
    MS.allGroupsRoster[gId] = {group:g, primaries, subs, fmt, courts, primaryCount};
  });

  // CHANGE 5: Auto-select if organizer has exactly one group
  if(_groups.length === 1){
    wrap.innerHTML = '';
    window._smSelectGroupFromGrid(String(_groups[0].id));
    return;
  }

  // CHANGE 2: Render selection grid
  _smRenderGroupGrid(wrap);
}

// Render the group selection grid table into wrap
function _smRenderGroupGrid(wrap){
  if(!MS.allGroupsRoster) return;
  const selectedId = MS.selectedGroupId ? String(MS.selectedGroupId) : '';
  const myName = SESSION_PLAYER ? (((SESSION_PLAYER.first_name||'')+' '+(SESSION_PLAYER.last_name||'')).trim() || 'You') : 'You';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">';
  html += '<thead><tr style="background:#f9fafb;">';
  html += '<th style="text-align:left;padding:7px 10px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Group</th>';
  html += '<th style="text-align:center;padding:7px 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Format</th>';
  html += '<th style="text-align:center;padding:7px 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Courts</th>';
  html += '<th style="text-align:center;padding:7px 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Players</th>';
  html += '<th style="text-align:center;padding:7px 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Subs</th>';
  html += '</tr></thead><tbody>';

  Object.entries(MS.allGroupsRoster).forEach(([gId, data], idx) => {
    const isSel = gId === selectedId;
    const isLast = idx === Object.keys(MS.allGroupsRoster).length - 1;
    const rowBorder = isLast ? 'none' : '1px solid #f3f4f6';
    const leftAccent = isSel ? '3px solid #1a7a3a' : '3px solid transparent';
    const rowBg = isSel ? '#f0fdf4' : '#fff';
    const fmtLabel = data.fmt === 'singles' ? 'Singles' : 'Doubles';

    // Build tooltip name lists: organizer is ★ at top
    const primaryTooltipNames = JSON.stringify(['★ '+myName+' (you)', ...data.primaries.map(p=>p.name)]);
    const subTooltipNames = JSON.stringify(data.subs.map(p=>p.name));

    html += `<tr id="smGroupRow_${gId}" onclick="window._smSelectGroupFromGrid('${gId}')" `+
      `style="cursor:pointer;background:${rowBg};transition:background .12s;" `+
      `onmouseover="if('${gId}'!==String(window._smGroupGridSelectedId||''))this.style.background='#f9fafb';" `+
      `onmouseout="if('${gId}'!==String(window._smGroupGridSelectedId||''))this.style.background='#fff';">`;

    html += `<td style="padding:10px 10px;border-bottom:${rowBorder};border-left:${leftAccent};font-weight:700;color:${isSel?'#1a7a3a':'#111'};white-space:nowrap;">${data.group.name}</td>`;
    html += `<td style="padding:10px 8px;border-bottom:${rowBorder};text-align:center;color:#374151;">${fmtLabel}</td>`;
    html += `<td style="padding:10px 8px;border-bottom:${rowBorder};text-align:center;color:#374151;">${data.courts}</td>`;

    // Primaries cell — hoverable count with tooltip
    html += `<td style="padding:10px 8px;border-bottom:${rowBorder};text-align:center;position:relative;" `+
      `onmouseenter="window._smShowGroupTooltip(this,${primaryTooltipNames})" `+
      `onmouseleave="window._smHideGroupTooltip()" `+
      `ontouchstart="event.stopPropagation();window._smToggleGroupTooltip(this,${primaryTooltipNames})">` +
      `<span style="color:#1a7a3a;font-weight:700;text-decoration:underline dotted;cursor:help;">${data.primaryCount}</span></td>`;

    // Subs cell
    if(data.subs.length){
      html += `<td style="padding:10px 8px;border-bottom:${rowBorder};text-align:center;position:relative;" `+
        `onmouseenter="window._smShowGroupTooltip(this,${subTooltipNames})" `+
        `onmouseleave="window._smHideGroupTooltip()" `+
        `ontouchstart="event.stopPropagation();window._smToggleGroupTooltip(this,${subTooltipNames})">` +
        `<span style="color:#6b7280;font-weight:600;text-decoration:underline dotted;cursor:help;">${data.subs.length}</span></td>`;
    } else {
      html += `<td style="padding:10px 8px;border-bottom:${rowBorder};text-align:center;color:#d1d5db;">—</td>`;
    }

    html += '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
  window._smGroupGridSelectedId = selectedId || null;
}

// Select a group from the grid (no extra DB fetch — uses MS.allGroupsRoster cache)
window._smSelectGroupFromGrid = function(gId){
  if(!MS.allGroupsRoster || !MS.allGroupsRoster[gId]) return;

  // Toggle deselect if already selected
  if(MS.selectedGroupId === gId){
    MS.selectedGroupId = null;
    window._smGroupGridSelectedId = null;
    MS.selectedGroups = new Set(['all']); MS.group = null; MS.inviteMode = 'all';
    MS.namedGroupMemberEmails = new Set(); MS.namedGroupSubEmails = new Set();
    MS.namedGroupRoster = {primary:[],subs:[]};
    smUnlockSteps2And3();
    const display = document.getElementById('smGroupRosterDisplay');
    if(display){ display.style.display='none'; display.innerHTML=''; }
    ['smInviteSpecific','smInviteGroup'].forEach(id=>{
      const d=document.getElementById(id); if(d) d.style.display='';
    });
    const wrap=document.getElementById('smGenderGroupWrap'); if(wrap) _smRenderGroupGrid(wrap);
    // Restore Step 4 to interactive (unlocked) state
    smUnlockStep4();
    smUpdateNeededGrid(); smUpdateSummary(); smUpdateSendBtn(); smUpdateProgress(1);
    return;
  }

  MS.selectedGroupId = gId;
  window._smGroupGridSelectedId = gId;
  const data = MS.allGroupsRoster[gId];

  // Populate MS from cache — no additional fetch needed
  MS.selectedGroups = new Set(['named_'+gId]);
  MS.group = 'named_'+gId;
  MS.namedGroupMemberEmails = new Set(data.primaries.map(p=>p.email));
  MS.namedGroupSubEmails = new Set(data.subs.map(p=>p.email));
  MS.namedGroupRoster = {primary: data.primaries.slice(), subs: data.subs.slice()};

  // Re-render grid to reflect selection highlight
  const wrap = document.getElementById('smGenderGroupWrap');
  if(wrap) _smRenderGroupGrid(wrap);

  // Mirror to Step 6 group dropdown
  const sel6 = document.getElementById('smGroupSelect');
  if(sel6 && _groups && _groups.length && sel6.options.length <= 1){
    sel6.innerHTML = '<option value="">Select a group…</option>'+
      _groups.map(g=>'<option value="'+g.id+'">'+g.name+(g.max_players?' ('+g.max_players+' players)':'')+' </option>').join('');
  }
  if(sel6) sel6.value = gId;

  // Switch Step 6 to group mode (read-only roster).
  // Pass skipProgress=true — step 6 is auto-complete for the Set Group path,
  // but we don't mark it yet because steps 4 (Date/Time) and 5 (Court) are still pending.
  smSelectInvite('group', true);

  // Apply format + courts from cached data
  MS.format = data.fmt;
  const fmtDbl = document.getElementById('smFmtDoubles');
  const fmtSgl = document.getElementById('smFmtSingles');
  if(fmtDbl){ fmtDbl.style.border='1px solid #e5e7eb'; fmtDbl.style.background='#fff'; }
  if(fmtSgl){ fmtSgl.style.border='1px solid #e5e7eb'; fmtSgl.style.background='#fff'; }
  const activeBtn = data.fmt === 'singles' ? fmtSgl : fmtDbl;
  if(activeBtn){ activeBtn.style.border='2px solid #1a7a3a'; activeBtn.style.background='#f0fdf4'; }
  selectNumCourts(data.courts);
  smLockSteps2And3(data.fmt, data.courts);

  smUpdateNeededGrid(); smUpdateSummary(); smUpdateSendBtn();
  // Steps 1-4 are complete (Play Structure + auto-format + auto-courts + invite known from group).
  // Show Step 4 as a collapsed read-only banner — no gap in the scroll layout.
  const _rosterCount = (MS.namedGroupRoster.primary.length + MS.namedGroupRoster.subs.length);
  smLockStep4(_rosterCount);
  // Advance progress to step 5 (Date & Time) as the next action for the organizer.
  smUpdateProgress(5);

  // CHANGE 3 / CHANGE 4: Show roster confirmation modal
  smShowGroupRosterModal(gId);
};

// CHANGE 3: Tooltip helpers for group grid
window._smShowGroupTooltip = function(cell, names){
  window._smHideGroupTooltip();
  const tt = document.createElement('div');
  tt.id = '_smGroupTooltip';
  tt.style.cssText = 'position:fixed;z-index:9999;background:#1f2937;color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.7;max-width:220px;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  tt.innerHTML = names.map(n=>'<div>'+n+'</div>').join('');
  document.body.appendChild(tt);
  const rect = cell.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left;
  if(left + 220 > window.innerWidth) left = Math.max(4, window.innerWidth - 226);
  tt.style.top = top + 'px';
  tt.style.left = left + 'px';
};

window._smHideGroupTooltip = function(){
  const tt = document.getElementById('_smGroupTooltip'); if(tt) tt.remove();
};

window._smToggleGroupTooltip = function(cell, names){
  const existing = document.getElementById('_smGroupTooltip');
  if(existing){ existing.remove(); return; }
  window._smShowGroupTooltip(cell, names);
};

// ── Multi-court selector ──────────────────────────────
function selectNumCourts(n){
  MS.numCourts = n;
  [1,2,3,4].forEach(i=>{
    const btn = document.getElementById('smCourtsBtn'+i);
    if(!btn) return;
    if(i===n){
      btn.style.background='#1a7a3a'; btn.style.color='#fff'; btn.style.borderColor='#1a7a3a';
    } else {
      btn.style.background='#f3f4f6'; btn.style.color='#374151'; btn.style.borderColor='#d1d5db';
    }
  });
  smUpdateNeededBox();
  renderCourtCapacityWarning();
  smUpdateNeededGrid();
  smUpdateSummary();
  if(!_smInitializing) smUpdateProgress(3);
  // Rebuild invite grid so minimum-needed counter stays in sync
  const _igs2 = document.getElementById('smInviteGridSection');
  if(_igs2 && _igs2.innerHTML && MS.genderPref !== 'group') buildSmInviteGrid();
}

function toggleOrganizerPlaying(checked){
  if(checked){
    MS.organizerPlaying = true;
    updateMatchPlayerCount();
  } else {
    // Show confirmation before removing organizer from slot count
    const existing = document.getElementById('orgPlayingConfirmOverlay');
    if(existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'orgPlayingConfirmOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
        '<div style="font-size:16px;font-weight:800;color:#111;margin-bottom:10px;">Not playing?</div>'+
        '<div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px;">Are you sure you will <strong>NOT</strong> be playing in this match?</div>'+
        '<div style="display:flex;gap:10px;">'+
          '<button onclick="document.getElementById(\'orgPlayingConfirmOverlay\').remove();MS.organizerPlaying=false;updateMatchPlayerCount();" '+
            'style="flex:1;padding:13px;border-radius:10px;border:none;background:#1a7a3a;color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">'+
            'Yes, I\'m just organizing'+
          '</button>'+
          '<button onclick="document.getElementById(\'orgPlayingConfirmOverlay\').remove();const cb=document.getElementById(\'matchOrganizerPlaying\');if(cb)cb.checked=true;" '+
            'style="flex:1;padding:13px;border-radius:10px;border:2px solid #d1d5db;background:#fff;color:#374151;font-weight:700;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">'+
            'No, I\'ll be playing'+
          '</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);
  }
}

function updateMatchPlayerCount(){ smUpdateNeededBox(); }

function renderCourtCapacityWarning(){
  const el = document.getElementById('matchCourtCapacityWarn');
  if(!el) return;
  if(MS.selectedCourts.size===0||MS.location==='tbd'){ el.style.display='none'; el.style.animation=''; return; }
  let courtName='', courtNumCourts=null;
  MS.selectedCourts.forEach(court=>{ courtName=court.name; courtNumCourts=court.numCourts??null; });
  const n = MS.numCourts||1;
  const base = 'display:block;margin-top:10px;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:600;line-height:1.5;';
  if(courtNumCourts===null||courtNumCourts===undefined||courtNumCourts===0){
    el.style.cssText = base+'border:1.5px solid #d1d5db;background:#f3f4f6;color:#6b7280;';
    el.style.animation = '';
    el.textContent='Court count not on file — verify availability';
  } else if(n > courtNumCourts){
    el.style.cssText = base+'border:1.5px solid #f87171;background:#fff1f2;color:#dc2626;';
    el.style.animation='pb-card-pulse 1.4s ease-in-out infinite';
    el.textContent='🚫 '+courtName+' only has '+courtNumCourts+' court'+(courtNumCourts!==1?'s':'')+'. Your match requires '+n+' — players will be waiting or this venue may not be suitable.';
  } else if(n===courtNumCourts){
    el.style.cssText = base+'border:1.5px solid #d97706;background:#fef9c3;color:#b45309;';
    el.style.animation='pb-card-pulse 1.4s ease-in-out infinite';
    el.textContent='⚠️ Please be aware that '+courtName+' only has '+courtNumCourts+' court'+(courtNumCourts!==1?'s':'')+'. You\'re using all of them — confirm availability.';
  } else {
    el.style.display='none'; el.style.animation='';
  }
}

// ── Gender filter helper ──────────────────────────────
// Returns true if the player should be included given the match gender preference.
// myGender = organizer's gender string (e.g. 'Male', 'Female').
function playerPassesGenderFilter(player, genderPref, myGender){
  if(!genderPref || genderPref==='either') return true;
  const pg = (player.gender||'').toLowerCase();
  const mg = (myGender||'').toLowerCase();
  if(!mg) return true; // can't filter without knowing organizer gender
  if(genderPref==='same') return pg === mg;
  if(genderPref==='mixed') return true; // mixed = all genders invited; slot breakdown handles the math
  return true;
}

// Show/hide the Step 4 gender filter info banner and update counts.
function refreshGenderFilterBanner(){
  const banner = document.getElementById('matchGenderFilterBanner');
  if(!banner) return;
  const pref = MS.genderPref || 'either';
  if(pref === 'either'){
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'block';
  const formatLabel = pref==='same' ? 'Same Gender' : pref==='mixed' ? 'Mixed' : 'Open';
  banner.innerHTML = `🔵 Match Format: <strong>${formatLabel}</strong>`;
}

// ── Group + Subs picker ───────────────────────────────
function buildGroupSubPicker(){
  const list = document.getElementById('gsPickerList');
  const empty = document.getElementById('gsPickerEmpty');
  if(!list) return;
  const members = IC_MEMBERS.map(x=>x.player);
  if(!members.length){
    list.innerHTML='';
    if(empty) empty.style.display='block';
    return;
  }
  if(empty) empty.style.display='none';
  const myGenderGS = S.gender || SESSION_PLAYER?.gender || '';
  const genderActiveGS = MS.genderPref && MS.genderPref !== 'either';
  list.innerHTML = members.map(p=>{
    const email = (p.email||'').toLowerCase();
    const name = ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()||email;
    const emoji = p.avatar_emoji||'🧑';
    const isPrimary = MS.primaryPlayers.has(email);
    const isSub = MS.subPlayers.has(email);
    const passesGender = playerPassesGenderFilter(p, MS.genderPref, myGenderGS);
    const genderBlocked = genderActiveGS && !passesGender;
    let bg='#f3f4f6', border='transparent', badge='';
    if(isPrimary){ bg='#dcfce7'; border='#1a7a3a'; badge='<span style="font-size:9px;background:#1a7a3a;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;">Primary</span>'; }
    else if(isSub){ bg='#fef9c3'; border='#d97706'; badge='<span style="font-size:9px;background:#d97706;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;">Sub</span>'; }
    if(genderBlocked){ badge += '<span style="font-size:9px;color:#d97706;margin-left:4px;">⚧</span>'; }
    const clickAttr = genderBlocked ? '' : 'onclick="toggleGroupSubPlayer(\''+email+'\')"';
    return '<div '+clickAttr+' style="'+(genderBlocked?'opacity:0.4;cursor:not-allowed;':'cursor:pointer;')+'display:flex;align-items:center;gap:8px;padding:8px 10px;background:'+bg+';border:1.5px solid '+border+';border-radius:10px;">'+
      '<span style="font-size:18px;">'+emoji+'</span>'+
      '<div style="flex:1;min-width:0;">'+
        '<div style="font-size:12px;font-weight:700;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+name+badge+'</div>'+
        (p.skill_level?'<div style="font-size:10px;color:#555;">'+p.skill_level+'</div>':'')+
      '</div>'+
    '</div>';
  }).join('');
  renderGroupSubCounts();
}

function renderGroupSubCounts(){
  const primaryCountEl = document.getElementById('gsPickerPrimaryCount');
  const subCountEl = document.getElementById('gsPickerSubCount');
  const primaryMax = matchMaxNeeded();
  const maxEl = document.getElementById('gsPickerPrimaryMax');
  if(primaryCountEl) primaryCountEl.textContent = MS.primaryPlayers.size;
  if(subCountEl) subCountEl.textContent = MS.subPlayers.size;
  if(maxEl) maxEl.textContent = primaryMax;
}

function toggleGroupSubPlayer(email){
  const primaryMax = matchMaxNeeded();
  if(MS.primaryPlayers.has(email)){
    // Primary → Sub
    MS.primaryPlayers.delete(email);
    MS.subPlayers.add(email);
  } else if(MS.subPlayers.has(email)){
    // Sub → removed
    MS.subPlayers.delete(email);
  } else {
    // Not selected → Primary (if room), else Sub
    if(MS.primaryPlayers.size < primaryMax){
      MS.primaryPlayers.add(email);
    } else {
      MS.subPlayers.add(email);
    }
  }
  buildGroupSubPicker();
  checkMatchStep4();
}

// ── Duration +/- ───────────────────────────────────────

// ── Time selects with 15-min increments ───────────────
function buildMatchTimeChips(){
  // Build time dropdowns (no chips)
  buildTimeSelect('matchTimeStart', '06:00', '23:45');
  buildTimeSelect('matchTimeEnd',   '06:00', '24:00');
}

function buildTimeSelect(selectId, startHH, endHH){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const current = sel.value;
  while(sel.options.length > 1) sel.remove(1);
  const [sh] = startHH.split(':').map(Number);
  const [eh] = endHH.split(':').map(Number);
  // Build from startHH to endHH in 15-min increments
  let totalStart = sh * 60;
  let totalEnd   = eh * 60; // midnight = 24*60 = 1440
  for(let mins = totalStart; mins <= totalEnd; mins += 15){
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const val = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    const opt = document.createElement('option');
    opt.value = val;
    // Special case for midnight
    opt.textContent = h === 24 ? 'Midnight' : fmt12(val);
    opt.style.cssText='background:#ffffff;color:#111;';
    sel.appendChild(opt);
  }
  if(current) sel.value = current;
}

function onMatchStartTimeChange(startVal){
  MS.timeStart = startVal;
  if(startVal) smUpdateProgress(5); // Date & Time is now Step 5
  if(!startVal) return;
  // Auto-set end time = start + duration
  const [h,m] = startVal.split(':').map(Number);
  const totalMins = h*60 + m + Math.round(MS.duration * 60);
  const endH = Math.floor(totalMins/60) % 24;
  const endM = totalMins % 60;
  const endVal = String(endH).padStart(2,'0')+':'+String(endM).padStart(2,'0');
  const endSel = document.getElementById('matchTimeEnd');
  if(endSel) endSel.value = endVal;
  MS.timeEnd = endVal;
  // Update read-only display
  const endDisp = document.getElementById('smEndTimeDisplay');
  if(endDisp) endDisp.textContent = fmt12(endVal);
}

function validateMatchTimes(){
  const startSel = document.getElementById('matchTimeStart');
  const endSel   = document.getElementById('matchTimeEnd');
  const warnEl   = document.getElementById('matchTimeWarning');
  if(!startSel||!endSel) return true;
  const s = startSel.value, e = endSel.value;
  const invalid = s && e && e <= s;
  if(warnEl) warnEl.style.display = invalid ? 'block' : 'none';
  if(endSel) endSel.style.borderColor = invalid ? '#f87171' : '';
  return !invalid;
}

function adjustDuration(delta){
  MS.duration = Math.min(4, Math.max(0.5, parseFloat((MS.duration + delta).toFixed(2))));
  const disp = document.getElementById('matchDurationDisplay');
  if(disp){
    const h = Math.floor(MS.duration);
    const m = Math.round((MS.duration % 1) * 60);
    disp.textContent = m > 0 ? h+'h '+m+'m' : h+' hr'+(h!==1?'s':'');
  }
  // Update end time based on new duration
  const startVal = document.getElementById('matchTimeStart')?.value || MS.timeStart;
  if(startVal) onMatchStartTimeChange(startVal);
  // Re-render Step 7 summary so Date & Time row shows the new end time
  smUpdateSummary();
  smUpdateProgress(5); // Date & Time is now Step 5
  smCheckConflict();
}


// ── Step validation functions ──────────────────────────
function checkMatchStep2(){
  const btn    = document.getElementById('matchNext2');
  if(!btn) return;
  const date   = (document.getElementById('matchDate')?.value || '').trim();
  const timeVal = document.getElementById('matchTimeStart')?.value;
  const timeOk = !!timeVal && validateMatchTimes();

  // Check past date/time
  let inPast = false;
  if(date && timeVal){
    inPast = new Date(date+'T'+timeVal) < new Date();
  }
  const pastWarn = document.getElementById('matchPastWarning');
  if(pastWarn) pastWarn.style.display = inPast ? 'block' : 'none';

  const ok = !!(date && timeOk && !inPast);
  if(ok){
    btn.removeAttribute('disabled');
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
  } else {
    btn.setAttribute('disabled', true);
    btn.style.opacity = '0.35';
    btn.style.cursor  = 'not-allowed';
  }
}

function checkMatchStep4(){ smUpdateSendBtn(); }
function checkMatchStep1(){
  const btn = document.getElementById('matchNext1');
  if(!btn) return;
  // Step 1 is format + gender pref — always valid once format is selected (pre-selected as Doubles)
  btn.disabled = false;
}

// ── Group selection (multi-select) ─────────────────────

function showGroupPlayerList(group, groupLabel){
  // Get players for this group
  const mySkill = parseFloat(S.skill || SESSION_PLAYER?.skill_level || 0);
  const skills = mySkill ? getAdjacentSkills(String(mySkill)) : null;

  let players = [];
  if(group === 'favorites'){
    players = IC_MEMBERS.filter(({player})=>IC_FAVORITES.has((player.email||'').toLowerCase())).map(x=>x.player);
  } else if(group === 'all'){
    players = IC_MEMBERS.map(x=>x.player);
  } else if(group === 'my_level'){
    players = IC_MEMBERS.filter(({player})=>skills&&Math.abs(parseFloat(player.skill_level||0)-skills.my)<0.13).map(x=>x.player);
  } else if(group === 'below'){
    players = IC_MEMBERS.filter(({player})=>skills&&skills.below!==null&&Math.abs(parseFloat(player.skill_level||0)-skills.below)<0.13).map(x=>x.player);
  } else if(group === 'above'){
    players = IC_MEMBERS.filter(({player})=>skills&&skills.above!==null&&Math.abs(parseFloat(player.skill_level||0)-skills.above)<0.13).map(x=>x.player);
  }

  const existing = document.getElementById('groupPlayerPopup');
  if(existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'groupPlayerPopup';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:#ffffff;border:2px solid #1a7a3a;border-radius:16px;padding:20px;width:100%;max-width:420px;max-height:80vh;overflow-y:auto;';

  const myGender = S.gender || SESSION_PLAYER?.gender || '';
  const genderActive = MS.genderPref === 'same';
  const basePlayers = genderActive ? players.filter(p=>playerPassesGenderFilter(p, MS.genderPref, myGender)) : players;
  const passCount = basePlayers.length;
  const genderNote = (genderActive && passCount < players.length)
    ? ' · <span style="color:#d97706;font-weight:600;">'+passCount+' match pref</span>' : '';

  // Gender breakdown pills
  const gMen   = basePlayers.filter(p=>(p.gender||'').toLowerCase()==='male').length;
  const gWomen = basePlayers.filter(p=>(p.gender||'').toLowerCase()==='female').length;
  const gOther = basePlayers.length - gMen - gWomen;
  const genderBreakdownRow = basePlayers.length > 0
    ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">'+
        '<span style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600;color:#1d4ed8;">👨 '+gMen+' Men</span>'+
        '<span style="background:#fdf4ff;border:1px solid #e879f9;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600;color:#7e22ce;">👩 '+gWomen+' Women</span>'+
        (gOther>0?'<span style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600;color:#6b7280;">❓ '+gOther+' N/A</span>':'')+
        (genderActive?'<span style="font-size:10px;color:#d97706;align-self:center;">(filtered)</span>':'')+
      '</div>'
    : '';

  const header = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'+
    '<div style="font-size:15px;font-weight:800;color:#111;">'+groupLabel+' <span style="font-size:12px;color:#6b7280;font-weight:600;">('+players.length+' players'+genderNote+')</span></div>'+
    '<button onclick="document.getElementById(`groupPlayerPopup`).remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;">✕</button>'+
  '</div>';

  const playerRows = players.length ? players.map(p=>{
    const name = ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim() || p.email;
    const emoji = p.avatar_emoji || '🧑';
    const passesGender = playerPassesGenderFilter(p, MS.genderPref, myGender);
    const genderBlocked = genderActive && !passesGender;
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f3f4f6;border-radius:8px;margin-bottom:6px;'+(genderBlocked?'opacity:0.4;':'')+'">'+
      '<span style="font-size:20px;">'+emoji+'</span>'+
      '<div>'+
        '<div style="font-size:13px;font-weight:700;color:#111;">'+name+(genderBlocked?' <span style="font-size:10px;color:#d97706;">⚧</span>':'')+'</div>'+
        (p.skill_level?'<div style="font-size:11px;color:#555;">Rating '+p.skill_level+'</div>':'')+
      '</div>'+
    '</div>';
  }).join('') : '<div style="text-align:center;color:#6b7280;padding:20px;">No players in this group yet.</div>';

  modal.innerHTML = header + genderBreakdownRow + playerRows;
  overlay.appendChild(modal);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
function toggleMatchGroup(group, el){
  // Initialize selectedGroups if needed
  if(!MS.selectedGroups) MS.selectedGroups = new Set();

  const isOn = el.classList.contains('on');
  if(isOn){
    // Deselect this group
    MS.selectedGroups.delete(group);
    el.classList.remove('on');
    // If removing specific, hide picker
    if(group==='specific'){
      const picker = document.getElementById('matchSpecificPicker');
      if(picker) picker.style.display='none';
    }
    if(group==='group_subs'){
      const picker = document.getElementById('matchGroupSubsPicker');
      if(picker) picker.style.display='none';
    }
  } else {
    // Select this group
    MS.selectedGroups.add(group);
    el.classList.add('on');
    if(group==='specific'){
      const picker = document.getElementById('matchSpecificPicker');
      if(picker){ picker.style.display='block'; buildSpecificPicker(); }
    }
    if(group==='group_subs'){
      const picker = document.getElementById('matchGroupSubsPicker');
      if(picker){ picker.style.display='block'; buildGroupSubPicker(); }
    }
    // FIX 4: Auto-set format and courts from named group's match_type / max_players
    if(group.startsWith('named_')){
      const gId = group.replace('named_','');
      const grp = _groups && _groups.find(g=>String(g.id)===String(gId));
      if(grp){
        const fmt = grp.match_type === 'singles' ? 'singles' : 'doubles';
        const playersPerCourt = fmt === 'singles' ? 2 : 4;
        const suggestedCourts = Math.max(1, Math.ceil(((grp.max_players||4) - 1) / playersPerCourt));
        const cappedCourts = Math.min(4, suggestedCourts);
        MS.format = fmt;
        const fmtDbl = document.getElementById('smFmtDoubles');
        const fmtSgl = document.getElementById('smFmtSingles');
        if(fmtDbl){ fmtDbl.style.border='1px solid #e5e7eb'; fmtDbl.style.background='#fff'; }
        if(fmtSgl){ fmtSgl.style.border='1px solid #e5e7eb'; fmtSgl.style.background='#fff'; }
        const activeBtn = fmt === 'singles' ? fmtSgl : fmtDbl;
        if(activeBtn){ activeBtn.style.border='2px solid #1a7a3a'; activeBtn.style.background='#f0fdf4'; }
        selectNumCourts(cappedCourts);
      }
    }
  }

  // Sync MS.group = first selected (for DB/email compat), MS.extraGroups = rest
  const allSelected = [...MS.selectedGroups];
  MS.group = allSelected[0] || null;
  MS.extraGroups = new Set(allSelected.slice(1));

  // Hide expand area when toggling
  const expandArea = document.getElementById('matchGroupExpandArea');
  if(expandArea) expandArea.style.display='none';

  checkGroupSize();
  updateInviteCounter();
}

// Keep selectMatchGroup as alias for backward compat (format restore etc.)
function selectMatchGroup(group, el){ toggleMatchGroup(group, el); }

function checkGroupSize(){
  const warning   = document.getElementById('matchGroupWarning');
  const warnText  = document.getElementById('matchGroupWarningText');
  const quickAdd  = document.getElementById('matchGroupQuickAdd');
  const btn4      = document.getElementById('matchNext4');
  if(!warning||!warnText||!quickAdd) return;

  const maxNeeded = matchMaxNeeded();
  const mySkill   = S.skill || SESSION_PLAYER?.skill_level || '';
  const skills    = mySkill ? getAdjacentSkills(mySkill) : null;
  const allGroups = (MS.selectedGroups && MS.selectedGroups.size) ? MS.selectedGroups : new Set([MS.group, ...MS.extraGroups].filter(Boolean));

  // Collect all players (deduped) from all selected groups
  const seen = new Set();
  const allPlayers = [];
  allGroups.forEach(g=>{
    if(!g||g==='specific'||g==='group_subs') return;
    getGroupPlayers(g, skills).forEach(p=>{
      if(!seen.has(p.email)){ seen.add(p.email); allPlayers.push(p); }
    });
  });
  if(allGroups.has('specific')){
    MS.specificPlayers.forEach(e=>{ if(!seen.has(e)){ seen.add(e); allPlayers.push({email:e}); } });
  }
  if(allGroups.has('group_subs')){
    MS.primaryPlayers.forEach(e=>{ if(!seen.has(e)){ seen.add(e); allPlayers.push({email:e}); } });
    MS.subPlayers.forEach(e=>{ if(!seen.has(e)){ seen.add(e); allPlayers.push({email:e}); } });
  }

  const count = allPlayers.length;

  // group_subs mode: skip the warning if only group_subs selected (it has its own UI)
  const onlyGroupSubs = allGroups.size===1 && allGroups.has('group_subs');
  if(onlyGroupSubs){ warning.style.display='none'; checkMatchStep4(); return; }

  if(allGroups.size > 0 && count < maxNeeded){
    warning.style.display='block';
    const needed = maxNeeded - count;
    warnText.textContent = 'Only '+count+' player'+(count!==1?'s':'')+' selected — '+
      MS.format+' needs at least '+maxNeeded+'. Add '+needed+' more player'+(needed!==1?'s':'')+'.';

    // Quick-add buttons for groups not yet selected
    quickAdd.innerHTML='';
    const otherGroups = [
      {key:'all',      label:'👥 Entire Circle'},
      {key:'my_level', label:'🟢 My Level'},
      {key:'below',    label:'🟡 Below My Level'},
      {key:'above',    label:'🟣 Above My Level'},
      {key:'specific', label:'🎯 Pick Players'},
    ];
    otherGroups.filter(g=>!allGroups.has(g.key)).forEach(g=>{
      const extraCount = g.key==='specific' ? 0 : getGroupPlayers(g.key, skills).length;
      const btn = document.createElement('button');
      btn.style.cssText = 'padding:7px 12px;border-radius:8px;font-size:11px;font-weight:700;'+
        'cursor:pointer;font-family:sans-serif;border:1px solid;transition:all .15s;'+
        'background:rgba(255,255,255,0.06);color:var(--dim);border-color:var(--border);';
      btn.textContent = '+ ' + g.label + (g.key!=='specific'&&extraCount?' ('+extraCount+')':'');
      btn.onclick = ()=>{
        if(!MS.selectedGroups) MS.selectedGroups = new Set();
        MS.selectedGroups.add(g.key);
        const all=[...MS.selectedGroups]; MS.group=all[0]||null; MS.extraGroups=new Set(all.slice(1));
        const optEl=document.querySelector('#matchGroupOptions .match-option[data-group="'+g.key+'"]');
        if(optEl) optEl.classList.add('on');
        if(g.key==='specific'){
          const picker=document.getElementById('matchSpecificPicker');
          if(picker){ picker.style.display='block'; buildSpecificPicker(); }
        }
        checkGroupSize(); updateInviteCounter();
      };
      quickAdd.appendChild(btn);
    });

    if(btn4){ btn4.setAttribute('disabled',true); btn4.style.opacity='0.35'; btn4.style.cursor='not-allowed'; }
  } else {
    warning.style.display='none';
    checkMatchStep4();
  }
}

function getGroupPlayers(group, skills){
  if(!group||group==='specific') return [];
  const myGender = S.gender || SESSION_PLAYER?.gender || '';
  return IC_MEMBERS.filter(({player})=>{
    if(!playerPassesGenderFilter(player, MS.genderPref, myGender)) return false;
    const pEmail=(player.email||'').toLowerCase();
    if(group==='favorites') return IC_FAVORITES.has(pEmail);
    if(group==='all') return true;
    const ps=parseFloat(player.skill_level||0);
    if(group==='my_level') return skills&&Math.abs(ps-skills.my)<0.13;
    if(group==='below')    return skills&&skills.below!==null&&Math.abs(ps-skills.below)<0.13;
    if(group==='above')    return skills&&skills.above!==null&&Math.abs(ps-skills.above)<0.13;
    return false;
  }).map(({player})=>player);
}

function buildSpecificPicker(){
  const list    = document.getElementById('matchSpecificList');
  const countEl = document.getElementById('matchSpecificCount');
  const warnEl  = document.getElementById('matchSpecificWarning');
  if(!list) return;

  const totalSlots = matchMaxNeeded();
  const selected   = MS.specificPlayers.size;
  const confirmed  = Math.min(selected, totalSlots);
  const subs       = Math.max(0, selected - totalSlots);

  if(countEl){
    countEl.textContent = subs > 0
      ? selected+' selected ('+confirmed+' confirmed · '+subs+' sub'+(subs!==1?'s':'')+')'
      : selected+' selected';
  }

  if(warnEl){
    if(selected >= totalSlots && totalSlots > 0){
      warnEl.style.cssText='display:block;color:#065f46;background:#d1fae5;border:1px solid #6ee7b7;'+
        'border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:8px;';
      warnEl.textContent='\u2705 Slots filled! Any additional players you select will be added as subs in case someone drops.';
    } else {
      warnEl.style.display='none';
    }
  }

  list.innerHTML='';
  if(!IC_MEMBERS.length){
    list.innerHTML='<div class="ic-empty">No Inner Circle members yet.</div>';
    return;
  }

  const mySkill = S.skill || SESSION_PLAYER?.skill_level || '';
  const skills  = mySkill ? getAdjacentSkills(mySkill) : null;

  // Bucket members by skill level
  const buckets = {below:[], my:[], above:[], other:[]};
  [...IC_MEMBERS].sort((a,b)=>
    ((a.player.first_name||'')+(a.player.last_name||'')).localeCompare((b.player.first_name||'')+(b.player.last_name||''))
  ).forEach(({player})=>{
    const ps = parseFloat(player.skill_level||0);
    if(skills && skills.below !== null && Math.abs(ps-skills.below)<0.13) buckets.below.push(player);
    else if(skills && Math.abs(ps-skills.my)<0.13)                         buckets.my.push(player);
    else if(skills && skills.above !== null && Math.abs(ps-skills.above)<0.13) buckets.above.push(player);
    else buckets.other.push(player);
  });

  const colDefs = [
    {key:'below', label:'\ud83d\udfe1 Below My Level', skill: skills?.below||''},
    {key:'my',    label:'\ud83d\udfe2 My Level',       skill: skills?.my||''},
    {key:'above', label:'\ud83d\udfe3 Above My Level', skill: skills?.above||''},
    {key:'other', label:'\u26aa Other Levels',          skill: ''},
  ];

  list.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0 12px;align-items:start;';

  const myGender = S.gender || SESSION_PLAYER?.gender || '';

  colDefs.forEach(col=>{
    const players = buckets[col.key];
    const colEl = document.createElement('div');

    // Column header — show gender match count when a filter is active
    const genderActive = MS.genderPref && MS.genderPref !== 'either';
    const passCount = genderActive
      ? players.filter(p=>playerPassesGenderFilter(p, MS.genderPref, myGender)).length
      : players.length;
    const hdr = document.createElement('div');
    const isOther = col.key === 'other';
    hdr.style.cssText='text-align:center;padding:8px 4px 6px;margin-bottom:6px;'+
      'border-radius:8px;font-size:11px;font-weight:700;line-height:1.4;'+
      (isOther
        ? 'background:#f3f4f6;border:2px solid #9ca3af;color:#6b7280;'
        : 'background:#e5e7eb;border:2px solid #d1d5db;color:#374151;');
    const skillHtml = col.skill
      ? ' \u00b7 <span style="color:#991b1b;font-weight:800;font-size:15px;">'+col.skill+'</span>'
      : '';
    hdr.innerHTML = col.label + skillHtml +
      '<br><span style="font-size:10px;opacity:0.7;">'+
        players.length+' player'+(players.length!==1?'s':'')+
        (genderActive&&passCount<players.length?' \u00b7 <span style="color:#d97706;">'+passCount+' match pref</span>':'')+
      '</span>';
    colEl.appendChild(hdr);

    if(!players.length){
      const empty = document.createElement('div');
      empty.style.cssText='text-align:center;color:#6b7280;font-size:11px;padding:12px 4px;';
      empty.textContent='None in circle';
      colEl.appendChild(empty);
    }

    players.forEach(player=>{
      const name    = ((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim();
      const checked = MS.specificPlayers.has(player.email);
      const passesGender = playerPassesGenderFilter(player, MS.genderPref, myGender);
      const genderBlocked = !passesGender && !checked;

      const card = document.createElement('div');
      card.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;'+
        'padding:8px 4px;border-radius:10px;margin-bottom:6px;text-align:center;'+
        'cursor:'+(genderBlocked?'not-allowed':'pointer')+';'+
        'border:2px solid '+(checked?'#1a7a3a':'#d1d5db')+';'+
        'background:'+(checked?'#d1fae5':'#f3f4f6')+';color:#111;'+
        'opacity:'+(genderBlocked?'0.3':'1')+';transition:all .15s;';

      card.innerHTML =
        '<span style="font-size:22px;line-height:1;">'+(player.avatar_emoji||'\ud83e\uddd1')+'</span>'+
        '<div style="color:#111;font-size:11px;font-weight:700;line-height:1.3;word-break:break-word;">'+name+'</div>'+
        '<div style="color:#555;font-size:10px;">'+(player.skill_level||'?')+'</div>'+
        (checked?'<div style="color:#1a7a3a;font-size:10px;font-weight:700;">\u2713 Selected</div>':'')+
        (genderBlocked?'<div style="color:#9ca3af;font-size:9px;">\u26a7 Not invited</div>':'');

      if(!genderBlocked){
        card.onclick = ()=>{
          if(MS.specificPlayers.has(player.email)){
            MS.specificPlayers.delete(player.email);
          } else {
            MS.specificPlayers.add(player.email);
          }
          buildSpecificPicker();
          checkMatchStep4();
          updateInviteCounter();
          smUpdateNeededGrid();
          smUpdateSummary();
        };
      }
      colEl.appendChild(card);
    });

    list.appendChild(colEl);
  });
}

function updateMatchGroupLabels(){
  const mySkill  = S.skill || SESSION_PLAYER?.skill_level || '';
  const myGender = S.gender || SESSION_PLAYER?.gender || '';
  const skills   = mySkill ? getAdjacentSkills(mySkill) : null;
  const sl = (grp, lbl) => ' <span onclick="event.stopPropagation();showGroupPlayerList(\'' + grp + '\',\'' + lbl + '\')" style="font-size:10px;color:#1a7a3a;font-weight:700;cursor:pointer;text-decoration:underline;">see list</span>';
  const el = (id,txt)=>{ const e=document.getElementById(id); if(e)e.innerHTML=txt; };

  // Count players in each group (unfiltered — for total display)
  const countGroup = (group)=>{
    if(!skills) return 0;
    return IC_MEMBERS.filter(({player})=>{
      const ps = parseFloat(player.skill_level||0);
      if(group==='all')       return true;
      if(group==='my_level')  return Math.abs(ps-skills.my)<0.13;
      if(group==='below')     return skills.below!==null && Math.abs(ps-skills.below)<0.13;
      if(group==='above')     return skills.above!==null && Math.abs(ps-skills.above)<0.13;
      return false;
    }).length;
  };

  // Gender breakdown pills for a player array (already gender-filtered via getGroupPlayers)
  const filt = MS.genderPref === 'same';
  const genBreak = (players) => {
    if(!players.length) return '';
    const m = players.filter(p=>(p.gender||'').toLowerCase()==='male').length;
    const w = players.filter(p=>(p.gender||'').toLowerCase()==='female').length;
    const o = players.length - m - w;
    return '<span style="font-size:9px;color:#9ca3af;display:block;margin-top:2px;line-height:1.4;">'+
      '👨 '+m+' · 👩 '+w+(o?' · ❓ '+o:'')+(filt?' <span style="color:#d97706;">(filtered)</span>':'')+
    '</span>';
  };

  const maxNeeded  = matchMaxNeeded();
  const allCount   = IC_MEMBERS.length;
  const myCount    = countGroup('my_level');
  const belowCount = countGroup('below');
  const aboveCount = countGroup('above');
  const favCount   = IC_MEMBERS.filter(({player})=>IC_FAVORITES.has((player.email||'').toLowerCase())).length;

  const allGP    = getGroupPlayers('all',       skills);
  const myGP     = getGroupPlayers('my_level',  skills);
  const belowGP  = getGroupPlayers('below',     skills);
  const aboveGP  = getGroupPlayers('above',     skills);
  const favGP    = IC_MEMBERS.filter(({player})=>IC_FAVORITES.has((player.email||'').toLowerCase()) &&
                     playerPassesGenderFilter(player, MS.genderPref, myGender)).map(x=>x.player);

  const countBadge = (n)=> n===0 ? '— no players' : n+' player'+(n!==1?'s':'')+(n<maxNeeded?' ⚠️':'');

  el('matchFavoritesSub', favCount+' player'+(favCount!==1?'s':'')+sl('favorites','My Favorites')+genBreak(favGP));
  el('matchAllSub',       allCount+' player'+(allCount!==1?'s':'')+sl('all','Entire Inner Circle')+genBreak(allGP));
  el('matchMyLevelSub',   (skills?.my||'—')+' · '+countBadge(myCount)+sl('my_level','My Level')+genBreak(myGP));
  el('matchBelowSub',     (skills?.below||'—')+' · '+countBadge(belowCount)+sl('below','Below My Level')+genBreak(belowGP));
  el('matchAboveSub',     (skills?.above||'—')+' · '+countBadge(aboveCount)+sl('above','Above My Level')+genBreak(aboveGP));
  el('matchSpecificSub',  'Pick up to '+matchMaxNeeded()+' from '+allCount+genBreak(allGP));
}

// ── Step 2: Where ──────────────────────────────────────
function selectMatchLocation(loc, el){
  MS.location = loc;
  document.querySelectorAll('#matchStep3 .match-option').forEach(o=>{
    o.classList.remove('on','dim');
    o.classList.add('dim');
  });
  el.classList.remove('dim');
  el.classList.add('on');
  const sec = document.getElementById('matchMyCourtsSection');
  if(sec) sec.style.display = loc==='my_courts' ? 'block' : 'none';
  if(loc==='tbd'){
    MS.courtName='TBD'; MS.courtAddress='';
    const btn = document.getElementById('matchNext3');
    if(btn) btn.disabled=false;
  } else {
    loadMatchCourts();
    updateMatchCourtsNext();
  }
}

// Multi-select court state
async function loadMatchCourts(){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  const pubEl  = document.getElementById('matchPublicCourts');
  const privEl = document.getElementById('matchPrivateCourts');
  const empty  = document.getElementById('matchNoCourts');
  if(!pubEl||!privEl) return;
  pubEl.innerHTML = privEl.innerHTML = '<div style="font-size:11px;color:#1a7a3a;">Loading…</div>';

  try{
    // Step 1: get court IDs saved by this player
    const pcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const pcRows = pcRes.ok ? await pcRes.json() : [];
    const courtIds = pcRows.map(r=>r.court_id).filter(Boolean);

    if(!courtIds.length){
      pubEl.innerHTML = privEl.innerHTML = '';
      if(empty) empty.style.display='block';
      return;
    }

    // Step 2: fetch full court details for those IDs
    const inFilter = courtIds.map(id=>`"${id}"`).join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/courts?id=in.(${courtIds.join(',')})&select=id,name,address,city,state,is_private,is_indoor,num_courts`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const courts = res.ok ? await res.json() : [];

    if(empty) empty.style.display='none';

    const renderCourt = (court, container)=>{
      const selected   = MS.selectedCourts.has(court.id);
      const courtData  = MS.selectedCourts.get(court.id) || {};
      const preferred  = courtData.preferred || false;
      const multiSelected = MS.selectedCourts.size > 1;

      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-bottom:8px;';

      // Main court row
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;'+
        'border-radius:10px;border:2px solid '+(selected?'#1a7a3a':'#d1d5db')+';'+
        'background:'+(selected?'#d1fae5':'#f3f4f6')+';'+
        'cursor:pointer;transition:all .15s;';

      // Checkbox
      const cb = document.createElement('div');
      cb.style.cssText = 'width:18px;height:18px;border-radius:4px;flex-shrink:0;'+
        'border:2px solid '+(selected?'#1a7a3a':'#9ca3af')+';'+
        'background:'+(selected?'#1a7a3a':'#ffffff')+';'+
        'display:flex;align-items:center;justify-content:center;transition:all .15s;';
      if(selected) cb.innerHTML = '<span style="color:#fff;font-size:11px;font-weight:700;">✓</span>';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';
      info.innerHTML =
        '<div style="color:#111;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+court.name+'</div>'+
        '<div style="color:#555;font-size:10px;">'+(court.city||'')+
          (court.num_courts?' · '+court.num_courts+' courts':'')+
        '</div>';

      row.appendChild(cb);
      row.appendChild(info);
      row.onclick = ()=>{
        if(MS.selectedCourts.has(court.id)){
          MS.selectedCourts.delete(court.id);
        } else {
          // Single court selection — clear any previous selection
          MS.selectedCourts.clear();
          MS.selectedCourts.set(court.id, {
            name: court.name,
            address: (court.address||'')+(court.city?', '+court.city:''),
            isPrivate: court.is_private||false,
            preferred: true,
            numCourts: court.num_courts ?? null
          });
        }
        updateMatchCourtsNext();
        renderCourtCapacityWarning();
        loadMatchCourts();
      };
      wrap.appendChild(row);

      // Prefer checkbox — shown when this court is selected AND multiple courts selected
      if(selected && MS.selectedCourts.size > 1){
        const prefRow = document.createElement('div');
        prefRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px 4px;';
        const prefCb = document.createElement('input');
        prefCb.type = 'checkbox';
        prefCb.checked = preferred;
        prefCb.style.cssText = 'accent-color:var(--green);cursor:pointer;';
        prefCb.onchange = (e)=>{
          e.stopPropagation();
          // Clear preferred from all, set on this one
          MS.selectedCourts.forEach((v,k)=>{ v.preferred = false; });
          const d = MS.selectedCourts.get(court.id);
          if(d) d.preferred = prefCb.checked;
          loadMatchCourts();
        };
        const prefLabel = document.createElement('label');
        prefLabel.textContent = '⭐ Prefer this court';
        prefLabel.style.cssText = 'font-size:11px;color:#1a7a3a;font-weight:600;cursor:pointer;';
        prefLabel.onclick = ()=>{ prefCb.checked=!prefCb.checked; prefCb.onchange({stopPropagation:()=>{}}); };
        prefRow.appendChild(prefCb);
        prefRow.appendChild(prefLabel);
        wrap.appendChild(prefRow);
      }
      container.appendChild(wrap);
    };

    const pub  = courts.filter(c=>!c.is_private);
    const priv = courts.filter(c=>c.is_private);
    if(pub.length)  pub.forEach(c=>renderCourt(c, pubEl));
    else pubEl.innerHTML  = '<div style="font-size:11px;color:#6b7280;">No public courts saved yet</div>';
    if(priv.length) priv.forEach(c=>renderCourt(c, privEl));
    else privEl.innerHTML = '<div style="font-size:11px;color:#6b7280;">No private courts saved yet</div>';

    // Update selected summary
    updateMatchCourtsSummary();
  }catch(e){ console.warn('loadMatchCourts:',e); if(pubEl) pubEl.innerHTML='<div style="font-size:11px;color:#dc2626;">Could not load courts — '+e.message+'</div>'; if(privEl) privEl.innerHTML=''; }
}

function updateMatchCourtsNext(){
  smUpdateSendBtn();
  smUpdateSummary();
  if(MS.selectedCourts && MS.selectedCourts.size > 0) smUpdateProgress(6); // Court is now Step 6
  // Hide "+ Add a new court" once a court is selected; restore when deselected
  const addBtn = document.getElementById('smAddCourtBtn');
  if(addBtn) addBtn.style.display = (MS.selectedCourts && MS.selectedCourts.size > 0) ? 'none' : '';
}

function updateMatchCourtsSummary(){
  const wrap = document.getElementById('matchSelectedCourtsWrap');
  const list = document.getElementById('matchSelectedCourtsList');
  if(!wrap||!list) return;
  if(MS.selectedCourts.size === 0){ wrap.style.display='none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = '';
  MS.selectedCourts.forEach((court, id)=>{
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;color:#111;font-weight:600;margin-bottom:4px;';
    div.innerHTML = (court.preferred?'⭐ ':'📍 ') + court.name +
      (court.isPrivate?' <span style="font-size:9px;color:#b45309;font-weight:700;margin-left:4px;">PRIVATE</span>':'');
    list.appendChild(div);
  });
}

// ── Step 3: Review ─────────────────────────────────────
// ── Match overlap / conflict detection ─────────────────
async function checkMatchOverlap(){
  const warnBox  = document.getElementById('matchOverlapWarning');
  const warnText = document.getElementById('matchOverlapText');
  if(!warnBox||!warnText) return;
  warnBox.style.display='none';

  const myEmail = getMyEmail();
  if(!myEmail) return;

  const date      = document.getElementById('matchDate')?.value;
  const timeStart = MS.timeStart || document.getElementById('matchTimeStart')?.value;
  if(!date||!timeStart) return;

  // Convert "HH:MM" to minutes since midnight
  const toMins = t=>{ if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
  const newStart = toMins(timeStart);
  const newEnd   = newStart + Math.round(MS.duration * 60);

  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&match_date=eq.${date}&status=neq.cancelled&select=time_start,time_end,court_name,match_type`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const existing = res.ok ? await res.json() : [];
    const conflicts = existing.filter(m=>{
      const s = toMins(m.time_start);
      const e = m.time_end ? toMins(m.time_end) : s + 120;
      // True overlap: new start < existing end AND new end > existing start
      return newStart < e && newEnd > s;
    });

    if(conflicts.length){
      warnBox.style.display='block';
      const list = conflicts.map(m=>{
        const s=fmt12(m.time_start);
        const e=m.time_end?fmt12(m.time_end):'';
        return (m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Doubles':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Singles')+' at '+s+(e?' – '+e:'')+(m.court_name?' @ '+m.court_name:'');
      }).join('<br>');
      warnText.innerHTML='You already have a match at this time:<br><span style="color:#fff;font-weight:600;">'+list+'</span><br><span style="color:var(--dim);">Back-to-back is fine — only true overlaps are flagged.</span>';
    }
  }catch(e){ console.warn('Overlap check error:',e); }
}

function buildMatchSummary(){
  // Check for scheduling conflicts with existing matches
  checkMatchOverlap();
  const sum = document.getElementById('matchSummary');
  if(!sum) return;
  const date    = document.getElementById('matchDate')?.value;
  const dateStr = date ? new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : '—';
  let timeStr = '';
  if(MS.isFeeler){
    const s=document.getElementById('matchTimeRangeStart')?.value;
    const e=document.getElementById('matchTimeRangeEnd')?.value;
    timeStr = s&&e ? fmt12(s)+' – '+fmt12(e)+' (feeler)' : '—';
  } else {
    const t = MS.timeStart||document.getElementById('matchTimeStart')?.value;
    timeStr = t ? fmt12(t) : '—';
  }
  const durStr = MS.duration+(MS.duration===1?' hr':' hrs');

  // Build invitee list
  const mySkill = S.skill||SESSION_PLAYER?.skill_level||'';
  const myGender = S.gender || SESSION_PLAYER?.gender || '';
  const skills  = mySkill ? getAdjacentSkills(mySkill) : null;
  const allGroups = (MS.selectedGroups && MS.selectedGroups.size) ? MS.selectedGroups : new Set([MS.group, ...MS.extraGroups].filter(Boolean));
  let invitees  = [];
  const seen = new Set();
  // Non-specific groups
  IC_MEMBERS.forEach(({player})=>{
    if(seen.has(player.email)) return;
    if(!playerPassesGenderFilter(player, MS.genderPref, myGender)) return;
    const ps = parseFloat(player.skill_level||0);
    const pEmailLC=(player.email||'').toLowerCase();
    if(MS.deselectedPlayers?.has(pEmailLC)) return;
    for(const g of allGroups){
      if(g==='specific'||g==='group_subs'||!g) continue;
      if(g==='favorites' && IC_FAVORITES.has(pEmailLC))  { seen.add(player.email); invitees.push(player); return; }
      if(g==='all')                                        { seen.add(player.email); invitees.push(player); return; }
      if(g==='my_level' && skills && Math.abs(ps-skills.my)<0.13) { seen.add(player.email); invitees.push(player); return; }
      if(g==='below' && skills && skills.below!==null && Math.abs(ps-skills.below)<0.13) { seen.add(player.email); invitees.push(player); return; }
      if(g==='above' && skills && skills.above!==null && Math.abs(ps-skills.above)<0.13) { seen.add(player.email); invitees.push(player); return; }
    }
  });
  // Add specifically-picked players (deduped)
  if(allGroups.has('specific')){
    IC_MEMBERS.forEach(({player})=>{
      if(!seen.has(player.email) && MS.specificPlayers.has(player.email) && playerPassesGenderFilter(player, MS.genderPref, myGender)){
        seen.add(player.email); invitees.push(player);
      }
    });
  }
  // Add group+subs players (primary + subs) — no gender filter for hand-picked subs
  if(allGroups.has('group_subs')){
    IC_MEMBERS.forEach(({player})=>{
      const eLC=(player.email||'').toLowerCase();
      if(!seen.has(player.email) && (MS.primaryPlayers.has(eLC)||MS.subPlayers.has(eLC))){
        seen.add(player.email); invitees.push(player);
      }
    });
  }

  const maxNeeded = matchMaxNeeded();
  const groupLabels={all:'Entire Inner Circle',my_level:'My Level',below:'Below My Level',above:'Above My Level',specific:'Specific Players',favorites:'My Favorites',group_subs:'Set Group + Subs'};
  const invitedLabel = [...allGroups].map(g=>groupLabels[g]||g).join(' + ');
  const genderPrefLabel = MS.genderPref==='mixed'?'Mixed':MS.genderPref==='same'?'Same Gender':'Either';

  sum.innerHTML =
    '<div class="match-summary-row" style="color:#111;"><span>Match Type</span><span>'+(MS.format==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Doubles':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Singles')+(MS.numCourts>1?' &times;'+MS.numCourts+' courts':'')+'</span></div>'+
    '<div class="match-summary-row"><span>Play Structure</span><span>'+genderPrefLabel+'</span></div>'+
    '<div class="match-summary-row"><span>Duration</span><span>'+durStr+'</span></div>'+
    '<div class="match-summary-row"><span>Invited</span><span>'+invitedLabel+' ('+invitees.length+')</span></div>'+
    '<div class="match-summary-row"><span>Spots open</span><span>'+maxNeeded+' needed · first to respond wins</span></div>'+
    '<div class="match-summary-row"><span>Date</span><span>'+dateStr+'</span></div>'+
    '<div class="match-summary-row"><span>Time</span><span>'+timeStr+'</span></div>'+
    (()=>{
    if(MS.selectedCourts.size === 0) return '<div class="match-summary-row"><span>Court</span><span>TBD</span></div>';
    let courtHtml = '';
    MS.selectedCourts.forEach((court,id)=>{
      const label = court.preferred ? '⭐ '+court.name+' <span style="font-size:10px;color:#fbbf24;">(preferred)</span>' : '📍 '+court.name;
      const badge = court.isPrivate ? ' <span style="font-size:9px;background:rgba(251,191,36,0.15);color:#fbbf24;border-radius:4px;padding:1px 5px;">PRIVATE</span>' : ' <span style="font-size:9px;background:rgba(76,175,125,0.15);color:var(--green);border-radius:4px;padding:1px 5px;">FREE</span>';
      courtHtml += '<div class="match-summary-row"><span>Court</span><span>'+label+badge+'</span></div>';
      // Court capacity warning in summary
      const cn = court.numCourts??null; const n=MS.numCourts||1;
      if(cn===null){ courtHtml+='<div style="padding:8px 12px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;font-size:11px;color:#6b7280;margin-bottom:4px;">⚠️ No court count data for '+court.name+' — confirm availability.</div>'; }
      else if(n>cn){ courtHtml+='<div style="padding:8px 12px;background:#fff1f2;border:1px solid #f87171;border-radius:8px;font-size:11px;color:#dc2626;margin-bottom:4px;">🚫 '+court.name+' only has '+cn+' court'+(cn!==1?'s':'')+'. Match needs '+n+'.</div>'; }
      else if(n===cn){ courtHtml+='<div style="padding:8px 12px;background:#fef9c3;border:1px solid #d97706;border-radius:8px;font-size:11px;color:#b45309;margin-bottom:4px;">⚠️ Using all '+cn+' court'+(cn!==1?'s':'')+' at '+court.name+' — confirm availability.</div>'; }
    });
    return courtHtml;
  })();

  const preview = document.getElementById('matchInviteePreview');
  if(preview&&invitees.length){
    preview.innerHTML =
      '<div style="font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">'+
        'Inviting '+invitees.length+' player'+(invitees.length!==1?'s':'')+' — first '+maxNeeded+' to accept get'+(maxNeeded===1?'s':'')+' the spot'+
      '</div>'+
      '<div style="color:var(--dim);font-size:12px;line-height:1.8;">'+
        invitees.slice(0,8).map(p=>((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()).join(' · ')+
        (invitees.length>8?' + '+(invitees.length-8)+' more':'')+
      '</div>';
  }
}

function fmt12(t){
  if(!t) return '';
  const [h,m]=t.split(':').map(Number);
  const ampm=h>=12?'pm':'am';
  return ((h%12)||12)+':'+String(m).padStart(2,'0')+ampm;
}

function isMatchPast(match, graceHours=2){
  if(!match.match_date) return false;
  const timeStr = match.time_end || match.time_start || '23:59';
  const matchEnd = new Date(match.match_date+'T'+timeStr);
  matchEnd.setHours(matchEnd.getHours() + graceHours);
  return matchEnd < new Date();
}

function getMatchStatusDisplay(match){
  const past = isMatchPast(match);
  if(past){
    if(match.status==='full') return {label:'✅ Played',     color:'#16a34a', bg:'#f0fdf4', border:'#16a34a'};
    return                          {label:'⏰ Needs Score', color:'#d97706', bg:'#fffbeb', border:'#d97706'};
  }
  // FIX 3: In Progress — current time is between match start and end
  if(match.match_date && match.time_start && match.time_end){
    const now = new Date();
    const mStart = new Date(match.match_date+'T'+match.time_start);
    const mEnd   = new Date(match.match_date+'T'+match.time_end);
    if(now >= mStart && now <= mEnd)
      return {label:'🎾 In Progress', color:'#16a34a', bg:'#f0fdf4', border:'#16a34a', inProgress:true};
  }
  // FIX 2: "Open" should never show after match end time has passed (within grace window)
  if(match.status==='open' && match.match_date){
    const endStr = match.time_end || match.time_start || '23:59';
    if(new Date(match.match_date+'T'+endStr) < new Date())
      return {label:'Ended', color:'#6b7280', bg:'#f9fafb', border:'#d1d5db'};
  }
  if(match.status==='full')      return {label:'🟢 Confirmed', color:'#16a34a', bg:'#f0fdf4', border:'#16a34a'};
  if(match.status==='open')      return {label:'🔴 Open',      color:'#dc2626', bg:'#fff1f2', border:'#dc2626'};
  if(match.status==='cancelled') return {label:'❌ Cancelled', color:'#dc2626', bg:'#fef2f2', border:'#dc2626'};
  return                               {label:match.status,   color:'#6b7280', bg:'#f9fafb', border:'#d1d5db'};
}

async function submitMatch(){
  const myEmail = getMyEmail();
  if(!myEmail){ showToast('Please sign in first','#f59e0b'); return; }
  const _isSpecific = (MS.selectedGroups && MS.selectedGroups.has('specific')) || MS.inviteMode === 'specific';
  const _isNamed    = !!(MS.group && MS.group.startsWith('named_'));
  if(_isSpecific && !_isNamed){
    const needed = matchMaxNeeded();
    if(!MS.specificPlayers || MS.specificPlayers.size < needed){
      showToast('Select at least '+needed+' player'+(needed!==1?'s':'')+' to continue.','#f59e0b');
      return;
    }
  }
  const btn=document.getElementById('matchSendBtn');
  const status=document.getElementById('matchSendStatus');
  btn.disabled=true; btn.textContent='Sending…';
  status.textContent='Saving match…';
  const date=document.getElementById('matchDate')?.value;
  const timeStart=MS.isFeeler?document.getElementById('matchTimeRangeStart')?.value:MS.timeStart||document.getElementById('matchTimeStart')?.value;
  const timeEnd=MS.isFeeler?document.getElementById('matchTimeRangeEnd')?.value:(MS.timeEnd||null);
  const note=document.getElementById('matchNote')?.value?.trim();
  const myName=((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:'')).trim();
  try{
    // Build court info from selectedCourts if available
    let saveCourtName = MS.courtName || 'TBD';
    let saveCourtAddress = MS.courtAddress || '';
    let saveCourtId = MS.courtId || null;
    let saveIsPrivate = MS.isPrivate || false;
    if(MS.selectedCourts && MS.selectedCourts.size > 0){
      // Use preferred court if set, else first court
      let preferred = null;
      MS.selectedCourts.forEach((v,k)=>{ if(v.preferred||!preferred) preferred={id:k,...v}; });
      if(preferred){
        saveCourtId = preferred.id;
        saveCourtName = preferred.name || saveCourtName;
        saveCourtAddress = preferred.address || saveCourtAddress;
        saveIsPrivate = preferred.isPrivate || false;
      }
    }
    const matchRes=await fetch(`${SUPABASE_URL}/rest/v1/matches`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=representation'},
      body:JSON.stringify({organizer_email:myEmail,organizer_name:myName,match_type:MS.format,invite_group:MS.group,is_feeler:MS.isFeeler,match_date:date,time_start:timeStart,time_end:timeEnd,court_id:saveCourtId,court_name:saveCourtName,court_address:saveCourtAddress,is_private_court:saveIsPrivate,max_players:matchTotalSlots(),notes:note||null,gender_pref:MS.genderPref||'either'})
    });
    const matchRows=matchRes.ok?await matchRes.json():[];
    const matchId=matchRows[0]?.id;
    const mySkill=S.skill||SESSION_PLAYER?.skill_level||'';
    const skills=mySkill?getAdjacentSkills(mySkill):null;
    const allGroups=(MS.selectedGroups&&MS.selectedGroups.size)?MS.selectedGroups:new Set([MS.group,...MS.extraGroups].filter(Boolean));
    const seenEmails=new Set();
    const sendGenderPref=MS.genderPref||'either';
    const sendMyGender=S.gender||SESSION_PLAYER?.gender||'';
    let invitees=[];
    IC_MEMBERS.forEach(({player})=>{
      if(seenEmails.has(player.email)) return;
      if(!playerPassesGenderFilter(player, sendGenderPref, sendMyGender)) return;
      const ps=parseFloat(player.skill_level||0);
      const pLC=(player.email||'').toLowerCase();
      for(const g of allGroups){
        if(!g||g==='specific'||g==='group_subs') continue;
        if(g==='favorites'&&IC_FAVORITES.has(pLC)){ seenEmails.add(player.email); invitees.push(player); return; }
        if(g==='all'){ seenEmails.add(player.email); invitees.push(player); return; }
        if(g==='my_level'&&skills&&Math.abs(ps-skills.my)<0.13){ seenEmails.add(player.email); invitees.push(player); return; }
        if(g==='below'&&skills&&skills.below!==null&&Math.abs(ps-skills.below)<0.13){ seenEmails.add(player.email); invitees.push(player); return; }
        if(g==='above'&&skills&&skills.above!==null&&Math.abs(ps-skills.above)<0.13){ seenEmails.add(player.email); invitees.push(player); return; }
      }
    });
    // Group + Subs — primary and sub players (hand-picked, no gender filter)
    if(allGroups.has('group_subs')){
      IC_MEMBERS.forEach(({player})=>{
        const eLC=(player.email||'').toLowerCase();
        if(!seenEmails.has(player.email)&&(MS.primaryPlayers.has(eLC)||MS.subPlayers.has(eLC))){
          seenEmails.add(player.email);
          invitees.push({...player, _isSub: MS.subPlayers.has(eLC)});
        }
      });
    }
    if(allGroups.has('specific')){
      IC_MEMBERS.forEach(({player})=>{ const eLC=(player.email||'').toLowerCase(); if(!seenEmails.has(player.email)&&MS.specificPlayers.has(eLC)&&playerPassesGenderFilter(player,sendGenderPref,sendMyGender)){ seenEmails.add(player.email); invitees.push(player); } });
      // Also handle non-IC specific players (e.g. invited from Find Players)
      const outerSpecific = [...MS.specificPlayers].filter(e=>!seenEmails.has(e));
      if(outerSpecific.length && matchId){
        try{
          const oRes = await fetch(
            `${SUPABASE_URL}/rest/v1/registrations?email=in.(${outerSpecific.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name,last_name`,
            {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
          const oPros = oRes.ok ? await oRes.json() : [];
          const oMap = {}; oPros.forEach(p=>{oMap[p.email]=p;});
          outerSpecific.forEach(email=>{
            const p = oMap[email];
            const fn = p ? p.first_name : email.split('@')[0];
            seenEmails.add(email);
            invitees.push({email, first_name:fn||'', last_name:p?.last_name||''});
          });
        }catch(e){ console.warn('outer specific fetch failed:',e); }
      }
    }
    // Named group path — primary members from pre-cached roster (smFetchGroupRoster already ran)
    // MS.namedGroupRoster.primary: [{email, name}] — no additional DB fetch needed
    if(MS.group && MS.group.startsWith('named_') && MS.namedGroupRoster){
      const myEmailLC = myEmail.toLowerCase();
      for(const member of (MS.namedGroupRoster.primary || [])){
        if(!member.email || (member.email||'').toLowerCase() === myEmailLC) continue;
        if(!seenEmails.has(member.email)){
          seenEmails.add(member.email);
          invitees.push({ email: member.email, first_name: member.name, last_name: '' });
        }
      }
    }
    // Auto-add organizer as "in" — they created the match, they're playing
    if(matchId){
      await fetch(`${SUPABASE_URL}/rest/v1/match_responses`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
        body:JSON.stringify({match_id:matchId,player_email:myEmail,player_name:myName,response:'in'})
      }).catch(()=>{});
    }
    // Named group subs — insert pending rows for future dropout cascade; no invite email sent yet
    if(MS.group && MS.group.startsWith('named_') && MS.namedGroupRoster && matchId){
      const myEmailLC = myEmail.toLowerCase();
      for(const sub of (MS.namedGroupRoster.subs || [])){
        if(!sub.email || (sub.email||'').toLowerCase() === myEmailLC) continue;
        await fetch(`${SUPABASE_URL}/rest/v1/match_responses`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body:JSON.stringify({match_id:matchId,player_email:sub.email,player_name:sub.name+' (Sub)',response:'pending'})
        }).catch(()=>{});
      }
    }
    status.textContent='Sending to '+invitees.length+' players…';
    const dateStr=date?new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'';
    const timeStr=timeStart?fmt12(timeStart)+(timeEnd?' – '+fmt12(timeEnd):''):'';
    // Grab weather summary for email
    let weatherNote='';
    try{
      const wContent=document.getElementById('matchWeatherContent');
      if(wContent&&wContent.innerText&&!wContent.innerText.includes('Loading')&&!wContent.innerText.includes('unavailable')){
        weatherNote=' | Weather at game time: '+wContent.innerText.replace(/\n/g,' ').replace(/\s+/g,' ').trim();
      }
    }catch(e){}
    for(const player of invitees){
      const isSub = !!player._isSub;
      const playerName = ((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim();
      if(matchId) await fetch(`${SUPABASE_URL}/rest/v1/match_responses`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},body:JSON.stringify({match_id:matchId,player_email:player.email,player_name:playerName+(isSub?' (Sub)':''),response:'pending'})}).catch(()=>{});
      if(player.email){
        const matchUrl=window.location.origin+window.location.pathname+'?match='+matchId;
        const subNote = isSub ? ' · You are listed as a SUBSTITUTE — you may be called up if a primary player cannot make it.' : '';
        try{ await sendEmail({ to_email:player.email, type:'match_invite', personal_note:(MS.format==='doubles'?'Doubles':'Singles')+' · '+dateStr+' '+timeStr+(MS.courtName?' @ '+MS.courtName:'')+(note?' · Note: '+note:'')+weatherNote+subNote, invite_url:matchUrl, inviter_name:((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:'')).trim(), match_date_str:dateStr }); }
        catch(emailErr){ showToast('⚠️ Email failed for '+((player.first_name||player.email)),'#f59e0b'); console.warn('sendEmail failed:',player.email,emailErr); }
      }
    }
    // SMS invite loop — runs alongside email, best-effort, never blocks the flow.
    // Phone and sms_opt_in are fetched server-side per player so they never pass
    // through public_profiles or the client data model.
    const orgFirstName = (SESSION_PLAYER?.first_name || '').trim();
    for(const player of invitees){
      if(!player.email) continue;
      try{
        const smsDataRes = await fetch('/api/match-invite-sms-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerEmail: player.email })
        });
        const smsData = smsDataRes.ok ? await smsDataRes.json() : null;
        if(!smsData || !smsData.sms_opt_in || !smsData.phone || String(smsData.phone).replace(/\D/g,'').length !== 10) continue;
        const phone10 = String(smsData.phone).replace(/\D/g,'');
        // Insert invite tracking row so match-invite-respond can update status
        // by matching on match_id + invitee_phone (no invite_token used here).
        await fetch(`${SUPABASE_URL}/rest/v1/invites`, {
          method: 'POST',
          headers: {'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body: JSON.stringify({
            inviter_email: myEmail,
            inviter_name:  myName,
            invitee_email: player.email,
            invitee_phone: phone10,
            match_id:      matchId,
            invite_method: 'sms',
            invite_type:   'single',
            is_used:       false
          })
        }).catch(e => console.warn('invite row insert failed for', player.email, e.message));
        const tokenRes = await fetch('/api/match-invite-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: String(matchId),
            inviteePhone: phone10,
            inviteeName: (player.first_name || player.email || '').trim(),
            organizerEmail: myEmail
          })
        });
        const tokenData = tokenRes.ok ? await tokenRes.json() : null;
        if(!tokenData || !tokenData.url){ console.warn('match-invite-token failed for', player.email); continue; }
        const inviteUrl = window.location.origin + tokenData.url;
        const smsMsg = 'Hey ' + (player.first_name || '') + '! ' +
          orgFirstName + ' invited you to pickleball on ' +
          dateStr +
          (timeStart ? ' @ ' + fmt12(timeStart) : '') +
          (MS.courtName ? ' at ' + MS.courtName : '') +
          '. Tap to respond: ' + inviteUrl;
        try{
          await sendSms({ player_email: player.email, message: smsMsg, match_id: matchId, event_type: 'match_invite' });
          console.log('SMS match invite sent:', player.email);
        }catch(smsErr){ console.warn('SMS failed for', player.email, smsErr); }
      }catch(playerErr){ console.warn('SMS invite error for', player.email, playerErr); }
    }
    // Success: toast first, then navigate to dashboard
    showToast('🎾 Invites sent! Your match is set.','#4CAF7D');
    status.textContent='';
    btn.textContent='✅ Sent!';
    // Navigate immediately so toast overlays the dashboard.
    // Bypass the mid-wizard navigation guard — submit succeeded, wizard is done.
    _smAllowNavigation = true;
    showPage('dashboard');
    _smAllowNavigation = false;
    // Reload dashboard tile counts so the new match appears immediately
    const _dashEmail = myEmail;
    loadDashTileCounts(_dashEmail);
    setTimeout(()=>loadAllMatchBadges(), 500);
    // Pulse the My Match Invites tile after dashboard renders
    setTimeout(()=>{
      const tile = document.getElementById('dashMyInvitesTile');
      if(tile){
        tile.classList.add('tile-pulse');
        setTimeout(()=>tile.classList.remove('tile-pulse'), 2400);
      }
    }, 300);
  }catch(e){ status.textContent='⚠️ Error: '+e.message; btn.disabled=false; btn.textContent='🎾 Send Match Invite'; }
}

async function loadSentMatches(){
  const myEmail=getMyEmail();
  const list=document.getElementById('matchSentList');
  if(!list||!myEmail) return;
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&order=created_at.desc&limit=20`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches=res.ok?await res.json():[];
    const matchIds=matches.map(m=>m.id);
    let allResponses=[];
    if(matchIds.length){
      const rRes=await fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${matchIds.join(',')})&select=match_id,player_name,player_email,response`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      allResponses=rRes.ok?await rRes.json():[];
    }
    list.innerHTML='';
    if(!matches.length){
      list.innerHTML='<div style="color:var(--dim);font-size:13px;padding:12px 0;">No match invites sent yet.</div>';
      return;
    }

    const active = matches.filter(m=>!isMatchPast(m));
    const past   = matches.filter(m=>isMatchPast(m));

    const renderMatch = (m, isPast)=>{
      const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'—';
      const timeStr=m.time_start?fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):''):'—';
      const responses=allResponses.filter(r=>r.match_id===m.id);
      const inPlayers=responses.filter(r=>r.response==='in');
      const outPlayers=responses.filter(r=>r.response==='out');
      const waitlist=responses.filter(r=>r.response==='waitlist');
      const pending=responses.filter(r=>r.response==='pending');
      const maxNeeded=m.match_type==='doubles'?4:2;
      const statusColor=isPast?'#94a3b8':m.status==='open'?'var(--green)':m.status==='full'?'#fbbf24':'var(--dim)';

      const card=document.createElement('div');
      card.style.cssText='padding:12px 0;border-bottom:1px solid var(--border);'+(isPast?'opacity:0.6;':'');

      const hdr=document.createElement('div');
      hdr.style.cssText='display:flex;align-items:center;gap:12px;margin-bottom:6px;cursor:pointer;';
      hdr.innerHTML=
        '<span style="font-size:20px;">'+(m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>')+'</span>'+
        '<div style="flex:1;">'+
          '<div style="color:'+(isPast?'#94a3b8':'#fff')+';font-size:13px;font-weight:600;">'+(isPast?'<s>':'')+dateStr+' · '+timeStr+(isPast?'</s>':'')+'</div>'+
          '<div style="color:var(--dim);font-size:11px;">'+(m.court_name||'TBD')+(m.is_feeler?' · Feeler':'')+'</div>'+
        '</div>'+
        '<div style="text-align:right;">'+
          '<div style="font-size:11px;font-weight:700;color:'+statusColor+';">'+(isPast?'EXPIRED':m.status.toUpperCase())+'</div>'+
          '<div style="font-size:10px;color:var(--dim);">'+inPlayers.length+'/'+maxNeeded+' confirmed</div>'+
        '</div>';

      const detail=document.createElement('div');
      detail.style.cssText='display:none;margin-top:8px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid var(--border);';
      const makeGroup=(emoji,label,color,players)=>{
        if(!players.length) return '';
        return '<div style="margin-bottom:6px;"><div style="font-size:10px;font-weight:700;color:'+color+';text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">'+emoji+' '+label+' ('+players.length+')</div>'+
          '<div style="font-size:12px;color:#fff;line-height:1.8;">'+players.map(p=>p.player_name||p.player_email).join(' · ')+'</div></div>';
      };
      detail.innerHTML=
        makeGroup('✅','In','var(--green)',inPlayers)+
        makeGroup('⏳','Pending','#94a3b8',pending)+
        makeGroup('⌛','Waitlist','#f59e0b',waitlist)+
        makeGroup('❌','Out','#f87171',outPlayers)||
        '<div style="color:var(--dim);font-size:12px;">No responses yet.</div>';

      let isOpen=false;
      hdr.onclick=()=>{ isOpen=!isOpen; detail.style.display=isOpen?'block':'none'; };
      card.appendChild(hdr);
      card.appendChild(detail);
      list.appendChild(card);
    };

    if(active.length){
      const h=document.createElement('div');
      h.style.cssText='font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.08em;padding:4px 0 8px;';
      h.textContent='Active ('+active.length+')';
      list.appendChild(h);
      active.forEach(m=>renderMatch(m,false));
    }
    if(past.length){
      const h=document.createElement('div');
      h.style.cssText='font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;padding:12px 0 8px;border-top:1px solid var(--border);margin-top:4px;';
      h.textContent='Past Matches ('+past.length+')';
      list.appendChild(h);
      past.forEach(m=>renderMatch(m,true));
    }
  }catch(e){ console.warn('loadSentMatches error:',e); }
}

// ── Match squares counter ───────────────────────────────
async function loadMatchSquareCounts(){
  const myEmail=getMyEmail();
  if(!myEmail) return;
  try{
    // My matches — split confirmed (full) vs pending (open)
    const myRes=await fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=neq.cancelled&select=id,status,max_players,match_date,time_start,time_end`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const myMatches=myRes.ok?await myRes.json():[];
    // Only count future matches
    const myFuture    = myMatches.filter(m=>!isMatchPast(m));
    const myConfirmed = myFuture.filter(m=>m.status==='full').length;
    const myPending   = myFuture.filter(m=>m.status==='open').length;
    const setEl=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    setEl('matchSquareMyConfirmed', myConfirmed);
    setEl('matchSquareMyCount',     myPending);

    // Nav badge — only open future matches
    updateMatchBadge('myInvitesBadge', myPending, 'rgba(239,68,68,0.85)');

    // Invited to — fetch only PENDING (unanswered) responses from non-self-organized matches
    const invRes=await fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.pending&select=match_id`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const invRows=invRes.ok?await invRes.json():[];
    // Also fetch confirmed (response=in) for the "confirmed" square
    const inRes=await fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const inRows=inRes.ok?await inRes.json():[];
    let invOpen=0, invConfirmed=0;
    if(invRows.length){
      const pendIds=invRows.map(r=>r.match_id);
      const mRes=await fetch(`${SUPABASE_URL}/rest/v1/matches?id=in.(${pendIds.join(',')})&status=neq.cancelled&select=id,status,match_date,time_start,time_end,organizer_email`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const pendMatches=mRes.ok?await mRes.json():[];
      invOpen=pendMatches.filter(m=>!isMatchPast(m)&&(m.organizer_email||'').toLowerCase()!==myEmail.toLowerCase()).length;
    }
    if(inRows.length){
      const inIds=inRows.map(r=>r.match_id);
      const mRes=await fetch(`${SUPABASE_URL}/rest/v1/matches?id=in.(${inIds.join(',')})&select=id,status,match_date,time_start,time_end,organizer_email`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const inMatches=mRes.ok?await mRes.json():[];
      invConfirmed=inMatches.filter(m=>!isMatchPast(m)&&(m.organizer_email||'').toLowerCase()!==myEmail.toLowerCase()).length;
    }
    setEl('matchSquareInvitedCount',     invOpen);
    setEl('matchSquareInvitedConfirmed', invConfirmed);
    // NOTE: Nav/top badges are set exclusively by loadAllMatchBadges — do NOT set them here
    // to avoid a race condition where this slower function overwrites the correct count.

  }catch(e){ console.warn('loadMatchSquareCounts error:',e); }
}

// ── My Match Invites page ────────────────────────────────
// ══════════════════════════════════════════════════════
// CONFIRMED MATCHES + RECORD/VIEW SCORES
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// OUTER CIRCLE
// ══════════════════════════════════════════════════════

async function fetchPlayerStats(emails){
  // Returns reliability % and conduct % per player
  if(!emails.length) return {};
  try{
    // Reliability: matches they committed to vs actually played
    const mrRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?player_email=in.(${emails.map(e=>encodeURIComponent(e)).join(',')})&select=player_email,response,actually_played,cancelled_at`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const responses = mrRes.ok ? await mrRes.json() : [];

    // Conduct: feedback from matches
    const fbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_feedback?reviewed_email=in.(${emails.map(e=>encodeURIComponent(e)).join(',')})&select=reviewed_email,would_play_again`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const feedback = fbRes.ok ? await fbRes.json() : [];

    const stats = {};
    emails.forEach(email=>{
      const myResps = responses.filter(r=>r.player_email===email);
      const committed = myResps.filter(r=>r.response==='in').length;
      const played = myResps.filter(r=>r.actually_played===true).length;
      const cancelled = myResps.filter(r=>r.cancelled_at).length;

      const myFeedback = feedback.filter(f=>f.reviewed_email===email);
      const positive = myFeedback.filter(f=>f.would_play_again).length;

      stats[email] = {
        reliability: committed>=3 ? Math.round((committed-cancelled)/committed*100) : null,
        conduct: myFeedback.length>=3 ? Math.round(positive/myFeedback.length*100) : null,
        matchCount: committed
      };
    });
    return stats;
  }catch(e){ return {}; }
}


// Holds a pre-selected player to inject after initSetupMatch resets MS
let _pendingMatchInvitee = null;



// ── Post-Match Feedback Prompt ─────────────────────────
async function showPostMatchFeedback(matchId, players){
  // Called after a match is marked complete
  // Ask for quick thumbs up/down on each co-player
  const myEmail = getMyEmail();
  if(!myEmail || !players.length) return;
  const others = players.filter(p=>p.player_email!==myEmail);
  if(!others.length) return;

  // Check if already reviewed this match
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/player_feedback?match_id=eq.${matchId}&reviewer_email=eq.${encodeURIComponent(myEmail)}&select=id&limit=1`,
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
  const existing = checkRes.ok ? await checkRes.json() : [];
  if(existing.length) return; // Already reviewed

  const overlay = document.createElement('div');
  overlay.id = 'postMatchFeedbackOverlay';
  overlay.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:800;background:#0a1a0d;border-top:2px solid rgba(76,175,125,0.4);padding:20px 20px 40px;box-shadow:0 -8px 32px rgba(0,0,0,0.7);';

  let currentIdx = 0;

  function renderFeedback(){
    if(currentIdx >= others.length){ overlay.remove(); return; }
    const player = others[currentIdx];
    const firstName = (player.player_name||player.player_email||'').split(' ')[0];

    overlay.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'+
        '<div style="font-size:15px;font-weight:800;color:#fff;">How was playing with '+firstName+'?</div>'+
        '<button onclick="document.getElementById(\'postMatchFeedbackOverlay\').remove()" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:20px;">&#10005;</button>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--dim);margin-bottom:16px;">Your feedback is private — it helps others know what to expect. '+(currentIdx+1)+' of '+others.length+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">'+
        '<button onclick="submitFeedback(\''+matchId+'\',\''+player.player_email+'\',true)" '+
          'style="padding:14px;border-radius:12px;border:none;background:rgba(76,175,125,0.15);border:1px solid rgba(76,175,125,0.4);color:var(--green);font-size:22px;cursor:pointer;">'+
          '&#128522;<div style="font-size:12px;font-weight:700;margin-top:4px;">Great — would play again</div>'+
        '</button>'+
        '<button onclick="submitFeedback(\''+matchId+'\',\''+player.player_email+'\',false)" '+
          'style="padding:14px;border-radius:12px;border:none;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;font-size:22px;cursor:pointer;">'+
          '&#128528;<div style="font-size:12px;font-weight:700;margin-top:4px;">Had some concerns</div>'+
        '</button>'+
      '</div>'+
      '<button onclick="skipFeedback()" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--dim);font-size:12px;cursor:pointer;">Skip for now</button>';
  }

  window.submitFeedback = async(matchId, reviewedEmail, wouldPlayAgain)=>{
    try{
      await fetch(`${SUPABASE_URL}/rest/v1/player_feedback`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
        body:JSON.stringify({match_id:matchId,reviewer_email:myEmail,reviewed_email:reviewedEmail,would_play_again:wouldPlayAgain})
      });
    }catch(e){}
    currentIdx++;
    if(currentIdx >= others.length){
      overlay.remove();
      showToast('Thanks for your feedback!','#4CAF7D');
    } else {
      renderFeedback();
    }
  };

  window.skipFeedback = ()=>{
    currentIdx++;
    if(currentIdx >= others.length){ overlay.remove(); return; }
    renderFeedback();
  };

  document.body.appendChild(overlay);
  renderFeedback();
}

// Trigger post-match feedback when recording scores
function maybeShowPostMatchFeedback(matchId){
  // Fetch confirmed players for this match and show feedback prompt
  fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email,player_name`,
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    .then(r=>r.json())
    .then(players=>{ setTimeout(()=>showPostMatchFeedback(matchId, players), 1500); })
    .catch(()=>{});
}

async function loadConfirmedMatches(){
  const myEmail = getMyEmail();
  const container = document.getElementById('confirmedMatchesList');
  if(!container) return;
  if(!myEmail){ container.innerHTML='<div style="color:var(--dim);padding:20px;">Please sign in.</div>'; return; }
  container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:20px 0;">Loading...</div>';
  try{
    const [orgRes, respRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=eq.full&or=(is_walk_on.is.null,is_walk_on.eq.false)&order=match_date.asc,time_start.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const orgMatches = orgRes.ok ? await orgRes.json() : [];
    const myResponses = respRes.ok ? await respRes.json() : [];
    let invitedMatches = [];
    if(myResponses.length){
      const ids = myResponses.map(r=>r.match_id);
      const imRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&status=eq.full&or=(is_walk_on.is.null,is_walk_on.eq.false)&order=match_date.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      invitedMatches = imRes.ok ? await imRes.json() : [];
    }
    const allIds = new Set();
    let allMatches = [...orgMatches,...invitedMatches].filter(m=>{
      if(allIds.has(m.id)) return false; allIds.add(m.id); return !isMatchPast(m);
    });
    if(!allMatches.length){
      updateConfirmedBadge(0);
      container.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--dim);font-size:14px;">No confirmed upcoming matches yet.<br><br>'+
        '<button onclick="showPage(&quot;setupMatch&quot;)" style="padding:10px 22px;border-radius:10px;border:none;background:var(--green);color:var(--dark);font-weight:700;cursor:pointer;font-size:13px;">Set Up A Match</button></div>';
      return;
    }
    const matchIds = allMatches.map(m=>m.id);
    // Fetch ALL responses (in + waitlist) so we can split them properly
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${matchIds.join(',')})&response=in.(in,waitlist)&select=match_id,player_name,player_email,response`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const responses = rRes.ok ? await rRes.json() : [];
    // Verify each match actually has enough confirmed players — status=full can be stale
    allMatches = allMatches.filter(m=>{
      const needed = m.max_players || (m.match_type==='doubles'?4:2);
      const confirmed = responses.filter(r=>r.match_id===m.id&&r.response==='in').length;
      return confirmed >= needed;
    });
    updateConfirmedBadge(allMatches.length, allMatches);
    container.innerHTML='';
    if(!allMatches.length){
      container.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--dim);font-size:14px;">No confirmed upcoming matches yet.<br><br>'+
        '<button onclick="showPage(&quot;setupMatch&quot;)" style="padding:10px 22px;border-radius:10px;border:none;background:var(--green);color:var(--dark);font-weight:700;cursor:pointer;font-size:13px;">Set Up A Match</button></div>';
      return;
    }
    // Fetch court lat/lon for weather
    const courtIds = allMatches.map(m=>m.court_id).filter(Boolean);
    let courtData = {};
    if(courtIds.length){
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/courts?id=in.(${courtIds.map(id=>encodeURIComponent(id)).join(',')})&select=id,name,address,lat,lon,indoor`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const courts = cRes.ok ? await cRes.json() : [];
      courts.forEach(co=>{ courtData[co.id]=co; });
    }
    for(const m of allMatches){
      const dateStr = m.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : '-';
      const timeStr = m.time_start ? fmt12(m.time_start)+(m.time_end?' - '+fmt12(m.time_end):'') : '-';
      const maxNeeded = m.max_players || (m.match_type==='doubles'?4:2);
      const allResps = responses.filter(r=>r.match_id===m.id);
      const inPlayers = allResps.filter(r=>r.response==='in');
      const waitlist  = allResps.filter(r=>r.response==='waitlist');
      const _today = new Date(); _today.setHours(0,0,0,0);
      const daysUntil = m.match_date ? Math.round((new Date(m.match_date+'T00:00') - _today)/(1000*60*60*24)) : null;
      const urgency = daysUntil===0?'TODAY':daysUntil===1?'TOMORROW':daysUntil!=null?'In '+daysUntil+' days':'';
      const isOutdoor = !m.is_private_court;

      function nameChip(p, color, borderColor, isOrg){
        const rawName=p.player_name||'';
        const firstName=rawName.split(' ')[0]||(p.player_email||'').split('@')[0].replace(/[+_.]/g,' ').split(' ')[0];
        const chipClass=isOrg?' class="avatar-organizer"':'';
        const bg=isOrg?'#dc2626':color;
        const bc=isOrg?'#dc2626':borderColor;
        const chip='<span'+chipClass+' style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;'+
          'background:'+bg+';border:2px solid '+bc+';font-size:12px;color:#fff;font-weight:700;">'+firstName+'</span>';
        if(isOrg) return '<div style="display:inline-flex;flex-direction:column;align-items:center;margin:2px;">'+chip+'<span class="avatar-organizer-label">Match Organizer</span></div>';
        return '<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;'+
          'background:'+color+';border:2px solid '+borderColor+';font-size:12px;color:#fff;font-weight:700;margin:2px;">'+firstName+'</span>';
      }

      const orgEmailLower=(m.organizer_email||'').toLowerCase();
      const inChips = inPlayers.map(p=>nameChip(p,'#1a7a3a','#1a7a3a',(p.player_email||'').toLowerCase()===orgEmailLower)).join('');
      const waitChips = waitlist.map((p,i)=>nameChip(p,'#b45309','#b45309')+
        '<span style="font-size:9px;color:#fbbf24;vertical-align:middle;margin-left:-4px;margin-right:4px;">#'+(i+1)+'</span>').join('');

      // Resolve court name — match field first, then courts table lookup
      const courtLookup = courtData[m.court_id] || {};
      const resolvedCourtName = (m.court_name && m.court_name.trim() && m.court_name.toLowerCase()!=='tbd')
        ? m.court_name.trim()
        : (courtLookup.name || '').trim() || '';
      const resolvedCourtAddr = (m.court_address || '').trim() || (courtLookup.address || '').trim();

      const court = courtData[m.court_id];
      // Show weather if we have court coords OR player location as fallback
      const weatherLat = court?.lat || S.addrLat || SESSION_PLAYER?.lat;
      const weatherLon = court?.lon || S.addrLon || SESSION_PLAYER?.lon;
      const showWeather = m.match_date && weatherLat;
      const mapsBase = 'https://www.google.com/maps/search/?api=1&query=';
      const directionsUrl = resolvedCourtAddr ? mapsBase+encodeURIComponent(resolvedCourtAddr)
        : resolvedCourtName ? mapsBase+encodeURIComponent(resolvedCourtName) : null;

      const isOrganizer = (m.organizer_email||'').toLowerCase() === myEmail.toLowerCase();
      // FIX 3: In Progress detection for confirmed matches
      const _now = new Date();
      const _mStart = m.match_date && m.time_start ? new Date(m.match_date+'T'+m.time_start) : null;
      const _mEnd   = m.match_date && m.time_end   ? new Date(m.match_date+'T'+m.time_end)   : null;
      const inProgress = _mStart && _mEnd && _now >= _mStart && _now <= _mEnd;
      const card = document.createElement('div');
      card.style.cssText=(inProgress
        ? 'background:#f0fdf4;border:3px solid #16a34a;'
        : 'background:#ffffff;border:2px solid #1a7a3a;')
        +'border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(26,122,58,0.1);';
      card.innerHTML=
        // Header
        '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;">'+
          '<span style="font-size:24px;">'+(m.match_type==='doubles'?'<img src="icon-192.png" class="pb-icon" alt="pickleball"/><img src="icon-192.png" class="pb-icon" alt="pickleball"/>':'<img src="icon-192.png" class="pb-icon" alt="pickleball"/>')+'</span>'+
          '<div style="flex:1;">'+
            '<div style="color:#1a7a3a;font-size:15px;font-weight:700;">'+dateStr+'</div>'+
            '<div style="color:#555;font-size:12px;font-weight:600;">'+timeStr+'</div>'+
            renderCountdown(m.match_date,m.time_start)+
            (isOrganizer?'<div style="font-size:11px;color:#1a7a3a;font-weight:700;margin-top:2px;">Organized by '+(((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:'')).trim()||'You')+' &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>':
              '<div style="font-size:10px;color:#555;font-weight:600;margin-top:2px;">Organized by '+((m.organizer_name||'').split(' ')[0]||'Unknown')+' &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>')+
          '</div>'+
          (inProgress?'<div style="display:flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;background:#d1fae5;border:2px solid #16a34a;color:#166534;font-size:10px;font-weight:800;white-space:nowrap;"><span class="pb-pulse-green"></span>In Progress</div>':
            urgency==='TODAY'||urgency==='TOMORROW'?'<div style="padding:3px 10px;border-radius:999px;background:#fee2e2;border:2px solid #dc2626;color:#dc2626;font-size:10px;font-weight:800;white-space:nowrap;">'+urgency+'</div>':
            urgency?'<div style="padding:3px 10px;border-radius:999px;background:#d1fae5;border:2px solid #1a7a3a;color:#1a7a3a;font-size:10px;font-weight:800;white-space:nowrap;">'+urgency+'</div>':'')+
        '</div>'+
        // Court row
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #d1fae5;border-radius:10px;margin-bottom:10px;">'+
          '<div style="display:flex;align-items:center;gap:8px;">'+
            '<span style="font-size:16px;">'+(isOutdoor?'&#127795;':'&#127970;')+'</span>'+
            '<div>'+
              '<div style="font-size:13px;color:#111;font-weight:600;">'+(resolvedCourtName||'Court TBD')+'</div>'+
              (resolvedCourtAddr?'<div style="font-size:11px;color:#555;">'+resolvedCourtAddr+'</div>':'')+
            '</div>'+
          '</div>'+
          (directionsUrl?'<a href="'+directionsUrl+'" target="_blank" style="padding:5px 12px;border-radius:8px;border:2px solid #1a7a3a;color:#1a7a3a;background:#f0fdf4;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">&#128205; Directions</a>':'')+
        '</div>'+
        // Weather placeholder
        (showWeather?'<div id="weather-'+m.id+'" style="padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:10px;font-size:12px;color:#555;">Loading forecast...</div>':'')+
        // Players In
        '<div style="border-top:2px solid #e5e7eb;padding-top:10px;">'+
          '<div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">'+
            'In the Match ('+inPlayers.length+'/'+maxNeeded+')'+
          '</div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:'+(waitlist.length?'10':'0')+'px;">'+
            (inChips||'<span style="color:var(--dim);font-size:12px;">No confirmed players yet</span>')+
          '</div>'+
          // Waitlist
          (waitlist.length?
            '<div style="font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">'+
              'Waitlist ('+waitlist.length+')'+
            '</div>'+
            '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">'+waitChips+'</div>'
          : '')+
        '</div>';
      // Populate cache for Can't Make It flow
      window._cmCache = window._cmCache || {};
      window._cmCache[m.id] = {
        dateStr: dateStr,
        timeStr: timeStr,
        courtName: resolvedCourtName || 'Court TBD',
        organizerName: m.organizer_name || 'Unknown',
        organizerEmail: m.organizer_email || '',
        maxPlayers: maxNeeded,
        matchDateTime: _mStart ? _mStart.getTime() : null
      };
      // Organizer-only actions
      if(isOrganizer){
        const actRow = document.createElement('div');
        actRow.style.cssText='display:flex;gap:8px;margin-top:12px;padding-top:10px;border-top:2px solid #e5e7eb;flex-wrap:wrap;';
        actRow.innerHTML=
          '<button onclick="openEditMatchModal(this.dataset.id)" data-id="'+m.id+'" '+
            'style="flex:1;padding:8px 12px;border-radius:8px;border:2px solid #1a7a3a;background:#d1fae5;color:#1a7a3a;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">'+
            '&#9998; Edit Match</button>'+
          '<button onclick="openUninviteModal(this.dataset.id,this.dataset.type)" data-id="'+m.id+'" data-type="'+m.match_type+'" '+
            'style="flex:1;padding:8px 12px;border-radius:8px;border:2px solid #dc2626;background:#fff1f2;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">'+
            '&#10005; Remove Player</button>';
        card.appendChild(actRow);
        // Emergency Fill button — shown when roster has open spots
        if(inPlayers.length < maxNeeded){
          const efRow = document.createElement('div');
          efRow.style.cssText = 'margin-top:8px;';
          efRow.innerHTML =
            '<button onclick="window.showEmergencyFill(\''+m.id+'\',null)" '+
              'style="width:100%;padding:9px 12px;border-radius:8px;border:2px solid #dc2626;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;">'+
              '&#128680; Emergency Fill — '+inPlayers.length+'/'+maxNeeded+' confirmed'+
            '</button>';
          card.appendChild(efRow);
        }
      } else if(!inProgress){
        // Non-organizer: show Can't Make It button
        const dropRow = document.createElement('div');
        dropRow.style.cssText='margin-top:10px;padding-top:10px;border-top:2px solid #e5e7eb;';
        dropRow.innerHTML='<button onclick="window.cantMakeIt(\''+m.id+'\')" '+
          'style="padding:7px 14px;border-radius:8px;border:1.5px solid #dc2626;background:transparent;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">'+
          '&#10006; Can\'t Make It'+
        '</button>';
        card.appendChild(dropRow);
      }
      container.appendChild(card);
      if(showWeather) loadConfirmedMatchWeather(m.id, m.match_date, weatherLat, weatherLon);
    }
  }catch(e){
    container.innerHTML='<div style="color:#f87171;font-size:13px;">Error: '+e.message+'</div>';
  }
}

async function openEditMatchModal(matchId){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=*&limit=1`,
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
  const rows = res.ok ? await res.json() : [];
  const m = rows[0]; if(!m) return;

  const overlay = document.createElement('div');
  overlay.id = 'editMatchOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;';

  const courtVal = m.court_name&&m.court_name!=='TBD' ? m.court_name : '';
  const noteVal  = m.notes||'';

  overlay.innerHTML=
    '<div style="background:#ffffff;border:2px solid #1a7a3a;border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-width:520px;max-height:85vh;overflow-y:auto;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'+
        '<div style="font-size:16px;font-weight:800;color:#111;">&#9998; Edit Match</div>'+
        '<button onclick="document.getElementById(&quot;editMatchOverlay&quot;).remove()" style="background:none;border:none;color:#6b7280;font-size:20px;cursor:pointer;">&#10005;</button>'+
      '</div>'+
      '<div style="display:grid;gap:12px;">'+
        '<div>'+
          '<label style="font-size:11px;font-weight:700;color:#1a5c32;text-transform:uppercase;letter-spacing:.06em;">Date</label>'+
          '<input id="emDate" type="date" value="'+(m.match_date||'')+'" style="width:100%;margin-top:4px;background:#f9fafb;border:2px solid #9ca3af;border-radius:8px;padding:10px 12px;color:#111;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"/>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
          '<div>'+
            '<label style="font-size:11px;font-weight:700;color:#1a5c32;text-transform:uppercase;letter-spacing:.06em;">Start Time</label>'+
            '<input id="emTimeStart" type="time" value="'+(m.time_start||'')+'" style="width:100%;margin-top:4px;background:#f9fafb;border:2px solid #9ca3af;border-radius:8px;padding:10px 12px;color:#111;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"/>'+
          '</div>'+
          '<div>'+
            '<label style="font-size:11px;font-weight:700;color:#1a5c32;text-transform:uppercase;letter-spacing:.06em;">End Time</label>'+
            '<input id="emTimeEnd" type="time" value="'+(m.time_end||'')+'" style="width:100%;margin-top:4px;background:#f9fafb;border:2px solid #9ca3af;border-radius:8px;padding:10px 12px;color:#111;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"/>'+
          '</div>'+
        '</div>'+
        '<div>'+
          '<label style="font-size:11px;font-weight:700;color:#1a5c32;text-transform:uppercase;letter-spacing:.06em;">Court / Venue</label>'+
          '<select id="emCourtSelect" style="width:100%;margin-top:4px;background:#f9fafb;border:2px solid #9ca3af;border-radius:8px;padding:10px 12px;color:#111;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">'+
            '<option value="">Loading your courts…</option>'+
          '</select>'+
          '<input id="emCourt" type="text" value="'+courtVal.replace(/"/g,'&quot;')+'" placeholder="Or type a court name / address manually" style="width:100%;margin-top:6px;background:#f9fafb;border:2px solid #9ca3af;border-radius:8px;padding:10px 12px;color:#111;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;"/>'+
          '<div style="font-size:10px;color:#6b7280;margin-top:4px;">Select from dropdown OR type manually — whichever you fill in last wins.</div>'+
        '</div>'+
        '<div>'+
          '<label style="font-size:11px;font-weight:700;color:#1a5c32;text-transform:uppercase;letter-spacing:.06em;">Note to Players</label>'+
          '<textarea id="emNote" rows="2" placeholder="Court changed due to weather — meet on Court 3!" style="width:100%;margin-top:4px;background:#f9fafb;border:2px solid #9ca3af;border-radius:8px;padding:10px 12px;color:#111;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;resize:vertical;">'+noteVal+'</textarea>'+
        '</div>'+
        '<div style="background:#fef9e7;border:2px solid #b45309;border-radius:10px;padding:10px 12px;">'+
          '<div style="font-size:12px;color:#b45309;font-weight:700;margin-bottom:3px;">&#9888;&#65039; Changes notify all confirmed players</div>'+
          '<div style="font-size:11px;color:#555;line-height:1.5;">Players will receive updated details and be asked to re-confirm.</div>'+
        '</div>'+
        '<button onclick="saveMatchEdits(this.dataset.id)" data-id="'+matchId+'" style="width:100%;padding:14px;border-radius:12px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">Save &amp; Notify Players</button>'+
        '<button onclick="cancelMatch(\''+matchId+'\')" style="width:100%;padding:11px;border-radius:12px;border:2px solid #dc2626;background:#fff1f2;color:#dc2626;font-weight:700;font-size:13px;cursor:pointer;margin-top:4px;">🗑 Cancel This Match</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  // Populate courts dropdown from player's saved courts
  (async ()=>{
    const sel = document.getElementById('emCourtSelect');
    if(!sel) return;
    try{
      const myEmail = getMyEmail();
      const pcRes = await fetch(`${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const pcRows = pcRes.ok ? await pcRes.json() : [];
      const courtIds = pcRows.map(r=>r.court_id).filter(Boolean);
      if(!courtIds.length){ sel.innerHTML='<option value="">No saved courts — type manually below</option>'; return; }
      const cRes = await fetch(`${SUPABASE_URL}/rest/v1/courts?id=in.(${courtIds.join(',')})&select=id,name,address&order=name.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const courts = cRes.ok ? await cRes.json() : [];
      sel.innerHTML = '<option value="">— Select from My Courts —</option>';
      courts.forEach(co=>{
        const opt = document.createElement('option');
        opt.value = co.name;
        opt.dataset.address = co.address||'';
        opt.textContent = co.name+(co.address?' · '+co.address:'');
        if(co.name === courtVal) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = ()=>{
        const opt = sel.options[sel.selectedIndex];
        const txt = document.getElementById('emCourt');
        if(opt && opt.value && txt){
          txt.value = opt.value;
          txt.dataset.address = opt.dataset.address||'';
        }
      };
      // If courtVal matches a saved court, trigger the onchange to sync text field
      if(courtVal && courts.find(co=>co.name===courtVal)) sel.onchange();
    }catch(e){ sel.innerHTML='<option value="">Could not load courts — type manually</option>'; }
  })();
}

async function saveMatchEdits(matchId){
  const date      = document.getElementById('emDate')?.value||'';
  const timeStart = document.getElementById('emTimeStart')?.value||'';
  const timeEnd   = document.getElementById('emTimeEnd')?.value||'';
  const courtEl   = document.getElementById('emCourt');
  const courtName = (courtEl?.value||'').trim();
  const courtAddr = (courtEl?.dataset?.address||'').trim();
  const note      = (document.getElementById('emNote')?.value||'').trim();
  const saveBtn   = document.querySelector('#editMatchOverlay button[data-id]');
  if(saveBtn){ saveBtn.disabled=true; saveBtn.textContent='Saving...'; }
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify(Object.fromEntries(Object.entries({
        match_date:date, time_start:timeStart, time_end:timeEnd,
        court_name:courtName||'TBD', court_address:courtAddr||null, notes:note||null
      }).filter(([,v])=>v!==''&&v!==null)))
    });
    // Notify confirmed players
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email,player_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const players = rRes.ok ? await rRes.json() : [];
    const myEmail = getMyEmail(); const myName = getMyName();
    const dateStr = date?new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}):'';
    const timeStr = timeStart?fmt12(timeStart)+(timeEnd?' – '+fmt12(timeEnd):''):'';
    const matchUrl= window.location.origin+window.location.pathname+'?match='+matchId;
    for(const p of players){
      if((p.player_email||'').toLowerCase()===myEmail.toLowerCase()) continue;
      sendEmail({ to_email:p.player_email, type:'match_update', personal_note:myName+' updated your match: '+dateStr+(timeStr?' at '+timeStr:'')+(courtName?' @ '+courtName:'')+(note?' — '+note:'')+'. Please re-confirm your availability.', invite_url:matchUrl });
    }
    document.getElementById('editMatchOverlay')?.remove();
    showToast('Match updated! Players notified.','#4CAF7D');
    // Refresh whichever page is active
    loadConfirmedMatches();
    loadMyInvitesPage();
    loadDashboard();
  }catch(e){
    showToast('Could not save: '+e.message,'#f87171');
    if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='Save & Notify Players'; }
  }
}

async function cancelMatch(matchId){
  if(!confirm('Cancel this match? All invited players will be notified by email.')) return;

  const overlay = document.getElementById('editMatchOverlay');
  const btn = overlay?.querySelector('button[onclick*="cancelMatch"]');
  if(btn){ btn.disabled=true; btn.textContent='Cancelling…'; }

  try{
    // Get all players who were invited (in + pending)
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=in.(in,pending)&select=player_email,player_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const players = rRes.ok ? await rRes.json() : [];

    // Get match details for the email
    const mRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=match_date,time_start,match_type,court_name&limit=1`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches = mRes.ok ? await mRes.json() : [];
    const m = matches[0];
    const dateStr = m?.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : 'upcoming';
    const timeStr = m?.time_start ? fmt12(m.time_start) : '';
    const myName = getMyName();
    const myEmail = getMyEmail();

    // Mark match as cancelled in DB
    await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({status:'cancelled'})
    });

    // Notify all players
    for(const p of players){
      if((p.player_email||'').toLowerCase()===myEmail.toLowerCase()) continue;
      sendEmail({
        to_email: p.player_email,
        type: 'match_update',
        personal_note: myName+' has cancelled the '+( m?.match_type==='doubles'?'Doubles':'Singles')+' match scheduled for '+dateStr+(timeStr?' at '+timeStr:'')+(m?.court_name&&m.court_name!=='TBD'?' @ '+m.court_name:'')+'. We hope to see you on the courts soon! 🏓',
        invite_url: window.location.origin,
      });
    }

    overlay?.remove();
    showToast('Match cancelled — players notified.','#6b7280');
    loadConfirmedMatches();
    loadMyInvitesPage();
    loadDashboard();

  }catch(e){
    showToast('Could not cancel: '+e.message,'#f87171');
    if(btn){ btn.disabled=false; btn.textContent='🗑 Cancel This Match'; }
  }
}


async function openUninviteModal(matchId, matchType){
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email,player_name`,
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
  const players = res.ok ? await res.json() : [];
  const myEmail = getMyEmail();
  const others  = players.filter(p=>(p.player_email||'').toLowerCase()!==myEmail.toLowerCase());
  if(!others.length){ showToast('No other players to remove','#f59e0b'); return; }

  const overlay = document.createElement('div');
  overlay.id = 'uninviteOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;';
  const rows = others.map(p=>{
    const safeEmail = (p.player_email||'').replace(/'/g,"\'");
    const safeName  = (p.player_name||p.player_email||'').split(' ')[0].replace(/'/g,"\'");
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">'+
      '<span style="color:#fff;font-size:14px;font-weight:600;">'+(p.player_name||p.player_email)+'</span>'+
      '<button onclick="confirmUninvite(this.dataset.mid,this.dataset.email,this.dataset.name)" '+
        'data-mid="'+matchId+'" data-email="'+p.player_email.replace(/"/g,'&quot;')+'" data-name="'+safeName.replace(/"/g,'&quot;')+'" '+
        'style="padding:6px 14px;border-radius:8px;border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.08);color:#f87171;font-size:12px;font-weight:700;cursor:pointer;">'+
        'Remove</button>'+
    '</div>';
  }).join('');
  overlay.innerHTML=
    '<div style="background:#0f1f12;border:1px solid rgba(239,68,68,0.3);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-width:520px;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'+
        '<div style="font-size:16px;font-weight:800;color:#fff;">Remove a Player</div>'+
        '<button onclick="document.getElementById(&quot;uninviteOverlay&quot;).remove()" style="background:none;border:none;color:var(--dim);font-size:20px;cursor:pointer;">&#10005;</button>'+
      '</div>'+rows+
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

async function confirmUninvite(matchId, playerEmail, playerName){
  try{
    await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&player_email=eq.${encodeURIComponent(playerEmail)}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({response:'out'})
    });
    await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({status:'open'})
    });
    document.getElementById('uninviteOverlay')?.remove();
    showToast(playerName+' removed from the match','#f59e0b');
    loadConfirmedMatches();
    loadAllMatchBadges();
  }catch(e){ showToast('Could not remove: '+e.message,'#f87171'); }
}

async function loadConfirmedMatchWeather(matchId, date, lat, lon){
  const el = document.getElementById('weather-'+matchId);
  if(!el) return;
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`+
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode`+
      `&temperature_unit=fahrenheit&windspeed_unit=mph&forecast_days=14&timezone=America%2FNew_York`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Weather unavailable');
    const data = await res.json();
    const idx = data.daily.time.indexOf(date);
    if(idx<0){ el.textContent='Forecast not available for this date'; return; }
    const code=data.daily.weathercode[idx],high=Math.round(data.daily.temperature_2m_max[idx]);
    const low=Math.round(data.daily.temperature_2m_min[idx]),precip=data.daily.precipitation_probability_max[idx];
    const wind=Math.round(data.daily.windspeed_10m_max[idx]);
    const emoji=getWeatherEmoji(code),desc=getWeatherDesc(code);
    const windLevel=wind<10?'Calm':wind<20?'Breezy':wind<30?'Windy':'Very Windy';
    const precipColor=precip<20?'#1a7a3a':precip<50?'#b45309':'#dc2626';
    const windColor=wind<10?'#1a7a3a':wind<20?'#b45309':'#dc2626';
    el.innerHTML=
      '<div style="display:flex;align-items:center;gap:10px;">'+
        '<span style="font-size:28px;">'+emoji+'</span>'+
        '<div style="flex:1;">'+
          '<div style="color:#111;font-size:13px;font-weight:600;">'+desc+' · '+high+'°F / '+low+'°F</div>'+
          '<div style="display:flex;gap:12px;margin-top:3px;flex-wrap:wrap;">'+
            '<span style="font-size:11px;color:'+precipColor+';">Rain: '+precip+'%</span>'+
            '<span style="font-size:11px;color:'+windColor+';">Wind: '+wind+' mph ('+windLevel+')</span>'+
          '</div>'+
        '</div>'+
      '</div>'+
      (precip>=50?'<div style="margin-top:6px;font-size:11px;color:#dc2626;background:#fff1f2;border:1px solid #fca5a5;border-radius:6px;padding:5px 8px;">☔ High rain chance — consider an indoor backup</div>':'')+
      (wind>=25?'<div style="margin-top:4px;font-size:11px;color:#b45309;background:#fef9e7;border:1px solid #fde68a;border-radius:6px;padding:5px 8px;">💨 High winds may affect play</div>':'');
  }catch(e){ el.textContent='Weather unavailable'; }
}

async function loadRecordScores(){
  const myEmail = getMyEmail();
  const container = document.getElementById('recordScoresList');
  if(!container) return;
  if(!myEmail){ container.innerHTML='<div style="color:var(--dim);padding:20px;">Please sign in.</div>'; return; }
  container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:20px 0;">Loading…</div>';
  try{
    // Get past matches where I'm organizer or confirmed in
    const [orgRes, respRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&order=match_date.desc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const orgMatches = orgRes.ok ? await orgRes.json() : [];
    const myResponses = respRes.ok ? await respRes.json() : [];
    let invitedMatches = [];
    if(myResponses.length){
      const ids = myResponses.map(r=>r.match_id);
      const imRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&order=match_date.desc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      invitedMatches = imRes.ok ? await imRes.json() : [];
    }
    const allIds = new Set();
    const pastMatches = [...orgMatches,...invitedMatches].filter(m=>{
      if(allIds.has(m.id)) return false; allIds.add(m.id); return isMatchPast(m);
    });

    container.innerHTML='';
    if(!pastMatches.length){
      container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:20px 0;text-align:center;">No past matches yet.</div>';
      return;
    }

    // Fetch existing scores
    const matchIds = pastMatches.map(m=>m.id);
    const srRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_results?match_id=in.(${matchIds.join(',')})&select=match_id,game_number,team_a_score,team_b_score`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const scores = srRes.ok ? await srRes.json() : [];

    pastMatches.forEach(m=>{
      const dateStr = m.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) : '—';
      const timeStr = m.time_start ? fmt12(m.time_start) : '';
      const matchScores = scores.filter(s=>s.match_id===m.id);
      const hasScores = matchScores.length > 0;

      const card = document.createElement('div');
      card.style.cssText='background:rgba(255,255,255,0.03);border:1px solid '+(hasScores?'rgba(76,175,125,0.2)':'var(--border)')+';border-radius:16px;padding:16px;margin-bottom:12px;';

      let scoresHtml = '';
      if(hasScores){
        scoresHtml = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);">';
        matchScores.forEach(s=>{
          scoresHtml += '<div style="font-size:13px;color:#fff;margin-bottom:4px;">'+
            'Game '+s.game_number+': <strong>'+(s.team_a_score>s.team_b_score?s.team_a_score:s.team_b_score)+'</strong> – '+(s.team_a_score>s.team_b_score?s.team_b_score:s.team_a_score)+'</div>';
        });
        scoresHtml += '</div>';
      }

      card.innerHTML=
        '<div style="display:flex;align-items:flex-start;gap:10px;">'+
          '<span style="font-size:22px;">'+(m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>')+'</span>'+
          '<div style="flex:1;">'+
            '<div style="color:'+(hasScores?'var(--green)':'#fff')+';font-size:14px;font-weight:700;">'+dateStr+(timeStr?' · '+timeStr:'')+'</div>'+
            '<div style="color:var(--dim);font-size:12px;">'+(m.court_name&&m.court_name!=='TBD'?m.court_name:(m.court_address||'Location TBD'))+'</div>'+
          '</div>'+
          '<button onclick="openRecordResults(\''+m.id+'\',\''+m.match_type+'\')" '+
            'style="padding:7px 14px;border-radius:8px;border:none;background:var(--green);color:var(--dark);'+
            'font-weight:700;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;">'+
            (hasScores?'✏️ Edit Score':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Record Score')+
          '</button>'+
        '</div>'+scoresHtml;
      container.appendChild(card);
    });
  }catch(e){
    container.innerHTML='<div style="color:#f87171;font-size:13px;">Error loading scores.</div>';
  }
}

function updateConfirmedBadge(count, matches){
  const badge = document.getElementById('confirmedMatchesBadge');
  if(!badge) return;
  badge.textContent = count;
  if(count > 0){
    badge.style.background = '#1a7a3a';
    badge.style.color = '#fff';
    // Check if any match is within 1 hour — if so, blink the badge
    const hasUrgent = matches && matches.some(m=>{
      const cd = getCountdown(m.match_date, m.time_start);
      return cd && cd.urgent;
    });
    if(hasUrgent){
      badge.classList.add('pb-urgent-badge');
    } else {
      badge.classList.remove('pb-urgent-badge');
    }
  } else {
    badge.style.background = 'rgba(76,175,125,0.2)';
    badge.style.color = '#1a7a3a';
    badge.classList.remove('pb-urgent-badge');
  }
}

function updateMatchBadge(id, count, activeColor, activeTxtColor){
  const badge = document.getElementById(id);
  if(!badge) return;
  badge.textContent = count;
  if(count > 0){
    badge.style.background = activeColor;
    badge.style.color = activeTxtColor||'#fff';
  } else {
    badge.style.background = activeColor.replace('0.85','0.2').replace('rgb(','rgba(').replace(')',',0.2)');
    badge.style.color = 'rgba(255,255,255,0.4)';
  }
}

async function loadAllMatchBadges(){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  try{
    // Pending invites I organized (open=not full, not cancelled, not past)
    const orgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=neq.full&status=neq.cancelled&select=id,match_date,time_end,time_start,match_type`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const orgMatches = orgRes.ok ? await orgRes.json() : [];
    const pendingOrg = orgMatches.filter(m=>!isMatchPast(m)).length;
    updateMatchBadge('myInvitesBadge', pendingOrg, 'rgba(239,68,68,0.85)');
    { const el=document.getElementById('dashSqMyInvites'); if(el) el.textContent=pendingOrg; }

    // Invites to me — pending response AND match is still open (not full, not cancelled,
    // not past, and not a match I organized myself)
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.pending&select=match_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const pendingResps = rRes.ok ? await rRes.json() : [];
    let iboCount = 0;
    if(pendingResps.length){
      const pendIds = pendingResps.map(r=>r.match_id);
      const openMatchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?id=in.(${pendIds.join(',')})&status=neq.cancelled&select=id,match_date,time_start,time_end,organizer_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const openMatches = openMatchRes.ok ? await openMatchRes.json() : [];
      iboCount = openMatches.filter(m=>!isMatchPast(m) && (m.organizer_email||'').toLowerCase()!==myEmail.toLowerCase()).length;
    }
    updateMatchBadge('invitedByOthersBadge', iboCount, 'rgba(59,130,246,0.85)');
    { const el=document.getElementById('dashSqInvited'); if(el) el.textContent=iboCount; }
    // Keep top header badge in sync
    const topBadge = document.getElementById('topMatchInvitesBadge');
    const topLabel = document.getElementById('topMatchInvitesLabel');
    if(topBadge){ topBadge.textContent=iboCount; topBadge.style.display=iboCount>0?'inline-block':'none'; }
    if(topLabel) topLabel.textContent = iboCount>0 ? 'Invited to Play ('+iboCount+')' : 'Invited to Play';

    // Confirmed future matches
    const [cfOrgRes, cfRespRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=eq.full&select=id,match_date,time_start,time_end`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const cfOrg = cfOrgRes.ok ? await cfOrgRes.json() : [];
    const cfResp = cfRespRes.ok ? await cfRespRes.json() : [];
    let cfInvited = [];
    if(cfResp.length){
      const ids = cfResp.map(r=>r.match_id);
      const cfIRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&status=eq.full&select=id,match_date,time_start,time_end`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      cfInvited = cfIRes.ok ? await cfIRes.json() : [];
    }
    const allConfirmedIds = new Set();
    const confirmedCount = [...cfOrg,...cfInvited].filter(m=>{
      if(allConfirmedIds.has(m.id)) return false;
      allConfirmedIds.add(m.id);
      return !isMatchPast(m);
    }).length;
    updateConfirmedBadge(confirmedCount);
    { const el=document.getElementById('dashSqConfirmed'); if(el) el.textContent=confirmedCount; }
  }catch(e){}
}

async function loadMyInvitesPage(){
  const myEmail=getMyEmail();
  const container=document.getElementById('myInvitesList');
  if(!container) return;
  if(!myEmail){ container.innerHTML='<div style="color:var(--dim);padding:20px;">Please sign in.</div>'; return; }
  container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:12px 0;">Loading…</div>';
  try{
    // Show open/pending matches + cancelled ones for reference
    const res=await fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=neq.full&order=match_date.desc,time_start.desc`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches=res.ok?await res.json():[];
    const ids=matches.map(m=>m.id);
    let responses=[];
    if(ids.length){
      const rr=await fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${ids.join(',')})&select=match_id,player_name,player_email,response`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      responses=rr.ok?await rr.json():[];
    }
    container.innerHTML='';
    if(!matches.length){
      container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:20px 0;text-align:center;">No matches yet.<br><br><button onclick="showPage(\'setupMatch\')" style="padding:10px 20px;border-radius:10px;border:none;background:var(--green);color:var(--dark);font-weight:700;cursor:pointer;">+ Set Up A Match</button></div>';
      return;
    }
    const cancelled=matches.filter(m=>m.status==='cancelled');
    const active=matches.filter(m=>m.status!=='cancelled');
    const upcoming=active.filter(m=>!isMatchPast(m));
    const past=active.filter(m=>isMatchPast(m));

    // Fetch court names for matches that have a court_id but no court_name
    let miCourtData = {};
    const allCourtIds = [...new Set(matches.map(m=>m.court_id).filter(Boolean))];
    if(allCourtIds.length){
      const cr = await fetch(`${SUPABASE_URL}/rest/v1/courts?id=in.(${allCourtIds.join(',')})&select=id,name,address`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const courts = cr.ok ? await cr.json() : [];
      courts.forEach(co=>{ miCourtData[co.id]=co; });
    }

    const renderCard=(m,isPast)=>{
      const sd=getMatchStatusDisplay(m);
      const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'—';
      const timeStr=m.time_start?fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):''):'—';
      const mRes=responses.filter(r=>r.match_id===m.id);
      const inP=mRes.filter(r=>r.response==='in');
      const pend=mRes.filter(r=>r.response==='pending');
      const wait=mRes.filter(r=>r.response==='waitlist');
      const out=mRes.filter(r=>r.response==='out');
      const maxNeeded=m.match_type==='doubles'?4:2;
      const card=document.createElement('div');
      const cdUrgent = !isPast && getCountdown(m.match_date,m.time_start)?.urgent;
      card.style.cssText='border:3px solid '+sd.border+';border-radius:16px;padding:16px;margin-bottom:12px;background:'+sd.bg+';'+(isPast?'opacity:0.85;':'');
      if(cdUrgent) card.classList.add('pb-card-urgent');
      // Cache response data for toggleInvitePanel
      _miResponseCache[m.id] = {in:inP, pending:pend, waitlist:wait, out:out};
      let bottom='';
      if(isPast){
        bottom='<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(76,175,125,0.08);border:1px solid rgba(76,175,125,0.2);border-radius:10px;">'+
          '<span style="font-size:12px;color:var(--green);font-weight:600;">Record the scores from this match</span>'+
          '<button onclick="openRecordResults(\''+m.id+'\',\''+m.match_type+'\')" style="padding:8px 16px;border-radius:8px;border:none;background:var(--green);color:var(--dark);font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0;">🏓 Record Score</button>'+
          '</div>';
      } else {
        const remaining = Math.max(0, maxNeeded - inP.length);
        // Urgent reminder banner — show when < 24h away, roster not full, pending players exist
        const _cd = !isPast ? getCountdown(m.match_date, m.time_start) : null;
        const _showReminder = !isPast && _cd?.urgency==='urgent' && inP.length < maxNeeded && pend.length > 0;
        const _reminderBanner = _showReminder
          ? '<div id="miReminderWrap-'+m.id+'" style="margin-top:10px;padding:10px 14px;background:#fff1f2;border:1.5px solid #fca5a5;border-radius:10px;">'+
              '<div class="pb-urgent" style="font-size:13px;font-weight:800;color:#dc2626;margin-bottom:6px;">'+
                '🔴 Match is in '+_cd.text+' — roster not full! '+pend.length+' player'+(pend.length!==1?'s':'')+' haven\'t responded yet.'+
              '</div>'+
              '<button id="miReminderBtn-'+m.id+'" onclick="window._miSendReminders(\''+m.id+'\')" '+
                'style="padding:8px 14px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">'+
                '📧 Send Reminder to Pending Players'+
              '</button>'+
            '</div>'
          : '';
        bottom=
          // 5-column grid: In | Pending | Waitlist | Out | Remaining — tap any pill to see names
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:5px;margin-top:10px;">'+
            makeResponsePill('In',inP,'#1a7a3a',''+m.id,'in')+
            makeResponsePill('Pending',pend,'#b45309',''+m.id,'pending')+
            makeResponsePill('Waitlist',wait,'#f59e0b',''+m.id,'waitlist')+
            makeResponsePill('Out',out,'#f87171',''+m.id,'out')+
            makeRemainingPill(remaining, maxNeeded)+
          '</div>'+
          buildPillNamesPanel(''+m.id,'in',inP)+
          buildPillNamesPanel(''+m.id,'pending',pend)+
          buildPillNamesPanel(''+m.id,'waitlist',wait)+
          buildPillNamesPanel(''+m.id,'out',out)+
          _reminderBanner+
          '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">'+
            '<button onclick="openEditMatchModal(\''+m.id+'\')" style="padding:7px 14px;border-radius:8px;border:2px solid #1a7a3a;background:#f0fdf4;color:#1a7a3a;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">&#9998; Edit Match</button>'+
          '</div>';
      }
      const courtName = (m.court_name||'').trim();
      const courtAddr = (m.court_address||'').trim();
      const miCourtLookup = miCourtData[m.court_id] || {};
      const resolvedName = (courtName && courtName.toLowerCase()!=='tbd') ? courtName
        : (miCourtLookup.name||'').trim() || '';
      const resolvedAddr = courtAddr || (miCourtLookup.address||'').trim();
      const courtDisplay = resolvedName ? '📍 '+resolvedName :
                           resolvedAddr ? '📍 '+resolvedAddr :
                           '📍 Court TBD';
      const weatherId = 'mi-weather-'+m.id;
      card.innerHTML=
        '<div style="display:flex;align-items:flex-start;gap:10px;">'+
        '<span style="font-size:22px;">'+(m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>')+'</span>'+
        '<div style="flex:1;">'+
          '<div style="color:'+(isPast?'#6b7280':'#111')+';font-size:14px;font-weight:700;">'+(isPast?'<s>':'')+dateStr+(isPast?'</s>':'')+'</div>'+
          '<div style="color:#374151;font-size:12px;margin-top:1px;font-weight:600;">'+timeStr+'</div>'+
          '<div style="color:#6b7280;font-size:12px;margin-top:2px;">'+courtDisplay+'</div>'+
          '<div style="font-size:11px;color:#1a7a3a;font-weight:700;margin-top:2px;">Organized by '+(((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:'')).trim()||getMyEmail().split('@')[0])+' &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>'+
          (!isPast?renderCountdown(m.match_date,m.time_start):'')+
        '</div>'+
        '<div style="text-align:right;flex-shrink:0;">'+
          '<div style="font-size:12px;font-weight:700;color:'+sd.color+';">'+(sd.inProgress?'<span class="pb-pulse-green"></span>':'')+sd.label+'</div>'+
          (!isPast?'<div style="font-size:10px;color:#6b7280;">'+inP.length+'/'+maxNeeded+' confirmed</div>':'')+ 
          (!isPast&&m.match_date?'<div id="'+weatherId+'" style="font-size:10px;color:#6b7280;margin-top:4px;text-align:right;max-width:110px;line-height:1.4;"></div>':'')+
        '</div></div>'+bottom;
      // Load weather inline for upcoming matches
      if(!isPast && m.match_date) loadMyInviteWeather(m, weatherId);
      return card;
    };

    if(upcoming.length){
      const h=document.createElement('div');
      h.style.cssText='font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;padding:4px 0 10px;';
      h.textContent='Upcoming ('+upcoming.length+')';
      container.appendChild(h);
      upcoming.forEach(m=>container.appendChild(renderCard(m,false)));
    }
    if(past.length){
      const h=document.createElement('div');
      h.style.cssText='font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;padding:16px 0 10px;border-top:1px solid #e5e7eb;margin-top:8px;';
      h.textContent='Past Matches ('+past.length+')';
      container.appendChild(h);
      past.forEach(m=>container.appendChild(renderCard(m,true)));
    }
    if(cancelled.length){
      const hdr=document.createElement('div');
      hdr.style.cssText='font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.06em;padding:16px 0 8px;border-top:1px solid #e5e7eb;margin-top:8px;cursor:pointer;display:flex;align-items:center;gap:6px;';
      hdr.innerHTML='🚫 Cancelled Matches ('+cancelled.length+') <span id="cancelToggle">▾ show</span>';
      const cancelList=document.createElement('div');
      cancelList.id='cancelledList';
      cancelList.style.display='none';
      hdr.onclick=()=>{
        const shown=cancelList.style.display!=='none';
        cancelList.style.display=shown?'none':'block';
        document.getElementById('cancelToggle').textContent=shown?'▾ show':'▴ hide';
      };
      cancelled.forEach(m=>{
        const card=document.createElement('div');
        const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'—';
        const timeStr=m.time_start?fmt12(m.time_start):'—';
        const courtName=(m.court_name&&m.court_name!=='TBD')?m.court_name:'Court TBD';
        card.style.cssText='background:#fff1f2;border:2px solid #fca5a5;border-radius:12px;padding:12px 16px;margin-bottom:8px;opacity:0.8;';
        card.innerHTML=
          '<div style="display:flex;align-items:center;gap:8px;">'+
            '<span style="font-size:18px;">🚫</span>'+
            '<div>'+
              '<div style="font-size:13px;font-weight:700;color:#dc2626;text-decoration:line-through;">'+dateStr+' · '+timeStr+'</div>'+
              '<div style="font-size:11px;color:#6b7280;">'+courtName+' · '+( m.match_type==='doubles'?'Doubles':'Singles')+'</div>'+
              '<div style="font-size:10px;color:#dc2626;font-weight:600;margin-top:2px;">Cancelled</div>'+
            '</div>'+
          '</div>';
        cancelList.appendChild(card);
      });
      container.appendChild(hdr);
      container.appendChild(cancelList);
    }
  }catch(e){ container.innerHTML='<div style="color:#f87171;font-size:13px;">Error loading invites.</div>'; }
}

async function loadMyInviteWeather(m, elId){
  const el = document.getElementById(elId);
  if(!el) return;
  try{
    let lat = null, lon = null;
    // 1. Try court coords
    if(m.court_id){
      const cr = await fetch(
        `${SUPABASE_URL}/rest/v1/courts?id=eq.${encodeURIComponent(m.court_id)}&select=lat,lon&limit=1`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const courts = cr.ok ? await cr.json() : [];
      if(courts[0]?.lat){ lat=courts[0].lat; lon=courts[0].lon; }
    }
    // 2. Try session lat/lon
    if(!lat && S.addrLat){ lat=S.addrLat; lon=S.addrLon; }
    if(!lat && SESSION_PLAYER?.lat){ lat=parseFloat(SESSION_PLAYER.lat); lon=parseFloat(SESSION_PLAYER.lon); }
    // 3. Geocode from city/state
    if(!lat && SESSION_PLAYER?.city && SESSION_PLAYER?.state){
      const q=encodeURIComponent(SESSION_PLAYER.city+', '+SESSION_PLAYER.state+', USA');
      const gr=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        {headers:{'User-Agent':'PBallConnect/1.0'}});
      if(gr.ok){ const gd=await gr.json(); if(gd.length){ lat=parseFloat(gd[0].lat); lon=parseFloat(gd[0].lon); S.addrLat=lat; S.addrLon=lon; if(SESSION_PLAYER) SESSION_PLAYER.lat=lat,SESSION_PLAYER.lon=lon; } }
    }
    if(!lat){ el.style.display='none'; return; }

    // Show loading indicator
    el.style.display='';
    el.innerHTML='<span style="opacity:0.5;font-size:10px;">⛅ loading…</span>';

    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`+
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode`+
      `&temperature_unit=fahrenheit&windspeed_unit=mph&forecast_days=16&timezone=auto`;
    const res = await fetch(url);
    if(!res.ok){ el.style.display='none'; return; }
    const data = await res.json();
    // Find match date in forecast — try exact match first, then closest
    let idx = data.daily.time.indexOf(m.match_date);
    if(idx<0){
      // Try to find closest date within 1 day
      const matchDt = new Date(m.match_date+'T12:00');
      idx = data.daily.time.findIndex(t=>Math.abs(new Date(t+'T12:00')-matchDt)<86400000*2);
    }
    if(idx<0){ el.style.display='none'; return; }
    const code=data.daily.weathercode[idx];
    const high=Math.round(data.daily.temperature_2m_max[idx]);
    const low=Math.round(data.daily.temperature_2m_min[idx]);
    const precip=data.daily.precipitation_probability_max[idx];
    const wind=Math.round(data.daily.windspeed_10m_max[idx]);
    const emoji=getWeatherEmoji(code);
    const precipColor=precip<20?'#1a7a3a':precip<50?'#b45309':'#dc2626';
    const windColor=wind<15?'#1a7a3a':wind<25?'#b45309':'#dc2626';
    el.style.display='';
    el.innerHTML=emoji+' '+high+'°/'+low+'°F · <span style="color:'+precipColor+';">'+precip+'% rain</span> · <span style="color:'+windColor+';">'+wind+'mph</span>';
  }catch(e){ console.warn('Weather error:',e); if(el) el.style.display='none'; }
}

function togglePill(el){
  const n = el.querySelector('.pill-names');
  if(n) n.style.display = n.style.display==='none' ? 'block' : 'none';
}

// Inject blink animation for urgent countdown
(function(){
  if(!document.getElementById('pb-blink-style')){
    const s=document.createElement('style');
    s.id='pb-blink-style';
    s.textContent='@keyframes pb-blink{0%,100%{opacity:1}50%{opacity:0.2}}.pb-urgent{animation:pb-blink 1s ease-in-out infinite;}.pb-urgent-badge{animation:pb-blink 1.5s ease-in-out infinite;}';
    document.head.appendChild(s);
  }
})();



// Response data cache keyed by matchId — populated by loadMyInvitesPage, read by toggleInvitePanel
const _miResponseCache = {};

function _fmtGenderPref(pref){
  const m={open:'Open',either:'Open',mixed:'Mixed',same:'Same Gender',mens:"Men's",womens:"Women's"};
  return m[(pref||'').toLowerCase()]||'';
}

function togglePillNames(matchId, status){
  const activeBgs={in:'#d1fae5',pending:'#fef3c7',waitlist:'#fef9c3',out:'#fff1f2'};
  ['in','pending','waitlist','out'].forEach(s=>{
    if(s===status) return;
    const el=document.getElementById('pillNames-'+matchId+'-'+s);
    const pill=document.getElementById('pill-'+matchId+'-'+s);
    if(el) el.style.display='none';
    if(pill) pill.style.background='#f9fafb';
  });
  const panel=document.getElementById('pillNames-'+matchId+'-'+status);
  const pill=document.getElementById('pill-'+matchId+'-'+status);
  if(!panel) return;
  const isOpening=panel.style.display==='none';
  panel.style.display=isOpening?'block':'none';
  if(pill) pill.style.background=isOpening?(activeBgs[status]||'#f3f4f6'):'#f9fafb';
}
window.togglePillNames = togglePillNames;

// Keep toggleInvitePanel as a stub so any legacy call sites don't throw
function toggleInvitePanel(matchId, status){ togglePillNames(matchId, status); }
window.toggleInvitePanel = toggleInvitePanel;

function buildPillNamesPanel(matchId, status, players, organizerEmail){
  const icons = {in:'✅', pending:'⏳', waitlist:'👥', out:'❌'};
  const icon = icons[status]||'';
  const orgEmailLower=(organizerEmail||'').toLowerCase();
  let html='<div id="pillNames-'+matchId+'-'+status+'" style="display:none;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;margin-top:6px;">';
  if(!players.length){
    html+='<div style="font-size:13px;color:#9ca3af;">None yet</div>';
  } else {
    players.forEach(p=>{
      const name=p.player_name||p.player_email||'—';
      const isOrg=orgEmailLower&&(p.player_email||'').toLowerCase()===orgEmailLower;
      if(isOrg){
        html+='<div style="font-size:13px;font-weight:700;color:#dc2626;padding:3px 0;display:flex;align-items:center;gap:6px;border-left:3px solid #dc2626;padding-left:8px;margin-left:-8px;">'+
          icon+' '+name+
          '<span style="font-size:10px;font-weight:800;background:#dc2626;color:#fff;border-radius:999px;padding:1px 7px;letter-spacing:.04em;">Organizer</span>'+
        '</div>';
      } else {
        html+='<div style="font-size:13px;font-weight:600;color:#111;padding:3px 0;">'+icon+' '+name+'</div>';
      }
    });
  }
  return html+'</div>';
}

function makeResponsePill(label, players, color, matchId, status){
  if(matchId && status){
    return '<div id="pill-'+matchId+'-'+status+'" onclick="togglePillNames(\''+matchId+'\',\''+status+'\')" '+
      'style="text-align:center;padding:8px 4px;border-radius:8px;background:#f9fafb;border:2px solid '+color+';cursor:pointer;transition:background .12s;">'+
      '<div style="font-size:16px;font-weight:800;color:'+color+';">'+players.length+'</div>'+
      '<div style="font-size:9px;color:#444;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">'+label+' &#9660;</div>'+
    '</div>';
  }
  // Legacy inline-expand (togglePill) — used by other callers
  const names = players.map(p=>(p.player_name||p.player_email||'').split(' ')[0]).filter(Boolean).join(', ');
  const legacyClickable = players.length > 0 && names;
  const nameList = legacyClickable
    ? '<div class="pill-names" style="display:none;font-size:9px;color:'+color+';margin-top:4px;line-height:1.5;border-top:1px solid #e5e7eb;padding-top:4px;">'+names.split(', ').join('<br>')+'</div>'
    : '';
  return '<div '+(legacyClickable?'onclick="togglePill(this)" ':'')+'style="text-align:center;padding:8px 4px;border-radius:8px;background:#f9fafb;border:2px solid '+(legacyClickable?'#6b7280':'#d1d5db')+';'+(legacyClickable?'cursor:pointer;':'')+'">'+
    '<div style="font-size:16px;font-weight:800;color:'+color+';">'+players.length+'</div>'+
    '<div style="font-size:9px;color:#444;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">'+label+(legacyClickable?' &#9660;':'')+'</div>'+
    nameList+
  '</div>';
}

function makeRemainingPill(remaining, maxNeeded){
  const color = remaining === 0 ? 'var(--green)' : remaining === 1 ? '#fbbf24' : '#f87171';
  const label = remaining === 0 ? 'Full! 🎉' : 'Needed';
  return '<div style="text-align:center;padding:8px 4px;border-radius:8px;background:'+(remaining===0?'#d1fae5':'#fff1f2')+';border:2px solid '+(remaining===0?'#1a7a3a':'#e11d48')+';">'+
    '<div style="font-size:16px;font-weight:800;color:'+color+';">'+remaining+'</div>'+
    '<div style="font-size:9px;color:#444;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">'+label+'</div>'+
  '</div>';
}

// ── My Match Invites: send reminder to pending players ───
window._miSendReminders = async function(matchId){
  const btn = document.getElementById('miReminderBtn-'+matchId);
  if(!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  const wrap = document.getElementById('miReminderWrap-'+matchId);
  const cached = _miResponseCache[matchId];
  if(!cached || !cached.pending || !cached.pending.length){
    if(wrap) wrap.innerHTML='<div style="font-size:13px;font-weight:700;color:#6b7280;">No pending players found.</div>';
    return;
  }
  try{
    const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=*&limit=1`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches = matchRes.ok ? await matchRes.json() : [];
    const m = matches[0];
    if(!m){ if(wrap) wrap.innerHTML='<div style="font-size:13px;color:#dc2626;">Match not found.</div>'; return; }
    const dateStr = m.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'}) : 'TBD';
    const timeStr = m.time_start ? fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):'') : 'TBD';
    const courtName = (m.court_name&&m.court_name.toLowerCase()!=='tbd') ? m.court_name : (m.court_address||'the court');
    const orgFirstName = SESSION_PLAYER?.first_name || 'Your organizer';
    const pendingPlayers = cached.pending;
    const pendingEmails = pendingPlayers.map(p=>p.player_email).filter(Boolean);
    let profileMap = {};
    if(pendingEmails.length){
      const pr = await fetch(`${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${pendingEmails.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const profiles = pr.ok ? await pr.json() : [];
      profiles.forEach(p=>{ profileMap[(p.email||'').toLowerCase()]=p; });
    }
    let sent = 0, failed = 0;
    for(const player of pendingPlayers){
      const playerEmail = player.player_email;
      if(!playerEmail) continue;
      const profile = profileMap[(playerEmail||'').toLowerCase()];
      const firstName = profile?.first_name || (player.player_name||'').split(' ')[0] || 'there';
      try{
        await sendEmail({
          to_email: playerEmail,
          type: 'match_update',
          subject: 'Reminder: Can you make it tomorrow? '+courtName+' at '+timeStr,
          personal_note: 'Just checking in — can you make it to pickleball?\n\n📅 '+dateStr+'\n⏰ '+timeStr+'\n📍 '+courtName+'\n\nAre you in? Open the app to respond.\n\n— '+orgFirstName+' via PBallConnect',
          inviter_name: orgFirstName,
          invitee_name: firstName,
          match_date_str: dateStr
        });
        sent++;
      }catch(emailErr){
        showToast('⚠️ Reminder failed for '+firstName,'#f59e0b');
        console.warn('Reminder email failed:',playerEmail,emailErr);
        failed++;
      }
    }
    if(wrap) wrap.innerHTML =
      '<div style="font-size:13px;font-weight:700;color:#16a34a;">'+
        '✅ Reminders sent to '+sent+' player'+(sent!==1?'s':'')+
        (failed>0?' ('+failed+' failed)':'')+
      '</div>';
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='📧 Send Reminder to Pending Players'; }
    showToast('Error sending reminders: '+e.message,'#f87171');
  }
};

// ── Pending Matches page (page-invitedByOthers) ─────────
async function loadInvitedByOthersPage(){
  // Use SESSION_PLAYER.email as the authoritative source — S.email is mutable form state.
  const myEmail=(SESSION_PLAYER?.email||getMyEmail()||'').toLowerCase();
  const container=document.getElementById('invitedByOthersList');
  if(!container) return;
  if(!myEmail){ container.innerHTML='<div style="color:var(--dim);padding:20px;">Please sign in to view your matches.</div>'; return; }
  container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:12px 0;">Loading...</div>';
  try{
    // Fetch all three response types + organizer matches in parallel
    const [pendRespRes,inRespRes,orgRes]=await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.pending&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&select=*&order=match_date.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);

    const myPendResps=pendRespRes.ok?await pendRespRes.json():[];
    const myInResps=inRespRes.ok?await inRespRes.json():[];
    const orgMatchesRaw=orgRes.ok?await orgRes.json():[];

    // Fetch match details for pending and 'in' responses in parallel.
    // No status filter — PostgREST neq excludes NULL-status rows. Filter in JS instead.
    const pendIds=myPendResps.map(r=>r.match_id).filter(Boolean);
    const inIds=myInResps.map(r=>r.match_id).filter(Boolean);
    const [pendMatchesRaw,inMatchesRaw]=await Promise.all([
      pendIds.length
        ? fetch(`${SUPABASE_URL}/rest/v1/matches?id=in.(${pendIds.join(',')})&select=*&order=match_date.asc`,
            {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}).then(r=>r.ok?r.json():[])
        : Promise.resolve([]),
      inIds.length
        ? fetch(`${SUPABASE_URL}/rest/v1/matches?id=in.(${inIds.join(',')})&select=*&order=match_date.asc`,
            {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}).then(r=>r.ok?r.json():[])
        : Promise.resolve([])
    ]);

    // Organizer matches: today/future, not cancelled
    const orgMatches=orgMatchesRaw.filter(m=>!isMatchPast(m)&&(m.status||'')!=='cancelled');
    const orgIds=new Set(orgMatches.map(m=>m.id));

    // Section 1 — Open Invites: response='pending', upcoming, not cancelled, not self-organized
    const openInvites=pendMatchesRaw.filter(m=>
      !isMatchPast(m)&&
      (m.status||'')!=='cancelled'&&
      (m.organizer_email||'').toLowerCase()!==myEmail
    );

    // Section 2 — Matches You've Joined: response='in', upcoming, not cancelled, not self-organized
    const joinedMatches=inMatchesRaw.filter(m=>
      !isMatchPast(m)&&
      (m.status||'')!=='cancelled'&&
      (m.organizer_email||'').toLowerCase()!==myEmail&&
      !orgIds.has(m.id)
    );

    // Fetch all 'in' responses for every candidate match (for roster counts + player chips)
    const allCandidateIds=[...new Set([
      ...openInvites.map(m=>m.id),
      ...joinedMatches.map(m=>m.id),
      ...orgMatches.map(m=>m.id)
    ])];
    let allInResps=[];
    if(allCandidateIds.length){
      const rr=await fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${allCandidateIds.join(',')})&select=match_id,player_name,player_email,response`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      if(rr.ok) allInResps=await rr.json();
    }

    // Sections 2+3 only show roster-not-full matches
    const invitedPending=joinedMatches.filter(m=>{
      const inCount=allInResps.filter(r=>r.match_id===m.id&&r.response==='in').length;
      return inCount<(m.max_players||(m.match_type==='doubles'?4:2));
    });
    const orgPending=orgMatches.filter(m=>{
      const inCount=allInResps.filter(r=>r.match_id===m.id&&r.response==='in').length;
      return inCount<(m.max_players||(m.match_type==='doubles'?4:2));
    });
    // Split open invites: not-full (accept/decline) vs full (waitlist offer)
    const activeInvites=openInvites.filter(m=>{
      const inCount=allInResps.filter(r=>r.match_id===m.id&&r.response==='in').length;
      return inCount<(m.max_players||(m.match_type==='doubles'?4:2));
    });
    const fullInvites=openInvites.filter(m=>{
      const inCount=allInResps.filter(r=>r.match_id===m.id&&r.response==='in').length;
      return inCount>=(m.max_players||(m.match_type==='doubles'?4:2));
    });

    console.log('PAGE pending - activeInvites:',activeInvites.length,'fullInvites:',fullInvites.length);
    console.log('PAGE pending - invitedPending:',invitedPending.length,invitedPending);
    console.log('PAGE pending - orgPending:',orgPending.length,orgPending);

    container.innerHTML='';
    if(!activeInvites.length&&!fullInvites.length&&!invitedPending.length&&!orgPending.length){
      container.innerHTML='<div style="color:var(--dim);font-size:13px;padding:20px 0;text-align:center;">No active match invites or pending matches.</div>';
      return;
    }

    const sectionCount=[activeInvites.length>0,fullInvites.length>0,invitedPending.length>0,orgPending.length>0].filter(Boolean).length;
    const showHeadings=sectionCount>1;

    function makeBlueHeading(label,topMargin){
      const h=document.createElement('div');
      h.style.cssText='font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid rgba(59,130,246,0.3);'+(topMargin?'margin-top:20px;':'');
      h.textContent=label;
      return h;
    }
    function makeAmberHeading(label,topMargin){
      const h=document.createElement('div');
      h.style.cssText='font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid rgba(245,158,11,0.3);'+(topMargin?'margin-top:20px;':'');
      h.textContent=label;
      return h;
    }

    // ── Section 1: Open Invites ──────────────────────────
    if(activeInvites.length){
      if(showHeadings) container.appendChild(makeBlueHeading('Open Invites — Action Required',false));
      activeInvites.forEach(m=>{
        const allMatchResps=allInResps.filter(r=>r.match_id===m.id);
        const inP=allMatchResps.filter(r=>r.response==='in');
        const pend=allMatchResps.filter(r=>r.response==='pending');
        const wait=allMatchResps.filter(r=>r.response==='waitlist');
        const out=allMatchResps.filter(r=>r.response==='out');
        const maxNeeded=m.max_players||(m.match_type==='doubles'?4:2);
        const remaining=Math.max(0,maxNeeded-inP.length);
        const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-CA',{weekday:'short',month:'long',day:'numeric'}):'TBD';
        const timeStr=m.time_start?fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):''):'TBD';
        const courtDisplay=m.court_name&&m.court_name!=='TBD'?'📍 '+m.court_name:(m.court_address?'📍 '+m.court_address:'📍 Court TBD');
        const iboId='ibo-'+m.id;
        const card=document.createElement('div');
        card.style.cssText='background:#ffffff;border:3px solid #3b82f6;border-radius:16px;padding:0;margin-bottom:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);';
        if(getCountdown(m.match_date,m.time_start)?.urgent) card.classList.add('pb-card-urgent');
        let expanded=true;
        function renderOpenCard(){
          card.innerHTML=
            '<div onclick="this.parentElement._toggle()" style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer;">'+
              '<span style="font-size:22px;flex-shrink:0;">'+(m.match_type==='doubles'?'<img src="icon-192.png" class="pb-icon" alt="pickleball"/><img src="icon-192.png" class="pb-icon" alt="pickleball"/>':'<img src="icon-192.png" class="pb-icon" alt="pickleball"/>')+'</span>'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="color:#1d4ed8;font-size:14px;font-weight:700;">'+dateStr+'</div>'+
                '<div style="color:#374151;font-size:12px;font-weight:600;margin-top:1px;">'+timeStr+'</div>'+
                '<div style="color:#6b7280;font-size:12px;margin-top:2px;">'+courtDisplay+'</div>'+
                '<div style="font-size:11px;color:#555;margin-top:2px;">By <strong style="color:#111;">'+(m.organizer_name||'Unknown')+'</strong> &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>'+
                renderCountdown(m.match_date,m.time_start)+
              '</div>'+
              '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">'+
                '<div style="font-size:11px;font-weight:700;color:#3b82f6;">Awaiting response</div>'+
                '<div style="font-size:10px;color:#6b7280;">'+(expanded?'&#9650; less':'&#9660; details')+'</div>'+
              '</div>'+
            '</div>'+
            (expanded?
              '<div style="padding:0 16px 14px;border-top:1px solid #e5e7eb;">'+
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:5px;margin-top:10px;">'+
                  makeResponsePill('In',inP,'#1a7a3a',iboId,'in')+
                  makeResponsePill('Pending',pend,'#b45309',iboId,'pending')+
                  makeResponsePill('Waitlist',wait,'#f59e0b',iboId,'waitlist')+
                  makeResponsePill('Out',out,'#f87171',iboId,'out')+
                  makeRemainingPill(remaining,maxNeeded)+
                '</div>'+
                buildPillNamesPanel(iboId,'in',inP,m.organizer_email)+
                buildPillNamesPanel(iboId,'pending',pend,m.organizer_email)+
                buildPillNamesPanel(iboId,'waitlist',wait,m.organizer_email)+
                buildPillNamesPanel(iboId,'out',out,m.organizer_email)+
                '<div style="display:flex;gap:10px;margin-top:12px;" id="iboRespRow_'+m.id+'">'+
                  '<button class="ibo-respond-btn" data-mid="'+m.id+'" data-resp="in" '+
                    'style="flex:1;padding:10px;background:#1a7a3a;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">'+
                    '&#10003; Accept'+
                  '</button>'+
                  '<button class="ibo-respond-btn" data-mid="'+m.id+'" data-resp="out" '+
                    'style="flex:1;padding:10px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">'+
                    '&#10007; Decline'+
                  '</button>'+
                '</div>'+
              '</div>'
            :'');
        }
        card._toggle=function(){expanded=!expanded;renderOpenCard();};
        renderOpenCard();
        container.appendChild(card);
      });
    }

    // ── Section 1b: Full Matches — Waitlist Offer ────────
    if(fullInvites.length){
      if(showHeadings) container.appendChild(makeAmberHeading('Match Full — Waitlist Available',activeInvites.length>0));
      fullInvites.forEach(m=>{
        const allMatchResps=allInResps.filter(r=>r.match_id===m.id);
        const inP=allMatchResps.filter(r=>r.response==='in');
        const pend=allMatchResps.filter(r=>r.response==='pending');
        const wait=allMatchResps.filter(r=>r.response==='waitlist');
        const out=allMatchResps.filter(r=>r.response==='out');
        const maxNeeded=m.max_players||(m.match_type==='doubles'?4:2);
        const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-CA',{weekday:'short',month:'long',day:'numeric'}):'TBD';
        const timeStr=m.time_start?fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):''):'TBD';
        const courtDisplay=m.court_name&&m.court_name!=='TBD'?'&#128205; '+m.court_name:(m.court_address?'&#128205; '+m.court_address:'&#128205; Court TBD');
        const iboId='ibo-'+m.id;
        const card=document.createElement('div');
        card.style.cssText='background:#ffffff;border:3px solid #f59e0b;border-radius:16px;padding:0;margin-bottom:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);';
        let expanded=true;
        function renderFullCard(){
          card.innerHTML=
            '<div onclick="this.parentElement._toggle()" style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer;">'+
              '<span style="font-size:22px;flex-shrink:0;">'+(m.match_type==='doubles'?'<img src="icon-192.png" class="pb-icon" alt="pickleball"/><img src="icon-192.png" class="pb-icon" alt="pickleball"/>':'<img src="icon-192.png" class="pb-icon" alt="pickleball"/>')+'</span>'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="color:#111;font-size:14px;font-weight:700;">'+dateStr+'</div>'+
                '<div style="color:#374151;font-size:12px;font-weight:600;margin-top:1px;">'+timeStr+'</div>'+
                '<div style="color:#6b7280;font-size:12px;margin-top:2px;">'+courtDisplay+'</div>'+
                '<div style="font-size:11px;color:#555;margin-top:2px;">By <strong style="color:#111;">'+(m.organizer_name||'Unknown')+'</strong> &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>'+
              '</div>'+
              '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">'+
                '<div style="font-size:11px;font-weight:700;color:#f59e0b;">Match Full</div>'+
                '<div style="font-size:10px;color:#6b7280;">'+(expanded?'&#9650; less':'&#9660; details')+'</div>'+
              '</div>'+
            '</div>'+
            (expanded?
              '<div style="padding:0 16px 14px;border-top:1px solid #e5e7eb;">'+
                '<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:10px 12px;margin:10px 0 12px;font-size:13px;font-weight:600;color:#92400e;">'+
                  '&#9888; This match is now full.'+
                '</div>'+
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:5px;margin-bottom:12px;">'+
                  makeResponsePill('In',inP,'#1a7a3a',iboId,'in')+
                  makeResponsePill('Pending',pend,'#b45309',iboId,'pending')+
                  makeResponsePill('Waitlist',wait,'#f59e0b',iboId,'waitlist')+
                  makeResponsePill('Out',out,'#f87171',iboId,'out')+
                '</div>'+
                buildPillNamesPanel(iboId,'in',inP,m.organizer_email)+
                buildPillNamesPanel(iboId,'pending',pend,m.organizer_email)+
                buildPillNamesPanel(iboId,'waitlist',wait,m.organizer_email)+
                buildPillNamesPanel(iboId,'out',out,m.organizer_email)+
                '<div style="display:flex;gap:10px;margin-top:4px;">'+
                  '<button class="ibo-respond-btn" data-mid="'+m.id+'" data-resp="waitlist" '+
                    'style="flex:1;padding:10px;background:#f59e0b;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;">'+
                    '&#8987; Join Waitlist'+
                  '</button>'+
                  '<button class="ibo-respond-btn" data-mid="'+m.id+'" data-resp="out" '+
                    'style="flex:0 0 auto;padding:10px 16px;background:transparent;color:#6b7280;border:1px solid #d1d5db;border-radius:10px;font-size:16px;cursor:pointer;font-family:inherit;">'+
                    'No Thanks'+
                  '</button>'+
                '</div>'+
              '</div>'
            :'');
        }
        card._toggle=function(){expanded=!expanded;renderFullCard();};
        renderFullCard();
        container.appendChild(card);
      });
    }

    // ── Section 2: Matches You've Joined ────────────────
    if(invitedPending.length){
      if(showHeadings) container.appendChild(makeAmberHeading("Matches You've Joined",openInvites.length>0));
      invitedPending.forEach(m=>{
        const allMatchResps=allInResps.filter(r=>r.match_id===m.id);
        const inP=allMatchResps.filter(r=>r.response==='in');
        const pend=allMatchResps.filter(r=>r.response==='pending');
        const wait=allMatchResps.filter(r=>r.response==='waitlist');
        const out=allMatchResps.filter(r=>r.response==='out');
        const maxNeeded=m.max_players||(m.match_type==='doubles'?4:2);
        const remaining=Math.max(0,maxNeeded-inP.length);
        const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-CA',{weekday:'short',month:'long',day:'numeric'}):'TBD';
        const timeStr=m.time_start?fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):''):'TBD';
        const courtName=m.court_name&&m.court_name!=='TBD'?m.court_name:(m.court_address||'Court TBD');
        const courtDisplay=m.court_name&&m.court_name!=='TBD'?'📍 '+m.court_name:(m.court_address?'📍 '+m.court_address:'📍 Court TBD');
        const iboId='ibo-'+m.id;
        // Cache for Can't Make It flow
        window._cmCache = window._cmCache || {};
        window._cmCache[m.id] = {
          dateStr: dateStr,
          timeStr: timeStr,
          courtName: courtName,
          organizerName: m.organizer_name || 'Unknown',
          organizerEmail: m.organizer_email || '',
          maxPlayers: maxNeeded,
          matchDateTime: m.match_date&&m.time_start ? new Date(m.match_date+'T'+m.time_start).getTime() : null
        };
        const card=document.createElement('div');
        card.style.cssText='background:#ffffff;border:3px solid #dc2626;border-radius:16px;padding:0;margin-bottom:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);';
        if(getCountdown(m.match_date,m.time_start)?.urgent) card.classList.add('pb-card-urgent');
        let expanded=false;
        function renderInvCard(){
          card.innerHTML=
            '<div onclick="this.parentElement._toggle()" style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer;">'+
              '<span style="font-size:22px;flex-shrink:0;">'+(m.match_type==='doubles'?'<img src="icon-192.png" class="pb-icon" alt="pickleball"/><img src="icon-192.png" class="pb-icon" alt="pickleball"/>':'<img src="icon-192.png" class="pb-icon" alt="pickleball"/>')+'</span>'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="color:#111;font-size:14px;font-weight:700;">'+dateStr+'</div>'+
                '<div style="color:#374151;font-size:12px;font-weight:600;margin-top:1px;">'+timeStr+'</div>'+
                '<div style="color:#6b7280;font-size:12px;margin-top:2px;">'+courtDisplay+'</div>'+
                '<div style="font-size:11px;color:#555;margin-top:2px;">By <strong style="color:#111;">'+(m.organizer_name||'Unknown')+'</strong> &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>'+
                renderCountdown(m.match_date,m.time_start)+
              '</div>'+
              '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">'+
                '<div style="font-size:11px;font-weight:700;color:#f59e0b;">Pending roster</div>'+
                '<div style="font-size:10px;color:#6b7280;">'+(expanded?'&#9650; less':'&#9660; details')+'</div>'+
              '</div>'+
            '</div>'+
            (expanded?
              '<div style="padding:0 16px 14px;border-top:1px solid #e5e7eb;">'+
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:5px;margin-top:10px;">'+
                  makeResponsePill('In',inP,'#1a7a3a',iboId,'in')+
                  makeResponsePill('Pending',pend,'#b45309',iboId,'pending')+
                  makeResponsePill('Waitlist',wait,'#f59e0b',iboId,'waitlist')+
                  makeResponsePill('Out',out,'#f87171',iboId,'out')+
                  makeRemainingPill(remaining,maxNeeded)+
                '</div>'+
                buildPillNamesPanel(iboId,'in',inP,m.organizer_email)+
                buildPillNamesPanel(iboId,'pending',pend,m.organizer_email)+
                buildPillNamesPanel(iboId,'waitlist',wait,m.organizer_email)+
                buildPillNamesPanel(iboId,'out',out,m.organizer_email)+
                '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #f3f4f6;">'+
                  '<button onclick="window.cantMakeIt(\''+m.id+'\')" '+
                    'style="padding:7px 14px;border-radius:8px;border:1.5px solid #dc2626;background:transparent;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">'+
                    '&#10006; Can\'t Make It'+
                  '</button>'+
                '</div>'+
              '</div>'
            :'');
        }
        card._toggle=function(){expanded=!expanded;renderInvCard();};
        renderInvCard();
        container.appendChild(card);
      });
    }

    // ── Section 3: Matches You're Organizing ────────────
    if(orgPending.length){
      if(showHeadings) container.appendChild(makeAmberHeading("Matches You're Organizing",invitedPending.length>0||openInvites.length>0));
      orgPending.forEach(m=>{
        const allMatchResps=allInResps.filter(r=>r.match_id===m.id);
        const inP=allMatchResps.filter(r=>r.response==='in');
        const pend=allMatchResps.filter(r=>r.response==='pending');
        const wait=allMatchResps.filter(r=>r.response==='waitlist');
        const out=allMatchResps.filter(r=>r.response==='out');
        const maxNeeded=m.max_players||(m.match_type==='doubles'?4:2);
        const remaining=Math.max(0,maxNeeded-inP.length);
        const dateStr=m.match_date?new Date(m.match_date+'T12:00').toLocaleDateString('en-CA',{weekday:'short',month:'long',day:'numeric'}):'TBD';
        const timeStr=m.time_start?fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):''):'TBD';
        const courtDisplay=m.court_name&&m.court_name!=='TBD'?'📍 '+m.court_name:(m.court_address?'📍 '+m.court_address:'📍 Court TBD');
        const iboId='ibo-'+m.id;
        window._cmCache = window._cmCache || {};
        window._cmCache[m.id] = {
          dateStr: dateStr,
          timeStr: timeStr,
          courtName: m.court_name || 'Court TBD',
          organizerName: ((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:'')).trim() || '',
          organizerEmail: m.organizer_email || '',
          maxPlayers: maxNeeded,
          matchDateTime: m.match_date && m.time_start ? new Date(m.match_date+'T'+m.time_start).getTime() : null
        };
        const card=document.createElement('div');
        card.style.cssText='background:#ffffff;border:3px solid #f59e0b;border-radius:16px;padding:0;margin-bottom:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);';
        if(getCountdown(m.match_date,m.time_start)?.urgent) card.classList.add('pb-card-urgent');
        let expanded=false;
        function renderOrgCard(){
          card.innerHTML=
            '<div onclick="this.parentElement._toggle()" style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer;">'+
              '<span style="font-size:22px;flex-shrink:0;">'+(m.match_type==='doubles'?'<img src="icon-192.png" class="pb-icon" alt="pickleball"/><img src="icon-192.png" class="pb-icon" alt="pickleball"/>':'<img src="icon-192.png" class="pb-icon" alt="pickleball"/>')+'</span>'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="color:#111;font-size:14px;font-weight:700;">'+dateStr+'</div>'+
                '<div style="color:#374151;font-size:12px;font-weight:600;margin-top:1px;">'+timeStr+'</div>'+
                '<div style="color:#6b7280;font-size:12px;margin-top:2px;">'+courtDisplay+'</div>'+
                '<div style="font-size:11px;color:#1a7a3a;font-weight:700;margin-top:2px;">Organized by '+((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.last_name?' '+SESSION_PLAYER.last_name:'')).trim()+' &middot; '+(m.match_type==='singles'?'Singles':'Doubles')+(_fmtGenderPref(m.gender_pref)?' &middot; '+_fmtGenderPref(m.gender_pref):'')+'</div>'+
                renderCountdown(m.match_date,m.time_start)+
              '</div>'+
              '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">'+
                '<div style="font-size:11px;font-weight:700;color:#f59e0b;">Organizing</div>'+
                '<div style="font-size:10px;color:#6b7280;">'+(expanded?'&#9650; less':'&#9660; details')+'</div>'+
              '</div>'+
            '</div>'+
            (expanded?
              '<div style="padding:0 16px 14px;border-top:1px solid #e5e7eb;">'+
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:5px;margin-top:10px;">'+
                  makeResponsePill('In',inP,'#1a7a3a',iboId,'in')+
                  makeResponsePill('Pending',pend,'#b45309',iboId,'pending')+
                  makeResponsePill('Waitlist',wait,'#f59e0b',iboId,'waitlist')+
                  makeResponsePill('Out',out,'#f87171',iboId,'out')+
                  makeRemainingPill(remaining,maxNeeded)+
                '</div>'+
                buildPillNamesPanel(iboId,'in',inP,m.organizer_email)+
                buildPillNamesPanel(iboId,'pending',pend,m.organizer_email)+
                buildPillNamesPanel(iboId,'waitlist',wait,m.organizer_email)+
                buildPillNamesPanel(iboId,'out',out,m.organizer_email)+
                (remaining>0&&!wait.length?'<button onclick="event.stopPropagation();window.showEmergencyFill(\''+m.id+'\',null)" style="width:100%;margin-top:10px;background:#dc2626;color:#fff;border:none;border-radius:12px;padding:14px 0;font-size:16px;font-weight:800;min-height:56px;cursor:pointer;">&#128680; Fill This Spot &#8594;</button>':'')+
              '</div>'
            :'');
        }
        card._toggle=function(){expanded=!expanded;renderOrgCard();};
        renderOrgCard();
        container.appendChild(card);
      });
    }
  }catch(e){
    container.innerHTML='<div style="color:#f87171;font-size:13px;">Error: '+e.message+'</div>';
  }
}

// ── Init match page ────────────────────────────────────
// Delegated handler for Invited by Others respond buttons
// Must be at document level to catch dynamically rendered buttons
document.addEventListener('click', function(e){
  const btn = e.target.closest('.ibo-respond-btn');
  if(!btn) return;
  e.stopPropagation();
  const matchId = btn.dataset.mid;
  const resp = btn.dataset.resp;
  if(!matchId || !resp) return;
  // Immediately disable all buttons in the row and replace with response message
  const btnRow = btn.parentElement;
  btnRow.querySelectorAll('.ibo-respond-btn').forEach(b=>{ b.disabled=true; b.style.pointerEvents='none'; });
  if(resp==='in'){
    btnRow.innerHTML='<div style="padding:8px 12px;background:rgba(76,175,125,0.08);border:1px solid rgba(76,175,125,0.3);border-radius:8px;font-size:13px;color:var(--green);font-weight:600;">✅ You\'re in! See you on the court.</div>';
  } else {
    btnRow.innerHTML='<div style="padding:8px 12px;background:rgba(100,100,100,0.06);border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--dim);font-weight:600;">Got it — response saved.</div>';
  }
  loadAllMatchBadges();
  respondToMatch(matchId, resp);
});

// ══════════════════════════════════════════════════════
// SINGLE-SCROLL MATCH SETUP HELPERS (sm*)
// ══════════════════════════════════════════════════════

// ── Set Up a Match: progress bar ─────────────────────
const _smStepLabels = ['Play Structure','Match Type','Number of Courts','Invites','Date & Time','Court','Review & Send'];
let _smCurrentStep = 1;
let _smInitializing = false;
let _smAllCourtsExpanded = false;

// ── Set Up a Match: navigation guard (Bug 3) ──────────
// Set to true immediately before post-submit showPage('dashboard') so the guard is bypassed.
let _smAllowNavigation = false;

function isMatchWizardDirty(){
  if(!MS) return false;
  return !!(
    MS.timeStart ||
    (MS.selectedCourts && MS.selectedCourts.size > 0) ||
    (MS.genderPref && MS.genderPref !== 'either') ||
    MS.selectedGroupId
  );
}

function _smShowLeaveDialog(targetPage){
  const existing = document.getElementById('smLeaveDialog');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'smLeaveDialog';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
      '<div style="font-size:18px;font-weight:800;color:#111;margin-bottom:10px;">⚠️ Leave Match Setup?</div>' +
      '<div style="font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.5;">Your match setup progress will be lost.</div>' +
      '<div style="display:flex;gap:10px;">' +
        '<button id="smLeaveStay" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;color:#111;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Stay</button>' +
        '<button id="smLeaveAnyway" style="flex:1;padding:11px;border-radius:10px;border:none;background:#dc2626;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Leave anyway</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('smLeaveStay').onclick = ()=>overlay.remove();
  document.getElementById('smLeaveAnyway').onclick = ()=>{
    overlay.remove();
    initSetupMatch();           // reset wizard state
    _smAllowNavigation = true;
    showPage(targetPage);
    _smAllowNavigation = false;
  };
}

function smUpdateProgress(step){
  if(_smInitializing) return;
  _smCurrentStep = Math.max(_smCurrentStep, step);
  for(let i=1;i<=7;i++){
    const el=document.getElementById('smStep'+i);
    if(!el) continue;
    if(i < _smCurrentStep){
      el.style.background='#16a34a'; el.style.borderColor='#16a34a'; el.style.color='#fff';
      el.style.width='28px'; el.style.height='28px';
    } else if(i===_smCurrentStep){
      el.style.background='#fef9c3'; el.style.borderColor='#eab308'; el.style.color='#713f12';
      el.style.width='32px'; el.style.height='32px';
    } else {
      el.style.background='#fff'; el.style.borderColor='#d97706'; el.style.color='#78350f';
      el.style.width='28px'; el.style.height='28px';
    }
  }
  const lbl=document.getElementById('smProgressLabel');
  if(lbl) lbl.textContent='Step '+_smCurrentStep+' · '+_smStepLabels[_smCurrentStep-1];
}

function smUpdateNeededBox(){
  const el = document.getElementById('smNeededNum');
  if(el) el.textContent = matchMaxNeeded();
  const total = matchTotalSlots();
  const courts = MS.numCourts || 1;
  const open = total - 1;
  const helper = document.getElementById('smCourtHelperLine');
  if(helper) helper.textContent = courts+' court'+(courts>1?'s':'')+' · '+total+' players total · '+open+' spot'+(open!==1?'s':'')+' open';
}

function smUpdateSendBtn(){
  const btn = document.getElementById('matchSendBtn');
  if(!btn) return;
  const date  = document.getElementById('matchDate')?.value;
  const time  = MS.timeStart || document.getElementById('matchTimeStart')?.value;
  const hasCourt = MS.selectedCourts && MS.selectedCourts.size > 0;
  const ok = !!date && !!time && hasCourt && !MS.hasOverlapConflict;
  btn.disabled = !ok;
  btn.style.opacity  = ok ? '1' : '0.4';
  btn.style.cursor   = ok ? 'pointer' : 'not-allowed';
  if(ok) smUpdateProgress(7);
}

// ── Step 4 Invite Grid helpers ────────────────────────
function _smGetInviteBuckets(){
  const mySkill  = parseFloat(S.skill || SESSION_PLAYER?.skill_level || 0);
  const myGender = (SESSION_PLAYER?.gender || '').toLowerCase();
  const filtered = IC_MEMBERS.filter(m =>
    MS.genderPref === 'same' ? (m.player.gender||'').toLowerCase() === myGender : true
  );
  const buckets = [
    { key:'far_below', label:'.5+ Below My Level', members:[] },
    { key:'below',     label:'.25 Below My Level', members:[] },
    { key:'my_level',  label:'My Level',            members:[], center:true },
    { key:'above',     label:'.25 Above My Level',  members:[] },
    { key:'far_above', label:'.5+ Above My Level',  members:[] },
  ];
  const unrated = [];
  filtered.forEach(m => {
    const s = parseFloat(m.player.skill_level || 0);
    if(!s || !mySkill){ unrated.push(m); return; }
    const diff = s - mySkill;
    if     (diff <= -0.375) buckets[0].members.push(m);
    else if(diff <= -0.125) buckets[1].members.push(m);
    else if(diff <=  0.125) buckets[2].members.push(m);
    else if(diff <=  0.375) buckets[3].members.push(m);
    else                    buckets[4].members.push(m);
  });
  return { buckets, unrated, mySkill };
}

// ── Step 4 summary grid (all non-Group paths) ──────────
// Returns { html: string, allGreen: boolean }.
// allGreen = all required rows are green — gates the Continue button.
function buildSmInviteSummaryGrid(){
  const pref          = MS.genderPref || 'either';
  const isGroupLocked = !!(MS.selectedGroupId);
  if(isGroupLocked) return { html: '', allGreen: true };

  const playersPerCourt = MS.format === 'singles' ? 2 : 4;
  const minNeeded       = (MS.numCourts * playersPerCourt) - 1;
  const selCount        = MS.specificPlayers ? MS.specificPlayers.size : 0;
  const myGender        = (SESSION_PLAYER?.gender || S.gender || '').toLowerCase();

  // Shared table CSS
  const rowBg  = ok => ok ? 'background:#f0fdf4;' : 'background:#fffbeb;';
  const valClr = ok => ok ? 'color:#16a34a;'       : 'color:#d97706;';
  const thS = 'padding:5px 8px;font-weight:700;color:#6b7280;font-size:11px;border-bottom:1px solid #e5e7eb;';
  const tdL = 'padding:6px 8px;font-weight:600;color:#111;font-size:12px;border-bottom:1px solid #f3f4f6;';
  const tdN = 'padding:6px 8px;text-align:center;font-weight:700;color:#374151;font-size:12px;border-bottom:1px solid #f3f4f6;';
  const tdV = ok => `padding:6px 8px;text-align:center;font-weight:700;font-size:12px;border-bottom:1px solid #f3f4f6;${valClr(ok)}`;
  const tableWrap  =
    '<div style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">'+
    '<table style="width:100%;border-collapse:collapse;">'+
    '<thead><tr style="background:#f9fafb;">'+
    `<th style="${thS}text-align:left;"></th>`+
    `<th style="${thS}text-align:center;">Needed</th>`+
    `<th style="${thS}text-align:center;">Invited</th>`+
    '</tr></thead><tbody>';
  const tableClose = '</tbody></table></div>';

  let html = '', allGreen = false;

  if(pref === 'mixed'){
    const n = MS.numCourts;
    let menNeeded = 0, womenNeeded = 0;
    if(myGender === 'man')        { menNeeded = (n * 2) - 1; womenNeeded = n * 2; }
    else if(myGender === 'woman') { womenNeeded = (n * 2) - 1; menNeeded = n * 2; }
    else                           { menNeeded = Math.floor(minNeeded / 2); womenNeeded = Math.ceil(minNeeded / 2); }
    let invMen = 0, invWomen = 0;
    IC_MEMBERS.forEach(({player}) => {
      const e = (player.email||'').toLowerCase();
      if(!MS.specificPlayers || !MS.specificPlayers.has(e)) return;
      const g = (player.gender||'').toLowerCase();
      if(g === 'man') invMen++; else if(g === 'woman') invWomen++;
    });
    const menOk   = invMen   >= menNeeded;
    const womenOk = invWomen >= womenNeeded;
    const totalOk = menOk && womenOk;
    allGreen = totalOk;
    html = tableWrap +
      `<tr style="${rowBg(menOk)}"><td style="${tdL}">👨 Men</td><td style="${tdN}">${menNeeded}</td><td style="${tdV(menOk)}">${invMen}</td></tr>`+
      `<tr style="${rowBg(womenOk)}"><td style="${tdL}">👩 Women</td><td style="${tdN}">${womenNeeded}</td><td style="${tdV(womenOk)}">${invWomen}</td></tr>`+
      `<tr style="${rowBg(totalOk)}"><td style="padding:6px 8px;font-weight:700;color:#111;font-size:12px;">Total</td>`+
        `<td style="padding:6px 8px;text-align:center;font-weight:700;color:#374151;font-size:12px;">${minNeeded}</td>`+
        `<td style="padding:6px 8px;text-align:center;font-weight:700;font-size:12px;${valClr(totalOk)}">${selCount}</td></tr>`+
      tableClose;
    if(totalOk){
      html += '<div style="color:#16a34a;font-weight:700;font-size:13px;text-align:center;margin-bottom:10px;">Gender balance met ✓</div>';
    } else {
      const parts = [];
      if(!menOk)   { const d = menNeeded   - invMen;   parts.push(`${d} more ${d===1?'man':'men'}`); }
      if(!womenOk) { const d = womenNeeded - invWomen; parts.push(`${d} more ${d===1?'woman':'women'}`); }
      html += `<div style="color:#d97706;font-weight:600;font-size:13px;text-align:center;margin-bottom:10px;">Need ${parts.join(' and ')} to continue</div>`;
    }

  } else if(pref === 'same'){
    let invSame = 0;
    IC_MEMBERS.forEach(({player}) => {
      const e = (player.email||'').toLowerCase();
      if(!MS.specificPlayers || !MS.specificPlayers.has(e)) return;
      const g = (player.gender||'').toLowerCase();
      if(g === myGender) invSame++;
    });
    const ok = invSame >= minNeeded;
    allGreen = ok;
    const lbl = myGender === 'male' ? '👨 Men' : myGender === 'female' ? '👩 Women' : '👥 Players';
    html = tableWrap +
      `<tr style="${rowBg(ok)}"><td style="${tdL}">${lbl}</td><td style="${tdN}">${minNeeded}</td><td style="${tdV(ok)}">${invSame}</td></tr>`+
      tableClose;

  } else {
    // Open (either) — total players
    const ok = selCount >= minNeeded;
    allGreen = ok;
    html = tableWrap +
      `<tr style="${rowBg(ok)}"><td style="${tdL}">👥 Players</td><td style="${tdN}">${minNeeded}</td><td style="${tdV(ok)}">${selCount}</td></tr>`+
      tableClose;
  }

  return { html, allGreen };
}

function buildSmInviteGrid(){
  const section = document.getElementById('smInviteGridSection');
  if(!section) return;

  // Grid always uses explicit selection — lock allGroups to 'specific' so submitMatch
  // only sends to hand-picked players, not the full IC.
  MS.inviteMode = 'specific';
  MS.selectedGroups = new Set(['specific']);
  MS.group = 'specific';
  if(!MS.specificPlayers) MS.specificPlayers = new Set();

  const { buckets, unrated, mySkill } = _smGetInviteBuckets();
  const isMixed = MS.genderPref === 'mixed';
  const playersPerCourt = MS.format === 'singles' ? 2 : 4;
  const minNeeded = (MS.numCourts * playersPerCourt) - 1;
  const selCount  = MS.specificPlayers.size;
  const metMin    = selCount >= minNeeded;

  // ── Summary grid (all paths: Open, Same, Mixed) ───────
  const summaryGrid = buildSmInviteSummaryGrid();
  const metAll = summaryGrid.allGreen;

  // Skill reference values shown under each column header — rounded to nearest 0.25
  const _fmtSkillVal = v => { const r = Math.round(v * 4) / 4; return r % 1 === 0 ? r.toFixed(1) : String(r); };
  const ranges = mySkill ? [
    `≤ ${_fmtSkillVal(mySkill - 0.50)}`,
    `${_fmtSkillVal(mySkill - 0.25)}`,
    `${_fmtSkillVal(mySkill)}`,
    `${_fmtSkillVal(mySkill + 0.25)}`,
    `≥ ${_fmtSkillVal(mySkill + 0.50)}`,
  ] : ['','','','',''];

  // Column selection state
  const colState = bkt => {
    if(!bkt.members.length) return 'empty';
    const n = bkt.members.filter(m => MS.specificPlayers.has((m.player.email||'').toLowerCase())).length;
    if(n === bkt.members.length) return 'all';
    if(n === 0) return 'none';
    return 'partial';
  };

  // Pill — adds gender indicator on Mixed path
  const pill = (email, name, gender) => {
    const sel = MS.specificPlayers.has(email);
    const ps  = sel
      ? 'background:#1a7a3a;color:#fff;border:1px solid #1a7a3a;'
      : 'background:#fff;color:#374151;border:1px solid #d1d5db;';
    const safeEmail = email.replace(/'/g,"\\'");
    const prefix = isMixed ? (gender==='male'?'👨 ':gender==='female'?'👩 ':'') : '';
    return `<div onclick="window._smToggleInvitePlayer('${safeEmail}')" style="${ps}border-radius:999px;padding:3px 7px;font-size:11px;font-weight:600;margin-bottom:3px;cursor:pointer;text-align:center;user-select:none;">${prefix}${name}</div>`;
  };

  // Build output: summary grid first, then 5-column skill grid
  let html = summaryGrid.html;
  html += '<div style="overflow-x:auto;margin-bottom:10px;">';
  html += '<table style="width:100%;border-collapse:separate;border-spacing:3px 0;table-layout:fixed;">';
  // Header row
  html += '<thead><tr>';
  buckets.forEach((bkt, i) => {
    const state = colState(bkt);
    const hBg   = state === 'all'     ? 'background:#1a7a3a;color:#fff;'
                : state === 'partial' ? 'background:#fef3c7;border:1.5px solid #f59e0b;color:#92400e;'
                : bkt.center          ? 'background:#d1fae5;color:#1a7a3a;'
                :                       'background:#f1f5f9;color:#374151;';
    const click  = bkt.members.length ? `onclick="window._smToggleBucket('${bkt.key}')" ` : '';
    const cursor = bkt.members.length ? 'cursor:pointer;' : '';
    html += `<th ${click}style="${hBg}${cursor}border-radius:8px 8px 0 0;padding:5px 3px;text-align:center;font-weight:800;user-select:none;">`;
    html += `<div style="font-size:10px;">${bkt.label}</div>`;
    if(ranges[i]) html += `<div style="font-size:9px;opacity:.65;margin-top:1px;">${ranges[i]}</div>`;
    html += '</th>';
  });
  html += '</tr></thead>';
  // Body — stacked pills per column
  html += '<tbody><tr>';
  buckets.forEach(bkt => {
    html += '<td style="vertical-align:top;padding:4px 1px;">';
    if(bkt.members.length){
      bkt.members.forEach(m => {
        const email  = (m.player.email||'').toLowerCase();
        const name   = ((m.player.first_name||'')+' '+(m.player.last_name||'')).trim() || '?';
        const gender = (m.player.gender||'').toLowerCase();
        html += pill(email, name, gender);
      });
    } else {
      html += '<div style="font-size:10px;color:#9ca3af;text-align:center;padding-top:4px;">—</div>';
    }
    html += '</td>';
  });
  html += '</tr></tbody></table></div>';

  // Unrated row
  if(unrated.length){
    html += '<div style="margin-bottom:10px;">';
    html += '<div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Unrated</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
    unrated.forEach(m => {
      const email  = (m.player.email||'').toLowerCase();
      const name   = ((m.player.first_name||'')+' '+(m.player.last_name||'')).trim() || '?';
      const gender = (m.player.gender||'').toLowerCase();
      html += pill(email, name, gender);
    });
    html += '</div></div>';
  }

  // Empty state
  if(!IC_MEMBERS.length){
    html += '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">No Inner Circle members yet. Add players to your IC first.</div>';
  }

  // Counter
  const counterTxt = metMin
    ? `${selCount} player${selCount!==1?'s':''} in invite pool ✓`
    : `${selCount} selected — need at least ${minNeeded} to continue`;
  const counterClr = metMin ? 'color:#16a34a;font-weight:700;' : 'color:#6b7280;font-weight:600;';
  html += `<div id="smInviteCounter" style="${counterClr}font-size:13px;text-align:center;margin-bottom:10px;">${counterTxt}</div>`;

  section.innerHTML = html;
}

window._smToggleBucket = function(bucketKey){
  const { buckets } = _smGetInviteBuckets();
  const bkt = buckets.find(b => b.key === bucketKey);
  if(!bkt || !bkt.members.length) return;
  const emails = bkt.members.map(m => (m.player.email||'').toLowerCase());
  const allSel = emails.every(e => MS.specificPlayers.has(e));
  if(allSel){
    emails.forEach(e => MS.specificPlayers.delete(e));
  } else {
    emails.forEach(e => MS.specificPlayers.add(e));
  }
  smUpdateProgress(4);
  smUpdateSummary();
  buildSmInviteGrid();
};

window._smToggleInvitePlayer = function(email){
  email = email.toLowerCase();
  if(MS.specificPlayers.has(email)) MS.specificPlayers.delete(email);
  else MS.specificPlayers.add(email);
  smUpdateProgress(4);
  smUpdateSummary();
  buildSmInviteGrid();
};

window._smInviteContinue = function(){
  smUpdateProgress(5);
  const next = document.getElementById('matchDate');
  if(next) next.scrollIntoView({ behavior:'smooth', block:'start' });
};

// ── Step 7 Invite Pool review (non-Set-Group path) ─────
function smRenderInvitePoolReview(){
  const wrap = document.getElementById('smReviewRosterWrap');
  if(!wrap) return;
  if(!MS.specificPlayers || !MS.specificPlayers.size){ wrap.style.display='none'; wrap.innerHTML=''; return; }
  const { buckets, unrated } = _smGetInviteBuckets();
  let html = '<div style="font-size:12px;font-weight:800;color:#1a7a3a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Invite Pool</div>';
  let any = false;
  buckets.forEach(bkt => {
    const names = bkt.members
      .filter(m => MS.specificPlayers.has((m.player.email||'').toLowerCase()))
      .map(m => ((m.player.first_name||'')+' '+(m.player.last_name||'')).trim() || m.player.email);
    if(!names.length) return;
    any = true;
    html += `<div style="margin-bottom:5px;font-size:12px;color:#374151;"><span style="font-weight:700;">${bkt.label}</span> (${names.length}): ${names.join(', ')}</div>`;
  });
  const unratedNames = unrated
    .filter(m => MS.specificPlayers.has((m.player.email||'').toLowerCase()))
    .map(m => ((m.player.first_name||'')+' '+(m.player.last_name||'')).trim() || m.player.email);
  if(unratedNames.length){ any=true; html += `<div style="margin-bottom:5px;font-size:12px;color:#374151;"><span style="font-weight:700;">Unrated</span> (${unratedNames.length}): ${unratedNames.join(', ')}</div>`; }
  if(!any){ wrap.style.display='none'; wrap.innerHTML=''; return; }
  wrap.innerHTML = html;
  wrap.style.display = 'block';
}

function smRenderReviewRoster(){
  const wrap = document.getElementById('smReviewRosterWrap');
  if(!wrap) return;
  const roster = MS.namedGroupRoster || {primary:[],subs:[]};
  const myEmail = (SESSION_PLAYER?.email || '').toLowerCase();
  const primary = roster.primary.filter(p => p.email && p.email.toLowerCase() !== myEmail);
  const subs    = roster.subs.filter(p => p.email && p.email.toLowerCase() !== myEmail);
  if(!primary.length && !subs.length){ wrap.style.display='none'; wrap.innerHTML=''; return; }
  let html = '<div style="font-size:12px;font-weight:800;color:#1a7a3a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Who\'s Invited</div>';
  if(primary.length){
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:'+(subs.length?'2px':'0')+'">';
    primary.forEach(p=>{ html += '<span style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:20px;padding:4px 10px;font-size:13px;color:#1a7a3a;font-weight:600;">'+p.name+'</span>'; });
    html += '</div>';
  }
  if(subs.length){
    html += '<div style="border-top:2px solid #333;margin:10px 0;"></div>';
    html += '<div style="font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Subs</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    subs.forEach(p=>{ html += '<span style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:20px;padding:4px 10px;font-size:13px;color:#9ca3af;font-style:italic;">'+p.name+'</span>'; });
    html += '</div>';
  }
  wrap.innerHTML = html;
  wrap.style.display = 'block';
}

function smUpdateSummary(){
  const rows = document.getElementById('smSummaryRows');
  if(!rows) return;
  const fmt = MS.format==='doubles' ? 'Doubles' : 'Singles';
  const gLbl = MS.genderPref==='mixed'?'Mixed':MS.genderPref==='same'?'Same Gender':'Open';
  const cLbl = MS.numCourts > 1 ? MS.numCourts+' courts' : '1 court';
  const formatStr = fmt+' · '+gLbl+' · '+cLbl;
  const date = document.getElementById('matchDate')?.value;
  const dateStr = date ? new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—';
  const startStr = MS.timeStart ? fmt12(MS.timeStart) : '—';
  const endStr   = MS.timeEnd   ? ' – '+fmt12(MS.timeEnd)  : '';
  const dateTimeStr = dateStr+(MS.timeStart ? ' · '+startStr+endStr : '');
  let courtStr = '—';
  if(MS.selectedCourts && MS.selectedCourts.size > 0){
    MS.selectedCourts.forEach(c=>{ courtStr = c.name+' · '+(c.isPrivate?'Private':'Public'); });
  }
  const mySkill  = S.skill||SESSION_PLAYER?.skill_level||'';
  const skills   = mySkill ? getAdjacentSkills(mySkill) : null;
  const allGroups = MS.selectedGroups && MS.selectedGroups.size ? MS.selectedGroups : new Set();
  const seen = new Set(); let invitedCount = 0;
  allGroups.forEach(g=>{
    if(!g||g==='specific') return;
    getGroupPlayers(g, skills).forEach(p=>{
      const e=(p.email||'').toLowerCase();
      if(!seen.has(e)){ seen.add(e); invitedCount++; }
    });
  });
  MS.specificPlayers.forEach(e=>{ if(!seen.has(e)){ seen.add(e); invitedCount++; } });
  let invLbl;
  if(MS.inviteMode==='all'){
    invLbl = invitedCount+' players from inner circle';
  } else if(MS.inviteMode==='specific'){
    invLbl = invitedCount+' specific player'+(invitedCount!==1?'s':'');
  } else if(MS.group && MS.group.startsWith('named_')){
    // CHANGE 6: named group — show primary + sub breakdown
    const primCount=MS.namedGroupMemberEmails?.size||0;
    const subCount=MS.namedGroupSubEmails?.size||0;
    invLbl = primCount+' player'+(primCount!==1?'s':'')+' invited'+(subCount>0?' · '+subCount+' sub'+(subCount!==1?'s':'')+' on standby':'');
  } else {
    invLbl = invitedCount+' players from group';
  }
  const rs='display:flex;align-items:center;justify-content:space-between;padding:9px 12px;font-size:13px;border-bottom:1px solid #f3f4f6;';
  const ls='color:#6b7280;font-weight:600;';
  const vs='color:#111;font-weight:600;text-align:right;max-width:60%;';
  rows.innerHTML=
    '<div style="'+rs+'"><span style="'+ls+'">Format</span><span style="'+vs+'">'+formatStr+'</span></div>'+
    '<div style="'+rs+'"><span style="'+ls+'">Date &amp; Time</span><span style="'+vs+'">'+dateTimeStr+'</span></div>'+
    '<div style="'+rs+'"><span style="'+ls+'">Court</span><span style="'+vs+'">'+courtStr+'</span></div>'+
    '<div style="'+rs+'border-bottom:none;"><span style="'+ls+'">Inviting</span><span style="'+vs+'">'+invLbl+'</span></div>';
  // Review roster / invite pool in Step 7
  if(MS.group && MS.group.startsWith('named_')){
    smRenderReviewRoster();
  } else if(MS.inviteMode === 'specific' && MS.specificPlayers && MS.specificPlayers.size > 0){
    smRenderInvitePoolReview();
  } else {
    const rrw=document.getElementById('smReviewRosterWrap');
    if(rrw){ rrw.style.display='none'; rrw.innerHTML=''; }
  }
}

function smUpdateNeededGrid(){
  const rows = document.getElementById('smNeededGridRows');
  if(!rows) return;
  const needed = matchMaxNeeded();
  const myGender = (S.gender||SESSION_PLAYER?.gender||'').toLowerCase();
  const mySkill  = S.skill||SESSION_PLAYER?.skill_level||'';
  const skills   = mySkill ? getAdjacentSkills(mySkill) : null;
  const allGroups = MS.selectedGroups && MS.selectedGroups.size ? MS.selectedGroups : new Set();
  const myOrgEmail=(SESSION_PLAYER?.email||getMyEmail()||'').toLowerCase();
  const seen = new Set();
  // Organizer is never counted in INVITED — matchMaxNeeded() already excludes them from NEEDED
  let invMen=0, invWomen=0, invTotal=0;
  // Named group short-circuit: use pre-fetched roster counts directly (group members may not be in IC)
  if(MS.group && MS.group.startsWith('named_')){
    invTotal=MS.namedGroupMemberEmails?.size||0;
    const pref2=MS.genderPref;
    const cn2='font-size:13px;font-weight:700;text-align:center;';
    const lb2='font-size:13px;font-weight:600;color:#374151;';
    const rs2='display:grid;grid-template-columns:1fr 72px 72px;padding:10px 12px;border-bottom:1px solid #f3f4f6;';
    const ls2='display:grid;grid-template-columns:1fr 72px 72px;padding:10px 12px;';
    rows.innerHTML='<div style="'+ls2+'"><div style="'+lb2+'">Players</div><div style="'+cn2+';color:#dc2626;">'+needed+'</div><div style="'+cn2+';color:#1a7a3a;">'+invTotal+'</div></div>';
    return;
  }
  IC_MEMBERS.forEach(({player})=>{
    const e=(player.email||'').toLowerCase();
    if(e===myOrgEmail) return; // never count the organizer
    if(seen.has(e)) return;
    let inc=false;
    for(const g of allGroups){
      if(!g||g==='specific') continue;
      if(g==='all'){ inc=true; break; }
      if(g==='favorites'&&IC_FAVORITES.has(e)){ inc=true; break; }
      const ps=parseFloat(player.skill_level||0);
      if(g==='my_level'&&skills&&Math.abs(ps-skills.my)<0.13){ inc=true; break; }
      if(g==='below'&&skills&&skills.below!==null&&Math.abs(ps-skills.below)<0.13){ inc=true; break; }
      if(g==='above'&&skills&&skills.above!==null&&Math.abs(ps-skills.above)<0.13){ inc=true; break; }
      // Named group — membership pre-fetched into MS.namedGroupMemberEmails on group select
      if(g.startsWith('named_')&&MS.namedGroupMemberEmails?.has(e)){ inc=true; break; }
    }
    if(!inc && allGroups.has('specific') && MS.specificPlayers.has(e)) inc=true;
    if(inc){
      seen.add(e); invTotal++;
      const g2=(player.gender||'').toLowerCase();
      if(g2==='male') invMen++; else if(g2==='female') invWomen++;
    }
  });
  const pref = MS.genderPref;
  const rs='display:grid;grid-template-columns:1fr 72px 72px;padding:10px 12px;border-bottom:1px solid #f3f4f6;';
  const ls='display:grid;grid-template-columns:1fr 72px 72px;padding:10px 12px;';
  const cn='font-size:13px;font-weight:700;text-align:center;';
  const lb='font-size:13px;font-weight:600;color:#374151;';
  if(pref==='either'){
    rows.innerHTML='<div style="'+ls+'"><div style="'+lb+'">Players</div><div style="'+cn+';color:#dc2626;">'+needed+'</div><div style="'+cn+';color:#1a7a3a;">'+invTotal+'</div></div>';
  } else {
    const nMen=pref==='mixed'?Math.floor(needed/2):(myGender==='male'?needed:0);
    const nWom=pref==='mixed'?Math.ceil(needed/2) :(myGender==='female'?needed:0);
    rows.innerHTML=
      '<div style="'+rs+'"><div style="'+lb+'">Men</div><div style="'+cn+';color:#dc2626;">'+nMen+'</div><div style="'+cn+';color:#1a7a3a;">'+invMen+'</div></div>'+
      '<div style="'+ls+'"><div style="'+lb+'">Women</div><div style="'+cn+';color:#dc2626;">'+nWom+'</div><div style="'+cn+';color:#1a7a3a;">'+invWomen+'</div></div>';
  }

}

async function smCheckConflict(){
  const warnBox = document.getElementById('smConflictBox');
  if(!warnBox) return;
  warnBox.style.display='none'; warnBox.innerHTML='';
  MS.hasOverlapConflict = false;
  const myEmail = getMyEmail();
  if(!myEmail) return;
  const date = document.getElementById('matchDate')?.value;
  const timeStart = MS.timeStart || document.getElementById('matchTimeStart')?.value;
  if(!date||!timeStart) return;

  // Check if the selected date+time is already in the past
  if(new Date(date+'T'+timeStart) < new Date()){
    MS.hasOverlapConflict = true;
    warnBox.style.display='block';
    warnBox.innerHTML='<div style="background:#7f1d1d;border-radius:10px;padding:10px 14px;margin-top:8px;">'+
      '<div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:4px;">This time has already passed</div>'+
      '<div style="color:#fca5a5;font-size:12px;line-height:1.5;">Please choose a future date and time for your match.</div>'+
      '</div>';
    smUpdateSendBtn();
    return;
  }
  const toMins = t=>{ if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
  const newStart = toMins(timeStart);
  const newEnd   = newStart + Math.round(MS.duration * 60);
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&match_date=eq.${date}&status=neq.cancelled&select=time_start,time_end,court_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const existing = res.ok ? await res.json() : [];
    const overlaps = existing.filter(m=>{
      const s=toMins(m.time_start), e=m.time_end?toMins(m.time_end):s+120;
      return newStart < e && newEnd > s;
    });
    const sameDayOnly = existing.filter(m=>{
      const s=toMins(m.time_start), e=m.time_end?toMins(m.time_end):s+120;
      return !(newStart < e && newEnd > s);
    });
    if(overlaps.length){
      MS.hasOverlapConflict = true;
      const m=overlaps[0];
      const ct=m.court_name?' at '+m.court_name:'';
      const ts=fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):'');
      warnBox.style.display='block';
      warnBox.innerHTML='<div style="background:#7f1d1d;border-radius:10px;padding:10px 14px;margin-top:8px;">'+
        '<div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:4px;">Schedule conflict</div>'+
        '<div style="color:#fca5a5;font-size:12px;line-height:1.5;">You have a match'+ct+' from '+ts+' that overlaps this time. Please choose a different time or date.</div>'+
        '</div>';
    } else if(sameDayOnly.length){
      warnBox.style.display='none'; warnBox.innerHTML='';
    }
  }catch(e){ console.warn('smCheckConflict:',e); }
  smUpdateSendBtn();
}

function smUpdateCourtPickerView(){
  const chip         = document.getElementById('smSelectedCourtChip');
  const priorityList = document.getElementById('smPriorityCourtsList');
  const showAllWrap  = document.getElementById('smShowAllCourtsWrap');
  const allSection   = document.getElementById('smAllCourtsSection');
  const addBtn       = document.getElementById('smAddCourtBtn');
  const hasSel       = MS.selectedCourts && MS.selectedCourts.size > 0;
  if(hasSel){
    let court; MS.selectedCourts.forEach(c=>{ court=c; });
    if(chip){
      chip.style.display='block';
      chip.innerHTML=
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:2px solid #1a7a3a;background:#f0fdf4;">'+
          '<span style="font-size:20px;flex-shrink:0;">✅</span>'+
          '<div style="flex:1;min-width:0;">'+
            '<div style="font-size:13px;font-weight:700;color:#1a7a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+court.name+'</div>'+
            '<div style="font-size:11px;color:#6b7280;">'+(court.isPrivate?'Private':'Public')+
              (court.address?' · '+court.address:'')+
            '</div>'+
          '</div>'+
          '<button onclick="smChangeCourt()" style="font-size:12px;font-weight:700;color:#6b7280;background:#fff;border:1.5px solid #d1d5db;border-radius:8px;padding:6px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;">Change</button>'+
        '</div>';
    }
    if(priorityList) priorityList.style.display='none';
    if(showAllWrap)  showAllWrap.style.display='none';
    if(allSection)   allSection.style.display='none';
    if(addBtn)       addBtn.style.display='none';
  } else {
    if(chip){ chip.style.display='none'; chip.innerHTML=''; }
    if(priorityList) priorityList.style.display='';
    if(showAllWrap)  showAllWrap.style.display='';
    if(allSection)   allSection.style.display=_smAllCourtsExpanded?'':'none';
    if(addBtn)       addBtn.style.display='';
  }
}

window.smChangeCourt = function(){
  MS.selectedCourts.clear();
  MS.courtId=null; MS.courtName=null; MS.isPrivate=false;
  _smAllCourtsExpanded = false;
  smUpdateCourtPickerView();
  smLoadCourtsPriority();
  renderCourtCapacityWarning();
  smUpdateSendBtn();
  smUpdateSummary();
};

window.smToggleAllCourts = function(){
  _smAllCourtsExpanded = !_smAllCourtsExpanded;
  const sec = document.getElementById('smAllCourtsSection');
  const btn = document.getElementById('smShowAllCourtsBtn');
  if(sec) sec.style.display = _smAllCourtsExpanded ? '' : 'none';
  if(btn) btn.textContent = _smAllCourtsExpanded ? 'Show fewer ▲' : 'Show all courts ▼';
  if(_smAllCourtsExpanded) smLoadCourts();
};

function smSetCourtType(type){
  MS.courtType = type;
  const pubBtn=document.getElementById('smCourtTypePublic');
  const privBtn=document.getElementById('smCourtTypePrivate');
  if(pubBtn){
    pubBtn.style.background=type==='public'?'#1a7a3a':'#f3f4f6';
    pubBtn.style.color=type==='public'?'#fff':'#374151';
    pubBtn.style.borderColor=type==='public'?'#1a7a3a':'#d1d5db';
  }
  if(privBtn){
    privBtn.style.background=type==='private'?'#1a7a3a':'#f3f4f6';
    privBtn.style.color=type==='private'?'#fff':'#374151';
    privBtn.style.borderColor=type==='private'?'#1a7a3a':'#d1d5db';
  }
  const savedLbl=document.getElementById('smSavedCourtsLabel');
  const otherLbl=document.getElementById('smOtherCourtsLabel');
  if(savedLbl) savedLbl.textContent='My saved '+type+' courts';
  if(otherLbl) otherLbl.textContent='Other '+type+' courts nearby';
  // Clear selection when switching types
  MS.selectedCourts.clear();
  MS.courtId=null; MS.courtName=null; MS.isPrivate=false;
  smUpdateCourtPickerView();
  smLoadCourtsPriority();
  if(_smAllCourtsExpanded) smLoadCourts();
}

function normalizeCourtName(name){
  return (name||'').toLowerCase().replace(/[^a-z0-9]/g,'').trim();
}

async function smLoadCourtsPriority(){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  const priorityEl = document.getElementById('smPriorityCourtsList');
  if(!priorityEl) return;
  priorityEl.innerHTML='<div style="font-size:11px;color:#6b7280;padding:4px 0;">Loading…</div>';
  const isPrivate = MS.courtType==='private';
  try{
    // Step A: 3 most recently used courts from match history
    const mRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&select=court_id,court_name,match_date&order=match_date.desc&limit=20`,
      {headers:{apikey:SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const matchRows = mRes.ok ? await mRes.json() : [];
    const seenIds = new Set();
    const recentCourtIds = [];
    for(const m of matchRows){
      if(m.court_id && !seenIds.has(m.court_id)){
        seenIds.add(m.court_id);
        recentCourtIds.push(m.court_id);
        if(recentCourtIds.length >= 3) break;
      }
    }
    // Step B: fill remaining slots from saved courts (up to 5 total)
    const pcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id`,
      {headers:{apikey:SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const pcRows = pcRes.ok ? await pcRes.json() : [];
    const savedCourtIds = pcRows.map(r=>r.court_id).filter(Boolean);
    const priorityIds = [...recentCourtIds];
    for(const id of savedCourtIds){
      if(!seenIds.has(id)){
        seenIds.add(id);
        priorityIds.push(id);
        if(priorityIds.length >= 5) break;
      }
    }
    // Step C: if nothing in history/saved, use all saved courts
    const idsToFetch = priorityIds.length ? priorityIds : savedCourtIds.slice(0,8);
    let courts = [];
    if(idsToFetch.length){
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/courts?id=in.(${idsToFetch.join(',')})&is_private=eq.${isPrivate}&select=id,name,address,city,is_private,num_courts`,
        {headers:{apikey:SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      courts = cRes.ok ? await cRes.json() : [];
      courts.sort((a,b)=>idsToFetch.indexOf(a.id)-idsToFetch.indexOf(b.id));
    }
    priorityEl.innerHTML='';
    if(!courts.length){
      priorityEl.innerHTML='<div style="font-size:12px;color:#9ca3af;padding:4px 0;font-style:italic;">No '+(isPrivate?'private':'public')+' courts saved yet.</div>';
    } else {
      courts.forEach(c=>_smRenderCompactCourtRow(c,priorityEl));
    }
  }catch(e){
    if(priorityEl) priorityEl.innerHTML='<div style="font-size:12px;color:#dc2626;">Could not load courts.</div>';
  }
}

function _smRenderCompactCourtRow(court, container){
  const selected = MS.selectedCourts.has(court.id);
  const row = document.createElement('div');
  row.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;'+
    'border:1.5px solid '+(selected?'#1a7a3a':'#e5e7eb')+';'+
    'background:'+(selected?'#f0fdf4':'#f9fafb')+';cursor:pointer;margin-bottom:6px;transition:all .15s;';
  const radio = document.createElement('div');
  radio.style.cssText='width:14px;height:14px;border-radius:50%;border:2px solid '+(selected?'#1a7a3a':'#9ca3af')+';'+
    'background:'+(selected?'#1a7a3a':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;';
  if(selected) radio.innerHTML='<div style="width:5px;height:5px;border-radius:50%;background:#fff;"></div>';
  const lbl = document.createElement('div');
  lbl.style.cssText='flex:1;min-width:0;font-size:13px;font-weight:600;color:'+(selected?'#1a7a3a':'#111')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  lbl.textContent=court.name;
  const badge = document.createElement('span');
  badge.style.cssText='font-size:11px;color:#6b7280;white-space:nowrap;flex-shrink:0;';
  badge.textContent=court.is_private?'🏢':'🌳';
  row.appendChild(radio); row.appendChild(lbl); row.appendChild(badge);
  row.onclick=()=>{
    if(MS.selectedCourts.has(court.id)){
      MS.selectedCourts.delete(court.id);
      MS.courtId=null; MS.courtName=null; MS.isPrivate=false;
    } else {
      MS.selectedCourts.clear();
      MS.selectedCourts.set(court.id,{
        name:court.name,
        address:(court.address||'')+(court.city?', '+court.city:''),
        isPrivate:court.is_private||false,
        preferred:true,
        numCourts:court.num_courts??null
      });
      MS.courtId=court.id; MS.courtName=court.name; MS.isPrivate=court.is_private||false;
    }
    renderCourtCapacityWarning();
    smUpdateSendBtn();
    smUpdateSummary();
    smUpdateCourtPickerView();
    updateMatchCourtsNext();
  };
  container.appendChild(row);
}

async function smLoadCourts(){
  const myEmail=getMyEmail();
  if(!myEmail) return;
  const savedEl=document.getElementById('smSavedCourts');
  const otherEl=document.getElementById('smOtherCourts');
  if(!savedEl) return;
  savedEl.innerHTML='<div style="font-size:11px;color:#6b7280;">Loading…</div>';
  if(otherEl) otherEl.innerHTML='';
  const isPrivate = MS.courtType==='private';
  try{
    const pcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const pcRows = pcRes.ok ? await pcRes.json() : [];
    const allSavedIds = pcRows.map(r=>r.court_id).filter(Boolean);
    let savedCourts=[];
    if(allSavedIds.length){
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/courts?id=in.(${allSavedIds.join(',')})&is_private=eq.${isPrivate}&select=id,name,address,city,is_private,num_courts`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      savedCourts = res.ok ? await res.json() : [];
    }
    savedEl.innerHTML='';
    if(!savedCourts.length){
      savedEl.innerHTML='<div style="font-size:12px;color:#9ca3af;padding:4px 0;font-style:italic;">No '+(isPrivate?'private':'public')+' courts saved yet.</div>';
    } else {
      savedCourts.forEach(c=>_smRenderCourtRow(c, savedEl, false));
    }
    if(otherEl){
      // Build saved-court dedup sets (ID + fuzzy normalized name)
      const savedCourtIdSet      = new Set(savedCourts.map(c=>c.id));
      const savedCourtNormalized = new Set(savedCourts.map(c=>normalizeCourtName(c.court_name||c.name)));
      const allExcludeIds = [...new Set([...allSavedIds, ...savedCourtIdSet])];
      let q=`${SUPABASE_URL}/rest/v1/courts?is_private=eq.${isPrivate}&select=id,name,address,city,is_private,num_courts&limit=12`;
      if(allExcludeIds.length) q+=`&id=not.in.(${allExcludeIds.join(',')})`;
      const oRes = await fetch(q,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      // FIX 1: fuzzy dedup against saved list; FIX 2: dedup within nearby list itself
      const seenNormalized = new Set();
      const otherCourts = (oRes.ok ? await oRes.json() : []).filter(c=>{
        if(savedCourtIdSet.has(c.id)) return false;
        const norm = normalizeCourtName(c.name);
        if(savedCourtNormalized.has(norm)) return false;
        if(seenNormalized.has(norm)) return false;
        seenNormalized.add(norm);
        return true;
      });
      otherEl.innerHTML='';
      if(!otherCourts.length){
        otherEl.innerHTML='<div style="font-size:12px;color:#9ca3af;padding:4px 0;font-style:italic;">No other '+(isPrivate?'private':'public')+' courts found.</div>';
      } else {
        otherCourts.forEach(c=>_smRenderCourtRow(c, otherEl, true));
      }
    }
  }catch(e){ if(savedEl) savedEl.innerHTML='<div style="font-size:12px;color:#dc2626;">Could not load courts.</div>'; }
}

function _smRenderCourtRow(court, container, showSaveBtn){
  const selected = MS.selectedCourts.has(court.id);
  const row = document.createElement('div');
  row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;'+
    'border:2px solid '+(selected?'#1a7a3a':'#d1d5db')+';'+
    'background:'+(selected?'#f0fdf4':'#f9fafb')+';cursor:pointer;margin-bottom:8px;transition:all .15s;';
  const info=document.createElement('div');
  info.style.cssText='flex:1;min-width:0;';
  info.innerHTML='<div style="font-size:13px;font-weight:600;color:#111;">'+(selected?'<span style="color:#1a7a3a;margin-right:4px;">✓</span>':'')+court.name+'</div>'+
    '<div style="font-size:11px;color:#6b7280;">'+(court.city||'')+(court.num_courts?' · '+court.num_courts+' court'+(court.num_courts!==1?'s':''):'')+'</div>';
  row.appendChild(info);
  if(showSaveBtn && !selected){
    const sv=document.createElement('button');
    sv.textContent='+ Save';
    sv.style.cssText='font-size:11px;color:#1a7a3a;background:rgba(26,122,58,0.08);border:1px solid rgba(26,122,58,0.3);border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;';
    sv.onclick=async(e)=>{
      e.stopPropagation();
      try{
        const myEmail = getMyEmail();
        // Duplicate check: fetch saved court IDs, then names, compare normalized
        const pcRes = await fetch(
          `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        const pcRows = pcRes.ok ? await pcRes.json() : [];
        const savedIds = pcRows.map(r=>r.court_id).filter(Boolean);
        let savedCourts = [];
        if(savedIds.length){
          const scRes = await fetch(
            `${SUPABASE_URL}/rest/v1/courts?id=in.(${savedIds.join(',')})&select=id,name`,
            {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
          );
          savedCourts = scRes.ok ? await scRes.json() : [];
        }
        const normalizedNew = normalizeCourtName(court.name);
        const existingMatch = savedCourts.find(c=>normalizeCourtName(c.name)===normalizedNew);
        if(existingMatch){
          showToast('📍 You already have "'+existingMatch.name+'" saved — looks like the same court.','#d97706');
          return;
        }
        await fetch(`${SUPABASE_URL}/rest/v1/player_courts`,{method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body:JSON.stringify({player_email:myEmail,court_id:court.id})});
        smLoadCourts();
      }catch(e2){}
    };
    row.appendChild(sv);
  }
  row.onclick=()=>{
    if(MS.selectedCourts.has(court.id)){
      MS.selectedCourts.delete(court.id);
      MS.courtId=null; MS.courtName=null; MS.isPrivate=false;
    } else {
      MS.selectedCourts.clear();
      MS.selectedCourts.set(court.id,{
        name:court.name,
        address:(court.address||'')+(court.city?', '+court.city:''),
        isPrivate:court.is_private||false,
        preferred:true,
        numCourts:court.num_courts??null
      });
      MS.courtId=court.id; MS.courtName=court.name; MS.isPrivate=court.is_private||false;
    }
    renderCourtCapacityWarning();
    smUpdateSendBtn();
    smUpdateSummary();
    smUpdateCourtPickerView();
  };
  container.appendChild(row);
}

function smSelectInvite(mode, skipProgress){
  MS.inviteMode = mode;
  if(!skipProgress) smUpdateProgress(4); // Invites is now Step 4
  ['all','specific','group'].forEach(m=>{
    const cap = m.charAt(0).toUpperCase()+m.slice(1);
    const el = document.getElementById('smInvite'+cap);
    if(!el) return;
    if(m===mode){ el.style.border='2px solid #1a7a3a'; el.style.background='#f0fdf4'; }
    else         { el.style.border='1px solid #e5e7eb'; el.style.background='#fff'; }
  });
  const specWrap=document.getElementById('smSpecificPickerWrap');
  const grpWrap=document.getElementById('smGroupPickerWrap');
  if(specWrap) specWrap.style.display=mode==='specific'?'block':'none';
  if(grpWrap)  grpWrap.style.display=mode==='group'?'block':'none';
  if(mode==='all'){
    MS.selectedGroups=new Set(['all']); MS.group='all';
  } else if(mode==='specific'){
    MS.selectedGroups=new Set(['specific']); MS.group='specific';
    buildSpecificPicker();
  } else if(mode==='group'){
    // If a named group is already selected (coming from Step 1 group picker),
    // show the read-only roster instead of the group dropdown
    if(MS.group && MS.group.startsWith('named_')){
      smRenderStep6GroupRoster();
    } else {
      MS.selectedGroups=new Set(); MS.group=null;
      smLoadGroupSelect();
    }
  }
  smUpdateNeededGrid();
  smUpdateSummary();
  smUpdateSendBtn();
}

async function smLoadGroupSelect(){
  const sel=document.getElementById('smGroupSelect');
  if(!sel||!SESSION_PLAYER?.is_organizer) return;
  const myEmail=getMyEmail();
  try{
    const res=await fetch(
      `${SUPABASE_URL}/rest/v1/player_groups?organizer_email=eq.${encodeURIComponent(myEmail)}&order=created_at.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const groups=res.ok?await res.json():[];
    _groups=groups;
    sel.innerHTML='<option value="">Select a group…</option>'+
      groups.map(g=>'<option value="'+g.id+'">'+g.name+' ('+g.max_players+' players)</option>').join('');
  }catch(e){}
}

// Fetch all members (primary + sub) for a named group, excluding the organizer.
// Populates MS.namedGroupMemberEmails (primary), MS.namedGroupSubEmails (sub),
// and MS.namedGroupRoster = {primary:[{email,name}], subs:[{email,name}]}.
// Returns the roster object.
async function smFetchGroupRoster(groupId){
  const myEmail=(SESSION_PLAYER?.email||getMyEmail()||'').toLowerCase();
  MS.namedGroupMemberEmails=new Set();
  MS.namedGroupSubEmails=new Set();
  MS.namedGroupRoster={primary:[],subs:[]};
  try{
    const res=await fetch(
      `${SUPABASE_URL}/rest/v1/player_group_members?group_id=eq.${encodeURIComponent(groupId)}&select=player_email,role`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const rows=res.ok?await res.json():[];
    const allEmails=rows.map(r=>(r.player_email||'').toLowerCase()).filter(e=>e&&e!==myEmail);
    if(allEmails.length){
      const nameRes=await fetch(
        `${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${allEmails.map(encodeURIComponent).join(',')})&select=email,first_name,last_name`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      const profiles=nameRes.ok?await nameRes.json():[];
      const nameMap={};
      profiles.forEach(p=>{ nameMap[(p.email||'').toLowerCase()]=((p.first_name||'')+' '+(p.last_name||'')).trim()||p.email; });
      rows.forEach(r=>{
        const e=(r.player_email||'').toLowerCase();
        if(!e||e===myEmail) return;
        const name=nameMap[e]||e;
        if((r.role||'').toLowerCase()==='sub'){
          MS.namedGroupSubEmails.add(e);
          MS.namedGroupRoster.subs.push({email:e,name});
        } else {
          MS.namedGroupMemberEmails.add(e);
          MS.namedGroupRoster.primary.push({email:e,name});
        }
      });
    }
  }catch(e){}
  return MS.namedGroupRoster;
}

// Legacy alias — returns primary email Set. Use smFetchGroupRoster for full data.
async function smFetchNamedGroupMembers(groupId){
  await smFetchGroupRoster(groupId);
  return MS.namedGroupMemberEmails;
}

// Show a modal with the group's primary + sub roster.
async function smShowGroupRosterModal(groupId){
  const roster=MS.namedGroupRoster||{primary:[],subs:[]};
  const grp=(_groups||[]).find(g=>String(g.id)===String(groupId));
  const grpName=grp?grp.name:'Group';
  const primary=roster.primary; const subs=roster.subs;
  // Include organizer (SESSION_PLAYER) in the primary count and display
  const orgName = SESSION_PLAYER
    ? (((SESSION_PLAYER.first_name||'')+' '+(SESSION_PLAYER.last_name||'')).trim() || 'You')
    : 'You';
  const totalPrimary = primary.length + 1; // +1 for organizer
  const existing=document.getElementById('smGroupRosterModal');
  if(existing) existing.remove();
  const overlay=document.createElement('div');
  overlay.id='smGroupRosterModal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
  const inner=document.createElement('div');
  inner.style.cssText='background:#fff;border-radius:16px;padding:24px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;';
  let html='<div style="font-size:17px;font-weight:800;color:#111;margin-bottom:16px;">'+grpName+' Roster</div>';
  html+='<div style="font-size:12px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px;">Primary Players ('+totalPrimary+')</div>';
  html+='<ul style="list-style:none;padding:0;margin:0 0 16px;">';
  // Organizer always first
  html+='<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111;">'+
    orgName+' <span style="font-size:11px;font-weight:700;color:#dc2626;margin-left:4px;">organizer</span></li>';
  primary.forEach(p=>{ html+='<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111;">'+p.name+'</li>'; });
  html+='</ul>';
  if(subs.length){
    html+='<div style="font-size:12px;font-weight:700;color:#6b7280;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px;">Subs ('+subs.length+')</div>';
    html+='<ul style="list-style:none;padding:0;margin:0 0 4px;">';
    subs.forEach(p=>{ html+='<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;font-style:italic;">'+p.name+' <span style="font-size:12px;color:#9ca3af;">(sub)</span></li>'; });
    html+='</ul>';
  }
  html+='<button onclick="document.getElementById(\'smGroupRosterModal\').remove()" style="width:100%;padding:12px;border-radius:10px;background:#1a7a3a;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;margin-top:16px;">Looks good, continue ✓</button>';
  inner.innerHTML=html;
  overlay.appendChild(inner);
  document.body.appendChild(overlay);
}

// Lock Steps 2 & 3 controls when a named group auto-sets format + courts.
function smLockSteps2And3(fmt, courts){
  const lbl2=document.getElementById('smStep2LockedLabel');
  const lbl3=document.getElementById('smStep3LockedLabel');
  if(lbl2){
    lbl2.textContent='Set by group: '+(fmt==='singles'?'Singles':'Doubles')+' · '+courts+' court'+(courts!==1?'s':'');
    lbl2.style.display='block';
  }
  if(lbl3){
    lbl3.textContent='Set by group: '+courts+' court'+(courts!==1?'s':'');
    lbl3.style.display='block';
  }
  ['smFmtDoubles','smFmtSingles'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.style.pointerEvents='none'; el.style.opacity='0.55'; }
  });
  for(let i=1;i<=4;i++){
    const el=document.getElementById('smCourtsBtn'+i);
    if(el){ el.style.pointerEvents='none'; el.style.opacity='0.55'; }
  }
}

// Lock Step 4 into read-only collapsed banner (Set Group path — specific group selected).
function smLockStep4(count){
  const lbl=document.getElementById('smStep4LockedLabel');
  if(lbl){
    lbl.textContent='Invites set by your group · '+count+' player'+(count!==1?'s':'');
    lbl.style.display='block';
  }
  const igs=document.getElementById('smInviteGridSection');
  if(igs) igs.style.display='none';
}

// Unlock Step 4 (call when group is deselected or user picks a non-group play structure).
function smUnlockStep4(){
  const lbl=document.getElementById('smStep4LockedLabel');
  if(lbl){ lbl.style.display='none'; lbl.textContent=''; }
  const igs=document.getElementById('smInviteGridSection');
  if(igs) igs.style.display='';
}

// Unlock Steps 2 & 3 (call when user deselects group or picks a non-group play structure).
function smUnlockSteps2And3(){
  const lbl2=document.getElementById('smStep2LockedLabel');
  const lbl3=document.getElementById('smStep3LockedLabel');
  if(lbl2){ lbl2.style.display='none'; lbl2.textContent=''; }
  if(lbl3){ lbl3.style.display='none'; lbl3.textContent=''; }
  ['smFmtDoubles','smFmtSingles'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.style.pointerEvents=''; el.style.opacity=''; }
  });
  for(let i=1;i<=4;i++){
    const el=document.getElementById('smCourtsBtn'+i);
    if(el){ el.style.pointerEvents=''; el.style.opacity=''; }
  }
}

// Render the read-only group roster in Step 6, hiding the invite-mode picker cards.
function smRenderStep6GroupRoster(){
  const display=document.getElementById('smGroupRosterDisplay');
  if(!display) return;
  const roster=MS.namedGroupRoster||{primary:[],subs:[]};
  const primary=roster.primary; const subs=roster.subs;
  const primCount=MS.namedGroupMemberEmails?.size||0;
  const subCount=MS.namedGroupSubEmails?.size||0;
  // Hide invite-mode picker cards
  ['smInviteSpecific','smInviteGroup'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
  const specWrap=document.getElementById('smSpecificPickerWrap');
  const grpWrap=document.getElementById('smGroupPickerWrap');
  if(specWrap) specWrap.style.display='none';
  if(grpWrap) grpWrap.style.display='none';
  // Build read-only roster HTML
  let html='<div style="font-size:12px;font-weight:700;color:#1a7a3a;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">'+primCount+' player'+(primCount!==1?'s':'')+' invited'+(subCount>0?' · '+subCount+' sub'+(subCount!==1?'s':'')+' on standby':'')+'</div>';
  if(primary.length){
    html+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:'+(subs.length?'10px':'0')+'">';
    primary.forEach(p=>{ html+='<span style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:20px;padding:4px 10px;font-size:13px;color:#1a7a3a;font-weight:600;">'+p.name+'</span>'; });
    html+='</div>';
  }
  if(subs.length){
    html+='<div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Subs</div>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    subs.forEach(p=>{ html+='<span style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:20px;padding:4px 10px;font-size:13px;color:#9ca3af;font-style:italic;">'+p.name+'</span>'; });
    html+='</div>';
  }
  display.innerHTML=html;
  display.style.display='block';
}

async function smOnGroupSelect(value){
  if(!value){
    MS.selectedGroups=new Set(); MS.group=null;
    MS.namedGroupMemberEmails=new Set(); MS.namedGroupSubEmails=new Set();
    MS.namedGroupRoster={primary:[],subs:[]};
    const display=document.getElementById('smGroupRosterDisplay');
    if(display){ display.style.display='none'; display.innerHTML=''; }
    // Restore invite-mode picker cards
    ['smInviteSpecific','smInviteGroup'].forEach(id=>{
      const d=document.getElementById(id); if(d) d.style.display='';
    });
  } else {
    MS.selectedGroups=new Set(['named_'+value]); MS.group='named_'+value;
    await smFetchGroupRoster(value);
    // CHANGE 5: Show read-only roster in Step 6
    smRenderStep6GroupRoster();
  }
  smUpdateNeededGrid();
  smUpdateSummary();
  smUpdateSendBtn();
}

function initSetupMatch(){
  _smInitializing = true;
  // Reset MS state
  MS.format='doubles'; MS.numCourts=1; MS.group=null;
  MS.specificPlayers=new Set(); MS.extraGroups=new Set(); MS.selectedGroups=new Set(['all']);
  MS.deselectedPlayers=new Set(); MS.primaryPlayers=new Set(); MS.subPlayers=new Set();
  MS.namedGroupMemberEmails=new Set(); MS.namedGroupSubEmails=new Set();
  MS.namedGroupRoster={primary:[],subs:[]}; MS.allGroupsRoster=null; MS.selectedGroupId=null;
  window._smGroupGridSelectedId=null;
  MS.isFeeler=false; MS.duration=2; MS.selectedCourts=new Map();
  MS.hasOverlapConflict=false; MS.courtType='public'; MS.inviteMode='all';
  _smAllCourtsExpanded=false;
  MS.timeStart=null; MS.timeEnd=null; MS.date=null;
  MS.courtId=null; MS.courtName=null; MS.courtAddress=null; MS.isPrivate=false;

  // Format buttons
  const dbl=document.getElementById('smFmtDoubles'), sgl=document.getElementById('smFmtSingles');
  if(dbl){ dbl.style.border='2px solid #1a7a3a'; dbl.style.background='#f0fdf4'; }
  if(sgl){ sgl.style.border='1px solid #e5e7eb'; sgl.style.background='#fff'; }

  // Court count buttons
  selectNumCourts(1);

  // Gender buttons — reset borders, backgrounds, and any dimming from a previous Set Group selection
  const ge=document.getElementById('smGenderEither'), gm=document.getElementById('smGenderMixed'), gs=document.getElementById('smGenderSame'), gg=document.getElementById('smGenderGroup');
  if(ge){ ge.style.border='2px solid #1a7a3a'; ge.style.background='#f0fdf4'; ge.classList.remove('sm-option-dimmed'); }
  if(gm){ gm.style.border='1px solid #e5e7eb'; gm.style.background='#fff'; gm.classList.remove('sm-option-dimmed'); }
  if(gs){ gs.style.border='1px solid #e5e7eb'; gs.style.background='#fff'; gs.classList.remove('sm-option-dimmed'); }
  if(gg){ gg.style.border='1px solid #e5e7eb'; gg.style.background='#fff'; }
  const gw=document.getElementById('smGenderGroupWrap'); if(gw){ gw.style.display='none'; gw.innerHTML=''; }
  smUnlockStep4();
  const igs=document.getElementById('smInviteGridSection'); if(igs) igs.innerHTML='';
  MS.genderPref = 'either';
  buildSmInviteGrid();
  const rrw=document.getElementById('smReviewRosterWrap'); if(rrw){ rrw.style.display='none'; rrw.innerHTML=''; }

  // Invite mode buttons
  const isp=document.getElementById('smInviteSpecific'), ig=document.getElementById('smInviteGroup');
  if(isp){ isp.style.border='1px solid #e5e7eb'; isp.style.background='#fff'; }
  if(ig){ ig.style.border='1px solid #e5e7eb'; ig.style.background='#fff'; }

  // Hide pickers
  const specWrap=document.getElementById('smSpecificPickerWrap');
  const grpWrap=document.getElementById('smGroupPickerWrap');
  if(specWrap) specWrap.style.display='none';
  if(grpWrap) grpWrap.style.display='none';
  // Reset group roster display and unlock steps 2 & 3
  const rosterDisp=document.getElementById('smGroupRosterDisplay');
  if(rosterDisp){ rosterDisp.style.display='none'; rosterDisp.innerHTML=''; }
  ['smInviteSpecific','smInviteGroup'].forEach(id=>{
    const d=document.getElementById(id); if(d) d.style.display='';
  });
  smUnlockSteps2And3();

  // Build time dropdowns
  buildMatchTimeChips();
  const dur=document.getElementById('matchDurationDisplay');
  if(dur) dur.textContent='2 hrs';
  const endDisp=document.getElementById('smEndTimeDisplay');
  if(endDisp) endDisp.textContent='—';
  const tStart=document.getElementById('matchTimeStart');
  if(tStart) tStart.value='';

  // Auto-select date
  const now=new Date();
  const defaultDate=now.getHours()>=18 ? new Date(now.getTime()+86400000) : now;
  const dateStr=defaultDate.toISOString().split('T')[0];
  const dateEl=document.getElementById('matchDate');
  if(dateEl){ dateEl.min=now.toISOString().split('T')[0]; dateEl.value=dateStr; MS.date=dateStr; }

  // Reset conflict box
  const conflictBox=document.getElementById('smConflictBox');
  if(conflictBox){ conflictBox.style.display='none'; conflictBox.innerHTML=''; }

  // Load court type (resets selection and loads courts)
  smSetCourtType('public');

  // Update UI
  smUpdateNeededBox();
  smUpdateNeededGrid();
  smUpdateSummary();
  smUpdateSendBtn();

  _smInitializing = false;
  _smCurrentStep = 1;
  smUpdateProgress(1);

  applyPendingMatchInvitee();
}

function applyPendingMatchInvitee(){
  if(!_pendingMatchInvitee) return;
  const { email } = _pendingMatchInvitee;
  _pendingMatchInvitee = null;
  MS.specificPlayers.add(email);
  smSelectInvite('specific');
}

// ══════════════════════════════════════════════════════
// MATCH RESPONSE FLOW
// Handles ?match=ID in URL — invitee clicking email link
// ══════════════════════════════════════════════════════

async function checkMatchToken(){
  const params   = new URLSearchParams(window.location.search);
  if(params.get('action') === 'emergency_fill') return; // handled by restoreSession
  const matchId  = params.get('match');
  if(!matchId) return;

  try{
    // Fetch match details
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=*`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const matches = res.ok ? await res.json() : [];
    if(!matches.length) return;
    const match = matches[0];

    // Mark as viewed if player is logged in
    const myEmail = getMyEmail();
    if(myEmail){
      await fetch(
        `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&player_email=eq.${encodeURIComponent(myEmail)}`,
        {method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
         body:JSON.stringify({viewed_at:new Date().toISOString()})}
      ).catch(()=>{});
    }

    // Clear ?match= from URL so a page refresh doesn't re-trigger this handler
    const cleanUrl = window.location.pathname + window.location.hash;
    history.replaceState(null, '', cleanUrl);

    // Navigate to the invited-by-others page
    showPage('invitedByOthers');

  }catch(e){ console.warn('checkMatchToken error:', e); }
}

// Returns array of conflicting matches the player is already "in", or empty array.
async function checkMatchConflict(playerEmail, newMatch){
  try{
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(playerEmail)}&response=eq.in&select=match_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const rows = rRes.ok ? await rRes.json() : [];
    if(!rows.length) return [];
    const ids = rows.map(r=>r.match_id).filter(id=>id!==newMatch.id);
    if(!ids.length) return [];
    const mRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&match_date=eq.${newMatch.match_date}&select=id,time_start,time_end,court_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const existingMatches = mRes.ok ? await mRes.json() : [];
    const newStart = newMatch.time_start;
    const newEnd   = newMatch.time_end || '23:59';
    return existingMatches.filter(m=>{
      const s = m.time_start; const e = m.time_end || '23:59';
      return s && newStart && s < newEnd && newStart < e;
    });
  }catch(e){ console.warn('Conflict check failed:', e); return []; }
}

// Conflict confirm dialog — shows a schedule table of existing committed matches.
// existingMatches: array of match objects (with time_start, time_end, court_name, match_date)
// newMatch: the match being accepted
function showConflictConfirm(existingMatches, newMatch){
  return new Promise(resolve=>{
    const dateStr = newMatch.match_date
      ? new Date(newMatch.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})
      : '';
    const newTime = fmt12(newMatch.time_start)+(newMatch.time_end?' – '+fmt12(newMatch.time_end):'');

    const rowsHtml = existingMatches.map(m=>{
      const t = fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):'');
      return '<tr>'+
        '<td style="padding:6px 10px;font-size:12px;font-weight:700;color:#111;">'+t+'</td>'+
        '<td style="padding:6px 10px;font-size:12px;color:#374151;">'+(m.court_name||'TBD')+'</td>'+
        '<td style="padding:6px 10px;"><span style="font-size:10px;font-weight:700;background:#fee2e2;color:#dc2626;border-radius:4px;padding:2px 6px;">CONFLICT</span></td>'+
      '</tr>';
    }).join('');

    const tableHtml =
      '<div style="margin-bottom:14px;">'+
        '<div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Your schedule on '+dateStr+'</div>'+
        '<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">'+
          '<thead><tr style="background:#f3f4f6;">'+
            '<th style="padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:700;">Time</th>'+
            '<th style="padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:700;">Court</th>'+
            '<th style="padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:700;">Status</th>'+
          '</tr></thead>'+
          '<tbody>'+rowsHtml+'</tbody>'+
          '<tfoot><tr style="background:#fef9c3;border-top:1px solid #fde68a;">'+
            '<td style="padding:6px 10px;font-size:12px;font-weight:800;color:#92400e;">'+newTime+'</td>'+
            '<td style="padding:6px 10px;font-size:12px;color:#92400e;">'+(newMatch.court_name||newMatch.court_address||'TBD')+'</td>'+
            '<td style="padding:6px 10px;"><span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;border-radius:4px;padding:2px 6px;">NEW INVITE</span></td>'+
          '</tr></tfoot>'+
        '</table>'+
      '</div>';

    const overlay = document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML=
      '<div style="background:#fff;border:2px solid #f87171;border-radius:16px;padding:24px;max-width:420px;width:100%;font-family:\'DM Sans\',sans-serif;">'+
        '<div style="font-size:16px;font-weight:800;color:#111;margin-bottom:6px;">⚠️ Scheduling Conflict</div>'+
        '<div style="font-size:13px;color:#374151;margin-bottom:14px;">You already have a committed match that overlaps with this one.</div>'+
        tableHtml+
        '<div style="display:flex;gap:10px;">'+
          '<button id="conflictCancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;font-weight:600;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">No, go back</button>'+
          '<button id="conflictProceed" style="flex:1;padding:10px;border-radius:8px;border:none;background:#f87171;color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">Commit anyway</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#conflictCancel').onclick=()=>{ overlay.remove(); resolve(false); };
    overlay.querySelector('#conflictProceed').onclick=()=>{ overlay.remove(); resolve(true); };
  });
}

async function respondToMatch(matchId, response){
  const myEmail = getMyEmail() || localStorage.getItem('pb_email');
  if(!myEmail){
    showToast('Please sign in to respond','#f59e0b');
    openLoginModal();
    return;
  }
  const btn = event?.target;
  if(btn){ btn.disabled=true; btn.textContent='Saving...'; }
  try{
    // Check current match + confirmed count
    const [matchRes, confirmedRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=match_type,status,max_players,match_date,time_start,time_end,court_name,court_address,organizer_name`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const matches = matchRes.ok ? await matchRes.json() : [];
    const confirmed = confirmedRes.ok ? await confirmedRes.json() : [];
    const match = matches[0];
    if(!match){ showToast('Match not found','#f87171'); return; }
    const needed = match.max_players || (match.match_type==='doubles' ? 4 : 2);
    const spotsLeft = needed - confirmed.length;
    const alreadyIn = confirmed.some(r=>r.player_email===myEmail);
    // If spots full and not already in, go to waitlist
    let actualResponse = response;
    if(response==='in' && spotsLeft <= 0 && !alreadyIn) actualResponse = 'waitlist';

    // ── Scheduling conflict check ──────────────────────
    if(actualResponse==='in' && match.match_date && match.time_start){
      const conflicts = await checkMatchConflict(myEmail, match);
      if(conflicts.length){
        const proceed = await showConflictConfirm(conflicts, match);
        if(!proceed){ if(btn){ btn.disabled=false; btn.textContent='✅ I\'m In!'; } return; }
      }
    }
    // ──────────────────────────────────────────────────
    // UPSERT the response — use PATCH to update existing row (avoids duplicate key error)
    const myName = getMyName() || myEmail.split('@')[0];
    // First try PATCH (update existing pending row)
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&player_email=eq.${encodeURIComponent(myEmail)}`,{
      method:'PATCH',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_ANON_KEY,
        'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,
        'Prefer':'return=minimal'
      },
      body:JSON.stringify({
        response:actualResponse,
        player_name:myName,
        responded_at:new Date().toISOString()
      })
    });
    // If no row existed to PATCH, INSERT instead
    if(patchRes.ok){
      // Check if patch actually updated something
      const count = patchRes.headers.get('content-range');
      if(count === '*/0' || count === null){
        // No row found, do INSERT
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/match_responses`,{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'apikey':SUPABASE_ANON_KEY,
            'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,
            'Prefer':'return=minimal'
          },
          body:JSON.stringify({
            match_id:matchId,
            player_email:myEmail,
            player_name:myName,
            response:actualResponse,
            responded_at:new Date().toISOString()
          })
        });
        if(!insertRes.ok){ throw new Error('Save failed: '+await insertRes.text()); }
      }
    } else {
      throw new Error('Save failed: '+await patchRes.text());
    }
    const banner = document.getElementById('matchResponseBanner');
    if(banner) banner.remove();
    if(actualResponse==='in'){
      showToast("You're in! See you on the court!",'#4CAF7D');
      setTimeout(()=>checkAndUpdateMatchStatus(matchId), 500);
      setTimeout(()=>{
        loadAllMatchBadges();
        // Also refresh the top blue badge
        refreshTopInviteBadge();
      }, 800);
    } else if(actualResponse==='waitlist'){
      const wRes = await fetch(
        `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.waitlist&select=player_email&order=responded_at.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const waitlist = wRes.ok ? await wRes.json() : [];
      const pos = waitlist.findIndex(r=>r.player_email===myEmail)+1;
      showToast('On the waitlist - position #'+pos,'#f59e0b');
    } else {
      showToast('Declined','var(--dim)');
      notifyOrganizerOfDecline(matchId, myEmail);
      const wasIn = confirmed.some(r=>r.player_email===myEmail);
      const newInCount = wasIn ? confirmed.length - 1 : confirmed.length;
      if(newInCount < needed) await promoteFromWaitlist(matchId, match);
    }
    // Refresh current page
    const activePage = document.querySelector('.page-section.active')?.id?.replace('page-','');
    if(activePage==='invitedByOthers') setTimeout(()=>loadInvitedByOthersPage(), 600);
    if(activePage==='confirmedMatches') setTimeout(()=>loadConfirmedMatches(), 600);
  }catch(e){
    showToast('Error: '+e.message,'#f87171');
    if(btn){ btn.disabled=false; btn.textContent='Try again'; }
  }
}

async function checkAndUpdateMatchStatus(matchId){
  // Check if match has enough confirmed players to be considered full
  try{
    const [matchRes, respRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=match_type,status,max_players`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const matches = matchRes.ok ? await matchRes.json() : [];
    const confirmed = respRes.ok ? await respRes.json() : [];
    if(!matches.length) return;
    const match = matches[0];
    const needed = match.max_players || (match.match_type==='doubles' ? 4 : 2);
    if(confirmed.length >= needed && match.status !== 'full'){
      // Mark match as full/confirmed
      await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
        body:JSON.stringify({status:'full'})
      });
      showToast('✅ Match is now full — moved to Confirmed Matches!','#4CAF7D');
      // Refresh badges
      loadAllMatchBadges();
    }
  }catch(e){}
}

async function notifyOrganizerOfDecline(matchId, declinerEmail){
  try{
    // Get match + organizer info
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=organizer_email,organizer_name,match_type,match_date,time_start,court_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const matches = res.ok ? await res.json() : [];
    if(!matches.length) return;
    const match = matches[0];
    const dateStr = match.match_date
      ? new Date(match.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '';

    sendEmail({ to_email:match.organizer_email, type:'match_decline', personal_note:declinerEmail+' declined your '+match.match_type+' match invite for '+dateStr+'. You have an open spot — invite someone from your Inner Circle to fill it!', invite_url:window.location.origin+window.location.pathname+'?setupmatch=1' });
  }catch(e){}
}

async function promoteFromWaitlist(matchId, match){
  try{
    // Find the first waitlisted player (earliest responded_at = first in line)
    const wRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.waitlist&select=player_email,player_name&order=responded_at.asc&limit=1`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const waitlisted = wRes.ok ? await wRes.json() : [];
    if(!waitlisted.length) return;
    const next = waitlisted[0];
    // Promote to pending — they now have an active invite to accept or decline
    await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&player_email=eq.${encodeURIComponent(next.player_email)}`,
      {
        method:'PATCH',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
        body:JSON.stringify({response:'pending', responded_at:new Date().toISOString()})
      }
    );
    // Notify the promoted player
    const dateStr = match.match_date
      ? new Date(match.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '';
    const timeStr = match.time_start ? fmt12(match.time_start)+(match.time_end?' – '+fmt12(match.time_end):'') : '';
    const courtStr = match.court_name && match.court_name!=='TBD' ? ' @ '+match.court_name : '';
    const matchUrl = window.location.origin+window.location.pathname+'?match='+matchId;
    try{
      await sendEmail({
        to_email: next.player_email,
        type: 'match_update',
        personal_note: 'Good news — a spot just opened up! '+(match.organizer_name||'Your organizer')+' has a '+match.match_type+' match on '+dateStr+(timeStr?' at '+timeStr:'')+courtStr+'. Open the app and accept before the spot fills again.',
        invite_url: matchUrl,
        inviter_name: match.organizer_name || '',
        match_date_str: dateStr
      });
    }catch(emailErr){ console.warn('waitlist promote email failed:',emailErr); }
  }catch(e){ console.warn('promoteFromWaitlist error:',e); }
}

// ── Can't Make It drop flow ───────────────────────────────────────────────────
// _cmCache stores match display data populated at card-render time.
window._cmCache = window._cmCache || {};

window.cantMakeIt = function(matchId){
  const d = window._cmCache[matchId];
  if(!d){ showToast('Match data not found — please reload.','#f87171'); return; }
  const overlay = document.createElement('div');
  overlay.id = 'cantMakeItOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25);">'+
      '<h3 style="margin:0 0 14px;font-size:16px;font-weight:800;color:#111;">Are you sure you can\'t make it?</h3>'+
      '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px;line-height:2;">'+
        '<div>&#128197; '+d.dateStr+(d.timeStr?' &middot; '+d.timeStr:'')+'</div>'+
        '<div>&#128205; '+d.courtName+'</div>'+
        '<div>&#128100; Organized by '+((d.organizerName||'').split(' ')[0]||'Unknown')+'</div>'+
      '</div>'+
      '<div style="font-size:13px;color:#6b7280;margin-bottom:20px;">The organizer will be notified immediately.</div>'+
      '<div style="display:flex;gap:10px;">'+
        '<button onclick="window.confirmCantMakeIt(\''+matchId+'\')" '+
          'style="flex:1;padding:12px;background:#dc2626;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">'+
          'Yes, I can\'t make it'+
        '</button>'+
        '<button onclick="document.getElementById(\'cantMakeItOverlay\')?.remove()" '+
          'style="flex:1;padding:12px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">'+
          'Never mind'+
        '</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
};

window.confirmCantMakeIt = async function(matchId){
  const myEmail = getMyEmail();
  const d = window._cmCache[matchId];

  // Belt-and-suspenders organizer guard
  if(d && d.organizerEmail && (d.organizerEmail||'').toLowerCase() === (myEmail||'').toLowerCase()){
    showToast('As the organizer, use Edit Match to cancel this match.','#f59e0b');
    document.getElementById('cantMakeItOverlay')?.remove();
    return;
  }

  document.getElementById('cantMakeItOverlay')?.remove();

  // ── 1. SET RESPONSE TO 'OUT' ─────────────────────────────────────────────
  try{
    await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&player_email=eq.${encodeURIComponent(myEmail)}`,
      {
        method:'PATCH',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
        body:JSON.stringify({ response:'out', responded_at:new Date().toISOString() })
      }
    );
  }catch(e){
    showToast('Could not update your response. Please try again.','#f87171');
    return;
  }

  // ── 2. TOAST + RELOAD PAGE ───────────────────────────────────────────────
  showToast("You've been removed from this match.",'#6b7280');
  const activePage = document.querySelector('.page-section.active')?.id?.replace('page-','');
  if(activePage==='confirmedMatches') setTimeout(()=>loadConfirmedMatches(), 600);
  else if(activePage==='invitedByOthers') setTimeout(()=>loadInvitedByOthersPage(), 600);
  setTimeout(()=>loadAllMatchBadges(), 700);

  // ── 3. HOURS UNTIL MATCH ─────────────────────────────────────────────────
  const hoursUntilMatch = d && d.matchDateTime ? (d.matchDateTime - Date.now()) / 36e5 : Infinity;

  // ── 4. NOTIFY ORGANIZER ──────────────────────────────────────────────────
  if(d && d.organizerEmail){
    const myName = getMyName() || (myEmail||'').split('@')[0];
    const myFirst = (myName.split(' ')[0]) || myName;
    const dateStr = d.dateStr || '';
    const timeStr = d.timeStr || '';
    const courtStr = d.courtName && d.courtName !== 'Court TBD' ? d.courtName : '';
    const matchUrl = window.location.origin + window.location.pathname + '?action=emergency_fill&match=' + matchId;

    // Current confirmed count (post-drop)
    let confirmedCount = 0;
    try{
      const cr = await fetch(
        `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.in&select=player_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      const cRows = cr.ok ? await cr.json() : [];
      confirmedCount = cRows.length;
    }catch(_){}

    try{
      await sendEmail({
        to_email: d.organizerEmail,
        type: 'match_update',
        subject: myName+' can\'t make your match on '+dateStr,
        personal_note: myName+' can no longer make your '+dateStr+(timeStr?' at '+timeStr:'')+' match'+(courtStr?' at '+courtStr:'')+'. '+confirmedCount+' of '+(d.maxPlayers||'?')+' players confirmed. Log in to fill the spot.',
        invite_url: matchUrl,
        inviter_name: myName,
        match_date_str: dateStr
      });
    }catch(e){ console.warn('cantMakeIt org email failed:',e); }

    try{
      const orgSms = myFirst+' cancelled your '+dateStr+(timeStr?' at '+timeStr:'')+' match'+(courtStr?' at '+courtStr:'')+'. Log in to fill the spot.';
      await sendSms({ player_email:d.organizerEmail, message:orgSms.substring(0,160), match_id:matchId, event_type:'player_dropped' });
    }catch(e){ console.warn('cantMakeIt org SMS failed:',e); }
  }

  // ── 5. WAITLIST PROMOTION ────────────────────────────────────────────────
  let waitlisted = [];
  try{
    const wr = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.waitlist&select=player_email,player_name&order=responded_at.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    waitlisted = wr.ok ? await wr.json() : [];
  }catch(_){}

  // ── 6. EMERGENCY FILL (organizer only — when waitlist exhausted) ─────────
  const _myEmailFinal = (getMyEmail()||'').toLowerCase();
  const _orgEmailFinal = (d?.organizerEmail||'').toLowerCase();
  if(!waitlisted.length && _orgEmailFinal && _myEmailFinal === _orgEmailFinal){
    setTimeout(()=>window.showEmergencyFill(matchId, null), 800);
  }

  if(waitlisted.length){
    const isScramble = hoursUntilMatch <= 24;
    const toPromote = isScramble ? waitlisted : [waitlisted[0]];
    const dateStr = d?.dateStr || '';
    const courtStr = d?.courtName && d.courtName !== 'Court TBD' ? d.courtName : '';
    const orgFirst = (d?.organizerName||'').split(' ')[0] || 'Your organizer';
    const matchUrl = window.location.origin + window.location.pathname + '?match=' + matchId;

    for(const w of toPromote){
      try{
        await fetch(
          `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&player_email=eq.${encodeURIComponent(w.player_email)}`,
          {
            method:'PATCH',
            headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
            body:JSON.stringify({ response:'pending', responded_at:new Date().toISOString() })
          }
        );
      }catch(_){}

      if(isScramble){
        try{
          await sendEmail({
            to_email: w.player_email,
            type: 'match_update',
            subject: '⚡ Urgent: Spot opened in '+dateStr+' match!',
            personal_note: '⚡ Time-sensitive: A spot just opened in '+orgFirst+'\'s match '+dateStr+(courtStr?' at '+courtStr:'')+'. This match is coming up very soon — first to accept gets the spot! Log in to PBallConnect now.',
            invite_url: matchUrl,
            inviter_name: d?.organizerName || '',
            match_date_str: dateStr
          });
        }catch(e){ console.warn('scramble email failed:',e); }

        try{
          const sms = '⚡ Spot just opened in '+orgFirst+'\'s match'+(courtStr?' at '+courtStr:'')+'! First to accept gets it. Open app now!';
          await sendSms({ player_email:w.player_email, message:sms.substring(0,160), match_id:matchId, event_type:'waitlist_scramble' });
        }catch(e){ console.warn('scramble SMS failed:',e); }

      }else{
        try{
          await sendEmail({
            to_email: w.player_email,
            type: 'match_update',
            subject: 'A spot opened up in '+orgFirst+'\'s match on '+dateStr+'!',
            personal_note: 'Good news — a spot just opened up in '+orgFirst+'\'s match on '+dateStr+(courtStr?' at '+courtStr:'')+'. Log in to PBallConnect to accept or decline. Respond soon — others may be waiting!',
            invite_url: matchUrl,
            inviter_name: d?.organizerName || '',
            match_date_str: dateStr
          });
        }catch(e){ console.warn('waitlist promote email failed:',e); }

        try{
          const sms = 'A spot opened in '+orgFirst+'\'s '+dateStr+' match'+(courtStr?' at '+courtStr:'')+'! Open app to respond.';
          await sendSms({ player_email:w.player_email, message:sms.substring(0,160), match_id:matchId, event_type:'waitlist_promote' });
        }catch(e){ console.warn('waitlist promote SMS failed:',e); }
      }
    }
  }
};

// ── Emergency Fill ───────────────────────────────────────────────────────────
let _efMatchId = null;
let _efCandidates = [];
let _efSelected = new Set();
let _efGenderNeeded = null;
let _efCurrentMode = null;

window.showEmergencyFill = async function(matchId, droppedGender){
  _efMatchId = matchId;
  _efGenderNeeded = droppedGender || null;
  _efSelected = new Set();

  const d = window._cmCache[matchId] || {};
  const matchInfo = [d.dateStr, d.timeStr, d.courtName && d.courtName !== 'Court TBD' ? d.courtName : null]
    .filter(Boolean).join(' · ');

  // Fetch players already in or pending for this match
  const alreadyIn = new Set();
  try{
    const inRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=in.(in,pending,waitlist)&select=player_email`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const rows = inRes.ok ? await inRes.json() : [];
    rows.forEach(r => alreadyIn.add((r.player_email||'').toLowerCase()));
  }catch(_){}

  // Build flat player list for Emergency Fill — never overwrite IC_MEMBERS (it uses
  // {player, conn, lastPlayed} wrappers; corrupting it would break the invite grid).
  let _efMemberFlat = [];
  if(IC_MEMBERS && IC_MEMBERS.length){
    _efMemberFlat = IC_MEMBERS.map(m => m.player).filter(Boolean);
  } else {
    try{
      const myEmail = getMyEmail();
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/connections?or=(requester_email.eq.${encodeURIComponent(myEmail)},recipient_email.eq.${encodeURIComponent(myEmail)})&status=eq.approved&select=requester_email,recipient_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      const conns = cRes.ok ? await cRes.json() : [];
      const icEmails = conns.map(c => c.requester_email === myEmail ? c.recipient_email : c.requester_email);
      if(icEmails.length){
        const pRes = await fetch(
          `${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${icEmails.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name,last_name,skill_self,skill_level,gender`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        _efMemberFlat = pRes.ok ? await pRes.json() : [];
      }
    }catch(_){}
  }

  _efCandidates = _efMemberFlat.filter(p => !alreadyIn.has((p.email||'').toLowerCase()));

  const overlay = document.getElementById('emergencyFillOverlay');
  if(!overlay) return;

  overlay.innerHTML =
    '<div style="max-width:520px;margin:0 auto;padding:20px 16px 80px;">'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">'+
        '<div style="font-size:24px;">&#128680;</div>'+
        '<div>'+
          '<div style="font-size:17px;font-weight:800;color:#111;">Emergency Fill</div>'+
          '<div style="font-size:12px;color:#6b7280;">'+matchInfo+'</div>'+
        '</div>'+
        '<button onclick="document.getElementById(\'emergencyFillOverlay\').style.display=\'none\'" '+
          'style="margin-left:auto;background:none;border:none;font-size:22px;color:#9ca3af;cursor:pointer;padding:4px 8px;">&#10005;</button>'+
      '</div>'+
      '<div style="font-size:13px;color:#dc2626;font-weight:600;margin-bottom:8px;">Waitlist is empty — reach out to fill this spot fast.</div>'+
      (_efGenderNeeded?
        '<div id="efGenderToggle" style="font-size:13px;color:#6b7280;margin-bottom:14px;">Showing <strong>'+_efGenderNeeded+'s</strong> only &middot; <span onclick="window.efOverrideGender()" style="color:#1a7a3a;cursor:pointer;text-decoration:underline;">Show all IC instead &#8594;</span></div>'
        :'<div style="margin-bottom:14px;"></div>')+
      '<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:18px;" id="efModeTiles">'+
        _buildEfModeTile('gender','&#128107;',droppedGender?'Same Gender':'Any Gender',droppedGender?'Match dropped player':'All IC members')+
        _buildEfModeTile('level','&#127919;','My Level','IC members at your skill')+
        _buildEfModeTile('all','&#128101;','All IC Members','Anyone not already invited')+
        _buildEfModeTile('text','&#128172;','Send a Text','Open your messages app')+
      '</div>'+
      '<div id="efList" style="display:none;"></div>'+
      '<div id="efSendBar" style="display:none;position:fixed;bottom:0;left:0;right:0;padding:16px;background:#fff;border-top:2px solid #e5e7eb;box-shadow:0 -2px 8px rgba(0,0,0,0.12);z-index:10001;">'+
        '<button onclick="window.efSendInvites()" id="efSendBtn" '+
          'style="width:100%;max-width:520px;display:block;margin:0 auto;padding:0;min-height:64px;border-radius:12px;border:none;background:#1a7a3a;color:#fff;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;">'+
          'Send Invites'+
        '</button>'+
      '</div>'+
    '</div>';

  overlay.style.display = 'block';
};

function _buildEfModeTile(mode, icon, title, sub){
  return '<div onclick="window.efSelectMode(\''+mode+'\')" id="efTile_'+mode+'" '+
    'style="cursor:pointer;border:2px solid #e5e7eb;border-radius:14px;padding:16px 12px;min-height:56px;display:flex;align-items:center;gap:14px;background:#fff;transition:all .15s;">'+
    '<div style="font-size:26px;flex-shrink:0;">'+icon+'</div>'+
    '<div style="text-align:left;">'+
      '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:2px;">'+title+'</div>'+
      '<div style="font-size:13px;color:#6b7280;line-height:1.4;">'+sub+'</div>'+
    '</div>'+
  '</div>';
}

window.efSelectMode = function(mode){
  _efCurrentMode = mode;
  _efSelected = new Set();

  ['gender','level','all','text'].forEach(m=>{
    const tile = document.getElementById('efTile_'+m);
    if(!tile) return;
    tile.style.borderColor = m===mode ? '#1a7a3a' : '#e5e7eb';
    tile.style.background  = m===mode ? '#f0fdf4' : '#fff';
  });

  const listEl  = document.getElementById('efList');
  const sendBar = document.getElementById('efSendBar');
  if(!listEl) return;

  if(mode === 'text'){
    listEl.style.display = 'none';
    if(sendBar) sendBar.style.display = 'none';
    const d = window._cmCache[_efMatchId] || {};
    const matchInfo2 = [d.dateStr, d.timeStr, d.courtName && d.courtName !== 'Court TBD' ? d.courtName : null]
      .filter(Boolean).join(' ');
    const orgFirst = ((d.organizerName||'').split(' ')[0]) || 'a friend';
    const msg = 'Hey! We need one more player for pickleball on '+matchInfo2+'. Interested? Join PBallConnect: '+window.location.origin+'/';
    window.open('sms:?body='+encodeURIComponent(msg.substring(0,160)), '_self');
    return;
  }

  const mySkill = parseFloat(SESSION_PLAYER?.skill_self || SESSION_PLAYER?.skill_level || '0') || 0;
  let pool = _efCandidates.slice();

  if(mode === 'gender' && _efGenderNeeded){
    const gLower = _efGenderNeeded.toLowerCase();
    const genderedPool = pool.filter(p => (p.gender||'').toLowerCase() === gLower);
    if(genderedPool.length) pool = genderedPool;
  } else if(mode === 'level' && mySkill > 0){
    const levelPool = pool.filter(p => {
      const ps = parseFloat(p.skill_self || p.skill_level || '0') || 0;
      return ps > 0 && Math.abs(ps - mySkill) <= 0.5;
    });
    if(levelPool.length) pool = levelPool;
  }

  if(!pool.length){
    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#9ca3af;font-size:13px;">No available IC members — try another mode or send a text.</div>';
    listEl.style.display = 'block';
    if(sendBar) sendBar.style.display = 'none';
    return;
  }

  let html = '<div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Select players to invite</div>';
  pool.forEach(p => {
    const keyId = (p.email||'').replace(/[@.]/g,'_');
    const name = ((p.first_name||'')+' '+(p.last_name||'')).trim() || p.email;
    const skill = p.skill_self || p.skill_level || '—';
    html +=
      '<div id="efPlayer_'+keyId+'" onclick="window.efTogglePlayer(\''+p.email+'\')" '+
        'style="display:flex;align-items:center;gap:10px;padding:11px 12px;margin-bottom:6px;border-radius:10px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;transition:all .12s;">'+
        '<div id="efChk_'+keyId+'" style="width:20px;height:20px;flex-shrink:0;border-radius:5px;border:2px solid #d1d5db;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;transition:all .12s;"></div>'+
        '<div style="flex:1;">'+
          '<div style="font-size:14px;font-weight:700;color:#111;">'+name+'</div>'+
          '<div style="font-size:11px;color:#9ca3af;">'+skill+'</div>'+
        '</div>'+
      '</div>';
  });

  listEl.innerHTML = html;
  listEl.style.display = 'block';
  if(sendBar) sendBar.style.display = 'none';
};

window.efTogglePlayer = function(email){
  const keyId = (email||'').replace(/[@.]/g,'_');
  const chk = document.getElementById('efChk_'+keyId);
  const row = document.getElementById('efPlayer_'+keyId);

  if(_efSelected.has(email)){
    _efSelected.delete(email);
    if(chk){ chk.style.background='#fff'; chk.style.borderColor='#d1d5db'; chk.textContent=''; }
    if(row){ row.style.borderColor='#e5e7eb'; row.style.background='#fff'; }
  } else {
    _efSelected.add(email);
    if(chk){ chk.style.background='#1a7a3a'; chk.style.borderColor='#1a7a3a'; chk.textContent='✓'; }
    if(row){ row.style.borderColor='#1a7a3a'; row.style.background='#f0fdf4'; }
  }

  const sendBar = document.getElementById('efSendBar');
  const btn = document.getElementById('efSendBtn');
  if(sendBar) sendBar.style.display = _efSelected.size > 0 ? 'block' : 'none';
  if(btn) btn.textContent = 'Send Invites ('+_efSelected.size+')';
};

window.efSendInvites = async function(){
  if(!_efSelected.size) return;
  const btn = document.getElementById('efSendBtn');
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }

  const d = window._cmCache[_efMatchId] || {};
  const myName = SESSION_PLAYER ? ((SESSION_PLAYER.first_name||'')+(SESSION_PLAYER.last_name?' '+SESSION_PLAYER.last_name:'')).trim() : '';
  const dateStr  = d.dateStr  || '';
  const courtStr = d.courtName && d.courtName !== 'Court TBD' ? d.courtName : '';
  const matchUrl = window.location.origin + window.location.pathname + '?match=' + _efMatchId;

  let sent = 0;
  for(const email of _efSelected){
    const player = _efCandidates.find(p => p.email === email);
    const pName  = player ? ((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim() : email;

    try{
      await fetch(`${SUPABASE_URL}/rest/v1/match_responses`, {
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal,resolution=merge-duplicates'},
        body:JSON.stringify({match_id:_efMatchId,player_email:email,player_name:pName,response:'pending',responded_at:new Date().toISOString()})
      });
    }catch(_){}

    try{
      await sendEmail({
        to_email:email,type:'match_invite',
        personal_note:'⚡ A spot just opened up — can you make it? '+dateStr+(courtStr?' at '+courtStr:'')+'. Join us!',
        invite_url:matchUrl,inviter_name:myName,invitee_name:pName,match_date_str:dateStr
      });
    }catch(e){ console.warn('ef email failed:',e); }

    try{
      const myFirst = (myName.split(' ')[0])||'Your organizer';
      const sms = '⚡ Spot opened in '+myFirst+'\'s match on '+dateStr+(courtStr?' at '+courtStr:'')+'! Open app to respond.';
      await sendSms({player_email:email,message:sms.substring(0,160),match_id:_efMatchId,event_type:'emergency_fill'});
    }catch(e){ console.warn('ef SMS failed:',e); }

    sent++;
  }

  const overlay = document.getElementById('emergencyFillOverlay');
  if(overlay) overlay.style.display = 'none';
  showToast('Invites sent to '+sent+' player'+(sent!==1?'s':'')+' 🎾','#1a7a3a');
};

window.efOverrideGender = function(){
  _efGenderNeeded = null;
  const toggle = document.getElementById('efGenderToggle');
  if(toggle) toggle.style.display = 'none';
  if(_efCurrentMode) window.efSelectMode(_efCurrentMode);
};

function addHours(timeStr, hrs){
  if(!timeStr) return '';
  const [h,m] = timeStr.split(':').map(Number);
  const total = h*60 + m + hrs*60;
  return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}

// Check for match token on page load
document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(checkMatchToken, 1000); // After session restore
});

// Slider ticks are built in unlockProfileForm() after the form is visible and sliders have width.

async function addMatchCourtToMyCourts(courtId, courtName, courtAddress, btn){
  const myEmail = getMyEmail();
  if(!myEmail){ showToast('Please sign in first','#f59e0b'); return; }
  btn.disabled = true; btn.textContent = 'Adding…';
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/player_courts`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,
               'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body: JSON.stringify({player_email:myEmail, court_id:courtId, is_member:false})
    });
    btn.textContent = '✅ Added!';
    btn.style.color = 'var(--green)';
    showToast('✅ '+courtName+' added to My Courts!','#4CAF7D');
    const offer = document.getElementById('matchAddCourtOffer');
    setTimeout(()=>{ if(offer) offer.style.display='none'; }, 2000);
  }catch(e){
    btn.disabled=false; btn.textContent='+ Add to My Courts';
    showToast('Error: '+e.message,'#f87171');
  }
}

// ══════════════════════════════════════════════════════
// CORE AUTH + SESSION
// ══════════════════════════════════════════════════════

function getMyEmail(){
  return S.email || localStorage.getItem('pb_email') || '';
}

function getMyName(){
  if(SESSION_PLAYER) return ((SESSION_PLAYER.first_name||'')+(SESSION_PLAYER.last_name?' '+SESSION_PLAYER.last_name:'')).trim();
  return '';
}

// ── Real-time invite polling ───────────────────────────
let _pollInterval = null;
let _lastSeenInviteCount = 0;

function startInvitePolling(email){
  if(_pollInterval) clearInterval(_pollInterval);
  // Poll every 30 seconds for new pending match invites
  _pollInterval = setInterval(()=>checkForNewInvites(email), 30000);
}

async function refreshTopInviteBadge(){
  // Delegate to loadAllMatchBadges so nav badge and top badge always come from one source of truth
  await loadAllMatchBadges();
}

async function checkForNewInvites(email){
  if(!email) return;
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(email)}&response=eq.pending&select=match_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(!res.ok) return;
    const rows = await res.json();
    // Verify matches are still open, not past, and not self-organized
    let count = 0;
    let firstMatchId = null;
    if(rows.length){
      const ids = rows.map(r=>r.match_id);
      const mRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&status=neq.full&status=neq.cancelled&select=id,match_date,time_start,time_end,organizer_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      const openMatches = mRes.ok ? await mRes.json() : [];
      const valid = openMatches.filter(m=>!isMatchPast(m) && (m.organizer_email||'').toLowerCase()!==email.toLowerCase());
      count = valid.length;
      firstMatchId = valid[0]?.id ?? null;
    }
    // Update both nav badge and top button badge
    updateMatchBadge('invitedByOthersBadge', count, 'rgba(59,130,246,0.85)');
    refreshTopInviteBadge();
    // Show popup if count increased since last check
    if(count > _lastSeenInviteCount && _lastSeenInviteCount >= 0){
      const newCount = count - _lastSeenInviteCount;
      showNewInvitePopup(newCount, firstMatchId);
    }
    _lastSeenInviteCount = count;
  }catch(e){}
}

function showNewInvitePopup(count, matchId){
  // Don't stack popups
  if(document.getElementById('newInvitePopup')) return;
  const popup = document.createElement('div');
  popup.id = 'newInvitePopup';
  popup.style.cssText =
    'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:800;'+
    'background:#0a120b;border:2px solid rgba(59,130,246,0.6);border-radius:16px;'+
    'padding:14px 20px;max-width:340px;width:92%;box-shadow:0 8px 32px rgba(0,0,0,0.6);'+
    'display:flex;align-items:center;gap:12px;cursor:pointer;'+
    'animation:slideUp 0.3s ease;';
  popup.innerHTML =
    '<span style="font-size:26px;">📥</span>'+
    '<div style="flex:1;">'+
      '<div style="color:#60a5fa;font-weight:800;font-size:14px;">New Match Invite!</div>'+
      '<div style="color:var(--dim);font-size:12px;margin-top:2px;">'+count+' new invite'+(count>1?'s':'')+' — tap to view</div>'+
    '</div>'+
    '<button onclick="document.getElementById(\'newInvitePopup\').remove()" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:18px;padding:0;">✕</button>';
  popup.onclick = (e)=>{
    if(e.target.tagName==='BUTTON') return;
    popup.remove();
    if(matchId){
      // Show the specific match invite banner
      showPage('invitedByOthers');
    } else {
      showPage('invitedByOthers');
    }
  };
  document.body.appendChild(popup);
  // Auto-dismiss after 8 seconds
  setTimeout(()=>popup?.remove(), 8000);
}

function openLoginModal(){
  window.scrollTo({top:0,behavior:'smooth'});
  const modal = document.getElementById('loginModal');
  if(modal){
    modal.style.display='flex';
    // If the user arrived via invite, show sign-up messaging
    if(PENDING_INVITE){
      const titleEl = modal.querySelector('[style*="Welcome back"]');
      const subEl   = modal.querySelector('[style*="Sign in to access"]');
      const btnEl   = document.getElementById('loginSubmitBtn');
      if(titleEl) titleEl.textContent = 'Welcome! 🎾';
      if(subEl)   subEl.textContent   = 'Enter your email to get started';
      if(btnEl)   btnEl.textContent   = 'Send Magic Link →';
    }
    setTimeout(()=>document.getElementById('loginEmail')?.focus(), 100);
  }
}

// Alias used by welcome screen and any other callers expecting showLoginModal
function showLoginModal(){ openLoginModal(); }

function closeLoginModal(){
  const modal = document.getElementById('loginModal');
  if(modal) modal.style.display='none';
  const form = document.getElementById('loginForm');
  const loading = document.getElementById('loginLoading');
  const success = document.getElementById('loginSuccess');
  const error = document.getElementById('loginError');
  const emailEl = document.getElementById('loginEmail');
  const btn = document.getElementById('loginSubmitBtn');
  const titleEl = document.getElementById('loginModalTitle');
  const subEl   = document.getElementById('loginModalSub');
  if(form) form.style.display='block';
  if(loading) loading.style.display='none';
  if(success) success.style.display='none';
  if(error) error.style.display='none';
  if(emailEl) emailEl.value='';
  if(btn){ btn.disabled=false; btn.textContent='Send Magic Link →'; }
  if(titleEl) titleEl.textContent='Sign In';
  if(subEl)   subEl.textContent="Enter your email — we'll send you a magic link to sign in";
}

document.addEventListener('click', function(e){
  const modal = document.getElementById('loginModal');
  if(modal && e.target===modal) closeLoginModal();
});

async function doLogin(){
  const emailInput = document.getElementById('loginEmail');
  const errorEl    = document.getElementById('loginError');
  const submitBtn  = document.getElementById('loginSubmitBtn');
  const loadingEl  = document.getElementById('loginLoading');
  const formEl     = document.getElementById('loginForm');
  const successEl  = document.getElementById('loginSuccess');
  const detailEl   = document.getElementById('loginSuccessDetail');

  const email = (emailInput?.value||'').trim().toLowerCase();
  if(!email || !email.includes('@')){
    if(errorEl){ errorEl.textContent='Please enter a valid email address.'; errorEl.style.display='block'; }
    return;
  }
  if(errorEl) errorEl.style.display='none';

  if(submitBtn){ submitBtn.disabled=true; }

  // Send magic link
  if(formEl) formEl.style.display='none';
  if(loadingEl) loadingEl.style.display='block';

  try{
    const { error } = await _supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if(error) throw error;
    if(loadingEl) loadingEl.style.display='none';
    if(successEl) successEl.style.display='block';
    if(detailEl){
      detailEl.textContent = 'We sent a magic link to '+email+'. Click it to sign in.';
    }
  }catch(e){
    if(loadingEl) loadingEl.style.display='none';
    if(formEl) formEl.style.display='block';
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent='Send Magic Link →'; }
    if(errorEl){ errorEl.textContent='Could not send link: '+e.message; errorEl.style.display='block'; }
  }
}

async function signOut(){
  try{ await _supabase.auth.signOut(); }catch(e){}
  localStorage.removeItem('pb_email');
  localStorage.removeItem('pb_nickname');
  localStorage.removeItem('pb_emoji');
  SUPABASE_ACCESS_TOKEN = SUPABASE_ANON_KEY;
  S.email=''; S.nickname=''; S.avatarEmoji='🎾'; S.skill='';
  SESSION_PLAYER=null;
  location.reload();
}

function initLogin(){
  console.log('PBallConnect version: 3.0 — ', new Date().toISOString());
  // Listen for magic link callback and ongoing auth state changes
  _supabase.auth.onAuthStateChange(async(event, session)=>{
    if(event==='SIGNED_IN' && session){
      SUPABASE_ACCESS_TOKEN = session.access_token;
      localStorage.setItem('pb_email', session.user.email);
      closeLoginModal();
      // Only restore session if not already signed in (avoids double-load on tab focus)
      if(!SESSION_PLAYER) await restoreSession(session.user.email);
    } else if(event==='TOKEN_REFRESHED' && session){
      SUPABASE_ACCESS_TOKEN = session.access_token;
    } else if(event==='SIGNED_OUT'){
      SUPABASE_ACCESS_TOKEN = SUPABASE_ANON_KEY;
    }
  });

  // Restore from an existing Supabase session (persisted in localStorage by the SDK)
  initApp();
}

async function initApp(){
  // Hide welcome CTAs immediately to prevent flash during async session detection.
  // Existing users go straight to dashboard and never see welcome again.
  // ?newuser=1 (magic link arrival): replace CTAs with invite loading state.
  // No-session users: visibility is restored below before showPage('welcome').
  const welcomeInner = document.querySelector('#page-welcome > div');
  const _urlParams2 = new URLSearchParams(window.location.search);
  if(_urlParams2.get('reset_banner')==='dev') localStorage.removeItem('pb_beta_banner_seen');
  // Organic magic link return — user came from join.html, suppress the banner
  if(_urlParams2.get('organic') === '1'){
    localStorage.setItem('pb_beta_banner_seen','1');
  }
  const isNewUser = _urlParams2.get('newuser') === '1';
  // Also detect Supabase magic link tokens in the URL so we suppress the welcome
  // screen while auth resolves. iOS Safari opens magic links in a new tab —
  // token_hash is the PKCE query param; #access_token is the implicit-flow hash.
  const hasMagicToken = !!_urlParams2.get('token_hash') ||
                        window.location.hash.includes('access_token');
  if(welcomeInner){
    if(isNewUser){
      welcomeInner.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;padding:2rem;text-align:center;">'+
          '<div style="font-size:48px;margin-bottom:16px;">🎾</div>'+
          '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:8px;">Setting up your account…</div>'+
          '<div style="font-size:14px;color:#6b7280;">Just a moment — your invite is loading.</div>'+
        '</div>';
    } else {
      // Hide buttons during session check (covers both existing sessions and
      // magic link arrivals). Restored below only if no session is found.
      welcomeInner.style.visibility = 'hidden';
    }
  }
  try{
    const { data: { session } } = await _supabase.auth.getSession();
    if(session && !SESSION_PLAYER){
      SUPABASE_ACCESS_TOKEN = session.access_token;
      localStorage.setItem('pb_email', session.user.email);
      await restoreSession(session.user.email);
      if(SESSION_PLAYER) return; // restoreSession called showPage('dashboard')
    }
  }catch(e){
    // Session expired or network error — fall through to welcome
  }
  // No valid session — restore welcome content visibility then show the page
  if(welcomeInner && !isNewUser) welcomeInner.style.visibility = '';
  // Preserve emergency_fill deep-link across login for unauthenticated users
  const _efAction = _urlParams2.get('action');
  const _efMatchParam = _urlParams2.get('match');
  if(_efAction === 'emergency_fill' && _efMatchParam){
    sessionStorage.setItem('pb_ef_matchId', _efMatchParam);
  }
  if(!SESSION_PLAYER && !_newUserRegistrationStarted){
    showPage('welcome');
    maybeShowBetaBanner();
  }
}

document.addEventListener('DOMContentLoaded', initLogin);

let SESSION_PLAYER = null;
let RESTORING_PROFILE = false;
let _newUserRegistrationStarted = false; // guard against double startNewRegistration calls

async function restoreSession(email, playerData){
  let player = playerData;
  if(!player){
    try{
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      if(res.ok){ const rows = await res.json(); player = rows[0]; }
    }catch(e){ console.warn('Session restore failed:', e); return; }
  }
  // Existing user found — strip ?newuser=1 and any invite params so they can't
  // trigger new-user flows on re-render or secondary auth state events.
  if(player){
    const _hasNewUser = new URLSearchParams(window.location.search).get('newuser') === '1';
    if(_hasNewUser){
      history.replaceState(null, '', window.location.pathname);
    }
  }

  // No registration row found — auth succeeded via magic link but account doesn't exist yet
  if(!player){
    if(_newUserRegistrationStarted) return; // already started — don't reset the form
    S.email = email.toLowerCase();
    startNewRegistration(email);
    return;
  }

  S.email        = (player.email||'').toLowerCase();
  S.city         = player.city || '';
  S.state        = (()=>{
    const st = player.state||'';
    const abbr = Object.entries(STATE_INFO).find(([k,v])=>v[1]&&v[1].toLowerCase()===st.toLowerCase());
    return abbr ? abbr[0] : st;
  })();
  S.duprVal      = player.dupr_rating || null;
  S.handedness   = player.handedness  || '';
  S.gender       = player.gender      || '';
  S.driveDistance= player.drive_distance_miles ? player.drive_distance_miles+' miles' : '25 miles';
  S.venuePref    = player.play_venues || '';
  S.nickname     = player.nickname    || '';
  S.avatarEmoji  = player.avatar_emoji || '🎾';
  S.skill        = player.skill_level || '';
  S.playingSince = player.playing_since || '';
  S.addrLat      = player.lat  || null;
  S.addrLon      = player.lon  || null;
  S.playStyle    = player.play_style || '';
  S.wantsToImprove = player.wants_to_improve || '';
  S.goalRating   = player.goal_rating || null;
  S.matchGenderPref = player.match_gender_pref || 'Both';
  S.isOrganizer     = player.is_organizer ? 'Yes' : 'Not yet';
  SESSION_PLAYER = player;
  updateOrganizerNav();
  updateNavForUserType();

  const navBtn = document.getElementById('navLoginBtn');
  if(navBtn) navBtn.classList.add('signed-in');
  const editBtn = document.getElementById('editProfileBtnInPage');
  if(editBtn) editBtn.style.display='block';
  updateTopBar(player);
  const _wbKey = 'pb_welcomed_' + (player.email||'').toLowerCase();
  const _isReturning = !!localStorage.getItem(_wbKey);
  localStorage.setItem(_wbKey, '1');
  const _smswelcome = new URLSearchParams(window.location.search).get('sms_welcome') === '1';
  if(_smswelcome){ history.replaceState(null,'',window.location.pathname); }
  showToast(
    _smswelcome
      ? 'Welcome to PBallConnect, '+(player.first_name||'Player')+'! 🔥 You\'re all set.'
      : (_isReturning ? 'Welcome back, ' : 'Welcome, ')+(player.first_name||'Player')+'! 🎾',
    '#4CAF7D'
  );

  // Top badge is set by loadAllMatchBadges (via refreshTopInviteBadge) with proper filtering

  setTimeout(async()=>{
    const myEmail = (player.email||'').toLowerCase();
    try{
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/connections?recipient_email=eq.${encodeURIComponent(myEmail)}&status=eq.pending&select=id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      if(r.ok){
        const reqs = await r.json();
        IC_INCOMING_COUNT = reqs.length;
        const pb = document.getElementById('icNavPurpleBadge');
        if(pb){
          pb.textContent = reqs.length;
          pb.classList.toggle('placeholder', reqs.length===0);
          pb.style.opacity = reqs.length > 0 ? '1' : '0.5';
          pb.style.display = 'inline-flex';
        }
        const topBadge = document.getElementById('topRequestsBadge');
        if(topBadge){ topBadge.textContent=reqs.length; topBadge.style.display=reqs.length>0?'inline-block':'none'; }
        const topLabel = document.getElementById('topRequestsLabel');
        if(topLabel) topLabel.textContent = reqs.length>0 ? 'View Member Requests ('+reqs.length+')' : 'View Member Requests';
        if(reqs.length>0) setTimeout(()=>showToast('🟣 You have '+reqs.length+' Inner Circle request'+(reqs.length>1?'s':'')+'!','#7c3aed'),1500);
      }
    }catch(e){}
  }, 500);

  setTimeout(loadInnerCircle, 600);  // load IC members so badges show correctly
  setTimeout(loadMatchSquareCounts, 800);
  // Load court badges for nav
  setTimeout(()=>loadCourtBadgesForNav(player.email), 600);
  // Load all match nav badges
  setTimeout(loadAllMatchBadges, 1000);
  // Start real-time polling for new invites
  startInvitePolling(player.email);
  // Load outer circle badge async

  if(!S.addrLat && player.city && player.state) geocodeCityForSession(player.city, player.state);
  showPage('dashboard');

  // Deep-link: ?action=emergency_fill&match=ID (from organizer cancellation email)
  const _rsParams = new URLSearchParams(window.location.search);
  const _rsEfMatchId = (_rsParams.get('action') === 'emergency_fill' && _rsParams.get('match'))
    ? _rsParams.get('match')
    : sessionStorage.getItem('pb_ef_matchId');
  if(_rsEfMatchId){
    history.replaceState(null, '', window.location.pathname);
    sessionStorage.removeItem('pb_ef_matchId');
    setTimeout(()=>window.showEmergencyFill(_rsEfMatchId, null), 600);
  }
}

async function geocodeCityForSession(city, state){
  try{
    const q = encodeURIComponent(city+', '+state+', USA');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      {headers:{'User-Agent':'PickleballRegistry/1.0'}});
    if(res.ok){
      const data = await res.json();
      if(data.length){
        S.addrLat=parseFloat(data[0].lat);
        S.addrLon=parseFloat(data[0].lon);
        // Also store on SESSION_PLAYER so weather functions can access it
        if(SESSION_PLAYER){ SESSION_PLAYER.lat=S.addrLat; SESSION_PLAYER.lon=S.addrLon; }
      }
    }
  }catch(e){}
}

async function loadCourtBadgesForNav(email){
  if(!email) return;
  try{
    // Fetch saved courts including is_private flag we now store
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(email)}&select=court_id,is_private`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(!res.ok){ updateNavCourtBadges(0,0); return; }
    const rows = await res.json();
    if(!rows.length){ updateNavCourtBadges(0,0); return; }
    const pubCount  = rows.filter(r=>!r.is_private).length;
    const privCount = rows.filter(r=> r.is_private).length;
    updateNavCourtBadges(pubCount, privCount);
  }catch(e){}
}


function updateTopBar(player){
  const navLabel = document.getElementById('navLoginLabel');
  const navEmoji = document.getElementById('navLoginEmoji');
  if(!navLabel) return;
  const emoji    = S.avatarEmoji || player.avatar_emoji || '👤';
  const nickname = S.nickname    || player.nickname     || '';
  const skill    = player.skill_level || S.skill || '';
  const since    = player.playing_since || S.playingSince || '';
  const fname    = player.first_name || 'Player';
  if(emoji) S.avatarEmoji=emoji;
  if(nickname) S.nickname=nickname;
  if(skill) S.skill=skill;
  const nick     = nickname ? ' "'+nickname+'"' : '';
  const skillTxt = skill    ? ' · ⭐'+skill     : '';
  const sinceTxt = since    ? ' · Since '+since : '';
  if(navEmoji) navEmoji.textContent=emoji;
  navLabel.textContent = fname+nick+skillTxt+sinceTxt+' ▾';
}

function openProfileMenu(){
  const existing = document.getElementById('profileQuickMenu');
  if(existing){ existing.remove(); return; }
  const menu = document.createElement('div');
  menu.id='profileQuickMenu'; menu.className='profile-quick-menu';
  const editRow=document.createElement('div');
  editRow.className='profile-menu-item';
  editRow.textContent='✏️ Edit Profile';
  editRow.onclick=()=>{ menu.remove(); openEditProfile(); };
  menu.appendChild(editRow);
  const divider=document.createElement('div');
  divider.style.cssText='height:1px;background:var(--border);margin:4px 0;';
  menu.appendChild(divider);
  const signOutRow=document.createElement('div');
  signOutRow.className='profile-menu-item profile-menu-signout';
  signOutRow.textContent='🚪 Sign Out';
  signOutRow.onclick=()=>signOut();
  menu.appendChild(signOutRow);
  const btn=document.getElementById('navLoginBtn');
  const rect=btn.getBoundingClientRect();
  menu.style.top=(rect.bottom+4)+'px'; menu.style.right='12px';
  document.body.appendChild(menu);
  setTimeout(()=>{
    document.addEventListener('click',function handler(e){
      if(!menu.contains(e.target)&&e.target!==btn){ menu.remove(); document.removeEventListener('click',handler); }
    });
  },100);
}

async function openEditProfile(){
  const email=localStorage.getItem('pb_email')||getMyEmail();
  if(!email){showPage('playerProfile');return;}
  _editModeActive=true;
  // Fetch fresh data FIRST, then unlock and restore
  await fetchAndRestoreProfile(email);
  // Give restoreProfileForm time to populate fields before unlocking
  setTimeout(()=>{
    unlockProfileForm();
    document.getElementById('editProfileBtnEl')?.classList.add('active');
    const card=document.getElementById('step1');
    const h2=card?.querySelector('h2');
    if(h2&&!document.getElementById('editModeBanner')){
      const banner=document.createElement('div');banner.id='editModeBanner';
      banner.style.cssText='display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:999px;background:rgba(76,175,125,0.12);border:1px solid rgba(76,175,125,0.35);color:#4CAF7D;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px;';
      banner.innerHTML='&#9999;&#65039; &nbsp;Edit Mode &nbsp;&middot;&nbsp; Update Profile lights up when you make a change';
      h2.insertAdjacentElement('afterend',banner);
    }
    const btn=document.getElementById('btnSubmit');
    if(btn){btn.classList.remove('has-changes');btn.disabled=true;}
    startChangeDetection();
    card?.scrollIntoView({behavior:'smooth',block:'start'});
  }, 300);
}

async function loadPlayerCourtsForSummary(email){
  if(!email)return;
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(email)}&is_member=eq.true&select=court_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    if(!res.ok)return;
    const rows=await res.json();
    const clubRow=document.getElementById('sumClubRow');
    const clubEl=document.getElementById('sumClub');
    if(rows.length>0&&clubRow&&clubEl){
      const ids=rows.map(r=>r.court_id).filter(Boolean);
      if(ids.length){
        const cr=await fetch(`${SUPABASE_URL}/rest/v1/courts?id=in.(${ids.join(',')})&select=name`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
        const courts=cr.ok?await cr.json():[];
        if(courts.length){clubEl.textContent=courts.map(c=>c.name).join(', ');clubRow.style.display='flex';return;}
      }
      clubEl.textContent=rows.length+' club'+(rows.length>1?'s':'');clubRow.style.display='flex';
    }else if(clubRow){clubRow.style.display='none';}
  }catch(e){}
}

async function fetchAndRestoreProfile(email){
  try{
    const res=await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(res.ok){
      const rows=await res.json();
      if(rows.length){
        SESSION_PLAYER=rows[0];
        if(S.nickname)     SESSION_PLAYER.nickname     =S.nickname;
        if(S.avatarEmoji)  SESSION_PLAYER.avatar_emoji =S.avatarEmoji;
        if(S.skill)        SESSION_PLAYER.skill_level  =S.skill;
        SESSION_PLAYER.sms_opt_in = rows[0].sms_opt_in; // always take fresh DB value, never stale local state
        updateTopBar(SESSION_PLAYER);
        showPage('playerProfile');
        // Restore form fields from fetched data
        setTimeout(()=>restoreProfileForm(SESSION_PLAYER), 150);
        return;
      }
    }
  }catch(e){}
  // No profile found — page is already showing; do NOT call showPage again (causes infinite loop)
}

function restoreProfileForm(player){
  if(!player||RESTORING_PROFILE) return;
  RESTORING_PROFILE=true;
  setTimeout(()=>{RESTORING_PROFILE=false;},500);

  // Switch button to edit mode
  const btn = document.getElementById('btnSubmit');
  if(btn){ btn.textContent='✏️ Update Profile'; btn.disabled=false; }

  function restoreChip(groupId,value){
    if(!value) return;
    const clean=s=>(s||'').replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    const cleanVal=clean(value);
    const isBoth = cleanVal === 'both';
    const allChips = document.querySelectorAll('#'+groupId+' .chip, #'+groupId+' .chip-rect');
    allChips.forEach(btn=>{
      btn.style.background=''; btn.style.color=''; btn.style.borderColor='';
      if(isBoth) btn.classList.add('on');
      else if(clean(btn.textContent)===cleanVal) btn.classList.add('on');
    });
    if(isBoth){
      allChips.forEach(btn=>{
        if(clean(btn.textContent)==='both'){
          btn.style.background='#991b1b'; btn.style.color='#fff'; btn.style.borderColor='#7f1d1d';
        }
      });
    }
  }

  const textFields={
    firstName:player.first_name,lastName:player.last_name,
    nickname:player.nickname||S.nickname||"",email:player.email,
    phone:player.phone?formatPhoneDisplay(player.phone):'',
    age_range:player.age_range,
    addrZip:player.zip_code,
    addrCity:player.city,
    addrState:(()=>{const st=player.state||'';if(st.length===2)return st.toUpperCase();const found=Object.values(STATE_INFO).find(([a,n])=>n&&n.toLowerCase()===st.toLowerCase());return found?found[0]:st;})(),
  };
  // Restore S city/state from DB so getCityLatLon and courts work on load
  if(player.city)  S.city  = player.city;
  if(player.state) S.state = player.state;
  if(player.lat)   S.addrLat = player.lat;
  if(player.lon)   S.addrLon = player.lon;
  // Show derived location below zip field
  if(player.city && player.state){
    const zipStatus = document.getElementById('zipGeoStatus');
    if(zipStatus) zipStatus.textContent = `📍 ${player.city}, ${player.state}`;
  }
  Object.entries(textFields).forEach(([id,val])=>{
    const el=document.getElementById(id);
    if(el && (val || val==='')) el.value = val||''; // always restore, even empty string clears the field
  });

  if(player.playing_since){const el=document.getElementById('playingSince');if(el)el.value=player.playing_since;}

  document.querySelectorAll('.chip,.chip-rect').forEach(c=>c.classList.remove('on'));
  restoreChip('genderChips',player.gender);
  restoreChip('handednessChips',player.handedness);
  restoreChip('venuePrefChips',player.play_venues);
  restoreChip('playStyleChips',player.play_style);
  S.playFormat=player.play_format||'Both';
  restoreChip('playFormatChips',player.play_format||'Both');
  S.matchGenderPref=player.match_gender_pref||'Both';
  restoreChip('matchGenderPrefChips',player.match_gender_pref||'Both');
  onMatchGenderPrefChange(S.matchGenderPref);
  S.gender=player.gender||''; S.handedness=player.handedness||'';
  S.venuePref=player.play_venues||''; S.playStyle=player.play_style||'';
  // Show goal rating field if play style is Competitive
  const goalField = document.getElementById('goalRatingField');
  if(goalField) goalField.style.display = (S.playStyle==='Competitive'||S.playStyle==='Both') ? 'block' : 'none';

  if(player.skill_level){
    const idx=DUPR_VALS.findIndex(v=>String(v)===String(player.skill_level));
    if(idx>=0){
      const prs=document.getElementById('personalRatingSlider');
      if(prs){prs.value=idx;prs.style.setProperty('--pct',Math.round(idx/21*100)+'%');}
      const prd=document.getElementById('personalRatingDisplay');
      if(prd) prd.innerHTML=player.skill_level+' <span>Personal Rating</span>';
      S.skill=player.skill_level;
    }
  }
  if(player.dupr_rating){
    const idx=DUPR_VALS.findIndex(v=>String(v)===String(player.dupr_rating));
    if(idx>=0){
      const ds=document.getElementById('duprSlider');
      if(ds){ds.value=idx;ds.style.setProperty('--pct',Math.round(idx/21*100)+'%');}
      const dd=document.getElementById('duprDisplay');
      if(dd) dd.innerHTML=player.dupr_rating+' <span>DUPR</span>';
      S.duprVal=player.dupr_rating;
    }
  }


  if(player.drive_distance_miles){
    const dd=document.getElementById('driveDistance');
    if(dd){dd.value=parseInt(player.drive_distance_miles)||25;onDriveChange(parseInt(player.drive_distance_miles)||25);}
  }

  const emojiToShow=S.avatarEmoji||player.avatar_emoji||'🎾';
  const preview=document.getElementById('emojiPreview');
  if(preview) preview.textContent=emojiToShow;
  const emojiInput=document.getElementById('avatarEmoji');
  if(emojiInput) emojiInput.value=emojiToShow;

  // Restore photo if player has one
  if(player.photo_url){
    S.photoSrc = player.photo_url;
    const overlay = document.getElementById('photoPreviewOverlay');
    if(overlay){
      overlay.style.display='block';
      overlay.innerHTML=`<img src="${player.photo_url}" style="width:100%;height:100%;object-fit:cover;"/>`;
    }
    const addBtn=document.getElementById('addPhotoBtn');
    const removeBtn=document.getElementById('removePhotoBtn');
    if(addBtn) addBtn.style.display='none';
    if(removeBtn) removeBtn.style.display='inline-block';
  }

  // Restore goal rating if Competitive or Both play style
  if((S.playStyle==='Competitive'||S.playStyle==='Both')&&player.goal_rating){
    S.goalRating=player.goal_rating;
    const goalIdx=DUPR_VALS.findIndex(v=>String(v)===String(player.goal_rating));
    if(goalIdx>=0){
      const gsl=document.getElementById('goalRatingSlider');
      if(gsl){gsl.value=goalIdx;gsl.style.setProperty('--pct',(goalIdx/21*100).toFixed(1)+'%');}
      const grd=document.getElementById('goalRatingDisplay');
      if(grd) grd.innerHTML=player.goal_rating+' <span>Goal Rating</span>';
    }
    updateGoalGapViz();
  }

  // Restore age
  const ageEl=document.getElementById('playerAge');
  if(ageEl&&player.age_range) ageEl.value=player.age_range;

  // Restore phone (decoded)
  const phoneEl=document.getElementById('phone');
  if(phoneEl){
    if(player.phone){
      const digits=decodePhone(player.phone);
      phoneEl.value=digits.length===10?'('+digits.substring(0,3)+') '+digits.substring(3,6)+'-'+digits.substring(6):digits;
    } else {
      phoneEl.value='';
    }
  }
  // Restore SMS opt-in
  const smsRow=document.getElementById('smsOptInRow');
  const smsCb=document.getElementById('smsOptIn');
  const hasPhone=!!(phoneEl&&phoneEl.value.trim());
  if(smsRow) smsRow.style.display=hasPhone?'block':'none';
  if(smsCb) smsCb.checked=!!(player.sms_opt_in);
  window.onSmsOptInChange();

  // Restore consent checkboxes — once a player has agreed, always keep checked
  S._tosConsent     = !!(player.waiver_agreed || player.privacy_consent || SESSION_PLAYER);
  S._privacyConsent = S._tosConsent;
  S._riskConsent    = !!(player.waiver_agreed || player.risk_consent    || SESSION_PLAYER);
  document.getElementById('checkBoxTos')?.classList.toggle('on', S._tosConsent);
  const cbr=document.getElementById('checkBoxRisk');
  if(cbr) cbr.classList.toggle('on', S._riskConsent);

  // Restore coach profile
  if(player.is_coach){
    S.isCoach='Yes';
    const isCoachChips=document.getElementById('isCoachChips');
    if(isCoachChips){
      isCoachChips.querySelectorAll('.chip').forEach(ch=>{
        if(ch.textContent.trim()==='Yes — I coach!') ch.classList.add('on');
      });
    }
    toggleCoachSection('Yes');
    S.coachCerts=new Set();S.coachLessonTypes=new Set();S.coachFormats=new Set();
    restoreCoachChips('coachCertChips','coachCerts',player.coach_certifications||'');
    restoreCoachChips('coachLessonChips','coachLessonTypes',player.coach_lesson_types||'');
    restoreCoachChips('coachFormatChips','coachFormats',player.coach_formats||'');
    const rMin=document.getElementById('coachRateMin');if(rMin&&player.coach_rate_min)rMin.value=player.coach_rate_min;
    const rMax=document.getElementById('coachRateMax');if(rMax&&player.coach_rate_max)rMax.value=player.coach_rate_max;
    const bio=document.getElementById('coachBio');if(bio&&player.coach_bio)bio.value=player.coach_bio;
  } else {
    S.isCoach='Not currently';
    const isCoachChips=document.getElementById('isCoachChips');
    if(isCoachChips){
      isCoachChips.querySelectorAll('.chip').forEach(ch=>{
        if(ch.textContent.trim()==='Not currently') ch.classList.add('on');
      });
    }
  }

  // Restore organizer flag
  {
    const isOrg = !!player.is_organizer;
    S.isOrganizer = isOrg ? 'Yes' : 'Not yet';
    const chips = document.getElementById('isOrganizerChips');
    if(chips) chips.querySelectorAll('.chip').forEach(ch=>{
      const t = ch.textContent.trim();
      ch.classList.toggle('on', isOrg ? t==='Yes' : t==='Not yet');
    });
  }

  [1,2,3].forEach(i=>{const step=document.getElementById('step'+i);if(step)step.style.display='block';});
  try{populateSummary();}catch(e){}
  // Lock form on restore — edit mode flag controls whether lock applies
  if(SESSION_PLAYER) lockProfileForm();
  window.scrollTo({top:0,behavior:'smooth'});
}

function formatPhoneDisplay(digits){
  const d=(digits||'').replace(/\D/g,'');
  if(d.length===10) return '('+d.substring(0,3)+') '+d.substring(3,6)+'-'+d.substring(6);
  return digits;
}


let _editModeActive = false;
let _changeTimer = null;

function startChangeDetection(){
  if(_changeTimer)clearInterval(_changeTimer);
  if(!SESSION_PLAYER)return;
  const p=SESSION_PLAYER;
  _changeTimer=setInterval(()=>{
    const btn=document.getElementById('btnSubmit');
    if(!btn){clearInterval(_changeTimer);return;}
    const currentEmoji=document.getElementById('avatarEmoji')?.value||S.avatarEmoji||'🎾';
    const changed=
      v('firstName')!==(p.first_name||'')||
      v('nickname')!==(p.nickname||'')||
      v('addrZip')!==(p.zip_code||'')||
      (v('phone')||'').replace(/\D/g,'')!==decodePhone(p.phone||'')||
      !!(document.getElementById('phone')?.value.replace(/\D/g,'').length>=10 && document.getElementById('smsOptIn')?.checked)!==!!(p.sms_opt_in)||
      S.gender!==(p.gender||'')||
      S.handedness!==(p.handedness||'')||
      S.playFormat!==(p.play_format||'Both')||
      S.playStyle!==(p.play_style||'')||
      S.venuePref!==(p.play_venues||'')||

      // Organizer flag
      (S.isOrganizer==='Yes')!==(p.is_organizer||false)||
      // Coach fields
      (S.isCoach==='Yes')!==(p.is_coach||false)||
      [...(S.coachCerts||[])].sort().join(',')!==(p.coach_certifications||'').split(',').map(s=>s.trim()).filter(Boolean).sort().join(',')||
      [...(S.coachLessonTypes||[])].sort().join(',')!==(p.coach_lesson_types||'').split(',').map(s=>s.trim()).filter(Boolean).sort().join(',')||
      [...(S.coachFormats||[])].sort().join(',')!==(p.coach_formats||'').split(',').map(s=>s.trim()).filter(Boolean).sort().join(',')||
      String(document.getElementById('coachRateMin')?.value||'')!==String(p.coach_rate_min||'')||
      String(document.getElementById('coachRateMax')?.value||'')!==String(p.coach_rate_max||'')||
      (document.getElementById('coachBio')?.value||'').trim()!==(p.coach_bio||'').trim()||
      currentEmoji!==(p.avatar_emoji||'🎾')||
      String(S.skill||'')!==String(p.skill_level||'')||
      String(S.goalRating||'')!==String(p.goal_rating||'')||
      String(S.duprVal||'')!==String(p.dupr_rating||'')||
      (document.getElementById('playerAge')?.value||'')!==(p.age_range||'');
    if(changed){btn.classList.add('has-changes');btn.disabled=false;}
    else{btn.classList.remove('has-changes');btn.disabled=true;}
  },400);
}
function stopChangeDetection(){if(_changeTimer){clearInterval(_changeTimer);_changeTimer=null;}}

function _profileIsLocked(){
  return !!SESSION_PLAYER && !document.getElementById('editProfileBtnEl')?.classList.contains('active');
}

function openEmojiPickerIfUnlocked(){
  if(_profileIsLocked()){
    showToast('Click ✏️ Edit Profile first to make changes','#f59e0b');
    const btn=document.getElementById('editProfileBtnEl');
    if(btn){ btn.style.transform='scale(1.08)'; setTimeout(()=>btn.style.transform='',600); }
    return;
  }
  document.getElementById('emojiPickerRow').style.display='flex';
}

function lockProfileForm(){
  document.getElementById('editModeBanner')?.remove();
  if(_editModeActive)return;
  ['step1','step2','step3'].forEach(id=>{
    const step=document.getElementById(id);if(!step)return;
    // Use readOnly+style instead of disabled — disabled can clear values in Chrome
    step.querySelectorAll('input:not([type="hidden"]),textarea').forEach(el=>{el.readOnly=true;el.style.opacity='0.6';el.style.cursor='not-allowed';el.style.pointerEvents='none';});
    step.querySelectorAll('select').forEach(el=>{el.disabled=true;el.style.opacity='0.6';el.style.cursor='not-allowed';});
    const toggleSelector = SESSION_PLAYER
      ? '.chip,.chip-rect,.sched-cell,.anytime-btn,.day-btn,.avail-toggle'
      : '.chip,.chip-rect,.sched-cell,.anytime-btn,.day-btn';
    step.querySelectorAll(toggleSelector).forEach(el=>{el.style.pointerEvents='none';el.style.opacity='0.6';});
    const ep=document.getElementById('emojiPreview');if(ep){ep.style.pointerEvents='none';ep.style.cursor='default';}
    step.querySelectorAll('input[type="range"]').forEach(el=>{el.disabled=true;});
    step.querySelectorAll('.btn-next,.btn-back').forEach(el=>{el.style.display='none';});
  });
  const btn=document.getElementById('btnSubmit');if(btn){btn.disabled=true;btn.classList.remove('has-changes');}
  // Consent checkboxes must always remain interactive — never locked
  ['checkBoxTos','checkBoxRisk'].forEach(id=>{
    const cb=document.getElementById(id);
    if(cb){ cb.style.pointerEvents=''; cb.style.opacity=''; }
    const row=cb?.closest('.check-row');
    if(row){ row.style.pointerEvents=''; row.style.opacity=''; }
  });
  // SMS opt-in row — lock entire row so label click can't toggle checkbox
  const smsOptRow=document.getElementById('smsOptInRow');
  if(smsOptRow){smsOptRow.style.pointerEvents='none';smsOptRow.style.opacity='0.6';}
  const h2=document.querySelector('#step1 h2');
  if(h2&&!document.getElementById('readOnlyBanner')){
    const b=document.createElement('div');b.id='readOnlyBanner';
    b.style.cssText='display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.4);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px;';
    b.innerHTML='🔒 Read-only · Click ✏️ Edit Profile to make changes';
    h2.insertAdjacentElement('afterend',b);
  }
}
function unlockProfileForm(){
  ['step1','step2','step3'].forEach(id=>{
    const step=document.getElementById(id);if(!step)return;
    step.querySelectorAll('input:not([type="hidden"]),textarea').forEach(el=>{el.readOnly=false;el.style.opacity='';el.style.cursor='';el.style.pointerEvents='';});
    step.querySelectorAll('select').forEach(el=>{el.disabled=false;el.style.opacity='';el.style.cursor='';});
    step.querySelectorAll('.chip,.chip-rect,.sched-cell,.anytime-btn,.day-btn,.avail-toggle').forEach(el=>{el.style.pointerEvents='';el.style.opacity='';});
    const ep=document.getElementById('emojiPreview');if(ep){ep.style.pointerEvents='';ep.style.cursor='pointer';}
    step.querySelectorAll('input[type="range"]').forEach(el=>{el.disabled=false;});
    step.querySelectorAll('.btn-next,.btn-back').forEach(el=>{el.style.display='';});
  });
  // SMS opt-in row — restore interactivity
  const smsOptRow=document.getElementById('smsOptInRow');
  if(smsOptRow){smsOptRow.style.pointerEvents='';smsOptRow.style.opacity='';}
  // Also unlock chips inside hidden subsections (coach section is display:none by default)
  const coachSec=document.getElementById('coachSection');
  if(coachSec){
    coachSec.querySelectorAll('.chip,.chip-rect').forEach(el=>{el.style.pointerEvents='';el.style.opacity='';});
    coachSec.querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=false;el.style.opacity='';el.style.cursor='';});
  }
  document.getElementById('readOnlyBanner')?.remove();
  buildStaticSliderTicks('duprTicks');
  buildStaticSliderTicks('personalRatingTicks');
  buildGoalTicks(0);
}

// ══════════════════════════════════════════════════════
// INNER CIRCLE
// ══════════════════════════════════════════════════════

let IC_MEMBERS = [];
let IC_FAVORITES = new Set(); // emails of favorited members
let _icCurrentView = 'alpha'; // 'alpha' | 'favorites' | 'grid'
let IC_PENDING_PLAYERS = [];
let IC_INVITED_PLAYERS = []; // players you've invited who haven't accepted yet
let IC_INCOMING_COUNT = 0;
let icPendingConfirm = null;

async function loadInnerCircle(){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/connections?or=(requester_email.eq.${encodeURIComponent(myEmail)},recipient_email.eq.${encodeURIComponent(myEmail)})&status=eq.approved&select=*`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(!res.ok) return;
    const conns = await res.json();
    // Load favorites
    IC_FAVORITES = new Set(conns.filter(c=>c.is_favorite).map(c=>c.requester_email===myEmail?c.recipient_email:c.requester_email));
    const otherEmails = conns.map(c=>c.requester_email===myEmail?c.recipient_email:c.requester_email);
    IC_MEMBERS = [];
    if(otherEmails.length){
      const pr = await fetch(
        `${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${otherEmails.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name,last_name,nickname,avatar_emoji,photo_url,skill_level,dupr_rating,gender,city,state,court_name,play_venues,playing_since,is_coach,handedness`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      if(pr.ok){
        const players = await pr.json();
        IC_MEMBERS = players.map(player=>({player, conn:conns.find(c=>c.requester_email===player.email||c.recipient_email===player.email), lastPlayed:null}));
      }
    }
    renderInnerCircleList();
    updateNavCircleBadges(IC_MEMBERS.length, 0, IC_INCOMING_COUNT);
    // Only load pending requests on initial load — invites are loaded lazily when that tab is opened
    await loadIcPending();
    updateIcStats([]);
    _syncIcSentCount(); // async — overwrites dashIcSentCount + icTabSentCount with real invites count
  }catch(e){ console.warn('loadInnerCircle error:',e); }
}

function renderInnerCircleList(){
  const badge = document.getElementById('icApprovedBadge');
  if(badge) badge.textContent = IC_MEMBERS.length||'';
  // Sync IC page header tile + dashboard member count
  const tabMemberTile = document.getElementById('icTabMemberCount');
  if(tabMemberTile) tabMemberTile.textContent = IC_MEMBERS.length || '0';
  const tabCount = document.getElementById('dashIcMemberCount');
  if(tabCount) tabCount.textContent = IC_MEMBERS.length || '0';
  const countLabel = document.getElementById('icMemberCountLabel');
  if(countLabel) countLabel.textContent = IC_MEMBERS.length ? '('+IC_MEMBERS.length+')' : '';
  // Reset to grid view on data reload
  switchIcMemberView('grid');
}

function buildIcMemberCard(player, conn, myEmail, lastPlayed){
  const row = document.createElement('div');
  row.className='ic-member-card';
  // Compact one-line grid row: avatar | name | nickname | skill | fav
  row.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 12px;'+
    'border-bottom:1px solid rgba(0,0,0,0.06);cursor:pointer;transition:background .12s;';
  row.onmouseover=()=>row.style.background='#f0fdf4';
  row.onmouseout=()=>row.style.background='';

  const name=((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim()||'—';
  const initials=name.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
  const emoji=player.avatar_emoji||null;

  // Avatar (small)
  const avatarEl=document.createElement('div');
  avatarEl.style.cssText='width:32px;height:32px;border-radius:50%;background:#d1fae5;'+
    'display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;'+
    'color:#1a7a3a;flex-shrink:0;overflow:hidden;';
  if(player.photo_url){
    avatarEl.innerHTML=`<img src="${player.photo_url}" style="width:100%;height:100%;object-fit:cover;"/>`;
  } else {
    avatarEl.textContent=emoji||initials;
  }

  // Name (flex-grow so it takes available space)
  const nameEl=document.createElement('div');
  nameEl.style.cssText='flex:1.8;min-width:0;font-size:14px;font-weight:700;color:#111;'+
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  nameEl.textContent=name;

  // Nickname
  const nickEl=document.createElement('div');
  nickEl.style.cssText='flex:1.2;min-width:0;font-size:12px;color:#6b7280;font-style:italic;'+
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  nickEl.textContent=player.nickname?'"'+player.nickname+'"':'—';

  // Skill level pill
  const skillEl=document.createElement('div');
  skillEl.style.cssText='flex-shrink:0;font-size:12px;font-weight:700;color:#1a7a3a;'+
    'background:#d1fae5;border-radius:20px;padding:3px 10px;white-space:nowrap;';
  skillEl.textContent=player.skill_level?'⭐ '+player.skill_level:'—';

  // Favorite star
  const pEmail=(player.email||'').toLowerCase();
  const isFav=IC_FAVORITES.has(pEmail);
  const favBtn=document.createElement('button');
  favBtn.style.cssText='background:none;border:none;font-size:20px;cursor:pointer;padding:0 4px;'+
    'color:'+(isFav?'#fbbf24':'#d1d5db')+';flex-shrink:0;transition:color .15s;';
  favBtn.textContent=isFav?'⭐':'☆';
  favBtn.title=isFav?'Remove from favorites':'Add to favorites';
  favBtn.onclick=(e)=>{e.stopPropagation();toggleFavorite(pEmail,favBtn);};

  // Click row → open player card
  const openCard=()=>openPlayerCard(player,conn,myEmail);
  avatarEl.onclick=openCard;
  nameEl.onclick=openCard;
  nickEl.onclick=openCard;
  skillEl.onclick=openCard;

  row.appendChild(avatarEl);
  row.appendChild(nameEl);
  row.appendChild(nickEl);
  row.appendChild(skillEl);
  row.appendChild(favBtn);
  return row;
}

async function removeFromCircle(connId, btn){
  if(!connId) return;
  btn.disabled=true; btn.textContent='Removing…';
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/connections?id=eq.${connId}`,
      {method:'DELETE',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    showToast('Removed from Inner Circle','#f59e0b');
    loadInnerCircle();
  }catch(e){ btn.disabled=false; btn.textContent='Remove'; }
}

let _icPendingLoading = false;
async function loadIcPending(){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  if(_icPendingLoading) return;
  _icPendingLoading = true;
  const card = document.getElementById('icPendingCard');
  const list = document.getElementById('icPendingList');
  const badge = document.getElementById('icPendingBadge');
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/connections?recipient_email=eq.${encodeURIComponent(myEmail)}&status=eq.pending&select=*`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(!res.ok) return;
    const rawPending = await res.json();
    // Deduplicate by requester_email — keep the most recent row per inviter
    const seenRequesters = new Map();
    rawPending.forEach(row=>{
      const key = (row.requester_email||'').toLowerCase();
      if(!seenRequesters.has(key) || (row.created_at||'') > (seenRequesters.get(key).created_at||'')){
        seenRequesters.set(key, row);
      }
    });
    let pending = Array.from(seenRequesters.values());
    pending.sort((a,b)=>(a.requester_name||'').localeCompare(b.requester_name||''));
    IC_INCOMING_COUNT = pending.length;

    // Sync IC page header tile for incoming requests
    const tabReqTile = document.getElementById('icTabRequestCount');
    if(tabReqTile) tabReqTile.textContent = IC_INCOMING_COUNT || '0';

    // Update left nav purple badge
    const pb = document.getElementById('icNavPurpleBadge');
    if(pb){ pb.textContent=pending.length; pb.classList.toggle('placeholder',pending.length===0); pb.style.opacity=pending.length>0?'1':'0.5'; pb.style.display='inline-flex'; }

    // Update top purple button (stays in sync with nav badge)
    const topBadge = document.getElementById('topRequestsBadge');
    if(topBadge){ topBadge.textContent=pending.length; topBadge.style.display=pending.length>0?'inline-block':'none'; }
    const topLabel = document.getElementById('topRequestsLabel');
    if(topLabel) topLabel.textContent = pending.length>0 ? 'View Member Requests ('+pending.length+')' : 'View Member Requests';

    if(!pending.length){ if(card) card.style.display='none'; return; }
    if(card) card.style.display='block';
    if(badge) badge.textContent=pending.length;
    if(!list) return;
    list.innerHTML='';

    // Fetch player profiles for all requesters in one call
    const emails = pending.map(c=>c.requester_email).filter(Boolean);
    let profiles = {};
    if(emails.length){
      try{
        const pr = await fetch(
          `${SUPABASE_URL}/rest/v1/registrations?email=in.(${emails.map(e=>encodeURIComponent(e)).join(',')})&select=email,skill_level,playing_since,city,state`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
        if(pr.ok)(await pr.json()).forEach(p=>{ profiles[p.email.toLowerCase()]=p; });
      }catch(_){}
    }

    pending.forEach(conn=>{
      const player = profiles[(conn.requester_email||'').toLowerCase()] || {};
      const row=buildPendingRequestRow(conn, player);
      list.appendChild(row);
    });
  }catch(e){ console.warn('loadIcPending error:',e); }
  finally{ _icPendingLoading = false; }
}

function buildPendingRequestRow(conn, player={}){
  const row=document.createElement('div');
  row.className='ic-invite-row';
  row.style.alignItems='flex-start';
  const name=conn.requester_name||conn.requester_email;
  const initials=name.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
  const acceptBtn=document.createElement('button');
  acceptBtn.className='ic-action-btn ic-btn-approve';
  acceptBtn.textContent='✅ Accept';
  acceptBtn.onclick=()=>icRespond(conn.id,'approved',acceptBtn);
  const declineBtn=document.createElement('button');
  declineBtn.className='ic-action-btn ic-btn-decline';
  declineBtn.textContent='Decline';
  declineBtn.onclick=()=>icRespond(conn.id,'declined',declineBtn);

  // Build detail chips
  const chips=[];
  if(player.skill_level) chips.push('⭐ '+player.skill_level);
  if(player.playing_since) chips.push('Since '+player.playing_since);
  if(player.city||player.state) chips.push('📍 '+[player.city,player.state].filter(Boolean).join(', '));
  const detailHtml = chips.length
    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">'+
        chips.map(c=>'<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;font-weight:600;">'+c+'</span>').join('')+
      '</div>'
    : '';

  row.innerHTML='<div class="ic-invite-avatar">'+initials+'</div>'+
    '<div style="flex:1;"><div class="ic-invite-name">'+name+'</div>'+detailHtml+'</div>';
  row.appendChild(acceptBtn);
  row.appendChild(declineBtn);
  return row;
}

async function icRespond(connId, status, btn){
  btn.disabled=true; btn.textContent=status==='approved'?'Accepting…':'Declining…';
  try{
    // Get the connection details before patching
    const connRes = await fetch(
      `${SUPABASE_URL}/rest/v1/connections?id=eq.${connId}&select=*`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const conns = connRes.ok ? await connRes.json() : [];
    const conn = conns[0];

    await fetch(`${SUPABASE_URL}/rest/v1/connections?id=eq.${connId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({status})
    });

    if(status==='approved'){
      showToast('✅ Added to Inner Circle!','#4CAF7D');
      // Check if we already have a connection going the other way
      if(conn){
        const myEmail = getMyEmail();
        const reverseRes = await fetch(
          `${SUPABASE_URL}/rest/v1/connections?requester_email=eq.${encodeURIComponent(myEmail)}&recipient_email=eq.${encodeURIComponent(conn.requester_email)}&select=id`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        const reverse = reverseRes.ok ? await reverseRes.json() : [];
        if(!reverse.length){
          // No reverse connection — offer mutual invite
          setTimeout(()=>showMutualInvitePrompt(conn.requester_email, conn.requester_name||conn.requester_email), 800);
        }
      }
    } else {
      showToast('Request declined','#f59e0b');
    }
    loadIcPending();
    loadInnerCircle();
  }catch(e){ btn.disabled=false; btn.textContent=status==='approved'?'Accept':'Decline'; }
}

async function icSendRequest(recipientEmail, recipientName, btn, asFavorite=false){
  const myEmail=getMyEmail();
  if(!myEmail){ showToast('Please sign in first','#f59e0b'); return; }
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/connections`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({requester_email:myEmail,requester_name:getMyName(),recipient_email:recipientEmail,recipient_name:recipientName,status:'pending',is_favorite:asFavorite})
    });
    showToast(asFavorite?'⭐ Favorite invite sent to '+recipientName.split(' ')[0]+'!':'✅ Inner Circle invite sent to '+recipientName,'#4CAF7D');
    loadInnerCircle();
    loadIcInvites();
  }catch(e){
    showToast('⚠️ Could not send invite: '+e.message,'#f59e0b');
    if(btn){ btn.disabled=false; btn.textContent='+ Add to Circle'; }
  }
}

function updateIcStats(pendingMembers){
  const mySkill=S.skill||SESSION_PLAYER?.skill_level||'';
  const skills=mySkill?getAdjacentSkills(mySkill):null;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  let mMale=0,mFemale=0,mOther=0,mBelow=0,mMy=0,mAbove=0;
  IC_MEMBERS.forEach(({player})=>{
    const g=(player.gender||'').toLowerCase();
    if(g==='male') mMale++; else if(g==='female') mFemale++; else mOther++;
    if(skills){
      const ps=parseFloat(player.skill_level||0);
      if(skills.below!==null&&Math.abs(ps-skills.below)<0.13) mBelow++;
      else if(Math.abs(ps-skills.my)<0.13) mMy++;
      else if(skills.above!==null&&Math.abs(ps-skills.above)<0.13) mAbove++;
      else mMy++;
    }
  });
  const pending=pendingMembers&&pendingMembers.length?pendingMembers:IC_INVITED_PLAYERS||[];
  let pMale=0,pFemale=0,pOther=0,pBelow=0,pMy=0,pAbove=0;
  pending.forEach(player=>{
    const g=(player.gender||'').toLowerCase();
    if(g==='male') pMale++; else if(g==='female') pFemale++; else pOther++;
    if(skills&&player.skill_level){
      const ps=parseFloat(player.skill_level||0);
      if(skills.below!==null&&Math.abs(ps-skills.below)<0.13) pBelow++;
      else if(Math.abs(ps-skills.my)<0.13) pMy++;
      else if(skills.above!==null&&Math.abs(ps-skills.above)<0.13) pAbove++;
      else pMy++;
    }
  });
  set('gMaleMember',mMale); set('gFemaleMember',mFemale); set('gOtherMember',mOther); set('gTotalMember',IC_MEMBERS.length);
  // Old IDs kept for compatibility but these rows are removed from HTML
  set('gMaleInvited',pMale); set('gFemaleInvited',pFemale); set('gOtherInvited',pOther); set('gTotalInvited',pending.length);
  set('lBelowMember',mBelow); set('lMyMember',mMy); set('lAboveMember',mAbove); set('lTotalMember',IC_MEMBERS.length);
  set('lBelowInvited',pBelow); set('lMyInvited',pMy); set('lAboveInvited',pAbove); set('lTotalInvited',pending.length);
  // Populate the IC page summary box (dashIcSentCount is owned by _syncIcSentCount)
  set('icOutboundCount', pending.length);
  // Inbound count comes from IC_INCOMING_COUNT set elsewhere
  const inboundEl = document.getElementById('icInboundCount');
  if(inboundEl) inboundEl.textContent = IC_INCOMING_COUNT||0;
  const dashInEl = document.getElementById('dashIcIncomingCount');
  if(dashInEl) dashInEl.textContent = IC_INCOMING_COUNT||0;
}

function updateNavCircleBadges(memberCount,pendingCount,incomingCount){
  const gb=document.getElementById('icNavGreenBadge');
  const yb=document.getElementById('icNavYellowBadge');
  const pb=document.getElementById('icNavPurpleBadge');
  if(gb){gb.textContent=memberCount;gb.classList.toggle('placeholder',memberCount===0);gb.style.opacity=memberCount>0?'1':'0.4';gb.style.display='inline-flex';}
  if(yb){yb.textContent=pendingCount;yb.classList.toggle('placeholder',pendingCount===0);yb.style.opacity=pendingCount>0?'1':'0.4';yb.style.display='inline-flex';}
  if(pb){const inc=incomingCount||0;pb.textContent=inc;pb.classList.toggle('placeholder',inc===0);pb.style.opacity=inc>0?'1':'0.5';pb.style.display='inline-flex';}
  // Sync the IC page summary boxes
  const outEl=document.getElementById('icOutboundCount');
  if(outEl) outEl.textContent=pendingCount;
  const inEl=document.getElementById('icInboundCount');
  if(inEl) inEl.textContent=incomingCount||0;
  // Sync the dashboard IC squares
  const dashMemberEl=document.getElementById('dashIcMemberCount');
  if(dashMemberEl) dashMemberEl.textContent=memberCount||0;
  const dashSentEl=document.getElementById('dashIcSentCount');
  if(dashSentEl) dashSentEl.textContent=pendingCount;
  const dashIncomingEl=document.getElementById('dashIcIncomingCount');
  if(dashIncomingEl) dashIncomingEl.textContent=incomingCount||0;
}

function updateNavCourtBadges(publicCount, privateCount){
  const pub = document.getElementById('navCourtPublic');
  const prv = document.getElementById('navCourtPrivate');
  if(pub){
    const numEl = document.getElementById('navCourtPublicNum');
    if(numEl) numEl.textContent = publicCount;
    pub.style.display = publicCount > 0 ? 'inline-flex' : 'none';
  }
  if(prv){
    const numEl = document.getElementById('navCourtPrivateNum');
    if(numEl) numEl.textContent = privateCount;
    prv.style.display = privateCount > 0 ? 'inline-flex' : 'none';
  }
}

// ── Find Players ──────────────────────────────────────
async function initFindPlayers(){
  const myEmail=getMyEmail();
  if(!myEmail) return;
  loadFindPlayers();
}

async function loadFindPlayers(){
  const results=document.getElementById('pwpResults');
  if(!results) return;
  results.innerHTML='<div class="ic-empty">Loading players near you…</div>';
  try{
    const stateAbbr=(S.state||'NH').length===2?S.state.toUpperCase():'NH';
    const res=await fetch(
      `${SUPABASE_URL}/rest/v1/player_availability?select=player_email,available_until,format,registrations(first_name,last_name,skill_level,city,state,avatar_emoji,gender,handedness,play_venues,court_name,playing_since)&limit=20`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(!res.ok){ results.innerHTML='<div class="ic-empty">No players found.</div>'; return; }
    const rows=await res.json();
    if(!rows.length){ results.innerHTML='<div class="ic-empty">No players are currently looking to play near you.</div>'; return; }
    results.innerHTML='';
    rows.forEach(row=>{
      const p=row.registrations||{};
      const name=((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()||'Player';
      const div=document.createElement('div');
      div.className='pwp-player-card';
      div.innerHTML=
        '<div class="pwp-player-avatar">'+(p.avatar_emoji||name[0]||'👤')+'</div>'+
        '<div class="pwp-player-body">'+
          '<div class="pwp-player-name">'+name+'</div>'+
          '<div class="pwp-player-location">📍 '+(p.city||'—')+', '+(p.state||'—')+'</div>'+
          '<div class="pwp-player-tags">'+
            (p.skill_level?'<span class="pwp-tag pwp-tag-skill">⭐ '+p.skill_level+'</span>':'')+
            (row.format?'<span class="pwp-tag pwp-tag-format">'+row.format+'</span>':'')+
          '</div>'+
        '</div>';
      results.appendChild(div);
    });
  }catch(e){ results.innerHTML='<div class="ic-empty">Error loading players.</div>'; }
}

async function toggleMyAvailability(on){
  const myEmail=getMyEmail();
  const statusRow=document.getElementById('pwpMyStatusRow');
  const label=document.getElementById('pwpToggleLabel');
  if(label) label.textContent=on?'On':'Off';
  if(statusRow) statusRow.style.display=on?'block':'none';
  if(!myEmail) return;
  if(!on){
    await fetch(`${SUPABASE_URL}/rest/v1/player_availability?player_email=eq.${encodeURIComponent(myEmail)}`,
      {method:'DELETE',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}).catch(()=>{});
  }
}

async function saveMyAvailability(){
  const myEmail=getMyEmail();
  if(!myEmail){ showToast('Please sign in first','#f59e0b'); return; }
  const avail=S.pwpAvail||'Flexible';
  const format=S.pwpFormat||'Either';
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/player_availability`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({player_email:myEmail,availability:avail,format,available_until:new Date(Date.now()+7*86400000).toISOString()})
    });
    showToast('✅ Availability saved!','#4CAF7D');
  }catch(e){ showToast('Error: '+e.message,'#f59e0b'); }
}

// ── IC Search ──────────────────────────────────────────
let icSearchDebounce=null;

async function icSearchPlayers(val){
  clearTimeout(icSearchDebounce);
  const results=document.getElementById('icSearchResults');
  if(!val||val.trim().length<2){ if(results) results.innerHTML=''; return; }
  icSearchDebounce=setTimeout(async()=>{
    if(results) results.innerHTML='<div class="ic-empty">Searching…</div>';
    const myEmail=getMyEmail();
    try{
      const q=val.trim();
      const filter='or=(first_name.ilike.'+encodeURIComponent('*'+q+'*')+',last_name.ilike.'+encodeURIComponent('*'+q+'*')+',nickname.ilike.'+encodeURIComponent('*'+q+'*')+')';
      const res=await fetch(`${SUPABASE_URL}/rest/v1/public_profiles?${filter}&select=first_name,last_name,email,nickname,skill_level,dupr_rating,gender,city,state,court_name,playing_since&limit=20`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      if(!res.ok){ if(results) results.innerHTML='<div class="ic-empty">Search failed.</div>'; return; }
      const players=await res.json();
      const filtered=myEmail?players.filter(p=>(p.email||'').toLowerCase()!==myEmail):players;
      if(!filtered.length){ if(results) results.innerHTML='<div class="ic-empty">No players found matching "'+val+'".</div>'; return; }
      let conns=[];
      if(myEmail){
        try{
          const cr=await fetch(`${SUPABASE_URL}/rest/v1/connections?or=(requester_email.eq.${encodeURIComponent(myEmail)},recipient_email.eq.${encodeURIComponent(myEmail)})&select=*`,
            {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
          if(cr.ok) conns=await cr.json();
        }catch(e){}
      }
      if(results) results.innerHTML='';
      filtered.forEach(p=>{
        const pEmail=(p.email||'').toLowerCase();
        const existing=conns.find(c=>(c.requester_email===myEmail&&c.recipient_email===pEmail)||(c.recipient_email===myEmail&&c.requester_email===pEmail));
        const card=buildSearchResultCard(p,existing,myEmail);
        if(results) results.appendChild(card);
      });
    }catch(e){ if(results) results.innerHTML='<div class="ic-empty">Search error: '+e.message+'</div>'; }
  },400);
}

function buildSearchResultCard(player,connection,myEmail){
  const div=document.createElement('div');
  div.className='ic-search-result-card';
  const pEmail=(player.email||'').toLowerCase();
  const name=((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim()||'Unknown';
  const initials=name.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
  const tags=[];
  if(player.nickname) tags.push({cls:'ic-tag-nickname',label:'🏷 '+player.nickname});
  if(player.skill_level) tags.push({cls:'ic-tag-rating',label:'⭐ '+player.skill_level});
  if(player.gender) tags.push({cls:'ic-tag-gender',label:player.gender});
  if(player.city) tags.push({cls:'ic-tag-gender',label:'📍 '+player.city+(player.state?', '+player.state:'')});
  const tagsHtml=tags.map(t=>'<span class="ic-result-tag '+t.cls+'">'+t.label+'</span>').join('');
  const actionDiv=document.createElement('div');
  actionDiv.style.flexShrink='0';
  let actionEl;
  if(connection){
    actionEl=document.createElement('span');
    actionEl.className='ic-status-sent';
    actionEl.textContent=connection.status==='approved'?'✓ In Circle':connection.status==='pending'&&connection.requester_email===myEmail?'⏳ Invited':'🔔 Approve?';
  } else {
    actionEl=document.createElement('button');
    actionEl.className='ic-action-btn ic-btn-add';
    actionEl.textContent='+ Add';
    actionEl.onclick=()=>openIcConfirmModal(player);
  }
  actionDiv.appendChild(actionEl);
  const infoDiv=document.createElement('div');
  infoDiv.style.cssText='flex:1;min-width:0;cursor:pointer;';
  infoDiv.innerHTML='<div class="ic-player-name">'+name+'</div><div class="ic-result-tags">'+tagsHtml+'</div>';
  infoDiv.onclick=()=>openPlayerCard(player,connection,myEmail);
  div.innerHTML='<div class="ic-player-avatar" style="width:42px;height:42px;font-size:15px;flex-shrink:0;">'+initials+'</div>';
  div.appendChild(infoDiv);
  div.appendChild(actionDiv);
  return div;
}

function openIcConfirmModal(player){
  icPendingConfirm=player;
  const modal=document.getElementById('icConfirmModal');
  const content=document.getElementById('icModalContent');
  const confirmBtn=document.getElementById('icModalConfirmBtn');
  if(!modal||!content) return;
  const name=((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim()||'Unknown';
  const initials=name.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
  const identifiers=[
    {label:'Nickname',value:player.nickname||'—',highlight:!!player.nickname},
    {label:'Personal rating',value:player.skill_level||'—',highlight:!!player.skill_level},
    {label:'DUPR rating',value:player.dupr_rating||'—',highlight:!!player.dupr_rating},
    {label:'Gender',value:player.gender||'—',highlight:false},
    {label:'Location',value:player.city?(player.city+(player.state?', '+player.state:'')):'—',highlight:!!player.city},
    {label:'Home court',value:player.court_name||'—',highlight:!!player.court_name},
  ];
  const gridHtml=identifiers.map(id=>'<div class="ic-identifier-item"><div class="ic-identifier-label">'+id.label+'</div><div class="ic-identifier-value'+(id.highlight?' highlight':'')+'">'+(id.value||'—')+'</div></div>').join('');
  content.innerHTML=
    '<div class="ic-modal-player-header"><div class="ic-modal-avatar">'+initials+'</div>'+
    '<div><div class="ic-modal-name">'+name+'</div>'+(player.nickname?'<div class="ic-modal-nickname">"'+player.nickname+'"</div>':'')+'</div></div>'+
    '<div class="ic-identifier-grid">'+gridHtml+'</div>'+
    '<div id="icFavToggleWrap" style="margin-top:14px;padding:12px 14px;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:10px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="toggleIcFavOption()">'+
      '<div>'+
        '<div style="font-size:13px;font-weight:700;color:#fff;">&#11088; Add as Favorite?</div>'+
        '<div style="font-size:11px;color:var(--dim);margin-top:2px;">Favorites appear first when setting up matches</div>'+
      '</div>'+
      '<div id="icFavToggleBtn" style="width:36px;height:20px;border-radius:999px;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.2);position:relative;transition:all .2s;">'+
        '<div id="icFavToggleThumb" style="width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:1px;left:1px;transition:all .2s;opacity:0.4;"></div>'+
      '</div>'+
    '</div>';
  let _icAddAsFav = false;
  window.toggleIcFavOption = function(){
    _icAddAsFav = !_icAddAsFav;
    const wrap  = document.getElementById('icFavToggleWrap');
    const btn   = document.getElementById('icFavToggleBtn');
    const thumb = document.getElementById('icFavToggleThumb');
    if(_icAddAsFav){
      if(wrap)  wrap.style.background  = 'rgba(251,191,36,0.12)';
      if(wrap)  wrap.style.borderColor = 'rgba(251,191,36,0.4)';
      if(btn)   btn.style.background   = '#fbbf24';
      if(btn)   btn.style.borderColor  = '#fbbf24';
      if(thumb) thumb.style.left       = '17px';
      if(thumb) thumb.style.opacity    = '1';
    } else {
      if(wrap)  wrap.style.background  = 'rgba(251,191,36,0.06)';
      if(wrap)  wrap.style.borderColor = 'rgba(251,191,36,0.2)';
      if(btn)   btn.style.background   = 'rgba(255,255,255,0.12)';
      if(btn)   btn.style.borderColor  = 'rgba(255,255,255,0.2)';
      if(thumb) thumb.style.left       = '1px';
      if(thumb) thumb.style.opacity    = '0.4';
    }
  };
  confirmBtn.onclick=function(){
    const asFav = _icAddAsFav;
    closeIcModal();
    icSendRequest((player.email||'').toLowerCase(), name, document.createElement('button'), asFav);
    setTimeout(()=>icSearchPlayers(document.getElementById('icSearchInput')?.value||''),1500);
  };
  modal.style.display='flex';
}

function closeIcModal(){
  const modal=document.getElementById('icConfirmModal');
  if(modal) modal.style.display='none';
  icPendingConfirm=null;
}

document.addEventListener('click',function(e){
  const modal=document.getElementById('icConfirmModal');
  if(modal&&e.target===modal) closeIcModal();
});

const AVATAR_EMOJIS=[
  '🎾','🏓','🏆','🥇','🎯','⚡','🔥','💪','🏃','🤾','🦾','🏋️','🤸','🧘','🚀',
  '🦅','🐉','🦁','🐯','🦊','🐺','🦋','🐬','🦈','🐸','🦎','🐻','🐼','🐨','🦘',
  '🌊','🌪️','⭐','🌟','💫','☀️','🌙','🌈','❄️','🍀',
  '🍕','🌮','🍦','🎸','🎺','🎲','🎮','🃏','🎪','🎨',
  '👑','🧠','💥','💎','🤙','✌️','🤘','🫶','😎','🤩',
  '😤','🥶','🤯','🧨','🎭','🪄','🔮','🏅','🥊','🎽',
  '👟','🧢','🎒','🌺','🌸','🏔️','🌄','🦒','🦓','🦀',
];

document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.getElementById('emojiPickerGrid');
  if(!grid) return;
  const preview=document.getElementById('emojiPreview');
  const input=document.getElementById('avatarEmoji');
  AVATAR_EMOJIS.forEach(e=>{
    const btn=document.createElement('div');
    btn.className='emoji-reg-opt';
    btn.textContent=e;
    btn.onclick=()=>{
      grid.querySelectorAll('.emoji-reg-opt').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      if(preview) preview.textContent=e;
      if(input) input.value=e;
      S.avatarEmoji=e;
    };
    grid.appendChild(btn);
  });
});

function openPlayerCard(player,connection,myEmail){
  const modal=document.getElementById('playerCardModal');
  const content=document.getElementById('playerCardContent');
  if(!modal||!content) return;
  const name=((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim()||'Player';
  const emoji=player.avatar_emoji||'🎾';
  const tags=[];
  if(player.skill_level) tags.push({cls:'pc-tag-green',label:'⭐ '+player.skill_level+' Rating'});
  if(player.dupr_rating) tags.push({cls:'pc-tag-green',label:'DUPR '+player.dupr_rating});
  if(player.gender) tags.push({cls:'pc-tag-green',label:player.gender});
  if(player.handedness) tags.push({cls:'pc-tag-green',label:player.handedness.replace(/^[🤚🤲]+\s*/,'')});
  const tagsHtml=tags.map(t=>'<span class="pc-card-tag '+t.cls+'">'+t.label+'</span>').join('');
  const stats=[
    {label:'Location',value:player.city?(player.city+(player.state?', '+player.state:'')):'—',green:false},
    {label:'Playing since',value:player.playing_since||'—',green:!!player.playing_since},
    {label:'Venue',value:player.play_venues||'—',green:false},
    {label:'Goal rating',value:player.goal_rating?player.goal_rating+' goal':'—',green:!!player.goal_rating},
  ];
  const statsHtml=stats.map(s=>'<div class="pc-stat-box"><div class="pc-stat-lbl">'+s.label+'</div><div class="pc-stat-val'+(s.green?' green':'')+'">'+(s.value||'—')+'</div></div>').join('');
  const actionDiv=document.createElement('div');
  actionDiv.className='pc-card-actions';
  const addBtn=document.createElement('button');
  addBtn.className='pc-btn-add';
  if(connection&&connection.status==='approved'){ addBtn.textContent='✓ In Your Circle'; addBtn.disabled=true; addBtn.style.opacity='.6'; }
  else if(connection&&connection.status==='pending'){ addBtn.textContent='Request Pending'; addBtn.disabled=true; addBtn.style.opacity='.6'; }
  else {
    addBtn.textContent='+ Add to Inner Circle'; addBtn.onclick=()=>{ closePlayerCard(); openIcConfirmModal(player); };
  }
  const playBtn=document.createElement('button');
  playBtn.className='pc-btn-play'; playBtn.textContent='🎾 Play';
  playBtn.onclick=()=>{ closePlayerCard(); showPage('setupMatch'); };
  actionDiv.appendChild(addBtn); actionDiv.appendChild(playBtn);
  content.innerHTML=
    '<div class="pc-banner"></div>'+
    '<div style="position:relative;"><div class="pc-avatar-outer"><div class="pc-card-avatar"><span style="font-size:30px;">'+emoji+'</span></div></div></div>'+
    '<div class="pc-card-body"><p class="pc-card-name">'+name+'</p>'+(player.nickname?'<p class="pc-card-nick">"'+player.nickname+'"</p>':'')+
    '<div class="pc-card-tags">'+tagsHtml+'</div><div class="pc-stats-grid">'+statsHtml+'</div></div>';
  content.appendChild(actionDiv);
  modal.style.display='flex';
}

function closePlayerCard(){
  const modal=document.getElementById('playerCardModal');
  if(modal) modal.style.display='none';
}

document.addEventListener('click',function(e){
  const modal=document.getElementById('playerCardModal');
  if(modal&&e.target===modal) closePlayerCard();
});

// ── IC Near/Search tabs — Find Players removed from IC ─
// switchFindTab, loadNearbyPlayers, filterNearbyGrid stubbed as no-ops.
// icSectionFind HTML removed from index.html.
function switchFindTab(){}
window.switchFindTab = switchFindTab;

const SKILL_LEVELS=[2.0,2.25,2.5,2.75,3.0,3.25,3.5,3.75,4.0,4.25,4.5,4.75,5.0,5.5,6.0,6.5,7.0];

function getAdjacentSkills(mySkill){
  const val=parseFloat(mySkill);
  const idx=SKILL_LEVELS.findIndex(s=>Math.abs(s-val)<0.01);
  if(idx<0) return {below:null,my:val,above:null};
  return {below:idx>0?SKILL_LEVELS[idx-1]:null,my:val,above:idx<SKILL_LEVELS.length-1?SKILL_LEVELS[idx+1]:null};
}

function loadNearbyPlayers(){}
function filterNearbyGrid(){}
window.filterNearbyGrid = filterNearbyGrid;

// ── IC Stats + Invites ─────────────────────────────────
async function loadIcInvites(){
  const myEmail=getMyEmail();
  const card=document.getElementById('icInvitesCard');
  const list=document.getElementById('icInvitesList');
  if(!card||!list) return;
  try{
    // Fetch ALL sent invites (pending + approved + declined) for history
    const res=await fetch(`${SUPABASE_URL}/rest/v1/connections?requester_email=eq.${encodeURIComponent(myEmail)}&select=*&order=created_at.desc`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    if(!res.ok) return;
    const allSent=await res.json();
    const pending=allSent.filter(c=>c.status==='pending');
    const accepted=allSent.filter(c=>c.status==='approved');
    const declined=allSent.filter(c=>c.status==='declined');

    // Populate IC_INVITED_PLAYERS with profile data for pending invites (for IC stats)
    IC_INVITED_PLAYERS = [];
    if(pending.length){
      const emails=pending.map(c=>c.recipient_email).filter(Boolean);
      if(emails.length){
        try{
          const pr=await fetch(`${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${emails.map(e=>encodeURIComponent(e)).join(',')})&select=email,gender,skill_level`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
          const registered = pr.ok ? await pr.json() : [];
          // For invitees not yet registered, create placeholder entries so count is correct
          const regEmails = new Set(registered.map(r=>r.email.toLowerCase()));
          IC_INVITED_PLAYERS = [...registered];
          emails.forEach(e=>{
            if(!regEmails.has(e.toLowerCase())){
              IC_INVITED_PLAYERS.push({email:e, gender:'', skill_level:''}); // unregistered placeholder
            }
          });
        }catch(e){ IC_INVITED_PLAYERS = pending.map(c=>({email:c.recipient_email,gender:'',skill_level:''})); }
      }
    }
    // Refresh IC stats with updated invited data
    updateIcStats([]);

    // Update yellow badge with pending count
    const navPendBadge=document.getElementById('icNavYellowBadge');
    if(navPendBadge){
      navPendBadge.textContent=pending.length;
      navPendBadge.classList.toggle('placeholder',pending.length===0);
      navPendBadge.style.opacity=pending.length>0?'1':'0.4';
      navPendBadge.style.display='inline-flex';
    }

    // Only show the card when there are still-active (unused) invites awaiting response
    if(!pending.length){card.style.display='none';return;}
    card.style.display='block';
    const badge=document.getElementById('icInvitesBadge');
    if(badge) badge.textContent=pending.length||'';

    list.innerHTML='';

    const renderGroup=(items, statusLabel, statusColor, showCancel)=>{
      if(!items.length) return;
      const hdr=document.createElement('div');
      hdr.style.cssText='font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;'+
        'letter-spacing:.06em;padding:8px 0 4px;border-top:1px solid var(--border);margin-top:4px;';
      hdr.textContent=statusLabel+' ('+items.length+')';
      list.appendChild(hdr);
      items.forEach(conn=>{
        const name=conn.recipient_name||conn.recipient_email;
        const initials=name.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
        const sentAt=conn.created_at?new Date(conn.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
        const row=document.createElement('div');
        row.className='ic-invite-row';
        const meta=sentAt?'Sent '+sentAt:'';
        const emailLine=(conn.recipient_email&&!conn.recipient_email.startsWith('pending_'))
          ?'<div style="font-size:11px;color:#6b7280;margin-top:1px;">'+conn.recipient_email+'</div>':'';
        row.innerHTML=
          '<div class="ic-invite-avatar" style="background:rgba(255,255,255,0.08);color:#fff;">'+initials+'</div>'+
          '<div style="flex:1;"><div class="ic-invite-name">'+name+'</div>'+
          emailLine+
          '<div class="ic-invite-meta">'+meta+'</div></div>'+
          '<span class="ic-invite-status" style="color:'+statusColor+';">'+statusLabel+'</span>';
        if(showCancel){
          const cancelBtn=document.createElement('button');
          cancelBtn.className='ic-member-btn ic-mem-btn-remove';
          cancelBtn.style.cssText='margin-left:8px;padding:4px 10px;font-size:11px;';
          cancelBtn.textContent='Cancel';
          cancelBtn.onclick=async function(){
            cancelBtn.disabled=true;cancelBtn.textContent='Cancelling…';
            await fetch(`${SUPABASE_URL}/rest/v1/connections?id=eq.${conn.id}`,{method:'DELETE',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
            showToast('Invite cancelled','#f59e0b');
            loadIcInvites();
          };
          row.appendChild(cancelBtn);
        }
        list.appendChild(row);
      });
    };

    // Only show AWAITING — accepted invites are already in the IC member count
    renderGroup(pending, '⏳ Awaiting', '#fbbf24', true);

  }catch(e){ console.warn('loadIcInvites error:',e); }
}

// ── IC View modes ─────────────────────────────────────
let IC_VIEW_MODE='all';
let IC_LIST_VISIBLE=false;

function showIcView(mode){
  IC_VIEW_MODE=mode;
  // Map legacy modes to new section-based navigation
  const sectionMap={members:'members',invited:'invite',incoming:'requests',all:'members'};
  const section=sectionMap[mode]||'members';
  const icPageActive=document.getElementById('page-innerCircle')?.classList.contains('active');
  if(!icPageActive){
    showPage('innerCircle');
    let attempts=0;
    const tryApply=()=>{
      attempts++;
      const ready=document.getElementById('icSectionMembers') && (IC_MEMBERS.length>0 || IC_INCOMING_COUNT>0 || attempts>8);
      if(ready){ showIcSection(section); }
      else if(attempts<12){ setTimeout(tryApply, 200); }
      else { showIcSection(section); }
    };
    setTimeout(tryApply, 350);
  } else {
    showIcSection(section);
  }
}

// ── IC Section switcher (new tab-based navigation) ─────

// Fetches the active outbound IC invite count from the invites table and syncs both tiles.
// Counts outbound IC invites still awaiting a response (connections with status='pending'
// where this player is the requester). Same source as the invites card — authoritative.
async function _syncIcSentCount(){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/connections?requester_email=eq.${encodeURIComponent(myEmail)}&status=eq.pending&select=id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    if(!res.ok) return;
    const rows = await res.json();
    const n = rows.length;
    const tabSentEl  = document.getElementById('icTabSentCount');
    const dashSentEl = document.getElementById('dashIcSentCount');
    if(tabSentEl)  tabSentEl.textContent  = n;
    if(dashSentEl) dashSentEl.textContent = n;
  }catch(e){}
}

function showIcSection(section){
  // FIX 1 — Sync IC page tab counts from live data
  const tabMember = document.getElementById('icTabMemberCount');
  const tabReq    = document.getElementById('icTabRequestCount');
  if(tabMember) tabMember.textContent = IC_MEMBERS.length || '0';
  if(tabReq)    tabReq.textContent    = IC_INCOMING_COUNT || '0';
  // Sync sent count from invites table (async, updates tiles when done)
  _syncIcSentCount();
  // Also sync shared dashboard count IDs
  const dashMember = document.getElementById('dashIcMemberCount');
  const dashReq    = document.getElementById('dashIcIncomingCount');
  if(dashMember) dashMember.textContent = IC_MEMBERS.length || '0';
  if(dashReq)    dashReq.textContent    = IC_INCOMING_COUNT || '0';
  const lbl = document.getElementById('icMemberCountLabel');
  if(lbl) lbl.textContent = IC_MEMBERS.length ? '('+IC_MEMBERS.length+')' : '';

  // FIX 2 — Tab button highlight: reset all to inactive, then activate current
  const membersBtn  = document.getElementById('icTabMembers');
  const inviteBtn   = document.getElementById('icTabInvite');
  const requestsBtn = document.getElementById('icTabRequests');
  if(membersBtn){
    membersBtn.style.background = '#ffffff';
    const ct = document.getElementById('icTabMemberCount');
    const lb = membersBtn.querySelectorAll('div')[1];
    if(ct) ct.style.color = '#14532d';
    if(lb) lb.style.color = '#14532d';
  }
  if(inviteBtn){
    inviteBtn.style.background = '#ffffff';
    const ct = document.getElementById('icTabSentCount');
    const lb = inviteBtn.querySelectorAll('div')[1];
    if(ct) ct.style.color = '#78350f';
    if(lb) lb.style.color = '#78350f';
  }
  if(requestsBtn){
    requestsBtn.style.background = '#ffffff';
    const ct = document.getElementById('icTabRequestCount');
    const lb = requestsBtn.querySelectorAll('div')[1];
    if(ct) ct.style.color = '#4c1d95';
    if(lb) lb.style.color = '#4c1d95';
  }
  const activeMap = {
    members:  { btn: membersBtn,  bg: '#16a34a' },
    invite:   { btn: inviteBtn,   bg: '#d97706' },
    requests: { btn: requestsBtn, bg: '#7c3aed' },
  };
  const active = activeMap[section];
  if(active?.btn){
    active.btn.style.background = active.bg;
    active.btn.querySelectorAll('div').forEach(d => d.style.color = '#fff');
  }

  // 'invite' shows members + invite list; panel only opens via Send an Invite button
  if(section==='invite'){
    ['Members','Invite','Requests','Find'].forEach(s=>{
      const el=document.getElementById('icSection'+s); if(el) el.style.display='none';
    });
    const membersEl = document.getElementById('icSectionMembers');
    if(membersEl) membersEl.style.display = 'block';
    const panel = document.getElementById('icInvitePanel');
    if(panel) panel.style.display = 'none';
    switchIcMemberView('grid');
    loadIcInvites();
    window.scrollTo(0,0);
    return;
  }

  ['Members','Invite','Requests','Find'].forEach(s=>{
    const el=document.getElementById('icSection'+s);
    if(el) el.style.display='none';
  });
  const cap=section.charAt(0).toUpperCase()+section.slice(1);
  const target=document.getElementById('icSection'+cap);
  if(target) target.style.display='block';

  // Load data on demand + enforce default view
  if(section==='members'){
    // Always collapse the invite panel — it should only open via the Send an Invite button
    const invitePanel = document.getElementById('icInvitePanel');
    if(invitePanel) invitePanel.style.display = 'none';
    switchIcMemberView('grid');
    // Ensure invite/pending noise is hidden in the members view
    const invitesCard = document.getElementById('icInvitesCard');
    if(invitesCard) invitesCard.style.display = 'none';
    const pendingCard = document.getElementById('icPendingCard');
    if(pendingCard) pendingCard.style.display = 'none';
  }
  if(section==='requests') loadIcPending();
  window.scrollTo(0,0);
}

// applyIcViewMode — replaced by showIcSection(). Stub kept so stray callers don't throw.
function applyIcViewMode(mode){
  const sectionMap={members:'members',invited:'invite',incoming:'requests',all:'members'};
  showIcSection(sectionMap[mode]||'members');
}

// toggleIcListView / renderInlineCircleList — inline 5-col list removed from new IC design. Stubs kept.
function toggleIcListView(){ /* no-op — replaced by showIcSection */ }
function renderInlineCircleList(){ /* no-op — inline list panel removed */ }
// switchCircleView / renderCircleSkillColumns — kept as stubs for any legacy call sites.
function switchCircleView(view){ /* no-op */ }
function renderCircleSkillColumns(){ /* no-op */ }

// ── IC member view toggle (A–Z / Favorites / Level Grid) ──────────────────
function switchIcMemberView(view){
  _icCurrentView = view;

  const inactiveCSS = 'padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:#f1f5f9;border:1.5px solid #d1d5db;color:#374151;font-family:inherit;';
  const activeCSS   = 'padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:#1a7a3a;border:1.5px solid #1a7a3a;color:#fff;font-family:inherit;';
  ['icViewGrid','icViewFavorites','icViewAlpha'].forEach(id=>{
    const b=document.getElementById(id); if(b) b.style.cssText=inactiveCSS;
  });
  const activeId = view==='grid'?'icViewGrid':view==='favorites'?'icViewFavorites':'icViewAlpha';
  const activeBtn = document.getElementById(activeId);
  if(activeBtn) activeBtn.style.cssText = activeCSS;

  const list       = document.getElementById('icApprovedList');
  const colHeaders = document.getElementById('icColHeaders');
  const grid       = document.getElementById('icLevelGrid');

  if(view === 'grid'){
    if(list)       list.style.display       = 'none';
    if(colHeaders) colHeaders.style.display = 'none';
    if(grid)       grid.style.display       = 'block';
    // Also hide the invites history card — it has no place in the grid view
    const invitesCard = document.getElementById('icInvitesCard');
    if(invitesCard) invitesCard.style.display = 'none';
    _buildIcLevelGrid();
    return;
  }

  // List views (alpha / favorites)
  if(list)       list.style.display       = '';
  if(colHeaders) colHeaders.style.display = '';
  if(grid)       grid.style.display       = 'none';
  if(!list) return;
  list.innerHTML = '';

  if(view === 'favorites'){
    const favs = IC_MEMBERS.filter(({player})=>IC_FAVORITES.has((player.email||'').toLowerCase()));
    if(!favs.length){
      list.innerHTML='<div style="padding:32px;text-align:center;color:#9ca3af;font-size:14px;">No favorites yet — tap ☆ on any member to add them</div>';
      return;
    }
    favs.sort((a,b)=>((a.player.first_name||'')+(a.player.last_name||'')).localeCompare((b.player.first_name||'')+(b.player.last_name||'')));
    favs.forEach(({player,conn})=>list.appendChild(buildIcMemberCard(player,conn,getMyEmail(),null)));
    return;
  }

  // alpha (default)
  if(!IC_MEMBERS.length){
    list.innerHTML='<div style="padding:32px;text-align:center;color:#9ca3af;font-size:14px;">Your Inner Circle is empty.<br><span style="font-size:13px;color:#1a7a3a;cursor:pointer;font-weight:700;" onclick="toggleIcInvitePanel()">Invite someone to get started →</span></div>';
    return;
  }
  const sorted=[...IC_MEMBERS].sort((a,b)=>((a.player.first_name||'')+(a.player.last_name||'')).localeCompare((b.player.first_name||'')+(b.player.last_name||'')));
  sorted.forEach(({player,conn})=>list.appendChild(buildIcMemberCard(player,conn,getMyEmail(),null)));
}
window.switchIcMemberView = switchIcMemberView;

function _buildIcLevelGrid(){
  const grid = document.getElementById('icLevelGrid');
  if(!grid) return;

  const myLevel = parseFloat(S.skill || SESSION_PLAYER?.skill_level || 0);
  if(!myLevel){
    grid.innerHTML='<div style="padding:24px;text-align:center;color:#9ca3af;font-size:13px;">Add your skill level to your profile to see the Level Grid.</div>';
    return;
  }

  const fmt = v => parseFloat(v.toFixed(2));
  const cols = [
    { label:'.5+ Below My Level',  rating: fmt(myLevel-0.50), prefix:'≤' },
    { label:'.25 Below My Level', rating: fmt(myLevel-0.25), prefix:''  },
    { label:'My Level',           rating: fmt(myLevel),      prefix:'',  center:true },
    { label:'.25 Above My Level', rating: fmt(myLevel+0.25), prefix:''  },
    { label:'.5+ Above My Level', rating: fmt(myLevel+0.50), prefix:'≥' },
  ];

  // Bucket members into 5 columns by ±0.125 tolerance bands
  const buckets = [[],[],[],[],[]];
  IC_MEMBERS.forEach(({player})=>{
    const s = parseFloat(player.skill_level||0);
    if(!s) return;
    const diff = s - myLevel;
    if     (diff <= -0.375) buckets[0].push(player);
    else if(diff <= -0.125) buckets[1].push(player);
    else if(diff <=  0.125) buckets[2].push(player);
    else if(diff <=  0.375) buckets[3].push(player);
    else                    buckets[4].push(player);
  });

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:3px 0;table-layout:fixed;';

  // Header row
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  cols.forEach(col=>{
    const th = document.createElement('th');
    th.style.cssText = 'border-radius:8px;padding:6px 4px;text-align:center;'
      +(col.center
        ? 'background:#d1fae5;color:#1a7a3a;font-weight:800;'
        : 'background:#f1f5f9;color:#374151;font-weight:700;');
    th.innerHTML = `<div style="font-size:11px;">${col.label}</div>`
      +`<div style="font-size:10px;color:#6b7280;margin-top:1px;">${col.prefix}${col.rating}</div>`;
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  // Body rows
  const tbody   = document.createElement('tbody');
  const maxRows = Math.max(...buckets.map(b=>b.length), 1);
  for(let r=0; r<maxRows; r++){
    const tr = document.createElement('tr');
    buckets.forEach((bucket, ci)=>{
      const td = document.createElement('td');
      td.style.cssText = 'text-align:center;vertical-align:top;padding:3px 2px;';
      const player = bucket[r];
      if(player){
        const name = (((player.first_name||'')+' '+(player.last_name||'')).trim())||'—';
        td.style.cssText += 'font-size:12px;font-weight:600;color:#111;cursor:pointer;';
        td.textContent = name;
        const match = IC_MEMBERS.find(m=>(m.player.email||'')===(player.email||''));
        if(match) td.onclick = ()=>openPlayerCard(match.player, match.conn, getMyEmail());
      } else if(r===0){
        td.style.cssText += 'font-size:10px;color:#9ca3af;';
        td.textContent = '—';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  grid.innerHTML = '';
  grid.appendChild(table);
}

// showFilteredList — stat tables removed from new IC design. Redirects to members section.
function showFilteredList(type, value, status){
  if(!document.getElementById('page-innerCircle')?.classList.contains('active')){
    showPage('innerCircle');
    setTimeout(()=>showFilteredList(type, value, status), 500);
    return;
  }
  showIcSection('members');
}

function sortInnerCircle(by){
  if(by==='name') IC_MEMBERS.sort((a,b)=>((a.player.first_name||'')+(a.player.last_name||'')).localeCompare((b.player.first_name||'')+(b.player.last_name||'')));
  else if(by==='skill') IC_MEMBERS.sort((a,b)=>parseFloat(b.player.skill_level||0)-parseFloat(a.player.skill_level||0));
  switchIcMemberView(_icCurrentView);
}

function filterInnerCircle(q){
  const list=document.getElementById('icApprovedList');
  if(!list) return;
  if(!q){ renderInnerCircleList(); return; }
  // Ensure list view is visible when searching
  const colHeaders=document.getElementById('icColHeaders');
  const grid=document.getElementById('icLevelGrid');
  list.style.display=''; if(colHeaders) colHeaders.style.display=''; if(grid) grid.style.display='none';
  const filtered=IC_MEMBERS.filter(({player})=>{
    const name=((player.first_name||'')+(player.last_name||'')).toLowerCase();
    const nick=(player.nickname||'').toLowerCase();
    return name.includes(q.toLowerCase())||nick.includes(q.toLowerCase());
  });
  list.innerHTML='';
  filtered.forEach(({player,conn})=>list.appendChild(buildIcMemberCard(player,conn,getMyEmail(),null)));
}

// ── Community snapshot ─────────────────────────────────
async function loadCommunitySnapshot(){
  const myEmail=getMyEmail();
  const mySkill=S.skill||'';
  const cityData=getCityLatLon();
  const section=document.getElementById('icCommunitySnapshot');
  const loading=document.getElementById('communityLoading');
  if(!mySkill||!cityData){if(section)section.style.display='none';return;}
  if(loading) loading.style.display='block';
  const radiusMi=parseInt(document.getElementById('communityRadiusSlider')?.value||25);
  const skills=getAdjacentSkills(mySkill);
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  const pct=(a,b)=>b>0?Math.round(a/b*100)+'%':'0%';
  try{
    const stateAbbr=(S.state||'NH').length===2?S.state.toUpperCase():'NH';
    const res=await fetch(`${SUPABASE_URL}/rest/v1/registrations?state=eq.${encodeURIComponent(stateAbbr)}&select=email,skill_level,gender,lat,lon&limit=2000`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    if(!res.ok) throw new Error('Failed');
    const all=await res.json();
    const nearby=all.filter(p=>{if(p.email===myEmail)return false;if(!p.lat||!p.lon)return false;return haversine(cityData.lat,cityData.lon,parseFloat(p.lat),parseFloat(p.lon))<=radiusMi*1.60934;});
    let cmBelow=0,cmMy=0,cmAbove=0,cmMale=0,cmFemale=0,cmOther=0;
    nearby.forEach(p=>{
      const ps=parseFloat(p.skill_level||0);
      if(skills.below!==null&&Math.abs(ps-skills.below)<0.13) cmBelow++;
      else if(Math.abs(ps-skills.my)<0.13) cmMy++;
      else if(skills.above!==null&&Math.abs(ps-skills.above)<0.13) cmAbove++;
      const g=(p.gender||'').toLowerCase();
      if(g==='male') cmMale++; else if(g==='female') cmFemale++; else cmOther++;
    });
    const cmLevelTotal=cmBelow+cmMy+cmAbove;
    let circBelow=0,circMy=0,circAbove=0,circMale=0,circFemale=0,circOther=0;
    IC_MEMBERS.forEach(({player})=>{
      const ps=parseFloat(player.skill_level||0);
      if(skills.below!==null&&Math.abs(ps-skills.below)<0.13) circBelow++;
      else if(Math.abs(ps-skills.my)<0.13) circMy++;
      else if(skills.above!==null&&Math.abs(ps-skills.above)<0.13) circAbove++;
      const g=(player.gender||'').toLowerCase();
      if(g==='male') circMale++; else if(g==='female') circFemale++; else circOther++;
    });
    const circTotal=IC_MEMBERS.length;
    set('cmBelowTotal',cmBelow);set('cmMyTotal',cmMy);set('cmAboveTotal',cmAbove);set('cmLevelTotal',cmLevelTotal);
    set('cmBelowCircle',circBelow);set('cmMyCircle',circMy);set('cmAboveCircle',circAbove);set('cmLevelCircle',circTotal);
    set('cmBelowPct',pct(circBelow,cmBelow));set('cmMyPct',pct(circMy,cmMy));set('cmAbovePct',pct(circAbove,cmAbove));set('cmLevelPct',pct(circTotal,cmLevelTotal));
    set('cmMaleTotal',cmMale);set('cmFemaleTotal',cmFemale);set('cmOtherTotal',cmOther);set('cmGenderTotal',nearby.length);
    set('cmMaleCircle',circMale);set('cmFemaleCircle',circFemale);set('cmOtherCircle',circOther);set('cmGenderCircle',circTotal);
    set('cmMalePct',pct(circMale,cmMale));set('cmFemalePct',pct(circFemale,cmFemale));set('cmOtherPct',pct(circOther,cmOther));set('cmGenderPct',pct(circTotal,nearby.length));
  }catch(e){console.warn('Community snapshot error:',e);}
  finally{if(loading)loading.style.display='none';}
}

// updateColStickyTop — stats dashboard removed from new IC design. No-op stub kept.
function updateColStickyTop(){ /* no-op */ }

// ── IC invite system ───────────────────────────────────
function toggleInviteForm(){
  const form=document.getElementById('inviteForm');
  const btn=document.getElementById('inviteToggleBtn');
  const open=form.style.display==='none';
  form.style.display=open?'block':'none';
  btn.textContent=open?'✕ Close':'+ Send an Invite';
  if(open) loadSentInvites();
}

function validateInviteForm(){
  const email=document.getElementById('inviteEmail')?.value?.trim();
  const phone=document.getElementById('invitePhone')?.value?.trim();
  const emailBtn=document.getElementById('inviteSendEmailBtn');
  const smsBtn=document.getElementById('inviteSendSmsBtn');
  const validEmail=email&&email.includes('@')&&email.includes('.');
  const validPhone=phone&&phone.replace(/\D/g,'').length===10;
  if(emailBtn){emailBtn.style.opacity=validEmail?'1':'0.4';emailBtn.style.pointerEvents=validEmail?'auto':'none';}
  if(smsBtn){smsBtn.style.opacity=validPhone?'1':'0.4';smsBtn.style.pointerEvents=validPhone?'auto':'none';}
}


// ── IC Invite: generate token + 3 action functions ────────────────────
async function icGenerateInviteToken(){
  const myEmail = getMyEmail();
  const myName  = SESSION_PLAYER?.first_name
                  ? (SESSION_PLAYER.first_name+' '+(SESSION_PLAYER.last_name||'')).trim()
                  : (myEmail||'A fellow player');
  // Generate token client-side (same pattern as sendInvite)
  let token;
  try{
    const _c = window.crypto || window.msCrypto;
    const _a = new Uint8Array(12);
    _c.getRandomValues(_a);
    token = Array.from(_a).map(b=>b.toString(36)).join('').substring(0,16);
  }catch(_e){ token = Math.random().toString(36).slice(2); }

  const res = await fetch(SUPABASE_URL+'/rest/v1/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer '+SUPABASE_ACCESS_TOKEN,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      inviter_email: myEmail,
      inviter_name:  myName,
      invitee_email: null,
      invite_method: 'ic',
      invite_token:  token,
      invite_type:   'single',
      is_used:       false
    })
  });
  if(!res.ok) throw new Error('Could not generate invite link');
  const rows = await res.json();
  const savedToken = rows[0]?.invite_token || token;
  return {
    token: savedToken,
    url:   'https://pballconnect.com/invite.html?token='+savedToken,
    name:  myName
  };
}
window.icGenerateInviteToken = icGenerateInviteToken;

// ── Recipient validation helper ───────────────────────
function icGetRecipient(){
  const name  = document.getElementById('icRecipientName')?.value?.trim();
  const email = document.getElementById('icRecipientEmail')?.value?.trim();
  if(!name){
    const el = document.getElementById('icRecipientName');
    if(el){
      el.style.borderColor = '#dc2626';
      el.focus();
      el.classList.add('ic-shake');
      setTimeout(()=>el.classList.remove('ic-shake'), 600);
    }
    showToast('Please enter their name first','#f59e0b');
    return null;
  }
  return { name, email: email||null };
}
window.icGetRecipient = icGetRecipient;

// ── Single-use invite token creator ──────────────────
async function icCreateSingleUseInvite(recipient, method){
  const myEmail = getMyEmail();
  const myName  = getMyName();

  // Generate token client-side
  let token;
  try{
    const _c = window.crypto || window.msCrypto;
    const _a = new Uint8Array(12);
    _c.getRandomValues(_a);
    token = Array.from(_a).map(b=>b.toString(36)).join('').substring(0,16);
  }catch(_e){ token = Math.random().toString(36).slice(2); }

  const payload = {
    inviter_email: myEmail,
    inviter_name:  myName,
    invitee_name:  recipient.name,
    invitee_email: recipient.email || null,
    invite_method: method,
    invite_type:   'single',
    invite_token:  token,
    is_used:       false
  };

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/invites`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify(payload)
    });
    if(!res.ok){
      const errBody = await res.text().catch(()=>'');
      console.error('Invite INSERT failed:', res.status, errBody);
      throw new Error('Failed to save invite: '+res.status+' '+errBody);
    }
    const url = 'https://pballconnect.com/invite.html?token=' + token;
    return { token, url };
  }catch(e){
    console.error('Invite INSERT failed:', e.message);
    throw e; // stop caller: no email sent, no counter incremented
  }
}

// ── Clipboard helper with fallback ────────────────────
async function icCopyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
  }catch(e){
    const inp = document.createElement('input');
    inp.value = text;
    document.body.appendChild(inp);
    inp.select();
    document.execCommand('copy');
    document.body.removeChild(inp);
  }
}

// ── Clear recipient form after successful invite ──────
function icClearRecipientForm(){
  const nameEl  = document.getElementById('icRecipientName');
  const emailEl = document.getElementById('icRecipientEmail');
  const nudgeEl = document.getElementById('icEmailNudge');
  const textPanel = document.getElementById('icTextDesktopPanel');
  if(nameEl){ nameEl.value=''; nameEl.style.borderColor='#9ca3af'; }
  if(emailEl){ emailEl.value=''; emailEl.style.borderColor='#9ca3af'; }
  if(nudgeEl) nudgeEl.style.display='none';
  if(textPanel) textPanel.style.display='none';
}
window.icClearRecipientForm = icClearRecipientForm;

// ── IC invite channel functions ───────────────────────
async function smIcInviteText(){
  const recipient = icGetRecipient();
  if(!recipient) return;

  const panel = document.getElementById('icTextDesktopPanel');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Toggle panel closed if already open (desktop re-click)
  if(!isMobile && panel && panel.style.display !== 'none'){
    panel.style.display = 'none';
    return;
  }

  try{
    const { url } = await icCreateSingleUseInvite(recipient, 'text');
    if(!url) throw new Error('Invite creation failed');
    const myName = (getMyName()||'Someone').split(' ')[0];
    const message = myName+' invited you to their Inner Circle on PBallConnect! '+
      'Set up your free player profile: '+url+' (takes 2 min) 🎾';
    const encodedMsg = encodeURIComponent(message);

    if(isMobile){
      window.open('sms:?body='+encodedMsg, '_self');
      showToast('💬 Text opened for '+recipient.name,'#60a5fa');
      icClearRecipientForm();
      loadIcInvites();
    } else {
      // Desktop: show inline panel with WhatsApp + Copy options
      window._icPendingTextMsg = message;
      if(panel){
        panel.innerHTML =
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
            '<button onclick="window.open(\'https://wa.me/?text='+encodedMsg+'\',\'_blank\');document.getElementById(\'icTextDesktopPanel\').style.display=\'none\';"'+
              ' style="flex:1;min-width:140px;padding:10px 12px;background:#d9fdd3;border:1px solid #25d366;border-radius:8px;color:#075e54;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">'+
              '💬 Send via WhatsApp'+
            '</button>'+
            '<button onclick="window._icCopyMsgText()"'+
              ' style="flex:1;min-width:140px;padding:10px 12px;background:#f1f5f9;border:1px solid #d1d5db;border-radius:8px;color:#374151;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">'+
              '📋 Copy Message Text'+
            '</button>'+
          '</div>';
        panel.style.display = 'block';
      }
      icClearRecipientForm();
      loadIcInvites();
    }
  }catch(e){ showToast('Could not create invite','#f87171'); }
}

// Helper exposed for copy button in the text desktop panel
window._icCopyMsgText = async function(){
  await icCopyToClipboard(window._icPendingTextMsg || '');
  showToast('📋 Full message copied — paste into any chat app!','#60a5fa');
  const panel = document.getElementById('icTextDesktopPanel');
  if(panel) panel.style.display = 'none';
};
window.smIcInviteText = smIcInviteText;

async function smIcInviteEmail(){
  const recipient = icGetRecipient();
  if(!recipient) return;

  // Email is required for this channel
  if(!recipient.email){
    const emailEl = document.getElementById('icRecipientEmail');
    const nudgeEl = document.getElementById('icEmailNudge');
    if(emailEl){ emailEl.style.borderColor='#d97706'; emailEl.focus(); }
    if(nudgeEl) nudgeEl.style.display='block';
    showToast('Please enter their email address to send directly','#f59e0b');
    return;
  }

  try{
    const { url } = await icCreateSingleUseInvite(recipient, 'email');
    if(!url) throw new Error('Invite creation failed');
    await sendEmail({
      to_email:     recipient.email,
      type:         'ic_invite',
      inviter_name: getMyName(),
      invitee_name: recipient.name,
      personal_note: null,
      invite_url:   url
    });
    showToast('✅ Invite sent to '+recipient.name+'!','#4CAF7D');
    icClearRecipientForm();
    loadIcInvites();
  }catch(e){ showToast('Could not send invite','#f87171'); }
}
window.smIcInviteEmail = smIcInviteEmail;

async function smIcInviteLink(){
  const recipient = icGetRecipient();
  if(!recipient) return;
  try{
    const { url } = await icCreateSingleUseInvite(recipient, 'link');
    if(!url) throw new Error('Invite creation failed');
    await icCopyToClipboard(url);
    showToast('✅ Link copied for '+recipient.name+' — paste it anywhere!','#4CAF7D');
    icClearRecipientForm();
    loadIcInvites();
  }catch(e){ showToast('Could not create invite','#f87171'); }
}
window.smIcInviteLink = smIcInviteLink;

// ── IC Invite Panel (redesigned flow in icSectionMembers) ────────────────

const _icIsMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function toggleIcInvitePanel(){
  const panel = document.getElementById('icInvitePanel');
  if(!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  // Show text button only on mobile
  const textBtn = document.getElementById('icChannelText');
  if(textBtn) textBtn.style.display = _icIsMobile ? 'flex' : 'none';
  // Reset form state when opening
  if(!isOpen) resetIcChannelForm();
}
window.toggleIcInvitePanel = toggleIcInvitePanel;

function selectIcChannel(channel){
  window._icSelectedChannel = channel;
  // Show form container
  const form = document.getElementById('icChannelForm');
  if(form) form.style.display = 'block';
  // Hide all field groups then show the selected one
  ['icEmailFields','icTextFields','icLinkFields'].forEach(function(id){
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
  const map = { email:'icEmailFields', text:'icTextFields', link:'icLinkFields' };
  const target = document.getElementById(map[channel]);
  if(target) target.style.display = 'block';
  // Focus the first input in the selected group
  const firstInput = target && target.querySelector('input');
  if(firstInput) setTimeout(function(){ firstInput.focus(); }, 50);
  // Any channel selected: hide all channel buttons and QR line for focus
  const emailBtn = document.getElementById('icChannelEmail');
  const textBtn  = document.getElementById('icChannelText');
  const linkBtn  = document.getElementById('icChannelLink');
  const qrLine   = document.getElementById('icQrLine');
  if(emailBtn) emailBtn.style.display = 'none';
  if(textBtn)  textBtn.style.display  = 'none';
  if(linkBtn)  linkBtn.style.display  = 'none';
  if(qrLine)   qrLine.style.display   = 'none';
}
window.selectIcChannel = selectIcChannel;

function resetIcChannelForm(){
  const form = document.getElementById('icChannelForm');
  if(form) form.style.display = 'none';
  ['icFormName','icFormEmail','icFormNameText','icFormNameLink'].forEach(function(id){
    const el = document.getElementById(id);
    if(el){ el.value = ''; el.style.borderColor = '#9ca3af'; }
  });
  const conf1 = document.getElementById('icEmailConfirm');
  const conf2 = document.getElementById('icLinkConfirm');
  if(conf1) conf1.style.display = 'none';
  if(conf2) conf2.style.display = 'none';
  // Restore all channel buttons and QR line to default visibility
  const emailBtn = document.getElementById('icChannelEmail');
  const textBtn  = document.getElementById('icChannelText');
  const linkBtn  = document.getElementById('icChannelLink');
  const qrLine   = document.getElementById('icQrLine');
  if(emailBtn) emailBtn.style.display = 'flex';
  if(textBtn)  textBtn.style.display  = _icIsMobile ? 'flex' : 'none';
  if(linkBtn)  linkBtn.style.display  = 'flex';
  if(qrLine)   qrLine.style.display   = 'block';
}
window.resetIcChannelForm = resetIcChannelForm;

// Create a pending connections row + immediately bump the sent counter.
// For invites where recipient email is unknown, use 'pending_TOKEN' as placeholder.
async function icPostPendingConnection(recipientEmail, recipientName, token){
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/connections`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal,resolution=ignore-duplicates'},
      body:JSON.stringify({
        requester_email: getMyEmail(),
        requester_name:  getMyName(),
        recipient_email: recipientEmail || ('pending_'+token),
        recipient_name:  recipientName,
        status:          'pending'
      })
    });
  }catch(e){
    console.warn('Could not create pending connection row:', e.message);
  }
  // Increment counters immediately — loadIcInvites() will fully sync in background
  const tabSent = document.getElementById('icTabSentCount');
  if(tabSent){ const n=parseInt(tabSent.textContent)||0; tabSent.textContent=n+1; }
  const dashSent = document.getElementById('dashIcSentCount');
  if(dashSent){ const n=parseInt(dashSent.textContent)||0; dashSent.textContent=n+1; }
}

async function sendIcEmailInvite(){
  const nameEl  = document.getElementById('icFormName');
  const emailEl = document.getElementById('icFormEmail');
  const name    = nameEl?.value?.trim();
  const email   = emailEl?.value?.trim();

  if(!name){
    if(nameEl){ nameEl.classList.add('ic-shake'); setTimeout(function(){ nameEl.classList.remove('ic-shake'); }, 600); }
    showToast('Please enter their name','#f59e0b');
    return;
  }
  if(!email){
    if(emailEl){ emailEl.style.borderColor='#dc2626'; emailEl.focus(); }
    showToast('Please enter their email','#f59e0b');
    return;
  }

  const btn = document.querySelector('#icEmailFields button');
  if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }

  try{
    // Check if invitee already has a profile — use ic_invite_existing for members, ic_invite for new users
    let inviteeIsExisting = false;
    try{
      const chkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(email)}&select=email&limit=1`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      if(chkRes.ok){
        const chkRows = await chkRes.json();
        inviteeIsExisting = chkRows.length > 0;
      }
    }catch(_){}

    const recipient = { name, email };
    const { token, url } = await icCreateSingleUseInvite(recipient, 'email');
    if(!url) throw new Error('Invite creation failed');
    await icPostPendingConnection(email, name, token);
    const emailPayload = {
      to_email:     email,
      type:         inviteeIsExisting ? 'ic_invite_existing' : 'ic_invite',
      inviter_name: getMyName(),
      invitee_name: name,
      personal_note: null,
      invite_url:   inviteeIsExisting ? null : url
    };
    await sendEmail(emailPayload);
    const conf = document.getElementById('icEmailConfirm');
    if(conf){
      conf.innerHTML = '✅ Invite sent to <strong>'+name+'</strong>!';
      conf.style.cssText = 'display:block;color:#14532d;font-size:13px;font-weight:600;margin-top:10px;padding:10px;background:#d1fae5;border-radius:8px;';
      // After 1200ms append the "Send another?" prompt
      setTimeout(function(){
        if(conf.style.display === 'none') return; // user already dismissed
        conf.innerHTML += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid #d1fae5;">'+
          '<div style="font-size:13px;font-weight:700;color:#14532d;margin-bottom:10px;">Send another invite via PBallConnect?</div>'+
          '<div style="display:flex;gap:8px;">'+
            '<button onclick="icSendAnother()" style="flex:1;padding:10px;border-radius:10px;border:2px solid #16a34a;background:#d1fae5;color:#14532d;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">✅ Yes, send another</button>'+
            '<button onclick="icDoneInviting()" style="flex:1;padding:10px;border-radius:10px;border:2px solid #d1d5db;background:#f9fafb;color:#374151;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">No, I\'m done</button>'+
          '</div>'+
        '</div>';
      }, 1200);
    }
    if(nameEl){ nameEl.value=''; nameEl.style.borderColor='#9ca3af'; }
    if(emailEl){ emailEl.value=''; emailEl.style.borderColor='#9ca3af'; }
    loadIcInvites();
  }catch(e){
    showToast('Could not send — try again','#f87171');
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = 'Send Invite ✉️'; }
  }
}
window.sendIcEmailInvite = sendIcEmailInvite;

function icSendAnother(){
  const conf = document.getElementById('icEmailConfirm');
  if(conf) conf.style.display = 'none';
  const nameEl  = document.getElementById('icFormName');
  const emailEl = document.getElementById('icFormEmail');
  if(nameEl){  nameEl.value='';  nameEl.style.borderColor='#9ca3af'; nameEl.focus(); }
  if(emailEl){ emailEl.value=''; emailEl.style.borderColor='#9ca3af'; }
  const btn = document.querySelector('#icEmailFields button');
  if(btn){ btn.disabled=false; btn.textContent='Send Invite ✉️'; }
}
window.icSendAnother = icSendAnother;

function icDoneInviting(){
  const panel = document.getElementById('icInvitePanel');
  if(panel) panel.style.display = 'none';
  resetIcChannelForm();
  loadIcInvites();
  renderInnerCircleList();
  window.scrollTo(0,0);
  showToast('🎾 Invites sent! Check back to see who joins.','#4CAF7D');
}
window.icDoneInviting = icDoneInviting;

async function sendIcTextInvite(){
  const nameEl = document.getElementById('icFormNameText');
  const name   = nameEl?.value?.trim();
  if(!name){
    if(nameEl){ nameEl.classList.add('ic-shake'); setTimeout(function(){ nameEl.classList.remove('ic-shake'); }, 600); }
    showToast('Please enter their name','#f59e0b');
    return;
  }
  try{
    const { token, url } = await icCreateSingleUseInvite({ name, email:null }, 'sms');
    if(!url) throw new Error('Invite creation failed');
    const smsUrl = url + '&channel=sms';
    await icPostPendingConnection(null, name, token);
    const myFirst = (getMyName()||'Someone').split(' ')[0];
    const msg = encodeURIComponent('Hey '+name+'! '+myFirst+' invited you to play pickleball on PBallConnect 🎾\n\nSet up your free player profile here:\n\n'+smsUrl);
    window.open('sms:?body='+msg, '_self');
    showToast('💬 Messages opened for '+name,'#60a5fa');
    if(nameEl){ nameEl.value=''; nameEl.style.borderColor='#9ca3af'; }
    loadIcInvites();
  }catch(e){ showToast('Could not send invite — please try again','#f87171'); }
}
window.sendIcTextInvite = sendIcTextInvite;

async function sendIcLinkInvite(){
  const nameEl = document.getElementById('icFormNameLink');
  const name   = nameEl?.value?.trim();
  if(!name){
    if(nameEl){ nameEl.classList.add('ic-shake'); setTimeout(function(){ nameEl.classList.remove('ic-shake'); }, 600); }
    showToast('Please enter their name','#f59e0b');
    return;
  }
  try{
    const { token, url } = await icCreateSingleUseInvite({ name, email:null }, 'link');
    if(!url) throw new Error('Invite creation failed');
    await icPostPendingConnection(null, name, token);
    await icCopyToClipboard(url);
    const conf = document.getElementById('icLinkConfirm');
    if(conf){
      conf.innerHTML = '✅ Link copied for <strong>'+name+'</strong> — paste it anywhere!';
      conf.style.cssText = 'display:block;color:#713f12;font-size:13px;font-weight:600;margin-top:10px;padding:10px;background:#fef9c3;border-radius:8px;';
    }
    if(nameEl){ nameEl.value=''; nameEl.style.borderColor='#9ca3af'; }
    loadIcInvites();
    setTimeout(()=>{ icDoneInviting(); }, 3500);
  }catch(e){ showToast('Could not create invite','#f87171'); }
}
window.sendIcLinkInvite = sendIcLinkInvite;

async function sendInvite(method){
  const myEmail = getMyEmail();
  const myName  = getMyName() || 'A fellow pickleball player';
  if(!myEmail){ openLoginModal(); return; }

  const inviteeEmail = (document.getElementById('inviteEmail')?.value||'').trim();
  const inviteePhone = (document.getElementById('invitePhone')?.value||'').replace(/\D/g,'');
  const note         = (document.getElementById('inviteNote')?.value||'').trim();
  const statusEl     = document.getElementById('inviteStatus');
  const inviteUrl    = await getMyInviteUrl();

  if(method==='email'){
    if(!inviteeEmail||!inviteeEmail.includes('@')){ showToast('Please enter a valid email address','#f59e0b'); return; }
    if(statusEl) statusEl.textContent='Sending…';
    try{
      // Always create a fresh invite row for this specific invitee so invitee_email is stored
      // and the token is guaranteed to exist in the DB.
      let newToken;
      try{
        const _c = window.crypto || window.msCrypto;
        const _a = new Uint8Array(12);
        _c.getRandomValues(_a);
        newToken = Array.from(_a).map(b=>b.toString(36)).join('').substring(0,16);
      }catch(_e){ newToken = Math.random().toString(36).slice(2); }
      const freshInvite = await fetch(`${SUPABASE_URL}/rest/v1/invites`, {
        method: 'POST',
        headers: {'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=representation'},
        body: JSON.stringify({
          inviter_email: myEmail,
          inviter_name:  myName,
          invitee_email: inviteeEmail,
          invite_method: 'email',
          invite_token:  newToken,
          invite_type:   'single',
          is_used:       false
        })
      });
      const freshRows = freshInvite.ok ? await freshInvite.json() : [];
      const inviteToken = freshRows[0]?.invite_token || newToken;
      const emailInviteUrl = window.location.origin + window.location.pathname + '?invite=' + inviteToken;
      await sendEmail({
        to_email:     inviteeEmail,
        type:         'app_invite',
        inviter_name: myName,
        personal_note: note || null,
        invite_url:   emailInviteUrl
      });
      showToast('✅ Invite sent to '+inviteeEmail,'#1a7a3a');
      if(statusEl) statusEl.textContent='';
      document.getElementById('inviteEmail').value='';
      document.getElementById('inviteNote').value='';
      // Save as pending connection
      fetch(`${SUPABASE_URL}/rest/v1/connections`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
        body:JSON.stringify({requester_email:myEmail,requester_name:myName,recipient_email:inviteeEmail,recipient_name:inviteeEmail.split('@')[0],status:'pending'})
      }).then(()=>loadIcInvites()).catch(()=>{});
      validateInviteForm();
      loadSentInvites();
    }catch(e){
      if(statusEl) statusEl.textContent='⚠️ Failed to send';
      showToast('Could not send email: '+(e.message||'unknown error'),'#dc2626');
    }
  } else if(method==='sms'){
    if(!inviteePhone||inviteePhone.length<10){ showToast('Please enter a valid phone number','#f59e0b'); return; }
    const smsBody = encodeURIComponent((myName.split(' ')[0])+' invited you to PBallConnect! '+(note?'"'+note+'" ':'')+inviteUrl);
    window.open('sms:'+inviteePhone+'?body='+smsBody);
    showToast('Messages app opened! 💬','#60a5fa');
    loadSentInvites();
  }
}

// ══════════════════════════════════════════════════════
// QR CODE SHARE
// ══════════════════════════════════════════════════════

let _qrInviteUrl = '';

// ── Permanent QR ID — get cached or generate new ─────
async function getOrCreateQrId(){
  if(SESSION_PLAYER?.qr_invite_id) return SESSION_PLAYER.qr_invite_id;
  const myEmail = getMyEmail();
  const myName  = getMyName();
  const arr = new Uint8Array(12);
  window.crypto.getRandomValues(arr);
  const qrId = 'qr_'+Array.from(arr).map(b=>b.toString(36)).join('').substring(0,16);
  await fetch(`${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(myEmail)}`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
    body:JSON.stringify({qr_invite_id:qrId})
  });
  if(SESSION_PLAYER) SESSION_PLAYER.qr_invite_id = qrId;
  // Log QR creation as an invite row (fire-and-forget)
  fetch(`${SUPABASE_URL}/rest/v1/invites`,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
    body:JSON.stringify({
      inviter_email: myEmail,
      inviter_name:  myName,
      invite_method: 'qr',
      invite_type:   'qr'
    })
  }).catch(()=>{});
  return qrId;
}

async function openQrModal(){
  const myEmail = getMyEmail();
  if(!myEmail){ openLoginModal(); return; }

  const qrId = await getOrCreateQrId();
  const inviteUrl = 'https://pballconnect.com/invite.html?qr=' + encodeURIComponent(qrId);
  _qrInviteUrl = inviteUrl;

  // Fill player info
  const emoji = SESSION_PLAYER?.avatar_emoji || '🎾';
  const name  = ((SESSION_PLAYER?.first_name||'')+(SESSION_PLAYER?.nickname?' "'+SESSION_PLAYER.nickname+'"':'')).trim() || myEmail;
  const skill = SESSION_PLAYER?.skill_level ? 'Skill ' + SESSION_PLAYER.skill_level : '';
  document.getElementById('qrEmoji').textContent = emoji;
  document.getElementById('qrName').textContent  = name;
  document.getElementById('qrSkill').textContent = skill;
  document.getElementById('qrInviteUrl').textContent = inviteUrl;

  // Generate QR code
  const canvas = document.getElementById('qrCanvas');
  try{
    await QRCode.toCanvas(canvas, inviteUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  }catch(e){ canvas.parentElement.innerHTML = '<div style="color:#f87171;font-size:13px;">QR generation failed</div>'; }

  document.getElementById('qrModal').style.display = 'flex';
}

function closeQrModal(){
  document.getElementById('qrModal').style.display = 'none';
}

async function resetQrCode(){
  if(!confirm(
    'This will invalidate your current QR code.\n'+
    'Anyone with the old link will not be able to use it.\n\nContinue?'
  )) return;

  // Clear cached value to force regeneration
  if(SESSION_PLAYER) SESSION_PLAYER.qr_invite_id = null;

  try{
    const newId  = await getOrCreateQrId();
    const newUrl = 'https://pballconnect.com/invite.html?qr=' + encodeURIComponent(newId);
    _qrInviteUrl = newUrl;
    document.getElementById('qrInviteUrl').textContent = newUrl;

    const canvas = document.getElementById('qrCanvas');
    await QRCode.toCanvas(canvas, newUrl, {width:240,margin:1,color:{dark:'#000000',light:'#ffffff'}});

    showToast('✅ QR code reset — old links are now invalid','#4CAF7D');
  }catch(e){
    showToast('Could not reset QR code','#f87171');
  }
}
window.resetQrCode = resetQrCode;

async function shareInviteLink(){
  if(!_qrInviteUrl) return;
  const myName = ((SESSION_PLAYER?.first_name||'')).trim() || 'Someone';
  const shareData = {
    title: 'Join me on PBallConnect!',
    text: myName + ' invited you to join PBallConnect — the best way to find pickleball players near you. 🎾',
    url: _qrInviteUrl
  };
  try{
    if(navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(_qrInviteUrl); showToast('📋 Link copied!','#4CAF7D'); }
  }catch(e){
    await navigator.clipboard.writeText(_qrInviteUrl).catch(()=>{});
    showToast('📋 Link copied!','#4CAF7D');
  }
}

async function getMyInviteUrl(){
  // Generate a personal invite token/URL
  const myEmail = getMyEmail();
  const myName = getMyName();
  if(!myEmail) return window.location.origin+window.location.pathname;
  // Create an invite token
  let token;
  try{
    const crypto = window.crypto || window.msCrypto;
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    token = Array.from(arr).map(b=>b.toString(36)).join('').substring(0,16);
  }catch(e){ token=Math.random().toString(36).slice(2); }
  // Save invite to DB
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/invites`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({inviter_email:myEmail,inviter_name:myName,invite_token:token,invite_method:'link',invite_type:'single',is_used:false})
    });
  }catch(e){}
  return 'https://pballconnect.com/invite.html?token='+token;
}

async function openQuickInvite(method){
  const myName = getMyName()||'A fellow pickleball player';
  const firstName = myName.split(' ')[0];
  const url = await getMyInviteUrl();

  if(method==='sms'){
    const body = encodeURIComponent(
      firstName+' wants you in their Inner Circle on PBallConnect! '+
      'Set up your player profile and connect: '+url+
      ' (takes 2 min)'
    );
    window.open('sms:?body='+body);
    showToast('Messages app opened! 💬','#60a5fa');
  } else if(method==='email'){
    if(statusEl) statusEl.textContent='Sending email…';
    try{
      await sendEmail({ to_email:inviteeEmail, type:'app_invite', inviter_name:myName, personal_note:note||null, invite_url:inviteUrl });
      if(statusEl) statusEl.textContent='';
      showToast('✅ Email invite sent to '+inviteeEmail,'#4CAF7D');
      const emailEl=document.getElementById('inviteEmail');if(emailEl)emailEl.value='';
      const noteEl=document.getElementById('inviteNote');if(noteEl)noteEl.value='';
      // Also create a pending IC connection so it appears in yellow badge + invites section
      if(inviteeEmail){
        const inviteeName = inviteeEmail.split('@')[0]; // best guess at name until they register
        fetch(`${SUPABASE_URL}/rest/v1/connections`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body:JSON.stringify({requester_email:myEmail,requester_name:myName,recipient_email:inviteeEmail,recipient_name:inviteeName,status:'pending'})
        }).then(()=>{ loadIcInvites(); }).catch(()=>{});
      }
      validateInviteForm(); loadSentInvites();
    }catch(e){if(statusEl) statusEl.textContent='⚠️ Email error: '+(e.text||e.message||'Unknown error');}
  }
  if(method==='sms'){
    const smsBody=encodeURIComponent(myName+' invited you to join PBallConnect! 🎾 '+(note?'"'+note+'" ':'')+inviteUrl);
    window.open('sms:'+(inviteePhone?'+1'+inviteePhone:'')+'?body='+smsBody);
    if(statusEl) statusEl.textContent='';
    showToast('✅ SMS app opened!','#4CAF7D');
    loadSentInvites();
  }
}

async function loadSentInvites(){
  const myEmail=getMyEmail();
  const listEl=document.getElementById('inviteSentList');
  if(!listEl||!myEmail) return;
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/invites?inviter_email=eq.${encodeURIComponent(myEmail)}&order=created_at.desc&limit=10`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    if(!res.ok) return;
    const invites=await res.json();
    if(!invites.length){listEl.innerHTML='';return;}
    listEl.innerHTML='<div style="font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Recent Invites Sent</div>';
    invites.forEach(inv=>{
      const sentAt=new Date(inv.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      const statusColor=inv.status==='registered'?'var(--green)':inv.status==='opened'?'#f59e0b':'var(--dim)';
      const statusIcon=inv.status==='registered'?'✅':inv.status==='opened'?'👀':'📨';
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);';
      row.innerHTML='<span style="font-size:16px;">'+(inv.invite_method==='sms'?'💬':'✉️')+'</span><div style="flex:1;min-width:0;"><div style="font-size:13px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(inv.invitee_email||inv.invitee_phone||'Unknown')+'</div><div style="font-size:10px;color:var(--dim);">Sent '+sentAt+'</div></div><span style="font-size:11px;font-weight:700;color:'+statusColor+';white-space:nowrap;">'+statusIcon+' '+inv.status+'</span>';
      listEl.appendChild(row);
    });
  }catch(e){}
}

let PENDING_INVITE = null;

function checkInviteToken(){
  const params=new URLSearchParams(window.location.search);

  // Handle QR invite param (?qr=QR_ID) — fetch owner and set PENDING_INVITE
  const qrId = params.get('qr');
  if(qrId){
    const isNewUserReturn = params.get('newuser') === '1';
    fetch(`${SUPABASE_URL}/rest/v1/public_profiles?qr_invite_id=eq.${encodeURIComponent(qrId)}&select=email,first_name,last_name,avatar_emoji`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    .then(r=>r.json()).then(rows=>{
      if(!rows.length) return;
      const owner=rows[0];
      const ownerName=((owner.first_name||'')+(owner.last_name?' '+owner.last_name:'')).trim()||'A fellow player';
      const inv={invite_type:'qr',qr_id:qrId,inviter_email:owner.email,inviter_name:ownerName,avatar_emoji:owner.avatar_emoji||'🎾'};
      PENDING_INVITE=inv;
      window._pendingInviteRef=inv;
      if(!isNewUserReturn){
        setTimeout(()=>{ if(!SESSION_PLAYER?.id) showInviteBanner(inv); }, 300);
        setTimeout(()=>{ if(!SESSION_PLAYER?.id && !document.getElementById('inviteBanner')) showInviteBanner(inv); }, 800);
      }
    }).catch(()=>{});
    return;
  }

  const token=params.get('invite');
  if(!token) return;
  // newuser=1 means the user just returned from the invite.html magic link.
  // Skip the banner — startNewRegistration() will see PENDING_INVITE and show the landing choice.
  const isNewUserReturn = params.get('newuser') === '1';
  // Read via invite_tokens view (anon-safe: exposes only invite_token, inviter_name, invitee_email, status).
  // The status:'opened' PATCH stays on the full invites table and fires after auth.
  fetch(`${SUPABASE_URL}/rest/v1/invite_tokens?invite_token=eq.${token}`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
  .then(r=>r.json()).then(rows=>{
    if(rows.length){
      const inv=rows[0];
      PENDING_INVITE=inv;
      window._pendingInviteRef=inv;
      if(!isNewUserReturn){
        setTimeout(()=>{ if(!SESSION_PLAYER?.id) showInviteBanner(inv); }, 300);
        setTimeout(()=>{ if(!SESSION_PLAYER?.id && !document.getElementById('inviteBanner')) showInviteBanner(inv); }, 800);
        setTimeout(()=>{ if(!SESSION_PLAYER?.id && !document.getElementById('inviteBanner')) showInviteBanner(inv); }, 1500);
      }
      // Mark opened — fires after auth; fire-and-forget
      fetch(`${SUPABASE_URL}/rest/v1/invites?invite_token=eq.${token}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},body:JSON.stringify({status:'opened',opened_at:new Date().toISOString()})}).catch(()=>{});
    }
  }).catch(()=>{});
}

function showInviteBanner(invite){
  if(SESSION_PLAYER?.id) return;            // fully registered user — skip banner
  if(document.getElementById('inviteBanner')) return; // already showing
  const banner=document.createElement('div');
  banner.id='inviteBanner';
  banner.style.cssText='position:fixed;inset:0;z-index:800;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;-webkit-overflow-scrolling:touch;';
  const inviterName=invite.inviter_name||'A fellow player';
  const noteHtml=invite.personal_note
    ? '<div style="margin-bottom:16px;padding:10px 14px;background:#f0fdf4;border:1px solid #d1fae5;border-radius:10px;font-size:13px;color:#1a5c32;font-style:italic;">"'+invite.personal_note+'"</div>'
    : '';
  banner.innerHTML=
    '<div id="inviteBannerCard" style="background:#ffffff;border-radius:20px;padding:28px 24px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="text-align:center;margin-bottom:16px;">'+
        '<div style="font-size:48px;margin-bottom:10px;">🎾</div>'+
        '<h2 style="font-family:\'Playfair Display\',serif;font-size:19px;font-weight:800;color:#111;margin-bottom:0;line-height:1.3;">'+inviterName+' has invited you to join PBallConnect!</h2>'+
      '</div>'+
      noteHtml+
      '<div style="font-size:12px;color:#9ca3af;text-align:center;margin-bottom:18px;font-style:italic;">"If you want to play ball, click a link."</div>'+
      '<button onclick="document.getElementById(\'inviteBanner\').remove();showInviteEmailStep(window._pendingInviteRef);" style="width:100%;padding:14px;border-radius:12px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:12px;font-family:\'DM Sans\',sans-serif;">'+
        'Yes, I want to join! 🏓'+
      '</button>'+
      '<div style="text-align:center;">'+
        '<span onclick="document.getElementById(\'inviteBanner\').remove()" style="font-size:12px;color:#9ca3af;cursor:pointer;text-decoration:underline;">Maybe Later</span>'+
      '</div>'+
    '</div>';
  window._pendingInviteRef = invite;
  document.body.appendChild(banner);
}

function showInviteEmailStep(inv){
  const existing = document.getElementById('inviteEmailStep');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'inviteEmailStep';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  const inviterName = inv?.inviter_name || 'A fellow player';
  const prefillEmail = inv?.invitee_email || '';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:28px 24px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="text-align:center;margin-bottom:20px;">'+
        '<div style="font-size:40px;margin-bottom:8px;">🔐</div>'+
        '<div style="font-size:17px;font-weight:800;color:#111;margin-bottom:6px;">One quick step</div>'+
        '<div style="font-size:13px;color:#555;line-height:1.5;">To protect your data, enter your email and we\'ll send you a secure magic link — no password ever needed.</div>'+
      '</div>'+
      '<input id="inviteEmailInput" type="email" value="'+prefillEmail+'" placeholder="your@email.com" '+
        'style="width:100%;padding:12px 14px;border:2px solid #d1d5db;border-radius:10px;font-size:14px;color:#111;margin-bottom:12px;box-sizing:border-box;outline:none;" />'+
      '<button id="inviteEmailSendBtn" onclick="window._sendInviteMagicLink()" '+
        'style="width:100%;padding:14px;border-radius:12px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:8px;">'+
        'Send My Magic Link →</button>'+
      '<div id="inviteEmailMsg" style="text-align:center;font-size:12px;color:#6b7280;display:none;padding:10px;"></div>'+
      '<div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:6px;">🔒 Secure magic link · No password needed</div>'+
    '</div>';
  document.body.appendChild(overlay);
  // Store invite token for after magic link redirect
  if(inv?.invite_token) localStorage.setItem('pb_pending_invite_token', inv.invite_token);
  if(prefillEmail) localStorage.setItem('pb_pending_email', prefillEmail);
  setTimeout(()=>{ const el=document.getElementById('inviteEmailInput'); if(el&&!prefillEmail) el.focus(); }, 200);
  window._sendInviteMagicLink = async function(){
    const emailVal = (document.getElementById('inviteEmailInput')?.value||'').trim().toLowerCase();
    if(!emailVal||!emailVal.includes('@')){ showToast('⚠️ Please enter a valid email','#f59e0b'); return; }
    const btn = document.getElementById('inviteEmailSendBtn');
    const msg = document.getElementById('inviteEmailMsg');
    if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
    localStorage.setItem('pb_pending_email', emailVal);
    const token = inv?.invite_token || localStorage.getItem('pb_pending_invite_token') || '';
    const redirectTo = window.location.origin + window.location.pathname + (token ? '?invite='+token : '');
    try{
      const { error } = await _supabase.auth.signInWithOtp({ email: emailVal, options:{ emailRedirectTo: redirectTo } });
      if(error) throw error;
      if(btn){ btn.style.display='none'; }
      if(msg){ msg.style.display='block'; msg.style.color='#1a7a3a'; msg.style.fontWeight='700'; msg.style.fontSize='14px';
        msg.innerHTML='✅ Check your inbox!<br><span style="font-weight:400;color:#555;">Click the magic link in your email to continue.</span>'; }
    }catch(e){
      if(btn){ btn.disabled=false; btn.textContent='Send My Magic Link →'; }
      showToast('⚠️ Could not send link: '+e.message,'#f59e0b');
    }
  };
}

function showInviteLandingChoice(email, inv){
  document.getElementById('inviteEmailStep')?.remove();
  const inviterName = inv?.inviter_name || 'A fellow player';
  const overlay = document.createElement('div');
  overlay.id = 'inviteLandingChoice';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:28px 24px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="text-align:center;margin-bottom:20px;">'+
        '<div style="font-size:40px;margin-bottom:8px;">🎾</div>'+
        '<div style="font-size:18px;font-weight:800;color:#111;margin-bottom:4px;">Welcome to PBallConnect!</div>'+
        '<div style="font-size:13px;color:#1a7a3a;font-weight:600;margin-bottom:4px;">'+inviterName+' invited you to join.</div>'+
        '<div style="font-size:12px;color:#6b7280;">How would you like to get started?</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">'+
        '<div onclick="window._inviteChoiceFull()" style="cursor:pointer;border:2px solid #1a7a3a;border-radius:14px;padding:16px 12px;text-align:center;">'+
          '<div style="font-size:22px;margin-bottom:6px;">📋</div>'+
          '<div style="font-size:13px;font-weight:800;color:#1a7a3a;margin-bottom:4px;">Full Profile</div>'+
          '<div style="font-size:11px;color:#555;line-height:1.4;">All features · Your complete pickleball identity</div>'+
        '</div>'+
        '<div onclick="window._inviteChoiceQuick()" style="cursor:pointer;border:2px solid #d1d5db;border-radius:14px;padding:16px 12px;text-align:center;">'+
          '<div style="font-size:22px;margin-bottom:6px;">⚡</div>'+
          '<div style="font-size:13px;font-weight:800;color:#374151;margin-bottom:4px;">Quick Connect</div>'+
          '<div style="font-size:11px;color:#555;line-height:1.4;">On the court fast · Just the basics</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  window._inviteChoiceFull = function(){
    overlay.remove();
    const emailEl = document.getElementById('email'); if(emailEl) emailEl.value = email;
    // _newUserRegistrationStarted must remain true through showPage() so the auth gate
    // allows playerProfile without a SESSION_PLAYER. Clear it immediately after.
    showPage('playerProfile');
    _newUserRegistrationStarted = false;
    unlockProfileForm(); goTo(1);
    S._tosConsent=false; S._privacyConsent=false; S._riskConsent=false;
    document.getElementById('checkBoxTos')?.classList.remove('on');
    document.getElementById('checkBoxRisk')?.classList.remove('on');
    const sb=document.getElementById('btnSubmit'); if(sb) sb.disabled=true;
    document.getElementById('lessonSection') && (document.getElementById('lessonSection').style.display='none');
    showToast('🎾 Great! Let\'s build your full profile — it\'s quick and fun!','#4CAF7D');
    setTimeout(()=>{ const fn=document.getElementById('firstName'); if(fn) fn.focus(); chk1(); }, 350);
  };
  window._inviteChoiceQuick = function(){
    overlay.remove();
    _newUserRegistrationStarted = false;
    showQuickConnectForm(email, inv);
  };
}

function _doStartFullProfile(email, toastMsg){
  showPage('playerProfile');
  unlockProfileForm();
  goTo(1);
  setTimeout(()=>{
    window.scrollTo({top:0, behavior:'smooth'});
    showToast(toastMsg || '👋 Welcome! Fill out your profile below.', '#4CAF7D');
    chk1();
    const fn = document.getElementById('firstName');
    if(fn){ fn.focus(); fn.scrollIntoView({behavior:'smooth', block:'center'}); }
  }, 400);
}

function showQuickConnectForm(email, inv){
  S.gender = '';
  const inviterName = (inv || PENDING_INVITE)?.inviter_name || 'Your friend';

  const overlay = document.createElement('div');
  overlay.id = 'quickConnectOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:#fff;overflow-y:auto;-webkit-overflow-scrolling:touch;';

  let yearOpts = '<option value="">Select year</option>';
  for(let y=2026;y>=1985;y--) yearOpts += '<option>'+y+'</option>';

  const ageRanges = [
    ['','Select Age Range…'],['Under 18','Under 18'],['18-25','18–25'],
    ['26-30','26–30'],['31-35','31–35'],['36-40','36–40'],['41-45','41–45'],
    ['46-50','46–50'],['51-55','51–55'],['56-60','56–60'],['61-65','61–65'],
    ['66-70','66–70'],['71-75','71–75'],['76-80','76–80'],['81+','81+']
  ];
  const ageOpts = ageRanges.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');

  const inp = 'width:100%;padding:11px 14px;border-radius:10px;border:2px solid #d1d5db;font-size:14px;font-family:\'DM Sans\',sans-serif;box-sizing:border-box;outline:none;';
  const lbl = 'display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#374151;margin-bottom:6px;';

  overlay.innerHTML =
    '<div style="max-width:440px;margin:0 auto;padding:28px 20px 60px;">'+
      '<div style="text-align:center;margin-bottom:24px;">'+
        '<div style="font-size:36px;margin-bottom:8px;">⚡</div>'+
        '<div style="font-size:20px;font-weight:800;color:#111;margin-bottom:4px;">Quick Connect</div>'+
        '<div style="font-size:13px;color:#6b7280;">You can complete your full profile anytime.</div>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">Email <span style="color:#9ca3af;font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;">— your login</span></label>'+
        '<input type="email" value="'+email+'" readonly style="'+inp+'background:#f3f4f6;color:#6b7280;cursor:default;"/>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">First Name <span style="color:#dc2626;">*</span></label>'+
        '<input id="qcFirstName" type="text" placeholder="Your first name" autocomplete="given-name" style="'+inp+'" oninput="window._qcUpdateBtn()"/>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">Phone Number <span style="color:#9ca3af;font-weight:400;text-transform:none;letter-spacing:0;font-size:10px;">— optional</span></label>'+
        '<input id="qcPhone" type="tel" placeholder="(555) 555-5555" maxlength="14" style="'+inp+'" oninput="formatPhone(this);window._qcOnPhoneChange()"/>'+
        '<div id="qcSmsOptInRow" style="display:none;margin-top:12px;">'+
          '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:14px;font-weight:400;text-transform:none;letter-spacing:0;">'+
            '<input type="checkbox" id="qcSmsOptIn" onchange="window._qcOnSmsChange()" style="width:20px;height:20px;flex-shrink:0;margin-top:2px;accent-color:#1a7a3a;cursor:pointer;"/>'+
            '<span id="qcSmsOptInLabel" style="font-weight:400;color:#374151;line-height:1.5;">I agree to receive match invites, reminders, and updates from PBallConnect by text message. Message frequency varies. Message &amp; data rates may apply. Reply STOP to unsubscribe or HELP for help.</span>'+
          '</label>'+
          '<div style="font-size:13px;color:#9ca3af;margin-top:6px;margin-left:30px;line-height:1.5;">By checking this box you provide express written consent for PBallConnect to send automated text messages to the number provided. Consent is not a condition of registration or use of the service.</div>'+
        '</div>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">Zip Code <span style="color:#dc2626;">*</span></label>'+
        '<input id="qcZip" type="tel" placeholder="e.g. 03842" maxlength="5" style="'+inp+'" oninput="window._qcUpdateBtn()"/>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">Personal Skill Rating <span style="color:#dc2626;">*</span></label>'+
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'+
          '<input id="qcSkillSlider" type="range" min="0" max="21" value="8" style="flex:1;" oninput="document.getElementById(\'qcSkillVal\').textContent=DUPR_VALS[+this.value]||\'4.0\';window._qcUpdateBtn()"/>'+
          '<span id="qcSkillVal" style="font-weight:800;color:#1a7a3a;min-width:40px;text-align:right;">4.0</span>'+
        '</div>'+
        '<div style="font-size:10px;color:#9ca3af;text-align:center;">2.0 (beginner) → 7.0+ (pro)</div>'+
        '<div style="text-align:center;margin-top:4px;"><a href="#" onclick="showSkillGuide();return false;" style="font-size:0.85rem;color:#16a34a;text-decoration:underline;">❓ What\'s my level?</a></div>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">Age Range</label>'+
        '<select id="qcAge" style="'+inp+'background:#fff;">'+ageOpts+'</select>'+
      '</div>'+
      '<div style="margin-bottom:16px;">'+
        '<label style="'+lbl+'">Gender <span style="color:#dc2626;">*</span></label>'+
        '<div id="qcGenderChips" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;">'+
          '<button type="button" class="chip" onclick="selChip(\'qcGenderChips\',this,\'gender\');window._qcUpdateBtn()">Man</button>'+
          '<button type="button" class="chip" onclick="selChip(\'qcGenderChips\',this,\'gender\');window._qcUpdateBtn()">Woman</button>'+
          '<button type="button" class="chip" onclick="selChip(\'qcGenderChips\',this,\'gender\');window._qcUpdateBtn()">Prefer not to say</button>'+
        '</div>'+
      '</div>'+
      '<div style="margin-bottom:20px;">'+
        '<label style="'+lbl+'">Playing Since</label>'+
        '<select id="qcSince" style="'+inp+'background:#fff;">'+yearOpts+'</select>'+
      '</div>'+
      '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">'+
        '<div style="font-size:12px;font-weight:700;color:#111;margin-bottom:10px;">Agreement & Waiver</div>'+
        '<div onclick="window._qcToggle(\'qcPrivacy\')" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:10px;">'+
          '<div id="qcPrivacy" style="width:20px;height:20px;flex-shrink:0;border-radius:5px;border:2px solid #d1d5db;background:#fff;display:flex;align-items:center;justify-content:center;margin-top:1px;"></div>'+
          '<span style="font-size:12px;color:#374151;line-height:1.5;">I agree to the <a href="privacy.html" target="_blank" onclick="event.stopPropagation()" style="color:#2d6a4f;">Privacy Policy</a> and <a href="terms.html" target="_blank" onclick="event.stopPropagation()" style="color:#2d6a4f;">Terms of Service</a></span>'+
        '</div>'+
        '<div onclick="window._qcToggle(\'qcRisk\')" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">'+
          '<div id="qcRisk" style="width:20px;height:20px;flex-shrink:0;border-radius:5px;border:2px solid #d1d5db;background:#fff;display:flex;align-items:center;justify-content:center;margin-top:1px;"></div>'+
          '<span style="font-size:12px;color:#374151;line-height:1.5;">I understand pickleball carries physical risk and participate voluntarily</span>'+
        '</div>'+
      '</div>'+
      '<div id="qcError" style="display:none;margin-bottom:12px;padding:10px 14px;background:#fef2f2;border-radius:8px;font-size:12px;color:#dc2626;"></div>'+
      '<button id="qcSaveBtn" onclick="window._qcSave()" disabled '+
        'style="width:100%;padding:15px;border-radius:12px;border:none;background:#9ca3af;color:#fff;font-weight:800;font-size:15px;cursor:not-allowed;font-family:\'DM Sans\',sans-serif;margin-bottom:14px;transition:background .2s;">'+
        'Save & Join PBallConnect 🏓'+
      '</button>'+
      '<div style="text-align:center;">'+
        '<span onclick="window._qcSwitchFull()" style="font-size:12px;color:#9ca3af;cursor:pointer;text-decoration:underline;">Switch to Full Profile</span>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);

  let _qcPrivacyOn = false, _qcRiskOn = false;

  window._qcUpdateBtn = function(){
    const fn  = document.getElementById('qcFirstName')?.value?.trim() || '';
    const ph  = (document.getElementById('qcPhone')?.value||'').replace(/\D/g,'');
    const zip = (document.getElementById('qcZip')?.value||'').replace(/\D/g,'');
    const ok  = fn.length > 0 && zip.length === 5 && S.gender !== '' && _qcPrivacyOn && _qcRiskOn;
    const btn = document.getElementById('qcSaveBtn');
    if(btn){
      btn.disabled    = !ok;
      btn.style.background  = ok ? '#1a7a3a' : '#9ca3af';
      btn.style.cursor      = ok ? 'pointer'  : 'not-allowed';
    }
  };

  window._qcToggle = function(id){
    const box = document.getElementById(id);
    if(!box) return;
    if(id==='qcPrivacy') _qcPrivacyOn = !_qcPrivacyOn;
    else                  _qcRiskOn   = !_qcRiskOn;
    const on = id==='qcPrivacy' ? _qcPrivacyOn : _qcRiskOn;
    box.style.background  = on ? '#1a7a3a' : '#fff';
    box.style.borderColor = on ? '#1a7a3a' : '#d1d5db';
    box.innerHTML = on ? '<span style="color:#fff;font-size:12px;font-weight:800;">✓</span>' : '';
    window._qcUpdateBtn();
  };

  window._qcOnPhoneChange = function(){
    const ph=(document.getElementById('qcPhone')?.value||'').replace(/\D/g,'');
    const smsRow=document.getElementById('qcSmsOptInRow');
    const smsCb=document.getElementById('qcSmsOptIn');
    if(smsRow) smsRow.style.display=ph.length===10?'block':'none';
    if(ph.length!==10&&smsCb){smsCb.checked=false;window._qcOnSmsChange();}
    window._qcUpdateBtn();
  };

  window._qcOnSmsChange = function(){
    const cb=document.getElementById('qcSmsOptIn');
    const lbl=document.getElementById('qcSmsOptInLabel');
    if(!lbl) return;
    if(cb&&cb.checked){lbl.style.fontWeight='700';lbl.style.color='#1a7a3a';}
    else{lbl.style.fontWeight='400';lbl.style.color='#374151';}
  };

  window._qcSave = async function(){
    const fn    = document.getElementById('qcFirstName')?.value?.trim() || '';
    const ph    = (document.getElementById('qcPhone')?.value||'').replace(/\D/g,'');
    const skill = DUPR_VALS[+(document.getElementById('qcSkillSlider')?.value||8)] || '4.0';
    const age   = document.getElementById('qcAge')?.value   || null;
    const since = document.getElementById('qcSince')?.value || null;
    const errEl = document.getElementById('qcError');
    const btn   = document.getElementById('qcSaveBtn');

    if(errEl) errEl.style.display='none';
    if(btn){ btn.disabled=true; btn.textContent='Saving…'; btn.style.background='#9ca3af'; btn.style.cursor='not-allowed'; }

    const zip = document.getElementById('qcZip')?.value?.trim() || null;
    try{
      const _qcSmsOptIn = ph.length === 10 && !!(document.getElementById('qcSmsOptIn')?.checked);
      await saveRegistration({
        email:             email.toLowerCase(),
        first_name:        fn,
        phone:             ph || null,
        zip_code:          zip,
        skill_level:       skill,
        age_range:               age   || null,
        playing_since:     since || null,
        waiver_agreed:     true,
        match_gender_pref: 'Both',
        play_format:       'Both',
        gender:            S.gender || null,
        sms_opt_in:        _qcSmsOptIn,
        sms_opt_in_at:     _qcSmsOptIn ? new Date().toISOString() : undefined,
      });
      try {
        await sendEmail({
          to_email: 'david@pballconnect.com',
          type:     'admin_registration_alert',
          subject:  `🎾 New PBallConnect Registration — ${fn}`,
          personal_note: `Name: ${fn}<br>Email: ${email}<br>Path: Quick Connect Registration<br>Skill Level: ${skill}<br>Zip: ${zip||'—'}<br>Gender: ${S.gender||'—'}<br>SMS Opt-In: ${_qcSmsOptIn ? 'Yes' : 'No'}<br>Registered At: ${new Date().toISOString()}`,
        });
      } catch (e) {
        console.warn('Admin alert failed:', e);
      }
      // TCPA consent log
      if (_qcSmsOptIn === true) {
        try {
          await fetch('/api/log-sms-consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              player_email: email.toLowerCase(),
              event: 'opt_in',
              method: 'quick_connect'
            })
          });
        } catch (e) {
          console.warn('Consent log failed (_qcSave):', e);
        }
      }
      const _hadPendingInvite = !!PENDING_INVITE;
      document.getElementById('navLoginBtn')?.style.removeProperty('display');
      _newUserRegistrationStarted = false;
      document.getElementById('quickConnectOverlay')?.remove();
      await restoreSession(email.toLowerCase());
      await handlePostRegistrationInvite(email.toLowerCase(), fn);
      SESSION_PLAYER = SESSION_PLAYER || { email: email.toLowerCase(), first_name: fn };
      updateOrganizerNav();
      updateNavForUserType();
      loadAllMatchBadges();
      showFoundingMemberOverlay(()=>{
        if(_hadPendingInvite){
          showPage('innerCircle');
          setTimeout(() => showIcSection('requests'), 400);
        } else {
          showPage('dashboard');
          showToast('Welcome to PBallConnect! 🎾','#1a7a3a');
        }
      });
    }catch(e){
      if(btn){ btn.disabled=false; btn.textContent='Save & Join PBallConnect 🏓'; btn.style.background='#1a7a3a'; btn.style.cursor='pointer'; }
      if(errEl){ errEl.textContent='Save failed: '+(e.message||'Unknown error'); errEl.style.display='block'; }
    }
  };

  window._qcSwitchFull = function(){
    document.getElementById('quickConnectOverlay')?.remove();
    const emailEl = document.getElementById('email');
    if(emailEl) emailEl.value = email;
    S._tosConsent = false;
    S._privacyConsent = false;
    S._riskConsent = false;
    document.getElementById('checkBoxTos')?.classList.remove('on');
    document.getElementById('checkBoxRisk')?.classList.remove('on');
    const sb = document.getElementById('btnSubmit');
    if(sb) sb.disabled = true;
    document.getElementById('lessonSection') && (document.getElementById('lessonSection').style.display = 'none');
    document.getElementById('lessonOfferSection') && (document.getElementById('lessonOfferSection').style.display = 'none');
    _doStartFullProfile(email, 'Great! Let\'s build your full profile — it\'s quick and fun! 🎾');
  };

  setTimeout(()=>document.getElementById('qcFirstName')?.focus(), 150);
}

async function showFoundingMemberOverlay(onDismiss){
  if(localStorage.getItem('pb_founding_seen')){ onDismiss(); return; }
  let playerCount = '';
  try{
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/public_profiles?select=id&limit=1`,
      { headers:{ 'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'count=exact' } }
    );
    const cr = r.headers.get('content-range');
    if(cr){ const total=cr.split('/')[1]; if(total && total!=='*') playerCount=total; }
  }catch(e){}
  const countStr = playerCount ? playerCount+' players' : 'our founding players';
  const overlay = document.createElement('div');
  overlay.id = 'foundingMemberOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML =
    '<div style="background:#0f1f12;border:1px solid rgba(245,158,11,0.4);border-radius:20px;'+
    'padding:32px 28px;max-width:440px;width:92%;text-align:center;">'+
      '<div style="font-size:48px;margin-bottom:12px;">🎾</div>'+
      '<h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 12px;">Welcome to the founding team! 🎾</h2>'+
      '<p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.7;margin:0 0 24px;">'+
        'You\'re one of '+countStr+' helping shape PBallConnect. Your feedback matters — use the 💬 button anytime.'+
      '</p>'+
      '<button id="foundingMemberBtn" style="width:100%;padding:14px;border-radius:12px;border:none;'+
        'background:var(--green);color:var(--dark);font-weight:800;font-size:14px;cursor:pointer;'+
        'font-family:\'DM Sans\',sans-serif;">Let\'s Play! →</button>'+
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('foundingMemberBtn').onclick = function(){
    localStorage.setItem('pb_founding_seen','1');
    overlay.remove();
    onDismiss();
  };
}

function showOrganizerQuestion(email, inv){
  const existing = document.getElementById('organizerQuestionOverlay');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'organizerQuestionOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  const inviterName = inv?.inviter_name || 'Your friend';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:28px 24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="text-align:center;margin-bottom:20px;">'+
        '<div style="font-size:40px;margin-bottom:8px;">🏓</div>'+
        '<div style="font-size:18px;font-weight:800;color:#111;margin-bottom:6px;">One quick question!</div>'+
        '<div style="font-size:13px;color:#555;line-height:1.6;">Do you plan on organizing matches for your group?</div>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;gap:10px;">'+
        '<div onclick="window._orgQuestionYes()" style="cursor:pointer;border:2px solid #1a7a3a;border-radius:14px;padding:16px;background:#f0fdf4;">'+
          '<div style="font-size:14px;font-weight:800;color:#1a7a3a;margin-bottom:3px;">Yes — I organize matches!</div>'+
          '<div style="font-size:12px;color:#166534;">I set up games for my crew</div>'+
        '</div>'+
        '<div onclick="window._orgQuestionNo()" style="cursor:pointer;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">'+
          '<div style="font-size:14px;font-weight:800;color:#111;margin-bottom:3px;">No — just here to play</div>'+
          '<div style="font-size:12px;color:#6b7280;">I accept invites and show up ready</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  window._orgQuestionYes = async function(){
    overlay.remove();
    // Save wants_organizer = true
    await fetch(`${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(email)}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({wants_organizer:true})
    }).catch(()=>{});
    // Show Court Captain path
    showCourtCaptainNudge(email);
  };
  window._orgQuestionNo = async function(){
    overlay.remove();
    // Save wants_organizer = false
    await fetch(`${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(email)}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({wants_organizer:false})
    }).catch(()=>{});
    showPage('dashboard');
    showToast('Welcome to PBallConnect! 🎾','#1a7a3a');
  };
}

function showCourtCaptainNudge(email){
  const overlay = document.createElement('div');
  overlay.id = 'courtCaptainNudge';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:28px 24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="text-align:center;margin-bottom:20px;">'+
        '<div style="font-size:40px;margin-bottom:8px;">🎉</div>'+
        '<div style="font-size:18px;font-weight:800;color:#1a7a3a;margin-bottom:6px;">Court Captain in the making!</div>'+
        '<div style="font-size:13px;color:#555;line-height:1.6;">To unlock match organizing tools you need your full profile. It\'s quick, easy and a lot of fun — and you\'ll be setting up matches in minutes!</div>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;gap:10px;">'+
        '<button onclick="window._courtCaptainFull()" style="width:100%;padding:14px;border-radius:12px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;">'+
          'Complete Full Profile 🏓</button>'+
        '<button onclick="window._courtCaptainLater()" style="width:100%;padding:12px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer;">'+
          'I\'ll do it later</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  window._courtCaptainFull = function(){
    overlay.remove();
    // Go to full profile form pre-filled
    showPage('playerProfile');
    unlockProfileForm();
    goTo(1);
    showToast('🎾 Let\'s build your full profile!','#1a7a3a');
    setTimeout(()=>{ const fn=document.getElementById('firstName'); if(fn) fn.focus(); }, 350);
  };
  window._courtCaptainLater = function(){
    overlay.remove();
    showPage('dashboard');
    showToast('Welcome to PBallConnect! Complete your profile anytime to unlock Court Captain tools. 🏓','#1a7a3a');
  };
}

function showMutualInvitePrompt(theirEmail, theirName){
  // Remove any existing prompt
  document.getElementById('mutualInvitePrompt')?.remove();

  const prompt = document.createElement('div');
  prompt.id = 'mutualInvitePrompt';
  prompt.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);'+
    'display:flex;align-items:center;justify-content:center;padding:20px;';

  const shortName = (theirName||theirEmail).split(' ')[0];
  prompt.innerHTML =
    '<div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:320px;width:100%;'+
      'text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'+
      '<div style="font-size:40px;margin-bottom:12px;">👥</div>'+
      '<div style="font-size:17px;font-weight:800;color:#111;margin-bottom:10px;">'+
        'Add '+shortName+' to your Inner Circle?'+
      '</div>'+
      '<div style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:20px;">'+
        shortName+' invited you to PBallConnect — would you like to add them to your circle too?'+
      '</div>'+
      '<div style="display:flex;gap:10px;justify-content:center;">'+
        '<button id="mutualYesBtn" onclick="sendMutualInvite(\''+theirEmail+'\',\''+theirName+'\')" '+
          'style="padding:11px 18px;border-radius:10px;border:none;background:#1a7a3a;'+
          'color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">'+
          '✅ Yes, add them'+
        '</button>'+
        '<button onclick="document.getElementById(\'mutualInvitePrompt\').remove()" '+
          'style="padding:11px 18px;border-radius:10px;border:1.5px solid #d1d5db;'+
          'background:#fff;color:#6b7280;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">'+
          'Not right now'+
        '</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(prompt);
  // Auto-dismiss after 15 seconds
  setTimeout(()=>document.getElementById('mutualInvitePrompt')?.remove(), 15000);
}

async function sendMutualInvite(theirEmail, theirName){
  const btn = document.getElementById('mutualYesBtn');
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
  await icSendRequest(theirEmail, theirName, btn);
  setTimeout(()=>document.getElementById('mutualInvitePrompt')?.remove(), 1500);
}

function startNewRegistration(email){
  if(_newUserRegistrationStarted) return; // prevent double-call from dual auth event sources
  _newUserRegistrationStarted = true;
  document.getElementById('navLoginBtn')?.style.setProperty('display','none');
  closeLoginModal();
  S.email = (email||'').toLowerCase();
  localStorage.removeItem('pb_pending_email');

  const _urlParams = new URLSearchParams(window.location.search);
  const _isNewUserReturn = _urlParams.get('newuser') === '1';
  const _returnToken = _urlParams.get('invite');
  const _returnQrId  = _urlParams.get('qr');

  if(_isNewUserReturn && _returnQrId && !PENDING_INVITE){
    // Coming back from magic link via QR invite — look up owner by qr_invite_id
    fetch(`${SUPABASE_URL}/rest/v1/public_profiles?qr_invite_id=eq.${encodeURIComponent(_returnQrId)}&select=email,first_name,last_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    .then(r=>r.json()).then(rows=>{
      if(rows.length){
        const owner=rows[0];
        const ownerName=((owner.first_name||'')+(owner.last_name?' '+owner.last_name:'')).trim()||'A fellow player';
        PENDING_INVITE={invite_type:'qr',qr_id:_returnQrId,inviter_email:owner.email,inviter_name:ownerName};
      } else {
        PENDING_INVITE={invite_type:'qr',qr_id:_returnQrId,inviter_name:'A fellow player'};
      }
      showInviteLandingChoice(email, PENDING_INVITE);
    }).catch(()=>{ showInviteLandingChoice(email, null); });
    return;
  }
  if(_isNewUserReturn && _returnToken && !PENDING_INVITE){
    // Coming back from magic link via invite.html — fetch invite data then show choice
    fetch(`https://dltiirdjfbjtydazrmvr.supabase.co/rest/v1/invite_tokens?invite_token=eq.${_returnToken}`,
      {headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdGlpcmRqZmJqdHlkYXpybXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDQxNzgsImV4cCI6MjA4OTA4MDE3OH0.oBDtS3RZlGxMkqon-r1wdfYR6jPTSPGWIa8cZh7fLWA','Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    .then(r=>r.json()).then(rows=>{
      PENDING_INVITE = rows[0] || {invite_token:_returnToken};
      showInviteLandingChoice(email, PENDING_INVITE);
    }).catch(()=>{ showInviteLandingChoice(email, null); });
    return;
  }
  if(PENDING_INVITE){
    showInviteLandingChoice(email, PENDING_INVITE);
    return;
  }

  // Normal new user — go straight to profile form
  const emailEl = document.getElementById('email');
  if(emailEl) emailEl.value = email;
  showPage('playerProfile');
  unlockProfileForm();
  goTo(1);

  // Pre-populate fields saved by join.html before the magic link was sent.
  // Primary source: sessionStorage (same tab). Fallback: server fetch from organic_signups (iOS new-tab).
  (async function(){
    let skill = sessionStorage.getItem('organic_skill');
    let since = sessionStorage.getItem('organic_playing_since');
    let age   = sessionStorage.getItem('organic_age_range');
    const orgEmail = sessionStorage.getItem('organic_email');
    let _needsServerDelete = false;

    if((!skill || !since || !age) && _urlParams.get('organic') === '1'){
      try{
        const r = await fetch('/api/organic-signup?email=' + encodeURIComponent(email));
        if(r.ok){
          const d = await r.json();
          if(!skill) skill = d.skill_level || '';
          if(!since) since = d.playing_since || '';
          if(!age)   age   = d.age_range || '';
          _needsServerDelete = true;
        } else {
          const text = await r.text().catch(()=>'');
          console.error('[organic] server fetch failed:', r.status, text);
        }
      }catch(e){ console.error('[organic] server fetch failed:', e); }
    }

    if(!orgEmail && !skill && !since && !age) return;
    if(orgEmail && emailEl) emailEl.value = orgEmail;
    if(skill){
      const idx = DUPR_VALS.indexOf(skill);
      if(idx >= 0){
        const slider = document.getElementById('personalRatingSlider');
        if(slider){ slider.value = idx; updatePersonalRating(idx); }
      }
    }
    if(since){
      const sinceEl = document.getElementById('playingSince');
      if(sinceEl){ sinceEl.value = since; S.playingSince = since; }
    }
    if(age){
      const ageEl = document.getElementById('playerAge');
      if(ageEl){
        ageEl.value = age;
        ageEl.dispatchEvent(new Event('change'));
      }
    }
    if(_needsServerDelete){
      fetch('/api/organic-signup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, delete: true })
      }).catch(()=>{});
    }
    ['organic_email','organic_skill','organic_playing_since','organic_age_range']
      .forEach(k => sessionStorage.removeItem(k));
    // organic_source intentionally kept for doSaveProfile() to record invite_source
  })();

  S._tosConsent = false; S._privacyConsent = false; S._riskConsent = false;
  document.getElementById('checkBoxTos')?.classList.remove('on');
  document.getElementById('checkBoxRisk')?.classList.remove('on');
  const sb = document.getElementById('btnSubmit'); if(sb) sb.disabled = true;
  document.getElementById('lessonSection') && (document.getElementById('lessonSection').style.display='none');
  updateNavForUserType();
  setTimeout(()=>{
    window.scrollTo({top:0,behavior:'smooth'});
    showToast('👋 Welcome! Fill out your profile below.','#4CAF7D');
    const fn=document.getElementById('firstName'); if(fn){ fn.focus(); }
    chk1();
  }, 350);
}

async function handlePostRegistrationInvite(newPlayerEmail, newPlayerName){
  if(!PENDING_INVITE) return;
  const inv = PENDING_INVITE;
  PENDING_INVITE = null;

  if(inv.invite_type === 'qr'){
    // QR multi-use: create a new invite row for this specific registration
    fetch(`${SUPABASE_URL}/rest/v1/invites`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({
        inviter_email: inv.inviter_email,
        inviter_name:  inv.inviter_name,
        invitee_email: newPlayerEmail,
        invite_method: 'qr',
        invite_type:   'qr',
        is_used:       true,
        status:        'registered'
      })
    }).catch(()=>{});
  } else {
    // Single-use token: mark as used + registered
    fetch(`${SUPABASE_URL}/rest/v1/invites?invite_token=eq.${inv.invite_token}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({status:'registered', is_used:true})
    }).catch(()=>{});
  }

  const inviterName = inv.inviter_name || 'Your inviter';
  const shortName   = inviterName.split(' ')[0];

  // Step 1 overlay — Accept IC invite from inviter
  const overlay = document.createElement('div');
  overlay.id = 'inviteAcceptOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;z-index:700;';
  overlay.innerHTML =
    '<div style="background:#0f1f12;border:1px solid rgba(76,175,125,0.4);border-radius:20px;padding:28px 24px;max-width:420px;width:100%;text-align:center;">'+
      '<div style="font-size:48px;margin-bottom:12px;">🤝</div>'+
      '<div style="font-size:19px;font-weight:800;color:#fff;margin-bottom:8px;">You\'re in, '+newPlayerName.split(' ')[0]+'!</div>'+
      '<div style="font-size:13px;color:var(--dim);margin-bottom:6px;line-height:1.6;">'+
        shortName+' invited you to PBallConnect. Would you like to join '+shortName+'\'s Inner Circle?'+
      '</div>'+
      '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:20px;">Inner Circle lets you set up matches, see schedules, and connect on the court.</div>'+
      '<div style="display:flex;gap:10px;">'+
        '<button id="icJoinYes" style="flex:1;padding:13px;border-radius:10px;border:none;background:var(--green);color:var(--dark);font-weight:700;font-size:14px;cursor:pointer;">'+
          '✅ Yes — Join '+shortName+'\'s IC!'+
        '</button>'+
        '<button id="icJoinNo" style="flex:1;padding:13px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--dim);font-size:13px;cursor:pointer;">'+
          'Maybe Later'+
        '</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);

  // Step 2 — finalize connections based on new user's choice
  const showStep2 = async (accepted)=>{
    overlay.remove();
    if(accepted){
      try{
        // Patch original invite row (inviter → new user) to approved — the new user accepted
        await fetch(`${SUPABASE_URL}/rest/v1/connections?requester_email=eq.${encodeURIComponent(inv.inviter_email)}&recipient_email=eq.${encodeURIComponent(newPlayerEmail)}&status=eq.pending`,{
          method:'PATCH',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body:JSON.stringify({status:'approved'})
        });
        // Create reciprocal connection (new user → inviter) as approved — mutual IC since inviter initiated
        await fetch(`${SUPABASE_URL}/rest/v1/connections`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal,resolution=ignore-duplicates'},
          body:JSON.stringify({requester_email:newPlayerEmail,requester_name:newPlayerName,recipient_email:inv.inviter_email,recipient_name:inv.inviter_name||'',status:'approved'})
        });
        showToast('🎾 You\'re now in each other\'s Inner Circle!','#4CAF7D');
      }catch(e){}
    }
    // If declined, original row stays pending — new user can accept from IC → Requests later
    showPage('innerCircle');
    setTimeout(() => showIcSection('requests'), 400);
  };

  document.getElementById('icJoinYes').onclick = ()=>showStep2(true);
  document.getElementById('icJoinNo').onclick  = ()=>showStep2(false);
}

document.addEventListener('DOMContentLoaded', ()=>{
  // Delay invite check until after session restore attempt
  setTimeout(checkInviteToken, 1500);
});

// Register service worker for PWA offline support
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    // Inline service worker via blob URL
    const swCode = `
      const CACHE = 'pb-registry-v7';
      const OFFLINE_URLS = ['/'];
      self.addEventListener('install', e => {
        e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)));
        self.skipWaiting();
      });
      self.addEventListener('activate', e => {
        e.waitUntil(caches.keys().then(keys =>
          Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ));
        self.clients.claim();
      });
      self.addEventListener('fetch', e => {
        if(e.request.method !== 'GET') return;
        // Network first for API calls, cache first for app shell
        if(e.request.url.includes('supabase') || e.request.url.includes('emailjs') || e.request.url.includes('nominatim')){
          return; // Always network for API calls
        }
        e.respondWith(
          fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('/')))
        );
      });
    `;
    const blob = new Blob([swCode], {type:'application/javascript'});
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl).catch(()=>{});
  });
}

// ══════════════════════════════════════════════════════
// MATCH WEATHER
// ══════════════════════════════════════════════════════

async function loadMatchWeather(){
  const box    = document.getElementById('matchWeatherBox');
  const content= document.getElementById('matchWeatherContent');
  const dateEl = document.getElementById('matchWeatherDate');
  if(!box||!content) return;

  // Only show for outdoor/public courts
  const hasOutdoor = [...MS.selectedCourts.values()].some(c=>!c.isPrivate) || MS.location==='tbd';
  if(!hasOutdoor || MS.selectedCourts.size===0){ box.style.display='none'; return; }

  const date = document.getElementById('matchDate')?.value;
  if(!date){ box.style.display='none'; return; }

  const cityData = getCityLatLon();
  if(!cityData){ box.style.display='none'; return; }

  box.style.display='block';
  if(dateEl) dateEl.textContent='for '+new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  content.innerHTML='<div style="font-size:11px;color:var(--dim);">Loading forecast…</div>';

  try{
    // Open-Meteo — free, no API key needed
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}`+
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode`+
      `&temperature_unit=fahrenheit&windspeed_unit=mph&forecast_days=14&timezone=America%2FNew_York`;

    const res = await fetch(url);
    if(!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();

    // Find the index for our date
    const idx = data.daily.time.indexOf(date);
    if(idx < 0){ content.innerHTML='<div style="font-size:11px;color:var(--dim);">Forecast not available for this date.</div>'; return; }

    const code   = data.daily.weathercode[idx];
    const high   = Math.round(data.daily.temperature_2m_max[idx]);
    const low    = Math.round(data.daily.temperature_2m_min[idx]);
    const precip = data.daily.precipitation_probability_max[idx];
    const wind   = Math.round(data.daily.windspeed_10m_max[idx]);

    const weatherDesc = getWeatherDesc(code);
    const weatherEmoji= getWeatherEmoji(code);
    const windLevel   = wind < 10 ? 'Calm' : wind < 20 ? 'Breezy' : wind < 30 ? 'Windy' : 'Very Windy';
    const windColor   = wind < 10 ? 'var(--green)' : wind < 20 ? '#fbbf24' : '#f87171';
    const precipColor = precip < 20 ? 'var(--green)' : precip < 50 ? '#fbbf24' : '#f87171';

    content.innerHTML =
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;align-items:center;">'+
        '<span style="font-size:36px;line-height:1;">'+weatherEmoji+'</span>'+
        '<div>'+
          '<div style="color:#fff;font-size:14px;font-weight:700;">'+weatherDesc+'</div>'+
          '<div style="color:var(--dim);font-size:12px;margin-top:2px;">'+high+'°F high · '+low+'°F low</div>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;">'+
        '<div style="font-size:12px;">'+
          '<span style="color:var(--dim);">🌧 Rain chance: </span>'+
          '<span style="font-weight:700;color:'+precipColor+';">'+precip+'%</span>'+
        '</div>'+
        '<div style="font-size:12px;">'+
          '<span style="color:var(--dim);">💨 Wind: </span>'+
          '<span style="font-weight:700;color:'+windColor+';">'+wind+' mph ('+windLevel+')</span>'+
        '</div>'+
      '</div>'+
      (precip >= 50 ? '<div style="margin-top:8px;font-size:11px;color:#f87171;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:6px 10px;">⚠️ High chance of rain — consider an indoor backup court</div>' : '')+
      (wind >= 25  ? '<div style="margin-top:8px;font-size:11px;color:#fbbf24;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:6px;padding:6px 10px;">💨 High winds may affect outdoor play</div>' : '');

  }catch(e){
    content.innerHTML='<div style="font-size:11px;color:var(--dim);">Weather unavailable — check forecast before playing.</div>';
    console.warn('Weather error:',e);
  }
}

function getWeatherEmoji(code){
  if(code===0) return '☀️';
  if(code<=2)  return '⛅';
  if(code<=3)  return '☁️';
  if(code<=49) return '🌫️';
  if(code<=59) return '🌦️';
  if(code<=69) return '🌧️';
  if(code<=79) return '🌨️';
  if(code<=82) return '🌧️';
  if(code<=84) return '🌨️';
  if(code<=99) return '⛈️';
  return '🌡️';
}

function getWeatherDesc(code){
  if(code===0)  return 'Clear Sky';
  if(code===1)  return 'Mainly Clear';
  if(code===2)  return 'Partly Cloudy';
  if(code===3)  return 'Overcast';
  if(code<=45)  return 'Foggy';
  if(code<=57)  return 'Drizzle';
  if(code<=67)  return 'Rainy';
  if(code<=77)  return 'Snowy';
  if(code<=82)  return 'Rain Showers';
  if(code<=86)  return 'Snow Showers';
  if(code<=99)  return 'Thunderstorms';
  return 'Unknown';
}

// ══════════════════════════════════════════════════════
// FAVORITES
// ══════════════════════════════════════════════════════

async function toggleFavorite(playerEmail, btn){
  const myEmail = getMyEmail();
  if(!myEmail) return;
  const isFav = IC_FAVORITES.has(playerEmail);
  const newVal = !isFav;

  // Update UI immediately
  if(newVal){ IC_FAVORITES.add(playerEmail); }
  else { IC_FAVORITES.delete(playerEmail); }
  if(btn){
    btn.textContent = newVal ? '⭐' : '☆';
    btn.title = newVal ? 'Remove from favorites' : 'Add to favorites';
    btn.style.color = newVal ? '#fbbf24' : 'var(--dim)';
  }

  // Find the connection ID
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/connections?or=(requester_email.eq.${encodeURIComponent(myEmail)},recipient_email.eq.${encodeURIComponent(myEmail)})&select=id,requester_email,recipient_email`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const conns = res.ok ? await res.json() : [];
    const conn = conns.find(c=>c.requester_email===playerEmail||c.recipient_email===playerEmail);
    if(!conn) return;
    await fetch(`${SUPABASE_URL}/rest/v1/connections?id=eq.${conn.id}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body: JSON.stringify({is_favorite: newVal})
    });
    showToast(newVal ? '⭐ Added to favorites!' : 'Removed from favorites', newVal?'#fbbf24':'var(--dim)');
    updateMatchGroupLabels(); // refresh counts
  }catch(e){ console.warn('toggleFavorite error:',e); }
}

function buildGroupExpandList(group){
  const listEl  = document.getElementById('matchGroupExpandList');
  const titleEl = document.getElementById('matchExpandTitle');
  if(!listEl) return;

  const mySkill = S.skill || SESSION_PLAYER?.skill_level || '';
  const skills  = mySkill ? getAdjacentSkills(mySkill) : null;
  const players = getGroupPlayers(group, skills);

  const groupLabels = {
    favorites:'⭐ My Favorites', all:'👥 Entire Inner Circle',
    my_level:'🟢 My Level', below:'🟡 Below My Level', above:'🟣 Above My Level'
  };
  if(titleEl) titleEl.textContent = (groupLabels[group]||group)+' · '+players.length+' players';

  // Sort alphabetically
  players.sort((a,b)=>((a.first_name||'')+(a.last_name||'')).localeCompare((b.first_name||'')+(b.last_name||'')));

  listEl.innerHTML='';
  players.forEach(player=>{
    const pEmail  = (player.email||'').toLowerCase();
    const name    = ((player.first_name||'')+(player.last_name?' '+player.last_name:'')).trim();
    const checked = MS.deselectedPlayers?.has(pEmail)===false || !MS.deselectedPlayers?.has(pEmail);

    const item = document.createElement('div');
    item.style.cssText='display:flex;align-items:center;gap:6px;padding:7px 8px;'+
      'border-radius:8px;border:1px solid var(--border);cursor:pointer;'+
      'background:'+(checked?'rgba(76,175,125,0.06)':'rgba(255,255,255,0.02)')+';'+
      'transition:all .15s;';

    const cb = document.createElement('div');
    cb.style.cssText='width:14px;height:14px;border-radius:3px;flex-shrink:0;border:2px solid '+
      (checked?'var(--green)':'var(--border)')+';background:'+(checked?'var(--green)':'transparent')+
      ';display:flex;align-items:center;justify-content:center;';
    if(checked) cb.innerHTML='<span style="color:#fff;font-size:9px;font-weight:700;">✓</span>';

    const lbl = document.createElement('div');
    lbl.style.cssText='flex:1;min-width:0;';
    lbl.innerHTML=
      '<div style="color:#fff;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+
        (player.avatar_emoji||'')+(player.avatar_emoji?' ':'')+name+'</div>'+
      '<div style="color:var(--dim);font-size:9px;">⭐'+(player.skill_level||'?')+'</div>';

    item.appendChild(cb); item.appendChild(lbl);
    item.onclick=()=>{
      if(!MS.deselectedPlayers) MS.deselectedPlayers = new Set();
      if(MS.deselectedPlayers.has(pEmail)) MS.deselectedPlayers.delete(pEmail);
      else MS.deselectedPlayers.add(pEmail);
      buildGroupExpandList(group);
      updateInviteCounter();
    };
    listEl.appendChild(item);
  });
}

let _selectAllState = true;
function toggleSelectAll(){
  const allGroups = (MS.selectedGroups&&MS.selectedGroups.size) ? MS.selectedGroups : new Set([MS.group].filter(Boolean));
  const group = [...allGroups].find(g=>g&&g!=='specific') || null;
  if(!group) return;
  const mySkill = S.skill || SESSION_PLAYER?.skill_level || '';
  const skills  = mySkill ? getAdjacentSkills(mySkill) : null;
  const players = getGroupPlayers(group, skills);
  if(!MS.deselectedPlayers) MS.deselectedPlayers = new Set();
  _selectAllState = !_selectAllState;
  if(_selectAllState){
    MS.deselectedPlayers.clear(); // select all
  } else {
    players.forEach(p=>MS.deselectedPlayers.add((p.email||'').toLowerCase())); // deselect all
  }
  const btn=document.getElementById('matchSelectAllBtn');
  if(btn) btn.textContent=_selectAllState?'Deselect All':'Select All';
  buildGroupExpandList(group);
  updateInviteCounter();
}

// ── Gender slot breakdown panel (Step 4) ─────────────
function renderMixedBreakdown(pendingMen, pendingWomen){
  const el = document.getElementById('matchMixedBreakdown');
  if(!el) return;
  const pref = MS.genderPref || 'either';
  const perCourt = MS.format === 'doubles' ? 2 : 1;
  const numCourts = MS.numCourts || 1;
  const myGenderLc = (S.gender || SESSION_PLAYER?.gender || '').toLowerCase();
  const orgIsMale   = MS.organizerPlaying && myGenderLc === 'male';
  const orgIsFemale = MS.organizerPlaying && myGenderLc === 'female';

  const neededMen   = perCourt * numCourts - (orgIsMale   ? 1 : 0);
  const neededWomen = perCourt * numCourts - (orgIsFemale ? 1 : 0);
  const neededTotal = matchMaxNeeded();
  const invitedMen   = pendingMen;
  const invitedWomen = pendingWomen;
  const invitedTotal = pendingMen + pendingWomen + (MS.organizerPlaying ? 1 : 0);

  const hdrTh  = 'padding:6px 10px;font-size:11px;font-weight:700;text-align:center;color:#fff;background:#991b1b;';
  const hdrLbl = 'padding:6px 10px;font-size:11px;font-weight:700;text-align:left;color:#fff;background:#991b1b;';
  const bodyLbl = 'padding:7px 10px;font-size:13px;font-weight:600;color:#374151;background:#fff;border-top:1px solid #f3f4f6;';
  const bodyNum = ok=>'padding:7px 10px;font-size:13px;font-weight:700;text-align:center;background:#fff;border-top:1px solid #f3f4f6;color:'+(ok?'#1a7a3a':'#111')+';';

  let rows = '';
  if(pref === 'mixed'){
    rows =
      '<tr>'+
        '<td style="'+bodyLbl+'">👨 Men</td>'+
        '<td style="'+bodyNum(false)+'">'+neededMen+'</td>'+
        '<td style="'+bodyNum(invitedMen>=neededMen)+'">'+invitedMen+(orgIsMale?' <span style="color:#991b1b;">★</span>':'')+'</td>'+
      '</tr>'+
      '<tr>'+
        '<td style="'+bodyLbl+'">👩 Women</td>'+
        '<td style="'+bodyNum(false)+'">'+neededWomen+'</td>'+
        '<td style="'+bodyNum(invitedWomen>=neededWomen)+'">'+invitedWomen+(orgIsFemale?' <span style="color:#991b1b;">★</span>':'')+'</td>'+
      '</tr>';
  } else {
    rows =
      '<tr>'+
        '<td style="'+bodyLbl+'">Total</td>'+
        '<td style="'+bodyNum(false)+'">'+neededTotal+'</td>'+
        '<td style="'+bodyNum(invitedTotal>=neededTotal)+'">'+invitedTotal+(MS.organizerPlaying?' <span style="color:#991b1b;">★</span>':'')+'</td>'+
      '</tr>';
  }

  el.style.display = 'block';
  el.innerHTML =
    '<div style="padding:12px 16px;background:#fee2e2;border:2px solid #f87171;border-radius:12px;margin-bottom:12px;">'+
      '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">'+
        '<thead><tr>'+
          '<th style="'+hdrLbl+'"></th>'+
          '<th style="'+hdrTh+'">Needed</th>'+
          '<th style="'+hdrTh+'">Invited</th>'+
        '</tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
      '</table>'+
    '</div>';
}

function updateInviteCounter(){
  const counter = document.getElementById('matchInviteCounter');
  if(!counter) return;
  const myGender = S.gender || SESSION_PLAYER?.gender || '';
  const mySkill = S.skill || SESSION_PLAYER?.skill_level || '';
  const skills  = mySkill ? getAdjacentSkills(mySkill) : null;
  const allGroups = MS.selectedGroups && MS.selectedGroups.size ? MS.selectedGroups : new Set([MS.group, ...MS.extraGroups]);
  const seen = new Set();
  let pending = 0, pendingMen = 0, pendingWomen = 0;

  const addPending = (player) => {
    pending++;
    const g = (player?.gender||'').toLowerCase();
    if(g==='male') pendingMen++;
    else if(g==='female') pendingWomen++;
  };

  allGroups.forEach(g=>{
    if(!g||g==='specific'||g==='group_subs') return;
    getGroupPlayers(g, skills).forEach(p=>{
      const e=(p.email||'').toLowerCase();
      if(!seen.has(e) && !MS.deselectedPlayers?.has(e)){ seen.add(e); addPending(p); }
    });
  });
  // Specific picks — gender-filtered
  if(allGroups.has('specific')){
    MS.specificPlayers.forEach(e=>{
      if(seen.has(e)) return;
      const pm = IC_MEMBERS.find(({player})=>(player.email||'').toLowerCase()===e);
      if(!pm || playerPassesGenderFilter(pm.player, MS.genderPref, myGender)){
        seen.add(e); addPending(pm?.player);
      }
    });
  }
  // Group+subs — hand-picked, no gender filter
  if(allGroups.has('group_subs')){
    [...MS.primaryPlayers, ...MS.subPlayers].forEach(e=>{
      if(seen.has(e)) return;
      const pm = IC_MEMBERS.find(({player})=>(player.email||'').toLowerCase()===e);
      seen.add(e); addPending(pm?.player);
    });
  }

  counter.style.display = 'block'; // always visible on Step 4
  counter.textContent = (MS.organizerPlaying ? '1 confirmed (you)' : '0 confirmed')+' · '+pending+' pending invite'+(pending!==1?'s':'');
  counter.style.background = 'rgba(76,175,125,0.12)';
  counter.style.color = 'var(--green)';
  renderMixedBreakdown(pendingMen, pendingWomen);
}


// ══════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════

function getCountdown(matchDate, timeStart){
  if(!matchDate) return null;
  const matchDt = new Date(matchDate+'T'+(timeStart||'12:00'));
  const diff = matchDt - new Date();
  if(diff <= 0) return null;
  const totalMins = Math.floor(diff / (1000*60));
  const days  = Math.floor(totalMins / (60*24));
  const hours = Math.floor((totalMins % (60*24)) / 60);
  const mins  = totalMins % 60;
  // Urgency: red < 24h, amber 24-48h, neutral > 48h
  const urgency = diff < 24*60*60*1000 ? 'urgent'
                : diff < 48*60*60*1000 ? 'caution'
                : 'normal';
  // Build "Xd Xh Xm away", omitting leading zero components except always show mins
  const parts = [];
  if(days > 0)               parts.push(days+'d');
  if(hours > 0 || days > 0)  parts.push(hours+'h');
  parts.push(mins+'m');
  return {text: parts.join(' ')+' away', urgent: urgency==='urgent', urgency};
}

// Helper to render countdown div
function renderCountdown(matchDate, timeStart){
  const cd = getCountdown(matchDate, timeStart);
  if(!cd) return '';
  const color = cd.urgency==='urgent'  ? '#dc2626'
              : cd.urgency==='caution' ? '#f59e0b'
              : '#9ca3af';
  return '<div style="font-size:11px;font-weight:800;color:'+color+';margin-top:3px;"'+
    (cd.urgent?' class="pb-urgent"':'')+'>⏱ '+cd.text+'</div>';
}

async function loadDashboard(){
  const myEmail = getMyEmail();
  if(!myEmail){ showPage('playerProfile'); return; }

  const nameEl  = document.getElementById('dashName');
  const emojiEl = document.getElementById('dashEmoji');
  if(SESSION_PLAYER){
    if(nameEl){
      const _wbDashKey = 'pb_welcomed_' + (SESSION_PLAYER.email||'').toLowerCase();
      const _isReturningDash = !!localStorage.getItem(_wbDashKey);
      nameEl.textContent = SESSION_PLAYER.first_name ? (_isReturningDash ? 'Welcome back, ' : 'Welcome, ')+SESSION_PLAYER.first_name+'!' : '';
    }
    if(emojiEl) emojiEl.textContent = SESSION_PLAYER.avatar_emoji || '🎾';
  }

  // Load everything in parallel
  loadDashTileCounts(myEmail);
  loadDashNextMatch(myEmail);
  loadDashPendingInvites(myEmail);
  loadDashInvitedToPlay(myEmail);
}

async function loadDashTileCounts(myEmail){
  const setTile = (id,txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; };
  try{
    // Confirmed matches
    const [cfOrgRes,cfRespRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=eq.full&or=(is_walk_on.is.null,is_walk_on.eq.false)&select=id,match_date,time_start,time_end,match_type,max_players`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const cfOrg  = cfOrgRes.ok  ? await cfOrgRes.json()  : [];
    const cfResp = cfRespRes.ok ? await cfRespRes.json() : [];
    let cfInvited = [];
    if(cfResp.length){
      const ids = cfResp.map(r=>r.match_id);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&status=eq.full&or=(is_walk_on.is.null,is_walk_on.eq.false)&select=id,match_date,time_start,time_end,match_type,max_players`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      cfInvited = r.ok ? await r.json() : [];
    }
    const seen = new Set();
    const confirmed = [...cfOrg,...cfInvited].filter(m=>{ if(seen.has(m.id)) return false; seen.add(m.id); return !isMatchPast(m); });
    setTile('dashTileConfirmed', confirmed.length>0 ? confirmed.length+' upcoming' : 'None yet');

    // My invites — open matches I organized
    const miRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=neq.full&status=neq.cancelled&select=id,match_date,time_start,time_end`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const myInvites = miRes.ok ? await miRes.json() : [];
    const openInvites = myInvites.filter(m=>!isMatchPast(m));
    setTile('dashTileMyInvites', openInvites.length>0 ? openInvites.length+' awaiting response' : 'None pending');

    // Invited to play — subtitle only; count comes from loadAllMatchBadges()
    const pendRes = await fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.pending&select=match_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const pendRows = pendRes.ok ? await pendRes.json() : [];
    setTile('dashTileInvited', pendRows.length>0 ? pendRows.length+' invite'+(pendRows.length>1?'s':'')+' waiting' : 'No invites');

    // IC requests — use live count from restoreSession
    setTile('dashTileIC', IC_INCOMING_COUNT>0 ? IC_INCOMING_COUNT+' request'+(IC_INCOMING_COUNT>1?'s':'')+' pending' : 'None pending');
    setTile('dashIcIncomingCount', IC_INCOMING_COUNT||0);

    // Blue sub-card: matches where I said 'in' but roster isn't full yet
    const myEmailLower2 = myEmail.toLowerCase();
    const inRespIds = cfResp.map(r=>r.match_id).filter(Boolean);
    const [pmInvitedMatches, pmOrgMatchesRaw2] = await Promise.all([
      // Joined — matches where I have response='in'
      inRespIds.length
        ? fetch(`${SUPABASE_URL}/rest/v1/matches?id=in.(${inRespIds.join(',')})&select=id,match_date,time_start,time_end,match_type,max_players,organizer_email,status`,
            {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
            .then(r=>r.ok?r.json():[])
        : Promise.resolve([]),
      // Organized — needed to exclude my own matches from pmJoined
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&select=id,match_date,time_start,time_end,match_type,max_players,organizer_email,status`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
        .then(r=>r.ok?r.json():[])
    ]);
    const pmOrgMatches2 = pmOrgMatchesRaw2.filter(m=>!isMatchPast(m)&&(m.status||'')!=='cancelled');
    const pmOrgIds2 = new Set(pmOrgMatches2.map(m=>m.id));
    const pmJoined = pmInvitedMatches.filter(m=>
      !isMatchPast(m)&&(m.status||'')!=='cancelled'&&
      (m.organizer_email||'').toLowerCase()!==myEmailLower2&&
      !pmOrgIds2.has(m.id)
    );
    const pmRosterIds=[...new Set([...pmJoined.map(m=>m.id),...pmOrgMatches2.map(m=>m.id)])];
    let pmInResps=[];
    if(pmRosterIds.length){
      const rr=await fetch(`${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${pmRosterIds.join(',')})&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      if(rr.ok) pmInResps=await rr.json();
    }
    const pmInvitedPending=pmJoined.filter(m=>{
      const inCount=pmInResps.filter(r=>r.match_id===m.id).length;
      return inCount<(m.max_players||(m.match_type==='doubles'?4:2));
    });

    const subMyEl=document.getElementById('dashSubMyPending');
    const subMyTxt=document.getElementById('dashSubMyPendingText');
    if(subMyEl){
      if(pmInvitedPending.length>0){
        if(subMyTxt) subMyTxt.textContent='⏳ '+pmInvitedPending.length+' match'+(pmInvitedPending.length>1?'es':'')+' not yet full';
        subMyEl.style.display='block';
      } else { subMyEl.style.display='none'; }
    }

  }catch(e){ console.warn('loadDashTileCounts error:',e); }
}

async function loadDashNextMatch(myEmail){
  const el = document.getElementById('dashNextMatch');
  if(!el) return;
  try{
    // Get confirmed matches (organized or playing in)
    const [orgRes, respRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=eq.full&or=(is_walk_on.is.null,is_walk_on.eq.false)&order=match_date.asc,time_start.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.in&select=match_id`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const orgMatches = orgRes.ok ? await orgRes.json() : [];
    const myResps    = respRes.ok ? await respRes.json() : [];
    let invitedMatches = [];
    if(myResps.length){
      const ids = myResps.map(r=>r.match_id);
      const imRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&status=eq.full&or=(is_walk_on.is.null,is_walk_on.eq.false)&order=match_date.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      invitedMatches = imRes.ok ? await imRes.json() : [];
    }
    const seen = new Set();
    const allMatches = [...orgMatches,...invitedMatches].filter(m=>{
      if(seen.has(m.id)) return false; seen.add(m.id); return !isMatchPast(m);
    });

    // Verify confirmed player counts
    if(allMatches.length){
      const ids = allMatches.map(m=>m.id);
      const vrRes = await fetch(
        `${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${ids.join(',')})&response=eq.in&select=match_id,player_name,player_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
      const allResps = vrRes.ok ? await vrRes.json() : [];
      const countMap = {};
      allResps.forEach(r=>{ if(!countMap[r.match_id]) countMap[r.match_id]=[]; countMap[r.match_id].push(r); });

      const verified = allMatches.filter(m=>{
        const needed = m.max_players||(m.match_type==='doubles'?4:2);
        return (countMap[m.id]||[]).length >= needed;
      });

      if(verified.length){
        const m = verified[0]; // next upcoming
        const responses = countMap[m.id]||[];
        const dateStr = m.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : '—';
        const timeStr = m.time_start ? fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):'') : '—';
        const _today = new Date(); _today.setHours(0,0,0,0);
        const daysUntil = m.match_date ? Math.round((new Date(m.match_date+'T00:00') - _today)/(1000*60*60*24)) : null;
        const urgency = daysUntil===0?'TODAY 🔥':daysUntil===1?'TOMORROW':null;
        const isOrg = (m.organizer_email||'').toLowerCase()===myEmail.toLowerCase();
        const playerChips = responses.map(p=>{
          const n=(p.player_name||p.player_email||'').split(' ')[0];
          const isMe = (p.player_email||'').toLowerCase()===myEmail.toLowerCase();
          return '<span style="padding:3px 10px;border-radius:999px;background:'+(isMe?'#d1fae5':'#f3f4f6')+';border:1px solid '+(isMe?'#1a7a3a':'#d1d5db')+';font-size:12px;color:'+(isMe?'#1a7a3a':'#111')+';font-weight:'+(isMe?'700':'500')+';margin:2px 2px;">'+(isMe?'You':n)+'</span>';
        }).join('');

        el.innerHTML=
          '<div style="background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(26,122,58,0.12);border-left:4px solid #1a7a3a;">'+
            (urgency?'<div style="display:inline-block;margin-bottom:10px;padding:3px 10px;border-radius:999px;background:#d1fae5;border:1px solid #1a7a3a;color:#1a7a3a;font-size:10px;font-weight:800;">'+urgency+'</div>':'')+
            '<div style="font-size:16px;font-weight:800;color:#111;margin-bottom:4px;">'+dateStr+'</div>'+
            '<div style="font-size:13px;color:#555;margin-bottom:4px;">⏰ '+timeStr+'</div>'+
            renderCountdown(m.match_date,m.time_start)+
            '<div style="font-size:13px;color:#555;margin-bottom:10px;">📍 '+((m.court_name&&m.court_name.toLowerCase()!=='tbd')?m.court_name:(m.court_address||'Court TBD'))+'</div>'+
            '<div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:12px;">'+playerChips+'</div>'+
            (isOrg?'<div style="font-size:10px;color:#1a7a3a;font-weight:700;margin-bottom:10px;">👑 You organized this</div>':'')+
            '<button onclick="showPage(&quot;confirmedMatches&quot;)" style="width:100%;padding:10px;border-radius:10px;border:1px solid #1a7a3a;background:transparent;color:#1a7a3a;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">View All Confirmed Matches →</button>'+
          '</div>'+
          (verified.length>1?'<div style="font-size:11px;color:var(--dim);text-align:center;margin-top:8px;">+' +(verified.length-1)+' more confirmed match'+(verified.length>2?'es':'')+'</div>':'');
        return;
      }
    }

    // No confirmed matches
    el.innerHTML=
      '<div style="background:#fff;border-radius:16px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">'+
        '<div style="margin-bottom:8px;"><img src="/pickleball.jpg" style="width:48px;height:48px;object-fit:contain;"/></div>'+
        '<div style="color:#111;font-size:14px;font-weight:700;margin-bottom:6px;">No confirmed matches yet</div>'+
        '<div style="color:#666;font-size:12px;margin-bottom:14px;">Set up a match and invite your Inner Circle!</div>'+
        '<button onclick="showPage(&quot;setupMatch&quot;)" style="padding:10px 20px;border-radius:10px;border:none;background:#1a7a3a;color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">🎾 Set Up A Match</button>'+
      '</div>';
  }catch(e){
    if(el) el.innerHTML='<div style="color:#888;font-size:13px;padding:16px;text-align:center;">Could not load match data.</div>';
  }
}

async function loadDashPendingInvites(myEmail){
  const el = document.getElementById('dashPendingInvites');
  if(!el) return;
  try{
    // Matches I organized that are still open
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?organizer_email=eq.${encodeURIComponent(myEmail)}&status=neq.full&status=neq.cancelled&order=match_date.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches = res.ok ? await res.json() : [];
    const upcoming = matches.filter(m=>!isMatchPast(m));

    if(!upcoming.length){
      el.innerHTML='<div style="background:#fff;border-radius:16px;padding:16px;text-align:center;color:#888;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">No pending invites — all matches confirmed or none sent yet.</div>';
      return;
    }

    // Get responses for these matches
    const ids = upcoming.map(m=>m.id);
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=in.(${ids.join(',')})&select=match_id,player_name,player_email,response`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const responses = rRes.ok ? await rRes.json() : [];

    el.innerHTML='';
    upcoming.forEach(m=>{
      const mRes   = responses.filter(r=>r.match_id===m.id);
      const inP    = mRes.filter(r=>r.response==='in');
      const pend   = mRes.filter(r=>r.response==='pending');
      const maxNeeded = m.max_players||(m.match_type==='doubles'?4:2);
      const remaining = Math.max(0, maxNeeded - inP.length);
      const dateStr = m.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—';
      const timeStr = m.time_start ? fmt12(m.time_start) : '—';
      const remainColor = remaining===0?'#1a7a3a':remaining===1?'#fbbf24':'#f87171';

      const card = document.createElement('div');
      card.style.cssText='background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #b45309;';
      card.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'+
          '<div>'+
            '<div style="color:#111;font-size:14px;font-weight:700;">'+dateStr+' · '+timeStr+'</div>'+
            '<div style="color:var(--dim);font-size:12px;">'+(m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Doubles':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Singles')+' · '+((m.court_name&&m.court_name.toLowerCase()!=='tbd')?m.court_name:(m.court_address||'Court TBD'))+'</div>'+
          '</div>'+
          '<div style="text-align:right;">'+
            '<div style="font-size:20px;font-weight:900;color:'+remainColor+';">'+remaining+'</div>'+
            '<div style="font-size:9px;color:var(--dim);text-transform:uppercase;font-weight:700;">'+(remaining===0?'Full! 🎉':'Spot'+(remaining>1?'s':'')+' needed')+'</div>'+
          '</div>'+
        '</div>'+
        renderCountdown(m.match_date,m.time_start)+
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">'+
          '<div style="text-align:center;padding:8px 4px;border-radius:8px;background:#d1fae5;border:1px solid #1a7a3a;">'+
            '<div style="font-size:18px;font-weight:800;color:#1a7a3a;">'+inP.length+'</div>'+
            '<div style="font-size:9px;color:#1a7a3a;text-transform:uppercase;font-weight:700;">Confirmed</div>'+
            (inP.length?'<div style="font-size:9px;color:#1a7a3a;margin-top:2px;">'+inP.map(p=>(p.player_name||'').split(' ')[0]).filter(Boolean).join(', ')+'</div>':'')+
          '</div>'+
          '<div onclick="var n=this.querySelector(&quot;.pn&quot;);n.style.display=n.style.display===&quot;none&quot;?&quot;block&quot;:&quot;none&quot;" style="text-align:center;padding:8px 4px;border-radius:8px;background:#fff7ed;border:1px solid #b45309;cursor:pointer;" title="Tap to see who is pending">'+
            '<div style="font-size:18px;font-weight:800;color:#b45309;">'+pend.length+'</div>'+
            '<div style="font-size:9px;color:#b45309;text-transform:uppercase;font-weight:700;">Pending ▾</div>'+
            '<div class="pn" style="display:none;font-size:9px;color:#b45309;margin-top:4px;line-height:1.6;text-align:left;">'+pend.map(p=>(p.player_name||p.player_email||'').split(' ')[0]).filter(Boolean).join('<br>')+'</div>'+
          '</div>'+
          '<div style="text-align:center;padding:8px 4px;border-radius:8px;background:'+(remaining===0?'#d1fae5':'#fff1f2')+';border:1px solid '+(remaining===0?'#1a7a3a':'#e11d48')+';">'+
            '<div style="font-size:18px;font-weight:800;color:'+(remaining===0?'#1a7a3a':'#e11d48')+';">'+remaining+'</div>'+
            '<div style="font-size:9px;color:'+(remaining===0?'#1a7a3a':'#e11d48')+';text-transform:uppercase;font-weight:700;">'+(remaining===0?'Full! 🎉':'Needed')+'</div>'+
          '</div>'+
        '</div>'+
        (pend.length?
          '<button onclick="nudgePendingPlayers(this.dataset.mid)" data-mid="'+m.id+'" '+
            'style="width:100%;padding:9px;border-radius:9px;border:1px solid #b45309;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">'+
            '📣 Nudge '+pend.length+' Pending Player'+(pend.length>1?'s':'')+
          '</button>':'');
      el.appendChild(card);
    });
  }catch(e){
    if(el) el.innerHTML='<div style="color:#888;font-size:13px;padding:16px;text-align:center;">Could not load invites.</div>';
  }
}

async function loadDashInvitedToPlay(myEmail){
  const el = document.getElementById('dashInvitedToPlay');
  if(!el) return;
  try{
    const rRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?player_email=eq.${encodeURIComponent(myEmail)}&response=eq.pending&select=match_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const pending = rRes.ok ? await rRes.json() : [];

    if(!pending.length){
      el.innerHTML='<div style="background:#fff;border-radius:16px;padding:16px;text-align:center;color:#888;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">No pending invites from other players right now.</div>';
      return;
    }

    const ids = pending.map(r=>r.match_id);
    const mRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=in.(${ids.join(',')})&status=neq.cancelled&select=*&order=match_date.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches = mRes.ok ? await mRes.json() : [];
    const upcoming = matches.filter(m=>!isMatchPast(m)&&(m.organizer_email||'').toLowerCase()!==myEmail.toLowerCase());

    if(!upcoming.length){
      el.innerHTML='<div style="background:#fff;border-radius:16px;padding:16px;text-align:center;color:#888;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">No pending invites from other players right now.</div>';
      return;
    }

    el.innerHTML='';
    upcoming.forEach(m=>{
      const dateStr = m.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—';
      const timeStr = m.time_start ? fmt12(m.time_start)+(m.time_end?' – '+fmt12(m.time_end):'') : '—';
      const card = document.createElement('div');
      card.style.cssText='background:#eff6ff;border:1px solid rgba(29,78,216,0.2);border-radius:14px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #1d4ed8;';
      card.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'+
          '<div>'+
            '<div style="color:#111;font-size:14px;font-weight:700;">'+dateStr+' · '+timeStr+'</div>'+
            '<div style="color:#555;font-size:12px;">'+(m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Doubles':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/> Singles')+'</div>'+
            '<div style="color:#555;font-size:12px;">From: <span style="color:#1d4ed8;font-weight:700;">'+(m.organizer_name||'').split(' ')[0]+'</span></div>'+
            renderCountdown(m.match_date,m.time_start)+
          '</div>'+
          '<div style="font-size:22px;">'+(m.match_type==='doubles'?'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/><img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>':'<img src="/pickleball.jpg" class="pb-icon" alt="pickleball"/>')+'</div>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
          '<button onclick="respondToMatch(this.dataset.id,\'in\')" data-id="'+m.id+'" '+
            'style="padding:10px;border-radius:10px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">'+
            '&#x2705; I\'m In!</button>'+
          '<button onclick="respondToMatch(this.dataset.id,\'out\')" data-id="'+m.id+'" '+
            'style="padding:10px;border-radius:10px;border:1px solid #ccc;background:transparent;color:#555;font-size:13px;cursor:pointer;font-family:inherit;">'+
            '&#x274C; Can\'t Make It</button>'+
        '</div>';
      el.appendChild(card);
    });
  }catch(e){
    if(el) el.innerHTML='<div style="color:#888;font-size:13px;padding:16px;text-align:center;">Could not load invites.</div>';
  }
}

function showPendingPlayersList(el, names){
  if(!names || !names.trim()) return;
  const decoded = decodeURIComponent(names);
  showToast('⏳ Pending: '+decoded, '#b45309');
}

async function nudgePendingPlayers(matchId){
  const btn = document.querySelector('[data-mid="'+matchId+'"]') || event?.target;
  if(btn){ btn.disabled=true; btn.textContent='Sending nudges…'; }
  try{
    // Get pending players for this match
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${matchId}&response=eq.pending&select=player_email,player_name`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const players = res.ok ? await res.json() : [];

    // Get match details
    const mRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=match_date,time_start,match_type,court_name&limit=1`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}});
    const matches = mRes.ok ? await mRes.json() : [];
    const m = matches[0];
    const dateStr = m?.match_date ? new Date(m.match_date+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : '';
    const timeStr = m?.time_start ? fmt12(m.time_start) : '';
    const matchUrl = window.location.origin+window.location.pathname+'?match='+matchId;
    const myName = getMyName();

    for(const p of players){
      await sendEmail({
        to_email:      p.player_email,
        type:          'match_invite',
        personal_note: myName+' is following up on their '+( m?.match_type==='doubles'?'Doubles':'Singles')+' match invite for '+dateStr+(timeStr?' at '+timeStr:'')+(m?.court_name&&m?.court_name!=='TBD'?' @ '+m.court_name:'')+'. Are you in? Please respond!',
        invite_url:    matchUrl,
      });
    }

    showToast('📣 Nudge sent to '+players.length+' player'+(players.length>1?'s':'')+'!','#fbbf24');
    if(btn){ btn.textContent='✅ Nudged!'; btn.style.color='#1a7a3a'; }
  }catch(e){
    showToast('Could not send nudge: '+e.message,'#f87171');
    if(btn){ btn.disabled=false; btn.textContent='📣 Nudge Players'; }
  }
}

// ══════════════════════════════════════════════════════
// BETA FEATURES — Banner, Feedback, Stars
// ══════════════════════════════════════════════════════

let _feedbackStar = 0;

function setFeedbackStar(val){
  _feedbackStar = val;
  document.querySelectorAll('.fb-star').forEach(s=>{
    const sv = parseInt(s.dataset.val);
    s.style.opacity = sv <= val ? '1' : '0.3';
  });
}

function openFeedbackModal(){
  const modal = document.getElementById('feedbackModal');
  if(modal){ modal.style.display='flex'; }
  // Close nav on mobile
  document.getElementById('leftNav')?.classList.remove('open');
  document.getElementById('navOverlay')?.classList.remove('visible');
  // Reset form
  _feedbackStar = 0;
  document.querySelectorAll('.fb-star').forEach(s=>s.style.opacity='0.3');
  const ft = document.getElementById('feedbackText');
  if(ft) ft.value = '';
}

function closeFeedbackModal(){
  const modal = document.getElementById('feedbackModal');
  if(modal) modal.style.display='none';
}

async function submitFeedback(){
  const text  = (document.getElementById('feedbackText')?.value||'').trim();
  const stars = _feedbackStar;
  const email = getMyEmail()||'anonymous';
  const name  = getMyName()||'Anonymous';

  if(!text && !stars){
    showToast('Please add a rating or some feedback first','#f59e0b');
    return;
  }

  const btn = document.querySelector('#feedbackModal button[onclick="submitFeedback()"]');
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }

  try{
    await fetch(`${SUPABASE_URL}/rest/v1/beta_feedback`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,
               'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
      body:JSON.stringify({
        player_email: email,
        player_name:  name,
        rating:       stars||null,
        feedback:     text||null,
        page:         document.querySelector('.page-section.active')?.id?.replace('page-','')||'unknown',
        created_at:   new Date().toISOString()
      })
    });
    closeFeedbackModal();
    showToast('Thank you for your feedback! 🙏','#4CAF7D');
  }catch(e){
    // If table doesn't exist yet, still show success — don't block the user
    closeFeedbackModal();
    showToast('Thank you for your feedback! 🙏','#4CAF7D');
    console.warn('Feedback save error (table may not exist yet):', e);
  }
  if(btn){ btn.disabled=false; btn.textContent='Submit Feedback'; }
}

function closeBetaBanner(){
  const banner = document.getElementById('betaWelcomeBanner');
  if(banner) banner.style.display='none';
  localStorage.setItem('pb_beta_banner_seen','1');
}

function maybeShowBetaBanner(){
  if(localStorage.getItem('pb_beta_banner_seen')) return;
  const banner = document.getElementById('betaWelcomeBanner');
  if(banner) banner.style.display='flex';
}

// Close feedback modal on backdrop click
document.addEventListener('click', function(e){
  const modal = document.getElementById('feedbackModal');
  if(modal && e.target===modal) closeFeedbackModal();
  const banner = document.getElementById('betaWelcomeBanner');
  if(banner && e.target===banner) closeBetaBanner();
});


// ══════════════════════════════════════════════════════════════
// PART 1 — Organizer flag helpers
// ══════════════════════════════════════════════════════════════

function updateOrganizerNav(){
  const isOrg = !!(SESSION_PLAYER?.is_organizer);
  const navDiv = document.getElementById('organizerNav');
  if(navDiv) navDiv.style.display = isOrg ? 'block' : 'none';
}

function updateNavForUserType(){
  const isOrganizer   = !!(SESSION_PLAYER?.is_organizer);
  const wantsOrganizer = !!(SESSION_PLAYER?.wants_organizer);

  // Nav items that require organizer status
  const organizerOnlyItems = ['setupMatch','myInvites','myGroups','recurringMatches'];

  organizerOnlyItems.forEach(pageId => {
    const el = document.getElementById('nav-' + pageId);
    if(!el) return;
    if(isOrganizer){
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.cursor = '';
      el.title = el.getAttribute('title') || '';
      el.onclick = function(){ showPage(pageId); };
    } else if(wantsOrganizer){
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      el.title = 'Complete your profile to unlock Court Captain tools';
      el.onclick = function(e){
        e.stopPropagation();
        showToast('Complete your full profile to unlock Court Captain tools 🏓','#1a7a3a');
        showCourtCaptainNudge(SESSION_PLAYER?.email || getMyEmail());
      };
    } else {
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'default';
      el.title = 'Organizer feature — become a Court Captain to unlock';
      el.onclick = function(e){
        e.stopPropagation();
        showToast('These tools are for Court Captains. Ask your organizer about setting up matches! 🎾','#6b7280');
      };
    }
  });

  // Gray the Organizer section label for non-organizers
  const orgSection = document.getElementById('organizerNav');
  if(orgSection){
    const label = orgSection.querySelector('.nav-section-label');
    if(label) label.style.opacity = isOrganizer ? '1' : '0.5';
  }
}

// ══════════════════════════════════════════════════════════════
// PART 2 — Named Groups (player_groups + player_group_members)
// ══════════════════════════════════════════════════════════════

let _groups = [];   // cache for the current session

// ── Load + render ────────────────────────────────────────────

async function loadMyGroups(){
  const myEmail = getMyEmail();
  const container = document.getElementById('myGroupsList');
  if(!container || !myEmail) return;
  container.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:20px 0;">Loading groups…</div>';
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/player_groups?organizer_email=eq.${encodeURIComponent(myEmail)}&order=created_at.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const groups = res.ok ? await res.json() : [];
    _groups = groups;
    // Update nav badge
    const badge = document.getElementById('navGroupsBadge');
    if(badge){ badge.textContent = groups.length; badge.style.display = groups.length ? 'inline-flex' : 'none'; }
    if(!groups.length){
      container.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:20px 0;text-align:center;">No groups yet.<br>Create your first named group to use it in Set Up A Match.</div>';
      return;
    }
    // Load members for all groups in one pass
    const ids = groups.map(g=>g.id);
    const mRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_group_members?group_id=in.(${ids.join(',')})&order=role.asc,created_at.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const allMembers = mRes.ok ? await mRes.json() : [];

    // Batch-fetch public_profiles for any member emails not already in IC_MEMBERS
    const icEmailSet = new Set(IC_MEMBERS.map(({player})=>(player.email||'').toLowerCase()));
    const missingEmails = [...new Set(allMembers.map(m=>m.player_email).filter(e=>e && !icEmailSet.has(e.toLowerCase())))];
    let profileMap = {};
    if(missingEmails.length){
      try{
        const pRes = await fetch(
          `${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${missingEmails.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name,last_name,gender`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        if(pRes.ok){
          (await pRes.json()).forEach(p=>{ profileMap[(p.email||'').toLowerCase()] = p; });
        }
      }catch(_){}
    }

    container.innerHTML = '';
    groups.forEach(g=>{
      const members = allMembers.filter(m=>m.group_id===g.id);
      container.appendChild(buildGroupCard(g, members, profileMap));
    });
  }catch(e){
    container.innerHTML = '<div style="color:#f87171;font-size:13px;padding:20px 0;">Error loading groups.</div>';
  }
}

function buildGroupCard(group, members, profileMap){
  profileMap = profileMap || {};
  const myEmail   = (getMyEmail()||'').toLowerCase();
  const primaries = members.filter(m=>m.role==='primary');
  const subs      = members.filter(m=>m.role==='sub');

  // Gender breakdown of primary members via IC_MEMBERS lookup + profileMap fallback
  const priGenders = primaries.map(m=>{
    const email = (m.player_email||'').toLowerCase();
    const ic = IC_MEMBERS.find(({player})=>(player.email||'').toLowerCase()===email);
    if(ic) return (ic.player.gender||'').toLowerCase();
    const prof = profileMap[email];
    return prof ? (prof.gender||'').toLowerCase() : '';
  });
  const priMen   = priGenders.filter(g=>g==='male').length;
  const priWomen = priGenders.filter(g=>g==='female'||g==='woman').length;
  const priOther = primaries.length - priMen - priWomen;
  const genderBreakdown = primaries.length > 0
    ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;margin-bottom:2px;">'+
        '<span style="background:#dbeafe;border:1px solid #93c5fd;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;color:#1e40af;">👨 '+priMen+'</span>'+
        '<span style="background:#fce7f3;border:1px solid #f9a8d4;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;color:#9d174d;">👩 '+priWomen+'</span>'+
        (priOther>0?'<span style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;color:#6b7280;">❓ '+priOther+'</span>':'')+
      '</div>'
    : '';

  // FIX 4: Type badge
  const gType = group.group_type || 'set';
  const mType = group.match_type || 'doubles';
  const typeIcon  = gType === 'random' ? '🎲' : '🎯';
  const typeLabel = typeIcon + ' ' + (gType === 'random' ? 'Open Group' : 'Set') + ' · ' + (mType === 'singles' ? 'Singles' : 'Doubles');
  const typeBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;border:1px solid #d1d5db;font-size:10px;font-weight:700;color:#374151;margin-top:4px;">'+typeLabel+'</span>';

  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);';
  card.innerHTML =
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">' +
      '<div>' +
        '<div style="font-size:16px;font-weight:800;color:#111;">'+group.name+'</div>' +
        '<div style="font-size:11px;color:var(--dim);margin-top:2px;">'+group.max_players+'-player group &nbsp;'+typeBadge+'</div>' +
        genderBreakdown +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button onclick="editGroupModal(\''+group.id+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid #d1d5db;background:#f9fafb;color:#374151;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✏️ Edit</button>' +
        '<button onclick="deleteGroup(\''+group.id+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✕</button>' +
      '</div>' +
    '</div>' +
    // FIX 2: Organizer gets red chip; others get green
    (primaries.length ? '<div style="margin-bottom:6px;"><span style="font-size:10px;font-weight:700;color:#1a7a3a;text-transform:uppercase;letter-spacing:.05em;">Primary ('+primaries.length+')</span><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">'+primaries.map(m=>{
      const isOrg = (m.player_email||'').toLowerCase() === myEmail;
      const chipBg     = isOrg ? '#fee2e2' : '#d1fae5';
      const chipBorder = isOrg ? '#fca5a5' : '#6ee7b7';
      const chipColor  = isOrg ? '#991b1b' : '#065f46';
      const chipLabel  = isOrg ? '👑 ' + (m.player_name||'Organizer') : (m.player_name||m.player_email||'—');
      return '<span style="padding:3px 9px;border-radius:999px;background:'+chipBg+';border:1px solid '+chipBorder+';font-size:11px;color:'+chipColor+';font-weight:600;">'+chipLabel+'</span>';
    }).join('')+'</div></div>' : '') +
    (subs.length ? '<div><span style="font-size:10px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.05em;">Sub Pool ('+subs.length+')</span><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">'+subs.map(m=>'<span style="padding:3px 9px;border-radius:999px;background:#fef3c7;border:1px solid #fde68a;font-size:11px;color:#92400e;font-weight:600;">'+m.player_name+(m.sub_category?' · '+m.sub_category:'')+'</span>').join('')+'</div></div>' : '') +
    (group.notes ? '<div style="margin-top:8px;font-size:12px;color:var(--dim);">'+group.notes+'</div>' : '');
  return card;
}

// ── Create / Edit modal ───────────────────────────────────────

async function showCreateGroupModal(){
  // Ensure IC members are loaded before opening the picker
  if(!IC_MEMBERS.length){
    const myEmail = getMyEmail();
    if(myEmail){
      try{
        const connsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/connections?or=(requester_email.eq.${encodeURIComponent(myEmail)},recipient_email.eq.${encodeURIComponent(myEmail)})&status=eq.accepted&select=requester_email,recipient_email`,
          {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
        );
        if(connsRes.ok){
          const conns = await connsRes.json();
          const others = conns.map(c=>c.requester_email===myEmail?c.recipient_email:c.requester_email);
          if(others.length){
            const pr = await fetch(
              `${SUPABASE_URL}/rest/v1/public_profiles?email=in.(${others.map(e=>encodeURIComponent(e)).join(',')})&select=email,first_name,last_name,nickname,avatar_emoji,skill_level,gender,city,state`,
              {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
            );
            if(pr.ok){ IC_MEMBERS = (await pr.json()).map(player=>({player})); }
          }
        }
      }catch(e){}
    }
  }
  _openGroupModal(null, null);
}

async function editGroupModal(groupId){
  const group = _groups.find(g=>g.id===groupId);
  if(!group) return;
  // Load members
  const mRes = await fetch(
    `${SUPABASE_URL}/rest/v1/player_group_members?group_id=eq.${groupId}&order=role.asc,created_at.asc`,
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
  );
  const members = mRes.ok ? await mRes.json() : [];
  _openGroupModal(group, members);
}

function _openGroupModal(group, members){
  document.getElementById('groupModal')?.remove();
  const isEdit   = !!group;
  const icPlayers = IC_MEMBERS.map(({player})=>player);
  const myEmail  = getMyEmail();
  const myPlayer = SESSION_PLAYER;
  const myName   = ((myPlayer?.first_name||'')+(myPlayer?.last_name?' '+myPlayer.last_name:'')).trim()||myEmail;

  // Initialize state — size is derived from numCourts × matchType
  window.gModalMatchType = group?.match_type  || 'doubles';
  window.gModalType      = group?.group_type  || 'set';
  {
    const _ppc = window.gModalMatchType === 'doubles' ? 4 : 2;
    const _savedMaxP = group?.max_players || 4;
    window.gModalNumCourts = Math.max(1, Math.min(4, Math.round(_savedMaxP / _ppc)));
    window.gModalSize      = window.gModalNumCourts * _ppc;
  }

  // selected = IC member emails chosen as primary players (organizer is implicit, always slot 1)
  const selected = new Set(
    members ? members.filter(m=>m.role==='primary' && m.player_email!==myEmail).map(m=>m.player_email) : []
  );
  // subs = IC member emails chosen as subs/backups
  const subs = new Set(
    members ? members.filter(m=>m.role==='sub').map(m=>m.player_email) : []
  );

  // ── Open Group state ─────────────────────────────────────────
  // Pre-populate from existing members when editing an Open Group
  const openSelected = new Set(
    members ? members.filter(m=>m.role==='primary' && m.player_email!==myEmail).map(m=>m.player_email) : []
  );
  window.gModalInviteMode     = 'specific';
  window.gModalUseLevelFilter = false;
  window.gModalLevels         = new Set(['my_level']);

  // ── Level / pool helpers (used by Open Group section) ───────
  function _gFmtSkill(val){
    const n = Math.round(val * 100) / 100;
    return n % 1 === 0 ? n.toFixed(1) : String(n);
  }
  function _gGetLevelFilteredIC(){
    const os = parseFloat(myPlayer?.skill_self || 0);
    if(!window.gModalUseLevelFilter || !os || !window.gModalLevels.size) return icPlayers;
    return icPlayers.filter(p=>{
      const ps = parseFloat(p.skill_level || p.skill_self || 0);
      if(!ps) return false;
      const d = ps - os;
      const L = window.gModalLevels;
      return (L.has('below_half') && d <= -0.375) ||
             (L.has('below_quarter') && d > -0.375 && d <= -0.125) ||
             (L.has('my_level')      && d > -0.125 && d <=  0.125) ||
             (L.has('above_quarter') && d >  0.125 && d <=  0.375) ||
             (L.has('above_half')    && d >  0.375);
    });
  }
  function _gGetAutoPool(mode){
    const filtered = _gGetLevelFilteredIC();
    const og = (myPlayer?.gender||'').toLowerCase();
    if(mode==='same')  return filtered.filter(p=>(p.gender||'').toLowerCase()===og);
    if(mode==='mixed'){
      const men   = filtered.filter(p=>(p.gender||'').toLowerCase()==='male');
      const women = filtered.filter(p=>['female','woman'].includes((p.gender||'').toLowerCase()));
      return [...men,...women];
    }
    return filtered; // everyone
  }
  function _gAutoFillOpenSelected(mode){
    if(mode==='specific') return;
    const pool = _gGetAutoPool(mode);
    openSelected.clear();
    pool.forEach(p=>openSelected.add(p.email));
  }
  // ── Summary grid for group modal (mirrors buildSmInviteSummaryGrid) ─
  function buildGroupSummaryGrid(){
    const isOpen    = window.gModalType === 'random';
    const mode      = window.gModalInviteMode;
    const minNeeded = window.gModalSize - 1; // organizer already counted
    const myGender  = (myPlayer?.gender || '').toLowerCase();

    const rowBg  = ok => ok ? 'background:#f0fdf4;' : 'background:#fffbeb;';
    const valClr = ok => ok ? 'color:#16a34a;'       : 'color:#d97706;';
    const thS = 'padding:5px 8px;font-weight:700;color:#6b7280;font-size:11px;border-bottom:1px solid #e5e7eb;';
    const tdL = 'padding:6px 8px;font-weight:600;color:#111;font-size:12px;border-bottom:1px solid #f3f4f6;';
    const tdN = 'padding:6px 8px;text-align:center;font-weight:700;color:#374151;font-size:12px;border-bottom:1px solid #f3f4f6;';
    const tdV = ok => `padding:6px 8px;text-align:center;font-weight:700;font-size:12px;border-bottom:1px solid #f3f4f6;${valClr(ok)}`;
    const hdr = isOpen ? 'In Pool' : 'Selected';
    const tableWrap =
      '<div style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">'+
      '<table style="width:100%;border-collapse:collapse;">'+
      '<thead><tr style="background:#f9fafb;">'+
      `<th style="${thS}text-align:left;"></th>`+
      `<th style="${thS}text-align:center;">Needed</th>`+
      `<th style="${thS}text-align:center;">${hdr}</th>`+
      '</tr></thead><tbody>';
    const tableClose = '</tbody></table></div>';

    // Build email→player map for reliable case-insensitive gender lookup (CHANGE 2)
    const _playerByEmail = new Map(icPlayers.map(p => [(p.email||'').toLowerCase(), p]));

    let html = '', allGreen = false;

    if(isOpen){
      // Open Group — advisory only, never gates button
      const selCount = openSelected.size;
      if(mode === 'mixed'){
        let invMen = 0, invWomen = 0;
        openSelected.forEach(email => {
          const p = _playerByEmail.get((email||'').toLowerCase());
          if(!p) return;
          const g = (p.gender||'').toLowerCase();
          if(g === 'man') invMen++;
          else if(g === 'woman') invWomen++;
        });
        const half = Math.floor(window.gModalSize / 2);
        let menNeeded, womenNeeded;
        if(myGender === 'man')        { menNeeded = half - 1; womenNeeded = half; }
        else if(myGender === 'woman') { womenNeeded = half - 1; menNeeded = half; }
        else                           { menNeeded = Math.floor(minNeeded / 2); womenNeeded = Math.ceil(minNeeded / 2); }
        const menOk   = invMen   >= menNeeded;
        const womenOk = invWomen >= womenNeeded;
        allGreen = true; // advisory only
        html = tableWrap +
          `<tr style="${rowBg(menOk)}"><td style="${tdL}">👨 Men</td><td style="${tdN}">${menNeeded}</td><td style="${tdV(menOk)}">${invMen}</td></tr>`+
          `<tr style="${rowBg(womenOk)}"><td style="${tdL}">👩 Women</td><td style="${tdN}">${womenNeeded}</td><td style="${tdV(womenOk)}">${invWomen}</td></tr>`+
          tableClose;
      } else if(mode === 'same'){
        let invSame = 0;
        openSelected.forEach(email => {
          const p = _playerByEmail.get((email||'').toLowerCase());
          if(!p) return;
          if((p.gender||'').toLowerCase() === myGender) invSame++;
        });
        const ok = invSame >= minNeeded;
        allGreen = true; // advisory only
        const lbl = myGender === 'man' ? '👨 Men' : myGender === 'woman' ? '👩 Women' : '👥 Players';
        html = tableWrap +
          `<tr style="${rowBg(ok)}"><td style="${tdL}">${lbl}</td><td style="${tdN}">${minNeeded}</td><td style="${tdV(ok)}">${invSame}</td></tr>`+
          tableClose;
      } else {
        const ok = selCount >= minNeeded;
        allGreen = true; // advisory only
        html = tableWrap +
          `<tr style="${rowBg(ok)}"><td style="${tdL}">👥 Players</td><td style="${tdN}">${minNeeded}</td><td style="${tdV(ok)}">${selCount}</td></tr>`+
          tableClose;
      }
    } else {
      // Set Group — gates Create Group button
      const selCount = selected.size;
      const ok = selCount >= minNeeded;
      allGreen = ok;
      html = tableWrap +
        `<tr style="${rowBg(ok)}"><td style="${tdL}">👥 Players</td><td style="${tdN}">${minNeeded}</td><td style="${tdV(ok)}">${selCount}</td></tr>`+
        tableClose;
    }

    return { html, allGreen };
  }

  // ── 5-column level grid for player selection (both group types) ─
  function buildGroupInviteGrid(){
    const isOpen   = window.gModalType === 'random';
    const selSet   = isOpen ? openSelected : selected;
    const mySkill  = parseFloat(myPlayer?.skill_self || myPlayer?.skill_level || 0);
    const myGender = (myPlayer?.gender || '').toLowerCase();
    const mode     = window.gModalInviteMode;

    // Filter pool: Same Gender mode shows only matching gender; Set Group excludes subs
    let pool;
    if(!isOpen){
      pool = icPlayers.filter(p => !subs.has(p.email)); // mutual exclusivity: subs not in primary
    } else if(mode === 'same'){
      pool = icPlayers.filter(p => (p.gender||'').toLowerCase() === myGender);
    } else {
      pool = icPlayers;
    }

    // Bucket players by skill relative to organizer
    const buckets = [
      { key:'far_below', label:'.5+ Below My Level', members:[] },
      { key:'below',     label:'.25 Below My Level', members:[] },
      { key:'my_level',  label:'My Level',            members:[], center:true },
      { key:'above',     label:'.25 Above My Level',  members:[] },
      { key:'far_above', label:'.5+ Above My Level',  members:[] },
    ];
    const unrated = [];
    pool.forEach(p => {
      const s = parseFloat(p.skill_self || p.skill_level || 0);
      if(!s || !mySkill){ unrated.push(p); return; }
      const diff = s - mySkill;
      if     (diff <= -0.375) buckets[0].members.push(p);
      else if(diff <= -0.125) buckets[1].members.push(p);
      else if(diff <=  0.125) buckets[2].members.push(p);
      else if(diff <=  0.375) buckets[3].members.push(p);
      else                    buckets[4].members.push(p);
    });

    // Skill reference values shown under each column header — rounded to nearest 0.25
    const _fmtSkillVal = v => { const r = Math.round(v * 4) / 4; return r % 1 === 0 ? r.toFixed(1) : String(r); };
    const ranges = mySkill ? [
      `≤ ${_fmtSkillVal(mySkill - 0.50)}`,
      `${_fmtSkillVal(mySkill - 0.25)}`,
      `${_fmtSkillVal(mySkill)}`,
      `${_fmtSkillVal(mySkill + 0.25)}`,
      `≥ ${_fmtSkillVal(mySkill + 0.50)}`,
    ] : ['','','','',''];

    // Column-header bucket toggle handler
    window._gToggleGroupBucket = function(emailsJson){
      const emails = JSON.parse(emailsJson);
      const allSel = emails.every(e => selSet.has(e));
      if(allSel){
        emails.forEach(e => selSet.delete(e));
      } else if(isOpen){
        emails.forEach(e => selSet.add(e));
      } else {
        // Set Group: respect size limit
        for(const e of emails){
          if(!selSet.has(e)){
            if(1 + selSet.size >= window.gModalSize){
              showToast('Group is full — increase the size or deselect someone','#f59e0b');
              break;
            }
            selSet.add(e);
            subs.delete(e);
          }
        }
      }
      render();
    };

    // Column state helper
    const colState = bkt => {
      if(!bkt.members.length) return 'empty';
      const n = bkt.members.filter(p => selSet.has(p.email)).length;
      if(n === bkt.members.length) return 'all';
      if(n === 0) return 'none';
      return 'partial';
    };

    // Individual pill builder
    const pill = (email, name) => {
      const sel       = selSet.has(email);
      const safeEmail = email.replace(/'/g,"\\'");
      const safeName  = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const ps  = sel
        ? 'background:#1a7a3a;color:#fff;border:1px solid #1a7a3a;'
        : 'background:#fff;color:#374151;border:1px solid #d1d5db;';
      const clickFn = isOpen
        ? `window._gToggleOpenPlayer('${safeEmail}')`
        : `window._gTogglePlayer('${safeEmail}','${safeName}')`;
      return `<div onclick="${clickFn}" style="${ps}border-radius:999px;padding:3px 7px;font-size:11px;font-weight:600;margin-bottom:3px;cursor:pointer;text-align:center;user-select:none;">${name}</div>`;
    };

    // Build grid HTML
    const sg = buildGroupSummaryGrid();
    let html = sg.html + '<div style="overflow-x:auto;margin-bottom:10px;">';
    html += '<table style="width:100%;border-collapse:separate;border-spacing:3px 0;table-layout:fixed;">';
    html += '<thead><tr>';
    buckets.forEach((bkt, i) => {
      const state = colState(bkt);
      const hBg = state === 'all'     ? 'background:#1a7a3a;color:#fff;'
                : state === 'partial' ? 'background:#fef3c7;border:1.5px solid #f59e0b;color:#92400e;'
                : bkt.center          ? 'background:#d1fae5;color:#1a7a3a;'
                :                       'background:#f1f5f9;color:#374151;';
      const emails          = bkt.members.map(p => p.email);
      const emailsJson      = JSON.stringify(emails);
      const emailsJsonAttr  = emailsJson.replace(/"/g, '&quot;'); // safe for double-quoted onclick attr
      // Open Group only — Set Group headers are visible but not tappable (CHANGE 2)
      const click  = (emails.length && isOpen) ? `onclick="window._gToggleGroupBucket('${emailsJsonAttr}')" ` : '';
      const cursor = (emails.length && isOpen) ? 'cursor:pointer;' : '';
      html += `<th ${click}style="${hBg}${cursor}border-radius:8px 8px 0 0;padding:5px 3px;text-align:center;font-weight:800;user-select:none;">`;
      html += `<div style="font-size:10px;">${bkt.label}</div>`;
      if(ranges[i]) html += `<div style="font-size:9px;opacity:.65;margin-top:1px;">${ranges[i]}</div>`;
      html += '</th>';
    });
    html += '</tr></thead>';
    html += '<tbody><tr>';
    buckets.forEach(bkt => {
      html += '<td style="vertical-align:top;padding:4px 1px;">';
      if(bkt.members.length){
        bkt.members.forEach(p => {
          const name = ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()||p.email;
          html += pill(p.email, name);
        });
      } else {
        html += '<div style="font-size:10px;color:#9ca3af;text-align:center;padding-top:4px;">—</div>';
      }
      html += '</td>';
    });
    html += '</tr></tbody></table></div>';

    // Unrated row
    if(unrated.length){
      html += '<div style="margin-bottom:10px;">';
      html += '<div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Unrated</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      unrated.forEach(p => {
        const name = ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()||p.email;
        html += pill(p.email, name);
      });
      html += '</div></div>';
    }

    // Empty state
    if(!pool.length){
      html += '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">No Inner Circle members yet.</div>';
    }

    // Counter
    const selCount  = selSet.size;
    const minNeeded = window.gModalSize - 1; // organizer already counted
    const cntOk     = isOpen ? selCount >= minNeeded : selCount >= minNeeded;
    const cntColor  = cntOk ? 'color:#16a34a;font-weight:700;' : 'color:#d97706;font-weight:600;';
    html += `<div style="${cntColor}font-size:13px;text-align:center;margin-bottom:4px;">${selCount} player${selCount!==1?'s':''} selected${cntOk?' ✓':''}</div>`;

    // Open Group advisory messaging (CHANGE 3) — no "subs" language
    if(isOpen){
      if(selCount < minNeeded){
        const moreNeeded = minNeeded - selCount;
        html += `<div style="margin-top:6px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;line-height:1.5;">Select at least ${moreNeeded} more player${moreNeeded!==1?'s':''} to continue.</div>`;
      } else if(selCount < 2 * minNeeded){
        html += `<div style="margin-top:6px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;line-height:1.5;">For best results, invite more players than the minimum. Open Groups fill spots first-come-first-serve — extra invites ensure you always have enough players for a great match.</div>`;
      }
      // 2× minimum or above: no advisory
    }

    return html;
  }

  // ── 5-column level grid for sub pool (Set Group only) ─
  function buildGroupSubPoolGrid(){
    const mySkill = parseFloat(myPlayer?.skill_self || myPlayer?.skill_level || 0);
    // Pool: IC members not in primary (selected) — mutual exclusivity
    const pool = icPlayers.filter(p => !selected.has(p.email));

    const buckets = [
      { key:'far_below', label:'Far Below', members:[] },
      { key:'below',     label:'Below',     members:[] },
      { key:'my_level',  label:'My Level',  members:[], center:true },
      { key:'above',     label:'Above',     members:[] },
      { key:'far_above', label:'Far Above', members:[] },
    ];
    const unrated = [];
    pool.forEach(p => {
      const s = parseFloat(p.skill_self || p.skill_level || 0);
      if(!s || !mySkill){ unrated.push(p); return; }
      const diff = s - mySkill;
      if     (diff <= -0.375) buckets[0].members.push(p);
      else if(diff <= -0.125) buckets[1].members.push(p);
      else if(diff <=  0.125) buckets[2].members.push(p);
      else if(diff <=  0.375) buckets[3].members.push(p);
      else                    buckets[4].members.push(p);
    });

    window._gToggleSubBucket = function(emailsJson){
      const emails = JSON.parse(emailsJson);
      const allSel = emails.every(e => subs.has(e));
      if(allSel){ emails.forEach(e => subs.delete(e)); }
      else       { emails.forEach(e => subs.add(e)); }
      render();
    };

    const colState = bkt => {
      if(!bkt.members.length) return 'empty';
      const n = bkt.members.filter(p => subs.has(p.email)).length;
      if(n === bkt.members.length) return 'all';
      if(n === 0) return 'none';
      return 'partial';
    };

    const fmtR = v => v.toFixed(2);
    const ranges = mySkill ? [
      `< ${fmtR(mySkill - 0.375)}`,
      `${fmtR(mySkill - 0.375)} – ${fmtR(mySkill - 0.125)}`,
      `${fmtR(mySkill - 0.125)} – ${fmtR(mySkill + 0.125)}`,
      `${fmtR(mySkill + 0.125)} – ${fmtR(mySkill + 0.375)}`,
      `> ${fmtR(mySkill + 0.375)}`,
    ] : ['','','','',''];

    const subPill = (email, name) => {
      const on = subs.has(email);
      const safeEmail = email.replace(/'/g,"\\'");
      const safeName  = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const ps = on
        ? 'background:#fef3c7;color:#92400e;border:1px solid #d97706;'
        : 'background:#fff;color:#374151;border:1px solid #d1d5db;';
      return `<div onclick="window._gToggleSub('${safeEmail}','${safeName}')" style="${ps}border-radius:999px;padding:3px 7px;font-size:11px;font-weight:600;margin-bottom:3px;cursor:pointer;text-align:center;user-select:none;">${name}</div>`;
    };

    let html = '<div style="overflow-x:auto;margin-bottom:10px;">';
    html += '<table style="width:100%;border-collapse:separate;border-spacing:3px 0;table-layout:fixed;">';
    html += '<thead><tr>';
    buckets.forEach((bkt, i) => {
      const state = colState(bkt);
      const hBg = state === 'all'     ? 'background:#d97706;color:#fff;'
                : state === 'partial' ? 'background:#fef3c7;border:1.5px solid #f59e0b;color:#92400e;'
                : bkt.center          ? 'background:#fef9c3;color:#92400e;'
                :                       'background:#f1f5f9;color:#374151;';
      const emails         = bkt.members.map(p => p.email);
      const emailsJson     = JSON.stringify(emails);
      const emailsJsonAttr = emailsJson.replace(/"/g, '&quot;'); // safe for double-quoted onclick attr
      // Sub pool is Set Group only — column headers not tappable (CHANGE 2)
      const click  = '';
      const cursor = '';
      html += `<th ${click}style="${hBg}${cursor}border-radius:8px 8px 0 0;padding:5px 3px;text-align:center;font-weight:800;user-select:none;">`;
      html += `<div style="font-size:10px;">${bkt.label}</div>`;
      if(ranges[i]) html += `<div style="font-size:9px;opacity:.65;margin-top:1px;">${ranges[i]}</div>`;
      html += '</th>';
    });
    html += '</tr></thead>';
    html += '<tbody><tr>';
    buckets.forEach(bkt => {
      html += '<td style="vertical-align:top;padding:4px 1px;">';
      if(bkt.members.length){
        bkt.members.forEach(p => {
          const name = ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()||p.email;
          html += subPill(p.email, name);
        });
      } else {
        html += '<div style="font-size:10px;color:#9ca3af;text-align:center;padding-top:4px;">—</div>';
      }
      html += '</td>';
    });
    html += '</tr></tbody></table></div>';

    if(unrated.length){
      html += '<div style="margin-bottom:10px;">';
      html += '<div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Unrated</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      unrated.forEach(p => {
        const name = ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim()||p.email;
        html += subPill(p.email, name);
      });
      html += '</div></div>';
    }

    if(!pool.length){
      html += '<div style="padding:10px;text-align:center;color:#9ca3af;font-size:13px;">All IC members are already in the primary group.</div>';
    }

    const subCount = subs.size;
    html += `<div style="color:#d97706;font-weight:600;font-size:13px;text-align:center;margin-bottom:4px;">${subCount} sub${subCount!==1?'s':''} selected${subCount ? ' ✓' : ''}</div>`;

    return html;
  }

  function _gBuildOpenPlayerSection(){
    const mode = window.gModalInviteMode;

    // ROW 1 — Organizer
    const row1 =
      '<div style="margin-bottom:14px;">'+
        '<div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Organizer (automatically included)</div>'+
        '<button disabled style="padding:7px 14px;border-radius:999px;border:2px solid #dc2626;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;cursor:default;font-family:inherit;">'+myName+' · Organizer</button>'+
      '</div>'+
      '<div style="border-top:2px solid #333;margin-bottom:14px;"></div>';

    // ROW 2 — Selection mode
    const modeBtns = [
      {key:'specific', label:'Specific Players'},
      {key:'same',     label:'Same Gender'},
      {key:'mixed',    label:'Mixed'},
      {key:'everyone', label:'Everyone'},
    ];
    const row2 =
      '<div style="margin-bottom:14px;">'+
        '<div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Who to Invite?</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">'+
          modeBtns.map(b=>{
            const on = (mode===b.key);
            return '<button onclick="window._gSwitchInviteMode(\''+b.key+'\')" '+
              'style="padding:8px 14px;border-radius:10px;border:2px solid '+(on?'#1a7a3a':'#d1d5db')+
              ';background:'+(on?'#d1fae5':'#f9fafb')+
              ';color:'+(on?'#1a7a3a':'#6b7280')+
              ';font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">'+b.label+'</button>';
          }).join('')+
        '</div>'+
      '</div>'+
      '<div style="border-top:2px solid #333;margin-bottom:14px;"></div>';

    return row1 + row2 + buildGroupInviteGrid();
  }

  const overlay = document.createElement('div');
  overlay.id = 'groupModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:flex-end;justify-content:center;';

  const sheet = document.createElement('div');
  sheet.style.cssText = 'background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;padding:24px 20px 32px;';

  function render(){
    // Always recompute size from numCourts × matchType so they stay in sync
    window.gModalSize = window.gModalNumCourts * (window.gModalMatchType === 'doubles' ? 4 : 2);
    const size      = window.gModalSize;
    const filled    = 1 + selected.size; // organizer + selected IC members
    const remaining = Math.max(0, size - filled);
    const full      = remaining === 0;
    const ctrColor  = full ? '#dc2626' : remaining === 1 ? '#d97706' : '#1a7a3a';

    sheet.innerHTML =
      // Header
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
        '<div style="font-size:18px;font-weight:800;color:#111;">'+(isEdit?'Edit Group':'Create Group')+'</div>' +
        '<button onclick="document.getElementById(\'groupModal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">✕</button>' +
      '</div>' +

      // Group name
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Group Name</label>' +
        '<input id="gModalName" type="text" placeholder="e.g. Tuesday Crew" value="'+(group?.name||'')+'" style="margin-top:6px;width:100%;background:#f9fafb;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;color:#111;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;box-sizing:border-box;"/>' +
      '</div>' +

      // Match Type (Doubles / Singles) — section 2
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Match Type</label>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          ['doubles','singles'].map(t=>{
            const on = (window.gModalMatchType === t);
            const lbl = t==='doubles' ? '2v2 Doubles' : '1v1 Singles';
            return '<button onclick="window._gSetMatchType(\''+t+'\')" style="flex:1;padding:10px 0;border-radius:10px;border:2px solid '+(on?'#1a7a3a':'#d1d5db')+';background:'+(on?'#d1fae5':'#f9fafb')+';color:'+(on?'#1a7a3a':'#6b7280')+';font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">'+lbl+'</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      // Number of Courts — section 3
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Number of Courts</label>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          [1,2,3,4].map(n=>{
            const on = (window.gModalNumCourts === n);
            return '<button onclick="window._gSetNumCourts('+n+')" style="flex:1;padding:10px 0;border-radius:10px;border:2px solid '+(on?'#1a7a3a':'#d1d5db')+';background:'+(on?'#d1fae5':'#f9fafb')+';color:'+(on?'#1a7a3a':'#6b7280')+';font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;">'+n+'</button>';
          }).join('') +
        '</div>' +
        (()=>{
          const ppc       = window.gModalMatchType === 'doubles' ? 4 : 2;
          const totalP    = window.gModalNumCourts * ppc;
          const spotsOpen = totalP - 1;
          return '<div style="font-size:12px;color:#6b7280;margin-top:8px;">'+window.gModalNumCourts+' court'+(window.gModalNumCourts!==1?'s':'')+' · '+totalP+' players total · '+spotsOpen+' spots open</div>';
        })() +
      '</div>' +

      // Group Type (Set / Open Group) — section 4
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Group Type</label>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          ['set','random'].map(t=>{
            const on = (window.gModalType === t);
            const icon = t==='set' ? '🎯' : '🎲';
            const lbl  = t==='set' ? 'Set' : 'Open Group';
            return '<button onclick="window.gModalType=\''+t+'\';window._gRender()" style="flex:1;padding:10px 0;border-radius:10px;border:2px solid '+(on?'#1a7a3a':'#d1d5db')+';background:'+(on?'#d1fae5':'#f9fafb')+';color:'+(on?'#1a7a3a':'#6b7280')+';font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">'+icon+' '+lbl+'</button>';
          }).join('') +
        '</div>' +
        '<div style="font-size:11px;color:#9ca3af;margin-top:5px;">'+(window.gModalType==='random'?'🎲 First to respond fills spots. Great for open rec play.':'🎯 Fixed roster — you control who plays each time.')+'</div>' +
      '</div>' +

      // Players section — branches on group type
      '<div style="margin-bottom:20px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:10px;">Players</label>' +
        (window.gModalType === 'random'
          ? _gBuildOpenPlayerSection()
          : (
            // ── Set Group: count header + organizer pill + level grid ─
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
              '<span style="font-size:13px;font-weight:800;color:'+ctrColor+';">' +
                (full ? '✅ Full &nbsp;'+size+' / '+size : filled+' / '+size+'&nbsp; · &nbsp;'+remaining+' spot'+(remaining===1?'':'s')+' remaining') +
              '</span>' +
            '</div>' +
            '<div style="margin-bottom:10px;">' +
              '<div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Organizer (automatically included)</div>' +
              '<button disabled style="padding:7px 14px;border-radius:999px;border:2px solid #dc2626;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;cursor:default;font-family:inherit;">'+myName+' · Organizer</button>' +
            '</div>' +
            '<div style="border-top:2px solid #333;margin-bottom:14px;"></div>' +
            buildGroupInviteGrid()
          )
        ) +
      '</div>' +

      // Sub Pool — Set group only, rendered as 5-column level grid
      (window.gModalType !== 'random' ?
      '<div style="margin-bottom:20px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Sub Pool <span style="font-weight:400;text-transform:none;color:#9ca3af;">— optional backups</span></label>' +
        '</div>' +
        buildGroupSubPoolGrid() +
      '</div>'
      : '') +

      // Notes
      '<div style="margin-bottom:20px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Notes <span style="font-weight:400;text-transform:none;color:#9ca3af;">— optional</span></label>' +
        '<input id="gModalNotes" type="text" placeholder="e.g. Rain or shine, bring your A-game" value="'+(group?.notes||'')+'" style="margin-top:6px;width:100%;background:#f9fafb;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;color:#111;font-size:14px;font-family:\'DM Sans\',sans-serif;outline:none;box-sizing:border-box;"/>' +
      '</div>' +

      '<div id="gModalError" style="display:none;margin-bottom:12px;padding:10px 14px;background:#fff1f2;border:1px solid #fca5a5;border-radius:8px;font-size:13px;color:#dc2626;font-weight:600;"></div>' +

      (()=>{
        const _isOpen    = window.gModalType === 'random';
        const _minNeeded = window.gModalSize - 1; // organizer already in
        const _btnOk     = _isOpen ? openSelected.size >= _minNeeded : buildGroupSummaryGrid().allGreen;
        const _bg        = _btnOk ? '#1a7a3a' : '#9ca3af';
        const _cursor    = _btnOk ? 'pointer'  : 'not-allowed';
        const _disabled  = _btnOk ? ''         : ' disabled';
        return `<button onclick="_gSave('${isEdit ? group.id : ''}')"${_disabled} style="width:100%;padding:14px;border-radius:12px;border:none;background:${_bg};color:#fff;font-weight:800;font-size:15px;cursor:${_cursor};font-family:'DM Sans',sans-serif;">${isEdit?'Save Changes':'Create Group'}</button>`;
      })();

    window._gRender = render;
  }

  window._gTogglePlayer = (email, name)=>{
    if(selected.has(email)){
      selected.delete(email);
    } else {
      if(1 + selected.size >= window.gModalSize){
        showToast('Group is full — increase the size or deselect someone','#f59e0b');
        return;
      }
      selected.add(email);
      subs.delete(email); // can't be both primary and sub
    }
    render();
  };

  window._gToggleSub = (email, name)=>{
    if(subs.has(email)){
      subs.delete(email);
    } else {
      subs.add(email);
    }
    render();
  };

  // ── Open Group handlers ──────────────────────────────────────
  window._gSwitchInviteMode = (mode)=>{
    // Clear all selections — clean slate on every mode switch
    openSelected.clear();
    selected.clear();
    subs.clear();
    window.gModalInviteMode = mode;
    // "Everyone" on Open Group: auto-select the full IC (CHANGE 3 & 4)
    if(mode === 'everyone' && window.gModalType === 'random'){
      icPlayers.forEach(p => openSelected.add(p.email));
    }
    render();
  };
  // Handlers that recalculate size then re-render (CHANGE 1)
  window._gSetMatchType = (t)=>{
    window.gModalMatchType = t;
    // size auto-recalculated at top of render()
    render();
  };
  window._gSetNumCourts = (n)=>{
    window.gModalNumCourts = n;
    // size auto-recalculated at top of render()
    render();
  };

  window._gToggleLevelFilter = (useLevel)=>{
    window.gModalUseLevelFilter = useLevel;
    render();
  };
  window._gToggleLevelBucket = (bucket)=>{
    if(window.gModalLevels.has(bucket)) window.gModalLevels.delete(bucket);
    else window.gModalLevels.add(bucket);
    render();
  };
  window._gToggleOpenPlayer = (email)=>{
    if(openSelected.has(email)) openSelected.delete(email);
    else openSelected.add(email);
    render();
  };

  window._gSave = async(existingId)=>{
    const name = document.getElementById('gModalName')?.value?.trim();
    if(!name){ showToast('Please enter a group name','#f59e0b'); return; }
    const isOpenGroup = window.gModalType === 'random';
    const maxP = window.gModalSize;
    const minNeeded = maxP - 1; // organizer already counted
    // Open Group: ensure minimum player count is met (button gate should prevent this, but defensive check)
    if(isOpenGroup && openSelected.size < minNeeded){
      const errEl = document.getElementById('gModalError');
      const moreNeeded = minNeeded - openSelected.size;
      const msg = 'Please select at least '+moreNeeded+' more player'+(moreNeeded!==1?'s':'')+' to create this group.';
      if(errEl){ errEl.textContent=msg; errEl.style.display='block'; errEl.scrollIntoView({behavior:'smooth',block:'nearest'}); }
      else showToast(msg,'#f59e0b');
      return;
    }
    const saveBtn = sheet.querySelector('button[onclick*="_gSave"]');
    if(saveBtn){ saveBtn.disabled=true; saveBtn.textContent='Saving…'; }
    try{
      let groupId = existingId;
      if(existingId){
        await fetch(`${SUPABASE_URL}/rest/v1/player_groups?id=eq.${existingId}`,{
          method:'PATCH',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body:JSON.stringify({name, max_players:maxP, group_type:window.gModalType, match_type:window.gModalMatchType, notes:document.getElementById('gModalNotes')?.value?.trim()||null})
        });
        await fetch(`${SUPABASE_URL}/rest/v1/player_group_members?group_id=eq.${existingId}`,{
          method:'DELETE',
          headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}
        });
      } else {
        const cr = await fetch(`${SUPABASE_URL}/rest/v1/player_groups`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=representation'},
          body:JSON.stringify({organizer_email:myEmail, name, max_players:maxP, group_type:window.gModalType, match_type:window.gModalMatchType, notes:document.getElementById('gModalNotes')?.value?.trim()||null})
        });
        const newGroup = await cr.json();
        groupId = newGroup[0]?.id || newGroup?.id;
      }
      let memberRows;
      if(isOpenGroup){
        // Open Group: save entire invite pool as primary (no sub role)
        memberRows = [
          {group_id:groupId, player_email:myEmail, player_name:myName, role:'primary'},
          ...[...openSelected].map(email=>{
            const p = IC_MEMBERS.find(({player})=>player.email===email)?.player;
            const pName = p ? ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim() : email;
            return {group_id:groupId, player_email:email, player_name:pName, role:'primary'};
          }),
        ];
      } else {
        // Set Group: organizer + selected primaries + subs
        memberRows = [
          {group_id:groupId, player_email:myEmail, player_name:myName, role:'primary'},
          ...[...selected].map(email=>{
            const p = IC_MEMBERS.find(({player})=>player.email===email)?.player;
            const pName = p ? ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim() : email;
            return {group_id:groupId, player_email:email, player_name:pName, role:'primary'};
          }),
          ...[...subs].map(email=>{
            const p = IC_MEMBERS.find(({player})=>player.email===email)?.player;
            const pName = p ? ((p.first_name||'')+(p.last_name?' '+p.last_name:'')).trim() : email;
            return {group_id:groupId, player_email:email, player_name:pName, role:'sub'};
          }),
        ];
      }
      if(memberRows.length){
        await fetch(`${SUPABASE_URL}/rest/v1/player_group_members`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
          body:JSON.stringify(memberRows)
        });
      }
      document.getElementById('groupModal')?.remove();
      showToast(existingId ? 'Group updated!' : 'Group created!','#4CAF7D');
      loadMyGroups();
    }catch(e){ showToast('Error: '+e.message,'#f87171'); if(saveBtn){saveBtn.disabled=false;saveBtn.textContent=existingId?'Save Changes':'Create Group';} }
  };

  render();
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

async function deleteGroup(groupId){
  if(!confirm('Delete this group? This cannot be undone.')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/player_groups?id=eq.${groupId}`,{
    method:'DELETE',
    headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}
  });
  showToast('Group deleted','#6b7280');
  loadMyGroups();
}

// ── Inject named group options into Set Up A Match Step 4 ─────

async function injectNamedGroupOptions(){
  const container = document.getElementById('namedGroupOptions');
  if(!container) return;
  if(!SESSION_PLAYER?.is_organizer){ container.style.display='none'; return; }
  const myEmail = getMyEmail();
  try{
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/player_groups?organizer_email=eq.${encodeURIComponent(myEmail)}&order=created_at.asc`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const groups = res.ok ? await res.json() : [];
    _groups = groups;
    if(!groups.length){ container.style.display='none'; return; }

    // Fetch members for gender check
    const ids = groups.map(g=>g.id);
    let allMembers = [];
    try{
      const mRes = await fetch(
        `${SUPABASE_URL}/rest/v1/player_group_members?group_id=in.(${ids.join(',')})&select=group_id,player_email`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      if(mRes.ok) allMembers = await mRes.json();
    }catch(_){}

    const myGender = S.gender || SESSION_PLAYER?.gender || '';
    const genderActive = MS.genderPref && MS.genderPref !== 'either';

    container.style.display='block';
    container.innerHTML =
      '<div style="font-size:11px;font-weight:700;color:#1a7a3a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">My Named Groups</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        groups.map(g=>{
          const members = allMembers.filter(m=>m.group_id===g.id);
          let genderNote = '';
          if(genderActive && members.length){
            const icMap = new Map(IC_MEMBERS.map(({player})=>[(player.email||'').toLowerCase(), player]));
            const passCount = members.filter(m=>{
              const p = icMap.get((m.email||'').toLowerCase());
              return p ? playerPassesGenderFilter(p, MS.genderPref, myGender) : true;
            }).length;
            if(passCount < members.length){
              genderNote = '<div style="font-size:9px;color:#d97706;margin-top:2px;">⚠️ '+passCount+'/'+members.length+' match pref</div>';
            }
          }
          return '<div class="match-option" data-group="named_'+g.id+'" onclick="toggleMatchGroup(\'named_'+g.id+'\',this)" style="padding:10px 12px;"><div style="font-size:13px;font-weight:700;color:#111;">🗂️ '+g.name+'</div><div style="font-size:10px;color:var(--dim);margin-top:2px;">'+g.max_players+' players</div>'+genderNote+'</div>';
        }).join('') +
      '</div>';
  }catch(e){ container.style.display='none'; }
}


// ══════════════════════════════════════════════════════════════
// PART 3 — Recurring Matches (recurring_matches table)
// ══════════════════════════════════════════════════════════════

async function loadRecurringMatches(){
  const myEmail = getMyEmail();
  const container = document.getElementById('recurringMatchesList');
  if(!container || !myEmail) return;
  container.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:20px 0;">Loading…</div>';
  try{
    const [rRes, gRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/recurring_matches?organizer_email=eq.${encodeURIComponent(myEmail)}&order=created_at.asc`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}),
      fetch(`${SUPABASE_URL}/rest/v1/player_groups?organizer_email=eq.${encodeURIComponent(myEmail)}&select=id,name`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}})
    ]);
    const schedules = rRes.ok ? await rRes.json() : [];
    _groups = gRes.ok ? await gRes.json() : [];
    if(!schedules.length){
      container.innerHTML = '<div style="color:var(--dim);font-size:13px;padding:20px 0;text-align:center;">No recurring matches yet.<br>Create one to auto-invite your group on a set schedule.</div>';
      return;
    }
    container.innerHTML = '';
    schedules.forEach(s=>container.appendChild(buildRecurringCard(s)));
  }catch(e){
    container.innerHTML = '<div style="color:#f87171;font-size:13px;padding:20px 0;">Error loading recurring matches.</div>';
  }
}

function _nextOccurrence(daysOfWeek, timeStart){
  const dayMap = {Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0};
  const days = daysOfWeek.split(',').map(d=>dayMap[d.trim()]).filter(d=>d!==undefined);
  if(!days.length) return null;
  const [h,m] = (timeStart||'12:00').split(':').map(Number);
  const now = new Date();
  for(let i=0;i<8;i++){
    const d = new Date(now); d.setDate(d.getDate()+i); d.setHours(h,m,0,0);
    if(days.includes(d.getDay()) && d > now) return d;
  }
  return null;
}

function buildRecurringCard(s){
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);';
  const isPaused = s.status==='paused';
  const nextDt = _nextOccurrence(s.days_of_week, s.time_start);
  const nextStr = nextDt ? nextDt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' '+fmt12(s.time_start) : '—';
  const daysLabel = s.days_of_week || '—';
  const autoLabel = s.auto_invite_hours+'h before';
  card.innerHTML =
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">' +
      '<div>' +
        '<div style="font-size:15px;font-weight:800;color:#111;">'+(s.group_name||'Unnamed Group')+'</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">' +
          '<span style="font-size:11px;padding:2px 8px;border-radius:999px;font-weight:700;background:'+(isPaused?'#f3f4f6':'#d1fae5')+';color:'+(isPaused?'#6b7280':'#065f46')+';border:1px solid '+(isPaused?'#d1d5db':'#6ee7b7')+';'+(isPaused?'':'')+'">'+( isPaused?'⏸ Paused':'● Active')+'</span>' +
          '<button onclick="toggleRecurringStatus(\''+s.id+'\',\''+s.status+'\')" style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid #d1d5db;background:#f9fafb;color:#374151;cursor:pointer;font-family:inherit;">'+(isPaused?'Resume':'Pause')+'</button>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button onclick="editRecurringModal(\''+s.id+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid #d1d5db;background:#f9fafb;color:#374151;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✏️</button>' +
        '<button onclick="deleteRecurring(\''+s.id+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid #fecaca;background:#fff1f2;color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✕</button>' +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">' +
      '<div style="color:var(--dim);">📅 Days</div><div style="font-weight:600;color:#111;">'+daysLabel+'</div>' +
      '<div style="color:var(--dim);">⏰ Time</div><div style="font-weight:600;color:#111;">'+fmt12(s.time_start)+' · '+s.duration_hours+'h</div>' +
      '<div style="color:var(--dim);">🏟️ Court</div><div style="font-weight:600;color:#111;">'+(s.court_name||'TBD')+'</div>' +
      '<div style="color:var(--dim);">📤 Auto-invite</div><div style="font-weight:600;color:#111;">'+autoLabel+'</div>' +
      '<div style="color:var(--dim);">📍 Next</div><div style="font-weight:600;color:#1a7a3a;">'+nextStr+'</div>' +
      '<div style="color:var(--dim);">⚠️ Gap alert</div><div style="font-weight:600;color:#111;">'+s.gap_alert_hours+'h before</div>' +
    '</div>';
  return card;
}

// ── Create / Edit recurring modal ─────────────────────────────

function showCreateRecurringModal(){ _openRecurringModal(null); }

async function editRecurringModal(id){
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/recurring_matches?id=eq.${id}&limit=1`,
    {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
  );
  const rows = res.ok ? await res.json() : [];
  if(rows.length) _openRecurringModal(rows[0]);
}

async function _openRecurringModal(rec){
  document.getElementById('recurringModal')?.remove();
  const isEdit = !!rec;
  const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const selDays  = new Set(rec ? rec.days_of_week.split(',').map(d=>d.trim()) : []);
  let selGroupId   = rec?.group_id   || '';
  let selGroupName = rec?.group_name || '';
  let selCourtId   = rec?.court_id   ? String(rec.court_id) : '';
  let selCourtName = rec?.court_name || '';

  // 12-hour time state — parse existing 24h time_start if editing
  let rmHour = 9, rmMinute = 0, rmAmPm = 'AM';
  if(rec?.time_start){
    const [hStr, mStr] = rec.time_start.split(':');
    const h24 = parseInt(hStr);
    rmAmPm  = h24 >= 12 ? 'PM' : 'AM';
    rmHour  = h24 % 12 || 12;
    rmMinute = Math.min(45, Math.round(parseInt(mStr) / 15) * 15);
  }

  // Smart auto-invite default: 2+ days/week → 1 day, once/week → 3 days
  const calcDefaultAI = () => selDays.size >= 2 ? 24 : 72;
  let selAutoInvite = rec ? (rec.auto_invite_hours || 24) : calcDefaultAI();
  let selGapAlert   = parseInt(rec?.gap_alert_hours || 24);

  // Duration state in hours (0.25 increments)
  let rmDuration = parseFloat(rec?.duration_hours || 2);
  const durLabel = d => {
    const h = Math.floor(d); const m = Math.round((d % 1) * 60);
    return m > 0 ? h+'h '+m+'m' : h+' hr'+(h!==1?'s':'');
  };

  // Fetch organizer's courts from My Courts (two-step: IDs then details)
  const myEmail = getMyEmail();
  let myCourts = [];
  try{
    const pcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_courts?player_email=eq.${encodeURIComponent(myEmail)}&select=court_id`,
      {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
    );
    const pcRows = pcRes.ok ? await pcRes.json() : [];
    const courtIds = pcRows.map(r=>r.court_id).filter(Boolean);
    if(courtIds.length){
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/courts?id=in.(${courtIds.join(',')})&select=id,name,city,state`,
        {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}}
      );
      myCourts = cRes.ok ? await cRes.json() : [];
    }
  }catch(e){}

  const overlay = document.createElement('div');
  overlay.id = 'recurringModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center;';

  const sheet = document.createElement('div');
  sheet.style.cssText = 'background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:540px;max-height:92vh;overflow-y:auto;padding:24px 20px 40px;';

  // Convert current 12h state → 24h "HH:MM" string
  const to24 = () => {
    let h = rmHour === 12 ? 0 : rmHour;
    if(rmAmPm === 'PM') h += 12;
    return String(h).padStart(2,'0') + ':' + String(rmMinute).padStart(2,'0');
  };

  // 'early' = midnight–5:59 AM, 'late' = 8:00 PM+, '' = fine
  let rmWarnAck = false; // user clicked "Yes, that's right"
  const timeWarnType = () => {
    if(rmWarnAck) return '';
    let h24 = rmHour === 12 ? 0 : rmHour;
    if(rmAmPm === 'PM') h24 += 12;
    if(h24 < 6)  return 'early';
    if(h24 >= 20) return 'late';
    return '';
  };

  // Build the acknowledge-banner HTML (empty string if no warning)
  const timeWarnHtml = () => {
    const type = timeWarnType();
    if(!type) return '';
    const timeStr = rmHour + ':' + String(rmMinute).padStart(2,'0') + ' ' + rmAmPm;
    const opposite = rmAmPm === 'AM' ? 'PM' : 'AM';
    const msg = type === 'early'
      ? '⚠️ ' + timeStr + ' is before 6 AM — most matches don\'t start that early. Did you mean ' + rmHour + ':' + String(rmMinute).padStart(2,'0') + ' PM?'
      : '⚠️ ' + timeStr + ' is after 8 PM — just double-checking this is intentional.';
    return '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 14px;margin-top:8px;">' +
      '<div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:10px;">'+msg+'</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button onclick="_rmAckWarn(\'yes\')" style="flex:1;padding:8px;border-radius:8px;border:2px solid #d97706;background:#fff;color:#92400e;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">✓ Yes, I meant '+rmAmPm+'</button>' +
        '<button onclick="_rmAckWarn(\'no\')" style="flex:1;padding:8px;border-radius:8px;border:none;background:#d97706;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">↩ No, switch to '+opposite+'</button>' +
      '</div>' +
    '</div>';
  };

  // Day label for auto-invite buttons
  const aiDayLabel = h => ({24:'1 day',48:'2 days',72:'3 days',96:'4 days'}[h] || h+'h');

  const REQ = '<span style="color:#dc2626;margin-left:2px;">*</span>'; // required indicator

  function render(){
    sheet.innerHTML =
      // ── Header ──────────────────────────────────────
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
        '<div style="font-size:18px;font-weight:800;color:#111;">'+(isEdit?'Edit Recurring Match':'New Recurring Match')+'</div>' +
        '<button onclick="document.getElementById(\'recurringModal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">✕</button>' +
      '</div>' +
      '<div style="font-size:11px;color:#9ca3af;margin-bottom:16px;"><span style="color:#dc2626;">*</span> Required</div>' +

      // ── Group picker ────────────────────────────────
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Group'+REQ+'</label>' +
        '<select id="rmGroup" onchange="_rmSetGroup(this.value,this.options[this.selectedIndex].text)" style="margin-top:6px;width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;font-family:\'DM Sans\',sans-serif;background:#f9fafb;color:#111;outline:none;">' +
          '<option value="">— Select a group —</option>' +
          _groups.map(g=>'<option value="'+g.id+'"'+(selGroupId===String(g.id)?' selected':'')+'>'+g.name+'</option>').join('') +
        '</select>' +
      '</div>' +

      // ── Days of week ────────────────────────────────
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Days of Week</label>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">' +
          ALL_DAYS.map(d=>'<button onclick="_rmToggleDay(\''+d+'\')" style="padding:6px 12px;border-radius:8px;border:2px solid '+(selDays.has(d)?'#1a7a3a':'#d1d5db')+';background:'+(selDays.has(d)?'#d1fae5':'#f9fafb')+';color:'+(selDays.has(d)?'#065f46':'#374151')+';font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">'+d+'</button>').join('') +
        '</div>' +
      '</div>' +

      // ── Start Time (12-hour selects) ────────────────
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Start Time'+REQ+'</label>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;">' +
          // Hour
          '<select id="rmHourSel" onchange="_rmSetHour(this.value)" style="flex:1;padding:10px 6px;border:1px solid #d1d5db;border-radius:10px;font-size:17px;font-weight:700;background:#f9fafb;color:#111;outline:none;text-align:center;">' +
            [1,2,3,4,5,6,7,8,9,10,11,12].map(h=>'<option value="'+h+'"'+(rmHour===h?' selected':'')+'>'+h+'</option>').join('') +
          '</select>' +
          '<span style="font-size:22px;font-weight:800;color:#374151;line-height:1;">:</span>' +
          // Minute — :00 and :30 dark green
          '<select id="rmMinSel" onchange="_rmSetMin(this.value)" style="flex:1;padding:10px 6px;border:1px solid #d1d5db;border-radius:10px;font-size:17px;font-weight:700;background:#f9fafb;color:#111;outline:none;text-align:center;">' +
            [0,15,30,45].map(m=>'<option value="'+m+'"'+(rmMinute===m?' selected':'')+
              ' style="color:'+(m===0||m===30?'#1a5c32':'#374151')+';font-weight:'+(m===0||m===30?'800':'500')+'">'+
              String(m).padStart(2,'0')+'</option>').join('') +
          '</select>' +
          // AM / PM
          '<select id="rmAmPmSel" onchange="_rmSetAmPm(this.value)" style="flex:1;padding:10px 6px;border:1px solid #d1d5db;border-radius:10px;font-size:17px;font-weight:700;background:#f9fafb;color:#111;outline:none;text-align:center;">' +
            '<option value="AM"'+(rmAmPm==='AM'?' selected':'')+'>AM</option>' +
            '<option value="PM"'+(rmAmPm==='PM'?' selected':'')+'>PM</option>' +
          '</select>' +
        '</div>' +
        timeWarnHtml() +
      '</div>' +

      // ── Duration ────────────────────────────────────
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Duration</label>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:8px;">' +
          '<button onclick="_rmAdjustDuration(-0.25)" style="width:36px;height:36px;border-radius:8px;border:2px solid #1a7a3a;background:#d1fae5;color:#1a7a3a;font-size:20px;font-weight:800;cursor:pointer;font-family:inherit;line-height:1;flex-shrink:0;">−</button>' +
          '<span id="rmDurationDisplay" style="flex:1;text-align:center;font-size:18px;font-weight:800;color:#1a7a3a;">'+durLabel(rmDuration)+'</span>' +
          '<button onclick="_rmAdjustDuration(0.25)" style="width:36px;height:36px;border-radius:8px;border:2px solid #1a7a3a;background:#d1fae5;color:#1a7a3a;font-size:20px;font-weight:800;cursor:pointer;font-family:inherit;line-height:1;flex-shrink:0;">+</button>' +
        '</div>' +
      '</div>' +

      // ── Court picker ────────────────────────────────
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Court'+REQ+'</label>' +
        (myCourts.length ?
          '<select id="rmCourtSel" onchange="_rmSetCourt(this.value,this.options[this.selectedIndex].text)" style="margin-top:6px;width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;font-family:\'DM Sans\',sans-serif;background:#f9fafb;color:#111;outline:none;">' +
            '<option value="">— Select a court —</option>' +
            myCourts.map(c=>'<option value="'+c.id+'"'+(selCourtId===String(c.id)?' selected':'')+'>'+(c.name||'Court')+(c.city?', '+c.city:'')+'</option>').join('') +
          '</select>'
          :
          '<div style="margin-top:6px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 14px;">' +
            '<div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:4px;">⚠️ No courts set up yet</div>' +
            '<div style="font-size:12px;color:#78350f;line-height:1.5;">Organizers should add their home courts in <strong>My Courts</strong> first — this ensures players always know exactly where to show up. Your courts will appear here once added.</div>' +
          '</div>'
        ) +
      '</div>' +

      // ── Auto-invite timing ──────────────────────────
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Auto-invite Timing</label>' +
        '<div style="font-size:11px;color:#6b7280;margin:3px 0 8px;">How far in advance to send the invite to your group</div>' +
        '<div style="display:flex;gap:8px;">' +
          [24,48,72,96].map(h=>{
            const on = selAutoInvite===h;
            return '<button onclick="_rmSetAutoInvite('+h+')" style="flex:1;padding:10px 4px;border-radius:10px;border:2px solid '+(on?'#1a7a3a':'#d1d5db')+';background:'+(on?'#d1fae5':'#f9fafb')+';cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:3px;">' +
              '<span style="font-size:15px;font-weight:800;color:'+(on?'#065f46':'#374151')+';">'+h+'h</span>' +
              '<span style="font-size:10px;font-weight:600;color:'+(on?'#1a7a3a':'#9ca3af')+';">'+aiDayLabel(h)+'</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      // ── Gap alert ───────────────────────────────────
      '<div style="margin-bottom:24px;">' +
        '<label style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;">Gap Alert Timing</label>' +
        '<div style="font-size:11px;color:#6b7280;margin:3px 0 6px;">Alert me this many hours before if the match isn\'t full</div>' +
        '<select id="rmGapAlert" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;background:#f9fafb;color:#111;outline:none;">' +
          [{h:12,label:'12 hours'},{h:24,label:'24 hours (1 day)'},{h:48,label:'48 hours (2 days)'},{h:72,label:'72 hours (3 days)'}]
            .map(o=>'<option value="'+o.h+'"'+(selGapAlert===o.h?' selected':'')+'>'+o.label+' before</option>').join('') +
        '</select>' +
      '</div>' +

      '<button onclick="_rmSave(\''+( isEdit?rec.id:'' )+'\')" style="width:100%;padding:14px;border-radius:12px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">'+(isEdit?'Save Changes':'Review & Create')+'</button>';

    // ── Inline handlers tied to closure state ──
    window._rmSetGroup = (id, label)=>{
      selGroupId   = id;
      selGroupName = label==='— Select a group —' ? '' : label;
    };
    window._rmAdjustDuration = delta=>{
      rmDuration = Math.min(4, Math.max(0.5, parseFloat((rmDuration + delta).toFixed(2))));
      const disp = document.getElementById('rmDurationDisplay');
      if(disp) disp.textContent = durLabel(rmDuration);
    };
    window._rmToggleDay = d=>{
      if(selDays.has(d)) selDays.delete(d); else selDays.add(d);
      if(!isEdit) selAutoInvite = calcDefaultAI(); // recalculate smart default
      render();
    };
    window._rmAckWarn = choice=>{
      if(choice==='yes'){ rmWarnAck=true; render(); }
      else { rmAmPm = rmAmPm==='AM'?'PM':'AM'; rmWarnAck=false; render(); }
    };
    window._rmSetHour  = v=>{ rmHour=parseInt(v);  rmWarnAck=false; render(); };
    window._rmSetMin   = v=>{ rmMinute=parseInt(v); rmWarnAck=false; render(); };
    window._rmSetAmPm  = v=>{ rmAmPm=v;             rmWarnAck=false; render(); };
    window._rmSetAutoInvite = h=>{ selAutoInvite=h;      render(); };
    window._rmSetCourt      = (id, label)=>{
      selCourtId   = id;
      selCourtName = label==='— Select a court —' ? '' : label;
    };
  }

  window._rmSave = async(existingId)=>{
    const gEl   = document.getElementById('rmGroup');
    const gId   = gEl?.value || '';
    const gName = gEl?.options[gEl.selectedIndex]?.text || '';
    if(!gId){ showToast('Please select a group','#f59e0b'); return; }
    if(!selDays.size){ showToast('Please select at least one day','#f59e0b'); return; }
    const cSel = document.getElementById('rmCourtSel');
    if(cSel){ if(cSel.value){ selCourtId=cSel.value; selCourtName=cSel.options[cSel.selectedIndex]?.text||''; } }
    if(selCourtName==='— Select a court —') selCourtName='';
    if(myCourts.length && !selCourtId){ showToast('Please select a court','#f59e0b'); return; }

    // Snapshot current values before showing confirm overlay
    const durVal = rmDuration;
    const gapVal = parseInt(document.getElementById('rmGapAlert')?.value || 24);

    const timeStr    = to24();
    const timeDisp   = rmHour+':'+String(rmMinute).padStart(2,'0')+' '+rmAmPm;
    const gNameClean = gName==='— Select a group —' ? '—' : gName;

    // ── Confirmation overlay ────────────────────────────────────────
    const confirmOverlay = document.createElement('div');
    confirmOverlay.id = 'rmConfirmOverlay';
    confirmOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
    confirmOverlay.innerHTML =
      '<div style="background:#fff;border-radius:20px;max-width:460px;width:100%;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<div style="font-size:26px;text-align:center;margin-bottom:6px;">🏓</div>' +
        '<div style="font-size:17px;font-weight:800;color:#111;text-align:center;margin-bottom:4px;">Let\'s make sure we got this right</div>' +
        '<div style="font-size:12px;color:#6b7280;text-align:center;margin-bottom:20px;">Review your recurring match details before saving</div>' +
        '<div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:16px;display:grid;grid-template-columns:110px 1fr;row-gap:10px;column-gap:8px;font-size:13px;">' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Group</span><span style="font-weight:700;color:#111;">'+gNameClean+'</span>' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Days</span><span style="font-weight:700;color:#111;">'+([...selDays].join(', ')||'—')+'</span>' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Start Time</span><span style="font-weight:800;color:#1a7a3a;font-size:16px;">'+timeDisp+'</span>' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Duration</span><span style="font-weight:700;color:#111;">'+durLabel(durVal)+'</span>' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Court</span><span style="font-weight:700;color:#111;">'+(selCourtName||'Not selected')+'</span>' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Auto-invite</span><span style="font-weight:700;color:#111;">'+selAutoInvite+'h ('+aiDayLabel(selAutoInvite)+') before</span>' +
          '<span style="color:#6b7280;font-weight:600;align-self:center;">Gap alert</span><span style="font-weight:700;color:#111;">'+gapVal+'h before</span>' +
        '</div>' +
        (timeWarnType() ? '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 14px;margin-bottom:16px;color:#92400e;font-size:12px;font-weight:600;">'+timeDisp+' — please double-check this time before confirming.</div>' : '') +
        '<div style="display:flex;gap:10px;">' +
          '<button onclick="document.getElementById(\'rmConfirmOverlay\').remove()" style="flex:1;padding:13px;border-radius:10px;border:2px solid #d1d5db;background:#fff;color:#374151;font-weight:700;font-size:14px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">← Go Back</button>' +
          '<button id="rmConfirmBtn" style="flex:2;padding:13px;border-radius:10px;border:none;background:#1a7a3a;color:#fff;font-weight:800;font-size:14px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">'+(existingId?'Save Changes':'Confirm & Create')+'</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(confirmOverlay);

    document.getElementById('rmConfirmBtn').onclick = async()=>{
      const btn = document.getElementById('rmConfirmBtn');
      btn.disabled=true; btn.textContent='Saving…';
      const payload = {
        organizer_email:   myEmail,
        group_id:          gId,
        group_name:        gNameClean==='—'?'':gNameClean,
        days_of_week:      [...selDays].join(','),
        time_start:        timeStr,
        duration_hours:    durVal,
        court_id:          selCourtId||null,
        court_name:        selCourtName||null,
        auto_invite_hours: selAutoInvite,
        gap_alert_hours:   gapVal,
        status:            rec?.status || 'active',
      };
      try{
        if(existingId){
          await fetch(`${SUPABASE_URL}/rest/v1/recurring_matches?id=eq.${existingId}`,{
            method:'PATCH',
            headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
            body:JSON.stringify(payload)
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/recurring_matches`,{
            method:'POST',
            headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
            body:JSON.stringify(payload)
          });
        }
        confirmOverlay.remove();
        document.getElementById('recurringModal')?.remove();
        showToast(existingId?'Updated!':'Recurring match created!','#4CAF7D');
        loadRecurringMatches();
      }catch(e){
        showToast('Error: '+e.message,'#f87171');
        document.getElementById('rmConfirmOverlay')?.remove();
      }
    };
  };

  render();
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

async function toggleRecurringStatus(id, currentStatus){
  const newStatus = currentStatus==='active' ? 'paused' : 'active';
  await fetch(`${SUPABASE_URL}/rest/v1/recurring_matches?id=eq.${id}`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN,'Prefer':'return=minimal'},
    body:JSON.stringify({status:newStatus})
  });
  showToast(newStatus==='active'?'Resumed ✅':'Paused ⏸','#4CAF7D');
  loadRecurringMatches();
}

async function deleteRecurring(id){
  if(!confirm('Delete this recurring match?')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/recurring_matches?id=eq.${id}`,{
    method:'DELETE',
    headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ACCESS_TOKEN}
  });
  showToast('Deleted','#6b7280');
  loadRecurringMatches();
}

// ── Build Badge — runtime hash from version.json (written by pre-push hook) ──
document.addEventListener('DOMContentLoaded', ()=>{
  fetch('/version.json')
    .then(r => r.json())
    .then(data => {
      const hash = (data?.hash || '').slice(0, 7);
      if(!hash || hash === 'GITHASH') return; // leave placeholder dots
      const link = document.getElementById('buildBadgeLink');
      if(link){
        link.textContent = hash;
        link.href = 'https://github.com/Thrive8/pickleball-registry/commit/' + hash;
      }
    })
    .catch(() => { /* fail silently — placeholder dots remain */ });
});
