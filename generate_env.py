"""Generate a .env file with a fresh Fernet key"""

import shutil
from pathlib import Path

from cryptography.fernet import Fernet

root = Path(__file__).parent
env_example = root / ".env.example"
env_file = root / ".env"

if env_file.exists():
    print(f"{env_file} already exists — not overwriting.")
else:
    shutil.copy(env_example, env_file)
    key = Fernet.generate_key().decode()
    text = env_file.read_text()
    env_file.write_text(text.replace("CREDENTIALS_ENCRYPTION_KEY=", f"CREDENTIALS_ENCRYPTION_KEY={key}"))
    print(f"Created {env_file} with a new Fernet key.")
