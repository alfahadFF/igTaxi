# نشر نظام التسعير لقاعدة البيانات
$headers = @{
    "Content-Type" = "application/json"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw"
}

# قراءة نظام التسعير من الملف
$sqlContent = Get-Content "SIMPLE_TAXI_SYSTEM.sql" -Raw

# تقسيم الأوامر
$commands = $sqlContent -split ";\s*(?=CREATE|INSERT|ALTER|DROP|--)"

foreach ($command in $commands) {
    if ($command.Trim() -and -not $command.Trim().StartsWith("--")) {
        try {
            $body = @{ 
                "query" = $command.Trim()
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "https://gemjqbxmfkclfgvscqbj.supabase.co/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
            Write-Host "✅ تم تنفيذ: $($command.Substring(0, [Math]::Min(50, $command.Length)))..." -ForegroundColor Green
        }
        catch {
            Write-Host "❌ خطأ في: $($command.Substring(0, [Math]::Min(50, $command.Length)))..." -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    }
}
