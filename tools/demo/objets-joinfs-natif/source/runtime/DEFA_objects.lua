-- Prototype DEFA : une seule session active ; X-Plane 11.50+/12, FlyWithLua NG 64 bits.
-- Généré par export.mjs. Ne pas substituer un script reçu à un fichier mission de données.
local cfg = __MISSION_CONFIG__
local core = dofile(SCRIPT_DIRECTORY..'DEFA_objects_core.lua')
local ffi = require('ffi')
local socket = require('socket')
local lib = SYSTEM=='IBM' and 'XPLM_64' or SYSTEM=='LIN' and 'Resources/plugins/XPLM_64.so' or 'Resources/plugins/XPLM.framework/XPLM'
local X = ffi.load(lib)
ffi.cdef[[
typedef void * DEFAObj; typedef void * DEFAInst; typedef void * DEFAProbe; typedef void * DEFAData;
typedef struct {int structSize; float x,y,z,pitch,heading,roll;} DEFADraw;
typedef struct {float x,y,z,pitch,heading,roll,zoom;} DEFACamera;
typedef struct {int structSize; float locationX,locationY,locationZ,normalX,normalY,normalZ,velocityX,velocityY,velocityZ; int is_wet;} DEFAHit;
void XPLMWorldToLocal(double,double,double,double*,double*,double*);
void XPLMLocalToWorld(double,double,double,double*,double*,double*);
DEFAObj XPLMLoadObject(const char*); void XPLMUnloadObject(DEFAObj);
int XPLMLookupObjects(const char*,float,float,void (*)(const char*,void*),void*);
DEFAInst XPLMCreateInstance(DEFAObj,const char**); void XPLMDestroyInstance(DEFAInst);
void XPLMInstanceSetPosition(DEFAInst,const DEFADraw*,const float*);
DEFAProbe XPLMCreateProbe(int); void XPLMDestroyProbe(DEFAProbe);
int XPLMProbeTerrainXYZ(DEFAProbe,float,float,float,DEFAHit*);
void XPLMReadCameraPosition(DEFACamera*);
DEFAData XPLMFindDataRef(const char*); float XPLMGetDataf(DEFAData); int XPLMGetDatai(DEFAData); double XPLMGetDatad(DEFAData);
]]
local refs={}
for key,name in pairs({lat='sim/flightmodel/position/latitude',lon='sim/flightmodel/position/longitude',alt='sim/flightmodel/position/elevation',clock='sim/time/total_flight_time_sec',paused='sim/time/paused',fov='sim/graphics/view/field_of_view_deg',width='sim/graphics/view/window_width',height='sim/graphics/view/window_height'}) do refs[key]=X.XPLMFindDataRef(name) end
for _,k in ipairs({'lat','lon','alt','clock','paused'}) do assert(refs[k]~=nil,'DEFA : dataref manquante '..k) end
local udp=assert(socket.udp());udp:settimeout(0);assert(udp:setpeername('127.0.0.1',cfg.udp_port))
local run=tostring(os.time())..'-'..tostring(math.random(100000,999999))
local pending,seq={},0
local elapsed,last_clock,last_retry=0,nil,-10
local message='Objets DEFA : session '..cfg.mission
local stopped=false
local probe=X.XPLMCreateProbe(0);assert(probe~=nil,'DEFA : sonde indisponible')
local hit_ptr=ffi.new('DEFAHit[1]');local hit=hit_ptr[0];hit.structSize=ffi.sizeof('DEFAHit')
local draw_ptr=ffi.new('DEFADraw[1]');local draw=draw_ptr[0];draw.structSize=ffi.sizeof('DEFADraw')
local camera_ptr=ffi.new('DEFACamera[1]');local camera=camera_ptr[0]
local cx,cy,cz=ffi.new('double[1]'),ffi.new('double[1]'),ffi.new('double[1]')
local refs_empty=ffi.new('const char*[1]');local no_data=ffi.new('float[1]')
local function emit(o,kind,reason,pilot)
    if seq>=1000000000 then return end
    local count=0;for _ in pairs(pending) do count=count+1 end
    if count>=128 then message='Pont saturé : événements non acquittés, ouvrir le moniteur';return end
    seq=seq+1
    local e={protocol=1,session=cfg.session,token=cfg.token,mission=cfg.mission,run=run,seq=seq,type=kind,object=o.id,sim_sec=elapsed,reason=reason or 'ok'}
    if pilot then e.pilot=pilot;e.position=o.position end
    pending[seq]=core.json(e);udp:send(pending[seq]);return true
