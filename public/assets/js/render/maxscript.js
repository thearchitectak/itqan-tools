// مولّد سكربتات 3ds Max (MAXScript) لخامات إتقان.
// السكربتات بالإنجليزية عمدًا لتجنّب مشكلات ترميز العربية داخل ماكس، وتتحقق من كل خاصية قبل ضبطها
// (isProperty) وتسجّل ما تعذّر ضبطه بدل التوقف، لتعمل مع اختلاف إصدارات Corona و V-Ray.

export const CORE_MS = String.raw`
global ITQ_LOG = #()
global ITQ_ROOT
global ITQ_SYNC_ONLY
fn itq_set obj prop val =
(
	if obj == undefined or val == undefined then return false
	if isProperty obj prop then
	(
		try (setProperty obj prop val; true)
		catch (append ITQ_LOG ((classof obj) as string + "." + (prop as string)); false)
	)
	else (append ITQ_LOG ((classof obj) as string + "." + (prop as string) + " (not found)"); false)
)
fn itq_file dir base sfx ext =
(
	local f = dir + base + "_" + sfx + "." + ext
	if doesFileExist f then f else undefined
)
-- linear = true for data maps (roughness, normal, height, metalness, opacity): gamma 1.0 / Raw
fn itq_bitmap f linear =
(
	if f == undefined then return undefined
	local b = Bitmaptexture name:(getFilenameFile f)
	if linear then (try (b.bitmap = openBitmap f gamma:1.0) catch (b.filename = f)) else b.filename = f
	if linear and (isProperty b #colorSpace) do (try (b.colorSpace = "Raw") catch ())
	b
)
fn itq_vbitmap f linear =
(
	if f == undefined then return undefined
	local cls = try (execute "VRayBitmap") catch undefined
	if cls == undefined or not (isKindOf cls textureMapClass) then return itq_bitmap f linear
	local b = cls name:(getFilenameFile f)
	itq_set b #HDRIMapName f
	itq_set b #color_space (if linear then 0 else 2)
	b
)
fn itq_hasClass n = (local c = try (execute n) catch undefined; c != undefined and (isKindOf c MaterialClass or isKindOf c textureMapClass))

-- Corona Physical Material (Corona 7 and newer)
fn itq_corona dir base ext isMetal dispCm =
(
	if not (itq_hasClass "CoronaPhysicalMtl") then return undefined
	local m = (execute "CoronaPhysicalMtl")()
	m.name = "ITQAN_" + base
	itq_set m #baseTexmap (itq_bitmap (itq_file dir base "BaseColor" ext) false)
	local r = itq_bitmap (itq_file dir base "Roughness" ext) true
	if r != undefined do (itq_set m #roughnessMode 0; itq_set m #baseRoughnessTexmap r)
	local nf = itq_file dir base "Normal" ext
	if nf != undefined and (itq_hasClass "CoronaNormal") do
	(
		local n = (execute "CoronaNormal")()
		itq_set n #normalMap (itq_bitmap nf true)
		itq_set m #baseBumpTexmap n
	)
	local mt = itq_bitmap (itq_file dir base "Metalness" ext) true
	if mt != undefined then (itq_set m #metalnessMode 1; itq_set m #metalnessTexmap mt)
	else if isMetal do itq_set m #metalnessMode 1
	local op = itq_bitmap (itq_file dir base "Opacity" ext) true
	if op != undefined do itq_set m #opacityTexmap op
	if dispCm > 0 do
	(
		local h = itq_bitmap (itq_file dir base "Displacement" ext) true
		if h != undefined do
		(
			itq_set m #displacementTexmap h
			itq_set m #displacementMinimum 0.0
			itq_set m #displacementMaximum (units.decodeValue ((dispCm as string) + "cm"))
		)
	)
	m
)

-- V-Ray Material (V-Ray 5 and newer): GGX + roughness workflow
fn itq_vray dir base ext isMetal dispCm =
(
	if not (itq_hasClass "VRayMtl") then return undefined
	local m = (execute "VRayMtl")()
	m.name = "ITQAN_" + base
	itq_set m #texmap_diffuse (itq_vbitmap (itq_file dir base "Diffuse" ext) false)
	itq_set m #reflection (color 255 255 255)
	itq_set m #brdf_type 4
	itq_set m #brdf_useRoughness true
	local r = itq_vbitmap (itq_file dir base "Roughness" ext) true
	if r != undefined do itq_set m #texmap_reflectionGlossiness r
	local nf = itq_file dir base "Normal" ext
	if nf != undefined and (itq_hasClass "VRayNormalMap") do
	(
		local n = (execute "VRayNormalMap")()
		itq_set n #normal_map (itq_vbitmap nf true)
		itq_set m #texmap_bump n
		itq_set m #texmap_bump_multiplier 100.0
	)
	local mt = itq_vbitmap (itq_file dir base "Metalness" ext) true
	if mt != undefined then itq_set m #texmap_metalness mt
	else if isMetal do itq_set m #reflection_metalness 1.0
	local op = itq_vbitmap (itq_file dir base "Opacity" ext) true
	if op != undefined do itq_set m #texmap_opacity op
	if dispCm > 0 do
	(
		local h = itq_vbitmap (itq_file dir base "Displacement" ext) true
		if h != undefined do itq_set m #texmap_displacement h
	)
	m
)

-- Apply to selected geometry with a real-world sized UVW Map (box)
fn itq_apply m wM hM =
(
	local n = 0
	for o in selection where (superclassof o == GeometryClass) do
	(
		o.material = m
		if wM > 0 do
		(
			local u = Uvwmap maptype:4
			u.length = units.decodeValue ((wM as string) + "m")
			u.width = units.decodeValue (((if hM > 0 then hM else wM) as string) + "m")
			u.height = u.length
			addModifier o u
		)
		n += 1
	)
	n
)
fn itq_report =
(
	if ITQ_LOG.count > 0 do
	(
		format "ITQAN: the following properties were skipped (version differences):\n"
		for l in ITQ_LOG do format "   %\n" l
	)
)
`;

