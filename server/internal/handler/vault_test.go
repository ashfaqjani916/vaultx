package handler

import "testing"

func TestEncryptDecryptPrivateKey(t *testing.T) {
	privateKey := "my-private-key-value"
	password := "super-secret-password"

	encrypted, err := encryptPrivateKey(privateKey, password)
	if err != nil {
		t.Fatalf("encryptPrivateKey() error = %v", err)
	}
	if encrypted == privateKey {
		t.Fatalf("encrypted payload should not match plaintext private key")
	}

	decrypted, err := decryptPrivateKey(encrypted, password)
	if err != nil {
		t.Fatalf("decryptPrivateKey() error = %v", err)
	}
	if decrypted != privateKey {
		t.Fatalf("decryptPrivateKey() = %q, want %q", decrypted, privateKey)
	}
}

func TestDecryptPrivateKeyWrongPassword(t *testing.T) {
	encrypted, err := encryptPrivateKey("my-private-key-value", "correct-password")
	if err != nil {
		t.Fatalf("encryptPrivateKey() error = %v", err)
	}

	_, err = decryptPrivateKey(encrypted, "wrong-password")
	if err == nil {
		t.Fatalf("expected error when using wrong password")
	}
}
