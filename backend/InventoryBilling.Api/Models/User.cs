using System.ComponentModel.DataAnnotations;

namespace InventoryBilling.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ShopName { get; set; }

    // Simple role model: Owner has full access, Staff has restricted access (no delete, no reports by default)
    [MaxLength(20)]
    public string Role { get; set; } = "Owner";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
