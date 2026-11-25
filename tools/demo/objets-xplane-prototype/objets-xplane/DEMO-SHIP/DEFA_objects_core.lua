-- Fonctions pures : aucune écriture simulateur ni réseau.
local M = {}
local rad = math.pi / 180
function M.destination(o, seconds)
    local d = o.speed_kt * seconds / 3600 / 3440.065
    local a,b,h = o.lat*rad,o.lon*rad,o.course_deg*rad
    local lat = math.asin(math.sin(a)*math.cos(d)+math.cos(a)*math.sin(d)*math.cos(h))
    local lon = b+math.atan2(math.sin(h)*math.sin(d)*math.cos(a), math.cos(d)-math.sin(a)*math.sin(lat))
    return lat/rad, ((lon/rad+540)%360)-180
end
function M.distance(a,b)
    local h=math.sin((b.lat-a.lat)*rad/2)^2+math.cos(a.lat*rad)*math.cos(b.lat*rad)*math.sin((b.lon-a.lon)*rad/2)^2
    return 3440.065*2*math.asin(math.min(1,math.sqrt(h)))
end
function M.in_view(camera,x,y,z,hfov,vfov)
    -- Axes locaux X-Plane : est +X, haut +Y, sud +Z.
    local dx,dy,dz=x-camera.x,y-camera.y,z-camera.z
    local h,p,r=camera.heading*rad,camera.pitch*rad,camera.roll*rad
    local right=math.cos(h)*dx+math.sin(h)*dz
    local forward=math.sin(h)*dx-math.cos(h)*dz
    local up=math.cos(p)*dy-math.sin(p)*forward
    local depth=math.sin(p)*dy+math.cos(p)*forward
    local rx=math.cos(r)*right-math.sin(r)*up
    local ry=math.sin(r)*right+math.cos(r)*up
    return depth>0 and math.abs(rx)<=depth*math.tan(hfov*rad/2) and math.abs(ry)<=depth*math.tan(vfov*rad/2)
end
function M.json(v)
    if type(v)=='number' then assert(v==v and math.abs(v)<math.huge); return string.format('%.10g',v) end
    if type(v)=='string' then return '"'..v:gsub('[%z\1-\31\\"]',function(c) return string.format('\\u%04x',c:byte()) end)..'"' end
    if type(v)=='boolean' then return v and 'true' or 'false' end
    local fields={};for k,x in pairs(v) do fields[#fields+1]=M.json(k)..':'..M.json(x) end
    return '{'..table.concat(fields,',')..'}'
end
return M
