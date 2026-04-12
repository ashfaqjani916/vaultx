package handler

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/scrypt"
)

const (
	requestTimeout = 5 * time.Second
	saltSize       = 16
	keySize        = 32
	scryptN        = 1 << 15 // 32768
	scryptR        = 8
	scryptP        = 1
)

var errInvalidSecret = errors.New("invalid password or stored secret")

type storeKeyRequest struct {
	PublicKey  string `json:"public_key" binding:"required"`
	PrivateKey string `json:"private_key" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type keyRecord struct {
	PublicKey    string    `bson:"public_key"`
	PasswordHash string    `bson:"password_hash"`
	CreatedAt    time.Time `bson:"created_at"`
	UpdatedAt    time.Time `bson:"updated_at"`
}

// StoreKey godoc
// @Summary     Store encrypted private key
// @Description Stores public key and encrypted private key as password_hash
// @Tags        vault
// @Accept      json
// @Produce     json
// @Param       payload  body      storeKeyRequest  true  "Public/private key + password"
// @Success     201      {object}  map[string]string
// @Failure     400      {object}  map[string]string
// @Failure     500      {object}  map[string]string
// @Router      /keys [post]
func (h *Handler) StoreKey(c *gin.Context) {
	if h.vaultCollection == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "vault collection is not configured"})
		return
	}

	var req storeKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON payload"})
		return
	}

	req.PublicKey = strings.TrimSpace(req.PublicKey)
	req.PrivateKey = strings.TrimSpace(req.PrivateKey)
	if req.PublicKey == "" || req.PrivateKey == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "public_key, private_key and password are required"})
		return
	}

	encryptedPrivateKey, err := encryptPrivateKey(req.PrivateKey, req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt private key"})
		return
	}

	now := time.Now().UTC()
	filter := bson.M{"public_key": req.PublicKey}
	update := bson.M{
		"$set": bson.M{
			"public_key":    req.PublicKey,
			"password_hash": encryptedPrivateKey,
			"updated_at":    now,
		},
		"$setOnInsert": bson.M{
			"created_at": now,
		},
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	result, err := h.vaultCollection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store key in database"})
		return
	}

	status := http.StatusOK
	message := "key updated"
	if result.UpsertedCount > 0 {
		status = http.StatusCreated
		message = "key created"
	}

	c.JSON(status, gin.H{
		"message":    message,
		"public_key": req.PublicKey,
	})
}

// GetPrivateKey godoc
// @Summary     Get private key using public key and password
// @Description Decrypts and returns private key for the provided public key/password
// @Tags        vault
// @Produce     json
// @Param       public_key  query     string  true  "Public key"
// @Param       password    query     string  true  "Password"
// @Success     200         {object}  map[string]string
// @Failure     400         {object}  map[string]string
// @Failure     401         {object}  map[string]string
// @Failure     404         {object}  map[string]string
// @Failure     500         {object}  map[string]string
// @Router      /keys [get]
func (h *Handler) GetPrivateKey(c *gin.Context) {
	if h.vaultCollection == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "vault collection is not configured"})
		return
	}

	publicKey := strings.TrimSpace(c.Query("public_key"))
	password := c.Query("password")
	if publicKey == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "public_key and password query params are required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	var record keyRecord
	err := h.vaultCollection.FindOne(ctx, bson.M{"public_key": publicKey}).Decode(&record)
	if errors.Is(err, mongo.ErrNoDocuments) {
		c.JSON(http.StatusNotFound, gin.H{"error": "public key not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read data from database"})
		return
	}

	privateKey, err := decryptPrivateKey(record.PasswordHash, password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"public_key":  publicKey,
		"private_key": privateKey,
	})
}

func encryptPrivateKey(privateKey, password string) (string, error) {
	salt := make([]byte, saltSize)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return "", err
	}

	derivedKey, err := scrypt.Key([]byte(password), salt, scryptN, scryptR, scryptP, keySize)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(derivedKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nil, nonce, []byte(privateKey), nil)

	encoded := []string{
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(nonce),
		base64.RawStdEncoding.EncodeToString(ciphertext),
	}

	return strings.Join(encoded, "."), nil
}

func decryptPrivateKey(encrypted, password string) (string, error) {
	parts := strings.Split(encrypted, ".")
	if len(parts) != 3 {
		return "", errInvalidSecret
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", errInvalidSecret
	}

	nonce, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", errInvalidSecret
	}

	ciphertext, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return "", errInvalidSecret
	}

	derivedKey, err := scrypt.Key([]byte(password), salt, scryptN, scryptR, scryptP, keySize)
	if err != nil {
		return "", errInvalidSecret
	}

	block, err := aes.NewCipher(derivedKey)
	if err != nil {
		return "", errInvalidSecret
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", errInvalidSecret
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", errInvalidSecret
	}

	return string(plaintext), nil
}
