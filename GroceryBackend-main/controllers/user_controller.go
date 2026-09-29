package controllers

import (
	"grocery-backend/connection"
	"grocery-backend/models"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type UserController struct{}

func NewUserController() *UserController {
	return &UserController{}
}

// GetAllUsers handles GET /api/users
func (ctrl *UserController) GetAllUsers(c *fiber.Ctx) error {
	var users []models.User
	err := connection.DB.Preload("Role").Preload("Employee").Find(&users).Error
	if err != nil {
		return utils.HandleError(c, err)
	}
	return utils.SuccessResponse(c, fiber.StatusOK, "Users retrieved successfully", users)
}

type CreateSupervisorRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	BranchID uint   `json:"branch_id"`
}

// CreateSupervisor handles POST /api/users/supervisor
func (ctrl *UserController) CreateSupervisor(c *fiber.Ctx) error {
	req := new(CreateSupervisorRequest)
	if err := c.BodyParser(req); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	if req.Username == "" || req.Password == "" || req.BranchID == 0 {
		return utils.BadRequest(c, "Username, password, and branch_id are required")
	}

	var existing models.User
	if err := connection.DB.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		return utils.Conflict(c, "Username already exists")
	}

	var supervisorRole models.Role
	if err := connection.DB.Where("name = ?", "SUPERVISOR").First(&supervisorRole).Error; err != nil {
		return utils.NotFound(c, "SUPERVISOR role not found in system")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return utils.HandleError(c, err)
	}

	user := models.User{
		Username:     req.Username,
		PasswordHash: hashedPassword,
		RoleID:       supervisorRole.ID,
		Status:       "ACTIVE",
	}

	if err := connection.DB.Create(&user).Error; err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Supervisor created successfully", user)
}
