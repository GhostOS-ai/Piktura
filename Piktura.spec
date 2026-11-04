# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['piktura_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('src', 'src'),
        ('assets', 'assets')
    ],
    hiddenimports=['webview', 'AppKit'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Piktura',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets/Piktura.icns'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Piktura',
)
app = BUNDLE(
    coll,
    name='Piktura.app',
    icon='assets/Piktura.icns',
    bundle_identifier='best.kib.piktura',
    info_plist={
        'CFBundleDisplayName': 'Piktura',
        'CFBundleName': 'Piktura',
        'CFBundleIdentifier': 'best.kib.piktura',
        'CFBundleVersion': '1.1.5',
        'CFBundleShortVersionString': '1.1.5',
        'LSMinimumSystemVersion': '11.0',
        'CFBundleSupportedPlatforms': ['MacOSX'],
        'NSHighResolutionCapable': True,
        'LSApplicationCategoryType': 'public.app-category.graphics-design',
        'CFBundleIconFile': 'Piktura.icns',
        'CFBundleIconName': 'Piktura',
    }
)
