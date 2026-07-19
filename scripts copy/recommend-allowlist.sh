#!/usr/bin/env bash
set -euo pipefail

echo "Candidatas de allowlist para ParamascotasEC"
echo

echo "IPs del servidor:"
hostname -I | tr ' ' '\n' | sed '/^$/d' | sed 's/^/  - /'
echo

echo "Subredes privadas detectadas:"
ip -o -4 addr show up scope global | awk '
  {
    split($4, a, "/");
    ip=a[1];
    prefix=a[2];
    if (ip ~ /^10\./ || ip ~ /^192\.168\./ || ip ~ /^172\.(1[6-9]|2[0-9]|3[0-1])\./) {
      if (prefix > 24) prefix = 24;
      split(ip, octets, ".");
      printf("  - %s.%s.%s.0/%s\n", octets[1], octets[2], octets[3], prefix);
    }
  }
' | sort -u
echo

echo "Conexiones recientes al gateway (80/443):"
ss -tn state established '( sport = :80 or sport = :443 )' 2>/dev/null \
  | awk 'NR>1 {print $5}' \
  | sed 's/.*ffff://; s/^\[//; s/\]$//' \
  | awk -F: '{print $1}' \
  | sed '/^$/d' \
  | sort -u \
  | sed 's/^/  - /' || true
echo

echo "Modo recomendado si administras desde LAN/VPN:"
echo "  PANEL_IP_MODE=private"
echo "  ADMIN_IP_MODE=private"
echo "  # Permite loopback y redes privadas RFC1918; bloquea administracion desde Internet abierto."
echo
echo "Si tus IPs publicas cambian y no tienes VPN:"
echo "  PANEL_IP_MODE=off"
echo "  ADMIN_IP_MODE=off"
echo "  # Mantiene acceso admin disponible y depende de MFA, bloqueo de intentos y sesiones seguras."
echo
echo "Sugerencia si usas una VPN o IP estatica:"
echo "  PANEL_IP_MODE=custom"
echo "  ADMIN_IP_MODE=custom"
echo "  PANEL_IP_ALLOWLIST=127.0.0.1,YOUR_STATIC_IP/32"
echo "  ADMIN_IP_ALLOWLIST=127.0.0.1,YOUR_STATIC_IP/32"
echo
echo "Antes de activar custom en produccion, confirma tus IPs cliente reales."
