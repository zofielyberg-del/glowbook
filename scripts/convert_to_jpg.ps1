Add-Type -AssemblyName System.Drawing

$dirs = @(
    'C:\Users\zofie\Projects\glowbook\public\presentations\partner',
    'C:\Users\zofie\Projects\glowbook\public\presentations\linnea',
    'C:\Users\zofie\Projects\sofiesrepository\public\presentations\partner',
    'C:\Users\zofie\Projects\sofiesrepository\public\presentations\linnea'
)

foreach ($dir in $dirs) {
    for ($i = 1; $i -le 6; $i++) {
        $num = "{0:D2}" -f $i
        $png = Join-Path $dir "slide_$num.png"
        $jpg = Join-Path $dir "slide_$num.jpg"
        if (Test-Path $png) {
            $img = [System.Drawing.Image]::FromFile($png)
            $bmp = New-Object System.Drawing.Bitmap($img)
            $img.Dispose()
            $bmp.Save($jpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $bmp.Dispose()
            Write-Output "Saved JPG: $jpg"
        }
    }
}
