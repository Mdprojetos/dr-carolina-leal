# Servidor local simples para testar o site no Windows (sem Node/Python).
# Uso: powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8080]
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Servindo $root em http://localhost:$Port/ (Ctrl+C para parar)"

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.svg' = 'image/svg+xml'; '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '') { $path = 'index.html' }
  $file = [System.IO.Path]::GetFullPath((Join-Path $root $path))
  if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
