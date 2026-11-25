-- Install once. Receives data from the local DEFA V3 launcher, never mission code.
local mathlib=dofile(SCRIPT_DIRECTORY..'DEFA_mission_math.lua')
local ffi=require('ffi')
local socket=require('socket')
local X=ffi.load(SYSTEM=='IBM' and 'XPLM_64' or SYSTEM=='LIN' and 'Resources/plugins/XPLM_64.so' or 'Resources/plugins/XPLM.framework/XPLM')
ffi.cdef[[
typedef void* DMObject; typedef void* DMInstance; typedef void* DMProbe; typedef void* DMData;
typedef struct {int structSize;float x,y,z,pitch,heading,roll;} DMDraw;
typedef struct {int structSize;float locationX,locationY,locationZ,normalX,normalY,normalZ,velocityX,velocityY,velocityZ;int is_wet;} DMHit;
void XPLMWorldToLocal(double,double,double,double*,double*,double*);
void XPLMLocalToWorld(double,double,double,double*,double*,double*);
DMObject XPLMLoadObject(const char*);void XPLMUnloadObject(DMObject);
DMInstance XPLMCreateInstance(DMObject,const char**);void XPLMDestroyInstance(DMInstance);
void XPLMInstanceSetPosition(DMInstance,const DMDraw*,const float*);
DMProbe XPLMCreateProbe(int);void XPLMDestroyProbe(DMProbe);int XPLMProbeTerrainXYZ(DMProbe,float,float,float,DMHit*);
DMData XPLMFindDataRef(const char*);double XPLMGetDatad(DMData);
]]
local state={session='-',token='-',revision=0,deadline=0,objects={},models={}}
local entities,pending={},{}
local seq=0;local run=tostring(os.time())..'-'..tostring(math.random(100000,999999))
local port=8000;local next_poll=0;local last_snapshot=-100;local exchange=nil;local message='DEFA : en attente d’une mission V3 démarrée'
local halted=false;local probe=nil
local x,y,z=ffi.new('double[1]'),ffi.new('double[1]'),ffi.new('double[1]')
local hit=ffi.new('DMHit[1]');hit[0].structSize=ffi.sizeof('DMHit')
local draw=ffi.new('DMDraw[1]');draw[0].structSize=ffi.sizeof('DMDraw')
local no_refs=ffi.new('const char*[1]');local no_data=ffi.new('float[1]')
local function valid_id(s) return type(s)=='string' and #s<=64 and s:match('^[%w][%w_.-]*$') end
local function finite(s,lo,hi) local n=tonumber(s);if not n or n~=n or n<lo or n>hi then error('DEFA: invalid numeric snapshot') end;return n end
local function split(line) local out={};for field in (line..'\t'):gmatch('(.-)\t') do out[#out+1]=field end;return out end
local function remove(id)
    local o=entities[id];if not o then return end
    if o.instance then X.XPLMDestroyInstance(o.instance) end
    if o.object then X.XPLMUnloadObject(o.object) end
    entities[id]=nil
end
local function clear()
    local ids={};for id in pairs(entities) do ids[#ids+1]=id end;for _,id in ipairs(ids) do remove(id) end
end
local function snapshot(body,now)
    local lines={};for line in body:gmatch('[^\r\n]+') do lines[#lines+1]=split(line) end
    local h=lines[1];if not h or h[1]~='DEFAOBJ' or h[2]~='1' or #lines>100 then error('DEFA: protocol') end
    local incoming={session=h[3],revision=finite(h[4],0,1e9),deadline=now+finite(h[5],0,18),elapsed=finite(h[6],0,86400),token=h[7],objects={},models={}}
    if incoming.session=='-' then clear();pending={};state=incoming;return end
    if not valid_id(incoming.session) or not valid_id(incoming.token) then error('DEFA: session') end
    for i=2,#lines do local f=lines[i]
        if f[1]=='M' then
            if not valid_id(f[2]) or not f[3] or #f[3]>400 or f[3]:find('..',1,true) or f[3]:match('^[\\/]') or f[3]:find(':',1,true) or f[3]:find('\\',1,true) or not f[3]:match('%.obj$') then error('DEFA: model path') end
            incoming.models[f[2]]=f[3]
        elseif f[1]=='O' then
            if #f~=14 or not valid_id(f[2]) or not valid_id(f[3]) or incoming.objects[f[2]] then error('DEFA: object') end
            if f[7]~='terrain' and f[7]~='water' and f[7]~='msl' and f[7]~='agl' then error('DEFA: altitude mode') end
            incoming.objects[f[2]]={id=f[2],asset=f[3],kind=f[4],lat=finite(f[5],-90,90),lon=finite(f[6],-180,180),mode=f[7],altitude=finite(f[8],-1500,60000),heading=finite(f[9],0,360),speed=finite(f[10],0,1000),offset=finite(f[11],-20,100),clearance=finite(f[12],0,10000),range=finite(f[13],.001,100),height=finite(f[14],1,60000),at=now}
        else error('DEFA: record') end
    end
    for id,o in pairs(incoming.objects) do if not incoming.models[o.asset] then error('DEFA: asset') end end
    if incoming.session~=state.session then clear();pending={} end
    local ids={};for id,o in pairs(entities) do if not incoming.objects[id] or incoming.objects[id].asset~=o.asset or incoming.models[o.asset]~=state.models[o.asset] then ids[#ids+1]=id end end
    for _,id in ipairs(ids) do remove(id) end
    state=incoming;message='DEFA : objets pilotés par la V3 sur ce poste'
end
local function emit(id,kind,extra)
    if state.session=='-' or #pending>=64 then return false end
    seq=seq+1;local e={session=state.session,token=state.token,run=run,seq=seq,object=id,type=kind}
    for k,v in pairs(extra or {}) do e[k]=v end
    local item={body=mathlib.json(e),kind=kind,id=id};if kind=='object_found' then table.insert(pending,1,item) else pending[#pending+1]=item end;return true
end
local function connect(now)
    local event=now-last_snapshot<1.5 and pending[1] or nil
    local path=event and '/__setup/mission-objects/report' or '/__setup/mission-objects/agent'
    local method=event and 'POST' or 'GET';local body=event and event.body or ''
    local tcp=socket.tcp();tcp:settimeout(0)
    tcp:connect('127.0.0.1',port)
    local request=method..' '..path..' HTTP/1.0\r\nHost: 127.0.0.1:'..port..'\r\nX-DEFA-Setup: 1\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: '..#body..'\r\n\r\n'..body
    exchange={tcp=tcp,request=request,sent=0,buffer='',until_at=now+2,event=event}
end
local function transport(now)
    if not exchange then if now>=next_poll then connect(now) end;return end
    local e=exchange;local finished=false
    if now>e.until_at then finished=true else
        if e.sent<#e.request then
            local sent,why,partial=e.tcp:send(e.request,e.sent+1)
            e.sent=sent or partial or e.sent
            if why and why~='timeout' and why~='Operation already in progress' and why~='Socket is not connected' then finished=true end
        else
            for _=1,4 do
                local bytes,why,partial=e.tcp:receive(4096)
                e.buffer=e.buffer..(bytes or partial or '')
                if #e.buffer>131072 then finished=true;break end
                if why=='closed' then finished=true;break end
                if why=='timeout' then break end
            end
        end
    end
    if not finished then return end
    e.tcp:close();exchange=nil;next_poll=now+.1
    local status=tonumber(e.buffer:match('^HTTP/%d%.%d (%d+)'))
    local body=e.buffer:match('\r\n\r\n(.*)')
    if status==200 and body then
        if e.event then
            if pending[1]==e.event then table.remove(pending,1) end
            if e.event.kind=='object_found' then message=e.event.id..': confirmation reçue par DEFA' end
        else
            local ok,why=pcall(snapshot,body,now);if not ok then message=tostring(why) else last_snapshot=now end
        end
    elseif e.event and status and status>=400 then
        if pending[1]==e.event then table.remove(pending,1) end
        message='DEFA : contact refusé ; vérifiez la mission et la portée'
    elseif not status then
        port=8000+((port-8000+1)%6)
    end
end
local function pilot()
    local a,b,c=X.XPLMFindDataRef('sim/flightmodel/position/latitude'),X.XPLMFindDataRef('sim/flightmodel/position/longitude'),X.XPLMFindDataRef('sim/flightmodel/position/elevation')
    if a==nil or b==nil or c==nil then return nil end
    return {lat=X.XPLMGetDatad(a),lon=X.XPLMGetDatad(b),altitude_ft=X.XPLMGetDatad(c)/.3048}
end
local function render(id,p,now,me)
    local o=entities[id]
    if not o then o={asset=p.asset};entities[id]=o end
    local lat,lon=mathlib.destination({lat=p.lat,lon=p.lon,course_deg=p.heading,speed_kt=p.speed},math.min(2,math.max(0,now-p.at)))
    if mathlib.distance(me,{lat=lat,lon=lon})>25 then remove(id);return end
    if not o.object and now>=(o.retry_at or 0) then
        o.object=X.XPLMLoadObject(SYSTEM_DIRECTORY..state.models[p.asset]);o.retry_at=now+5
        if o.object==nil then o.object=nil;if not o.failed then emit(id,'spawn_failed');o.failed=true end;return end
    end
    if not o.object then return end
    X.XPLMWorldToLocal(lat,lon,p.mode=='msl' and p.altitude*.3048 or 0,x,y,z)
    local px,py,pz=x[0],y[0],z[0]
    if not o.ground or now-o.ground.at>.5 then
        local result=X.XPLMProbeTerrainXYZ(probe,px,py+30000,pz,hit)
        o.ground=result==0 and {y=hit[0].locationY,wet=hit[0].is_wet~=0,at=now} or nil
    end
    local reason
    if not o.ground then reason='terrain indisponible'
    elseif p.mode=='water' and not o.ground.wet then reason='surface d’eau requise'
    elseif p.mode=='msl' and py-o.ground.y<p.clearance*.3048 then reason='garde au relief insuffisante'
    elseif p.mode=='agl' then py=o.ground.y+p.altitude*.3048
    elseif p.mode~='msl' then py=o.ground.y end
    if reason then
        if o.instance then X.XPLMDestroyInstance(o.instance);o.instance=nil end
        o.position=nil
        if o.reason~=reason then emit(id,'spawn_failed');o.reason=reason end;return
    end
    o.reason=nil
    X.XPLMLocalToWorld(px,py,pz,x,y,z)
    o.position={lat=x[0],lon=y[0],altitude_ft=z[0]/.3048};o.position_at=now
    if not o.instance then o.instance=X.XPLMCreateInstance(o.object,no_refs);if o.instance==nil then o.instance=nil;return end;emit(id,'spawned') end
    draw[0].x,draw[0].y,draw[0].z=px,py+p.offset,pz
    draw[0].pitch,draw[0].heading,draw[0].roll=0,p.heading,0
    X.XPLMInstanceSetPosition(o.instance,draw,no_data)
end
function DEFA_mission_objects_found(id)
    local o,p,me=entities[id],state.objects[id],pilot();local now=socket.gettime()
    if not me or not o or not p or not o.instance or not o.position or now-o.position_at>2 or now>state.deadline then message='DEFA : aucun objet courant à confirmer';return end
    if mathlib.distance(me,o.position)>p.range or math.abs(me.altitude_ft-o.position.altitude_ft)>p.height then message='DEFA : objet hors de portée de confirmation';return end
    if emit(id,'object_found',{pilot=me,position=o.position}) then message=id..': contact envoyé' end
end
function DEFA_mission_objects_tick()
    if halted then return end
    local now=socket.gettime();transport(now)
    if now>state.deadline then clear();return end
    local me=pilot();if not me then clear();return end
    if not probe then probe=X.XPLMCreateProbe(0);if probe==nil then return end end
    for id,p in pairs(state.objects) do render(id,p,now,me) end
end
function DEFA_mission_objects_panel()
    imgui.TextUnformatted(message)
    for id in pairs(state.objects) do if imgui.Button('Objet en vue : '..id) then DEFA_mission_objects_found(id) end end
end
function DEFA_mission_objects_show()
    if not SUPPORTS_FLOATING_WINDOWS then return end
    if DEFA_mission_objects_window then floating_wnd_destroy(DEFA_mission_objects_window) end
    DEFA_mission_objects_window=floating_wnd_create(520,220,1,true)
    floating_wnd_set_title(DEFA_mission_objects_window,'Objets de la mission DEFA')
    floating_wnd_set_imgui_builder(DEFA_mission_objects_window,'DEFA_mission_objects_panel')
    floating_wnd_set_onclose(DEFA_mission_objects_window,'DEFA_mission_objects_closed')
end
function DEFA_mission_objects_closed() DEFA_mission_objects_window=nil end
function DEFA_mission_objects_stop()
    clear();if exchange then exchange.tcp:close();exchange=nil end
    if probe then X.XPLMDestroyProbe(probe);probe=nil end;halted=true
end
add_macro('DEFA : objets de la mission','DEFA_mission_objects_show()')
do_every_frame('DEFA_mission_objects_tick()')
do_on_exit('DEFA_mission_objects_stop()')
