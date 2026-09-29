package utils

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID     uint   `json:"user_id"`
	Role       string `json:"role"`
	BranchID   uint   `json:"branch_id"`
	EmployeeID uint   `json:"employee_id"`
	jwt.RegisteredClaims
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "super-secret-grocery-backend-jwt-key-2026"
	}
	return []byte(secret)
}

func GenerateJWT(userID uint, role string, branchID uint, employeeID uint) (string, error) {
	expHours := 24
	if envExp := os.Getenv("JWT_EXPIRATION_HOURS"); envExp != "" {
		if val, err := strconv.Atoi(envExp); err == nil && val > 0 {
			expHours = val
		}
	}

	issuer := os.Getenv("JWT_ISSUER")
	if issuer == "" {
		issuer = "grocery-attendance-api"
	}

	claims := JWTClaims{
		UserID:     userID,
		Role:       role,
		BranchID:   branchID,
		EmployeeID: employeeID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

func ValidateJWT(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid or expired token")
}
