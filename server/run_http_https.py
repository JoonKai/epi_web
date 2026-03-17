from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from run_https import ensure_self_signed_cert


BASE_DIR = Path(__file__).resolve().parent
HOST = os.getenv("APP_HOST", "0.0.0.0")
HTTP_PORT = int(os.getenv("APP_HTTP_PORT", "8000"))
HTTPS_PORT = int(os.getenv("APP_HTTPS_PORT", os.getenv("APP_PORT", "8443")))


def _spawn_process(command: list[str]) -> subprocess.Popen:
    return subprocess.Popen(command, cwd=BASE_DIR)


def _terminate(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    try:
        process.terminate()
        process.wait(timeout=5)
    except Exception:
        process.kill()


def main() -> None:
    cert_file, key_file = ensure_self_signed_cert()

    http_command = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        HOST,
        "--port",
        str(HTTP_PORT),
    ]
    https_command = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        HOST,
        "--port",
        str(HTTPS_PORT),
        "--ssl-certfile",
        str(cert_file),
        "--ssl-keyfile",
        str(key_file),
    ]

    print(f"[HTTP]  server starting on http://localhost:{HTTP_PORT}")
    print(f"[HTTPS] server starting on https://localhost:{HTTPS_PORT}")

    http_process = _spawn_process(http_command)
    https_process = _spawn_process(https_command)

    try:
        while True:
            if http_process.poll() is not None:
                raise RuntimeError(f"HTTP server stopped with exit code {http_process.returncode}")
            if https_process.poll() is not None:
                raise RuntimeError(f"HTTPS server stopped with exit code {https_process.returncode}")
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[STOP] stopping HTTP/HTTPS servers...")
    finally:
        _terminate(http_process)
        _terminate(https_process)


if __name__ == "__main__":
    if hasattr(signal, "SIGINT"):
        signal.signal(signal.SIGINT, signal.default_int_handler)
    main()