end
local function remove(o,reason)
    if o.instance then X.XPLMDestroyInstance(o.instance);o.instance=nil;emit(o,'removed',reason) end
    o.position=nil;o.in_fov=false
end
local function load(o)
    local filename
    if o.model.mode=='file' then filename=SYSTEM_DIRECTORY..o.model.path
    else
        -- Une seule variante est choisie. Les modèles composites ne sont pas gérés.
        local cb=ffi.cast('void (*)(const char*,void*)',function(p) if not filename then filename=ffi.string(p) end end)
        X.XPLMLookupObjects(o.model.path,o.lat,o.lon,cb,nil);cb:free()
    end
    if not filename then return false end
    o.object=X.XPLMLoadObject(filename)
    return o.object~=nil
end
if jit then jit.off(load,true) end
local function pilot_position()
    return {lat=X.XPLMGetDatad(refs.lat),lon=X.XPLMGetDatad(refs.lon),altitude_ft=X.XPLMGetDatad(refs.alt)*3.280839895}
end
local function update(o,pilot)
    if elapsed<o.start_delay_min*60 or elapsed>(o.start_delay_min+o.lifetime_min)*60 then remove(o,'outside_period');return end
    local lat,lon=o.lat,o.lon
    if o.motion=='axis' then lat,lon=core.destination(o,elapsed-o.start_delay_min*60) end
    -- Évite de sonder une tuile lointaine non chargée. La trajectoire continue hors de portée.
    if core.distance(pilot,{lat=lat,lon=lon})>25 then remove(o,'out_of_range');return end
    if not o.object and elapsed>=(o.retry_at or 0) then
        o.retry_at=elapsed+10
        if not load(o) then if not o.load_failed then emit(o,'spawn_failed','model_missing');o.load_failed=true end;return end
    end
    if not o.object then return end
    X.XPLMWorldToLocal(lat,lon,o.altitude_ft*.3048,cx,cy,cz)
    local x,y,z=cx[0],cy[0],cz[0]
    local result=X.XPLMProbeTerrainXYZ(probe,x,y,z,hit_ptr)
    local reason
    if o.altitude_mode~='msl' then
        if result~=0 then reason='terrain_unavailable'
        elseif o.altitude_mode=='water' and hit.is_wet==0 then reason='water_required'
        else y=hit.locationY end
    elseif result~=0 then reason='terrain_unavailable'
    elseif y<hit.locationY+o.constraints.min_clearance_ft*.3048 then reason='below_terrain' end
    if reason then remove(o,reason);if o.last_reason~=reason then emit(o,'spawn_failed',reason);o.last_reason=reason end;return end
    o.last_reason=nil
    X.XPLMLocalToWorld(x,y,z,cx,cy,cz)
    o.position={lat=cx[0],lon=cy[0],altitude_ft=cz[0]*3.280839895}
    if not o.instance then
        o.instance=X.XPLMCreateInstance(o.object,refs_empty)
        if o.instance==nil then o.instance=nil;remove(o,'instance_failed');return end
        emit(o,'spawned')
    end
    draw.x,draw.y,draw.z=x,y+o.offset_m,z
    draw.heading=(o.course_deg+o.heading_offset_deg)%360;draw.pitch=0;draw.roll=0
    X.XPLMInstanceSetPosition(o.instance,draw_ptr,no_data)
    local hfov=refs.fov~=nil and X.XPLMGetDataf(refs.fov) or 60
    local width=refs.width~=nil and X.XPLMGetDatai(refs.width) or 1920
    local height=refs.height~=nil and X.XPLMGetDatai(refs.height) or 1080
    if hfov<1 or hfov>170 then hfov=60 end
    hfov=2*math.atan(math.tan(hfov*math.pi/360)/math.max(.1,camera.zoom))*180/math.pi
    -- Approximation écran unique, non preuve de visibilité (pas d’occlusion/VR).
    local vfov=2*math.atan(math.tan(hfov*math.pi/360)*math.max(1,height)/math.max(1,width))*180/math.pi
    local near=core.distance(pilot,o.position)<=o.detection_range_nm and math.abs(pilot.altitude_ft-o.position.altitude_ft)<=o.detection_height_ft
    local visible=near and core.in_view(camera,x,y+o.offset_m,z,hfov,vfov)
    if visible and not o.in_fov and elapsed-(o.last_fov or -10)>=5 then emit(o,'candidate_fov','unverified_visibility',pilot);o.last_fov=elapsed end
    o.in_fov=visible
