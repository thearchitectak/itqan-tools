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
	if cls == undefined or not ((classof cls == textureMapClass) or (isKindOf cls textureMapClass)) then return itq_bitmap f linear
	local b = cls name:(getFilenameFile f)
	itq_set b #HDRIMapName f
	itq_set b #color_space (if linear then 0 else 2)
	b
)
fn itq_hasClass n =
(
	-- most reliable test: actually create an instance (also triggers loading of deferred plugins)
	local inst = try (execute (n + "()")) catch undefined
	if inst != undefined and ((superclassof inst == material) or (superclassof inst == textureMap)) then return true
	local c = try (execute n) catch undefined
	if c != undefined and ((classof c == MaterialClass) or (classof c == textureMapClass) or (isKindOf c MaterialClass) or (isKindOf c textureMapClass)) then return true
	local nl = toLower n
	for k in material.classes where (toLower (k as string)) == nl do return true
	for k in textureMap.classes where (toLower (k as string)) == nl do return true
	false
)
fn itq_renderers = (local s = ""; for r in RendererClass.classes do s += (r as string) + "  "; s)
-- 3ds Max 2025 may defer loading plugins until first use: creating a renderer instance loads Corona / V-Ray and their material classes
global ITQ_WOKEN
fn itq_wake =
(
	if ITQ_WOKEN == true then return true
	ITQ_WOKEN = true
	for r in RendererClass.classes do
	(
		local nm = r as string
		if (matchPattern nm pattern:"*Corona*") or (matchPattern nm pattern:"*V_Ray*") do try (r()) catch (append ITQ_LOG ("could not load " + nm))
	)
	true
)
fn itq_classesLike pat = (local s = ""; for k in material.classes where matchPattern (k as string) pattern:pat do s += (k as string) + " "; s)
fn itq_hasCorona = (itq_wake(); (itq_hasClass "CoronaPhysicalMtl") or (itq_hasClass "CoronaMtl") or (itq_hasClass "CoronaLegacyMtl"))
fn itq_hasVRay = (itq_wake(); itq_hasClass "VRayMtl")

