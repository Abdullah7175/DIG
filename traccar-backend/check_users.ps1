# Check if there are any existing users by trying to access the API
try {
    Write-Host "Checking if server is accessible..."
    $serverResponse = Invoke-WebRequest -Uri "http://localhost:8082/api/server" -Method GET
    Write-Host "Server Status: $($serverResponse.StatusCode)"
    
    Write-Host "`nChecking users endpoint (expecting 401 - this is normal)..."
    try {
        $usersResponse = Invoke-WebRequest -Uri "http://localhost:8082/api/users" -Method GET
        Write-Host "Users endpoint accessible: $($usersResponse.StatusCode)"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "Users endpoint requires authentication (401) - this is expected"
        } else {
            Write-Host "Unexpected error: $($_.Exception.Message)"
        }
    }
    
    Write-Host "`nTrying to create admin user with different format..."
    $userData = @{
        name = "DIG Admin"
        email = "admin@digtraffic.pk"
        password = "admin123"
        administrator = $true
    } | ConvertTo-Json -Depth 3
    
    Write-Host "User data to send:"
    Write-Host $userData
    
    $response = Invoke-WebRequest -Uri "http://localhost:8082/api/users" -Method POST -Body $userData -ContentType "application/json"
    Write-Host "Admin user created successfully!"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}