const num = (v) => (Number.isFinite(+v) ? (+v).toFixed(3).replace(/\.?0+$/, '') : '0');

// سكربت خامة واحدة (يوضع داخل مجلد Corona أو VRay للخامة)
export function materialScript(info, renderer) {
  const isC = renderer === 'corona';
  const fn = isC ? 'itq_corona' : 'itq_vray';
  const rName = isC ? 'Corona Renderer' : 'V-Ray';
  return `-- ITQAN Tools (أدوات إتقان) | ${rName} material: ${info.key}
-- Source: ${info.source} | License: ${info.license}
-- How to use: select objects in 3ds Max, then drag this file into the viewport
-- (or Scripting > Run Script). The material is created from the maps in this folder,
-- assigned to the selection with a real-world UVW Map, and placed in the active Material Editor slot.
${CORE_MS}
(
	ITQ_LOG = #()
	local dir = getFilenamePath (getThisScriptFilename())
	local m = ${fn} dir "${info.key}" "${info.ext}" ${info.metal ? 'true' : 'false'} ${num(info.displaceCm)}
	if m == undefined then messageBox "${rName} is not installed or not loaded in this 3ds Max session." title:"ITQAN Tools"
	else
	(
		try (meditMaterials[activeMeditSlot] = m) catch ()
		local n = itq_apply m ${num(info.sizeW)} ${num(info.sizeH)}
		itq_report()
		messageBox ("Material " + m.name + " is ready.\\nAssigned to " + (n as string) + " object(s).\\nReal-world size: ${info.sizeW ? num(info.sizeW) + ' x ' + num(info.sizeH || info.sizeW) + ' m' : 'not specified (adjust UVW Map manually)'}") title:"ITQAN Tools"
	)
)
`;
}

