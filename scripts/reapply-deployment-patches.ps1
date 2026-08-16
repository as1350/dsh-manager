# dsh-manager deployment patches: directory-driven re-apply / restore (pure ASCII).
#
# The patch manager stores everything under the DSH home:
#   <DSH_HOME>/dsh-manager/patches/
#     *.dsh-patch.json            declaration (root = "default" category; one-level subdirs = categories)
#     *.dsh-patch.js              script-transform companion (apply via panel only, gated by settings)
#     <name>.override/            override companion: a directory containing a single "file"
#     .state/files/<sha1(abs)>.json   machine state per target file (official snapshot + enable chain)
#     .state/snapshots/<sha256(content)>  official snapshot per file (file name = content sha256 hex)
#     RECOVERY.md                 human-readable restore manual (rewritten on every state change)
#
# Deployment root is located via the DSH_DEPLOYMENT_ROOT env override, else defaults to
# %APPDATA%\npm\node_modules\@deepseek-ai\dsh. A patch declares targets as relative paths
# under that root (replace / script / override kinds).
#
# Usage (pure ASCII, no Chinese in output):
#   powershell -ExecutionPolicy Bypass -File reapply-deployment-patches.ps1
#       Report status: for every *.dsh-patch.json (including one-level subdirs) print
#       id / category / state. State = read the per-file machine state; if the patch is in
#       the enable chain, compare the on-disk target sha256 to outputSha (equal = applied,
#       differing = lost); with no state, a replace patch whose marker is on disk = applied
#       (adopted); otherwise clean. Also prints the RECOVERY.md hint path.
#   ... -restore
#       Emergency rescue when dsh cannot boot: copy every snapshot under .state/snapshots
#       back to the target file named by each .state/files/*.json "path", atomically
#       (write <target>.dshskm-tmp in the same dir, then Move-Item -Force), and print each
#       restored file. Finally delete all .state/files/*.json and all snapshot files
#       (they are unreferenced once the state is cleared).
#   ... -apply
#       Re-apply every clean patch. Patches already applied, adopted, or lost are skipped
#       (lost prints a warning: official content updated, disable then re-enable from the
#       panel). A patch whose files are all kind replace/override is validated first
#       (each replace pair's find must appear exactly `count` times on disk; override reads
#       the override dir's "file"), then every target is written atomically, then a state
#       file is written for every target (path, snapshotId = sha256 of the original content
#       written to .state/snapshots first, chain=[id], outputSha = sha256 of the new content,
#       at = timestamp). A clean patch containing a script entry is skipped with a warning
#       since script patches can only be enabled from the panel. Validation failure for any
#       file skips the whole patch and prints the reason.
#
# All operations run in deterministic order (patches sorted by declaration-file path).
# The script is idempotent and self-protecting: a missing target file stops the write.
$ErrorActionPreference = 'Stop'

# ---- locate deployment root (matches the host engine) ----
$script:deployRoot = $null
if ($env:DSH_DEPLOYMENT_ROOT -and $env:DSH_DEPLOYMENT_ROOT.Length -gt 0) {
  $script:deployRoot = $env:DSH_DEPLOYMENT_ROOT
} else {
  $script:deployRoot = Join-Path $env:APPDATA 'npm\node_modules\@deepseek-ai\dsh'
}

# ---- locate DSH home and patch tree (matches the host engine) ----
$script:dshHome = $null
if ($env:DSH_HOME -and $env:DSH_HOME.Length -gt 0) { $script:dshHome = $env:DSH_HOME }
else { $script:dshHome = Join-Path $env:USERPROFILE '.dsh' }
$script:patchesRoot = Join-Path $script:dshHome 'dsh-manager\patches'
$script:stateFilesDir = Join-Path $script:patchesRoot '.state\files'
$script:stateSnapDir = Join-Path $script:patchesRoot '.state\snapshots'
$script:recoveryPath = Join-Path $script:patchesRoot 'RECOVERY.md'

function Get-DefaultCategory() { return ([char]0x9ED8).ToString() + ([char]0x8BA4).ToString() }

function Get-Ascii([string]$s) {
  if ($s -eq (Get-DefaultCategory)) { return 'default' }
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    if ([int]$ch -le 127) { [void]$sb.Append($ch) } else { [void]$sb.Append('?') }
  }
  return $sb.ToString()
}

function Get-Sha256Hex([string]$text) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($text)))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Get-Sha1Hex([string]$text) {
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  try { return ([BitConverter]::ToString($sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($text)))).Replace('-', '').ToLowerInvariant() }
  finally { $sha1.Dispose() }
}

function Get-TargetAbs([string]$rel) {
  $base = $script:deployRoot
  foreach ($part in $rel.Split('/')) { $base = Join-Path $base $part }
  return $base
}

