import os
import re
from pathlib import Path
from app.services.relationship_persistence import RelationshipPersistenceService
from app.database.postgres import SessionLocal
from app.models.file import File

session = SessionLocal()
files = session.query(File).filter(File.project_id == 60).all()
files_by_path = {f.path: f for f in files}

js_extensions = ('.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx')
py_extensions = ('.py',)

total_js_imports = 0
js_relative_imports = 0
js_package_imports = 0

total_py_imports = 0

resolved_imports = 0
unresolved_imports = 0

repo_root = Path('/repositories/jivanilakshya/quantum')

resolved_details = []

for file in files:
    source_path = repo_root / file.path
    if not source_path.is_file():
        continue
    
    ext = source_path.suffix.lower()
    if ext in js_extensions or ext in py_extensions:
        try:
            content = source_path.read_text(encoding='utf-8', errors='replace')
        except Exception:
            continue
            
        if ext in js_extensions:
            from_imports = re.findall(r'(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)?)[\'"]([^\'"]+)[\'"]', content)
            requires = re.findall(r'\brequire\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content)
            all_imports = list(dict.fromkeys(from_imports + requires))
            
            for imp in all_imports:
                total_js_imports += 1
                if imp.startswith('.'):
                    js_relative_imports += 1
                    target = RelationshipPersistenceService._resolve_javascript_import(file.path, imp, files_by_path)
                    if target:
                        resolved_imports += 1
                        resolved_details.append((file.path, imp, target.path))
                    else:
                        unresolved_imports += 1
                else:
                    js_package_imports += 1
                    unresolved_imports += 1
        elif ext in py_extensions:
            import_pat = re.compile(r'^\s*import\s+(.+?)\s*(?:#.*)?$', re.MULTILINE)
            from_pat = re.compile(r'^\s*from\s+(\.*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|\.+)\s+import\s+(.+?)\s*(?:#.*)?$', re.MULTILINE)
            
            imports = []
            for matched in import_pat.findall(content):
                imports.extend(part.strip().split(' as ', 1)[0].strip() for part in matched.split(','))
            for match in from_pat.finditer(content):
                module = match.group(1)
                imports.append(module)
                
            all_imports = list(dict.fromkeys(filter(None, imports)))
            for imp in all_imports:
                total_py_imports += 1
                target = RelationshipPersistenceService._resolve_python_import(file.path, imp, files_by_path)
                if target:
                    resolved_imports += 1
                    resolved_details.append((file.path, imp, target.path))
                else:
                    unresolved_imports += 1

print('VERIFICATION RESULTS:')
print('Total JS imports (raw specifiers):', total_js_imports)
print('  JS package/library imports (external):', js_package_imports)
print('  JS local relative imports (starts with .):', js_relative_imports)
print('Total Python imports (raw modules):', total_py_imports)
print('Resolved file-to-file imports (within project):', resolved_imports)
print('Unresolved/External imports:', unresolved_imports)
print('\nResolved Import Details:')
for src, spec, target in resolved_details:
    print(f'  {src} -> {spec} -> {target}')
