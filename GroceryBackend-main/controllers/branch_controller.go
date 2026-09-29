package controllers

import (
	"strconv"

	"grocery-backend/connection"
	"grocery-backend/models"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type BranchController struct{}

func NewBranchController() *BranchController {
	return &BranchController{}
}

// GetAllBranches handles GET /api/branches
func (ctrl *BranchController) GetAllBranches(c *fiber.Ctx) error {
	var branches []models.Branch
	err := connection.DB.Find(&branches).Error
	if err != nil {
		return utils.HandleError(c, err)
	}
	return utils.SuccessResponse(c, fiber.StatusOK, "Branches retrieved successfully", branches)
}

type BranchInput struct {
	BranchCode string `json:"branch_code"`
	BranchName string `json:"branch_name"`
	Address    string `json:"address"`
	Phone      string `json:"phone"`
	IsActive   *bool  `json:"is_active"`
}

// CreateBranch handles POST /api/branches
func (ctrl *BranchController) CreateBranch(c *fiber.Ctx) error {
	var input BranchInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	if input.BranchCode == "" || input.BranchName == "" {
		return utils.BadRequest(c, "BranchCode and BranchName are required")
	}

	branch := models.Branch{
		BranchCode: input.BranchCode,
		BranchName: input.BranchName,
		Address:    input.Address,
		Phone:      input.Phone,
		IsActive:   true,
	}

	if err := connection.DB.Create(&branch).Error; err != nil {
		return utils.Conflict(c, "Failed to create branch: code might already exist")
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Branch created successfully", branch)
}

// UpdateBranch handles PUT /api/branches/:id
func (ctrl *BranchController) UpdateBranch(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid branch ID")
	}

	var branch models.Branch
	if err := connection.DB.First(&branch, id).Error; err != nil {
		return utils.NotFound(c, "Branch not found")
	}

	var input BranchInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	updates := map[string]interface{}{}
	if input.BranchCode != "" {
		updates["branch_code"] = input.BranchCode
	}
	if input.BranchName != "" {
		updates["branch_name"] = input.BranchName
	}
	if input.Address != "" {
		updates["address"] = input.Address
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}

	if err := connection.DB.Model(&branch).Updates(updates).Error; err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Branch updated successfully", branch)
}
