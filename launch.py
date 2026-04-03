"""
Patent Value Explorer — Jupyter Notebook Launcher

Orchestrates install, build, start, and stop for the SvelteKit application.
Designed for EPO TIP JupyterHub but works standalone too.
"""

import html
import os
import socket
import subprocess
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

PROJECT_DIR = Path(__file__).parent
APP_PORT = 52080
_processes: list[subprocess.Popen] = []


def _log(msg: str, escape: bool = True) -> None:
    """Display styled HTML in Jupyter, plain text in CLI.

    Args:
        msg: Message to display. May contain HTML when escape=False.
        escape: If True, html-escape the message before embedding in HTML.
    """
    safe_msg = html.escape(msg) if escape else msg
    try:
        from IPython.display import HTML, display

        display(
            HTML(
                f"<div style='padding:8px;background:#f0f0f0;border-left:4px solid #082453;"
                f"margin:4px 0;font-family:monospace'>{safe_msg}</div>"
            )
        )
    except Exception:
        print(msg)


def _port_in_use(port: int) -> bool:
    """Check if a port is already in use via socket probe."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) == 0


def _wait_for_health(port: int, timeout: int = 15) -> bool:
    """Poll /health endpoint until HTTP 200. Returns True if healthy."""
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


def _run(
    cmd: list[str], cwd: Path = PROJECT_DIR, timeout: int = 600
) -> subprocess.CompletedProcess:
    """Run a subprocess with error handling, logging, and timeout.

    Args:
        cmd: Command and arguments to run.
        cwd: Working directory.
        timeout: Max seconds before killing the process (default 10 min).
    """
    cmd_str = " ".join(cmd)
    _log(f"$ {cmd_str}", escape=False)
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"Command timed out after {timeout}s: {cmd_str}"
        )
    if result.stdout and result.stdout.strip():
        _log(result.stdout.strip()[:2000])
    if result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else result.stdout.strip()
        raise RuntimeError(f"Command failed ({result.returncode}): {cmd_str}\n{stderr}")
    return result


def stop() -> None:
    """Gracefully stop all tracked server processes."""
    if not _processes:
        _log("No running processes to stop.")
        return
    for proc in _processes:
        if proc.poll() is None:
            _log(f"Stopping process {proc.pid}...", escape=False)
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                _log(f"Force-killing process {proc.pid}", escape=False)
                proc.kill()
                proc.wait()
    _processes.clear()
    _log("All processes stopped.")


def launch() -> None:
    """Install, build, start server, and print access URL."""
    _log("<b>Patent Value Explorer</b> &mdash; Starting...", escape=False)

    # Stage 1: Check Node.js available
    _log("<b>Stage 1:</b> Checking Node.js...", escape=False)
    try:
        result = _run(["node", "--version"])
        _log(f"Node.js {result.stdout.strip()} found")
    except (RuntimeError, FileNotFoundError):
        _log("<span style='color:red'>Node.js not found. Please install Node.js 22+ and pnpm.</span>", escape=False)
        return

    # Stage 2: pnpm install (skip if node_modules/.package-lock.json exists)
    lock_file = PROJECT_DIR / "node_modules" / ".package-lock.json"
    if lock_file.exists():
        _log("<b>Stage 2:</b> Dependencies already installed, skipping pnpm install", escape=False)
    else:
        _log("<b>Stage 2:</b> Installing dependencies...", escape=False)
        _run(["pnpm", "install"], cwd=PROJECT_DIR)
        _log("Dependencies installed")

    # Stage 3: pnpm build (skip if build/index.js newer than most recent src/ change)
    build_index = PROJECT_DIR / "build" / "index.js"
    skip_build = False
    if build_index.exists():
        src_dir = PROJECT_DIR / "src"
        src_files = [f for f in src_dir.rglob("*") if f.is_file()]
        if src_files:
            src_mtime = max(f.stat().st_mtime for f in src_files)
            if build_index.stat().st_mtime > src_mtime:
                skip_build = True

    if skip_build:
        _log("<b>Stage 3:</b> Build is up-to-date, skipping pnpm build", escape=False)
    else:
        _log("<b>Stage 3:</b> Building application...", escape=False)
        _run(["pnpm", "build"], cwd=PROJECT_DIR)
        _log("Build complete")

    # Stage 4: Check port is free
    if _port_in_use(APP_PORT):
        _log(
            f"<span style='color:red'><b>Error:</b> Port {APP_PORT} is already in use.</span><br>"
            f"Try <code>stop()</code> first. If that doesn't help, the port may be held by "
            f"an orphaned process from a previous session. "
            f"Run <code>!lsof -ti :{APP_PORT} | xargs kill</code> in a notebook cell to free it.",
            escape=False,
        )
        return

    # Stage 5: Start server subprocess
    _log(f"<b>Stage 5:</b> Starting server on port {APP_PORT}...", escape=False)
    env = {
        **os.environ,
        "PORT": str(APP_PORT),
        "NODE_ENV": "production",
    }
    proc = subprocess.Popen(
        ["node", "build/index.js"],
        cwd=PROJECT_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    _processes.append(proc)

    # Stage 6: Wait for /health, print URL
    _log("Waiting for server to be ready...")
    if not _wait_for_health(APP_PORT, timeout=15):
        _log("<span style='color:red'>Server did not become healthy within 15 seconds.</span>", escape=False)
        stop()
        return

    # Generate access URL
    prefix = os.environ.get("JUPYTERHUB_SERVICE_PREFIX", "")
    if prefix:
        url = f"{prefix}proxy/{APP_PORT}/"
    else:
        url = f"http://localhost:{APP_PORT}/"
    _log(
        f"<b>Server ready!</b> Open the app: "
        f"<a href='{url}' target='_blank'>{html.escape(url)}</a>",
        escape=False,
    )


if __name__ == "__main__":
    try:
        launch()
        if _processes:
            _log("Press Ctrl+C to stop the server")
            _processes[0].wait()
    except KeyboardInterrupt:
        stop()
