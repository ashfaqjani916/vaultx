package db

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DB wraps the mongo.Client.
type DB struct {
	client *mongo.Client
}

// New connects to MongoDB and verifies the connection with a 5s ping.
func New(ctx context.Context, uri string) (*DB, error) {
	opts := options.Client().ApplyURI(uri).
		SetConnectTimeout(5 * time.Second).
		SetServerSelectionTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("db: connect: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx, nil); err != nil {
		_ = client.Disconnect(ctx)
		return nil, fmt.Errorf("db: ping: %w", err)
	}

	return &DB{client: client}, nil
}

// Client returns the underlying *mongo.Client.
func (d *DB) Client() *mongo.Client { return d.client }

// Collection is a convenience helper to get a collection.
func (d *DB) Collection(database, collection string) *mongo.Collection {
	return d.client.Database(database).Collection(collection)
}

// Close disconnects from MongoDB.
func (d *DB) Close(ctx context.Context) error {
	if err := d.client.Disconnect(ctx); err != nil {
		return fmt.Errorf("db: disconnect: %w", err)
	}
	return nil
}