function Get-StateFileFor([string]$targetAbs) {
  return Join-Path $script:stateFilesDir ((Get-Sha1Hex $targetAbs) + '.json')
}

function Get-TextFile([string]$path) {
  return [System.IO.File]::ReadAllText($path)
}

function Write-TextNoBom([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

# Atomic write: same-dir temp file then Move-Item -Force (server never sees a half write).
function Write-Atomic([string]$target, [string]$content) {
  $dstDir = Split-Path $target -Parent
  if (-not (Test-Path $dstDir)) { throw "target directory missing: $dstDir" }
  $tmp = Join-Path $dstDir ((Split-Path $target -Leaf) + '.dshskm-tmp')
  Write-TextNoBom $tmp $content
  Move-Item -Path $tmp -Destination $target -Force
}

function Get-ReplaceDiskState([string]$targetAbs, $st, [string]$id) {
  $chain = @()
  if ($st -and $st.chain) { $chain = @($st.chain) }
  if (-not ($chain -contains $id)) { return 'not-in-chain' }
  $disk = Get-TextFile $targetAbs
  if ((Get-Sha256Hex $disk) -eq $st.outputSha) { return 'applied' }
  return 'lost'
}

# Per-file state for a patch entry: applied / lost / adopted / clean.
function Get-FileState($fe, [string]$id) {
  $rel = $fe.file -replace '\\', '/'
  $targetAbs = Get-TargetAbs $rel
  if (-not (Test-Path $targetAbs)) { return 'clean' }
  $stPath = Get-StateFileFor $targetAbs
  if (Test-Path $stPath) {
    $st = Get-Content $stPath -Raw | ConvertFrom-Json
    $s = Get-ReplaceDiskState $targetAbs $st $id
    if ($s -eq 'applied') { return 'applied' }
    if ($s -eq 'lost') { return 'lost' }
    return 'clean'
  }
  # adoption: replace patch whose marker is already on disk (no machine state yet)
  if ($fe.kind -eq 'replace' -and $fe.marker -and $fe.marker.Length -gt 0) {
    if ((Get-TextFile $targetAbs).Contains($fe.marker)) { return 'adopted' }
  }
  return 'clean'
}

# Aggregate state for a whole patch across its files.
function Get-PatchState($entry) {
  $id = Get-EntryId $entry
  $hasApplied = $false; $hasLost = $false; $hasAdopted = $false
  foreach ($fe in $entry.manifest.files) {
    $s = Get-FileState $fe $id
    if ($s -eq 'lost') { $hasLost = $true }
    elseif ($s -eq 'applied') { $hasApplied = $true }
    elseif ($s -eq 'adopted') { $hasAdopted = $true }
  }
  if ($hasLost) { return 'lost' }
  if ($hasApplied) { return 'applied' }
  if ($hasAdopted) { return 'adopted' }
  return 'clean'
}

# Enumerate every *.dsh-patch.json under the patch tree (root + one subdirectory level),
# sorted by declaration-file path for deterministic ordering.
function Get-PatchEntries() {
  $out = @()
  if (-not (Test-Path $script:patchesRoot)) { return $out }
  $names = @(Get-ChildItem -Path $script:patchesRoot -File -Force | Where-Object { $_.Name.EndsWith('.dsh-patch.json') })
  foreach ($n in $names) {
    $out += [PSCustomObject]@{ category = (Get-DefaultCategory); dir = $script:patchesRoot; file = $n.FullName; manifest = (Get-Content $n.FullName -Raw | ConvertFrom-Json) }
  }
  foreach ($sub in @(Get-ChildItem -Path $script:patchesRoot -Directory -Force | Where-Object { -not $_.Name.StartsWith('.') })) {
    foreach ($n in @(Get-ChildItem -Path $sub.FullName -File -Force | Where-Object { $_.Name.EndsWith('.dsh-patch.json') })) {
      $out += [PSCustomObject]@{ category = $sub.Name; dir = $sub.FullName; file = $n.FullName; manifest = (Get-Content $n.FullName -Raw | ConvertFrom-Json) }
    }
  }
  return @($out | Sort-Object file)
}

function Get-EntryId($entry) {
  if ($entry.manifest -and $entry.manifest.id) { return [string]$entry.manifest.id }
  return [string]$entry.file
}

function Get-PatchDir($entry) {
  return $entry.dir
}

# ---- status mode (no switch) ----
function Invoke-Status() {
  Write-Output ('deployment root : ' + $script:deployRoot)
  Write-Output ('patch tree      : ' + $script:patchesRoot)
  Write-Output ''
  if (-not (Test-Path $script:patchesRoot)) {
    Write-Output 'NO PATCH TREE PRESENT (nothing to report)'
    Write-Output ('RECOVERY manual : ' + $script:recoveryPath)
    return
  }
  $entries = Get-PatchEntries
  if ($entries.Count -eq 0) { Write-Output 'no *.dsh-patch.json found' }
  foreach ($entry in $entries) {
    $id = Get-EntryId $entry
    $cat = Get-Ascii $entry.category
    $state = Get-PatchState $entry
    Write-Output ('id=' + $id + '  category=' + $cat + '  file=' + [System.IO.Path]::GetFileName($entry.file) + '  state=' + $state)
  }
  Write-Output ''
  Write-Output ('RECOVERY manual (restore guide): ' + $script:recoveryPath)
  Write-Output '(if dsh cannot open, run: powershell -ExecutionPolicy Bypass -File reapply-deployment-patches.ps1 -restore)'
}

# ---- restore mode (-restore): emergency rescue channel ----
function Invoke-Restore() {
  if (-not (Test-Path $script:stateFilesDir)) { Write-Output 'no .state/files present - nothing to restore'; return }
  $stateFiles = @(Get-ChildItem -Path $script:stateFilesDir -File -Force | Sort-Object Name)
  if ($stateFiles.Count -eq 0) { Write-Output 'no state files present - nothing to restore' }
  foreach ($sf in $stateFiles) {
    $st = Get-Content $sf.FullName -Raw | ConvertFrom-Json
    $target = $null
    if ($st -and $st.path) { $target = [string]$st.path }
    if (-not $target -or -not $st.snapshotId) { Write-Output ('SKIP state file (missing path/snapshotId): ' + $sf.Name); continue }
    $snapPath = Join-Path $script:stateSnapDir ([string]$st.snapshotId)
    if (-not (Test-Path $snapPath)) { Write-Output ('SKIP state file (snapshot missing): ' + $sf.Name); continue }
    $content = Get-TextFile $snapPath
    if (Test-Path $target) {
      Write-Atomic $target $content
    } else {
      # target gone: recreate its parent directory, then write
      $dstDir = Split-Path $target -Parent
      if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path ($dstDir | Split-Path -Parent) | Out-Null; New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }
      Write-Atomic $target $content
    }
    Write-Output ('RESTORED ' + $target)
  }
  # clear machine state: delete every state file and every snapshot file
  foreach ($sf in $stateFiles) { Remove-Item $sf.FullName -Force -ErrorAction SilentlyContinue }
  Write-Output 'state files cleared'
  if (Test-Path $script:stateSnapDir) {
    $snaps = @(Get-ChildItem -Path $script:stateSnapDir -File -Force)
    foreach ($sn in $snaps) { Remove-Item $sn.FullName -Force -ErrorAction SilentlyContinue }
    Write-Output ('snapshots cleared: ' + $snaps.Count)
  } else {
    Write-Output 'snapshots cleared: 0'
  }
  Write-Output 'RESCUE DONE - try starting dsh again'
}

# Validate one replace entry against the on-disk target; returns error string or $null.
function Test-ReplaceEntry($fe, [string]$targetAbs) {
  if (-not (Test-Path $targetAbs)) { return 'target file missing: ' + $fe.file }
  $disk = Get-TextFile $targetAbs
  foreach ($pair in $fe.pairs) {
    $count = [regex]::Matches($disk, [regex]::Escape([string]$pair.find)).Count
    if ($count -ne $pair.count) {
      $findShow = [string]$pair.find
      if ($findShow.Length -gt 40) { $findShow = $findShow.Substring(0, 40) + '...' }
      return 'find count mismatch on ' + $fe.file + ' (found ' + $count + ', expected ' + $pair.count + '): ' + $findShow
    }
  }
  return $null
}

# Compute the output content for a replace/override file entry.
function Get-Output($fe, [string]$patchDir, [string]$targetAbs, [string]$original) {
  if ($fe.kind -eq 'replace') {
    $out = $original
    foreach ($pair in $fe.pairs) { $out = $out.Replace([string]$pair.find, [string]$pair.replace) }
    return $out
  }
  if ($fe.kind -eq 'override') {
    $ovPath = Join-Path $patchDir ([string]$fe.override)
    $ovFile = Join-Path $ovPath 'file'
    if (-not (Test-Path $ovFile)) { throw 'override file missing: ' + $fe.override + '\file' }
    return Get-TextFile $ovFile
  }
  throw 'unknown patch kind: ' + [string]$fe.kind
}

# Apply one clean patch (replace/override only). Emits progress lines; writes nothing on failure.
function Apply-OnePatch($entry) {
  $id = Get-EntryId $entry
  $patchDir = Get-PatchDir $entry
  $cat = Get-Ascii $entry.category
  $hasScript = @($entry.manifest.files | Where-Object { $_.kind -eq 'script' }).Count -gt 0
  if ($hasScript) {
    Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): contains a script entry - script patches can only be enabled from the panel')
    return
  }
  foreach ($fe in $entry.manifest.files) {
    if ($fe.kind -ne 'replace' -and $fe.kind -ne 'override') {
      Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): unsupported entry kind ' + $fe.kind)
      return
    }
  }
  # validation pass (dry run) across all files
  foreach ($fe in $entry.manifest.files) {
    $rel = $fe.file -replace '\\', '/'
    $targetAbs = Get-TargetAbs $rel
    # same-file chain guard: never overwrite a state file that already holds a chain
    $existingState = $null
    $stPath = Get-StateFileFor $targetAbs
    if (Test-Path $stPath) { $existingState = Get-Content $stPath -Raw | ConvertFrom-Json }
    if ($existingState -and @($existingState.chain).Count -gt 0) {
      Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): target already has an enable chain - use the patch panel (CLI would corrupt same-file chain state)')
      return
    }
    if ($fe.kind -eq 'replace') {
      $err = Test-ReplaceEntry $fe $targetAbs
      if ($err) {
        Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): validation failed - ' + $err)
        return
      }
    }
    if ($fe.kind -eq 'override') {
      $ovPath = Join-Path $patchDir ([string]$fe.override)
      if (-not (Test-Path (Join-Path $ovPath 'file'))) {
        Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): override file missing - ' + $fe.override + '\file')
        return
      }
    }
  }
  # transaction: snapshot originals, write outputs atomically, then write state files
  try {
    $plans = @()
    foreach ($fe in $entry.manifest.files) {
      $rel = $fe.file -replace '\\', '/'
      $targetAbs = Get-TargetAbs $rel
      if (-not (Test-Path $targetAbs)) { throw 'target file missing: ' + $fe.file }
      $original = Get-TextFile $targetAbs
      $snapshotId = Get-Sha256Hex $original
      $snapPath = Join-Path $script:stateSnapDir $snapshotId
      if (-not (Test-Path $snapPath)) {
        New-Item -ItemType Directory -Force -Path $script:stateSnapDir | Out-Null
        Write-TextNoBom $snapPath $original
      }
      $output = Get-Output $fe $patchDir $targetAbs $original
      $plans += [PSCustomObject]@{ targetAbs = $targetAbs; output = $output; snapshotId = $snapshotId; rel = $rel }
    }
    $written = @()
    foreach ($pl in $plans) { Write-Atomic $pl.targetAbs $pl.output; Write-Output ('APPLIED ' + $id + ' -> ' + $pl.targetAbs); $written += $pl }
    foreach ($pl in $plans) {
      $st = @{ path = $pl.targetAbs; root = $script:deployRoot; snapshotId = $pl.snapshotId; chain = @($id); outputSha = (Get-Sha256Hex $pl.output); at = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) }
      $stateTarget = Get-StateFileFor $pl.targetAbs
      New-Item -ItemType Directory -Force -Path $script:stateFilesDir | Out-Null
      Write-TextNoBom $stateTarget (ConvertTo-Json $st -Depth 5)
    }
  } catch {
    # roll back already-written targets to their snapshot
    foreach ($pl in $plans) {
      $rollback = Join-Path $script:stateSnapDir $pl.snapshotId
      if (Test-Path $rollback) { Write-Atomic $pl.targetAbs (Get-TextFile $rollback) }
    }
    Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): apply failed - ' + $_.Exception.Message)
    return
  }
  Write-Output ('OK ' + $id + ' (category=' + $cat + '): applied')
}