-- Corona Physical Material (Corona 7 and newer)
-- Legacy Corona Material (Corona 6 and older): glossiness workflow, so the roughness map is inverted
fn itq_corona_legacy dir base ext isMetal dispCm =
(
	local m = if itq_hasClass "CoronaMtl" then (execute "CoronaMtl")() else (execute "CoronaLegacyMtl")()
	m.name = "ITQAN_" + base
	itq_set m #texmapDiffuse (itq_bitmap (itq_file dir base "BaseColor" ext) false)
	itq_set m #levelReflect 1.0
	itq_set m #fresnelIor (if isMetal then 999.0 else 1.5)
	local r = itq_bitmap (itq_file dir base "Roughness" ext) true
	if r != undefined do (try (r.output.invert = true) catch (); itq_set m #texmapReflectGlossiness r)
	local nf = itq_file dir base "Normal" ext
	if nf != undefined and (itq_hasClass "CoronaNormal") do
	(
		local n = (execute "CoronaNormal")()
		itq_set n #normalMap (itq_bitmap nf true)
		itq_set m #texmapBump n
		itq_set m #mapamountBump 1.0
	)
	local op = itq_bitmap (itq_file dir base "Opacity" ext) true
	if op != undefined do itq_set m #texmapOpacity op
	if dispCm > 0 do
	(
		local h = itq_bitmap (itq_file dir base "Displacement" ext) true
		if h != undefined do (itq_set m #texmapDisplace h; itq_set m #displacementMinimum 0.0; itq_set m #displacementMaximum (units.decodeValue ((dispCm as string) + "cm")))
	)
	m
)

fn itq_corona dir base ext isMetal dispCm =
(
	if not (itq_hasCorona()) then return undefined
	if not (itq_hasClass "CoronaPhysicalMtl") then return (itq_corona_legacy dir base ext isMetal dispCm)
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

-- Imperfection layers (dirt, dust, scratches...): standard 3ds Max Mix maps, so they work with Corona and V-Ray.
fn itq_mix base col maskFile amt tile =
(
	if maskFile == undefined or amt <= 0 then return base
	local mk = itq_bitmap maskFile true
	if mk == undefined then return base
	try (mk.coords.U_Tiling = tile; mk.coords.V_Tiling = tile) catch ()
	try (mk.output.output_amount = amt) catch ()
	local mx = try (Mix()) catch undefined
	if mx == undefined then return base
	mx.name = "ITQ_" + (getFilenameFile maskFile)
	if base != undefined then itq_set mx #map1 base else itq_set mx #color1 (color 128 128 128)
	itq_set mx #color2 col
	itq_set mx #mask mk
	mx
)
fn itq_imperf m isC dir base layers =
(
	local legacy = ((classof m as string) == "CoronaMtl") or ((classof m as string) == "CoronaLegacyMtl")
	local cprop = if legacy then #texmapDiffuse else if isC then #baseTexmap else #texmap_diffuse
	local rprop = if legacy then #texmapReflectGlossiness else if isC then #baseRoughnessTexmap else #texmap_reflectionGlossiness
	local rough = if legacy then (color 0 0 0) else (color 255 255 255)
	local c = try (getProperty m cprop) catch undefined
	local r = try (getProperty m rprop) catch undefined
	local n = 0
	for L in layers do
	(
		local f = itq_file (dir + "Imperfections\\") base ("Imp_" + L[1]) "jpg"
		if f != undefined do
		(
			if L[2] != undefined and L[3] > 0 do c = itq_mix c L[2] f L[3] L[5]
			if L[4] > 0 do r = itq_mix r rough f L[4] L[5]
			n += 1
		)
	)
	if n > 0 do (itq_set m cprop c; itq_set m rprop r)
	n
)

-- V-Ray Material (V-Ray 5 and newer): GGX + roughness workflow
fn itq_vray dir base ext isMetal dispCm =
(
	if not (itq_hasVRay()) then return undefined
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
// سطر تركيب طبقات العيوب المختارة (اللون والخشونة؛ البروز يُشرح يدويًا في الدليل)
function impLine(info, isC) {
  const L = (info.imperf || []).filter(l => l.auto);
  if (!L.length) return '';
  const col = (c) => c ? `(color ${c.map(Math.round).join(' ')})` : 'undefined';
  const arr = L.map(l => `#("${l.en}", ${col(l.color)}, ${num(+(l.colorAmt || 0).toFixed(3))}, ${num(+(l.roughAmt || 0).toFixed(3))}, ${num(+l.tile.toFixed(3))})`).join(', ');
  return `\tif m != undefined do itq_imperf m ${isC ? 'true' : 'false'} dir "${info.key}" #(${arr})\n`;
}
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
${impLine(info, isC)}	if m == undefined then messageBox "${rName} is not installed or not loaded in this 3ds Max session." title:"ITQAN Tools"
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

-- ملاحظة: MAXScript لا يفرّق بين الحروف الكبيرة والصغيرة، فلا يجوز أن يطابق اسمُ متغير اسمَ دالة
global ITQ_SUMMARY = ""
-- حفظ مكتبة: الطريقة الأولى saveTempMaterialLibrary، والاحتياطية عبر المكتبة الحالية saveMaterialLibrary
fn itq_saveLib mats f =
(
	if mats.count == 0 then return false
	try (local ml = materialLibrary(); for m in mats do append ml m; saveTempMaterialLibrary ml f) catch (append ITQ_LOG ("saveTempMaterialLibrary: " + (getCurrentException())))
	if not (doesFileExist f) do
	(
		try
		(
			while currentMaterialLibrary.count > 0 do deleteItem currentMaterialLibrary 1
			for m in mats do append currentMaterialLibrary m
			saveMaterialLibrary f
		)
		catch (append ITQ_LOG ("saveMaterialLibrary: " + (getCurrentException())))
	)
	doesFileExist f
)

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
	local libC = #()
	local libV = #()
	local hasC = itq_hasCorona()
	local hasV = itq_hasVRay()
	local noInfo = 0
	for d in dirs do
	(
		local ini = d + "material_info.txt"
		if not (doesFileExist ini) do ini = d + "material.ini"
		local key = ""
		local ext = "jpg"
		local isMetal = false
		local disp = 0.0
		if doesFileExist ini then
		(
			key = itq_ini ini "key" ""
			ext = itq_ini ini "ext" "jpg"
			isMetal = (itq_ini ini "metal" "0") == "1"
			disp = (itq_ini ini "displace_cm" "0") as float
			if disp == undefined do disp = 0.0
		)
		else
		(
			-- no info file (saved by an older version): infer from the map files themselves
			noInfo += 1
			key = filenameFromPath (trimRight d "\\\\")
			ext = ""
			for e in #("jpg", "png", "exr", "tif") where ext == "" do
				if (doesFileExist (d + key + "_Corona\\\\" + key + "_BaseColor." + e)) or (doesFileExist (d + key + "_VRay\\\\" + key + "_Diffuse." + e)) do ext = e
			if ext == "" then (append ITQ_LOG ("No maps found in " + d); key = "")
			else
			(
				isMetal = doesFileExist (d + key + "_Corona\\\\" + key + "_Metalness." + ext)
				if doesFileExist (d + key + "_Corona\\\\" + key + "_Displacement." + ext) do disp = 1.0
			)
		)
		if key != "" do
		(
			local mc = try (itq_corona (d + key + "_Corona\\\\") key ext isMetal disp) catch (append ITQ_LOG ("Corona " + key + ": " + (getCurrentException())); undefined)
			if mc != undefined do append libC mc
			local mv = try (itq_vray (d + key + "_VRay\\\\") key ext isMetal disp) catch (append ITQ_LOG ("V-Ray " + key + ": " + (getCurrentException())); undefined)
			if mv != undefined do append libV mv
		)
	)
	local okC = itq_saveLib libC (root + "ITQAN_Corona.mat")
	local okV = itq_saveLib libV (root + "ITQAN_VRay.mat")
	if okC or okV do setINISetting syncIni "sync" "stamp" stamp
	local isV = matchPattern ((classof renderers.current) as string) pattern:"*V_Ray*"
	local lf = root + (if isV then "ITQAN_VRay.mat" else "ITQAN_Corona.mat")
	if not (doesFileExist lf) do lf = root + (if isV then "ITQAN_Corona.mat" else "ITQAN_VRay.mat")
	if doesFileExist lf do (try (loadMaterialLibrary lf) catch ())
	ITQ_SUMMARY = "Material folders found: " + (dirs.count as string) + (if noInfo > 0 then " (" + (noInfo as string) + " read from file names)" else "") + "\\nCorona installed: " + (if hasC then "yes" else "NO") + " | Corona materials: " + (libC.count as string) + " | ITQAN_Corona.mat saved: " + (if okC then "yes" else "NO") + "\\nV-Ray installed: " + (if hasV then "yes" else "NO") + " | V-Ray materials: " + (libV.count as string) + " | ITQAN_VRay.mat saved: " + (if okV then "yes" else "NO") + (if (not hasC) or (not hasV) then "\\nRenderers loaded: " + (itq_renderers()) + "\\nCorona material classes: " + (itq_classesLike "*Corona*") + "\\nV-Ray material classes: " + (itq_classesLike "*VRay*") else "") + (if hasC and not (itq_hasClass "CoronaPhysicalMtl") then "\\n(Older Corona detected: using the legacy CoronaMtl)" else "") + (if ITQ_LOG.count > 0 then "\\n\\nNotes (" + (ITQ_LOG.count as string) + "): " + ITQ_LOG[1] + (if ITQ_LOG.count > 1 then "\\nFull list in MAXScript Listener (F11)." else "") else "")
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
		messageBox ("ITQAN material library setup\\n\\n" + ITQ_SUMMARY + "\\n\\nLibraries:\\n" + root + "ITQAN_Corona.mat\\n" + root + "ITQAN_VRay.mat\\n\\nOpen them once from the Slate Material Editor:\\nMaterial/Map Browser options > Open Material Library.\\nThey sync automatically every time 3ds Max starts.") title:"ITQAN Tools"
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
