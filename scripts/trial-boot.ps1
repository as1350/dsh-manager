# dsh-skill-manager trial-boot verification (pure ASCII).
$ErrorActionPreference = 'Stop'
# dsh writes informational lines to stderr; never let native stderr abort the script.
$PSNativeCommandUseErrorActionPreference = $false
# Pick the newest tarball (never stale after a version bump).
$tgz = (Get-ChildItem 'D:\Desktop\Dsh\dsh-skill-manager-package\*.tgz' | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Output "tarball: $tgz"
if (-not $tgz -or -not (Test-Path $tgz)) { Write-Output 'TARBALL MISSING'; exit 1 }

$tmp = Join-Path $env:TEMP ("dsh-skm-trial-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
$profile = Join-Path $tmp 'profiles\web'
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$manifestJson = @'
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {},
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } }
}
'@
$workspaceYaml = @"
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
"@
# dsh manifest reader JSON.parse directly; no BOM allowed - use WriteAllText (UTF-8 no BOM)
[System.IO.File]::WriteAllText((Join-Path $profile 'package.json'), $manifestJson)
[System.IO.File]::WriteAllText((Join-Path $profile 'cordis.patch.yml'), '[]')
[System.IO.File]::WriteAllText((Join-Path $profile 'pnpm-workspace.yaml'), $workspaceYaml)

$env:DSH_HOME = $tmp
$env:CI = 'true'

Write-Output '=== step 1: dsh plugin --profile web add <tgz> ==='
dsh plugin --profile web add $tgz
if ($LASTEXITCODE -ne 0) { Write-Output "INSTALL FAILED (exit $LASTEXITCODE)"; exit 1 }
Write-Output '--- profile manifest after add ---'
Get-Content (Join-Path $profile 'package.json')

$l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$l.Start()
$port = ([System.Net.IPEndPoint]$l.LocalEndpoint).Port
$l.Stop()
Write-Output "=== step 2: boot web profile on 127.0.0.1:$port ==="

$outLog = Join-Path $tmp 'boot.out.log'
$errLog = Join-Path $tmp 'boot.err.log'
# dsh is an npm .cmd shim; Start-Process cannot launch it - use the real node entry
$nodeExe = (Get-Command node).Source
$dshEntry = Join-Path $env:APPDATA 'npm\node_modules\@deepseek-ai\dsh\lib\bin.js'
$p = Start-Process -FilePath $nodeExe -ArgumentList @($dshEntry, '--profile', 'web', '--host', '127.0.0.1', '--port', "$port") -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -WindowStyle Hidden
Write-Output "boot pid: $($p.Id)"

$ready = $false
$deadline = (Get-Date).AddSeconds(150)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2
  if ($p.HasExited) { break }
  $all = ''
  if (Test-Path $outLog) { $all = Get-Content $outLog -Raw -ErrorAction SilentlyContinue }
  if (Test-Path $errLog) { $all += Get-Content $errLog -Raw -ErrorAction SilentlyContinue }
  if ($all -match 'dsh web:\s+http://') { $ready = $true; break }
}
if (-not $ready) {
  Write-Output 'BOOT NOT READY - tail of logs:'
  if (Test-Path $outLog) { Get-Content $outLog -Tail 40 }
  if (Test-Path $errLog) { Get-Content $errLog -Tail 40 }
  taskkill /PID $p.Id /T /F 2>$null | Out-Null
  exit 1
}
Write-Output 'BOOT READY OK'

