# Servidor estático mínimo para probar el sitio en http://localhost:8080 (sin instalar nada).
# Uso: powershell -ExecutionPolicy Bypass -File servidor-local.ps1
param([int]$Puerto = 8080)
$raiz = $PSScriptRoot
$tipos = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".json" = "application/json"; ".svg" = "image/svg+xml"; ".png" = "image/png" }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Puerto/")
$listener.Start()
Write-Host "Sirviendo $raiz en http://localhost:$Puerto/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ($ruta -eq "") { $ruta = "index.html" }
  $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
  if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($archivo)
    $ext = [IO.Path]::GetExtension($archivo)
    $ctx.Response.ContentType = if ($tipos[$ext]) { $tipos[$ext] } else { "application/octet-stream" }
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
