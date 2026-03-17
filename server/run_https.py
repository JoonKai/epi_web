from __future__ import annotations

import ipaddress
import os
import socket
from datetime import datetime, timedelta, timezone
from pathlib import Path

import uvicorn
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


BASE_DIR = Path(__file__).resolve().parent
CERT_DIR = BASE_DIR / "certs"
CERT_FILE = CERT_DIR / "server-cert.pem"
KEY_FILE = CERT_DIR / "server-key.pem"

HOST = os.getenv("APP_HOST", "0.0.0.0")
PORT = int(os.getenv("APP_HTTPS_PORT", os.getenv("APP_PORT", "8443")))


def _collect_hostnames() -> tuple[list[str], list[ipaddress.IPv4Address | ipaddress.IPv6Address]]:
    names = {"localhost", socket.gethostname()}
    ips: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = {
        ipaddress.ip_address("127.0.0.1")
    }

    try:
        fqdn = socket.getfqdn()
        if fqdn:
            names.add(fqdn)
    except OSError:
        pass

    try:
        _, aliases, addresses = socket.gethostbyname_ex(socket.gethostname())
        names.update(alias for alias in aliases if alias)
        for address in addresses:
            try:
                ips.add(ipaddress.ip_address(address))
            except ValueError:
                continue
    except OSError:
        pass

    return sorted(names), sorted(ips, key=str)


def ensure_self_signed_cert() -> tuple[Path, Path]:
    if CERT_FILE.exists() and KEY_FILE.exists():
        return CERT_FILE, KEY_FILE

    CERT_DIR.mkdir(parents=True, exist_ok=True)
    hostnames, ip_addresses = _collect_hostnames()

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "KR"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "EPI"),
            x509.NameAttribute(NameOID.COMMON_NAME, hostnames[0]),
        ]
    )

    san_entries: list[x509.GeneralName] = [x509.DNSName(name) for name in hostnames]
    san_entries.extend(x509.IPAddress(ip) for ip in ip_addresses)

    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.SubjectAlternativeName(san_entries), critical=False)
        .sign(key, hashes.SHA256())
    )

    KEY_FILE.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    CERT_FILE.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return CERT_FILE, KEY_FILE


def main() -> None:
    cert_file, key_file = ensure_self_signed_cert()
    print(f"[HTTPS] certificate: {cert_file}")
    print(f"[HTTPS] key: {key_file}")
    print(f"[HTTPS] server starting on https://localhost:{PORT}")
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=False,
        ssl_certfile=str(cert_file),
        ssl_keyfile=str(key_file),
    )


if __name__ == "__main__":
    main()