try {
  $base = "http://127.0.0.1:$port"

  Write-Output '=== step 3: client bundle served by client-modules ==='
  $client = Invoke-WebRequest -Uri "$base/plugins/@deepseek-ai/dsh-manager/client.js" -UseBasicParsing -TimeoutSec 20
  $starts = $client.Content.Contains('window.__ModuleLoader__')
  $hasVersion = $client.Content.Contains('0.7.0')
  $hasAliasSource = $client.Content.Contains('registerSource')
  $hasPinyin = $client.Content.Contains('aliasPinyin')
  $hasCache = $client.Content.Contains('ALIAS_CACHE_TTL')
  $hasPatchPanel = $client.Content.Contains('patchOpenStore')
  Write-Output ("client.js HTTP " + $client.StatusCode + ", bytes=" + $client.RawContentLength + ", ModuleLoader wrapper=" + $starts + ", version marker=" + $hasVersion + ", alias source=" + $hasAliasSource + ", pinyin=" + $hasPinyin + ", cache=" + $hasCache + ", patch panel=" + $hasPatchPanel)
  if (-not $hasVersion) { Write-Output 'client bundle lacks the 0.7.0 version marker - FAIL'; exit 1 }
  if (-not $hasAliasSource) { Write-Output 'client bundle lacks the alias source registration - FAIL'; exit 1 }
  if (-not $hasPinyin) { Write-Output 'client bundle lacks the pinyin matching code - FAIL'; exit 1 }
  if (-not $hasCache) { Write-Output 'client bundle lacks the alias cache - FAIL'; exit 1 }
  if (-not $hasPatchPanel) { Write-Output 'client bundle lacks the patch panel - FAIL'; exit 1 }

  Write-Output '=== step 3b: deployment input-trigger bundle carries the dunhao patch ==='
  $trig = Invoke-WebRequest -Uri "$base/plugins/@deepseek-ai/dsh-client-ui-input-trigger/client.js" -UseBasicParsing -TimeoutSec 20
  $hasDunhao = $trig.Content.Contains('dunhao-trigger-patch')
  Write-Output ("input-trigger dunhao patch: " + $hasDunhao)
  if (-not $hasDunhao) { Write-Output 'input-trigger dunhao patch missing - FAIL'; exit 1 }

  Write-Output '=== step 3c: deployment conversation bundle carries the slash seed patch ==='
  $conv = Invoke-WebRequest -Uri "$base/plugins/@deepseek-ai/dsh-client-ui-conversation/client.js" -UseBasicParsing -TimeoutSec 20
  $hasSeed = $conv.Content.Contains('dsh-skill-manager-seed')
  Write-Output ("conversation slash seed patch: " + $hasSeed)
  if (-not $hasSeed) { Write-Output 'conversation slash seed patch missing - FAIL'; exit 1 }

  Write-Output '=== step 4: boot manifest contains the entry ==='
  $index = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 20
  Write-Output ("index.html contains pkg name: " + $index.Content.Contains('@deepseek-ai/dsh-manager'))

  Write-Output '=== step 5: host route /api/dsh-manager ==='
  $headers = @{ 'Content-Type' = 'application/json'; 'Origin' = $base }
  $body = @{ method = 'catalog'; args = @{ sessionId = $null; cwd = $null } } | ConvertTo-Json -Depth 5
  $resp = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 30
  $json = $resp.Content | ConvertFrom-Json
  $names = ($json.skills | Select-Object -First 5 | ForEach-Object { $_.name }) -join ', '
  Write-Output ("catalog HTTP " + $resp.StatusCode + ", complete=" + $json.complete + ", skills=" + @($json.skills).Count)
  Write-Output ("first skills: " + $names)

  Write-Output '=== step 6: cross-origin rejected ==='
  try {
    $badHeaders = @{ 'Content-Type' = 'application/json'; 'Origin' = 'http://evil.example' }
    Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $badHeaders -Body $body -UseBasicParsing -TimeoutSec 15 | Out-Null
    Write-Output 'cross-origin NOT rejected - FAIL'
    exit 1
  } catch {
    Write-Output ("cross-origin rejected OK (HTTP " + [int]$_.Exception.Response.StatusCode + ")")
  }

  Write-Output '=== step 7: notes roundtrip (writes to trial DSH_HOME/skills-notes.json) ==='
  $notesGet = @{ method = 'notesGet'; args = @{} } | ConvertTo-Json -Depth 5
  $r0 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $notesGet -UseBasicParsing -TimeoutSec 15
  $j0 = $r0.Content | ConvertFrom-Json
  Write-Output ("notesGet initial: ok=" + $j0.ok + ", count=" + @($j0.notes.PSObject.Properties).Count)
  $notesSave = @{ method = 'notesSave'; args = @{ name = 'trial-skill'; title = 'Trial title'; content = 'Trial content line' } } | ConvertTo-Json -Depth 5
  $r1 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $notesSave -UseBasicParsing -TimeoutSec 15
  $j1 = $r1.Content | ConvertFrom-Json
  $ok1 = ($j1.ok -eq $true) -and ($j1.notes.'trial-skill'.title -eq 'Trial title')
  Write-Output ("notesSave ok: " + $ok1)
  if (-not $ok1) { Write-Output 'notesSave FAIL'; exit 1 }
  $r2 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $notesGet -UseBasicParsing -TimeoutSec 15
  $j2 = $r2.Content | ConvertFrom-Json
  $ok2 = $j2.notes.'trial-skill'.content -eq 'Trial content line'
  Write-Output ("notesGet readback ok: " + $ok2)
  if (-not $ok2) { Write-Output 'notesGet readback FAIL'; exit 1 }
  # 0.5.0 pinyin: Chinese title built from code points (script stays pure ASCII) = kao da wo
  $cn = "$([char]0x62F7)$([char]0x6253)$([char]0x6211)"
  $notesSaveCn = @{ method = 'notesSave'; args = @{ name = 'trial-skill'; title = $cn; content = 'Trial content line' } } | ConvertTo-Json -Depth 5
  $rcn = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $notesSaveCn -UseBasicParsing -TimeoutSec 15
  $jcn = $rcn.Content | ConvertFrom-Json
  $pinyinOk = ($jcn.ok -eq $true) -and ($jcn.notes.'trial-skill'.aliasPinyin -eq 'kaodawo') -and ($jcn.notes.'trial-skill'.aliasInitials -eq 'kdw')
  Write-Output ("notesSave pinyin fields (aliasPinyin=kaodawo, aliasInitials=kdw): " + $pinyinOk)
  if (-not $pinyinOk) { Write-Output 'notes pinyin FAIL'; exit 1 }
  $notesFile = Join-Path $tmp 'skills-notes.json'
  Write-Output ("notes file on disk: " + (Test-Path $notesFile))

  Write-Output '=== step 8: trash endpoints wired (no skills in trial catalog -> business error on trash) ==='
  $del = @{ method = 'trash'; args = @{ name = 'no-such-skill'; sessionId = $null; cwd = $null } } | ConvertTo-Json -Depth 5
  $r3 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $del -UseBasicParsing -TimeoutSec 15
  $j3 = $r3.Content | ConvertFrom-Json
  Write-Output ("trash of missing skill returns business error: " + ($null -ne $j3.error))
  if ($null -eq $j3.error) { Write-Output 'trash endpoint FAIL'; exit 1 }

  Write-Output '=== step 9: trash lifecycle (planted entry -> restore -> permanent delete) ==='
  $trashDir = Join-Path $tmp 'skills-trash'
  New-Item -ItemType Directory -Force -Path $trashDir | Out-Null
  $restoredPath = Join-Path $tmp 'restored-skill\SKILL.md'
  $entry1 = @{ name = 'restored-skill'; source = 'user-dsh'; path = $restoredPath; content = "---`ndescription: restored`n---`n`n# Restored`n"; deletedAt = 1700000000000 } | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText((Join-Path $trashDir 'planted01.json'), $entry1)
  $listBody = @{ method = 'trashList'; args = @{} } | ConvertTo-Json -Depth 5
  $rl = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $listBody -UseBasicParsing -TimeoutSec 15
  $jl = $rl.Content | ConvertFrom-Json
  $okList = (@($jl.items).Count -eq 1) -and ($jl.items[0].name -eq 'restored-skill')
  Write-Output ("trashList sees planted entry: " + $okList)
  if (-not $okList) { Write-Output 'trashList FAIL'; exit 1 }
  $restoreBody = @{ method = 'trashRestore'; args = @{ id = 'planted01' } } | ConvertTo-Json -Depth 5
  $rr = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $restoreBody -UseBasicParsing -TimeoutSec 15
  $jr = $rr.Content | ConvertFrom-Json
  $restoredOk = ($jr.ok -eq $true) -and (Test-Path $restoredPath)
  $restoredContentOk = $false
  if ($restoredOk) { $restoredContentOk = ((Get-Content $restoredPath -Raw) -match 'Restored') }
  Write-Output ("trashRestore ok + file written back: " + ($restoredOk -and $restoredContentOk))
  if (-not ($restoredOk -and $restoredContentOk)) { Write-Output 'trashRestore FAIL'; exit 1 }
  $entry2 = @{ name = 'doomed-skill'; source = 'user-dsh'; path = (Join-Path $tmp 'doomed\SKILL.md'); content = 'x'; deletedAt = 1700000000001 } | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText((Join-Path $trashDir 'planted02.json'), $entry2)
  $delBody = @{ method = 'trashDelete'; args = @{ id = 'planted02' } } | ConvertTo-Json -Depth 5
  $rd = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $delBody -UseBasicParsing -TimeoutSec 15
  $jd = $rd.Content | ConvertFrom-Json
  $gone = ($jd.ok -eq $true) -and -not (Test-Path (Join-Path $trashDir 'planted02.json'))
  Write-Output ("trashDelete permanent: " + $gone)
  if (-not $gone) { Write-Output 'trashDelete FAIL'; exit 1 }

  # 0.7.0 directory-driven patch engine. The engine seeds nothing (full equality):
  # import the two shipped example patches, then scan (adoption of the live bundles),
  # disable/enable roundtrip, category/import/RECOVERY/settings.
  Write-Output '=== step 10: import example patches + patchScan (live bundles adopted) ==='
  $defCat = "$([char]0x9ED8)$([char]0x8BA4)"   # the default category name, built from code points (script stays pure ASCII)
  $slashSeedJson = @'
{"id":"slash-seed","name":"slash seed","description":"example patch","apply":"refresh","files":[{"file":"node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js","kind":"replace","marker":"dsh-skill-manager-seed","pairs":[{"find":"draft = \"\";","replace":"draft = \"/\"; // dsh-skill-manager-seed: empty composer starts with a slash prefix","count":1},{"find":"this.adopt(\"\");","replace":"this.adopt(\"/\");","count":3},{"find":"if (trimmed === \"\") return [];","replace":"if (trimmed === \"\" || trimmed === \"/\") return [];","count":1},{"find":"const empty = draft.trim() === \"\" && attachments.length === 0;","replace":"const empty = (draft.trim() === \"\" || draft.trim() === \"/\") && attachments.length === 0;","count":1},{"find":"if (this.snapshot.draft.trim() === \"\" && this.imageIds.length > 0) {","replace":"if ((this.snapshot.draft.trim() === \"\" || this.snapshot.draft.trim() === \"/\") && this.imageIds.length > 0) {","count":1},{"find":"if (inputState.draft === \"\" && storedDraft !== \"\") inputActions.setDraft(storedDraft);","replace":"if ((inputState.draft === \"\" || inputState.draft === \"/\") && storedDraft !== \"\") inputActions.setDraft(storedDraft);","count":1}]}]}
'@
  $dunhaoJson = @'
{"id":"dunhao-trigger","name":"dunhao trigger","description":"example patch","apply":"refresh","files":[{"file":"node_modules/@deepseek-ai/dsh-client-ui-input-trigger/lib/client.js","kind":"replace","marker":"dunhao-trigger-patch","pairs":[{"find":"if (ch !== \"/\" && ch !== \"@\") continue;","replace":"if (trig !== \"/\" && trig !== \"@\") continue;","count":1},{"find":"if (guard.tier === \"claimed\" && ch === \"/\") continue;","replace":"if (guard.tier === \"claimed\" && trig === \"/\") continue;","count":1},{"find":"if (!boundaryOk(draft, i, ch)) continue;","replace":"if (!boundaryOk(draft, i, trig)) continue;","count":1},{"find":"trigger: ch,","replace":"trigger: trig,","count":1},{"find":"const ch = draft.charAt(i);","replace":"const ch = draft.charAt(i);\n\t\t\t\tconst trig = ch === \"\\u3001\" ? \"/\" : ch; // dunhao-trigger-patch: normalize U+3001 to slash","count":1}]}]}
'@
  foreach ($m in @(@('slash-seed.dsh-patch.json', $slashSeedJson), @('dunhao-trigger.dsh-patch.json', $dunhaoJson))) {
    $impBody = @{ method = 'patchImport'; args = @{ category = $defCat; fileName = $m[0]; content = $m[1] } } | ConvertTo-Json -Depth 6
    $rimp0 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $impBody -UseBasicParsing -TimeoutSec 20
    $jimp0 = $rimp0.Content | ConvertFrom-Json
    if ($jimp0.ok -ne $true) { Write-Output ("example import FAIL: " + $m[0] + " -> " + $jimp0.error); exit 1 }
  }
  Write-Output 'example patches imported (the engine itself seeds nothing)'
  $scanBody = @{ method = 'patchScan'; args = @{} } | ConvertTo-Json -Depth 5
  $rscan = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $scanBody -UseBasicParsing -TimeoutSec 20
  $jscan = $rscan.Content | ConvertFrom-Json
  $scanCount = @($jscan.patches).Count
  $foundSeed = $false; $foundDunhao = $false
  foreach ($scanP in @($jscan.patches)) {
    if ($scanP.id -eq 'slash-seed' -and $scanP.state -eq 'applied') { $foundSeed = $true }
    if ($scanP.id -eq 'dunhao-trigger' -and $scanP.state -eq 'applied') { $foundDunhao = $true }
  }
  $scanOk = ($jscan.ok -eq $true) -and ($scanCount -ge 2) -and $foundSeed -and $foundDunhao -and ($jscan.settings.allowExecutable -eq $true)
  Write-Output ("patchScan: ok=" + $jscan.ok + ", patches=" + $scanCount + ", slash-seed applied=" + $foundSeed + ", dunhao-trigger applied=" + $foundDunhao + ", allowExecutable=" + $jscan.settings.allowExecutable)
  if (-not $scanOk) { Write-Output 'patchScan FAIL (adoption of live bundles expected)'; exit 1 }

  Write-Output '=== step 11: disable/enable roundtrip WITHOUT server restart (per-request disk read proof) ==='
  $seedLeftDisabled = $false
  $disBody = @{ method = 'patchDisable'; args = @{ id = 'slash-seed' } } | ConvertTo-Json -Depth 5
  $rd1 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $disBody -UseBasicParsing -TimeoutSec 20
  $jd1 = $rd1.Content | ConvertFrom-Json
  if ($jd1.ok -ne $true) { Write-Output 'patchDisable FAIL'; exit 1 }
  $seedLeftDisabled = $true
  $convAfterDisable = Invoke-WebRequest -Uri "$base/plugins/@deepseek-ai/dsh-client-ui-conversation/client.js" -UseBasicParsing -TimeoutSec 20
  $markerGone = -not $convAfterDisable.Content.Contains('dsh-skill-manager-seed')
  Write-Output ("after disable (no restart): marker gone from served bundle = " + $markerGone)
  if (-not $markerGone) { Write-Output 'per-request read proof FAIL'; exit 1 }
  $enBody = @{ method = 'patchEnable'; args = @{ id = 'slash-seed' } } | ConvertTo-Json -Depth 5
  $re1 = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $enBody -UseBasicParsing -TimeoutSec 20
  $je1 = $re1.Content | ConvertFrom-Json
  if ($je1.ok -ne $true) { Write-Output 'patchEnable restore FAIL'; exit 1 }
  $seedLeftDisabled = $false
  $convAfterEnable = Invoke-WebRequest -Uri "$base/plugins/@deepseek-ai/dsh-client-ui-conversation/client.js" -UseBasicParsing -TimeoutSec 20
  $markerBack = $convAfterEnable.Content.Contains('dsh-skill-manager-seed')
  Write-Output ("after enable (no restart): marker back in served bundle = " + $markerBack)
  if (-not $markerBack) { Write-Output 'patchEnable roundtrip FAIL'; exit 1 }

  Write-Output '=== step 12: category / import / RECOVERY / settings ==='
  $addCat = @{ method = 'patchCategoryAdd'; args = @{ name = 'TrialCat' } } | ConvertTo-Json -Depth 5
  $radd = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $addCat -UseBasicParsing -TimeoutSec 15
  $jadd = $radd.Content | ConvertFrom-Json
  Write-Output ("patchCategoryAdd TrialCat: ok=" + $jadd.ok)
  if ($jadd.ok -ne $true) { Write-Output 'patchCategoryAdd FAIL'; exit 1 }

  # import a structurally valid manifest whose target does not exist (existence is only
  # checked at enable time, so import must succeed and enable must fail)
  $trialManifest = '{"id":"trial-x","name":"trial x","description":"missing target","apply":"refresh","files":[{"file":"node_modules/no-such-package/lib/nope.js","kind":"replace","pairs":[{"find":"X","replace":"Y","count":1}]}]}'
  $importBody = @{ method = 'patchImport'; args = @{ category = 'TrialCat'; fileName = 'trial-x.dsh-patch.json'; content = $trialManifest } } | ConvertTo-Json -Depth 6
  $rimp = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $importBody -UseBasicParsing -TimeoutSec 15
  $jimp = $rimp.Content | ConvertFrom-Json
  Write-Output ("patchImport into TrialCat: ok=" + $jimp.ok + ", id=" + $jimp.id)
  if ($jimp.ok -ne $true) { Write-Output 'patchImport FAIL'; exit 1 }

  $enTx = @{ method = 'patchEnable'; args = @{ id = 'trial-x' } } | ConvertTo-Json -Depth 5
  $rtx = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $enTx -UseBasicParsing -TimeoutSec 15
  $jtx = $rtx.Content | ConvertFrom-Json
  Write-Output ("patchEnable trial-x (target missing) error present: " + ($null -ne $jtx.error))
  if ($null -eq $jtx.error) { Write-Output 'patchEnable missing-target should fail - FAIL'; exit 1 }

  $delTx = @{ method = 'patchDelete'; args = @{ id = 'trial-x' } } | ConvertTo-Json -Depth 5
  $rdel = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $delTx -UseBasicParsing -TimeoutSec 15
  $jdel = $rdel.Content | ConvertFrom-Json
  Write-Output ("patchDelete trial-x: ok=" + $jdel.ok)
  if ($jdel.ok -ne $true) { Write-Output 'patchDelete FAIL'; exit 1 }

  $delCat = @{ method = 'patchCategoryDelete'; args = @{ name = 'TrialCat' } } | ConvertTo-Json -Depth 5
  $rdc = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $delCat -UseBasicParsing -TimeoutSec 15
  $jdc = $rdc.Content | ConvertFrom-Json
  Write-Output ("patchCategoryDelete TrialCat (empty): ok=" + $jdc.ok)
  if ($jdc.ok -ne $true) { Write-Output 'patchCategoryDelete FAIL'; exit 1 }

  $recoveryPath = Join-Path $tmp 'dsh-manager\patches\RECOVERY.md'
  $recoveryOk = (Test-Path $recoveryPath) -and ((Get-Content $recoveryPath -Raw) -match 'slash-seed')
  Write-Output ("RECOVERY.md present + contains slash-seed: " + $recoveryOk)
  if (-not $recoveryOk) { Write-Output 'RECOVERY.md missing or lacks slash-seed - FAIL'; exit 1 }

  $setBadge = @{ method = 'patchSettingsSet'; args = @{ alertMode = 'badge' } } | ConvertTo-Json -Depth 5
  $rs = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $setBadge -UseBasicParsing -TimeoutSec 15
  $js = $rs.Content | ConvertFrom-Json
  $getBody = @{ method = 'patchSettingsGet'; args = @{} } | ConvertTo-Json -Depth 5
  $rg = Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $getBody -UseBasicParsing -TimeoutSec 15
  $jg = $rg.Content | ConvertFrom-Json
  $settingsOk = ($js.settings.alertMode -eq 'badge') -and ($jg.settings.alertMode -eq 'badge')
  Write-Output ("patch settings badge roundtrip: " + $settingsOk)
  if (-not $settingsOk) { Write-Output 'patchSettings FAIL'; exit 1 }
  $setPanel = @{ method = 'patchSettingsSet'; args = @{ alertMode = 'panel' } } | ConvertTo-Json -Depth 5
  Invoke-WebRequest -Uri "$base/api/dsh-manager" -Method POST -Headers $headers -Body $setPanel -UseBasicParsing -TimeoutSec 15 | Out-Null
} finally {
  if ($seedLeftDisabled -eq $true) {
    try {
      $enBody = @{ method = 'patchEnable'; args = @{ id = 'slash-seed' } } | ConvertTo-Json -Depth 5
      Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/dsh-manager" -Method POST -Headers @{ 'Content-Type' = 'application/json'; 'Origin' = "http://127.0.0.1:$port" } -Body $enBody -UseBasicParsing -TimeoutSec 15 | Out-Null
      Write-Output 'finally: slash-seed patch re-enabled'
    } catch { Write-Output 'finally: slash-seed re-enable FAILED - run reapply script manually!' }
  }
  taskkill /PID $p.Id /T /F 2>$null | Out-Null
  Start-Sleep -Seconds 2
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  Write-Output "trial home cleaned: $tmp"
}
Write-Output 'TRIAL ALL PASS'
