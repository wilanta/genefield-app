param([Parameter(Mandatory=$true)][string]$Application)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class GeneFieldWindows {
  public delegate bool EnumProc(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr param);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder text, int count);
  public class Window { public uint Pid; public string Title; public string Class; }
  public static List<Window> Visible() {
    var result = new List<Window>();
    EnumWindows((window, param) => {
      if(IsWindowVisible(window)) {
        uint pid; GetWindowThreadProcessId(window, out pid);
        var title = new StringBuilder(1024); var cls = new StringBuilder(256);
        GetWindowText(window, title, 1024); GetClassName(window, cls, 256);
        result.Add(new Window { Pid=pid, Title=title.ToString(), Class=cls.ToString() });
      }
      return true;
    }, IntPtr.Zero);
    return result;
  }
}
'@
# Ordinary installed launch: no debugging, proxy, Python test hook or Vite.
Remove-Item Env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS -ErrorAction SilentlyContinue
Remove-Item Env:WEBVIEW2_USER_DATA_FOLDER -ErrorAction SilentlyContinue
Remove-Item Env:GENEFIELD_VERIFY_OFFLINE -ErrorAction SilentlyContinue
$taskApp = Start-Process -FilePath $Application -WorkingDirectory ([IO.Path]::GetDirectoryName($Application)) -PassThru
try {
  $taskDeadline=[DateTime]::UtcNow.AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 200
    $taskRows=Get-CimInstance Win32_Process
    $taskSidecar=@($taskRows | Where-Object { $_.ParentProcessId -eq $taskApp.Id -and $_.Name -eq 'genefield-final-v1.exe' })
  } while ($taskSidecar.Count -ne 1 -and [DateTime]::UtcNow -lt $taskDeadline)
  if ($taskSidecar.Count -ne 1) { throw 'Expected exactly one normal-launch sidecar' }
  Start-Sleep -Seconds 2
  $taskIds=@($taskApp.Id)
  do {
    $taskOldCount=$taskIds.Count
    $taskIds=@($taskIds + @($taskRows | Where-Object { $taskIds -contains $_.ParentProcessId } | Select-Object -ExpandProperty ProcessId) | Select-Object -Unique)
  } while ($taskIds.Count -gt $taskOldCount)
  $taskWindows=@([GeneFieldWindows]::Visible() | Where-Object { $taskIds -contains $_.Pid })
  $taskConsole=@($taskWindows | Where-Object { $_.Class -eq 'ConsoleWindowClass' -or $_.Title -match 'cmd.exe|powershell|Python|Traceback' })
  if ($taskConsole.Count -gt 0) { throw 'Unwanted console window found' }
  if (@($taskWindows | Where-Object Title -eq 'GeneField').Count -ne 1) { throw 'Expected visible GeneField window' }
  $taskResult=@{result='PASS';normal_launch=$true;app_pid=$taskApp.Id;sidecar_pid=$taskSidecar[0].ProcessId;visible_windows=$taskWindows;console_windows=$taskConsole}
} finally {
  if (-not $taskApp.HasExited) { $taskApp.CloseMainWindow() | Out-Null; if(-not $taskApp.WaitForExit(15000)) { throw 'Normal application close timed out' } }
}
if (Get-Process -Id $taskSidecar[0].ProcessId -ErrorAction SilentlyContinue) { throw 'Sidecar survived normal window close' }
$taskResult['clean_shutdown']=$true
$taskResult | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 docs/evidence/release/normal-console.json
$taskResult | ConvertTo-Json -Depth 5
