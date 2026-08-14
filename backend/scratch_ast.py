import faulthandler
faulthandler.enable()

from app.services.parser_service import ParserService
from app.services.entity_persistence import CodeEntityPersistenceService
from pathlib import Path
import sys

source = Path('/repositories/jivanilakshya/quantum/quantum-backend/Sales_emotion_module/meeting_emotion_analyzer.py').read_bytes()
tree = ParserService._parser_for('.py').parse(source)

print("Starting entity extraction test with faulthandler...")
sys.stdout.flush()

entities = CodeEntityPersistenceService._extract_entities(tree, source)
print("Finished successfully! Total entities:", len(entities))
sys.stdout.flush()
