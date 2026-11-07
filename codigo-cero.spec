# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec para el .exe portable de Windows de Código Cero.
# Uso en Windows:  pyinstaller codigo-cero.spec
# El build de GitHub Actions (.github/workflows/build-windows-exe.yml)
# usa este mismo spec. No compilar en Linux para entregar como exe
# de Windows: PyInstaller solo genera binarios para el sistema anfitrión.

block_cipher = None

a = Analysis(
    ["run.py"],
    pathex=[],
    binaries=[],
    datas=[
        ("web", "web"),
        ("content", "content"),
        ("models/README.md", "models"),
    ],
    hiddenimports=[
        "flask",
        "requests",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="Codigo-Cero",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
