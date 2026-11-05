"""Detección del equipo: CPU, RAM, GPU y runtimes disponibles."""

from __future__ import annotations

import ctypes
import os
import platform
import shutil
import sys


def ram_gb() -> float:
    class MemoryStatus(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong),
            ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong),
            ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong),
            ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong),
            ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]

    try:
        status = MemoryStatus()
        status.dwLength = ctypes.sizeof(MemoryStatus)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
        return round(status.ullTotalPhys / (1024 ** 3), 1)
    except (AttributeError, OSError, ValueError):
        return 0.0


def _registry(path: str, name: str) -> str:
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path) as key:
            value, _ = winreg.QueryValueEx(key, name)
            return str(value)
    except (ImportError, OSError):
        return ""


def cpu_name() -> str:
    name = _registry(r"HARDWARE\DESCRIPTION\System\CentralProcessor\0", "ProcessorNameString")
    if name:
        return " ".join(name.split())
    return platform.processor() or "CPU desconocida"


def gpu_name() -> str:
    return _registry(
        r"SYSTEM\CurrentControlSet\Control\Class"
        r"\{4d36e968-e325-11ce-bfc1-08002be10318}\0000",
        "DriverDesc",
    )


def os_name() -> str:
    if platform.system() != "Windows":
        return f"{platform.system()} {platform.release()}"
    build = _registry(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", "CurrentBuildNumber")
    try:
        major = int(build)
    except ValueError:
        major = 0
    return "Windows 11" if major >= 22000 else "Windows 10"


def _has_cpp() -> bool:
    from .runner import cpp_compiler

    return cpp_compiler() is not None


def _has_dotnet() -> bool:
    from .runner import dotnet_sdk

    return dotnet_sdk()


def runtimes() -> dict:
    return {
        "python": True,
        "node": shutil.which("node") is not None,
        "dotnet": _has_dotnet(),
        "gcc": _has_cpp(),
        "java": shutil.which("javac") is not None,
        "sqlite": True,
    }


def recommended_model(ram: float) -> str:
    if ram and ram < 10:
        return "qwen2.5-coder-1.5b"
    if ram and ram < 20:
        return "qwen2.5-coder-3b"
    return "qwen2.5-coder-7b"


def info() -> dict:
    ram = ram_gb()
    return {
        "os": os_name(),
        "cpu": {"name": cpu_name(), "cores": os.cpu_count() or 0},
        "ram_gb": ram,
        "gpu": gpu_name(),
        "runtimes": runtimes(),
        "recommended_model": recommended_model(ram),
        "python": sys.version.split()[0],
    }
