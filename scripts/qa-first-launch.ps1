param([Parameter(Mandatory = $true)][string]$InstalledExe)
$ErrorActionPreference = 'Stop'
$workspaceDirectory = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'com.genefield.desktop'))
$workspaceDb = Join-Path $workspaceDirectory 'genefield.db'
$backupDb = Join-Path $workspaceDirectory ('genefield-startup-backup-' + [guid]::NewGuid().ToString('N') + '.db')
$qaDirectory = Join-Path $env:TEMP ('genefield-startup-qa-' + [guid]::NewGuid().ToString('N'))
$repoDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$evidenceDirectory = Join-Path $repoDirectory 'docs\evidence\startup-0.1.1'
foreach ($target in @($workspaceDb, $backupDb)) {
  if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($target)) -ne $workspaceDirectory) {
    throw 'Workspace backup path escaped the expected directory.'
  }
}
if (Get-Process -Name GeneField,genefield-final-v1 -ErrorAction SilentlyContinue) {
  throw 'Close GeneField before testing a fresh workspace.'
}
foreach ($suffix in @('-wal', '-shm', '-journal')) {
  if (Test-Path -LiteralPath ($workspaceDb + $suffix)) { throw 'Workspace still has SQLite journal files; refusing to move it.' }
}
New-Item -ItemType Directory -Path $qaDirectory, $evidenceDirectory -Force | Out-Null
$originalHash = $null
if (Test-Path -LiteralPath $workspaceDb) {
  $originalHash = (Get-FileHash -LiteralPath $workspaceDb -Algorithm SHA256).Hash
  Move-Item -LiteralPath $workspaceDb -Destination $backupDb
}
try {
  $env:GENEFIELD_INSTALLED_EXE = $InstalledExe
  $env:GENEFIELD_QA_OUTPUT = $evidenceDirectory
  $env:GENEFIELD_QA_CWD = $qaDirectory
  & node (Join-Path $PSScriptRoot 'qa-installed.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Installed first-launch QA failed.' }
}
finally {
  if (Get-Process -Name GeneField -ErrorAction SilentlyContinue) {
    throw "GeneField is still running. Preserved original database at $backupDb; close the application before restoring it."
  }
  # Keep the test-created database as evidence instead of deleting user data.
  foreach ($suffix in @('', '-wal', '-shm', '-journal')) {
    $testFile = $workspaceDb + $suffix
    if (Test-Path -LiteralPath $testFile) {
      Move-Item -LiteralPath $testFile -Destination (Join-Path $qaDirectory ('fresh-workspace.db' + $suffix))
    }
  }
  if ($originalHash) {
    Move-Item -LiteralPath $backupDb -Destination $workspaceDb
    if ((Get-FileHash -LiteralPath $workspaceDb -Algorithm SHA256).Hash -ne $originalHash) {
      throw 'Restored original workspace hash did not match.'
    }
  }
  @{ fresh_workspace = $true; fresh_webview_profile = $true; original_workspace_restored = $true; original_sha256 = $originalHash; test_directory = $qaDirectory } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidenceDirectory 'workspace-preservation.json') -Encoding UTF8
}
