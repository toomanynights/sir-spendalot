#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push and print them ready to paste into .env.

Run from the venv:
    python3 server-setup/generate_vapid_keys.py
"""
from base64 import urlsafe_b64encode

from cryptography.hazmat.primitives.asymmetric.ec import generate_private_key, SECP256R1
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

key = generate_private_key(SECP256R1())

private_bytes = key.private_numbers().private_value.to_bytes(32, "big")
private_b64 = urlsafe_b64encode(private_bytes).rstrip(b"=").decode()

public_bytes = key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
public_b64 = urlsafe_b64encode(public_bytes).rstrip(b"=").decode()

print("Add these lines to backend/.env:\n")
print(f"VAPID_PRIVATE_KEY={private_b64}")
print(f"VAPID_PUBLIC_KEY={public_b64}")
print(f"VAPID_SUBJECT=mailto:basilvlasyuk@gmail.com")
