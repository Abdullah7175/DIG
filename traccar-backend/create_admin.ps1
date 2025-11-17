# Create DIG Traffic Admin User
$userData = @{
    name = "DIG Admin"
    email = "admin@digtraffic.pk"
    password = "admin123"
    administrator = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8082/api/users" -Method POST -Body $userData -ContentType "application/json"
    Write-Host "Admin user created successfully!"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error creating admin user: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}