end
function DEFA_objects_found(index)
    local o=cfg.objects[index];local pilot=pilot_position()
    if not o or not o.instance or not o.position then message='Objet non chargé : confirmation refusée';return end
    if o.found then message='Objet déjà déclaré dans cette session';return end
    if core.distance(pilot,o.position)>o.detection_range_nm or math.abs(pilot.altitude_ft-o.position.altitude_ft)>o.detection_height_ft then message='Hors portée : objet trouvé refusé';return end
    if emit(o,'object_found','pilot_confirmation',pilot) then o.found=true;o.found_seq=seq;message=o.name..' : déclaration envoyée (attendre acquittement)' end
end
function DEFA_objects_tick()
    if stopped then return end
    local clock=X.XPLMGetDataf(refs.clock)
    if last_clock and clock<last_clock-1 then message='Nouveau vol : rechargez la session DEFA';DEFA_objects_stop();return end
    if last_clock and X.XPLMGetDatai(refs.paused)==0 then elapsed=elapsed+math.max(0,clock-last_clock) end
    last_clock=clock
    -- Au plus 16 acquittements par boucle ; la réception ne bloque jamais X-Plane.
    for _=1,16 do
        local ack=udp:receive()
        if not ack then break end
        local prefix='ACK '..cfg.session..' '..run..' '
        if ack:sub(1,#prefix)==prefix then
            local n=ack:sub(#prefix+1):match('^%d+$')
            if n then
                pending[tonumber(n)]=nil
                for _,o in ipairs(cfg.objects) do
                    if o.found_seq==tonumber(n) then message=o.name..' : confirmation reçue par le pont local' end
                end
            end
        end
    end
    local now=socket.gettime()
    if now-last_retry>=2 then for _,packet in pairs(pending) do udp:send(packet) end;last_retry=now end
    X.XPLMReadCameraPosition(camera_ptr)
    local pilot=pilot_position()
    for _,o in ipairs(cfg.objects) do update(o,pilot) end
end
function DEFA_objects_stop()
    if stopped then return end
    for _,o in ipairs(cfg.objects) do remove(o,'session_stopped');if o.object then X.XPLMUnloadObject(o.object);o.object=nil end end
    if probe then X.XPLMDestroyProbe(probe);probe=nil end
    udp:close();stopped=true
end
function DEFA_objects_window(wnd,x,y)
    imgui.TextUnformatted(message)
    imgui.TextUnformatted('Champ caméra : indicatif. Confirmez seulement ce que vous avez vu.')
    for i,o in ipairs(cfg.objects) do
        if imgui.Button('Objet en vue : '..o.name..'##'..i) then DEFA_objects_found(i) end
    end
end
function DEFA_objects_show()
    if not SUPPORTS_FLOATING_WINDOWS then message='Utilisez une commande clavier DEFA/objects/found/...';return end
    if DEFA_objects_wnd then floating_wnd_destroy(DEFA_objects_wnd) end
    DEFA_objects_wnd=floating_wnd_create(540,220,1,true)
    floating_wnd_set_title(DEFA_objects_wnd,'Objets de la mission '..cfg.mission)
    floating_wnd_set_imgui_builder(DEFA_objects_wnd,'DEFA_objects_window')
    floating_wnd_set_onclose(DEFA_objects_wnd,'DEFA_objects_closed')
end
function DEFA_objects_closed() DEFA_objects_wnd=nil end
for i,o in ipairs(cfg.objects) do create_command('DEFA/objects/found/'..o.id,'Objet en vue : '..o.name,'DEFA_objects_found('..i..')','','') end
add_macro('DEFA : objets de la mission','DEFA_objects_show()')
-- La position est mise à jour en boucle de vol, jamais dans un callback de dessin.
do_every_frame('DEFA_objects_tick()')
do_on_exit('DEFA_objects_stop()')
