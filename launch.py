"""
Patent Value Explorer — Bootstrap & Launch

Handles everything: pip install MCP, npm install, build, start MCP + app server.
Designed to be called from a Jupyter notebook cell.
"""

import html
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

PROJECT_DIR = Path(__file__).parent
MCP_PORT = 8082
APP_PORT = 52080

try:
    from IPython.display import HTML, clear_output, display
    IN_NOTEBOOK = True
except ImportError:
    IN_NOTEBOOK = False

_processes: list[subprocess.Popen] = []


def _log(msg: str, escape: bool = True) -> None:
    safe_msg = html.escape(msg) if escape else msg
    if IN_NOTEBOOK:
        clear_output(wait=True)
        display(HTML(
            f"<div style='font-family:system-ui,sans-serif;padding:20px;"
            f"background:#f8fafc;border-left:4px solid #082453;border-radius:8px;'>"
            f"<div style='font-size:15px;color:#334155;'>{safe_msg}</div></div>"
        ))
    else:
        print(msg)


def _port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) == 0


def _kill_port(port: int) -> None:
    """Best-effort: kill processes listening on a TCP port (orphans from prior runs)."""
    try:
        import psutil
    except ImportError:
        return
    for proc in psutil.process_iter(["pid"]):
        try:
            conns = (proc.net_connections if hasattr(proc, "net_connections") else proc.connections)(kind="tcp")
            for conn in conns:
                if conn.laddr and conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
                    proc.kill()
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue


def _wait_for_port(port: int, timeout: int = 15) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if _port_in_use(port):
            return True
        time.sleep(0.3)
    return False


def _wait_for_health(port: int, timeout: int = 15) -> bool:
    url = f"http://127.0.0.1:{port}/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = urlopen(url, timeout=2)
            if resp.status == 200:
                return True
        except (URLError, OSError):
            pass
        time.sleep(0.5)
    return False


def _run(cmd: list[str], cwd: Path = PROJECT_DIR, timeout: int = 600) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else result.stdout.strip()
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{stderr}")
    return result


def stop() -> None:
    """Stop all running Patent Value Explorer processes."""
    for proc in _processes:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
    _processes.clear()
    if IN_NOTEBOOK:
        clear_output(wait=True)
        display(HTML(
            "<div style='font-family:system-ui,sans-serif;padding:20px;"
            "background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;'>"
            "<div style='font-size:15px;color:#991b1b;'>Patent Value Explorer stopped.</div></div>"
        ))
    else:
        print("Patent Value Explorer stopped.")


def launch() -> None:
    """Full bootstrap: install MCP, npm deps, build, start MCP + app."""
    global _processes

    if _processes:
        stop()

    try:
        # 1. Check Node.js
        _log("⏳ Checking environment...")
        if not shutil.which("node"):
            raise RuntimeError("Node.js not found. Contact your TIP administrator.")
        node_version = subprocess.run(
            ["node", "--version"], capture_output=True, text=True
        ).stdout.strip()

        # 2. Install mtc-patstat-mcp-lite + psutil (for orphan port cleanup)
        _log("⏳ Installing mtc.berlin PATSTAT MCP...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--user",
             "psutil>=5.9",
             "git+https://github.com/mtcberlin/mtc-patstat-mcp-lite.git"
             "@334098aedc7a3242a6fbcdd10034be8bb1b0c55a"],
            capture_output=True, text=True, check=True,
        )
        # Ensure ~/.local/bin is in PATH (pip --user installs scripts there)
        local_bin = os.path.expanduser("~/.local/bin")
        if local_bin not in os.environ.get("PATH", ""):
            os.environ["PATH"] = local_bin + ":" + os.environ["PATH"]

        # 3. npm install (skip if already done)
        marker = PROJECT_DIR / "node_modules" / ".package-lock.json"
        if not marker.exists():
            _log("⏳ Installing dependencies (first run, ~30s)...")
            _run(["npm", "ci", "--legacy-peer-deps"])
        else:
            _log("⏳ Dependencies already installed, skipping...")

        # 4. Build (skip if up-to-date)
        build_index = PROJECT_DIR / "build" / "index.js"
        needs_build = not build_index.exists()
        if not needs_build:
            build_mtime = build_index.stat().st_mtime
            for f in (PROJECT_DIR / "src").rglob("*"):
                if f.is_file() and f.stat().st_mtime > build_mtime:
                    needs_build = True
                    break

        if needs_build:
            _log("⏳ Building app...")
            _run(["npm", "run", "build"])

        # 5. Free ports from orphaned processes (e.g. kernel restart)
        for port in (MCP_PORT, APP_PORT):
            if _port_in_use(port):
                _log(f"⏳ Port {port} busy, cleaning up orphaned process...")
                _kill_port(port)
                time.sleep(0.5)
                if _port_in_use(port):
                    raise RuntimeError(
                        f"Port {port} still in use after cleanup attempt."
                    )

        # 6. Start MCP server
        _log("⏳ Starting mtc.berlin PATSTAT MCP...")
        mcp_proc = subprocess.Popen(
            [sys.executable, "-m", "patstat_mcp.server", "--http", "--port", str(MCP_PORT)],
            env=os.environ.copy(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        _processes.append(mcp_proc)
        if not _wait_for_port(MCP_PORT, timeout=15):
            raise RuntimeError("mtc.berlin PATSTAT MCP failed to start.")

        # 7. Start app
        _log("⏳ Starting Patent Value Explorer...")
        app_proc = subprocess.Popen(
            ["node", "build/index.js"],
            cwd=PROJECT_DIR,
            env={
                **os.environ,
                "PORT": str(APP_PORT),
                "PATSTAT_MCP_URL": f"http://127.0.0.1:{MCP_PORT}/mcp",
                "NODE_ENV": "production",
            },
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        _processes.append(app_proc)
        if not _wait_for_health(APP_PORT, timeout=15):
            raise RuntimeError("App server did not become healthy within 15 seconds.")

        # 8. Done — show link
        base = os.environ.get("JUPYTERHUB_SERVICE_PREFIX", "")
        url = f"{base}proxy/{APP_PORT}/" if base else f"http://localhost:{APP_PORT}/"

        if IN_NOTEBOOK:
            clear_output(wait=True)
            display(HTML(f"""
            <div style="font-family:system-ui,sans-serif;text-align:center;padding:32px;">
                <div style="font-size:15px;color:#059669;font-weight:600;margin-bottom:16px;">
                    ✅ Patent Value Explorer is running
                </div>
                <a href="{url}" target="_blank"
                   style="display:inline-block;padding:14px 32px;
                          background:#082453;color:white;border-radius:0;
                          text-decoration:none;font-size:16px;font-weight:600;">
                    Patent Value Explorer öffnen →
                </a>
                <div style="margin-top:12px;font-size:12px;color:#9ca3af;">
                    Node {node_version} · MCP :{MCP_PORT} · App :{APP_PORT}
                </div>
            </div>"""))
        else:
            print(f"\nPatent Value Explorer is running!\nOpen: {url}")

    except Exception as e:
        if _processes:
            stop()
        if IN_NOTEBOOK:
            clear_output(wait=True)
            display(HTML(f"""
            <div style="font-family:system-ui,sans-serif;padding:20px;
                        background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;">
                <div style="font-size:15px;font-weight:600;color:#991b1b;">Start failed</div>
                <div style="font-size:13px;color:#7f1d1d;margin-top:4px;">{html.escape(str(e))}</div>
            </div>"""))
        else:
            print(f"ERROR: {e}")


# Auto-launch when exec'd from notebook
launch()
