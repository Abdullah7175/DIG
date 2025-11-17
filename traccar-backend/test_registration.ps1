# Test different approaches to create admin user
try {
    Write-Host "Checking server configuration..."
    $serverResponse = Invoke-WebRequest -Uri "http://localhost:8082/api/server" -Method GET
    $serverConfig = $serverResponse.Content | ConvertFrom-Json
    Write-Host "Registration enabled: $($serverConfig.registration)"
    
    Write-Host "`nTrying to create admin user with minimal required fields..."
    $userData = @{
        name = "DIG Admin"
        email = "admin@digtraffic.pk"
        password = "admin123"
    } | ConvertTo-Json
    
    Write-Host "Trying minimal user data..."
    Write-Host $userData
    
    $response = Invoke-WebRequest -Uri "http://localhost:8082/api/users" -Method POST -Body $userData -ContentType "application/json"
    Write-Host "Admin user created successfully!"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
    
    Write-Host "`nTrying alternative approach - check if we can access any endpoints without auth..."
    try {
        $testResponse = Invoke-WebRequest -Uri "http://localhost:8082/api/session" -Method GET
        Write-Host "Session endpoint accessible: $($testResponse.StatusCode)"
    } catch {
        Write-Host "Session endpoint error: $($_.Exception.Message)"
    }
}