// سكربت الإعداد في المجلد الرئيسي: ينشئ مكتبتي ITQAN_Corona.mat و ITQAN_VRay.mat ويزامنهما تلقائيًا عند تشغيل ماكس
export function setupScript() {
  return `-- ITQAN Tools (أدوات إتقان) | Material Library Setup
-- Run this file ONCE in 3ds Max (drag into the viewport or Scripting > Run Script).
-- It will:
--   1) build two material libraries from the "Materials" folder next to this file:
--        ITQAN_Corona.mat  and  ITQAN_VRay.mat
--   2) install a startup script so the libraries sync automatically every time 3ds Max starts
--   3) add a toolbar/menu action: Customize > Customize User Interface > Category "ITQAN" > "ITQAN Materials"
-- If you move this folder, run this file again from the new location.
${CORE_MS}
fn itq_ini f k d = (local v = getINISetting f "material" k; if v == "" then d else v)

fn itq_sync root force =
(
	ITQ_LOG = #()
	local dirs = getDirectories (root + "Materials\\\\*")
	sort dirs
	local stamp = (dirs.count as string)
	for d in dirs do stamp += "|" + (filenameFromPath (trimRight d "\\\\"))
	local syncIni = root + "ITQAN_sync.ini"
	local hasLib = (doesFileExist (root + "ITQAN_Corona.mat")) or (doesFileExist (root + "ITQAN_VRay.mat"))
	if (not force) and hasLib and ((getINISetting syncIni "sync" "stamp") == stamp) then return -1
	local libC = materialLibrary()
	local libV = materialLibrary()
	for d in dirs do
	(
		local ini = d + "material.ini"
		if doesFileExist ini do
		(
			local key = itq_ini ini "key" ""
			local ext = itq_ini ini "ext" "jpg"
			local isMetal = (itq_ini ini "metal" "0") == "1"
			local disp = (itq_ini ini "displace_cm" "0") as float
			if disp == undefined do disp = 0.0
			if key != "" do
			(
				local mc = itq_corona (d + key + "_Corona\\\\") key ext isMetal disp
				if mc != undefined do append libC mc
				local mv = itq_vray (d + key + "_VRay\\\\") key ext isMetal disp
				if mv != undefined do append libV mv
			)
		)
	)
	if libC.count > 0 do saveTempMaterialLibrary libC (root + "ITQAN_Corona.mat")
	if libV.count > 0 do saveTempMaterialLibrary libV (root + "ITQAN_VRay.mat")
	setINISetting syncIni "sync" "stamp" stamp
	local isV = matchPattern ((classof renderers.current) as string) pattern:"*V_Ray*"
	local lf = root + (if isV then "ITQAN_VRay.mat" else "ITQAN_Corona.mat")
	if not (doesFileExist lf) do lf = root + (if isV then "ITQAN_Corona.mat" else "ITQAN_VRay.mat")
	if doesFileExist lf do (try (loadMaterialLibrary lf) catch ())
	itq_report()
	format "ITQAN: material library synced (% Corona, % V-Ray materials).\\n" libC.count libV.count
	dirs.count
)

fn itq_install root =
(
	local f = (getDir #userStartupScripts) + "\\\\ITQAN_Materials_Startup.ms"
	local s = createFile f
	format "-- ITQAN Tools: syncs the ITQAN material library when 3ds Max starts\\n" to:s
	format "global ITQ_ROOT = @\\"%\\"\\n" root to:s
	format "global ITQ_SYNC_ONLY = true\\n" to:s
	format "if doesFileExist (ITQ_ROOT + \\"ITQAN_Materials_Setup.ms\\") do (try (fileIn (ITQ_ROOT + \\"ITQAN_Materials_Setup.ms\\")) catch (format \\"ITQAN: sync failed\\\\n\\"))\\n" to:s
	close s
	f
)

macroScript ITQAN_SyncMaterials category:"ITQAN" buttonText:"ITQAN Materials" tooltip:"Sync and open the ITQAN material library"
(
	if ITQ_ROOT == undefined or not (doesFileExist (ITQ_ROOT + "ITQAN_Materials_Setup.ms")) then
		messageBox "Run ITQAN_Materials_Setup.ms from your ITQAN materials folder first." title:"ITQAN Tools"
	else
	(
		global ITQ_SYNC_ONLY = true
		fileIn (ITQ_ROOT + "ITQAN_Materials_Setup.ms")
		messageBox "ITQAN material library is up to date. Open it from the Material/Map Browser." title:"ITQAN Tools"
	)
)

(
	local root = getFilenamePath (getThisScriptFilename())
	ITQ_ROOT = root
	if ITQ_SYNC_ONLY == true then
	(
		ITQ_SYNC_ONLY = false
		itq_sync root false
	)
	else
	(
		local f = itq_install root
		local n = itq_sync root true
		messageBox ("ITQAN material library is ready.\\n" + (n as string) + " material folder(s) synced.\\n\\nLibraries:\\n" + root + "ITQAN_Corona.mat\\n" + root + "ITQAN_VRay.mat\\n\\nOpen them once from the Slate Material Editor:\\nMaterial/Map Browser options > Open Material Library.\\nThey will stay listed and sync automatically every time 3ds Max starts.") title:"ITQAN Tools"
	)
)
`;
}

