-- Préparation ponctuelle : produit le profil du plan ; aucune connexion réseau, aucune instance 3D.
local plan=__PLAN__
local ffi=require('ffi')
local X=ffi.load(SYSTEM=='IBM' and 'XPLM_64' or SYSTEM=='LIN' and 'Resources/plugins/XPLM_64.so' or 'Resources/plugins/XPLM.framework/XPLM')
ffi.cdef[[
typedef void* DFJProbe; typedef void* DFJData;
typedef struct {int structSize;float locationX,locationY,locationZ,normalX,normalY,normalZ,velocityX,velocityY,velocityZ;int is_wet;} DFJHit;
void XPLMWorldToLocal(double,double,double,double*,double*,double*);
void XPLMLocalToWorld(double,double,double,double*,double*,double*);
DFJProbe XPLMCreateProbe(int); void XPLMDestroyProbe(DFJProbe);
int XPLMProbeTerrainXYZ(DFJProbe,float,float,float,DFJHit*);
DFJData XPLMFindDataRef(const char*);double XPLMGetDatad(DFJData);
]]
local x,y,z=ffi.new('double[1]'),ffi.new('double[1]'),ffi.new('double[1]')
local hit=ffi.new('DFJHit[1]');hit[0].structSize=ffi.sizeof('DFJHit')
local active=false;local probe;local track_index,point_index=1,1;local results={};local cache={}
local function number(n) return (string.format('%.12g',n):gsub(',','.')) end
local function save()
    local file=assert(io.open(SCRIPT_DIRECTORY..'DEFA_JoinFS_terrain.json','w'))
    file:write('{"plan_hash":"'..plan.hash..'","tracks":[')
    for i,t in ipairs(plan.tracks) do
        if i>1 then file:write(',') end
        file:write('{"id":"'..t.id..'","samples":[')
        for j,p in ipairs(t.frames) do
            if j>1 then file:write(',') end
            local s=results[i][j]
            file:write('{"index":'..(j-1)..',"lat":'..number(p.lat)..',"lon":'..number(p.lon)..',"available":'..tostring(s.available))
            if s.available then file:write(',"elevation_m":'..number(s.elevation_m)..',"is_wet":'..tostring(s.is_wet)) end
            file:write('}')
        end
        file:write(']}')
    end
    file:write(']}');file:close()
    logMsg('DEFA JoinFS : profil écrit dans Scripts/DEFA_JoinFS_terrain.json ; vérifier les points disponibles.')
end
function DEFA_JoinFS_probe_start()
    if active then return end
    probe=X.XPLMCreateProbe(0);if probe==nil then logMsg('DEFA JoinFS : sonde indisponible');return end
    results={};cache={};for i,_ in ipairs(plan.tracks) do results[i]={} end
    track_index,point_index=1,1;active=true
end
function DEFA_JoinFS_probe_tick()
    if not active then return end
    local t=plan.tracks[track_index]
    if not t then save();X.XPLMDestroyProbe(probe);probe=nil;active=false;return end
    local p=t.frames[point_index];local key=number(p.lat)..':'..number(p.lon);local s=cache[key]
    if not s then
        s={available=false}
        local latref,lonref=X.XPLMFindDataRef('sim/flightmodel/position/latitude'),X.XPLMFindDataRef('sim/flightmodel/position/longitude')
        -- Vérification locale conservatrice : pas de relevé dans une scène distante non chargée.
        local lat,lon=X.XPLMGetDatad(latref),X.XPLMGetDatad(lonref)
        local distance=math.sqrt((p.lat-lat)^2+((p.lon-lon)*math.cos(lat*math.pi/180))^2)*60
        if distance<25 then
            X.XPLMWorldToLocal(p.lat,p.lon,15000,x,y,z)
            if X.XPLMProbeTerrainXYZ(probe,x[0],y[0],z[0],hit)==0 then
                X.XPLMLocalToWorld(hit[0].locationX,hit[0].locationY,hit[0].locationZ,x,y,z)
                s={available=true,elevation_m=z[0],is_wet=hit[0].is_wet~=0}
            end
        end
        cache[key]=s
    end
    results[track_index][point_index]=s;point_index=point_index+1
    if point_index>#t.frames then track_index=track_index+1;point_index=1 end
end
function DEFA_JoinFS_probe_stop() if probe then X.XPLMDestroyProbe(probe);probe=nil end;active=false end
add_macro('DEFA : relever le terrain du scénario JoinFS','DEFA_JoinFS_probe_start()')
do_every_frame('DEFA_JoinFS_probe_tick()')
do_on_exit('DEFA_JoinFS_probe_stop()')
