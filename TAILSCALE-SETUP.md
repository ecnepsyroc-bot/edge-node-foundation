# Tailscale Integration for Botta e Risposta
**Secure Remote Access Configuration**

## Overview
Tailscale creates a secure mesh network, allowing your shop communication tool to be accessed from any device on your Tailscale network without opening firewall ports or configuring complex VPNs.

## Benefits
- ✅ Zero-configuration secure networking
- ✅ Access from anywhere (shop floor, office, home, mobile)
- ✅ No port forwarding needed
- ✅ Encrypted connections by default
- ✅ Works with PostgreSQL and Node.js server
- ✅ Multi-platform (Windows, Mac, Linux, iOS, Android)

## Setup Steps

### 1. Install Tailscale on Server (This Machine)
```powershell
# Install via winget
winget install Tailscale.Tailscale

# Or download from: https://tailscale.com/download/windows
```

### 2. Authenticate and Connect
```powershell
# Start Tailscale
tailscale up

# Get your Tailscale IP
tailscale ip -4
```

### 3. Configure Server for Tailscale Access

**Update `server.js` to listen on all interfaces:**
```javascript
// Current: server.listen(PORT, () => {
// Change to:
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Get local network IP
  const networkIP = getNetworkIP();
  if (networkIP) {
    console.log(`Network access: http://${networkIP}:${PORT}`);
  }
  
  // Get Tailscale IP
  const { execSync } = require('child_process');
  try {
    const tailscaleIP = execSync('tailscale ip -4', { encoding: 'utf8' }).trim();
    if (tailscaleIP) {
      console.log(`Tailscale access: http://${tailscaleIP}:${PORT}`);
    }
  } catch (err) {
    // Tailscale not installed or not running
  }
});
```

### 4. PostgreSQL Configuration for Tailscale

**Edit `postgresql.conf`:**
```
# Location: C:\Program Files\PostgreSQL\16\data\postgresql.conf

# Listen on all interfaces (including Tailscale)
listen_addresses = '*'  # or 'localhost,100.x.x.x' for specific Tailscale IP
```

**Edit `pg_hba.conf`:**
```
# Location: C:\Program Files\PostgreSQL\16\data\pg_hba.conf

# Add line for Tailscale network (100.64.0.0/10)
host    botta_risposta    botta_user    100.64.0.0/10    scram-sha-256
```

**Restart PostgreSQL:**
```powershell
Restart-Service postgresql-x64-16
```

### 5. Install Tailscale on Client Devices

**Windows/Mac/Linux:**
- Download from: https://tailscale.com/download

**iOS/Android:**
- Install from App Store / Google Play Store

**Connect to Same Network:**
- All devices must use the same Tailscale account
- Devices will automatically see each other

## Access URLs

Once Tailscale is running on all devices:

### From Any Tailscale Device
```
http://[tailscale-ip]:3000
```

Example:
```
http://100.92.15.83:3000
```

### Find Tailscale IP
```powershell
# On server machine
tailscale ip -4

# From another device
tailscale status
# Look for the server machine name and its IP
```

## Database Connection via Tailscale

When connecting to PostgreSQL from remote Tailscale devices:

```javascript
const pool = new Pool({
  host: '100.92.15.83',  // Server's Tailscale IP
  port: 5432,
  database: 'botta_risposta',
  user: 'botta_user',
  password: process.env.DB_PASSWORD,
});
```

## Security Considerations

### Tailscale Security Features
- ✅ End-to-end encryption (WireGuard protocol)
- ✅ Per-device authentication
- ✅ Access control lists (ACLs) available
- ✅ No exposed public ports
- ✅ Automatic key rotation

### PostgreSQL Security
- ✅ Password authentication required
- ✅ Scoped to Tailscale network (100.64.0.0/10)
- ✅ Per-database, per-user access control
- ✅ Encrypted connections recommended (SSL)

### Recommended: Enable SSL for PostgreSQL
```powershell
# Generate self-signed certificate (for testing)
cd "C:\Program Files\PostgreSQL\16\data"
openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key

# Edit postgresql.conf
# ssl = on
# ssl_cert_file = 'server.crt'
# ssl_key_file = 'server.key'

# Restart PostgreSQL
Restart-Service postgresql-x64-16
```

## Tailscale ACL Example (Optional)

To restrict which devices can access the server:

**In Tailscale Admin Console (https://login.tailscale.com/admin/acls):**
```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:shop-workers"],
      "dst": ["tag:server:3000", "tag:server:5432"]
    }
  ],
  "tagOwners": {
    "tag:server": ["your-email@example.com"]
  }
}
```

## Testing Tailscale Access

### 1. Verify Server is Accessible
```powershell
# On server machine
tailscale ip -4
# Example output: 100.92.15.83

# Test local access
curl http://localhost:3000

# Test Tailscale access
curl http://100.92.15.83:3000
```

### 2. Test from Client Device
```powershell
# On client machine (also on Tailscale)
tailscale status
# Find server machine in the list

# Test connection
curl http://[server-tailscale-ip]:3000
```

### 3. Test PostgreSQL Connection
```powershell
# From client device
psql -h [server-tailscale-ip] -p 5432 -U botta_user -d botta_risposta
```

## Mobile Access (iOS/Android)

1. Install Tailscale app
2. Sign in with same account
3. Open browser and navigate to: `http://[server-tailscale-ip]:3000`
4. Shop workers can access from their phones anywhere

## Advantages for Shop Environment

### Multi-Location Access
- Shop floor workers (local network)
- Office staff (same building)
- Remote managers (from home)
- Mobile access (walking around shop)

### No IT Configuration Needed
- No router port forwarding
- No firewall rules
- No static IP addresses
- No DNS configuration

### Automatic Device Discovery
- Devices see each other by name
- No need to remember IP addresses
- Use: `http://edge-node-1:3000`

## Environment Variables Update

Add to `.env`:
```
# Server Configuration
PORT=3000
LISTEN_HOST=0.0.0.0

# Tailscale
TAILSCALE_ENABLED=true
```

## Troubleshooting

### Can't Connect via Tailscale
```powershell
# Check Tailscale status
tailscale status

# Ping server from client
ping [server-tailscale-ip]

# Check if server is listening
netstat -an | Select-String "3000"
```

### PostgreSQL Connection Refused
```powershell
# Check PostgreSQL is listening
netstat -an | Select-String "5432"

# Verify pg_hba.conf includes Tailscale network
Get-Content "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"

# Check PostgreSQL logs
Get-Content "C:\Program Files\PostgreSQL\16\data\log\*.log" -Tail 50
```

### Slow Performance
- Check Tailscale relay status: `tailscale status`
- Prefer direct connections (DERP relay is slower)
- Enable MagicDNS for easier access

## Migration Impact

With Tailscale + PostgreSQL:
- ✅ Same migration process
- ✅ PostgreSQL configuration requires one extra step (listen_addresses)
- ✅ Access from any Tailscale device
- ✅ No additional security concerns
- ✅ Easier multi-device testing

## Future Enhancements

1. **Tailscale SSH:** Remote server management
2. **Tailscale Serve:** HTTPS with automatic certificates
3. **Exit Nodes:** Access shop network resources
4. **Subnet Routing:** Connect entire shop network

---

**Setup Time:** 15-30 minutes  
**Difficulty:** Easy  
**Recommended:** Yes, for any multi-device deployment