/* ======================= سكربت الإضاءة وإعدادات الريندر ======================= */
// opts: { renderer, scene, hdri (مسار نسبي أو null), ies: [{ file, lm, cct, ar }], width, height, quality }
export const SCENES = {
  interior_day: { ar: 'داخلي — نهار', sun: { alt: 40, az: 135 }, sky: true, ev: 1.5, wb: 6000, nightLights: false },
  interior_night: { ar: 'داخلي — ليل', sun: null, sky: false, ev: 4, wb: 3800, nightLights: true },
  exterior_day: { ar: 'خارجي — نهار', sun: { alt: 50, az: 150 }, sky: true, ev: 0, wb: 6500, nightLights: false },
  exterior_sunset: { ar: 'خارجي — غروب', sun: { alt: 6, az: 250 }, sky: true, ev: 1, wb: 5200, nightLights: true },
  exterior_night: { ar: 'خارجي — ليل', sun: null, sky: false, ev: 5, wb: 4200, nightLights: true },
  studio: { ar: 'استوديو / منتج', sun: null, sky: false, ev: 1, wb: 6500, nightLights: false },
};

export function renderScript(o) {
  const S = SCENES[o.scene] || SCENES.exterior_day, isC = o.renderer === 'corona', fin = o.quality === 'final';
  const iesList = (o.ies || []).map(x => `#(@"${x.file.replace(/\//g, '\\')}", ${x.lm}, ${x.cct})`).join(', ');
  return `-- ITQAN Tools (أدوات إتقان) | Lighting & render setup
-- Renderer: ${isC ? 'Corona' : 'V-Ray'} | Scene: ${o.scene} | Quality: ${fin ? 'final' : 'preview'} | ${o.width}x${o.height}
-- Run in 3ds Max 2025 (drag into the viewport or Scripting > Run Script).
-- Optional: to create IES spotlights, first place Point helpers (Create > Helpers > Point) where the spots are,
-- select them, then run this script. One light is created per selected helper, pointing down.
-- Every setting is checked before it is applied; anything your version does not support is listed in the
-- MAXScript Listener (F11) instead of stopping the script.
${CORE_MS}
fn itq_try obj props val = (local done = false; for p in props while not done do (if isProperty obj p do (try (setProperty obj p val; done = true) catch ())); if not done do append ITQ_LOG ((classof obj) as string + "." + (props[1] as string)); done)
fn itq_envBitmap f = (local b = Bitmaptexture filename:f name:(getFilenameFile f); try (b.coords.mappingType = 1; b.coords.mapping = 0) catch (); b)
fn itq_main =
(
	ITQ_LOG = #()
	local sk = undefined
	local here = getFilenamePath (getThisScriptFilename())
	local root = getFilenamePath (trimRight here "\\\\")
	local helpers = for o in selection where (superclassof o == Helper) collect o
	-- 1) renderer
	${isC ? `local rc = try (execute "CoronaRenderer") catch undefined
	if rc == undefined or not (isKindOf rc RendererClass) do (messageBox "Corona Renderer is not installed." title:"ITQAN Tools"; return ok)
	if not (isKindOf renderers.current rc) do renderers.current = rc()
	local r = renderers.current
	itq_try r #(#adaptivity_targetError, #noiseLevelLimit) ${fin ? '3.0' : '6.0'}
	itq_try r #(#progressive_passLimit) 0
	itq_try r #(#progressive_timeLimit) 0
	itq_try r #(#denoise_filterType) 2
	itq_try r #(#denoise_blendAmount) ${fin ? '0.65' : '1.0'}
	itq_try r #(#colorMap_simpleExposure) ${S.ev}
	itq_try r #(#colorMap_highlightCompression) ${o.scene.startsWith('interior') ? '3.0' : '2.0'}
	itq_try r #(#colorMap_colorTemp) ${S.wb}` : `local vc = undefined
	for c in RendererClass.classes where (matchPattern (c as string) pattern:"V_Ray*") and not (matchPattern (c as string) pattern:"*GPU*") and not (matchPattern (c as string) pattern:"*RT*") do vc = c
	if vc == undefined do (messageBox "V-Ray is not installed." title:"ITQAN Tools"; return ok)
	if not (isKindOf renderers.current vc) do renderers.current = vc()
	local r = renderers.current
	itq_try r #(#gi_on) true
	itq_try r #(#gi_primary_type) 2
	itq_try r #(#gi_secondary_type) 3
	itq_try r #(#progressive_noise_threshold) ${fin ? '0.01' : '0.03'}
	itq_try r #(#twoLevel_threshold) ${fin ? '0.01' : '0.03'}
	itq_try r #(#progressive_max_render_time) 0
	itq_try r #(#colorMapping_burnValue) ${o.scene.startsWith('interior') ? '0.7' : '1.0'}
	try (local rem = maxOps.GetCurRenderElementMgr(); local dn = execute "VRayDenoiser"; if dn != undefined do (local has = false; for i = 0 to rem.NumRenderElements() - 1 do (if isKindOf (rem.GetRenderElement i) dn do has = true); if not has do rem.AddRenderElement (dn()))) catch (append ITQ_LOG "VRayDenoiser render element")`}
	renderWidth = ${o.width}
	renderHeight = ${o.height}

	-- 2) environment and sun
	for o in objects where (matchPattern o.name pattern:"ITQAN_Sun*") do delete o
	${o.hdri ? `local hf = root + @"${o.hdri.replace(/\//g, '\\')}"
	if doesFileExist hf then (environmentMap = itq_envBitmap hf; useEnvironmentMap = true)
	else append ITQ_LOG ("HDRI file not found: " + hf)` : (S.sky ? (isC ? `local sk = try ((execute "CoronaSky")()) catch undefined
	if sk != undefined do (environmentMap = sk; useEnvironmentMap = true)` : `local sk = try ((execute "VRaySky")()) catch undefined
	if sk != undefined do (environmentMap = sk; useEnvironmentMap = true)`) : `environmentMap = undefined
	backgroundColor = (color ${o.scene === 'studio' ? '200 200 200' : '6 8 14'})`)}
	${S.sun ? `local alt = ${S.sun.alt}, az = ${S.sun.az}, D = units.decodeValue "200m"
	local sp = [D * (cos alt) * (cos az), D * (cos alt) * (sin az), D * (sin alt)]
	local sun = try ((execute "${isC ? 'CoronaSun' : 'VRaySun'}")()) catch undefined
	if sun != undefined do
	(
		sun.name = "ITQAN_Sun"
		sun.pos = sp
		try (sun.target = Targetobject pos:[0,0,0] name:"ITQAN_Sun_Target") catch ()
		${isC ? '' : `if sk != undefined do (itq_try sk #(#manual_sun_node) true; itq_try sk #(#sun_node) sun)`}
	)` : '-- no sun for this scene type'}

	-- 3) IES spotlights at the selected Point helpers
	local iesDefs = #(${iesList})
	local made = 0
	if helpers.count > 0 and iesDefs.count > 0 do
	(
		local d = iesDefs[1]
		local f = root + d[1]
		if not (doesFileExist f) then append ITQ_LOG ("IES file not found: " + f)
		else for hp in helpers do
		(
			${isC ? `local L = (execute "CoronaLight")()
			L.name = uniqueName "ITQAN_IES_"
			L.transform = (matrix3 1)
			L.pos = hp.pos
			itq_try L #(#shape) 2
			itq_try L #(#width, #size) (units.decodeValue "5cm")
			itq_try L #(#iesOn, #ies_on, #useIes) true
			itq_try L #(#iesFile, #ies_file, #iesFilename) f
			itq_try L #(#intensityUnits) 2
			itq_try L #(#intensity) (d[2] as float)
			itq_try L #(#colorMode) 2
			itq_try L #(#blackbodyTemp, #colorTemperature) (d[3] as float)` : `local L = (execute "VRayIES")()
			L.name = uniqueName "ITQAN_IES_"
			L.pos = hp.pos
			itq_try L #(#ies_file, #iesFile) f
			itq_try L #(#intensity_type) 0
			itq_try L #(#power) (d[2] as float)
			itq_try L #(#color_mode) 1
			itq_try L #(#color_temperature) (d[3] as float)`}
			made += 1
		)
	)
	itq_report()
	messageBox ("ITQAN lighting setup applied:\\n- Renderer: ${isC ? 'Corona' : 'V-Ray'} (${fin ? 'final' : 'preview'} quality)\\n- Scene: ${S.ar.replace(/[^\x20-\x7e]/g, '').trim() || o.scene}\\n- Output: ${o.width} x ${o.height}\\n- IES lights created: " + (made as string) + "\\n\\nSuggested Physical Camera exposure: ${({ interior_day: 'EV 9 to 11', interior_night: 'EV 5 to 7', exterior_day: 'EV 13 to 15', exterior_sunset: 'EV 10 to 12', exterior_night: 'EV 3 to 6', studio: 'EV 10 to 12' })[o.scene]}\\nSee the Listener (F11) for skipped settings.") title:"ITQAN Tools"
	ok
)
itq_main()
`;
}
