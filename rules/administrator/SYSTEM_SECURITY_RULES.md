# System Security Rules

## Windows Security

### Windows Defender
```powershell
# Check status
Get-MpComputerStatus

# Update definitions
Update-MpSignature

# Quick scan
Start-MpScan -ScanType QuickScan

# Full scan
Start-MpScan -ScanType FullScan

# Scan specific path
Start-MpScan -ScanPath "C:\Cursor Projects"

# Add exclusion (for dev folders)
Add-MpPreference -ExclusionPath "C:\Cursor Projects"
Add-MpPreference -ExclusionPath "$env:USERPROFILE\node_modules"
Add-MpPreference -ExclusionProcess "node.exe"
Add-MpPreference -ExclusionProcess "code.exe"
```

### Windows Firewall
```powershell
# Check status
Get-NetFirewallProfile | Select-Object Name, Enabled

# Enable/Disable (use with caution)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### User Account Control (UAC)
```powershell
# Check UAC status
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" | Select-Object EnableLUA

# Run as admin
Start-Process powershell -Verb RunAs
```

## Credential Management

### Windows Credential Manager
```powershell
# List stored credentials
cmdkey /list

# Add credential
cmdkey /generic:MyCredential /user:username /pass:password

# Delete credential
cmdkey /delete:MyCredential
```

### Environment Variable Secrets
```powershell
# Set sensitive env var (user level)
[System.Environment]::SetEnvironmentVariable("API_SECRET", "value", "User")

# Never use machine level for secrets in shared environments
```

### .env Files
```powershell
# Ensure .env is in .gitignore
Add-Content .gitignore ".env"
Add-Content .gitignore ".env.local"
Add-Content .gitignore ".env.*.local"

# Template for required vars
Copy-Item .env.example .env
```

## File Permissions

### View Permissions
```powershell
# NTFS permissions
Get-Acl "C:\path\to\file" | Format-List

# icacls
icacls "C:\path\to\file"
```

### Set Permissions
```powershell
# Grant full control
icacls "C:\path" /grant "Username:(OI)(CI)F"

# Remove inheritance
icacls "C:\path" /inheritance:r

# Reset permissions
icacls "C:\path" /reset
```

### Secure Files
```powershell
# Remove all access except owner
icacls "C:\sensitive\file.txt" /inheritance:r
icacls "C:\sensitive\file.txt" /grant:r "$env:USERNAME:(R,W)"
```

## SSH Key Management

### Generate SSH Key
```powershell
# Generate key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Or RSA (wider compatibility)
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"
```

### SSH Config
```powershell
# Create config file
New-Item -Path "$env:USERPROFILE\.ssh\config" -ItemType File -Force

# Example config
@"
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519

Host *
    AddKeysToAgent yes
"@ | Set-Content "$env:USERPROFILE\.ssh\config"
```

### SSH Agent
```powershell
# Start SSH agent service
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

# Add key to agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"

# List keys in agent
ssh-add -l
```

## GPG Key Management

### Install GPG
```powershell
winget install GnuPG.GnuPG
```

### Generate Key
```powershell
gpg --full-generate-key
```

### List Keys
```powershell
gpg --list-secret-keys --keyid-format=long
```

### Export Public Key
```powershell
gpg --armor --export your.email@example.com > public-key.asc
```

### Configure Git to Sign
```powershell
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

## Security Scanning

### npm Audit
```powershell
npm audit
npm audit fix
```

### Snyk (Vulnerability Scanner)
```powershell
# Install
npm install -g snyk

# Authenticate
snyk auth

# Test project
snyk test

# Monitor project
snyk monitor
```

### Trivy (Container Security)
```powershell
# Install
choco install trivy -y

# Scan image
trivy image myimage:latest

# Scan filesystem
trivy fs .
```

## Security Best Practices

1. **Never commit secrets**
2. **Use .env files locally**
3. **Rotate credentials regularly**
4. **Use least privilege principle**
5. **Enable 2FA everywhere**
6. **Audit dependencies regularly**
7. **Keep systems updated**
8. **Use SSH keys, not passwords**
9. **Encrypt sensitive data**
10. **Monitor for suspicious activity**

## Incident Response

### If Secrets Exposed
1. **Revoke immediately** - Don't wait
2. **Rotate credentials**
3. **Audit access logs**
4. **Clean git history if committed**
5. **Notify affected parties**
6. **Document the incident**

### Git History Cleanup (if secrets committed)
```powershell
# DANGER: Rewrites history
# Use BFG Repo-Cleaner
java -jar bfg.jar --replace-text passwords.txt repo.git

# Or git-filter-repo
git-filter-repo --replace-text passwords.txt

# Force push (after coordination with team)
git push --force
```
