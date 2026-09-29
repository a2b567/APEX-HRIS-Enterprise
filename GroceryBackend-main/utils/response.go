package utils

import (
	"github.com/gofiber/fiber/v2"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

func SuccessResponse(c *fiber.Ctx, statusCode int, message string, data interface{}) error {
	return c.Status(statusCode).JSON(APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func ErrorResponse(c *fiber.Ctx, statusCode int, message string, details interface{}) error {
	return c.Status(statusCode).JSON(APIResponse{
		Success: false,
		Message: message,
		Error:   details,
	})
}

func BadRequest(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusBadRequest, message, nil)
}

func Unauthorized(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusUnauthorized, message, nil)
}

func Forbidden(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusForbidden, message, nil)
}

func NotFound(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusNotFound, message, nil)
}

func Conflict(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusConflict, message, nil)
}

func HandleError(c *fiber.Ctx, err error) error {
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, err.Error(), nil)
	}
	return nil
}