# ---- apply mode (-apply): re-apply every clean patch ----
function Invoke-Apply() {
  if (-not (Test-Path $script:patchesRoot)) {
    Write-Output ('NO PATCH TREE PRESENT at ' + $script:patchesRoot)
    return
  }
  $entries = Get-PatchEntries
  if ($entries.Count -eq 0) { Write-Output 'no *.dsh-patch.json found'; return }
  foreach ($entry in $entries) {
    $id = Get-EntryId $entry
    $cat = Get-Ascii $entry.category
    $state = Get-PatchState $entry
    if ($state -eq 'applied') { Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): already applied'); continue }
    if ($state -eq 'adopted') { Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): already applied (adopted - marker present)'); continue }
    if ($state -eq 'lost') {
      Write-Output ('SKIP ' + $id + ' (category=' + $cat + '): WARNING official content updated - disable then re-enable from the panel')
      continue
    }
    # state = clean
    Apply-OnePatch $entry
  }
  Write-Output 'APPLY COMPLETE - restart dsh (or refresh the browser) to serve the written bundles'
}

# ---- entry point ----
$mode = 'status'
for ($i = 0; $i -lt $args.Count; $i++) {
  $a = [string]$args[$i]
  if ($a -eq '-restore') { $mode = 'restore' }
  elseif ($a -eq '-apply') { $mode = 'apply' }
}

switch ($mode) {
  'restore' { Invoke-Restore }
  'apply'   { Invoke-Apply }
  default   { Invoke-Status }
}
