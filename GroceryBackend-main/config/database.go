package config

import (
	"fmt"
	"os"
)

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	TimeZone string
}

func LoadDatabaseConfig() *DatabaseConfig {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "postgres"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "grocery_db"
	}
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}
	timeZone := os.Getenv("DB_TIMEZONE")
	if timeZone == "" {
		timeZone = "Asia/Manila"
	}

	return &DatabaseConfig{
		Host:     host,
		Port:     port,
		User:     user,
		Password: password,
		DBName:   dbName,
		SSLMode:  sslMode,
		TimeZone: timeZone,
	}
}

func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.Host, c.User, c.Password, c.DBName, c.Port, c.SSLMode, c.TimeZone)
}
