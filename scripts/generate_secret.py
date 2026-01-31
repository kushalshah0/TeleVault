#!/usr/bin/env python3
"""Generate a secure random secret key for JWT configuration."""
import secrets


def generate_secret_key(length=32):
    """Generate a secure random hex string."""
    return secrets.token_hex(length)


if __name__ == "__main__":
    secret = generate_secret_key()
    print("Generated JWT Secret Key:")
    print("=" * 60)
    print(secret)
    print("=" * 60)
    print("\nAdd this to your .env file:")
    print(f"JWT_SECRET_KEY={secret}")
