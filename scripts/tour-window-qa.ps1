# Resize only the explicitly selected QA process. No app capability changes.
param([Parameter(Mandatory = $true)][int]$TourProcessId)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class GeneFieldTourWindow {
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
}
'@
$tourWindow = (Get-Process -Id $TourProcessId).MainWindowHandle
if ($tourWindow -eq [IntPtr]::Zero) { throw 'The QA process has no native window.' }
while ($tourLine = [Console]::ReadLine()) {
  $tourDimensions = $tourLine.Split(',')
  $tourResized = [GeneFieldTourWindow]::SetWindowPos($tourWindow, [IntPtr]::Zero, 0, 0, [int]$tourDimensions[0], [int]$tourDimensions[1], 0x0016)
  if (!$tourResized) { throw 'Could not resize the QA window.' }
  [Console]::WriteLine('resized')
}
